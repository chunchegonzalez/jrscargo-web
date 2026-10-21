import React from 'react';

/**
 * Dynamic, high-craft SVG & Image assets for the JRS Cargo Halloween Edition
 */

export function HalloweenBat({
  size = 28,
  className = '',
  style = {},
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={(size * 20) / 36}
      viewBox="0 0 36 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M18 5.2C16.6 2.6 13.7 0.5 10 0.5C4.5 0.5 0.6 5.2 0 11C2.8 9.2 6.2 9.8 8.5 12C10.8 9.8 14 9.8 16.3 11.5C16.8 8 17.4 6.2 18 5.2C18.6 6.2 19.2 8 19.7 11.5C22 9.8 25.2 9.8 27.5 12C29.8 9.8 33.2 9.2 36 11C35.4 5.2 31.5 0.5 26 0.5C22.3 0.5 19.4 2.6 18 5.2Z" />
      {/* Tiny glowing eyes */}
      <circle cx="16.8" cy="7.2" r="0.8" fill="#FBBF24" />
      <circle cx="19.2" cy="7.2" r="0.8" fill="#FBBF24" />
    </svg>
  );
}

/**
 * Intricate Spiderweb pinned to top-right corner with an animated hanging spider
 */
export function HalloweenSpiderwebWithSpider({
  size = 150,
  className = '',
  style = {},
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 110 145"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Radial anchor threads */}
      <line x1="110" y1="0" x2="0" y2="0" strokeWidth="1.2" strokeOpacity="0.45" />
      <line x1="110" y1="0" x2="110" y2="105" strokeWidth="1.2" strokeOpacity="0.45" />
      <line x1="110" y1="0" x2="12" y2="92" strokeWidth="1.1" strokeOpacity="0.4" />
      <line x1="110" y1="0" x2="28" y2="52" strokeWidth="0.9" strokeOpacity="0.35" />
      <line x1="110" y1="0" x2="65" y2="20" strokeWidth="0.9" strokeOpacity="0.35" />
      <line x1="110" y1="0" x2="54" y2="85" strokeWidth="0.9" strokeOpacity="0.35" />
      <line x1="110" y1="0" x2="88" y2="42" strokeWidth="0.9" strokeOpacity="0.35" />

      {/* Concentric spiral arches */}
      <path d="M98 0 C 92 14, 92 14, 110 10" strokeWidth="0.8" strokeOpacity="0.35" />
      <path d="M86 0 C 78 26, 78 26, 110 22" strokeWidth="0.85" strokeOpacity="0.38" />
      <path d="M72 0 C 62 38, 62 38, 110 34" strokeWidth="0.9" strokeOpacity="0.4" />
      <path d="M58 0 C 46 52, 48 52, 110 46" strokeWidth="0.95" strokeOpacity="0.42" />
      <path d="M42 0 C 28 66, 32 66, 110 60" strokeWidth="1.0" strokeOpacity="0.45" />
      <path d="M24 0 C 10 82, 14 82, 110 76" strokeWidth="1.1" strokeOpacity="0.45" />

      {/* Vertical silk thread */}
      <line
        x1="64"
        y1="32"
        x2="64"
        y2="115"
        strokeWidth="1"
        strokeDasharray="2 2"
        strokeOpacity="0.55"
      />

      {/* Cute hanging spider with glowing eyes */}
      <g transform="translate(64, 118)" stroke="none">
        <circle cx="0" cy="0" r="5" fill="#1E1B4B" />
        <circle cx="0" cy="-4" r="3.2" fill="#1E1B4B" />
        {/* Glowing orange eyes */}
        <circle cx="-1.1" cy="-4.5" r="0.8" fill="#F97316" />
        <circle cx="1.1" cy="-4.5" r="0.8" fill="#F97316" />
        {/* Legs */}
        <path
          d="M -3.5 -2 Q -8 -5 -10 -1.5 M -4 0 Q -9 0 -11 4 M -3.5 2 Q -8 6 -7 10
             M 3.5 -2 Q 8 -5 10 -1.5 M 4 0 Q 9 0 11 4 M 3.5 2 Q 8 6 7 10"
          stroke="#1E1B4B"
          strokeWidth="1.1"
          fill="none"
        />
      </g>
    </svg>
  );
}

