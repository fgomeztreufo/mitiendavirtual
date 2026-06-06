import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

interface WhatsAppViewProps {
  session?: Session
  onUpdate?: () => void
}

interface WaConnection {
  id: string
  phone_number_id: string
  waba_id: string | null
  display_phone_number: string | null
  active: boolean
  created_at: string
}

async function getAuthToken(session?: Session) {
  const maybe = (session as any)?.access_token || (session as any)?.accessToken
  if (maybe) return maybe
  try {
    const { data } = await supabase.auth.getSession()
    return (data as any)?.session?.access_token || ''
  } catch (e) {
    return ''
  }
}

export default function WhatsAppView({ session, onUpdate }: WhatsAppViewProps) {
  const [saving, setSaving] = useState(false)
  const [connection, setConnection] = useState<WaConnection | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => { 
    void loadConnection() 
    initFacebookSDK()
  }, [session])

  async function loadConnection() {
    let authToken = await getAuthToken(session)
    let tries = 0
    while (!authToken && tries < 6) {
      await new Promise((r) => setTimeout(r, 250))
      authToken = await getAuthToken(session)
      tries += 1
    }
    if (!authToken) { 
      setLoadingStatus(false)
      return 
    }
    setLoadingStatus(true)
    try {
      const res = await fetch('/api/whatsapp-link-start', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      if (res.ok) {
        const data = await res.json().catch(() => null)
        if (data?.connection) setConnection(data.connection)
      }
    } catch (err) {
      console.warn('No se pudo cargar el estado de WhatsApp', err)
    } finally {
      setLoadingStatus(false)
    }
  }

  // 1. Inicializar el SDK de Facebook en caliente
  const initFacebookSDK = () => {
    if (document.getElementById('facebook-jssdk')) return

    (window as any).fbAsyncInit = function() {
      (window as any).FB.init({
        appId: '139769478805069', // Tu ID de aplicación de Meta
        cookie: true,
        xfbml: true,
        version: 'v20.0'
      })
    }

    const fjs = document.getElementsByTagName('script')[0]
    const js = document.createElement('script') as HTMLScriptElement
    js.id = 'facebook-jssdk'
    js.src = "https://connect.facebook.net/es_LA/sdk.js"
    fjs.parentNode?.insertBefore(js, fjs)
  }

  // 2. Disparador del Popup oficial de Meta (Embedded Sign-Up)
  const launchEmbeddedSignUp = () => {
    if (!(window as any).FB) {
      void Swal.fire('Error', 'El SDK de Facebook aún no se ha cargado. Reintenta.', 'error')
      return
    }

    setSaving(true)
    const self_setSaving = setSaving

    ;(window as any).FB.login((response: any) => {
      if (response.authResponse) {
        const code = response.authResponse.code
        if (code) {
          // El cliente aceptó y nos dio el código de intercambio temporal
          void sendCodeToBackend(code)
        } else {
          self_setSaving(false)
          void Swal.fire('Cancelado', 'No se recibió el código de autorización de Meta.', 'warning')
        }
      } else {
        self_setSaving(false)
        console.log('El usuario canceló el login o no autorizó la app.')
      }
    }, {
      config_id: 'TU_CONFIG_ID_DE_EMBEDDED_SIGNUP', // REEMPLAZAR con el ID que obtengas en Meta Developers
      response_type: 'code',
      override_permissions: true
    })
  }

  // 3. Enviar el código temporal a tu Backend / n8n para hacer el canje real
  async function sendCodeToBackend(code: string) {
    const authToken = await getAuthToken(session)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers.Authorization = `Bearer ${authToken}`

      const res = await fetch('/api/whatsapp-link-start', { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ code }) 
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        void Swal.fire('Error de vinculación', data.message || 'No se pudo procesar la cuenta de WhatsApp.', 'error')
        return
      }

      void Swal.fire({
        title: '¡WhatsApp Vinculado con Éxito!',
        html: `<p class="text-gray-300">Hemos enlazado tu cuenta comercial de forma segura.<br/>El Portero IA ya está leyendo tu línea.</p>`,
        icon: 'success',
        background: '#111827',
        color: '#fff',
        confirmButtonColor: '#10B981'
      })

      await loadConnection()
      onUpdate?.()
    } catch (err) {
      console.error(err)
      void Swal.fire('Error', 'Error al comunicarse con el backend.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deactivateConnection() {
    const confirm = await Swal.fire({
      title: '¿Desvincular número?',
      text: 'El Portero IA dejará de responder mensajes en este número de forma inmediata.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desvincular',
      cancelButtonText: 'Cancelar',
      background: '#111827',
      color: '#fff',
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#374151'
    })
    if (!confirm.isConfirmed) return
    
    const authToken = await getAuthToken(session)
    setSaving(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers.Authorization = `Bearer ${authToken}`
      const res = await fetch('/api/whatsapp-link-start', {
        method: 'POST', 
        headers,
        body: JSON.stringify({ phone_number_id: connection?.phone_number_id, active: false })
      })
      if (res.ok) {
        void Swal.fire({
          title: 'Desvinculado',
          text: 'Número desactivado correctamente.',
          icon: 'success',
          background: '#111827',
          color: '#fff'
        })
        setConnection(null)
        onUpdate?.()
      } else {
        void Swal.fire('Error', 'No se pudo desvincular el número.', 'error')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 rounded-3xl bg-gray-950 border border-gray-900 shadow-2xl max-w-xl mx-auto">
      {/* Encabezado */}
      <div className="flex items-start gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-green-500/20 to-emerald-500/10 flex items-center justify-center shrink-0 border border-green-500/20 shadow-inner">
          <svg className="w-7 h-7 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight text-white">Canal Core: WhatsApp Business</h3>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">Conecta tu cuenta comercial de Meta mediante el flujo seguro multicliente.</p>
        </div>
      </div>

      {/* Estados Visuales Dinámicos */}
      {loadingStatus ? (
        <div className="mb-6 py-4 flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
          Sincronizando estado operacional...
        </div>
      ) : connection ? (
        <div className="mb-8 p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-4 shadow-sm backdrop-blur-md">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-emerald-400 tracking-wide">
              {connection.display_phone_number || 'Línea de Negocio Activa'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Instancia de Portero IA corriendo en producción</p>
          </div>
          <button 
            onClick={() => void deactivateConnection()} 
            disabled={saving}
            className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
          >
            Desvincular
          </button>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-xl bg-gray-900/40 border border-gray-900 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-400">Esperando vinculación oficial por inicio de sesión</span>
        </div>
      )}

      {/* Botón de Login Oficial de Meta */}
      {!connection && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400 leading-relaxed text-center">
            Haz clic abajo para iniciar sesión de forma segura con Meta. Podrás seleccionar tu número de WhatsApp Business verificado en un par de clics.
          </p>
          <button
            type="button"
            onClick={launchEmbeddedSignUp}
            disabled={saving}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-40 rounded-xl text-white text-sm font-bold tracking-wide transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 active:scale-[0.99]"
          >
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {saving ? 'Conectando con Meta...' : 'Conectar mi WhatsApp con Meta'}
          </button>
        </div>
      )}
    </div>
  )
}