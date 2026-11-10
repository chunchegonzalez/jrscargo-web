import { NextResponse } from 'next/server';
import { getHeaders } from '@/lib/supabase';
import { normalizeTrackingAlphanumeric, SystemPackageRecord } from '@/lib/package-comparison';

export const dynamic = 'force-dynamic';

// Helper to paginate past PostgREST default limit
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllRows<T = any>(endpointUrl: string): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const MAX_PAGES = 25;
  const allRows: T[] = [];
  const sep = endpointUrl.includes('?') ? '&' : '?';

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const pagedUrl = `${endpointUrl}${sep}limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(pagedUrl, {
      headers: getHeaders(),
      cache: 'no-store'
    });
    if (!res.ok) break;
    const chunk: T[] = await res.json();
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    allRows.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
  }
  return allRows;
}

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!url) {
      return NextResponse.json({ success: false, error: 'Database URL missing' }, { status: 500 });
    }

    // 1. Fetch invoice_items, active invoices and local_inventory in parallel
    const [items, invoices, inventory] = await Promise.all([
      fetchAllRows<{
        id?: string;
        invoice_id: string;
        tracking_number?: string;
        amount?: number | string;
        weight?: number | string;
        rate?: number | string;
        service_name?: string;
      }>(`${url}/rest/v1/invoice_items?select=id,invoice_id,tracking_number,amount,weight,rate,service_name`),

      fetchAllRows<{
        id: string;
        invoice_number: string;
        status: string;
        currency?: string;
        exchange_rate?: number;
        issue_date?: string;
        clients?: { name?: string };
      }>(`${url}/rest/v1/invoices?select=id,invoice_number,status,currency,exchange_rate,issue_date,clients(name)&status=neq.Anulada`),

      fetchAllRows<{
        id: string;
        client?: string;
        status?: string;
        weight?: string;
        company?: string;
        created_at?: string;
      }>(`${url}/rest/v1/local_inventory?id=neq.__JRS_MOBILE_SHELVES_STATE__&select=id,client,status,weight,company,created_at`)
    ]);

    // Map invoices by id
    const invoiceMap = new Map<string, {
      id: string;
      invoice_number: string;
      status: string;
      currency: string;
      exchange_rate?: number;
      issue_date?: string;
      clientName?: string;
    }>();

    for (const inv of invoices) {
      invoiceMap.set(inv.id, {
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status || 'Pendiente',
        currency: inv.currency || 'USD',
        exchange_rate: Number(inv.exchange_rate) || 500,
        issue_date: inv.issue_date || '',
        clientName: inv.clients?.name || ''
      });
    }

    const records: SystemPackageRecord[] = [];
    const seenItemTrackings = new Set<string>();

    // 2. Process invoice_items (actual charged packages)
    for (const it of items) {
      if (!it.tracking_number) continue;
      const rawTrack = String(it.tracking_number).trim();
      const digits = normalizeTrackingAlphanumeric(rawTrack);
      if (!digits) continue;

      const inv = invoiceMap.get(it.invoice_id);
      const rawAmount = it.amount !== undefined && it.amount !== null ? Number(it.amount) : null;

      const record: SystemPackageRecord = {
        id: it.id || rawTrack,
        rawTracking: rawTrack,
        trackingDigits: digits,
        amount: rawAmount !== null && !isNaN(rawAmount) ? rawAmount : null,
        currency: inv?.currency || 'USD',
        invoiceNumber: inv?.invoice_number,
        invoiceId: it.invoice_id,
        invoiceStatus: inv?.status,
        clientName: inv?.clientName,
        serviceName: it.service_name,
        weight: it.weight !== undefined && it.weight !== null ? String(it.weight) : undefined,
        date: inv?.issue_date
      };

      records.push(record);
      seenItemTrackings.add(digits);
    }

    // 3. Process local_inventory packages (to know about packages that are in bodega but not invoiced yet)
    for (const pkg of inventory) {
      const rawTrack = String(pkg.id).trim();
      const digits = normalizeTrackingAlphanumeric(rawTrack);
      if (!digits) continue;

      // If already captured with an invoice amount, don't duplicate as unbilled
      if (seenItemTrackings.has(digits)) continue;

      records.push({
        id: pkg.id,
        rawTracking: rawTrack,
        trackingDigits: digits,
        amount: null, // Sin facturar
        currency: 'USD',
        clientName: pkg.client,
        weight: pkg.weight,
        date: pkg.created_at ? pkg.created_at.slice(0, 10) : undefined
      });
    }

    return NextResponse.json({
      success: true,
      count: records.length,
      packages: records
    });
  } catch (err) {
    console.error('Error in package-charges route:', err);
    return NextResponse.json(
      { success: false, error: 'Error consultando cobros del sistema' },
      { status: 500 }
    );
  }
}
