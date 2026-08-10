import { NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    let validUser = null;
    
    // Check DB first
    const dbUser = await getUserByUsername(username);
    if (dbUser && dbUser.password === password) {
      validUser = { username: dbUser.username, role: dbUser.role };
    } 
    // Fallback if DB is empty or fails, use the hardcoded admin as fallback
    else if (username === 'AdminJRS' && password === 'London.0510') {
      validUser = { username: 'AdminJRS', role: 'admin' };
    }

    if (validUser) {
      const response = NextResponse.json({ success: true, user: validUser }, { status: 200 });
      
      const cookieValue = Buffer.from(JSON.stringify(validUser)).toString('base64');
      
      response.cookies.set({
        name: 'jrs_admin_auth',
        value: cookieValue,
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
