import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Solo proteger rutas que empiecen con /admin (y que no sea la de login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const authCookie = request.cookies.get('jrs_admin_auth');
    
    if (!authCookie || authCookie.value !== 'authenticated') {
      // Redirigir al login si no está autenticado
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
