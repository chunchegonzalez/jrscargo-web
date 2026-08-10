import { NextResponse } from 'next/server';
import { deleteUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteUser(params.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Error deleting user' }, { status: 500 });
  }
}
