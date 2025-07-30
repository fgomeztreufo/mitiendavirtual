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
}

export const siteConfig: SiteConfig = {
  company: {
    name: "Mi Tienda Virtual",
    tagline: "Transformamos tu Negocio con Tiendas Virtuales de Alto Rendimiento",
    phone: "+56912345678",
    whatsappMessage: "Hola! Me interesa conocer más sobre sus servicios de e-commerce"
  },
  features: {
    showOffers: true,
    showClientsSection: false,
    offerPercentage: 20
  },
  plans: {
    basic: {
      name: "Código Fuente Completo",
      originalPrice: 350000,
      features: [
        "Código fuente completo del carrito",
        "Documentación técnica",
        "Panel de administración",
        "Diseño responsivo",
        "Soporte básico por email"
      ]
    },
    medium: {
      name: "Código + Instalación Básica en VPS",
      originalPrice: 700000,
      features: [
        "Todo lo del plan básico",
        "Instalación en tu VPS",
        "Configuración de base de datos",
        "SSL y dominio configurado",
        "Soporte técnico extendido"
      ]
    },
    advanced: {
      name: "Instalación y Configuración Completa (Llave en Mano)",
      originalPrice: 900000,
      features: [
        "Todo lo del plan medio",
        "Configuración completa de servidor",
        "Optimización de rendimiento",
        "Backup automático",
        "Soporte prioritario 24/7",
        "Capacitación incluida"
      ]
    }
  },
  analytics: {
    googleAnalyticsId: "G-XXXXXXXXXX" // Reemplazar con tu ID de Google Analytics
  }
};