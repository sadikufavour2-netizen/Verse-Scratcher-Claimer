import React, { useState } from 'react';
import {
  Gift,
  Sparkles,
  CheckCircle2,
  Clock,
  Coins,
  ShieldCheck,
  RefreshCw,
  Trophy,
  ArrowRight,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AllocationRecord, ScratcherTicket, UserProfileResponse, WalletAccount } from '../types';
import { claimUserScratchersApi } from '../services/apiService';
import { VerseCoinLogo } from './VerseBrand';

interface ApprovedClaimBannerProps {
  account: WalletAccount | null;
  profile: UserProfileResponse | null;
  onScratchersClaimed: (newTickets: ScratcherTicket[]) => void;
  onNotify?: (title: string, message: string, verseAmount?: number) => void;
  onRefreshProfile: () => void;
}

export const ApprovedClaimBanner: React.FC<ApprovedClaimBannerProps> = ({
  account,
  profile,
  onScratchersClaimed,
  onNotify,
  onRefreshProfile,
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccessData, setClaimSuccessData] = useState<{
    claimedAmount: number;
    txHash: string;
  } | null>(null);

  const pendingAllocations = (profile?.allocations || []).filter((a) => a.status === 'APPROVED');
  const totalPendingScratchers = pendingAllocations.reduce((sum, a) => sum + a.amount, 0);

  const handleClaimApprovedScratchers = async () => {
    const telegramUsername = profile?.user?.telegramUsername || localStorage.getItem('verse_telegram_username');
    const walletAddress = account?.address || profile?.user?.walletAddress;

    if (!telegramUsername || !walletAddress) {
      alert('Please ensure both Telegram username and wallet address are connected');
      return;
    }

    setIsClaiming(true);
    try {
      const res = await claimUserScratchersApi(telegramUsername, walletAddress);

      // Trigger Confetti Celebration
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00E5FF', '#3B82F6', '#FFD700', '#9333EA'],
      });

      setClaimSuccessData({
        claimedAmount: res.claimedAmount,
        txHash: res.txHash,
      });

      if (onNotify) {
        onNotify(
          'Scratchers Claimed Successfully!',
          `Claimed ${res.claimedAmount} Verse Scratchers! They are now ready to scratch in your deck below.`,
          8000000
        );
      }

      onScratchersClaimed(res.allUserTickets || res.tickets);
      onRefreshProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to claim approved scratchers');
    } finally {
      setIsClaiming(false);
    }
  };

  // 1. STATE: User has approved scratchers waiting to be claimed
  if (totalPendingScratchers > 0) {
    return (
      <div
        id="approved-scratchers-banner"
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0E1E38] via-[#09152A] to-[#081020] border-2 border-[#00E5FF] shadow-[0_0_40px_rgba(0,229,255,0.25)] relative overflow-hidden space-y-6"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#00E5FF] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <Sparkles size={13} />
                APPROVED BY ADMIN
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 font-black text-xs uppercase tracking-wider border border-emerald-400/30">
                READY TO CLAIM
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-2">
              <span>🎉 YOU HAVE</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] via-cyan-300 to-amber-300">
                {totalPendingScratchers} APPROVED SCRATCHER{totalPendingScratchers > 1 ? 'S' : ''}!
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              The admin has approved scratchers for your Telegram handle <strong className="text-cyan-300 font-mono">{profile?.user?.telegramUsername}</strong>. Click the button below to claim them into your active playable deck and win up to <strong className="text-amber-300">8,000,000 VERSE</strong>!
            </p>
          </div>

          {/* Action Claim Button */}
          <div className="relative z-10 shrink-0 flex flex-col items-center md:items-end gap-2">
            <button
              id="claim-my-scratchers-btn"
              onClick={handleClaimApprovedScratchers}
              disabled={isClaiming}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#00E5FF] via-[#00cce6] to-[#0099FF] text-black font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isClaiming ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Transferring Scratchers...</span>
                </>
              ) : (
                <>
                  <Gift size={20} />
                  <span>CLAIM MY {totalPendingScratchers} SCRATCHERS</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400 font-medium">
              Instant deduction from Admin Vault to your address
            </span>
          </div>
        </div>

        {/* Allocation breakdown pills */}
        <div className="relative z-10 pt-4 border-t border-cyan-500/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {pendingAllocations.map((alloc) => (
            <div
              key={alloc.id}
              className="p-3 rounded-2xl bg-[#060D1A] border border-cyan-500/30 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <VerseCoinLogo size={20} />
                <div>
                  <span className="font-bold text-white uppercase block">{alloc.tier} Tier</span>
                  <span className="text-[10px] text-slate-400">Up to 8,000,000 VERSE</span>
                </div>
              </div>
              <span className="font-black text-[#00E5FF] text-sm">+{alloc.amount} Scratchers</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. STATE: User just claimed successfully
  if (claimSuccessData) {
    return (
      <div className="p-6 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
          <div>
            <h3 className="text-base font-black text-white">
              Successfully Claimed {claimSuccessData.claimedAmount} Verse Scratchers!
            </h3>
            <p className="text-xs text-emerald-200">
              Your scratchers have been transferred from the Admin Vault to your wallet. Scroll down to scratch and reveal prizes!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. STATE: User registered but waiting for admin allocation
  if (profile?.user?.telegramUsername) {
    return (
      <div className="p-5 rounded-3xl bg-[#080E1C] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Clock size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-white">
                Waiting for Admin Allocation
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                Status: Stored
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Connected as <span className="font-mono text-cyan-300 font-bold">{profile.user.telegramUsername}</span>. When the admin pastes your username and approves scratchers, they will show up here to claim.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshProfile}
          className="px-4 py-2 rounded-xl bg-[#0D1426] hover:bg-[#14203B] border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={12} />
          <span>Check for Approval</span>
        </button>
      </div>
    );
  }

  return null;
};
