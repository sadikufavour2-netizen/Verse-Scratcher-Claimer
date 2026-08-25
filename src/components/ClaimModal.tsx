import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { X, CheckCircle2, ExternalLink, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { ScratcherTicket, WalletAccount } from '../types';
import { PolygonBadge, VerseCoinLogo } from './VerseBrand';
import { executeOnChainClaim } from '../services/walletService';

interface ClaimModalProps {
  ticket: ScratcherTicket | null;
  allTickets?: ScratcherTicket[];
  isBatch?: boolean;
  account: WalletAccount;
  isOpen: boolean;
  onClose: () => void;
  onClaimSuccess: (claimedTicketIds: string[], txHash: string) => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({
  ticket,
  allTickets = [],
  isBatch = false,
  account,
  isOpen,
  onClose,
  onClaimSuccess,
}) => {
  const [claimStatus, setClaimStatus] = useState<'idle' | 'claiming' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const ticketsToClaim = isBatch
    ? allTickets.filter((t) => t.status === 'scratched')
    : ticket
    ? [ticket]
    : [];

  const totalVerse = ticketsToClaim.reduce((sum, t) => sum + t.totalVerseValue, 0);
  const totalMatic = ticketsToClaim.reduce((sum, t) => sum + t.totalMaticValue, 0);
  const tokenIds = ticketsToClaim.map((t) => t.tokenId);
  const ticketIds = ticketsToClaim.map((t) => t.id);

  // Check POL gas availability
  const hasPolForGas =
    account.balanceMaticRaw !== undefined ? account.balanceMaticRaw > 0n : parseFloat(account.balanceMatic || '0') > 0.0001;

  const handleExecuteClaim = async () => {
    // Verify POL gas
    if (!hasPolForGas && account.balanceMatic !== 'Loading...') {
      setErrorMessage('INSUFFICIENT POL FOR GAS. Please fund your connected Polygon address with POL to pay for the transaction gas fee.');
      setClaimStatus('error');
      return;
    }

    setClaimStatus('claiming');
    setErrorMessage('');

    try {
      // Prompt real Web3 transaction signature on connected wallet
      const result = await executeOnChainClaim(account, ticketIds, tokenIds, totalVerse);

      if (result.success && result.txHash) {
        setTxHash(result.txHash);
        setClaimStatus('success');

        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00E5FF', '#3B82F6', '#9333EA', '#FF00A0', '#00FF88'],
          });
        } catch (e) {}

        onClaimSuccess(ticketIds, result.txHash);
      }
    } catch (err: any) {
      console.error('Claim transaction failed:', err);
      setClaimStatus('error');
      setErrorMessage(err?.message || 'Transaction was rejected or failed on Polygon.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={claimStatus === 'claiming' ? undefined : onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-md bg-[#080C1A] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,229,255,0.2)] z-10 overflow-hidden"
        >
          {/* Top Metallic Rainbow Gradient Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] via-[#9333EA] to-[#FF00A0]" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <VerseCoinLogo size={32} glow={true} />
              <div>
                <span className="text-sm font-black text-white tracking-wider block">CLAIM VERSE REWARDS</span>
                <span className="text-[11px] text-slate-400">Polygon Network</span>
              </div>
            </div>
            {claimStatus !== 'claiming' && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {claimStatus === 'success' ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-extrabold text-white">Prize Claimed Successfully!</h3>
              <p className="text-xs text-slate-300">
                Transaction confirmed. Tokens transferred to your Polygon address:
              </p>

              <div className="p-4 bg-[#0D1426] rounded-2xl border border-slate-800 text-left space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Recipient Address:</span>
                  <span className="font-mono text-white font-semibold">
                    {account.address.slice(0, 8)}...{account.address.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>VERSE Awarded:</span>
                  <span className="font-bold text-[#00E5FF]">+{totalVerse.toLocaleString()} VERSE</span>
                </div>
                {totalMatic > 0 && (
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>POL Bonus:</span>
                    <span className="font-bold text-purple-300">+{totalMatic} POL</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-400 pt-1.5 border-t border-slate-800">
                  <span>Network:</span>
                  <span className="font-semibold text-purple-300">Polygon Mainnet</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <a
                  href={`https://polygonscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-[#00E5FF] hover:underline font-bold"
                >
                  View Transaction on PolygonScan <ExternalLink size={13} />
                </a>
                <button
                  onClick={onClose}
                  className="w-full py-3.5 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-extrabold text-xs rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  DONE
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {isBatch ? `Claim All (${ticketsToClaim.length} NFTs)` : `Claim Reward (#${ticketsToClaim[0]?.tokenId})`}
                  </h3>
                  <p className="text-xs text-slate-400">Sign transaction with connected wallet</p>
                </div>
                <PolygonBadge size="sm" />
              </div>

              {/* Prize Summary Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0E1A33] to-[#16274D] border border-cyan-500/40 space-y-1.5 shadow-lg">
                <span className="text-[10px] uppercase font-bold text-[#00E5FF] tracking-wider block">
                  Total Claimable Rewards
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {totalVerse.toLocaleString()}
                  </span>
                  <span className="text-sm font-extrabold text-[#00E5FF]">VERSE</span>
                </div>
                {totalMatic > 0 && (
                  <div className="text-xs font-semibold text-purple-300">
                    + {totalMatic} POL Bonus
                  </div>
                )}
              </div>

              {/* Gas & Address Information */}
              <div className="p-3.5 bg-[#0D1426] rounded-2xl border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Connected Wallet:</span>
                  <span className="font-mono text-slate-200">
                    {account.address.slice(0, 8)}...{account.address.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Your POL Gas Balance:</span>
                  <span className={`font-mono font-bold ${!hasPolForGas && account.balanceMatic !== 'Loading...' ? 'text-red-400' : 'text-purple-300'}`}>
                    {account.balanceMatic || '0.0000'} POL
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Action:</span>
                  <span className="font-medium text-slate-300">Polygon Contract Call</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-red-950/60 border border-red-500/50 rounded-2xl text-xs text-red-200 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                  <span className="font-medium leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <button
                disabled={claimStatus === 'claiming' || ticketsToClaim.length === 0}
                onClick={handleExecuteClaim}
                className="w-full py-4 bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] to-[#9333EA] hover:from-[#00cce6] hover:to-[#7e22ce] disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer"
              >
                {claimStatus === 'claiming' ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>PLEASE SIGN IN YOUR WALLET...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>SIGN &amp; CLAIM {totalVerse.toLocaleString()} VERSE</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-400">
                You will sign this claim transaction in your connected wallet on Polygon.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
