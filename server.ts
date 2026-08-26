import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface StoredRegisteredUser {
  id: string;
  telegramUsername: string;
  walletAddress: string;
  registeredAt: string;
  lastActiveAt: string;
  totalAllocated: number;
  totalClaimed: number;
  pendingClaim: number;
}

interface StoredAllocation {
  id: string;
  telegramUsername: string;
  walletAddress: string;
  amount: number;
  tier: 'grand' | 'mega' | 'lucky' | 'mini' | 'mixed';
  status: 'APPROVED' | 'CLAIMED' | 'PARTIALLY_CLAIMED';
  approvedAt: string;
  claimedAt: string | null;
  allocatedByAdminWallet: string | null;
  ticketIds: string[];
}

interface StoredClaimEvent {
  id: string;
  allocationId: string;
  telegramUsername: string;
  walletAddress: string;
  amount: number;
  claimedAt: string;
  txHash: string;
  tier: string;
}

interface StoredScratcher {
  id: string;
  tokenId: number;
  contractAddress: string;
  title: string;
  series: string;
  edition: string;
  description: string;
  imageTheme: 'gold' | 'neon' | 'cyan' | 'purple';
  status: 'unscratched' | 'scratched' | 'claimed';
  scratchPercentage: number;
  winningPrizes: {
    symbol: string;
    label: string;
    amount: number;
    token: 'VERSE' | 'POL' | 'MATIC';
    matched: boolean;
  }[];
  totalVerseValue: number;
  totalMaticValue: number;
  isWinningTicket: boolean;
  ownerAddress: string;
  ownerTelegram: string;
  mintDate: string;
}

interface DatabaseState {
  adminWallet: string | null;
  vaultInventory: {
    totalInVault: number;
    allocatedCount: number;
    claimedCount: number;
    tiers: {
      grand: number;
      mega: number;
      lucky: number;
      mini: number;
    };
  };
  users: Record<string, StoredRegisteredUser>; // keyed by normalized telegram or wallet
  allocations: StoredAllocation[];
  claims: StoredClaimEvent[];
  userTickets: Record<string, StoredScratcher[]>; // keyed by walletAddress
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

// Initial clean state with zero fake data
const INITIAL_STATE: DatabaseState = {
  adminWallet: null,
  vaultInventory: {
    totalInVault: 0,
    allocatedCount: 0,
    claimedCount: 0,
    tiers: {
      grand: 0,
      mega: 0,
      lucky: 0,
      mini: 0,
    },
  },
  users: {},
  allocations: [],
  claims: [],
  userTickets: {},
};

// Helper to load/save state
function loadDatabase(): DatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading database file, using memory fallback:", err);
  }
  return JSON.parse(JSON.stringify(INITIAL_STATE));
}

let dbState: DatabaseState = loadDatabase();

function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

function normalizeTelegram(handle: string): string {
  if (!handle) return "";
  let clean = handle.trim();
  if (!clean.startsWith("@")) {
    clean = "@" + clean;
  }
  return clean.toLowerCase();
}

function normalizeAddress(addr: string): string {
  if (!addr) return "";
  return addr.trim().toLowerCase();
}

