import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'
import { normalizePlanType } from '../utils/planUtils'
import { Session } from '@supabase/supabase-js'

interface SchedulingViewProps {
  session: Session
  profile: any
  instance: any
  onUpdate?: () => void
  goToPlans?: () => void
}

interface StaffMember {
  id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  is_active: boolean
  sort_order: number
  google_calendar_id: string | null
}

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

interface Appointment {
  id: string
  staff_id: string
  service_id: string
  client_name: string
  client_phone: string
  starts_at: string
  ends_at: string
  status: string
  source: string
  notes: string | null
  created_at: string
  staff_members?: { name: string }
  services?: { name: string; duration_minutes: number; price: number | null }
}

interface Schedule {
  id: string
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

interface ScheduleOverride {
  id: string
  staff_id: string
  override_date: string
  is_available: boolean
  start_time: string | null
  end_time: string | null
  reason: string | null
  created_at: string
}

interface StaffService {
  id: string
  staff_id: string
  service_id: string
}

type SubTab = 'services' | 'staff' | 'schedules' | 'appointments' | 'calendar'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmada', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  pending: { label: 'Pendiente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  cancelled: { label: 'Cancelada', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  completed: { label: 'Completada', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  no_show: { label: 'No asistió', color: 'text-gray-400 bg-gray-500/10 border-gray-500/30' },
}

export default function SchedulingView({ session, profile, instance, onUpdate, goToPlans }: SchedulingViewProps) {
  const [subTab, setSubTab] = useState<SubTab>('services')
  const [loading, setLoading] = useState(true)

  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [staffServices, setStaffServices] = useState<StaffService[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')

  const planCode = normalizePlanType(profile?.plan_type)
  const userId = session?.user?.id

  const loadAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [svcRes, staffRes, ssRes, schedRes, apptRes, overRes] = await Promise.all([
        supabase.from('services').select('*').eq('user_id', userId).order('sort_order'),
        supabase.from('staff_members').select('*').eq('user_id', userId).order('sort_order'),
        supabase.from('staff_services').select('*'),
        supabase.from('schedules').select('*'),
        supabase.from('appointments')
          .select('*, staff_members(name), services(name, duration_minutes, price)')
          .eq('user_id', userId)
          .order('starts_at', { ascending: false })
          .limit(50),
        supabase.from('schedule_overrides').select('*')
          .gte('override_date', new Date().toISOString().slice(0, 10))
          .order('override_date'),
      ])
      if (svcRes.data) setServices(svcRes.data)
      if (staffRes.data) setStaff(staffRes.data)
      if (ssRes.data) setStaffServices(ssRes.data)
      if (schedRes.data) setSchedules(schedRes.data)
      if (apptRes.data) setAppointments(apptRes.data)
      if (overRes.data) setOverrides(overRes.data)
    } catch (err) {
      console.error('Error loading scheduling data:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadAll() }, [loadAll])

  if (planCode !== 'full') {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Agendamiento</h2>
        <p className="text-sm text-gray-400">El sistema de agendamiento está disponible en el plan Full.</p>
        <button
          onClick={() => goToPlans?.()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          Ver planes
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 tracking-widest uppercase">Cargando</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Agendamiento</h2>
        <p className="text-gray-400 text-sm">Gestiona profesionales, servicios y citas de tu negocio.</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5">
        {([
          { key: 'services', label: 'Servicios' },
          { key: 'staff', label: 'Equipo' },
          { key: 'schedules', label: 'Horarios' },
          { key: 'appointments', label: 'Citas' },
          { key: 'calendar', label: 'Google Calendar' },
        ] as { key: SubTab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              subTab === t.key
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'services' && (
        <ServicesPanel
          services={services}
          userId={userId}
          onRefresh={loadAll}
        />
      )}
      {subTab === 'staff' && (
        <StaffPanel
          staff={staff}
          services={services}
          staffServices={staffServices}
          userId={userId}
          onRefresh={loadAll}
        />
      )}
      {subTab === 'schedules' && (
        <SchedulePanel
          staff={staff}
          schedules={schedules}
          overrides={overrides}
          onRefresh={loadAll}
          selectedStaff={selectedStaffId}
          onSelectStaff={setSelectedStaffId}
        />
      )}
      {subTab === 'appointments' && (
        <AppointmentsPanel
          appointments={appointments}
          staff={staff}
          services={services}
          userId={userId}
          onRefresh={loadAll}
        />
      )}
      {subTab === 'calendar' && (
        <GoogleCalendarPanel staff={staff} session={session} onRefresh={loadAll} />
      )}
    </div>
  )
}

/* ==================== SERVICES PANEL ==================== */
function ServicesPanel({ services, userId, onRefresh }: { services: Service[]; userId: string; onRefresh: () => void }) {
  const addService = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Nuevo Servicio',
      html: `
        <input id="swal-name" class="swal2-input" placeholder="Nombre (ej: Corte de pelo)">
        <input id="swal-desc" class="swal2-input" placeholder="Descripción (opcional)">
        <input id="swal-duration" class="swal2-input" type="number" placeholder="Duración (minutos)" value="30">
        <input id="swal-price" class="swal2-input" type="number" placeholder="Precio CLP (opcional)">
        <input id="swal-buffer" class="swal2-input" type="number" placeholder="Buffer entre citas (min)" value="0">
      `,
      background: '#1a1a1a', color: '#fff',
      confirmButtonText: 'Crear',
      confirmButtonColor: '#6366f1',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const name = (document.getElementById('swal-name') as HTMLInputElement).value.trim()
        if (!name) { Swal.showValidationMessage('El nombre es obligatorio'); return false }
        return {
          name,
          description: (document.getElementById('swal-desc') as HTMLInputElement).value.trim() || null,
          duration_minutes: parseInt((document.getElementById('swal-duration') as HTMLInputElement).value) || 30,
          price: parseInt((document.getElementById('swal-price') as HTMLInputElement).value) || null,
          buffer_minutes: parseInt((document.getElementById('swal-buffer') as HTMLInputElement).value) || 0,
        }
      }
    })
    if (!formValues) return

    const { error } = await supabase.from('services').insert({ ...formValues, user_id: userId })
    if (error) { Swal.fire('Error', error.message, 'error'); return }
    onRefresh()
  }

  const editService = async (svc: Service) => {
    const { value: formValues } = await Swal.fire({
      title: 'Editar Servicio',
      html: `
        <input id="swal-name" class="swal2-input" placeholder="Nombre" value="${svc.name.replace(/"/g, '&quot;')}">
        <input id="swal-desc" class="swal2-input" placeholder="Descripción (opcional)" value="${(svc.description || '').replace(/"/g, '&quot;')}">
        <input id="swal-duration" class="swal2-input" type="number" placeholder="Duración (minutos)" value="${svc.duration_minutes}">
        <input id="swal-price" class="swal2-input" type="number" placeholder="Precio CLP (opcional)" value="${svc.price ?? ''}">
        <input id="swal-buffer" class="swal2-input" type="number" placeholder="Buffer entre citas (min)" value="${svc.buffer_minutes}">
      `,
      background: '#1a1a1a', color: '#fff',
      confirmButtonText: 'Guardar',
      confirmButtonColor: '#6366f1',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const name = (document.getElementById('swal-name') as HTMLInputElement).value.trim()
        if (!name) { Swal.showValidationMessage('El nombre es obligatorio'); return false }
        return {
          name,
          description: (document.getElementById('swal-desc') as HTMLInputElement).value.trim() || null,
          duration_minutes: parseInt((document.getElementById('swal-duration') as HTMLInputElement).value) || 30,
          price: parseInt((document.getElementById('swal-price') as HTMLInputElement).value) || null,
          buffer_minutes: parseInt((document.getElementById('swal-buffer') as HTMLInputElement).value) || 0,
        }
      }
    })
    if (!formValues) return

    const { error } = await supabase.from('services').update(formValues).eq('id', svc.id)
    if (error) { Swal.fire('Error', error.message, 'error'); return }
    onRefresh()
  }

  const toggleActive = async (svc: Service) => {
    await supabase.from('services').update({ is_active: !svc.is_active }).eq('id', svc.id)
    onRefresh()
  }

  const deleteService = async (svc: Service) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar "${svc.name}"?`,
      text: 'Se eliminará el servicio permanentemente.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', confirmButtonText: 'Eliminar',
      background: '#1a1a1a', color: '#fff',
    })
    if (!isConfirmed) return
    await supabase.from('services').delete().eq('id', svc.id)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{services.length} servicio(s) registrado(s)</p>
        <button onClick={addService} className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all">
          + Nuevo servicio
        </button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-12 text-center">
          <p className="text-gray-500 text-sm">Aún no tienes servicios. Crea tu primer servicio para empezar.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {services.map(svc => (
            <div key={svc.id} className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${svc.is_active ? 'bg-white/[0.03] border-white/5' : 'bg-gray-900/40 border-white/5 opacity-60'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{svc.name}</p>
                {svc.description && <p className="text-xs text-gray-500 truncate">{svc.description}</p>}
                <div className="flex gap-3 mt-1 text-[10px] text-gray-500 uppercase tracking-wider">
                  <span>{svc.duration_minutes} min</span>
                  {svc.price && <span>${svc.price.toLocaleString('es-CL')}</span>}
                  {svc.buffer_minutes > 0 && <span>+{svc.buffer_minutes} min descanso</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => editService(svc)} className="text-gray-600 hover:text-indigo-400 transition-colors" title="Editar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => toggleActive(svc)} className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${svc.is_active ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-gray-600 text-gray-500 hover:bg-gray-500/10'}`}>
                  {svc.is_active ? 'Activo' : 'Inactivo'}
                </button>
                <button onClick={() => deleteService(svc)} className="text-gray-600 hover:text-red-400 transition-colors" title="Eliminar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ==================== STAFF PANEL ==================== */
function StaffPanel({ staff, services, staffServices, userId, onRefresh }: {
  staff: StaffMember[]; services: Service[]; staffServices: StaffService[]; userId: string; onRefresh: () => void
}) {
  const addStaff = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Nuevo Profesional',
      html: `
        <input id="swal-name" class="swal2-input" placeholder="Nombre completo">
        <input id="swal-role" class="swal2-input" placeholder="Rol (ej: Barbero, Estilista)">
        <input id="swal-phone" class="swal2-input" placeholder="Teléfono (opcional)">
        <input id="swal-email" class="swal2-input" placeholder="Email (opcional)">
      `,
      background: '#1a1a1a', color: '#fff',
      confirmButtonText: 'Crear',
      confirmButtonColor: '#6366f1',
      showCancelButton: true,
      preConfirm: () => {
        const name = (document.getElementById('swal-name') as HTMLInputElement).value.trim()
        if (!name) { Swal.showValidationMessage('El nombre es obligatorio'); return false }
        return {
          name,
          role: (document.getElementById('swal-role') as HTMLInputElement).value.trim() || null,
          phone: (document.getElementById('swal-phone') as HTMLInputElement).value.trim() || null,
          email: (document.getElementById('swal-email') as HTMLInputElement).value.trim() || null,
        }
      }
    })
    if (!formValues) return

