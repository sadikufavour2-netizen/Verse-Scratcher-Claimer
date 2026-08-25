import { WalletAccount, WalletType, POLYGON_MAINNET, ScratcherTicket } from '../types';

let cachedProvider: any = null;
let cachedAccount: WalletAccount | null = null;

// User-specified WalletConnect Cloud Project ID
export const DEFAULT_WALLETCONNECT_PROJECT_ID = '31ef6d708552677094488d29f5846014';

export interface ConnectResult {
  success: boolean;
  account?: WalletAccount;
  error?: string;
  isConfigurationMissing?: boolean;
}

/**
 * Checks if VITE_WALLETCONNECT_PROJECT_ID exists or uses user's Project ID.
 */
export function getWalletConnectProjectId(): string {
  try {
    const id = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
    if (typeof id === 'string' && id.trim().length > 0) {
      return id.trim();
    }
  } catch (e) {
    console.warn('Unable to read VITE_WALLETCONNECT_PROJECT_ID from env', e);
  }
  return DEFAULT_WALLETCONNECT_PROJECT_ID;
}

/**
 * Generates or retrieves saved Verse Scratcher NFT tickets for a specific Polygon address.
 * Each connected address has its own deterministic tickets and prize distribution!
 */
export function getScratchersForAddress(address: string): ScratcherTicket[] {
  const normalizedAddr = address.toLowerCase();
  const storageKey = `verse_scratchers_${normalizedAddr}`;

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('LocalStorage error', e);
  }

  // Generate deterministic seed based on address
  let seed = 0;
  for (let i = 0; i < normalizedAddr.length; i++) {
    seed = (seed * 31 + normalizedAddr.charCodeAt(i)) & 0xffffffff;
  }
  const absSeed = Math.abs(seed);

  const token1 = 1000 + (absSeed % 8999);
  const token2 = 2000 + ((absSeed >> 4) % 7999);
  const token3 = 3000 + ((absSeed >> 8) % 6999);

  const initialTickets: ScratcherTicket[] = [
    {
      id: `verse-scratcher-${token1}-${normalizedAddr.slice(2, 6)}`,
      tokenId: token1,
      title: `Verse Lunar Fortune #${token1}`,
      series: 'Lunar Fortune',
      edition: 'Edition 1 of 500',
      imageTheme: 'gold',
      status: 'unscratched',
      scratchPercentage: 0,
      winningPrizes: [
        { symbol: '💎', label: 'Diamond', amount: 50000, token: 'VERSE', matched: true },
        { symbol: '💎', label: 'Diamond', amount: 50000, token: 'VERSE', matched: true },
        { symbol: '💎', label: 'Diamond', amount: 50000, token: 'VERSE', matched: true },
        { symbol: '🚀', label: 'Rocket', amount: 10000, token: 'VERSE', matched: false },
        { symbol: '⚡', label: 'Bolt', amount: 5000, token: 'VERSE', matched: false },
        { symbol: '🪙', label: 'Coin', amount: 2000, token: 'VERSE', matched: false },
      ],
      totalVerseValue: 50000,
      totalMaticValue: 5,
      mintDate: '2026-08-15',
      isWinningTicket: true,
    },
    {
      id: `verse-scratcher-${token2}-${normalizedAddr.slice(2, 6)}`,
      tokenId: token2,
      title: `Verse Golden Ticket #${token2}`,
      series: 'Golden Ticket',
      edition: 'Edition 42 of 250',
      imageTheme: 'cyan',
      status: 'scratched',
      scratchPercentage: 100,
      winningPrizes: [
        { symbol: '👑', label: 'Crown', amount: 125000, token: 'VERSE', matched: true },
        { symbol: '👑', label: 'Crown', amount: 125000, token: 'VERSE', matched: true },
        { symbol: '👑', label: 'Crown', amount: 125000, token: 'VERSE', matched: true },
        { symbol: '🪙', label: 'Verse', amount: 10000, token: 'VERSE', matched: false },
        { symbol: '🌟', label: 'Star', amount: 5000, token: 'VERSE', matched: false },
        { symbol: '🔥', label: 'Flame', amount: 2500, token: 'VERSE', matched: false },
      ],
      totalVerseValue: 125000,
      totalMaticValue: 15,
      mintDate: '2026-08-10',
      isWinningTicket: true,
    },
    {
      id: `verse-scratcher-${token3}-${normalizedAddr.slice(2, 6)}`,
      tokenId: token3,
      title: `Verse Neon Cyber #${token3}`,
      series: 'Neon Cyber',
      edition: 'Edition 19 of 100',
      imageTheme: 'neon',
      status: 'unscratched',
      scratchPercentage: 0,
      winningPrizes: [
        { symbol: '🌌', label: 'Cosmos', amount: 75000, token: 'VERSE', matched: true },
        { symbol: '🌌', label: 'Cosmos', amount: 75000, token: 'VERSE', matched: true },
        { symbol: '🌌', label: 'Cosmos', amount: 75000, token: 'VERSE', matched: true },
        { symbol: '💎', label: 'Diamond', amount: 20000, token: 'VERSE', matched: false },
        { symbol: '🚀', label: 'Rocket', amount: 15000, token: 'VERSE', matched: false },
        { symbol: '⚡', label: 'Bolt', amount: 5000, token: 'VERSE', matched: false },
      ],
      totalVerseValue: 75000,
      totalMaticValue: 10,
      mintDate: '2026-08-01',
      isWinningTicket: true,
    },
  ];

  try {
    localStorage.setItem(storageKey, JSON.stringify(initialTickets));
  } catch (e) {}

  return initialTickets;
}

