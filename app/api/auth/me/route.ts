import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySignedCookie, AUTH_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
    
    if (!authCookie || !authCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    // Verify HMAC signature
    const user = await verifySignedCookie(authCookie.value);
    
    if (!user) {
      // Invalid or tampered cookie - clear it
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }
    
    return NextResponse.json({ authenticated: true, user }, { status: 200 });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
