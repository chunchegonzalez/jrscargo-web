'use client';

import React from 'react';
import { useHalloween } from '@/components/ui/HalloweenProvider';
import {
  HalloweenBat,
  HalloweenFullMoon,
  HalloweenSpiderweb,
  HalloweenSpookyTree,
  HalloweenCastleSilhouette,
} from '@/components/ui/HalloweenIcons';

/**
 * Atmospheric Halloween decorative layer for the Hero section.
 * Matches the mockup: purple-grey misty atmosphere, thick fog clouds,
 * dark tree silhouette on left, castle silhouette on right,
 * scattered dark bats, faint moon behind mist.
 *
 * Rendered ONLY when isHalloweenActive() is true.
 * Entirely behind content (z-0) with pointer-events-none.
 */
export function HalloweenHeroBackground() {
  const { isHalloween } = useHalloween();

  if (!isHalloween) return null;

  return (
    <div
      className="halloween-decor absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* ═══════════════════════════════════════════
          1. ATMOSPHERIC PURPLE-GREY BACKGROUND TINT
          The mockup shows a subtle lavender/purple haze over the hero
          ═══════════════════════════════════════════ */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(180,170,200,0.15) 0%, rgba(200,195,215,0.12) 30%, rgba(210,205,220,0.08) 60%, rgba(220,215,230,0.18) 100%)',
        }}
      />
      {/* Side vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 120% 100% at 50% 40%, transparent 40%, rgba(160,150,185,0.08) 100%)',
        }}
      />

      {/* ═══════════════════════════════════════════
          2. FAINT FULL MOON (upper area, very subtle)
          ═══════════════════════════════════════════ */}
      <div className="absolute top-4 left-[15%] sm:left-[20%] lg:left-[25%] opacity-40 sm:opacity-50">
        <HalloweenFullMoon size={100} className="sm:w-[130px] sm:h-[130px]" />
      </div>

      {/* ═══════════════════════════════════════════
          3. DARK BATS SCATTERED IN THE SKY
          Dark silhouettes against the misty background
          ═══════════════════════════════════════════ */}

      {/* Bat cluster near upper center */}
      <div className="absolute top-[8%] left-[35%] sm:left-[30%] lg:left-[38%] text-[#2d3748] bat-anim-1">
        <HalloweenBat size={26} />
      </div>
      <div className="absolute top-[5%] left-[42%] sm:left-[38%] lg:left-[44%] text-[#374151] bat-anim-2 hidden sm:block">
        <HalloweenBat size={18} />
      </div>
      <div className="absolute top-[14%] left-[48%] lg:left-[50%] text-[#2d3748] bat-anim-3">
        <HalloweenBat size={22} />
      </div>

      {/* Bats near the tree on the left */}
      <div className="absolute top-[20%] left-[8%] sm:left-[12%] text-[#374151] bat-anim-2 hidden lg:block">
        <HalloweenBat size={20} />
      </div>
      <div className="absolute top-[28%] left-[15%] text-[#2d3748] bat-anim-1 hidden lg:block">
        <HalloweenBat size={16} />
      </div>

      {/* Bats near the right / castle area */}
      <div className="absolute top-[18%] right-[12%] text-[#374151] bat-anim-3 hidden lg:block">
        <HalloweenBat size={20} />
      </div>
      <div className="absolute top-[30%] right-[20%] text-[#2d3748] bat-anim-1 hidden lg:block">
        <HalloweenBat size={15} />
      </div>

      {/* Mobile-visible bats (fewer) */}
      <div className="absolute top-[12%] right-[15%] text-[#374151] bat-anim-3 lg:hidden">
        <HalloweenBat size={20} />
      </div>

      {/* ═══════════════════════════════════════════
          4. DARK TREE SILHOUETTE (Left Side)
          Very prominent in the mockup
          ═══════════════════════════════════════════ */}
      <div className="absolute bottom-0 -left-8 sm:-left-4 lg:left-0 opacity-60 sm:opacity-70 lg:opacity-75">
        <HalloweenSpookyTree className="w-[120px] h-[280px] sm:w-[150px] sm:h-[340px] lg:w-[200px] lg:h-[420px]" />
      </div>

      {/* ═══════════════════════════════════════════
          5. CASTLE SILHOUETTE (Bottom Right)
          Clearly visible against the mist in the mockup
          ═══════════════════════════════════════════ */}
      <div className="absolute bottom-0 right-0 opacity-50 sm:opacity-60 lg:opacity-70 hidden sm:block">
        <HalloweenCastleSilhouette className="w-[200px] h-[190px] sm:w-[250px] sm:h-[240px] lg:w-[320px] lg:h-[300px]" />
      </div>

      {/* ═══════════════════════════════════════════
          6. THICK FOG / CLOUD LAYERS (Bottom)
          The mockup shows substantial wispy white-grey clouds
          Multiple layers for depth
          ═══════════════════════════════════════════ */}

      {/* Layer 1: Deep background mist (purple tint) */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[40%] halloween-mist"
        style={{
          background: 'linear-gradient(to top, rgba(200,195,220,0.35) 0%, rgba(210,205,225,0.2) 30%, rgba(220,215,235,0.08) 60%, transparent 100%)',
        }}
      />

      {/* Layer 2: Wispy fog — left cloud bank */}
      <div
        className="absolute bottom-[5%] -left-[10%] w-[70%] h-[30%] halloween-fog-1"
        style={{
          background: 'radial-gradient(ellipse 100% 80% at 40% 70%, rgba(240,238,245,0.55) 0%, rgba(230,225,240,0.3) 40%, transparent 70%)',
          filter: 'blur(12px)',
        }}
      />

      {/* Layer 3: Wispy fog — right cloud bank */}
      <div
        className="absolute bottom-[2%] -right-[5%] w-[65%] h-[28%] halloween-fog-2"
        style={{
          background: 'radial-gradient(ellipse 100% 80% at 60% 75%, rgba(245,242,248,0.5) 0%, rgba(235,230,245,0.25) 40%, transparent 70%)',
          filter: 'blur(14px)',
        }}
      />

      {/* Layer 4: Wispy fog — center overlap */}
      <div
        className="absolute bottom-[8%] left-[20%] w-[60%] h-[25%] halloween-fog-3"
        style={{
          background: 'radial-gradient(ellipse 100% 70% at 50% 65%, rgba(255,253,255,0.4) 0%, rgba(240,235,250,0.2) 45%, transparent 70%)',
          filter: 'blur(16px)',
        }}
      />

      {/* Layer 5: Bottom edge solid cloud cover */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[15%]"
        style={{
          background: 'linear-gradient(to top, rgba(235,230,245,0.5) 0%, rgba(240,237,248,0.3) 40%, transparent 100%)',
          filter: 'blur(4px)',
        }}
      />

      {/* Layer 6: Very bottom edge for seamless blend */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[8%]"
        style={{
          background: 'linear-gradient(to top, rgba(243,244,246,0.8) 0%, rgba(243,244,246,0.4) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}

/**
 * Subtle Halloween accents specifically for the Routes Card / Radar container.
 * Top-right corner spiderweb and subtle floating bats inside the panel.
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
      <div className="absolute -top-1 -right-1 text-[#6b7280]/40">
        <HalloweenSpiderweb size={120} />
      </div>

      {/* Tiny subtle bats inside map radar */}
      <div className="absolute top-[20%] right-[20%] text-[#374151]/40 bat-anim-2">
        <HalloweenBat size={18} />
      </div>
      <div className="absolute bottom-[22%] right-[24%] text-[#374151]/35 bat-anim-1">
        <HalloweenBat size={15} />
      </div>
      <div className="absolute top-[35%] left-[18%] text-[#374151]/30 bat-anim-3">
        <HalloweenBat size={14} />
      </div>

      {/* Very faint purple mist inside bottom of radar panel */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{
          background: 'linear-gradient(to top, rgba(200,195,220,0.1) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
