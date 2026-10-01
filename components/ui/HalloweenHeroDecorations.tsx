'use client';

import React from 'react';
import { useHalloween } from '@/components/ui/HalloweenProvider';
import {
  HalloweenBat,
  HalloweenSoftFullMoon,
} from '@/components/ui/HalloweenIcons';

/**
 * Halloween Hero Background
 * Strictly static, light, and matching media_1790829032126.png:
 * - Soft full moon with clouds in top-left
 * - Exactly 2 small static bats
 * - Soft lavender/grey mist along bottom
 * - Zero animations, zero heavy decor
 */
export function HalloweenHeroBackground() {
  const { isHalloween } = useHalloween();

  if (!isHalloween) return null;

  return (
    <div
      className="halloween-decor absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* 1. Soft Full Moon with cloud in front (Top-Left) */}
      <div className="absolute top-1 sm:top-2 left-1 sm:left-5 lg:left-8 opacity-85 pointer-events-none">
        <HalloweenSoftFullMoon size={165} className="w-[115px] h-[115px] sm:w-[165px] sm:h-[165px]" />
      </div>

      {/* 2. Exactly 2 Small Static Bats near the moon (above title "Tus compras") */}
      {/* Bat 1: flying right, completely static */}
      <div className="hidden sm:block absolute top-4 sm:top-6 left-[215px] sm:left-[265px] lg:left-[290px] text-[#1e293b] opacity-55 pointer-events-none">
        <HalloweenBat size={28} />
      </div>

      {/* Bat 2: slightly lower and left, completely static */}
      <div className="hidden sm:block absolute top-9 sm:top-12 left-[180px] sm:left-[225px] lg:left-[245px] text-[#334155] opacity-48 pointer-events-none">
        <HalloweenBat size={20} />
      </div>

      {/* 3. Soft, static lavender-grey mist along the bottom of the hero */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(226, 220, 240, 0.45) 0%, rgba(236, 232, 246, 0.20) 45%, transparent 100%)',
          filter: 'blur(8px)',
        }}
      />
    </div>
  );
}


