import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion'
import { FaInstagram, FaTelegram, FaWhatsapp, FaGoogle, FaMeta } from 'react-icons/fa6'
import { ChevronDown } from 'lucide-react'
import { DataDeletion, PrivacyPolicy, SupportPage, TermsOfService } from './LegalPages'
import Header from './Header'
import FloatingWhatsAppButton from './FloatingWhatsAppButton'

interface IndexProps {
  onLoginClick: () => void;
}

/* ─── Helpers ─── */
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

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    const duration = 1500
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, target])

  return <span ref={ref}>{value.toLocaleString('es-CL')}{suffix}</span>
}

/* ─── Data ─── */
const CHANNELS = [
  { Icon: FaInstagram, label: 'Instagram', color: 'from-pink-500 to-purple-600', desc: 'Responde DMs y comentarios con IA 24/7' },
  { Icon: FaTelegram,  label: 'Telegram',  color: 'from-sky-400 to-blue-600',    desc: 'Bot inteligente para tu comunidad' },
  { Icon: FaWhatsapp,  label: 'WhatsApp',  color: 'from-green-400 to-emerald-600', desc: 'El canal que más vende en Chile' },
  { Icon: FaGoogle,    label: 'Google Calendar', color: 'from-blue-400 to-indigo-600', desc: 'Agenda citas automáticamente' },
]

const PLANS = [
  { name: 'Gratis',      emoji: '🌱', price: '0',      products: '10',    messages: '100',    channels: 'Todos los canales',  highlight: false, cta: 'Comenzar Gratis' },
  { name: 'Emprendedor', emoji: '⚡', price: '19.900', products: '100',   messages: '1.500',  channels: 'Todos los canales',  highlight: false, cta: 'Elegir Emprendedor' },
  { name: 'Negocio',     emoji: '💼', price: '49.900', products: '500',   messages: '5.000',  channels: 'Todos los canales',  highlight: true,  cta: 'Elegir Negocio' },
  { name: 'Escala',      emoji: '🔥', price: '99.900', products: '2.000', messages: '15.000', channels: 'Todos los canales',  highlight: false, cta: 'Elegir Escala' },
]

const STEPS = [
  { num: '1', title: 'Conecta tus canales', desc: 'Vincula Instagram, WhatsApp, Telegram o Google Calendar en un clic.' },
  { num: '2', title: 'Entrena tu IA', desc: 'Sube tus productos, precios y preguntas frecuentes. La IA aprende tu negocio.' },
  { num: '3', title: 'Vende en automático', desc: 'Tu IA responde, recomienda y agenda — 24/7, con el tono de tu marca.' },
]

const TESTIMONIALS = [
  { name: 'Carolina M.', role: 'Tienda de ropa, Santiago', quote: 'Antes perdía ventas por no responder a tiempo en Instagram. Ahora la IA responde al instante y mis ventas subieron un 40%.', initials: 'CM' },
  { name: 'Diego R.', role: 'Consultorio dental, Viña del Mar', quote: 'Google Calendar + la IA me agendan citas automáticamente. Dejé de perder pacientes que escribían fuera de horario.', initials: 'DR' },
  { name: 'Valentina S.', role: 'Pastelería artesanal, Concepción', quote: 'En una semana ya tenía todo funcionando. No necesité saber nada de tecnología. La IA responde igual que yo.', initials: 'VS' },
]

