# Milestone 2 run — WASM signing module on devnet (2026-10-04)

## Node: CLI equivalence test (`npm run test:cli-equivalence` in wasm/test-page)

```
PASS  program_id pinned  BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r
PASS  note validates
PASS  note has 24 words
PASS  wallet_id matches CLI create
PASS  vault PDA matches CLI create  6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6
PASS  case/whitespace-insensitive note
PASS  12-word mnemonic accepted on input (core validate)
PASS  bad checksum rejected
PASS  generate_note(entropy) -> 24 valid words
PASS  generate_note matches BIP-39 vector for zero entropy  abandon abandon abandon abandon abandon ...
PASS  Initialize: on-chain tx succeeded
PASS  Initialize: program id
PASS  Initialize: account list identical  (3 accounts)
PASS  Initialize: instruction data identical (801 bytes incl. 768-byte Winternitz signature)
PASS  Initialize: next_root == root_at(1)
PASS  Advance(Withdraw 0.1 SOL): on-chain tx succeeded
PASS  Advance(Withdraw 0.1 SOL): program id
PASS  Advance(Withdraw 0.1 SOL): account list identical  (4 accounts)
PASS  Advance(Withdraw 0.1 SOL): instruction data identical (814 bytes incl. 768-byte Winternitz signature)
PASS  Withdraw: new_root == root_at(2)
PASS  Advance(SPL Token transfer): on-chain tx succeeded
PASS  Advance(SPL Token transfer): program id
PASS  Advance(SPL Token transfer): account list identical  (5 accounts)
PASS  Advance(SPL Token transfer): instruction data identical (814 bytes incl. 768-byte Winternitz signature)
PASS  Advance(Token-2022 transfer): on-chain tx succeeded
PASS  Advance(Token-2022 transfer): program id
PASS  Advance(Token-2022 transfer): account list identical  (5 accounts)
PASS  Advance(Token-2022 transfer): instruction data identical (814 bytes incl. 768-byte Winternitz signature)
PASS  refuses to sign when position does not match the root (RootMismatch)
PASS  decode_vault_account: wallet id
PASS  recover_position from live on-chain root == 4 (after init + 3 advances)  child=4, 20 ms
PASS  withdraw+fee Advance built (2 inner CPIs, not sent)  826 bytes data, 7 accounts

ALL CHECKS PASSED
```

## Browser: bare test page log (http://127.0.0.1:8787, strict CSP, browser-local payer 9K1jx9iwneRWqPbM3XD3rgMgKRGZxpnnC7ZmtKGVGYnb)

Vault created from the page: 7KocWWkRsT2kjUVtN8fiDBZ2LRJ5Y39jtGaX2BEzRU6e (https://explorer.solana.com/address/7KocWWkRsT2kjUVtN8fiDBZ2LRJ5Y39jtGaX2BEzRU6e?cluster=devnet)

Note on the two 'insufficient funds' entries: an automation mis-click produced a signed SPL transfer at position 3 while the vault's SPL balance was 0. The page kept that signed Advance and re-sent the identical instruction once funds were deposited, so position 3 signed exactly one message. See NOTES.md for the M3 rule derived from this.

```
wasm loaded; program BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r; note length 24 words
generated a new 24-word note in the browser
init: vault 7KocWWkRsT2kjUVtN8fiDBZ2LRJ5Y39jtGaX2BEzRU6e, position 0 signed in WASM, next root a63dd4e4bceb7513…
  simulated 419206 CU → limit 461127
  tx size 1090 bytes
  confirmed 2hvJETLaGRzdTwvmfnvV2JiMaFtvjWhPhJiFWwRmmuGZGA7CdkhnCq4QP7smEgf2XPCvGZCDRgaYnMtJK66WGdLe
deposit 0.2 SOL → vault (plain system transfer)
  tx size 215 bytes
  confirmed 31WnSjcMLC8n4Qz1uWFJXexYvQnUvfmMwJsgRW7gfpRnFPyTeJvRGUdEGGbd58DeBECHk9DQVWCVKkPHdXSpqQYz
withdraw 0.05 SOL → payer: signed position 1 in WASM, new root feeb2016123da0f2…
  simulated 450455 CU → limit 495501
  tx size 1072 bytes
  confirmed 4Xxo2gkkd1JofUGiBGaFW31dwNwvKuRZLezGiXs3nR9NgPZnmWsCmMsPhd9j1tqLUqC7hyFvWNCJzPN5E54BQj7e
deposit 500000 base units payer → vault (create vault ATA if needed + transfer)
  tx size 383 bytes
  confirmed 3BhcKWpVDCfm1JaQ2X49Naa2tED5Eg2q1cxwnRgotJHfK8swdXheqGCYYX7gwHgeHrXfNLrA322MJLJdaQkQ7g18
transfer 500000 base units vault → payer: signed position 2 in WASM, new root a79931ab8f3eddcc…
  simulated 387715 CU → limit 426487
  tx size 1169 bytes
  confirmed mxrd6VbvrpRhbaCH4tpXdqiL542MuhouDv3WCwjYCb8bAcP6Tvz4gTd4vjaXDem1GYDmt8sjEJ6a7TLy6jz5Aqw
transfer 500000 base units vault → payer: signed position 3 in WASM, new root 68d0e4d00458974b…
ERR Error: simulation failed: {"InstructionError":[1,{"Custom":1}]}   (SPL Token: insufficient funds — not broadcast)
equivalence: this is not the Milestone 1 test note; skipping
deposit 500000 base units payer → vault (create vault ATA if needed + transfer)   [Token-2022]
  confirmed 658D41gQUhkdheaFdAN3a6jXhsKhSHC3WLY5tsvxVJuEp9WDN1y5NobFKMKYyzxQgtKxobVvbAskuhfkGXnkJKzP
  re-sending previously signed Advance for position 3 (never re-sign a different message)
ERR Error: simulation failed: {"InstructionError":[1,{"Custom":1}]}   (still no SPL balance — not broadcast)
deposit 500000 base units payer → vault (create vault ATA if needed + transfer)   [SPL Token]
  confirmed 5MeDAHfdtVuRKhgWWC1PJa8nAnjKE7g58aJofMPy3Ewkt7jHUD7jFPLTfdEaYQYFwqbWcjFkBCjriLsQmMnZR6GF
  re-sending previously signed Advance for position 3 (never re-sign a different message)
  simulated 419080 CU → limit 460988
  tx size 1169 bytes
  confirmed 23x5bbCzKH2YacMU7sCo83nSSXCwgxGTp1jBN5CE5uwTkGknhCcpHWGNubSMAzT6pwy3LmatJe7vjvpQAGjsCwvH
transfer 500000 base units vault → payer: signed position 4 in WASM, new root 2dbd1fabf98ad765…   [Token-2022]
  simulated 389503 CU → limit 428454
  tx size 1169 bytes
  confirmed hxpnHopbNucHLBCT3cKTQ3kjbimdnGRLi6tfxMijN8sZqpAaG2sYH9VPAqfEWv1F3NWpFTxEar8BiARRqrJWEqa
PASS  Initialize: 801-byte data identical, accounts identical
PASS  Advance(Withdraw) pos 1: 814-byte data identical, accounts identical
PASS  Advance(SPL transfer) pos 2: 814-byte data identical, accounts identical
PASS  Advance(Token-2022 transfer) pos 3: 814-byte data identical, accounts identical
equivalence: 4/4 CLI instructions reproduced byte-for-byte in the browser
```
