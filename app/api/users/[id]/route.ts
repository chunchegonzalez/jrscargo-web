import { NextResponse } from 'next/server';
import { deleteUser, updateUser } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Requiere permisos de administrador' }, { status: 403 });
    }

    await deleteUser(params.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Error deleting user' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Requiere permisos de administrador' }, { status: 403 });
    }

    const body = await request.json();
    const updates = { ...body };

    if (updates.password && typeof updates.password === 'string' && updates.password.trim().length > 0) {
      updates.password = await hashPassword(updates.password.trim());
    } else {
      delete updates.password;
    }

    await updateUser(params.id, updates);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error updating user';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
