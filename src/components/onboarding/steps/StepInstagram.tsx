import { motion } from 'framer-motion'
import { buildInstagramOAuthUrl } from '../../../utils/instagramOAuth'

interface StepInstagramProps {
  session: any
  instance: any
  onNext: () => void
  onSkip: () => void
  onBack: () => void
}

export default function StepInstagram({ session, instance, onNext, onSkip, onBack }: StepInstagramProps) {
  const isConnected = !!instance?.provider_id

  const handleConnect = () => {
    sessionStorage.setItem('onboarding_step', '2')
    window.location.href = buildInstagramOAuthUrl(session.user.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col items-center justify-center min-h-[70vh] px-6 max-w-lg mx-auto"
    >
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(225,48,108,0.3)]">
        <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      </div>

      <h2 className="text-2xl font-black text-white mb-2 text-center">
        Conecta tu Instagram
      </h2>
      <p className="text-gray-500 text-sm mb-6 text-center">
        Vincula tu cuenta de Instagram Business para que tu bot responda comentarios y DMs automaticamente.
      </p>

      {!isConnected && (
        <div className="w-full max-w-sm mb-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Seras redirigido a <span className="text-white font-medium">Meta</span> para autorizar el acceso a tu cuenta de Instagram Business. No tiene costo. Al finalizar, volveras aqui automaticamente.
              </p>
              <p className="text-[10px] text-gray-600 mt-2">
                Necesitas una cuenta de Instagram conectada a una Pagina de Facebook.
              </p>
            </div>
          </div>
        </div>
      )}

      {isConnected ? (
        <div className="w-full max-w-xs space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <svg className="w-8 h-8 text-emerald-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-bold text-emerald-300">Instagram conectado</p>
            <p className="text-xs text-emerald-400/60 mt-1 font-mono">{instance.provider_id}</p>
          </div>
          <button
            onClick={onNext}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Continuar
          </button>
        </div>
      ) : (
        <div className="w-full max-w-xs space-y-4">
          <button
            onClick={handleConnect}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] text-white hover:shadow-[0_0_30px_rgba(225,48,108,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Conectar con Instagram
          </button>
          <p className="text-[10px] text-gray-600 text-center">
            Seras redirigido a Meta para autorizar el acceso. Volveras aqui automaticamente.
          </p>
        </div>
      )}

      <div className="flex gap-4 mt-6">
        <button onClick={onBack} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          Volver
        </button>
        {!isConnected && (
          <button onClick={onSkip} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Omitir por ahora
          </button>
        )}
      </div>
    </motion.div>
  )
}
