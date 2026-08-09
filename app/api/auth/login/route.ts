import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Credenciales hardcodeadas solicitadas por el cliente
    const VALID_USER = 'AdminJRS';
    const VALID_PASS = 'London.0510';

    if (username === VALID_USER && password === VALID_PASS) {
      // Crear respuesta con cookie de autenticación
      const response = NextResponse.json({ success: true }, { status: 200 });
      
      // La cookie durará 24 horas
      response.cookies.set({
        name: 'jrs_admin_auth',
        value: 'authenticated',
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        sameSite: 'lax',
      });

      return response;
    }

    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
