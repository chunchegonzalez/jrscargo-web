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

export type CompanyType = 'JRS CARGO' | 'ATLANTIC IMPORTS' | 'JR LOGISTICS';

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

export function parseClientAddress(addressVal?: string | null): {
  cedula: string;
  discount_percent: number;
  raw_address: string;
} {
  if (!addressVal) {
    return { cedula: '', discount_percent: 0, raw_address: '' };
  }
  const str = String(addressVal).trim();
  try {
    const data = JSON.parse(str);
    if (data && typeof data === 'object') {
      return {
        cedula: String(data.cedula || ''),
        discount_percent: Number(data.discount_percent) || 0,
        raw_address: String(data.address || ''),
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
  };
}

export function formatClientAddress(data: {
  cedula?: string;
  discount_percent?: number | string;
  address?: string;
}): string {
  const discount = Number(data.discount_percent) || 0;
  const cedula = (data.cedula || '').trim();
  const address = (data.address || '').trim();

  return JSON.stringify({
    cedula,
    discount_percent: discount,
    address,
  });
}

