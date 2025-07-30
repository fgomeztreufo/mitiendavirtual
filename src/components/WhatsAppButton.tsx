import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { siteConfig } from '../config/siteConfig';

const WhatsAppButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      // Show tooltip after 3 seconds for first-time users
      setTimeout(() => setShowTooltip(true), 3000);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const openWhatsApp = () => {
    const phone = siteConfig.company.phone.replace('+', '');
    const message = encodeURIComponent(siteConfig.company.whatsappMessage);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setShowTooltip(false);
  };

  const hideTooltip = () => {
    setShowTooltip(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-16 right-0 bg-white p-4 rounded-lg shadow-xl border border-gray-200 w-64 mb-2 animate-pulse">
          <button
            onClick={hideTooltip}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start space-x-3">
            <div className="bg-green-100 p-2 rounded-full">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">
                ¡Hola! 👋
              </p>
              <p className="text-sm text-gray-600">
                ¿Necesitas ayuda con tu proyecto? Escríbenos por WhatsApp
              </p>
            </div>
          </div>
          <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-b border-r border-gray-200 transform rotate-45"></div>
        </div>
      )}

      {/* WhatsApp Button */}
      <button
        onClick={openWhatsApp}
        className="group bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="h-6 w-6 group-hover:animate-bounce" />
        
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20"></div>
      </button>
    </div>
  );
};

export default WhatsAppButton;