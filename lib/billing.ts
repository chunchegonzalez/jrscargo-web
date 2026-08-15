export function getInvoiceStats(invoice: Record<string, unknown>) {
  const total = Number(invoice.total) || 0;
  const currency = String(invoice.currency || 'USD'); // Default to USD for old data
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
    // Si la factura está marcada manualmente como pagada o anulada
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

export function formatCurrency(amount: number, currency: string = 'USD') {
  if (currency === 'CRC') {
    return `₡${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CRC`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) to "DD/MM/YYYY" without UTC timezone conversion offset.
 */
export function formatDisplayDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
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
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}
