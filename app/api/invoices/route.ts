import { NextResponse } from 'next/server';
import { getInvoices, createInvoice } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getInvoices();
    return NextResponse.json({ success: true, data }, { status: 200 });
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
