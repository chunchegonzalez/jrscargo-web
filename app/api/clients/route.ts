import { NextResponse } from 'next/server';
import { getClients, createClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getClients();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error fetching clients';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await createClient(body);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error creating client';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
