import { NextResponse } from 'next/server';
import { getHeaders, getClientInvoices, getClientPayments } from '@/lib/supabase';
import { parseClientAddress, formatClientAddress } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    
    // Fetch Client Basic Info
    const res = await fetch(`${url}/rest/v1/clients?id=eq.${id}`, {
      headers: getHeaders(),
      cache: 'no-store'
    });
    
    if (!res.ok) throw new Error('Error fetching client');
    const clientsData = await res.json();
    if (!clientsData.length) throw new Error('Client not found');
    const rawClient = clientsData[0];

    const extra = parseClientAddress(rawClient.address);
    const client = {
      ...rawClient,
      cedula: extra.cedula,
      discount_percent: extra.discount_percent,
      address: extra.raw_address,
      raw_address: extra.raw_address
    };

    // Fetch Client Invoices and Payments
    const [invoices, payments] = await Promise.all([
      getClientInvoices(id).catch(() => []),
      getClientPayments(id).catch(() => [])
    ]);

    return NextResponse.json({ success: true, client, invoices, payments }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error fetching client details';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    
    const formattedAddress = formatClientAddress({
      cedula: body.cedula,
      discount_percent: body.discount_percent,
      address: body.address || body.raw_address || ''
    });

    const payload: Record<string, unknown> = {
      address: formattedAddress
    };

    if (body.name !== undefined) payload.name = body.name;
    if (body.email !== undefined) payload.email = body.email;
    if (body.phone !== undefined) payload.phone = body.phone;
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const res = await fetch(`${url}/rest/v1/clients?id=eq.${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('Error updating client');
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error updating client';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const res = await fetch(`${url}/rest/v1/clients?id=eq.${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.code === '23503') {
        throw new Error('No se puede eliminar el cliente porque tiene facturas o pagos asociados. Elimine primero los registros contables.');
      }
      throw new Error('Error al eliminar el cliente');
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error eliminando cliente';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
