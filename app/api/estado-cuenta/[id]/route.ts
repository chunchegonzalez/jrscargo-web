import { NextResponse } from 'next/server';
import { getHeaders, getStoredExchangeRate } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'ID de cliente requerido' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const headers = getHeaders();

    // 1. Fetch Client basic info
    const resClient = await fetch(`${url}/rest/v1/clients?id=eq.${encodeURIComponent(clientId)}&select=id,name,email,phone,address`, {
      headers,
      cache: 'no-store'
    });

    if (!resClient.ok) {
      return NextResponse.json({ success: false, error: 'Error al consultar cliente' }, { status: 500 });
    }

    const clients = await resClient.json();
    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: false, error: 'Cliente no encontrado' }, { status: 404 });
    }
    const client = clients[0];

    // 2. Fetch Invoices and Payments in parallel
    const [resInvoices, resPayments, exchangeRate] = await Promise.all([
      fetch(`${url}/rest/v1/invoices?client_id=eq.${encodeURIComponent(clientId)}&select=id,invoice_number,issue_date,due_date,total,subtotal,discount_percent,discount_amount,status,notes,created_at,invoice_payments(amount_applied)&order=issue_date.desc,created_at.desc`, {
        headers,
        cache: 'no-store'
      }),
      fetch(`${url}/rest/v1/payments?client_id=eq.${encodeURIComponent(clientId)}&select=id,payment_date,amount,payment_method,reference_number,notes,created_at&order=payment_date.desc,created_at.desc`, {
        headers,
        cache: 'no-store'
      }),
      getStoredExchangeRate().catch(() => 500)
    ]);

    const invoicesRaw: Record<string, unknown>[] = resInvoices.ok ? await resInvoices.json() : [];
    const paymentsRaw: Record<string, unknown>[] = resPayments.ok ? await resPayments.json() : [];

    // 3. Fetch invoice items for these invoices
    const invoiceIds = invoicesRaw.map(inv => String(inv.id));
    const itemsByInvoice: Record<string, Array<Record<string, unknown>>> = {};

    if (invoiceIds.length > 0) {
      const filterInvoices = invoiceIds.map(id => `"${id}"`).join(',');
      const resItems = await fetch(`${url}/rest/v1/invoice_items?invoice_id=in.(${filterInvoices})&select=invoice_id,service_name,tracking_number,weight,rate,amount`, {
        headers,
        cache: 'no-store'
      });
      if (resItems.ok) {
        const items = await resItems.json();
        items.forEach((it: Record<string, unknown>) => {
          const invId = String(it.invoice_id);
          if (!itemsByInvoice[invId]) itemsByInvoice[invId] = [];
          itemsByInvoice[invId].push(it);
        });
      }
    }

    // 4. Process invoices and compute pending balances
    let totalBalanceUSD = 0;
    let totalInvoicedUSD = 0;
    let totalPaidUSD = 0;
    let pendingCount = 0;

    const invoices = invoicesRaw.map(inv => {
      const total = Number(inv.total || 0);
      const isAnulada = inv.status === 'Anulada';

      let paid = 0;
      if (inv.invoice_payments && Array.isArray(inv.invoice_payments)) {
        paid = (inv.invoice_payments as Record<string, unknown>[]).reduce(
          (acc: number, p: Record<string, unknown>) => acc + Number(p.amount_applied || 0),
          0
        );
      }

      const pending = isAnulada ? 0 : Math.max(0, total - paid);

      if (!isAnulada) {
        totalInvoicedUSD += total;
        totalBalanceUSD += pending;
        if (pending > 0.01) {
          pendingCount++;
        }
      }

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        total,
        paid,
        pending,
        status: isAnulada ? 'Anulada' : pending <= 0.01 ? 'Pagada' : paid > 0 ? 'Parcial' : 'Pendiente',
        notes: inv.notes,
        items: itemsByInvoice[String(inv.id)] || []
      };
    });

    // Compute payments total
    paymentsRaw.forEach(p => {
      totalPaidUSD += Number(p.amount || 0);
    });

    const rate = Number(exchangeRate) > 0 ? Number(exchangeRate) : 500;
    const totalBalanceCRC = Math.round(totalBalanceUSD * rate);

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone
      },
      stats: {
        totalBalanceUSD: Math.round(totalBalanceUSD * 100) / 100,
        totalBalanceCRC,
        pendingInvoicesCount: pendingCount,
        totalInvoicedUSD: Math.round(totalInvoicedUSD * 100) / 100,
        totalPaidUSD: Math.round(totalPaidUSD * 100) / 100,
        exchangeRate: rate
      },
      invoices,
      payments: paymentsRaw
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno al consultar estado de cuenta';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
