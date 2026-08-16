// Billing & Inventory Utility Functions

export const DEFAULT_RATES = {
  jrsCargo: 4500, // ₡4,500 por libra
  independent: 5000, // ₡5,000 por libra
  serviceFee: 1500, // ₡1,500 tarifa fija de servicio
  minimumWeight: 1, // 1 libra mínimo
};

export function calculatePackageCost(weight: number, isIndependent: boolean = false): {
  subtotal: number;
  serviceFee: number;
  total: number;
  effectiveWeight: number;
} {
  const effectiveWeight = Math.max(weight, DEFAULT_RATES.minimumWeight);
  const rate = isIndependent ? DEFAULT_RATES.independent : DEFAULT_RATES.jrsCargo;
  const subtotal = effectiveWeight * rate;
  const serviceFee = DEFAULT_RATES.serviceFee;
  const total = subtotal + serviceFee;

  return {
    subtotal,
    serviceFee,
    total,
    effectiveWeight,
  };
}

export function formatCurrency(amount: number, currency: string = 'CRC'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatWeight(weight: number, unit: string = 'lbs'): string {
  return `${weight.toFixed(1)} ${unit}`;
}

export function formatTrackingDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return new Intl.DateTimeFormat('es-CR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatDisplayDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const raw = dateString.split('T')[0];
    const parts = raw.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
    }
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateString;
}

export function formatCostaRicaDateTime(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(validDate);
}

export function formatCostaRicaDate(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(validDate);
}

export function formatCostaRicaISO(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(validDate);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}-06:00`;
}

/**
 * Extracts company ('JRS CARGO', 'ATLANTIC IMPORTS', or 'JR LOGISTICS') and cleaned client name
 * from API raw consignee / client string, tenant name, or client code.
 * Completely strips all company names (JRS Cargo, Atlantic Imports, JR Logistics), prefixes, and locker numbers.
 */
export function extractCompanyAndClient(
  rawConsignee: string | null | undefined,
  tenantName?: string | null,
  clientCode?: string | null,
  rawClientName?: string | null
): { 
  company: 'JRS CARGO' | 'ATLANTIC IMPORTS' | 'JR LOGISTICS'; 
  cleanClient: string 
} {
  const text = (rawConsignee || '').trim();
  const tenant = (tenantName || '').toUpperCase();
  const code = (clientCode || '').toUpperCase();
  const clName = (rawClientName || '').trim();
  
  let company: 'JRS CARGO' | 'ATLANTIC IMPORTS' | 'JR LOGISTICS' = 'JRS CARGO';

  // 0. Explicit tenantName or clientCode check from Worldbox
  if (tenant.includes('ATLANTIC') || code.startsWith('AT-') || code.includes('ATLANTIC')) {
    company = 'ATLANTIC IMPORTS';
  } else if (tenant.includes('LOGISTICS') || tenant.includes('JR ') || code.startsWith('JR-') || code.startsWith('JRL-')) {
    company = 'JR LOGISTICS';
  } else if (tenant.includes('JRS') || code.startsWith('JRS-')) {
    company = 'JRS CARGO';
  }
  // 1. Check for JR Logistics signatures in consignee text
  else if (/\b(JR(\s*LOGISTICS?)|JRL[-\s]*\d+|JR[-\s]*\d+)\b/i.test(text + ' ' + clName)) {
    company = 'JR LOGISTICS';
  }
  // 2. Check for Atlantic Imports signatures (AT-, ATLANTIC, or 1900-2999 locker codes)
  else if (
    /\b(AT(\s*IMPORTS?)?|ATLANTIC(\s*IMPORTS?)?)\b/i.test(text + ' ' + clName) ||
    /\bAT[-\s]*\d+/i.test(text + ' ' + clName) ||
    /-\s*(19\d{2}|2\d{3})\b/.test(text + ' ' + clName) ||
    /\b(19\d{2}|2\d{3})\b/.test(text + ' ' + clName)
  ) {
    company = 'ATLANTIC IMPORTS';
  }
  // 3. JRS Cargo signatures (JRS, JRS-XXXX, or 1000-1899 locker numbers)
  else if (/\bJRS(\s*CARGO)?\b/i.test(text + ' ' + clName) || /\bJRS[-\s]*\d+/i.test(text + ' ' + clName) || /\b1[0-8]\d{2}\b/.test(text + ' ' + clName)) {
    company = 'JRS CARGO';
  }

  // Function to thoroughly strip all company tags, locker codes and numbers
  const cleanStr = (str: string): string => {
    return str
      // Remove full company names (case insensitive)
      .replace(/\b(JRS\s*CARGO(\s*S\.?A\.?)?|ATLANTIC\s*IMPORTS?(\s*S\.?A\.?)?|JR\s*LOGISTICS?(\s*S\.?A\.?)?)\b/gi, ' ')
      .replace(/\b(JRS|ATLANTIC|IMPORTS?|LOGISTICS?|JRL)\b/gi, ' ')
      // Remove prefix codes like AT-1947, JR-1020, JRS-1001, At--2011
      .replace(/\bAT[-_\s]*\d+\b/gi, ' ')
      .replace(/\b(JR|JRL|JRS)[-_\s]*\d+\b/gi, ' ')
      .replace(/\bAT\b/gi, ' ')
      // Remove locker numbers, hashtags, isolated digits
      .replace(/#\s*\d+/g, ' ')
      .replace(/[-_\s/]+\d+[-_\s/]*/g, ' ')
      .replace(/\b\d{3,6}\b/g, ' ')
      .replace(/[-_/|*#.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Try candidate strings in order of specificity (consignatario usually has the individual buyer name)
  const candidates = [text, clName].filter(Boolean);
  let cleanClient = '';

  for (const candidate of candidates) {
    const cleaned = cleanStr(candidate);
    // If it has at least 2 letters and is not empty
    if (cleaned.length >= 2 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(cleaned)) {
      // Capitalize words properly
      cleanClient = cleaned
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      break;
    }
  }

  if (!cleanClient) {
    cleanClient = cleanStr(text) || cleanStr(clName) || text || 'Desconocido';
  }

  return { company, cleanClient };
}
