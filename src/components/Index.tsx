import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Footer from './Footer'
import { DataDeletion, PrivacyPolicy, SupportPage, TermsOfService } from './LegalPages';

interface IndexProps {
  onLoginClick: () => void;
}

const generateStars = (count: number) => {
  let stars = ''
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 100)
    const y = Math.floor(Math.random() * 100)
    stars += `${x}vw ${y}vh rgba(255, 255, 255, 0.8),`
  }
  return stars.slice(0, -1)
}

const luxuryEase: [number, number, number, number] = [0.16, 1, 0.3, 1]; 

export default function IndexLanding({ onLoginClick }: IndexProps) {
  const [stage, setStage] = useState<'waiting' | 'approaching' | 'touching' | 'buttonReady' | 'redirecting'>('waiting')

  const smallStars = useMemo(() => generateStars(700), [])
  const mediumStars = useMemo(() => generateStars(200), [])
  const largeStars = useMemo(() => generateStars(100), [])
  // --- NUEVO ESTADO PARA VISTAS LEGALES ---
  const [legalView, setLegalView] = useState<string | null>(null);

  useEffect(() => {
    setTimeout(() => setStage('approaching'), 1500)
    setTimeout(() => setStage('touching'), 2800)
    setTimeout(() => setStage('buttonReady'), 3800)
    
    setTimeout(() => {
        setStage('redirecting');
        onLoginClick();
    }, 6000) 
  }, [onLoginClick])

  return (
    // min-h-screen y flex-col aseguran que el footer se vaya al fondo
    <div className="min-h-screen w-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1b2735] via-[#090a0f] to-[#000000] flex flex-col overflow-x-hidden relative font-sans">
      
      {/* FONDO DE ESTRELLAS */}
      <div className="absolute inset-0 z-0 animate-pulse opacity-30" style={{ width: '1px', height: '1px', boxShadow: smallStars }} />
      <div className="absolute inset-0 z-0 opacity-50" style={{ width: '2px', height: '2px', boxShadow: mediumStars }} />
      <div className="absolute inset-0 z-0 opacity-70" style={{ width: '3px', height: '3px', boxShadow: largeStars }} />

      {/* ZONA CENTRAL (flex-1 para empujar el footer hacia abajo) */}
      <div className="relative z-30 flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode='wait'>
            {(stage !== 'buttonReady' && stage !== 'redirecting') ? (
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
                </motion.div>
            ) : (
                <motion.button
                    key="button"
                    layoutId="hero-morph"
                    initial={{ width: '20px', height: '20px', borderRadius: '50%', opacity: 0, background: '#FCD34D' }}
                    animate={{ 
                        width: '260px', 
                        height: '60px', 
                        borderRadius: '12px', 
                        opacity: 1,
                        background: 'linear-gradient(to bottom, #FDE68A 0%, #F59E0B 50%, #D97706 100%)',
                        boxShadow: `0px 10px 20px -5px rgba(180, 83, 9, 0.6), inset 0px 4px 5px rgba(255,255,255,0.8)`,
                        border: "2px solid #FCD34D"
                    }}
                    transition={{ layout: { duration: 1, ease: luxuryEase }, opacity: { duration: 0.4 } }}
                    className="relative flex items-center justify-center z-20 overflow-hidden group cursor-default"
                >
                    <motion.span 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.6, duration: 0.5 }} 
                        className="text-gray-900 font-bold tracking-[0.2em] text-sm uppercase"
                    >
                        MiTiendaVirtual
                    </motion.span>
                </motion.button>
            )}
        </AnimatePresence>
      </div>

      {/* MANO ROBOT (Absolute) */}
      <motion.img
        src="/robot-hand.png" 
        initial={{ y: '100vh', x: '0%', rotate: 10, opacity: 0 }} 
        animate={{ 
            y: (stage === 'approaching' || stage === 'touching') ? 'calc(60% - 110px)' : '100vh',
            x: (stage === 'approaching' || stage === 'touching') ? '105%' : '0%',
            rotate: stage === 'touching' ? 0 : 10,
            opacity: (stage === 'buttonReady' || stage === 'redirecting') ? 0 : 1
        }}
        transition={{ duration: 2.5, ease: luxuryEase }}
        className="absolute z-20 pointer-events-none w-[600px] h-auto object-contain origin-bottom"
      />
      

      {/* FOOTER DINÁMICO */}
      <Footer 
        variant="index" 
        onNavigate={(tab) => {
          // Si estás en el index, podrías redirigir a una URL física 
          // o simplemente hacer scroll si estuvieran ahí.
          console.log("Navegando a:", tab);
          setLegalView(tab);
        }} 
        
      />
      {/* --- RENDERIZADO DE MODALES LEGALES --- */}
      {legalView === 'terms' && <TermsOfService onClose={() => setLegalView(null)} />}
      {legalView === 'privacy' && <PrivacyPolicy onClose={() => setLegalView(null)} />}
      {legalView === 'data-deletion' && <DataDeletion onClose={() => setLegalView(null)} />}
      {legalView === 'support' && <SupportPage onClose={() => setLegalView(null)} />}
      

      <div className="absolute inset-0 bg-radial-at-c from-blue-900/10 via-transparent to-transparent pointer-events-none z-0"></div>
    </div>
  )
}