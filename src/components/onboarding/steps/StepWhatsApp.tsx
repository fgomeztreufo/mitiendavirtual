import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../../supabaseClient'

const APP_ID = '1397698478805069'
const CONFIG_ID = '1710544543478147'

declare global {
  interface Window {
    FB: any
    fbAsyncInit: () => void
  }
}

interface StepWhatsAppProps {
  session: any
  onNext: () => void
  onSkip: () => void
  onBack: () => void
  onRefreshData: () => void
}

export default function StepWhatsApp({ session, onNext, onSkip, onBack, onRefreshData }: StepWhatsAppProps) {
  const [sdkStatus, setSdkStatus] = useState<'loading' | 'ready' | 'connecting' | 'exchanging' | 'connected' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [connectedPhone, setConnectedPhone] = useState('')
  const sessionInfoRef = useRef<any>(null)

  useEffect(() => {
    if (window.FB) {
      setSdkStatus('ready')
      return
    }
    window.fbAsyncInit = function () {
      window.FB.init({ appId: APP_ID, cookie: true, xfbml: true, version: 'v25.0' })
      setSdkStatus('ready')
    }
    const scriptId = 'facebook-jssdk'
    if (!document.getElementById(scriptId)) {
      const js = document.createElement('script')
      js.id = scriptId
      js.src = 'https://connect.facebook.net/en_US/sdk.js'
      document.body.appendChild(js)
    }
  }, [])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          sessionInfoRef.current = data.data
        }
      } catch (_) {}
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const launchWhatsAppLogin = () => {
    if (!window.FB) return
    setSdkStatus('connecting')
    setErrorMsg('')
    sessionInfoRef.current = null

    window.FB.login((response: any) => {
      if (response.authResponse) {
        handleCodeExchange(response.authResponse.code)
      } else {
        setSdkStatus('ready')
        setErrorMsg('No se completo la vinculacion con Meta.')
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
        setErrorMsg('Sesion expirada.')
        setSdkStatus('error')
        return
      }

      const sessionInfo = sessionInfoRef.current || {}
      const response = await fetch('/api/whatsapp-link-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({
          code,
          waba_id: sessionInfo.waba_id || sessionInfo.wabaId || null,
          phone_number_id: sessionInfo.phone_number_id || sessionInfo.phoneNumberId || null
        })
      })

      if (response.ok) {
        const data = await response.json().catch(() => ({}))
        setConnectedPhone(data.connection?.display_phone_number || '')
        setSdkStatus('connected')
        onRefreshData()
      } else {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Error al vincular')
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Error desconocido')
      setSdkStatus('error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col items-center justify-center min-h-[70vh] px-6 max-w-lg mx-auto"
    >
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(37,211,102,0.3)]">
        <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </div>

      <h2 className="text-2xl font-black text-white mb-2 text-center">
        Conecta WhatsApp Business
      </h2>
      <p className="text-gray-500 text-sm mb-8 text-center">
        Vincula tu numero de WhatsApp Business para responder clientes automaticamente.
      </p>

      {sdkStatus === 'connected' ? (
        <div className="w-full max-w-xs space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <svg className="w-8 h-8 text-emerald-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-bold text-emerald-300">WhatsApp conectado</p>
            {connectedPhone && (
              <p className="text-xs text-emerald-400/60 mt-1 font-mono">{connectedPhone}</p>
            )}
          </div>
          <button
            onClick={onNext}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Continuar
          </button>
        </div>
      ) : (
        <div className="w-full max-w-xs space-y-4">
          <button
            onClick={launchWhatsAppLogin}
            disabled={sdkStatus === 'loading' || sdkStatus === 'connecting' || sdkStatus === 'exchanging'}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white disabled:opacity-50 hover:shadow-[0_0_30px_rgba(37,211,102,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {sdkStatus === 'loading' && 'Cargando SDK...'}
            {sdkStatus === 'ready' && 'Conectar WhatsApp Business'}
            {sdkStatus === 'connecting' && 'Conectando...'}
            {sdkStatus === 'exchanging' && 'Vinculando cuenta...'}
            {sdkStatus === 'error' && 'Reintentar'}
          </button>

          {errorMsg && (
            <p className="text-xs text-red-400 text-center">{errorMsg}</p>
          )}

          <p className="text-[10px] text-gray-600 text-center">
            Se abrira una ventana de Meta para vincular tu cuenta de WhatsApp Business.
          </p>
        </div>
      )}

      <div className="flex gap-4 mt-6">
        <button onClick={onBack} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          Volver
        </button>
        {sdkStatus !== 'connected' && (
          <button onClick={onSkip} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Omitir por ahora
          </button>
        )}
      </div>
    </motion.div>
  )
}
