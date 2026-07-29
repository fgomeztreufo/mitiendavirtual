// src/utils/planUtils.ts

export const PLAN_CODE_MAP: Record<string, string> = {
  free: 'inicial',
  semilla: 'inicial',
  básico: 'inicial',
  basico: 'inicial',
  basic: 'inicial',
  emprendedor: 'inicial',
  inicial: 'inicial',
  pyme: 'pyme',
  pro: 'pro',
  crecimiento: 'pro',
  empresario: 'pro',
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
  if (!s) return 'inicial';

  if (s.includes('free') || s.includes('semilla')) return 'inicial';
  if (s.includes('basi') || s.includes('emprend') || s.includes('inicial')) return 'inicial';
  if (s === 'pyme') return 'pyme';
  if (s === 'pro' || s.includes('crecimiento') || s.includes('empres')) return 'pro';
  if (s.includes('full') || s.includes('complet') || s.includes('escala') || s.includes('corporat')) return 'escala';

  const key = Object.keys(PLAN_CODE_MAP).find(k => s === k || s.includes(k));
  return key ? PLAN_CODE_MAP[key] : 'inicial';
}

export const PLAN_PERMISSIONS: Record<string, string[]> = {
  inicial: ['email', 'telegram', 'push', 'branches'],
  pyme:    ['email', 'telegram', 'push', 'whatsapp', 'branches'],
  pro:     ['email', 'telegram', 'push', 'whatsapp', 'branches'],
  escala:  ['email', 'telegram', 'push', 'whatsapp', 'scheduling', 'branches'],
};

export const PLAN_BRANCHES_LIMIT: Record<string, number | null> = {
  inicial: 2,
  pyme: 5,
  pro: 10,
  escala: null,
};

export function branchesLimit(profile: any): number | null {
  const code = effectivePlan(profile);
  const limit = PLAN_BRANCHES_LIMIT[code];
  return limit === undefined ? 0 : limit;
}

export function hasBranches(profile: any): boolean {
  const limit = branchesLimit(profile);
  return limit === null || limit > 0;
}

export function canCreateBranch(profile: any, currentCount: number): boolean {
  const limit = branchesLimit(profile);
  if (limit === null) return true;
  return currentCount < limit;
}

export function planDisplayToCode(display?: string) {
  return normalizePlanType(display);
}

export function planCodeToDisplay(code: string) {
  switch (code) {
    case 'inicial': return 'Inicial';
    case 'pyme': return 'Pyme';
    case 'pro': return 'Pro';
    case 'escala': return 'Escala';
    default: return 'Inicial';
  }
}

export function aiCreditsUsed(profile: any): number {
  return profile?.ai_credits_used ?? 0;
}

export function hasWhatsAppAccess(planCode: string): boolean {
  const perms = PLAN_PERMISSIONS[planCode];
  return !!perms && perms.includes('whatsapp');
}

export function hasSchedulingAccess(planCode: string): boolean {
  const perms = PLAN_PERMISSIONS[planCode];
  return !!perms && perms.includes('scheduling');
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

export function isInTrial(profile: any): boolean {
  if (!profile?.trial_ends_at) return false;
  return new Date(profile.trial_ends_at) > new Date();
}

export function trialDaysLeft(profile: any): number {
  if (!profile?.trial_ends_at) return 0;
  const diff = new Date(profile.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function effectivePlan(profile: any): string {
  if (isInTrial(profile) && profile?.trial_plan) {
    return normalizePlanType(profile.trial_plan);
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
