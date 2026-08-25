import React from 'react';
import { RefreshCw, AlertCircle, LogOut, ChevronDown, ExternalLink, ShieldCheck } from 'lucide-react';
import { ConnectionStatus, WalletAccount } from '../types';
import { formatAddress } from '../services/walletService';
import { VerseLogo, PolygonBadge } from './VerseBrand';

interface NavbarProps {
  status: ConnectionStatus;
  account: WalletAccount | null;
  errorMessage?: string | null;
  onConnectClick: () => void;
  onSwitchNetworkClick: () => void;
  onDisconnectClick: () => void;
  onRetryClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  account,
  errorMessage,
  onConnectClick,
  onSwitchNetworkClick,
  onDisconnectClick,
  onRetryClick,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070A13]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <VerseLogo size={36} />
        </div>

        {/* Center / Network Indicator */}
        <div className="hidden md:flex items-center gap-3">
          <PolygonBadge />
          <span className="text-xs font-semibold text-slate-400">Verse Scratcher Claimer</span>
        </div>

        {/* Right - State-driven Wallet Action */}
        <div className="flex items-center gap-3">
          {/* STATE: DISCONNECTED */}
          {status === 'DISCONNECTED' && (
            <button
              id="navbar-connect-wallet-button"
              onClick={onConnectClick}
              className="px-5 py-2.5 bg-gradient-to-r from-[#00E5FF] to-[#00b4d8] hover:from-[#00cce6] hover:to-[#0096c7] text-black font-extrabold text-sm rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <ShieldCheck size={16} />
              CONNECT WALLET
            </button>
          )}

          {/* STATE: CONNECTING */}
          {status === 'CONNECTING' && (
            <button
              disabled
              id="navbar-connecting-button"
              className="px-5 py-2.5 bg-[#0D1426] border border-[#00E5FF]/40 text-[#00E5FF] font-bold text-sm rounded-xl flex items-center gap-2"
            >
              <RefreshCw size={16} className="animate-spin" />
              CONNECTING WALLET...
            </button>
          )}

          {/* STATE: WRONG_NETWORK */}
          {status === 'WRONG_NETWORK' && (
            <button
              id="navbar-switch-polygon-button"
              onClick={onSwitchNetworkClick}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95 animate-pulse"
            >
              <AlertCircle size={16} />
              SWITCH TO POLYGON
            </button>
          )}

          {/* STATE: ERROR */}
          {status === 'ERROR' && (
            <div className="flex items-center gap-2">
              <button
                id="navbar-retry-button"
                onClick={onRetryClick}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
              >
                <RefreshCw size={14} />
                TRY AGAIN
              </button>
            </div>
          )}

          {/* STATE: CONNECTED */}
          {status === 'CONNECTED' && account && (
            <div className="relative">
              <button
                id="wallet-profile-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-[#0D1426] hover:bg-[#121c35] border border-slate-700/80 rounded-xl transition-all"
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

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-[#0A0F1D] border border-slate-700 rounded-xl shadow-2xl p-3 z-50 space-y-3">
                    <div className="pb-2 border-b border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Connected Wallet
                      </span>
                      <p className="text-xs font-bold text-white mt-0.5">{account.walletName}</p>
                      <p className="text-[11px] font-mono text-slate-400 break-all mt-1">
                        {account.address}
                      </p>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>VERSE Balance:</span>
                        <span className="font-bold text-[#00E5FF]">{account.balanceVerse || '0'} VERSE</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>MATIC Balance:</span>
                        <span className="font-bold text-purple-300">{account.balanceMatic || '0'} POL</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
                      <a
                        href={`https://polygonscan.com/address/${account.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                      >
                        <span>View on PolygonScan</span>
                        <ExternalLink size={12} />
                      </a>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onDisconnectClick();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950/40 rounded-lg font-semibold"
                      >
                        <span>Disconnect</span>
                        <LogOut size={12} />
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
