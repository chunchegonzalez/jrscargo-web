import { NextResponse } from 'next/server';
import { getHeaders } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const res = await fetch(`${url}/rest/v1/clients?id=eq.${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body)
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
