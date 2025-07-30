import React from 'react';

const Technologies: React.FC = () => {
  const technologies = [
    {
      name: 'JavaScript',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
      description: 'Lenguaje principal para desarrollo web moderno'
    },
    {
      name: 'Nginx',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nginx/nginx-original.svg',
      description: 'Servidor web de alto rendimiento'
    },
    {
      name: 'PM2',
      logo: 'https://pm2.keymetrics.io/assets/pm2-logo-1.png',
      description: 'Gestor de procesos para aplicaciones Node.js'
    },
    {
      name: 'NestJS',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nestjs/nestjs-plain.svg',
      description: 'Framework escalable para aplicaciones Node.js'
    },
    {
      name: 'PostgreSQL',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
      description: 'Base de datos relacional avanzada'
    }
  ];

  return (
    <section className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tecnologías que Impulsan Nuestras Soluciones
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Utilizamos las mejores tecnologías del mercado para garantizar rendimiento,
            escalabilidad y seguridad en cada proyecto.
          </p>
        </div>

        {/* Technologies grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {technologies.map((tech, index) => (
            <div
              key={index}
              className="group text-center hover:transform hover:scale-105 transition-all duration-300"
            >
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl group-hover:bg-white/20 transition-all duration-300">
                <img
                  src={tech.logo}
                  alt={tech.name}
                  className="h-12 w-12 mx-auto mb-4 filter group-hover:brightness-110 transition-all duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const div = document.createElement('div');
                      div.className = 'h-12 w-12 mx-auto mb-4 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl';
                      div.textContent = tech.name.charAt(0);
                      parent.insertBefore(div, target);
                    }
                  }}
                />
                <h3 className="text-lg font-semibold text-white mb-2">{tech.name}</h3>
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                  {tech.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Technologies;