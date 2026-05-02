import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface AgentsDashboardProps {
  session: any;
  profile: any;
  instance: any;
  onNavigate: (tab: string) => void;
}

export default function AgentsDashboard({ session, profile, instance, onNavigate }: AgentsDashboardProps) {
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsCompleted, setLeadsCompleted] = useState(0);
  const [leadsToday, setLeadsToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [session.user.id]);

  async function fetchStats() {
    try {
      const { count: total } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      const { count: completed } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'completado');

      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('created_at', today);

      setLeadsTotal(total || 0);
      setLeadsCompleted(completed || 0);
      setLeadsToday(todayCount || 0);
    } catch (err) {
      console.error('Error fetching stats', err);
    } finally {
      setLoading(false);
    }
  }

  const messagesUsed = profile?.messages_used || 0;
  const isConnected = !!instance?.provider_id;
  const planType = (profile?.plan_type || 'free').toUpperCase();

  const agents = [
    {
      id: 'instagram',
      name: 'Agente Instagram',
      status: isConnected ? 'Activo' : 'Desconectado',
      color: isConnected ? 'from-pink-500 to-purple-600' : 'from-gray-600 to-gray-700',
      statusColor: isConnected ? 'text-green-400' : 'text-red-400',
      dotColor: isConnected ? 'bg-green-400' : 'bg-red-400',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
        </svg>
      ),
      stats: [
        { label: 'Mensajes respondidos', value: messagesUsed },
        { label: 'Ventas capturadas', value: leadsTotal },
        { label: 'Ventas cerradas', value: leadsCompleted },
        { label: 'Leads hoy', value: leadsToday },
      ],
      action: () => onNavigate('instagram'),
      actionLabel: isConnected ? 'Configurar' : 'Conectar',
    },
    {
      id: 'whatsapp',
      name: 'Agente WhatsApp',
      status: 'Próximamente',
      color: 'from-gray-700 to-gray-800',
      statusColor: 'text-yellow-400',
      dotColor: 'bg-yellow-400',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 2a10 10 0 00-8.6 15.1L2 22l4.9-1.4A10 10 0 1012 2z" />
        </svg>
      ),
      stats: [
        { label: 'Mensajes', value: '—' },
        { label: 'Ventas', value: '—' },
        { label: 'Respuestas', value: '—' },
        { label: 'Leads', value: '—' },
      ],
      action: () => onNavigate('whatsapp'),
      actionLabel: 'Ver más',
    },
    {
      id: 'telegram',
      name: 'Agente Telegram',
      status: 'Notificaciones',
      color: 'from-blue-500 to-cyan-600',
      statusColor: 'text-blue-300',
      dotColor: 'bg-blue-400',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 2L11 13" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
      ),
      stats: [
        { label: 'Alertas activas', value: '—' },
        { label: 'Canal', value: 'Alertas' },
        { label: 'Vinculación', value: '—' },
        { label: 'Tipo', value: 'Avisos' },
      ],
      action: () => onNavigate('notifications'),
      actionLabel: 'Configurar',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Panel de Agentes <span className="text-blue-400">IA</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Monitorea el rendimiento de tus agentes inteligentes • Plan {planType}
        </p>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Mensajes IA" value={messagesUsed} icon="💬" />
        <StatCard label="Leads totales" value={leadsTotal} icon="🎯" />
        <StatCard label="Ventas cerradas" value={leadsCompleted} icon="✅" />
        <StatCard label="Leads hoy" value={leadsToday} icon="📈" loading={loading} />
      </div>

      {/* Agentes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="relative bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 transition-all group"
          >
            {/* Header con gradiente */}
            <div className={`bg-gradient-to-r ${agent.color} p-4 flex items-center gap-3`}>
              {/* Avatar robot */}
              <div className="w-14 h-14 rounded-xl bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/10 text-white">
                {agent.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm truncate">{agent.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${agent.dotColor} animate-pulse`} />
                  <span className={`text-xs font-medium ${agent.statusColor}`}>{agent.status}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 space-y-3">
              {agent.stats.map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{stat.label}</span>
                  <span className="text-sm font-bold text-white tabular-nums">
                    {loading && typeof stat.value === 'number' ? (
                      <span className="inline-block w-8 h-4 bg-gray-800 rounded animate-pulse" />
                    ) : (
                      typeof stat.value === 'number' ? stat.value.toLocaleString('es-CL') : stat.value
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Acción */}
            <div className="px-4 pb-4">
              <button
                onClick={agent.action}
                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 transition-all"
              >
                {agent.actionLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, loading }: { label: string; value: number; icon: string; loading?: boolean }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-lg font-bold text-white tabular-nums">
          {loading ? <span className="inline-block w-10 h-5 bg-gray-800 rounded animate-pulse" /> : value.toLocaleString('es-CL')}
        </p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
