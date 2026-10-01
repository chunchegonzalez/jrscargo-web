import { NextResponse } from 'next/server';
import { getHeaders, getStoredExchangeRate, getClientPayments } from '@/lib/supabase';
import { getInvoiceStats } from '@/lib/billing';

export const dynamic = 'force-dynamic';

function detectPackageUnit(serviceName?: string, weight?: string | number): string {
  const wStr = String(weight || '').toLowerCase();
  if (wStr.includes('kg') || wStr.includes('kilo')) return 'kg';
  if (wStr.includes('ft') || wStr.includes('pie')) return 'ft³';
  if (wStr.includes('und') || wStr.includes('unidad')) return 'und';
  if (wStr.includes('lb')) return 'lb';

  const sUpper = String(serviceName || '').toUpperCase();
  if (sUpper.includes('COMPRA') || sUpper.includes('SITIO WEB')) return 'und';
  if (sUpper.includes('MARITIMO') || sUpper.includes('MARÍTIMO') || sUpper.includes('FT3') || sUpper.includes('PIE') || sUpper.includes('CUBIC')) return 'ft³';
  if (sUpper.includes('MAYORISTA AEREO') || sUpper.includes('MAYORISTA AÉREO') || sUpper.includes('MADRID') || sUpper.includes('KILO') || sUpper.includes('KG')) return 'kg';
  return 'lb';
}

