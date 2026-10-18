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

    // Case 1: Apply existing client credit (Saldo a Favor) to pending invoices
    if (body.action === 'apply_credit') {
      const { client_id, appliedInvoices } = body;
      if (!client_id || !Array.isArray(appliedInvoices) || appliedInvoices.length === 0) {
        return NextResponse.json({ success: false, error: 'Datos inválidos para aplicar saldo a favor' }, { status: 400 });
      }

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const headers = getHeaders();

      // Fetch client's payments with their existing invoice_payments
      const payRes = await fetch(
        `${url}/rest/v1/payments?client_id=eq.${encodeURIComponent(client_id)}&select=*,invoice_payments(invoice_id,amount_applied)&order=payment_date.asc,created_at.asc`,
        { headers, cache: 'no-store' }
      );
      if (!payRes.ok) {
        throw new Error('No se pudieron consultar los pagos del cliente');
      }
      const clientPayments: Array<Record<string, unknown>> = await payRes.json();

      // Find payments with unapplied balance
      const availableSources: Array<{ payment_id: string; remaining: number }> = [];
      for (const p of clientPayments) {
        const totalAmt = Number(p.amount) || 0;
        const appliedList = Array.isArray(p.invoice_payments) ? p.invoice_payments : [];
        const usedAmt = appliedList.reduce((acc: number, ip: Record<string, unknown>) => acc + (Number(ip.amount_applied) || 0), 0);
        const rem = Number((totalAmt - usedAmt).toFixed(2));
        if (rem > 0.009) {
          availableSources.push({ payment_id: String(p.id), remaining: rem });
        }
      }

      const linksToInsert: Array<{ payment_id: string; invoice_id: string; amount_applied: number }> = [];

      for (const inv of appliedInvoices) {
        let needed = Number(inv.amount_applied) || 0;
        const invId = String(inv.invoice_id);
        for (const src of availableSources) {
          if (needed <= 0.009) break;
          if (src.remaining <= 0.009) continue;
          const take = Number(Math.min(needed, src.remaining).toFixed(2));
          if (take > 0) {
            linksToInsert.push({
              payment_id: src.payment_id,
              invoice_id: invId,
              amount_applied: take
            });
            src.remaining = Number((src.remaining - take).toFixed(2));
            needed = Number((needed - take).toFixed(2));
          }
        }
      }

      if (linksToInsert.length > 0) {
        const resLinks = await fetch(`${url}/rest/v1/invoice_payments`, {
          method: 'POST',
          headers,
          body: JSON.stringify(linksToInsert)
        });
        if (!resLinks.ok) {
          throw new Error('Error al vincular el saldo a favor con las facturas');
        }
      }

      for (const inv of appliedInvoices) {
        if (inv.isFullyPaid) {
          await updateInvoiceStatus(inv.invoice_id, 'Pagada');
        }
      }

      return NextResponse.json({ success: true, appliedCount: linksToInsert.length }, { status: 200 });
    }

    // Case 2: Standard Payment (with optional overpayment credit / standalone credit)
    const { payment, appliedInvoices = [] } = body;
    
    // Create the payment and link it to invoices (if any)
    const result = await createPayment(payment, appliedInvoices);

    if (Array.isArray(appliedInvoices)) {
      for (const inv of appliedInvoices) {
        if (inv.isFullyPaid) {
          await updateInvoiceStatus(inv.invoice_id, 'Pagada');
        }
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error creating payment';
    console.error(errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
