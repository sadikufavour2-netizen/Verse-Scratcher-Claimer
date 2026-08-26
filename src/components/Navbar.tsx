import React from 'react';
import { VerseLogo, PolygonBadge } from './VerseBrand';

interface NavbarProps {
  onLogoClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogoClick }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070A13]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand with 3D Verse Coin */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none group"
          onClick={onLogoClick}
        >
          <VerseLogo size={36} />
        </div>

        {/* Polygon Mainnet Network Indicator */}
        <div className="flex items-center gap-3">
          <PolygonBadge />
        </div>
      </div>
    </header>
  );
};
