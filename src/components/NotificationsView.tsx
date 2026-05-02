import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
import { normalizePlanType, PLAN_PERMISSIONS } from '../utils/planUtils';

export default function NotificationsView({ session, profile }: any) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const planCode = normalizePlanType(profile?.plan_type);
  const allowedChannels = PLAN_PERMISSIONS[planCode] || ['email'];
  const botUsername = ((import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME) || 'Mitiendavirtualclbot';

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
      setConfigs(data || []);
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

    // REGRESO AL WIDGET DE LOGIN OFICIAL
    if (channel === 'telegram' && !currentStatus) {
      // Comprobación rápida: el widget necesita HTTPS (salvo localhost en dev)
      const hostname = window.location.hostname;
      if (window.location.protocol !== 'https:' && hostname !== 'localhost') {
        Swal.fire('HTTPS requerido', 'El widget de Telegram requiere HTTPS. Usa ngrok o despliega en Vercel para probar.', 'error');
        return;
      }

      Swal.fire({
        title: 'Vincular Telegram',
        html: `
          <div class="p-2">
            <p class="text-sm text-gray-400 mb-6">Conéctate con nuestro Bot oficial para recibir alertas.</p>
            <div id="telegram-login-container" class="flex justify-center min-h-[40px]"></div>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        didOpen: () => {
          console.log('[Telegram] modal opened', {
            hostname: window.location.hostname,
            origin: window.location.origin,
            protocol: window.location.protocol,
            botUsername
          });

          // Definimos la función global que Telegram llamará al autenticar
          (window as any).onTelegramAuth = async (user: any) => {
            if (user && user.id) {
              try {
                Swal.showLoading();
                const payload = { ...user, app_user_id: session.user.id };
                console.log('[Telegram] sending payload to /api/telegram-auth', payload);
                const res = await fetch('/api/telegram-auth', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                const json = await res.json().catch(() => ({}));
                console.log('[Telegram] /api/telegram-auth response', res.status, json);
                if (res.ok) {
                  fetchConfigs();
                  Swal.fire('¡Éxito!', 'Telegram vinculado correctamente.', 'success');
                } else {
                  console.error('Telegram auth error', json);
                  Swal.fire('Error', json.message || 'No se pudo validar la autenticidad del login.', 'error');
                }
              } catch (err) {
                console.error(err);
                Swal.fire('Error', 'Ocurrió un error al conectar con el servidor.', 'error');
              }
            }
          };

          // Creamos un iframe para el embed de Telegram, forzando un origen correcto
          const origin = window.location.origin;
          const iframeSrc = `https://oauth.telegram.org/embed/${botUsername}?origin=${encodeURIComponent(origin)}&size=large&request_access=write`;
          console.log('[Telegram] injecting iframe', { iframeSrc });

          const container = document.getElementById('telegram-login-container');
          if (container) {
            container.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.id = `telegram-login-${botUsername}`;
            iframe.src = iframeSrc;
            iframe.width = '100%';
            iframe.height = '70';
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('scrolling', 'no');
            iframe.style.border = 'none';
            iframe.style.overflow = 'hidden';
            container.appendChild(iframe);
            console.log('[Telegram] iframe appended to container', container);
          } else {
            console.warn('[Telegram] telegram-login-container not found');
          }
        },
        willClose: () => {
          delete (window as any).onTelegramAuth;
        }
      });

      return;
    }

    // Lógica para toggle normal (activar/desactivar otros canales)
    const { error } = await supabase
      .from('user_notification_configs')
      .upsert({ 
        user_id: session.user.id, 
        channel_type: channel, 
        is_active: !currentStatus,
        config: configs.find(c => c.channel_type === channel)?.config || {}
      }, { onConflict: 'user_id, channel_type' });

    if (!error) fetchConfigs();
    if (!error) fetchConfigs();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <h2 className="text-2xl font-bold text-white">Notificaciones</h2>
      <p className="text-gray-400 text-sm">Gestiona cómo recibes las alertas de ventas e inventario.</p>
      
      <div className="grid gap-4">
        {['email', 'telegram', 'whatsapp'].map((channel) => {
          const isLocked = !allowedChannels.includes(channel);
          const config = configs.find(c => c.channel_type === channel);
          const active = config?.is_active;

          return (
            <div 
              key={channel} 
              onClick={() => toggleChannel(channel, !!active, isLocked)}
              className={`p-5 rounded-2xl border bg-gray-900 transition-all ${
                isLocked ? 'opacity-40 border-gray-800' : 'cursor-pointer border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-white capitalize font-medium">{channel}</span>
                  {active && channel === 'telegram' && (
                    <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full border border-green-800">
                      Vinculado
                    </span>
                  )}
                </div>
                <div className={`h-6 w-11 rounded-full relative transition-colors ${active ? 'bg-blue-600' : 'bg-gray-700'}`}>
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