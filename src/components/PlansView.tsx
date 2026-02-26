import Swal from 'sweetalert2'
import { Session } from '@supabase/supabase-js'

interface Profile {
    plan_type?: string;
    plan_expires_at?: string;
}

interface PlansViewProps {
    session: Session;
    profile: Profile | null;
}

export default function PlansView({ session, profile }: PlansViewProps) {

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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
                
                {/* PLAN FREE */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col h-full opacity-80 hover:opacity-100 transition-opacity">
                    <h3 className="text-lg font-bold text-white mb-2">Semilla 🌱</h3>
                    <div className="text-3xl font-bold text-white mb-4">$0 <span className="text-sm text-gray-500 font-normal">/mes</span></div>
                    <p className="text-[11px] text-gray-500 mb-6 italic">Para dar tus primeros pasos</p>
                    
                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-start gap-2 text-xs text-gray-300">
                            <span className="text-green-500 font-bold">✓</span> 10 Productos en catálogo
                        </li>
                        <li className="flex items-start gap-2 text-xs text-gray-300">
                            <span className="text-green-500 font-bold">✓</span> 50 Mensajes IA / mes
                        </li>
                    </ul>
                    <button disabled className="w-full py-2 bg-gray-800 text-gray-500 text-sm font-bold rounded-xl cursor-not-allowed">
                        {(!profile?.plan_type || profile?.plan_type === 'Free') ? 'Tu Plan Actual' : 'Plan Base'}
                    </button>
                </div>

                {/* PLAN BÁSICO */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col h-full hover:border-blue-500 transition-colors">
                    <h3 className="text-lg font-bold text-blue-400 mb-2">Básico 🚀</h3>
                    <div className="text-3xl font-bold text-white mb-4">$14.990 <span className="text-sm text-gray-500 font-normal">/mes</span></div>
                    <p className="text-[11px] text-blue-300/60 mb-6 italic">Perfecto para emprendedores</p>
                    
                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-start gap-2 text-xs text-white text-left">
                            <span className="text-blue-500 font-bold">✓</span> <strong>50 Productos:</strong> Tu inventario completo.
                        </li>
                        <li className="flex items-start gap-2 text-xs text-white text-left">
                            <span className="text-blue-500 font-bold">✓</span> <strong>500 Mensajes:</strong> Ventas en automático.
                        </li>
                    </ul>
                    <button 
                        onClick={() => handleBuyPlan('Básico', 14990)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-md"
                    >
                        {profile?.plan_type === 'Básico' ? 'Renovar Plan' : 'Elegir Básico'}
                    </button>
                </div>

                {/* PLAN PRO - EL MÁS POPULAR */}
                <div className="bg-gray-900 border-2 border-purple-600 rounded-2xl p-6 flex flex-col relative transform lg:scale-110 z-10 shadow-2xl shadow-purple-900/30 h-full">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg">
                        Más Popular
                    </div>
                    <h3 className="text-xl font-bold text-purple-400 mb-2">Pro 💎</h3>
                    <div className="text-3xl font-bold text-white mb-1">$39.990 <span className="text-sm text-gray-500 font-normal">/mes</span></div>
                    <p className="text-[11px] text-purple-300 mb-6 font-semibold italic">Gestión profesional sin límites</p>
                    
                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-start gap-2 text-xs text-white">
                            <span className="text-purple-500 font-bold">✓</span> 
                            <span><strong>500 Productos:</strong> Catálogo extendido.</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-white">
                            <span className="text-purple-500 font-bold">✓</span> 
                            <span><strong>2.000 Mensajes IA:</strong> Escala tu atención.</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-white">
                            <span className="text-purple-500 font-bold">✓</span> 
                            <span><strong>WhatsApp Soon:</strong> Prioridad en activación.</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-white">
                            <span className="text-purple-500 font-bold">✓</span> 
                            <span><strong>Soporte Directo:</strong> Canal preferente con técnicos.</span>
                        </li>
                    </ul>
                    
                    <button 
                        onClick={() => handleBuyPlan('Pro', 39990)}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/40"
                    >
                        {profile?.plan_type === 'Pro' ? 'Renovar Pro' : 'Potenciar mi Tienda'}
                    </button>
                </div>

                {/* PLAN FULL */}
                <div className="bg-gray-900 border border-orange-900/30 rounded-2xl p-6 flex flex-col h-full">
                    <h3 className="text-lg font-bold text-orange-400 mb-2">Full 🔥</h3>
                    <div className="text-3xl font-bold text-white mb-4">$59.990 <span className="text-sm text-gray-500 font-normal">/mes</span></div>
                    <p className="text-[11px] text-orange-300/60 mb-6 italic">El socio tecnológico de tu marca</p>
                    
                    <ul className="space-y-4 mb-8 flex-1 text-left">
                        <li className="flex items-start gap-2 text-xs text-white">
                            <span className="text-orange-500 font-bold">✓</span> 
                            <span><strong>2.000 Productos:</strong> Capacidad masiva.</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-white">
                            <span className="text-orange-500 font-bold">✓</span> 
                            <span><strong>Mensajes Ilimitados*:</strong> Sin techo de venta.</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-white">
                            <span className="text-orange-500 font-bold">✓</span> 
                            <span><strong>IA Personalizada:</strong> Entrenamos tu propio tono.</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-white">
                            <span className="text-orange-500 font-bold">✓</span> 
                            <span><strong>Soporte VIP:</strong> Atención prioritaria 1-a-1.</span>
                        </li>
                    </ul>
                    
                    <button 
                        onClick={() => handleBuyPlan('Full', 59990)}
                        className="w-full py-2 bg-transparent border border-orange-600 text-orange-400 hover:bg-orange-600 hover:text-white text-sm font-bold rounded-xl transition-all"
                    >
                        {profile?.plan_type === 'Full' ? 'Renovar Full' : 'Dominar el Mercado'}
                    </button>
                </div>

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