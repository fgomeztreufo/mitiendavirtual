import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { normalizePlanType, PLAN_PERMISSIONS } from '../utils/planUtils';
import Swal from 'sweetalert2';

export default function NotificationsView({ session, profile }: any) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Obtenemos el código limpio del plan (free, basic, pro o full)
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

      if (error) throw error;

      // Garantizar que el canal de email exista siempre
      const emailConfig = data?.find(c => c.channel_type === 'email');
      if (!emailConfig) {
        await supabase.from('user_notification_configs').insert({
          user_id: session.user.id,
          channel_type: 'email',
          is_active: true
        });
        fetchConfigs();
      } else {
        setConfigs(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const toggleChannel = async (channel: string, currentStatus: boolean, isLocked: boolean) => {
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

    if (channel === 'email') {
      Swal.fire('Configuración', 'El correo es obligatorio para el respaldo de tus leads.', 'info');
      return;
    }

    // FLUJO ESPECIAL TELEGRAM
    if (channel === 'telegram' && !currentStatus) {
      Swal.fire({
        title: 'Vincular Telegram',
        html: `
          <div class="p-2">
            <p class="text-sm text-gray-600 mb-6">Haz clic abajo para conectar con nuestro Bot oficial.</p>
            <div id="telegram-login-container" class="flex justify-center min-h-[40px]"></div>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        didOpen: () => {
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
                Swal.fire('¡Éxito!', 'Cuenta de Telegram vinculada.', 'success');
                fetchConfigs();
              }
            }
          };

          const script = document.createElement('script');
          script.src = "https://telegram.org/js/telegram-widget.js?22";
          script.setAttribute('data-telegram-login', 'Mitiendavirtualclbot'); 
          script.setAttribute('data-size', 'large');
          script.setAttribute('data-onauth', 'onTelegramAuth(user)');
          script.setAttribute('data-request-access', 'write');
          script.async = true;
          document.getElementById('telegram-login-container')?.appendChild(script);
        },
        willClose: () => { delete (window as any).onTelegramAuth; }
      });
      return;
    }

    // Toggle normal para otros canales
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

  if (loading) return <div className="p-10 text-center text-gray-400">Cargando...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="border-b border-gray-800 pb-4">
        <h2 className="text-2xl font-bold text-white">Centro de Notificaciones</h2>
        <p className="text-gray-400 text-sm">Gestiona tus alertas automáticas.</p>
      </div>

      <div className="grid gap-4">
        {['email', 'telegram', 'whatsapp'].map((channel) => {
          const isLocked = !allowedChannels.includes(channel);
          const active = configs.find(c => c.channel_type === channel)?.is_active;

          return (
            <div 
              key={channel} 
              onClick={() => toggleChannel(channel, !!active, isLocked)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer bg-gray-900 border-gray-800 ${isLocked ? 'opacity-50' : 'hover:border-blue-500/30'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${active ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
                    <i className={`bi bi-${channel === 'email' ? 'envelope' : channel}`}></i>
                  </div>
                  <div>
                    <h3 className="font-bold capitalize text-white">{channel}</h3>
                    <p className="text-xs text-gray-500">{isLocked ? 'Premium' : active ? 'Activo' : 'Inactivo'}</p>
                  </div>
                </div>
                <button className={`h-6 w-11 rounded-full relative transition-colors ${active ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${active ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}