import { NextResponse } from 'next/server';
import { getInventory, insertInventoryItem } from '@/lib/supabase';

export async function GET() {
  try {
    const data = await getInventory();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error fetching inventory' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await insertInventoryItem(body);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error inserting item' }, { status: 500 });
  }
}