// Generate realistic Verse Scratchers with winning probabilities
function generateScratchersForClaim(
  amount: number,
  tier: string,
  userAddress: string,
  userTelegram: string
): StoredScratcher[] {
  const tickets: StoredScratcher[] = [];
  const tierConfig = {
    grand: { title: "Verse 8,000,000 Grand Scratcher", max: 8000000, theme: "gold" as const, series: "Series VIII Gold" },
    mega: { title: "Verse 1,000,000 Mega Scratcher", max: 1000000, theme: "neon" as const, series: "Series VI Neon" },
    lucky: { title: "Verse 250,000 Lucky Scratcher", max: 250000, theme: "cyan" as const, series: "Series IV Cyan" },
    mini: { title: "Verse 50,000 Mini Scratcher", max: 50000, theme: "purple" as const, series: "Series II Purple" },
  };

  const selectedTier = (tierConfig as any)[tier] || tierConfig.grand;

  for (let i = 0; i < amount; i++) {
    const tokenId = Math.floor(10000 + Math.random() * 90000);
    const id = `verse_nft_${tokenId}_${Date.now()}_${i}`;
    const isWinner = Math.random() < 0.75; // 75% winning chance on approved drop

    const possiblePrizes = [
      { symbol: "🪙", label: "5,000 VERSE", amount: 5000, token: "VERSE" as const },
      { symbol: "💎", label: "25,000 VERSE", amount: 25000, token: "VERSE" as const },
      { symbol: "👑", label: "100,000 VERSE", amount: 100000, token: "VERSE" as const },
      { symbol: "⚡", label: "500,000 VERSE", amount: 50000, token: "VERSE" as const },
      { symbol: "🔥", label: "1,000,000 VERSE", amount: 1000000, token: "VERSE" as const },
      { symbol: "🌟", label: "8,000,000 VERSE", amount: 8000000, token: "VERSE" as const },
      { symbol: "🍀", label: "10 POL", amount: 10, token: "POL" as const },
    ];

    let winningPrizes: any[] = [];
    let totalVerseValue = 0;
    let totalMaticValue = 0;

    if (isWinner) {
      // Pick 1-3 matching prizes
      const mainPrize = tier === "grand" && Math.random() < 0.15
        ? possiblePrizes[5] // 8,000,000 VERSE
        : tier === "mega" && Math.random() < 0.25
        ? possiblePrizes[4] // 1,000,000 VERSE
        : possiblePrizes[Math.floor(Math.random() * 4)];

      winningPrizes = [
        { ...mainPrize, matched: true },
        { ...mainPrize, matched: true },
        { ...mainPrize, matched: true },
        { symbol: "⭐", label: "Try Again", amount: 0, token: "VERSE" as const, matched: false },
        { symbol: "🚀", label: "Bonus", amount: 0, token: "VERSE" as const, matched: false },
        { symbol: "🎯", label: "Lucky", amount: 0, token: "VERSE" as const, matched: false },
      ];

      if (mainPrize.token === "VERSE") totalVerseValue = mainPrize.amount;
      if (mainPrize.token === "POL") totalMaticValue = mainPrize.amount;
    } else {
      winningPrizes = [
        { symbol: "🪙", label: "5,000 VERSE", amount: 5000, token: "VERSE" as const, matched: false },
        { symbol: "💎", label: "25,000 VERSE", amount: 25000, token: "VERSE" as const, matched: false },
        { symbol: "👑", label: "100,000 VERSE", amount: 100000, token: "VERSE" as const, matched: false },
        { symbol: "⚡", label: "Try Again", amount: 0, token: "VERSE" as const, matched: false },
        { symbol: "🌟", label: "Try Again", amount: 0, token: "VERSE" as const, matched: false },
        { symbol: "🎯", label: "Try Again", amount: 0, token: "VERSE" as const, matched: false },
      ];
    }

    tickets.push({
      id,
      tokenId,
      contractAddress: "0x25aC84511dC02f0a149E0c2CebB4307a50567fF6",
      title: selectedTier.title,
      series: selectedTier.series,
      edition: `Edition #${tokenId}`,
      description: `Official Verse Polygon Scratch Ticket allocated to ${userTelegram}`,
      imageTheme: selectedTier.theme,
      status: "unscratched",
      scratchPercentage: 0,
      winningPrizes,
      totalVerseValue,
      totalMaticValue,
      isWinningTicket: isWinner,
      ownerAddress: userAddress,
      ownerTelegram: userTelegram,
      mintDate: new Date().toISOString(),
    });
  }

  return tickets;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API 1: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API 2: Register / Connect User (Telegram + Wallet Address)
  app.post("/api/users/register", (req, res) => {
    const { telegramUsername, walletAddress } = req.body;
    if (!telegramUsername && !walletAddress) {
      return res.status(400).json({ error: "Telegram username or wallet address is required" });
    }

    const normTelegram = telegramUsername ? normalizeTelegram(telegramUsername) : "";
    const normAddress = walletAddress ? normalizeAddress(walletAddress) : "";

    let existingUserKey = Object.keys(dbState.users).find(
      (k) =>
        (normTelegram && normalizeTelegram(dbState.users[k].telegramUsername) === normTelegram) ||
        (normAddress && normalizeAddress(dbState.users[k].walletAddress) === normAddress)
    );

    let user: StoredRegisteredUser;

    // Calculate total allocated / claimed / pending for this user across allocations
    const userAllocations = dbState.allocations.filter(
      (a) =>
        (normTelegram && normalizeTelegram(a.telegramUsername) === normTelegram) ||
        (normAddress && normalizeAddress(a.walletAddress) === normAddress)
    );

    const totalAllocated = userAllocations.reduce((sum, a) => sum + a.amount, 0);
    const totalClaimed = userAllocations
      .filter((a) => a.status === "CLAIMED")
      .reduce((sum, a) => sum + a.amount, 0);
    const pendingClaim = userAllocations
      .filter((a) => a.status === "APPROVED")
      .reduce((sum, a) => sum + a.amount, 0);

    const finalTelegram = normTelegram || (existingUserKey ? dbState.users[existingUserKey].telegramUsername : "");
    const finalAddress = walletAddress || (existingUserKey ? dbState.users[existingUserKey].walletAddress : "");

    if (existingUserKey && dbState.users[existingUserKey]) {
      user = {
        ...dbState.users[existingUserKey],
        telegramUsername: finalTelegram,
        walletAddress: finalAddress,
        lastActiveAt: new Date().toISOString(),
        totalAllocated: Math.max(dbState.users[existingUserKey].totalAllocated, totalAllocated),
        totalClaimed: Math.max(dbState.users[existingUserKey].totalClaimed, totalClaimed),
        pendingClaim,
      };
      dbState.users[existingUserKey] = user;
    } else {
      user = {
        id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        telegramUsername: finalTelegram,
        walletAddress: finalAddress,
        registeredAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        totalAllocated,
        totalClaimed,
        pendingClaim,
      };
      const key = finalTelegram || finalAddress || `usr_${Date.now()}`;
      dbState.users[key] = user;
    }

    // Also link any existing allocations for this telegram handle to the wallet address
    if (finalAddress && finalTelegram) {
      dbState.allocations.forEach((alloc) => {
        if (normalizeTelegram(alloc.telegramUsername) === finalTelegram) {
          alloc.walletAddress = finalAddress;
        }
      });
    }

    saveDatabase();

    const pendingAllocations = dbState.allocations.filter(
      (a) =>
        ((finalTelegram && normalizeTelegram(a.telegramUsername) === finalTelegram) ||
          (normAddress && normalizeAddress(a.walletAddress) === normAddress)) &&
        a.status === "APPROVED"
    );

    const activeScratchers = normAddress ? dbState.userTickets[normAddress] || [] : [];

    res.json({
      success: true,
      user,
      pendingAllocations,
      claimableScratchersCount: pendingClaim,
      activeScratchers,
    });
  });

  // API 3: Get User Profile & Allocations
  app.get("/api/users/profile/:identifier", (req, res) => {
    const identifier = req.params.identifier;
    if (!identifier) {
      return res.status(400).json({ error: "Identifier required" });
    }

    const normTelegram = normalizeTelegram(identifier);
    const normAddress = normalizeAddress(identifier);

    const userKey = Object.keys(dbState.users).find(
      (k) =>
        normalizeTelegram(dbState.users[k].telegramUsername) === normTelegram ||
        normalizeAddress(dbState.users[k].walletAddress) === normAddress
    );

    const user = userKey ? dbState.users[userKey] : null;

    const userAllocations = dbState.allocations.filter((a) => {
      const matchTelegram = normTelegram && normalizeTelegram(a.telegramUsername) === normTelegram;
      const matchAddress = normAddress && normalizeAddress(a.walletAddress) === normAddress;
      return matchTelegram || matchAddress;
    });

    const pendingAllocations = userAllocations.filter((a) => a.status === "APPROVED");
    const claimableScratchersCount = pendingAllocations.reduce((sum, a) => sum + a.amount, 0);

    const activeScratchers = normAddress ? dbState.userTickets[normAddress] || [] : [];
    const claimsHistory = dbState.claims.filter(
      (c) =>
        (normTelegram && normalizeTelegram(c.telegramUsername) === normTelegram) ||
        (normAddress && normalizeAddress(c.walletAddress) === normAddress)
    );

    res.json({
      user,
      pendingAllocations,
      claimableScratchersCount,
      activeScratchers,
      claimsHistory,
    });
  });

  // API 4: User Claim Scratchers Allocated by Admin
  app.post("/api/users/claim", (req, res) => {
    const { telegramUsername, walletAddress, allocationId, clientTxHash } = req.body;
    if (!telegramUsername || !walletAddress) {
      return res.status(400).json({ error: "Telegram handle and wallet address required" });
    }

    const normTelegram = normalizeTelegram(telegramUsername);
    const normAddress = normalizeAddress(walletAddress);

    // Find eligible approved allocations for this user
    let eligibleAllocations = dbState.allocations.filter((a) => {
      const matchUser =
        normalizeTelegram(a.telegramUsername) === normTelegram ||
        normalizeAddress(a.walletAddress) === normAddress;
      const matchStatus = a.status === "APPROVED";
      if (allocationId) {
        return a.id === allocationId && matchUser && matchStatus;
      }
      return matchUser && matchStatus;
    });

    if (eligibleAllocations.length === 0) {
      return res.status(400).json({
        error: "No scratchers to claim",
      });
    }

    let totalClaimedAmount = 0;
    const generatedTickets: StoredScratcher[] = [];
    const txHash =
      clientTxHash && clientTxHash.startsWith("0x") && clientTxHash.length >= 42
        ? clientTxHash
        : "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

    eligibleAllocations.forEach((alloc) => {
      const count = alloc.amount;
      totalClaimedAmount += count;

      // Generate the tickets for user
      const tickets = generateScratchersForClaim(count, alloc.tier, walletAddress, normTelegram);
      generatedTickets.push(...tickets);

      // Mark allocation as CLAIMED and record deduction
      alloc.status = "CLAIMED";
      alloc.claimedAt = new Date().toISOString();
      alloc.walletAddress = walletAddress;
      alloc.ticketIds = tickets.map((t) => t.id);

      // Record claim event in audit log
      dbState.claims.unshift({
        id: `claim_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        allocationId: alloc.id,
        telegramUsername: normTelegram,
        walletAddress: walletAddress,
        amount: count,
        claimedAt: new Date().toISOString(),
        txHash,
        tier: alloc.tier,
      });

      // Deduct from Admin Vault inventory
      dbState.vaultInventory.allocatedCount = Math.max(
        0,
        dbState.vaultInventory.allocatedCount - count
      );
      dbState.vaultInventory.claimedCount += count;
    });

    // Save tickets to user's collection
    if (!dbState.userTickets[normAddress]) {
      dbState.userTickets[normAddress] = [];
    }
    dbState.userTickets[normAddress].push(...generatedTickets);

    // Update user stats
    const userKey = Object.keys(dbState.users).find(
      (k) =>
        normalizeTelegram(dbState.users[k].telegramUsername) === normTelegram ||
        normalizeAddress(dbState.users[k].walletAddress) === normAddress
    );

    if (userKey && dbState.users[userKey]) {
      dbState.users[userKey].totalClaimed += totalClaimedAmount;
      dbState.users[userKey].pendingClaim = Math.max(0, dbState.users[userKey].pendingClaim - totalClaimedAmount);
      dbState.users[userKey].lastActiveAt = new Date().toISOString();
    }

    saveDatabase();

    res.json({
      success: true,
      message: `Successfully claimed ${totalClaimedAmount} Verse Scratchers! Deducted from admin allocation.`,
      claimedAmount: totalClaimedAmount,
      txHash,
      tickets: generatedTickets,
      allUserTickets: dbState.userTickets[normAddress],
    });
  });

  // API 5: Admin Overview (Dashboard, Inventory, Users, Allocations, Claims)
  app.get("/api/admin/overview", (req, res) => {
    res.json({
      inventory: dbState.vaultInventory,
      users: Object.values(dbState.users),
      allocations: dbState.allocations,
      claims: dbState.claims,
      adminWallet: dbState.adminWallet,
    });
  });

  // API 6: Admin Connects / Sets Wallet
  app.post("/api/admin/wallet", (req, res) => {
    const { walletAddress } = req.body;
    if (walletAddress) {
      dbState.adminWallet = walletAddress;
      saveDatabase();
    }
    res.json({ success: true, adminWallet: dbState.adminWallet });
  });

  // API 7: Admin Batch Allocation of Scratchers to Telegram Usernames
  app.post("/api/admin/allocate", (req, res) => {
    const { items, tier = "grand", adminWalletAddress } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array with telegram handles & counts is required" });
    }

    if (adminWalletAddress) {
      dbState.adminWallet = adminWalletAddress;
    }

    let totalRequested = 0;
    const sanitizedItems: { username: string; amount: number; tier: any }[] = [];

    for (const item of items) {
      const username = normalizeTelegram(item.username || item.telegramUsername);
      const amount = parseInt(item.amount, 10);
      if (!username || isNaN(amount) || amount <= 0) continue;
      const itemTier = item.tier || tier;
      sanitizedItems.push({ username, amount, tier: itemTier });
      totalRequested += amount;
    }

    if (sanitizedItems.length === 0) {
      return res.status(400).json({ error: "No valid username and scratcher amount pairs found" });
    }

    const availableToAllocate = dbState.vaultInventory.totalInVault - dbState.vaultInventory.allocatedCount - dbState.vaultInventory.claimedCount;
    if (totalRequested > availableToAllocate) {
      // Auto-mint needed supply for the vault so admin dispatch is seamless
      const needed = totalRequested - Math.max(0, availableToAllocate);
      dbState.vaultInventory.totalInVault += needed;
      const t = (tier as 'grand' | 'mega' | 'lucky' | 'mini') || 'grand';
      if (dbState.vaultInventory.tiers[t] !== undefined) {
        dbState.vaultInventory.tiers[t] += needed;
      }
    }

    const newAllocations: StoredAllocation[] = [];

    for (const item of sanitizedItems) {
      // Check if user is registered in db
      const existingUserKey = Object.keys(dbState.users).find(
        (k) => normalizeTelegram(dbState.users[k].telegramUsername) === item.username
      );

      const walletAddr = existingUserKey ? dbState.users[existingUserKey].walletAddress : "";

      const alloc: StoredAllocation = {
        id: `alloc_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        telegramUsername: item.username,
        walletAddress: walletAddr,
        amount: item.amount,
        tier: item.tier,
        status: "APPROVED",
        approvedAt: new Date().toISOString(),
        claimedAt: null,
        allocatedByAdminWallet: dbState.adminWallet,
        ticketIds: [],
      };

      dbState.allocations.unshift(alloc);
      newAllocations.push(alloc);

      // Update or create registered user stats
      if (existingUserKey && dbState.users[existingUserKey]) {
        dbState.users[existingUserKey].totalAllocated += item.amount;
        dbState.users[existingUserKey].pendingClaim += item.amount;
      } else {
        dbState.users[item.username] = {
          id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          telegramUsername: item.username,
          walletAddress: "",
          registeredAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          totalAllocated: item.amount,
          totalClaimed: 0,
          pendingClaim: item.amount,
        };
      }

      // Record in Admin Vault Inventory
      dbState.vaultInventory.allocatedCount += item.amount;
    }

    saveDatabase();

    res.json({
      success: true,
      message: `Successfully approved & allocated ${totalRequested} scratchers across ${sanitizedItems.length} Telegram users!`,
      allocations: newAllocations,
      inventory: dbState.vaultInventory,
      users: Object.values(dbState.users),
    });
  });

  // API 8: Admin Add / Replenish Vault Inventory
  app.post("/api/admin/inventory/add", (req, res) => {
    const { amount = 1000, tier = "grand" } = req.body;
    const addCount = parseInt(amount, 10);
    if (isNaN(addCount) || addCount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    dbState.vaultInventory.totalInVault += addCount;
    if (dbState.vaultInventory.tiers[tier as keyof typeof dbState.vaultInventory.tiers] !== undefined) {
      dbState.vaultInventory.tiers[tier as keyof typeof dbState.vaultInventory.tiers] += addCount;
    }

    saveDatabase();

    res.json({
      success: true,
      message: `Successfully added ${addCount} Scratchers to Admin Vault!`,
      inventory: dbState.vaultInventory,
    });
  });

  // API 9: Update ticket scratch state
  app.post("/api/tickets/update-status", (req, res) => {
    const { walletAddress, ticketId, status, scratchPercentage } = req.body;
    if (!walletAddress || !ticketId) {
      return res.status(400).json({ error: "walletAddress and ticketId required" });
    }

    const normAddress = normalizeAddress(walletAddress);
    const tickets = dbState.userTickets[normAddress] || [];
    const ticket = tickets.find((t) => t.id === ticketId);

    if (ticket) {
      if (status) ticket.status = status;
      if (typeof scratchPercentage === "number") ticket.scratchPercentage = scratchPercentage;
      saveDatabase();
      return res.json({ success: true, ticket });
    }

    res.json({ success: true });
  });

  // Vite middleware for development vs static in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
