import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { motion } from 'framer-motion'

interface ReferralStats {
  referral_code: string
  total: number
  pending: number
  activated: number
  credits_earned: number
  monthly_credits_cap: number
  monthly_credits_earned: number
  monthly_remaining: number
}

interface Referral {
  id: string
  referred_id: string
  status: string
  credits_amount: number
  created_at: string
  referrer_credited_at: string | null
  referred_email?: string
}

export default function ReferralsView({ session }: { session: Session }) {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const shareUrl = stats?.referral_code
    ? `https://mitiendavirtual.cl?ref=${stats.referral_code}`
    : ''

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const { data: statsData } = await supabase.rpc('get_referral_stats', {
        p_user_id: session.user.id
      })
      if (statsData) setStats(statsData)

      const { data: refs } = await supabase
        .from('referrals')
        .select('id, referred_id, status, credits_amount, created_at, referrer_credited_at')
        .eq('referrer_id', session.user.id)
        .order('created_at', { ascending: false })
      if (refs) setReferrals(refs)
    } catch (e) {
      console.error('Error loading referral data:', e)
    }
    setLoading(false)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MiTiendaVirtual — Automatiza tus ventas con IA',
          text: `Regístrate con mi código y ambos ganamos 150 créditos IA gratis. Usa mi link:`,
          url: shareUrl,
        })
      } catch {}
    } else {
      copyLink()
    }
  }

  const statusLabel: Record<string, { text: string; color: string }> = {
    pending: { text: 'Pendiente', color: 'text-amber-400' },
    activated: { text: 'Activado', color: 'text-emerald-400' },
    credited: { text: 'Acreditado', color: 'text-emerald-400' },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-xl font-bold text-white">Programa de Referidos</h2>
        <p className="text-sm text-gray-400 mt-1">
          Comparte tu código y ambos ganan <span className="text-indigo-400 font-semibold">150 créditos IA</span> gratis
        </p>
      </motion.div>

      {/* Share card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent border border-indigo-500/20 rounded-2xl p-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-1">Tu código de referido</p>
            <p className="text-2xl font-black text-white tracking-widest font-mono">
              {stats?.referral_code || '---'}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={copyLink}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-sm font-semibold rounded-xl border border-indigo-500/30 bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Copiado
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  Copiar link
                </>
              )}
            </button>
            <button
              onClick={shareLink}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Compartir
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-black/30 border border-white/5">
          <p className="text-xs text-gray-500 font-mono break-all">{shareUrl}</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <StatCard label="Referidos totales" value={stats?.total ?? 0} />
        <StatCard label="Activados" value={stats?.activated ?? 0} color="text-emerald-400" />
        <StatCard label="Créditos ganados" value={stats?.credits_earned ?? 0} color="text-indigo-400" />
        <StatCard label="Disponibles este mes" value={stats?.monthly_remaining ?? 10} color="text-amber-400" />
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="bg-white/[0.02] border border-white/5 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white">Créditos por referidos este mes</h3>
          <span className="text-xs text-gray-400">
            {(stats?.monthly_credits_earned ?? 0).toLocaleString('es-CL')} / {(stats?.monthly_credits_cap ?? 1500).toLocaleString('es-CL')}
          </span>
        </div>
        <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, ((stats?.monthly_credits_earned ?? 0) / (stats?.monthly_credits_cap ?? 1500)) * 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-500"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[11px] text-gray-500">
            {stats?.monthly_remaining ?? 10} referidos disponibles
          </p>
          <p className="text-[11px] text-gray-500">
            Máx. 1.500 créditos/mes
          </p>
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-white/[0.02] border border-white/5 rounded-2xl p-5"
      >
        <h3 className="text-sm font-bold text-white mb-3">Cómo funciona</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StepCard
            step="1"
            title="Comparte tu link"
            desc="Envía tu link de referido a otros emprendedores"
          />
          <StepCard
            step="2"
            title="Se registran"
            desc="Ellos reciben 150 créditos IA al registrarse"
          />
          <StepCard
            step="3"
            title="Ambos ganan"
            desc="Cuando activan su cuenta, tú también recibes 150 créditos"
          />
        </div>
        <p className="text-[11px] text-gray-600 mt-4">
          Un referido se activa cuando conecta un canal o usa 20+ créditos IA. Máximo 10 referidos por mes. Los créditos no expiran.
        </p>
      </motion.div>

      {/* Referrals list */}
      {referrals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-bold text-white">Tus referidos</h3>
          </div>
          <div className="divide-y divide-white/5">
            {referrals.map((ref) => {
              const st = statusLabel[ref.status] || statusLabel.pending
              return (
                <div key={ref.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">
                      Referido #{ref.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(ref.created_at).toLocaleDateString('es-CL', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${st.color}`}>{st.text}</span>
                    <p className="text-xs text-gray-500">{ref.credits_amount} créditos</p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}

function StatCard({ label, value, color = 'text-white' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString('es-CL')}</p>
      <p className="text-[11px] text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-indigo-400">{step}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
    </div>
  )
}
