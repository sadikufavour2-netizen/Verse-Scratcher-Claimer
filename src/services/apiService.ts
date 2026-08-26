import {
  AdminOverviewResponse,
  AllocationRecord,
  ClaimEventLog,
  RegisteredUser,
  ScratcherTicket,
  ScratcherVaultInventory,
  UserProfileResponse,
} from '../types';

export async function registerUserApi(
  telegramUsername: string,
  walletAddress: string
): Promise<UserProfileResponse> {
  const res = await fetch('/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramUsername, walletAddress }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to register Telegram & Wallet');
  }

  return res.json();
}

export async function getUserProfileApi(identifier: string): Promise<UserProfileResponse> {
  const res = await fetch(`/api/users/profile/${encodeURIComponent(identifier)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch user profile');
  }
  return res.json();
}

export async function claimUserScratchersApi(
  telegramUsername: string,
  walletAddress: string,
  allocationId?: string,
  clientTxHash?: string
): Promise<{
  success: boolean;
  message: string;
  claimedAmount: number;
  txHash: string;
  tickets: ScratcherTicket[];
  allUserTickets: ScratcherTicket[];
}> {
  const res = await fetch('/api/users/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramUsername, walletAddress, allocationId, clientTxHash }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to claim approved scratchers');
  }

  return res.json();
}

export async function getAdminOverviewApi(): Promise<AdminOverviewResponse> {
  const res = await fetch('/api/admin/overview');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch admin overview');
  }
  return res.json();
}

export async function setAdminWalletApi(walletAddress: string): Promise<{ success: boolean; adminWallet: string }> {
  const res = await fetch('/api/admin/wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress }),
  });
  if (!res.ok) {
    throw new Error('Failed to update admin wallet');
  }
  return res.json();
}

export async function batchAllocateApi(
  items: { username: string; amount: number; tier?: string }[],
  tier: string,
  adminWalletAddress?: string
): Promise<{
  success: boolean;
  message: string;
  allocations: AllocationRecord[];
  inventory: ScratcherVaultInventory;
  users: RegisteredUser[];
}> {
  const res = await fetch('/api/admin/allocate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, tier, adminWalletAddress }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to allocate scratchers');
  }

  return res.json();
}

export async function addVaultInventoryApi(
  amount: number,
  tier: string = 'grand'
): Promise<{
  success: boolean;
  message: string;
  inventory: ScratcherVaultInventory;
}> {
  const res = await fetch('/api/admin/inventory/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, tier }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to replenish vault inventory');
  }

  return res.json();
}

export async function updateTicketStatusApi(
  walletAddress: string,
  ticketId: string,
  status: 'unscratched' | 'scratched' | 'claimed',
  scratchPercentage?: number
): Promise<void> {
  try {
    await fetch('/api/tickets/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, ticketId, status, scratchPercentage }),
    });
  } catch (err) {
    console.error('Error updating ticket status:', err);
  }
}
