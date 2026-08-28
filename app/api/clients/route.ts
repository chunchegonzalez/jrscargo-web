import { NextResponse } from 'next/server';
import { getClients, createClient } from '@/lib/supabase';
import { parseClientAddress, formatClientAddress } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getClients();
    const normalized = (data || []).map((c: Record<string, unknown>) => {
      const extra = parseClientAddress(c.address as string);
      return {
        ...c,
        cedula: extra.cedula,
        discount_percent: extra.discount_percent,
        address: extra.raw_address,
        raw_address: extra.raw_address
      };
    });

    return NextResponse.json({ success: true, data: normalized }, {
      status: 200,
      headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=60' }
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error fetching clients';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Package cedula, discount_percent, and address cleanly
    const formattedAddress = formatClientAddress({
      cedula: body.cedula,
      discount_percent: body.discount_percent,
      address: body.address || body.raw_address || ''
    });

    const payload = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      address: formattedAddress
    };

    await createClient(payload);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error creating client';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
