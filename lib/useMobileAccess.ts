'use client';

import { useEffect, useState } from 'react';
import { isMobileAllowed } from './mobile-access';

// Indica si el usuario en sesión puede ver el acceso a JRS Cargo Mobile (demo).
export function useMobileAccess(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active) setAllowed(isMobileAllowed(d?.user?.username));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return allowed;
}
