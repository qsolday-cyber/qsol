/** Single source of truth for product naming. Change here, everything follows. */
export const BRAND = {
  name: "qSOL",
  console: "qsol/console",
  eyebrow: "SOLANA · QUANTUM-SAFE CUSTODY · DEVNET BETA",
  headline: ["THE VAULT", "THAT OUTLASTS", "Q-DAY."],
  tagline: "Quantum-safe custody on Solana.",
  description:
    "SOL, USDC and qSOL locked behind a Winternitz one-time signature — hash-based cryptography that a quantum computer running Shor's algorithm cannot forge. No ed25519 key can authorize a withdrawal. Every spend rotates to a fresh one-time key, verified on-chain by the Winterwallet program.",
  token: { symbol: "qSOL", name: "Quantum Sol" },
  network: "devnet",
} as const;
