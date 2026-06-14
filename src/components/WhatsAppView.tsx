import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'
import { normalizePlanType } from '../utils/planUtils'
import { Session } from '@supabase/supabase-js'

declare global {
  interface Window {
    FB: any
    fbAsyncInit: () => void
  }
}

const APP_ID = '1397698478805069'
const CONFIG_ID = '1710544543478147'

interface WhatsAppViewProps {
  session: Session
  profile: any
  instance: any
  onUpdate?: () => void
  goToPlans?: () => void
}

interface WppConnection {
  id: string
  phone_number_id: string
  waba_id: string
  display_phone_number: string
  active: boolean
  created_at: string
  updated_at: string
}

type SdkStatus = 'loading-sdk' | 'sdk-ready' | 'connecting' | 'exchanging'

export default function WhatsAppView({ session, profile, instance, onUpdate, goToPlans }: WhatsAppViewProps) {
  const [connection, setConnection] = useState<WppConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [sdkStatus, setSdkStatus] = useState<SdkStatus>('loading-sdk')
  const [errorMsg, setErrorMsg] = useState('')

  const planCode = normalizePlanType(profile?.plan_type)
  const [planMessagesLimit, setPlanMessagesLimit] = useState<number | null>(null)

  const fetchConnection = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error
      setConnection(data?.[0] ?? null)
    } catch (err) {
      console.error('Error fetching whatsapp connection:', err)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => { fetchConnection() }, [fetchConnection])

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

  // Facebook SDK
  useEffect(() => {
    window.fbAsyncInit = function () {
      window.FB.init({ appId: APP_ID, cookie: true, xfbml: true, version: 'v25.0' })
      setSdkStatus('sdk-ready')
    }
    const scriptId = 'facebook-jssdk'
    if (!document.getElementById(scriptId)) {
      const js = document.createElement('script')
      js.id = scriptId
      js.src = 'https://connect.facebook.net/en_US/sdk.js'
      document.body.appendChild(js)
    } else if (window.FB) {
      setSdkStatus('sdk-ready')
    }
  }, [])

  const launchWhatsAppLogin = () => {
    if (!window.FB) return
    setSdkStatus('connecting')
    setErrorMsg('')

    window.FB.login((response: any) => {
      if (response.authResponse) {
        handleCodeExchange(response.authResponse.code)
      } else {
        setSdkStatus('sdk-ready')
        Swal.fire('Cancelado', 'No se completó la vinculación con Meta.', 'info')
      }
    }, {
      config_id: CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: { sessionInfoVersion: '3', version: 'v4' }
    })
  }

  const handleCodeExchange = async (code: string) => {
    setSdkStatus('exchanging')
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) {
        setErrorMsg('Sesión expirada.')
        Swal.fire('Error', 'Debes iniciar sesión antes de vincular WhatsApp.', 'error')
        setSdkStatus('sdk-ready')
        return
      }

      const response = await fetch('/api/whatsapp-link-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({ code })
      })

      if (response.ok) {
        const data = await response.json().catch(() => ({}))
        Swal.fire({
          icon: 'success',
          title: '¡Conectado!',
          text: data.connection?.display_phone_number
            ? `Número ${data.connection.display_phone_number} vinculado correctamente.`
            : 'Tu cuenta de WhatsApp fue vinculada correctamente.',
          confirmButtonColor: '#10B981'
        })
        await fetchConnection()
        onUpdate?.()
      } else {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Error al vincular')
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Error desconocido')
      Swal.fire('Error', error.message || 'No se pudo completar la vinculación.', 'error')
    } finally {
      setSdkStatus('sdk-ready')
    }
  }

  const toggleActive = async () => {
    if (!connection) return
    const newActive = !connection.active
    const action = newActive ? 'reactivar' : 'pausar'

    const confirm = await Swal.fire({
      title: newActive ? '¿Reactivar WhatsApp?' : '¿Pausar WhatsApp?',
      text: newActive
        ? 'Tu asistente IA volverá a responder mensajes de WhatsApp.'
        : 'Tu asistente IA dejará de responder mensajes de WhatsApp. Podrás reactivarlo en cualquier momento.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: newActive ? 'Reactivar' : 'Pausar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: newActive ? '#10B981' : '#EF4444',
      background: '#1a1a1a',
      color: '#fff'
    })
    if (!confirm.isConfirmed) return

    setToggling(true)
    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .update({ active: newActive })
        .eq('id', connection.id)

      if (error) throw error
      setConnection({ ...connection, active: newActive })
      Swal.fire({
        icon: 'success',
        title: newActive ? 'WhatsApp reactivado' : 'WhatsApp pausado',
        text: newActive ? 'Tu bot está recibiendo mensajes nuevamente.' : 'Tu bot dejó de recibir mensajes.',
        timer: 2500,
        showConfirmButton: false,
        background: '#1a1a1a',
        color: '#fff'
      })
      onUpdate?.()
    } catch (err: any) {
      console.error(`Error al ${action}:`, err)
      Swal.fire('Error', `No se pudo ${action} la conexión.`, 'error')
    } finally {
      setToggling(false)
    }
  }

  // Credits
  const messagesUsed = profile?.messages_used_wpp ?? 0
  const usagePct = planMessagesLimit ? Math.min((messagesUsed / planMessagesLimit) * 100, 100) : 0
  let barColor = '#25D366'
  if (usagePct > 85) barColor = '#ef4444'
  else if (usagePct > 60) barColor = '#f59e0b'
  const limitReached = planMessagesLimit !== null && messagesUsed >= planMessagesLimit

  // Status styling
  let statusCardBg: string
  let statusDotClass: string
  let statusTextClass: string
  let statusLabel: string

  if (!connection) {
    statusCardBg = 'bg-gray-900/60 border-white/5'
    statusDotClass = 'bg-gray-600'
    statusTextClass = 'text-gray-500'
    statusLabel = 'Sin Conexión'
  } else if (limitReached) {
    statusCardBg = 'bg-red-950/20 border-red-500/30'
    statusDotClass = 'bg-red-500'
    statusTextClass = 'text-red-400'
    statusLabel = 'Bot Pausado — Límite'
  } else if (!connection.active) {
    statusCardBg = 'bg-amber-950/20 border-amber-500/30'
    statusDotClass = 'bg-amber-400'
    statusTextClass = 'text-amber-400'
    statusLabel = 'Pausado'
  } else {
    statusCardBg = 'bg-emerald-900/20 border-emerald-700/30'
    statusDotClass = 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]'
    statusTextClass = 'text-emerald-400'
    statusLabel = 'En Línea'
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 tracking-widest uppercase">Cargando</p>
        </div>
      </div>
    )
  }

  const isProcessing = sdkStatus === 'connecting' || sdkStatus === 'exchanging'
  const sdkReady = sdkStatus === 'sdk-ready'

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">WhatsApp</h2>
        <p className="text-gray-400 text-sm">Vincula tu número de WhatsApp Business para que tu asistente IA responda a tus clientes.</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* CONNECTION STATUS */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 space-y-4 backdrop-blur-sm">
          <p className="text-[11px] font-bold tracking-[0.18em] text-gray-500 uppercase text-center">Estado de WhatsApp</p>
          <div className={`rounded-xl p-4 text-center space-y-2 border ${statusCardBg}`}>
            <div className={`w-3 h-3 rounded-full mx-auto ${statusDotClass}`} />
            <p className={`text-sm font-extrabold tracking-widest uppercase ${statusTextClass}`}>
              {statusLabel}
            </p>

            {connection && (
              <>
                <div className="h-px bg-white/5 mx-2" />
                <p className="text-[10px] tracking-widest text-gray-500 uppercase">Número vinculado</p>
                <div className="inline-block bg-black/40 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-white font-mono">{connection.display_phone_number}</span>
                </div>
                {connection.phone_number_id && (
                  <p className="text-[10px] text-gray-600 font-mono">{connection.phone_number_id}</p>
                )}
              </>
            )}
          </div>

          {connection && (
            <button
              onClick={toggleActive}
              disabled={toggling}
              className={`w-full py-2 text-xs font-bold rounded-xl border transition-all ${
                connection.active
                  ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                  : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              {toggling
                ? 'Procesando...'
                : connection.active
                  ? '⏸ Pausar recepción'
                  : '▶ Reactivar recepción'}
            </button>
          )}
        </div>

        {/* MONTHLY CREDITS */}
        <div className={`rounded-2xl bg-white/[0.03] border p-5 space-y-4 backdrop-blur-sm ${limitReached ? 'border-red-500/40' : 'border-white/5'}`}>
          <p className="text-[11px] font-bold tracking-[0.18em] text-gray-500 uppercase text-center">Créditos Mensuales</p>
          <div className={`rounded-xl border p-4 text-center space-y-3 ${limitReached ? 'bg-red-950/30 border-red-500/30' : 'bg-gray-900/60 border-white/5'}`}>
            <p className="text-4xl font-black tracking-tight text-white italic">{(profile?.plan_type || 'FREE').toUpperCase()}</p>
            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>USO</span>
              <span className="font-mono text-white">
                {messagesUsed.toLocaleString('es-CL')} / {planMessagesLimit ? planMessagesLimit.toLocaleString('es-CL') : '∞'}
              </span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: planMessagesLimit ? `${usagePct}%` : '100%',
                  background: planMessagesLimit ? barColor : '#25D366',
                  opacity: planMessagesLimit ? 1 : 0.4
                }}
              />
            </div>
            {!planMessagesLimit && (
              <p className="text-[10px] text-emerald-400/70 italic">Mensajes ilimitados bajo política de uso justo</p>
            )}
            {limitReached && (
              <p className="text-[10px] text-red-400 font-bold tracking-wide uppercase">Límite alcanzado — bot pausado</p>
            )}
            {!limitReached && planMessagesLimit && usagePct > 85 && (
              <p className="text-[10px] text-amber-400 italic">Cerca del límite — considera actualizar tu plan</p>
            )}
          </div>
          {planCode !== 'full' && (
            <button
              onClick={() => goToPlans?.()}
              className="w-full py-2 text-xs font-bold rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all"
            >
              Ver planes →
            </button>
          )}
        </div>
      </div>

      {/* CONNECT CARD — shown when no connection exists */}
      {!connection && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-8 backdrop-blur-sm text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#25D366]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Conecta tu WhatsApp Business</h3>
            <p className="text-sm text-gray-500">Vincula tu cuenta de Meta Business para recibir y responder mensajes automáticamente.</p>
          </div>
          <button
            onClick={launchWhatsAppLogin}
            disabled={!sdkReady || isProcessing}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#25D366] hover:bg-[#1da851] hover:shadow-[0_0_20px_rgba(37,211,102,0.3)]"
          >
            {isProcessing && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {sdkStatus === 'loading-sdk' ? 'Cargando SDK...'
              : sdkStatus === 'connecting' ? 'Conectando...'
              : sdkStatus === 'exchanging' ? 'Vinculando...'
              : 'Conectar con WhatsApp'}
          </button>
          {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
        </div>
      )}

      {/* INFO BANNER when connected */}
      {connection && connection.active && !limitReached && (
        <div className="p-4 rounded-xl bg-emerald-900/10 border border-emerald-800/30 flex items-start gap-3">
          <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-emerald-300 font-semibold">Tu asistente IA está activo</p>
            <p className="text-xs text-emerald-400/60 mt-0.5">Los mensajes que lleguen a <span className="font-mono">{connection.display_phone_number}</span> serán respondidos automáticamente por tu bot.</p>
          </div>
        </div>
      )}

      {connection && !connection.active && (
        <div className="p-4 rounded-xl bg-amber-900/10 border border-amber-800/30 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.832c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-sm text-amber-300 font-semibold">Recepción pausada</p>
            <p className="text-xs text-amber-400/60 mt-0.5">Tu número <span className="font-mono">{connection.display_phone_number}</span> está vinculado pero no está respondiendo mensajes. Haz clic en "Reactivar" para volver a recibir.</p>
          </div>
        </div>
      )}
    </div>
  )
}
