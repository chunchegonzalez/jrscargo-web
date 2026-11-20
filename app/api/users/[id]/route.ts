import { NextResponse } from 'next/server';
import { deleteUser, getUsers, updateUser } from '@/lib/supabase';
import { getAuthUserFromRequest, isMasterUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser || !isMasterUser(authUser.username)) {
      return NextResponse.json(
        { success: false, error: 'Solo el usuario Master (Jose Gonzalez) puede eliminar usuarios' },
        { status: 403 }
      );
    }

    const allUsers = await getUsers();
    const target = (allUsers || []).find((u: Record<string, unknown>) => String(u.id) === String(params.id));
    if (target && isMasterUser(String(target.username || ''))) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar la cuenta del usuario Master' },
        { status: 400 }
      );
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
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Sesión requerida' }, { status: 401 });
    }

    const master = isMasterUser(authUser.username);
    const allUsers = await getUsers();
    const target = (allUsers || []).find((u: Record<string, unknown>) => String(u.id) === String(params.id));

    if (!target) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const isSelf = String(target.username || '').trim().toLowerCase() === authUser.username.trim().toLowerCase();

    if (!master && !isSelf) {
      return NextResponse.json(
        { success: false, error: 'Solo el usuario Master (Jose Gonzalez) puede cambiar contraseñas de otros usuarios' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = master ? { ...body } : {};

    if (body.password && typeof body.password === 'string' && body.password.trim().length > 0) {
      updates.password = body.password.trim();
    } else {
      delete updates.password;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No se enviaron cambios válidos' }, { status: 400 });
    }

    await updateUser(params.id, updates);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error updating user';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
