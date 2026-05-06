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
  const API_BASE = '/api';

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

    // Vincular Telegram via deep link (no requiere widget)
    if (channel === 'telegram' && !currentStatus) {
      const accessToken = session?.access_token || session?.accessToken || '';
      if (!accessToken) {
        Swal.fire('Error', 'Sesión no válida. Vuelve a iniciar sesión.', 'error');
        return;
      }

      try {
        // 1) Obtener deep link del servidor
        const res = await fetch(`${API_BASE}/telegram-link-start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.url) {
          Swal.fire('Error', json.message || 'No se pudo generar el enlace.', 'error');
          return;
        }

        const deepLink = json.url;
        const linkToken = json.token;

        // 2) Mostrar modal con botón para abrir Telegram
        Swal.fire({
          title: 'Vincular Telegram',
          html: `
            <div class="p-2 text-center">
              <p class="text-sm text-gray-400 mb-4">Toca el botón para abrir Telegram y vincula tu cuenta con nuestro bot.</p>
              <a href="${deepLink}" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-xl transition-colors"
                style="text-decoration:none;color:white;background:#2AABEE;border-radius:12px;padding:12px 24px;display:inline-block;">
                📱 Abrir en Telegram
              </a>
              <p class="text-xs text-gray-500 mt-4" id="tg-status">Esperando confirmación...</p>
            </div>
          `,
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: 'Cancelar',
          didOpen: () => {
            // Polling: espera hasta 5 minutos (cada 3s) verificando si el bot recibió el /start
            let attempts = 0;
            const maxAttempts = 100;
            const interval = setInterval(async () => {
              attempts++;
              try {
                const { data } = await supabase
                  .from('telegram_link_tokens')
                  .select('used, chat_id')
                  .eq('token', linkToken)
                  .single();

                if (data?.used && data?.chat_id) {
                  clearInterval(interval);
                  fetchConfigs();
                  Swal.fire('¡Éxito!', '✅ Telegram vinculado correctamente.', 'success');
                } else {
                  const el = document.getElementById('tg-status');
                  if (el) el.textContent = `Esperando confirmación... (${attempts * 3}s)`;
                }
              } catch { /* continuar */ }

              if (attempts >= maxAttempts) {
                clearInterval(interval);
                const el = document.getElementById('tg-status');
                if (el) el.textContent = '⏱ Tiempo agotado. Intenta de nuevo.';
              }
            }, 3000);

            // Guardar ref del interval para limpiar al cerrar
            (window as any)._tgPollInterval = interval;
          },
          willClose: () => {
            clearInterval((window as any)._tgPollInterval);
            delete (window as any)._tgPollInterval;
          }
        });
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Ocurrió un error al generar el enlace.', 'error');
      }

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
          // "conectado" = tiene chat_id real guardado por el bot
          const connected = channel === 'telegram'
            ? !!(config?.config?.telegram_chat_id)
            : !!active;

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
                  {channel === 'telegram' && (
                    connected ? (
                      <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full border border-green-800">
                        ✓ Conectado
                      </span>
                    ) : active ? (
                      <span className="text-[10px] bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-800">
                        Pendiente
                      </span>
                    ) : (
                      <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full border border-gray-700">
                        No conectado
                      </span>
                    )
                  )}
                </div>
                <div className={`h-6 w-11 rounded-full relative transition-colors ${connected ? 'bg-green-600' : active ? 'bg-yellow-600' : 'bg-gray-700'}`}>
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${(connected || active) ? 'left-6' : 'left-1'}`} />
                </div>
              </div>
              {channel === 'telegram' && connected && config?.config?.telegram_username && (
                <p className="text-xs text-gray-500 mt-2">@{config.config.telegram_username}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}