import React, { useState, useEffect, useCallback } from 'react';
import {
  Gift,
  Sparkles,
  Coins,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Send,
  Wallet,
  Trophy,
  Zap,
  Edit2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ConnectionStatus,
  WalletAccount,
  ScratcherTicket,
  UserProfileResponse,
  PrizeItem,
} from '../types';
import { VerseCoinLogo, PolygonBadge } from './VerseBrand';
import { ScratchCard } from './ScratchCard';
import { ClaimModal } from './ClaimModal';
import {
  fetchRealBalances,
  fetchRealScratchersForAddress,
  saveScratchersForAddress,
  getSavedScratchersForAddress,
} from '../services/walletService';
import {
  getUserProfileApi,
  claimUserScratchersApi,
  updateTicketStatusApi,
  registerUserApi,
} from '../services/apiService';

interface HomePageProps {
  status: ConnectionStatus;
  account: WalletAccount | null;
  onConnectClick: () => void;
  onSwitchToConnectView: () => void;
  onSwitchToAdminView: () => void;
  onUpdateAccountBalance?: (
    matic: string,
    verse: string,
    maticRaw?: bigint,
    verseRaw?: bigint,
    maticError?: string | null,
    verseError?: string | null,
    verseEthereum?: string | null,
    verseNetworkNote?: string | null
  ) => void;
  onNotify?: (title: string, message: string, verseAmount?: number, txHash?: string) => void;
}

// Helper to transform server/local objects into strict ScratcherTicket types
function mapToScratcherTicket(st: any): ScratcherTicket {
  const theme: 'gold' | 'neon' | 'cyan' | 'purple' =
    st.imageTheme === 'gold' || st.theme === 'gold' ? 'gold'
    : st.imageTheme === 'neon' || st.theme === 'neon' ? 'neon'
    : st.imageTheme === 'purple' || st.theme === 'purple' ? 'purple'
    : 'cyan';

  const prizes: PrizeItem[] = st.winningPrizes || [
    { symbol: 'VERSE', label: '7', amount: 5000000, token: 'VERSE', matched: true },
    { symbol: 'VERSE', label: '88', amount: 2000000, token: 'VERSE', matched: true },
    { symbol: 'VERSE', label: '77', amount: 1000000, token: 'VERSE', matched: true },
  ];

  return {
    id: String(st.id || `scratcher-${st.tokenId || Math.random()}`),
    tokenId: Number(st.tokenId) || 1176,
    contractAddress: st.contractAddress || '0x6e24A98eaAEfa0Ec8A7147b4eCDE14eB78772D1E',
    title: st.title || st.name || `Verse Scratcher #${st.tokenId || 1176}`,
    series: st.series || 'Series VIII Gold',
    edition: st.edition || '1 of 5000',
    description: st.description || 'Polygon On-Chain Verse Scratcher Ticket',
    imageUrl: st.imageUrl || st.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    imageTheme: theme,
    status: st.status || 'unscratched',
    scratchPercentage: st.scratchPercentage || 0,
    winningPrizes: prizes,
    totalVerseValue: Number(st.totalVerseValue) || 8000000,
    totalMaticValue: Number(st.totalMaticValue) || 0,
    mintDate: st.mintDate || new Date().toLocaleDateString(),
    claimTxHash: st.claimTxHash,
    claimTimestamp: st.claimTimestamp,
    isWinningTicket: st.isWinningTicket !== undefined ? st.isWinningTicket : true,
    ownerAddress: st.ownerAddress,
    metadataUri: st.metadataUri,
  };
}

