import { NextResponse } from 'next/server';
import { getHeaders, getStoredExchangeRate } from '@/lib/supabase';
import { getInvoiceStats } from '@/lib/billing';

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

    // 2. Fetch Invoices, Invoice Payments, Payments, and Exchange Rate in parallel
    const [resInvoices, resInvoicePayments, resPayments, exchangeRate] = await Promise.all([
      fetch(`${url}/rest/v1/invoices?client_id=eq.${encodeURIComponent(clientId)}&select=id,invoice_number,issue_date,total,status,client_id,currency,exchange_rate,created_at,notes&order=issue_date.desc,created_at.desc`, {
        headers,
        cache: 'no-store'
      }),
      fetch(`${url}/rest/v1/invoice_payments?select=invoice_id,amount_applied`, {
        headers,
        cache: 'no-store'
      }).catch(() => null),
      fetch(`${url}/rest/v1/payments?client_id=eq.${encodeURIComponent(clientId)}&select=id,payment_date,amount,payment_method,reference_number,notes,created_at&order=payment_date.desc,created_at.desc`, {
        headers,
        cache: 'no-store'
      }).catch(() => null),
      getStoredExchangeRate().catch(() => 500)
    ]);

    const invoicesRaw: Record<string, unknown>[] = resInvoices.ok ? await resInvoices.json() : [];
    const invoicePaymentsRaw: Record<string, unknown>[] = resInvoicePayments && resInvoicePayments.ok ? await resInvoicePayments.json() : [];
    const paymentsRaw: Record<string, unknown>[] = resPayments && resPayments.ok ? await resPayments.json() : [];

    // Map payments to invoices
    const paymentsMap = new Map<string, Array<Record<string, unknown>>>();
    for (const p of invoicePaymentsRaw) {
      const invId = String(p.invoice_id);
      if (!paymentsMap.has(invId)) paymentsMap.set(invId, []);
      paymentsMap.get(invId)!.push(p);
    }

    // 3. Fetch invoice items for these invoices
    const invoiceIds = invoicesRaw.map(inv => String(inv.id));
    const itemsMap = new Map<string, Array<Record<string, unknown>>>();

    if (invoiceIds.length > 0) {
      const filterInvoices = invoiceIds.map(id => `"${id}"`).join(',');
      const resItems = await fetch(`${url}/rest/v1/invoice_items?invoice_id=in.(${filterInvoices})&select=invoice_id,service_name,tracking_number,weight,rate,amount`, {
        headers,
        cache: 'no-store'
      }).catch(() => null);

      if (resItems && resItems.ok) {
        const items = await resItems.json();
        for (const it of items) {
          const invId = String(it.invoice_id);
          if (!itemsMap.has(invId)) itemsMap.set(invId, []);
          itemsMap.get(invId)!.push(it);
        }
      }
    }

    // 4. Process invoices and compute pending balances with getInvoiceStats
    let totalBalanceUSD = 0;
    let totalInvoicedUSD = 0;
    let totalPaidUSD = 0;
    let pendingCount = 0;

    const invoices = invoicesRaw.map(inv => {
      inv.invoice_payments = paymentsMap.get(String(inv.id)) || [];
      const items = itemsMap.get(String(inv.id)) || [];

      const stats = getInvoiceStats(inv);

      if (!stats.isAnulada) {
        totalInvoicedUSD += stats.total;
        totalBalanceUSD += stats.pending;
        if (stats.pending > 0.01) {
          pendingCount++;
        }
      }

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        issue_date: inv.issue_date,
        total: stats.total,
        paid: stats.paid,
        pending: stats.pending,
        status: stats.isAnulada ? 'Anulada' : stats.pending <= 0.01 ? 'Pagada' : stats.paid > 0 ? 'Parcial' : 'Pendiente',
        notes: inv.notes,
        items
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
