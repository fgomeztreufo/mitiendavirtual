import React from 'react';
import { Check, Star } from 'lucide-react';
import { siteConfig } from '../config/siteConfig';

const PricingPlansAutomation: React.FC = () => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const calculateDiscountedPrice = (originalPrice: number) => {
    const discount = siteConfig.features.offerPercentage / 100;
    return Math.round(originalPrice * (1 - discount));
  };

  // Planes de Automatización WhatsApp
  const automationPlans = [
    {
      name: 'Conversión Básica',
      description: 'Ideal para emprendedores que quieren responder preguntas frecuentes automáticamente.',
      originalPrice: 150000,
      monthlyPrice: 25000,
      features: [
        '5 respuestas automáticas personalizadas (ej: horarios, precios, dirección)',
        'Derivación a un número humano fuera de horario',
        'Botón de WhatsApp click-to-chat integrado en tu web',
        'Detección de palabras clave básica (ej: "precio", "horario", "envío")',
        'Panel de control para editar respuestas fácilmente (sin código)',
        'Soporte técnico por 30 días incluido'
      ],
      popular: false,
      color: 'green'
    },
    {
      name: 'Vendedor Automático',
      description: 'Perfecto para tiendas online que quieren recuperar ventas perdidas y guiar compradores.',
      originalPrice: 250000,
      monthlyPrice: 35000,
      features: [
        'TODO lo del plan Básico, PLUS:',
        'Recuperación de carritos abandonados via WhatsApp (¡Convierte un 15% más!)',
        'Envío de catálogo o productos destacados por chat automáticamente',
        'Integración con Google Sheets para registrar leads y ventas',
        'Flujos conversacionales avanzados (ej: "¿Busca ropa de hombre o mujer?")',
        'Soporte prioritario y 3 ajustes mensuales incluidos'
      ],
      popular: true,
      color: 'teal'
    },
    {
      name: 'Automatización Total',
      description: 'Para empresas que buscan un centro de atención al cliente automatizado con IA.',
      originalPrice: 490000,
      monthlyPrice: 80000,
      features: [
        'TODO lo del plan Avanzado, PLUS:',
        'Inteligencia Artificial (IA) para entender preguntas en lenguaje natural',
        'Gestión de citas y agendamiento automático (Google Calendar)',
        'Segmentación de clientes (nuevos vs. recurrentes)',
        'Encuestas de satisfacción automatizadas post-venta',
        'Reportes mensuales de desempeño (leads, ventas, preguntas comunes)',
        'Soporte prioritario 24/7 y 10 ajustes mensuales incluidos'
      ],
      popular: false,
      color: 'cyan'
    }
  ];

  const openWhatsApp = (planName: string) => {
    const message = `Hola! Me interesa el plan de automatización ${planName}. ¿Podrían darme más información?`;
    const phone = siteConfig.company.phone.replace('+', '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Componente para renderizar planes de automatización
  const renderAutomationPlanCard = (plan: any) => (
    <div
      key={plan.name}
      className={`relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 ${
        plan.popular ? 'border-indigo-200 scale-105' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      {/* Offer flag */}
      {siteConfig.features.showOffers && (
        <div className="absolute -top-3 -right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
          -{siteConfig.features.offerPercentage}%
        </div>
      )}

      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
          Más Popular
        </div>
      )}

      <div className="p-8">
        {/* Plan header */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
          <p className="text-gray-600 mb-6">{plan.description}</p>
          
          {/* Pricing */}
          <div className="mb-6">
            {siteConfig.features.showOffers ? (
              <div>
                <div className="text-lg text-gray-500 line-through mb-1">
                  {formatPrice(plan.originalPrice)}
                </div>
                <div className="text-4xl font-bold text-gray-900">
                  {formatPrice(calculateDiscountedPrice(plan.originalPrice))}
                </div>
              </div>
            ) : (
              <div className="text-4xl font-bold text-gray-900">
                {formatPrice(plan.originalPrice)}
              </div>
            )}
            <div className="text-gray-500 mt-1">CLP</div>
            
            {/* Precio mensual */}
            {plan.monthlyPrice && (
              <div className="mt-2">
                <span className="text-sm text-gray-500">+ </span>
                <span className="text-lg font-semibold text-indigo-600">
                  {formatPrice(plan.monthlyPrice)}
                </span>
                <span className="text-sm text-gray-500">/mes</span>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mb-8">
          <ul className="space-y-4">
            {plan.features.map((feature: string, featureIndex: number) => (
              <li key={featureIndex} className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => openWhatsApp(plan.name)}
          className={`w-full py-4 px-6 rounded-lg font-semibold transition-all duration-300 ${
            plan.popular
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-900 hover:shadow-md'
          }`}
        >
          Solicitar Información
        </button>
      </div>
    </div>
  );

  return (
    <section id="automatizacion" className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Automatización WhatsApp 24/7
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tu Sitio Web Trabaja, Tu Chatbot Vende: Conversiones Automáticas
          </p>
          {siteConfig.features.showOffers && (
            <div className="mt-6 inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full">
              <Star className="h-4 w-4 mr-2" />
              <span className="font-medium">¡Oferta especial! {siteConfig.features.offerPercentage}% de descuento</span>
            </div>
          )}
        </div>

        {/* Plans grid - Solo automatización */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {automationPlans.map(plan => renderAutomationPlanCard(plan))}
        </div>

        {/* Texto promocional */}
        <div className="text-center mt-12 p-6 bg-indigo-50 rounded-2xl">
          <h3 className="text-xl font-semibold text-indigo-900 mb-2">
            ¿Ya tienes una web con nosotros?
          </h3>
          <p className="text-indigo-700">
            Agrega automatización por un <strong>40% DE DESCUENTO</strong> en la implementación.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingPlansAutomation;