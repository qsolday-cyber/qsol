// qSOL — app configuration. Everything the UI enforces lives here.
// DEVNET ONLY. Do not point this at mainnet without a security review.

export const CLUSTER = "devnet" as const;
export const RPC_URL = "https://api.devnet.solana.com";
export const WS_URL = "wss://api.devnet.solana.com";

/** Our own deployment of the Winterwallet program (see ../NOTES.md). Pinned; must match the WASM module. */
export const PROGRAM_ID = "BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r";

export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export type SolAsset = {
  kind: "sol";
  symbol: "SOL";
  name: string;
  decimals: 9;
};
export type TokenAsset = {
  kind: "token";
  symbol: string;
  name: string;
  mint: string;
  tokenProgram: string;
  decimals: number;
};
export type Asset = SolAsset | TokenAsset;

/**
 * Asset allowlist. Only these can be deposited or withdrawn through the UI.
 * `depositCapUi` is the per-vault cap in UI units — the "10 SOL equivalent"
 * placeholder from the spec, expressed per asset because the app has no price
 * feed (static hosting, no backend). Adjust before launch.
 */
export const ASSETS: ReadonlyArray<Asset & { depositCapUi: string }> = [
  {
    kind: "sol",
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    depositCapUi: "10",
  },
  {
    kind: "token",
    symbol: "USDC",
    name: "USD Coin (Circle devnet)",
    mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    tokenProgram: TOKEN_PROGRAM,
    decimals: 6,
    depositCapUi: "2000",
  },
  {
    kind: "token",
    symbol: "qSOL",
    name: "Quantum Sol (devnet test mint)",
    mint: "5f1hpSQxFEaK3RqmASoEer3tBuYN5G8zCVSbFEt9NHEh",
    tokenProgram: TOKEN_PROGRAM,
    decimals: 6,
    depositCapUi: "10000",
  },
  // Token-2022 test mint, dev builds only, to exercise the Token-2022 code path.
  ...(import.meta.env.DEV
    ? [
        {
          kind: "token" as const,
          symbol: "qSOL-22",
          name: "Token-2022 test mint (dev builds only)",
          mint: "FoBRXJQdKQSxWWD8tiEu9c3BoPyyLLpveBaD7JsfcNHt",
          tokenProgram: TOKEN_2022_PROGRAM,
          decimals: 6,
          depositCapUi: "10000",
        },
      ]
    : []),
];

/** Withdrawal fee in basis points, paid from the vault to TREASURY inside the same signed withdrawal. */
export const FEE_BPS = 30n; // 0.30 %

/** Treasury that receives withdrawal fees. PLACEHOLDER: the devnet deploy wallet. */
export const TREASURY = "5XrgFMT8bjahGeuNApd5mWVvBUiDcdNCT7fWk6cP33Hg";

/** How many key positions `recover_position` scans before giving up. */
export const RECOVERY_MAX_DEPTH = 10_000;

/** Size of the on-chain vault account (id 32 + root 32 + bump 1). */
export const VAULT_ACCOUNT_LEN = 65n;

export const EXPLORER = {
  tx: (sig: string) =>
    `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`,
  address: (a: string) =>
    `https://explorer.solana.com/address/${a}?cluster=${CLUSTER}`,
};

/** Dev-only in-browser test wallet (never in production builds). Enable with VITE_DEV_WALLET=1. */
export const DEV_WALLET_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_DEV_WALLET === "1";
