export interface SiteConfig {
  company: {
    name: string;
    tagline: string;
    phone: string;
    whatsappMessage: string;
  };
  features: {
    showOffers: boolean;
    showClientsSection: boolean;
    offerPercentage: number;
    offerPercentageAuto: number;
  };
  plans: {
    basic: {
      name: string;
      originalPrice: number;
      features: string[];
    };
    medium: {
      name: string;
      originalPrice: number;
      features: string[];
    };
    advanced: {
      name: string;
      originalPrice: number;
      features: string[];
    };
    // --- NUEVA SECCIÓN: Planes de Automatización ---
    automationBasic: {
      name: string;
      originalPrice: number;
      monthlyPrice: number;
      features: string[];
    };
    automationMedium: {
      name: string;
      originalPrice: number;
      monthlyPrice: number;
      features: string[];
    };
    automationAdvanced: {
      name: string;
      originalPrice: number;
      monthlyPrice: number;
      features: string[];
    };
  };
  analytics: {
    googleAnalyticsId: string;
  };
  video:{
    isVisible: boolean;
  };
  testimonials: {
    isVisible: boolean,
  };
}

export const siteConfig: SiteConfig = {
  company: {
    name: "Mi Tienda Virtual",
    tagline: "Transformamos tu Negocio con Tiendas Virtuales de Alto Rendimiento",
    phone: "+56954080571",
    whatsappMessage: "Hola! Me interesa conocer más sobre sus servicios de e-commerce"
  },
  features: {
    showOffers: true,
    showClientsSection: false,
    offerPercentage: 20,
    offerPercentageAuto: 40

  },
  plans: {
    // --- TUS PLANES ORIGINALES DE WEB (SIN MODIFICACIONES) ---
    basic: {
      name: "Landing Page + Código Fuente Completo",
      originalPrice: 43750,
      features: [
        "Landing Page.",
        "Diseño responsivo",
        "Soporte básico por email",
        "Incluye Botón de WhatsApp",
        "Incluye una página única con diseño personalizado, ideal para campañas, servicios o productos específicos.",
        "Hosting anual +27.000 anual"
      ]
    },
    medium: {
      name: "Sitio Web Informativo (4 secciones) + Instalación Básica",
      originalPrice: 87500,
      features: [
        "Todo lo del plan básico",
        "Instalación en tu Servidor",
        "SSL y dominio configurado",
        "Soporte técnico extendido",
        "Sitio Web Informativo (4 secciones)",
        "Incluye las pestañas: Inicio, Servicios, Nosotros y Contacto.\nIdeal para presentar tu negocio de forma clara y profesional."
      ]
    },
    advanced: {
      name: "Ecommerce full - Instalación y Configuración Completa",
      originalPrice: 900000,
      features: [
        "Todo lo del plan medio",
        "Configuración completa de servidor",
        "Optimización de rendimiento",
        "Configuración de base de datos",
        "Backup automático",
        "Soporte prioritario 24/7",
        "Capacitación incluida"
      ]
    },

    // --- NUEVOS PLANES DE AUTOMATIZACIÓN WHATSAPP ---
    automationBasic: {
      name: "Chatbot Conversión Básica",
      originalPrice: 120000,
      monthlyPrice: 25000,
      features: [
        "5 respuestas automáticas personalizadas (horarios, precios, dirección)",
        "Derivación a un número humano fuera de horario",
        "Botón de WhatsApp click-to-chat integrado",
        "Detección de palabras clave básica ('precio', 'horario', 'envío')",
        "Panel de control para editar respuestas (sin código)",
        "Soporte técnico por 30 días incluido"
      ]
    },
    automationMedium: {
      name: "Chatbot Vendedor Automático",
      originalPrice: 200000,
      monthlyPrice: 65000,
      features: [
        "TODO lo del plan Básico, PLUS:",
        "Recuperación de carritos abandonados via WhatsApp (+15% conversión)",
        "Envío automático de catálogo o productos destacados",
        "Integración con Google Sheets para registrar leads/ventas",
        "Flujos conversacionales avanzados",
        "Soporte prioritario y 3 ajustes mensuales incluidos"
      ]
    },
    automationAdvanced: {
      name: "Automatización Total con IA",
      originalPrice: 750000,
      monthlyPrice: 80000,
      features: [
        "TODO lo del plan Avanzado, PLUS:",
        "Inteligencia Artificial (IA) para lenguaje natural",
        "Gestión y agendamiento automático de citas (Google Calendar)",
        "Segmentación de clientes (nuevos vs. recurrentes)",
        "Encuestas de satisfacción automatizadas post-venta",
        "Reportes mensuales de desempeño (leads, ventas, métricas)",
        "Soporte 24/7 y 10 ajustes mensuales incluidos"
      ]
    }
  },
  analytics: {
    googleAnalyticsId: "G-XQ2HLS2SEQ" // Reemplazar con tu ID de Google Analytics
  },
  video:{
    isVisible: false
  },
  testimonials: {
    isVisible: false
  }
};