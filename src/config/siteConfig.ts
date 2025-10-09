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
    tagline: "Transformamos tu Negocio con Tiendas Virtuales y automatizaciones de Alto Rendimiento",
    phone: "+56920298729",
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
      name: "Landing Page Informativo + Hosting",
      originalPrice: 43750,
      features: [
        "Landing Page.",
        "Diseño responsivo",
        "Soporte básico por email",
        "Incluye una página única con diseño personalizado, ideal para campañas, servicios o productos específicos.",
        "Hosting incluido por $3.000 mensual durante el primer año, despúes $5.000",
        "Sitio Web Informativo (4 secciones)",
        "Incluye las pestañas: Inicio, Servicios, Nosotros y Contacto.\nIdeal para presentar tu negocio de forma clara y profesional."
      ]
    },
    medium: {
      name: "Landing Page + Botón de WhatsApp + Hosting",
      originalPrice: 87500,
      features: [
        "Todo lo del plan básico",
        "Instalación en tu Servidor",
        "SSL y dominio configurado",
        "Soporte técnico extendido",
        "Incluye Botón de WhatsApp",
        "Hosting incluido por $3.000 mensual durante el primer año, despúes $5.000"
      ]
    },
    advanced: {
      name: "Ecommerce full - Instalación y Configuración Completa",
      originalPrice: 1000000,
      features: [
        "Todo lo del plan anteriores",
        "Configuración completa de servidor",
        "Optimización de rendimiento",
        "Configuración de base de datos",
        "Backup automático",
        "Soporte prioritario 24/7",
        "Capacitación incluida",
        "Carga de informacion de productos",
        "Comunicacion con API de pasarela de pagos (mercado pago, flow, etc)",
        "Comunicacion con API de servicios de envio (Chilexpress, Starken, etc)"
      ]
    },

    // --- NUEVOS PLANES DE AUTOMATIZACIÓN WHATSAPP ---
    automationBasic: {
      name: "Chatbot Conversión Básica",
      originalPrice: 120000,
      monthlyPrice: 25000,
      features: [
        "Respuestas automáticas personalizadas (horarios, precios, dirección, preguntas frecuentes)",
        "Derivación a un número humano fuera de horario",
        "Botón de WhatsApp click-to-chat integrado",
        "Detección de palabras clave básica ('precio', 'horario', 'envío')",
        "Guardado de conversaciones o intenciones de ventas en google sheets",
        "Soporte técnico por 30 días incluido",
        "Pago maximo en 3 cuotas por transferencia bancaria ",
        "3 dias de gracias, para disfrutar tu nuevo chatbot, tu decides seguir"
      ]
    },
    automationMedium: {
      name: "Chatbot Vendedor Automático",
      originalPrice: 200000,
      monthlyPrice: 65000,
      features: [
        "TODO lo del plan Básico:",
        "Automatizacion de redes sociales",
        "Reconocimiento de intenciones (interés en productos, consultas frecuentes)",
        "Envío automático de catálogo o productos destacados",
        "Integración con Google Sheets para registrar leads/ventas",
        "Flujos conversacionales avanzados",
        "Repositorio para editar respuestas (sin código)",
        "Soporte prioritario y 3 ajustes mensuales incluidos",
        "Pago maximo en 3 cuotas por transferencia bancaria ",
        "3 dias de gracias, para disfrutar tu nuevo chatbot, tu decides seguir"
      ]
    },
    automationAdvanced: {
      name: "Automatización Total con IA",
      originalPrice: 1000000,
      monthlyPrice: 80000,
      features: [
        "TODO lo de los planes anteriores:",
        "Inteligencia Artificial (IA) para lenguaje natural",
        "Gestión y agendamiento automático de citas (Google Calendar), en caso que se requiera",
        "Segmentación de clientes (nuevos vs. recurrentes)",
        "Encuestas de satisfacción automatizadas post-venta",
        "Reportes mensuales de desempeño (leads, ventas, métricas)",
        "Soporte 24/7 y 10 ajustes mensuales incluidos",
        "Guardado de conversaciones o intenciones de ventas en base de datos",
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
