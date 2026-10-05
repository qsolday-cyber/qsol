# Quantum Vault — working notes

## Devnet deployment
- Winterwallet program (our instance): `BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r`
  - keypair: `keys/program-devnet.json` (gitignored)
  - built with `cargo build-sbf --manifest-path winterwallet/program/Cargo.toml` (platform-tools v1.57)
- Payer / deploy authority: `5XrgFMT8bjahGeuNApd5mWVvBUiDcdNCT7fWk6cP33Hg` (`~/.config/solana/id.json`)

## Winterwallet fork (`winterwallet/`, MIT, upstream commit 672fc67)
Vendored copy of https://github.com/blueshift-gg/winterwallet with ONE functional change:
- `common/src/lib.rs` and `sdk/ts/src/constants.ts`: `declare_id!` / `WINTERWALLET_PROGRAM_ID`
  changed from `winter5vMwvf51xrSVPTxbAAD6qiSTmPeRTSizMCQCa` to our devnet program ID.
- `fixtures/*.json` regenerated (`cargo test -p winterwallet-client --test regen -- --ignored`)
  because the golden PDAs depend on the program ID. All tests pass.

## Milestone 1 status (2026-10-04)
- Local validator: full flow passes (`scripts/m1-devnet.sh` with `RPC=http://127.0.0.1:8899 NOTE_FILE=keys/vault-local.json`); log in `docs/m1-local-run.md`.
- Devnet: DONE. Program deployed (slot 507270094, upgrade authority = payer). Full flow log in `docs/m1-devnet-run.md`.
  - Test vault PDA `6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6` (note in `keys/vault-m1.json`), position now (0,4), ~0.4 SOL left in it.
  - Devnet test mints: SPL Token `5f1hpSQxFEaK3RqmASoEer3tBuYN5G8zCVSbFEt9NHEh`, Token-2022 `FoBRXJQdKQSxWWD8tiEu9c3BoPyyLLpveBaD7JsfcNHt` (6 decimals, mint authority = payer).
- Decision: quantum note = 24 words (user, 2026-10-04).

## Milestone 2 status (2026-10-04) — DONE
- `wasm/`: wasm-bindgen wrapper over winterwallet core/client (no own crypto). Build: `wasm-pack build --release --target web --out-dir pkg` (+ `--target nodejs --out-dir pkg-node` for tests).
- `wasm/test-page/tests/cli-equivalence.mjs`: 32 checks, byte-identical to the 4 CLI devnet instructions. `wasm/test-page/`: bare page, did init/deposit/withdraw/SPL/Token-2022 on devnet; log in `docs/m2-run.md`.
- Compute: Initialize ≈ 419k CU, Advance(withdraw) ≈ 450k, Advance(token) ≈ 390k. Page simulates with 1.4M ceiling then pads 10% (same as CLI).
- Recovery in release WASM: 5–25 ms for positions ≤ 5.
- RULE for M3 (learned the hard way, see docs/m2-run.md): persist each signed Advance before sending; on retry re-send the same instruction, never re-sign a different message at the same position; simulate with a zero signature *before* signing so predictable failures burn nothing.

## Milestone 3 status (2026-10-05) — DONE except USDC
- `web/`: create-solana-dapp `react-vite` (Vite + Tailwind) with `@solana/client` 1.7 + `@solana/react-hooks` 1.4 (Wallet Standard discovery; create-solana-dapp no longer ships a legacy wallet-adapter template). Run: `cd web && npm run dev` (dev wallet via `.env.development.local` → `VITE_DEV_WALLET=1`), `npm run build && npm run preview`.
- WASM bindings are committed under `web/src/wasm/` (copied from `wasm/pkg`) so Vercel builds need no Rust.
- Config in `web/src/config.ts`: allowlist (SOL, Circle devnet USDC, QVT test token; QVT22 Token-2022 in dev builds only), FEE_BPS=30, TREASURY=payer (placeholder), per-asset deposit caps ("10 SOL equivalent" placeholders), program ID.
- Safety rails implemented: UI validation before signing; signed Advance persisted to localStorage before send and re-sent verbatim on retry; position re-checked against chain right before signing; one kit signer instance per wallet session (kit rule).
- Full test log: `docs/m3-run.md`. Pending: devnet USDC deposit/withdraw (needs devnet USDC in the dev wallet).