    const { error } = await supabase.from('staff_members').insert({ ...formValues, user_id: userId })
    if (error) { Swal.fire('Error', error.message, 'error'); return }
    onRefresh()
  }

  const assignServices = async (member: StaffMember) => {
    const assigned = staffServices.filter(ss => ss.staff_id === member.id).map(ss => ss.service_id)
    const activeServices = services.filter(s => s.is_active)

    if (activeServices.length === 0) {
      Swal.fire('Sin servicios', 'Primero crea al menos un servicio.', 'info')
      return
    }

    const { value: selected } = await Swal.fire({
      title: `Servicios de ${member.name}`,
      html: activeServices.map(s => `
        <label class="flex items-center gap-2 p-2 text-sm text-left text-gray-200">
          <input type="checkbox" value="${s.id}" ${assigned.includes(s.id) ? 'checked' : ''} class="swal2-checkbox-custom">
          ${s.name} (${s.duration_minutes} min)
        </label>
      `).join(''),
      background: '#1a1a1a', color: '#fff',
      confirmButtonText: 'Guardar',
      confirmButtonColor: '#6366f1',
      showCancelButton: true,
      preConfirm: () => {
        const checks = document.querySelectorAll<HTMLInputElement>('.swal2-checkbox-custom:checked')
        return Array.from(checks).map(c => c.value)
      }
    })
    if (!selected) return

    // Remove existing and re-insert
    await supabase.from('staff_services').delete().eq('staff_id', member.id)
    if (selected.length > 0) {
      await supabase.from('staff_services').insert(
        selected.map((sid: string) => ({ staff_id: member.id, service_id: sid }))
      )
    }
    onRefresh()
  }

  const toggleActive = async (member: StaffMember) => {
    await supabase.from('staff_members').update({ is_active: !member.is_active }).eq('id', member.id)
    onRefresh()
  }

  const deleteStaff = async (member: StaffMember) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar a "${member.name}"?`,
      text: 'Se eliminará el profesional y sus horarios.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', confirmButtonText: 'Eliminar',
      background: '#1a1a1a', color: '#fff',
    })
    if (!isConfirmed) return
    await supabase.from('staff_members').delete().eq('id', member.id)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{staff.length} profesional(es)</p>
        <button onClick={addStaff} className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all">
          + Nuevo profesional
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-12 text-center">
          <p className="text-gray-500 text-sm">Aún no tienes profesionales registrados.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {staff.map(member => {
            const memberServices = staffServices
              .filter(ss => ss.staff_id === member.id)
              .map(ss => services.find(s => s.id === ss.service_id)?.name)
              .filter(Boolean)

            return (
              <div key={member.id} className={`rounded-xl border p-4 ${member.is_active ? 'bg-white/[0.03] border-white/5' : 'bg-gray-900/40 border-white/5 opacity-60'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{member.name}</p>
                        {member.role && <p className="text-[10px] text-gray-500 uppercase tracking-wider">{member.role}</p>}
                      </div>
                    </div>
                    {memberServices.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {memberServices.map((name, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => assignServices(member)} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-all">
                      Servicios
                    </button>
                    <button onClick={() => toggleActive(member)} className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${member.is_active ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-gray-600 text-gray-500 hover:bg-gray-500/10'}`}>
                      {member.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                    <button onClick={() => deleteStaff(member)} className="text-gray-600 hover:text-red-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ==================== SCHEDULE PANEL ==================== */
function SchedulePanel({ staff, schedules, overrides, onRefresh, selectedStaff, onSelectStaff }: {
  staff: StaffMember[]; schedules: Schedule[]; overrides: ScheduleOverride[]; onRefresh: () => void; selectedStaff: string; onSelectStaff: (id: string) => void
}) {
  const activeStaff = staff.filter(s => s.is_active)
  const current = selectedStaff && activeStaff.some(s => s.id === selectedStaff)
    ? selectedStaff
    : activeStaff[0]?.id || ''

  useEffect(() => {
    if (current !== selectedStaff) onSelectStaff(current)
  }, [current, selectedStaff, onSelectStaff])

  const addBlock = async (dayOfWeek: number) => {
    if (!current) return

    const hourOptions = Array.from({ length: 24 }, (_, h) => {
      const hh = String(h).padStart(2, '0')
      return `<option value="${hh}" ${h === 9 ? 'id="start-default"' : ''} ${h === 20 ? 'id="end-default"' : ''}>${hh}</option>`
    }).join('')
    const minOptions = ['00', '15', '30', '45'].map(m => `<option value="${m}">${m}</option>`).join('')

    const selectStyle = 'background:#111;border:1px solid #333;border-radius:8px;color:#fff;padding:10px 8px;font-size:18px;font-family:monospace;text-align:center;appearance:none;-webkit-appearance:none;cursor:pointer'

    const { value: formValues } = await Swal.fire({
      title: `${DAY_NAMES[dayOfWeek]}`,
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;gap:20px;padding:12px 0">
          <div style="display:flex;align-items:center;gap:16px">
            <div style="text-align:center">
              <label style="display:block;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Desde</label>
              <div style="display:flex;align-items:center;gap:4px">
                <select id="swal-start-h" style="${selectStyle};width:64px">${hourOptions.replace('id="start-default"', 'selected')}</select>
                <span style="color:#6366f1;font-size:20px;font-weight:bold">:</span>
                <select id="swal-start-m" style="${selectStyle};width:64px">${minOptions}</select>
              </div>
            </div>
            <span style="color:#6366f1;font-size:22px;margin-top:18px">→</span>
            <div style="text-align:center">
              <label style="display:block;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Hasta</label>
              <div style="display:flex;align-items:center;gap:4px">
                <select id="swal-end-h" style="${selectStyle};width:64px">${hourOptions.replace('id="end-default"', 'selected')}</select>
                <span style="color:#6366f1;font-size:20px;font-weight:bold">:</span>
                <select id="swal-end-m" style="${selectStyle};width:64px">${minOptions}</select>
              </div>
            </div>
          </div>
          <p style="font-size:11px;color:#6b7280;margin:0">Formato 24 hrs</p>
        </div>
      `,
      background: '#1a1a1a', color: '#fff',
      confirmButtonText: 'Agregar',
      confirmButtonColor: '#6366f1',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const sh = (document.getElementById('swal-start-h') as HTMLSelectElement).value
        const sm = (document.getElementById('swal-start-m') as HTMLSelectElement).value
        const eh = (document.getElementById('swal-end-h') as HTMLSelectElement).value
        const em = (document.getElementById('swal-end-m') as HTMLSelectElement).value
        const start = `${sh}:${sm}`
        const end = `${eh}:${em}`
        if (start >= end) { Swal.showValidationMessage('La hora de fin debe ser mayor que la de inicio'); return false }
        return { start_time: start, end_time: end }
      }
    })
    if (!formValues) return

    const { error } = await supabase.from('schedules').insert({
      staff_id: current,
      day_of_week: dayOfWeek,
      ...formValues,
    })
    if (error) { Swal.fire('Error', error.message, 'error'); return }
    onRefresh()
  }

  const deleteBlock = async (scheduleId: string) => {
    await supabase.from('schedules').delete().eq('id', scheduleId)
    onRefresh()
  }

  const formatOverrideDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const addBlockedDay = async () => {
    if (!current) return
    const today = new Date().toISOString().slice(0, 10)

    const { value: formValues } = await Swal.fire({
      title: 'Bloquear dia',
      html: `
        <div style="display:flex;flex-direction:column;gap:16px;padding:12px 0">
          <div>
            <label style="display:block;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Fecha</label>
            <input id="swal-block-date" type="date" min="${today}"
              style="background:#111;border:1px solid #333;border-radius:8px;color:#fff;padding:10px 12px;font-size:14px;width:100%;cursor:pointer">
          </div>
          <div>
            <label style="display:block;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Motivo (opcional)</label>
            <input id="swal-block-reason" type="text" placeholder="Ej: Vacaciones, emergencia familiar"
              style="background:#111;border:1px solid #333;border-radius:8px;color:#fff;padding:10px 12px;font-size:14px;width:100%">
          </div>
        </div>
      `,
      background: '#1a1a1a', color: '#fff',
      confirmButtonText: 'Bloquear',
      confirmButtonColor: '#ef4444',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const date = (document.getElementById('swal-block-date') as HTMLInputElement).value
        const reason = (document.getElementById('swal-block-reason') as HTMLInputElement).value.trim()
        if (!date) { Swal.showValidationMessage('Selecciona una fecha'); return false }
        if (date < today) { Swal.showValidationMessage('No puedes bloquear una fecha pasada'); return false }
        return { override_date: date, reason: reason || null }
      }
    })
    if (!formValues) return

    const { error } = await supabase.from('schedule_overrides').insert({
      staff_id: current,
      is_available: false,
      start_time: null,
      end_time: null,
      ...formValues,
    })
    if (error) {
      if (error.code === '23505') {
        Swal.fire({ icon: 'warning', title: 'Dia ya bloqueado', text: 'Ese dia ya esta bloqueado para este profesional.', background: '#1a1a1a', color: '#fff' })
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1a1a1a', color: '#fff' })
      }
      return
    }
    onRefresh()
  }

  const deleteBlockedDay = async (override: ScheduleOverride) => {
    const dateStr = formatOverrideDate(override.override_date)
    const { isConfirmed } = await Swal.fire({
      title: `Desbloquear ${dateStr}?`,
      text: override.reason ? `Motivo: ${override.reason}` : 'Este dia volvera a estar disponible para agendar.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Si, desbloquear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6366f1',
      background: '#1a1a1a', color: '#fff',
    })
    if (!isConfirmed) return

    await supabase.from('schedule_overrides').delete().eq('id', override.id)
    onRefresh()
  }

  const staffSchedules = schedules.filter(s => s.staff_id === current)

  const blockedDays = overrides
    .filter(o =>
      o.staff_id === current &&
      !o.is_available &&
      o.start_time === null &&
      o.end_time === null &&
      o.reason !== 'google_calendar_sync'
    )
    .sort((a, b) => a.override_date.localeCompare(b.override_date))

  return (
    <div className="space-y-4">
      {activeStaff.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-12 text-center">
          <p className="text-gray-500 text-sm">Crea al menos un profesional activo para configurar horarios.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 uppercase tracking-wider">Profesional:</label>
            <select
              value={current}
              onChange={e => onSelectStaff(e.target.value)}
              className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            >
              {activeStaff.map(s => (
                <option key={s.id} value={s.id} className="bg-gray-900">{s.name}</option>
              ))}
            </select>
          </div>

          {/* Weekly schedule grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 0].map(day => {
              const dayBlocks = staffSchedules
                .filter(s => s.day_of_week === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
              return (
                <div key={day} className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">{DAY_SHORT[day]}</p>
                    <button
                      onClick={() => addBlock(day)}
                      className="text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                  {dayBlocks.length === 0 ? (
                    <p className="text-[10px] text-gray-600 italic">Sin horario</p>
                  ) : (
                    <div className="space-y-1">
                      {dayBlocks.map((block, idx) => (
                        <div key={block.id}>
                          <div className="flex items-center justify-between bg-indigo-500/10 rounded-lg px-2 py-1">
                            <span className="text-xs text-indigo-300 font-mono">
                              {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
                            </span>
                            <button onClick={() => deleteBlock(block.id)} className="text-gray-600 hover:text-red-400">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                          {idx < dayBlocks.length - 1 && block.end_time.slice(0, 5) < dayBlocks[idx + 1].start_time.slice(0, 5) && (
                            <div className="flex items-center justify-center gap-1 bg-amber-500/10 rounded-lg px-2 py-0.5 my-0.5 border border-dashed border-amber-500/20">
                              <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-[10px] text-amber-400 font-mono">
                                Descanso {block.end_time.slice(0, 5)} - {dayBlocks[idx + 1].start_time.slice(0, 5)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-[10px] text-gray-600 italic">
            Tip: Para configurar hora de colacion, agrega dos bloques en el mismo dia (ej: 09:00-13:00 y 14:00-18:00).
          </p>

          {/* Blocked days section */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Dias bloqueados
                  {blockedDays.length > 0 && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                      {blockedDays.length}
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-gray-500">
                  Bloquea dias completos por vacaciones, emergencias o feriados.
                </p>
              </div>
              <button
                onClick={addBlockedDay}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all"
              >
                + Bloquear dia
              </button>
            </div>

            {blockedDays.length === 0 ? (
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-6 text-center">
                <p className="text-[10px] text-gray-600 italic">
                  No hay dias bloqueados. Los clientes pueden agendar cualquier dia con horario configurado.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {blockedDays.map(override => (
                  <div key={override.id} className="flex items-center justify-between bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-red-300">{formatOverrideDate(override.override_date)}</p>
                        {override.reason && <p className="text-[10px] text-gray-500">{override.reason}</p>}
                      </div>
                    </div>
                    <button onClick={() => deleteBlockedDay(override)} className="text-gray-600 hover:text-red-400 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ==================== APPOINTMENTS PANEL ==================== */
function AppointmentsPanel({ appointments, staff, services, userId, onRefresh }: {
  appointments: Appointment[]; staff: StaffMember[]; services: Service[]; userId: string; onRefresh: () => void
}) {
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filtered = filterStatus === 'all'
    ? appointments
    : appointments.filter(a => a.status === filterStatus)

  const updateStatus = async (appt: Appointment, newStatus: string) => {
    const labels: Record<string, string> = {
      cancelled: 'cancelar',
      completed: 'marcar como completada',
      confirmed: 'confirmar',
      no_show: 'marcar como no asistió',
    }
    const { isConfirmed } = await Swal.fire({
      title: `¿${labels[newStatus] || newStatus} la cita de ${appt.client_name}?`,
      text: newStatus === 'cancelled' ? 'Esta acción no se puede deshacer.' : '',
      icon: newStatus === 'cancelled' ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'No, volver',
      confirmButtonColor: newStatus === 'cancelled' ? '#ef4444' : '#6366f1',
      background: '#1a1a1a', color: '#fff',
    })
    if (!isConfirmed) return

    const { error } = await supabase
      .from('appointments')
      .update({
        status: newStatus,
        ...(newStatus === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}),
      })
      .eq('id', appt.id)
    if (error) { Swal.fire('Error', error.message, 'error'); return }
    onRefresh()
  }

  const createManual = async () => {
    const activeStaff = staff.filter(s => s.is_active)
    const activeServices = services.filter(s => s.is_active)
    if (activeStaff.length === 0 || activeServices.length === 0) {
      Swal.fire('Faltan datos', 'Necesitas al menos un profesional y un servicio activos.', 'info')
      return
    }

    const { value: formValues } = await Swal.fire({
      title: 'Nueva Cita Manual',
      html: `
        <input id="swal-client-name" class="swal2-input" placeholder="Nombre del cliente">
        <input id="swal-client-phone" class="swal2-input" placeholder="Teléfono (ej: 56912345678)">
        <select id="swal-service" class="swal2-select">
          ${activeServices.map(s => `<option value="${s.id}">${s.name} (${s.duration_minutes} min)</option>`).join('')}
        </select>
        <select id="swal-staff" class="swal2-select">
          ${activeStaff.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <input id="swal-date" class="swal2-input" type="date">
        <input id="swal-time" class="swal2-input" type="time">
      `,
      background: '#1a1a1a', color: '#fff',
      confirmButtonText: 'Crear cita',
      confirmButtonColor: '#6366f1',
      showCancelButton: true,
      preConfirm: () => {
        const clientName = (document.getElementById('swal-client-name') as HTMLInputElement).value.trim()
        const clientPhone = (document.getElementById('swal-client-phone') as HTMLInputElement).value.trim()
        const serviceId = (document.getElementById('swal-service') as HTMLSelectElement).value
        const staffId = (document.getElementById('swal-staff') as HTMLSelectElement).value
        const date = (document.getElementById('swal-date') as HTMLInputElement).value
        const time = (document.getElementById('swal-time') as HTMLInputElement).value
        if (!clientName || !clientPhone || !date || !time) {
          Swal.showValidationMessage('Todos los campos son obligatorios')
          return false
        }
        return { clientName, clientPhone, serviceId, staffId, date, time }
      }
    })
    if (!formValues) return

    const startsAt = new Date(`${formValues.date}T${formValues.time}:00`)
    const service = services.find(s => s.id === formValues.serviceId)
    const endsAt = new Date(startsAt.getTime() + (service?.duration_minutes || 30) * 60000)

    const { error } = await supabase.from('appointments').insert({
      user_id: userId,
      staff_id: formValues.staffId,
      service_id: formValues.serviceId,
      client_name: formValues.clientName,
      client_phone: formValues.clientPhone,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      source: 'dashboard',
    })
    if (error) {
      Swal.fire('Error', error.message, 'error')
      return
    }
    Swal.fire({ icon: 'success', title: 'Cita creada', timer: 2000, showConfirmButton: false, background: '#1a1a1a', color: '#fff' })
    onRefresh()
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {['all', 'confirmed', 'pending', 'completed', 'cancelled', 'no_show'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                filterStatus === s
                  ? 'border-indigo-500/30 text-indigo-300 bg-indigo-500/10'
                  : 'border-white/5 text-gray-500 hover:text-gray-300'
              }`}
            >
              {s === 'all' ? 'Todas' : STATUS_LABELS[s]?.label || s}
            </button>
          ))}
        </div>
        <button onClick={createManual} className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all">
          + Cita manual
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-12 text-center">
          <p className="text-gray-500 text-sm">No hay citas {filterStatus !== 'all' ? `con estado "${STATUS_LABELS[filterStatus]?.label}"` : ''}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(appt => {
            const st = STATUS_LABELS[appt.status] || { label: appt.status, color: 'text-gray-400' }
            return (
              <div key={appt.id} className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white">{appt.client_name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>
                        {st.label}
                      </span>
                      <span className="text-[10px] text-gray-600 uppercase">{appt.source}</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      <span>{formatDate(appt.starts_at)}</span>
                      <span className="font-mono">{formatTime(appt.starts_at)} - {formatTime(appt.ends_at)}</span>
                      <span>{appt.staff_members?.name || '—'}</span>
                      <span>{appt.services?.name || '—'}</span>
                    </div>
                    <p className="text-[10px] text-gray-600 font-mono mt-0.5">{appt.client_phone}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {appt.status === 'confirmed' && (
                      <>
                        <button onClick={() => updateStatus(appt, 'completed')} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                          Completar
                        </button>
                        <button onClick={() => updateStatus(appt, 'cancelled')} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10">
                          Cancelar
                        </button>
                        <button onClick={() => updateStatus(appt, 'no_show')} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-500/30 text-gray-400 hover:bg-gray-500/10">
                          No asistió
                        </button>
                      </>
                    )}
                    {appt.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(appt, 'confirmed')} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                          Confirmar
                        </button>
                        <button onClick={() => updateStatus(appt, 'cancelled')} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10">
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ==================== GOOGLE CALENDAR PANEL ==================== */
function GoogleCalendarPanel({ staff, session, onRefresh }: {
  staff: StaffMember[]; session: Session; onRefresh: () => void
}) {
  const [connected, setConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState('')
  const [calendars, setCalendars] = useState<{ id: string; summary: string; primary: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)

  const token = session?.access_token

  const checkConnection = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/google-calendar', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setConnected(data.connected)
        setGoogleEmail(data.email || '')
        if (data.connected) loadCalendars()
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [token])

  const loadCalendars = async () => {
    try {
      const res = await fetch('/api/google-calendar?action=list', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCalendars(data.calendars || [])
      }
    } catch {}
  }

  useEffect(() => {
    checkConnection()

    const params = new URLSearchParams(window.location.search)
    const gcal = params.get('gcal')
    if (gcal === 'connected') {
      Swal.fire({
        icon: 'success',
        title: 'Google Calendar conectado',
        timer: 3000,
        showConfirmButton: false,
        background: '#1a1a1a',
        color: '#fff',
      })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (gcal === 'error') {
      Swal.fire({
        icon: 'error',
        title: 'Error al conectar',
        text: `No se pudo conectar Google Calendar. ${params.get('reason') || ''}`,
        background: '#1a1a1a',
        color: '#fff',
      })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [checkConnection])

  const startOAuth = async () => {
    try {
      const res = await fetch('/api/google-calendar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        window.location.href = data.url
      } else {
        Swal.fire('Error', 'No se pudo iniciar la conexión.', 'error')
      }
    } catch {
      Swal.fire('Error', 'Error de conexión.', 'error')
    }
  }

  const disconnect = async () => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Desconectar Google Calendar?',
      text: 'Se eliminarán todas las asignaciones de calendarios y los bloques sincronizados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Desconectar',
      cancelButtonText: 'Cancelar',
      background: '#1a1a1a',
      color: '#fff',
    })
    if (!isConfirmed) return

    await fetch('/api/google-calendar', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setConnected(false)
    setGoogleEmail('')
    setCalendars([])
    onRefresh()
  }

  const assignCalendar = async (staffId: string, calendarId: string) => {
    setAssigning(staffId)
    try {
      await fetch('/api/google-calendar?action=assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ staff_id: staffId, calendar_id: calendarId || null }),
      })
      onRefresh()
    } catch {} finally {
      setAssigning(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeStaff = staff.filter(s => s.is_active)

  return (
    <div className="space-y-6">
      {/* Estado de conexión */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${connected ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
              <svg className={`w-6 h-6 ${connected ? 'text-emerald-400' : 'text-blue-400'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 3.5h-2V2h-1v1.5h-9V2h-1v1.5h-2C3.67 3.5 3 4.17 3 5v14c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5V5c0-.83-.67-1.5-1.5-1.5zm0 15.5h-15V8.5h15V19z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Google Calendar</h3>
              {connected ? (
                <p className="text-xs text-emerald-400">Conectado como {googleEmail}</p>
              ) : (
                <p className="text-xs text-gray-500">No conectado</p>
              )}
            </div>
          </div>
          {connected ? (
            <button
              onClick={disconnect}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
            >
              Desconectar
            </button>
          ) : (
            <button
              onClick={startOAuth}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all text-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" /></svg>
              Conectar
            </button>
          )}
        </div>
      </div>

      {!connected && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-8 text-center space-y-3">
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Conecta tu cuenta de Google para sincronizar automáticamente la disponibilidad de tus profesionales.
            Los horarios ocupados en Google Calendar se bloquearán en el sistema de agendamiento.
          </p>
        </div>
      )}

      {/* Asignación de calendarios */}
      {connected && activeStaff.length > 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-white">Asignar calendarios</h4>
            <p className="text-xs text-gray-500 mt-1">Asigna un calendario de Google a cada profesional para sincronizar su disponibilidad.</p>
          </div>

          <div className="space-y-3">
            {activeStaff.map(member => (
              <div key={member.id} className="flex items-center justify-between gap-4 bg-white/[0.02] rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{member.name}</p>
                    {member.role && <p className="text-[10px] text-gray-500 uppercase tracking-wider">{member.role}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={member.google_calendar_id || ''}
                    onChange={e => assignCalendar(member.id, e.target.value)}
                    disabled={assigning === member.id}
                    className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 max-w-[200px]"
                  >
                    <option value="" className="bg-gray-900">Sin asignar</option>
                    {calendars.map(cal => (
                      <option key={cal.id} value={cal.id} className="bg-gray-900">
                        {cal.summary}{cal.primary ? ' (Principal)' : ''}
                      </option>
                    ))}
                  </select>
                  {assigning === member.id && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {member.google_calendar_id && assigning !== member.id && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Sincronizado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info de sincronización */}
      {connected && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 space-y-3">
          <h4 className="text-sm font-bold text-white">Sincronización</h4>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-400">
                La disponibilidad se sincroniza automáticamente cada 15 minutos.
                Los eventos en Google Calendar bloquearán automáticamente los horarios correspondientes.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Las citas creadas desde el dashboard o WhatsApp se agregarán automáticamente a Google Calendar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
