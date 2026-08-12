import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PAGE_PREFIX = '/admin';
const PROTECTED_API_PREFIXES = [
  '/api/invoices',
  '/api/clients',
  '/api/payments',
  '/api/packages',
  '/api/services',
  '/api/settings',
  '/api/expenses',
];

// Public API routes (no auth required)
const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/contact',
  '/api/chat',
  '/api/tracking',
  '/api/monitor',
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));
}

function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

function isValidSignedCookie(cookieValue: string): boolean {
  // Quick format check: should be base64data.hmac_signature
  const dotIndex = cookieValue.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === 0) return false;
  
  const signature = cookieValue.substring(dotIndex + 1);
  // HMAC-SHA256 = 64 hex chars
  if (signature.length !== 64) return false;
  if (!/^[0-9a-f]+$/.test(signature)) return false;
  
  // Check payload is valid base64
  const payload = cookieValue.substring(0, dotIndex);
  try {
    const decoded = atob(payload);
    const parsed = JSON.parse(decoded);
    return !!(parsed.username && parsed.role);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get('jrs_admin_auth');

  // Protect admin pages (except login)
  if (pathname.startsWith(PROTECTED_PAGE_PREFIX) && !pathname.startsWith('/admin/login')) {
    if (!authCookie || !authCookie.value || !isValidSignedCookie(authCookie.value)) {
      // Clear invalid cookie and redirect to login
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      if (authCookie) {
        response.cookies.delete('jrs_admin_auth');
      }
      return response;
    }
  }

  // Protect admin API routes
  if (isProtectedApiRoute(pathname) && !isPublicApiRoute(pathname)) {
    if (!authCookie || !authCookie.value || !isValidSignedCookie(authCookie.value)) {
      return NextResponse.json(
        { error: 'No autorizado' },
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
