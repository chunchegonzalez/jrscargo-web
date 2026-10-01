'use client';

import React from 'react';
import { useHalloween } from '@/components/ui/HalloweenProvider';
import {
  HalloweenBat,
  HalloweenSubtleMoon,
  HalloweenSpiderweb,
} from '@/components/ui/HalloweenIcons';

/**
 * Subtle, elegant Halloween decorative layer for the Hero section.
 * Strictly adheres to 95% brand / 5% Halloween:
 * - No tree or castle silhouettes
 * - Max 2 faint bats outside panel (desktop only, 0.15-0.25 opacity, brand-blue/slate)
 * - Single faint crescent moon top-left (0.10-0.12 opacity, soft blur, non-competing)
 * - Soft CSS gradient mist at the bottom
 * - Mobile hides outside bats, mist, and particles for maximum performance & clarity
 */
export function HalloweenHeroBackground() {
  const { isHalloween } = useHalloween();

  if (!isHalloween) return null;

  return (
    <div
      className="halloween-decor absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* 1. FAINT CRESCENT MOON (Top Left behind Title) - Desktop only */}
      <div className="hidden md:block absolute top-6 sm:top-10 left-6 sm:left-12 lg:left-16 opacity-[0.12] transition-opacity">
        <HalloweenSubtleMoon size={110} />
      </div>

      {/* 2. MAX 2 BATS OUTSIDE PANEL - Desktop only, Brand Blue/Slate tone, low opacity */}
      {/* Bat 1: Gentle occasional slow float */}
      <div className="hidden md:block absolute top-[12%] left-[15%] lg:left-[17%] text-brand-blue opacity-[0.22] bat-anim-occasional">
        <HalloweenBat size={24} />
      </div>

      {/* Bat 2: Static subtle silhouette, smaller */}
      <div className="hidden md:block absolute top-[7%] left-[19%] lg:left-[21%] text-slate-700 opacity-[0.16]">
        <HalloweenBat size={17} />
      </div>

      {/* 3. LIGHT MIST / FOG AT BOTTOM - CSS gradient + blur, slow 25s transform, desktop only */}
      <div
        className="hidden md:block absolute bottom-0 left-0 right-0 h-28 halloween-mist-slow pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(200, 195, 215, 0.18) 0%, rgba(220, 215, 230, 0.08) 50%, transparent 100%)',
          filter: 'blur(8px)',
        }}
      />
    </div>
  );
}

/**
 * Halloween accents specifically for the Routes Card / Radar container.
 * Concentrates the core Halloween experience:
 * - Spiderweb in top-right corner (0.08–0.12 opacity)
 * - Soft breathing halo behind central hub (coral, orange, lavender)
 * - 1 occasional subtle bat
 * - Light fog at the bottom
 * - Few tiny faint particles
 */
export function HalloweenRouteMapDecorations() {
  const { isHalloween } = useHalloween();

  if (!isHalloween) return null;

  return (
    <div
      className="halloween-decor absolute inset-0 pointer-events-none select-none z-10 overflow-hidden rounded-[3rem]"
      aria-hidden="true"
    >
      {/* 1. Spiderweb in top-right corner (Opacity 0.08 - 0.12, visible on both desktop & mobile) */}
      <div className="absolute -top-1 -right-1 text-slate-600 opacity-[0.10] z-30">
        <HalloweenSpiderweb size={115} />
      </div>

      {/* 2. Central Logo Halo - Soft breathing halo behind the center hub (z-10, behind hub at z-20) */}
      {/* Coral, Orange, Lavender with low opacity, scale(1) to scale(1.025) over 7s */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="halloween-hub-halo w-56 h-56 rounded-full" />
      </div>

      {/* 3. Single occasional subtle bat inside panel (Desktop only) */}
      <div className="hidden md:block absolute top-[48%] right-[14%] text-brand-blue opacity-[0.20] bat-anim-occasional">
        <HalloweenBat size={17} />
      </div>

      {/* 4. Few faint warm particles (Desktop only) */}
      <div
        className="hidden md:block halloween-subtle-particle w-1.5 h-1.5"
        style={{ top: '65%', left: '30%', animationDelay: '0s', animationDuration: '9s' }}
      />
      <div
        className="hidden md:block halloween-subtle-particle w-1 h-1"
        style={{ top: '35%', left: '72%', animationDelay: '2.5s', animationDuration: '8s' }}
      />
      <div
        className="hidden md:block halloween-subtle-particle w-1.5 h-1.5"
        style={{ top: '78%', left: '55%', animationDelay: '4.5s', animationDuration: '10s' }}
      />

      {/* 5. Light fog at the bottom of the radar panel (Desktop only) */}
      <div
        className="hidden md:block absolute bottom-0 left-0 right-0 h-20 halloween-mist-slow pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(200, 195, 220, 0.12) 0%, transparent 100%)',
          filter: 'blur(6px)',
        }}
      />
    </div>
  );
}
