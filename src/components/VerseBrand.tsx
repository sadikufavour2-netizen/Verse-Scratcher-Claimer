import React from 'react';

/**
 * High-Fidelity 3D Verse Coin Logo matching the official Bitcoin.com Verse 3D token
 * (Cyan to Magenta gradient coin with thick overlapping white 'V' capsule pills & ribbed metallic rim)
 */
export const VerseCoinLogo: React.FC<{
  className?: string;
  size?: number;
  glow?: boolean;
}> = ({ className = '', size = 40, glow = false }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${
        glow ? 'drop-shadow-[0_0_18px_rgba(0,229,255,0.5)]' : 'drop-shadow-md'
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Coin Outer Edge Gradient */}
          <linearGradient id="verseCoinRim" x1="50" y1="30" x2="450" y2="470" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="35%" stopColor="#3B82F6" />
            <stop offset="70%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#FF00A0" />
          </linearGradient>

          {/* Coin Inner Face Gradient */}
          <linearGradient id="verseFaceGradient" x1="90" y1="80" x2="410" y2="420" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="28%" stopColor="#2563EB" />
            <stop offset="65%" stopColor="#9333EA" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>

          {/* Top-Left Highlight Shine */}
          <radialGradient id="verseShine" cx="150" cy="130" r="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#00E5FF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </radialGradient>

          {/* Pill Shadows */}
          <filter id="pillShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-4" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.45" />
          </filter>
          <filter id="topPillShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="6" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.5" />
          </filter>

          {/* Right Pill Gradient (Subtle lilac shading behind) */}
          <linearGradient id="rightPillGrad" x1="260" y1="140" x2="380" y2="350" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#E9D5FF" />
            <stop offset="100%" stopColor="#DDD6FE" />
          </linearGradient>

          {/* Left Pill Gradient (Foreground bright clean white with soft 3D bevel) */}
          <linearGradient id="leftPillGrad" x1="140" y1="140" x2="290" y2="380" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
        </defs>

        {/* Outer 3D Coin Ridge / Rim */}
        <circle cx="250" cy="250" r="238" fill="url(#verseCoinRim)" />
        <circle cx="250" cy="250" r="238" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.4" />

        {/* Ribbed Gear Texture on Rim */}
        <circle cx="250" cy="250" r="226" fill="none" stroke="#000000" strokeWidth="5" strokeOpacity="0.25" />
        <circle cx="250" cy="250" r="222" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.3" />

        {/* Main Inner Coin Face */}
        <circle cx="250" cy="250" r="215" fill="url(#verseFaceGradient)" />

        {/* Subtle radial inner glow & bevel ring */}
        <circle cx="250" cy="250" r="215" fill="url(#verseShine)" />
        <circle cx="250" cy="250" r="212" fill="none" stroke="#000000" strokeWidth="3" strokeOpacity="0.2" />

        {/* RIGHT PILL */}
        <g filter="url(#pillShadow)">
          <path
            d="M 292 135
               C 318 94, 372 106, 385 152
               C 392 176, 384 200, 368 226
               L 262 384
               C 246 408, 212 418, 186 398
               C 162 380, 162 344, 186 312
               Z"
            fill="url(#rightPillGrad)"
          />
        </g>

        {/* LEFT PILL */}
        <g filter="url(#topPillShadow)">
          <path
            d="M 205 135
               C 178 94, 126 106, 114 152
               C 106 176, 115 200, 131 226
               L 238 384
               C 254 408, 288 418, 314 398
               C 338 380, 338 344, 314 312
               Z"
            fill="url(#leftPillGrad)"
          />
        </g>

        {/* Bevel Highlights on Pill Edges */}
        <path
          d="M 125 158 C 120 180, 128 198, 140 218 L 244 372"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity="0.6"
        />
      </svg>
    </div>
  );
};

export const VerseLogo: React.FC<{
  className?: string;
  size?: number;
  showText?: boolean;
}> = ({ className = '', size = 36, showText = true }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <VerseCoinLogo size={size} glow={true} />
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 leading-none">
            <span className="font-black tracking-wider text-white text-lg">VERSE</span>
            <span className="text-[10px] font-extrabold tracking-widest text-[#00E5FF] uppercase bg-[#00E5FF]/10 px-2 py-0.5 rounded-md border border-[#00E5FF]/40 shadow-[0_0_8px_rgba(0,229,255,0.2)]">
              NFT CLAIMER
            </span>
          </div>
          <span className="text-[10px] tracking-wide text-slate-400 font-medium mt-0.5">
            by Bitcoin.com &bull; Polygon
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Clean Polygon Badge without "137" writeup
 */
export const PolygonBadge: React.FC<{ className?: string; size?: 'sm' | 'md' }> = ({
  className = '',
  size = 'md',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border border-purple-500/40 bg-purple-950/50 text-purple-200 shadow-sm ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
      } ${className}`}
    >
      <svg
        className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          fill="#8247E5"
          d="M16.5 12l3.5-2v-4l-3.5-2-3.5 2v4l3.5 2zm-9 0l3.5-2v-4L7.5 4 4 6v4l3.5 2zm4.5 2.6L8.5 16.6l-3.5-2v4l3.5 2 3.5-2v-4zm4.5 0L13 16.6l-3.5-2v4l3.5 2 3.5-2v-4z"
        />
      </svg>
      <span className="font-bold tracking-tight text-purple-200">Polygon</span>
    </div>
  );
};
