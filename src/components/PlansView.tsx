import Swal from 'sweetalert2'
import { planDisplayToCode, normalizePlanType, isInTrial, trialDaysLeft } from '../utils/planUtils'
import { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import type { IconType } from 'react-icons'
import { FaInstagram, FaTelegram, FaWhatsapp, FaGoogle } from 'react-icons/fa'
import { supabase } from '../supabaseClient'

interface Profile {
    plan_type?: string;
    plan_expires_at?: string;
}

interface PlansViewProps {
    session: Session;
    profile: Profile | null;
}

// Colores de marca para cada canal
const CHANNEL_COLORS: Record<string, string> = {
    instagram: 'text-pink-500',
    telegram: 'text-sky-400',
    whatsapp: 'text-green-400',
    google_calendar: 'text-blue-400',
}

interface PlanChannel {
    id: string;
    Icon: IconType;
    label: string;
    available: boolean;
}

// Canales y features por plan (refleja la lógica de negocio)
const PLAN_CHANNELS: Record<string, PlanChannel[]> = {
    free: [
        { id: 'instagram',       Icon: FaInstagram, label: 'Bot IA en Instagram',       available: true  },
        { id: 'telegram',        Icon: FaTelegram,  label: 'Bot IA en Telegram',         available: false },
        { id: 'whatsapp',        Icon: FaWhatsapp,  label: 'Bot IA en WhatsApp',         available: false },
        { id: 'google_calendar', Icon: FaGoogle,    label: 'Agenda con Google Calendar', available: false },
    ],
    basic: [
        { id: 'instagram',       Icon: FaInstagram, label: 'Bot IA en Instagram',       available: true  },
        { id: 'telegram',        Icon: FaTelegram,  label: 'Bot IA en Telegram',         available: true  },
        { id: 'whatsapp',        Icon: FaWhatsapp,  label: 'Bot IA en WhatsApp',         available: false },
        { id: 'google_calendar', Icon: FaGoogle,    label: 'Agenda con Google Calendar', available: false },
    ],
    pro: [
        { id: 'instagram',       Icon: FaInstagram, label: 'Bot IA en Instagram',       available: true  },
        { id: 'telegram',        Icon: FaTelegram,  label: 'Bot IA en Telegram',         available: true  },
        { id: 'whatsapp',        Icon: FaWhatsapp,  label: 'Bot IA en WhatsApp',         available: true  },
        { id: 'google_calendar', Icon: FaGoogle,    label: 'Agenda con Google Calendar', available: false },
    ],
    full: [
        { id: 'instagram',       Icon: FaInstagram, label: 'Bot IA en Instagram',       available: true  },
        { id: 'telegram',        Icon: FaTelegram,  label: 'Bot IA en Telegram',         available: true  },
        { id: 'whatsapp',        Icon: FaWhatsapp,  label: 'Bot IA en WhatsApp',         available: true  },
        { id: 'google_calendar', Icon: FaGoogle,    label: 'Agenda con Google Calendar', available: true  },
    ],
}

export default function PlansView({ session, profile }: PlansViewProps) {

    const [plans, setPlans] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchPlans()
    }, [])

    async function fetchPlans() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .order('monthly_price_clp', { ascending: true })

            if (error) {
                console.error('fetchPlans error', error)
                return
            }
            setPlans(data || [])
        } finally {
            setLoading(false)
        }
    }

    const handleBuyPlan = async (planName: string, amount: number) => {
        try {
            Swal.fire({
                title: 'Generando Pago...',
                text: 'Conectando con Mercado Pago 🔒',
                didOpen: () => Swal.showLoading()
            });
    
            const { user } = session;
    
            const response = await fetch('https://webhook.mitiendavirtual.cl/webhook/create-payment', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                        plan_name: planName,
                        plan_code: planDisplayToCode(planName),
                        amount: amount,
                        user_id: user.id,
                        email: user.email
                    })
            });
    
            const data = await response.json();
    
            if (data && data.init_point) {
                window.location.href = data.init_point; 
            } else {
                throw new Error('No se recibió el link de pago');
            }
    
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Ups...',
                text: 'Hubo un error al generar el pago. Intenta de nuevo.'
            });
        }
    };

    return (
        <div className="animate-fade-in-up p-4 max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Elige el motor de tu crecimiento 🚀
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-base">
                    Automatiza tus ventas con IA en todos tus canales. Sin contratos amarrados, pagas por mes.
                    Si no renuevas, vuelves al plan inicial sin perder tus datos.
                </p>
            </div>

            {profile && isInTrial(profile) && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-amber-400">Estás probando el plan {(profile as any).trial_plan?.toUpperCase()} gratis</p>
                  <p className="text-xs text-amber-300/70">Te quedan {trialDaysLeft(profile)} días de prueba</p>
                </div>
                <span className="text-2xl">🎁</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-start">
              {loading && <div className="col-span-full text-center text-gray-400">Cargando planes...</div>}
              {!loading && plans.length === 0 && (
                <div className="col-span-full text-center text-gray-400">No hay planes configurados en la base de datos.</div>
              )}

              {!loading && plans.map((plan: any) => {
                const code = plan.code
                const isCurrent = normalizePlanType(profile?.plan_type) === code
                const price = Number(plan.monthly_price_clp || 0)
                const channels = PLAN_CHANNELS[code] || []

                const baseClasses = `rounded-2xl p-6 flex flex-col h-full relative`
                let borderClass = 'border border-gray-800'
                if (code === 'pro') {
                    borderClass = 'border-2 border-purple-500/60 shadow-[0_10px_30px_rgba(124,58,237,0.16)]'
                } else if (code === 'full') {
                    borderClass = 'border-2 border-orange-500/50 shadow-[0_10px_30px_rgba(249,115,22,0.10)]'
                } else if (code === 'basic') {
                    // Borde celeste (light blue) para el plan Básico
                    borderClass = 'border-2 border-sky-400/70 shadow-[0_8px_20px_rgba(56,189,248,0.06)]'
                } else if (code === 'free') {
                    // Borde verde para el plan Semilla
                    borderClass = 'border-2 border-emerald-500/70 shadow-[0_8px_20px_rgba(16,185,129,0.06)]'
                } else if (isCurrent) {
                    borderClass = 'border border-blue-500'
                }
                const bgClass = code === 'pro'
                    ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800'
                    : code === 'full'
                    ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-orange-950/20'
                    : 'bg-gray-900'

                const buttonDefault = 'w-full py-2 text-sm font-bold rounded-xl transition-all'
                const buttonDisabled = 'bg-gray-800 text-gray-500 cursor-not-allowed'
                const buttonPrimary = code === 'pro'
                    ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg'
                    : code === 'full'
                    ? 'border border-orange-500 text-orange-400 bg-transparent hover:bg-orange-500/10'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'

                const label = isCurrent
                    ? 'Tu Plan Actual'
                    : code === 'free'
                    ? 'Plan Base'
                    : code === 'pro'
                    ? 'Potenciar mi Tienda'
                    : code === 'full'
                    ? 'Dominar el Mercado'
                    : ('Elegir ' + plan.display_name)

                const planEmoji = code === 'free' ? '🌱' : code === 'pro' ? '💎' : code === 'full' ? '🔥' : '⚡'

                const mostPopular = 'basic'
                const buttonLabelComputed = isCurrent ? 'Tu Plan Actual' : label
                const isButtonDisabled = isCurrent || (code === 'free')

                return (
                    <div key={code} className={`${bgClass} ${borderClass} ${baseClasses}`}>
                        {code === mostPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">MÁS POPULAR</div>
                        )}

                        {code === 'pro' && (
                            <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-purple-600 text-white text-[10px] font-bold">RECOMENDADO</div>
                        )}

                        <h3 className="text-lg font-bold text-white mb-1">{plan.display_name} {planEmoji}</h3>
                        <div className="text-3xl font-bold text-white mb-1">
                            ${price.toLocaleString('es-CL')}
                            <span className="text-sm text-gray-500 font-normal"> /mes</span>
                        </div>
                        {plan.description && (
                            <p className="text-[11px] text-gray-400 mb-5 italic leading-relaxed">{plan.description}</p>
                        )}

                        {/* Límites */}
                        <ul className="space-y-2 mb-5 pb-5 border-b border-gray-800">
                            <li className="flex items-start gap-2 text-xs text-gray-300">
                                <span className="text-green-500 font-bold mt-0.5">✓</span>
                                <span>{plan.products_limit || 0} productos en catálogo</span>
                            </li>
                            <li className="flex items-start gap-2 text-xs text-gray-300">
                                <span className="text-green-500 font-bold mt-0.5">✓</span>
                                <span>
                                    {plan.messages_limit
                                        ? `${plan.messages_limit.toLocaleString('es-CL')} mensajes IA / mes`
                                        : 'Mensajes IA ilimitados'}
                                    {plan.messages_limit && (
                                        <span className="text-gray-500 text-[10px] ml-1">(todos los canales)</span>
                                    )}
                                </span>
                            </li>
                        </ul>

                        {/* Canales */}
                        <ul className="space-y-2 mb-8 flex-1">
                            {channels.map((ch) => (
                                <li key={ch.id} className={`flex items-center gap-2 text-xs ${ch.available ? 'text-gray-200' : 'text-gray-600'}`}>
                                    <ch.Icon className={`text-base shrink-0 ${ch.available ? CHANNEL_COLORS[ch.id] : 'opacity-30'}`} />
                                    <span className={ch.available ? '' : 'line-through'}>{ch.label}</span>
                                    {ch.available && <span className="ml-auto text-green-500 text-[10px] font-bold">✓</span>}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => { if (!isButtonDisabled) handleBuyPlan(plan.display_name, price) }}
                            className={`${buttonDefault} ${isButtonDisabled ? buttonDisabled : buttonPrimary}`}
                            disabled={isButtonDisabled}
                        >
                            {buttonLabelComputed}
                        </button>
                    </div>
                )
              })}
            </div>

            <footer className="mt-16 text-center space-y-2">
                <p className="text-gray-500 text-[10px] italic">
                    *Los mensajes IA ilimitados están sujetos a política de "uso justo" para garantizar la estabilidad del servicio.<br/>
                    Los mensajes de todos los canales (Instagram, Telegram, WhatsApp) comparten el pool del plan.
                </p>
                <p className="text-gray-400 text-xs">
                    🔒 Pagos procesados de forma segura vía Mercado Pago.
                </p>
            </footer>
        </div>
    )
}