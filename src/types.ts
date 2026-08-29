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
  balanceVerse?: string; // Formatted display e.g. "50,000" or "0" or "Loading..." or "Unable to load VERSE balance"
  balanceMaticRaw?: bigint;
  balanceVerseRaw?: bigint;
  balanceVerseError?: string | null;
  balanceMaticError?: string | null;
  balanceVerseEthereum?: string | null;
  balanceVerseNetworkNote?: string | null;
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

export interface RegisteredUser {
  id: string;
  telegramUsername: string; // e.g. "@username"
  walletAddress: string | null; // EVM address or null if not yet connected
  registeredAt: string;
  lastActiveAt: string;
  totalAllocated: number;
  totalClaimed: number;
  pendingClaim: number;
}

export type ScratcherTierType = 'grand' | 'mega' | 'lucky' | 'mini';

export interface ScratcherVaultInventory {
  totalInVault: number;
  allocatedCount: number;
  claimedCount: number;
  adminWalletAddress: string | null;
  tiers: {
    grand: number; // 8,000,000 VERSE Max
    mega: number;  // 1,000,000 VERSE Max
    lucky: number; // 250,000 VERSE Max
    mini: number;  // 50,000 VERSE Max
  };
}

export interface AllocationRecord {
  id: string;
  telegramUsername: string;
  walletAddress: string;
  amount: number;
  tier: ScratcherTierType | 'mixed';
  status: 'APPROVED' | 'CLAIMED' | 'PARTIALLY_CLAIMED';
  approvedAt: string;
  claimedAt?: string | null;
  allocatedByAdminWallet?: string | null;
  ticketIds: string[];
}

export interface ClaimEventLog {
  id: string;
  telegramUsername: string;
  walletAddress: string;
  amount: number;
  claimedAt: string;
  txHash: string;
  tier: string;
}

export interface AdminOverviewResponse {
  inventory: ScratcherVaultInventory;
  users: RegisteredUser[];
  allocations: AllocationRecord[];
  claims: ClaimEventLog[];
  adminWallet: string | null;
}

export interface UserProfileResponse {
  success?: boolean;
  user: RegisteredUser | null;
  pendingAllocations: AllocationRecord[];
  allocations?: AllocationRecord[];
  claimableScratchersCount: number;
  activeScratchers: ScratcherTicket[];
  tickets?: any[];
  claimsHistory: ClaimEventLog[];
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
