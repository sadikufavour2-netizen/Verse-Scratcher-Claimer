import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Trophy,
  Gift,
  Coins,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Info,
  PlusCircle,
  Search,
  AlertTriangle,
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
  fetchRealBalances,
} from '../services/walletService';

interface ScratcherDashboardProps {
  status: ConnectionStatus;
  account: WalletAccount | null;
  errorMessage?: string | null;
  onConnectClick: () => void;
  onSwitchNetworkClick: () => void;
  onRetryClick: () => void;
  onUpdateAccountBalance?: (matic: string, verse: string, maticRaw?: bigint, verseRaw?: bigint) => void;
  onNotify?: (title: string, message: string, verseAmount?: number, txHash?: string) => void;
}

export const ScratcherDashboard: React.FC<ScratcherDashboardProps> = ({
  status,
  account,
  errorMessage,
  onConnectClick,
  onSwitchNetworkClick,
  onRetryClick,
  onUpdateAccountBalance,
  onNotify,
}) => {
  const [tickets, setTickets] = useState<ScratcherTicket[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unscratched' | 'scratched' | 'claimed'>('all');
  const [selectedTicketForClaim, setSelectedTicketForClaim] = useState<ScratcherTicket | null>(null);
  const [isBatchClaimOpen, setIsBatchClaimOpen] = useState(false);
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(false);

  // Load Real Polygon on-chain data for connected address
  const loadPolygonData = useCallback(async (address: string, showToast = false) => {
    setIsLoadingNFTs(true);
    setLoadError(null);

    // Instant local cache restoration
    const saved = getSavedScratchersForAddress(address);
    if (saved && saved.length > 0) {
      setTickets(saved);
    }

    try {
      // Parallel execution for real on-chain balances and real NFT scanner
      const [realTickets, balances] = await Promise.all([
        fetchRealScratchersForAddress(address),
        fetchRealBalances(address),
      ]);

      setTickets(realTickets);
      if (onUpdateAccountBalance) {
        onUpdateAccountBalance(
          balances.balanceMatic,
          balances.balanceVerse,
          balances.balanceMaticRaw,
          balances.balanceVerseRaw
        );
      }

      if (showToast && onNotify) {
        onNotify('Polygon Synced', `Updated on-chain balances and discovered ${realTickets.length} scratchers.`);
      }
    } catch (err: any) {
      console.warn('Polygon on-chain fetch encountered an issue:', err);
      setLoadError('POLYGON DATA UNAVAILABLE: Could not sync with Polygon nodes. Please try re-scanning.');
    } finally {
      setIsLoadingNFTs(false);
    }
  }, [onUpdateAccountBalance, onNotify]);

  // Trigger load when account changes
  useEffect(() => {
    if (account?.address && status === 'CONNECTED') {
      loadPolygonData(account.address);

      // Auto-poll balances every 20 seconds to keep live
      const interval = setInterval(() => {
        if (account.address) {
          fetchRealBalances(account.address)
            .then((b) => {
              if (onUpdateAccountBalance) {
                onUpdateAccountBalance(b.balanceMatic, b.balanceVerse, b.balanceMaticRaw, b.balanceVerseRaw);
              }
            })
            .catch(() => {});
        }
      }, 20000);

      return () => clearInterval(interval);
    } else {
      setTickets([]);
      setLoadError(null);
    }
  }, [account?.address, status, loadPolygonData, onUpdateAccountBalance]);

  // Refresh handler
  const handleRefreshAll = async () => {
    if (!account?.address) return;
    setIsRefreshing(true);
    try {
      await loadPolygonData(account.address, true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Specific Token ID Verification
  const handleImportToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.address || !customTokenInput.trim()) return;
    const id = parseInt(customTokenInput.trim(), 10);
    if (isNaN(id) || id <= 0) return;

    setIsCheckingToken(true);
    try {
      const res = await addManualScratcherForAddress(account.address, id);
      setTickets(res.tickets);
      setCustomTokenInput('');
      setShowImportForm(false);

      if (onNotify) {
        onNotify('Token Verified on Polygon', res.message || `Discovered Scratcher #${id}.`);
      }
    } catch (err: any) {
      if (onNotify) {
        onNotify('Token Check Error', err?.message || `Could not find Token #${id} on Polygon.`);
      }
    } finally {
      setIsCheckingToken(false);
    }
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
    let totalClaimedVerse = 0;

    setTickets((prev) => {
      const updated = prev.map((t) => {
        if (claimedTicketIds.includes(t.id)) {
          totalClaimedVerse += t.totalVerseValue;
          return {
            ...t,
            status: 'claimed' as const,
            claimTxHash: txHash,
            claimTimestamp: new Date().toISOString(),
          };
        }
        return t;
      });
      if (account?.address) {
        saveScratchersForAddress(account.address, updated);
      }
      return updated;
    });

    if (onNotify) {
      onNotify(
        'Rewards Successfully Claimed!',
        `Your Polygon transaction was confirmed. Tokens credited to ${account?.address ? account.address.slice(0, 6) + '...' + account.address.slice(-4) : 'your wallet'}.`,
        totalClaimedVerse,
        txHash
      );
    }

    // Refresh real balances immediately after claiming
    if (account?.address) {
      setTimeout(async () => {
        try {
          const balances = await fetchRealBalances(account.address);
          if (onUpdateAccountBalance) {
            onUpdateAccountBalance(
              balances.balanceMatic,
              balances.balanceVerse,
              balances.balanceMaticRaw,
              balances.balanceVerseRaw
            );
          }
        } catch (e) {}
      }, 1200);
    }

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
          <div
            id="hero-disconnected-card"
            className="relative rounded-3xl bg-[#080C1A] border border-cyan-500/30 p-8 sm:p-12 shadow-[0_0_50px_rgba(0,229,255,0.15)] overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8"
          >
            {/* Top Metallic Rainbow Gradient Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] via-[#9333EA] to-[#FF00A0]" />

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
                Connect your Web3 wallet on Polygon to discover your real Verse Scratcher NFTs, scratch for rewards, and claim prizes directly to your connected address.
              </p>

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
                    Please switch your connected wallet to Polygon Mainnet (Chain ID: 137).
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
                    <span>Polygon Mainnet (Chain ID 137)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Visual 3D Logo Card */}
            <div className="relative z-10 w-full sm:w-80 p-5 rounded-3xl bg-[#0A0F1E] border border-cyan-500/40 shadow-2xl space-y-3 flex flex-col items-center">
              <div className="w-full flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF]">
                  Verse Official Token
                </span>
                <span className="text-xs font-black text-amber-300">Polygon Chain 137</span>
              </div>
              <div className="w-full py-6 aspect-[16/9] rounded-2xl bg-gradient-to-br from-[#0F1B38] to-[#080C1A] border border-cyan-500/30 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
                <VerseCoinLogo size={72} glow={true} className="mb-2" />
                <span className="text-sm font-extrabold text-white">Verse Scratcher NFT</span>
                <span className="text-[11px] text-slate-400">Real Polygon Mainnet Data</span>
              </div>
              <div className="w-full flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Network:</span>
                <span className="font-mono text-purple-300 font-bold">Polygon (POL)</span>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-3xl bg-[#080C1A] border border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00E5FF] font-black">
                1
              </div>
              <h3 className="text-base font-extrabold text-white">Connect Web3 Wallet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your Bitcoin.com Wallet or any Web3 wallet on Polygon Mainnet.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#080C1A] border border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black">
                2
              </div>
              <h3 className="text-base font-extrabold text-white">Discover &amp; Scratch</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically scans Polygon for your owned Verse Scratcher NFTs and reveals matching prizes.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#080C1A] border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black">
                3
              </div>
              <h3 className="text-base font-extrabold text-white">Claim Rewards</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sign the Polygon claim transaction using POL gas to transfer VERSE directly to your address.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONNECTED DASHBOARD VIEW */}
      {status === 'CONNECTED' && account && (
        <div id="connected-scratcher-dashboard" className="space-y-8">
          {/* Top Banner & Stats Overview */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <VerseCoinLogo size={28} glow={true} />
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  MY VERSE SCRATCHERS
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
                id="refresh-polygon-btn"
                onClick={handleRefreshAll}
                disabled={isLoadingNFTs || isRefreshing}
                className="px-3.5 py-2.5 bg-[#0D1426] hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoadingNFTs || isRefreshing ? 'animate-spin text-[#00E5FF]' : ''} />
                <span>{isLoadingNFTs || isRefreshing ? 'Refreshing Polygon...' : 'Refresh Balance & NFTs'}</span>
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

          {/* Real On-Chain Wallet Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Real VERSE Token Balance */}
            <div className="p-5 rounded-3xl bg-[#080C1A] border border-cyan-500/40 space-y-1 relative overflow-hidden shadow-[0_0_20px_rgba(0,229,255,0.1)]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#00E5FF]">
                  <VerseCoinLogo size={16} />
                  VERSE BALANCE
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-white flex items-baseline gap-1.5 pt-1">
                {account.balanceVerse === 'Loading...' ? (
                  <span className="text-slate-400 text-lg animate-pulse">Loading...</span>
                ) : (
                  <>
                    <span>{account.balanceVerse || '0'}</span>
                    <span className="text-xs font-black text-[#00E5FF]">VERSE</span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-slate-400">On-Chain Polygon (ERC-20)</span>
            </div>

            {/* Real POL / Gas Balance */}
            <div className="p-5 rounded-3xl bg-[#080C1A] border border-purple-500/40 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-purple-300">
                  <Coins size={14} />
                  POL GAS BALANCE
                </span>
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-white flex items-baseline gap-1.5 pt-1">
                {account.balanceMatic === 'Loading...' ? (
                  <span className="text-slate-400 text-lg animate-pulse">Loading...</span>
                ) : (
                  <>
                    <span>{account.balanceMatic || '0.0000'}</span>
                    <span className="text-xs font-bold text-purple-300">POL</span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-slate-400">Polygon Native Gas</span>
            </div>

            {/* Unclaimed Rewards */}
            <div className="p-5 rounded-3xl bg-[#080C1A] border border-slate-800 space-y-1">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={14} />
                Unclaimed Rewards
              </span>
              <div className="text-2xl font-black text-white flex items-baseline gap-1.5 pt-1">
                <span>{readyVerseValue.toLocaleString()}</span>
                <span className="text-xs font-black text-amber-300">VERSE</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {readyMaticValue > 0 ? `+ ${readyMaticValue} POL Bonus` : `${readyToClaimTickets.length} ready to claim`}
              </span>
            </div>

            {/* Claimed Rewards */}
            <div className="p-5 rounded-3xl bg-[#080C1A] border border-slate-800 space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Claimed Rewards
              </span>
              <div className="text-2xl font-black text-white flex items-baseline gap-1.5 pt-1">
                <span>{totalClaimedVerse.toLocaleString()}</span>
                <span className="text-xs font-black text-emerald-400">VERSE</span>
              </div>
              <span className="text-[11px] text-slate-400">{claimedCount} NFTs claimed on-chain</span>
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
                ALL ({tickets.length})
              </button>
              <button
                onClick={() => setActiveFilter('unscratched')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeFilter === 'unscratched'
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                UNSCRATCHED ({unscratchedCount})
              </button>
              <button
                onClick={() => setActiveFilter('scratched')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeFilter === 'scratched'
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                READY TO CLAIM ({readyToClaimTickets.length})
              </button>
              <button
                onClick={() => setActiveFilter('claimed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeFilter === 'claimed'
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                CLAIMED ({claimedCount})
              </button>
            </div>

            {/* Check specific Token ID toggle */}
            <button
              onClick={() => setShowImportForm(!showImportForm)}
              className="text-xs font-bold text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={14} />
              <span>{showImportForm ? 'Close Token Check' : 'CHECK / ADD SPECIFIC TOKEN ID'}</span>
            </button>
          </div>

          {/* Specific Token ID Query Form */}
          {showImportForm && (
            <form
              onSubmit={handleImportToken}
              className="p-4 bg-[#080C1A] border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row items-center gap-3"
            >
              <div className="flex-1 w-full relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  placeholder="Enter Verse Scratcher Token ID on Polygon (e.g., 1176)"
                  value={customTokenInput}
                  onChange={(e) => setCustomTokenInput(e.target.value)}
                  className="w-full bg-[#0D1426] border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <button
                type="submit"
                disabled={isCheckingToken}
                className="w-full sm:w-auto px-5 py-2 bg-[#00E5FF] hover:bg-[#00cce6] disabled:opacity-50 text-black font-black text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isCheckingToken ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>CHECKING ON POLYGON...</span>
                  </>
                ) : (
                  <span>CHECK / ADD TOKEN</span>
                )}
              </button>
            </form>
          )}

          {/* Error Banner if RPC fail */}
          {loadError && (
            <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-red-200">
                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                <span>{loadError}</span>
              </div>
              <button
                onClick={handleRefreshAll}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RefreshCw size={13} />
                RE-SCAN POLYGON
              </button>
            </div>
          )}

          {/* Real NFTs Grid or Accurate Empty States */}
          {isLoadingNFTs && tickets.length === 0 ? (
            <div className="p-16 text-center bg-[#080C1A] rounded-3xl border border-slate-800 space-y-4">
              <RefreshCw size={36} className="mx-auto text-[#00E5FF] animate-spin" />
              <h4 className="text-lg font-black text-white">SCANNING POLYGON...</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Finding your Verse Scratcher NFTs on Polygon Mainnet (Chain ID 137)...
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
            /* Specific Empty State per active filter */
            <div
              id="empty-nfts-card"
              className="p-14 text-center bg-[#080C1A] rounded-3xl border border-cyan-500/30 shadow-[0_0_30px_rgba(0,229,255,0.1)] space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#0D1426] border border-cyan-500/30 flex items-center justify-center">
                <VerseCoinLogo size={36} glow={true} />
              </div>

              {activeFilter === 'unscratched' ? (
                <>
                  <h4 className="text-xl font-black text-white">NO UNCLAIMED SCRATCHERS FOUND</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    You don't currently have any unclaimed Verse Scratcher NFTs.
                  </p>
                </>
              ) : activeFilter === 'scratched' ? (
                <>
                  <h4 className="text-xl font-black text-white">NO READY TO CLAIM SCRATCHERS FOUND</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    Scratch your tickets first to reveal prizes and get them ready to claim.
                  </p>
                </>
              ) : activeFilter === 'claimed' ? (
                <>
                  <h4 className="text-xl font-black text-white">NO CLAIMED SCRATCHERS FOUND</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    You don't have any claimed Verse Scratcher NFTs yet.
                  </p>
                </>
              ) : (
                <>
                  <h4 className="text-xl font-black text-white">NO VERSE SCRATCHERS FOUND</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    Your connected Polygon address does not currently have any Verse Scratcher NFTs.
                  </p>
                </>
              )}

              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleRefreshAll}
                  className="px-5 py-2.5 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
                >
                  RE-SCAN POLYGON
                </button>
                <button
                  onClick={() => setShowImportForm(true)}
                  className="px-5 py-2.5 bg-[#0D1426] hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer"
                >
                  ENTER SPECIFIC TOKEN ID
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real Claim Modal with Wallet Signing */}
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
