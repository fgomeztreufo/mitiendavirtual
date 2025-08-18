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
  };
  analytics: {
    googleAnalyticsId: string;
  };
  video:{
    isVisible: boolean;
  }
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
    offerPercentage: 20
  },
  plans: {
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
    }
  },
  analytics: {
    googleAnalyticsId: "G-XQ2HLS2SEQ" // Reemplazar con tu ID de Google Analytics
  },
  video:{
    isVisible: false
  }
};
