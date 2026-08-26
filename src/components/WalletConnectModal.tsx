import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Smartphone,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Wallet,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Shield,
  Key,
} from 'lucide-react';
import { WalletAccount } from '../types';
import {
  connectViaWalletConnect,
  connectInjectedWallet,
  connectWithCustomAddress,
  getDetectedWalletInfo,
  isInjectedWalletAvailable,
} from '../services/walletService';
import { VerseCoinLogo, PolygonBadge } from './VerseBrand';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (account: WalletAccount) => void;
  onError: (errorMessage: string) => void;
  title?: string;
  subtitle?: string;
  isAdminMode?: boolean;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  title = 'CONNECT WALLET',
  subtitle = 'Verse on Polygon Mainnet',
  isAdminMode = false,
}) => {
  const [connectingType, setConnectingType] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showManualAddress, setShowManualAddress] = useState<boolean>(false);
  const [manualAddressInput, setManualAddressInput] = useState<string>('');
  const [isManualLoading, setIsManualLoading] = useState<boolean>(false);

  const [detectedInfo, setDetectedInfo] = useState(getDetectedWalletInfo());

  useEffect(() => {
    if (isOpen) {
      setDetectedInfo(getDetectedWalletInfo());
      setModalError(null);
      setConnectingType(null);
    }
  }, [isOpen]);

  // 1. Connect via Injected Web3 / Browser Extension (MetaMask, Rabby, Coinbase, etc.)
  const handleInjectedConnect = async (targetWalletName = 'MetaMask') => {
    setConnectingType(targetWalletName);
    setModalError(null);

    try {
      if (!isInjectedWalletAvailable()) {
        throw new Error(
          'No Web3 browser extension found (like MetaMask, Rabby, or Coinbase). Please use WalletConnect or enter your address below.'
        );
      }

      const res = await connectInjectedWallet(targetWalletName);
      if (res.success && res.account) {
        onSuccess(res.account);
        onClose();
      } else {
        setModalError(res.error || 'Connection request was rejected or closed in wallet.');
        onError(res.error || 'WALLET CONNECTION FAILED');
      }
    } catch (err: any) {
      console.error('Injected wallet connection error:', err);
      setModalError(err?.message || 'Unable to connect browser extension wallet.');
      onError('WALLET CONNECTION FAILED');
    } finally {
      setConnectingType(null);
    }
  };

  // 2. Connect via WalletConnect (Mobile, QR Code, Bitcoin.com Wallet)
  const handleWalletConnectClick = async () => {
    setConnectingType('walletconnect');
    setModalError(null);

    try {
      const res = await connectViaWalletConnect();
      if (res.success && res.account) {
        onSuccess(res.account);
        onClose();
      } else {
        setModalError(res.error || 'WalletConnect connection was closed or rejected.');
        onError(res.error || 'WALLET CONNECTION FAILED');
      }
    } catch (err: any) {
      console.error('WalletConnect trigger error:', err);
      setModalError(err?.message || 'Unable to connect with WalletConnect.');
      onError('WALLET CONNECTION FAILED');
    } finally {
      setConnectingType(null);
    }
  };

  // 3. Connect via Manual Address Entry
  const handleManualAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualAddressInput.trim();
    if (!clean) {
      setModalError('Please enter a Polygon address (0x...)');
      return;
    }

    setIsManualLoading(true);
    setModalError(null);

    try {
      const res = await connectWithCustomAddress(clean, isAdminMode ? 'Admin Wallet' : 'Polygon Wallet');
      if (res.success && res.account) {
        onSuccess(res.account);
        onClose();
      } else {
        setModalError(res.error || 'Invalid address or error loading balance.');
      }
    } catch (err: any) {
      setModalError(err?.message || 'Failed to connect address.');
    } finally {
      setIsManualLoading(false);
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
          onClick={connectingType ? undefined : onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          id="web3-wallet-connect-modal"
          className="relative w-full max-w-lg bg-[#080C1A] border border-cyan-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(0,229,255,0.2)] z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Top Metallic Rainbow Gradient Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] via-[#9333EA] to-[#FF00A0]" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <VerseCoinLogo size={36} glow={true} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white tracking-wide">{title}</h3>
                  {isAdminMode && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#00E5FF] text-[10px] font-black uppercase">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
              </div>
            </div>
            {!connectingType && (
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
              className="mb-4 p-3.5 bg-red-950/60 border border-red-500/40 rounded-2xl flex items-start gap-2.5 text-red-200 text-xs"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <div>
                <span className="font-bold text-red-300 block uppercase">Connection Issue</span>
                <p className="mt-0.5 leading-relaxed">{modalError}</p>
              </div>
            </div>
          )}

          {/* Web3 Wallet Options Grid */}
          <div className="space-y-3">
            {/* OPTION 1: MetaMask / Browser Extension (Injected Web3) */}
            <button
              id="wallet-option-injected"
              disabled={Boolean(connectingType)}
              onClick={() => handleInjectedConnect(detectedInfo.walletName || 'MetaMask')}
              className="w-full p-4 rounded-2xl bg-[#0E172A] hover:bg-[#14203B] border border-cyan-500/30 hover:border-[#00E5FF] text-white flex items-center justify-between transition-all hover:scale-[1.01] active:scale-98 cursor-pointer disabled:opacity-60 group shadow-md"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-105 transition-transform">
                  <svg viewBox="0 0 32 32" className="w-6 h-6 fill-current">
                    <path d="M28.09 3.21L17.7 10.87l2.25-5.32zM3.91 3.21l10.29 7.66-2.15-5.32zM24.77 22.86l-2.73 4.19 5.37 1.48 1.55-5.26zM7.23 22.86l-4.19.41 1.55 5.26 5.37-1.48zM12.08 14.1l-2.97 1.34 3.92 1.77-1.07-3.11zM19.92 14.1l.12 3.11 3.92-1.77-2.97-1.34z" />
                    <path d="M9.11 15.44l-3.9 5.86 5.56-.25-.33-2.61zM22.89 15.44l-1.33 3-0.33 2.61 5.56.25zM13.91 21.05l-3.32-.22 2.69 2.05zM18.09 21.05l.63 1.83 2.69-2.05z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-extrabold text-sm block">
                      {detectedInfo.hasInjected ? detectedInfo.walletName : 'MetaMask / Browser Wallet'}
                    </span>
                    {detectedInfo.hasInjected && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Detected
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Direct Browser Extension Pop-up (MetaMask, Rabby, Brave, Trust)
                  </span>
                </div>
              </div>

              {connectingType === 'MetaMask' || connectingType === detectedInfo.walletName ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#00E5FF] bg-cyan-950/60 px-3 py-1.5 rounded-xl border border-cyan-500/40">
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800/80 group-hover:bg-[#00E5FF] group-hover:text-black flex items-center justify-center text-slate-300 transition-colors">
                  <ArrowRight size={16} />
                </div>
              )}
            </button>

            {/* OPTION 2: WalletConnect (Bitcoin.com, Mobile, QR Code) */}
            <button
              id="wallet-option-walletconnect"
              disabled={Boolean(connectingType)}
              onClick={handleWalletConnectClick}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#0C1426] via-[#101C35] to-[#0A1020] hover:from-[#11203E] hover:to-[#0F1B34] border border-cyan-500/40 hover:border-[#00E5FF] text-white flex items-center justify-between transition-all hover:scale-[1.01] active:scale-98 cursor-pointer disabled:opacity-60 group shadow-md"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#00E5FF]/15 border border-cyan-500/40 flex items-center justify-center text-[#00E5FF] group-hover:scale-105 transition-transform">
                  <Smartphone size={22} />
                </div>
                <div className="text-left">
                  <span className="text-white font-extrabold text-sm block">
                    WalletConnect &amp; Mobile
                  </span>
                  <span className="text-[11px] text-cyan-200/80 font-medium">
                    Bitcoin.com Wallet, MetaMask Mobile, Trust, QR Code
                  </span>
                </div>
              </div>

              {connectingType === 'walletconnect' ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#00E5FF] bg-black/40 px-3 py-1.5 rounded-xl border border-cyan-500/40">
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Opening...</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 group-hover:bg-[#00E5FF] group-hover:text-black flex items-center justify-center text-[#00E5FF] transition-colors">
                  <ArrowRight size={16} />
                </div>
              )}
            </button>

            {/* OPTION 3: Coinbase Wallet */}
            <button
              id="wallet-option-coinbase"
              disabled={Boolean(connectingType)}
              onClick={() => handleInjectedConnect('Coinbase Wallet')}
              className="w-full p-3.5 rounded-2xl bg-[#0E172A] hover:bg-[#14203B] border border-slate-800 hover:border-blue-500/40 text-white flex items-center justify-between transition-all hover:scale-[1.01] active:scale-98 cursor-pointer disabled:opacity-60 group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Wallet size={20} />
                </div>
                <div className="text-left">
                  <span className="text-white font-bold text-xs block">
                    Coinbase Wallet &amp; Other Web3
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Connect via Coinbase browser extension or Web3 provider
                  </span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white">
                <ArrowRight size={14} />
              </div>
            </button>
          </div>

          {/* OPTION 4: Direct Polygon Address Input (Manual / Cold / Admin Address) */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowManualAddress(!showManualAddress)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-cyan-300 transition-colors py-1 cursor-pointer font-bold"
            >
              <span className="flex items-center gap-1.5">
                <Key size={13} className="text-[#00E5FF]" />
                <span>Enter Polygon Address Directly (Cold / Admin / Multisig)</span>
              </span>
              {showManualAddress ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showManualAddress && (
              <form onSubmit={handleManualAddressSubmit} className="mt-3 space-y-2.5">
                <p className="text-[11px] text-slate-400">
                  Paste any valid Polygon wallet address (0x...) to connect and manage on-chain VERSE balances &amp; scratchers.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="0x71C...4eB78"
                    value={manualAddressInput}
                    onChange={(e) => setManualAddressInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#040813] border border-slate-700 focus:border-[#00E5FF] focus:outline-none text-xs font-mono text-cyan-200 placeholder-slate-600"
                  />
                  <button
                    type="submit"
                    disabled={isManualLoading || !manualAddressInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black text-xs uppercase cursor-pointer disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    {isManualLoading ? <RefreshCw size={13} className="animate-spin" /> : 'Connect'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Sparkles size={13} className="text-[#00E5FF]" />
              Polygon Mainnet (Chain ID 137)
            </span>
            <PolygonBadge size="sm" />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

