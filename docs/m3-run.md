# Milestone 3 run — full web app on devnet (2026-10-04/05)

App: `web/` (create-solana-dapp `react-vite` template + `@solana/client` / `@solana/react-hooks`, Vite, Tailwind).
Program: `BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r`. Fee payer: in-browser dev wallet `8F5xSQX6CRD8DmHyf3xzV8wu1uPJzsFLLm3zD31E7pLe` (dev builds only, `VITE_DEV_WALLET=1`).
Test vault: `12DPwtv9KY3KAZiLaVZfGpGQaJHR5zcZuTjvL2iYm87V` — https://explorer.solana.com/address/12DPwtv9KY3KAZiLaVZfGpGQaJHR5zcZuTjvL2iYm87V?cluster=devnet

## Deposit screen
| step | result |
|---|---|
| Generate note (crypto.getRandomValues → WASM) | 24 words, vault address derived in-page |
| Backup: download `.txt`, re-type 3 random words | wrong word rejected ("One or more words do not match…"); correct words accepted |
| Deposit cap | 11 SOL refused: "Deposit cap is 10 SOL per vault; this vault already holds 0." (no tx) |
| Create vault + deposit 0.2 SOL | ONE transaction (Initialize + system transfer) `3kJgUs2fyhLrxT6RhzbtrWWCXhp6NNyi4AaXRHmNxsaCcez8qcrTRgVTzxpPqGLfgF2jUuj39tM879vm7RVhKLxW` |
| Deposit 1.5 QVT (SPL Token) | vault ATA created idempotently in the same tx `31g3Z5yE52899H9JET72dcTY2bYci3qryPJi8D2S8yYPVeLAtdK2bE7igiQrJjJRqPLy9xewRuz9jXPf5HQfn6t6` |
| Deposit 1.5 QVT22 (Token-2022) | `41AVaitH6wuKkHmQfNQW1HxDXWXQCgof7pAJcmTQo4J5MeX243gEKthb3VDkTKtDC4Uc8tzLr3ZRQwdopjyHqagC` |

## Withdraw screen
| step | result |
|---|---|
| Paste note (upper-case first word, extra spaces) | normalised; vault loaded, position 1 recovered from on-chain root, all 4 balances shown |
| Amount above max | refused before signing: "amount + fee exceeds what the vault can send (max 0.199401794 SOL)" |
| Invalid destination | refused before signing: "invalid destination address" |
| Withdraw 0.05 SOL → wallet | `2NZTz7bxA9GLXbUmUvGm25pxA2q8s78kWesoZWMnHGk6LpeUmmykR27yB2BZn1fN2wZfp4X8scpZjiMaX7CVe7Z9` — on chain: vault −0.05015, wallet +0.049995 (paid 5000-lamport network fee), treasury +0.00015 (0.3%). Position 1→2. |
| Withdraw 0.5 QVT → wallet | vault 1.5 → 0.9985 (0.5 + 0.0015 fee to treasury ATA). Position 2→3. |
| Withdraw 0.5 QVT22 → wallet | `4t2wJP2PQRogseuhAxrL2fYrbXzopFUoG85pi4afHrp5qLgbzvYS7arSFaNCkbCXnV3jDWmdcDpGn7N39AxXp2gy` — vault −0.5015, wallet +0.5, treasury +0.0015. Position 3→4. |
| Unsent-withdrawal guard | A 0.01 SOL withdrawal was signed at position 4 *offline* (Node + WASM, never sent) and its record injected into localStorage. After a page reload the app detected it, refused to sign anything else at position 4, and offered only "Re-send signed withdrawal". Re-send landed: `2UFntwC9QkDQX71sRDLkJwyedMEo2BUqznjEUPLBBBxemHpW9fCrRk6svAwrHi9TWq4gWsTBnxcujbQh2EdxSwXB` (vault −0.01003, wallet +0.009995, treasury +0.00003). Position 4→5; record cleared. |

Vault address never changed across 5 key rotations.

## Production build
`npm run build` → `vite preview` at http://localhost:4173: CSP meta present (`script-src 'self' 'wasm-unsafe-eval'`, `connect-src` devnet only), no console errors, dev wallet and dev-only QVT22 asset absent, read-only vault load works (position 5, balances). Mobile viewport 375px: no horizontal overflow.

## User test with a real wallet (2026-10-05)
The project owner connected a real Wallet Standard wallet (`F1dtUroT…`) to the dev build and created vault
`5PNqY7bMRLtq5PXzCiB5dCjDTsYNmgzDFiAPUV5jP2rK` with a 1 SOL deposit in one transaction
(`5xXvZKwBf2eaW61dYnm1xCUmFWVAfZa65vxfy4izm7w9fash8fyHzNZcxfuFu6ZdmezBQWAsiAZoZaXkkqNccYBf`): Initialize + system transfer, wallet −1.000985 SOL, vault +1.00098 SOL.
No withdrawal from that vault yet.

## Not tested
- **Devnet USDC**: no devnet USDC was obtainable programmatically (Circle's faucet is a web form). USDC uses the same code path as QVT (SPL Token, 6 decimals). Needs ~1 USDC sent to the dev wallet `8F5xSQX6CRD8DmHyf3xzV8wu1uPJzsFLLm3zD31E7pLe` to complete.
- A real browser-extension wallet (Phantom etc.): connection goes through Wallet Standard discovery, the same path the dev wallet uses.
