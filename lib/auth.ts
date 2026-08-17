// Robust Authentication & Cookie Signing with HMAC-SHA256
// Compatible with Node.js and Next.js Edge Runtime (Web Crypto API)

const AUTH_COOKIE_NAME = 'jrs_admin_auth';
const COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

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
  exp?: number;
}

// Create a cryptographically signed cookie value with expiration
export async function createSignedCookie(user: AuthUser): Promise<{ name: string; value: string; options: Record<string, unknown> }> {
  const now = Math.floor(Date.now() / 1000);
  const payloadData: AuthUser = {
    username: user.username,
    role: user.role,
    exp: now + COOKIE_MAX_AGE,
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
      maxAge: COOKIE_MAX_AGE,
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

    // Check expiration timestamp
    if (user.exp && typeof user.exp === 'number') {
      const now = Math.floor(Date.now() / 1000);
      if (now > user.exp) {
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

export { AUTH_COOKIE_NAME };
