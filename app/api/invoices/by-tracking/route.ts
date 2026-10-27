import { NextResponse } from 'next/server';
import { getHeaders } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tracking = searchParams.get('tracking');

    if (!tracking) {
      return NextResponse.json({ success: false, error: 'Missing tracking parameter' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

    const cleanTracking = tracking.trim();

    // Query invoice_items directly for this tracking number
    let itemsRes = await fetch(
      `${url}/rest/v1/invoice_items?tracking_number=ilike.*${encodeURIComponent(cleanTracking)}*&select=invoice_id,tracking_number,service_name,amount,weight,rate`, {
        headers: getHeaders(),
        cache: 'no-store'
      }
    );

    let items = itemsRes.ok ? await itemsRes.json() : [];

    // Fallback: strip USPS 420XXXXX prefix if not found
    if (!items || items.length === 0) {
      const stripped = cleanTracking.replace(/^420(?:\d{9}|\d{5})(?=9\d{14,})/i, '').replace(/^420\d{5}/i, '');
      if (stripped && stripped !== cleanTracking && stripped.length >= 8) {
        const fallbackRes = await fetch(
          `${url}/rest/v1/invoice_items?tracking_number=ilike.*${encodeURIComponent(stripped)}*&select=invoice_id,tracking_number,service_name,amount,weight,rate`, {
            headers: getHeaders(),
            cache: 'no-store'
          }
        );
        if (fallbackRes.ok) {
          items = await fallbackRes.json();
        }
      }
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    // Find the best matching item
    const qClean = cleanTracking.toUpperCase().replace(/\s+/g, '');
    const matchedItem = items.find((it: { tracking_number?: string }) => {
      const tClean = (it.tracking_number || '').toUpperCase().replace(/\s+/g, '');
      return tClean === qClean || tClean.includes(qClean) || qClean.includes(tClean);
    }) || items[0];

    // Fetch the invoice for the match
    const invoiceId = matchedItem.invoice_id;
    const invRes = await fetch(
      `${url}/rest/v1/invoices?id=eq.${encodeURIComponent(invoiceId)}&select=id,invoice_number,status,total,currency,issue_date,clients(name)`, {
        headers: getHeaders(),
        cache: 'no-store'
      }
    );

    if (!invRes.ok) {
      return NextResponse.json({ success: true, data: null });
    }

    const invData = await invRes.json();
    if (!invData || invData.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    const inv = invData[0];
    return NextResponse.json({
      success: true,
      data: {
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status || 'Pendiente',
        total: Number(inv.total) || 0,
        currency: inv.currency || 'USD',
        issue_date: inv.issue_date || '',
        client_name: inv.clients?.name || '',
        // Package specific line item details
        package_amount: matchedItem.amount !== undefined && matchedItem.amount !== null ? Number(matchedItem.amount) : null,
        package_weight: matchedItem.weight !== undefined && matchedItem.weight !== null ? String(matchedItem.weight) : null,
        package_rate: matchedItem.rate !== undefined && matchedItem.rate !== null ? String(matchedItem.rate) : null,
        package_service: matchedItem.service_name || '',
        package_tracking: matchedItem.tracking_number || cleanTracking
      }
    });
  } catch {
    return NextResponse.json({ success: true, data: null });
  }
}
