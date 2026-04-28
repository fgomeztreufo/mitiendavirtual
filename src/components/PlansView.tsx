import Swal from 'sweetalert2'
import { planDisplayToCode, normalizePlanType } from '../utils/planUtils'
import { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

interface Profile {
    plan_type?: string;
    plan_expires_at?: string;
}

interface PlansViewProps {
    session: Session;
    profile: Profile | null;
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
                <h1 className="text-3xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Elige el motor de tu crecimiento 🚀
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-base">
                    Automatiza tus ventas con IA. Sin contratos amarrados, pagas por mes. 
                    Si no renuevas, vuelves al plan inicial sin perder tus datos.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-start">
              {loading && <div className="col-span-full text-center text-gray-400">Cargando planes...</div>}
              {!loading && plans.length === 0 && (
                <div className="col-span-full text-center text-gray-400">No hay planes configurados en la base de datos.</div>
              )}

                            {!loading && plans.map((plan: any) => {
                                const code = plan.code
                                const isCurrent = normalizePlanType(profile?.plan_type) === code
                                const price = Number(plan.monthly_price_clp || 0)

                                const baseClasses = `rounded-2xl p-6 flex flex-col h-full relative`
                                const borderClass = code === 'pro' ? 'border-2 border-purple-500/60 shadow-[0_10px_30px_rgba(124,58,237,0.16)]' : code === 'full' ? 'border-orange-500' : isCurrent ? 'border-blue-500' : 'border-gray-800'
                                const bgClass = code === 'pro' ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800' : 'bg-gray-900'

                                const buttonDefault = 'w-full py-2 text-sm font-bold rounded-xl transition-all'
                                const buttonDisabled = 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                const buttonPrimary = code === 'pro' ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg' : code === 'full' ? 'border border-orange-500 text-orange-500 bg-transparent hover:bg-orange-50' : 'bg-blue-600 hover:bg-blue-500 text-white'

                                const label = isCurrent ? 'Tu Plan Actual' : (code === 'free' ? 'Plan Base' : code === 'pro' ? 'Potenciar mi Tienda' : code === 'full' ? 'Dominar el Mercado' : ('Elegir ' + plan.display_name))

                                return (
                                    <div key={code} className={`${bgClass} ${borderClass} ${baseClasses}`}> 
                                        {code === 'pro' && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-purple-500 text-white text-xs font-bold">MÁS POPULAR</div>
                                        )}
                                        <h3 className="text-lg font-bold text-white mb-2">{plan.display_name} {code === 'free' ? '🌱' : code === 'pro' ? '💎' : code === 'full' ? '🔥' : ''}</h3>
                                        <div className="text-3xl font-bold text-white mb-4">${price.toLocaleString('es-CL')} <span className="text-sm text-gray-500 font-normal">/mes</span></div>
                                        {plan.description && <p className="text-[11px] text-gray-400 mb-6 italic">{plan.description}</p>}

                                        <ul className="space-y-4 mb-8 flex-1">
                                            <li className="flex items-start gap-2 text-xs text-gray-300">
                                                <span className="text-green-500 font-bold">✓</span> {plan.products_limit || 0} Productos en catálogo
                                            </li>
                                            <li className="flex items-start gap-2 text-xs text-gray-300">
                                                <span className="text-green-500 font-bold">✓</span> {plan.messages_limit ? `${plan.messages_limit} Mensajes IA / mes` : 'Mensajes Ilimitados'}
                                            </li>
                                        </ul>

                                        <button
                                            onClick={() => handleBuyPlan(plan.display_name, price)}
                                            className={`${buttonDefault} ${isCurrent ? buttonDisabled : buttonPrimary}`}
                                            disabled={isCurrent}
                                        >
                                            {label}
                                        </button>
                                    </div>
                                )
                            })}

            </div>
            
            <footer className="mt-16 text-center space-y-2">
                <p className="text-gray-500 text-[10px] italic">
                    *El plan Full incluye mensajes ilimitados bajo política de "uso justo" para garantizar la estabilidad del servicio.
                </p>
                <p className="text-gray-400 text-xs">
                    🔒 Pagos procesados de forma segura vía Mercado Pago.
                </p>
            </footer>
        </div>
    )
}