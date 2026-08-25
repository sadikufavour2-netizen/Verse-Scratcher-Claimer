export type ConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'WRONG_NETWORK'
  | 'ERROR';

export type WalletType =
  | 'bitcoin_com'
  | 'walletconnect'
  | 'injected';

export interface WalletAccount {
  address: string;
  chainId: number;
  walletType: WalletType;
  walletName: string;
  balanceMatic?: string; // Formatted display e.g. "1.2345" or "0.0000" or "Loading..." or "Error"
  balanceVerse?: string; // Formatted display e.g. "50,000" or "0" or "Loading..." or "Error"
  balanceMaticRaw?: bigint;
  balanceVerseRaw?: bigint;
  balanceVerseError?: string | null;
  balanceMaticError?: string | null;
}

export interface PrizeItem {
  symbol: string;
  label: string;
  amount: number;
  token: 'VERSE' | 'POL' | 'MATIC';
  matched: boolean;
}

export interface ScratcherTicket {
  id: string;
  tokenId: number;
  contractAddress: string;
  title: string;
  series: string;
  edition: string;
  description?: string;
  imageUrl?: string;
  imageTheme: 'gold' | 'neon' | 'cyan' | 'purple';
  status: 'unscratched' | 'scratched' | 'claimed';
  scratchPercentage: number;
  winningPrizes: PrizeItem[];
  totalVerseValue: number;
  totalMaticValue: number;
  mintDate?: string;
  claimTxHash?: string;
  claimTimestamp?: string;
  isWinningTicket: boolean;
  ownerAddress?: string;
  metadataUri?: string;
}

export interface NetworkConfig {
  chainId: number;
  chainIdHex: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export const POLYGON_MAINNET: NetworkConfig = {
  chainId: 137,
  chainIdHex: '0x89',
  chainName: 'Polygon Mainnet',
  nativeCurrency: {
    name: 'Polygon Ecosystem Token',
    symbol: 'POL',
    decimals: 18,
  },
  rpcUrls: [
    'https://polygon-rpc.com',
    'https://rpc-mainnet.maticvigil.com',
    'https://polygon.llamarpc.com',
    'https://1rpc.io/matic',
    'https://polygon-bor-rpc.publicnode.com',
  ],
  blockExplorerUrls: ['https://polygonscan.com'],
};
