// src/components/WhatsAppView.tsx
import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { Session } from '@supabase/supabase-js'

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

interface DiscoveredNumber {
  phone_number_id: string
  waba_id: string
  waba_name: string
  display_phone_number: string
  verified_name: string
  quality_rating: string
}

function getAuthToken(session?: Session) {
  return (session as any)?.access_token || (session as any)?.accessToken || ''
}

export default function WhatsAppView({ session, onUpdate }: WhatsAppViewProps) {
  const [metaToken, setMetaToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [discovered, setDiscovered] = useState<DiscoveredNumber[]>([])
  const [selected, setSelected] = useState<DiscoveredNumber | null>(null)
  const [saving, setSaving] = useState(false)
  const [connection, setConnection] = useState<WaConnection | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => { loadConnection() }, [session])

  async function loadConnection() {
    const authToken = getAuthToken(session)
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
      console.warn('No se pudo cargar estado WhatsApp', err)
    } finally {
      setLoadingStatus(false)
    }
  }

  async function discoverNumbers() {
    if (!metaToken.trim()) {
      Swal.fire('Campo requerido', 'Pega el Access Token de Meta para continuar.', 'warning')
      return
    }
    setDiscovering(true)
    setDiscovered([])
    setSelected(null)
    try {
      const res = await fetch('/api/whatsapp-discover', {
        headers: { Authorization: `Bearer ${metaToken.trim()}` }
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        Swal.fire('Error', data.message || 'Token inválido o sin permisos de WhatsApp Business.', 'error')
        return
      }
      const nums: DiscoveredNumber[] = data.numbers || []
      if (nums.length === 0) {
        Swal.fire('Sin números', 'No se encontraron números WhatsApp Business asociados a este token.', 'info')
        return
      }
      setDiscovered(nums)
      if (nums.length === 1) setSelected(nums[0])
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'Error al consultar la API de Meta.', 'error')
    } finally {
      setDiscovering(false)
    }
  }

  async function saveConnection() {
    if (!selected) {
      Swal.fire('Selecciona un número', 'Elige el número que quieres vincular.', 'warning')
      return
    }
    const authToken = getAuthToken(session)
    setSaving(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers.Authorization = `Bearer ${authToken}`
      const body = {
        phone_number_id: selected.phone_number_id,
        business_account_id: selected.waba_id,
        display_phone_number: selected.display_phone_number,
        access_token: metaToken.trim()
      }
      const res = await fetch('/api/whatsapp-link-start', { method: 'POST', headers, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        Swal.fire('Error', err.message || 'No se pudo guardar.', 'error')
        return
      }
      Swal.fire({
        title: '¡Vinculado!',
        html: `<p>El número <strong>${selected.display_phone_number}</strong> quedó conectado.<br/>El Portero ya puede responder mensajes.</p>`,
        icon: 'success'
      })
      setMetaToken('')
      setDiscovered([])
      setSelected(null)
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
      text: 'El Portero dejará de responder mensajes de este número.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desvincular',
      cancelButtonText: 'Cancelar'
    })
    if (!confirm.isConfirmed) return
    const authToken = getAuthToken(session)
    setSaving(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers.Authorization = `Bearer ${authToken}`
      const res = await fetch('/api/whatsapp-link-start', {
        method: 'POST', headers,
        body: JSON.stringify({ phone_number_id: connection?.phone_number_id, active: false })
      })
      if (res.ok) {
        Swal.fire('Desvinculado', 'Número desactivado.', 'success')
        setConnection(null)
        onUpdate?.()
      } else {
        Swal.fire('Error', 'No se pudo desvincular.', 'error')
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
          <p className="text-sm text-gray-400">Conecta tu cuenta de WhatsApp Business. Solo necesitas el token de acceso — nosotros detectamos el número automáticamente.</p>
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
              {connection.display_phone_number || 'Número vinculado'}
            </p>
            <p className="text-xs text-gray-500 truncate">ID: {connection.phone_number_id}</p>
          </div>
          <button onClick={() => void deactivateConnection()} disabled={saving}
            className="text-xs text-red-400 hover:text-red-300 shrink-0">
            Desvincular
          </button>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-gray-800/60 border border-gray-700/40">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-500 shrink-0" />
          <span className="text-sm text-gray-400">Sin número vinculado</span>
        </div>
      )}

      {/* Paso 1: Access Token */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Token de acceso de Meta
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Encuéntralo en{' '}
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer"
            className="text-green-400 hover:underline">
            developers.facebook.com
          </a>
          {' '}→ tu app → WhatsApp → API Setup → "Temporary access token"
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showToken ? 'text' : 'password'}
              value={metaToken}
              onChange={(e) => { setMetaToken(e.target.value); setDiscovered([]); setSelected(null) }}
              placeholder="EAAxxxxxxxxxxxxxxx..."
              className="w-full bg-black border border-gray-800 rounded-xl p-2 pr-10 text-sm focus:border-green-700 outline-none"
            />
            <button type="button" onClick={() => setShowToken(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs">
              {showToken ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          <button onClick={() => void discoverNumbers()} disabled={discovering || !metaToken.trim()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-xl text-sm text-white whitespace-nowrap">
            {discovering ? 'Buscando...' : 'Buscar números'}
          </button>
        </div>
      </div>

      {/* Paso 2: Seleccionar número */}
      {discovered.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Números encontrados — elige el que quieres vincular
          </label>
          <div className="flex flex-col gap-2">
            {discovered.map(num => (
              <button key={num.phone_number_id}
                onClick={() => setSelected(num)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                  selected?.phone_number_id === num.phone_number_id
                    ? 'border-green-600 bg-green-900/20'
                    : 'border-gray-700 bg-gray-800/40 hover:border-gray-600'
                }`}>
                <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                  selected?.phone_number_id === num.phone_number_id
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-600'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {num.display_phone_number}
                    {num.verified_name && <span className="text-gray-400 font-normal ml-2">· {num.verified_name}</span>}
                  </p>
                  {num.waba_name && <p className="text-xs text-gray-500">Cuenta: {num.waba_name}</p>}
                </div>
                {num.quality_rating && (
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    num.quality_rating === 'GREEN' ? 'bg-green-900/40 text-green-400' :
                    num.quality_rating === 'YELLOW' ? 'bg-yellow-900/40 text-yellow-400' :
                    'bg-red-900/40 text-red-400'
                  }`}>
                    {num.quality_rating}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Botón vincular */}
      {(discovered.length > 0 || connection) && (
        <div className="flex gap-3 mt-2">
          {discovered.length > 0 && (
            <button onClick={() => void saveConnection()} disabled={saving || !selected}
              className="py-2 px-5 bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded-xl text-white text-sm font-medium">
              {saving ? 'Guardando...' : connection ? 'Actualizar número' : `Vincular ${selected?.display_phone_number || 'número'}`}
            </button>
          )}
        </div>
      )}

      {/* Webhook info */}
      <div className="mt-6 p-3 rounded-xl bg-gray-800/50 border border-gray-700/40 text-xs text-gray-500">
        <span className="font-medium text-gray-400">Webhook activo en Meta:</span>{' '}
        <code className="text-green-400">https://webhook.mitiendavirtual.cl/webhook/whatsapp-webhook</code>
      </div>
    </div>
  )
}