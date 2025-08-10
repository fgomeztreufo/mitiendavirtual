import React from 'react';
import { ArrowRight, Zap, Shield, Rocket } from 'lucide-react';
import { siteConfig } from '../config/siteConfig';

const Hero: React.FC = () => {
  const scrollToPlans = () => {
    const element = document.getElementById('planes');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section 
    className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
    style={{
      backgroundImage: "url('/images/digby-cheung-7ZSMjPwpr5k-unsplash.jpg')",
    }}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-black/60"></div>
      {/**
          style={{ backgroundImage: "url('/images/ecommerce-hero-bg.png')" , backgroundSize: '100%' }}
          */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="relative text-center text-white px-4 sm:px-6 lg:px-8">
              {/* Main heading */}
              <div className="relative text-center text-white px-4 sm:px-6 lg:px-8">
              <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6">
                  {siteConfig.company.tagline}
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-lg md:text-2xl font-sans mb-8 max-w-3xl mx-auto">
              Soluciones de e-commerce a medida, potentes y diseñadas para vender.
            </p>

            {/* Feature highlights */}
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              {[
                { icon: Zap, text: 'Alto Rendimiento' },
                { icon: Shield, text: 'Seguro y Confiable' },
                { icon: Rocket, text: 'Fácil de Usar' }
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                  <feature.icon className="h-5 w-5 text-blue-600" />
                  <span className="text-gray-700 font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={scrollToPlans}
              className="bg-customGold text-black font-semibold py-3 px-8 rounded-lg text-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 shadow-lg">
              Ver Planes
              <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
      </div>
    </section>
  );
};

export default Hero;
