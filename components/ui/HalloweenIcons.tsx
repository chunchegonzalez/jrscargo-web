import React from 'react';

/**
 * Lightweight SVG vector assets for subtle Halloween theme
 * Minimal file size, zero external dependencies, 100% resolution independent
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
 * Faint full moon — very subtle, not the bright yellow crescent.
 * In the mockup it's barely visible as a pale disc behind the mist.
 */
export function HalloweenFullMoon({
  size = 120,
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
      {/* Soft ambient glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,240,0.25) 0%, rgba(220,215,230,0.08) 50%, transparent 75%)',
          transform: 'scale(1.8)',
          filter: 'blur(8px)',
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="moonFull" cx="45%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#f5f0e8" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#e8e0d5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#d5cec5" stopOpacity="0.15" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="42" fill="url(#moonFull)" />
        {/* Subtle craters */}
        <circle cx="38" cy="35" r="6" fill="rgba(200,195,190,0.15)" />
        <circle cx="58" cy="55" r="8" fill="rgba(200,195,190,0.12)" />
        <circle cx="45" cy="60" r="4" fill="rgba(200,195,190,0.1)" />
      </svg>
    </div>
  );
}

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

      {/* Jack-o&apos;-lantern Eyes & Smile (cute, not scary) */}
      <polygon points="11,15 13,18 9,18" fill="#431407" />
      <polygon points="21,15 23,18 19,18" fill="#431407" />
      {/* Friendly Smile */}
      <path
        d="M12 21 C14 24, 18 24, 20 21 C18 23, 14 23, 12 21 Z"
        fill="#431407"
      />
    </svg>
  );
}

export function HalloweenWitchHat({
  size = 32,
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
      height={(size * 34) / 40}
      viewBox="0 0 40 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hatDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4c3a5e" />
          <stop offset="60%" stopColor="#2c1e3d" />
          <stop offset="100%" stopColor="#1a0f26" />
        </linearGradient>
      </defs>

      {/* Cone / Top of Hat */}
      <path
        d="M23 4 C24 3, 26 2, 28 3 C27 5, 23 8, 22 10 L31 24 C31 24, 18 25, 9 24 L19 9 Z"
        fill="url(#hatDarkGrad)"
      />

      {/* Orange Ribbon Band */}
      <path
        d="M10 23.5 C16 25 24 25 30 23.5 L30.5 25.5 C24.5 27 15.5 27 9.5 25.5 Z"
        fill="#f97316"
      />

      {/* Gold Buckle */}
      <rect
        x="18.5"
        y="23.2"
        width="3.5"
        height="3"
        rx="0.5"
        fill="#fbbf24"
        stroke="#78350f"
        strokeWidth="0.5"
      />

      {/* Curved Brim */}
      <ellipse
        cx="20"
        cy="28"
        rx="18"
        ry="4.5"
        fill="#261738"
        transform="rotate(-5 20 28)"
      />
      <ellipse
        cx="20"
        cy="27.5"
        rx="16"
        ry="3.5"
        fill="#3d2a52"
        transform="rotate(-5 20 27.5)"
      />
    </svg>
  );
}

/**
 * Large, dark bare tree silhouette for the left side of the hero.
 * In the mockup, dark branches are clearly visible against the misty background.
 */
export function HalloweenSpookyTree({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width="200"
      height="420"
      viewBox="0 0 200 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Main trunk */}
      <path
        d="M85 420 Q80 350 75 280 Q72 240 78 200 Q82 170 88 140 Q92 110 100 80 Q105 60 112 35 Q115 22 118 10"
        stroke="#2d3748"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Left major branch */}
      <path
        d="M78 200 Q60 175 40 160 Q25 150 10 145 Q5 143 0 142"
        stroke="#2d3748"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      {/* Left sub-branches */}
      <path d="M40 160 Q30 140 15 130" stroke="#2d3748" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M55 170 Q45 155 30 150" stroke="#2d3748" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.45" />
      <path d="M10 145 Q5 130 0 120" stroke="#2d3748" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Right major branch */}
      <path
        d="M88 160 Q110 140 130 125 Q145 115 160 108"
        stroke="#2d3748"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      {/* Right sub-branches */}
      <path d="M130 125 Q140 110 155 100" stroke="#2d3748" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.45" />
      <path d="M120 132 Q135 118 150 115" stroke="#2d3748" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Upper branches */}
      <path d="M100 100 Q80 85 60 75 Q45 68 25 65" stroke="#2d3748" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M25 65 Q15 60 5 55" stroke="#2d3748" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M60 75 Q50 60 40 50" stroke="#2d3748" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M105 80 Q120 65 140 55" stroke="#2d3748" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.45" />
      <path d="M140 55 Q155 48 165 40" stroke="#2d3748" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Top twigs */}
      <path d="M112 40 Q130 30 145 20" stroke="#2d3748" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.45" />
      <path d="M115 30 Q100 15 85 5" stroke="#2d3748" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M118 10 Q125 5 135 0" stroke="#2d3748" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Lower right branches */}
      <path d="M82 240 Q100 225 120 218" stroke="#2d3748" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M120 218 Q135 212 150 210" stroke="#2d3748" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Lower left branch */}
      <path d="M76 270 Q55 255 35 248" stroke="#2d3748" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.45" />
      <path d="M35 248 Q20 242 5 240" stroke="#2d3748" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
    </svg>
  );
}

