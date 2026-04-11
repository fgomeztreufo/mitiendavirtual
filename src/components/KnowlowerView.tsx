import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiMessageCircle, FiTag, FiClock, FiX, FiActivity, FiLayers } from 'react-icons/fi';

interface KnowlowerViewProps {
  onClose?: () => void;
  userId: string;
}

export default function KnowlowerView({ onClose, userId }: KnowlowerViewProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!userId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error) setDocuments(data || []);
      setLoading(false);
    };
    fetchDocuments();
  }, [userId]);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 p-4 md:p-12 font-sans selection:bg-amber-500/30">
      
      {/* Header Estilizado */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black tracking-[0.4em] text-amber-500/80 uppercase">Neural Intelligence</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic">
            CEREBRO <span className="text-zinc-800 not-italic font-thin">IA</span>
          </h1>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose} 
            className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-amber-500/40 transition-all active:scale-90"
          >
            <FiX className="w-5 h-5 text-zinc-500 hover:text-amber-500" />
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-40 gap-3">
            <div className="h-10 w-10 border-t-2 border-amber-500 border-zinc-900 rounded-full animate-spin"></div>
            <span className="text-[10px] tracking-widest text-zinc-700 font-bold uppercase">Sincronizando...</span>
          </div>
        ) : (
          <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-[32px] overflow-hidden overflow-x-auto backdrop-blur-3xl">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-zinc-900/60">
                  <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50">Pregunta</th>
                  <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50">Respuesta Definida</th>
                  <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50 text-center">Tag</th>
                  <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50 text-right">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {documents.map((doc) => (
                  <tr key={doc.id} className="group hover:bg-amber-500/[0.02] transition-colors duration-500">
                    {/* Columna Pregunta: Letra más chica y elegante */}
                    <td className="px-4 sm:px-8 py-4 sm:py-6 max-w-[250px]">
                      <div className="text-zinc-200 text-sm font-semibold leading-snug group-hover:text-amber-200 transition-colors">
                        {doc.question}
                      </div>
                    </td>

                    {/* Columna Respuesta: Separada y discreta */}
                    <td className="px-4 sm:px-8 py-4 sm:py-6">
                      <div className="text-zinc-500 text-xs font-light leading-relaxed italic max-w-xl">
                        "{doc.answer}"
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                      <span className="inline-block px-2 py-0.5 rounded border border-zinc-800 text-[9px] font-bold text-zinc-500 group-hover:border-amber-500/30 transition-colors">
                        {doc.category?.toUpperCase() || 'GENERAL'}
                      </span>
                    </td>

                    {/* Estatus */}
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-right">
                      {doc.is_active ? (
                        <span className="text-[10px] font-black text-emerald-500/80 tracking-tighter flex items-center justify-end gap-1.5">
                          <span className="h-1 w-1 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-zinc-700 tracking-tighter">
                          OFFLINE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}