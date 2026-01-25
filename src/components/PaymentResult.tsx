import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti' // Opcional: si quieres fiesta, sino quita esta línea y el useEffect de abajo

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'success' | 'failure' | 'pending'>('pending')

  useEffect(() => {
    // Leemos el estado que nos manda Mercado Pago o tu URL
    // MercadoPago suele usar params como 'collection_status' o 'status'
    const statusParam = searchParams.get('status') || searchParams.get('collection_status')
    const stateParam = searchParams.get('state') // Por si usas tus propios params

    if (statusParam === 'approved' || stateParam === 'success') {
      setStatus('success')
      // ¡Fiesta de confeti! 🎉
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    } else if (statusParam === 'rejected' || stateParam === 'failure') {
      setStatus('failure')
    } else if (statusParam === 'in_process' || statusParam === 'pending' || stateParam === 'pending') {
      setStatus('pending')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo ambiental */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black z-0" />

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center shadow-2xl"
      >
        
        {/* --- CASO ÉXITO --- */}
        {status === 'success' && (
            <>
                <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} 
                    className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 text-4xl"
                >
                    🎉
                </motion.div>
                <h1 className="text-3xl font-bold mb-2">¡Pago Exitoso!</h1>
                <p className="text-gray-400 mb-8">
                    Tu suscripción ha sido activada correctamente. Ya puedes usar todo el poder de tu vendedor virtual.
                </p>
                <button 
                    onClick={() => navigate('/dashboard?payment=success')}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-green-500/20"
                >
                    Ir al Dashboard
                </button>
            </>
        )}

        {/* --- CASO FALLO --- */}
        {status === 'failure' && (
            <>
                <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} 
                    className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 text-4xl"
                >
                    ✕
                </motion.div>
                <h1 className="text-3xl font-bold mb-2">Hubo un problema</h1>
                <p className="text-gray-400 mb-8">
                    El pago no pudo procesarse. No te preocupes, no se ha realizado ningún cargo.
                </p>
                <div className="space-y-3">
                    <button 
                        onClick={() => navigate('/dashboard?activeTab=plans')}
                        className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all"
                    >
                        Intentar de nuevo
                    </button>
                    <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:text-gray-300">
                        Volver al inicio
                    </button>
                </div>
            </>
        )}

        {/* --- CASO PENDIENTE --- */}
        {status === 'pending' && (
            <>
                <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} 
                    className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-500 text-4xl"
                >
                    ⏳
                </motion.div>
                <h1 className="text-3xl font-bold mb-2">Pago en Proceso</h1>
                <p className="text-gray-400 mb-8">
                    Estamos esperando la confirmación de tu banco. Esto puede tardar unos minutos.
                </p>
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-xl transition-all"
                >
                    Volver y Esperar
                </button>
            </>
        )}

      </motion.div>
    </div>
  )
}