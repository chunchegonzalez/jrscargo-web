// Robust Authentication & Cookie Signing with HMAC-SHA256
// Compatible with Node.js and Next.js Edge Runtime (Web Crypto API)

const AUTH_COOKIE_NAME = 'jrs_admin_auth';
const SESSION_MAX_AGE = 365 * 24 * 60 * 60; // Persistent session (365 days) until manual logout

function getSecret(): string {
  return process.env.AUTH_SECRET || 'jrs-cargo-auth-secure-hmac-key-2026-production';
}

function base64UrlEncode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64url');
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64url').toString('utf-8');
  }
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

async function hmacSign(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacVerify(data: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(data);
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

export interface AuthUser {
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Create a cryptographically signed persistent cookie value
export async function createSignedCookie(user: AuthUser, _remember = true): Promise<{ name: string; value: string; options: Record<string, unknown> }> {
  const now = Math.floor(Date.now() / 1000);
  const maxAge = SESSION_MAX_AGE; // 365 days
  const payloadData: AuthUser = {
    username: user.username,
    role: user.role,
    iat: now,
    exp: now + maxAge,
  };

  const payload = base64UrlEncode(JSON.stringify(payloadData));
  const signature = await hmacSign(payload);
  const value = payload + '.' + signature;

  return {
    name: AUTH_COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge,
      sameSite: 'lax' as const,
    }
  };
}

// Verify HMAC signature, expiration and decode payload
export async function verifySignedCookie(cookieValue: string | undefined | null): Promise<AuthUser | null> {
  if (!cookieValue) return null;

  try {
    const dotIndex = cookieValue.lastIndexOf('.');
    if (dotIndex <= 0) return null;

    const payload = cookieValue.substring(0, dotIndex);
    const signature = cookieValue.substring(dotIndex + 1);

    if (signature.length !== 64 || !/^[0-9a-f]+$/i.test(signature)) {
      return null;
    }

    const isValid = await hmacVerify(payload, signature);
    if (!isValid) return null;

    const decoded = base64UrlDecode(payload);
    const user = JSON.parse(decoded) as AuthUser;

    if (!user.username || !user.role) return null;

    const now = Math.floor(Date.now() / 1000);

    // Check expiration timestamp
    if (user.exp && typeof user.exp === 'number') {
      if (now >= user.exp) {
        return null; // Expired session
      }
    }

    return user;
  } catch {
    return null;
  }
}

// Helper to extract authenticated user from Request headers in API routes
export async function getAuthUserFromRequest(request: Request): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  return await verifySignedCookie(decodeURIComponent(match[1]));
}

// Usuario Master único con control total del sistema (creación, eliminación y cambio de contraseñas de todos)
export function isMasterUser(username?: string | null): boolean {
  if (!username) return false;
  const normalized = username
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  return normalized === 'jose gonzalez';
}

// Master (Jose Gonzalez) o Administrador Pro: acceso total a toda la plataforma
export function isFullAccessUser(user?: { username?: string | null; role?: string | null } | null): boolean {
  if (!user) return false;
  return isMasterUser(user.username) || user.role === 'admin_pro';
}

// Administrador estándar, Administrador Pro o Master
export function isAdminOrPro(user?: { username?: string | null; role?: string | null } | null): boolean {
  if (!user) return false;
  return isFullAccessUser(user) || user.role === 'admin';
}

export function getRoleDisplayName(user?: { username?: string | null; role?: string | null } | null): string {
  if (!user) return 'Usuario';
  if (isMasterUser(user.username)) return 'Master';
  if (user.role === 'admin_pro') return 'Administrador Pro';
  if (user.role === 'admin') return 'Administrador';
  return 'Usuario Regular';
}

// Control de rutas permitidas por rol dentro de /admin
export function canAccessAdminPath(
  pathname: string,
  user?: { username?: string | null; role?: string | null } | null
): boolean {
  if (!user || !pathname) return true;
  if (pathname === '/admin/login') return true;
  if (isFullAccessUser(user)) return true;

  // Todos pueden entrar a /admin/ajustes para ver y cambiar únicamente su propia contraseña
  if (pathname.startsWith('/admin/ajustes')) return true;

  // Operaciones y Tracking: permitidos para todos (Regular, Administrador, Admin Pro, Master)
  if (
    pathname.startsWith('/admin/bodega') ||
    pathname.startsWith('/admin/inventario') ||
    pathname.startsWith('/admin/entregas') ||
    pathname.startsWith('/admin/tracking')
  ) {
    return true;
  }

  // Administrador (estándar): adicionalmente ve solo Compra en sitio web, Cuentas por cobrar y Facturas a Clientes
  if (user.role === 'admin') {
    if (
      pathname.startsWith('/admin/compra-en-sitio-web') ||
      pathname.startsWith('/admin/cuentas-por-cobrar') ||
      pathname.startsWith('/admin/facturacion')
    ) {
      return true;
    }
  }

  return false;
}

export { AUTH_COOKIE_NAME, SESSION_MAX_AGE };
