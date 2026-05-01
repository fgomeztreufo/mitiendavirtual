// src/utils/planUtils.ts

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
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

export function normalizePlanType(input?: string | null): string {
  const s = sanitize(input ?? '');
  if (!s) return 'free';

  // Lógica de coincidencias directas
  if (s.includes('free') || s.includes('semilla')) return 'free';
  if (s.includes('basi') || s.includes('emprend')) return 'basic';
  if (s.includes('empres') || s === 'pro' || s.includes('crecimiento')) return 'pro';
  if (s.includes('full') || s.includes('complet')) return 'full';

  // Fallback: búsqueda en el mapa
  const key = Object.keys(PLAN_CODE_MAP).find(k => s === k || s.includes(k));
  if (key) return PLAN_CODE_MAP[key];

  return 'free'; 
}

// PERMISOS UNIFICADOS (Usando los códigos de arriba: free, basic, pro, full)
export const PLAN_PERMISSIONS: Record<string, string[]> = {
  free: ['email'],
  basic: ['email', 'telegram'], // El plan básico ya puede usar Telegram
  pro: ['email', 'telegram', 'whatsapp'],
  full: ['email', 'telegram', 'whatsapp']
};

export function planCodeToDisplay(code: string) {
  switch (code) {
    case 'basic': return 'Básico';
    case 'pro': return 'Pro';
    case 'full': return 'Full';
    default: return 'Semilla';
  }
}