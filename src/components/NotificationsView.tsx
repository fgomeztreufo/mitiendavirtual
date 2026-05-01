import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { normalizePlanType, PLAN_PERMISSIONS } from '../utils/planUtils';
import Swal from 'sweetalert2';

export default function NotificationsView({ session, profile }: any) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const planCode = normalizePlanType(profile?.plan_type);
  const allowedChannels = PLAN_PERMISSIONS[planCode] || ['email'];

  useEffect(() => {
    fetchConfigs();
  }, [session.user.id]);

  async function fetchConfigs() {
    try {
      const { data, error } = await supabase
        .from('user_notification_configs')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) {
        console.error("Error al obtener configuraciones:", error);
        setLoading(false);
        return;
      }

      // Garantizar que el canal de email exista (Requerido)
      const emailConfig = data?.find(c => c.channel_type === 'email');
      if (!emailConfig) {
        const { error: insertError } = await supabase
          .from('user_notification_configs')
          .insert({
            user_id: session.user.id,
            channel_type: 'email',
            is_active: true
          });

        if (!insertError || insertError.code === '23505') {
          const { data: refreshedData } = await supabase
            .from('user_notification_configs')
            .select('*')
            .eq('user_id', session.user.id);
          if (refreshedData) setConfigs(refreshedData);
        }
      } else {
        setConfigs(data || []);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
    } finally {
      setLoading(false);
    }
  }

  const toggleChannel = async (channel: string, currentStatus: boolean, isLocked: boolean) => {
    // 1. Restricción por Plan
    if (isLocked) {
      Swal.fire({
        title: 'Funcionalidad Premium',
        text: `Las notificaciones por ${channel.toUpperCase()} requieren un plan superior.`,
        icon: 'lock',
        showCancelButton: true,
        confirmButtonText: 'Ver Planes',
        confirmButtonColor: '#3b82f6'
      }).then((result) => {
        if (result.isConfirmed) {
          window.dispatchEvent(new CustomEvent('changeTab', { detail: 'plans' }));
        }
      });
      return;
    }

    // 2. Email Obligatorio
    if (channel === 'email') {
      Swal.fire('Configuración', 'El correo es obligatorio para el respaldo de tus leads.', 'info');
      return;
    }

    // 3. VINCULACIÓN PROFESIONAL DE TELEGRAM (Widget Oficial)
    if (channel === 'telegram' && !currentStatus) {
      Swal.fire({
        title: 'Vincular Telegram',
        html: `
          <div class="p-2">
            <p class="text-sm text-gray-600 mb-6">Inicia sesión con Telegram para recibir alertas en tiempo real sin configurar IDs manuales.</p>
            <div id="telegram-login-container" class="flex justify-center min-h-[40px]"></div>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cerrar',
        didOpen: () => {
          // Definir callback global para Telegram
          (window as any).onTelegramAuth = async (user: any) => {
            if (user && user.id) {
              Swal.showLoading();
              const { error } = await supabase.from('user_notification_configs').upsert({
                user_id: session.user.id,
                channel_type: 'telegram',
                is_active: true,
                config: { 
                  telegram_chat_id: user.id.toString(),
                  telegram_username: user.username || user.first_name 
                }
              }, { onConflict: 'user_id, channel_type' });

              if (!error) {
                Swal.fire('¡Conectado!', 'Telegram configurado correctamente.', 'success');
                fetchConfigs();
              } else {
                Swal.fire('Error', 'No se pudo guardar la vinculación.', 'error');
              }
            }
          };

          // Inyectar el script del Widget
          const script = document.createElement('script');
          script.src = "https://telegram.org/js/telegram-widget.js?22";
          // Debe ser exactamente el username de tu bot sin el @
          script.setAttribute('data-telegram-login', 'Mitiendavirtualclbot');// <--- TU BOT AQUÍ
          script.setAttribute('data-size', 'large');
          script.setAttribute('data-radius', '10');
          script.setAttribute('data-onauth', 'onTelegramAuth(user)');
          script.setAttribute('data-request-access', 'write');
          script.async = true;
          document.getElementById('telegram-login-container')?.appendChild(script);
        },
        willClose: () => {
          delete (window as any).onTelegramAuth;
        }
      });
      return;
    }

    // 4. Toggle Genérico (Desactivar o WhatsApp)
    const { error } = await supabase
      .from('user_notification_configs')
      .upsert({ 
        user_id: session.user.id, 
        channel_type: channel, 
        is_active: !currentStatus,
        config: configs.find(c => c.channel_type === channel)?.config || {}
      }, { onConflict: 'user_id, channel_type' });

    if (!error) fetchConfigs();
  };

  const isEnabled = (channel: string) => configs.find(c => c.channel_type === channel)?.is_active;

  if (loading) return <div className="p-10 text-center text-gray-400">Cargando preferencias...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="border-b border-gray-800 pb-4">
        <h2 className="text-2xl font-bold text-white">Centro de Notificaciones</h2>
        <p className="text-gray-400 text-sm">Configura dónde recibirás los datos de tus nuevos clientes.</p>
      </div>

      <div className="grid gap-4">
        {['email', 'telegram', 'whatsapp'].map((channel) => {
          const isLocked = !allowedChannels.includes(channel);
          const active = isEnabled(channel);
          const isEmail = channel === 'email';

          return (
            <div 
              key={channel} 
              onClick={() => toggleChannel(channel, !!active, isLocked)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                isLocked 
                ? 'bg-gray-900/50 border-gray-800 opacity-50' 
                : 'bg-gray-900 border-gray-800 hover:border-blue-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                    active ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-800 text-gray-500'
                  }`}>
                    <i className={`bi bi-${channel === 'email' ? 'envelope' : channel}`}></i>
                  </div>
                  <div>
                    <h3 className="font-bold capitalize flex items-center gap-2 text-white">
                      {channel}
                      {isEmail && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">SISTEMA</span>}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isLocked ? 'Requiere Upgrade' : active ? 'Alertas activas' : 'Click para activar'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isLocked && <span className="text-blue-500 text-[10px] font-bold border border-blue-500/30 px-2 py-1 rounded">PREMIUM</span>}
                  <button 
                    disabled={isEmail}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? 'bg-blue-600' : 'bg-gray-700'} ${isEmail ? 'opacity-40' : ''}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}