/**
 * Luminous Harvest Moon with glowing aura, craters, and mystic clouds
 */
export function HalloweenSoftFullMoon({
  size = 185,
  className = '',
  style = {},
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
    >
      {/* Outer pulsing golden-orange glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none blur-2xl animate-pulse"
        style={{
          background:
            'radial-gradient(circle, rgba(251, 146, 60, 0.45) 0%, rgba(245, 158, 11, 0.22) 48%, rgba(147, 51, 234, 0.08) 72%, transparent 85%)',
          transform: 'scale(1.45)',
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-[0_0_25px_rgba(251,146,60,0.45)]"
      >
        <defs>
          <radialGradient id="harvestMoonGrad" cx="40%" cy="35%" r="58%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="35%" stopColor="#FDE68A" />
            <stop offset="72%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
          </radialGradient>

          <linearGradient id="mysticCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#312E81" stopOpacity="0.65" />
            <stop offset="55%" stopColor="#4C1D95" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id="cloudHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FDBA74" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#C084FC" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Outer halo ring */}
        <circle cx="78" cy="68" r="58" fill="url(#harvestMoonGrad)" fillOpacity="0.18" />

        {/* Main Harvest Moon disc */}
        <circle cx="78" cy="68" r="48" fill="url(#harvestMoonGrad)" />

        {/* Detailed Moon Craters */}
        <circle cx="58" cy="50" r="9" fill="#EA580C" fillOpacity="0.22" />
        <circle cx="88" cy="44" r="13" fill="#EA580C" fillOpacity="0.18" />
        <circle cx="98" cy="74" r="8.5" fill="#C2410C" fillOpacity="0.22" />
        <circle cx="68" cy="82" r="14" fill="#EA580C" fillOpacity="0.16" />
        <circle cx="50" cy="72" r="5.5" fill="#C2410C" fillOpacity="0.2" />

        {/* Tiny silhouette of a bat crossing the moon */}
        <g transform="translate(82, 46) scale(0.55)" fill="#1E1B4B" opacity="0.75">
          <path d="M18 5.2C16.6 2.6 13.7 0.5 10 0.5C4.5 0.5 0.6 5.2 0 11C2.8 9.2 6.2 9.8 8.5 12C10.8 9.8 14 9.8 16.3 11.5C16.8 8 17.4 6.2 18 5.2C18.6 6.2 19.2 8 19.7 11.5C22 9.8 25.2 9.8 27.5 12C29.8 9.8 33.2 9.2 36 11C35.4 5.2 31.5 0.5 26 0.5C22.3 0.5 19.4 2.6 18 5.2Z" />
        </g>

        {/* Mystic twilight clouds across the lower moon */}
        <g>
          <ellipse cx="36" cy="106" rx="28" ry="13" fill="url(#mysticCloudGrad)" />
          <ellipse cx="62" cy="98" rx="26" ry="16" fill="url(#mysticCloudGrad)" />
          <ellipse cx="92" cy="103" rx="28" ry="14" fill="url(#mysticCloudGrad)" />
          <ellipse cx="116" cy="110" rx="20" ry="10" fill="url(#mysticCloudGrad)" />
          <ellipse cx="52" cy="112" rx="36" ry="11" fill="url(#cloudHighlight)" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Glowing 3D-style Jack-o'-Lantern Pumpkin
 */
export function HalloweenMiniPumpkin({
  size = 22,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-[0_4px_10px_rgba(249,115,22,0.55)] ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="coolPumpkinGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="45%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#C2410C" />
        </radialGradient>
        <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>

      {/* Curly Green Stem */}
      <path
        d="M18 4 C18 4, 20.5 1, 23 2.5 C24.5 3.8, 21 7, 19.5 9.5 L16.5 9.5 Z"
        fill="#16A34A"
      />

      {/* Pumpkin Ribs */}
      <ellipse cx="18" cy="20" rx="15" ry="11.5" fill="url(#coolPumpkinGrad)" />
      <ellipse cx="18" cy="20" rx="10.5" ry="12" fill="#F97316" />
      <ellipse cx="18" cy="20" rx="5.5" ry="12.3" fill="#FB923C" />

      {/* Glowing Eyes & Grin */}
      <polygon points="11.5,15.5 14.5,19.5 9,19.5" fill="url(#innerGlow)" />
      <polygon points="24.5,15.5 27,19.5 21.5,19.5" fill="url(#innerGlow)" />
      <polygon points="18,18.5 19.5,21 16.5,21" fill="url(#innerGlow)" />
      <path
        d="M10.5 23 C13 27.5, 23 27.5, 25.5 23 L23 24 L21 22.5 L19 24.5 L17 24.5 L15 22.5 L13 24 Z"
        fill="url(#innerGlow)"
      />
    </svg>
  );
}

/**
 * Friendly Floating Ghost carrying a mini express parcel
 */
export function HalloweenFloatingGhost({
  size = 56,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-[0_10px_20px_rgba(139,92,246,0.28)] ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ghostBodyGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F3E8FF" />
          <stop offset="100%" stopColor="#DDD6FE" />
        </linearGradient>
      </defs>
      {/* Ghost Sheet Body */}
      <path
        d="M16 28 C16 14.7 23.2 6 32 6 C40.8 6 48 14.7 48 28 L50 52 C50 54 47 55 45 53 L41 49 C39.5 47.5 37.5 48 36 50 L34 53 C32.8 54.5 31.2 54.5 30 53 L28 50 C26.5 48 24.5 47.5 23 49 L19 53 C17 55 14 54 14 52 Z"
        fill="url(#ghostBodyGrad)"
        stroke="#C4B5FD"
        strokeWidth="1.2"
      />
      {/* Cute Eyes & Blush */}
      <circle cx="27" cy="24" r="2.6" fill="#1E1B4B" />
      <circle cx="37" cy="24" r="2.6" fill="#1E1B4B" />
      <circle cx="26.2" cy="23.2" r="0.9" fill="#FFFFFF" />
      <circle cx="36.2" cy="23.2" r="0.9" fill="#FFFFFF" />
      <ellipse cx="23" cy="27.5" rx="2.5" ry="1.3" fill="#FB7185" fillOpacity="0.45" />
      <ellipse cx="41" cy="27.5" rx="2.5" ry="1.3" fill="#FB7185" fillOpacity="0.45" />
      {/* Happy Mouth */}
      <path d="M29.5 28 Q32 31 34.5 28" stroke="#1E1B4B" strokeWidth="1.6" strokeLinecap="round" />

      {/* Mini JRS Express Box held by Ghost */}
      <g transform="translate(23, 33)">
        <rect x="0" y="0" width="18" height="13" rx="2.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
        <line x1="9" y1="0" x2="9" y2="13" stroke="#FEF3C7" strokeWidth="2" />
        <line x1="0" y1="5" x2="18" y2="5" stroke="#D97706" strokeWidth="1" />
      </g>
    </svg>
  );
}

/**
 * High-craft Vector SVG Witch Hat with curved brim (hugs circular heads seamlessly),
 * glowing orange ribbon, golden skull/buckle, and animated magical sparks
 */
export function HalloweenWitchHat({
  size = 52,
  className = '',
  style = {},
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={Math.round((size * 76) / 90)}
      viewBox="0 0 90 76"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none overflow-visible drop-shadow-[0_6px_14px_rgba(88,28,135,0.45)] ${className}`}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="witchHatCone" x1="20%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#4C1D95" />
          <stop offset="48%" stopColor="#2E1065" />
          <stop offset="100%" stopColor="#0F0728" />
        </linearGradient>
        <linearGradient id="witchHatBrim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B0764" />
          <stop offset="50%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#0F0728" />
        </linearGradient>
        <linearGradient id="witchHatRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EA580C" />
          <stop offset="50%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="witchHatBuckle" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>

      {/* Back shadow under brim */}
      <ellipse cx="45" cy="57" rx="37" ry="10" fill="#090418" fillOpacity="0.65" />

      {/* Curved Witch Hat Cone with expressive bent tip */}
      <path
        d="M22 52 C24 35, 31 16, 48 6 C57 1, 69 2, 75 9 C70 9, 63 11, 58 17 C54 22, 58 36, 67 52 Z"
        fill="url(#witchHatCone)"
        stroke="#6D28D9"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Subtle fabric fold creases on cone */}
      <path
        d="M32 36 Q45 39 56 33"
        stroke="#7C3AED"
        strokeWidth="1.1"
        strokeOpacity="0.45"
        strokeLinecap="round"
      />
      <path
        d="M38 23 Q47 26 54 21"
        stroke="#A78BFA"
        strokeWidth="1"
        strokeOpacity="0.35"
        strokeLinecap="round"
      />

      {/* Glowing Orange Ribbon Band */}
      <path
        d="M21.5 47.5 C34 53, 56 53, 67.5 47.5 L69.5 53.5 C56 59.5, 33 59.5, 19.5 53.5 Z"
        fill="url(#witchHatRibbon)"
        stroke="#FDBA74"
        strokeWidth="0.8"
      />

      {/* Curved Ergonomic Brim that hugs round avatars */}
      <path
        d="M4 54 C14 45, 76 45, 86 54 C89 57, 83 65, 70 63 C54 60, 36 60, 20 63 C7 65, 1 57, 4 54 Z"
        fill="url(#witchHatBrim)"
        stroke="#7C3AED"
        strokeWidth="1.3"
      />

      {/* Rim highlight */}
      <path
        d="M9 54.5 C26 48.5, 64 48.5, 81 54.5"
        stroke="#C4B5FD"
        strokeWidth="1"
        strokeOpacity="0.45"
        strokeLinecap="round"
      />

      {/* Golden Buckle in center of ribbon */}
      <g transform="translate(38.5, 45.5)">
        <rect
          x="0"
          y="0"
          width="13"
          height="11"
          rx="2.5"
          fill="url(#witchHatBuckle)"
          stroke="#78350F"
          strokeWidth="0.9"
        />
        <rect x="3" y="2.5" width="7" height="6" rx="1" fill="#1E1B4B" />
        <line x1="6.5" y1="2.5" x2="6.5" y2="8.5" stroke="#FDE047" strokeWidth="1.3" />
      </g>

      {/* Magical glowing stars around the hat tip */}
      <g>
        <circle cx="77" cy="12" r="2" fill="#FDE047">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="r" values="1.4;2.5;1.4" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="16" cy="28" r="1.6" fill="#FB923C">
          <animate attributeName="opacity" values="1;0.25;1" dur="2.1s" repeatCount="indefinite" />
        </circle>
        <path
          d="M66 2 L67.2 5.2 L70.5 6.4 L67.2 7.6 L66 10.8 L64.8 7.6 L61.5 6.4 L64.8 5.2 Z"
          fill="#FDE047"
        >
          <animateTransform
            attributeName="transform"
            type="scale"
            values="0.85;1.15;0.85"
             additive="sum"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </path>
      </g>
    </svg>
  );
}

/**
 * Animated Chattering Skull with glowing fiery eyes and moving jaw
 */
export function HalloweenAnimatedSkull({
  size = 44,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-[0_6px_14px_rgba(249,115,22,0.45)] ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skullBoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <radialGradient id="skullEyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#DC2626" />
        </radialGradient>
      </defs>

      {/* Lower Jaw (Animated chattering up and down via CSS/SVG) */}
      <g className="origin-center animate-[bounce_1.2s_infinite]">
        <rect
          x="21"
          y="42"
          width="22"
          height="13"
          rx="4"
          fill="url(#skullBoneGrad)"
          stroke="#1E293B"
          strokeWidth="2.2"
        />
        {/* Lower teeth */}
        <line x1="26" y1="42" x2="26" y2="48" stroke="#1E293B" strokeWidth="2" />
        <line x1="32" y1="42" x2="32" y2="48" stroke="#1E293B" strokeWidth="2" />
        <line x1="38" y1="42" x2="38" y2="48" stroke="#1E293B" strokeWidth="2" />
      </g>

      {/* Upper Cranium */}
      <path
        d="M12 28 C12 13 21 6 32 6 C43 6 52 13 52 28 C52 34 49 38 45 40 L45 45 C45 47 43 48 41 48 L23 48 C21 48 19 47 19 45 L19 40 C15 38 12 34 12 28 Z"
        fill="url(#skullBoneGrad)"
        stroke="#1E293B"
        strokeWidth="2.4"
      />

      {/* Cranium crack detail */}
      <path
        d="M22 9 L25 14 L22 17"
        stroke="#475569"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Eye Sockets */}
      <circle cx="24" cy="27" r="6.2" fill="#0F172A" />
      <circle cx="40" cy="27" r="6.2" fill="#0F172A" />

      {/* Glowing Fiery Pupils */}
      <circle cx="24" cy="27" r="3.2" fill="url(#skullEyeGlow)" className="animate-pulse" />
      <circle cx="40" cy="27" r="3.2" fill="url(#skullEyeGlow)" className="animate-pulse" />

      {/* Nasal Cavity */}
      <polygon points="32,32 29,38 35,38" fill="#0F172A" />

      {/* Upper Teeth */}
      <line x1="25" y1="42" x2="25" y2="48" stroke="#1E293B" strokeWidth="2" />
      <line x1="30" y1="42" x2="30" y2="48" stroke="#1E293B" strokeWidth="2" />
      <line x1="34" y1="42" x2="34" y2="48" stroke="#1E293B" strokeWidth="2" />
      <line x1="39" y1="42" x2="39" y2="48" stroke="#1E293B" strokeWidth="2" />
    </svg>
  );
}

/**
 * Bony Skeleton Hand gripping/crawling over letters
 */
export function HalloweenSkeletonHand({
  size = 52,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-[0_4px_8px_rgba(15,23,42,0.28)] ${className}`}
      aria-hidden="true"
    >
      {/* Wrist & Carpal Bones */}
      <rect x="24" y="8" width="6" height="14" rx="3" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2" />
      <rect x="33" y="8" width="6" height="14" rx="3" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2" />
      <ellipse cx="32" cy="25" rx="12" ry="6" fill="#F1F5F9" stroke="#1E293B" strokeWidth="2" />

      {/* 4 Gripping Bony Fingers + Thumb */}
      {/* Thumb (Left) */}
      <path
        d="M20 25 C14 27 11 32 13 38"
        stroke="#1E293B"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M20 25 C14 27 11 32 13 38"
        stroke="#F8FAFC"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Finger 1 */}
      <rect x="20" y="30" width="4.5" height="12" rx="2.2" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.8" />
      <rect x="20.5" y="43" width="4" height="9" rx="2" fill="#E2E8F0" stroke="#1E293B" strokeWidth="1.8" />

      {/* Finger 2 (Longest) */}
      <rect x="27.5" y="31" width="4.5" height="14" rx="2.2" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.8" />
      <rect x="28" y="46" width="4" height="10" rx="2" fill="#E2E8F0" stroke="#1E293B" strokeWidth="1.8" />

      {/* Finger 3 */}
      <rect x="35" y="30" width="4.5" height="13" rx="2.2" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.8" />
      <rect x="35.5" y="44" width="4" height="9" rx="2" fill="#E2E8F0" stroke="#1E293B" strokeWidth="1.8" />

      {/* Finger 4 (Pinky) */}
      <rect x="42" y="28" width="4" height="10" rx="2" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.8" />
      <rect x="42.5" y="39" width="3.5" height="8" rx="1.7" fill="#E2E8F0" stroke="#1E293B" strokeWidth="1.8" />
    </svg>
  );
}

