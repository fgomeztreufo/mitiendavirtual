import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../../supabaseClient'
import { BUSINESS_TYPES } from '../../../utils/planUtils'

interface StepBusinessTypeProps {
  profile: any
  onNext: (businessType: string) => void
  onBack: () => void
}

const ICONS: Record<string, string> = {
  ecommerce: 'M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
  inmobiliaria: 'M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819',
  clinica: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
  servicios: 'M11.42 15.17l-5.658-5.66a5.002 5.002 0 117.08-7.08l.58.579.579-.58a5.002 5.002 0 117.08 7.08l-5.66 5.66a2.25 2.25 0 01-3.182 0z',
  restaurant: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265z',
}

export default function StepBusinessType({ profile, onNext, onBack }: StepBusinessTypeProps) {
  const [selected, setSelected] = useState(
    profile?.business_type && profile.business_type !== 'ecommerce'
      ? profile.business_type
      : ''
  )
  const [saving, setSaving] = useState(false)

  const handleContinue = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await supabase
        .from('profiles')
        .update({ business_type: selected })
        .eq('id', profile.id)
      onNext(selected)
    } catch (_) {
      onNext(selected)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col items-center justify-center min-h-[70vh] px-6 max-w-lg mx-auto"
    >
      <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">
        Que tipo de negocio tienes?
      </h2>
      <p className="text-gray-500 text-sm mb-8 text-center">
        Esto nos ayuda a personalizar tu experiencia
      </p>

      <div className="w-full space-y-3 mb-8">
        {Object.entries(BUSINESS_TYPES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
              selected === key
                ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              selected === key ? 'bg-indigo-500/20' : 'bg-gray-100'
            }`}>
              <svg className={`w-5 h-5 ${selected === key ? 'text-indigo-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[key] || ICONS.ecommerce} />
              </svg>
            </div>
            <span className={`text-sm font-semibold ${selected === key ? 'text-gray-900' : 'text-gray-600'}`}>
              {label}
            </span>
            {selected === key && (
              <svg className="w-5 h-5 text-indigo-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected || saving}
        className="w-full max-w-xs py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-purple-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        {saving ? 'Guardando...' : 'Continuar'}
      </button>

      <button onClick={onBack} className="mt-4 text-xs text-gray-500 hover:text-gray-700 transition-colors">
        Volver
      </button>
    </motion.div>
  )
}
