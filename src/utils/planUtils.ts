// src/utils/planUtils.ts

export const PLAN_CODE_MAP: Record<string, string> = {
  free: 'free',
  semilla: 'free',
  'básico': 'free',
  basico: 'free',
  basic: 'free',
  inicial: 'free',
  emprendedor: 'emprendedor',
  pyme: 'negocio',
  negocio: 'negocio',
  pro: 'negocio',
  crecimiento: 'negocio',
  empresario: 'negocio',
  full: 'escala',
  completo: 'escala',
  escala: 'escala',
  corporativo: 'escala',
};

function sanitize(input?: string) {
  if (!input) return '';
  return input
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

export function normalizePlanType(input?: string | null): string {
  const s = sanitize(input ?? '');
  if (!s) return 'free';

  if (s.includes('free') || s.includes('semilla')) return 'free';
  if (s.includes('basi') || s.includes('inicial')) return 'free';
  if (s.includes('emprend')) return 'emprendedor';
  if (s === 'pyme' || s === 'negocio') return 'negocio';
  if (s === 'pro' || s.includes('crecimiento') || s.includes('empres')) return 'negocio';
  if (s.includes('full') || s.includes('complet') || s.includes('escala') || s.includes('corporat')) return 'escala';

  const key = Object.keys(PLAN_CODE_MAP).find(k => s === k || s.includes(k));
  return key ? PLAN_CODE_MAP[key] : 'free';
}

export const PLAN_PERMISSIONS: Record<string, string[]> = {
  expired:     ['email', 'push'],
  free:        ['email', 'telegram', 'push', 'whatsapp', 'scheduling', 'branches'],
  emprendedor: ['email', 'telegram', 'push', 'whatsapp', 'scheduling', 'branches'],
  negocio:     ['email', 'telegram', 'push', 'whatsapp', 'scheduling', 'branches'],
  escala:      ['email', 'telegram', 'push', 'whatsapp', 'scheduling', 'branches'],
};

export function planDisplayToCode(display?: string) {
  return normalizePlanType(display);
}

export function planCodeToDisplay(code: string) {
  switch (code) {
    case 'expired': return 'Sin plan';
    case 'free': return 'Gratis';
    case 'emprendedor': return 'Emprendedor';
    case 'negocio': return 'Negocio';
    case 'escala': return 'Escala';
    default: return 'Gratis';
  }
}

export function aiCreditsUsed(profile: any): number {
  return profile?.ai_credits_used ?? 0;
}

export function isTopPlan(planCode: string): boolean {
  return planCode === 'escala';
}

export function totalCreditLimit(profile: any, planMessagesLimit: number | null): number | null {
  if (planMessagesLimit === null) return null;
  return planMessagesLimit + (profile?.bonus_credits ?? 0);
}

export function remainingCredits(profile: any, planMessagesLimit: number | null): number | null {
  const total = totalCreditLimit(profile, planMessagesLimit);
  if (total === null) return null;
  return Math.max(0, total - (profile?.ai_credits_used ?? 0));
}

export function isLowCredits(profile: any, planMessagesLimit: number | null, threshold = 50): boolean {
  const remaining = remainingCredits(profile, planMessagesLimit);
  if (remaining === null) return false;
  return remaining < threshold;
}

export function isPlanExpired(profile: any): boolean {
  if (!profile?.plan_expires_at) return false;
  return new Date(profile.plan_expires_at) < new Date();
}

export function effectivePlan(profile: any): string {
  if (isPlanExpired(profile)) {
    return 'expired';
  }
  return normalizePlanType(profile?.plan_type);
}

export const BUSINESS_TYPES: Record<string, string> = {
  ecommerce: 'E-commerce / Tienda',
  inmobiliaria: 'Inmobiliaria',
  clinica: 'Clínica / Salud',
  servicios: 'Servicios / Barbería',
  restaurant: 'Restaurant / Comida',
}

export function getBusinessType(profile: any): string {
  return profile?.business_type || 'ecommerce';
}

export function isInmobiliaria(profile: any): boolean {
  return getBusinessType(profile) === 'inmobiliaria';
}
