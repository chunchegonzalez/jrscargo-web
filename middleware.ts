import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySignedCookie, AUTH_COOKIE_NAME } from '@/lib/auth';

// Explicit public API endpoints that do not require admin authentication
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/contact',
  '/api/chat',
  '/api/tracking',
  '/api/monitor',
  '/api/monitor/quotes',
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);

  // 1. Protect Admin Pages (/admin/* except /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const user = await verifySignedCookie(authCookie?.value);
    
    if (!user) {
      const loginUrl = new URL('/admin/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      if (authCookie) {
        response.cookies.delete(AUTH_COOKIE_NAME);
      }
      return response;
    }
  }

  // 2. Protect API Routes (Default Deny for /api/*)
  if (pathname.startsWith('/api') && !isPublicApiRoute(pathname)) {
    const user = await verifySignedCookie(authCookie?.value);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Sesión requerida.' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
  ],
};
