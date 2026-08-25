import React, { useState } from 'react';
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
} from 'lucide-react';
import { ConnectionStatus, ScratcherTicket, WalletAccount } from '../types';
import { ScratchCard } from './ScratchCard';
import { ClaimModal } from './ClaimModal';
import { VerseLogo, PolygonBadge, BitcoinComBadge } from './VerseBrand';

const INITIAL_TICKETS: ScratcherTicket[] = [
  {
    id: 'verse-scratcher-8842',
    tokenId: 8842,
    title: 'Verse Lunar Fortune #8842',
    series: 'Lunar Fortune',
    edition: 'Edition 1 of 500',
    imageTheme: 'gold',
    status: 'unscratched',
    scratchPercentage: 0,
    winningPrizes: [
      { symbol: '💎', label: 'Diamond', amount: 50000, token: 'VERSE', matched: true },
      { symbol: '💎', label: 'Diamond', amount: 50000, token: 'VERSE', matched: true },
      { symbol: '💎', label: 'Diamond', amount: 50000, token: 'VERSE', matched: true },
      { symbol: '🚀', label: 'Rocket', amount: 10000, token: 'VERSE', matched: false },
      { symbol: '⚡', label: 'Bolt', amount: 5000, token: 'VERSE', matched: false },
      { symbol: '🪙', label: 'Coin', amount: 2000, token: 'VERSE', matched: false },
    ],
    totalVerseValue: 50000,
    totalMaticValue: 5,
    mintDate: '2026-08-15',
    isWinningTicket: true,
  },
  {
    id: 'verse-scratcher-3190',
    tokenId: 3190,
    title: 'Verse Golden Ticket #3190',
    series: 'Golden Ticket',
    edition: 'Edition 42 of 250',
    imageTheme: 'cyan',
    status: 'scratched',
    scratchPercentage: 100,
    winningPrizes: [
      { symbol: '👑', label: 'Crown', amount: 125000, token: 'VERSE', matched: true },
      { symbol: '👑', label: 'Crown', amount: 125000, token: 'VERSE', matched: true },
      { symbol: '👑', label: 'Crown', amount: 125000, token: 'VERSE', matched: true },
      { symbol: '🪙', label: 'Verse', amount: 10000, token: 'VERSE', matched: false },
      { symbol: '🌟', label: 'Star', amount: 5000, token: 'VERSE', matched: false },
      { symbol: '🔥', label: 'Flame', amount: 2500, token: 'VERSE', matched: false },
    ],
    totalVerseValue: 125000,
    totalMaticValue: 15,
    mintDate: '2026-08-10',
    isWinningTicket: true,
  },
  {
    id: 'verse-scratcher-1428',
    tokenId: 1428,
    title: 'Verse Neon Cyber #1428',
    series: 'Neon Cyber',
    edition: 'Edition 19 of 100',
    imageTheme: 'neon',
    status: 'unscratched',
    scratchPercentage: 0,
    winningPrizes: [
      { symbol: '🌌', label: 'Cosmos', amount: 75000, token: 'VERSE', matched: true },
      { symbol: '🌌', label: 'Cosmos', amount: 75000, token: 'VERSE', matched: true },
      { symbol: '🌌', label: 'Cosmos', amount: 75000, token: 'VERSE', matched: true },
      { symbol: '💎', label: 'Diamond', amount: 20000, token: 'VERSE', matched: false },
      { symbol: '🚀', label: 'Rocket', amount: 15000, token: 'VERSE', matched: false },
      { symbol: '⚡', label: 'Bolt', amount: 5000, token: 'VERSE', matched: false },
    ],
    totalVerseValue: 75000,
    totalMaticValue: 10,
    mintDate: '2026-08-01',
    isWinningTicket: true,
  },
  {
    id: 'verse-scratcher-9021',
    tokenId: 9021,
    title: 'Diamond Verse Community #9021',
    series: 'Diamond Verse',
    edition: 'Edition 88 of 1000',
    imageTheme: 'purple',
    status: 'claimed',
    scratchPercentage: 100,
    winningPrizes: [
      { symbol: '💎', label: 'Diamond', amount: 30000, token: 'VERSE', matched: true },
      { symbol: '💎', label: 'Diamond', amount: 30000, token: 'VERSE', matched: true },
      { symbol: '💎', label: 'Diamond', amount: 30000, token: 'VERSE', matched: true },
      { symbol: '🪙', label: 'Coin', amount: 5000, token: 'VERSE', matched: false },
      { symbol: '⚡', label: 'Bolt', amount: 2000, token: 'VERSE', matched: false },
      { symbol: '🌟', label: 'Star', amount: 1000, token: 'VERSE', matched: false },
    ],
    totalVerseValue: 30000,
    totalMaticValue: 0,
    mintDate: '2026-07-28',
    claimTxHash: '0x8f3c71a9e22419c8d6291a0b3457193c72b9a4561083ef',
    claimTimestamp: '2026-08-20',
    isWinningTicket: true,
  },
];

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
  const [tickets, setTickets] = useState<ScratcherTicket[]>(INITIAL_TICKETS);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unscratched' | 'scratched' | 'claimed'>('all');
  const [selectedTicketForClaim, setSelectedTicketForClaim] = useState<ScratcherTicket | null>(null);
  const [isBatchClaimOpen, setIsBatchClaimOpen] = useState(false);

  const handleScratchComplete = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'scratched',
              scratchPercentage: 100,
            }
          : t
      )
    );
  };

  const handleClaimSuccess = (claimedTicketIds: string[], txHash: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        claimedTicketIds.includes(t.id)
          ? {
              ...t,
              status: 'claimed',
              claimTxHash: txHash,
              claimTimestamp: new Date().toISOString(),
            }
          : t
      )
    );
    setSelectedTicketForClaim(null);
    setIsBatchClaimOpen(false);
  };

  const handleScratchAll = () => {
    setTickets((prev) =>
      prev.map((t) =>
        t.status === 'unscratched'
          ? {
              ...t,
              status: 'scratched',
              scratchPercentage: 100,
            }
          : t
      )
    );
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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. DISCONNECTED / WRONG NETWORK / ERROR HERO STATE */}
      {status !== 'CONNECTED' && (
        <div className="space-y-8">
          {/* Main Hero Card */}
          <div
            id="hero-disconnected-card"
            className="relative rounded-3xl bg-gradient-to-br from-[#0B1224] via-[#0E1B38] to-[#0A0F1D] border border-cyan-500/30 p-8 sm:p-12 shadow-2xl overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8"
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-xl space-y-4">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <PolygonBadge size="md" />
                <BitcoinComBadge />
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                VERSE SCRATCHER <span className="text-[#00E5FF]">CLAIMER</span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Connect your <span className="text-white font-semibold">Bitcoin.com Wallet</span> or Web3 provider on Polygon to reveal scratch-off rewards and claim $VERSE directly to your address.
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
                    Please switch your connected wallet to Polygon Mainnet (Chain ID 137) to view and claim your Verse Scratchers.
                  </p>
                  <button
                    id="hero-switch-network-btn"
                    onClick={onSwitchNetworkClick}
                    className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow transition-all active:scale-95 cursor-pointer"
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

              {/* Connect CTA Button */}
              {status === 'DISCONNECTED' && (
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    id="hero-connect-wallet-button"
                    onClick={onConnectClick}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#00E5FF] to-[#00FF88] hover:from-[#00cce6] hover:to-[#00e67a] text-black font-extrabold text-base rounded-2xl shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <ShieldCheck size={20} />
                    CONNECT WALLET
                    <ArrowRight size={18} />
                  </button>
                  <span className="text-xs text-slate-400">
                    Zero startup execution &bull; Safe lazy load
                  </span>
                </div>
              )}
            </div>

            {/* Visual Scratch Preview Card */}
            <div className="relative z-10 w-full sm:w-80 p-5 rounded-2xl bg-[#090E1C] border border-cyan-500/40 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]">
                  Preview Card
                </span>
                <span className="text-xs font-bold text-amber-400">Win up to 500k VERSE</span>
              </div>
              <div className="aspect-[16/9] rounded-xl bg-gradient-to-br from-[#101D3A] to-[#0A1020] border border-slate-700/80 flex flex-col items-center justify-center p-4 text-center">
                <Sparkles size={28} className="text-[#00E5FF] mb-1 animate-pulse" />
                <span className="text-sm font-bold text-white">Verse Scratcher NFT</span>
                <span className="text-[11px] text-slate-400">Connect wallet to scratch &amp; claim</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Network:</span>
                <span className="font-mono text-purple-300 font-semibold">Polygon (137)</span>
              </div>
            </div>
          </div>

          {/* How It Works Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00E5FF] font-bold">
                1
              </div>
              <h3 className="text-base font-bold text-white">Connect Wallet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect via Bitcoin.com Wallet or WalletConnect on Polygon Mainnet without any background startup locks.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
                2
              </div>
              <h3 className="text-base font-bold text-white">Scratch to Reveal</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Interactive scratch cards reveal matching symbols, multiplier prizes, and Polygon bonuses.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                3
              </div>
              <h3 className="text-base font-bold text-white">Claim Rewards</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Execute fast, low-cost Polygon smart contract transactions to receive VERSE directly into your wallet.
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
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  My Verse Scratchers
                </h2>
                <PolygonBadge size="sm" />
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Connected with <span className="text-slate-200 font-mono">{account.address}</span> ({account.walletName})
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5">
              {unscratchedCount > 0 && (
                <button
                  id="scratch-all-btn"
                  onClick={handleScratchAll}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  Scratch All ({unscratchedCount})
                </button>
              )}

              {readyToClaimTickets.length > 0 && (
                <button
                  id="claim-all-btn"
                  onClick={() => setIsBatchClaimOpen(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#00E5FF] to-[#00FF88] hover:from-[#00cce6] hover:to-[#00e67a] text-black font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all active:scale-95 animate-pulse"
                >
                  <Gift size={16} />
                  Claim All ({readyVerseValue.toLocaleString()} VERSE)
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-[#00E5FF]" />
                Total Scratchers
              </span>
              <div className="text-2xl font-extrabold text-white">{tickets.length} Tickets</div>
              <span className="text-[11px] text-slate-500">Polygon ERC-721 Collection</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0A0F1D] border border-cyan-500/30 space-y-1">
              <span className="text-xs font-semibold text-[#00E5FF] uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={14} />
                Unclaimed Winnings
              </span>
              <div className="text-2xl font-extrabold text-white flex items-baseline gap-1.5">
                <span>{readyVerseValue.toLocaleString()}</span>
                <span className="text-xs font-bold text-[#00E5FF]">VERSE</span>
              </div>
              <span className="text-[11px] text-purple-300 font-medium">
                {readyMaticValue > 0 ? `+ ${readyMaticValue} MATIC / POL Bonus` : 'Ready to claim'}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Total Claimed
              </span>
              <div className="text-2xl font-extrabold text-white flex items-baseline gap-1.5">
                <span>{totalClaimedVerse.toLocaleString()}</span>
                <span className="text-xs font-bold text-emerald-400">VERSE</span>
              </div>
              <span className="text-[11px] text-slate-500">Settled to your Polygon address</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 p-1 bg-[#0A0F1D] rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'all'
                    ? 'bg-[#00E5FF] text-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({tickets.length})
              </button>
              <button
                onClick={() => setActiveFilter('unscratched')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'unscratched'
                    ? 'bg-[#00E5FF] text-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unscratched ({unscratchedCount})
              </button>
              <button
                onClick={() => setActiveFilter('scratched')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'scratched'
                    ? 'bg-[#00E5FF] text-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ready to Claim ({readyToClaimTickets.length})
              </button>
              <button
                onClick={() => setActiveFilter('claimed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'claimed'
                    ? 'bg-[#00E5FF] text-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Claimed ({tickets.filter((t) => t.status === 'claimed').length})
              </button>
            </div>
          </div>

          {/* Scratchers Grid */}
          {filteredTickets.length > 0 ? (
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
            <div className="p-12 text-center bg-[#0A0F1D] rounded-2xl border border-slate-800 space-y-3">
              <Layers size={36} className="mx-auto text-slate-600" />
              <h4 className="text-base font-bold text-slate-300">No Scratchers in this filter</h4>
              <p className="text-xs text-slate-500">
                Switch filters above to view other tickets in your Polygon wallet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Claim Modal */}
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
