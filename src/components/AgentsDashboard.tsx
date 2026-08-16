import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { effectivePlan, planCodeToDisplay } from '../utils/planUtils';
import AgentsOfficeScene from './AgentsOfficeScene';

interface UserSession {
  user: {
    id: string;
  };
}

interface UserProfile {
  ai_credits_used?: number;
  plan_type?: string;
}

interface Instance {
  provider_id?: string;
}

interface AgentsDashboardProps {
  session: UserSession;
  profile: UserProfile;
  instance: Instance;
  onNavigate: (tab: string) => void;
}

interface AgentLeadStats {
  total: number;
  completed: number;
  today: number;
}

interface CalendarStats {
  total: number;
  confirmed: number;
  today: number;
}

export default function AgentsDashboard({ session, profile, instance, onNavigate }: Readonly<AgentsDashboardProps>) {
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsCompleted, setLeadsCompleted] = useState(0);
  const [leadsToday, setLeadsToday] = useState(0);
  const [agentLeadStats, setAgentLeadStats] = useState<Record<string, AgentLeadStats>>({
    instagram: { total: 0, completed: 0, today: 0 },
    whatsapp: { total: 0, completed: 0, today: 0 },
    telegram: { total: 0, completed: 0, today: 0 },
  });
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarStats, setCalendarStats] = useState<CalendarStats>({ total: 0, confirmed: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [filterBranch, setFilterBranch] = useState('all');
  const AWAKE_TIMEOUT = 2 * 60 * 1000; // 5 minutos sin actividad → vuelve a dormir
  const [channelLastActive, setChannelLastActive] = useState<Record<string, number>>({
    instagram: 0, whatsapp: 0, telegram: 0, calendar: 0,
  });
  const [, setTick] = useState(0); // force re-render para timeout check
  const channelLastActiveRef = useRef(channelLastActive);

  useEffect(() => {
    supabase.from('branches').select('id, name').eq('user_id', session.user.id).eq('is_active', true)
      .order('sort_order').then(({ data }) => { if (data) setBranches(data); });
  }, [session.user.id]);

  const fetchStats: () => Promise<void> = useCallback(async () => {
    try {
      let leadsQuery = supabase
        .from('leads')
        .select('status, created_at, sistema')
        .eq('user_id', session.user.id);
      if (filterBranch !== 'all') {
        leadsQuery = leadsQuery.eq('branch_id', filterBranch);
      }
      const { data, error } = await leadsQuery;

      if (error) {
        throw error;
      }

      const rows = data || [];
      const today = new Date().toISOString().split('T')[0];

      const nextAgentStats: Record<string, AgentLeadStats> = {
        instagram: { total: 0, completed: 0, today: 0 },
        whatsapp: { total: 0, completed: 0, today: 0 },
        telegram: { total: 0, completed: 0, today: 0 },
      };

      let total = 0;
      let completed = 0;
      let todayCount = 0;

      rows.forEach((lead) => {
        total += 1;

        const isCompleted = lead.status === 'completado';
        const isToday = typeof lead.created_at === 'string' && lead.created_at >= today;

        if (isCompleted) completed += 1;
        if (isToday) todayCount += 1;

        const sistema = String(lead.sistema || '').trim().toLowerCase();
        let agentKey: string | null = null;
        if (sistema === 'instagram') {
          agentKey = 'instagram';
        } else if (sistema === 'whatsapp') {
          agentKey = 'whatsapp';
        } else if (sistema === 'telegram') {
          agentKey = 'telegram';
        }

        if (agentKey) {
          nextAgentStats[agentKey].total += 1;
          if (isCompleted) nextAgentStats[agentKey].completed += 1;
          if (isToday) nextAgentStats[agentKey].today += 1;
        }
      });

      setLeadsTotal(total);
      setLeadsCompleted(completed);
      setLeadsToday(todayCount);
      setAgentLeadStats(nextAgentStats);

      // Seed channelLastActive: si hay leads de hoy, marcar como activo ahora
      const now = Date.now();
      setChannelLastActive(prev => {
        const next = { ...prev };
        if (nextAgentStats.instagram.today > 0 && prev.instagram === 0) next.instagram = now;
        if (nextAgentStats.whatsapp.today > 0 && prev.whatsapp === 0) next.whatsapp = now;
        if (nextAgentStats.telegram.today > 0 && prev.telegram === 0) next.telegram = now;
        channelLastActiveRef.current = next;
        return next;
      });

      // Comprobar si el usuario tiene un token de Telegram usado (vinculado)
      try {
        const { count: tgCount, error: tgError } = await supabase
          .from('telegram_link_tokens')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('used', true);

        if (tgError) {
          console.error('Error checking telegram tokens', tgError);
          setTelegramConnected(false);
        } else {
          setTelegramConnected((tgCount || 0) > 0);
        }
      } catch (e) {
        console.error('Unexpected error checking telegram tokens', e);
        setTelegramConnected(false);
      }

      try {
        let apptQuery = supabase
          .from('appointments')
          .select('status, starts_at')
          .eq('user_id', session.user.id);
        if (filterBranch !== 'all') {
          apptQuery = apptQuery.eq('branch_id', filterBranch);
        }
        const { data: appts, error: apptError } = await apptQuery;

        if (!apptError && appts) {
          const todayStr = new Date().toISOString().split('T')[0];
          const stats: CalendarStats = { total: appts.length, confirmed: 0, today: 0 };
          appts.forEach(a => {
            if (a.status === 'confirmed' || a.status === 'completed') stats.confirmed++;
            if (typeof a.starts_at === 'string' && a.starts_at >= todayStr) stats.today++;
          });
          setCalendarStats(stats);
          if (stats.today > 0) {
            setChannelLastActive(prev => {
              if (prev.calendar === 0) {
                const next = { ...prev, calendar: Date.now() };
                channelLastActiveRef.current = next;
                return next;
              }
              return prev;
            });
          }
        }
      } catch (e) {
        console.error('Error fetching appointment stats', e);
      }

      try {
        const { count, error: gcalErr } = await supabase
          .from('staff_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .not('google_calendar_id', 'is', null);
        if (!gcalErr) setCalendarConnected((count || 0) > 0);
      } catch (e) {
        console.error('Error checking google calendar', e);
      }
    } catch (err) {
      console.error('Error fetching stats', err);
    } finally {
      setLoading(false);
    }
  }, [session.user.id, filterBranch]);

  useEffect(() => {
    fetchStats();
  }, [session.user.id, fetchStats, filterBranch]);

  // Refs para detectar qué canal consumió créditos comparando contadores per-channel
  const lastMsgCountsRef = useRef({ ig: 0, tg: 0, wpp: 0 });

  // Realtime: leads INSERT, appointments INSERT, profiles UPDATE (per-channel), whatsapp_messages INSERT
  useEffect(() => {
    // Cargar contadores iniciales
    supabase.from('profiles').select('messages_used, messages_used_tl, messages_used_wpp').eq('id', session.user.id).single()
      .then(({ data }) => {
        if (data) {
          lastMsgCountsRef.current = {
            ig: (data as any).messages_used || 0,
            tg: (data as any).messages_used_tl || 0,
            wpp: (data as any).messages_used_wpp || 0,
          };
        }
      });

    const wakeChannel = (key: string) => {
      const now = Date.now();
      setChannelLastActive(prev => {
        const next = { ...prev, [key]: now };
        channelLastActiveRef.current = next;
        return next;
      });
    };

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'leads',
        filter: `user_id=eq.${session.user.id}`,
      }, (payload) => {
        const sistema = String((payload.new as any)?.sistema || '').toLowerCase();
        if (sistema === 'instagram' || sistema === 'whatsapp' || sistema === 'telegram') {
          wakeChannel(sistema);
        }
        fetchStats();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'appointments',
        filter: `user_id=eq.${session.user.id}`,
      }, () => {
        wakeChannel('calendar');
        fetchStats();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${session.user.id}`,
      }, (payload) => {
        const row = payload.new as any;
        const newIg = row?.messages_used || 0;
        const newTg = row?.messages_used_tl || 0;
        const newWpp = row?.messages_used_wpp || 0;
        const prev = lastMsgCountsRef.current;

        if (newIg > prev.ig) wakeChannel('instagram');
        if (newTg > prev.tg) wakeChannel('telegram');
        if (newWpp > prev.wpp) wakeChannel('whatsapp');

        lastMsgCountsRef.current = { ig: newIg, tg: newTg, wpp: newWpp };
        fetchStats();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `user_id=eq.${session.user.id}`,
      }, () => {
        wakeChannel('whatsapp');
        fetchStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session.user.id, fetchStats]);

  // Interval: cada 30s re-evalúa si algún canal debe volver a dormir
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const ref = channelLastActiveRef.current;
      const anyExpired = Object.values(ref).some(ts => ts > 0 && (now - ts) >= AWAKE_TIMEOUT);
      if (anyExpired) {
        setChannelLastActive(prev => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            if (next[key] > 0 && (now - next[key]) >= AWAKE_TIMEOUT) next[key] = 0;
          }
          channelLastActiveRef.current = next;
          return next;
        });
      }
      setTick(t => t + 1);
    }, 30_000);
    return () => clearInterval(interval);
  }, [AWAKE_TIMEOUT]);

  const aiCredits = profile?.ai_credits_used || 0;
  const isConnected = !!instance?.provider_id;
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const planType = planCodeToDisplay(effectivePlan(profile)).toUpperCase();

  useEffect(() => {
    async function checkWpp() {
      try {
        const { count, error } = await supabase
          .from('whatsapp_connections')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('active', true);
        if (!error) setWhatsappConnected((count || 0) > 0);
      } catch (_) { /* silent */ }
    }
    checkWpp();
  }, [session.user.id]);

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
        { label: 'Créditos IA usados', value: aiCredits },
        { label: 'Ventas capturadas', value: agentLeadStats.instagram.total },
        { label: 'Ventas cerradas', value: agentLeadStats.instagram.completed },
        { label: 'Leads hoy', value: agentLeadStats.instagram.today },
      ],
      action: () => onNavigate('instagram'),
      connected: isConnected,
    },
    {
      id: 'whatsapp',
      name: 'Agente WhatsApp',
      status: whatsappConnected ? 'Activo' : 'Desconectado',
      color: whatsappConnected ? 'from-green-500 to-emerald-600' : 'from-gray-700 to-gray-800',
      statusColor: whatsappConnected ? 'text-green-400' : 'text-red-400',
      dotColor: whatsappConnected ? 'bg-green-400' : 'bg-red-400',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 2a10 10 0 00-8.6 15.1L2 22l4.9-1.4A10 10 0 1012 2z" />
        </svg>
      ),
      stats: [
        { label: 'Créditos IA usados', value: aiCredits },
        { label: 'Ventas capturadas', value: agentLeadStats.whatsapp.total },
        { label: 'Ventas cerradas', value: agentLeadStats.whatsapp.completed },
        { label: 'Leads hoy', value: agentLeadStats.whatsapp.today },
      ],
      action: () => onNavigate('whatsapp'),
      connected: whatsappConnected,
    },
    {
      id: 'telegram',
      name: 'Agente Telegram',
      status: telegramConnected ? 'Activo' : 'Desconectado',
      color: telegramConnected ? 'from-blue-500 to-cyan-600' : 'from-gray-700 to-gray-800',
      statusColor: telegramConnected ? 'text-green-400' : 'text-red-400',
      dotColor: telegramConnected ? 'bg-green-400' : 'bg-red-400',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 2L11 13" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
      ),
      stats: [
        { label: 'Créditos IA usados', value: aiCredits },
        { label: 'Leads capturados', value: agentLeadStats.telegram.total },
        { label: 'Ventas cerradas', value: agentLeadStats.telegram.completed },
        { label: 'Leads hoy', value: agentLeadStats.telegram.today },
      ],
      action: () => onNavigate('telegram'),
      connected: telegramConnected,
    },
    {
      id: 'google-calendar',
      name: 'Agente Calendar',
      status: !profile?.scheduling_enabled ? 'Desactivado' : calendarConnected ? 'Activo' : 'Desconectado',
      color: !profile?.scheduling_enabled ? 'from-gray-700 to-gray-800' : calendarConnected ? 'from-blue-500 to-indigo-600' : 'from-gray-700 to-gray-800',
      statusColor: !profile?.scheduling_enabled ? 'text-gray-400' : calendarConnected ? 'text-green-400' : 'text-red-400',
      dotColor: !profile?.scheduling_enabled ? 'bg-gray-500' : calendarConnected ? 'bg-green-400' : 'bg-red-400',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      stats: [
        { label: 'Citas generadas', value: calendarStats.total },
        { label: 'Citas confirmadas', value: calendarStats.confirmed },
        { label: 'Citas hoy', value: calendarStats.today },
        { label: 'Calendario', value: calendarConnected ? 'Vinculado' : 'Sin vincular' },
      ],
      action: () => onNavigate('scheduling'),
      connected: calendarConnected,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Panel de Agentes <span className="text-blue-400">IA</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Monitorea el rendimiento de tus agentes inteligentes • Plan {planType}
          </p>
        </div>
        {branches.length > 1 && (
          <select
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/10 text-gray-300 w-fit"
          >
            <option value="all">Todas las sucursales</option>
            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Agentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
              {agent.stats.map((stat) => {
                const displayValue = typeof stat.value === 'number' ? stat.value.toLocaleString('es-CL') : stat.value;

                return (
                <div key={`${agent.id}-${stat.label}`} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{stat.label}</span>
                  <span className="text-sm font-bold text-white tabular-nums">
                    {loading && typeof stat.value === 'number' ? (
                      <span className="inline-block w-8 h-4 bg-gray-800 rounded animate-pulse" />
                    ) : (
                      displayValue
                    )}
                  </span>
                </div>
              )})}
            </div>

            {/* Acción */}
            <div className="px-4 pb-4">
              <button
                onClick={agent.action}
                className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  agent.connected
                    ? 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border border-indigo-500/30'
                }`}
              >
                {agent.connected ? 'Ver panel' : 'Conectar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Office Scene */}
      <AgentsOfficeScene
        igActive={isConnected}
        waActive={whatsappConnected}
        tgActive={telegramConnected}
        calActive={calendarConnected}
        igMessage={channelLastActive.instagram > 0 && (Date.now() - channelLastActive.instagram) < AWAKE_TIMEOUT}
        waMessage={channelLastActive.whatsapp > 0 && (Date.now() - channelLastActive.whatsapp) < AWAKE_TIMEOUT}
        tgMessage={channelLastActive.telegram > 0 && (Date.now() - channelLastActive.telegram) < AWAKE_TIMEOUT}
        calMessage={channelLastActive.calendar > 0 && (Date.now() - channelLastActive.calendar) < AWAKE_TIMEOUT}
        stats={{
          messages: aiCredits,
          leads: leadsTotal,
          sales: leadsCompleted,
          appointments: calendarStats.total,
        }}
      />
    </div>
  );
}