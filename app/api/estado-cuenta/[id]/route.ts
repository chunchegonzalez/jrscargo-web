import { NextResponse } from 'next/server';
import { getHeaders, getStoredExchangeRate, getClientPayments } from '@/lib/supabase';
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
    const [resInvoices, resInvoicePayments, paymentsData, exchangeRate] = await Promise.all([
      fetch(`${url}/rest/v1/invoices?client_id=eq.${encodeURIComponent(clientId)}&select=id,invoice_number,issue_date,total,status,client_id,currency,exchange_rate,created_at,notes&order=issue_date.desc,created_at.desc`, {
        headers,
        cache: 'no-store'
      }),
      fetch(`${url}/rest/v1/invoice_payments?select=invoice_id,amount_applied`, {
        headers,
        cache: 'no-store'
      }).catch(() => null),
      getClientPayments(clientId).catch(() => []),
      getStoredExchangeRate().catch(() => 500)
    ]);

    const invoicesRaw: Record<string, unknown>[] = resInvoices.ok ? await resInvoices.json() : [];
    const invoicePaymentsRaw: Record<string, unknown>[] = resInvoicePayments && resInvoicePayments.ok ? await resInvoicePayments.json() : [];
    const paymentsRaw: Record<string, unknown>[] = Array.isArray(paymentsData) ? paymentsData : [];

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
        id: String(inv.id || ''),
        invoice_number: String(inv.invoice_number || ''),
        issue_date: String(inv.issue_date || ''),
        total: stats.total,
        paid: stats.paid,
        pending: stats.pending,
        status: stats.isAnulada ? 'Anulada' : stats.pending <= 0.01 ? 'Pagada' : stats.paid > 0 ? 'Parcial' : 'Pendiente',
        notes: inv.notes ? String(inv.notes) : undefined,
        items
      };
    });

    // Compute payments total
    let totalPaidUSD = 0;
    paymentsRaw.forEach(p => {
      totalPaidUSD += Number(p.amount || 0);
    });

    // 5. Compute packages awaiting pickup / delivery
    const pendingPackages: Array<{
      id: string;
      tracking_number?: string;
      service_name: string;
      weight?: number | string;
      amount?: number;
      invoice_number?: string;
      invoice_id?: string;
      status: string;
    }> = [];

    const seenTracking = new Set<string>();

    // From pending invoices
    invoices.forEach(inv => {
      if (inv.pending > 0.01) {
        if (inv.items && inv.items.length > 0) {
          inv.items.forEach((it: Record<string, unknown>, idx: number) => {
            const trk = String(it.tracking_number || '').trim();
            if (trk) seenTracking.add(trk.toUpperCase());
            pendingPackages.push({
              id: `${inv.id}-${idx}`,
              tracking_number: trk || undefined,
              service_name: String(it.service_name || 'Paquete Internacional'),
              weight: it.weight ? Number(it.weight) || String(it.weight) : undefined,
              amount: Number(it.amount || 0),
              invoice_number: String(inv.invoice_number || ''),
              invoice_id: String(inv.id || ''),
              status: 'Listo para retiro al cancelar'
            });
          });
        } else {
          // If invoice has no line items, count invoice as 1 package
          pendingPackages.push({
            id: String(inv.id || ''),
            service_name: `Paquetes de Factura #${inv.invoice_number}`,
            amount: Number(inv.total || 0),
            invoice_number: String(inv.invoice_number || ''),
            invoice_id: String(inv.id || ''),
            status: 'Listo para retiro al cancelar'
          });
        }
      }
    });

    // Also check local_inventory for packages in bodega for this client
    try {
      if (client.name) {
        const resInventory = await fetch(
          `${url}/rest/v1/local_inventory?client=ilike.*${encodeURIComponent(client.name)}*&select=id,client,status,weight,company,created_at`,
          { headers, cache: 'no-store' }
        );
        if (resInventory.ok) {
          const invData = await resInventory.json();
          if (Array.isArray(invData)) {
            invData.forEach((item: Record<string, unknown>) => {
              const trk = String(item.id || '').trim();
              const st = String(item.status || 'En Bodega');
              if (st !== 'Entregado' && st !== 'Eliminado') {
                if (!trk || !seenTracking.has(trk.toUpperCase())) {
                  if (trk) seenTracking.add(trk.toUpperCase());
                  let parsedWeight: number | undefined;
                  if (item.weight) {
                    const match = String(item.weight).match(/[\d.]+/);
                    if (match) parsedWeight = parseFloat(match[0]);
                  }
                  pendingPackages.push({
                    id: trk || `inv-${Math.random()}`,
                    tracking_number: trk || undefined,
                    service_name: item.company ? `Paquete (${item.company})` : 'Paquete en Bodega',
                    weight: parsedWeight,
                    status: st
                  });
                }
              }
            });
          }
        }
      }
    } catch (e) {
      console.error('Error fetching local inventory for statement:', e);
    }

    let pendingWeightTotal = 0;
    pendingPackages.forEach(p => {
      if (p.weight) {
        const num = typeof p.weight === 'number' ? p.weight : parseFloat(String(p.weight));
        if (!isNaN(num)) pendingWeightTotal += num;
      }
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
        pendingPackagesCount: pendingPackages.length,
        pendingPackagesWeight: Math.round(pendingWeightTotal * 10) / 10,
        totalInvoicedUSD: Math.round(totalInvoicedUSD * 100) / 100,
        totalPaidUSD: Math.round(totalPaidUSD * 100) / 100,
        exchangeRate: rate
      },
      pendingPackages,
      invoices,
      payments: paymentsRaw
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno al consultar estado de cuenta';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
