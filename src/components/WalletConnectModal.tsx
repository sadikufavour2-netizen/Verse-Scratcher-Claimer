import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Smartphone,
  Globe,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  KeyRound,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';
import { WalletAccount, WalletType } from '../types';
import {
  connectViaWalletConnect,
  connectViaInjected,
  connectViaDemo,
  connectCustomPolygonAddress,
  getWalletConnectProjectId,
} from '../services/walletService';
import { VerseLogo, PolygonBadge, VerseCoinLogo } from './VerseBrand';

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
  const [activeTab, setActiveTab] = useState<'wallets' | 'custom'>('wallets');
  const [customAddressInput, setCustomAddressInput] = useState('');

  const projectId = getWalletConnectProjectId();

  const handleConnect = async (type: WalletType) => {
    setConnectingType(type);
    setModalError(null);

    try {
      if (type === 'walletconnect') {
        const res = await connectViaWalletConnect();
        if (res.success && res.account) {
          onSuccess(res.account);
          onClose();
        } else {
          setModalError(res.error || 'Unable to connect with WalletConnect.');
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

  const handleConnectCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAddressInput.trim()) return;

    const res = connectCustomPolygonAddress(customAddressInput);
    if (res.success && res.account) {
      onSuccess(res.account);
      onClose();
    } else {
      setModalError(res.error || 'Invalid Polygon address format.');
    }
  };

  const handleQuickAddress = (addr: string) => {
    const res = connectCustomPolygonAddress(addr);
    if (res.success && res.account) {
      onSuccess(res.account);
      onClose();
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
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          id="wallet-connect-modal"
          className="relative w-full max-w-md bg-[#0A0F1D] border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,229,255,0.15)] z-10 overflow-hidden"
        >
          {/* Top Gradient Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00E5FF] via-[#8247E5] to-[#EC4899]" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <VerseCoinLogo size={32} glow={true} />
              <div>
                <h3 className="text-base font-extrabold text-white">Connect to Verse</h3>
                <p className="text-[11px] text-slate-400">Polygon Scratcher NFTs &bull; Chain 137</p>
              </div>
            </div>
            <button
              id="close-wallet-modal"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 mb-4">
            <button
              onClick={() => setActiveTab('wallets')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'wallets'
                  ? 'bg-[#00E5FF] text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Web3 Wallets
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'custom'
                  ? 'bg-[#00E5FF] text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Custom Address
            </button>
          </div>

          {/* Error Banner */}
          {modalError && (
            <div
              id="modal-error-banner"
              className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex flex-col gap-1.5"
            >
              <div className="flex items-start gap-2 text-red-300 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <div>
                  <span className="font-bold block uppercase tracking-wider text-red-400">
                    CONNECTION ISSUE
                  </span>
                  <p className="mt-0.5 text-red-200">{modalError}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallets' ? (
            /* Wallet Options */
            <div className="space-y-2.5">
              {/* 1. WalletConnect (Primary Web3 with User's Project ID) */}
              <button
                id="wallet-option-walletconnect"
                disabled={connectingType !== null}
                onClick={() => handleConnect('walletconnect')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[#0E1F3D] to-[#142952] hover:from-[#11274d] hover:to-[#193366] border border-cyan-500/50 hover:border-cyan-400 transition-all group active:scale-[0.99] text-left cursor-pointer shadow-lg shadow-cyan-500/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-[#00E5FF] group-hover:scale-105 transition-transform">
                    <Smartphone size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">WalletConnect</span>
                      <span className="text-[9px] bg-cyan-500/20 text-[#00E5FF] font-bold px-1.5 py-0.2 rounded border border-cyan-500/30">
                        ALL WALLETS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Bitcoin.com, MetaMask, Trust, Coinbase &amp; Mobile
                    </p>
                  </div>
                </div>
                {connectingType === 'walletconnect' ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#00E5FF]">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>OPENING...</span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-[#00E5FF] group-hover:translate-x-0.5 transition-transform">
                    Open &rarr;
                  </span>
                )}
              </button>

              {/* 2. Bitcoin.com Wallet Direct / Browser Extension */}
              <button
                id="wallet-option-bitcoin-com"
                disabled={connectingType !== null}
                onClick={() => handleConnect('bitcoin_com')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#0D1426] hover:bg-[#111A33] border border-slate-700/80 hover:border-slate-500 transition-all group active:scale-[0.99] text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm">Bitcoin.com Wallet</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Direct Verse extension connection</p>
                  </div>
                </div>
                {connectingType === 'bitcoin_com' ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>CONNECTING...</span>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-400 group-hover:text-white">
                    Connect &rarr;
                  </span>
                )}
              </button>

              {/* 3. Browser Extension / Injected */}
              <button
                id="wallet-option-injected"
                disabled={connectingType !== null}
                onClick={() => handleConnect('injected')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#0D1426] hover:bg-[#111A33] border border-slate-700/80 hover:border-slate-500 transition-all group active:scale-[0.99] text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                    <Globe size={22} />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">Browser Web3 Wallet</span>
                    <p className="text-[11px] text-slate-400">MetaMask, Brave, Phantom or Injected</p>
                  </div>
                </div>
                {connectingType === 'injected' ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>CONNECTING...</span>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-400 group-hover:text-white">
                    Detect &rarr;
                  </span>
                )}
              </button>

              {/* 4. Instant Demo Mode */}
              <button
                id="wallet-option-demo"
                disabled={connectingType !== null}
                onClick={() => handleConnect('demo')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#0B1522] hover:bg-[#0F1C2E] border border-emerald-500/30 hover:border-emerald-500/60 transition-all group active:scale-[0.99] text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">Instant Polygon Test Account</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.2 rounded">
                        TEST READY
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">Load sample Verse Scratchers on Polygon</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-400 group-hover:underline">
                  Connect &rarr;
                </span>
              </button>
            </div>
          ) : (
            /* Custom Polygon Address Input */
            <form onSubmit={handleConnectCustom} className="space-y-4">
              <div className="p-3.5 bg-[#0D1426] border border-slate-700/80 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Connect Any Polygon Address
                </label>
                <input
                  type="text"
                  placeholder="0x71C... (Polygon address)"
                  value={customAddressInput}
                  onChange={(e) => setCustomAddressInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5FF]"
                />
                <p className="text-[11px] text-slate-400">
                  Enter any Polygon address to view its NFTs and simulate scratch &amp; claim flows.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                CONNECT CUSTOM ADDRESS
              </button>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Quick Switch Polygon Addresses:
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    '0x3F89a1945C227e7b8DaD7A27dC47b59E2a61137c',
                    '0x71C567A8fE76A3D80687E34eFe40b54376C1897e',
                    '0x9A25cB3d82F72e3532C2b2E0B25aA1D67B8097E4',
                  ].map((addr) => (
                    <button
                      key={addr}
                      type="button"
                      onClick={() => handleQuickAddress(addr)}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-left text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <span>{addr.slice(0, 10)}...{addr.slice(-6)}</span>
                      <span className="text-[10px] text-[#00E5FF] font-bold">Connect &rarr;</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* Footer note with Project ID indicator */}
          <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <KeyRound size={12} className="text-[#00E5FF]" />
              Project ID: <code className="text-slate-300 font-mono">{projectId.slice(0, 6)}...{projectId.slice(-4)}</code>
            </span>
            <span className="text-purple-300 font-mono font-semibold">Polygon 137</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
