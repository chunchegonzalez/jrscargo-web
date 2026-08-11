import { NextResponse } from 'next/server';
import { getInvoiceById, updateInvoice, updateInvoiceWithItems } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await getInvoiceById(params.id);
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error fetching invoice';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    
    // Si viene con items, usamos updateInvoiceWithItems
    if (body.items && Array.isArray(body.items)) {
      const { items, ...updates } = body;
      await updateInvoiceWithItems(params.id, updates, items);
    } else {
      // Si no, simplemente actualizamos la factura
      await updateInvoice(params.id, body);
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error updating invoice';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
