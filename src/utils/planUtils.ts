export const PLAN_CODE_MAP: Record<string, string> = {
  free: 'free',
  semilla: 'free',
  básico: 'basic',
  basico: 'basic',
  basico_esp: 'basic',
  básico_esp: 'basic',
  básico_rocket: 'basic',
  emprendedor: 'basic',
  empresar: 'pro',
  empresario: 'pro',
  pro: 'pro',
  crecimiento: 'pro',
  full: 'full',
  completo: 'full'
};

function sanitize(input?: string) {
  if (!input) return '';
  return input
    .toString()
    .normalize('NFD') // remove diacritics
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

export function normalizePlanType(input?: string | null): string {
  const s = sanitize(input ?? '');
  if (!s) return 'free';

  // direct matches
  if (s.includes('free') || s.includes('semilla')) return 'free';
  if (s.includes('basi') || s.includes('emprend')) return 'basic';
  if (s.includes('empres') || s === 'pro' || s.includes('crecimiento')) return 'pro';
  if (s.includes('full') || s.includes('complet')) return 'full';

  // fallback: try map lookup
  const key = Object.keys(PLAN_CODE_MAP).find(k => s === k || s.includes(k));
  if (key) return PLAN_CODE_MAP[key];

  return s; // best-effort: return sanitized string
}

export function planCodeToDisplay(code: string) {
  switch (code) {
    case 'basic': return 'Básico';
    case 'pro': return 'Pro';
    case 'full': return 'Full';
    case 'free':
    default:
      return 'Semilla';
  }
}

export function planDisplayToCode(display?: string) {
  return normalizePlanType(display);
}
