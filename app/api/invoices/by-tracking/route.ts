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

    // Query invoice_items directly for this tracking number
    const itemsRes = await fetch(
      `${url}/rest/v1/invoice_items?tracking_number=ilike.*${encodeURIComponent(tracking)}*&select=invoice_id,tracking_number,service_name,amount`, {
        headers: getHeaders(),
        cache: 'no-store'
      }
    );

    if (!itemsRes.ok) {
      return NextResponse.json({ success: true, data: null });
    }

    const items = await itemsRes.json();
    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    // Fetch the invoice for the first match
    const invoiceId = items[0].invoice_id;
    const invRes = await fetch(
      `${url}/rest/v1/invoices?id=eq.${encodeURIComponent(invoiceId)}&select=id,invoice_number,status,total,currency,issue_date,clients(name)`, {
        headers: getHeaders(),
        cache: 'no-store'
      }
    );

    if (!invRes.ok || !invRes) {
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
        client_name: inv.clients?.name || ''
      }
    });
  } catch {
    return NextResponse.json({ success: true, data: null });
  }
}
