'use client';

import React from 'react';
import { useHalloween } from '@/components/ui/HalloweenProvider';
import {
  HalloweenBat,
  HalloweenSoftFullMoon,
  HalloweenSpiderwebWithSpider,
  HalloweenMiniPumpkin,
  HalloweenFloatingGhost,
} from '@/components/ui/HalloweenIcons';

const FIREFLIES = [
  { top: '18%', left: '8%', size: 6, color: '#F97316', duration: 4.2, delay: 0 },
  { top: '34%', left: '42%', size: 5, color: '#A855F7', duration: 5.1, delay: 0.8 },
  { top: '14%', left: '54%', size: 7, color: '#F59E0B', duration: 4.6, delay: 1.4 },
  { top: '65%', left: '46%', size: 6, color: '#F97316', duration: 5.5, delay: 0.4 },
  { top: '78%', left: '12%', size: 5, color: '#A855F7', duration: 4.8, delay: 1.9 },
  { top: '24%', left: '88%', size: 6, color: '#F59E0B', duration: 4.4, delay: 1.1 },
  { top: '72%', left: '92%', size: 7, color: '#F97316', duration: 5.2, delay: 0.6 },
];

export function HalloweenHeroBackground() {
  const { isHalloween } = useHalloween();

  if (!isHalloween) return null;

  return (
    <div
      className="halloween-decor absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* 1. Ambient Twilight Glow Orbs (Smooth radial gradients — zero filter blur cost) */}
      <div
        className="absolute -top-24 -left-20 w-[560px] h-[480px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(251, 146, 60, 0.22) 0%, rgba(168, 85, 247, 0.09) 50%, transparent 75%)',
        }}
      />
      <div
        className="absolute top-12 right-0 w-[520px] h-[460px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(147, 51, 234, 0.12) 0%, rgba(249, 115, 22, 0.09) 50%, transparent 75%)',
        }}
      />

      {/* 2. Animated Glowing Harvest Moon (Top-Left, GPU CSS keyframe) */}
      <div
        className="absolute top-2 sm:top-3 left-2 sm:left-6 lg:left-10 pointer-events-none"
        style={{
          willChange: 'transform',
          animation: 'gpu-float-slow 7s ease-in-out infinite',
        }}
      >
        <HalloweenSoftFullMoon
          size={185}
          className="w-[130px] h-[130px] sm:w-[185px] sm:h-[185px]"
        />
      </div>

      {/* 3. Top-Right Corner Intricate Spiderweb with Bobbing Spider */}
      <div
        className="hidden sm:block absolute top-14 lg:top-16 right-0 text-purple-950/65 pointer-events-none"
        style={{
          willChange: 'transform',
          animation: 'gpu-float-web 4s ease-in-out infinite',
        }}
      >
        <HalloweenSpiderwebWithSpider size={155} />
      </div>

      {/* 4. Dynamic Flock of Animated Flying Bats (GPU CSS keyframes) */}
      {/* Bat 1: Soaring near the Harvest Moon */}
      <div
        className="absolute top-8 sm:top-10 left-[155px] sm:left-[235px] lg:left-[265px] text-[#1E1B4B] pointer-events-none"
        style={{
          willChange: 'transform',
          animation: 'gpu-bat-1 5.5s ease-in-out infinite',
        }}
      >
        <HalloweenBat size={34} />
      </div>

      {/* Bat 2: Wingman bat gliding slightly lower */}
      <div
        className="absolute top-16 sm:top-20 left-[125px] sm:left-[195px] lg:left-[220px] text-[#312E81] opacity-85 pointer-events-none"
        style={{
          willChange: 'transform',
          animation: 'gpu-bat-2 4.6s ease-in-out 0.7s infinite',
        }}
      >
        <HalloweenBat size={24} />
      </div>

      {/* Bat 3: High flyer near center-left */}
      <div
        className="hidden md:block absolute top-12 left-[38%] text-[#1E1B4B] opacity-75 pointer-events-none"
        style={{
          willChange: 'transform',
          animation: 'gpu-bat-3 6.2s ease-in-out 1.3s infinite',
        }}
      >
        <HalloweenBat size={22} />
      </div>

      {/* Bat 4: Patrolling near top-right radar */}
      <div
        className="hidden lg:block absolute top-24 right-[14%] text-[#312E81] opacity-75 pointer-events-none"
        style={{
          willChange: 'transform',
          animation: 'gpu-bat-4 5.2s ease-in-out 0.4s infinite',
        }}
      >
        <HalloweenBat size={26} />
      </div>

      {/* 5. Friendly Floating Courier Ghost (Center-Right / Bottom-Right) */}
      <div
        className="hidden md:block absolute bottom-12 left-[45%] lg:left-[47%] pointer-events-none z-20"
        style={{
          willChange: 'transform',
          animation: 'gpu-ghost-float 4.8s ease-in-out infinite',
        }}
      >
        <HalloweenFloatingGhost size={62} />
      </div>

      {/* 6. Glowing Jack-o'-Lantern Accents */}
      <div
        className="hidden sm:block absolute bottom-8 left-6 lg:left-12 pointer-events-none"
        style={{
          willChange: 'transform',
          animation: 'gpu-pumpkin-bob 3.8s ease-in-out infinite',
        }}
      >
        <HalloweenMiniPumpkin size={34} />
      </div>

      {/* 7. Magical Floating Fireflies / Spooky Embers */}
      {FIREFLIES.map((f, idx) => (
        <div
          key={idx}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: f.top,
            left: f.left,
            width: f.size,
            height: f.size,
            backgroundColor: f.color,
            boxShadow: `0 0 10px 2px ${f.color}`,
            willChange: 'transform, opacity',
            animation: `gpu-firefly ${f.duration}s ease-in-out ${f.delay}s infinite`,
          }}
        />
      ))}

      {/* 8. Mystic Violet-Amber Fog Along the Bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(243, 232, 255, 0.55) 0%, rgba(254, 215, 170, 0.22) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}
