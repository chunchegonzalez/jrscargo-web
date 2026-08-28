import { NextResponse } from 'next/server';
import { getInventory, insertInventoryItem } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getInventory();
    const response = NextResponse.json({ success: true, data }, { status: 200 });
    response.headers.set('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Error fetching inventory' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await insertInventoryItem(body);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inserting item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
