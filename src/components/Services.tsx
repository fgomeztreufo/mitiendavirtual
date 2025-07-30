import React from 'react';
import { ShoppingBag, Smartphone, Palette, BarChart3, Settings, Headphones } from 'lucide-react';

const Services: React.FC = () => {
  const services = [
    {
      icon: ShoppingBag,
      title: 'E-commerce Completo',
      description: 'Carritos de compra versátiles y adaptables a las necesidades específicas de tu negocio.'
    },
    {
      icon: Smartphone,
      title: 'Diseño Responsivo',
      description: 'Tiendas que se ven perfectas en cualquier dispositivo, desde móviles hasta escritorio.'
    },
    {
      icon: Palette,
      title: 'Personalización Total',
      description: 'Diseños únicos que reflejan la identidad de tu marca y conectan con tus clientes.'
    },
    {
      icon: BarChart3,
      title: 'Analytics Avanzados',
      description: 'Métricas detalladas para optimizar tus ventas y entender mejor a tus clientes.'
    },
    {
      icon: Settings,
      title: 'Fácil Administración',
      description: 'Panel de control intuitivo para gestionar productos, pedidos y contenido sin complicaciones.'
    },
    {
      icon: Headphones,
      title: 'Soporte Especializado',
      description: 'Acompañamiento técnico continuo para que tu tienda funcione siempre al 100%.'
    }
  ];

  return (
    <section id="servicios" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Servicios que Potencian tu Negocio
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ofrecemos carritos de compra versátiles y adaptables, diseñados para crecer junto con tu negocio
            y maximizar tus conversiones.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="group bg-gray-50 hover:bg-white p-8 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-transparent hover:border-blue-100"
            >
              <div className="bg-blue-100 group-hover:bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-6 transition-colors duration-300">
                <service.icon className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{service.title}</h3>
              <p className="text-gray-600 leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;