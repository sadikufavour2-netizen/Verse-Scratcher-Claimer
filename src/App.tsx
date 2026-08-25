/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { ConnectionStatus, WalletAccount, POLYGON_MAINNET } from './types';
import { switchToPolygon, disconnectWallet } from './services/walletService';
import { WalletErrorBoundary } from './components/WalletErrorBoundary';
import { Navbar } from './components/Navbar';
import { ScratcherDashboard } from './components/ScratcherDashboard';
import { WalletConnectModal } from './components/WalletConnectModal';
import { NotificationToast, ToastNotification } from './components/NotificationToast';

export default function App() {
  // Safe initial React state - Zero WalletConnect execution on initial mount
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // Triggered ONLY after explicit user click on "CONNECT WALLET"
  const handleOpenConnect = () => {
    setIsModalOpen(true);
    setErrorMessage(null);
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

  // Called when wallet connects successfully
  const handleConnectSuccess = (connectedAccount: WalletAccount) => {
    setAccount(connectedAccount);
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

  // Update account balance dynamically with real BigInt precision and error states
  const handleUpdateAccountBalance = (
    matic: string,
    verse: string,
    maticRaw?: bigint,
    verseRaw?: bigint,
    maticError?: string | null,
    verseError?: string | null
  ) => {
    setAccount((prev) => {
      if (!prev) return null;
      if (
        prev.balanceMatic === matic &&
        prev.balanceVerse === verse &&
        prev.balanceMaticRaw === maticRaw &&
        prev.balanceVerseRaw === verseRaw &&
        prev.balanceMaticError === maticError &&
        prev.balanceVerseError === verseError
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
    await disconnectWallet();
    setAccount(null);
    setConnectionStatus('DISCONNECTED');
    setErrorMessage(null);
    handleNotify('Wallet Disconnected', 'You have disconnected your Polygon wallet.');
  };

  // Switch / Connect another account handler
  const handleSwitchAccount = () => {
    setIsModalOpen(true);
  };

  // Retry handler
  const handleRetry = () => {
    setErrorMessage(null);
    setConnectionStatus('DISCONNECTED');
    setIsModalOpen(true);
  };

  return (
    <WalletErrorBoundary>
      <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col selection:bg-[#00E5FF]/30 selection:text-[#00E5FF] font-sans antialiased">
        {/* Navigation Bar */}
        <Navbar
          status={connectionStatus}
          account={account}
          errorMessage={errorMessage}
          onSwitchNetworkClick={handleSwitchNetwork}
          onDisconnectClick={handleDisconnect}
          onSwitchAccountClick={handleSwitchAccount}
          onRetryClick={handleRetry}
        />

        {/* Main Application Body */}
        <main className="flex-1">
          <ScratcherDashboard
            status={connectionStatus}
            account={account}
            errorMessage={errorMessage}
            onConnectClick={handleOpenConnect}
            onSwitchNetworkClick={handleSwitchNetwork}
            onRetryClick={handleRetry}
            onUpdateAccountBalance={handleUpdateAccountBalance}
            onNotify={handleNotify}
          />
        </main>

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

        {/* Footer with strictly "Verse by Bitcoin.com" */}
        <footer className="border-t border-slate-800/80 bg-[#04060C] py-6 px-4 text-center">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <span className="font-bold text-slate-300 text-sm tracking-wide">
              Verse by Bitcoin.com
            </span>
          </div>
        </footer>
      </div>
    </WalletErrorBoundary>
  );
}
