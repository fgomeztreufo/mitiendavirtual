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
  const [phoneNumber, setPhoneNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [connection, setConnection] = useState<WaConnection | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => { loadConnection() }, [session])

  async function loadConnection() {
    let authToken = await getAuthToken(session)
    let tries = 0
    while (!authToken && tries < 6) {
      await new Promise((r) => setTimeout(r, 250))
      authToken = await getAuthToken(session)
      tries += 1
    }
    if (!authToken) { setLoadingStatus(false); return }
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

  async function saveConnection(e: React.FormEvent) {
    e.preventDefault()
    
    // Limpiamos espacios y caracteres extraños del número para estandarizarlo
    const cleanPhone = phoneNumber.replace(/[\s\-()]/g, '')
    if (!cleanPhone) {
      Swal.fire('Campo requerido', 'Por favor ingresa el número de teléfono.', 'warning')
      return
    }

    const authToken = await getAuthToken(session)
    setSaving(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers.Authorization = `Bearer ${authToken}`
      
      // Enviamos solo el número. n8n se encargará de buscar sus IDs en Meta
      const body = {
        display_phone_number: cleanPhone
      }

      const res = await fetch('/api/whatsapp-link-start', { 
        method: 'POST', 
        headers, 
        body: JSON.stringify(body) 
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        Swal.fire('Error de vinculación', data.message || 'No encontramos ese número registrado en nuestra cuenta de Meta.', 'error')
        return
      }

      Swal.fire({
        title: '¡WhatsApp Vinculado!',
        html: `<p>Hemos detectado y configurado tu número <strong>${data.display_phone_number || cleanPhone}</strong> de forma automática.<br/>El Portero IA ya está activo.</p>`,
        icon: 'success'
      })

      setPhoneNumber('')
      await loadConnection()
      onUpdate?.()
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'Error al comunicarse con el servidor.', 'error')
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
      cancelButtonText: 'Cancelar'
    })
    if (!confirm.isConfirmed) return
    
    const authToken = await getAuthToken(session)
    setSaving(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers.Authorization = `Bearer ${authToken}`
      const res = await fetch('/api/whatsapp-link-start', {
        method: 'POST', headers,
        body: JSON.stringify({ phone_number_id: connection?.phone_number_id, active: false })
      })
      if (res.ok) {
        Swal.fire('Desvinculado', 'Número desactivado correctamente.', 'success')
        setConnection(null)
        onUpdate?.()
      } else {
        Swal.fire('Error', 'No se pudo desvincular el número.', 'error')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-green-900/20 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold">WhatsApp Business</h3>
          <p className="text-sm text-gray-400">Activa el bot de Inteligencia Artificial ingresando el número telefónico de tu tienda.</p>
        </div>
      </div>

      {/* Estado actual */}
      {loadingStatus ? (
        <div className="mb-5 text-sm text-gray-500">Cargando estado...</div>
      ) : connection ? (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-green-900/20 border border-green-800/40">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-300">
              {connection.display_phone_number || 'Número activo'}
            </p>
            <p className="text-xs text-gray-500 truncate">Canal IA inicializado correctamente</p>
          </div>
          <button onClick={() => void deactivateConnection()} disabled={saving}
            className="text-xs text-red-400 hover:text-red-300 shrink-0 font-medium">
            Desvincular canal
          </button>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-gray-800/60 border border-gray-700/40">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-500 shrink-0" />
          <span className="text-sm text-gray-400">Sin WhatsApp activo en esta tienda</span>
        </div>
      )}

      {/* Formulario de un solo campo */}
      {!connection && (
        <form onSubmit={(e) => { void saveConnection(e) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Número de Teléfono WhatsApp
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Ingresa el número con el código de país (ej: 56912345678). Debe estar previamente asignado a la plataforma.
            </p>
            <input
              type="text"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Ej: 56912345678"
              className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm focus:border-green-700 outline-none text-white font-medium"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-5 bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded-xl text-white text-sm font-medium transition-colors"
            >
              {saving ? 'Buscando y vinculando...' : 'Vincular y Activar Portero IA'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}