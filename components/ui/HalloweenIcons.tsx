import React from 'react';

/**
 * Lightweight SVG vector assets for subtle, elegant Halloween theme
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
 * Faint, subtle Crescent Moon with soft warm glow
 * Designed for low opacity (0.10 - 0.15) behind content
 */
export function HalloweenSubtleMoon({
  size = 90,
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
      {/* Soft ambient blur glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none blur-xl opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(254, 240, 199, 0.4) 0%, rgba(253, 224, 71, 0.15) 50%, transparent 80%)',
          transform: 'scale(1.5)',
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
          <linearGradient id="crescentMoonGlow" x1="20%" y1="10%" x2="80%" y2="90%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#fde68a" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#fcd34d" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d="M 68 12 C 34 22, 20 62, 48 90 C 22 84, 12 50, 32 20 C 42 6, 56 6, 68 12 Z"
          fill="url(#crescentMoonGlow)"
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

      {/* Jack-o'-lantern Eyes & Smile (cute, not scary) */}
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
