import { motion } from 'framer-motion'
import { isInTrial, trialDaysLeft } from '../../../utils/planUtils'

interface StepWelcomeProps {
  profile: any
  onNext: () => void
  onSkipAll: () => void
}

export default function StepWelcome({ profile, onNext, onSkipAll }: StepWelcomeProps) {
  const trial = isInTrial(profile)
  const days = trial ? trialDaysLeft(profile) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 max-w-lg mx-auto"
    >
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(99,102,241,0.3)]">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      </div>

      <h1 className="text-3xl font-black text-white mb-3 tracking-tight">
        Tu asistente IA esta listo
      </h1>
      <p className="text-gray-400 text-base mb-2">
        Vamos a configurar tu agente de ventas en menos de 5 minutos.
      </p>
      <p className="text-gray-500 text-sm mb-8">
        Conecta tus canales, personaliza tu bot y sube tus productos para que empiece a vender por ti.
      </p>

      {trial && days > 0 && (
        <div className="mb-8 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-sm text-indigo-300">
            Tienes <span className="font-bold text-white">{days} dias</span> de prueba del plan Pro
          </p>
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full max-w-xs py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        Comenzar
      </button>

      <button
        onClick={onSkipAll}
        className="mt-4 text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        Saltar configuracion
      </button>
    </motion.div>
  )
}
