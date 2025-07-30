import React from 'react';
import { Check, Star } from 'lucide-react';
import { siteConfig } from '../config/siteConfig';

const PricingPlans: React.FC = () => {
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

  const plans = [
    {
      name: 'Básico',
      ...siteConfig.plans.basic,
      popular: false,
      color: 'blue'
    },
    {
      name: 'Medio',
      ...siteConfig.plans.medium,
      popular: true,
      color: 'indigo'
    },
    {
      name: 'Avanzado',
      ...siteConfig.plans.advanced,
      popular: false,
      color: 'purple'
    }
  ];

  const openWhatsApp = (planName: string) => {
    const message = `Hola! Me interesa el plan ${planName}. ¿Podrían darme más información?`;
    const phone = siteConfig.company.phone.replace('+', '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <section id="planes" className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Planes Diseñados para tu Éxito
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Elige el plan que mejor se adapte a las necesidades de tu negocio.
            Todos incluyen código fuente y soporte especializado.
          </p>
          {siteConfig.features.showOffers && (
            <div className="mt-6 inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full">
              <Star className="h-4 w-4 mr-2" />
              <span className="font-medium">¡Oferta especial! {siteConfig.features.offerPercentage}% de descuento</span>
            </div>
          )}
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
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
                  <p className="text-gray-600 mb-6">{plan.name}</p>
                  
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
                  </div>
                </div>

                {/* Features */}
                <div className="mb-8">
                  <ul className="space-y-4">
                    {plan.features.map((feature, featureIndex) => (
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingPlans;