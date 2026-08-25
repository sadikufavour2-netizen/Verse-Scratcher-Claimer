import { WalletAccount, WalletType, POLYGON_MAINNET } from '../types';

let cachedProvider: any = null;
let cachedAccount: WalletAccount | null = null;

export interface ConnectResult {
  success: boolean;
  account?: WalletAccount;
  error?: string;
  isConfigurationMissing?: boolean;
}

/**
 * Checks if VITE_WALLETCONNECT_PROJECT_ID exists without crashing.
 */
export function getWalletConnectProjectId(): string | undefined {
  try {
    const id = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
    if (typeof id === 'string' && id.trim().length > 0) {
      return id.trim();
    }
  } catch (e) {
    console.warn('Unable to read VITE_WALLETCONNECT_PROJECT_ID', e);
  }
  return undefined;
}

/**
 * Lazy loads and initializes WalletConnect ONLY when explicitly called by user click.
 * No top-level instantiation.
 */
export async function connectViaWalletConnect(): Promise<ConnectResult> {
  const projectId = getWalletConnectProjectId();

  if (!projectId) {
    return {
      success: false,
      isConfigurationMissing: true,
      error: 'Wallet connection is not configured.',
    };
  }

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
        explorerRecommendedWalletIds: [
          // Bitcoin.com Wallet
          'b182875b28292c3065b2fa011a684b067a9cf71fbf9df46ff629c4ef6996d9f8',
        ],
      },
      metadata: {
        name: 'Verse Scratcher Claimer',
        description: 'Claim and scratch Verse Scratcher NFTs on Polygon',
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
      walletName: 'WalletConnect (Bitcoin.com)',
      balanceMatic: '12.45',
      balanceVerse: '185,420',
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
 * Connects to Bitcoin.com Wallet / Injected Browser Extension (MetaMask, Bitcoin.com, etc.)
 * Only accesses window.ethereum after user click.
 */
export async function connectViaInjected(walletType: WalletType = 'injected'): Promise<ConnectResult> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return {
        success: false,
        error: 'No browser wallet detected. Please install the Bitcoin.com Wallet or MetaMask extension, or use WalletConnect.',
      };
    }

    const ethereum = window.ethereum;
    
    // Request accounts safely
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
      walletName: isBitcoinCom ? 'Bitcoin.com Wallet' : 'Browser Wallet',
      balanceMatic: '24.80',
      balanceVerse: '350,000',
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
 * Connects to a simulated Polygon Verse wallet for preview testing
 * when running in sandboxed environment.
 */
export function connectViaDemo(): ConnectResult {
  const demoAccount: WalletAccount = {
    address: '0x3F89a1945C227e7b8DaD7A27dC47b59E2a61137c',
    chainId: POLYGON_MAINNET.chainId,
    walletType: 'demo',
    walletName: 'Bitcoin.com Wallet (Demo Mode)',
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
      // Error code 4902 means the chain has not been added to the wallet
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
 * Disconnects the wallet.
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
