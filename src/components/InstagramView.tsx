import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'
import { FiSave, FiSettings, FiMessageSquare, FiShield, FiCpu } from 'react-icons/fi'

interface InstagramViewProps {
  session: Session
  profile: any
  instance: any
  onUpdate: () => void
}

const HelpBtn = ({ title, text }: { title: string, text: string }) => (
  <button
    onClick={() => Swal.fire({
      title: title,
      text: text,
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#2563EB',
      backdrop: `rgba(0,0,0,0.8)`
    })}
    className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-gray-400 border border-gray-600 rounded-full hover:text-white transition-all cursor-help"
  >
    ?
  </button>
)

export default function InstagramView({ session, profile, instance, onUpdate }: InstagramViewProps) {
  const [saving, setSaving] = useState(false)
  
  // Estados de Personalidad (Última versión RAG)
  const [wizName, setWizName] = useState('')
  const [wizType, setWizType] = useState('')
  const [wizAiName, setWizAiName] = useState('')
  const [wizTone, setWizTone] = useState('Amable, cercano y con uso de emojis')
  const [ownerName, setOwnerName] = useState('')
  
  // Estados de Configuración y Seguridad
  const [botPrompt, setBotPrompt] = useState('')
  const [publicReply, setPublicReply] = useState('')
  const [activationKeyword, setActivationKeyword] = useState('')
  const [antispamEnabled, setAntispamEnabled] = useState(true)

  useEffect(() => {
    if (instance) fetchConfig();
    if (profile) {
      setOwnerName(profile.full_name || '');
    }
  }, [instance, profile]);

  async function fetchConfig() {
    try {
      const { data } = await supabase
        .from('instance_personalities')
        .select('*')
        .eq('instance_id', instance.id)
        .single();
      
      if (data) {
        setWizName(data.biz_name || '');
        setWizType(data.biz_type || '');
        setWizAiName(data.ai_name || '');
        setWizTone(data.ai_tone || 'Amable, cercano y con uso de emojis');
        setBotPrompt(data.bot_prompt || '');
        setPublicReply(data.reply_public || '');
        setActivationKeyword(data.activation_keyword || '');
        setAntispamEnabled(data.antispam_enabled !== false);
      }
    } catch (e) { console.log("Cargando nueva configuración..."); }
  }

  // --- LÓGICA DEL MAGO ACTUALIZADA PARA RAG (LO ÚLTIMO QUE HICIMOS) ---
  const handleGenerateMagic = () => {
    if (!wizName || !wizType) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Nombre y Rubro son obligatorios.' });
      return;
    }

    const template = `
  NOMBRE DEL AGENTE: ${wizAiName || 'Asistente Virtual'}
  ROL: Eres el asistente virtual oficial de "${wizName}" (${wizType}).
  TONO DE VOZ: ${wizTone}.

  === CONECTIVIDAD RAG (CATÁLOGO VIVO) ===
  1. DEBES usar SIEMPRE la herramienta 'Call_Tool_-_Buscador_Inteligente_' para responder sobre productos, stock o servicios.
  2. NO inventes datos. Si la herramienta no devuelve resultados, informa que no hay disponibilidad por ahora.
  3. Tus respuestas deben ser breves (menos de 1000 caracteres).

  === DATOS DEL DUEÑO ===
  Nombre: ${ownerName}.

  === REGLAS DE NEGOCIO ===
  - Si detectas intención de compra o reclamo, transfiere a un humano inmediatamente.
  - Eres un empleado real de ${wizName}, no una IA genérica.
    `.trim();

    setBotPrompt(template);
    Swal.fire({ title: '¡ADN RAG Generado!', icon: 'success', timer: 1500, showConfirmButton: false });
  }

  const handleInstagramLogin = async () => {
    // Si ya hay cuenta conectada, pedir confirmación antes de reemplazarla
    if (instance?.provider_id) {
      const result = await Swal.fire({
        title: '¿Cambiar cuenta de Instagram?',
        html: `Ya tienes una cuenta conectada.<br>Si continúas, la cuenta actual será reemplazada.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#D4AF37',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Sí, cambiar cuenta',
        cancelButtonText: 'Cancelar',
        backdrop: 'rgba(0,0,0,0.8)'
      });
      if (!result.isConfirmed) return;
    }
    const clientId = '1397698478805069'; 
    const redirectUri = 'https://webhook.mitiendavirtual.cl/webhook/instagram-auth'; 
    const scopes = 'instagram_basic,instagram_manage_messages,pages_manage_metadata,pages_read_engagement,pages_show_list,business_management,instagram_manage_comments,pages_messaging';
    window.location.href = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=code&state=${session.user.id}`;
  }

  const handleDisconnectInstagram = async () => {
    const result = await Swal.fire({
      title: '¿Desconectar Instagram?',
      text: "Tu bot dejará de responder inmediatamente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Sí, desvincular'
    });
  
    if (result.isConfirmed) {
      try {
        setSaving(true);
        await fetch('https://webhook.mitiendavirtual.cl/webhook/instagram-unsuscribed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id, instagramId: instance.provider_id })
        });
        const { error } = await supabase.from('instances').update({ provider_id: null }).eq('id', instance.id);
        if (error) throw error;
        Swal.fire('Desconectado', 'La cuenta ha sido desvinculada.', 'success');
        onUpdate(); 
      } catch (e: any) {
        Swal.fire('Error', e.message, 'error');
      } finally {
        setSaving(false);
      }
    }
  }

  async function handleSaveBot() {
    try {
      setSaving(true);
      // Guardado unificado en la nueva tabla
      const { error } = await supabase.from('instance_personalities').upsert({
        instance_id: instance.id,
        biz_name: wizName,
        biz_type: wizType,
        ai_name: wizAiName,
        ai_tone: wizTone,
        bot_prompt: botPrompt,
        reply_public: publicReply,
        activation_keyword: activationKeyword,
        antispam_enabled: antispamEnabled
      }, { onConflict: 'instance_id' });

      if (error) throw error;
      
      Swal.fire({ icon: 'success', title: 'Configuración Guardada', timer: 1500, showConfirmButton: false });
      onUpdate();
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!profile || !instance) return <div className="p-10 text-center text-gray-500 animate-pulse uppercase font-black">Cargando...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in">
      <header>
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Hola, {ownerName || 'Emprendedor'} 👋</h1>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Configura la inteligencia de tu instancia</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          
          {/* MAGO DE PERSONALIDAD RAG - Diseño Cápsula Zinc */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 shadow-2xl backdrop-blur-md">
            <h2 className="text-xl font-bold mb-8 text-blue-400 flex items-center gap-2">
              <FiCpu className="animate-pulse" /> Definir Personalidad RAG
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nombre del Negocio</label>
                <input value={wizName} onChange={(e) => setWizName(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none transition-all" placeholder="Ej: Zapatillas Pipe" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Rubro</label>
                <input value={wizType} onChange={(e) => setWizType(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none transition-all" placeholder="Ej: Retail de Calzado" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-serif font-extrabold ml-2 tracking-wide text-customGold drop-shadow-sm uppercase flex items-center gap-2">
                  Nombre de tu Agente
                </label>
                <div className="relative group">
                  <input
                    value={wizAiName}
                    onChange={(e) => setWizAiName(e.target.value)}
                    className="w-full bg-[#121212] border-2 border-customGold/60 focus:border-customGold transition-all rounded-2xl p-4 text-white font-serif text-lg shadow-[0_2px_16px_rgba(212,175,55,0.10)] outline-none placeholder:text-customGold/40 placeholder:italic placeholder:font-light"
                    placeholder="Ej: Sofía, Luna, Max..."
                    maxLength={32}
                  />
                  <div className="absolute left-0 top-full mt-2 z-20 hidden group-hover:block w-max min-w-[220px] bg-[#181818] border border-customGold/80 text-customGold text-xs font-medium rounded-xl px-4 py-2 shadow-lg transition-all duration-200">
                    Este nombre será visible para tus clientes en los mensajes automáticos del bot.
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Tono de Voz</label>
                <select value={wizTone} onChange={(e) => setWizTone(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none appearance-none cursor-pointer">
                  <option value="Amable, cercano y con uso de emojis">Amable y Cercano (Ideal Instagram)</option>
                  <option value="Profesional, serio y directo">Profesional y Ejecutivo</option>
                  <option value="Divertido, juvenil y muy entusiasta">Juvenil y Divertido</option>
                </select>
              </div>
            </div>
            <button onClick={handleGenerateMagic} className="w-full mt-8 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-900/40">
              ✨ Generar ADN de IA con RAG
            </button>
          </div>

          {/* SECCIÓN DE SEGURIDAD */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <FiShield className="text-emerald-500" /> Seguridad y Filtros
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Palabra Clave (Keyword)</label>
                <input value={activationKeyword} onChange={(e) => setActivationKeyword(e.target.value)} placeholder="Ej: PRECIO" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-emerald-500" />
              </div>
              <div className="flex items-center justify-between p-6 bg-black border border-zinc-800 rounded-2xl mt-6">
                <span className="text-xs font-bold text-white uppercase italic">Anti-Spam</span>
                <input type="checkbox" checked={antispamEnabled} onChange={(e) => setAntispamEnabled(e.target.checked)} className="w-6 h-6 accent-blue-600 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* RESPUESTAS Y PROMPT */}
          <div className="space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 shadow-xl">
              <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-4 ml-2 flex items-center gap-2">
                <FiMessageSquare /> Respuesta en Comentarios
              </label>
              <input value={publicReply} onChange={(e) => setPublicReply(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-white outline-none focus:border-blue-600 transition-all" placeholder="Ej: ¡Hola! Te enviamos info al DM 📩" />
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 shadow-xl">
              <div className="flex items-center mb-4 ml-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Instrucciones del Sistema (Prompt RAG)</label>
                <HelpBtn title="RAG Activado" text="Estas instrucciones obligan a la IA a buscar productos en tu catálogo antes de responder." />
              </div>
              <textarea value={botPrompt} onChange={(e) => setBotPrompt(e.target.value)} className="w-full h-48 bg-black border border-zinc-800 rounded-2xl p-6 text-sm text-zinc-400 font-mono outline-none focus:border-blue-500 resize-none" />
            </div>
          </div>

          <button onClick={handleSaveBot} disabled={saving} className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.2em] rounded-3xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 shadow-2xl">
            {saving ? 'SINCRONIZANDO...' : <><FiSave className="text-xl" /> GUARDAR CONFIGURACIÓN</>}
          </button>
        </div>

        {/* COLUMNA DERECHA - ESTADÍSTICAS Y PLAN */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 backdrop-blur-md shadow-2xl">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase mb-6 tracking-widest text-center italic">Estado del Bot</h3>
            {instance.provider_id ? (
              <div className="space-y-4 text-center">
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[24px] text-emerald-500">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse mx-auto mb-2 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                  <div className="font-black text-xs uppercase tracking-tighter">Instagram Conectado</div>
                  {/* --- NUEVO: ID DE CUENTA LOGUEADA --- */}
                  <div className="mt-4 pt-4 border-t border-emerald-500/10">
                    <span className="text-[9px] font-black text-zinc-500 uppercase block mb-1">ID de Cuenta Vinculada</span>
                    <code className="bg-black/50 px-3 py-1 rounded-full text-[11px] font-mono text-emerald-400 border border-emerald-500/20">
                      {instance.provider_id}
                    </code>
                  </div>
                  {/* ----------------------------------- */}
                </div>
                <button onClick={handleDisconnectInstagram} className="w-full py-2 text-[10px] font-black text-red-500/50 hover:text-red-500 uppercase transition-all">
                  Desvincular cuenta
                </button>
              </div>
            ) : (
              <button onClick={handleInstagramLogin} className="w-full bg-[#1877F2] hover:bg-[#166fe5] py-4 rounded-2xl font-black text-white text-sm transition-all shadow-lg shadow-blue-700/20 uppercase tracking-widest">
                Conectar Instagram
              </button>
            )}
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 shadow-2xl">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase mb-4 text-center tracking-widest">Créditos Mensuales</h3>
            <div className="text-3xl font-black text-white mb-2 text-center italic tracking-tighter uppercase">{profile.plan_type || 'Gratis'}</div>
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black text-zinc-400 px-1">
                <span className="uppercase">Uso</span>
                <span>{profile.messages_used || 0} / {profile.monthly_limit || 50}</span>
              </div>
              <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden border border-zinc-700">
                <div 
                  className="bg-blue-600 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                  style={{ width: `${((profile.messages_used || 0) / (profile.monthly_limit || 50)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}