import Swal from 'sweetalert2'
import { Session } from '@supabase/supabase-js'

// Definimos el tipo Profile aquí para que TypeScript no se queje
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
    
            // Ajusta esta URL si tu webhook es distinto
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
      }

    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">Elige tu potencia 🚀</h1>
                <p className="text-gray-400 max-w-2xl mx-auto">
                    Sin contratos amarrados. Pagas por mes. Si no renuevas, vuelves al plan gratis.
                    Todos los medios de pago aceptados.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* PLAN GRATIS */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col relative">
                    <h3 className="text-xl font-bold text-white mb-2">Semilla 🌱</h3>
                    <div className="text-4xl font-bold text-white mb-4">$0 <span className="text-lg text-gray-500 font-normal">/mes</span></div>
                    <p className="text-gray-400 text-sm mb-6">Perfecto para probar la magia de la IA.</p>
                    
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-green-500">✓</span> 50 Mensajes / mes</li>
                        <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-green-500">✓</span> IA Básica</li>
                        <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-green-500">✓</span> Marca de agua</li>
                    </ul>

                    <button disabled className="w-full py-3 bg-gray-800 text-gray-400 font-bold rounded-xl cursor-not-allowed">
                        {profile?.plan_type === 'Free' || !profile?.plan_type ? 'Tu Plan Actual' : 'Plan Básico'}
                    </button>
                </div>

                {/* PLAN EMPRENDEDOR */}
                <div className="bg-gray-900 border-2 border-blue-600 rounded-2xl p-8 flex flex-col relative transform hover:scale-105 transition-transform shadow-2xl shadow-blue-900/20">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                        Más Popular
                    </div>
                    <h3 className="text-xl font-bold text-blue-400 mb-2">Emprendedor 🚀</h3>
                    <div className="text-4xl font-bold text-white mb-4">$19.990 <span className="text-lg text-gray-500 font-normal">/mes</span></div>
                    <p className="text-gray-400 text-sm mb-6">Para negocios que venden todos los días.</p>
                    
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-white"><span className="text-blue-500">✓</span> <strong>1.000 Mensajes</strong> / mes</li>
                        <li className="flex items-center gap-2 text-sm text-white"><span className="text-blue-500">✓</span> IA Rápida (GPT-4o Mini)</li>
                        <li className="flex items-center gap-2 text-sm text-white"><span className="text-blue-500">✓</span> Sin marca de agua</li>
                        <li className="flex items-center gap-2 text-sm text-white"><span className="text-blue-500">✓</span> Soporte Prioritario</li>
                    </ul>

                    <button 
                        onClick={() => handleBuyPlan('Emprendedor', 19990)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/50"
                    >
                        {profile?.plan_type === 'Emprendedor' ? 'Renovar Plan' : 'Comprar 1 Mes'}
                    </button>
                </div>

                {/* PLAN EMPRESARIO */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col relative">
                    <h3 className="text-xl font-bold text-purple-400 mb-2">Empresario 💎</h3>
                    <div className="text-4xl font-bold text-white mb-4">$49.990 <span className="text-lg text-gray-500 font-normal">/mes</span></div>
                    <p className="text-gray-400 text-sm mb-6">Para líderes de mercado con alto tráfico.</p>
                    
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-purple-500">✓</span> <strong>5.000 Mensajes</strong> / mes</li>
                        <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-purple-500">✓</span> IA Ultra Rápida</li>
                        <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-purple-500">✓</span> Prioridad Total</li>
                    </ul>

                    <button 
                        onClick={() => handleBuyPlan('Empresario', 49990)}
                        className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all border border-gray-700 hover:border-white"
                    >
                         {profile?.plan_type === 'Empresario' ? 'Renovar Plan' : 'Comprar 1 Mes'}
                    </button>
                </div>

            </div>
        </div>
    )
}