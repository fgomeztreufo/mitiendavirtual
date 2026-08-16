import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiX, FiFilter, FiExternalLink, FiLoader } from 'react-icons/fi';

export default function WhatsAppLeadsView({ onClose, userId }: Readonly<{ onClose?: () => void; userId: string }>) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [days, setDays] = useState(30);
  const [branches, setBranches] = useState<any[]>([]);
  const [filterBranch, setFilterBranch] = useState('all');

  useEffect(() => {
    supabase.from('branches').select('id, name').eq('user_id', userId).eq('is_active', true)
      .order('sort_order').then(({ data }) => { if (data) setBranches(data); });
  }, [userId]);

  useEffect(() => {
    if (userId) fetchLeads();
  }, [userId, filterStatus, days, filterBranch]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);

      let query = supabase
        .from('leads')
        .select('*, branches(name)')
        .eq('user_id', userId)
        .ilike('sistema', 'whatsapp')
        .gte('created_at', dateLimit.toISOString())
        .order('created_at', { ascending: false });

      if (filterStatus !== 'todos') {
        query = query.eq('status', filterStatus);
      }
      if (filterBranch !== 'all') {
        query = query.eq('branch_id', filterBranch);
      }

      const { data, error } = await query;
      if (error) console.error('Error en Supabase:', error.message);
      else setLeads(data || []);
    } catch (err) {
      console.error('Error inesperado:', err);
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
      setLeads(leads.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-500 p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter italic">
              PIPELINE <span className="text-green-600 not-italic font-thin">WhatsApp</span>
            </h1>
            <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest font-bold">
              Gestión de Conversión Directa
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <FiX className="w-6 h-6 text-gray-400" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-tighter">
            <FiFilter className="text-green-500" /> Filtrar:
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-3 py-2 outline-none focus:border-green-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="nuevo">Nuevos</option>
            <option value="cotizando">Cotizando</option>
            <option value="completado">Completados</option>
          </select>

          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-3 py-2 outline-none focus:border-green-500"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>

          {branches.length > 0 && (
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-3 py-2 outline-none focus:border-teal-500"
            >
              <option value="all">Todas las sucursales</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          {loading && <FiLoader className="animate-spin text-green-500 ml-auto" />}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white border border-gray-200 shadow-sm rounded-[32px] overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                <th className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-200">Cliente</th>
                <th className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-200">Intención</th>
                <th className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-200 text-center">Estado</th>
                <th className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-200 text-right">Valor Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => {
                let statusClass = 'bg-gray-100 border-gray-200 text-gray-500';
                if (lead.status === 'nuevo') statusClass = 'bg-green-50 border-green-200 text-green-600';
                else if (lead.status === 'completado') statusClass = 'bg-emerald-50 border-emerald-200 text-emerald-600';

                const phone = lead.whatsapp_contacto || '';
                const waLink = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : '#';

                return (
                  <tr key={lead.id} className="group hover:bg-gray-50 transition-all">
                    <td className="px-4 sm:px-8 py-4 sm:py-6">
                      <div className="text-gray-900 font-bold text-base flex items-center gap-2">
                        {lead.cliente_nombre || 'Prospecto sin nombre'}
                        {phone && (
                          <a href={waLink} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 text-green-500 hover:scale-110 transition-all">
                            <FiExternalLink />
                          </a>
                        )}
                      </div>
                      <div className="text-gray-400 text-[10px] font-mono mt-1 italic">
                        {phone || 'Sin contacto'}
                      </div>
                    </td>

                    <td className="px-4 sm:px-8 py-4 sm:py-6">
                      <div className="text-green-600 text-sm font-semibold tracking-tight">
                        {lead.intencion_compra || 'Interés general'}
                      </div>
                      <div className="text-gray-400 text-[11px] font-light italic line-clamp-1">
                        {lead.resumen_chat ? `"${lead.resumen_chat}"` : 'Sin resumen'}
                      </div>
                    </td>

                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className={`text-[9px] font-black px-2 py-1 rounded border transition-all outline-none cursor-pointer ${statusClass}`}
                      >
                        <option value="nuevo">NUEVO</option>
                        <option value="cotizando">COTIZANDO</option>
                        <option value="completado">COMPLETADO</option>
                      </select>
                    </td>

                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-right font-mono text-gray-900 text-sm">
                      ${Number(lead.valor_estimado || 0).toLocaleString('es-CL')}
                      <div className="text-[9px] text-gray-400 font-bold mt-1">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && leads.length === 0 && (
            <div className="py-24 text-center">
              <div className="text-gray-200 font-black text-6xl mb-4 italic opacity-20">NO DATA</div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em]">
                Sin leads de WhatsApp aún
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
