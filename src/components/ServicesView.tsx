import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'
import { Session } from '@supabase/supabase-js'

interface Service {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
  buffer_minutes: number
  is_active: boolean
  sort_order: number
}

interface ServicesViewProps {
  session: Session
  profile: any
  onUpdate?: () => void
  goToPlans?: () => void
}

const EMPTY_FORM = { name: '', description: '', duration_minutes: '30', price: '', buffer_minutes: '0' }

export default function ServicesView({ session, profile, onUpdate }: ServicesViewProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [showSchedulingConfig, setShowSchedulingConfig] = useState(false)

  const userId = session?.user?.id

  const fetchServices = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order')
      if (!error && data) setServices(data)
    } catch (err) {
      console.error('Error loading services:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchServices() }, [fetchServices])

  const resetForm = () => {
    setFormData(EMPTY_FORM)
    setEditingService(null)
  }

  const startEdit = (svc: Service) => {
    setEditingService(svc)
    setFormData({
      name: svc.name,
      description: svc.description || '',
      duration_minutes: String(svc.duration_minutes),
      price: svc.price ? String(svc.price) : '',
      buffer_minutes: String(svc.buffer_minutes),
    })
    if (svc.duration_minutes > 0 || svc.buffer_minutes > 0) {
      setShowSchedulingConfig(true)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        duration_minutes: parseInt(formData.duration_minutes) || 30,
        price: formData.price ? parseInt(formData.price) : null,
        buffer_minutes: parseInt(formData.buffer_minutes) || 0,
      }

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', editingService.id)
        if (error) throw error

        Swal.fire({
          icon: 'success',
          title: 'Servicio actualizado',
          background: '#111827', color: '#fff',
          timer: 2000, showConfirmButton: false,
        })
      } else {
        const { error } = await supabase
          .from('services')
          .insert({ ...payload, user_id: userId })
        if (error) throw error

        Swal.fire({
          icon: 'success',
          title: '¡Servicio creado!',
          text: 'Tu IA ya conoce este servicio.',
          background: '#111827', color: '#fff',
          timer: 2500, showConfirmButton: false,
        })
      }

      resetForm()
      fetchServices()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudo guardar el servicio.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (svc: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !svc.is_active })
      .eq('id', svc.id)
    if (error) { Swal.fire('Error', error.message, 'error'); return }
    fetchServices()
  }

  const deleteService = async (svc: Service) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar "${svc.name}"?`,
      text: 'Se eliminará permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      background: '#1a1a1a', color: '#fff',
    })
    if (!isConfirmed) return

    const { error } = await supabase.from('services').delete().eq('id', svc.id)
    if (error) { Swal.fire('Error', error.message, 'error'); return }

    if (editingService?.id === svc.id) resetForm()
    fetchServices()
    if (onUpdate) onUpdate()
  }

  const activeCount = services.filter(s => s.is_active).length

  return (
    <div className="animate-fade-in p-4 md:p-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter uppercase">Mis Servicios</h1>
        </div>
        <div className="p-4 rounded-2xl w-full md:w-auto bg-gray-900 border border-gray-800">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-emerald-500 rounded-full" />
              <span className="text-gray-400">{activeCount} activo{activeCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-gray-600 rounded-full" />
              <span className="text-gray-500">{services.length - activeCount} inactivo{services.length - activeCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* FORMULARIO */}
        <div className="lg:col-span-3 bg-[#111827] border border-gray-800 rounded-[2rem] p-8 relative overflow-hidden">
          {editingService && (
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Editando: {editingService.name}</p>
              <button onClick={resetForm} className="text-xs text-gray-500 hover:text-white transition-colors">Cancelar edición</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nombre del Servicio</label>
                <input
                  required
                  className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Corte de pelo, Consulta médica"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Precio ($ CLP) <span className="text-gray-700 normal-case">(opcional)</span></label>
                <input
                  type="number"
                  className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  placeholder="15000"
                />
              </div>
            </div>

            {/* SECCIÓN COLAPSABLE: AGENDA */}
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSchedulingConfig(!showSchedulingConfig)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">📅</span>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Configuración de Agenda</span>
                  <span className="text-[9px] text-gray-700 normal-case">(opcional — solo si usas agendamiento)</span>
                </div>
                <svg className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${showSchedulingConfig ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showSchedulingConfig && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Duración (minutos)</label>
                    <input
                      type="number"
                      min="5"
                      className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                      value={formData.duration_minutes}
                      onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })}
                      placeholder="30"
                    />
                    <span className="text-[9px] text-gray-700">Cuánto dura una sesión de este servicio</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Buffer entre citas (min)</label>
                    <input
                      type="number"
                      min="0"
                      className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                      value={formData.buffer_minutes}
                      onChange={e => setFormData({ ...formData, buffer_minutes: e.target.value })}
                      placeholder="0"
                    />
                    <span className="text-[9px] text-gray-700">Tiempo de descanso entre cita y cita</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 text-left">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Descripción para la IA</label>
              <textarea
                className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all text-sm h-24 resize-none"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalla qué incluye el servicio, para quién es ideal, materiales, etc."
              />
            </div>

            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl ${
                saving || !formData.name.trim()
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : editingService
                    ? 'bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.01] shadow-indigo-900/20'
                    : 'bg-blue-600 hover:bg-blue-500 hover:scale-[1.01] shadow-blue-900/20'
              }`}
            >
              {saving ? 'Guardando...' : editingService ? 'Actualizar Servicio' : '🚀 Guardar Servicio'}
            </button>
          </form>
        </div>

        {/* COLUMNA DERECHA: PREVIEW + LISTA */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* PREVIEW BOT */}
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest italic">Referencia de Vista Cliente</p>
            <div className="w-full max-w-[280px] bg-black border-[8px] border-[#1f2937] rounded-[3rem] p-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-900 pb-2">
                <div className="w-6 h-6 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full" />
                <div className="h-2 w-16 bg-gray-800 rounded-full" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="bg-indigo-600 text-white text-[9px] px-3 py-2 rounded-2xl rounded-tr-none max-w-[80%]">
                    Me interesa <strong>{formData.name || 'conocer sus servicios'}</strong>, ¿cuánto cuesta?
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex-shrink-0 flex items-center justify-center text-[10px]">🤖</div>
                  <div className="bg-[#1f2937] text-gray-200 text-[9px] px-3 py-2 rounded-2xl rounded-tl-none space-y-1.5">
                    <p>¡Hola! Tenemos <strong>{formData.name || 'ese servicio'}</strong> disponible.</p>
                    {formData.price && <p>Valor: <strong>${parseInt(formData.price).toLocaleString('es-CL')}</strong></p>}
                    {parseInt(formData.duration_minutes) > 0 && showSchedulingConfig && (
                      <p>Duración: <strong>{formData.duration_minutes} minutos</strong></p>
                    )}
                    {formData.description && (
                      <p className="text-gray-400 italic">{formData.description.slice(0, 100)}{formData.description.length > 100 ? '...' : ''}</p>
                    )}
                    <p className="text-indigo-300">¿Te gustaría más información? 😊</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LISTA DE SERVICIOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Servicios ({services.length})</p>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-8 text-center">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-600">Cargando...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-8 text-center">
                <span className="text-2xl mb-2 block">📋</span>
                <p className="text-gray-500 text-xs">Aún no tienes servicios. Crea tu primer servicio con el formulario.</p>
              </div>
            ) : (
              <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
                {services.map(svc => (
                  <div
                    key={svc.id}
                    className={`rounded-xl border p-3 transition-all ${
                      editingService?.id === svc.id
                        ? 'bg-indigo-500/10 border-indigo-500/30'
                        : svc.is_active
                          ? 'bg-white/[0.03] border-white/5 hover:border-white/10'
                          : 'bg-gray-900/40 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{svc.name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[10px] text-gray-500 uppercase tracking-wider">
                          <span>{svc.duration_minutes} min</span>
                          {svc.price != null && <span>${svc.price.toLocaleString('es-CL')}</span>}
                          {svc.buffer_minutes > 0 && <span>+{svc.buffer_minutes} min buffer</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEdit(svc)}
                          className="p-1.5 text-gray-600 hover:text-indigo-400 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleActive(svc)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border transition-all ${
                            svc.is_active
                              ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                              : 'border-gray-600 text-gray-500 hover:bg-gray-500/10'
                          }`}
                        >
                          {svc.is_active ? 'On' : 'Off'}
                        </button>
                        <button
                          onClick={() => deleteService(svc)}
                          className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                          title="Eliminar"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
