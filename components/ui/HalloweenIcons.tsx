import React from 'react';

/**
 * Lightweight SVG & Image assets for Halloween theme
 * Matches the user-provided design reference images exactly
 */

export function HalloweenBat({
  size = 24,
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
      height={(size * 18) / 32}
      viewBox="0 0 32 18"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M16 4.5C14.8 2.2 12.2 0.5 9 0.5C4 0.5 0.5 4.5 0 9.5C2.5 8 5.5 8.5 7.5 10.5C9.5 8.5 12.5 8.5 14.5 10C15 7 15.5 5.5 16 4.5C16.5 5.5 17 7 17.5 10C19.5 8.5 22.5 8.5 24.5 10.5C26.5 8.5 29.5 8 32 9.5C31.5 4.5 28 0.5 23 0.5C19.8 0.5 17.2 2.2 16 4.5Z" />
    </svg>
  );
}

export function HalloweenSpiderweb({
  size = 120,
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
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Radial anchor threads */}
      <line x1="100" y1="0" x2="0" y2="0" strokeWidth="1.5" />
      <line x1="100" y1="0" x2="100" y2="100" strokeWidth="1.5" />
      <line x1="100" y1="0" x2="0" y2="100" strokeWidth="1.2" />
      <line x1="100" y1="0" x2="20" y2="60" strokeWidth="1" />
      <line x1="100" y1="0" x2="60" y2="20" strokeWidth="1" />
      <line x1="100" y1="0" x2="40" y2="90" strokeWidth="0.8" />
      <line x1="100" y1="0" x2="90" y2="40" strokeWidth="0.8" />

      {/* Spiral concentric arches */}
      <path d="M90 0 C 85 15, 85 15, 100 10" strokeWidth="0.8" />
      <path d="M80 0 C 75 25, 75 25, 100 20" strokeWidth="0.8" />
      <path d="M70 0 C 60 38, 62 38, 100 30" strokeWidth="0.9" />
      <path d="M60 0 C 48 50, 50 50, 100 40" strokeWidth="1" />
      <path d="M50 0 C 35 62, 38 62, 100 50" strokeWidth="1" />
      <path d="M40 0 C 22 75, 25 75, 100 60" strokeWidth="1" />
      <path d="M30 0 C 10 88, 12 88, 100 70" strokeWidth="1.1" />
      <path d="M20 0 C 0 98, 2 98, 100 80" strokeWidth="1.1" />
    </svg>
  );
}

/**
 * Realistic glowing crescent moon matching the mockup exactly:
 * - Luminous cream/warm golden crescent on the left
 * - Subtle shaded disc body
 * - Soft warm ambient aura
 * - Soft wispy cloud layer passing in front
 */
export function HalloweenSubtleMoon({
  size = 140,
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
      {/* Outer ambient warm glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none blur-2xl"
        style={{
          background: 'radial-gradient(circle, rgba(254, 243, 199, 0.45) 0%, rgba(253, 230, 138, 0.2) 45%, transparent 75%)',
          transform: 'scale(1.6)',
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          {/* Crescent luminous gradient */}
          <linearGradient id="moonArcGrad" x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#fef3c7" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#fde68a" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.4" />
          </linearGradient>

          {/* Faint dark body disc */}
          <radialGradient id="moonBodyShade" cx="45%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.12" />
            <stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.02" />
          </radialGradient>
        </defs>

        {/* Faint circular silhouette of full moon sphere */}
        <circle cx="55" cy="55" r="42" fill="url(#moonBodyShade)" />

        {/* Bright Crescent Moon Arc (curve on the left wrapping around top/bottom) */}
        <path
          d="M 58 13 C 28 20, 15 52, 28 82 C 34 94, 45 101, 56 102 C 36 94, 30 70, 36 48 C 41 33, 49 21, 58 13 Z"
          fill="url(#moonArcGrad)"
          filter="drop-shadow(0 0 8px rgba(254, 240, 138, 0.6))"
        />

        {/* Soft wispy cloud drifting across lower part of moon */}
        <path
          d="M 10 85 C 22 75, 42 78, 55 82 C 68 85, 82 80, 95 84 C 82 92, 50 94, 25 92 Z"
          fill="#d8d3e4"
          fillOpacity="0.35"
        />
        <path
          d="M 2 92 C 16 86, 32 88, 48 90 C 62 92, 75 90, 90 94 C 70 98, 35 98, 12 96 Z"
          fill="#c8c1da"
          fillOpacity="0.25"
        />
      </svg>
    </div>
  );
}

export function HalloweenMiniPumpkin({
  size = 15,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="pumpkinGrad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ff9d42" />
          <stop offset="70%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </radialGradient>
      </defs>

      {/* Stem */}
      <path
        d="M16 3 C16 3, 18 1, 20 2 C21 3, 18.5 6, 17 8 Z"
        fill="#15803d"
      />

      {/* Pumpkin Body Segments */}
      <ellipse cx="16" cy="18" rx="13" ry="10" fill="url(#pumpkinGrad)" />
      <ellipse cx="16" cy="18" rx="8" ry="10.5" fill="#f97316" />
      <ellipse cx="16" cy="18" rx="4" ry="10.8" fill="#fb923c" />

      {/* Jack-o'-lantern Eyes & Smile */}
      <polygon points="11,15 13,18 9,18" fill="#431407" />
      <polygon points="21,15 23,18 19,18" fill="#431407" />
      <path
        d="M12 21 C14 24, 18 24, 20 21 C18 23, 14 23, 12 21 Z"
        fill="#431407"
      />
    </svg>
  );
}

/**
 * Witch hat rendered from the user reference screenshot
 * Transparent PNG with exact purple color, curled tip, orange band, and gold buckle
 */
export function HalloweenWitchHat({
  size = 46,
  className = '',
  style = {},
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/halloween-witch-hat.png"
      alt="Halloween Witch Hat"
      width={size}
      height={Math.round((size * 90) / 110)}
      className={`object-contain pointer-events-none select-none ${className}`}
      style={style}
    />
  );
}
