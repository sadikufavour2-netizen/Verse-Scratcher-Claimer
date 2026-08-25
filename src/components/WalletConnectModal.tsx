import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, AlertCircle, RefreshCw, Sparkles, ArrowRight } from 'lucide-react';
import { WalletAccount } from '../types';
import { connectViaWalletConnect, getWalletConnectProjectId } from '../services/walletService';
import { VerseCoinLogo } from './VerseBrand';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (account: WalletAccount) => void;
  onError: (errorMessage: string) => void;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const projectId = getWalletConnectProjectId();

  const handleWalletConnectClick = async () => {
    setIsConnecting(true);
    setModalError(null);

    try {
      const res = await connectViaWalletConnect();
      if (res.success && res.account) {
        onSuccess(res.account);
        onClose();
      } else {
        setModalError(res.error || 'Wallet connection was closed or rejected.');
        onError(res.error || 'WALLET CONNECTION FAILED');
      }
    } catch (err: any) {
      console.error('WalletConnect trigger error:', err);
      setModalError(err?.message || 'Unable to connect wallet.');
      onError('WALLET CONNECTION FAILED');
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isConnecting ? undefined : onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Box styled with 3D Verse Logo Theme */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          id="wallet-connect-modal"
          className="relative w-full max-w-md bg-[#080C1A] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,229,255,0.2)] z-10 overflow-hidden"
        >
          {/* Top Metallic Rainbow Gradient Stripe matching Verse Coin Rim */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] via-[#9333EA] to-[#FF00A0]" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <VerseCoinLogo size={36} glow={true} />
              <div>
                <h3 className="text-lg font-black text-white tracking-wide">CONNECT WALLET</h3>
                <p className="text-xs text-slate-400 font-medium">Verse on Polygon</p>
              </div>
            </div>
            {!isConnecting && (
              <button
                id="close-wallet-modal"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Error Banner */}
          {modalError && (
            <div
              id="modal-error-banner"
              className="mb-5 p-3.5 bg-red-950/50 border border-red-500/40 rounded-2xl flex items-start gap-2.5 text-red-200 text-xs"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <div>
                <span className="font-bold text-red-300 block uppercase">Connection Issue</span>
                <p className="mt-0.5">{modalError}</p>
              </div>
            </div>
          )}

          {/* Exclusive WalletConnect Button */}
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed text-center sm:text-left">
              Connect with your preferred Web3 wallet to reveal your Verse Scratcher NFTs and claim rewards directly on Polygon.
            </p>

            <button
              id="wallet-option-walletconnect"
              disabled={isConnecting}
              onClick={handleWalletConnectClick}
              className="w-full py-4.5 px-6 rounded-2xl bg-gradient-to-r from-[#00E5FF] via-[#2563EB] to-[#9333EA] hover:from-[#00cce6] hover:to-[#7e22ce] text-white font-extrabold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-between transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                  <Smartphone size={22} />
                </div>
                <div className="text-left">
                  <span className="text-white font-black text-base block leading-tight">
                    WALLETCONNECT
                  </span>
                  <span className="text-[11px] text-cyan-100 font-medium">
                    Bitcoin.com, MetaMask, Trust &amp; Mobile
                  </span>
                </div>
              </div>

              {isConnecting ? (
                <div className="flex items-center gap-2 text-xs font-bold text-white bg-black/30 px-3 py-1.5 rounded-xl">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>OPENING...</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <ArrowRight size={18} />
                </div>
              )}
            </button>
          </div>

          {/* Supported Wallets Pills */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Sparkles size={13} className="text-[#00E5FF]" />
              Web3 Ready on Polygon
            </span>
            <span className="font-mono text-purple-300 font-semibold">Project ID Configured</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
