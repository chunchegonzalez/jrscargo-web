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

export function getInvoiceStats(invoice: Record<string, unknown>) {
  const total = Number(invoice.total) || 0;
  const currency = String(invoice.currency || 'USD'); // Default to USD
  let paid = 0;
  
  if (invoice.invoice_payments && Array.isArray(invoice.invoice_payments)) {
    paid = invoice.invoice_payments.reduce((sum: number, p: Record<string, unknown>) => sum + (Number(p.amount_applied) || 0), 0);
  }
  
  const invoiceStatus = String(invoice.status || 'Pendiente');
  
  const baseResult = {
    total,
    paid,
    pending: 0,
    currency,
    isPagada: false,
    isAnulada: invoiceStatus === 'Anulada',
    displayStatus: invoiceStatus
  };

  if (invoiceStatus === 'Pagada' || invoiceStatus === 'Anulada') {
    baseResult.paid = invoiceStatus === 'Pagada' ? total : 0;
    baseResult.pending = 0;
    baseResult.isPagada = invoiceStatus === 'Pagada';
  } else {
    const pending = total - paid;
    baseResult.pending = pending > 0 ? pending : 0;
    baseResult.isPagada = pending <= 0.01;
    baseResult.displayStatus = baseResult.isPagada ? 'Pagada' : invoiceStatus;
  }
  
  return baseResult;
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

export type WeightUnitType = 'Lb' | 'Kg' | 'ft³';

export function detectServiceUnit(name?: string | null): WeightUnitType {
  if (!name) return 'Lb';
  const norm = name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 1. Marítimo -> Pies Cúbicos (ft³)
  if (norm.includes('MARITIMO') || norm.includes('PIE CUBICO') || norm.includes('FT3') || norm.includes('FT³')) {
    return 'ft³';
  }

  // 2. Mayorista Aéreo / Madrid / Kilos -> Kilos (Kg)
  if (
    norm.includes('MAYORISTA AEREO') ||
    norm.includes('AEREO MADRID') ||
    (norm.includes('MAYORISTA') && norm.includes('AEREO')) ||
    (norm.includes('MAYORISTA') && norm.includes('MADRID')) ||
    norm.includes('(KG)') ||
    norm.includes('POR KILO') ||
    norm.includes('KILO') ||
    norm.includes('KG')
  ) {
    return 'Kg';
  }

  // 3. Estándar Aéreo -> Libras (Lb)
  return 'Lb';
}

export function formatPackageWeightAndRate({
  weight,
  serviceName,
  rate,
  pkgWeight,
  pkgUnit = 'lbs'
}: {
  weight?: number | string | null;
  serviceName?: string | null;
  rate?: number | string | null;
  pkgWeight?: number | string | null;
  pkgUnit?: string | null;
}) {
  if (weight === undefined || weight === null || weight === '') {
    return {
      unit: 'Lb' as WeightUnitType,
      unitLabel: 'lb',
      unitPlural: 'lbs',
      weightFormatted: '',
      weightFull: '',
      equivalentStr: '',
      rateFormatted: rate ? `$${rate}` : '',
    };
  }

  const numWeight = parseFloat(String(weight));
  const rawStr = String(weight).trim();

  // If already contains unit text (e.g. "2.5 lbs" or "1.13 kg")
  let unit: WeightUnitType = 'Lb';
  const rawLower = rawStr.toLowerCase();
  if (rawLower.includes('kg') || rawLower.includes('kilo')) {
    unit = 'Kg';
  } else if (rawLower.includes('ft3') || rawLower.includes('ft³') || rawLower.includes('pie')) {
    unit = 'ft³';
  } else if (rawLower.includes('lb')) {
    unit = 'Lb';
  } else {
    // 1. Detect from service name
    unit = detectServiceUnit(serviceName);

    // 2. Cross-check with reference package weight if available
    // e.g. pkgWeight is 2.5 lbs and numWeight is ~1.13 -> definitely Kg!
    if (pkgWeight && !isNaN(Number(pkgWeight)) && !isNaN(numWeight) && numWeight > 0) {
      const pNum = Number(pkgWeight);
      const isLbsToKg = Math.abs((pNum * 0.453592) - numWeight) < 0.08;
      const isKgToLbs = Math.abs((pNum * 2.20462) - numWeight) < 0.15;
      if (isLbsToKg) {
        unit = 'Kg';
      } else if (isKgToLbs) {
        unit = 'Lb';
      }
    }
  }

  const cleanNum = isNaN(numWeight) ? rawStr.replace(/[^\d.]/g, '') || rawStr : numWeight.toString();

  let unitLabel = 'lb';
  let unitPlural = 'lbs';
  let equivalentStr = '';

  if (unit === 'Kg') {
    unitLabel = 'kg';
    unitPlural = 'kg';
    if (!isNaN(numWeight)) {
      let inLbs = (numWeight * 2.20462).toFixed(2).replace(/\.00$/, '');
      if (pkgWeight && !isNaN(Number(pkgWeight)) && Math.abs(Number(pkgWeight) - Number(inLbs)) <= 0.05) {
        inLbs = String(pkgWeight);
      }
      equivalentStr = `(${inLbs} lbs)`;
    }
  } else if (unit === 'ft³') {
    unitLabel = 'ft³';
    unitPlural = 'ft³';
  } else {
    unitLabel = 'lb';
    unitPlural = 'lbs';
    if (!isNaN(numWeight)) {
      let inKg = (numWeight * 0.453592).toFixed(2).replace(/\.00$/, '');
      if (pkgWeight && !isNaN(Number(pkgWeight)) && pkgUnit?.toLowerCase().includes('kg') && Math.abs(Number(pkgWeight) - Number(inKg)) <= 0.05) {
        inKg = String(pkgWeight);
      }
      equivalentStr = `(${inKg} kg)`;
    }
  }

  const weightFormatted = `${cleanNum} ${unitPlural}`;
  const weightFull = equivalentStr ? `${cleanNum} ${unitPlural} ${equivalentStr}` : `${cleanNum} ${unitPlural}`;
  const rateFormatted = rate !== undefined && rate !== null && rate !== '' ? `$${rate} / ${unitLabel}` : '';

  return {
    unit,
    unitLabel,
    unitPlural,
    cleanNum,
    weightFormatted,
    weightFull,
    equivalentStr,
    rateFormatted
  };
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

/**
 * Formats a date string (YYYY-MM-DD or ISO) to "DD/MM/YYYY" without UTC timezone conversion offset.
 */
export function formatDisplayDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (year && month && day) {
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return String(dateStr);
}

/**
 * Returns today's date in local time as "YYYY-MM-DD"
 */
export function getLocalTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a "YYYY-MM-DD" or ISO string into a local Date object (local midnight, not UTC midnight)
 */
export function parseLocalDate(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date();
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

export function formatCostaRicaDateTime(date: Date | string | number = new Date()): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function formatCostaRicaDate(date: Date | string | number = new Date()): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('es-CR', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
}

export function formatCostaRicaISO(date: Date | string | number = new Date()): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

export type CompanyType = 'JRS CARGO' | 'ATLANTIC IMPORTS' | 'JR LOGISTICS' | 'TRINITY BOX';

/**
 * Extracts company ('JRS CARGO', 'ATLANTIC IMPORTS', 'JR LOGISTICS', or 'TRINITY BOX') and cleaned client name
 * from API raw consignee / client string, tenant name, or client code.
 * Completely strips all company names (JRS Cargo, Atlantic Imports, JR Logistics, Trinity Box), prefixes, and locker numbers.
 */
export function extractCompanyAndClient(
  rawConsignee: string | null | undefined,
  tenantName?: string | null,
  clientCode?: string | null,
  rawClientName?: string | null
): { 
  company: 'JRS CARGO' | 'ATLANTIC IMPORTS' | 'JR LOGISTICS' | 'TRINITY BOX'; 
  cleanClient: string 
} {
  const text = (rawConsignee || '').trim();
  const tenant = (tenantName || '').toUpperCase();
  const code = (clientCode || '').toUpperCase();
  const clName = (rawClientName || '').trim();
  
  let company: 'JRS CARGO' | 'ATLANTIC IMPORTS' | 'JR LOGISTICS' | 'TRINITY BOX' = 'JRS CARGO';

  // 0. Explicit tenantName or clientCode check from Worldbox
  if (tenant.includes('ATLANTIC') || code.startsWith('AT-') || code.includes('ATLANTIC')) {
    company = 'ATLANTIC IMPORTS';
  } else if (tenant.includes('TRINITY') || code.startsWith('TB-') || code.startsWith('TRINITY') || code.includes('TRINITY')) {
    company = 'TRINITY BOX';
  } else if (tenant.includes('LOGISTICS') || tenant.includes('JR ') || code.startsWith('JR-') || code.startsWith('JRL-')) {
    company = 'JR LOGISTICS';
  } else if (tenant.includes('JRS') || code.startsWith('JRS-')) {
    company = 'JRS CARGO';
  }
  // 1. Check for Trinity Box signatures in consignee text
  else if (/\b(TRINITY(\s*BOX)?|TB[-\s]*\d+)\b/i.test(text + ' ' + clName)) {
    company = 'TRINITY BOX';
  }
  // 2. Check for JR Logistics signatures in consignee text
  else if (/\b(JR(\s*LOGISTICS?)|JRL[-\s]*\d+|JR[-\s]*\d+)\b/i.test(text + ' ' + clName)) {
    company = 'JR LOGISTICS';
  }
  // 3. Check for Atlantic Imports signatures (AT-, ATLANTIC, or 1900-2999 locker codes)
  else if (
    /\b(AT(\s*IMPORTS?)?|ATLANTIC(\s*IMPORTS?)?)\b/i.test(text + ' ' + clName) ||
    /\bAT[-\s]*\d+/i.test(text + ' ' + clName) ||
    /-\s*(19\d{2}|2\d{3})\b/.test(text + ' ' + clName) ||
    /\b(19\d{2}|2\d{3})\b/.test(text + ' ' + clName)
  ) {
    company = 'ATLANTIC IMPORTS';
  }
  // 4. JRS Cargo signatures (JRS, JRS-XXXX, or 1000-1899 locker numbers)
  else if (/\bJRS(\s*CARGO)?\b/i.test(text + ' ' + clName) || /\bJRS[-\s]*\d+/i.test(text + ' ' + clName) || /\b1[0-8]\d{2}\b/.test(text + ' ' + clName)) {
    company = 'JRS CARGO';
  }

  // Function to thoroughly strip all company tags, locker codes and numbers
  const cleanStr = (str: string): string => {
    return str
      // Remove full company names (case insensitive)
      .replace(/\b(JRS\s*CARGO(\s*S\.?A\.?)?|ATLANTIC\s*IMPORTS?(\s*S\.?A\.?)?|JR\s*LOGISTICS?(\s*S\.?A\.?)?|TRINITY\s*BOX(\s*S\.?A\.?)?)\b/gi, ' ')
      .replace(/\b(JRS|ATLANTIC|IMPORTS?|LOGISTICS?|JRL|TRINITY|TRINITY\s*BOX|TB)\b/gi, ' ')
      // Remove prefix codes like AT-1947, JR-1020, JRS-1001, TB-101, At--2011
      .replace(/\b(AT|JR|JRL|JRS|TB)[-_\s]*\d+\b/gi, ' ')
      .replace(/\b(AT|TB)\b/gi, ' ')
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

export function parseClientAddress(addressVal?: string | null): {
  cedula: string;
  discount_percent: number;
  raw_address: string;
  secondary_email: string;
} {
  if (!addressVal) {
    return { cedula: '', discount_percent: 0, raw_address: '', secondary_email: '' };
  }
  const str = String(addressVal).trim();
  try {
    const data = JSON.parse(str);
    if (data && typeof data === 'object') {
      let secEmail = String(data.secondary_email || data.email2 || '').trim();
      let rawAddr = String(data.address || '').trim();
      let ced = String(data.cedula || '').trim();
      let disc = Number(data.discount_percent) || 0;
      
      // If address is nested JSON from older saves, unwrap it
      while (rawAddr.startsWith('{') && rawAddr.endsWith('}')) {
        try {
          const inner = JSON.parse(rawAddr);
          if (inner && typeof inner === 'object') {
            if (!secEmail && (inner.secondary_email || inner.email2)) {
              secEmail = String(inner.secondary_email || inner.email2).trim();
            }
            if (!ced && inner.cedula) {
              ced = String(inner.cedula).trim();
            }
            if (!disc && inner.discount_percent) {
              disc = Number(inner.discount_percent) || 0;
            }
            rawAddr = String(inner.address || '').trim();
          } else {
            break;
          }
        } catch {
          break;
        }
      }

      return {
        cedula: ced,
        discount_percent: disc,
        raw_address: rawAddr,
        secondary_email: secEmail,
      };
    }
  } catch {
    // Legacy plain string fallback
  }

  const match = str.match(/\[DESC:(\d+(?:\.\d+)?)%?\]/i);
  const discount = match ? Number(match[1]) || 0 : 0;
  const cleanStr = str.replace(/\[DESC:.*?\]/gi, '').trim();

  return {
    cedula: cleanStr,
    discount_percent: discount,
    raw_address: cleanStr,
    secondary_email: '',
  };
}

export function formatClientAddress(data: {
  cedula?: string;
  discount_percent?: number | string;
  address?: string;
  secondary_email?: string;
}): string {
  const discount = Number(data.discount_percent) || 0;
  const cedula = (data.cedula || '').trim();
  let address = (data.address || '').trim();
  const secondary_email = (data.secondary_email || '').trim();

  // If address is a JSON string, extract just the raw inner address
  if (address.startsWith('{') && address.endsWith('}')) {
    try {
      const parsed = JSON.parse(address);
      if (parsed && typeof parsed === 'object') {
        address = String(parsed.address || '').trim();
      }
    } catch {
      // Keep as is
    }
  }

  return JSON.stringify({
    cedula,
    discount_percent: discount,
    address,
    secondary_email,
  });
}

