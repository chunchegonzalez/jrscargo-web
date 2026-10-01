import React from 'react';

/**
 * Lightweight SVG & Image assets for Halloween theme
 * Matches the reference mockup exactly:
 * - Soft full moon with clouds
 * - Delicate spiderweb with hanging spider
 * - 2 small static bats
 * - Mini pumpkin easter egg
 * - Witch hat for chatbot
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

/**
 * Spiderweb pinned to top-right corner with a tiny spider hanging down
 * Matches the reference mockup exactly
 */
export function HalloweenSpiderwebWithSpider({
  size = 130,
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
      height={size * 1.25}
      viewBox="0 0 100 125"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Radial anchor threads */}
      <line x1="100" y1="0" x2="0" y2="0" strokeWidth="1.2" />
      <line x1="100" y1="0" x2="100" y2="90" strokeWidth="1.2" />
      <line x1="100" y1="0" x2="15" y2="85" strokeWidth="1.0" />
      <line x1="100" y1="0" x2="30" y2="50" strokeWidth="0.8" />
      <line x1="100" y1="0" x2="65" y2="18" strokeWidth="0.8" />
      <line x1="100" y1="0" x2="50" y2="78" strokeWidth="0.7" />
      <line x1="100" y1="0" x2="85" y2="35" strokeWidth="0.7" />

      {/* Concentric spiral arches */}
      <path d="M92 0 C 88 12, 88 12, 100 8" strokeWidth="0.7" />
      <path d="M82 0 C 76 22, 76 22, 100 18" strokeWidth="0.7" />
      <path d="M72 0 C 62 34, 62 34, 100 28" strokeWidth="0.8" />
      <path d="M60 0 C 48 46, 50 46, 100 38" strokeWidth="0.8" />
      <path d="M48 0 C 35 58, 38 58, 100 50" strokeWidth="0.9" />
      <path d="M35 0 C 20 70, 24 70, 100 62" strokeWidth="0.9" />
      <path d="M22 0 C 8 82, 12 82, 100 75" strokeWidth="1.0" />

      {/* Vertical hanging thread */}
      <line x1="68" y1="28" x2="68" y2="102" strokeWidth="0.8" strokeDasharray="1 1" />

      {/* Tiny hanging spider */}
      <g transform="translate(68, 105)" stroke="none" fill="currentColor">
        {/* Spider abdomen & head */}
        <circle cx="0" cy="0" r="3.2" />
        <circle cx="0" cy="-2.5" r="2.0" />
        {/* Legs */}
        <path
          d="M -2.5 -1.5 Q -6 -4 -7 -1 M -2.5 0 Q -7 0 -8 3 M -2.5 1.5 Q -6 5 -5 8
             M 2.5 -1.5 Q 6 -4 7 -1 M 2.5 0 Q 7 0 8 3 M 2.5 1.5 Q 6 5 5 8"
          stroke="currentColor"
          strokeWidth="0.75"
          fill="none"
        />
      </g>
    </svg>
  );
}

/**
 * Soft full moon matching the reference mockup:
 * - Large circular pale moon disc (cream/warm peach)
 * - Soft blurred edges
 * - Soft puffy cloud in front of the lower-left portion
 */
export function HalloweenSoftFullMoon({
  size = 160,
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
      {/* Outer ambient blur glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none blur-2xl opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(254, 243, 199, 0.4) 0%, rgba(253, 230, 138, 0.15) 50%, transparent 75%)',
          transform: 'scale(1.5)',
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 140 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          {/* Moon disc gradient (warm cream to soft peach) */}
          <radialGradient id="fullMoonGrad" cx="45%" cy="40%" r="52%">
            <stop offset="0%" stopColor="#fffdfa" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#fef3c7" stopOpacity="0.75" />
            <stop offset="80%" stopColor="#fed7aa" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fdba74" stopOpacity="0.30" />
          </radialGradient>

          {/* Cloud gradient (soft lavender-grey) */}
          <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2dcee" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#d4cde3" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#c5bdd8" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* Moon circular body */}
        <circle cx="68" cy="62" r="50" fill="url(#fullMoonGrad)" />

        {/* Soft subtle crater markings */}
        <circle cx="52" cy="48" r="9" fill="#fde68a" fillOpacity="0.25" />
        <circle cx="78" cy="40" r="12" fill="#fed7aa" fillOpacity="0.20" />
        <circle cx="85" cy="68" r="8" fill="#fed7aa" fillOpacity="0.22" />
        <circle cx="60" cy="78" r="14" fill="#fde68a" fillOpacity="0.20" />

        {/* Puffy soft cloud passing across lower-left of moon */}
        <g fill="url(#cloudGrad)">
          <ellipse cx="28" cy="98" rx="24" ry="14" />
          <ellipse cx="48" cy="90" rx="22" ry="18" />
          <ellipse cx="72" cy="94" rx="24" ry="16" />
          <ellipse cx="92" cy="102" rx="18" ry="12" />
          <ellipse cx="38" cy="104" rx="30" ry="12" />
        </g>
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
