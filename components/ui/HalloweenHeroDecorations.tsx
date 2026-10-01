'use client';

import React from 'react';
import { useHalloween } from '@/components/ui/HalloweenProvider';
import {
  HalloweenBat,
  HalloweenCrescentMoon,
  HalloweenSpiderweb,
  HalloweenSpookyBranches,
  HalloweenCastleSilhouette,
} from '@/components/ui/HalloweenIcons';

/**
 * Subtle, elegant Halloween decorative layer for the Hero section.
 * Rendered ONLY when isHalloweenActive() is true.
 * Entirely behind content (z-0 / z-5) with pointer-events-none.
 */
export function HalloweenHeroBackground() {
  const { isHalloween } = useHalloween();

  if (!isHalloween) return null;

  return (
    <div
      className="halloween-decor absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* 1. Faint Crescent Moon (Top Left behind Title) */}
      <div className="absolute top-6 sm:top-10 left-4 sm:left-10 lg:left-14 opacity-75 lg:opacity-85 transition-opacity">
        <HalloweenCrescentMoon size={64} className="sm:w-20 sm:h-20" />
      </div>

      {/* 2. Small Bats fluttering in the Hero sky */}
      {/* Bat 1 (Medium, higher) */}
      <div className="absolute top-[12%] left-[40%] sm:left-[35%] lg:left-[42%] text-slate-700/50 bat-anim-1">
        <HalloweenBat size={28} />
      </div>

      {/* Bat 2 (Small, distant) */}
      <div className="absolute top-[8%] left-[52%] sm:left-[46%] lg:left-[48%] text-slate-600/40 bat-anim-2 hidden sm:block">
        <HalloweenBat size={20} />
      </div>

      {/* Bat 3 (Small, lower left) */}
      <div className="absolute top-[28%] left-[45%] lg:left-[45%] text-slate-700/40 bat-anim-3">
        <HalloweenBat size={22} />
      </div>

      {/* 3. Subtle Warm Orange Floating Particles / Embers */}
      <div
        className="halloween-ember w-1.5 h-1.5"
        style={{ top: '65%', left: '22%', animationDuration: '7s', animationDelay: '0s' }}
      />
      <div
        className="halloween-ember w-2 h-2"
        style={{ top: '75%', left: '42%', animationDuration: '8.5s', animationDelay: '1.8s' }}
      />
      <div
        className="halloween-ember w-1 h-1"
        style={{ top: '55%', left: '33%', animationDuration: '6s', animationDelay: '3.2s' }}
      />
      <div
        className="halloween-ember w-1.5 h-1.5 hidden sm:block"
        style={{ top: '80%', left: '15%', animationDuration: '9s', animationDelay: '2.5s' }}
      />
      <div
        className="halloween-ember w-2 h-2 hidden sm:block"
        style={{ top: '70%', left: '50%', animationDuration: '7.8s', animationDelay: '4.1s' }}
      />

      {/* 4. Soft Bare Tree Branches Silhouette (Bottom Left) */}
      <div className="absolute bottom-0 -left-4 sm:left-0 opacity-40 sm:opacity-50 pointer-events-none hidden sm:block">
        <HalloweenSpookyBranches className="w-24 h-36 sm:w-28 sm:h-44 text-slate-600" />
      </div>

      {/* 5. Faint Castle Silhouette (Bottom Right Edge behind map) */}
      <div className="absolute bottom-0 -right-2 opacity-35 sm:opacity-45 pointer-events-none hidden lg:block">
        <HalloweenCastleSilhouette className="w-24 h-36 text-slate-600" />
      </div>

      {/* 6. Very Soft Misty Fog at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-purple-950/[0.04] via-orange-950/[0.02] to-transparent halloween-mist pointer-events-none" />
    </div>
  );
}

/**
 * Subtle Halloween accents specifically for the Routes Card / Radar container
 * Top-right corner web and subtle floating bat inside the panel
 */
export function HalloweenRouteMapDecorations() {
  const { isHalloween } = useHalloween();

  if (!isHalloween) return null;

  return (
    <div
      className="halloween-decor absolute inset-0 pointer-events-none select-none z-20 overflow-hidden rounded-[3rem]"
      aria-hidden="true"
    >
      {/* Delicate semi-transparent spiderweb in top-right corner of radar panel */}
      <div className="absolute -top-1 -right-1 text-slate-600/35">
        <HalloweenSpiderweb size={110} />
      </div>

      {/* Tiny subtle bat inside map radar */}
      <div className="absolute top-[22%] right-[22%] text-slate-600/35 bat-anim-2">
        <HalloweenBat size={18} />
      </div>

      {/* Second tiny bat lower down near routes */}
      <div className="absolute bottom-[24%] right-[25%] text-slate-600/30 bat-anim-1">
        <HalloweenBat size={16} />
      </div>

      {/* Very faint mist inside bottom of radar panel */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-purple-900/[0.05] to-transparent" />
    </div>
  );
}
