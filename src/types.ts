export type ConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'WRONG_NETWORK'
  | 'ERROR';

export type WalletType =
  | 'bitcoin_com'
  | 'walletconnect'
  | 'injected'
  | 'demo';

export interface WalletAccount {
  address: string;
  chainId: number;
  walletType: WalletType;
  walletName: string;
  balanceMatic?: string;
  balanceVerse?: string;
}

export interface PrizeItem {
  symbol: string;
  label: string;
  amount: number;
  token: 'VERSE' | 'MATIC' | 'USDT';
  matched: boolean;
}

export interface ScratcherTicket {
  id: string;
  tokenId: number;
  title: string;
  series: 'Lunar Fortune' | 'Golden Ticket' | 'Neon Cyber' | 'Diamond Verse';
  edition: string;
  imageTheme: 'gold' | 'neon' | 'cyan' | 'purple';
  status: 'unscratched' | 'scratched' | 'claimed';
  scratchPercentage: number;
  winningPrizes: PrizeItem[];
  totalVerseValue: number;
  totalMaticValue: number;
  mintDate: string;
  claimTxHash?: string;
  claimTimestamp?: string;
  isWinningTicket: boolean;
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
  ],
  blockExplorerUrls: ['https://polygonscan.com'],
};
