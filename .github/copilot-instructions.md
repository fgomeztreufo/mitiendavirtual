# Mi Tienda Virtual — Project Guidelines

## Overview

SaaS de e-commerce con IA para negocios chilenos. Gestión de catálogo, automatización de atención al cliente (Instagram, WhatsApp), planes de suscripción con Mercado Pago, y entrenamiento RAG de bots con FAQ y productos.

**URL producción:** mitiendavirtual.cl  
**Deploy:** Vercel  
**Moneda:** CLP (pesos chilenos)

## Tech Stack

- **React 18** + **TypeScript 5** + **Vite 5**
- **Tailwind CSS 3** (utility-first, mobile-first)
- **React Router 7** (SPA con rewrites en Vercel)
- **Supabase** — Auth, PostgreSQL, Storage
- **Firebase/Firestore** — Testimonios
- **Mercado Pago** — Pagos y suscripciones
- **n8n** — Webhooks para carga de productos, FAQs, pagos
- **Framer Motion** — Animaciones
- **SweetAlert2** — Alertas y modales
- **Lucide React / Phosphor / React Icons** — Iconografía

## Architecture

```
src/
├── App.tsx              # Routing principal (React Router)
├── main.tsx             # Entry point
├── supabaseClient.ts    # Cliente Supabase singleton
├── index.css            # Tailwind + custom classes
├── components/          # Componentes de UI (feature-based)
│   ├── Index.tsx        # Landing page animada
│   ├── Dashboard.tsx    # Shell principal (sidebar + tabs)
│   ├── LoginPage.tsx    # Auth con Supabase Auth UI
│   ├── CatalogView.tsx  # Subida de productos
│   ├── ProductsListView.tsx  # CRUD de productos
│   ├── PlansView.tsx    # Planes y pagos Mercado Pago
│   ├── FaqsView.tsx     # Base de conocimiento FAQ
│   ├── InstagramView.tsx # Config bot IA Instagram
│   ├── WhatsAppView.tsx # WhatsApp (coming soon)
│   ├── Leads.tsx        # Pipeline de leads
│   ├── KnowlowerView.tsx # Visor de memoria IA
│   ├── PaymentResult.tsx # Callback Mercado Pago
│   └── LegalPages.tsx   # Términos, privacidad, data deletion
└── config/
    ├── siteConfig.ts    # Configuración centralizada del sitio
    └── firebase.ts      # Config Firebase
```

### Routing

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/` | Index | Público |
| `/login` | LoginPage | Público |
| `/dashboard` | Dashboard | Requiere sesión |
| `/payment-result` | PaymentResult | Callback Mercado Pago |
| `/privacy`, `/terms`, `/data-deletion` | LegalPages | Público |
| `/knowlower` | KnowlowerView | Público |

### Multi-tenancy

Cada usuario tiene su `instance_id` en Supabase que aísla productos, FAQs, leads y configuración.

### Planes de suscripción

| Plan | Precio CLP | Productos | Mensajes/mes |
|------|-----------|-----------|-------------|
| Semilla (Free) | 0 | 10 | 50 |
| Basic | 14.990 | 50 | 500 |
| Pro | 39.990 | 500 | 2.000 |
| Full | 59.990 | 2.000 | Ilimitados |

## Code Style

- **Componentes:** PascalCase (`InstagramView.tsx`)
- **Funciones/hooks:** camelCase (`handleFileChange`, `fetchProducts`)
- **Constantes:** camelCase o UPPER_SNAKE_CASE según contexto
- **Interfaces:** PascalCase, sufijo descriptivo (`UserProfile`, `ProductData`)
- Estado local con `useState` / `useEffect` — no hay store global
- Llamadas a Supabase directas desde componentes con `async/await` + `try/catch`
- Errores al usuario con `Swal.fire()`, logs con `console.error`

## Build & Dev

```bash
npm install          # Instalar dependencias
npm run dev          # Dev server (localhost:5173)
npm run build        # Build producción
npm run preview      # Preview local del build
```

### Variables de entorno requeridas (`.env.local`)

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Design System

- **Colores:** `customDark (#121212)`, `customGold (#D4AF37)`, `customLightGray (#F5F5F5)`
- **Tipografía:** Inter (body), Playfair Display (headings)
- **Clases custom:** `.btn-primary`, `.btn-secondary`, `.card`, `.section-padding`
- **Responsive:** Mobile-first con breakpoints Tailwind (`md:`, `lg:`)

## Conventions

- Los webhooks de n8n usan el dominio `webhook.mitiendavirtual.cl`
- Subida de productos usa `FormData` al webhook, no API directa
- La autenticación es 100% Supabase Auth con listeners `onAuthStateChange`
- Los componentes del Dashboard se renderizan condicionalmente por tab activo
- El Footer tiene variantes según contexto: `index`, `login`, `dashboard`, `transparent`
- Cumplimiento legal chileno: Ley 19.628 (protección de datos)
