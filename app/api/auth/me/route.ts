import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('jrs_admin_auth');
    
    if (!authCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    let data;
    try {
      const dataStr = Buffer.from(authCookie.value, 'base64').toString('utf-8');
      data = JSON.parse(dataStr);
    } catch {
      // Fallback for old cookie 'authenticated' string during transition
      data = { username: 'AdminJRS', role: 'admin' };
    }
    
    return NextResponse.json({ authenticated: true, user: data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
