import { NextResponse } from 'next/server';
import { createPayment, updateInvoiceStatus } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { payment, appliedInvoices } = body;
    
    // Create the payment and link it to invoices
    const result = await createPayment(payment, appliedInvoices);

    for (const inv of appliedInvoices) {
      if (inv.isFullyPaid) {
        await updateInvoiceStatus(inv.invoice_id, 'Pagada');
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error creating payment';
    console.error(errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