## Design + branding pass (2026-10-05)
- Product name `qVault`, token `qSOL` (Quantum Sol) — all in `web/src/brand.ts`; test mint relabelled "qSOL (devnet test mint)", Token-2022 dev mint "qSOL-22".
- New design tokens in `web/src/index.css` (light/dark), primitives in `web/src/components/ui.tsx` (Card, StepTitle, Stepper, Button, Notice, Row, Logo), intro "How it works" + FAQ in `web/src/components/Intro.tsx`, icon `web/public/icon.svg`.
- Smoke test after rewrite: vault 12DPw… withdrawal 0.01 SOL via new UI, position 5→6, tx 2GDV5w92wBeCZW2RNPRbHrG1M7tBruczeLregAUnBHnU4tqwvt91pDRBe1tBxQ4Bb6jsDNgYkVmZhLbZ2tFd5hee.

## Milestone 4 (2026-10-05) — DONE
- Vercel project `qvault`, production https://qvault-two.vercel.app, deployed from `web/` with `npx vercel deploy --prod` (vercel.json: Vite build, SPA rewrite, CSP + HSTS + frame-ancestors none). `web/.vercel/` and `web/.env.local` are gitignored.
- README covers setup, config, WASM rebuild, program redeploy, Vercel deploy.

## UI redesign to the reference look (2026-10-05)
- User rejected the first design; asked to match https://4pwj23yg5cjna.kimi.page (paper/ink, hairlines, no radius, Inter display + JetBrains Mono micro-labels, 3-column console: instrument · steps · black activity log, editorial sections, black mono footer). Tech unchanged.
- Fonts self-hosted via @fontsource-variable (CSP font-src 'self'). Copy adapted: hero "THE VAULT THAT OUTLASTS Q-DAY.", stats (768-byte sig, no ed25519 on spend path, ~128-bit PQ, key reuse impossible), anatomy, "four instructions, zero curves", run-it block.
- Activity log = UI-only context (`web/src/lib/log.tsx`, `logContext.ts`); screens narrate steps.
- Smoke after redesign: vault 12DPw… withdrawal 0.01 SOL, position 6→7, tx 4ywiuyNMyp2v9KNoGe3r2mRfFhKLxP7LoGUoHnn4MkhJFbon9GFgyKh7vuU6vgZAt6tzkjooSYdnSr15ehZkUuQQ.

## Domain (2026-10-05)
- Product renamed to `qSOL`. Custom domain `qsol.day` + `www.qsol.day` attached to Vercel project `qvault` (www → apex 308 redirect). Registrar DNS: `A @ 76.76.21.21`, `CNAME www cname.vercel-dns.com`. Live with TLS since 2026-10-05 (Namecheap DNS; parking CNAME + URL-redirect rows had to be deleted).

## GitHub (2026-10-05)
- Repo on GitHub (remote `origin`, branch `main`); `gh` CLI installed at `~/.local/bin/gh`. Add a collaborator with `gh api -X PUT repos/<owner>/qsol/collaborators/<user> -f permission=pull`.
- Audit guide: `docs/AUDIT.md`.

## Deploying (2026-10-05)
- `cd web && npm run deploy` (git-free copy → `vercel deploy --prod`). Direct `vercel deploy` from the checkout is BLOCKED by Vercel ("commit author doesn't have permission") because commits are authored by the anonymous `qsol` identity.
- WASM is built with `--remap-path-prefix` (see wasm/README) so no local paths end up in the binary.
