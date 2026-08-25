import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, Globe, ShieldCheck, AlertCircle, RefreshCw, Sparkles, KeyRound } from 'lucide-react';
import { WalletAccount, WalletType } from '../types';
import {
  connectViaWalletConnect,
  connectViaInjected,
  connectViaDemo,
  getWalletConnectProjectId,
} from '../services/walletService';
import { VerseLogo, PolygonBadge } from './VerseBrand';

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
  const [connectingType, setConnectingType] = useState<WalletType | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isConfigMissing, setIsConfigMissing] = useState(false);

  const projectId = getWalletConnectProjectId();

  const handleConnect = async (type: WalletType) => {
    setConnectingType(type);
    setModalError(null);
    setIsConfigMissing(false);

    try {
      if (type === 'walletconnect') {
        const res = await connectViaWalletConnect();
        if (res.success && res.account) {
          onSuccess(res.account);
          onClose();
        } else {
          if (res.isConfigurationMissing) {
            setIsConfigMissing(true);
            setModalError('Wallet connection is not configured.');
          } else {
            setModalError(res.error || 'Unable to connect your wallet.');
          }
          onError(res.error || 'WALLET CONNECTION FAILED');
        }
      } else if (type === 'bitcoin_com' || type === 'injected') {
        const res = await connectViaInjected(type);
        if (res.success && res.account) {
          onSuccess(res.account);
          onClose();
        } else {
          setModalError(res.error || 'Unable to connect your browser wallet.');
          onError(res.error || 'WALLET CONNECTION FAILED');
        }
      } else if (type === 'demo') {
        const res = connectViaDemo();
        if (res.success && res.account) {
          onSuccess(res.account);
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Modal connect caught error:', err);
      setModalError(err?.message || 'Unable to connect your wallet.');
      onError('WALLET CONNECTION FAILED');
    } finally {
      setConnectingType(null);
    }
  };

  const handleRetry = () => {
    setModalError(null);
    setIsConfigMissing(false);
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
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          id="wallet-connect-modal"
          className="relative w-full max-w-md bg-[#0A0F1D] border border-slate-700/80 rounded-2xl p-6 shadow-2xl z-10 overflow-hidden"
        >
          {/* Subtle Glow Header */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00E5FF] via-purple-500 to-[#00FF88]" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <VerseLogo size={28} />
            </div>
            <button
              id="close-wallet-modal"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">Connect Wallet</h3>
              <p className="text-xs text-slate-400">Select how you want to connect to Polygon</p>
            </div>
            <PolygonBadge size="sm" />
          </div>

          {/* Error Banner */}
          {modalError && (
            <div
              id="modal-error-banner"
              className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex flex-col gap-2"
            >
              <div className="flex items-start gap-2.5 text-red-300">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
                <div className="text-xs">
                  <span className="font-bold block uppercase tracking-wider text-red-400">
                    {isConfigMissing ? 'CONFIGURATION REQUIRED' : 'WALLET CONNECTION FAILED'}
                  </span>
                  <p className="mt-0.5 text-red-200">{modalError}</p>
                  {isConfigMissing && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Add <code className="text-[#00E5FF] bg-black/40 px-1 py-0.5 rounded font-mono">VITE_WALLETCONNECT_PROJECT_ID</code> to your settings or connect using Browser Wallet / Demo mode below.
                    </p>
                  )}
                </div>
              </div>
              <button
                id="modal-retry-button"
                onClick={handleRetry}
                className="self-end flex items-center gap-1.5 text-xs font-bold text-[#00E5FF] hover:underline pt-1"
              >
                <RefreshCw size={12} />
                TRY AGAIN
              </button>
            </div>
          )}

          {/* Wallet Options */}
          <div className="space-y-2.5">
            {/* 1. Bitcoin.com Wallet (Primary Verse Choice) */}
            <button
              id="wallet-option-bitcoin-com"
              disabled={connectingType !== null}
              onClick={() => handleConnect('bitcoin_com')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-[#0E1B33] to-[#122244] hover:from-[#132549] hover:to-[#172d5c] border border-[#00E5FF]/40 hover:border-[#00E5FF] transition-all group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] group-hover:scale-105 transition-transform">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm">Bitcoin.com Wallet</span>
                    <span className="text-[9px] bg-[#00E5FF]/20 text-[#00E5FF] font-semibold px-1.5 py-0.2 rounded">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Direct connection for Verse ecosystem</p>
                </div>
              </div>
              {connectingType === 'bitcoin_com' ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00E5FF]">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>CONNECTING...</span>
                </div>
              ) : (
                <span className="text-xs font-semibold text-slate-400 group-hover:text-white">
                  Connect &rarr;
                </span>
              )}
            </button>

            {/* 2. WalletConnect */}
            <button
              id="wallet-option-walletconnect"
              disabled={connectingType !== null}
              onClick={() => handleConnect('walletconnect')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#0D1426] hover:bg-[#111A33] border border-slate-800 hover:border-slate-600 transition-all group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <Smartphone size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm">WalletConnect</span>
                    {!projectId && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">
                        Requires Key
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Scan QR code with any mobile Web3 wallet</p>
                </div>
              </div>
              {connectingType === 'walletconnect' ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>CONNECTING...</span>
                </div>
              ) : (
                <span className="text-xs font-semibold text-slate-400 group-hover:text-white">
                  Scan QR &rarr;
                </span>
              )}
            </button>

            {/* 3. Browser Extension / Injected */}
            <button
              id="wallet-option-injected"
              disabled={connectingType !== null}
              onClick={() => handleConnect('injected')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#0D1426] hover:bg-[#111A33] border border-slate-800 hover:border-slate-600 transition-all group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Globe size={20} />
                </div>
                <div>
                  <span className="font-bold text-white text-sm block">Browser Wallet</span>
                  <p className="text-xs text-slate-400">MetaMask, Coinbase, Brave, or Injected</p>
                </div>
              </div>
              {connectingType === 'injected' ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>CONNECTING...</span>
                </div>
              ) : (
                <span className="text-xs font-semibold text-slate-400 group-hover:text-white">
                  Detect &rarr;
                </span>
              )}
            </button>

            {/* 4. Instant Demo Mode (For previewing without extensions) */}
            <button
              id="wallet-option-demo"
              disabled={connectingType !== null}
              onClick={() => handleConnect('demo')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#0B1522] hover:bg-[#0F1C2E] border border-emerald-500/30 hover:border-emerald-500/60 transition-all group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm">Instant Preview Test</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.2 rounded">
                      SANDBOX READY
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Load test Polygon account &amp; sample Verse Scratchers</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-400 group-hover:underline">
                Explore &rarr;
              </span>
            </button>
          </div>

          {/* Footer note */}
          <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <KeyRound size={12} className="text-slate-500" />
              Isolated &amp; Lazy-Loaded
            </span>
            <span className="text-slate-400 font-mono">Chain ID: 137</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
