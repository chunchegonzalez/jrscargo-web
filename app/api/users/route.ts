import { NextResponse } from 'next/server';
import { getUsers, createUser } from '@/lib/supabase';
import { getAuthUserFromRequest, isMasterUser } from '@/lib/auth';
import { isHashed } from '@/lib/password';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const namesOnly = searchParams.get('namesOnly') === 'true';

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Sesión requerida' }, { status: 401 });
    }

    const master = isMasterUser(authUser.username);
    const data = await getUsers();

    if (namesOnly) {
      const safeUsers = (data || []).map((u: Record<string, unknown>) => ({
        id: String(u.id || ''),
        username: String(u.username || '').trim(),
        role: String(u.role || 'operator'),
      })).filter((u: { username: string }) => Boolean(u.username));

      return NextResponse.json(
        {
          success: true,
          currentUser: authUser.username,
          isMaster: master,
          data: safeUsers,
        },
        { status: 200 }
      );
    }

    const authNorm = authUser.username.trim().toLowerCase();

    // Master ve todos los usuarios y todas las contraseñas.
    // Otros admins ven la lista pero solo su propia contraseña.
    // Usuarios regulares solo ven su propia cuenta y su propia contraseña.
    const visibleRows = master || authUser.role === 'admin'
      ? (data || [])
      : (data || []).filter((u: Record<string, unknown>) => String(u.username || '').trim().toLowerCase() === authNorm);

    const formatted = visibleRows.map((u: Record<string, unknown>) => {
      const uname = String(u.username || '').trim();
      const isSelf = uname.toLowerCase() === authNorm;
      const canSeePassword = master || isSelf;
      const rawPassword = canSeePassword && typeof u.password === 'string' ? u.password : '';
      return {
        ...u,
        password: rawPassword,
        isHashed: canSeePassword ? isHashed(rawPassword) : false,
        isMasterAccount: isMasterUser(uname),
        canManagePassword: canSeePassword,
      };
    });

    return NextResponse.json(
      {
        success: true,
        currentUser: authUser.username,
        isMaster: master,
        data: formatted,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ success: false, error: 'Error fetching users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser || !isMasterUser(authUser.username)) {
      return NextResponse.json(
        { success: false, error: 'Solo el usuario Master (Jose Gonzalez) puede crear nuevos usuarios' },
        { status: 403 }
      );
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