function parseNumericWeight(weight?: string | number): number | undefined {
  if (weight === undefined || weight === null || weight === '') return undefined;
  if (typeof weight === 'number') return isNaN(weight) ? undefined : weight;
  const match = String(weight).match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

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
    const [resInvoices, resInvoicePayments, paymentsData, exchangeRate, resInventory] = await Promise.all([
      fetch(`${url}/rest/v1/invoices?client_id=eq.${encodeURIComponent(clientId)}&select=id,invoice_number,issue_date,total,status,client_id,currency,exchange_rate,created_at,notes&order=issue_date.desc,created_at.desc`, {
        headers,
        cache: 'no-store'
      }),
      fetch(`${url}/rest/v1/invoice_payments?select=invoice_id,amount_applied`, {
        headers,
        cache: 'no-store'
      }).catch(() => null),
      getClientPayments(clientId).catch(() => []),
      getStoredExchangeRate().catch(() => 500),
      fetch(`${url}/rest/v1/local_inventory?select=id,client,status,weight,company,created_at&order=created_at.desc`, {
        headers,
        cache: 'no-store'
      }).catch(() => null)
    ]);

    const invoicesRaw: Record<string, unknown>[] = resInvoices.ok ? await resInvoices.json() : [];
    const invoicePaymentsRaw: Record<string, unknown>[] = resInvoicePayments && resInvoicePayments.ok ? await resInvoicePayments.json() : [];
    const paymentsRaw: Record<string, unknown>[] = Array.isArray(paymentsData) ? paymentsData : [];
    const localInventoryItems: Record<string, unknown>[] = resInventory && resInventory.ok ? await resInventory.json() : [];

    // Map payments to invoices
    const paymentsMap = new Map<string, Array<Record<string, unknown>>>();
    for (const p of invoicePaymentsRaw) {
      const invId = String(p.invoice_id);
      if (!paymentsMap.has(invId)) paymentsMap.set(invId, []);
      paymentsMap.get(invId)!.push(p);
    }

    // 3. Fetch invoice items for these invoices
    const invoiceIds: string[] = invoicesRaw.map((inv: Record<string, unknown>) => String(inv.id));
    const itemsMap = new Map<string, Array<Record<string, unknown>>>();

    if (invoiceIds.length > 0) {
      const filterInvoices = invoiceIds.map((id: string) => `"${id}"`).join(',');
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

    const invoices = invoicesRaw.map((inv: Record<string, unknown>) => {
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
    paymentsRaw.forEach((p: Record<string, unknown>) => {
      totalPaidUSD += Number(p.amount || 0);
    });

    // Current month calculation (for monthly stats)
    const now = new Date();
    const currYear: number = now.getFullYear();
    const currMonth: number = now.getMonth();

    let monthlyInvoicedUSD = 0;
    for (const inv of invoicesRaw) {
      if (inv.issue_date) {
        const d = new Date(String(inv.issue_date));
        if (!isNaN(d.getTime()) && d.getFullYear() === currYear && d.getMonth() === currMonth) {
          const stats = getInvoiceStats(inv);
          if (!stats.isAnulada) {
            monthlyInvoicedUSD += stats.total;
          }
        }
      }
    }

    let monthlyPaidUSD = 0;
    for (const p of paymentsRaw) {
      if (p.payment_date) {
        const d = new Date(String(p.payment_date));
        if (!isNaN(d.getTime()) && d.getFullYear() === currYear && d.getMonth() === currMonth) {
          monthlyPaidUSD += Number(p.amount || 0);
        }
      }
    }

    // 5. Index tracking numbers across client's invoices
    interface ClientInvoiceItemRef {
      invoice_id: string;
      invoice_number: string;
      service_name: string;
      weight?: number | string;
      rate?: number | string;
      amount: number;
      is_pending: boolean;
    }
    const invoiceItemsByTracking = new Map<string, ClientInvoiceItemRef>();
    for (const inv of invoices) {
      const isPending = inv.pending > 0.01;
      (inv.items || []).forEach((it: Record<string, unknown>) => {
        const trk = String(it.tracking_number || '').trim().toUpperCase();
        if (trk) {
          invoiceItemsByTracking.set(trk, {
            invoice_id: String(inv.id),
            invoice_number: String(inv.invoice_number),
            service_name: String(it.service_name || 'Paquete Internacional'),
            weight: it.weight !== undefined ? (it.weight as string | number) : undefined,
            rate: it.rate !== undefined ? (it.rate as string | number) : undefined,
            amount: Number(it.amount || 0),
            is_pending: isPending
          });
        }
      });
    }

    // Index local_inventory by tracking
    const inventoryMap = new Map<string, Record<string, unknown>>();
    localInventoryItems.forEach((item: Record<string, unknown>) => {
      const trk = String(item.id || '').trim().toUpperCase();
      if (trk) {
        inventoryMap.set(trk, item);
      }
    });

    // Client name matching helper
    const clientNameNorm: string = String(client.name || '').toLowerCase().trim();
    const isClientMatch = (invClientName?: string): boolean => {
      if (!invClientName || !clientNameNorm) return false;
      const target: string = invClientName.toLowerCase().trim();
      if (target === clientNameNorm) return true;
      const parts: string[] = clientNameNorm.split(/\s+/).filter((p: string) => p.length >= 3);
      if (parts.length >= 2 && parts.every((p: string) => target.includes(p))) return true;
      return target.includes(clientNameNorm);
    };

    // 6. Compute packages awaiting pickup (strictly in bodega, NOT delivered)
    const pendingPackages: Array<{
      id: string;
      tracking_number?: string;
      service_name: string;
      weight?: number | string;
      unit: string;
      amount?: number;
      invoice_number?: string;
      invoice_id?: string;
      status: string;
    }> = [];

    const processedTrackings = new Set<string>();

    // A. Check local_inventory for packages belonging to this client that are in bodega
    localInventoryItems.forEach((item: Record<string, unknown>) => {
      const trk = String(item.id || '').trim().toUpperCase();
      if (!trk || processedTrackings.has(trk)) return;

      const rawStatus = String(item.status || '').trim();
      const stLower = rawStatus.toLowerCase();

      // If status is 'Entregado' or 'Eliminado', it has already been delivered / removed
      if (stLower.includes('entregad') || stLower.includes('eliminad')) {
        processedTrackings.add(trk);
        return;
      }

      // Check if package is physically in bodega
      const isInBodega = stLower.includes('bodega') || rawStatus === 'En Bodega';

      // Verify that this package belongs to the client (by invoice tracking or client name)
      const matchedInvoiceItem = invoiceItemsByTracking.get(trk);
      const matchedByName = isClientMatch(String(item.client || ''));

      if ((matchedInvoiceItem || matchedByName) && isInBodega) {
        processedTrackings.add(trk);

        const sName = matchedInvoiceItem?.service_name || (item.company ? `Paquete (${item.company})` : 'Paquete en Bodega');
        const rawWeight = item.weight || matchedInvoiceItem?.weight;
        const numWeight = parseNumericWeight(rawWeight as string | number);
        const unit = detectPackageUnit(sName, rawWeight as string | number);

        pendingPackages.push({
          id: trk,
          tracking_number: trk,
          service_name: sName,
          weight: numWeight !== undefined ? numWeight : (rawWeight ? String(rawWeight) : undefined),
          unit,
          amount: matchedInvoiceItem?.amount,
          invoice_number: matchedInvoiceItem?.invoice_number,
          invoice_id: matchedInvoiceItem?.invoice_id,
          status: 'En Bodega'
        });
      }
    });

    // B. Check pending invoices: If localInventory had 0 records (fallback), list pending invoice items
    if (localInventoryItems.length === 0) {
      for (const inv of invoices) {
        if (inv.pending > 0.01) {
          (inv.items || []).forEach((it: Record<string, unknown>, idx: number) => {
            const trk = String(it.tracking_number || '').trim().toUpperCase();
            if (trk && !processedTrackings.has(trk)) {
              processedTrackings.add(trk);
              const sName = String(it.service_name || 'Paquete Internacional');
              const numWeight = parseNumericWeight(it.weight as string | number);
              const unit = detectPackageUnit(sName, it.weight as string | number);
              pendingPackages.push({
                id: `${inv.id}-${idx}`,
                tracking_number: trk,
                service_name: sName,
                weight: numWeight !== undefined ? numWeight : (it.weight ? String(it.weight) : undefined),
                unit,
                amount: Number(it.amount || 0),
                invoice_number: String(inv.invoice_number || ''),
                invoice_id: String(inv.id || ''),
                status: 'En Bodega'
              });
            }
          });
        }
      }
    }

    let pendingWeightTotal = 0;
    for (const p of pendingPackages) {
      if (p.weight) {
        const num = typeof p.weight === 'number' ? p.weight : parseFloat(String(p.weight));
        if (!isNaN(num)) pendingWeightTotal += num;
      }
    }

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
        monthlyInvoicedUSD: Math.round(monthlyInvoicedUSD * 100) / 100,
        monthlyPaidUSD: Math.round(monthlyPaidUSD * 100) / 100,
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
