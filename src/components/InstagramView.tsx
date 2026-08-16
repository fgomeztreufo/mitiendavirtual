import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'
import { effectivePlan, planCodeToDisplay } from '../utils/planUtils'
import { buildInstagramOAuthUrl } from '../utils/instagramOAuth'
import AgentPersonalitySection from './AgentPersonalitySection'
import { FaInstagram } from 'react-icons/fa'

interface InstagramViewProps {
  session: Session
  profile: any
  instance: any
  onUpdate: () => void
  goToPlans?: () => void
  setActiveTab?: (tab: string) => void
}

export default function InstagramView({ session, profile, instance, onUpdate, goToPlans, setActiveTab }: InstagramViewProps) {
  const [saving, setSaving] = useState(false)
  const [personalityLoaded, setPersonalityLoaded] = useState(false)
  const [personalityName, setPersonalityName] = useState('')

  const [activationKeyword, setActivationKeyword] = useState('')
  const [antispamEnabled, setAntispamEnabled] = useState(false)
  const [replyPublic, setReplyPublic] = useState('')
  const [savingIgSettings, setSavingIgSettings] = useState(false)

  const planCode = effectivePlan(profile)
  const [planMessagesLimit, setPlanMessagesLimit] = useState<number | null>(null)

  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    let mounted = true
    async function loadPlanLimit() {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('messages_limit')
          .eq('code', planCode)
          .single()
        if (!error && mounted) setPlanMessagesLimit(data?.messages_limit ?? null)
      } catch (_) { /* silent */ }
    }
    if (planCode) loadPlanLimit()
    return () => { mounted = false }
  }, [planCode])

  useEffect(() => {
    if (instance) fetchConfig()

    if (instance?.id && !subscriptionRef.current) {
      const channel = supabase
        .channel('realtime-personality-' + instance.id)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'instance_personalities',
            filter: `instance_id=eq.${instance.id}`
          },
          () => { fetchConfig() }
        )
        .subscribe()
      subscriptionRef.current = channel
    }

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [instance])

  async function fetchConfig() {
    try {
      const { data } = await supabase
        .from('instance_personalities')
        .select('biz_name, ai_name, activation_keyword, antispam_enabled, reply_public')
        .eq('instance_id', instance.id)
        .single()

      if (data) {
        setPersonalityName(data.ai_name || data.biz_name || '')
        setActivationKeyword(data.activation_keyword || '')
        setAntispamEnabled(data.antispam_enabled ?? false)
        setReplyPublic(data.reply_public || '')
      }
    } catch (_) { /* silent */ }
    finally { setPersonalityLoaded(true) }
  }

  const handleInstagramLogin = async () => {
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
      })
      if (!result.isConfirmed) return
    }
    window.location.href = buildInstagramOAuthUrl(session.user.id)
  }

  const handleDisconnectInstagram = async () => {
    const result = await Swal.fire({
      title: '¿Desconectar Instagram?',
      text: 'Tu bot dejará de responder inmediatamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Sí, desvincular'
    })

    if (result.isConfirmed) {
      try {
        setSaving(true)
        await fetch(`${import.meta.env.VITE_WEBHOOK_BASE_URL || 'https://webhook.mitiendavirtual.cl'}/webhook/instagram-unsuscribed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id, instagramId: instance.provider_id })
        })
        const { error } = await supabase.from('instances').update({ provider_id: null }).eq('id', instance.id)
        if (error) throw error
        Swal.fire('Desconectado', 'La cuenta ha sido desvinculada.', 'success')
        onUpdate()
      } catch (e: any) {
        Swal.fire('Error', e.message, 'error')
      } finally {
        setSaving(false)
      }
    }
  }

  if (!profile || !instance) return <div className="p-10 text-center text-gray-400 animate-pulse uppercase font-black">Cargando...</div>

  // Credits
  const creditsUsed = Number(profile?.ai_credits_used ?? 0)
  const creditsLimit: number | null = planMessagesLimit
  const usagePct = creditsLimit ? Math.min((creditsUsed / creditsLimit) * 100, 100) : 0
  let barColor = '#E1306C'
  if (usagePct > 85) barColor = '#ef4444'
  else if (usagePct > 60) barColor = '#f59e0b'
  const limitReached = creditsLimit !== null && creditsUsed >= creditsLimit

  // Status
  const isConnected = !!instance.provider_id
  let statusCardBg: string
  let statusDotClass: string
  let statusTextClass: string
  let statusLabel: string

  if (limitReached) {
    statusCardBg = 'bg-red-50 border-red-200'
    statusDotClass = 'bg-red-500'
    statusTextClass = 'text-red-600'
    statusLabel = 'Bot Pausado'
  } else if (isConnected) {
    statusCardBg = 'bg-emerald-50 border-emerald-200'
    statusDotClass = 'bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.4)]'
    statusTextClass = 'text-emerald-600'
    statusLabel = 'Instagram Conectado'
  } else {
    statusCardBg = 'bg-gray-50 border-gray-200'
    statusDotClass = 'bg-gray-400'
    statusTextClass = 'text-gray-500'
    statusLabel = 'Sin Conexión'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Instagram</h2>
        <p className="text-gray-500 text-sm">Conecta tu cuenta de Instagram para que tu asistente IA responda comentarios y DMs automáticamente.</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* CONNECTION STATUS */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-4 shadow-sm">
          <p className="text-[11px] font-bold tracking-[0.18em] text-gray-400 uppercase text-center">Estado del Bot</p>
          <div className={`rounded-xl p-4 text-center space-y-2 border ${statusCardBg}`}>
            <div className={`w-3 h-3 rounded-full mx-auto ${statusDotClass}`} />
            <p className={`text-sm font-extrabold tracking-widest uppercase ${statusTextClass}`}>
              {statusLabel}
            </p>

            {isConnected && (
              <>
                <div className="h-px bg-gray-100 mx-2" />
                <p className="text-[10px] tracking-widest text-gray-400 uppercase">
                  {instance.ig_username ? 'Cuenta Vinculada' : 'ID de Cuenta Vinculada'}
                </p>
                <div className="inline-block bg-gray-100 rounded-lg px-3 py-1.5">
                  {instance.ig_username ? (
                    <span className="text-xs text-indigo-600 font-semibold">@{instance.ig_username}</span>
                  ) : (
                    <span className="text-xs text-gray-900 font-mono">{instance.provider_id}</span>
                  )}
                </div>
                {instance.ig_page_name && (
                  <p className="text-[11px] text-gray-500 mt-1">{instance.ig_page_name}</p>
                )}
              </>
            )}

            {isConnected && personalityLoaded && personalityName && (
              <>
                <div className="h-px bg-gray-100 mx-2" />
                <p className="text-[10px] tracking-widest text-gray-400 uppercase">Agente IA</p>
                <div className="inline-block bg-gray-100 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-emerald-600 font-mono">{personalityName}</span>
                </div>
              </>
            )}
          </div>

          {isConnected && (
            <button
              onClick={handleDisconnectInstagram}
              disabled={saving}
              className="w-full text-center text-[10px] text-red-500 cursor-pointer hover:text-red-600 transition-colors bg-transparent border-0 uppercase tracking-widest"
            >
              {saving ? 'Desvinculando...' : 'Desvincular cuenta'}
            </button>
          )}
        </div>

        {/* MONTHLY CREDITS */}
        <div className={`rounded-2xl bg-white border p-5 space-y-4 shadow-sm ${limitReached ? 'border-red-300' : 'border-gray-200'}`}>
          <p className="text-[11px] font-bold tracking-[0.18em] text-gray-400 uppercase text-center">Créditos Mensuales</p>
          <div className={`rounded-xl border p-4 text-center space-y-3 ${limitReached ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className="text-4xl font-black tracking-tight text-gray-900 italic">{planCodeToDisplay(planCode).toUpperCase()}</p>
            <div className="flex justify-between text-xs text-gray-500 px-1">
              <span>USO</span>
              <span className="font-mono text-gray-900">
                {creditsUsed.toLocaleString('es-CL')} / {creditsLimit ? creditsLimit.toLocaleString('es-CL') : '∞'}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: creditsLimit ? `${usagePct}%` : '100%',
                  background: creditsLimit ? barColor : '#E1306C',
                  opacity: creditsLimit ? 1 : 0.4
                }}
              />
            </div>
            {!creditsLimit && (
              <p className="text-[10px] text-pink-600/70 italic">Créditos IA incluidos en tu plan</p>
            )}
            {limitReached && (
              <p className="text-[10px] text-red-600 font-bold tracking-wide uppercase">Límite alcanzado — bot pausado</p>
            )}
            {!limitReached && creditsLimit && usagePct > 85 && (
              <p className="text-[10px] text-amber-600 italic">Cerca del límite — considera actualizar tu plan</p>
            )}
          </div>
          {planCode !== 'escala' && (
            <button
              onClick={() => goToPlans?.()}
              className="w-full py-2 text-xs font-bold rounded-xl border border-pink-300 text-pink-600 hover:bg-pink-50 transition-all"
            >
              Ver planes →
            </button>
          )}
        </div>
      </div>

      {/* CONNECT CARD — shown when no connection exists */}
      {!isConnected && (
        <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] bg-opacity-20 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Conecta tu Instagram</h3>
            <p className="text-sm text-gray-500">Vincula tu cuenta de Instagram Business para responder comentarios y DMs automáticamente.</p>
          </div>
          <button
            onClick={handleInstagramLogin}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] hover:shadow-[0_0_20px_rgba(225,48,108,0.3)]"
          >
            Conectar con Instagram
          </button>
        </div>
      )}

      {/* INFO BANNER when connected */}
      {isConnected && !limitReached && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
          <svg className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-emerald-700 font-semibold">Tu asistente IA está activo</p>
            <p className="text-xs text-emerald-600/70 mt-0.5">Los comentarios y mensajes directos en tu cuenta de Instagram serán respondidos automáticamente por tu bot.</p>
          </div>
        </div>
      )}

      {/* AGENT STATUS when connected */}
      {isConnected && personalityLoaded && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <div>
            <p className="text-sm text-blue-700 font-semibold">Agente IA configurado</p>
            <p className="text-xs text-blue-600/70 mt-0.5">
              {personalityName
                ? `Tu agente "${personalityName}" está entrenado y respondiendo con inteligencia RAG.`
                : 'Tu agente está configurado y respondiendo con inteligencia RAG.'}
            </p>
          </div>
        </div>
      )}

      {/* PERSONALITY SECTION */}
      {isConnected && instance?.id && (
        <AgentPersonalitySection
          instanceId={instance.id}
          channel="instagram"
          channelColor="from-[#833AB4]/5 to-[#E1306C]/5"
        />
      )}

      {/* CTA: Import products from Instagram */}
      {isConnected && (
        <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] p-[1px]">
          <div className="rounded-2xl bg-gradient-to-r from-[#833AB4]/10 via-[#E1306C]/10 to-[#F77737]/10 backdrop-blur-sm p-6 flex items-center gap-5">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#833AB4] to-[#E1306C] flex items-center justify-center">
              <FaInstagram className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900">Cargar productos desde Instagram</h3>
              <p className="text-xs text-gray-500 mt-0.5">Escanea tu feed y selecciona productos para importar a tu catálogo</p>
            </div>
            <button
              onClick={() => setActiveTab?.('ig-scanner')}
              className="flex-shrink-0 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-[#833AB4] to-[#E1306C] hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              Ir al escáner
            </button>
          </div>
        </div>
      )}

      {/* INSTAGRAM SETTINGS — Antispam + Palabra Clave */}
      {isConnected && personalityLoaded && (
        <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#833AB4]/5 to-[#E1306C]/5">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Configuración de Comentarios</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Controla cómo responde el bot a los comentarios de Instagram</p>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Palabra clave de activación
              </label>
              <input
                className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 text-sm outline-none focus:border-pink-500 transition-all"
                value={activationKeyword}
                onChange={e => setActivationKeyword(e.target.value)}
                placeholder="Ej: INFO, PRECIO, QUIERO"
                maxLength={50}
              />
              <p className="text-[9px] text-gray-400">El bot solo responderá comentarios que contengan esta palabra. Déjalo vacío para responder a todos.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Respuesta pública en comentarios
              </label>
              <textarea
                className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 text-sm outline-none focus:border-pink-500 transition-all h-20 resize-none"
                value={replyPublic}
                onChange={e => setReplyPublic(e.target.value)}
                placeholder="Ej: ¡Hola! Te enviamos toda la info por DM"
                maxLength={300}
              />
              <p className="text-[9px] text-gray-400">Este texto se publica como respuesta visible al comentario. La conversación detallada se envía por DM.</p>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="text-sm text-gray-900 font-semibold">Antispam</p>
                <p className="text-[10px] text-gray-500">Evita que el bot responda múltiples veces al mismo usuario en un comentario</p>
              </div>
              <button
                onClick={() => setAntispamEnabled(!antispamEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${antispamEnabled ? 'bg-pink-600' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${antispamEnabled ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>

            <button
              onClick={async () => {
                setSavingIgSettings(true)
                try {
                  const { error } = await supabase
                    .from('instance_personalities')
                    .update({
                      activation_keyword: activationKeyword.trim(),
                      antispam_enabled: antispamEnabled,
                      reply_public: replyPublic.trim(),
                    })
                    .eq('instance_id', instance.id)
                  if (error) throw error
                  Swal.fire({
                    icon: 'success',
                    title: 'Configuración guardada',
                    timer: 2000,
                    showConfirmButton: false,
                  })
                } catch (err: any) {
                  Swal.fire('Error', err.message, 'error')
                } finally {
                  setSavingIgSettings(false)
                }
              }}
              disabled={savingIgSettings}
              className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] bg-pink-600 hover:bg-pink-500 text-white transition-all hover:scale-[1.01]"
            >
              {savingIgSettings ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </div>
      )}

      {/* LIMIT REACHED BLOCK */}
      {limitReached && (
        <div className="relative rounded-2xl overflow-hidden border border-red-200 bg-red-50 p-6 text-center space-y-3">
          <div className="text-3xl">🚫</div>
          <p className="text-red-600 font-bold text-base">Bot pausado — límite mensual alcanzado</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Has usado todos tus créditos IA este mes. El bot no responderá hasta que actualices tu plan.
          </p>
          <button
            onClick={() => goToPlans?.()}
            className="px-6 py-2 text-sm font-bold rounded-xl bg-pink-600 hover:bg-pink-500 text-white transition-all"
          >
            Actualizar plan
          </button>
        </div>
      )}
    </div>
  )
}