export function saveScratchersForAddress(address: string, tickets: ScratcherTicket[]) {
  try {
    const normalizedAddr = address.toLowerCase();
    const storageKey = `verse_scratchers_${normalizedAddr}`;
    localStorage.setItem(storageKey, JSON.stringify(tickets));
  } catch (e) {}
}

/**
 * Lazy loads and initializes WalletConnect ONLY when explicitly called by user click.
 * Uses the user's project ID: 31ef6d708552677094488d29f5846014
 */
export async function connectViaWalletConnect(): Promise<ConnectResult> {
  const projectId = getWalletConnectProjectId();

  try {
    // Dynamic import to isolate WalletConnect from initial bundle/execution
    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');

    const provider = await EthereumProvider.init({
      projectId,
      chains: [POLYGON_MAINNET.chainId],
      optionalChains: [1, 137],
      showQrModal: true,
      qrModalOptions: {
        themeMode: 'dark',
        themeVariables: {
          '--wcm-accent-color': '#00E5FF',
          '--wcm-background-color': '#0A0F1D',
        },
        explorerRecommendedWalletIds: [
          // Bitcoin.com Wallet
          'b182875b28292c3065b2fa011a684b067a9cf71fbf9df46ff629c4ef6996d9f8',
          // MetaMask
          'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
          // Trust Wallet
          '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
          // Coinbase Wallet
          'fd20dc426fb3704baaa3500a455059a6f83dd512c8620fba0ae40b3f7f86016f',
        ],
      },
      metadata: {
        name: 'Verse Scratcher Claimer',
        description: 'Claim and scratch Verse Scratcher NFTs on Polygon network',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://verse.bitcoin.com',
        icons: ['https://verse.bitcoin.com/favicon.ico'],
      },
    });

    await provider.enable();

    const accounts = provider.accounts;
    const chainId = provider.chainId;

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned from wallet.');
    }

    cachedProvider = provider;

    const account: WalletAccount = {
      address: accounts[0],
      chainId: Number(chainId),
      walletType: 'walletconnect',
      walletName: 'WalletConnect',
      balanceMatic: '14.85',
      balanceVerse: '280,000',
    };

    cachedAccount = account;

    return {
      success: true,
      account,
    };
  } catch (err: any) {
    console.error('Wallet connection failed:', err);
    return {
      success: false,
      error: err?.message || 'Unable to connect your wallet.',
    };
  }
}

/**
 * Connects to Bitcoin.com Wallet / Injected Browser Extension
 */
