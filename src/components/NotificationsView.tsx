import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
import { normalizePlanType, PLAN_PERMISSIONS } from '../utils/planUtils';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function NotificationsView({ session, profile }: any) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const planCode = normalizePlanType(profile?.plan_type);
  const allowedChannels = PLAN_PERMISSIONS[planCode] || ['email'];
  const botUsername = ((import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME) || 'Mitiendavirtualclbot';
  const API_BASE = '/api';

  const push = usePushNotifications(session.user.id);

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
        icon: 'lock' as any,
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

    // Push Notifications
    if (channel === 'push') {
      const config = configs.find(c => c.channel_type === 'push');
      const isSubscribed = !!(config?.config?.fcm_token);

      if (!push.supported) {
        Swal.fire({
          icon: 'warning',
          title: 'No soportado',
          text: 'Tu navegador no soporta notificaciones push. Prueba con Chrome, Edge o Firefox.',
          background: '#111827',
          color: '#fff',
        });
        return;
      }

      if (isSubscribed && currentStatus) {
        const ok = await push.unsubscribe();
        if (ok) {
          await fetchConfigs();
          Swal.fire({
            icon: 'success',
            title: 'Push desactivado',
            text: 'Ya no recibirás notificaciones push.',
            background: '#111827',
            color: '#fff',
            timer: 2000,
            showConfirmButton: false,
          });
        }
        return;
      }

      if (isSubscribed && !currentStatus) {
        const { error } = await supabase
          .from('user_notification_configs')
          .update({ is_active: true })
          .eq('user_id', session.user.id)
          .eq('channel_type', 'push');
        if (!error) {
          await fetchConfigs();
        }
        return;
      }

      // Not subscribed — request permission and subscribe
      const ok = await push.subscribe();
      if (ok) {
        await fetchConfigs();
        Swal.fire({
          icon: 'success',
          title: 'Push activado',
          text: 'Recibirás alertas de ventas e inventario en este dispositivo.',
          background: '#111827',
          color: '#fff',
          timer: 2500,
          showConfirmButton: false,
        });
      } else if (push.permission === 'denied') {
        Swal.fire({
          icon: 'error',
          title: 'Permiso denegado',
          html: 'Debes habilitar las notificaciones en la configuración de tu navegador.<br/><br/><span class="text-xs text-gray-400">Chrome: Candado en la barra de URL → Notificaciones → Permitir</span>',
          background: '#111827',
          color: '#fff',
        });
      }
      return;
    }

    // Telegram
    if (channel === 'telegram') {
      const config = configs.find(c => c.channel_type === channel);
      const isConnected = !!(config?.config?.telegram_chat_id || config?.config?.connected_at);

      if (isConnected) {
        const newActive = !currentStatus;
        try {
          const updatePayload: any = { is_active: newActive };
          if (!newActive) updatePayload.config = {};

          const { error: updateError } = await supabase
            .from('user_notification_configs')
            .update(updatePayload)
            .eq('user_id', session.user.id)
            .eq('channel_type', 'telegram');

          if (updateError) {
            Swal.fire('Error', 'No se pudo actualizar el estado.', 'error');
          } else {
            await fetchConfigs();
            if (!newActive) {
              Swal.fire('Desconectado', 'Telegram ha sido desactivado.', 'success');
            }
          }
        } catch (err) {
          console.error(err);
          Swal.fire('Error', 'Ocurrió un error al actualizar la configuración.', 'error');
        }
        return;
      }

      const accessToken = session?.access_token || session?.accessToken || '';
      if (!accessToken) {
        Swal.fire('Error', 'Sesión no válida. Vuelve a iniciar sesión.', 'error');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/telegram-link-start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ user_id: session.user.id })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.url) {
          Swal.fire('Error', json.message || 'No se pudo generar el enlace.', 'error');
          return;
        }

        const deepLink = json.url;
        const linkToken = json.token;

        Swal.fire({
          title: 'Vincular Telegram',
          html: `
            <div class="p-2 text-center">
              <p class="text-sm text-gray-400 mb-4">Toca el botón para abrir Telegram y vincula tu cuenta con nuestro bot.</p>
              <a href="${deepLink}" target="_blank" rel="noopener noreferrer"
                style="text-decoration:none;color:white;background:#2AABEE;border-radius:12px;padding:12px 24px;display:inline-block;font-weight:600;">
                Abrir en Telegram
              </a>
              <p class="text-xs text-gray-500 mt-4" id="tg-status">Esperando confirmación...</p>
            </div>
          `,
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: 'Cancelar',
          didOpen: () => {
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
                  Swal.fire('Éxito', 'Telegram vinculado correctamente.', 'success');
                } else {
                  const el = document.getElementById('tg-status');
                  if (el) el.textContent = `Esperando confirmación... (${attempts * 3}s)`;
                }
              } catch { /* continuar */ }

              if (attempts >= maxAttempts) {
                clearInterval(interval);
                const el = document.getElementById('tg-status');
                if (el) el.textContent = 'Tiempo agotado. Intenta de nuevo.';
              }
            }, 3000);
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

    // Generic toggle (fallback)
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

  const CHANNEL_META: Record<string, { label: string; description: string; icon: string; color: string }> = {
    email: {
      label: 'Email',
      description: 'Recibe alertas en tu correo electrónico',
      icon: '📧',
      color: 'border-blue-800',
    },
    telegram: {
      label: 'Telegram',
      description: 'Alertas instantáneas en tu Telegram personal',
      icon: '📱',
      color: 'border-sky-800',
    },
    push: {
      label: 'Push Navegador',
      description: 'Notificaciones directas en tu celular o computador',
      icon: '🔔',
      color: 'border-amber-800',
    },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <h2 className="text-2xl font-bold text-white">Notificaciones</h2>
      <p className="text-gray-400 text-sm">Gestiona cómo recibes las alertas de ventas e inventario.</p>

      <div className="grid gap-4">
        {['email', 'telegram', 'push'].map((channel) => {
          const isLocked = !allowedChannels.includes(channel);
          const config = configs.find(c => c.channel_type === channel);
          const active = !!config?.is_active;
          const meta = CHANNEL_META[channel];

          const connected = channel === 'telegram'
            ? !!(config?.config?.telegram_chat_id || config?.config?.connected_at)
            : channel === 'push'
            ? !!(config?.config?.fcm_token)
            : active;

          const toggleOn = channel === 'telegram' ? (connected && active)
            : channel === 'push' ? (connected && active)
            : active;

          return (
            <div
              key={channel}
              className={`p-5 rounded-2xl border bg-gray-900 transition-all ${
                isLocked ? 'opacity-40 border-gray-800' : meta.color
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{meta.label}</span>
                      {channel === 'telegram' && (
                        connected ? (
                          <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full border border-green-800">
                            Conectado
                          </span>
                        ) : (
                          <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full border border-gray-700 cursor-pointer"
                            onClick={() => !isLocked && toggleChannel(channel, active, isLocked)}>
                            Vincular
                          </span>
                        )
                      )}
                      {channel === 'push' && connected && (
                        <span className="text-[10px] bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded-full border border-amber-800">
                          Activado
                        </span>
                      )}
                      {channel === 'push' && !push.supported && (
                        <span className="text-[10px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full border border-red-800">
                          No soportado
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">{meta.description}</p>
                  </div>
                </div>
                <div
                  onClick={() => !isLocked && toggleChannel(channel, active, isLocked)}
                  className={`h-6 w-11 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                    toggleOn ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                    toggleOn ? 'left-6' : 'left-1'
                  }`} />
                </div>
              </div>
              {channel === 'telegram' && connected && (
                <div className="mt-2 flex items-center justify-between">
                  {config?.config?.telegram_username && (
                    <p className="text-xs text-gray-500">@{config.config.telegram_username}</p>
                  )}
                  {!active && (
                    <span className="text-xs text-gray-500">Notificaciones desactivadas</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
