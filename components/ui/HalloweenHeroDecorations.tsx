'use client';

import React from 'react';
import { useHalloween } from '@/components/ui/HalloweenProvider';
import {
  HalloweenBat,
  HalloweenSubtleMoon,
  HalloweenSpiderweb,
} from '@/components/ui/HalloweenIcons';

/**
 * Halloween Hero Background
 * Matched to the user reference images:
 * - Glowing crescent moon in top-left with soft cloud wisps
 * - Exactly 2 bats flying right above the title text
 * - Subtle warm fireflies/sparks around text
 * - Clean, non-distracting, almost static layout
 */
export function HalloweenHeroBackground() {
  const { isHalloween } = useHalloween();

  if (!isHalloween) return null;

  return (
    <div
      className="halloween-decor absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* 1. Luminous Crescent Moon with soft clouds (Top-Left) */}
      <div className="absolute top-2 sm:top-4 left-3 sm:left-8 lg:left-12 opacity-90 transition-opacity">
        <HalloweenSubtleMoon size={135} />
      </div>

      {/* 2. Exactly 2 Bats beside the Moon (Above the title "Tus compras") */}
      {/* Bat 1: Larger, flying right */}
      <div className="absolute top-3 sm:top-5 left-[210px] sm:left-[265px] lg:left-[290px] text-[#243547] opacity-80">
        <HalloweenBat size={30} />
      </div>

      {/* Bat 2: Slightly lower and to the left */}
      <div className="absolute top-8 sm:top-10 left-[180px] sm:left-[225px] lg:left-[245px] text-[#344659] opacity-75">
        <HalloweenBat size={22} />
      </div>

      {/* 3. Subtle Warm Fireflies / Sparks around the hero content (matching the image) */}
      <div
        className="halloween-firefly w-1.5 h-1.5"
        style={{ top: '16%', left: '38%' }}
      />
      <div
        className="halloween-firefly w-2 h-2"
        style={{ top: '24%', left: '46%' }}
      />
      <div
        className="halloween-firefly w-1 h-1"
        style={{ top: '34%', left: '42%' }}
      />
      <div
        className="halloween-firefly w-1.5 h-1.5 hidden sm:block"
        style={{ top: '28%', left: '8%' }}
      />
      <div
        className="halloween-firefly w-1.5 h-1.5 hidden sm:block"
        style={{ top: '48%', left: '45%' }}
      />
      <div
        className="halloween-firefly w-1 h-1 hidden sm:block"
        style={{ top: '65%', left: '12%' }}
      />
      <div
        className="halloween-firefly w-2 h-2 hidden sm:block"
        style={{ top: '72%', left: '44%' }}
      />

      {/* 4. Soft atmospheric cloud haze along bottom left */}
      <div
        className="absolute bottom-0 left-0 w-full sm:w-[60%] h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(226, 222, 238, 0.3) 0%, transparent 100%)',
          filter: 'blur(10px)',
        }}
      />
    </div>
  );
}

/**
 * Route Map / Radar Panel Decorations
 * Matches the reference mockup:
 * - Spiderweb in top-right corner
 * - Soft warm halo behind center logo hub
 * - 2 small subtle bats in the panel sky
 */
export function HalloweenRouteMapDecorations() {
  const { isHalloween } = useHalloween();

  if (!isHalloween) return null;

  return (
    <div
      className="halloween-decor absolute inset-0 pointer-events-none select-none z-10 overflow-hidden rounded-[3rem]"
      aria-hidden="true"
    >
      {/* 1. Spiderweb in top-right corner of radar panel */}
      <div className="absolute -top-1 -right-1 text-slate-500 opacity-20 z-30">
        <HalloweenSpiderweb size={125} />
      </div>

      {/* 2. Soft Breathing Halo behind the Center Hub Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="halloween-hub-halo w-56 h-56 rounded-full" />
      </div>

      {/* 3. Two subtle bats in panel sky */}
      <div className="absolute top-[16%] left-[32%] text-[#2d3f52] opacity-50">
        <HalloweenBat size={24} />
      </div>
      <div className="absolute top-[48%] right-[12%] text-[#34485c] opacity-45">
        <HalloweenBat size={18} />
      </div>

      {/* 4. Soft mist inside bottom of radar panel */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(215, 210, 230, 0.18) 0%, transparent 100%)',
          filter: 'blur(8px)',
        }}
      />
    </div>
  );
}
