import React, { useState, useEffect } from 'react';
import {
  Send,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Coins,
  Lock,
} from 'lucide-react';
import { ConnectionStatus, WalletAccount, UserProfileResponse } from '../types';
import { registerUserApi, getUserProfileApi } from '../services/apiService';
import { detectTelegramUsername, saveTelegramUsername } from '../services/telegramService';
import { PolygonBadge, VerseCoinLogo } from './VerseBrand';

interface ConnectDashboardProps {
  status: ConnectionStatus;
  account: WalletAccount | null;
  errorMessage?: string | null;
  onConnectWalletClick: () => void;
  onProceedToHome: () => void;
  onNotify?: (title: string, message: string, verseAmount?: number) => void;
}

export const ConnectDashboard: React.FC<ConnectDashboardProps> = ({
  status,
  account,
  errorMessage,
  onConnectWalletClick,
  onProceedToHome,
  onNotify,
}) => {
  const [telegramInput, setTelegramInput] = useState<string>(() => {
    return detectTelegramUsername();
  });
  const [savedUsername, setSavedUsername] = useState<string>(() => {
    return detectTelegramUsername();
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);

  const isWalletConnected = status === 'CONNECTED' && !!account?.address;
  const isTelegramEntered = !!savedUsername.trim();
  const isReadyForHome = isWalletConnected && isTelegramEntered;

  // Fetch profile and auto-register whenever wallet or saved username changes
  useEffect(() => {
    const identifier = account?.address || savedUsername;
    if (identifier) {
      // Sync with server immediately
      registerUserApi(savedUsername || '', account?.address || '')
        .then((p) => {
          setUserProfile(p);
          if (p.user?.telegramUsername) {
            setSavedUsername(p.user.telegramUsername);
            localStorage.setItem('verse_telegram_username', p.user.telegramUsername);
          }
        })
        .catch(() => {
          getUserProfileApi(identifier)
            .then((p) => {
              setUserProfile(p);
              if (p.user?.telegramUsername) {
                setSavedUsername(p.user.telegramUsername);
                localStorage.setItem('verse_telegram_username', p.user.telegramUsername);
              }
            })
            .catch(() => {});
        });
    }
  }, [account?.address, savedUsername]);

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = telegramInput.trim();
    if (!cleaned) {
      setErrorMsg('Please enter your Telegram username (e.g. @yourusername)');
      return;
    }
    if (!cleaned.startsWith('@')) {
      cleaned = '@' + cleaned;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    // Save in localStorage immediately
    localStorage.setItem('verse_telegram_username', cleaned);
    setSavedUsername(cleaned);

    try {
      // Always register immediately to backend admin database
      const profile = await registerUserApi(cleaned, account?.address || '');
      setUserProfile(profile);

      if (account?.address) {
        setSuccessMsg(`Telegram username ${cleaned} and Polygon wallet linked in Admin Panel!`);
        if (onNotify) {
          onNotify('Connected & Synced', `${cleaned} linked with Polygon wallet.`);
        }
        // Auto-navigate to home page once both are confirmed
        setTimeout(() => {
          onProceedToHome();
        }, 600);
      } else {
        setSuccessMsg(`Telegram username ${cleaned} saved in Admin database! Now connect your Polygon wallet.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save to admin database');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedClick = async () => {
    if (!isTelegramEntered) {
      setErrorMsg('Please enter your Telegram username first.');
      return;
    }
    if (!isWalletConnected) {
      onConnectWalletClick();
      return;
    }

    // Ensure synced with backend
    if (account?.address && savedUsername) {
      try {
        await registerUserApi(savedUsername, account.address);
      } catch (e) {}
    }

    onProceedToHome();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <VerseCoinLogo size={40} glow={true} />
          <PolygonBadge size="md" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          CONNECT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] to-[#EC4899]">DASHBOARD</span>
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Connect your <strong>Telegram username</strong> and <strong>Polygon wallet address</strong> below. Once connected, you will be taken to your Home Page to view your <strong>VERSE &amp; POL balance</strong> and claim your scratchers from the admin side.
        </p>
      </div>

      {/* Connection Steps Card */}
      <div
        id="connect-dashboard-card"
        className="relative rounded-3xl bg-[#080D1E] border border-cyan-500/30 p-6 sm:p-10 shadow-[0_0_50px_rgba(0,229,255,0.12)] overflow-hidden space-y-8"
      >
        {/* Top Gradient Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] via-[#9333EA] to-[#FF00A0]" />

        {/* Dual Connection Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* STEP 1: Connect Telegram Username */}
          <div className="p-6 rounded-2xl bg-[#0B1429] border border-slate-700/80 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00E5FF]">
                    <Send size={18} />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Step 1
                  </span>
                </div>
                {isTelegramEntered ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    USERNAME CONNECTED
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-black border border-amber-500/30">
                    REQUIRED
                  </span>
                )}
              </div>

              <h3 className="text-lg font-black text-white">Connect Telegram Username</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your Telegram handle (e.g. <span className="text-cyan-300 font-mono">@yourusername</span>) to match scratchers approved by the admin.
              </p>
            </div>

            <form onSubmit={handleSaveTelegram} className="space-y-3 pt-2">
              <div className="relative">
                <input
                  id="dashboard-telegram-input"
                  type="text"
                  value={telegramInput}
                  onChange={(e) => setTelegramInput(e.target.value)}
                  placeholder="@yourusername"
                  className="w-full pl-4 pr-10 py-3 bg-[#060A14] border border-slate-700 focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] rounded-xl text-white font-mono text-sm placeholder:text-slate-600 outline-none transition-all"
                />
                <span className="absolute right-3.5 top-3.5 text-slate-500 text-xs font-bold">
                  TG
                </span>
              </div>

              <button
                id="save-telegram-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>SAVING TO ADMIN DB...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>{savedUsername ? 'UPDATE TELEGRAM HANDLE' : 'SAVE TELEGRAM HANDLE'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* STEP 2: Connect Wallet Address */}
          <div className="p-6 rounded-2xl bg-[#0B1429] border border-slate-700/80 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Wallet size={18} />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Step 2
                  </span>
                </div>
                {isWalletConnected ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    WALLET CONNECTED
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-black border border-amber-500/30">
                    REQUIRED
                  </span>
                )}
              </div>

              <h3 className="text-lg font-black text-white">Connect Polygon Wallet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your Bitcoin.com Wallet, MetaMask, or WalletConnect on Polygon to receive prizes and balances.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {isWalletConnected && account ? (
                <div className="p-3 bg-[#060A14] border border-emerald-500/30 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Connected Address:</span>
                    <span className="text-emerald-400 font-bold">Polygon Mainnet</span>
                  </div>
                  <div className="font-mono text-cyan-300 text-xs font-bold truncate">
                    {account.address}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#060A14] border border-slate-800 rounded-xl text-xs text-slate-500 font-mono">
                  No Polygon wallet connected yet
                </div>
              )}

              <button
                id="dashboard-connect-wallet-btn"
                type="button"
                onClick={onConnectWalletClick}
                className={`w-full py-3 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isWalletConnected
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-gradient-to-r from-[#00E5FF] to-[#3B82F6] hover:from-[#00cce6] hover:to-[#2563eb] text-black shadow-lg shadow-cyan-500/20'
                }`}
              >
                <Wallet size={14} />
                <span>{isWalletConnected ? 'SWITCH / RECONNECT WALLET' : 'CONNECT WEB3 WALLET'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="p-4 bg-red-950/60 border border-red-500/50 rounded-2xl flex items-center gap-3 text-red-300 text-xs font-medium">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {errorMessage && status === 'ERROR' && (
          <div className="p-4 bg-red-950/60 border border-red-500/50 rounded-2xl flex items-center gap-3 text-red-300 text-xs font-medium">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs font-medium">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Big Action: Take Them To Home Page */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className={`w-3 h-3 rounded-full ${isReadyForHome ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
            <span>
              {isReadyForHome
                ? 'Both Telegram & Wallet are ready! Proceed to Home Page.'
                : 'Connect both Telegram username and Wallet to proceed to Home Page.'}
            </span>
          </div>

          <button
            id="proceed-to-home-btn"
            onClick={handleProceedClick}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all cursor-pointer ${
              isReadyForHome
                ? 'bg-gradient-to-r from-[#00E5FF] via-[#00cce6] to-[#0099FF] text-black shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            <span>PROCEED TO HOME PAGE</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