export const HomePage: React.FC<HomePageProps> = ({
  status,
  account,
  onConnectClick,
  onSwitchToAdminView,
  onUpdateAccountBalance,
  onNotify,
}) => {
  const [savedTelegram, setSavedTelegram] = useState<string>(() => {
    return localStorage.getItem('verse_telegram_username') || '';
  });
  const [telegramInput, setTelegramInput] = useState<string>(() => {
    return localStorage.getItem('verse_telegram_username') || '';
  });
  const [isEditingTelegram, setIsEditingTelegram] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [tickets, setTickets] = useState<ScratcherTicket[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [claimStatusMessage, setClaimStatusMessage] = useState<{
    type: 'success' | 'error' | 'not_found';
    text: string;
    txHash?: string;
  } | null>(null);

  // Active scratcher claim modal state
  const [selectedTicketForClaim, setSelectedTicketForClaim] = useState<ScratcherTicket | null>(null);
  const [isBatchClaimOpen, setIsBatchClaimOpen] = useState<boolean>(false);

  // Sync profile & on-chain balances
  const refreshAllData = useCallback(async (showToast = false) => {
    const identifier = account?.address || savedTelegram;
    if (!identifier) return;

    setIsRefreshing(true);
    try {
      const [fetchedProfile, balances, onChainTickets] = await Promise.all([
        getUserProfileApi(identifier).catch(() => null),
        account?.address ? fetchRealBalances(account.address).catch(() => null) : Promise.resolve(null),
        account?.address ? fetchRealScratchersForAddress(account.address).catch(() => []) : Promise.resolve([]),
      ]);

      if (fetchedProfile) {
        setProfile(fetchedProfile);
        if (fetchedProfile.user?.telegramUsername && !savedTelegram) {
          setSavedTelegram(fetchedProfile.user.telegramUsername);
          localStorage.setItem('verse_telegram_username', fetchedProfile.user.telegramUsername);
        }
      }

      if (balances && onUpdateAccountBalance) {
        onUpdateAccountBalance(
          balances.balanceMatic,
          balances.balanceVerse,
          balances.balanceMaticRaw,
          balances.balanceVerseRaw,
          balances.balanceMaticError,
          balances.balanceVerseError,
          balances.balanceVerseEthereum,
          balances.balanceVerseNetworkNote
        );
      }

      // Merge server tickets with on-chain tickets
      const serverTickets: ScratcherTicket[] = (fetchedProfile?.tickets || []).map((st: any) =>
        mapToScratcherTicket(st)
      );

      const combinedMap = new Map<string, ScratcherTicket>();
      // Saved local tickets
      if (account?.address) {
        const saved = getSavedScratchersForAddress(account.address);
        if (saved) saved.forEach((t) => combinedMap.set(t.id, t));
      }
      serverTickets.forEach((t) => combinedMap.set(t.id, t));
      (onChainTickets || []).forEach((t) => combinedMap.set(t.id, t));

      const merged = Array.from(combinedMap.values());
      setTickets(merged);

      if (account?.address) {
        saveScratchersForAddress(account.address, merged);
      }

      if (showToast && onNotify) {
        onNotify('Synced with Polygon', 'VERSE & POL balances and allocations updated.');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [account?.address, savedTelegram, onUpdateAccountBalance, onNotify]);

  useEffect(() => {
    refreshAllData();
    const interval = setInterval(() => {
      refreshAllData();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshAllData]);

  const handleSaveTelegramUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = telegramInput.trim();
    if (!cleaned) return;
    if (!cleaned.startsWith('@')) cleaned = '@' + cleaned;

    localStorage.setItem('verse_telegram_username', cleaned);
    setSavedTelegram(cleaned);
    setIsEditingTelegram(false);

    if (account?.address) {
      try {
        await registerUserApi(cleaned, account.address);
      } catch (err) {}
    }

    refreshAllData();
  };

  // Handle Main "CLAIM SCRATCHERS" button click
  const handleClaimScratchers = async () => {
    const telegramUsername = savedTelegram || profile?.user?.telegramUsername;
    const walletAddress = account?.address || profile?.user?.walletAddress;

    if (!telegramUsername) {
      setClaimStatusMessage({
        type: 'error',
        text: 'Please set your Telegram username (e.g. @yourusername) above to match the scratchers sent by Admin.',
      });
      return;
    }

    if (!walletAddress) {
      setClaimStatusMessage({
        type: 'error',
        text: 'Please connect your Polygon wallet below so the scratchers can be delivered directly to your wallet address.',
      });
      onConnectClick();
      return;
    }

    setIsClaiming(true);
    setClaimStatusMessage(null);

    try {
      const res = await claimUserScratchersApi(telegramUsername, walletAddress);

      // Trigger Confetti Celebration
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#00E5FF', '#3B82F6', '#FFD700', '#9333EA', '#10B981'],
      });

      setClaimStatusMessage({
        type: 'success',
        text: `Claimed ${res.claimedAmount} Verse Scratcher${res.claimedAmount > 1 ? 's' : ''} sent by the Admin! They are ready to scratch in your collection below.`,
        txHash: res.txHash,
      });

      if (onNotify) {
        onNotify(
          'Scratchers Claimed from Admin!',
          `Claimed ${res.claimedAmount} Verse Scratchers for ${telegramUsername}!`,
          8000000,
          res.txHash
        );
      }

      // Refresh tickets
      const newTickets = res.allUserTickets || res.tickets || [];
      const combinedMap = new Map<string, ScratcherTicket>();
      tickets.forEach((t) => combinedMap.set(t.id, t));
      newTickets.forEach((t: any) => {
        const mapped = mapToScratcherTicket(t);
        combinedMap.set(mapped.id, mapped);
      });

      const updated = Array.from(combinedMap.values());
      setTickets(updated);
      saveScratchersForAddress(walletAddress, updated);
      refreshAllData();
    } catch (err: any) {
      const errMsg = err.message || 'No approved scratchers found';
      setClaimStatusMessage({
        type: 'not_found',
        text: errMsg.includes('No approved')
          ? `No approved scratchers found for Telegram handle ${telegramUsername}. Ask the Admin to send scratcher NFTs to this username.`
          : errMsg,
      });
    } finally {
      setIsClaiming(false);
    }
  };

  // Scratch Ticket completed
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
        updateTicketStatusApi(account.address, ticketId, 'scratched', 100);
      }
      return updated;
    });
  };

  // Claim Winning VERSE Reward to Wallet
  const handleClaimRewardSuccess = (claimedTicketIds: string[], txHash: string) => {
    let totalVerseWon = 0;
    setTickets((prev) => {
      const updated = prev.map((t) => {
        if (claimedTicketIds.includes(t.id)) {
          totalVerseWon += t.totalVerseValue;
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
        claimedTicketIds.forEach((id) => updateTicketStatusApi(account.address, id, 'claimed', 100));
      }
      return updated;
    });

    if (onNotify) {
      onNotify('VERSE Rewards Claimed!', `Transferred ${totalVerseWon.toLocaleString()} VERSE to your Polygon wallet.`, totalVerseWon, txHash);
    }

    setSelectedTicketForClaim(null);
    setIsBatchClaimOpen(false);
    refreshAllData();
  };

  const pendingAllocations = (profile?.allocations || []).filter((a) => a.status === 'APPROVED');
  const totalPendingInAdmin = pendingAllocations.reduce((sum, a) => sum + a.amount, 0);

  const readyToClaimTickets = tickets.filter((t) => t.status === 'scratched');
  const readyVerseValue = readyToClaimTickets.reduce((sum, t) => sum + t.totalVerseValue, 0);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Connected User Header Bar */}
      <div
        id="home-user-header"
        className="p-5 rounded-3xl bg-[#080D1E] border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-cyan-500/5"
      >
        <div className="flex flex-wrap items-center gap-4 text-left w-full sm:w-auto">
          {/* Telegram Handle */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0D162B] border border-cyan-500/20">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-[#00E5FF]">
              <Send size={15} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">
                Telegram Handle
              </span>
              {isEditingTelegram ? (
                <form onSubmit={handleSaveTelegramUsername} className="flex items-center gap-1.5 mt-1">
                  <input
                    type="text"
                    value={telegramInput}
                    onChange={(e) => setTelegramInput(e.target.value)}
                    placeholder="@username"
                    className="px-2 py-0.5 rounded bg-black/60 border border-cyan-400 text-xs font-mono text-cyan-200 outline-none w-28"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2 py-0.5 bg-[#00E5FF] text-black text-[10px] font-black rounded cursor-pointer"
                  >
                    Save
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-cyan-300 font-mono">
                    {savedTelegram || profile?.user?.telegramUsername || 'Set username'}
                  </span>
                  <button
                    onClick={() => setIsEditingTelegram(true)}
                    className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                    title="Change Telegram handle"
                  >
                    <Edit2 size={11} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Wallet Address */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0D162B] border border-purple-500/20">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Wallet size={15} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">
                Polygon Wallet
              </span>
              <span className="text-sm font-black text-slate-200 font-mono">
                {account?.address
                  ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
                  : 'Not connected'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          {!account?.address ? (
            <button
              id="home-connect-wallet-btn"
              onClick={onConnectClick}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#0099FF] text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Wallet size={14} />
              <span>Connect Wallet</span>
            </button>
          ) : (
            <button
              onClick={onConnectClick}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 transition-all cursor-pointer"
            >
              Switch Wallet
            </button>
          )}

          <button
            id="home-refresh-btn"
            onClick={() => refreshAllData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh balances"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#00E5FF]' : ''} />
          </button>
        </div>
      </div>

      {/* 2. THE BALANCE SECTION: VERSE AND POL BALANCE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Coins size={14} className="text-[#00E5FF]" />
            <span>MY POLYGON BALANCES</span>
          </h2>
          <PolygonBadge size="sm" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* VERSE BALANCE CARD */}
          <div
            id="home-verse-balance-card"
            className="relative p-6 rounded-3xl bg-gradient-to-br from-[#0B1428] to-[#070B16] border-2 border-cyan-500/40 shadow-[0_0_30px_rgba(0,229,255,0.12)] overflow-hidden flex flex-col justify-between space-y-4 group hover:border-cyan-400 transition-all"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5FF]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <VerseCoinLogo size={36} glow={true} />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    VERSE BALANCE
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Verse by Bitcoin.com (Polygon ERC-20)
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF] text-xs font-black font-mono">
                VERSE
              </span>
            </div>

            <div className="relative z-10">
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
                <span className="font-mono">
                  {account?.balanceVerse !== undefined && account?.balanceVerse !== null
                    ? Number(account.balanceVerse).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '0.00'}
                </span>
                <span className="text-base sm:text-lg font-bold text-[#00E5FF]">VERSE</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
                <span>Polygon Token Contract: 0xc43...6eb</span>
              </div>
            </div>
          </div>

          {/* POL (MATIC) BALANCE CARD */}
          <div
            id="home-pol-balance-card"
            className="relative p-6 rounded-3xl bg-gradient-to-br from-[#0E1026] to-[#070B16] border-2 border-purple-500/40 shadow-[0_0_30px_rgba(147,51,234,0.12)] overflow-hidden flex flex-col justify-between space-y-4 group hover:border-purple-400 transition-all"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 font-black shadow-inner">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    POL (MATIC) BALANCE
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Polygon Gas Token
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-black font-mono">
                POL
              </span>
            </div>

            <div className="relative z-10">
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
                <span className="font-mono">
                  {account?.balanceMatic !== undefined && account?.balanceMatic !== null
                    ? Number(account.balanceMatic).toLocaleString(undefined, {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })
                    : '0.0000'}
                </span>
                <span className="text-base sm:text-lg font-bold text-purple-400">POL</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Native Polygon Gas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CLAIM SCRATCHERS FROM ADMIN PANEL SECTION */}
      <div
        id="home-claim-scratchers-section"
        className="relative p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#0C152B] via-[#091124] to-[#070D1C] border-2 border-[#00E5FF] shadow-[0_0_50px_rgba(0,229,255,0.2)] overflow-hidden space-y-6"
      >
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#00E5FF]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#00E5FF] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <Sparkles size={13} />
                ADMIN SCRATCHER VAULT
              </span>
              {totalPendingInAdmin > 0 ? (
                <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 font-black text-xs uppercase tracking-wider border border-emerald-400/30">
                  {totalPendingInAdmin} READY TO CLAIM
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 font-black text-xs uppercase tracking-wider border border-slate-700">
                  ADMIN SYNC ACTIVE
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              CLAIM YOUR VERSE SCRATCHERS
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Press the button below to claim scratchers sent to Telegram handle{' '}
              <strong className="text-cyan-300 font-mono">
                {savedTelegram || profile?.user?.telegramUsername || '@yourusername'}
              </strong>{' '}
              by the Admin.
            </p>
          </div>

          {/* MAIN CLAIM BUTTON */}
          <div className="relative z-10 shrink-0 flex flex-col items-center md:items-end gap-2">
            <button
              id="home-main-claim-btn"
              onClick={handleClaimScratchers}
              disabled={isClaiming}
              className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-[#00E5FF] via-[#00cce6] to-[#0099FF] text-black font-black text-base uppercase tracking-wider rounded-2xl shadow-2xl shadow-cyan-500/40 flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isClaiming ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>CHECKING ADMIN PANEL &amp; CLAIMING...</span>
                </>
              ) : (
                <>
                  <Gift size={22} />
                  <span>
                    {totalPendingInAdmin > 0
                      ? `CLAIM ${totalPendingInAdmin} SCRATCHER${totalPendingInAdmin > 1 ? 'S' : ''}`
                      : 'CLAIM SCRATCHERS'}
                  </span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400 font-medium">
              Transfers NFT tickets directly to your connected wallet
            </span>
          </div>
        </div>

        {/* FEEDBACK STATUS BANNER */}
        {claimStatusMessage && (
          <div
            id="claim-status-alert"
            className={`p-4 rounded-2xl border text-xs font-medium space-y-2 ${
              claimStatusMessage.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                : claimStatusMessage.type === 'not_found'
                ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                : 'bg-red-950/70 border-red-500/50 text-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                {claimStatusMessage.type === 'success' ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>CLAIM SUCCESSFUL!</span>
                  </>
                ) : claimStatusMessage.type === 'not_found' ? (
                  <>
                    <AlertCircle size={16} className="text-amber-400" />
                    <span>USERNAME NOT FOUND OR NO SCRATCHERS SENT YET</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} className="text-red-400" />
                    <span>CLAIM ERROR</span>
                  </>
                )}
              </div>

              {claimStatusMessage.type === 'not_found' && (
                <button
                  id="go-to-admin-alloc-btn"
                  onClick={onSwitchToAdminView}
                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs rounded-lg transition-all cursor-pointer"
                >
                  Admin Panel &rarr;
                </button>
              )}
            </div>

            <p>{claimStatusMessage.text}</p>

            {claimStatusMessage.txHash && (
              <div className="pt-1 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
                <span>Polygon Tx:</span>
                <span className="truncate">{claimStatusMessage.txHash}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. MY CLAIMED SCRATCHERS COLLECTION */}
      {tickets.length > 0 && (
        <div id="home-claimed-tickets-section" className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <VerseCoinLogo size={24} glow={true} />
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  MY SCRATCHERS COLLECTION ({tickets.length})
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Scratch each card to reveal winning prize numbers and claim VERSE tokens!
              </p>
            </div>

            {readyToClaimTickets.length > 0 && (
              <button
                id="batch-claim-rewards-btn"
                onClick={() => setIsBatchClaimOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-400/20 flex items-center gap-2 cursor-pointer hover:scale-105 transition-all"
              >
                <Trophy size={16} />
                <span>CLAIM ALL WON ({readyVerseValue.toLocaleString()} VERSE)</span>
              </button>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => (
              <ScratchCard
                key={ticket.id}
                ticket={ticket}
                onScratchedComplete={handleScratchComplete}
                onClaimClick={(t) => setSelectedTicketForClaim(t)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Claim Reward Modal */}
      {selectedTicketForClaim && account && (
        <ClaimModal
          isOpen={true}
          ticket={selectedTicketForClaim}
          account={account}
          onClose={() => setSelectedTicketForClaim(null)}
          onClaimSuccess={handleClaimRewardSuccess}
        />
      )}

      {/* Batch Claim Modal */}
      {isBatchClaimOpen && readyToClaimTickets.length > 0 && account && (
        <ClaimModal
          isOpen={true}
          ticket={readyToClaimTickets[0]}
          allTickets={readyToClaimTickets}
          isBatch={true}
          account={account}
          onClose={() => setIsBatchClaimOpen(false)}
          onClaimSuccess={handleClaimRewardSuccess}
        />
      )}
    </div>
  );
};
