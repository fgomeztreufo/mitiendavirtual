import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'
import { FiInstagram, FiSave, FiAlertCircle, FiSettings, FiCheckCircle } from 'react-icons/fi'

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
    className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-gray-400 border border-gray-600 rounded-full hover:text-white hover:border-white hover:bg-gray-700 transition-all cursor-help"
  >
    ?
  </button>
)

export default function InstagramView({ session, profile, instance, onUpdate }: InstagramViewProps) {
  const [saving, setSaving] = useState(false)
  
  const [botPrompt, setBotPrompt] = useState('')
  const [publicReply, setPublicReply] = useState('')
  const [ownerName, setOwnerName] = useState('')

  // --- ESTADOS DEL MAGO ---
  const [wizName, setWizName] = useState('')
  const [wizNameAssistans, setWizNameAssistans] = useState('')
  const [wizType, setWizType] = useState('')
  const [wizTone, setWizTone] = useState('Amable y cercano con uso de emojis')

  useEffect(() => {
    if (profile) {
      setPublicReply(profile.public_reply || '');
      setOwnerName(profile.full_name || '');
    }
    if (instance) {
      setBotPrompt(instance.bot_prompt || '');
    }
  }, [profile, instance]);

  const createTemplate = () => {
    return `
ROL: Eres el asistente virtual oficial de "${wizName}" (${wizType}).
TONO DE VOZ: ${wizTone}.

=== REGLAS DE BIENVENIDA Y PERSONA ===
1. IDENTIDAD: Tu nombre es ${wizNameAssistans}. Eres la asistente virtual oficial de este negocio. 
2. PROTOCOLO DE PRESENTACIÓN:
   - Tu prioridad en el primer mensaje es establecer tu identidad. 
   - Si NO conoces el nombre del usuario: "¡Hola! Soy ${wizNameAssistans}. ¿Cómo te llamas?".
   - Si el usuario pregunta algo directamente (ej: "¿Precios?"): Saluda primero, responde después.
3. MEMORIA DE NOMBRE: Una vez que el usuario te diga su nombre, úsalo en cada respuesta para generar cercanía.

=== DATOS DEL DUEÑO ===
Nombre: ${ownerName}.

=== REGLAS DE NEGOCIO ===
- Si detectas intención de compra o reclamo, transfiere a un humano inmediatamente.
- Eres un empleado real de ${wizName}, no una IA genérica.

=== REGLAS DE DESPEDIDA ===
- Siempre despídete de manera cálida y personalizada usando el nombre del cliente.
`.trim();
  }

  const handleGenerateMagic = () => {
    if (!wizName || !wizType || !wizNameAssistans) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Todos los campos del mago son obligatorios.' })
      return;
    }
    setBotPrompt(createTemplate());
    Swal.fire({ title: '¡Personalidad Creada! ✨', text: 'El prompt ha sido actualizado.', icon: 'success', timer: 2000, showConfirmButton: false })
  }

  const handleInstagramLogin = () => {
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
        await supabase.from('instances').update({ provider_id: null }).eq('id', instance.id);
        Swal.fire('Desconectado', 'Cuenta desvinculada con éxito.', 'success');
        onUpdate(); 
      } catch (e: any) {
        Swal.fire('Error', e.message, 'error');
      } finally {
        setSaving(false);
      }
    }
  }

  async function handleSaveBot() {
    // VALIDACIÓN DE OBLIGATORIEDAD
    if (!publicReply || publicReply.trim() === '') {
      Swal.fire({ 
        icon: 'error', 
        title: 'Campo Obligatorio', 
        text: 'La "Respuesta Automática a Comentarios" no puede estar vacía.' 
      });
      return;
    }

    try {
      setSaving(true);
      const { error: instError } = await supabase
        .from('instances')
        .update({ bot_prompt: botPrompt })
        .eq('id', instance.id);

      const { error: profError } = await supabase
        .from('profiles')
        .update({ 
          public_reply: publicReply, 
          full_name: ownerName 
        })
        .eq('id', session.user.id);
      
      if (instError || profError) throw new Error("Error al guardar en base de datos");
      
      await Swal.fire({ icon: 'success', title: '¡Configuración Guardada!', timer: 1500, showConfirmButton: false });
      onUpdate();
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    } finally {
      setSaving(false);
    }
  }

  if (!profile || !instance) return <div className="p-10 text-center text-gray-500 animate-pulse font-bold uppercase tracking-widest">Cargando Sistema...</div>;

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <header>
        <h1 className="text-3xl font-black text-white italic tracking-tighter">
          CONFIGURACIÓN <span className="text-blue-600 not-italic font-thin"> AGENTE AI</span>
        </h1>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Personalidad e Interacción Directa</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 backdrop-blur-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-blue-400 flex items-center gap-2">
              <FiSettings className="animate-spin-slow" /> Mago de Personalidad
            </h2>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Nombre del Negocio</label>
                  <input value={wizName} onChange={(e) => setWizName(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white focus:border-blue-600 outline-none transition-all" placeholder="Ej: Pipe Store" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Rubro / Especialidad</label>
                  <input value={wizType} onChange={(e) => setWizType(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white focus:border-blue-600 outline-none transition-all" placeholder="Ej: Venta de calzado" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Nombre de la Asistente (IA)</label>
                <input value={wizNameAssistans} onChange={(e) => setWizNameAssistans(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white focus:border-blue-600 outline-none transition-all" placeholder="Ej: Luna"/>
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Tono de Voz</label>
                <select value={wizTone} onChange={(e) => setWizTone(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white focus:border-blue-600 outline-none cursor-pointer">
                  <option value="Amable, cercano y con uso de emojis">Amable y Cercano (Recomendado)</option>
                  <option value="Profesional, serio y directo">Profesional y Directo</option>
                  <option value="Divertido, juvenil y muy entusiasta">Juvenil y Divertido</option>
                </select>
              </div>
              <button onClick={handleGenerateMagic} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-tighter rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                ✨ Generar ADN de IA
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                Instrucciones del Sistema
                <HelpBtn title="Cerebro de la IA" text="Aquí se guarda lo que generaste con el mago. Puedes editarlo manualmente si quieres más detalle." />
              </h2>
            </div>
            <textarea value={botPrompt} onChange={(e) => setBotPrompt(e.target.value)} className="w-full h-64 bg-black border border-zinc-800 rounded-2xl p-6 text-sm text-zinc-300 font-mono focus:border-blue-600 outline-none resize-none" />
          </div>

          {/* RESPUESTA PÚBLICA (MOSTRADO DESDE BD Y OBLIGATORIO) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
            <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              💬 Respuesta Automática a Comentarios
              <span className="text-red-500 text-xs">* Obligatorio</span>
            </label>
            <input 
              value={publicReply} 
              onChange={(e) => setPublicReply(e.target.value)} 
              required
              className={`w-full bg-black border ${!publicReply ? 'border-red-500/50' : 'border-zinc-800'} rounded-xl p-4 text-white outline-none focus:border-emerald-600 transition-colors`} 
              placeholder="Ej: ¡Hola! Te enviamos los detalles por mensaje directo 📩" 
            />
          </div>

          <button onClick={handleSaveBot} disabled={saving} className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50">
            {saving ? 'Guardando...' : <><FiSave /> Guardar Cambios</>}
          </button>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">Canal Instagram</h3>
            {instance.provider_id ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 flex items-center gap-3">
                  <FiCheckCircle className="text-xl" />
                  <div className="font-bold text-sm">Conectado y Activo</div>
                </div>
                <button onClick={handleDisconnectInstagram} className="w-full py-3 text-[10px] font-black uppercase text-red-500 hover:bg-red-500/5 rounded-xl border border-red-500/20 transition-all">
                  Desvincular Cuenta
                </button>
              </div>
            ) : (
              <button onClick={handleInstagramLogin} className="w-full bg-[#1877F2] hover:bg-[#166fe5] py-4 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10">
                <FiInstagram className="text-xl" /> Conectar Business
              </button>
            )}
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Consumo Mensual</h3>
            <div className="text-3xl font-black text-white mb-6 italic tracking-tighter uppercase">
              Plan {profile.plan_type || 'Gratis'}
            </div>
            
            {(() => {
              const used = profile.messages_used || 0;
              const limit = profile.monthly_limit || 50;
              const percentage = Math.min((used / limit) * 100, 100);
              
              const barColor = percentage >= 90 ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 
                               percentage >= 70 ? 'bg-amber-500' : 
                               'bg-blue-600';

              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-zinc-500 uppercase">Mensajes IA</span>
                    <span className={`text-sm font-mono font-bold ${percentage >= 90 ? 'text-red-500' : 'text-white'}`}>
                      {used} / {limit}
                    </span>
                  </div>
                  
                  <div className="w-full bg-black h-3 rounded-full overflow-hidden border border-zinc-800">
                    <div 
                      className={`${barColor} h-full transition-all duration-1000 ease-out`} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {percentage >= 90 && (
                    <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <FiAlertCircle className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-red-500 font-bold leading-tight uppercase">
                        Alerta de límite: El bot dejará de responder pronto.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}   
          </div>
        </div>
      </div>_
    </div>
  )
}