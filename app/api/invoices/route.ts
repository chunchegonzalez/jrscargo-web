import { NextResponse } from 'next/server';
import { getInvoices, createInvoice } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeItems = searchParams.get('includeItems') === 'true';
    const data = await getInvoices({ includeItems });
    const response = NextResponse.json({ success: true, data }, { status: 200 });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error fetching invoices';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, ...invoice } = body;
    const result = await createInvoice(invoice, items || []);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error creating invoice';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
