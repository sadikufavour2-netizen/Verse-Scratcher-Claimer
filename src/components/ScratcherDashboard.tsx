import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Trophy,
  Gift,
  Coins,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  Info,
  Wallet,
  PlusCircle,
  Search,
} from 'lucide-react';
import { ConnectionStatus, ScratcherTicket, WalletAccount } from '../types';
import { ScratchCard } from './ScratchCard';
import { ClaimModal } from './ClaimModal';
import { PolygonBadge, VerseCoinLogo } from './VerseBrand';
import {
  fetchRealScratchersForAddress,
  saveScratchersForAddress,
  addManualScratcherForAddress,
  getSavedScratchersForAddress,
} from '../services/walletService';

interface ScratcherDashboardProps {
  status: ConnectionStatus;
  account: WalletAccount | null;
  errorMessage?: string | null;
  onConnectClick: () => void;
  onSwitchNetworkClick: () => void;
  onRetryClick: () => void;
}

export const ScratcherDashboard: React.FC<ScratcherDashboardProps> = ({
  status,
  account,
  errorMessage,
  onConnectClick,
  onSwitchNetworkClick,
  onRetryClick,
}) => {
  const [tickets, setTickets] = useState<ScratcherTicket[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unscratched' | 'scratched' | 'claimed'>('all');
  const [selectedTicketForClaim, setSelectedTicketForClaim] = useState<ScratcherTicket | null>(null);
  const [isBatchClaimOpen, setIsBatchClaimOpen] = useState(false);
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);

  // Fetch real NFTs for connected Polygon address
  useEffect(() => {
    let isMounted = true;

    async function loadNFTs() {
      if (account?.address) {
        setIsLoadingNFTs(true);
        // First load any locally saved cache for instant UI
        const saved = getSavedScratchersForAddress(account.address);
        if (saved && saved.length > 0) {
          setTickets(saved);
        }

        try {
          const realTickets = await fetchRealScratchersForAddress(account.address);
          if (isMounted) {
            setTickets(realTickets);
          }
        } catch (e) {
          console.warn('NFT load failed', e);
        } finally {
          if (isMounted) {
            setIsLoadingNFTs(false);
          }
        }
      } else {
        setTickets([]);
      }
    }

    loadNFTs();

    return () => {
      isMounted = false;
    };
  }, [account?.address]);

  const handleRefreshNFTs = async () => {
    if (!account?.address) return;
    setIsLoadingNFTs(true);
    try {
      const real = await fetchRealScratchersForAddress(account.address);
      setTickets(real);
    } finally {
      setIsLoadingNFTs(false);
    }
  };

  const handleImportToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.address || !customTokenInput.trim()) return;
    const id = parseInt(customTokenInput.trim(), 10);
    if (isNaN(id) || id <= 0) return;

    const updated = addManualScratcherForAddress(account.address, id);
    setTickets(updated);
    setCustomTokenInput('');
    setShowImportForm(false);
  };

  const handleScratchComplete = (ticketId: string) => {
    setTickets((prev) => {
      const updated = prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'scratched' as const,
              scratchPercentage: 100,
            }
          : t
      );
      if (account?.address) {
        saveScratchersForAddress(account.address, updated);
      }
      return updated;
    });
  };

  const handleClaimSuccess = (claimedTicketIds: string[], txHash: string) => {
    setTickets((prev) => {
      const updated = prev.map((t) =>
        claimedTicketIds.includes(t.id)
          ? {
              ...t,
              status: 'claimed' as const,
              claimTxHash: txHash,
              claimTimestamp: new Date().toISOString(),
            }
          : t
      );
      if (account?.address) {
        saveScratchersForAddress(account.address, updated);
      }
      return updated;
    });
    setSelectedTicketForClaim(null);
    setIsBatchClaimOpen(false);
  };

  const handleScratchAll = () => {
    setTickets((prev) => {
      const updated = prev.map((t) =>
        t.status === 'unscratched'
          ? {
              ...t,
              status: 'scratched' as const,
              scratchPercentage: 100,
            }
          : t
      );
      if (account?.address) {
        saveScratchersForAddress(account.address, updated);
      }
      return updated;
    });
  };

  // Calculations
  const filteredTickets = tickets.filter((t) => {
    if (activeFilter === 'all') return true;
    return t.status === activeFilter;
  });

  const readyToClaimTickets = tickets.filter((t) => t.status === 'scratched');
  const readyVerseValue = readyToClaimTickets.reduce((sum, t) => sum + t.totalVerseValue, 0);
  const readyMaticValue = readyToClaimTickets.reduce((sum, t) => sum + t.totalMaticValue, 0);

  const totalClaimedVerse = tickets
    .filter((t) => t.status === 'claimed')
    .reduce((sum, t) => sum + t.totalVerseValue, 0);

  const unscratchedCount = tickets.filter((t) => t.status === 'unscratched').length;
  const claimedCount = tickets.filter((t) => t.status === 'claimed').length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. DISCONNECTED / WRONG NETWORK / ERROR HERO STATE */}
      {status !== 'CONNECTED' && (
        <div className="space-y-8">
          {/* Main Hero Card styled with Verse Logo Theme */}
          <div
            id="hero-disconnected-card"
            className="relative rounded-3xl bg-[#080C1A] border border-cyan-500/30 p-8 sm:p-12 shadow-[0_0_50px_rgba(0,229,255,0.15)] overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8"
          >
            {/* Top Metallic Rainbow Gradient Stripe matching Verse Coin */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] via-[#9333EA] to-[#FF00A0]" />

            {/* Ambient Lighting */}
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#FF00A0]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-xl space-y-4">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <PolygonBadge size="md" />
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight flex flex-col sm:flex-row sm:items-center gap-3">
                <span>VERSE SCRATCHER</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] to-[#EC4899]">
                  CLAIMER
                </span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Connect your Web3 wallet on Polygon to reveal your Verse Scratcher NFTs, scratch for rewards, and claim prizes directly to your connected address.
              </p>

              {/* Status specific banners */}
              {status === 'WRONG_NETWORK' && (
                <div
                  id="wrong-network-banner"
                  className="p-4 bg-amber-950/60 border border-amber-500/50 rounded-2xl text-left space-y-2"
                >
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <Zap size={16} />
                    WRONG NETWORK DETECTED
                  </div>
                  <p className="text-xs text-amber-200">
                    Please switch your connected wallet to Polygon Mainnet to view and claim your Verse Scratchers.
                  </p>
                  <button
                    id="hero-switch-network-btn"
                    onClick={onSwitchNetworkClick}
                    className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow transition-all active:scale-95 cursor-pointer"
                  >
                    SWITCH TO POLYGON
                  </button>
                </div>
              )}

              {status === 'ERROR' && (
                <div
                  id="error-banner"
                  className="p-4 bg-red-950/60 border border-red-500/50 rounded-2xl text-left space-y-2"
                >
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                    <Info size={16} />
                    WALLET CONNECTION FAILED
                  </div>
                  <p className="text-xs text-red-200">
                    {errorMessage || 'Unable to connect your wallet. Please verify your connection settings and try again.'}
                  </p>
                  <button
                    id="hero-retry-btn"
                    onClick={onRetryClick}
                    className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    TRY AGAIN
                  </button>
                </div>
              )}

              {/* Connect CTA Button on Hero */}
              {status === 'DISCONNECTED' && (
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                  <button
                    id="hero-connect-wallet-button"
                    onClick={onConnectClick}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] to-[#9333EA] hover:from-[#00cce6] hover:to-[#7e22ce] text-white font-black text-sm rounded-2xl shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <ShieldCheck size={20} />
                    CONNECT WALLET
                    <ArrowRight size={18} />
                  </button>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
                    <span>Web3 Ready &bull; Polygon</span>
                  </div>
                </div>
              )}
            </div>

            {/* Visual 3D Logo & Scratch Preview Card */}
            <div className="relative z-10 w-full sm:w-80 p-5 rounded-3xl bg-[#0A0F1E] border border-cyan-500/40 shadow-2xl space-y-3 flex flex-col items-center">
              <div className="w-full flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF]">
                  Verse Official Token
                </span>
                <span className="text-xs font-black text-amber-300">Win up to 500k VERSE</span>
              </div>
              <div className="w-full py-5 aspect-[16/9] rounded-2xl bg-gradient-to-br from-[#0F1B38] to-[#080C1A] border border-cyan-500/30 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
                <VerseCoinLogo size={72} glow={true} className="mb-2" />
                <span className="text-sm font-extrabold text-white">Verse Scratcher NFT</span>
                <span className="text-[11px] text-slate-400">Scratch &amp; claim prizes on Polygon</span>
              </div>
              <div className="w-full flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Network:</span>
                <span className="font-mono text-purple-300 font-bold">Polygon Mainnet</span>
              </div>
            </div>
          </div>

          {/* How It Works Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-3xl bg-[#080C1A] border border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00E5FF] font-black">
                1
              </div>
              <h3 className="text-base font-extrabold text-white">Connect Wallet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your Web3 wallet via WalletConnect on Polygon Mainnet to scan your address.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#080C1A] border border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black">
                2
              </div>
              <h3 className="text-base font-extrabold text-white">Scratch to Reveal</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Interactive scratch cards or one-click auto-scratch to reveal matching symbols and bonuses.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#080C1A] border border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black">
                3
              </div>
              <h3 className="text-base font-extrabold text-white">Claim Rewards</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sign the Polygon transaction in your wallet to transfer VERSE prizes directly to your address.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONNECTED DASHBOARD VIEW (VIEW MY SCRATCHERS) */}
      {status === 'CONNECTED' && account && (
        <div id="connected-scratcher-dashboard" className="space-y-8">
          {/* Top Banner & Stats Overview */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <VerseCoinLogo size={28} glow={true} />
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  My Verse Scratchers
                </h2>
                <PolygonBadge size="sm" />
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Connected Polygon Address: <span className="text-[#00E5FF] font-mono font-bold">{account.address}</span>
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                id="refresh-nfts-btn"
                onClick={handleRefreshNFTs}
                disabled={isLoadingNFTs}
                className="px-3.5 py-2.5 bg-[#0D1426] hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoadingNFTs ? 'animate-spin text-[#00E5FF]' : ''} />
                <span>{isLoadingNFTs ? 'Scanning Polygon...' : 'Refresh Wallet'}</span>
              </button>

              {unscratchedCount > 0 && (
                <button
                  id="scratch-all-btn"
                  onClick={handleScratchAll}
                  className="px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-cyan-300 text-xs font-black rounded-xl border border-cyan-500/40 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles size={14} className="text-[#00E5FF]" />
                  AUTO SCRATCH ALL ({unscratchedCount})
                </button>
              )}

              {readyToClaimTickets.length > 0 && (
                <button
                  id="claim-all-btn"
                  onClick={() => setIsBatchClaimOpen(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] to-[#9333EA] hover:from-[#00cce6] hover:to-[#7e22ce] text-white font-black text-xs rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all active:scale-95 animate-pulse cursor-pointer"
                >
                  <Gift size={16} />
                  CLAIM ALL ({readyVerseValue.toLocaleString()} VERSE)
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards with Verse Logo Colors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-[#080C1A] border border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-[#00E5FF]" />
                NFTs in Connected Address
              </span>
              <div className="text-2xl font-black text-white">{tickets.length} Tickets</div>
              <span className="text-[11px] text-slate-500">Polygon ERC-721 Scratchers</span>
            </div>

            <div className="p-5 rounded-3xl bg-[#080C1A] border border-cyan-500/40 space-y-1 shadow-[0_0_20px_rgba(0,229,255,0.1)]">
              <span className="text-xs font-bold text-[#00E5FF] uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={14} />
                Unclaimed Rewards
              </span>
              <div className="text-2xl font-black text-white flex items-baseline gap-1.5">
                <span>{readyVerseValue.toLocaleString()}</span>
                <span className="text-xs font-black text-[#00E5FF]">VERSE</span>
              </div>
              <span className="text-[11px] text-purple-300 font-semibold">
                {readyMaticValue > 0 ? `+ ${readyMaticValue} POL Bonus` : 'Ready to claim'}
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-[#080C1A] border border-slate-800 space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Claimed Rewards
              </span>
              <div className="text-2xl font-black text-white flex items-baseline gap-1.5">
                <span>{totalClaimedVerse.toLocaleString()}</span>
                <span className="text-xs font-black text-emerald-400">VERSE</span>
              </div>
              <span className="text-[11px] text-slate-500">Transferred to your wallet</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 p-1 bg-[#080C1A] rounded-2xl border border-slate-800">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({tickets.length})
              </button>
              <button
                onClick={() => setActiveFilter('unscratched')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeFilter === 'unscratched'
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unclaimed ({unscratchedCount})
              </button>
              <button
                onClick={() => setActiveFilter('scratched')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeFilter === 'scratched'
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ready to Claim ({readyToClaimTickets.length})
              </button>
              <button
                onClick={() => setActiveFilter('claimed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeFilter === 'claimed'
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Claimed ({claimedCount})
              </button>
            </div>

            {/* Quick manual token import toggle */}
            <button
              onClick={() => setShowImportForm(!showImportForm)}
              className="text-xs font-bold text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={14} />
              <span>{showImportForm ? 'Close Token Check' : 'Check Specific Token ID'}</span>
            </button>
          </div>

          {/* Manual Token ID Check Form */}
          {showImportForm && (
            <form
              onSubmit={handleImportToken}
              className="p-4 bg-[#080C1A] border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row items-center gap-3"
            >
              <div className="flex-1 w-full relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  placeholder="Enter Verse Scratcher Token ID (e.g., 1042)"
                  value={customTokenInput}
                  onChange={(e) => setCustomTokenInput(e.target.value)}
                  className="w-full bg-[#0D1426] border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
              >
                LOAD TOKEN
              </button>
            </form>
          )}

          {/* Real NFTs Grid or Empty State */}
          {isLoadingNFTs ? (
            <div className="p-16 text-center bg-[#080C1A] rounded-3xl border border-slate-800 space-y-4">
              <RefreshCw size={36} className="mx-auto text-[#00E5FF] animate-spin" />
              <h4 className="text-lg font-black text-white">Scanning Polygon Network...</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Checking Verse Scratcher NFT contracts for address {account.address}.
              </p>
            </div>
          ) : filteredTickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTickets.map((ticket) => (
                <ScratchCard
                  key={ticket.id}
                  ticket={ticket}
                  onScratchedComplete={handleScratchComplete}
                  onClaimClick={(t) => setSelectedTicketForClaim(t)}
                />
              ))}
            </div>
          ) : (
            <div
              id="empty-nfts-card"
              className="p-14 text-center bg-[#080C1A] rounded-3xl border border-cyan-500/30 shadow-[0_0_30px_rgba(0,229,255,0.1)] space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#0D1426] border border-cyan-500/30 flex items-center justify-center">
                <VerseCoinLogo size={36} glow={true} />
              </div>
              <h4 className="text-xl font-black text-white">
                {activeFilter === 'all'
                  ? 'No Verse Scratcher NFTs Found in This Wallet'
                  : `No ${activeFilter.toUpperCase()} Scratchers Found`}
              </h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Your connected address <span className="font-mono text-cyan-300 font-bold">{account.address}</span> has 0 Verse Scratcher NFTs currently listed in this category on Polygon.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleRefreshNFTs}
                  className="px-5 py-2.5 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
                >
                  RE-SCAN POLYGON
                </button>
                <button
                  onClick={() => setShowImportForm(true)}
                  className="px-5 py-2.5 bg-[#0D1426] hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer"
                >
                  Enter Specific Token ID
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real Claim Modal */}
      {(selectedTicketForClaim || isBatchClaimOpen) && account && (
        <ClaimModal
          ticket={selectedTicketForClaim}
          allTickets={tickets}
          isBatch={isBatchClaimOpen}
          account={account}
          isOpen={true}
          onClose={() => {
            setSelectedTicketForClaim(null);
            setIsBatchClaimOpen(false);
          }}
          onClaimSuccess={handleClaimSuccess}
        />
      )}
    </div>
  );
};
