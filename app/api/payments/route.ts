import { NextResponse } from 'next/server';
import { getHeaders, createPayment, updateInvoiceStatus } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    
    // Fetch all payments, joining with clients for the name, and invoice_payments->invoices for the references
    const res = await fetch(`${url}/rest/v1/payments?select=*,clients(id,name,email),invoice_payments(amount_applied,invoice_id,invoices(invoice_number))&order=payment_date.desc,created_at.desc`, {
      headers: getHeaders(),
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`Supabase error: ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error fetching payments';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

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
