import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface IndexProps {
  onLoginClick: () => void;
}

// --- HELPER: GENERAR ESTRELLAS ---
const generateStars = (count: number) => {
  let stars = ''
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 100)
    const y = Math.floor(Math.random() * 100)
    stars += `${x}vw ${y}vh rgba(255, 255, 255, 0.8),`
  }
  return stars.slice(0, -1)
}

// --- CURVA DE ANIMACIÓN LUJOSA ---
const luxuryEase: [number, number, number, number] = [0.16, 1, 0.3, 1]; 

export default function IndexLanding({ onLoginClick }: IndexProps) {
  
  // Estados de la secuencia
  const [stage, setStage] = useState<'waiting' | 'approaching' | 'touching' | 'buttonReady' | 'redirecting'>('waiting')

  const smallStars = useMemo(() => generateStars(700), [])
  const mediumStars = useMemo(() => generateStars(200), [])
  const largeStars = useMemo(() => generateStars(100), [])

  useEffect(() => {
    // --- SECUENCIA DE TIEMPOS ---
    setTimeout(() => setStage('approaching'), 1500) // Mano entra
    setTimeout(() => setStage('touching'), 2800)    // Mano toca estrella
    setTimeout(() => setStage('buttonReady'), 3800) // Estrella se transforma en botón
    
    // --- FASE 2: REDIRECCIÓN AUTOMÁTICA ---
    // Esperamos 1.5 segundos extra después de que el botón está listo para que se vea el oro,
    // y luego ejecutamos la entrada automáticamente.
    setTimeout(() => {
        setStage('redirecting');
        onLoginClick(); // <--- ¡ENTRADA AUTOMÁTICA!
    }, 6000) 

  }, [onLoginClick])


  return (
    <div className="h-screen w-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1b2735] via-[#090a0f] to-[#000000] flex items-center justify-center overflow-hidden relative font-sans">
      
      {/* --- FONDO DE ESTRELLAS --- */}
      <div className="absolute inset-0 z-0 animate-pulse opacity-30" style={{ width: '1px', height: '1px', boxShadow: smallStars }} />
      <div className="absolute inset-0 z-0 opacity-50" style={{ width: '2px', height: '2px', boxShadow: mediumStars }} />
      <div className="absolute inset-0 z-0 opacity-70" style={{ width: '3px', height: '3px', boxShadow: largeStars }} />


      {/* --- ZONA CENTRAL (ESTRELLA -> BOTÓN DE ORO) --- */}
      <div className="relative z-30 flex flex-col items-center justify-center">
        <AnimatePresence mode='wait'>
            {(stage !== 'buttonReady' && stage !== 'redirecting') ? (
                /* LA ESTRELLA LUMINOSA (ANTES DEL TOQUE) */
                <motion.div
                    key="star"
                    layoutId="hero-morph"
                    initial={{ scale: 0, opacity: 0, rotate: 0 }}
                    animate={{ 
                        scale: stage === 'touching' ? 3 : 1,
                        opacity: stage === 'touching' ? 0.4 : 1,
                        rotate: 90, 
                    }}
                    exit={{ scale: 0, opacity: 0, transition: { duration: 0.3 } }} 
                    transition={{ 
                        rotate: { duration: 12, repeat: Infinity, ease: "linear" },
                        scale: { duration: 0.4, ease: luxuryEase }
                    }}
                    className="relative flex items-center justify-center w-4 h-4"
                >
                    <motion.div 
                        animate={{ 
                          boxShadow: stage === 'touching' ? "0 0 60px 30px rgba(59,130,246,1)" : "0 0 30px 15px rgba(59,130,246,0.8)",
                          backgroundColor: stage === 'touching' ? "#ffffff" : "#dbeafe"
                        }}
                        className="absolute w-3 h-3 rounded-full blur-[2px] transition-all duration-300" 
                    />
                    <motion.div animate={{ scaleX: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute w-32 h-[1px] bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
                    <motion.div animate={{ scaleY: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 3, repeat: Infinity, delay: 1.5, ease: "easeInOut" }} className="absolute w-[1px] h-32 bg-gradient-to-b from-transparent via-blue-300 to-transparent" />
                </motion.div>
            ) : (
                /* --- FASE 1: EL BOTÓN DE ORO --- */
                <motion.button
                    key="button"
                    layoutId="hero-morph"
                    // Ya no necesitamos onClick porque es automático
                    initial={{ width: '20px', height: '20px', borderRadius: '50%', opacity: 0, background: '#FCD34D' }}
                    animate={{ 
                        width: '260px', // Un poco más ancho para el nuevo texto
                        height: '60px', 
                        borderRadius: '12px', // Bordes más redondeados como lingote
                        opacity: 1,
                        // --- ESTILOS DE ORO REALISTA (CSS) ---
                        // Gradiente metálico de arriba hacia abajo
                        background: 'linear-gradient(to bottom, #FDE68A 0%, #F59E0B 50%, #D97706 100%)',
                        // Sombras complejas para dar volumen 3D metálico
                        boxShadow: `
                            0px 10px 20px -5px rgba(180, 83, 9, 0.6), // Sombra externa dorada oscura
                            inset 0px 4px 5px rgba(255,255,255,0.8),   // Brillo superior interno
                            inset 0px -4px 5px rgba(146, 64, 14, 0.5)  // Sombra inferior interna
                        `,
                        border: "2px solid #FCD34D" // Borde dorado brillante
                    }}
                    // Quitamos los hovers y taps porque el usuario no interactúa
                    transition={{ layout: { duration: 1, ease: luxuryEase }, opacity: { duration: 0.4 } }}
                    className="relative flex items-center justify-center z-20 overflow-hidden group cursor-default"
                >
                    {/* Brillo metálico pasando por encima */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite_delay-1s]" />
                    
                    {/* --- TEXTO NEGRO --- */}
                    <motion.span 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }} 
                        // Color gris muy oscuro (casi negro) para contraste premium
                        className="text-gray-900 font-bold tracking-[0.2em] text-sm uppercase drop-shadow-sm"
                    >
                        MiTiendaVirtual
                    </motion.span>
                </motion.button>
            )}
        </AnimatePresence>
      </div>


      {/* --- IMAGEN REALISTA DE LA MANO ROBOT --- */}
      <motion.img
        src="/robot-hand.png" 
        alt="Mano robótica interactuando"
        initial={{ y: '100vh', x: '0%', rotate: 10, opacity: 0 }} 
        animate={{ 
            // Coordenadas ajustadas
            y: (stage === 'approaching' || stage === 'touching') ? 'calc(50% - 110px)' : '100vh',
            x: (stage === 'approaching' || stage === 'touching') ? '-15%' : '0%',
            
            rotate: stage === 'touching' ? 0 : 10,
            // La mano desaparece cuando se forma el botón
            opacity: (stage === 'buttonReady' || stage === 'redirecting') ? 0 : 1,
            scale: stage === 'touching' ? 1.05 : 1
        }}
        transition={{ duration: 2.5, ease: luxuryEase }}
        className="absolute z-20 pointer-events-none w-[600px] h-auto object-contain origin-bottom drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
      />

      {/* --- AMBIENTE --- */}
      <div className="absolute inset-0 bg-radial-at-c from-blue-900/10 via-transparent to-transparent pointer-events-none z-0"></div>
    </div>
  )
}