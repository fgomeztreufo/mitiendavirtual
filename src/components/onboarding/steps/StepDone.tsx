import { useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'

interface StepDoneProps {
  instance: any
  completedSteps: {
    businessType: boolean
    instagram: boolean
    whatsapp: boolean
    personality: boolean
    content: boolean
  }
  onFinish: () => void
}

export default function StepDone({ instance, completedSteps, onFinish }: StepDoneProps) {
  useEffect(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    const t = setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.4 } }), 500)
    return () => clearTimeout(t)
  }, [])

  const items = [
    { label: 'Tipo de negocio', done: completedSteps.businessType },
    { label: 'Instagram conectado', done: completedSteps.instagram },
    { label: 'WhatsApp conectado', done: completedSteps.whatsapp },
    { label: 'Personalidad del agente', done: completedSteps.personality },
    { label: 'Primer producto subido', done: completedSteps.content },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[70vh] px-6 max-w-lg mx-auto text-center"
    >
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(52,211,153,0.4)]">
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h2 className="text-3xl font-black text-gray-900 mb-3">
        Todo listo!
      </h2>
      <p className="text-gray-500 text-base mb-8">
        Tu asistente IA esta configurado y listo para empezar a vender.
      </p>

      <div className="w-full max-w-xs space-y-2 mb-8">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200">
            {item.done ? (
              <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
            <span className={`text-sm ${item.done ? 'text-gray-900' : 'text-gray-500'}`}>{item.label}</span>
          </div>
        ))}
      </div>

      {items.some(i => !i.done) && (
        <p className="text-xs text-gray-600 mb-6">
          Puedes completar lo que falta desde el menu lateral.
        </p>
      )}

      <button
        onClick={onFinish}
        className="w-full max-w-xs py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        Ir al Dashboard
      </button>
    </motion.div>
  )
}
