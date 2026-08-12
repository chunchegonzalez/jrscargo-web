import { NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/supabase';
import { verifyPassword, isHashed, hashPassword } from '@/lib/password';
import { createSignedCookie } from '@/lib/auth';
import { isRateLimited, recordFailedAttempt, resetAttempts } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    // Check rate limit
    const rateCheck = isRateLimited(ip);
    if (rateCheck.limited) {
      return NextResponse.json(
        { error: 'Demasiados intentos fallidos. Intente de nuevo en ' + rateCheck.retryAfterSeconds + ' segundos.' },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 });
    }

    let validUser = null;
    
    // Check DB
    const dbUser = await getUserByUsername(username);
    if (dbUser) {
      let passwordValid = false;
      
      if (isHashed(dbUser.password)) {
        // Password is already hashed - verify with PBKDF2
        passwordValid = await verifyPassword(password, dbUser.password);
      } else {
        // Legacy plain text password - verify and upgrade to hash
        if (dbUser.password === password) {
          passwordValid = true;
          // Upgrade password to hash in background
          try {
            const hashedPw = await hashPassword(password);
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
            await fetch(url + '/rest/v1/admin_users?username=eq.' + encodeURIComponent(username), {
              method: 'PATCH',
              headers: {
                'apikey': key,
                'Authorization': 'Bearer ' + key,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ password: hashedPw })
            });
          } catch {
            // Non-critical - password will be upgraded on next login
          }
        }
      }

      if (passwordValid) {
        validUser = { username: dbUser.username, role: dbUser.role };
      }
    }

    if (validUser) {
      // Reset rate limit on successful login
      resetAttempts(ip);

      const response = NextResponse.json({ success: true, user: validUser }, { status: 200 });
      
      // Create signed cookie
      const cookie = await createSignedCookie(validUser);
      response.cookies.set({
        name: cookie.name,
        value: cookie.value,
        httpOnly: cookie.options.httpOnly as boolean,
        secure: cookie.options.secure as boolean,
        path: cookie.options.path as string,
        maxAge: cookie.options.maxAge as number,
        sameSite: cookie.options.sameSite as 'lax',
      });

      return response;
    }

    // Record failed attempt
    recordFailedAttempt(ip);

    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
