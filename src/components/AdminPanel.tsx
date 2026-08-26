import React, { useState, useEffect } from 'react';
import {
  Shield,
  Layers,
  CheckCircle2,
  Clock,
  Coins,
  Send,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  AlertCircle,
  Database,
  ArrowRight,
  Flame,
  Crown,
  Wallet,
  Check,
  ExternalLink,
  LogOut,
  X,
} from 'lucide-react';
import {
  AdminOverviewResponse,
  ScratcherTierType,
  WalletAccount,
  ScratcherTicket,
} from '../types';
import {
  getAdminOverviewApi,
  batchAllocateApi,
  addVaultInventoryApi,
  setAdminWalletApi,
} from '../services/apiService';
import {
  fetchRealScratchersForAddress,
  fetchRealBalances,
  formatBalanceDisplay,
  connectViaWalletConnect,
} from '../services/walletService';
import { VerseCoinLogo, PolygonBadge } from './VerseBrand';

interface AdminPanelProps {
  onSwitchToUserPortal: () => void;
  onNotify?: (title: string, message: string, verseAmount?: number) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onSwitchToUserPortal,
  onNotify,
}) => {
  // Admin's own dedicated connected wallet (Independent of user's wallet)
  const [adminAccount, setAdminAccount] = useState<WalletAccount | null>(null);
  const [isConnectingAdminWallet, setIsConnectingAdminWallet] = useState(false);
  const [adminConnectError, setAdminConnectError] = useState<string | null>(null);

  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [adminOnChainNfts, setAdminOnChainNfts] = useState<ScratcherTicket[]>([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Send NFT Scratchers form state (Batch Tab)
  const [rawInput, setRawInput] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<ScratcherTierType>('grand');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allocationSuccessMsg, setAllocationSuccessMsg] = useState<string | null>(null);
  const [allocationErrorMsg, setAllocationErrorMsg] = useState<string | null>(null);

  // Touch / Interactive Send Modal
  const [selectedNftForSend, setSelectedNftForSend] = useState<{
    tier: ScratcherTierType;
    title: string;
    image: string;
    maxPrize: string;
    available: number;
  } | null>(null);

  const [sendMode, setSendMode] = useState<'single' | 'batch'>('single');
  const [singleUsername, setSingleUsername] = useState<string>('');
  const [singleAmount, setSingleAmount] = useState<number>(1);
  const [modalBatchInput, setModalBatchInput] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Replenish vault modal state
  const [showReplenishModal, setShowReplenishModal] = useState(false);
  const [replenishAmount, setReplenishAmount] = useState<number>(1000);
  const [replenishTier, setReplenishTier] = useState<ScratcherTierType>('grand');
  const [isReplenishing, setIsReplenishing] = useState(false);

  // Search in records
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'nfts' | 'batch' | 'records' | 'claims'>('nfts');

  const fetchOverview = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const res = await getAdminOverviewApi();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch real balances and NFTs for admin address
  const fetchAdminWalletData = async (address: string) => {
    setIsLoadingNfts(true);
    try {
      // 1. Fetch real on-chain balances
      const balances = await fetchRealBalances(address);
      setAdminAccount((prev) =>
        prev
          ? {
              ...prev,
              balanceMatic: balances.balanceMatic,
              balanceVerse: balances.balanceVerse,
              balanceMaticRaw: balances.balanceMaticRaw,
              balanceVerseRaw: balances.balanceVerseRaw,
              balanceMaticError: balances.balanceMaticError,
              balanceVerseError: balances.balanceVerseError,
            }
          : null
      );

      // 2. Fetch on-chain scratcher NFTs
      const nfts = await fetchRealScratchersForAddress(address);
      setAdminOnChainNfts(nfts);
    } catch (err) {
      console.warn('Error querying admin on-chain data:', err);
    } finally {
      setIsLoadingNfts(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(() => fetchOverview(false), 8000);
    return () => clearInterval(interval);
  }, []);

  // Poll admin wallet balances and NFTs when admin is connected
  useEffect(() => {
    if (adminAccount?.address) {
      setAdminWalletApi(adminAccount.address).catch(console.error);
      fetchAdminWalletData(adminAccount.address);
      const interval = setInterval(() => {
        if (adminAccount?.address) fetchAdminWalletData(adminAccount.address);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [adminAccount?.address]);

  // Connect Admin Wallet Handler
  const handleConnectAdminWallet = async () => {
    setIsConnectingAdminWallet(true);
    setAdminConnectError(null);
    try {
      const res = await connectViaWalletConnect();
      if (res.success && res.account) {
        setAdminAccount(res.account);
        await setAdminWalletApi(res.account.address);
        fetchAdminWalletData(res.account.address);
        if (onNotify) {
          onNotify(
            'Admin Wallet Connected',
            `Admin connected with address ${res.account.address.slice(0, 6)}...${res.account.address.slice(-4)}`
          );
        }
      } else {
        setAdminConnectError(res.error || 'Admin wallet connection was cancelled.');
      }
    } catch (err: any) {
      setAdminConnectError(err.message || 'Failed to connect admin wallet.');
    } finally {
      setIsConnectingAdminWallet(false);
    }
  };

  const handleDisconnectAdminWallet = () => {
    setAdminAccount(null);
    setAdminOnChainNfts([]);
    if (onNotify) {
      onNotify('Admin Wallet Disconnected', 'Admin wallet has been disconnected.');
    }
  };

  // Parse multi-line input: "@handle 5" or "handle, 10" or "@handle: 2"
  const parseBatchInput = (text: string) => {
    const lines = text.split('\n');
    const items: { username: string; amount: number; raw: string }[] = [];
    let totalCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parts = trimmed.split(/[\s,:]+/).filter(Boolean);
      if (parts.length >= 2) {
        let username = parts[0];
        if (!username.startsWith('@')) username = '@' + username;
        const amount = parseInt(parts[1], 10);
        if (!isNaN(amount) && amount > 0) {
          items.push({ username, amount, raw: trimmed });
          totalCount += amount;
        }
      } else if (parts.length === 1) {
        let username = parts[0];
        if (!username.startsWith('@')) username = '@' + username;
        items.push({ username, amount: 1, raw: trimmed });
        totalCount += 1;
      }
    }

    return { items, totalCount };
  };

  const { items: parsedItems, totalCount: parsedTotalCount } = parseBatchInput(rawInput);

  const handleBatchAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminAccount) {
      setAllocationErrorMsg('Please connect your admin wallet first to dispatch NFTs.');
      return;
    }
    if (parsedItems.length === 0) {
      setAllocationErrorMsg('Please enter at least one valid Telegram handle and count');
      return;
    }

    setIsSubmitting(true);
    setAllocationErrorMsg(null);
    setAllocationSuccessMsg(null);

    try {
      const payload = parsedItems.map((item) => ({
        username: item.username,
        amount: item.amount,
        tier: selectedTier,
      }));

      const res = await batchAllocateApi(
        payload,
        selectedTier,
        adminAccount.address
      );

      setAllocationSuccessMsg(res.message);
      if (onNotify) {
        onNotify('NFT Scratchers Dispatched', res.message);
      }
      setRawInput('');
      fetchOverview(false);
    } catch (err: any) {
      setAllocationErrorMsg(err.message || 'Failed to send scratchers');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Touch Send Modal Submission (One by One or Batch)
  const handleModalSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNftForSend) return;
    if (!adminAccount) {
      setModalError('Please connect your admin wallet first to dispatch NFTs.');
      return;
    }

    setModalError(null);
    setModalSuccess(null);
    setIsSubmitting(true);

    try {
      if (sendMode === 'single') {
        let cleaned = singleUsername.trim();
        if (!cleaned) {
          setModalError('Please enter a Telegram username (e.g. @username)');
          setIsSubmitting(false);
          return;
        }
        if (!cleaned.startsWith('@')) cleaned = '@' + cleaned;

        const count = Math.max(1, singleAmount);
        const res = await batchAllocateApi(
          [{ username: cleaned, amount: count, tier: selectedNftForSend.tier }],
          selectedNftForSend.tier,
          adminAccount.address
        );

        setModalSuccess(`Successfully sent ${count} ${selectedNftForSend.title} to ${cleaned}!`);
        if (onNotify) {
          onNotify('NFT Scratcher Sent', `Sent ${count} ${selectedNftForSend.title} to ${cleaned}`);
        }
        setSingleUsername('');
        fetchOverview(false);
        setTimeout(() => {
          setSelectedNftForSend(null);
          setModalSuccess(null);
        }, 1800);
      } else {
        const { items } = parseBatchInput(modalBatchInput);
        if (items.length === 0) {
          setModalError('Please enter at least one Telegram handle and quantity');
          setIsSubmitting(false);
          return;
        }

        const payload = items.map((item) => ({
          username: item.username,
          amount: item.amount,
          tier: selectedNftForSend.tier,
        }));

        const res = await batchAllocateApi(
          payload,
          selectedNftForSend.tier,
          adminAccount.address
        );

        setModalSuccess(res.message);
        if (onNotify) {
          onNotify('NFT Scratchers Sent', res.message);
        }
        setModalBatchInput('');
        fetchOverview(false);
        setTimeout(() => {
          setSelectedNftForSend(null);
          setModalSuccess(null);
        }, 1800);
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to send NFT');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplenishVault = async () => {
    setIsReplenishing(true);
    try {
      const res = await addVaultInventoryApi(replenishAmount, replenishTier);
      setShowReplenishModal(false);
      if (onNotify) {
        onNotify('Vault Replenished', res.message);
      }
      fetchOverview(false);
    } catch (err: any) {
      alert(err.message || 'Failed to replenish vault');
    } finally {
      setIsReplenishing(false);
    }
  };

  const availableInVault = data?.inventory
    ? Math.max(0, data.inventory.totalInVault - data.inventory.allocatedCount - data.inventory.claimedCount)
    : 0;

  // Filter records by Telegram username
  const filteredAllocations = (data?.allocations || []).filter((alloc) =>
    alloc.telegramUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClaims = (data?.claims || []).filter((claim) =>
    claim.telegramUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Admin NFT Scratchers Catalog definitions
  const adminNftTiers = [
    {
      id: 'grand' as ScratcherTierType,
      title: 'Series VIII Gold Grand Scratcher',
      maxPrize: '8,000,000 VERSE',
      theme: 'gold',
      icon: Crown,
      contract: '0x6e24A98eaAEfa0Ec8A7147b4eCDE14eB78772D1E',
      available: data?.inventory?.tiers?.grand || 0,
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      badge: 'TOP TIER NFT',
      badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
      accentColor: 'from-amber-500/20 to-yellow-600/10 border-amber-500/40',
    },
    {
      id: 'mega' as ScratcherTierType,
      title: 'Series VI Neon Mega Scratcher',
      maxPrize: '1,000,000 VERSE',
      theme: 'neon',
      icon: Flame,
      contract: '0x6e24A98eaAEfa0Ec8A7147b4eCDE14eB78772D1E',
      available: data?.inventory?.tiers?.mega || 0,
      image: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80',
      badge: 'POPULAR NFT',
      badgeColor: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40',
      accentColor: 'from-cyan-500/20 to-blue-600/10 border-cyan-500/40',
    },
    {
      id: 'lucky' as ScratcherTierType,
      title: 'Series IV Cyan Lucky Scratcher',
      maxPrize: '250,000 VERSE',
      theme: 'cyan',
      icon: Sparkles,
      contract: '0x6e24A98eaAEfa0Ec8A7147b4eCDE14eB78772D1E',
      available: data?.inventory?.tiers?.lucky || 0,
      image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&auto=format&fit=crop&q=80',
      badge: 'COMMUNITY NFT',
      badgeColor: 'bg-purple-400/20 text-purple-300 border-purple-400/40',
      accentColor: 'from-purple-500/20 to-indigo-600/10 border-purple-500/40',
    },
    {
      id: 'mini' as ScratcherTierType,
      title: 'Series II Purple Mini Scratcher',
      maxPrize: '50,000 VERSE',
      theme: 'purple',
      icon: Coins,
      contract: '0x6e24A98eaAEfa0Ec8A7147b4eCDE14eB78772D1E',
      available: data?.inventory?.tiers?.mini || 0,
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
      badge: 'STARTER NFT',
      badgeColor: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
      accentColor: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/40',
    },
  ];

  const totalNftsAvailable = (data?.inventory?.totalInVault || 0) + adminOnChainNfts.length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 px-4 sm:px-6 py-8 text-slate-200">
      {/* Top Admin Header Bar with Balance Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0C1426] via-[#09101F] to-[#050811] border border-cyan-500/30 shadow-2xl relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#00E5FF]/10 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(0,229,255,0.25)]">
              <Shield className="w-8 h-8 text-[#00E5FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  ADMIN NFT VAULT &amp; DISPATCH
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-[#00E5FF] text-[10px] font-black uppercase tracking-wider border border-cyan-500/30">
                  Admin Panel
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Connect your admin wallet to view your balances and dispatch Verse Scratcher NFTs directly to Telegram usernames.
              </p>
            </div>
          </div>

          {/* Quick Actions & Portal Switch */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="admin-return-home-btn"
              onClick={onSwitchToUserPortal}
              className="px-5 py-2.5 rounded-2xl bg-[#132240] hover:bg-[#182c54] border border-cyan-500/30 text-[#00E5FF] font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <span>Back to Home</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => {
                fetchOverview(true);
                if (adminAccount?.address) fetchAdminWalletData(adminAccount.address);
              }}
              disabled={isRefreshing}
              className="p-2.5 rounded-2xl bg-[#0E172A] hover:bg-[#14203B] border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Refresh Admin Overview"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-[#00E5FF]' : ''} />
            </button>
          </div>
        </div>

        {/* Admin Wallet & Live On-Chain Balance Bar */}
        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Admin Wallet Address & Connect Button */}
          <div className="p-4 rounded-2xl bg-[#070D1B] border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Admin Connected Wallet
              </span>
              {adminAccount?.address ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs font-bold text-[#00E5FF] block">
                    {adminAccount.address.slice(0, 8)}...{adminAccount.address.slice(-6)}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              ) : (
                <span className="text-xs text-amber-300/90 font-medium block mt-0.5">
                  Not Connected (Admin Required)
                </span>
              )}
            </div>

            {adminAccount?.address ? (
              <button
                onClick={handleDisconnectAdminWallet}
                title="Disconnect Admin Wallet"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-950/60 hover:text-red-300 text-slate-400 border border-slate-700 hover:border-red-500/40 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <LogOut size={13} />
                <span className="text-[11px]">Disconnect</span>
              </button>
            ) : (
              <button
                onClick={handleConnectAdminWallet}
                disabled={isConnectingAdminWallet}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#0099FF] hover:brightness-110 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                {isConnectingAdminWallet ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet size={13} />
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Admin VERSE Balance */}
          <div className="p-4 rounded-2xl bg-[#070D1B] border border-cyan-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Admin VERSE Balance (Polygon)
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-base font-black text-[#00E5FF]">
                  {adminAccount ? formatBalanceDisplay(adminAccount.balanceVerse, 2, '0.00') : '—'}
                </span>
                <span className="text-[11px] font-bold text-cyan-300">VERSE</span>
              </div>
            </div>
            <VerseCoinLogo size={24} />
          </div>

          {/* Admin POL / MATIC Balance */}
          <div className="p-4 rounded-2xl bg-[#070D1B] border border-purple-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Admin POL (MATIC) Balance
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-base font-black text-purple-300">
                  {adminAccount ? formatBalanceDisplay(adminAccount.balanceMatic, 4, '0.0000') : '—'}
                </span>
                <span className="text-[11px] font-bold text-purple-400">POL</span>
              </div>
            </div>
            <PolygonBadge size="sm" />
          </div>
        </div>

        {adminConnectError && (
          <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{adminConnectError}</span>
            </div>
            <button onClick={() => setAdminConnectError(null)} className="text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Prominent Banner if Admin Wallet Not Connected */}
      {!adminAccount && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#091122] border border-cyan-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#00E5FF]/15 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Wallet className="w-7 h-7 text-[#00E5FF]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white tracking-tight">
                Connect Admin Wallet to View Balances &amp; NFTs
              </h3>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Connect your Polygon admin wallet to load your live on-chain VERSE balance, POL balance, and Verse Scratcher NFTs for dispatch.
              </p>
            </div>
          </div>

          <button
            onClick={handleConnectAdminWallet}
            disabled={isConnectingAdminWallet}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#00E5FF] to-[#0099FF] hover:brightness-110 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-cyan-500/25 cursor-pointer"
          >
            {isConnectingAdminWallet ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Connecting Wallet...</span>
              </>
            ) : (
              <>
                <Wallet size={16} />
                <span>Connect Admin Wallet</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Scratcher Inventory Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total in Vault */}
        <div className="p-5 rounded-3xl bg-[#080E1C] border border-slate-800 flex flex-col justify-between space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Database size={14} className="text-[#00E5FF]" />
              TOTAL ADMIN NFTS
            </span>
            <button
              onClick={() => setShowReplenishModal(true)}
              className="text-[11px] font-bold text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle size={12} />
              + Mint NFTs
            </button>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {adminAccount ? totalNftsAvailable.toLocaleString() : '—'}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Available to Send</span>
        </div>

        {/* Approved & Allocated */}
        <div className="p-5 rounded-3xl bg-[#080E1C] border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Clock size={14} />
              SENT &amp; PENDING CLAIM
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 text-[10px] font-bold border border-amber-400/20">
              Ready on Home
            </span>
          </div>
          <div className="text-3xl font-black text-amber-300 tracking-tight">
            {(data?.inventory.allocatedCount || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Waiting for User Claim</span>
        </div>

        {/* Successfully Claimed */}
        <div className="p-5 rounded-3xl bg-[#080E1C] border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              CLAIMED BY USERS
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight">
            {(data?.inventory.claimedCount || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Delivered to Users</span>
        </div>

        {/* Dispatched Handles */}
        <div className="p-5 rounded-3xl bg-[#080E1C] border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Send size={14} />
              DISPATCHED USERNAMES
            </span>
            <span className="text-xs font-bold text-purple-300">Live</span>
          </div>
          <div className="text-3xl font-black text-purple-300 tracking-tight">
            {(data?.allocations || []).length}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Dispatched Records</span>
        </div>
      </div>

      {/* Navigation Tabs (Without user wallet tables) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('nfts')}
          className={`px-4 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'nfts'
              ? 'bg-[#00E5FF] text-black shadow-lg shadow-cyan-500/20'
              : 'bg-[#0E172A] text-slate-300 hover:text-white hover:bg-[#14203B]'
          }`}
        >
          <Sparkles size={14} />
          Admin NFTs &amp; Dispatch {adminAccount ? `(${totalNftsAvailable.toLocaleString()})` : ''}
        </button>

        <button
          onClick={() => setActiveTab('batch')}
          className={`px-4 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'batch'
              ? 'bg-[#00E5FF] text-black shadow-lg shadow-cyan-500/20'
              : 'bg-[#0E172A] text-slate-300 hover:text-white hover:bg-[#14203B]'
          }`}
        >
          <Send size={14} />
          Batch Send to Telegrams
        </button>

        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'records'
              ? 'bg-[#00E5FF] text-black shadow-lg shadow-cyan-500/20'
              : 'bg-[#0E172A] text-slate-300 hover:text-white hover:bg-[#14203B]'
          }`}
        >
          <Layers size={14} />
          Dispatched Records ({(data?.allocations || []).length})
        </button>

        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'claims'
              ? 'bg-[#00E5FF] text-black shadow-lg shadow-cyan-500/20'
              : 'bg-[#0E172A] text-slate-300 hover:text-white hover:bg-[#14203B]'
          }`}
        >
          <CheckCircle2 size={14} />
          Claim Logs ({(data?.claims || []).length})
        </button>
      </div>

      {/* TAB 1: Admin NFTs & Interactive Dispatch */}
      {activeTab === 'nfts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#080E1C] border border-slate-800">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Sparkles className="text-amber-400 w-5 h-5" />
                ADMIN VERSE SCRATCHER NFT CATALOG
              </h3>
              <p className="text-xs text-slate-400">
                Touch any NFT card below to send it to Telegram usernames one-by-one or in batch.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowReplenishModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#0099FF] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 hover:brightness-110 cursor-pointer"
              >
                <PlusCircle size={14} />
                + Mint / Deposit NFTs
              </button>
            </div>
          </div>

          {/* Condition: Admin Not Connected */}
          {!adminAccount ? (
            <div className="p-12 text-center rounded-3xl bg-[#080E1C] border border-slate-800 space-y-4">
              <Wallet size={48} className="mx-auto text-cyan-400 opacity-60" />
              <h4 className="text-xl font-black text-white tracking-tight">Connect Admin Wallet</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Connect your Polygon admin wallet to display your live on-chain VERSE balance, POL balance, and Verse Scratcher NFTs.
              </p>
              <button
                onClick={handleConnectAdminWallet}
                disabled={isConnectingAdminWallet}
                className="px-7 py-3 rounded-2xl bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                {isConnectingAdminWallet ? 'Connecting...' : 'Connect Admin Wallet'}
              </button>
            </div>
          ) : totalNftsAvailable === 0 ? (
            /* Condition: Admin Connected but 0 NFTs in address */
            <div className="p-12 text-center rounded-3xl bg-[#080E1C] border border-slate-800 space-y-4">
              <AlertCircle size={48} className="mx-auto text-amber-400" />
              <h4 className="text-xl font-black text-white uppercase tracking-tight">
                No NFT in this admin address
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Your connected admin address <span className="font-mono text-cyan-300">{adminAccount.address.slice(0, 8)}...{adminAccount.address.slice(-6)}</span> currently has 0 Verse Scratcher NFTs. Click below to mint or deposit NFTs into your vault.
              </p>
              <button
                onClick={() => setShowReplenishModal(true)}
                className="px-6 py-2.5 rounded-xl bg-[#00E5FF] text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                + Mint / Stock Vault NFTs
              </button>
            </div>
          ) : (
            /* NFT Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {adminNftTiers.map((tier) => (
                <div
                  key={tier.id}
                  onClick={() => {
                    setSelectedNftForSend({
                      tier: tier.id,
                      title: tier.title,
                      image: tier.image,
                      maxPrize: tier.maxPrize,
                      available: tier.available,
                    });
                    setSingleUsername('');
                    setSingleAmount(1);
                    setModalBatchInput('');
                    setModalError(null);
                    setModalSuccess(null);
                  }}
                  className={`p-5 rounded-3xl bg-gradient-to-b ${tier.accentColor} bg-[#080E1C] border flex flex-col justify-between space-y-4 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer shadow-lg`}
                >
                  {/* NFT Image Preview */}
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-[#040813] border border-slate-700">
                    <img
                      src={tier.image}
                      alt={tier.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                    {/* Top Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${tier.badgeColor}`}>
                        {tier.badge}
                      </span>
                    </div>

                    {/* Max Prize Overlay */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">Max Prize:</span>
                      <span className="font-mono text-xs font-black text-amber-300 drop-shadow">
                        {tier.maxPrize}
                      </span>
                    </div>
                  </div>

                  {/* NFT Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-white text-sm tracking-tight truncate">
                        {tier.title}
                      </h4>
                      <tier.icon size={16} className="text-[#00E5FF] shrink-0" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Available in Vault:</span>
                      <span className="font-mono font-black text-white">
                        {tier.available.toLocaleString()} NFTs
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Network:</span>
                      <span className="font-semibold text-purple-300">Polygon Mainnet (137)</span>
                    </div>
                  </div>

                  {/* Touch to Send Action Button */}
                  <button
                    type="button"
                    className="w-full py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Send size={13} />
                    <span>Touch &amp; Send to User</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Batch Send to Telegrams */}
      {activeTab === 'batch' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Input Form */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-[#080E1C] border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="text-[#00E5FF] w-5 h-5" />
                <h3 className="text-lg font-black text-white tracking-tight">
                  BATCH SEND NFTS TO TELEGRAM USERNAMES
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-bold">
                Available in Vault: <span className="text-[#00E5FF]">{availableInVault.toLocaleString()}</span>
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Paste recipient Telegram usernames and quantities. When you send, the scratchers become immediately ready for the users to claim on the Home Page.
            </p>

            <form onSubmit={handleBatchAllocate} className="space-y-4">
              {/* Tier Selection */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-2">
                  Select Scratcher NFT Tier
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'grand', title: 'Grand 8M', max: '8,000,000 VERSE', icon: Crown },
                    { id: 'mega', title: 'Mega 1M', max: '1,000,000 VERSE', icon: Flame },
                    { id: 'lucky', title: 'Lucky 250k', max: '250,000 VERSE', icon: Sparkles },
                    { id: 'mini', title: 'Mini 50k', max: '50,000 VERSE', icon: Coins },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTier(t.id as ScratcherTierType)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        selectedTier === t.id
                          ? 'border-[#00E5FF] bg-cyan-950/40 ring-1 ring-[#00E5FF]'
                          : 'border-slate-800 bg-[#0C1426] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-extrabold text-white">{t.title}</span>
                        <t.icon size={14} className={selectedTier === t.id ? 'text-[#00E5FF]' : 'text-slate-400'} />
                      </div>
                      <span className="text-[10px] text-amber-300 font-mono block truncate">{t.max}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Input */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-2 flex items-center justify-between">
                  <span>Telegram Handles &amp; Quantities</span>
                  <span className="text-[11px] text-slate-500 font-normal">Format: @username count</span>
                </label>
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  rows={6}
                  placeholder={`@username 5\n@telegram_handle 10\n@crypto_fan 3`}
                  className="w-full p-4 rounded-2xl bg-[#040813] border border-slate-800 focus:border-[#00E5FF] focus:outline-none font-mono text-sm text-cyan-200 placeholder-slate-600 transition-colors"
                />
              </div>

              {allocationErrorMsg && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{allocationErrorMsg}</span>
                </div>
              )}

              {allocationSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>{allocationSuccessMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || parsedItems.length === 0}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00E5FF] via-[#00cce6] to-[#0099FF] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Dispatching NFTs to Telegrams...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>
                      Dispatch {parsedTotalCount > 0 ? `${parsedTotalCount} Scratchers` : 'Scratchers'} to {parsedItems.length} Username{parsedItems.length > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Live Batch Preview Sidebar */}
          <div className="p-6 rounded-3xl bg-[#080E1C] border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Batch Live Preview</span>
                <span className="text-[#00E5FF]">{parsedItems.length} Recipient(s)</span>
              </h4>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {parsedItems.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500">
                    Enter usernames on the left to see instant parsing breakdown.
                  </div>
                ) : (
                  parsedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#0C1426] border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono font-bold text-cyan-300">{item.username}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-[#00E5FF] font-black text-[11px]">
                        +{item.amount} NFTs
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              When these Telegram users visit the app and connect their wallet, the scratchers will appear ready to claim instantly!
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Dispatched Records (NO user wallet addresses) */}
      {activeTab === 'records' && (
        <div className="p-6 rounded-3xl bg-[#080E1C] border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Layers className="text-[#00E5FF] w-5 h-5" />
                NFT SCRATCHER DISPATCH RECORDS
              </h3>
              <p className="text-xs text-slate-400">
                Audit trail of scratcher NFTs dispatched to Telegram usernames
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search Telegram handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#040813] border border-slate-800 focus:border-[#00E5FF] focus:outline-none text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Allocation ID</th>
                  <th className="py-3 px-4">Recipient Telegram</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4 text-center">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sent Date</th>
                  <th className="py-3 px-4">Claim Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No scratcher NFTs dispatched yet.
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-[#0C1426]/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {alloc.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                        {alloc.telegramUsername}
                      </td>
                      <td className="py-3.5 px-4 uppercase text-[11px] font-bold text-white">
                        {alloc.tier}
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-amber-300">
                        {alloc.amount}
                      </td>
                      <td className="py-3.5 px-4">
                        {alloc.status === 'APPROVED' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-black">
                            APPROVED (PENDING)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-[10px] font-black">
                            CLAIMED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(alloc.approvedAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {alloc.claimedAt ? new Date(alloc.claimedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Claims Audit Log (NO user wallet addresses) */}
      {activeTab === 'claims' && (
        <div className="p-6 rounded-3xl bg-[#080E1C] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400 w-5 h-5" />
                CLAIM RECEIPT AUDIT LOGS
              </h3>
              <p className="text-xs text-slate-400">
                Verified logs when users claim scratchers sent to their Telegram usernames
              </p>
            </div>
            <span className="text-xs text-slate-400 font-bold">
              Total Claims: {data?.claims.length || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Claim ID</th>
                  <th className="py-3 px-4">Recipient Telegram</th>
                  <th className="py-3 px-4 text-center">Amount Claimed</th>
                  <th className="py-3 px-4">Transaction Hash</th>
                  <th className="py-3 px-4">Claim Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No claims recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-[#0C1426]/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {claim.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                        {claim.telegramUsername}
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-emerald-400">
                        +{claim.amount} Scratchers
                      </td>
                      <td className="py-3.5 px-4 font-mono text-purple-300 text-[11px]">
                        {claim.txHash.slice(0, 10)}...{claim.txHash.slice(-6)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(claim.claimedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TOUCH NFT SEND MODAL (One-by-One or Batch) */}
      {selectedNftForSend && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-3xl bg-[#091122] border border-cyan-500/40 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#040813] border border-cyan-500/40 shrink-0">
                  <img
                    src={selectedNftForSend.image}
                    alt={selectedNftForSend.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{selectedNftForSend.title}</h3>
                  <span className="text-xs text-amber-300 font-mono font-bold">
                    Max Prize: {selectedNftForSend.maxPrize}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNftForSend(null)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Switch between Single and Batch Mode */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#040813] border border-slate-800">
              <button
                type="button"
                onClick={() => setSendMode('single')}
                className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  sendMode === 'single'
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Send One by One
              </button>
              <button
                type="button"
                onClick={() => setSendMode('batch')}
                className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  sendMode === 'batch'
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Send in Batch
              </button>
            </div>

            <form onSubmit={handleModalSend} className="space-y-4">
              {sendMode === 'single' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Recipient Telegram Username
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="@username"
                      value={singleUsername}
                      onChange={(e) => setSingleUsername(e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-[#040813] border border-slate-800 text-xs text-white font-mono focus:border-[#00E5FF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Number of Scratchers to Send
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={singleAmount}
                      onChange={(e) => setSingleAmount(parseInt(e.target.value, 10) || 1)}
                      className="w-full p-3.5 rounded-xl bg-[#040813] border border-slate-800 text-xs text-white font-mono focus:border-[#00E5FF] focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Batch Recipients</span>
                    <span className="text-[10px] text-slate-500">Format: @username count</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder={`@username 5\n@telegram_user 10`}
                    value={modalBatchInput}
                    onChange={(e) => setModalBatchInput(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[#040813] border border-slate-800 text-xs text-cyan-200 font-mono focus:border-[#00E5FF] focus:outline-none"
                  />
                </div>
              )}

              {modalError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00E5FF] to-[#0099FF] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Sending NFT...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send {selectedNftForSend.title}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REPLENISH VAULT MODAL */}
      {showReplenishModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#091122] border border-cyan-500/40 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <PlusCircle className="text-[#00E5FF]" size={18} />
                MINT / DEPOSIT SCRATCHER NFTS
              </h3>
              <button
                onClick={() => setShowReplenishModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select tier and amount of Verse Scratcher NFTs to stock into the Admin Vault for dispatching to Telegram users.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Scratcher Tier
                </label>
                <select
                  value={replenishTier}
                  onChange={(e) => setReplenishTier(e.target.value as ScratcherTierType)}
                  className="w-full p-3 rounded-xl bg-[#040813] border border-slate-800 text-xs text-white focus:border-[#00E5FF] focus:outline-none"
                >
                  <option value="grand">Gold Grand (8,000,000 VERSE Max)</option>
                  <option value="mega">Neon Mega (1,000,000 VERSE Max)</option>
                  <option value="lucky">Cyan Lucky (250,000 VERSE Max)</option>
                  <option value="mini">Purple Mini (50,000 VERSE Max)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Amount of NFTs to Stock
                </label>
                <input
                  type="number"
                  min="10"
                  max="50000"
                  step="50"
                  value={replenishAmount}
                  onChange={(e) => setReplenishAmount(parseInt(e.target.value, 10) || 500)}
                  className="w-full p-3 rounded-xl bg-[#040813] border border-slate-800 text-xs text-white font-mono focus:border-[#00E5FF] focus:outline-none"
                />
              </div>

              <button
                onClick={handleReplenishVault}
                disabled={isReplenishing}
                className="w-full py-3.5 rounded-xl bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                {isReplenishing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Minting / Depositing...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle size={15} />
                    <span>Stock {replenishAmount.toLocaleString()} NFTs into Vault</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
