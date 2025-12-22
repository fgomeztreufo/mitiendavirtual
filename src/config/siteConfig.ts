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
      name: "Landing Page Informativo + Hosting",
      originalPrice: 43750,
      features: [
        "Landing Page.",
        "Diseño responsivo",
        "Soporte básico por email",
        "Incluye una página única con diseño personalizado, ideal para campañas, servicios o productos específicos.",
        "Hosting incluido por $3.000 mensual durante los primeros 3 meses,despúes $5.000",
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
        "Hosting incluido por $3.000 mensual durante los primeros 6 meses, despúes $5.000"
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

    // --- PLANES DE AUTOMATIZACIÓN ACTUALIZADOS ---
    automationBasic: {
      name: "Starter",
      // Si no hay precio único, dejamos originalPrice igual al valor mensual para consistencia
      originalPrice: 50000,
      monthlyPrice: 50000,
      features: [
        "Hasta 500 contactos",
        "Respuestas automáticas a comentarios y mensajes directos."
      ]
    },
    automationMedium: {
      name: "Crecimiento",
      originalPrice: 85000,
      monthlyPrice: 85000,
      features: [
        "Hasta 2.500 contactos",
        "Todo lo del plan Starter",
        "Menú interactivo",
        "Captura de Leads (WhatsApp)"
      ]
    },
    automationAdvanced: {
      name: "Escala",
      originalPrice: 150000,
      monthlyPrice: 150000,
      features: [
        "Hasta 5.000 contactos",
        "Todo lo del plan Crecimiento",
        "Integración con bases de datos",
        "Soporte prioritario"
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