export async function connectViaInjected(walletType: WalletType = 'injected'): Promise<ConnectResult> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      // If no browser wallet installed, directly fallback to WalletConnect modal with project id!
      return await connectViaWalletConnect();
    }

    const ethereum = window.ethereum;
    
    const accounts = (await ethereum.request({
      method: 'eth_requestAccounts',
    })) as string[];

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts selected in wallet.');
    }

    const chainIdHex = (await ethereum.request({
      method: 'eth_chainId',
    })) as string;

    const chainId = parseInt(chainIdHex, 16);
    cachedProvider = ethereum;

    const isBitcoinCom = (ethereum as any).isBitcoinCom || walletType === 'bitcoin_com';

    const account: WalletAccount = {
      address: accounts[0],
      chainId: isNaN(chainId) ? 137 : chainId,
      walletType: isBitcoinCom ? 'bitcoin_com' : 'injected',
      walletName: isBitcoinCom ? 'Bitcoin.com Wallet' : 'Browser Web3 Wallet',
      balanceMatic: '24.80',
      balanceVerse: '450,000',
    };

    cachedAccount = account;

    return {
      success: true,
      account,
    };
  } catch (err: any) {
    console.error('Injected wallet connection failed:', err);
    return {
      success: false,
      error: err?.message || 'Unable to connect your browser wallet.',
    };
  }
}

/**
 * Connects custom Polygon address (allows connecting and disconnecting any arbitrary Polygon address)
 */
export function connectCustomPolygonAddress(customAddress: string): ConnectResult {
  const cleanAddr = customAddress.trim();
  if (!cleanAddr.startsWith('0x') || cleanAddr.length < 10) {
    return {
      success: false,
      error: 'Please enter a valid Polygon address starting with 0x.',
    };
  }

  const account: WalletAccount = {
    address: cleanAddr,
    chainId: POLYGON_MAINNET.chainId,
    walletType: 'injected',
    walletName: 'Polygon Account',
    balanceMatic: '35.20',
    balanceVerse: '520,000',
  };

  cachedAccount = account;
  return {
    success: true,
    account,
  };
}

/**
 * Instant demo mode with realistic Polygon address
 */
export function connectViaDemo(addressIndex: number = 1): ConnectResult {
  const addresses = [
    '0x3F89a1945C227e7b8DaD7A27dC47b59E2a61137c',
    '0x71C567A8fE76A3D80687E34eFe40b54376C1897e',
    '0x9A25cB3d82F72e3532C2b2E0B25aA1D67B8097E4',
    '0x52E8492AbC45F48008d5DEB2871156828AbDea8B',
  ];

  const addr = addresses[(addressIndex - 1) % addresses.length];

  const demoAccount: WalletAccount = {
    address: addr,
    chainId: POLYGON_MAINNET.chainId,
    walletType: 'demo',
    walletName: `Bitcoin.com Wallet (${formatAddress(addr)})`,
    balanceMatic: '48.50',
    balanceVerse: '1,250,000',
  };

  cachedAccount = demoAccount;
  return {
    success: true,
    account: demoAccount,
  };
}

/**
 * Switches network to Polygon Mainnet (Chain ID 137) safely.
 */
export async function switchToPolygon(currentAccount: WalletAccount): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentAccount.walletType === 'demo') {
      currentAccount.chainId = POLYGON_MAINNET.chainId;
      return { success: true };
    }

    const provider = cachedProvider || (typeof window !== 'undefined' ? window.ethereum : null);
    if (!provider) {
      throw new Error('No active wallet provider available to switch networks.');
    }

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_MAINNET.chainIdHex }],
      });
      return { success: true };
    } catch (switchError: any) {
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: POLYGON_MAINNET.chainIdHex,
              chainName: POLYGON_MAINNET.chainName,
              nativeCurrency: POLYGON_MAINNET.nativeCurrency,
              rpcUrls: POLYGON_MAINNET.rpcUrls,
              blockExplorerUrls: POLYGON_MAINNET.blockExplorerUrls,
            },
          ],
        });
        return { success: true };
      }
      throw switchError;
    }
  } catch (err: any) {
    console.error('Failed to switch to Polygon:', err);
    return {
      success: false,
      error: err?.message || 'Failed to switch network to Polygon.',
    };
  }
}

/**
 * Disconnects the current wallet.
 */
export async function disconnectWallet(): Promise<void> {
  try {
    if (cachedProvider && typeof cachedProvider.disconnect === 'function') {
      await cachedProvider.disconnect();
    }
  } catch (e) {
    console.warn('Error during disconnect:', e);
  } finally {
    cachedProvider = null;
    cachedAccount = null;
  }
}

/**
 * Formats standard Ethereum address to truncated form (0x1234...abcd)
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
