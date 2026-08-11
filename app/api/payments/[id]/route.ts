import { NextResponse } from 'next/server';
import { getHeaders, updateInvoiceStatus } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

    // 1. Get invoice_payments to know which invoices to update
    const ipRes = await fetch(`${url}/rest/v1/invoice_payments?payment_id=eq.${id}`, {
      headers: getHeaders()
    });
    
    let invoiceIds: string[] = [];
    if (ipRes.ok) {
      const ips = await ipRes.json();
      invoiceIds = ips.map((ip: { invoice_id: string }) => ip.invoice_id);
    }

    // 2. Delete the payment (this should cascade to invoice_payments if configured, but let's be safe)
    await fetch(`${url}/rest/v1/invoice_payments?payment_id=eq.${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    const delRes = await fetch(`${url}/rest/v1/payments?id=eq.${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!delRes.ok) throw new Error('Failed to delete payment');

    // 3. Revert statuses of affected invoices to 'Pendiente'
    const uniqueInvoiceIds = invoiceIds.filter((id, index) => invoiceIds.indexOf(id) === index);
    for (const invId of uniqueInvoiceIds) {
      await updateInvoiceStatus(invId, 'Pendiente');
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error deleting payment';
    console.error(errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
