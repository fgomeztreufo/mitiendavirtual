# Mi Tienda Virtual - Landing Page

Una landing page profesional y moderna para servicios de e-commerce, desarrollada con React, TypeScript y Tailwind CSS.

## 🚀 Características

- **Diseño Responsivo**: Optimizada para todos los dispositivos
- **Testimonios Dinámicos**: Integración con Firestore para reseñas de clientes
- **Configuración Centralizada**: Fácil personalización mediante archivo de configuración
- **Botón WhatsApp Flotante**: Contacto directo siempre visible
- **Google Analytics**: Seguimiento de visitas integrado
- **Animaciones Suaves**: Micro-interacciones y transiciones elegantes
- **SEO Optimizado**: Meta tags y estructura semántica

## 🛠️ Tecnologías Utilizadas

- React 18
- TypeScript
- Tailwind CSS
- Firebase/Firestore
- Vite
- Lucide React (iconos)

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/mi-tienda-virtual.git
cd mi-tienda-virtual
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura Firebase:
   - Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
   - Obtén las credenciales de configuración
   - Actualiza `src/config/firebase.ts` con tus credenciales

4. Personaliza la configuración:
   - Edita `src/config/siteConfig.ts` con la información de tu empresa
   - Actualiza precios, servicios, y configuraciones de funcionalidades

5. Inicia el servidor de desarrollo:
```bash
npm run dev
```

## ⚙️ Configuración

### Firebase Setup

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita Firestore Database
4. Copia las credenciales y actualiza `src/config/firebase.ts`

### Google Analytics

1. Obtén tu ID de seguimiento de Google Analytics
2. Actualiza el campo `googleAnalyticsId` en `src/config/siteConfig.ts`

### Personalización

Todas las configuraciones principales se encuentran en `src/config/siteConfig.ts`:

- **Información de la empresa**: Nombre, teléfono, mensaje de WhatsApp
- **Funcionalidades**: Mostrar/ocultar ofertas, sección de clientes
- **Planes y precios**: Configuración completa de los planes de servicio
- **Analytics**: ID de Google Analytics

## 📱 Funcionalidades Principales

### Sistema de Testimonios
- Formulario para nuevos testimonios
- Almacenamiento en Firestore
- Visualización en tiempo real
- Sistema de calificación por estrellas

### Planes de Precios
- Tres niveles: Básico, Medio, Avanzado
- Sistema de ofertas configurable
- Precios dinámicos con descuentos
- Botones de contacto directo

### Botón WhatsApp
- Flotante y siempre visible
- Mensaje personalizable
- Animaciones atractivas
- Tooltip informativo

## 🚀 Despliegue

### Vercel
1. Conecta tu repositorio a Vercel
2. Las variables de entorno se configuran automáticamente
3. Cada push despliega automáticamente

### Netlify
1. Conecta tu repositorio a Netlify
2. Comando de build: `npm run build`
3. Directorio de publicación: `dist`

## 🎨 Personalización de Estilos

El proyecto usa Tailwind CSS con configuración extendida:
- Paleta de colores personalizada
- Fuente Inter
- Animaciones y transiciones suaves
- Sistema de spacing de 8px

Para personalizar colores y estilos, edita `tailwind.config.js`.

## 📈 SEO y Performance

- Meta tags optimizados
- Open Graph y Twitter Cards
- Lazy loading de imágenes
- Código optimizado para producción
- Google Analytics integrado

## 🔧 Scripts Disponibles

- `npm run dev`: Servidor de desarrollo
- `npm run build`: Build de producción
- `npm run preview`: Vista previa del build
- `npm run lint`: Linting del código

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📞 Soporte

Para soporte técnico o consultas:
- Email: info@mitiendavirtual.cl
- WhatsApp: +56912345678
- Website: https://mitiendavirtual.cl