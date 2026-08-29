import React, { useState, useEffect } from 'react';
import {
  Shield,
  Layers,
  CheckCircle2,
  Clock,
  Coins,
  Send,
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
  Users,
  Copy,
} from 'lucide-react';
import {
  AdminOverviewResponse,
  RegisteredUser,
  ScratcherTierType,
  WalletAccount,
  ScratcherTicket,
} from '../types';
import {
  getAdminStatsApi,
  getAdminUsersApi,
  batchAllocateApi,
  setAdminWalletApi,
} from '../services/apiService';
import {
  fetchRealScratchersForAddress,
  fetchRealBalances,
  formatBalanceDisplay,
  connectViaWalletConnect,
  savePersistedWallet,
  getPersistedWallet,
  clearPersistedWallet,
  disconnectWallet,
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

  const [statsData, setStatsData] = useState<{
    inventory: any;
    allocations: any[];
    claims: any[];
    adminWallet: string | null;
  } | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Dedicated Users Directory State (Completely Independent)
  const [usersList, setUsersList] = useState<RegisteredUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [adminOnChainNfts, setAdminOnChainNfts] = useState<ScratcherTicket[]>([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

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
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Search in records
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'nfts' | 'batch' | 'records' | 'claims'>('users');

  const copyToClipboard = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAddress(id);
      setTimeout(() => setCopiedAddress(null), 2000);
    }
  };

  // Direct Database Query for Registered Telegram & Wallet Users
  const fetchUsersDirectory = async (showLoading = true) => {
    if (showLoading) setIsLoadingUsers(true);
    setIsRefreshingUsers(true);
    try {
      const res = await getAdminUsersApi();
      console.log(`[Admin Users Directory] Direct API fetched ${res.users.length} production users:`, res.users);
      setUsersList(res.users || []);
      setUsersError(null);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to query users database';
      console.error('[Admin Users Directory Error] Failed to load users:', err);
      setUsersError(errMsg);
    } finally {
      setIsLoadingUsers(false);
      setIsRefreshingUsers(false);
    }
  };

  const fetchStats = async (showLoading = true) => {
    if (showLoading) setIsLoadingStats(true);
    setIsRefreshingStats(true);
    try {
      const res = await getAdminStatsApi();
      setStatsData({
        inventory: res.inventory,
        allocations: res.allocations,
        claims: res.claims,
        adminWallet: res.adminWallet,
      });
      setStatsError(null);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to load admin stats';
      console.error('[Admin Stats Error]:', err);
      setStatsError(errMsg);
    } finally {
      setIsLoadingStats(false);
      setIsRefreshingStats(false);
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

  // Auto-restore admin connected wallet on page load / refresh
  useEffect(() => {
    const persistedAdmin = getPersistedWallet('admin');
    if (persistedAdmin && persistedAdmin.address) {
      setAdminAccount(persistedAdmin);
      setAdminWalletApi(persistedAdmin.address).catch(console.error);
      fetchAdminWalletData(persistedAdmin.address);
    }
  }, []);

  useEffect(() => {
    fetchUsersDirectory(true);
    fetchStats(true);
    const interval = setInterval(() => {
      fetchUsersDirectory(false);
      fetchStats(false);
    }, 6000);
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

  // Connect Admin Wallet Handler - directly launches official WalletConnect modal
  const handleConnectAdminWallet = async () => {
    setAdminConnectError(null);
    setIsConnectingAdminWallet(true);
    try {
      const res = await connectViaWalletConnect();
      if (res.success && res.account) {
        await handleConnectAdminSuccess(res.account);
      } else {
        if (res.error && !res.error.toLowerCase().includes('user rejected') && !res.error.toLowerCase().includes('closed')) {
          setAdminConnectError(res.error);
        }
      }
    } catch (err: any) {
      if (err?.message && !err.message.toLowerCase().includes('user rejected') && !err.message.toLowerCase().includes('closed')) {
        setAdminConnectError(err.message || 'Failed to connect admin wallet');
      }
    } finally {
      setIsConnectingAdminWallet(false);
    }
  };

  // Called when admin successfully selects and connects their Web3 wallet
  const handleConnectAdminSuccess = async (connectedAccount: WalletAccount) => {
    setAdminAccount(connectedAccount);
    savePersistedWallet('admin', connectedAccount);
    setAdminConnectError(null);
    try {
      await setAdminWalletApi(connectedAccount.address);
      fetchAdminWalletData(connectedAccount.address);
      if (onNotify) {
        onNotify(
          'Admin Wallet Connected',
          `Admin connected with address ${connectedAccount.address.slice(0, 6)}...${connectedAccount.address.slice(-4)}`
        );
      }
    } catch (err: any) {
      console.warn('Error syncing admin address:', err);
    }
  };

  const handleDisconnectAdminWallet = async () => {
    await disconnectWallet('admin');
    clearPersistedWallet('admin');
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
    setIsSubmitting(true);
    setAllocationErrorMsg(null);
    setAllocationSuccessMsg(null);

    try {
      const payload = parsedItems.map((item) => ({
        username: item.username,
        amount: item.amount,
        tier: selectedTier,
      }));

      const adminAddr = adminAccount?.address || '0x6e24A98eaAEfa0Ec8A7147b4eCDE14eB78772D1E';

      const res = await batchAllocateApi(
        payload,
        selectedTier,
        adminAddr
      );

      setAllocationSuccessMsg(res.message);
      if (onNotify) {
        onNotify('NFT Scratchers Dispatched', res.message);
      }
      setRawInput('');
      fetchStats(false);
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

    setModalError(null);
    setModalSuccess(null);
    setIsSubmitting(true);

    const adminAddr = adminAccount?.address || '0x6e24A98eaAEfa0Ec8A7147b4eCDE14eB78772D1E';

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
          adminAddr
        );

        setModalSuccess(`Successfully sent ${count} ${selectedNftForSend.title} to ${cleaned}!`);
        if (onNotify) {
          onNotify('NFT Scratcher Sent', `Sent ${count} ${selectedNftForSend.title} to ${cleaned}`);
        }
        setSingleUsername('');
        fetchStats(false);
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
          adminAddr
        );

        setModalSuccess(res.message);
        if (onNotify) {
          onNotify('NFT Scratchers Sent', res.message);
        }
        setModalBatchInput('');
        fetchStats(false);
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

  const availableInVault = statsData?.inventory
    ? Math.max(0, statsData.inventory.totalInVault - statsData.inventory.allocatedCount - statsData.inventory.claimedCount)
    : 0;

  // Filter records by Telegram username
  const filteredAllocations = (statsData?.allocations || []).filter((alloc) =>
    alloc.telegramUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClaims = (statsData?.claims || []).filter((claim) =>
    claim.telegramUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalNftsAvailable = (statsData?.inventory?.totalInVault || 0) + adminOnChainNfts.length;

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
                fetchStats(true);
                fetchUsersDirectory(true);
                if (adminAccount?.address) fetchAdminWalletData(adminAccount.address);
              }}
              disabled={isRefreshingStats}
              className="p-2.5 rounded-2xl bg-[#0E172A] hover:bg-[#14203B] border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Refresh Admin Overview"
            >
              <RefreshCw size={16} className={isRefreshingStats ? 'animate-spin text-[#00E5FF]' : ''} />
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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleConnectAdminWallet}
                  title="Switch to another Web3 wallet"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold transition-all cursor-pointer hover:text-white"
                >
                  Switch
                </button>
                <button
                  onClick={handleDisconnectAdminWallet}
                  title="Disconnect Admin Wallet"
                  className="px-2.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 border border-red-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <LogOut size={12} />
                  <span>Disconnect</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectAdminWallet}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#0099FF] hover:brightness-110 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Wallet size={13} />
                <span>Connect Wallet</span>
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

      {/* Scratcher Inventory Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            {(statsData?.inventory?.allocatedCount || 0).toLocaleString()}
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
            {(statsData?.inventory?.claimedCount || 0).toLocaleString()}
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
            {(statsData?.allocations || []).length}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Dispatched Records</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#00E5FF] text-black shadow-lg shadow-cyan-500/20'
              : 'bg-[#0E172A] text-slate-300 hover:text-white hover:bg-[#14203B]'
          }`}
        >
          <Users size={14} />
          Connected Users &amp; Wallets ({usersList.length})
        </button>

        <button
          onClick={() => setActiveTab('nfts')}
          className={`px-4 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'nfts'
              ? 'bg-[#00E5FF] text-black shadow-lg shadow-cyan-500/20'
              : 'bg-[#0E172A] text-slate-300 hover:text-white hover:bg-[#14203B]'
          }`}
        >
          <Sparkles size={14} />
          Admin NFTs &amp; Dispatch
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
          Dispatched Records ({(statsData?.allocations || []).length})
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
          Claim Logs ({(statsData?.claims || []).length})
        </button>
      </div>

      {/* TAB 0: Connected Users & Wallets */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Explicit Database Query Error Banner if users fetch fails */}
          {usersError && (
            <div className="p-4 rounded-2xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-red-950/50">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <div className="font-bold text-red-200">Database Connection Error</div>
                  <div className="text-red-300/90 font-mono text-[11px]">Failed to load users: {usersError}</div>
                </div>
              </div>
              <button
                onClick={() => fetchUsersDirectory(true)}
                className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition-all"
              >
                <RefreshCw size={13} />
                <span>Retry Database Query</span>
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#080E1C] border border-slate-800">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Users className="text-[#00E5FF] w-5 h-5" />
                CONNECTED USERS &amp; WALLET DIRECTORY
              </h3>
              <p className="text-xs text-slate-400">
                Live list of users who entered their Telegram handle and connected their Polygon wallet address.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search username / wallet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-[#050A14] border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5FF] transition-all w-52"
                />
              </div>

              <button
                onClick={() => fetchUsersDirectory(true)}
                disabled={isRefreshingUsers}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <RefreshCw size={13} className={isRefreshingUsers ? 'animate-spin text-[#00E5FF]' : ''} />
                <span>Refresh</span>
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF] text-xs font-bold font-mono">
                {usersList.length} Registered Users
              </span>
            </div>
          </div>

          {(() => {
            const allUsers = usersList;
            const filteredUsers = allUsers.filter((u) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase().trim();
              return (
                (u.telegramUsername && u.telegramUsername.toLowerCase().includes(q)) ||
                (u.walletAddress && u.walletAddress.toLowerCase().includes(q))
              );
            });

            if (allUsers.length === 0) {
              return (
                <div className="p-12 text-center rounded-3xl bg-[#080E1C] border border-slate-800 space-y-3">
                  <Users size={48} className="mx-auto text-slate-600" />
                  <h4 className="text-lg font-black text-white">No Users Connected Yet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    When users write their Telegram username and connect their Polygon wallet on the site, their details will automatically appear here.
                  </p>
                </div>
              );
            }

            if (filteredUsers.length === 0) {
              return (
                <div className="p-8 text-center rounded-2xl bg-[#080E1C] border border-slate-800 space-y-2">
                  <Search size={32} className="mx-auto text-slate-600" />
                  <p className="text-xs text-slate-400">No users match &ldquo;{searchQuery}&rdquo;</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-cyan-400 font-bold hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              );
            }

            return (
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#080E1C]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0D1527] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-4">Telegram Username</th>
                        <th className="p-4">Connected Wallet Address</th>
                        <th className="p-4">Scratchers Status</th>
                        <th className="p-4">Total Claimed</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredUsers.map((u) => {
                        const hasPending = (u.pendingClaim || 0) > 0;
                        return (
                          <tr key={u.id || u.walletAddress || u.telegramUsername} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 font-sans font-black text-white">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF] text-xs font-bold">
                                  {u.telegramUsername || '@unlinked'}
                                </span>
                                {u.walletAddress && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Connected to Wallet" />
                                )}
                              </div>
                            </td>

                            <td className="p-4">
                              {u.walletAddress ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-300 font-mono text-xs">
                                    {u.walletAddress.slice(0, 8)}...{u.walletAddress.slice(-6)}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(u.walletAddress, u.id)}
                                    title="Copy address"
                                    className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                  >
                                    <Copy size={13} />
                                  </button>
                                  {copiedAddress === u.id && (
                                    <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>
                                  )}
                                  <a
                                    href={`https://polygonscan.com/address/${u.walletAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="View on Polygonscan"
                                    className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-[#00E5FF] transition-colors"
                                  >
                                    <ExternalLink size={13} />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[11px] font-sans">No wallet connected yet</span>
                              )}
                            </td>

                            <td className="p-4 font-sans">
                              {hasPending ? (
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold inline-flex items-center gap-1">
                                  <Sparkles size={11} />
                                  {u.pendingClaim} Waiting Claim
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[11px] font-medium">
                                  0 Pending
                                </span>
                              )}
                            </td>

                            <td className="p-4 font-sans">
                              <span className="text-emerald-400 font-bold text-xs">
                                {u.totalClaimed || 0} NFTs Claimed
                              </span>
                            </td>

                            <td className="p-4 text-right font-sans">
                              <button
                                onClick={() => {
                                  setSelectedNftForSend({
                                    tier: 'grand',
                                    title: 'Gold Grand Verse Scratcher',
                                    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
                                    maxPrize: '8,000,000 VERSE',
                                    available: 99999,
                                  });
                                  setSingleUsername(u.telegramUsername || '');
                                  setSingleAmount(1);
                                  setModalBatchInput('');
                                  setModalError(null);
                                  setModalSuccess(null);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm shadow-cyan-500/20 cursor-pointer hover:scale-105 transition-all"
                              >
                                <Send size={12} />
                                <span>Send NFT</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 1: Admin NFTs & Interactive Dispatch */}
      {activeTab === 'nfts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#080E1C] border border-slate-800">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Sparkles className="text-amber-400 w-5 h-5" />
                ADMIN VERSE SCRATCHER NFTS
              </h3>
              <p className="text-xs text-slate-400">
                Live on-chain Verse Scratcher NFTs discovered in the connected admin address. Touch any NFT to send to Telegram.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF] text-xs font-bold font-mono">
                Polygon Mainnet
              </span>
            </div>
          </div>

          {/* Condition 1: Admin Not Connected */}
          {!adminAccount ? (
            <div className="p-12 text-center rounded-3xl bg-[#080E1C] border border-slate-800 space-y-4">
              <Wallet size={48} className="mx-auto text-cyan-400 opacity-60" />
              <h4 className="text-xl font-black text-white tracking-tight">Connect Admin Wallet</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Connect your Polygon admin wallet to view real on-chain scratcher NFTs and dispatch them to Telegram users.
              </p>
              <button
                onClick={handleConnectAdminWallet}
                className="px-7 py-3 rounded-2xl bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Connect Admin Wallet
              </button>
            </div>
          ) : isLoadingNfts ? (
            /* Condition 2: Scanning on-chain */
            <div className="p-12 text-center rounded-3xl bg-[#080E1C] border border-slate-800 space-y-4">
              <RefreshCw size={36} className="mx-auto text-[#00E5FF] animate-spin" />
              <h4 className="text-lg font-black text-white">Scanning Polygon Blockchain...</h4>
              <p className="text-xs text-slate-400 font-mono">
                Checking for on-chain Verse Scratcher NFTs in {adminAccount.address}
              </p>
            </div>
          ) : adminOnChainNfts.length === 0 ? (
            /* Condition 3: No real NFTs found in address */
            <div className="p-12 text-center rounded-3xl bg-[#080E1C] border border-slate-800 space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Sparkles size={28} />
              </div>
              <h4 className="text-xl font-black text-white tracking-tight uppercase">
                No NFT found in this address
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                No Verse Scratcher NFTs were detected in wallet address{' '}
                <span className="font-mono text-cyan-300 font-semibold break-all">{adminAccount.address}</span>{' '}
                on Polygon Mainnet.
              </p>
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => fetchAdminWalletData(adminAccount.address)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={13} className={isLoadingNfts ? 'animate-spin' : ''} />
                  <span>Rescan Blockchain</span>
                </button>
              </div>
            </div>
          ) : (
            /* Condition 4: Real NFTs found in admin wallet */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <Sparkles size={16} />
                  REAL ON-CHAIN SCRATCHER NFTS ({adminOnChainNfts.length})
                </h4>
                <button
                  type="button"
                  onClick={() => fetchAdminWalletData(adminAccount.address)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} className={isLoadingNfts ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {adminOnChainNfts.map((nft) => (
                  <div
                    key={nft.id}
                    onClick={() => {
                      setSelectedNftForSend({
                        tier: 'grand',
                        title: nft.title || `Verse Scratcher #${nft.tokenId}`,
                        image: nft.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
                        maxPrize: `${nft.totalVerseValue.toLocaleString()} VERSE`,
                        available: 1,
                      });
                      setSingleUsername('');
                      setSingleAmount(1);
                      setModalBatchInput('');
                      setModalError(null);
                      setModalSuccess(null);
                    }}
                    className="p-5 rounded-3xl bg-gradient-to-b from-cyan-500/10 to-blue-600/5 bg-[#080E1C] border border-cyan-500/30 flex flex-col justify-between space-y-4 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer shadow-lg"
                  >
                    {/* NFT Image Preview */}
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-[#040813] border border-slate-700">
                      <img
                        src={nft.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'}
                        alt={nft.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                      {/* Top Token ID Badge */}
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-black/70 text-amber-300 border-amber-400/40 font-mono">
                          TOKEN #{nft.tokenId}
                        </span>
                      </div>

                      {/* Prize Value Overlay */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-300">Prize Pool:</span>
                        <span className="font-mono text-xs font-black text-amber-300 drop-shadow">
                          {nft.totalVerseValue.toLocaleString()} VERSE
                        </span>
                      </div>
                    </div>

                    {/* NFT Details */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white group-hover:text-[#00E5FF] transition-colors line-clamp-1">
                        {nft.title || `Verse Scratcher #${nft.tokenId}`}
                      </h4>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 text-[11px]">Contract:</span>
                        <span className="text-cyan-300 text-[11px]">
                          {nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNftForSend({
                          tier: 'grand',
                          title: nft.title || `Verse Scratcher #${nft.tokenId}`,
                          image: nft.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
                          maxPrize: `${nft.totalVerseValue.toLocaleString()} VERSE`,
                          available: 1,
                        });
                        setSingleUsername('');
                        setSingleAmount(1);
                        setModalBatchInput('');
                        setModalError(null);
                        setModalSuccess(null);
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer group-hover:shadow-cyan-500/40 transition-all"
                    >
                      <Send size={13} />
                      <span>Send to User</span>
                    </button>
                  </div>
                ))}
              </div>
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
              Total Claims: {statsData?.claims.length || 0}
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
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        Recipient Telegram Username
                      </label>
                      {(() => {
                        const cleanHandle = singleUsername.trim().toLowerCase();
                        const matchedUser = usersList.find(
                          (u) =>
                            u.telegramUsername &&
                            u.telegramUsername.toLowerCase().replace(/^@/, '') === cleanHandle.replace(/^@/, '')
                        );
                        if (matchedUser?.walletAddress) {
                          return (
                            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Wallet: {matchedUser.walletAddress.slice(0, 6)}...{matchedUser.walletAddress.slice(-4)}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
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
    </div>
  );
};
