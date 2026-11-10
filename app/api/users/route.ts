import { NextResponse } from 'next/server';
import { getUsers, createUser } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/auth';
import { isHashed } from '@/lib/password';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Requiere permisos de administrador' }, { status: 403 });
    }

    const data = await getUsers();
    const formatted = (data || []).map((u: Record<string, unknown>) => {
      const rawPassword = typeof u.password === 'string' ? u.password : '';
      return {
        ...u,
        password: rawPassword,
        isHashed: isHashed(rawPassword)
      };
    });

    return NextResponse.json({ success: true, data: formatted }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Error fetching users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Requiere permisos de administrador' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, role } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Usuario y contraseña son requeridos' }, { status: 400 });
    }

    const cleanPassword = String(password).trim();

    await createUser({
      username: String(username).trim(),
      password: cleanPassword,
      role: role || 'operator'
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error creating user';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
