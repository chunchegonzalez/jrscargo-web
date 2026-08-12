// Cookie signing and verification using HMAC-SHA256
// Uses Web Crypto API (no external dependencies)

const AUTH_COOKIE_NAME = 'jrs_admin_auth';
const COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

function getSecret(): string {
  return process.env.AUTH_SECRET || 'jrs-cargo-default-secret-change-in-production-2026';
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
}

// Create a signed cookie value
export async function createSignedCookie(user: AuthUser): Promise<{ name: string; value: string; options: Record<string, unknown> }> {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64');
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
      sameSite: 'lax' as const
    }
  };
}

// Verify and decode a signed cookie value
export async function verifySignedCookie(cookieValue: string): Promise<AuthUser | null> {
  try {
    const dotIndex = cookieValue.lastIndexOf('.');
    if (dotIndex === -1) return null;

    const payload = cookieValue.substring(0, dotIndex);
    const signature = cookieValue.substring(dotIndex + 1);

    const isValid = await hmacVerify(payload, signature);
    if (!isValid) return null;

    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    const user = JSON.parse(decoded) as AuthUser;

    if (!user.username || !user.role) return null;

    return user;
  } catch {
    return null;
  }
}

// Lightweight verification for middleware (just checks signature format)
export function quickVerifyCookieFormat(cookieValue: string): boolean {
  const dotIndex = cookieValue.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const signature = cookieValue.substring(dotIndex + 1);
  // HMAC-SHA256 signature should be 64 hex chars
  return signature.length === 64 && /^[0-9a-f]+$/.test(signature);
}

export { AUTH_COOKIE_NAME };
