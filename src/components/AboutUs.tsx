import React from 'react';
import { Award, Users, Clock, Target } from 'lucide-react';

const AboutUs: React.FC = () => {
  const achievements = [
    {
      icon: Award,
      number: '15+',
      label: 'Años de Experiencia'
    },
    {
      icon: Users,
      number: '100+',
      label: 'Proyectos Completados'
    },
    {
      icon: Clock,
      number: '24/7',
      label: 'Soporte Disponible'
    },
    {
      icon: Target,
      number: '98%',
      label: 'Satisfacción del Cliente'
    }
  ];

  return (
    <section id="nosotros" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Image and stats */}
          <div className="space-y-8">
            {/* CEO Image */}
            <div className="relative">
              <div className="w-80 h-80 mx-auto lg:mx-0 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-xl">
                <div className="text-6xl font-bold text-blue-600">CEO</div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-blue-600 text-white p-4 rounded-xl shadow-lg">
                <Award className="h-8 w-8" />
              </div>
            </div>

            {/* Achievement stats */}
            <div className="grid grid-cols-2 gap-6">
              {achievements.map((achievement, index) => (
                <div key={index} className="text-center lg:text-left">
                  <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto lg:mx-0">
                    <achievement.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{achievement.number}</div>
                  <div className="text-gray-600">{achievement.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Content */}
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Liderazgo y Experiencia a tu Servicio
              </h2>
              <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-6"></div>
            </div>

            <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
              <p>
                Con más de <strong>15 años de experiencia</strong> en arquitectura de software y liderazgo 
                de proyectos tecnológicos, nuestro equipo ha desarrollado soluciones de e-commerce 
                que han transformado negocios de todos los tamaños.
              </p>
              
              <p>
                Nos especializamos en crear <strong>tiendas virtuales robustas y escalables</strong> que 
                no solo cumplen con los estándares actuales del mercado, sino que están preparadas 
                para el futuro digital de tu empresa.
              </p>
              
              <p>
                Nuestro enfoque se basa en la <strong>innovación constante</strong>, la atención al detalle 
                y un compromiso inquebrantable con la satisfacción del cliente. Cada proyecto es una 
                oportunidad de crear algo excepcional.
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl">
              <blockquote className="text-blue-900 italic text-lg">
                "La tecnología debe servir al negocio, no complicarlo. Por eso creamos soluciones 
                intuitivas, potentes y que realmente generen resultados."
              </blockquote>
              <div className="mt-4 text-blue-700 font-semibold">- Fundador y CEO</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;