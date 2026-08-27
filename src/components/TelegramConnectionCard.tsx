import React, { useState, useEffect } from 'react';
import {
  Send,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wallet,
  ShieldCheck,
  Edit2,
  Sparkles,
} from 'lucide-react';
import { WalletAccount, UserProfileResponse } from '../types';
import { registerUserApi, getUserProfileApi } from '../services/apiService';

interface TelegramConnectionCardProps {
  account: WalletAccount | null;
  onProfileLoaded?: (profile: UserProfileResponse | null) => void;
  onNotify?: (title: string, message: string) => void;
  onConnectWalletClick?: () => void;
}

export const TelegramConnectionCard: React.FC<TelegramConnectionCardProps> = ({
  account,
  onProfileLoaded,
  onNotify,
  onConnectWalletClick,
}) => {
  const [telegramInput, setTelegramInput] = useState<string>(() => {
    return localStorage.getItem('verse_telegram_username') || '';
  });
  const [savedUsername, setSavedUsername] = useState<string>(() => {
    return localStorage.getItem('verse_telegram_username') || '';
  });
  const [isEditing, setIsEditing] = useState<boolean>(!savedUsername);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync profile from backend whenever wallet or saved username changes
  const fetchProfile = async (identifier: string) => {
    if (!identifier) return;
    try {
      const profile = await getUserProfileApi(identifier);
      setUserProfile(profile);
      if (profile.user?.telegramUsername) {
        setSavedUsername(profile.user.telegramUsername);
        localStorage.setItem('verse_telegram_username', profile.user.telegramUsername);
      }
      if (onProfileLoaded) {
        onProfileLoaded(profile);
      }
    } catch (err) {
      console.warn('Could not fetch user profile:', err);
    }
  };

  useEffect(() => {
    if (account?.address) {
      fetchProfile(account.address);
    } else if (savedUsername) {
      fetchProfile(savedUsername);
    }
  }, [account?.address, savedUsername]);

  // Poll profile periodically so user gets instant notification when admin approves scratchers
  useEffect(() => {
    const identifier = account?.address || savedUsername;
    if (!identifier) return;

    const interval = setInterval(() => {
      fetchProfile(identifier);
    }, 6000);

    return () => clearInterval(interval);
  }, [account?.address, savedUsername]);

  const handleRegisterTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = telegramInput.trim();
    if (!cleaned) {
      setErrorMsg('Please enter your Telegram username (e.g., @yourusername)');
      return;
    }
    if (!cleaned.startsWith('@')) {
      cleaned = '@' + cleaned;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const profile = await registerUserApi(cleaned, account?.address || '');
      setSavedUsername(cleaned);
      localStorage.setItem('verse_telegram_username', cleaned);
      setUserProfile(profile);
      setIsEditing(false);

      if (account?.address) {
        setSuccessMsg('Username & Polygon wallet successfully linked in Admin Panel!');
        if (onNotify) {
          onNotify('Telegram & Wallet Linked', `Linked ${cleaned} with ${account.address.slice(0, 6)}...${account.address.slice(-4)}`);
        }
      } else {
        setSuccessMsg('Username saved! Connect your Polygon wallet to link them together.');
        if (onNotify) {
          onNotify('Telegram Saved', `${cleaned} is registered. Connect your wallet to claim.`);
        }
      }

      if (onProfileLoaded) {
        onProfileLoaded(profile);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register Telegram username');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="telegram-connection-box"
      className="p-6 rounded-3xl bg-gradient-to-r from-[#0C1527] via-[#09101F] to-[#060A14] border border-cyan-500/30 shadow-xl relative overflow-hidden space-y-4"
    >
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#00E5FF]/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00E5FF] shadow-inner">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                TELEGRAM &amp; WALLET SYNC
              </h3>
              {savedUsername && account?.address && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 text-[10px] font-black border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  STORED AT ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Connect your Telegram handle to receive approved scratcher allocations from the admin
            </p>
          </div>
        </div>

        {/* Current Connection Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {savedUsername && !isEditing && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#060D1A] border border-cyan-500/40 text-xs">
              <UserCheck size={14} className="text-cyan-300" />
              <span className="font-mono font-extrabold text-cyan-300">{savedUsername}</span>
              <button
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-white ml-1 p-0.5"
                title="Edit Username"
              >
                <Edit2 size={12} />
              </button>
            </div>
          )}

          {account?.address ? (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#060D1A] border border-purple-500/30 text-xs font-mono text-purple-300">
              <Wallet size={14} />
              <span>{account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
            </div>
          ) : (
            <button
              onClick={onConnectWalletClick}
              className="px-3.5 py-2 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 text-[#00E5FF] font-black text-xs border border-cyan-500/40 transition-all cursor-pointer"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Input form if user is editing or not saved yet */}
      {(isEditing || !savedUsername) && (
        <form onSubmit={handleRegisterTelegram} className="pt-2 relative z-10 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 font-mono font-bold text-sm">
                @
              </span>
              <input
                type="text"
                placeholder="your_telegram_username (e.g. zionoluchi)"
                value={telegramInput.startsWith('@') ? telegramInput.slice(1) : telegramInput}
                onChange={(e) => setTelegramInput('@' + e.target.value.replace(/^@/, ''))}
                className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-[#040813] border border-cyan-500/30 text-xs sm:text-sm font-mono text-white placeholder-slate-500 focus:border-[#00E5FF] focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="save-telegram-btn"
                type="submit"
                disabled={isSubmitting || !telegramInput.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#00E5FF] to-[#0099FF] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Link &amp; Save in Admin</span>
                  </>
                )}
              </button>

              {savedUsername && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </form>
      )}

      {/* Info footer */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-300" />
          <span>
            {savedUsername
              ? `Connected as ${savedUsername}. When the admin approves scratchers for you, they will appear below ready to claim.`
              : 'Enter your Telegram username to connect and receive scratchers from the admin.'}
          </span>
        </div>
      </div>
    </div>
  );
};
