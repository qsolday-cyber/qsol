# quantum-vault-wasm

Browser signing module for Quantum Vault. A thin `wasm-bindgen` wrapper over the vendored
Winterwallet crates (`../winterwallet/{core,client,common}`). It contains **no cryptography of
its own**: mnemonic generation/validation, key derivation, Winternitz signing (`sign_and_increment`
via `UnsignedAdvance::sign`, which refuses to sign unless the key at the requested position matches
the on-chain root) and instruction construction all come from Winterwallet.

## Build

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
# remap paths so the binary carries no local directory names
export RUSTFLAGS="--remap-path-prefix=$(cd .. && pwd)=/qsol --remap-path-prefix=$HOME/.cargo=/cargo --remap-path-prefix=$HOME/.rustup=/rustup"
wasm-pack build --release --target web    --out-dir pkg        # for the browser
wasm-pack build --release --target nodejs --out-dir pkg-node   # for the Node tests
```

## API (see `pkg/quantum_vault_wasm.d.ts`)

| function | purpose |
|---|---|
| `generate_note(entropy32)` | 32 bytes from `crypto.getRandomValues` → 24-word note |
| `validate_note(note)` / `wallet_id(note)` / `vault_address(note)` | derive public identifiers |
| `decode_vault_account(bytes)` | parse the 65-byte on-chain account → `{wallet_id, root, bump}` |
| `recover_position(note, on_chain_root, max_depth)` | find the current key position (like `winterwallet recover`) |
| `sign_initialize(note, payer)` | sign position 0, return the Initialize instruction |
| `sign_withdraw_sol(note, child, current_root, transfers_json)` | one Advance with N inner SOL withdraws (fee = 2nd entry) |
| `sign_transfer_tokens(note, child, current_root, token_program, source_ata, transfers_json)` | one Advance with N inner token transfers (SPL Token or Token-2022) |

Instructions are returned as JSON `{program_id, accounts:[{pubkey,is_signer,is_writable}], data:[u8]}`.

## One-time-key discipline

The module is stateless. Callers must `recover_position` from the on-chain root immediately before
signing, and must never request a second signature at the same position with a *different* message.
If a signed Advance fails to land, re-send the same instruction (refresh the blockhash if needed);
Winternitz signing is deterministic, so re-signing the identical message is also safe.

## Tests

`test-page/tests/cli-equivalence.mjs` recomputes the four instructions the Winterwallet CLI submitted
to devnet in Milestone 1 and checks them byte-for-byte (requires `../keys/vault-m1.json`).
`test-page/` is a bare HTML harness (`npm run build && npm run serve`, http://127.0.0.1:8787) served
with the strict CSP the real app will use.
