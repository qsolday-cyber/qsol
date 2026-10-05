# Milestone 1 run — local solana-test-validator, our program BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r (2026-10-04)

```
RPC:        http://127.0.0.1:8899
Payer:      5XrgFMT8bjahGeuNApd5mWVvBUiDcdNCT7fWk6cP33Hg (500000019.347055197 SOL)
Program ID: BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r
Vault PDA:  Ck5Dm7AGBqv4hFhmTffPht1UVJxVMqrXgagrjXyFZKDu
Wallet ID:  725162d841f8b67fbf731d44171e7db00769ea31fc9e65603a44d5b338adc377

== Deploy program (skipped if already deployed)
already deployed

Program Id: BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r
Owner: BPFLoaderUpgradeab1e11111111111111111111111
ProgramData Address: 4aNqHcnXagPt6LcPgfaosXvzA1RrbHUmfXYnpZ6jhj69
Authority: 5XrgFMT8bjahGeuNApd5mWVvBUiDcdNCT7fWk6cP33Hg
Last Deployed In Slot: 36
Data Length: 21424 (0x53b0) bytes
Balance: 0.15031512 SOL


== winterwallet init  (burns position (0,0), stores root of (0,1))
vault already initialized on-chain; skipping init

== Fund vault PDA with 500000000 lamports (plain system transfer = 'deposit')

Signature: oPQoNkVa1ypCem6ZfAfoTwcR9mYvz3oKE7MB8N6RwvgNVKwSBM5ragvqQ6cRhvmQU3Cv3VvpJvxwbbdNMfV3Mq2


== winterwallet info (post-deposit)
{"bump":254,"on_chain":{"balance_lamports":901343280,"root":"0bf796ebf7245c3c1130f4336c6c89dfc5e5364e686bb5e48bf030b33b363b9e"},"pda":"Ck5Dm7AGBqv4hFhmTffPht1UVJxVMqrXgagrjXyFZKDu","position":{"child":2,"parent":0},"wallet_id":"725162d841f8b67fbf731d44171e7db00769ea31fc9e65603a44d5b338adc377"}

== winterwallet withdraw 100000000 lamports -> B4aADMxf7mSDkeTdNtX2UYWbMuFrxgj8iVNYFn4wdAb5
{"action":"withdraw","amount":100000000,"estimated_transaction_size":1104,"pda":"Ck5Dm7AGBqv4hFhmTffPht1UVJxVMqrXgagrjXyFZKDu","position":{"child":3,"parent":0},"position_persisted_before_send":true,"receiver":"B4aADMxf7mSDkeTdNtX2UYWbMuFrxgj8iVNYFn4wdAb5","signature":"2stGFgz3Ku2NBfZTPSuAXyaviqaLkM85AkXmR9t714X1ggwFgSL3CndqZ7qprNL1TLs7XkYrUFUbxqXgThkYDXTy","wallet_id":"725162d841f8b67fbf731d44171e7db00769ea31fc9e65603a44d5b338adc377"}
receiver balance: 0.1 SOL

== SPL Token: create mint, ATAs, mint 1000000 to vault
mint: 32GmpHbEFHWW7mUmRtiLD7aRb3wgpbaDtsgUQoPmHLZd
vault token balance before: 1

== winterwallet transfer 1000000 (SPL Token) -> B4aADMxf7mSDkeTdNtX2UYWbMuFrxgj8iVNYFn4wdAb5
{"action":"transfer","amount":1000000,"destination_ata":"75BTkwUsKGTrdPmaB6bEomnTy1rvazsNr3vT9YdiDoxU","estimated_transaction_size":1169,"mint":"32GmpHbEFHWW7mUmRtiLD7aRb3wgpbaDtsgUQoPmHLZd","pda":"Ck5Dm7AGBqv4hFhmTffPht1UVJxVMqrXgagrjXyFZKDu","position":{"child":4,"parent":0},"position_persisted_before_send":true,"recipient_owner":"B4aADMxf7mSDkeTdNtX2UYWbMuFrxgj8iVNYFn4wdAb5","signature":"5is68kDZoH31rDqnrFAEYEBXfWrtYnub4nKQA1NfZc4484g8Uti4NMhWNHAua13SF6nsaUcdmMpqhDAMbTzWSe5P","source_ata":"5x9B2QABGqipU1qBmkL8ckeE33UiU3CTnsdoyKNxCsci","token_program":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","wallet_id":"725162d841f8b67fbf731d44171e7db00769ea31fc9e65603a44d5b338adc377"}
vault token balance after:    0
receiver token balance after: 1

== Token-2022: create mint, ATAs, mint 1000000 to vault
mint: GoEbZXCUQdc7qvsztj5aYkZMfc9WhCc4AN2PDogXxLLm
vault token balance before: 1

== winterwallet transfer 1000000 (Token-2022) -> B4aADMxf7mSDkeTdNtX2UYWbMuFrxgj8iVNYFn4wdAb5
{"action":"transfer","amount":1000000,"destination_ata":"2JbMJsyQpJwjeD8P8PkyyKzXgaNvhn6JEsGbjYsVK1cy","estimated_transaction_size":1169,"mint":"GoEbZXCUQdc7qvsztj5aYkZMfc9WhCc4AN2PDogXxLLm","pda":"Ck5Dm7AGBqv4hFhmTffPht1UVJxVMqrXgagrjXyFZKDu","position":{"child":5,"parent":0},"position_persisted_before_send":true,"recipient_owner":"B4aADMxf7mSDkeTdNtX2UYWbMuFrxgj8iVNYFn4wdAb5","signature":"4AzZxDFnJdiv4owZ4C3QJjNqpzEoSjpmsHE6pNMtSp5bLbekdaLn1oaYfiAdqtWiN9ehizc9Z4VuwShJi6ZCLhXs","source_ata":"2pmZbzVEcZK8xNc7MF9Ezj3iP4KTR214yoR5TzApR1ph","token_program":"TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb","wallet_id":"725162d841f8b67fbf731d44171e7db00769ea31fc9e65603a44d5b338adc377"}
vault token balance after:    0
receiver token balance after: 1

== Wipe local position state, then recover it from the on-chain root
Scanning positions 1 through 10000...
{"action":"recover","elapsed_ms":337,"pda":"Ck5Dm7AGBqv4hFhmTffPht1UVJxVMqrXgagrjXyFZKDu","position":{"child":5,"parent":0},"positions_per_second":14.811510553325684,"scanned_positions":5,"wallet_id":"725162d841f8b67fbf731d44171e7db00769ea31fc9e65603a44d5b338adc377"}
state before wipe: {"wallet_id":"725162d841f8b67fbf731d44171e7db00769ea31fc9e65603a44d5b338adc377","pda":"Ck5Dm7AGBqv4hFhmTffPht1UVJxVMqrXgagrjXyFZKDu","parent":0,"child":5}
state after recover: {"wallet_id":"725162d841f8b67fbf731d44171e7db00769ea31fc9e65603a44d5b338adc377","pda":"Ck5Dm7AGBqv4hFhmTffPht1UVJxVMqrXgagrjXyFZKDu","parent":0,"child":5}
recover: position matches

== winterwallet info (final)
{"bump":254,"on_chain":{"balance_lamports":801343280,"root":"ff4d34576b0f0da09fa1da3b9eda1eeb1a97b3ee958f0217afaa39298c7f9972"},"pda":"Ck5Dm7AGBqv4hFhmTffPht1UVJxVMqrXgagrjXyFZKDu","position":{"child":5,"parent":0},"wallet_id":"725162d841f8b67fbf731d44171e7db00769ea31fc9e65603a44d5b338adc377"}

M1 DONE. Payer balance now: 500000018.835835278 SOL
```
