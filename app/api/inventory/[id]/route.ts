import { NextResponse } from 'next/server';
import { getInventoryItem, updateInventoryItem } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await getInventoryItem(params.id);
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error fetching item' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const data = await updateInventoryItem(params.id, body);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error updating item' }, { status: 500 });
  }
}
