"use client";

/**
 * Original educational SaaS illustration (not copied from any source).
 * A graduation-cap student seated at a laptop displaying a dashboard,
 * drawn in flat vector style — neutral grays with brand purple accents.
 */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 520"
      fill="none"
      role="img"
      aria-label="Student with graduation cap studying on a laptop"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Soft halo */}
      <circle cx="280" cy="240" r="210" fill="#6D4AFF" opacity="0.08" />

      {/* Monitor / dashboard card */}
      <rect
        x="118"
        y="150"
        width="324"
        height="232"
        rx="20"
        fill="white"
        opacity="0.06"
        stroke="#C9C3E8"
        strokeWidth="2"
      />
      <rect
        x="118"
        y="150"
        width="324"
        height="34"
        rx="16"
        fill="#6D4AFF"
        opacity="0.16"
      />
      <circle cx="138" cy="167" r="4" fill="#6D4AFF" opacity="0.7" />
      <circle cx="152" cy="167" r="4" fill="#6D4AFF" opacity="0.45" />
      <circle cx="166" cy="167" r="4" fill="#6D4AFF" opacity="0.28" />

      {/* Dashboard bars (chart) */}
      <rect x="150" y="300" width="26" height="50" rx="6" fill="#9CA3AF" opacity="0.5" />
      <rect x="190" y="278" width="26" height="72" rx="6" fill="#6D4AFF" opacity="0.85" />
      <rect x="230" y="258" width="26" height="92" rx="6" fill="#9CA3AF" opacity="0.4" />
      <rect x="270" y="288" width="26" height="62" rx="6" fill="#6D4AFF" opacity="0.55" />

      {/* Trend line */}
      <path
        d="M150 260 L196 244 L242 252 L288 226 L334 234"
        stroke="#6D4AFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="196" cy="244" r="4" fill="#6D4AFF" />
      <circle cx="288" cy="226" r="4" fill="#6D4AFF" />

      {/* Checkmark badge */}
      <circle cx="392" cy="206" r="22" fill="#6D4AFF" opacity="0.18" />
      <circle cx="392" cy="206" r="15" fill="#6D4AFF" opacity="0.9" />
      <path
        d="M386 206 L391 211 L399 201"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Laptop base */}
      <path
        d="M104 394 L456 394 L442 422 L118 422 Z"
        fill="#C9C3E8"
        opacity="0.5"
      />
      <rect x="244" y="394" width="72" height="10" rx="5" fill="#9CA3AF" opacity="0.55" />

      {/* Student figure (behind monitor top) */}
      <g>
        {/* Shoulders */}
        <path
          d="M226 196 C226 160 252 142 280 142 C308 142 334 160 334 196 L334 214 L226 214 Z"
          fill="#9CA3AF"
          opacity="0.45"
        />
        {/* Head */}
        <circle cx="280" cy="120" r="34" fill="#9CA3AF" opacity="0.55" />
        {/* Graduation cap */}
        <path
          d="M224 86 L280 64 L336 86 L280 108 Z"
          fill="#6D4AFF"
        />
        <path
          d="M244 96 L244 116 C244 124 316 124 316 116 L316 96"
          stroke="#6D4AFF"
          strokeWidth="3"
          fill="none"
        />
        <line x1="336" y1="86" x2="336" y2="104" stroke="#6D4AFF" strokeWidth="2" />
        <circle cx="336" cy="106" r="3.5" fill="#6D4AFF" />
      </g>

      {/* Floating mini "course" card */}
      <rect
        x="356"
        y="300"
        width="86"
        height="56"
        rx="12"
        fill="white"
        opacity="0.1"
        stroke="#C9C3E8"
        strokeWidth="1.5"
      />
      <circle cx="372" cy="316" r="9" fill="#6D4AFF" opacity="0.8" />
      <rect x="388" y="312" width="40" height="6" rx="3" fill="#9CA3AF" opacity="0.6" />
      <rect x="388" y="324" width="28" height="5" rx="2.5" fill="#9CA3AF" opacity="0.4" />

      {/* Small left card */}
      <rect
        x="116"
        y="226"
        width="22"
        height="22"
        rx="6"
        fill="#6D4AFF"
        opacity="0.6"
      />
    </svg>
  );
}