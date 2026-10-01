'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { isHalloweenActive } from '@/lib/halloween';

interface HalloweenContextType {
  isHalloween: boolean;
}

const HalloweenContext = createContext<HalloweenContextType>({
  isHalloween: false,
});

export function HalloweenProvider({ children }: { children: React.ReactNode }) {
  const [isHalloween, setIsHalloween] = useState(false);

  useEffect(() => {
    const active = isHalloweenActive();
    setIsHalloween(active);

    if (active) {
      document.documentElement.classList.add('halloween-mode');
    } else {
      document.documentElement.classList.remove('halloween-mode');
    }

    return () => {
      document.documentElement.classList.remove('halloween-mode');
    };
  }, []);

  return (
    <HalloweenContext.Provider value={{ isHalloween }}>
      {children}
    </HalloweenContext.Provider>
  );
}

export function useHalloween(): HalloweenContextType {
  return useContext(HalloweenContext);
}
