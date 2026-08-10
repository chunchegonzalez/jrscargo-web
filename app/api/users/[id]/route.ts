import { NextResponse } from 'next/server';
import { deleteUser, updateUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteUser(params.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Error deleting user' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    await updateUser(params.id, body);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error updating user';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
