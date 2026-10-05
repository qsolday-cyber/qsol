# qSOL — audit scope and reviewer guide

Devnet-only proof of concept. Nothing here has been audited. This document tells a reviewer what is
custom, what is vendored, where the trust boundaries are, and how to reproduce every claim.

## What to audit, in priority order

1. **`wasm/src/lib.rs`** (≈300 lines) — the only custom code that touches key material. A thin
   wasm-bindgen wrapper over Winterwallet's crates. Claims to verify:
   - no cryptography of its own: mnemonic generation/validation, derivation, Merkle roots and
     signing all call `winterwallet_core` / `winterwallet_client`;
   - every signature goes through `UnsignedAdvance::sign` → `WinternitzKeypair::sign_and_increment`;
     the position/root check in `sign` cannot be bypassed from JS;
   - `recover_position` and `sign_*` never return or log private scalars; `normalize_note` is the
     only place the note string is touched.
2. **`web/src/lib/tx.ts`, `web/src/lib/vault.ts`, `web/src/lib/pending.ts`** — transaction
   pipeline, fee/cap arithmetic (bigint only), and the "never sign twice at one position" rule:
   signed Advance persisted *before* send, re-sent verbatim on retry, position re-checked against
   chain right before signing.
3. **`web/src/screens/Deposit.tsx`, `Withdraw.tsx`** — UI flow: forced backup (download + 3-word
   quiz), deposit cap, validation before signing, note kept only in component state.
4. **`web/src/config.ts`, `web/src/brand.ts`, `web/vite.config.ts`, `web/vercel.json`** — allowlist,
   fee (30 bps), treasury, caps, program ID pin, CSP (`script-src 'self' 'wasm-unsafe-eval'`,
   `connect-src` devnet only). No analytics, no error reporting, no backend.
5. **`web/src/lib/devWallet.ts`** — dev-only in-browser wallet; confirm it is unreachable in
   production builds (`DEV_WALLET_ENABLED` requires `import.meta.env.DEV`).
6. **`winterwallet/`** — vendored upstream (MIT, commit 672fc67). Our only change is the program ID
   in `common/src/lib.rs` and `sdk/ts/src/constants.ts` (plus regenerated golden fixtures).
   `git diff` against upstream to confirm. The on-chain program is upstream's, built with
   `cargo build-sbf` (platform-tools v1.57) and deployed to devnet as
   `BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r` (upgrade authority: the deploy wallet).

## Trust boundaries

- The **24-word note** is the only secret. It lives in page memory; it is passed into WASM calls and
  nowhere else. Losing it loses the funds; anyone holding it can withdraw.
- The **connected wallet** is untrusted for custody: it only signs as fee payer. No ed25519 key can
  move vault funds.
- The **on-chain program** verifies the Winternitz signature over (tag, wallet id, current root,
  next root, every passthrough account, payload) and stores the next root before running inner CPIs.
- **Static hosting**: Vercel serves immutable assets; the CSP forbids inline/remote scripts.
  A compromised build pipeline or CDN is the residual risk, as for any web wallet.

## Known limitations (documented, not bugs)

- Unaudited (Winterwallet upstream also unaudited). Devnet only.
- Token transfers use SPL `Transfer`, not `TransferChecked`; transfer-hook / transfer-fee mints
  unsupported.
- Position recovery is a linear scan (`RECOVERY_MAX_DEPTH` = 10 000).
- Treasury and deposit caps are placeholders. Caps are per asset (no price feed).
- `style-src 'unsafe-inline'` and `font-src data:` are allowed in the CSP (Tailwind/Vite, fontsource).

## Reproduce the evidence

```bash
# Rust: Winterwallet tests (incl. regenerated golden fixtures)
cd winterwallet && cargo test

# WASM module from source
cd ../wasm && wasm-pack build --release --target web --out-dir pkg
wasm-pack build --release --target nodejs --out-dir pkg-node
sha256sum pkg/quantum_vault_wasm_bg.wasm ../web/src/wasm/quantum_vault_wasm_bg.wasm   # must match

# Byte-for-byte equivalence with the Winterwallet CLI on devnet (needs keys/vault-m1.json — ask us for the test note)
cd test-page && npm install && npm run test:cli-equivalence

# Web app
cd ../../web && npm install && npm run lint && npm run build
```

Transaction-level evidence with signatures: `docs/m1-devnet-run.md`, `docs/m2-run.md`, `docs/m3-run.md`.

## Contact / disclosure

Report findings privately to the repository owner before any public disclosure. This is a devnet
beta; no real funds are at risk.
