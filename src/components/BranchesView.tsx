import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'
import { hasBranches, branchesLimit, canCreateBranch } from '../utils/planUtils'

interface BranchesViewProps {
  session: Session
  profile: any
  goToPlans?: () => void
}

interface Branch {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  city: string | null
  region: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  staff_members?: { count: number }[]
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export default function BranchesView({ session, profile, goToPlans }: BranchesViewProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const userId = session?.user?.id

  const loadBranches = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('branches')
        .select('*, staff_members(count)')
        .eq('user_id', userId)
        .order('sort_order')
      if (data) setBranches(data)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadBranches() }, [loadBranches])

  if (!hasBranches(profile)) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Sucursales</h2>
        <p className="text-sm text-gray-400">Gestiona múltiples ubicaciones de tu negocio. Disponible desde el plan Básico.</p>
        <button
          onClick={() => goToPlans?.()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 transition-all"
        >
          Ver planes
        </button>
      </div>
    )
  }

  const addBranch = async () => {
    if (!canCreateBranch(profile, branches.length)) {
      const limit = branchesLimit(profile)
      Swal.fire({
        icon: 'warning',
        title: 'Límite de sucursales',
        text: `Tu plan permite hasta ${limit} sucursales. Mejora tu plan para agregar más.`,
        confirmButtonColor: '#6366f1',
        background: '#1a1a1a', color: '#fff',
      })
      return
    }

    const { value: formValues } = await Swal.fire({
      title: 'Nueva Sucursal',
      html: `
        <input id="swal-name" class="swal2-input" placeholder="Nombre (ej: Sucursal Providencia)">
        <input id="swal-address" class="swal2-input" placeholder="Dirección">
        <input id="swal-city" class="swal2-input" placeholder="Ciudad">
        <input id="swal-region" class="swal2-input" placeholder="Región (opcional)">
        <input id="swal-phone" class="swal2-input" placeholder="Teléfono (opcional)">
        <input id="swal-email" class="swal2-input" placeholder="Email (opcional)">
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
          address: (document.getElementById('swal-address') as HTMLInputElement).value.trim() || null,
          city: (document.getElementById('swal-city') as HTMLInputElement).value.trim() || null,
          region: (document.getElementById('swal-region') as HTMLInputElement).value.trim() || null,
          phone: (document.getElementById('swal-phone') as HTMLInputElement).value.trim() || null,
          email: (document.getElementById('swal-email') as HTMLInputElement).value.trim() || null,
        }
      }
    })
    if (!formValues) return

    const { error } = await supabase.from('branches').insert({ ...formValues, user_id: userId })
    if (error) { Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1a1a1a', color: '#fff' }); return }
    loadBranches()
  }

  const editBranch = async (branch: Branch) => {
    const { value: formValues } = await Swal.fire({
      title: 'Editar Sucursal',
      html: `
        <input id="swal-name" class="swal2-input" placeholder="Nombre" value="${escHtml(branch.name)}">
        <input id="swal-address" class="swal2-input" placeholder="Dirección" value="${escHtml(branch.address || '')}">
        <input id="swal-city" class="swal2-input" placeholder="Ciudad" value="${escHtml(branch.city || '')}">
        <input id="swal-region" class="swal2-input" placeholder="Región" value="${escHtml(branch.region || '')}">
        <input id="swal-phone" class="swal2-input" placeholder="Teléfono" value="${escHtml(branch.phone || '')}">
        <input id="swal-email" class="swal2-input" placeholder="Email" value="${escHtml(branch.email || '')}">
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
          address: (document.getElementById('swal-address') as HTMLInputElement).value.trim() || null,
          city: (document.getElementById('swal-city') as HTMLInputElement).value.trim() || null,
          region: (document.getElementById('swal-region') as HTMLInputElement).value.trim() || null,
          phone: (document.getElementById('swal-phone') as HTMLInputElement).value.trim() || null,
          email: (document.getElementById('swal-email') as HTMLInputElement).value.trim() || null,
        }
      }
    })
    if (!formValues) return

    const { error } = await supabase.from('branches').update(formValues).eq('id', branch.id)
    if (error) { Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1a1a1a', color: '#fff' }); return }
    loadBranches()
  }

  const toggleActive = async (branch: Branch) => {
    await supabase.from('branches').update({ is_active: !branch.is_active }).eq('id', branch.id)
    loadBranches()
  }

  const deleteBranch = async (branch: Branch) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar "${branch.name}"?`,
      text: 'Los profesionales asignados quedarán sin sucursal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      background: '#1a1a1a', color: '#fff',
    })
    if (!isConfirmed) return
    await supabase.from('branches').delete().eq('id', branch.id)
    loadBranches()
  }

  const limit = branchesLimit(profile)
  const limitLabel = limit === null ? 'ilimitadas' : `${branches.length}/${limit}`

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 tracking-widest uppercase">Cargando</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Sucursales</h2>
          <p className="text-gray-400 text-sm">Gestiona las ubicaciones de tu negocio. <span className="text-teal-400 font-bold">{limitLabel}</span></p>
        </div>
        <button onClick={addBranch} className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-all">
          + Nueva sucursal
        </button>
      </div>

      {branches.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Aún no tienes sucursales. Crea tu primera ubicación.</p>
          <button onClick={addBranch} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 transition-all text-sm">
            + Crear sucursal
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {branches.map(branch => {
            const staffCount = branch.staff_members?.[0]?.count ?? 0
            return (
              <div key={branch.id} className={`rounded-xl border p-5 transition-all ${branch.is_active ? 'bg-white/[0.03] border-white/5 hover:border-teal-500/30' : 'bg-gray-900/40 border-white/5 opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center text-sm font-bold text-white shadow-[0_2px_8px_rgba(20,184,166,0.3)]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{branch.name}</p>
                        {branch.city && <p className="text-[10px] text-gray-500">{branch.city}{branch.region ? `, ${branch.region}` : ''}</p>}
                      </div>
                    </div>

                    {branch.address && (
                      <p className="text-xs text-gray-500 mt-2 pl-11">{branch.address}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3 pl-11">
                      {branch.phone && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">{branch.phone}</span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        {staffCount} profesional{staffCount !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => editBranch(branch)} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-all">
                      Editar
                    </button>
                    <button onClick={() => toggleActive(branch)} className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${branch.is_active ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-gray-600 text-gray-500 hover:bg-gray-500/10'}`}>
                      {branch.is_active ? 'Activa' : 'Inactiva'}
                    </button>
                    <button onClick={() => deleteBranch(branch)} className="text-gray-600 hover:text-red-400 transition-colors self-center">
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
