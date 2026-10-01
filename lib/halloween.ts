/**
 * JRS CARGO - Halloween Theme Controller
 * Timezone: America/Costa_Rica
 * 
 * Active period:
 * - Active from now until November 1, 2026 at 23:59:59 (America/Costa_Rica).
 * - Automatically deactivates on November 2, 2026 at 00:00:00 (America/Costa_Rica).
 * 
 * Manual override options:
 * 1. URL parameter: ?halloween=true or ?halloween=false
 * 2. LocalStorage: localStorage.setItem('halloween_override', 'true' | 'false')
 * 3. Code toggle: HALLOWEEN_MANUAL_OVERRIDE (set to true or false below, null for automatic date mode)
 */

// Developer toggle: Set to `true` to force enable, `false` to force disable, or `null` for automatic date schedule.
export const HALLOWEEN_MANUAL_OVERRIDE: boolean | null = null;

// Cutoff timestamp: 2026-11-02 00:00:00 in America/Costa_Rica
export const HALLOWEEN_END_YEAR = 2026;
export const HALLOWEEN_END_MONTH = 11; // November
export const HALLOWEEN_END_DAY = 2;
export const HALLOWEEN_END_HOUR = 0;
export const HALLOWEEN_END_MINUTE = 0;
export const HALLOWEEN_END_SECOND = 0;

/**
 * Returns date parts in America/Costa_Rica timezone
 */
export function getCostaRicaDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string): number => {
      const p = parts.find((pt) => pt.type === type);
      return p ? parseInt(p.value, 10) : 0;
    };

    let hour = getPart('hour');
    if (hour === 24) hour = 0;

    return {
      year: getPart('year'),
      month: getPart('month'),
      day: getPart('day'),
      hour,
      minute: getPart('minute'),
      second: getPart('second'),
    };
  } catch (err) {
    // Fallback in case Intl timezone is unavailable in rare environments
    // Costa Rica is UTC-6 all year round (no daylight saving time)
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    const crTime = new Date(utcTime - 6 * 3600000);
    return {
      year: crTime.getFullYear(),
      month: crTime.getMonth() + 1,
      day: crTime.getDate(),
      hour: crTime.getHours(),
      minute: crTime.getMinutes(),
      second: crTime.getSeconds(),
    };
  }
}

/**
 * Central function to evaluate if the Halloween theme should be active.
 * Checked specifically against America/Costa_Rica timezone.
 */
export function isHalloweenActive(simulatedDate?: Date): boolean {
  // 1. Check code manual override
  if (HALLOWEEN_MANUAL_OVERRIDE !== null) {
    return HALLOWEEN_MANUAL_OVERRIDE;
  }

  // 2. Check browser query params & localStorage if on client side
  if (typeof window !== 'undefined' && !simulatedDate) {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const queryOverride = searchParams.get('halloween');
      if (queryOverride === 'true' || queryOverride === '1') {
        localStorage.setItem('halloween_override', 'true');
        return true;
      }
      if (queryOverride === 'false' || queryOverride === '0') {
        localStorage.setItem('halloween_override', 'false');
        return false;
      }

      const storedOverride = localStorage.getItem('halloween_override');
      if (storedOverride === 'true') return true;
      if (storedOverride === 'false') return false;
    } catch {
      // Storage access blocked or restricted, continue with date check
    }
  }

  // 3. Timezone calculation in America/Costa_Rica
  const nowParts = getCostaRicaDateParts(simulatedDate || new Date());

  // Numerical representation YYYYMMDDHHMMSS for strict chronological comparison
  const currentKey =
    nowParts.year * 10000000000 +
    nowParts.month * 100000000 +
    nowParts.day * 1000000 +
    nowParts.hour * 10000 +
    nowParts.minute * 100 +
    nowParts.second;

  const cutoffKey =
    HALLOWEEN_END_YEAR * 10000000000 +
    HALLOWEEN_END_MONTH * 100000000 +
    HALLOWEEN_END_DAY * 1000000 +
    HALLOWEEN_END_HOUR * 10000 +
    HALLOWEEN_END_MINUTE * 100 +
    HALLOWEEN_END_SECOND;

  // Active if current Costa Rica time is before November 2, 2026, 00:00:00
  return currentKey < cutoffKey;
}