const FAQS = [
  { q: '¿Es difícil de configurar?', a: 'No. Conectas tu canal, subes tus productos y la IA empieza a responder. Todo en menos de 5 minutos, sin código.' },
  { q: '¿Qué pasa si la IA responde algo incorrecto?', a: 'La IA aprende de tu catálogo y tus instrucciones. Puedes revisar y ajustar las respuestas en cualquier momento desde el panel.' },
  { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. No hay contratos ni permanencia mínima. Cancelas cuando quieras y sigues usando el plan gratuito.' },
  { q: '¿Necesito conocimientos técnicos?', a: 'Para nada. Si sabes usar WhatsApp, sabes usar nuestra plataforma. Todo está diseñado para emprendedores, no para programadores.' },
  { q: '¿Funciona con mi tipo de negocio?', a: 'Sí. Tiendas, consultorios, restaurantes, servicios profesionales — cualquier negocio que atienda clientes por mensajería o agende citas.' },
]

const STATS = [
  { target: 500, suffix: '+', label: 'Negocios activos' },
  { target: 50000, suffix: '+', label: 'Mensajes automatizados' },
  { target: 4, suffix: '', label: 'Canales conectados' },
]

/* ─── Component ─── */
export default function IndexLanding({ onLoginClick }: IndexProps) {
  const [legalView, setLegalView] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0])

  return (
    <div className="min-h-screen w-full bg-white text-gray-900 overflow-x-hidden font-sans">

      <Header onLoginClick={onLoginClick} />

      {/* ════════════ HERO ════════════ */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 text-center pt-16"
      >
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] md:w-[600px] md:h-[600px] rounded-full bg-gradient-to-br from-indigo-500/[0.07] via-purple-500/[0.04] to-transparent blur-[80px] md:blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex items-center justify-center gap-2 mb-8"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-gray-50 backdrop-blur-md">
              <FaMeta className="text-blue-600 text-lg" />
              <span className="text-xs text-gray-600 font-medium tracking-wide">Technology Partner</span>
            </div>
          </motion.div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight">
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600">
              Automatiza tus ventas
            </span>
            <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
              con Inteligencia Artificial
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-4 sm:mt-6 max-w-2xl mx-auto text-gray-500 text-sm sm:text-base md:text-lg leading-relaxed px-2"
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
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 hover:border-gray-400 active:scale-95 transition-all duration-300 text-center"
            >
              Ver planes
            </a>
          </motion.div>

          {/* Chat mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="mt-12 sm:mt-16 w-full max-w-md mx-auto hidden sm:block"
          >
            <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-gray-400 ml-2">Tu IA vendedora</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%]">
                    <p className="text-sm text-gray-700">Hola, tienen la polera negra en talla M?</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
                    <p className="text-sm text-white">¡Sí! Tenemos stock en talla M. $12.990 con envío gratis. ¿Te la reservo?</p>
                  </div>
                </div>
                <div className="flex justify-start items-center gap-1 px-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-5 h-8 rounded-full border-2 border-gray-300 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-gray-400" />
          </div>
        </motion.div>
      </motion.section>

      {/* ════════════ STATS BAR ════════════ */}
      <section className="relative z-10 py-12 px-4 sm:px-6 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {STATS.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                <AnimatedCounter target={stat.target} suffix={stat.suffix} />
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ════════════ CHANNELS / FEATURES ════════════ */}
      <section id="canales" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 bg-[#F8FAFC] scroll-mt-20">
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
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                Un solo cerebro IA.
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-gray-600 max-w-xl mx-auto">
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
                className="group relative p-6 rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-500"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ch.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <ch.Icon className="text-white text-xl" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">{ch.label}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{ch.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section id="como-funciona" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 bg-white scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl md:text-5xl font-bold">
              Listo en 3 pasos,{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                sin código
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-gray-600 max-w-xl mx-auto">
              Configura tu vendedor IA en minutos. Sin conocimientos técnicos.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative"
          >
            {STEPS.map((step, i) => (
              <motion.div key={step.num} variants={fadeUp} custom={i} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] w-[calc(100%-4rem)] border-t-2 border-dashed border-gray-200" />
                )}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-lg flex items-center justify-center shadow-lg mb-4">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-xs">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════ PLANS ════════════ */}
      <section id="planes" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 bg-[#F8FAFC] scroll-mt-20">
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
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">
                impulsan tu negocio
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-gray-600 max-w-xl mx-auto">
              Sin contratos. Pagas por mes. Todos los canales abiertos desde el día 1.
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
                    ? 'border-2 border-indigo-400 bg-indigo-50 shadow-[0_8px_40px_rgba(99,102,241,0.12)]'
                    : plan.name === 'Gratis'
                    ? 'border-2 border-[#D4AF37] bg-amber-50/40 shadow-[0_8px_40px_rgba(212,175,55,0.15)]'
                    : 'border border-gray-200 bg-white shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold tracking-wider">
                    MÁS POPULAR
                  </div>
                )}

                <h3 className="text-lg font-bold mt-1">{plan.name} {plan.emoji}</h3>
                <div className="mt-2 text-3xl font-extrabold">
                  ${plan.price} <span className="text-base font-semibold text-gray-400">CLP</span>
                  <span className="text-sm text-gray-500 font-normal"> /mes</span>
                </div>

                <ul className="mt-5 space-y-2 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {plan.products} productos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {plan.messages} créditos IA/mes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {plan.channels}
                  </li>
                </ul>

                <button
                  onClick={onLoginClick}
                  className={`mt-6 w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    plan.highlight
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                      : plan.name === 'Gratis'
                      ? 'bg-[#D4AF37] hover:bg-[#c9a430] text-white shadow-lg'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════ BOLSAS DE RECARGA ════════════ */}
      <section className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl md:text-4xl font-bold">
              Necesitas más créditos?{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600">
                Recarga al instante
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-gray-600 max-w-xl mx-auto">
              Compra bolsas de créditos IA que <strong>no vencen</strong> mientras tengas suscripción activa.
              Se suman a tu plan y se consumen solo cuando los necesitas.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {[
              { size: 'S', credits: '250', price: '$6.990' },
              { size: 'M', credits: '500', price: '$11.990', popular: true },
              { size: 'L', credits: '1.500', price: '$29.990' },
              { size: 'XL', credits: '3.000', price: '$49.990' },
            ].map((pack, i) => (
              <motion.div
                key={pack.size}
                variants={fadeUp}
                custom={i}
                className={`relative p-5 sm:p-6 rounded-2xl flex flex-col items-center text-center ${
                  pack.popular
                    ? 'border-2 border-emerald-400 bg-emerald-50 shadow-[0_8px_32px_rgba(16,185,129,0.10)]'
                    : 'border border-gray-200 bg-white shadow-sm'
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold tracking-wider whitespace-nowrap">
                    MÁS POPULAR
                  </div>
                )}
                <span className={`text-xs font-bold px-3 py-0.5 rounded-full mb-3 ${
                  pack.popular ? 'text-emerald-700 bg-emerald-100' : 'text-gray-600 bg-gray-100'
                }`}>Bolsa {pack.size}</span>
                <p className="text-2xl sm:text-3xl font-black text-gray-900">{pack.credits}</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-1">créditos IA</p>
                <p className={`text-lg font-bold mt-3 ${pack.popular ? 'text-emerald-600' : 'text-gray-900'}`}>{pack.price} <span className="text-xs font-semibold text-gray-400">CLP</span></p>
                <p className="text-[10px] text-gray-400 mt-1">No vencen</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center mt-8 text-sm text-gray-500"
          >
            Los créditos de recarga se consumen después de los créditos de tu plan mensual.
          </motion.p>
        </div>
      </section>

      {/* ════════════ REFERIDOS ════════════ */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="relative overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8 sm:p-12"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              <div className="flex-1 text-center lg:text-left">
                <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 mb-4">
                  <span className="text-lg">🎁</span>
                  <span className="text-xs font-bold text-indigo-700 tracking-wide">PROGRAMA DE REFERIDOS</span>
                </motion.div>

                <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                  Invita amigos,{' '}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    gana créditos IA
                  </span>
                </motion.h2>

                <motion.p variants={fadeUp} custom={2} className="mt-4 text-gray-600 text-sm sm:text-base max-w-lg mx-auto lg:mx-0">
                  Invita a otros emprendedores a tener su propio vendedor IA 24/7. Por cada persona que se registre
                  y active su cuenta, <strong className="text-indigo-700">ambos ganan 150 créditos IA gratis</strong> para automatizar sus ventas.
                </motion.p>

                <motion.div variants={fadeUp} custom={3} className="mt-6 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <button
                    onClick={onLoginClick}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-lg hover:shadow-xl active:scale-95 hover:scale-[1.02] transition-all duration-300"
                  >
                    Obtener mi código gratis
                  </button>
                </motion.div>
              </div>

              <motion.div variants={fadeUp} custom={2} className="flex-shrink-0 w-full lg:w-auto">
                <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xs mx-auto">
                  {[
                    { icon: '📤', title: 'Comparte', desc: 'Tu link único' },
                    { icon: '👤', title: 'Se registran', desc: '+150 créditos' },
                    { icon: '🎉', title: 'Activan', desc: 'Tú ganas +150' },
                  ].map((step) => (
                    <div key={step.title} className="flex flex-col items-center text-center p-3 rounded-xl bg-white/70 border border-white shadow-sm">
                      <span className="text-2xl mb-1">{step.icon}</span>
                      <p className="text-xs font-bold text-gray-900">{step.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{step.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-center text-[11px] text-gray-500 mt-3">
                  Hasta <strong className="text-indigo-600">1.500 créditos/mes</strong> por referidos
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════ TESTIMONIALS ════════════ */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl md:text-5xl font-bold">
              Lo que dicen{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                nuestros clientes
              </span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                custom={i}
                className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed italic mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-bold flex items-center justify-center">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════ FAQ ════════════ */}
      <section id="faq" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 bg-[#F8FAFC] scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl md:text-5xl font-bold">
              Preguntas frecuentes
            </motion.h2>
          </motion.div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex justify-between items-center p-5 text-left"
                >
                  <span className="font-semibold text-gray-900 text-sm sm:text-base pr-4">{faq.q}</span>
                  <motion.span
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0 text-gray-400"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <p className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ CTA FINAL ════════════ */}
      <section className="relative z-10 py-20 sm:py-32 px-4 sm:px-6 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] rounded-full bg-gradient-to-br from-purple-500/[0.05] to-indigo-500/[0.03] blur-[80px] md:blur-[100px] pointer-events-none" />

          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight relative">
            Tu negocio nunca duerme.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Tu IA tampoco.
            </span>
          </h2>
          <p className="mt-4 sm:mt-6 text-gray-600 text-base sm:text-lg px-2">
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
      <footer className="relative z-10 border-t border-slate-800 bg-slate-900 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              MiTiendaVirtual
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 text-[9px] text-gray-500">
              <FaMeta className="text-blue-400" /> Meta Partner
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400">
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

          <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
            © 2026 • Santiago, CL
          </p>
        </div>
      </footer>

      <FloatingWhatsAppButton />

      {/* Legal modals */}
      {legalView === 'terms' && <TermsOfService onClose={() => setLegalView(null)} />}
      {legalView === 'privacy' && <PrivacyPolicy onClose={() => setLegalView(null)} />}
      {legalView === 'data-deletion' && <DataDeletion onClose={() => setLegalView(null)} />}
      {legalView === 'support' && <SupportPage onClose={() => setLegalView(null)} />}
    </div>
  )
}
