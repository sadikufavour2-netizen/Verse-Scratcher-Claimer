import React from 'react';

export const VerseLogo: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 32,
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <circle cx="20" cy="20" r="19" fill="#0A0E1A" stroke="#00E5FF" strokeWidth="2" />
        <circle cx="20" cy="20" r="15" fill="#0D1627" />
        {/* Verse 'V' stylized logo with Bitcoin.com cyan & energetic gradient */}
        <path
          d="M13 13L20 27L27 13"
          stroke="#00E5FF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 13L20 21L24 13"
          stroke="#00FF88"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        <circle cx="20" cy="27" r="1.5" fill="#FFFFFF" />
      </svg>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-extrabold tracking-wider text-white text-base">VERSE</span>
          <span className="text-[10px] font-semibold tracking-widest text-[#00E5FF] uppercase bg-[#00E5FF]/10 px-1.5 py-0.5 rounded border border-[#00E5FF]/30">
            DEX &amp; NFT
          </span>
        </div>
        <span className="text-[10px] tracking-wide text-slate-400">by Bitcoin.com</span>
      </div>
    </div>
  );
};

export const PolygonBadge: React.FC<{ className?: string; size?: 'sm' | 'md' }> = ({
  className = '',
  size = 'md',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border border-purple-500/30 bg-purple-950/40 text-purple-200 shadow-sm ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
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
      <span className="font-semibold tracking-tight text-purple-300">Polygon</span>
      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">
        137
      </span>
    </div>
  );
};

export const BitcoinComBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-950/30 text-amber-300 text-xs ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
      <span className="font-medium">Bitcoin.com Wallet Ready</span>
    </div>
  );
};
