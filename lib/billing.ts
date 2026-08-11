export function getInvoiceStats(invoice: Record<string, unknown>) {
  const total = Number(invoice.total) || 0;
  let paid = 0;
  
  if (invoice.invoice_payments && Array.isArray(invoice.invoice_payments)) {
    paid = invoice.invoice_payments.reduce((sum: number, p: Record<string, unknown>) => sum + (Number(p.amount_applied) || 0), 0);
  }
  
  const invoiceStatus = String(invoice.status || 'Pendiente');
  
  if (invoiceStatus === 'Pagada' || invoiceStatus === 'Anulada') {
    // Si la factura está marcada manualmente como pagada o anulada, 
    // su saldo pendiente es 0. Consideramos todo el total como "cubierto" para no mostrar saldos engañosos.
    return {
      total,
      paid: invoiceStatus === 'Pagada' ? total : 0, // Para anulada, pagado es 0 pero pendiente es 0
      pending: 0,
      isPagada: invoiceStatus === 'Pagada',
      isAnulada: invoiceStatus === 'Anulada',
      displayStatus: invoiceStatus // 'Pagada' o 'Anulada'
    };
  } else {
    const pending = total - paid;
    const isPagada = pending <= 0.01;
    return {
      total,
      paid,
      pending: pending > 0 ? pending : 0,
      isPagada,
      isAnulada: false,
      displayStatus: isPagada ? 'Pagada' : invoiceStatus
    };
  }
}
