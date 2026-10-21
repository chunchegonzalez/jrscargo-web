'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
      {/* 1. Ambient Twilight Glow Orbs (Orange + Mystic Violet) */}
      <div
        className="absolute -top-24 -left-20 w-[520px] h-[440px] rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(251, 146, 60, 0.22) 0%, rgba(168, 85, 247, 0.10) 55%, transparent 80%)',
        }}
      />
      <div
        className="absolute top-12 right-0 w-[480px] h-[420px] rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(147, 51, 234, 0.12) 0%, rgba(249, 115, 22, 0.10) 55%, transparent 80%)',
        }}
      />

      {/* 2. Animated Glowing Harvest Moon (Top-Left) */}
      <motion.div
        animate={{ y: [0, -8, 0], rotate: [0, 1.5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-2 sm:top-3 left-2 sm:left-6 lg:left-10 pointer-events-none"
      >
        <HalloweenSoftFullMoon
          size={185}
          className="w-[130px] h-[130px] sm:w-[185px] sm:h-[185px]"
        />
      </motion.div>

      {/* 3. Top-Right Corner Intricate Spiderweb with Bobbing Spider */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden sm:block absolute top-14 lg:top-16 right-0 text-purple-950/65 pointer-events-none"
      >
        <HalloweenSpiderwebWithSpider size={155} />
      </motion.div>

      {/* 4. Dynamic Flock of Animated Flying Bats */}
      {/* Bat 1: Soaring near the Harvest Moon */}
      <motion.div
        animate={{
          x: [0, 26, 0],
          y: [0, -12, 0],
          rotate: [-6, 8, -6],
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-8 sm:top-10 left-[155px] sm:left-[235px] lg:left-[265px] text-[#1E1B4B] drop-shadow-[0_4px_8px_rgba(249,115,22,0.3)] pointer-events-none"
      >
        <HalloweenBat size={34} />
      </motion.div>

      {/* Bat 2: Wingman bat gliding slightly lower */}
      <motion.div
        animate={{
          x: [0, -18, 0],
          y: [0, 10, 0],
          rotate: [8, -8, 8],
          scale: [0.95, 1.06, 0.95],
        }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
        className="absolute top-16 sm:top-20 left-[125px] sm:left-[195px] lg:left-[220px] text-[#312E81] opacity-85 pointer-events-none"
      >
        <HalloweenBat size={24} />
      </motion.div>

      {/* Bat 3: High flyer near center-left */}
      <motion.div
        animate={{
          x: [0, 35, 0],
          y: [0, -14, 0],
          rotate: [-10, 5, -10],
        }}
        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay: 1.3 }}
        className="hidden md:block absolute top-12 left-[38%] text-[#1E1B4B] opacity-75 pointer-events-none"
      >
        <HalloweenBat size={22} />
      </motion.div>

      {/* Bat 4: Patrolling near top-right radar */}
      <motion.div
        animate={{
          x: [0, -24, 0],
          y: [0, -10, 0],
          rotate: [6, -6, 6],
        }}
        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        className="hidden lg:block absolute top-24 right-[14%] text-[#312E81] opacity-75 pointer-events-none"
      >
        <HalloweenBat size={26} />
      </motion.div>

      {/* 5. Friendly Floating Courier Ghost (Center-Right / Bottom-Right) */}
      <motion.div
        animate={{
          y: [0, -14, 0],
          x: [0, 6, 0],
          rotate: [-3, 3, -3],
        }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden md:block absolute bottom-12 left-[45%] lg:left-[47%] pointer-events-none z-20"
      >
        <HalloweenFloatingGhost size={62} />
      </motion.div>

      {/* 6. Glowing Jack-o'-Lantern Accents */}
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [-5, 5, -5] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden sm:block absolute bottom-8 left-6 lg:left-12 pointer-events-none"
      >
        <HalloweenMiniPumpkin size={34} />
      </motion.div>

      {/* 7. Magical Floating Fireflies / Spooky Embers */}
      {FIREFLIES.map((f, idx) => (
        <motion.div
          key={idx}
          animate={{
            y: [0, -28, 0],
            opacity: [0.25, 0.9, 0.25],
            scale: [0.85, 1.25, 0.85],
          }}
          transition={{
            duration: f.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: f.delay,
          }}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: f.top,
            left: f.left,
            width: f.size,
            height: f.size,
            backgroundColor: f.color,
            boxShadow: `0 0 12px 3px ${f.color}`,
          }}
        />
      ))}

      {/* 8. Mystic Violet-Amber Fog Along the Bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(243, 232, 255, 0.55) 0%, rgba(254, 215, 170, 0.22) 50%, transparent 100%)',
          filter: 'blur(6px)',
        }}
      />
    </div>
  );
}
