import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiX, FiFilter, FiExternalLink, FiLoader } from 'react-icons/fi';

export default function LeadsView({ onClose, userId }: { onClose?: () => void, userId: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (userId) {
      fetchLeads();
    }
  }, [userId, filterStatus, days]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);

      let query = supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', dateLimit.toISOString())
        .order('created_at', { ascending: false });

      if (filterStatus !== 'todos') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error en Supabase:", error.message);
      } else {
        console.log("Datos cargados exitosamente:", data);
        setLeads(data || []);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (!error) {
      setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 p-6 md:p-12 font-sans">
      
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter italic">
              PIPELINE <span className="text-zinc-800 not-italic font-thin"> IA</span>
            </h1>
            <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest font-bold">Gestión de Conversión Directa</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
              <FiX className="w-6 h-6 text-zinc-600" />
            </button>
          )}
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap gap-4 items-center bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-tighter">
            <FiFilter className="text-amber-500" /> Filtrar:
          </div>
          
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-black border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500/50"
          >
            <option value="todos">Todos los estados</option>
            <option value="nuevo">Nuevos</option>
            <option value="cotizando">Cotizando</option>
            <option value="completado">Completados</option>
          </select>

          <select 
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-black border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500/50"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>

          {loading && <FiLoader className="animate-spin text-amber-500 ml-auto" />}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-[32px] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/60 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">
                <th className="px-8 py-5 border-b border-zinc-800/50">Cliente</th>
                <th className="px-8 py-5 border-b border-zinc-800/50">Intención</th>
                <th className="px-8 py-5 border-b border-zinc-800/50 text-center">Estado</th>
                <th className="px-8 py-5 border-b border-zinc-800/50 text-right">Valor Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {leads.map((lead) => (
                <tr key={lead.id} className="group hover:bg-white/[0.01] transition-all">
                  <td className="px-8 py-6">
                    <div className="text-zinc-100 font-bold text-base flex items-center gap-2">
                      {lead.cliente_nombre || 'Prospecto sin nombre'}
                      <a 
                        href={`https://wa.me/${lead.whatsapp_contacto?.replace(/\D/g,'')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="opacity-0 group-hover:opacity-100 text-emerald-500 hover:scale-110 transition-all"
                      >
                        <FiExternalLink />
                      </a>
                    </div>
                    <div className="text-zinc-600 text-[10px] font-mono mt-1 italic">{lead.whatsapp_contacto || 'Sin contacto'}</div>
                  </td>
                  
                  <td className="px-8 py-6">
                    <div className="text-amber-500/90 text-sm font-semibold tracking-tight">
                      {lead.intencion_compra || 'Interés general'}
                    </div>
                    <div className="text-zinc-500 text-[11px] font-light italic line-clamp-1">
                      {lead.resumen_chat ? `"${lead.resumen_chat}"` : 'Sin resumen'}
                    </div>
                  </td>

                  <td className="px-8 py-6 text-center">
                    <select 
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className={`
                        text-[9px] font-black px-2 py-1 rounded border transition-all outline-none cursor-pointer
                        ${lead.status === 'nuevo' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 
                          lead.status === 'completado' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 
                          'bg-zinc-800 border-zinc-700 text-zinc-400'}
                      `}
                    >
                      <option value="nuevo">NUEVO</option>
                      <option value="cotizando">COTIZANDO</option>
                      <option value="completado">COMPLETADO</option>
                    </select>
                  </td>

                  <td className="px-8 py-6 text-right font-mono text-white text-sm">
                    ${Number(lead.valor_estimado || 0).toLocaleString('es-CL')}
                    <div className="text-[9px] text-zinc-700 font-bold mt-1">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {!loading && leads.length === 0 && (
            <div className="py-24 text-center">
              <div className="text-zinc-800 font-black text-6xl mb-4 italic opacity-20">NO DATA</div>
              <p className="text-zinc-600 text-xs font-bold uppercase tracking-[0.3em]">
                Esperando capturas del Cosechador de Oro
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}