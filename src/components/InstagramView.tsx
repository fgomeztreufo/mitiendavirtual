import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'

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

  // --- NUEVOS ESTADOS DEL MAGO ---
  const [wizName, setWizName] = useState('')
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

  // --- LÓGICA DEL MAGO ACTUALIZADA PARA RAG ---
  const createTemplate = () => {
    return `
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
  }

  const handleGenerateMagic = () => {
    if (!wizName || !wizType) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Nombre y Rubro son obligatorios.' })
      return;
    }
    setBotPrompt(createTemplate());
    Swal.fire({ title: '¡Personalidad Creada! ✨', text: 'Instrucciones actualizadas con soporte para Buscador Inteligente.', icon: 'success', timer: 2000, showConfirmButton: false })
  }

  // ... (handleInstagramLogin y handleDisconnect permanecen igual que en tu código original)
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
      await supabase.from('instances').update({ bot_prompt: botPrompt }).eq('id', instance.id);
      await supabase.from('profiles').update({ public_reply: publicReply, full_name: ownerName }).eq('id', session.user.id);
      Swal.fire({ icon: 'success', title: '¡Guardado!', timer: 1500, showConfirmButton: false });
      onUpdate();
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    } finally {
      setSaving(false);
    }
  }

  if (!profile || !instance) return <div className="p-10 text-center text-gray-500 animate-pulse">Cargando configuración...</div>;

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Hola, {ownerName || 'Emprendedor'} 👋</h1>
        <p className="text-gray-400">Configura la personalidad de tu IA conectada a tu catálogo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          
          {/* MAGO ACTUALIZADO: SIN PRODUCTOS, CON TONO */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-6 text-blue-400 flex items-center gap-2">✨ Definir Personalidad</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">NOMBRE DEL NEGOCIO</label>
                  <input value={wizName} onChange={(e) => setWizName(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-blue-500" placeholder="Ej: Zapatillas Pipe" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">RUBRO</label>
                  <input value={wizType} onChange={(e) => setWizType(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-blue-500" placeholder="Ej: Tienda de Calzado" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">TONO DE LA IA</label>
                <select 
                  value={wizTone} 
                  onChange={(e) => setWizTone(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="Amable, cercano y con uso de emojis">Amable y Cercano (Ideal Instagram)</option>
                  <option value="Profesional, serio y directo">Profesional y Ejecutivo</option>
                  <option value="Divertido, juvenil y muy entusiasta">Juvenil y Divertido</option>
                  <option value="Minimalista, responde solo lo justo y necesario">Minimalista</option>
                </select>
              </div>
              <button onClick={handleGenerateMagic} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20">
                ✨ Generar Instrucciones de Personalidad
              </button>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <h2 className="text-lg font-bold text-gray-300">📝 Prompt Final del Sistema</h2>
              <HelpBtn title="RAG Activado" text="Estas instrucciones le dicen a la IA que use tu base de datos cargada (FAQs y Productos) para responder." />
            </div>
            <textarea 
              value={botPrompt} 
              onChange={(e) => setBotPrompt(e.target.value)} 
              className="w-full h-48 bg-black border border-gray-700 rounded-lg p-4 text-sm text-gray-300 font-mono outline-none focus:border-blue-500" 
            />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <label className="block text-sm font-bold text-green-400 mb-4">💬 Respuesta en Comentarios</label>
            <input 
              value={publicReply} 
              onChange={(e) => setPublicReply(e.target.value)} 
              className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-green-500" 
              placeholder="Ej: ¡Hola! Te enviamos los detalles por DM 📩"
            />
          </div>

          <button onClick={handleSaveBot} disabled={saving} className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl text-lg hover:from-green-500 transition-all">
            {saving ? 'Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>

        {/* COLUMNA DERECHA PERMANECE IGUAL */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">Conexión con Instagram</h3>
            {instance.provider_id ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-900/20 border border-green-900 rounded-lg text-green-400 flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <div className="font-bold text-sm">Estado: Activo</div>
                  </div>
                </div>
                <button onClick={handleDisconnectInstagram} className="w-full py-2 text-xs text-red-400 hover:bg-red-900/10 rounded border border-red-900/30 transition-all">
                  Desvincular cuenta
                </button>
              </div>
            ) : (
              <button onClick={handleInstagramLogin} className="w-full bg-[#1877F2] hover:bg-[#166fe5] py-3 rounded-lg font-bold text-white transition-all">
                Conectar Instagram Business
              </button>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">Uso del Plan</h3>
            <div className="text-2xl font-bold text-white mb-4 capitalize">{profile.plan_type || 'Gratis'}</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Créditos</span>
                <span className="text-white font-bold">{profile.messages_used || 0} / {profile.monthly_limit || 50}</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-500" 
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