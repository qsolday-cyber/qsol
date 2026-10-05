# qSOL — quantum-safe custody on Solana (devnet MVP)

**Devnet beta — not audited. Test tokens only.**

Live (devnet): **https://qsol.day** (fallback: https://qvault-two.vercel.app)

**qSOL** ("Quantum Sol") is a static web app where Solana users deposit SOL or SPL tokens (including the qSOL token itself) into a vault that can only be opened
with a hash-based, one-time (quantum-safe) signature derived from a 24-word **quantum note**. The UX
resembles Tornado Cash (deposit, save a note, withdraw with the note) but the goal is **signature
security, not privacy**: there is no mixing or anonymity of any kind — every deposit and withdrawal
is plainly visible on chain.

Built on [Winterwallet](https://github.com/blueshift-gg/winterwallet) (MIT): Winternitz one-time
signatures with BIP-39 key derivation, verified by an on-chain program. We run **our own instance**
of that program on devnet and reuse Winterwallet's `core` and `client` crates, compiled to
WebAssembly, for every cryptographic operation. This repository contains no custom cryptography.

| | |
|---|---|
| Program (our devnet deployment) | `BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r` |
| Cluster | devnet only |
| Note | 24 words (BIP-39 English), generated in the browser with `crypto.getRandomValues` |
| Signature | Winternitz, N=22 (+2 checksum), 768 bytes, SHA-256 chains |
| Withdrawal fee | 30 bps (0.3 %) to a treasury address, inside the same signed withdrawal |
| Deposit cap | per vault, per asset (placeholder "10 SOL equivalent") |

## How it works

1. **Deposit.** The browser generates a note, derives the vault address (a PDA of the note's
   position-0 public key root), forces a backup (download + re-type 3 random words), then sends one
   transaction that initialises the vault and deposits SOL (or two transactions for tokens: initialise,
   then create the vault's token account and transfer). Depositing is a plain transfer to the vault.
2. **Withdraw.** The user pastes the note. The app derives the vault, reads its on-chain root and
   **recovers the current key position** by scanning positions until the derived root matches. It
   shows balances; the user picks asset, amount and destination. The WASM module builds a
   Winterwallet `Advance` with two inner transfers (amount → destination, fee → treasury), signs it
   with the one-time key at that position (`sign_and_increment`), and the connected wallet pays the
   network fee. The program verifies the signature, stores the next position's root and runs the
   transfers. The vault address never changes; only the key rotates.
3. **One-time-key discipline.** A position must never sign two different messages. The app
   validates everything it can before signing, re-checks the on-chain position right before
   signing, persists every signed `Advance` in the browser **before** sending, and re-sends that
   exact instruction on retry (even after a reload) instead of signing again.

## Repository layout

```
winterwallet/   vendored Winterwallet (MIT). Only change: program ID in common/src/lib.rs + sdk/ts
wasm/           quantum-vault-wasm: thin wasm-bindgen wrapper over winterwallet core/client
wasm/test-page/ bare HTML harness + Node test proving byte-identical signatures vs the CLI
web/            the app (create-solana-dapp react-vite template, Vite + Tailwind + @solana/client)
web/src/wasm/   committed wasm-pack output used by the app (no Rust needed to build the site)
scripts/        scripts/m1-devnet.sh — CLI smoke test against our program on devnet
docs/           milestone run logs with transaction signatures
keys/           (gitignored) payer, program keypair, test notes
```

## Configuration

Product naming (app name, tagline, token symbol) lives in [`web/src/brand.ts`](web/src/brand.ts). All other knobs are in [`web/src/config.ts`](web/src/config.ts):

| constant | meaning |
|---|---|
| `PROGRAM_ID` | our Winterwallet program on devnet; must match the WASM module (vendored `common` crate) |
| `RPC_URL`, `WS_URL` | devnet RPC; also listed in the CSP (`vite.config.ts`, `vercel.json`) |
| `ASSETS` | allowlist: SOL, Circle devnet USDC, qSOL (devnet test mint `5f1hpSQxFEaK3RqmASoEer3tBuYN5G8zCVSbFEt9NHEh`, stand-in for the real qSOL); Token-2022 test mint in dev builds only. Each entry has `tokenProgram` (SPL Token or Token-2022), `decimals`, `depositCapUi` |
| `FEE_BPS` | withdrawal fee in basis points (default 30) |
| `TREASURY` | fee recipient (placeholder: the devnet deploy wallet). Its token accounts are created on demand by the withdrawing wallet if missing |
| `RECOVERY_MAX_DEPTH` | how many key positions to scan when recovering (10 000) |
| `DEV_WALLET_ENABLED` | `import.meta.env.DEV && VITE_DEV_WALLET === "1"`: registers an in-browser test wallet (never in production builds) |

## Setup

```bash
# 1. Web app (Node 20+; no Rust required — the WASM is committed)
cd web
npm install
cp .env.example .env.development.local   # set VITE_DEV_WALLET=1 to get an in-browser test wallet
npm run dev                               # http://localhost:5173
npm run build && npm run preview          # production build with the strict CSP, http://localhost:4173
```

```bash
# 2. Rebuilding the WASM module (only when winterwallet/ or wasm/ change)
rustup target add wasm32-unknown-unknown && cargo install wasm-pack
cd wasm
wasm-pack build --release --target web    --out-dir pkg
wasm-pack build --release --target nodejs --out-dir pkg-node        # for the Node test
cp pkg/quantum_vault_wasm.js pkg/quantum_vault_wasm.d.ts pkg/quantum_vault_wasm_bg.wasm pkg/quantum_vault_wasm_bg.wasm.d.ts ../web/src/wasm/
cd test-page && npm install && npm run test:cli-equivalence         # needs keys/vault-m1.json
```

```bash
# 3. Deploying your own program instance (optional; the app is pinned to ours)
solana-keygen new -o keys/program-devnet.json
# put the new pubkey in winterwallet/common/src/lib.rs (declare_id!) and winterwallet/sdk/ts/src/constants.ts,
# then: cargo test -p winterwallet-client --test regen -- --ignored   (regenerates golden fixtures)
cargo build-sbf --manifest-path winterwallet/program/Cargo.toml
solana program deploy winterwallet/target/deploy/winterwallet_program.so --program-id keys/program-devnet.json -u devnet
# rebuild the WASM (step 2) and set PROGRAM_ID in web/src/config.ts
```

## Deploy to Vercel

The site is fully static. `web/vercel.json` sets the build (`vite`), SPA rewrite and security headers
(the same CSP the build injects as a `<meta>` tag, plus `frame-ancestors 'none'`, HSTS, etc.).

```bash
cd web
npx vercel login            # once, in your own terminal
npm run deploy              # = scripts/deploy.sh: deploys a git-free copy to production
```

`npm run deploy` copies `web/` without `.git` before calling `vercel deploy --prod`. Vercel blocks CLI
deployments whose commit author is not a team member, and this repository's commits are authored by an
anonymous identity, so deploying straight from the checkout is refused.

Required Vercel settings when importing from Git: **Root Directory** `web`, framework **Vite**,
build command `npm run build`, output `dist`. No environment variables are needed for production
(`VITE_DEV_WALLET` must stay unset). The RPC endpoint is public devnet; swap `RPC_URL`/`WS_URL` and
the `connect-src` entries if you use a private RPC.

## Security notes (read before any mainnet consideration)

- Not audited. Winterwallet itself is not formally audited.
- The note is the only credential. The app never sees or stores it; losing it loses the funds.
- Position recovery scans linearly; a vault with thousands of withdrawals takes seconds to load.
- Every withdrawal must fit a legacy 1232-byte transaction: one `Advance` with two inner transfers
  fits; adding instructions to the same transaction generally does not.
- Token withdrawals use the plain `Transfer` instruction (not `TransferChecked`); mints with
  transfer-hook or transfer-fee extensions are not supported by this MVP.
- `style-src 'unsafe-inline'` is allowed in the CSP for Tailwind/Vite; scripts remain `'self'` +
  `'wasm-unsafe-eval'` only.

## Milestone logs

- [docs/m1-devnet-run.md](docs/m1-devnet-run.md) — Winterwallet CLI against our program on devnet
- [docs/m2-run.md](docs/m2-run.md) — WASM module, byte-identical to the CLI, bare test page
- [docs/m3-run.md](docs/m3-run.md) — full web app end to end on devnet

## License

Winterwallet is MIT (see `winterwallet/LICENSE`). This repository's own code is MIT as well.