/**
 * Full Articulated Dancing Skeleton for Headline
 */
export function HalloweenDancingSkeleton({
  size = 68,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-[0_8px_16px_rgba(15,23,42,0.25)] ${className}`}
      aria-hidden="true"
    >
      {/* Head / Skull */}
      <g>
        <circle cx="40" cy="20" r="13" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2.2" />
        <rect x="33" y="28" width="14" height="8" rx="3" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2" />
        {/* Glowing Eyes */}
        <circle cx="35.5" cy="19" r="3.2" fill="#0F172A" />
        <circle cx="44.5" cy="19" r="3.2" fill="#0F172A" />
        <circle cx="35.5" cy="19" r="1.6" fill="#F97316" />
        <circle cx="44.5" cy="19" r="1.6" fill="#F97316" />
        {/* Nose & Teeth */}
        <polygon points="40,22 38.5,25.5 41.5,25.5" fill="#0F172A" />
        <line x1="36" y1="31" x2="44" y2="31" stroke="#1E293B" strokeWidth="1.8" />
        <line x1="38" y1="29" x2="38" y2="34" stroke="#1E293B" strokeWidth="1.5" />
        <line x1="42" y1="29" x2="42" y2="34" stroke="#1E293B" strokeWidth="1.5" />
      </g>

      {/* Spine & Ribcage */}
      <line x1="40" y1="36" x2="40" y2="66" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="40" y1="36" x2="40" y2="66" stroke="#F8FAFC" strokeWidth="1.8" strokeLinecap="round" />

      {/* Ribs */}
      <path d="M28 42 Q40 46 52 42" stroke="#1E293B" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M28 42 Q40 46 52 42" stroke="#F8FAFC" strokeWidth="2.2" strokeLinecap="round" />

      <path d="M30 49 Q40 53 50 49" stroke="#1E293B" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M30 49 Q40 53 50 49" stroke="#F8FAFC" strokeWidth="2.2" strokeLinecap="round" />

      <path d="M32 56 Q40 59 48 56" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 56 Q40 59 48 56" stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round" />

      {/* Waving Left Arm (raised up!) */}
      <path
        d="M28 42 L15 32 L10 18"
        stroke="#1E293B"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 42 L15 32 L10 18"
        stroke="#F8FAFC"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="17" r="3" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.8" />

      {/* Waving Right Arm */}
      <path
        d="M52 42 L65 34 L70 22"
        stroke="#1E293B"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M52 42 L65 34 L70 22"
        stroke="#F8FAFC"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="70" cy="21" r="3" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.8" />

      {/* Pelvis */}
      <ellipse cx="40" cy="67" rx="9" ry="4.5" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2" />

      {/* Dancing Legs */}
      <path
        d="M34 70 L26 82 L30 94"
        stroke="#1E293B"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 70 L26 82 L30 94"
        stroke="#F8FAFC"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M46 70 L54 82 L50 94"
        stroke="#1E293B"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M46 70 L54 82 L50 94"
        stroke="#F8FAFC"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Floating Crossed Bones Accent
 */
export function HalloweenFloatingBone({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size * 0.55}
      viewBox="0 0 44 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-sm ${className}`}
      aria-hidden="true"
    >
      <path
        d="M8 7 C5 4, 1 6, 3 10 C4 11.5, 4 12.5, 3 14 C1 18, 5 20, 8 17 L36 17 C39 20, 43 18, 41 14 C40 12.5, 40 11.5, 41 10 C43 6, 39 4, 36 7 Z"
        fill="#F8FAFC"
        stroke="#1E293B"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
