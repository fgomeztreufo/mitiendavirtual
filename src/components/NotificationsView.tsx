import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
// Estas importaciones son esenciales para resolver el error de Rollup
import { normalizePlanType, PLAN_PERMISSIONS } from '../utils/planUtils';

export default function NotificationsView({ session, profile }: any) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estas variables ahora estarán definidas gracias al import superior
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
      Swal.fire('Configuración', 'El correo es obligatorio.', 'info');
      return;
    }

    if (channel === 'telegram' && !currentStatus) {
      Swal.fire({
        title: 'Vincular Telegram',
        html: `
          <div class="p-2">
            <p class="text-sm text-gray-600 mb-6">Conéctate con nuestro Bot oficial.</p>
            <div id="telegram-login-container" class="flex justify-center min-h-[40px]"></div>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        didOpen: () => {
          (window as any).onTelegramAuth = async (user: any) => {
            if (user && user.id) {
              Swal.showLoading();
              await supabase.from('user_notification_configs').upsert({
                user_id: session.user.id,
                channel_type: 'telegram',
                is_active: true,
                config: { 
                  telegram_chat_id: user.id.toString(),
                  telegram_username: user.username || user.first_name 
                }
              }, { onConflict: 'user_id, channel_type' });
              fetchConfigs();
              Swal.fire('¡Éxito!', 'Telegram vinculado.', 'success');
            }
          };

        // Asegúrate de que se vea exactamente así:
const script = document.createElement('script');
script.src = "https://telegram.org/js/telegram-widget.js?22";
script.setAttribute('data-telegram-login', 'Mitiendavirtualclbot');
script.setAttribute('data-size', 'large');
script.setAttribute('data-onauth', 'onTelegramAuth(user)');
script.setAttribute('data-request-access', 'write');

// Agrega esta línea para forzar que el widget use el dominio con www
script.setAttribute('data-origin', 'https://www.mitiendavirtual.cl'); 

script.async = true;
document.getElementById('telegram-login-container')?.appendChild(script);
        },
        willClose: () => { delete (window as any).onTelegramAuth; }
      });
      return;
    }

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

  if (loading) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <h2 className="text-2xl font-bold text-white">Notificaciones</h2>
      <div className="grid gap-4">
        {['email', 'telegram', 'whatsapp'].map((channel) => {
          const isLocked = !allowedChannels.includes(channel);
          const active = configs.find(c => c.channel_type === channel)?.is_active;

          return (
            <div 
              key={channel} 
              onClick={() => toggleChannel(channel, !!active, isLocked)}
              className={`p-5 rounded-2xl border bg-gray-900 border-gray-800 ${isLocked ? 'opacity-50' : 'cursor-pointer'}`}
            >
              <div className="flex justify-between items-center">
                <span className="text-white capitalize">{channel}</span>
                <div className={`h-6 w-11 rounded-full relative ${active ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${active ? 'left-6' : 'left-1'}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}