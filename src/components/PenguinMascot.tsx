import React, { useState } from 'react';

interface PenguinMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  interactive?: boolean;
  className?: string;
  onGreetingClick?: () => void;
}

/**
 * PenguinMascot Component:
 * Official Mascot for PING (V.S.B. Engineering College Campus Assistant).
 * 
 * Features:
 * - Black-and-white body
 * - Expressive blue eyes with sparkle reflections
 * - Orange beak
 * - Classic collegiate navy hoodie with "PING" branding
 * 
 * NOTE FOR FUTURE PHASES:
 * The outer container `<div id="mascot-viewport" data-model-slot="future-glb-3d">`
 * is structured with standardized aspect ratios and dimensions so a 3D Canvas
 * (Three.js / @react-three/fiber with GLB loader) can drop in as a direct replacement.
 */
export const PenguinMascot: React.FC<PenguinMascotProps> = ({
  size = 'lg',
  animated = true,
  interactive = true,
  className = '',
  onGreetingClick,
}) => {
  const [isWaving, setIsWaving] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-44 h-44 sm:w-52 sm:h-52',
    xl: 'w-60 h-60 sm:w-72 sm:h-72',
  }[size];

  const handleMascotClick = () => {
    if (!interactive) return;
    setIsWaving(true);
    setShowSpeechBubble(true);
    if (onGreetingClick) onGreetingClick();
    setTimeout(() => setIsWaving(false), 2400);
    setTimeout(() => setShowSpeechBubble(false), 3500);
  };

  return (
    <div
      id="mascot-viewport"
      data-model-slot="future-glb-3d"
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      aria-label="PING Penguin Mascot"
    >
      {/* Interactive Speech Bubble (for md/lg sizes) */}
      {showSpeechBubble && size !== 'sm' && (
        <div className="absolute -top-12 z-20 animate-bounce bg-white text-slate-800 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl shadow-lg border border-sky-100 whitespace-nowrap transition-all duration-300">
          <span>Hello, VSBian! 🐧✨</span>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-sky-100 rotate-45" />
        </div>
      )}

      {/* Mascot Graphic Container */}
      <div
        onClick={handleMascotClick}
        className={`${sizeClasses} ${animated ? 'animate-mascot-float' : ''} ${
          interactive ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200' : ''
        } relative flex items-center justify-center`}
        title={interactive ? "Click me for a friendly wave!" : "PING Mascot"}
      >
        <svg
          viewBox="0 0 200 240"
          className="w-full h-full drop-shadow-md overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients */}
            <radialGradient id="bodyGradient" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="65%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            <linearGradient id="hoodieGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="40%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#172554" />
            </linearGradient>

            <linearGradient id="hoodieDark" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#172554" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="beakGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>

            <linearGradient id="feetGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <radialGradient id="eyeBlueGradient" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="60%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </radialGradient>

            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Subtle Ground Shadow */}
          <ellipse cx="100" cy="226" rx="65" ry="10" fill="#0f172a" opacity="0.12" />

          {/* Cute Orange Feet */}
          <g id="feet">
            {/* Left Foot */}
            <path
              d="M 68 210 C 60 215, 55 224, 66 226 C 75 228, 85 225, 84 214 Z"
              fill="url(#feetGradient)"
            />
            {/* Right Foot */}
            <path
              d="M 132 210 C 140 215, 145 224, 134 226 C 125 228, 115 225, 116 214 Z"
              fill="url(#feetGradient)"
            />
          </g>

          {/* Main Penguin Body (Head + Torso) */}
          <path
            d="M 100 24
               C 62 24, 46 54, 46 95
               C 46 130, 48 160, 48 190
               C 48 215, 70 220, 100 220
               C 130 220, 152 215, 152 190
               C 152 160, 154 130, 154 95
               C 154 54, 138 24, 100 24 Z"
            fill="url(#bodyGradient)"
          />

          {/* White Chest & Face Mask */}
          <path
            d="M 100 44
               C 72 44, 62 70, 62 105
               C 62 140, 68 185, 100 185
               C 132 185, 138 140, 138 105
               C 138 70, 128 44, 100 44 Z"
            fill="#ffffff"
          />

          {/* Soft Cheeks Blush */}
          <circle cx="70" cy="100" r="7" fill="#f43f5e" opacity="0.22" />
          <circle cx="130" cy="100" r="7" fill="#f43f5e" opacity="0.22" />

          {/* Captivating Blue Eyes with Blinking Support */}
          <g id="eyes" className={animated ? 'animate-mascot-blink' : ''}>
            {/* Left Eye */}
            <g transform="translate(76, 78)">
              {/* Sclera & Iris */}
              <circle cx="6" cy="8" r="8" fill="url(#eyeBlueGradient)" />
              {/* Pupil */}
              <circle cx="6" cy="8" r="4.5" fill="#0f172a" />
              {/* Sparkle Highlights */}
              <circle cx="4" cy="5.5" r="2.4" fill="#ffffff" />
              <circle cx="8" cy="9.5" r="1.1" fill="#ffffff" />
            </g>

            {/* Right Eye */}
            <g transform="translate(106, 78)">
              {/* Sclera & Iris */}
              <circle cx="6" cy="8" r="8" fill="url(#eyeBlueGradient)" />
              {/* Pupil */}
              <circle cx="6" cy="8" r="4.5" fill="#0f172a" />
              {/* Sparkle Highlights */}
              <circle cx="4" cy="5.5" r="2.4" fill="#ffffff" />
              <circle cx="8" cy="9.5" r="1.1" fill="#ffffff" />
            </g>
          </g>

          {/* Cute Orange Beak */}
          <path
            d="M 88 92
               C 94 90, 106 90, 112 92
               C 112 100, 104 109, 100 109
               C 96 109, 88 100, 88 92 Z"
            fill="url(#beakGradient)"
            filter="url(#softShadow)"
          />

          {/* NAVY HOODIE (PING Campus Attire) */}
          <g id="navy-hoodie">
            {/* Hood Back Trim around head */}
            <path
              d="M 54 85 C 48 105, 48 120, 56 130 C 64 122, 60 98, 54 85 Z"
              fill="url(#hoodieDark)"
            />
            <path
              d="M 146 85 C 152 105, 152 120, 144 130 C 136 122, 140 98, 146 85 Z"
              fill="url(#hoodieDark)"
            />

            {/* Main Hoodie Body */}
            <path
              d="M 50 128
                 C 48 160, 49 195, 52 208
                 C 68 214, 132 214, 148 208
                 C 151 195, 152 160, 150 128
                 C 135 136, 120 138, 100 138
                 C 80 138, 65 136, 50 128 Z"
              fill="url(#hoodieGradient)"
            />

            {/* Hoodie Collar/Neck opening */}
            <path
              d="M 72 124
                 C 82 142, 118 142, 128 124
                 C 118 132, 82 132, 72 124 Z"
              fill="url(#hoodieDark)"
            />

            {/* White Hoodie Drawstrings */}
            <path
              d="M 88 132 Q 86 150 85 162"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
            <circle cx="85" cy="163" r="2" fill="#bae6fd" />

            <path
              d="M 112 132 Q 114 150 115 162"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
            <circle cx="115" cy="163" r="2" fill="#bae6fd" />

            {/* Kangaroo Front Pocket */}
            <path
              d="M 72 178
                 L 128 178
                 L 134 200
                 C 120 203, 80 203, 66 200
                 Z"
              fill="#172554"
              opacity="0.65"
              stroke="#1e3a8a"
              strokeWidth="1.2"
            />

            {/* PING Chest Typography (Official Branding) */}
            <text
              x="100"
              y="166"
              textAnchor="middle"
              fontFamily="Outfit, -apple-system, sans-serif"
              fontWeight="800"
              fontSize="17"
              fill="#ffffff"
              letterSpacing="2.5"
            >
              PING
            </text>
            <text
              x="100"
              y="174"
              textAnchor="middle"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="600"
              fontSize="6"
              fill="#93c5fd"
              letterSpacing="1"
            >
              VSB CAMPUS
            </text>
          </g>

          {/* Left Wing / Flipper (Interactive Waving or Resting) */}
          <g
            id="left-wing"
            className={isWaving ? 'animate-mascot-wave' : ''}
            style={{ transformOrigin: '48px 135px' }}
          >
            <path
              d="M 48 130
                 C 30 145, 24 165, 30 185
                 C 35 188, 44 175, 48 160 Z"
              fill="url(#bodyGradient)"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          </g>

          {/* Right Wing / Flipper (Resting by pocket) */}
          <g id="right-wing">
            <path
              d="M 152 130
                 C 170 145, 176 165, 170 185
                 C 165 188, 156 175, 152 160 Z"
              fill="url(#bodyGradient)"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          </g>
        </svg>
      </div>
    </div>
  );
};
