// Acceso restringido a JRS Cargo Mobile (QR) mientras el módulo está en demo.
// Solo los usuarios listados aquí pueden entrar (comparación sin distinguir mayúsculas).
export const MOBILE_ALLOWED_USERNAMES = ['jose gonzalez'];

export function isMobileAllowed(username?: string | null): boolean {
  if (!username) return false;
  return MOBILE_ALLOWED_USERNAMES.includes(username.trim().toLowerCase());
}
