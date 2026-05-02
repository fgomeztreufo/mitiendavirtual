import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
import { normalizePlanType, PLAN_PERMISSIONS } from '../utils/planUtils';

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

    // NUEVA LÓGICA PARA TELEGRAM USANDO /START
    if (channel === 'telegram' && !currentStatus) {
      Swal.fire({
        title: 'Vincular Telegram',
        html: `
          <div class="p-4 text-center">
            <p class="text-sm text-gray-400 mb-4">Haz clic en el botón para abrir nuestro Bot y presiona <b>"Iniciar"</b>.</p>
            <a 
              href="https://t.me/Mitiendavirtualclbot?start=${session.user.id}" 
              target="_blank" 
              rel="noopener noreferrer"
              style="background-color: #0088cc; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; display: inline-block; font-weight: bold;"
            >
              🚀 Abrir Telegram Bot
            </a>
            <p class="text-xs text-gray-500 mt-4 italic">Al hacer clic, vincularemos automáticamente tu cuenta.</p>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'Ya lo vinculé',
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          fetchConfigs(); // Refrescamos para ver si el backend ya recibió el webhook de Telegram
        }
      });
      return;
    }

    // Lógica para toggle normal (desactivar)
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

  if (loading) return <div className="p-10 text-center text-white">Cargando...</div>;

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