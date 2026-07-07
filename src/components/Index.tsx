import { useState, useMemo } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { FaInstagram, FaTelegram, FaWhatsapp, FaGoogle, FaMeta } from 'react-icons/fa6'
import { DataDeletion, PrivacyPolicy, SupportPage, TermsOfService } from './LegalPages'

interface IndexProps {
  onLoginClick: () => void;
}

/* ─── Helpers ─── */
const generateStars = (count: number) => {
  let stars = ''
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 100)
    const y = Math.floor(Math.random() * 100)
    const alpha = (Math.random() * 0.5 + 0.3).toFixed(2)
    stars += `${x}vw ${y}vh rgba(255,255,255,${alpha}),`
  }
  return stars.slice(0, -1)
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  })
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
}

/* ─── Data ─── */
const CHANNELS = [
  { Icon: FaInstagram, label: 'Instagram', color: 'from-pink-500 to-purple-600', desc: 'Responde DMs y comentarios con IA 24/7' },
  { Icon: FaTelegram,  label: 'Telegram',  color: 'from-sky-400 to-blue-600',    desc: 'Bot inteligente para tu comunidad' },
  { Icon: FaWhatsapp,  label: 'WhatsApp',  color: 'from-green-400 to-emerald-600', desc: 'El canal que más vende en Chile' },
  { Icon: FaGoogle,    label: 'Google Calendar', color: 'from-blue-400 to-indigo-600', desc: 'Agenda citas automáticamente' },
]

const PLANS = [
  { name: 'Semilla', emoji: '🌱', price: '0', products: '10', messages: '50', highlight: false, cta: 'Empezar Gratis' },
  { name: 'Básico', emoji: '⚡', price: '14.990', products: '50', messages: '500', highlight: true, cta: 'Elegir Básico' },
  { name: 'Pro',    emoji: '💎', price: '44.990', products: '500', messages: '2.000', highlight: false, cta: 'Próximamente', blocked: true },
  { name: 'Full',   emoji: '🔥', price: '79.990', products: '2.000', messages: '5.000', highlight: false, cta: 'Próximamente', blocked: true },
]

