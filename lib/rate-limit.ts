// In-memory rate limiter for brute force protection
// Tracks failed login attempts per IP

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil: number;
}

const attempts = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes block

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts.entries()) {
    if (now - entry.firstAttempt > WINDOW_MS && now > entry.blockedUntil) {
      attempts.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function isRateLimited(ip: string): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry) {
    return { limited: false, retryAfterSeconds: 0 };
  }

  // Check if currently blocked
  if (entry.blockedUntil > now) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return { limited: true, retryAfterSeconds: retryAfter };
  }

  // Reset if window expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    attempts.delete(ip);
    return { limited: false, retryAfterSeconds: 0 };
  }

  return { limited: false, retryAfterSeconds: 0 };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now, blockedUntil: 0 });
    return;
  }

  entry.count++;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
  }

  attempts.set(ip, entry);
}

export function resetAttempts(ip: string): void {
  attempts.delete(ip);
}
