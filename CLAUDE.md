# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SaaS de e-commerce con IA para negocios chilenos. Gestión de catálogo, automatización multicanal (Instagram, WhatsApp, Telegram), planes de suscripción con Mercado Pago, y entrenamiento RAG de bots con FAQ y productos.

**URL producción:** mitiendavirtual.cl | **Deploy:** Vercel | **Moneda:** CLP

## Commands

```bash
npm run dev       # Dev server (localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build locally
npm run e2e       # E2E tests (Playwright via tests/run_e2e_planes.cjs)
```

## Tech Stack

React 18 + TypeScript 5 + Vite 5 + Tailwind CSS 3. React Router 7 (SPA). Supabase (Auth + PostgreSQL + Storage). Firebase/Firestore (testimonials). Mercado Pago (payments). n8n (webhook automation). Framer Motion (animations). SweetAlert2 (modals).

## Architecture

- **Routing:** `App.tsx` — React Router. `/` landing, `/login` auth, `/dashboard` protected shell, `/payment-result` Mercado Pago callback, legal pages public.
- **Auth:** 100% Supabase Auth with `onAuthStateChange` listener in `App.tsx`. Protected routes redirect to `/login`.
- **Multi-tenancy:** All data scoped by `instance_id` per user.
- **State:** Local `useState`/`useEffect` only — no global store.
- **Dashboard:** `Dashboard.tsx` renders views conditionally by active tab (sidebar navigation).
- **Supabase calls:** Direct from components with `async/await` + `try/catch`. Errors shown via `Swal.fire()`.
- **Webhooks:** n8n at `webhook.mitiendavirtual.cl`. Product uploads use `FormData` to webhook, not direct API.
- **Config:** `src/config/siteConfig.ts` centralizes company info, plans, pricing, features, GA ID.
- **Plan permissions:** `src/utils/planUtils.ts` controls feature gates per subscription tier (Semilla/Basic/Pro/Full).
- **AI safety:** `src/utils/sanitizeInstructions.ts` sanitizes user input before sending to AI models.
- **API handlers:** `api/` directory contains Vercel serverless functions for Telegram/WhatsApp webhooks.
- **DB migrations:** `db/` directory contains sequentially numbered SQL files (`001_`, `002_`, …) for Supabase schema. Continue the sequence when adding new migrations.
- **n8n workflows:** `n8n/` directory contains exported workflow JSON definitions.
- **Dashboard views:** Each channel/feature has its own component: `TelegramView`, `WhatsAppView`, `InstagramView`, `AgentsDashboard`, `NotificationsView`, `Leads`, `TelegramLeadsView`, `KnowlowerView`.
- **Scripts:** `scripts/` contains one-off Node utilities (migration runners, data normalization, n8n sanitizer).

## Code Style

- Components: PascalCase (`InstagramView.tsx`). Functions/hooks: camelCase.
- Footer has context variants: `index`, `login`, `dashboard`, `transparent`.
- Telegram auth supports `Authorization: Bearer <access_token>` from UI or `TLG_SHARED_SECRET` from trusted runners.

## Design System

Colors: `customDark (#121212)`, `customGold (#D4AF37)`, `customLightGray (#F5F5F5)`. Fonts: Inter (body), Playfair Display (headings). Custom classes: `.btn-primary`, `.btn-secondary`, `.card`, `.section-padding`. Mobile-first responsive.

## Environment Variables

Required in `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Optional: `N8N_WEBHOOK_URL`, `N8N_LINK_START_URL`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`.

## Legal

Must comply with Chilean data protection law (Ley 19.628).
