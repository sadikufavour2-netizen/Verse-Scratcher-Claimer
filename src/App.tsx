/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { ConnectionStatus, WalletAccount, POLYGON_MAINNET, UserProfileResponse } from './types';
import {
  switchToPolygon,
  disconnectWallet,
  savePersistedWallet,
  getPersistedWallet,
  connectDirectWeb3Wallet,
  fetchRealBalances,
} from './services/walletService';
import { getUserProfileApi } from './services/apiService';
import { WalletErrorBoundary } from './components/WalletErrorBoundary';
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { AdminPanel } from './components/AdminPanel';
import { AdminPinModal } from './components/AdminPinModal';
import { WalletConnectModal } from './components/WalletConnectModal';
import { NotificationToast, ToastNotification } from './components/NotificationToast';
import { Lock, Shield } from 'lucide-react';
import verseScratcherBg from './assets/images/verse_scratcher_bg_1787859226217.jpg';

export default function App() {
  // Navigation & View mode: 'home' (Home Page with Balances & Claim) | 'admin' (Admin Allocation Panel)
  const [currentView, setCurrentView] = useState<'home' | 'admin'>('home');

  // Admin PIN Protection state
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  // Wallet Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [pendingApprovedCount, setPendingApprovedCount] = useState<number>(0);

  // Auto-restore connected wallet session on page load / refresh
  useEffect(() => {
    const persisted = getPersistedWallet('user');
    if (persisted && persisted.address) {
      setAccount(persisted);
      setConnectionStatus('CONNECTED');

      // Query live Polygon balances in background
      fetchRealBalances(persisted.address)
        .then((balances) => {
          setAccount((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              balanceMatic: balances.balanceMatic,
              balanceVerse: balances.balanceVerse,
              balanceMaticRaw: balances.balanceMaticRaw,
              balanceVerseRaw: balances.balanceVerseRaw,
              balanceMaticError: balances.balanceMaticError,
              balanceVerseError: balances.balanceVerseError,
              balanceVerseEthereum: balances.balanceVerseEthereum,
              balanceVerseNetworkNote: balances.balanceVerseNetworkNote,
            };
          });
        })
        .catch((err) => {
          console.warn('Auto-restore balance query error:', err);
        });
    }
  }, []);

  // Triggered when clicking "CONNECT WALLET" in the page - directly launches Web3 wallet pop-up
  const handleOpenConnect = async () => {
    setErrorMessage(null);
    try {
      // Directly triggers the browser Web3 wallet extension (MetaMask/Rabby/Coinbase) or WalletConnect modal
      const res = await connectDirectWeb3Wallet();
      if (res.success && res.account) {
        handleConnectSuccess(res.account);
      } else {
        // If an issue or provider needs explicit selection, open the modal
        if (res.error && !res.error.toLowerCase().includes('user rejected') && !res.error.toLowerCase().includes('closed')) {
          setIsModalOpen(true);
        }
      }
    } catch (e) {
      setIsModalOpen(true);
    }
  };

  // Toast notification dispatcher
  const handleNotify = useCallback((title: string, message: string, verseAmount?: number, txHash?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastNotification = {
      id,
      type: verseAmount ? 'claim_success' : 'info',
      title,
      message,
      verseAmount,
      txHash,
    };

    setNotifications((prev) => [...prev, newToast]);

    // Auto-dismiss after 6.5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((t) => t.id !== id));
    }, 6500);
  }, []);

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((t) => t.id !== id));
  };

  // Check pending approved allocations for active user
  const checkPendingAllocations = useCallback(async () => {
    const savedTelegram = localStorage.getItem('verse_telegram_username');
    const identifier = account?.address || savedTelegram;
    if (!identifier) return;

    try {
      const profile: UserProfileResponse = await getUserProfileApi(identifier);
      const pending = (profile.allocations || []).filter((a) => a.status === 'APPROVED');
      const count = pending.reduce((sum, a) => sum + a.amount, 0);
      setPendingApprovedCount(count);
    } catch (e) {
      // quiet catch
    }
  }, [account?.address]);

  useEffect(() => {
    checkPendingAllocations();
    const interval = setInterval(checkPendingAllocations, 8000);
    return () => clearInterval(interval);
  }, [checkPendingAllocations]);

  // Called when wallet connects successfully
  const handleConnectSuccess = (connectedAccount: WalletAccount) => {
    setAccount(connectedAccount);
    savePersistedWallet('user', connectedAccount);
    setIsModalOpen(false);

    // Verify Polygon Mainnet (Chain ID 137)
    if (connectedAccount.chainId === POLYGON_MAINNET.chainId) {
      setConnectionStatus('CONNECTED');
      setErrorMessage(null);
      handleNotify('Wallet Connected', `Connected to Polygon Mainnet (${connectedAccount.address.slice(0, 6)}...${connectedAccount.address.slice(-4)})`);
    } else {
      setConnectionStatus('WRONG_NETWORK');
      setErrorMessage('Please switch your wallet to Polygon.');
    }
  };

  // Update account balance dynamically
  const handleUpdateAccountBalance = (
    matic: string,
    verse: string,
    maticRaw?: bigint,
    verseRaw?: bigint,
    maticError?: string | null,
    verseError?: string | null,
    verseEthereum?: string | null,
    verseNetworkNote?: string | null
  ) => {
    setAccount((prev) => {
      if (!prev) return null;
      if (
        prev.balanceMatic === matic &&
        prev.balanceVerse === verse &&
        prev.balanceMaticRaw === maticRaw &&
        prev.balanceVerseRaw === verseRaw &&
        prev.balanceMaticError === maticError &&
        prev.balanceVerseError === verseError &&
        prev.balanceVerseEthereum === verseEthereum &&
        prev.balanceVerseNetworkNote === verseNetworkNote
      ) {
        return prev;
      }
      return {
        ...prev,
        balanceMatic: matic,
        balanceVerse: verse,
        balanceMaticRaw: maticRaw ?? prev.balanceMaticRaw,
        balanceVerseRaw: verseRaw ?? prev.balanceVerseRaw,
        balanceMaticError: maticError !== undefined ? maticError : prev.balanceMaticError,
        balanceVerseError: verseError !== undefined ? verseError : prev.balanceVerseError,
        balanceVerseEthereum: verseEthereum !== undefined ? verseEthereum : prev.balanceVerseEthereum,
        balanceVerseNetworkNote: verseNetworkNote !== undefined ? verseNetworkNote : prev.balanceVerseNetworkNote,
      };
    });
  };

  // Called if wallet connection fails
  const handleConnectError = (errorMsg: string) => {
    setErrorMessage(errorMsg || 'Unable to connect your wallet.');
    setConnectionStatus('ERROR');
  };

  // Switch to Polygon handler
  const handleSwitchNetwork = async () => {
    if (!account) return;
    setConnectionStatus('CONNECTING');

    const res = await switchToPolygon(account);
    if (res.success) {
      setAccount((prev) => (prev ? { ...prev, chainId: POLYGON_MAINNET.chainId } : null));
      setConnectionStatus('CONNECTED');
      setErrorMessage(null);
      handleNotify('Network Switched', 'Successfully connected to Polygon Mainnet.');
    } else {
      setConnectionStatus('WRONG_NETWORK');
      setErrorMessage(res.error || 'Please switch your wallet to Polygon.');
    }
  };

  // Disconnect handler
  const handleDisconnect = async () => {
    await disconnectWallet('user');
    setAccount(null);
    setConnectionStatus('DISCONNECTED');
    setErrorMessage(null);
    handleNotify('Wallet Disconnected', 'You have disconnected your Polygon wallet.');
  };

  // Handle Admin Panel Click from Footer
  const handleAdminClick = () => {
    if (isAdminUnlocked) {
      setCurrentView('admin');
    } else {
      setIsPinModalOpen(true);
    }
  };

  const handleAdminPinSuccess = () => {
    setIsAdminUnlocked(true);
    setIsPinModalOpen(false);
    setCurrentView('admin');
    handleNotify('Admin Access Granted', 'Welcome to Verse Admin Panel.');
  };

  return (
    <WalletErrorBoundary>
      <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col selection:bg-[#00E5FF]/30 selection:text-[#00E5FF] font-sans antialiased relative overflow-x-hidden">
        {/* Background Verse Scratcher Art Wallpaper */}
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-50 scale-100 transition-all brightness-95 saturate-110"
          style={{ backgroundImage: `url(${verseScratcherBg})` }}
        />
        {/* Atmospheric Darker Contrast Overlay */}
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#050811]/75 via-[#050811]/85 to-[#050811]/95 pointer-events-none" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Navigation Bar */}
          <Navbar onLogoClick={() => setCurrentView('home')} />

          {/* Main Application Body */}
          <main className="flex-1">
            {currentView === 'admin' ? (
              <AdminPanel
                onSwitchToUserPortal={() => setCurrentView('home')}
                onNotify={handleNotify}
              />
            ) : (
              <HomePage
                status={connectionStatus}
                account={account}
                onConnectClick={handleOpenConnect}
                onDisconnectClick={handleDisconnect}
                onSwitchToConnectView={() => {}}
                onSwitchToAdminView={handleAdminClick}
                onUpdateAccountBalance={handleUpdateAccountBalance}
                onNotify={handleNotify}
              />
            )}
          </main>

          {/* Persistent Footer with Centered Admin Panel and Getverse Link */}
          <footer className="border-t border-slate-800/80 bg-[#04060C]/90 backdrop-blur-md py-6 px-4 mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Left blank spacing for symmetry on desktop */}
              <div className="hidden sm:block sm:w-28" />

              {/* Center: Admin Panel Access Button */}
              <div className="flex items-center justify-center">
                {currentView === 'admin' ? (
                  <button
                    id="footer-back-home-btn"
                    onClick={() => setCurrentView('home')}
                    className="px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/40 text-xs font-black text-[#00E5FF] hover:underline cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>Back to Home</span>
                  </button>
                ) : (
                  <button
                    id="footer-admin-panel-btn"
                    onClick={handleAdminClick}
                    className="text-xs font-bold text-slate-300 hover:text-[#00E5FF] transition-all cursor-pointer flex items-center gap-1.5 group bg-slate-900/70 hover:bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 hover:border-cyan-500/40 shadow-sm"
                  >
                    <Lock size={13} className="text-slate-400 group-hover:text-[#00E5FF] transition-colors" />
                    <span>Admin Panel</span>
                  </button>
                )}
              </div>

              {/* Right: Official Getverse Link (without icon) */}
              <div className="flex justify-center sm:justify-end sm:w-28">
                <a
                  id="footer-telegram-link"
                  href="https://t.me/GetVerse"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#0E1626]/90 hover:bg-[#132038] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all text-xs font-black shadow-lg shadow-cyan-500/10 group cursor-pointer"
                >
                  <span>@Getverse</span>
                </a>
              </div>
            </div>
          </footer>
        </div>

        {/* Toast Notifications */}
        <NotificationToast
          notifications={notifications}
          onDismiss={handleDismissNotification}
        />

        {/* Lazy Loaded Wallet Modal */}
        <WalletConnectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleConnectSuccess}
          onError={handleConnectError}
        />

        {/* Admin PIN Modal */}
        <AdminPinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={handleAdminPinSuccess}
        />
      </div>
    </WalletErrorBoundary>
  );
}
