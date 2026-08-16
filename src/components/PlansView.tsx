import Swal from 'sweetalert2'
import { planDisplayToCode, effectivePlan, isPlanExpired } from '../utils/planUtils'
import { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import type { IconType } from 'react-icons'
import { FaInstagram, FaTelegram, FaWhatsapp, FaGoogle } from 'react-icons/fa'
import { supabase } from '../supabaseClient'

interface Profile {
    plan_type?: string;
    plan_expires_at?: string;
    bonus_credits?: number;
}

interface PlansViewProps {
    session: Session;
    profile: Profile | null;
}

const CHANNEL_COLORS: Record<string, string> = {
    instagram: 'text-pink-500',
    telegram: 'text-sky-500',
    whatsapp: 'text-green-500',
    google_calendar: 'text-blue-500',
}

interface PlanChannel {
    id: string;
    Icon: IconType;
    label: string;
    available: boolean;
}

const ALL_CHANNELS: PlanChannel[] = [
    { id: 'instagram',       Icon: FaInstagram, label: 'Bot IA en Instagram',       available: true },
    { id: 'telegram',        Icon: FaTelegram,  label: 'Bot IA en Telegram',         available: true },
    { id: 'whatsapp',        Icon: FaWhatsapp,  label: 'Bot IA en WhatsApp',         available: true },
    { id: 'google_calendar', Icon: FaGoogle,    label: 'Agenda con Google Calendar', available: true },
]

interface CreditPack {
    code: string;
    display_name: string;
    credits: number;
    price_clp: number;
}

export default function PlansView({ session, profile }: PlansViewProps) {

    const [plans, setPlans] = useState<any[]>([])
    const [packs, setPacks] = useState<CreditPack[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchPlans()
        fetchPacks()
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

    async function fetchPacks() {
        const { data } = await supabase
            .from('credit_packs')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
        if (data) setPacks(data)
    }

    const handleDowngradeToFree = async () => {
        const result = await Swal.fire({
            title: '¿Cambiar al plan Gratis?',
            text: 'Tu plan actual será reemplazado por el plan gratuito. Perderás los beneficios de tu plan pagado.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#d1d5db',
            confirmButtonText: 'Sí, cambiar a Gratis',
            cancelButtonText: 'Cancelar',
        })
        if (!result.isConfirmed) return

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ plan_type: 'free', plan_expires_at: null })
                .eq('id', session.user.id)

            if (error) throw error

            Swal.fire({
                icon: 'success',
                title: 'Plan actualizado',
                text: 'Ahora estás en el plan Gratis.',
                timer: 2000,
                showConfirmButton: false,
            })
            setTimeout(() => window.location.reload(), 2100)
        } catch (error) {
            console.error(error)
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cambiar el plan. Intenta de nuevo.',
            })
        }
    }

    const handleBuyPlan = async (planName: string, amount: number) => {
        try {
            Swal.fire({
                title: 'Generando Pago...',
                text: 'Conectando con Mercado Pago',
                didOpen: () => Swal.showLoading()
            });

            const { user } = session;

            const response = await fetch(`${import.meta.env.VITE_WEBHOOK_BASE_URL || 'https://webhook.mitiendavirtual.cl'}/webhook/create-payment`, {
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

            if (!response.ok) {
                throw new Error(`Error del servidor (${response.status})`);
            }

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

    const handleBuyCreditPack = async (pack: CreditPack) => {
        try {
            Swal.fire({
                title: 'Generando Pago...',
                text: `Comprando ${pack.display_name} (${pack.credits.toLocaleString('es-CL')} créditos)`,
                didOpen: () => Swal.showLoading()
            });

            const { user } = session;

            const response = await fetch(`${import.meta.env.VITE_WEBHOOK_BASE_URL || 'https://webhook.mitiendavirtual.cl'}/webhook/create-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'credit_pack',
                    pack_code: pack.code,
                    credits: pack.credits,
                    plan_name: pack.display_name,
                    amount: pack.price_clp,
                    user_id: user.id,
                    email: user.email,
                })
            });

            if (!response.ok) throw new Error(`Error del servidor (${response.status})`);

            const data = await response.json();

            if (data?.init_point) {
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

    const bonusCredits = (profile as any)?.bonus_credits ?? 0

    return (
        <div className="animate-fade-in-up p-4 max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    ¿Quieres cambiar tu plan?
                </h1>
                <p className="text-gray-500 max-w-2xl mx-auto text-base">
                    Elige el plan que mejor se adapte a tu negocio. Sin contratos, pagas por mes.
                    Todos los canales abiertos desde el día 1. La diferencia está en los créditos IA.
                </p>
            </div>

            {profile && isPlanExpired(profile) && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-red-600">Tu plan ha expirado</p>
                  <p className="text-xs text-red-500">Elige un plan para seguir usando tus agentes de IA</p>
                </div>
                <span className="text-2xl">⚠️</span>
              </div>
            )}

            {bonusCredits > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-emerald-600">Créditos de recarga disponibles</p>
                  <p className="text-xs text-emerald-600">{bonusCredits.toLocaleString('es-CL')} créditos extra acumulados</p>
                </div>
                <button onClick={() => document.getElementById('bolsas-recarga')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all">
                  Comprar más
                </button>
              </div>
            )}
            {bonusCredits === 0 && profile && !isPlanExpired(profile) && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-amber-600">Sin créditos de recarga</p>
                  <p className="text-xs text-amber-500">Compra una bolsa para tener créditos extra cuando se agoten los de tu plan</p>
                </div>
                <button onClick={() => document.getElementById('bolsas-recarga')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-400 transition-all shrink-0">
                  Ver bolsas
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-start">
              {loading && <div className="col-span-full text-center text-gray-500">Cargando planes...</div>}
              {!loading && plans.length === 0 && (
                <div className="col-span-full text-center text-gray-500">No hay planes configurados en la base de datos.</div>
              )}

              {!loading && plans.filter((p: any) => p.code !== 'expired').map((plan: any) => {
                const code = plan.code
                const activePlan = effectivePlan(profile)
                const isCurrent = activePlan === code
                const price = Number(plan.monthly_price_clp || 0)
                const channels = ALL_CHANNELS

                const baseClasses = `rounded-2xl p-6 flex flex-col h-full relative shadow-sm`
                let borderClass = 'border border-gray-200'
                if (code === 'free') {
                    borderClass = 'border border-gray-200'
                } else if (code === 'emprendedor') {
                    borderClass = 'border-2 border-sky-400 shadow-[0_8px_20px_rgba(56,189,248,0.06)]'
                } else if (code === 'negocio') {
                    borderClass = 'border-2 border-indigo-500 shadow-[0_10px_30px_rgba(99,102,241,0.16)]'
                } else if (code === 'escala') {
                    borderClass = 'border-2 border-orange-500 shadow-[0_10px_30px_rgba(249,115,22,0.10)]'
                } else if (isCurrent) {
                    borderClass = 'border border-blue-500'
                }
                const bgClass = code === 'negocio'
                    ? 'bg-gradient-to-b from-white via-white to-indigo-50'
                    : code === 'escala'
                    ? 'bg-gradient-to-b from-white via-white to-orange-50'
                    : 'bg-white'

                const buttonDefault = 'w-full py-2 text-sm font-bold rounded-xl transition-all'
                const buttonDisabled = 'bg-gray-100 text-gray-400 cursor-not-allowed'
                const buttonPrimary = code === 'negocio'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                    : code === 'escala'
                    ? 'border border-orange-500 text-orange-400 bg-transparent hover:bg-orange-500/10'
                    : code === 'emprendedor'
                    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'

                const isCurrentFree = isCurrent && price === 0
                const isCurrentPaid = isCurrent && price > 0

                const label = isCurrentFree
                    ? 'Plan Actual'
                    : isCurrentPaid
                    ? '🔄 Renovar Plan'
                    : price === 0
                    ? 'Comenzar Gratis'
                    : ('Elegir ' + plan.display_name)

                const planEmoji = code === 'free' ? '🌱' : code === 'emprendedor' ? '⚡' : code === 'negocio' ? '💼' : '🔥'

                const mostPopular = 'negocio'
                const isButtonDisabled = isCurrentFree

                return (
                    <div key={code} className={`${bgClass} ${borderClass} ${baseClasses}`}>
                        {code === mostPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">MÁS POPULAR</div>
                        )}

                        <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.display_name} {planEmoji}</h3>
                        <div className="text-3xl font-bold text-gray-900 mb-1">
                            ${price.toLocaleString('es-CL')}
                            <span className="text-sm text-gray-400 font-normal"> /mes</span>
                        </div>
                        {plan.description && (
                            <p className="text-[11px] text-gray-500 mb-5 italic leading-relaxed">{plan.description}</p>
                        )}

                        {/* Límites */}
                        <ul className="space-y-2 mb-5 pb-5 border-b border-gray-200">
                            <li className="flex items-start gap-2 text-xs text-gray-400">
                                <span className="text-green-500 font-bold mt-0.5">✓</span>
                                <span>{plan.products_limit || 0} productos en catálogo</span>
                            </li>
                            <li className="flex items-start gap-2 text-xs text-gray-400">
                                <span className="text-green-500 font-bold mt-0.5">✓</span>
                                <span>
                                    {plan.messages_limit
                                        ? `${plan.messages_limit.toLocaleString('es-CL')} créditos IA / mes`
                                        : 'Créditos IA incluidos'}
                                    {plan.messages_limit && (
                                        <span className="text-gray-500 text-[10px] ml-1">(todos los canales)</span>
                                    )}
                                </span>
                            </li>
                            <li className={`flex items-start gap-2 text-xs ${plan.branches_limit === 0 ? 'text-gray-400' : 'text-gray-400'}`}>
                                <span className={`font-bold mt-0.5 ${plan.branches_limit === 0 ? 'text-gray-400' : 'text-green-500'}`}>
                                    {plan.branches_limit === 0 ? '✗' : '✓'}
                                </span>
                                <span>
                                    {plan.branches_limit == null
                                        ? 'Sucursales ilimitadas'
                                        : plan.branches_limit === 0
                                        ? 'Sin sucursales'
                                        : `${plan.branches_limit} sucursales`}
                                </span>
                            </li>
                        </ul>

                        {/* Canales */}
                        <ul className="space-y-2 mb-8 flex-1">
                            {channels.map((ch) => (
                                <li key={ch.id} className={`flex items-center gap-2 text-xs ${ch.available ? 'text-gray-400' : 'text-gray-400'}`}>
                                    <ch.Icon className={`text-base shrink-0 ${ch.available ? CHANNEL_COLORS[ch.id] : 'opacity-30'}`} />
                                    <span className={ch.available ? '' : 'line-through'}>{ch.label}</span>
                                    {ch.available && <span className="ml-auto text-green-500 text-[10px] font-bold">✓</span>}
                                </li>
                            ))}
                        </ul>

                        {isCurrent && profile?.plan_expires_at && (
                            <p className="text-[10px] text-gray-400 mb-2 text-center">
                                Vence el {new Date(profile.plan_expires_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        )}
                        <button
                            onClick={() => {
                                if (isButtonDisabled) return
                                if (code === 'free' && !isCurrent) {
                                    handleDowngradeToFree()
                                } else {
                                    handleBuyPlan(plan.display_name, price)
                                }
                            }}
                            className={`${buttonDefault} ${isButtonDisabled ? buttonDisabled : isCurrentPaid ? 'border-2 border-emerald-500 text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : buttonPrimary}`}
                            disabled={isButtonDisabled}
                        >
                            {label}
                        </button>
                    </div>
                )
              })}
            </div>

            {/* BOLSAS DE RECARGA */}
            {packs.length > 0 && (
              <div id="bolsas-recarga" className="mt-16">
                <div className="text-center mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Bolsas de Recarga</h2>
                  <p className="text-gray-500 text-sm">Créditos extra que no vencen mientras tengas suscripción activa</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {packs.map((pack) => {
                    const sizeLabel = pack.code === 'pack_s' ? 'S' : pack.code === 'pack_m' ? 'M' : pack.code === 'pack_l' ? 'L' : pack.code === 'pack_xl' ? 'XL' : '';
                    const isPopular = pack.code === 'pack_m';
                    return (
                    <div key={pack.code} className={`rounded-2xl border ${isPopular ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-gray-200'} bg-white shadow-sm p-5 flex flex-col items-center text-center space-y-3 hover:border-emerald-400 transition-all relative`}>
                      {isPopular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-black bg-emerald-400 px-3 py-0.5 rounded-full whitespace-nowrap">Más popular</span>}
                      {sizeLabel && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full">Bolsa {sizeLabel}</span>}
                      <p className="text-2xl font-black text-gray-900">{pack.credits.toLocaleString('es-CL')}</p>
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider">créditos IA</p>
                      <p className="text-lg font-bold text-emerald-600">${pack.price_clp.toLocaleString('es-CL')}</p>
                      <button
                        onClick={() => handleBuyCreditPack(pack)}
                        className="w-full py-2 text-xs font-bold rounded-xl border border-emerald-300 text-emerald-600 hover:bg-emerald-50 transition-all"
                      >
                        Comprar
                      </button>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            <footer className="mt-16 text-center space-y-2">
                <p className="text-gray-500 text-[10px] italic">
                    *Los créditos IA de tu plan se renuevan cada mes.<br/>
                    Los créditos de todos los canales (Instagram, Telegram, WhatsApp) comparten el pool del plan.
                    Los créditos de bolsas de recarga se consumen después de los créditos del plan y no vencen mientras tengas suscripción activa.
                </p>
                <p className="text-gray-500 text-xs">
                    Pagos procesados de forma segura vía Mercado Pago.
                </p>
            </footer>
        </div>
    )
}
