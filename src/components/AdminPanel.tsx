import React, { useState, useEffect } from 'react';
import {
  Shield,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  Coins,
  Send,
  PlusCircle,
  RefreshCw,
  Search,
  Copy,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Database,
  ArrowRight,
  UserCheck,
  PackagePlus,
  Flame,
  Crown,
  Check,
  Wallet,
} from 'lucide-react';
import {
  AdminOverviewResponse,
  RegisteredUser,
  AllocationRecord,
  ScratcherVaultInventory,
  ScratcherTierType,
  WalletAccount,
} from '../types';
import {
  getAdminOverviewApi,
  batchAllocateApi,
  addVaultInventoryApi,
  setAdminWalletApi,
} from '../services/apiService';
import { VerseCoinLogo, PolygonBadge } from './VerseBrand';

interface AdminPanelProps {
  account: WalletAccount | null;
  onConnectWallet: () => void;
  onSwitchToUserPortal: () => void;
  onNotify?: (title: string, message: string, verseAmount?: number) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  account,
  onConnectWallet,
  onSwitchToUserPortal,
  onNotify,
}) => {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Send NFT Scratchers form state
  const [rawInput, setRawInput] = useState<string>(
    '@zionoluchi 5\n@verse_hunter 10\n@crypto_gem 3'
  );
  const [selectedTier, setSelectedTier] = useState<ScratcherTierType>('grand');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allocationSuccessMsg, setAllocationSuccessMsg] = useState<string | null>(null);
  const [allocationErrorMsg, setAllocationErrorMsg] = useState<string | null>(null);

  // Single Quick Send Modal / Form
  const [quickSendUsername, setQuickSendUsername] = useState<string>('');
  const [quickSendAmount, setQuickSendAmount] = useState<number>(1);
  const [quickSendTier, setQuickSendTier] = useState<ScratcherTierType>('grand');
  const [showQuickSendModal, setShowQuickSendModal] = useState<boolean>(false);

  // Replenish vault modal / input state
  const [showReplenishModal, setShowReplenishModal] = useState(false);
  const [replenishAmount, setReplenishAmount] = useState<number>(1000);
  const [replenishTier, setReplenishTier] = useState<ScratcherTierType>('grand');
  const [isReplenishing, setIsReplenishing] = useState(false);

  // User directory search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'nfts' | 'allocate' | 'users' | 'allocations' | 'claims'>('nfts');

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

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(() => fetchOverview(false), 8000);
    return () => clearInterval(interval);
  }, []);

  // Sync admin wallet when connected
  useEffect(() => {
    if (account?.address) {
      setAdminWalletApi(account.address).catch(console.error);
    }
  }, [account?.address]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Parse multi-line input: "@handle 5" or "handle, 10" or "@handle: 2"
  const parseBatchInput = () => {
    const lines = rawInput.split('\n');
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

  const { items: parsedItems, totalCount: parsedTotalCount } = parseBatchInput();

  const handleBatchAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
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
        account?.address || data?.adminWallet || undefined
      );

      setAllocationSuccessMsg(res.message);
      if (onNotify) {
        onNotify('NFT Scratchers Sent', res.message);
      }
      setRawInput('');
      fetchOverview(false);
    } catch (err: any) {
      setAllocationErrorMsg(err.message || 'Failed to send scratchers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSend = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = quickSendUsername.trim();
    if (!cleaned) return;
    if (!cleaned.startsWith('@')) cleaned = '@' + cleaned;

    setIsSubmitting(true);
    try {
      const res = await batchAllocateApi(
        [{ username: cleaned, amount: quickSendAmount, tier: quickSendTier }],
        quickSendTier,
        account?.address || data?.adminWallet || undefined
      );
      setShowQuickSendModal(false);
      if (onNotify) {
        onNotify('NFT Scratcher Sent', `Sent ${quickSendAmount} ${quickSendTier.toUpperCase()} scratcher(s) to ${cleaned}`);
      }
      setQuickSendUsername('');
      fetchOverview(false);
    } catch (err: any) {
      alert(err.message || 'Failed to send');
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

  const handleQuickAddUser = (username: string) => {
    setQuickSendUsername(username);
    setShowQuickSendModal(true);
  };

  const filteredUsers = (data?.users || []).filter(
    (u) =>
      u.telegramUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.walletAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableInVault = data?.inventory
    ? Math.max(0, data.inventory.totalInVault - data.inventory.allocatedCount - data.inventory.claimedCount)
    : 0;

  // Admin NFT Scratchers Catalog definitions
  const adminNftTiers = [
    {
      id: 'grand',
      title: 'Series VIII Gold Grand Scratcher',
      maxPrize: '8,000,000 VERSE',
      theme: 'gold',
      icon: Crown,
      contract: '0x6e24A98eaAEfa0Ec8A7147b4eCDE14eB78772D1E',
      available: data?.inventory?.tiers?.grand || 2500,
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      badge: 'TOP TIER NFT',
      badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
      accentColor: 'from-amber-500/20 to-yellow-600/10 border-amber-500/40',
    },
    {
      id: 'mega',
      title: 'Series VI Neon Mega Scratcher',
      maxPrize: '1,000,000 VERSE',
      theme: 'neon',
      icon: Flame,
      contract: '0x6e24A98eaAEfa0Ec8A7147b4eCDE14eB78772D1E',
      available: data?.inventory?.tiers?.mega || 2500,
      image: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80',
      badge: 'POPULAR NFT',
      badgeColor: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40',
      accentColor: 'from-cyan-500/20 to-blue-600/10 border-cyan-500/40',
    },
    {
      id: 'lucky',
      title: 'Series IV Cyan Lucky Scratcher',
      maxPrize: '250,000 VERSE',
      theme: 'cyan',
      icon: Sparkles,
      contract: '0x6e24A98eaAEfa0Ec8A7147b4eCDE14eB78772D1E',
      available: data?.inventory?.tiers?.lucky || 2500,
      image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&auto=format&fit=crop&q=80',
      badge: 'COMMUNITY NFT',
      badgeColor: 'bg-purple-400/20 text-purple-300 border-purple-400/40',
      accentColor: 'from-purple-500/20 to-indigo-600/10 border-purple-500/40',
    },
    {
      id: 'mini',
      title: 'Series II Purple Mini Scratcher',
      maxPrize: '50,000 VERSE',
      theme: 'purple',
      icon: Coins,
      contract: '0x6e24A98eaAEfa0Ec8A7147b4eCDE14eB78772D1E',
      available: data?.inventory?.tiers?.mini || 2500,
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
      badge: 'STARTER NFT',
      badgeColor: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
      accentColor: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/40',
    },
  ];

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
                  PIN Verified (2004)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Admin view: Send Verse Scratcher NFTs to Telegram usernames, linked to recipient wallet addresses for instant claiming anytime.
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
              onClick={() => fetchOverview(true)}
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
          {/* Admin Wallet Address */}
          <div className="p-4 rounded-2xl bg-[#070D1B] border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Admin Connected Wallet
              </span>
              {account?.address ? (
                <span className="font-mono text-xs font-bold text-[#00E5FF] block mt-0.5">
                  {account.address.slice(0, 8)}...{account.address.slice(-6)}
                </span>
              ) : (
                <span className="text-xs text-slate-500 italic block mt-0.5">
                  No Admin Wallet Connected
                </span>
              )}
            </div>

            {account?.address ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <button
                onClick={onConnectWallet}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#0099FF] text-black font-black text-xs cursor-pointer shadow-sm"
              >
                Connect
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
                  {account?.balanceVerse || '0'}
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
                Admin POL / MATIC Balance
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-base font-black text-purple-300">
                  {account?.balanceMatic || '0.0000'}
                </span>
                <span className="text-[11px] font-bold text-purple-400">POL</span>
              </div>
            </div>
            <PolygonBadge size="sm" />
          </div>
        </div>
      </div>

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
            {(data?.inventory.totalInVault || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Available in Admin Scratcher Vault</span>
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
          <span className="text-[11px] text-slate-400 font-medium">Waiting for User to Claim</span>
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
          <span className="text-[11px] text-slate-400 font-medium">Delivered to User Wallets</span>
        </div>

        {/* Registered Users */}
        <div className="p-5 rounded-3xl bg-[#080E1C] border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Users size={14} />
              LINKED USERNAMES
            </span>
            <span className="text-xs font-bold text-purple-300">Live</span>
          </div>
          <div className="text-3xl font-black text-purple-300 tracking-tight">
            {(data?.users || []).length}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Telegrams &amp; Polygon Wallets</span>
        </div>
      </div>

      {/* Navigation Tabs */}
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
          Admin NFT Vault ({(data?.inventory.totalInVault || 0).toLocaleString()})
        </button>

        <button
          onClick={() => setActiveTab('allocate')}
          className={`px-4 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'allocate'
              ? 'bg-[#00E5FF] text-black shadow-lg shadow-cyan-500/20'
              : 'bg-[#0E172A] text-slate-300 hover:text-white hover:bg-[#14203B]'
          }`}
        >
          <Send size={14} />
          Batch Send to Telegrams
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#00E5FF] text-black shadow-lg shadow-cyan-500/20'
              : 'bg-[#0E172A] text-slate-300 hover:text-white hover:bg-[#14203B]'
          }`}
        >
          <UserCheck size={14} />
          Linked Wallets ({(data?.users || []).length})
        </button>

        <button
          onClick={() => setActiveTab('allocations')}
          className={`px-4 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'allocations'
              ? 'bg-[#00E5FF] text-black shadow-lg shadow-cyan-500/20'
              : 'bg-[#0E172A] text-slate-300 hover:text-white hover:bg-[#14203B]'
          }`}
        >
          <Layers size={14} />
          Sent Records ({(data?.allocations || []).length})
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

      {/* TAB 1: Admin NFT Scratcher Vault (Visual NFT Display) */}
      {activeTab === 'nfts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#080E1C] border border-slate-800">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Sparkles className="text-amber-400 w-5 h-5" />
                ADMIN VERSE SCRATCHER NFT VAULT
              </h3>
              <p className="text-xs text-slate-400">
                Official Polygon NFT Scratchers owned by the Admin Vault, ready to be dispatched to usernames and claimed to user wallets.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setQuickSendUsername('');
                  setShowQuickSendModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#0099FF] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 hover:brightness-110 cursor-pointer"
              >
                <Send size={14} />
                Send Scratcher NFT
              </button>

              <button
                onClick={() => setShowReplenishModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#0E172A] border border-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle size={14} />
                Mint More
              </button>
            </div>
          </div>

          {/* NFT Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {adminNftTiers.map((tier) => (
              <div
                key={tier.id}
                className={`p-5 rounded-3xl bg-gradient-to-b ${tier.accentColor} bg-[#080E1C] border flex flex-col justify-between space-y-4 relative overflow-hidden group hover:scale-[1.02] transition-transform`}
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

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => {
                    setQuickSendTier(tier.id as ScratcherTierType);
                    setShowQuickSendModal(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Send size={13} />
                  <span>Send to Username</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Batch Send to Telegrams */}
      {activeTab === 'allocate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Input Form */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-[#080E1C] border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="text-[#00E5FF] w-5 h-5" />
                <h3 className="text-lg font-black text-white tracking-tight">
                  SEND NFTS TO TELEGRAM USERNAMES
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-bold">
                Available in Vault: <span className="text-[#00E5FF]">{availableInVault.toLocaleString()}</span>
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Paste recipient Telegram usernames and quantities. When you submit, the NFT scratchers are deducted from the Admin Vault and associated with the username and their Polygon wallet address so they can claim it anytime on the Home Page.
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
                      <span className="text-[10px] text-slate-400 font-medium block">Up to {t.max}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea for Multi-line input */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-2 flex items-center justify-between">
                  <span>Telegram Usernames &amp; Quantities (one per line)</span>
                  <span className="text-[11px] text-slate-400 lowercase font-normal">
                    {parsedItems.length} recipients · {parsedTotalCount} total NFTs
                  </span>
                </label>
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  rows={6}
                  placeholder={`@zionoluchi 5\n@verse_hunter 10\n@crypto_gem 3\n@polygon_user, 7`}
                  className="w-full p-4 rounded-2xl bg-[#040813] border border-slate-800 focus:border-[#00E5FF] focus:outline-none font-mono text-sm text-cyan-200 placeholder-slate-600 transition-colors"
                />
              </div>

              {/* Status alerts */}
              {allocationSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3 text-emerald-300 text-xs">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                  <span>{allocationSuccessMsg}</span>
                </div>
              )}

              {allocationErrorMsg && (
                <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 flex items-center gap-3 text-red-300 text-xs">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{allocationErrorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                id="approve-and-allocate-btn"
                type="submit"
                disabled={isSubmitting || parsedItems.length === 0}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#00E5FF] via-cyan-400 to-[#0099FF] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Sending NFTs to Usernames &amp; Wallets...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Send {parsedTotalCount} Scratcher NFTs ({parsedItems.length} Users)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Live Preview Side Box */}
          <div className="p-6 rounded-3xl bg-[#080E1C] border border-slate-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-300" />
                DISPATCH PREVIEW
              </h4>

              <div className="p-4 rounded-2xl bg-[#040813] border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Selected Tier:</span>
                  <span className="font-bold text-white uppercase">{selectedTier}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Recipients:</span>
                  <span className="font-bold text-cyan-300">{parsedItems.length} users</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>NFTs to Deduct from Vault:</span>
                  <span className="font-bold text-amber-300">{parsedTotalCount} NFTs</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Claim Availability:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-black">
                    INSTANT CLAIM ON HOME
                  </span>
                </div>
              </div>

              {/* Parsed List Preview */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Recipients:</span>
                {parsedItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-[#0C1426] rounded-2xl">
                    Type or paste usernames to preview dispatch list
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

      {/* TAB 3: Registered Users Directory */}
      {activeTab === 'users' && (
        <div className="p-6 rounded-3xl bg-[#080E1C] border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Users className="text-[#00E5FF] w-5 h-5" />
                LINKED TELEGRAM USERNAMES &amp; WALLETS
              </h3>
              <p className="text-xs text-slate-400">
                User directory in the Admin database matching Telegram usernames to connected Polygon wallet addresses
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search Telegram or 0x..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#040813] border border-slate-800 focus:border-[#00E5FF] focus:outline-none text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Telegram Username</th>
                  <th className="py-3 px-4">Connected Polygon Wallet</th>
                  <th className="py-3 px-4 text-center">Allocated</th>
                  <th className="py-3 px-4 text-center">Claimed</th>
                  <th className="py-3 px-4 text-center">Pending</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No linked users found yet. When users connect on the Home Page, their Telegram and wallet appear here automatically.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#0C1426]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-cyan-300 text-sm">
                          {user.telegramUsername}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {user.walletAddress ? (
                          <div className="flex items-center gap-1.5 font-mono text-slate-300">
                            <span>{user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-6)}</span>
                            <button
                              onClick={() => handleCopy(user.walletAddress)}
                              className="p-1 hover:text-[#00E5FF] cursor-pointer"
                              title="Copy Address"
                            >
                              {copiedText === user.walletAddress ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            </button>
                            <a
                              href={`https://polygonscan.com/address/${user.walletAddress}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 hover:text-[#00E5FF]"
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Not connected yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-white">
                        {user.totalAllocated}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-400">
                        {user.totalClaimed}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-300">
                        {user.pendingClaim}
                      </td>
                      <td className="py-3.5 px-4">
                        {user.pendingClaim > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-black">
                            APPROVED ({user.pendingClaim})
                          </span>
                        ) : user.totalClaimed > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-[10px] font-black">
                            CLAIMED ALL
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium">
                            READY
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleQuickAddUser(user.telegramUsername)}
                          className="px-3 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00E5FF] font-bold text-xs border border-cyan-500/30 transition-all cursor-pointer"
                        >
                          + Send NFT
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Allocations List */}
      {activeTab === 'allocations' && (
        <div className="p-6 rounded-3xl bg-[#080E1C] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Layers className="text-[#00E5FF] w-5 h-5" />
                NFT SCRATCHER DISPATCH RECORDS
              </h3>
              <p className="text-xs text-slate-400">
                Audit trail of all scratcher NFTs sent to usernames and wallet destinations
              </p>
            </div>
            <span className="text-xs text-slate-400 font-bold">
              Total Records: {data?.allocations.length || 0}
            </span>
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
                  <th className="py-3 px-4">Claimed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {(data?.allocations || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No scratcher NFTs dispatched yet.
                    </td>
                  </tr>
                ) : (
                  data?.allocations.map((alloc) => (
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

      {/* TAB 5: User Claim Logs */}
      {activeTab === 'claims' && (
        <div className="p-6 rounded-3xl bg-[#080E1C] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400 w-5 h-5" />
                USER CLAIM AUDIT LOG
              </h3>
              <p className="text-xs text-slate-400">
                Verification receipts of users claiming their allocated NFT scratchers to their wallet
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
                  <th className="py-3 px-4">Telegram Username</th>
                  <th className="py-3 px-4">Recipient Wallet</th>
                  <th className="py-3 px-4 text-center">Amount Claimed</th>
                  <th className="py-3 px-4">Claim Tx Hash</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {(data?.claims || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No claims recorded yet. Receipts will appear here when users claim their scratchers.
                    </td>
                  </tr>
                ) : (
                  data?.claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-[#0C1426]/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {claim.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                        {claim.telegramUsername}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {claim.walletAddress.slice(0, 8)}...{claim.walletAddress.slice(-6)}
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

      {/* Quick Send Single User Modal */}
      {showQuickSendModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#091122] border border-cyan-500/30 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="text-[#00E5FF]" />
                <h3 className="text-lg font-black text-white">SEND SCRATCHER NFT</h3>
              </div>
              <button
                onClick={() => setShowQuickSendModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Send Verse Scratcher NFTs from your Admin Vault to a Telegram username. The scratchers will be instantly ready for them to claim to their wallet on the Home Page.
            </p>

            <form onSubmit={handleQuickSend} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Telegram Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="@recipient_username"
                  value={quickSendUsername}
                  onChange={(e) => setQuickSendUsername(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#040813] border border-slate-800 text-xs text-white font-mono focus:border-[#00E5FF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    NFT Tier
                  </label>
                  <select
                    value={quickSendTier}
                    onChange={(e) => setQuickSendTier(e.target.value as ScratcherTierType)}
                    className="w-full p-3 rounded-xl bg-[#040813] border border-slate-800 text-xs text-white focus:border-[#00E5FF] focus:outline-none"
                  >
                    <option value="grand">Grand 8M VERSE</option>
                    <option value="mega">Mega 1M VERSE</option>
                    <option value="lucky">Lucky 250k VERSE</option>
                    <option value="mini">Mini 50k VERSE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quickSendAmount}
                    onChange={(e) => setQuickSendAmount(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-3 rounded-xl bg-[#040813] border border-slate-800 text-xs text-white font-mono focus:border-[#00E5FF] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !quickSendUsername}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#0099FF] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Sending NFT...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send {quickSendAmount} NFT(s) to {quickSendUsername || 'Recipient'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Replenish Vault Modal */}
      {showReplenishModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#091122] border border-cyan-500/30 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackagePlus className="text-[#00E5FF]" />
                <h3 className="text-lg font-black text-white">MINT VAULT NFTS</h3>
              </div>
              <button
                onClick={() => setShowReplenishModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Mint additional Verse Scratcher NFTs to your Admin Vault inventory.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Amount to Mint
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[500, 1000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setReplenishAmount(amt)}
                      className={`py-2 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                        replenishAmount === amt
                          ? 'border-[#00E5FF] bg-cyan-950/40 text-[#00E5FF]'
                          : 'border-slate-800 bg-[#040813] text-slate-400'
                      }`}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Tier Type
                </label>
                <select
                  value={replenishTier}
                  onChange={(e) => setReplenishTier(e.target.value as ScratcherTierType)}
                  className="w-full p-3 rounded-xl bg-[#040813] border border-slate-800 text-xs text-white focus:border-[#00E5FF] focus:outline-none"
                >
                  <option value="grand">Grand 8M VERSE</option>
                  <option value="mega">Mega 1M VERSE</option>
                  <option value="lucky">Lucky 250k VERSE</option>
                  <option value="mini">Mini 50k VERSE</option>
                </select>
              </div>

              <button
                type="button"
                disabled={isReplenishing}
                onClick={handleReplenishVault}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#0099FF] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 cursor-pointer"
              >
                {isReplenishing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Minting to Vault...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle size={16} />
                    <span>Confirm Mint {replenishAmount} NFTs</span>
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