/**
 * Large, detailed castle silhouette for the bottom-right of the hero.
 * In the mockup, it's clearly visible as a dark gothic silhouette against the mist.
 */
export function HalloweenCastleSilhouette({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width="320"
      height="300"
      viewBox="0 0 320 300"
      fill="#2d3748"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Left Tower */}
      <path
        d="M20 300 L20 120 L25 120 L25 105 L30 105 L30 90 L35 80 L40 90 L40 105 L45 105 L45 120 L50 120 L50 300 Z"
        opacity="0.25"
      />
      {/* Left tower window */}
      <rect x="30" y="150" width="10" height="14" rx="5" fill="#1a202c" opacity="0.15" />
      <rect x="30" y="200" width="10" height="14" rx="5" fill="#1a202c" opacity="0.15" />

      {/* Left wall section */}
      <path
        d="M50 300 L50 180 L55 175 L60 180 L65 175 L70 180 L75 175 L80 180 L80 300 Z"
        opacity="0.2"
      />

      {/* Center Left Tower (taller) */}
      <path
        d="M80 300 L80 100 L85 100 L85 80 L90 80 L90 60 L95 50 L100 40 L105 50 L110 60 L110 80 L115 80 L115 100 L120 100 L120 300 Z"
        opacity="0.3"
      />
      {/* Center tower windows */}
      <rect x="92" y="120" width="16" height="22" rx="8" fill="#1a202c" opacity="0.18" />
      <rect x="92" y="170" width="16" height="22" rx="8" fill="#1a202c" opacity="0.18" />
      <rect x="92" y="230" width="16" height="22" rx="8" fill="#1a202c" opacity="0.18" />

      {/* Center wall with gate */}
      <path
        d="M120 300 L120 160 L125 155 L130 160 L135 155 L140 160 L145 155 L150 160 L155 155 L160 160 L165 155 L170 160 L175 155 L180 160 L180 300 Z"
        opacity="0.22"
      />
      {/* Gate arch */}
      <path d="M135 300 L135 230 Q150 210 165 230 L165 300 Z" fill="#1a202c" opacity="0.12" />

      {/* Center Right Tower (tallest) */}
      <path
        d="M180 300 L180 80 L185 80 L185 55 L190 55 L190 35 L195 25 L200 15 L205 25 L210 35 L210 55 L215 55 L215 80 L220 80 L220 300 Z"
        opacity="0.35"
      />
      {/* Tower flag pole */}
      <line x1="200" y1="15" x2="200" y2="0" stroke="#2d3748" strokeWidth="1.5" opacity="0.3" />
      <path d="M200 0 L215 6 L200 12 Z" opacity="0.25" />
      {/* Tower windows */}
      <rect x="192" y="90" width="16" height="22" rx="8" fill="#1a202c" opacity="0.2" />
      <rect x="192" y="140" width="16" height="22" rx="8" fill="#1a202c" opacity="0.2" />
      <rect x="192" y="200" width="16" height="22" rx="8" fill="#1a202c" opacity="0.18" />

      {/* Right wall section */}
      <path
        d="M220 300 L220 170 L225 165 L230 170 L235 165 L240 170 L245 165 L250 170 L250 300 Z"
        opacity="0.2"
      />

      {/* Right Tower */}
      <path
        d="M250 300 L250 110 L255 110 L255 90 L260 90 L260 75 L265 65 L270 75 L270 90 L275 90 L275 110 L280 110 L280 300 Z"
        opacity="0.28"
      />
      {/* Right tower windows */}
      <rect x="260" y="140" width="10" height="14" rx="5" fill="#1a202c" opacity="0.15" />
      <rect x="260" y="190" width="10" height="14" rx="5" fill="#1a202c" opacity="0.15" />

      {/* Small right turret */}
      <path
        d="M290 300 L290 160 L295 155 L300 145 L305 155 L310 160 L310 300 Z"
        opacity="0.2"
      />
    </svg>
  );
}
