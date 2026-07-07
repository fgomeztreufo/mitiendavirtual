// src/utils/planUtils.ts

export const PLAN_CODE_MAP: Record<string, string> = {
  free: 'free',
  semilla: 'free',
  básico: 'basic',
  basico: 'basic',
  emprendedor: 'basic',
  pro: 'pro',
  crecimiento: 'pro',
  full: 'full',
  completo: 'full'
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
  if (s.includes('basi') || s.includes('emprend')) return 'basic';
  if (s.includes('empres') || s === 'pro' || s.includes('crecimiento')) return 'pro';
  if (s.includes('full') || s.includes('complet')) return 'full';

  const key = Object.keys(PLAN_CODE_MAP).find(k => s === k || s.includes(k));
  return key ? PLAN_CODE_MAP[key] : 'free';
}

// ESTA ES LA CLAVE: Asegúrate de que diga EXPORT
export const PLAN_PERMISSIONS: Record<string, string[]> = {
  free: ['email', 'push'],
  basic: ['email', 'telegram', 'push'],
  pro: ['email', 'telegram', 'push'],
  full: ['email', 'telegram', 'push', 'scheduling']
};

export function planDisplayToCode(display?: string) {
  return normalizePlanType(display);
}

export function planCodeToDisplay(code: string) {
  switch (code) {
    case 'basic': return 'Básico';
    case 'pro': return 'Pro';
    case 'full': return 'Full';
    default: return 'Semilla';
  }
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