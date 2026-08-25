import React, { useState } from 'react';
import { LogOut, ChevronDown, ExternalLink, RefreshCw, UserCheck, PlusCircle } from 'lucide-react';
import { ConnectionStatus, WalletAccount } from '../types';
import { formatAddress } from '../services/walletService';
import { VerseLogo, PolygonBadge } from './VerseBrand';

interface NavbarProps {
  status: ConnectionStatus;
  account: WalletAccount | null;
  errorMessage?: string | null;
  onSwitchNetworkClick: () => void;
  onDisconnectClick: () => void;
  onSwitchAccountClick: () => void;
  onRetryClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  account,
  errorMessage,
  onSwitchNetworkClick,
  onDisconnectClick,
  onSwitchAccountClick,
  onRetryClick,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070A13]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand with 3D Verse Coin */}
        <div className="flex items-center gap-3">
          <VerseLogo size={38} />
        </div>

        {/* Center / Network Indicator */}
        <div className="hidden md:flex items-center gap-3">
          <PolygonBadge />
        </div>

        {/* Right Section - Clean header (Connect button removed from top when disconnected) */}
        <div className="flex items-center gap-3">
          {/* STATE: DISCONNECTED -> Top button removed as requested */}
          {status === 'DISCONNECTED' && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex text-xs font-semibold text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
                Polygon Mainnet &bull; Chain 137
              </span>
            </div>
          )}

          {/* STATE: CONNECTING */}
          {status === 'CONNECTING' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0D1426] border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-bold">
              <RefreshCw size={14} className="animate-spin" />
              <span>CONNECTING WALLET...</span>
            </div>
          )}

          {/* STATE: WRONG_NETWORK */}
          {status === 'WRONG_NETWORK' && (
            <button
              id="navbar-switch-polygon-button"
              onClick={onSwitchNetworkClick}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95 animate-pulse cursor-pointer"
            >
              SWITCH TO POLYGON
            </button>
          )}

          {/* STATE: ERROR */}
          {status === 'ERROR' && (
            <button
              id="navbar-retry-button"
              onClick={onRetryClick}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <RefreshCw size={12} />
              TRY AGAIN
            </button>
          )}

          {/* STATE: CONNECTED - Active Polygon Account and Switcher */}
          {status === 'CONNECTED' && account && (
            <div className="relative">
              <button
                id="wallet-profile-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-[#0D1426] hover:bg-[#121c35] border border-cyan-500/40 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                {/* Green Status Indicator */}
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider hidden sm:inline">
                    CONNECTED
                  </span>
                </div>

                {/* Truncated Address */}
                <span className="font-mono text-xs font-semibold text-white">
                  {formatAddress(account.address)}
                </span>

                {/* Polygon Tag */}
                <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-mono">
                  POLYGON
                </span>

                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* Dropdown Menu for Address Management */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-[#0A0F1D] border border-cyan-500/30 rounded-2xl shadow-2xl p-4 z-50 space-y-3.5">
                    <div className="pb-2.5 border-b border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Active Polygon Wallet
                        </span>
                        <UserCheck size={14} className="text-emerald-400" />
                      </div>
                      <p className="text-xs font-bold text-white mt-0.5">{account.walletName}</p>
                      <p className="text-[11px] font-mono text-[#00E5FF] break-all mt-1 bg-black/40 p-1.5 rounded-lg border border-slate-800">
                        {account.address}
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>VERSE Balance:</span>
                        <span className="font-bold text-[#00E5FF]">{account.balanceVerse || '0'} VERSE</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>MATIC / POL Balance:</span>
                        <span className="font-bold text-purple-300">{account.balanceMatic || '0'} POL</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Polygon Network:</span>
                        <span className="font-semibold text-emerald-400">Chain 137 (Connected)</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onSwitchAccountClick();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[#00E5FF] hover:bg-[#00E5FF]/10 rounded-xl transition-colors text-left"
                      >
                        <span className="flex items-center gap-2">
                          <PlusCircle size={14} />
                          Connect Another Address
                        </span>
                        <span>&rarr;</span>
                      </button>

                      <a
                        href={`https://polygonscan.com/address/${account.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl"
                      >
                        <span>View on PolygonScan</span>
                        <ExternalLink size={12} />
                      </a>

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onDisconnectClick();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-xl font-bold transition-colors"
                      >
                        <span>Disconnect Address</span>
                        <LogOut size={13} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
