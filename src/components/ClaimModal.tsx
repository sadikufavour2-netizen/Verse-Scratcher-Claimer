import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { X, CheckCircle2, ExternalLink, RefreshCw, Sparkles, Gift } from 'lucide-react';
import { ScratcherTicket, WalletAccount } from '../types';
import { PolygonBadge, VerseLogo } from './VerseBrand';

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

  const handleExecuteClaim = async () => {
    setClaimStatus('claiming');
    setErrorMessage('');

    try {
      // Simulate real-time Polygon smart contract claim transaction
      await new Promise((resolve) => setTimeout(resolve, 1600));

      // Generate realistic Polygon tx hash
      const randomBytes = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join('');
      const generatedTx = `0x${randomBytes}`;
      setTxHash(generatedTx);
      setClaimStatus('success');

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00E5FF', '#8247E5', '#00FF88', '#FFD700'],
        });
      } catch (e) {}

      const ids = ticketsToClaim.map((t) => t.id);
      onClaimSuccess(ids, generatedTx);
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-md bg-[#0A0F1D] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <VerseLogo size={28} />
            </div>
            {claimStatus !== 'claiming' && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {claimStatus === 'success' ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-bold text-white">Prize Claimed Successfully!</h3>
              <p className="text-sm text-slate-300">
                Tokens have been transferred to your connected Polygon address:
              </p>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-left space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Recipient:</span>
                  <span className="font-mono text-slate-200">{account.address.slice(0, 10)}...{account.address.slice(-6)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>VERSE Awarded:</span>
                  <span className="font-bold text-[#00E5FF]">+{totalVerse.toLocaleString()} VERSE</span>
                </div>
                {totalMatic > 0 && (
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>POLYGON (POL):</span>
                    <span className="font-bold text-purple-300">+{totalMatic} MATIC</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
                  <span>Network:</span>
                  <span className="font-mono text-purple-300">Polygon Mainnet (137)</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <a
                  href={`https://polygonscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-[#00E5FF] hover:underline font-semibold"
                >
                  View on PolygonScan <ExternalLink size={12} />
                </a>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-bold rounded-xl transition-all shadow-lg active:scale-95"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isBatch ? `Claim All (${ticketsToClaim.length} Tickets)` : 'Claim Scratcher Reward'}
                  </h3>
                  <p className="text-xs text-slate-400">Polygon Smart Contract Settlement</p>
                </div>
                <PolygonBadge size="sm" />
              </div>

              {/* Prize Summary Box */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#0D162B] to-[#122244] border border-[#00E5FF]/30 space-y-2">
                <span className="text-[11px] uppercase font-bold text-[#00E5FF] tracking-wider block">
                  Reward to Deposit
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">
                    {totalVerse.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-[#00E5FF]">VERSE</span>
                </div>
                {totalMatic > 0 && (
                  <div className="text-xs font-semibold text-purple-300">
                    + {totalMatic} MATIC / POL Bonus
                  </div>
                )}
              </div>

              {/* Contract specs */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Connected Wallet:</span>
                  <span className="font-mono text-slate-200">{account.address.slice(0, 8)}...{account.address.slice(-6)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Polygon Gas Fee:</span>
                  <span className="font-mono text-emerald-400">&lt; 0.005 MATIC (~$0.003)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Contract:</span>
                  <span className="font-mono text-slate-400">0xVerseScratcher...Claimer</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300">
                  {errorMessage}
                </div>
              )}

              <button
                disabled={claimStatus === 'claiming' || ticketsToClaim.length === 0}
                onClick={handleExecuteClaim}
                className="w-full py-3.5 bg-gradient-to-r from-[#00E5FF] to-[#00FF88] hover:from-[#00cce6] hover:to-[#00e67a] disabled:opacity-50 text-black font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {claimStatus === 'claiming' ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>CONFIRMING ON POLYGON...</span>
                  </>
                ) : (
                  <>
                    <Gift size={18} />
                    <span>CLAIM {totalVerse.toLocaleString()} VERSE</span>
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
