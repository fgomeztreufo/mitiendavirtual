import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'
import { FiDownload, FiLoader, FiCalendar } from 'react-icons/fi'

interface ContabilidadViewProps {
  session: Session
}

interface PaymentLog {
  id: string
  created_at: string
  payment_date: string
  payment_id: string
  amount: number
  status: string
  plan_name: string
  currency: string
  payer_email: string | null
  payment_method: string | null
  payment_type: string | null
  mp_fee: number | null
  net_amount: number | null
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

export default function ContabilidadView({ session }: ContabilidadViewProps) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [payments, setPayments] = useState<PaymentLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [month, year])

  async function fetchPayments() {
    setLoading(true)
    try {
      const start = new Date(year, month, 1).toISOString()
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

      const { data, error } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('status', 'approved')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('fetchPayments error', error)
        return
      }
      setPayments(data || [])
    } finally {
      setLoading(false)
    }
  }

  const totalBruto = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalNeto = Math.round(totalBruto / 1.19)
  const totalIVA = totalBruto - totalNeto
  const totalMPFee = payments.reduce((s, p) => s + (p.mp_fee || 0), 0)
  const totalNetReceived = payments.reduce((s, p) => s + (p.net_amount || p.amount || 0), 0)
  const count = payments.length

  function downloadCSV() {
    const period = `${MONTHS[month]} ${year}`
    const lines: string[] = []

    lines.push(`Resumen Contable - ${period}`)
    lines.push(`MiTiendaVirtual.cl`)
    lines.push('')
    lines.push('RESUMEN F29')
    lines.push(`Período,${period}`)
    lines.push(`Ventas Brutas (con IVA),${totalBruto}`)
    lines.push(`Ventas Netas,${totalNeto}`)
    lines.push(`IVA Débito Fiscal (19%),${totalIVA}`)
    lines.push(`Comisión Mercado Pago,${totalMPFee}`)
    lines.push(`Neto Recibido,${Math.round(totalNetReceived)}`)
    lines.push(`Cantidad de Transacciones,${count}`)
    lines.push('')
    lines.push('DETALLE DE TRANSACCIONES')
    lines.push('Fecha,Plan,Email Pagador,Método Pago,Tipo Pago,Bruto,Neto,IVA,Comisión MP,Recibido,Payment ID')

    for (const p of payments) {
      const bruto = p.amount || 0
      const neto = Math.round(bruto / 1.19)
      const iva = bruto - neto
      const fee = p.mp_fee || 0
      const received = p.net_amount || bruto
      const date = p.payment_date ? new Date(p.payment_date).toLocaleDateString('es-CL') : ''
      lines.push([
        date,
        p.plan_name || '',
        p.payer_email || '',
        p.payment_method || '',
        p.payment_type || '',
        bruto,
        neto,
        iva,
        fee,
        Math.round(received),
        p.payment_id || ''
      ].join(','))
    }

    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `contabilidad_${year}-${String(month + 1).padStart(2, '0')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter italic">
              CONTABILIDAD <span className="text-zinc-800 not-italic font-thin">F29</span>
            </h1>
            <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest font-bold">Resumen Mensual de Ingresos</p>
          </div>
          <button
            onClick={downloadCSV}
            disabled={payments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-bold rounded-xl transition-all"
          >
            <FiDownload className="w-4 h-4" />
            Descargar CSV
          </button>
        </div>

        {/* Selector de período */}
        <div className="flex flex-wrap gap-4 items-center bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-md mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-tighter">
            <FiCalendar className="text-emerald-500" /> Período:
          </div>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-black border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500/50"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-black border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500/50"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {loading && <FiLoader className="animate-spin text-emerald-500 ml-auto" />}
        </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <SummaryCard label="Ventas Brutas" value={formatCLP(totalBruto)} sub="con IVA" color="text-white" />
          <SummaryCard label="Ventas Netas" value={formatCLP(totalNeto)} sub="sin IVA" color="text-emerald-400" />
          <SummaryCard label="IVA Débito" value={formatCLP(totalIVA)} sub="19%" color="text-amber-400" />
          <SummaryCard label="Comisión MP" value={formatCLP(totalMPFee)} sub="Mercado Pago" color="text-red-400" />
          <SummaryCard label="Neto Recibido" value={formatCLP(Math.round(totalNetReceived))} sub="en tu cuenta" color="text-blue-400" />
          <SummaryCard label="Transacciones" value={String(count)} sub="boletas" color="text-purple-400" />
        </div>

        {/* Tabla detalle */}
        <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-[32px] overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-zinc-900/60 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">
                <th className="px-4 sm:px-6 py-4 border-b border-zinc-800/50">Fecha</th>
                <th className="px-4 sm:px-6 py-4 border-b border-zinc-800/50">Plan</th>
                <th className="px-4 sm:px-6 py-4 border-b border-zinc-800/50">Email Pagador</th>
                <th className="px-4 sm:px-6 py-4 border-b border-zinc-800/50">Método</th>
                <th className="px-4 sm:px-6 py-4 border-b border-zinc-800/50 text-right">Bruto</th>
                <th className="px-4 sm:px-6 py-4 border-b border-zinc-800/50 text-right">Neto</th>
                <th className="px-4 sm:px-6 py-4 border-b border-zinc-800/50 text-right">IVA</th>
                <th className="px-4 sm:px-6 py-4 border-b border-zinc-800/50 text-right">Comisión MP</th>
                <th className="px-4 sm:px-6 py-4 border-b border-zinc-800/50 text-right">Recibido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {payments.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <p className="text-zinc-700 text-lg italic font-light">Sin transacciones en {MONTHS[month]} {year}</p>
                  </td>
                </tr>
              )}
              {payments.map((p) => {
                const bruto = p.amount || 0
                const neto = Math.round(bruto / 1.19)
                const iva = bruto - neto
                const fee = p.mp_fee || 0
                const received = p.net_amount || bruto
                const date = p.payment_date
                  ? new Date(p.payment_date).toLocaleDateString('es-CL')
                  : new Date(p.created_at).toLocaleDateString('es-CL')

                return (
                  <tr key={p.id} className="group hover:bg-white/[0.01] transition-all">
                    <td className="px-4 sm:px-6 py-4 text-zinc-300 text-sm">{date}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="text-zinc-200 text-sm font-semibold capitalize">{p.plan_name}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-zinc-500 text-xs font-mono">{p.payer_email || '-'}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="text-zinc-400 text-xs">{p.payment_method || '-'}</span>
                      {p.payment_type && (
                        <span className="text-zinc-600 text-[10px] block">{p.payment_type}</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right text-zinc-200 text-sm font-mono">{formatCLP(bruto)}</td>
                    <td className="px-4 sm:px-6 py-4 text-right text-emerald-400 text-sm font-mono">{formatCLP(neto)}</td>
                    <td className="px-4 sm:px-6 py-4 text-right text-amber-400/80 text-sm font-mono">{formatCLP(iva)}</td>
                    <td className="px-4 sm:px-6 py-4 text-right text-red-400/80 text-sm font-mono">{formatCLP(fee)}</td>
                    <td className="px-4 sm:px-6 py-4 text-right text-blue-400 text-sm font-mono">{formatCLP(Math.round(received))}</td>
                  </tr>
                )
              })}
            </tbody>
            {payments.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-900/40 text-sm font-bold">
                  <td colSpan={4} className="px-4 sm:px-6 py-4 text-zinc-400 uppercase text-xs tracking-widest">Totales</td>
                  <td className="px-4 sm:px-6 py-4 text-right text-white font-mono">{formatCLP(totalBruto)}</td>
                  <td className="px-4 sm:px-6 py-4 text-right text-emerald-400 font-mono">{formatCLP(totalNeto)}</td>
                  <td className="px-4 sm:px-6 py-4 text-right text-amber-400 font-mono">{formatCLP(totalIVA)}</td>
                  <td className="px-4 sm:px-6 py-4 text-right text-red-400 font-mono">{formatCLP(totalMPFee)}</td>
                  <td className="px-4 sm:px-6 py-4 text-right text-blue-400 font-mono">{formatCLP(Math.round(totalNetReceived))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-4">
      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-lg sm:text-xl font-black tracking-tight ${color}`}>{value}</p>
      <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>
    </div>
  )
}