/* ─── Component ─── */
export default function IndexLanding({ onLoginClick }: IndexProps) {
  const [legalView, setLegalView] = useState<string | null>(null)

  const smallStars = useMemo(() => generateStars(600), [])
  const mediumStars = useMemo(() => generateStars(150), [])

  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0])

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white overflow-x-hidden font-sans">

      {/* ════════════ STARFIELD BACKGROUND ════════════ */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-25" style={{ width: '1px', height: '1px', boxShadow: smallStars }} />
        <div className="absolute inset-0 opacity-40" style={{ width: '2px', height: '2px', boxShadow: mediumStars }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050505]" />
      </div>

      {/* ════════════ HERO ════════════ */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 text-center"
      >
        {/* Glow orb — smaller on mobile */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] md:w-[600px] md:h-[600px] rounded-full bg-gradient-to-br from-indigo-600/20 via-purple-500/10 to-transparent blur-[80px] md:blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Meta Partner badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex items-center justify-center gap-2 mb-8"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
              <FaMeta className="text-blue-400 text-lg" />
              <span className="text-xs text-gray-300 font-medium tracking-wide">Technology Partner</span>
            </div>
          </motion.div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight">
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
              Automatiza tus ventas
            </span>
            <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              con Inteligencia Artificial
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-4 sm:mt-6 max-w-2xl mx-auto text-gray-400 text-sm sm:text-base md:text-lg leading-relaxed px-2"
          >
            Conecta Instagram, Telegram, WhatsApp y Google Calendar.
            Tu negocio responde, vende y agenda — las 24 horas, los 7 días.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0"
          >
            <button
              onClick={onLoginClick}
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm tracking-wide shadow-[0_8px_32px_rgba(99,102,241,0.4)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.6)] active:scale-95 hover:scale-[1.02] transition-all duration-300"
            >
              Empezar ahora — Es gratis
            </button>
            <a
              href="#planes"
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl border border-white/10 text-gray-300 font-medium text-sm hover:bg-white/5 hover:border-white/20 active:scale-95 transition-all duration-300 text-center"
            >
              Ver planes
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-5 h-8 rounded-full border-2 border-white/20 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-white/50" />
          </div>
        </motion.div>
      </motion.section>

      {/* ════════════ CHANNELS / FEATURES ════════════ */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl md:text-5xl font-bold">
              Todos tus canales.{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                Un solo cerebro IA.
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-gray-500 max-w-xl mx-auto">
              Cada mensaje que llega se responde con contexto, inteligencia y el tono de tu marca.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {CHANNELS.map((ch, i) => (
              <motion.div
                key={ch.label}
                variants={fadeUp}
                custom={i}
                className="group relative p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/15 hover:bg-white/[0.04] transition-all duration-500"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ch.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <ch.Icon className="text-white text-xl" />
                </div>
                <h3 className="text-white font-semibold mb-1">{ch.label}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{ch.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════ PLANS ════════════ */}
      <section id="planes" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl md:text-5xl font-bold">
              Planes que{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                impulsan tu negocio
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-gray-500 max-w-xl mx-auto">
              Sin contratos. Pagas por mes. Si no renuevas, vuelves al plan Semilla sin perder datos.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                custom={i}
                className={`relative p-6 rounded-2xl flex flex-col ${
                  plan.highlight
                    ? 'border-2 border-indigo-500/60 bg-gradient-to-b from-indigo-950/40 to-gray-900 shadow-[0_8px_40px_rgba(99,102,241,0.15)]'
                    : 'border border-white/5 bg-white/[0.02]'
                } ${plan.blocked ? 'opacity-70' : ''}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold tracking-wider">
                    MÁS POPULAR
                  </div>
                )}
                {plan.blocked && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-yellow-400/90 text-black text-[9px] font-bold">
                    PRÓXIMAMENTE
                  </div>
                )}

                <h3 className="text-lg font-bold mt-1">{plan.name} {plan.emoji}</h3>
                <div className="mt-2 text-3xl font-extrabold">
                  ${plan.price}
                  <span className="text-sm text-gray-500 font-normal"> /mes</span>
                </div>

                <ul className="mt-5 space-y-2 text-sm text-gray-400 flex-1">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {plan.products} productos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {plan.messages} msg IA/mes
                  </li>
                </ul>

                <button
                  onClick={plan.blocked ? undefined : onLoginClick}
                  disabled={plan.blocked}
                  className={`mt-6 w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    plan.blocked
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : plan.highlight
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                      : 'border border-white/10 text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════ CTA FINAL ════════════ */}
      <section className="relative z-10 py-20 sm:py-32 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] rounded-full bg-gradient-to-br from-purple-600/10 to-indigo-600/5 blur-[80px] md:blur-[100px] pointer-events-none" />

          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight relative">
            Tu negocio nunca duerme.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Tu IA tampoco.
            </span>
          </h2>
          <p className="mt-4 sm:mt-6 text-gray-500 text-base sm:text-lg px-2">
            Empieza gratis hoy y automatiza tu primer canal en menos de 5 minutos.
          </p>
          <button
            onClick={onLoginClick}
            className="mt-8 sm:mt-10 px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm tracking-wide shadow-[0_8px_32px_rgba(99,102,241,0.4)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.6)] active:scale-95 hover:scale-[1.02] transition-all duration-300"
          >
            Crear mi cuenta gratis
          </button>
        </motion.div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="relative z-10 border-t border-white/5 bg-black/60 backdrop-blur-sm px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              MiTiendaVirtual
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 text-[9px] text-gray-500">
              <FaMeta className="text-blue-400" /> Meta Partner
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
            <button onClick={() => setLegalView('terms')} className="hover:text-white transition-colors">
              Términos
            </button>
            <button onClick={() => setLegalView('privacy')} className="hover:text-white transition-colors">
              Privacidad
            </button>
            <button onClick={() => setLegalView('data-deletion')} className="hover:text-red-400 transition-colors">
              Eliminar datos
            </button>
            <button onClick={() => setLegalView('support')} className="hover:text-blue-300 transition-colors">
              Ayuda
            </button>
          </div>

          <p className="text-[10px] text-gray-600 font-mono tracking-widest uppercase">
            © 2026 • Santiago, CL
          </p>
        </div>
      </footer>

      {/* Legal modals */}
      {legalView === 'terms' && <TermsOfService onClose={() => setLegalView(null)} />}
      {legalView === 'privacy' && <PrivacyPolicy onClose={() => setLegalView(null)} />}
      {legalView === 'data-deletion' && <DataDeletion onClose={() => setLegalView(null)} />}
      {legalView === 'support' && <SupportPage onClose={() => setLegalView(null)} />}
    </div>
  )
}