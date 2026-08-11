import { NextResponse } from 'next/server';
import { updateService, deleteService } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    await updateService(params.id, body);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error updating service';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteService(params.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error deleting service';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
