/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ConnectionStatus, WalletAccount, POLYGON_MAINNET } from './types';
import { switchToPolygon, disconnectWallet } from './services/walletService';
import { WalletErrorBoundary } from './components/WalletErrorBoundary';
import { Navbar } from './components/Navbar';
import { ScratcherDashboard } from './components/ScratcherDashboard';
import { WalletConnectModal } from './components/WalletConnectModal';

export default function App() {
  // Safe initial React state - Zero WalletConnect execution on initial mount
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Triggered ONLY after explicit user click on "CONNECT WALLET"
  const handleOpenConnect = () => {
    setIsModalOpen(true);
    setErrorMessage(null);
  };

  // Called when wallet connects successfully
  const handleConnectSuccess = (connectedAccount: WalletAccount) => {
    setAccount(connectedAccount);
    setIsModalOpen(false);

    // Verify Polygon Mainnet (Chain ID 137)
    if (connectedAccount.chainId === POLYGON_MAINNET.chainId) {
      setConnectionStatus('CONNECTED');
      setErrorMessage(null);
    } else {
      setConnectionStatus('WRONG_NETWORK');
      setErrorMessage('Please switch your wallet to Polygon.');
    }
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
      <div className="min-h-screen bg-[#070A13] text-slate-100 flex flex-col selection:bg-[#00E5FF]/30 selection:text-[#00E5FF] font-sans antialiased">
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
          />
        </main>

        {/* Lazy Loaded Wallet Modal */}
        <WalletConnectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleConnectSuccess}
          onError={handleConnectError}
        />

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-[#060810] py-6 px-4 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">Verse by Bitcoin.com</span>
              <span>&bull;</span>
              <span className="font-mono text-purple-400">Polygon Network (137)</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="hover:text-slate-300">Verse Scratcher NFTs</span>
              <span>&bull;</span>
              <span className="hover:text-slate-300">Safe Lazy Loaded Web3</span>
            </div>
          </div>
        </footer>
      </div>
    </WalletErrorBoundary>
  );
}
