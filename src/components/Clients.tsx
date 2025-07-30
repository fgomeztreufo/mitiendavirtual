import React from 'react';
import { siteConfig } from '../config/siteConfig';

const Clients: React.FC = () => {
  // Mock client logos - en producción, reemplazar con logos reales
  const clients = [
    { name: 'TechCorp', logo: 'https://via.placeholder.com/150x80/4F46E5/FFFFFF?text=TechCorp' },
    { name: 'InnovateLab', logo: 'https://via.placeholder.com/150x80/059669/FFFFFF?text=InnovateLab' },
    { name: 'DigitalPlus', logo: 'https://via.placeholder.com/150x80/DC2626/FFFFFF?text=DigitalPlus' },
    { name: 'CloudSync', logo: 'https://via.placeholder.com/150x80/7C3AED/FFFFFF?text=CloudSync' },
    { name: 'DataFlow', logo: 'https://via.placeholder.com/150x80/EA580C/FFFFFF?text=DataFlow' },
    { name: 'SmartSolutions', logo: 'https://via.placeholder.com/150x80/0891B2/FFFFFF?text=SmartSolutions' }
  ];

  if (!siteConfig.features.showClientsSection) {
    return null;
  }

  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Confían en Nosotros
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Empresas líderes en diversos sectores han elegido nuestras soluciones
            para potenciar su presencia digital.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {clients.map((client, index) => (
            <div
              key={index}
              className="flex justify-center items-center opacity-60 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0"
            >
              <img
                src={client.logo}
                alt={`Logo de ${client.name}`}
                className="max-h-12 w-auto"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Clients;