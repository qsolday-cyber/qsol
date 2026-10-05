# Milestone 1 run — Solana devnet, program BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r (2026-10-04)

Explorer: https://explorer.solana.com/address/6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6?cluster=devnet

```
RPC:        https://api.devnet.solana.com
Payer:      5XrgFMT8bjahGeuNApd5mWVvBUiDcdNCT7fWk6cP33Hg (5 SOL)
Program ID: BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r
Vault PDA:  6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6
Wallet ID:  512b9637286c120f15d6f5799063a8bee3546f35e021d5ffe37bb8911c745469

== Deploy program (skipped if already deployed)
Program Id: BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r

Signature: 2MGpcHLcuBrWzg5eNq6YcBJ8ngiSG6BJyNo3wNqbs6UymMswpeLYWvqMgdtF6mAMywTM7ig6cAaQrv2XdnSLnb1Z


Program Id: BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r
Owner: BPFLoaderUpgradeab1e11111111111111111111111
ProgramData Address: 4aNqHcnXagPt6LcPgfaosXvzA1RrbHUmfXYnpZ6jhj69
Authority: 5XrgFMT8bjahGeuNApd5mWVvBUiDcdNCT7fWk6cP33Hg
Last Deployed In Slot: 507270094
Data Length: 21424 (0x53b0) bytes
Balance: 0.10971276 SOL


== winterwallet init  (burns position (0,0), stores root of (0,1))
{"action":"init","pda":"6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6","position":{"child":1,"parent":0},"position_persisted_before_send":true,"signature":"42EBVS68DxHHQEASmaWwYge3S4XULweeWM7ZHCkoWGfC4dywUUP6GC3GKGiTR1xEHAD4GBHGRpTJRpoNFhi2kdsy","wallet_id":"512b9637286c120f15d6f5799063a8bee3546f35e021d5ffe37bb8911c745469"}

== Fund vault PDA with 500000000 lamports (plain system transfer = 'deposit')

Signature: 2MosxTZ8ZmPph8D5WX9q2NcXTh3rTxyL5rD7ovgHFv3NmoQNEgPw8iwPGrwM4ECsakHaZMjr8K3xd9LGfAdExWyc


== winterwallet info (post-deposit)
{"bump":253,"on_chain":{"balance_lamports":500980440,"root":"e0bdc43639abcb8461a940c14ce75f4825b472befc8600ccedc4a534950c736f"},"pda":"6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6","position":{"child":1,"parent":0},"wallet_id":"512b9637286c120f15d6f5799063a8bee3546f35e021d5ffe37bb8911c745469"}

== winterwallet withdraw 100000000 lamports -> Gr5LDogEFKd9wVkEht1koj4kM93eNkBNdYTiQoycNZDJ
{"action":"withdraw","amount":100000000,"estimated_transaction_size":1104,"pda":"6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6","position":{"child":2,"parent":0},"position_persisted_before_send":true,"receiver":"Gr5LDogEFKd9wVkEht1koj4kM93eNkBNdYTiQoycNZDJ","signature":"2xQ3VSaQ2LnB37EdijNahPjkPamRCYDnMBCn16AN6BrV7Z3MPLaqBdETFo6GkGQp8EHgkEumuBzrSeBXyLHmkzHk","wallet_id":"512b9637286c120f15d6f5799063a8bee3546f35e021d5ffe37bb8911c745469"}
receiver balance: 0.1 SOL

== SPL Token: create mint, ATAs, mint 1000000 to vault
mint: 5f1hpSQxFEaK3RqmASoEer3tBuYN5G8zCVSbFEt9NHEh
vault token balance before: 1

== winterwallet transfer 1000000 (SPL Token) -> Gr5LDogEFKd9wVkEht1koj4kM93eNkBNdYTiQoycNZDJ
{"action":"transfer","amount":1000000,"destination_ata":"HjH8D4yyoiu7vJCzY2TX2DsJKRVeTRLapvH7zG7rb8C9","estimated_transaction_size":1169,"mint":"5f1hpSQxFEaK3RqmASoEer3tBuYN5G8zCVSbFEt9NHEh","pda":"6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6","position":{"child":3,"parent":0},"position_persisted_before_send":true,"recipient_owner":"Gr5LDogEFKd9wVkEht1koj4kM93eNkBNdYTiQoycNZDJ","signature":"FbiZDpN988nKXEraGq27imNpiWKtSsRhobctNgstd8ZqzHhgJXux9ZWK7A6HEW6osCe4EMxi9iiotoU636ke2Uf","source_ata":"FjW4f7gKBL1za9tcNEdsbqd9dxApkizeZ1EGYhVGCiR4","token_program":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","wallet_id":"512b9637286c120f15d6f5799063a8bee3546f35e021d5ffe37bb8911c745469"}
vault token balance after:    0
receiver token balance after: 1

== Token-2022: create mint, ATAs, mint 1000000 to vault
mint: FoBRXJQdKQSxWWD8tiEu9c3BoPyyLLpveBaD7JsfcNHt
vault token balance before: 1

== winterwallet transfer 1000000 (Token-2022) -> Gr5LDogEFKd9wVkEht1koj4kM93eNkBNdYTiQoycNZDJ
{"action":"transfer","amount":1000000,"destination_ata":"Dm5asKdxTaJLh8A8yYrCVG6EFHhmBeLBmrnKG5ZiN6Hn","estimated_transaction_size":1169,"mint":"FoBRXJQdKQSxWWD8tiEu9c3BoPyyLLpveBaD7JsfcNHt","pda":"6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6","position":{"child":4,"parent":0},"position_persisted_before_send":true,"recipient_owner":"Gr5LDogEFKd9wVkEht1koj4kM93eNkBNdYTiQoycNZDJ","signature":"2dZeEH46TvfVxxitYTmMvYWinGZnNwvufmBRqytTmtMdruk5bjArtcNjKLduPFVYmdrFyonawxJvs3UvJR7qbWZc","source_ata":"EmNxWATTZtjf7LgxMvcC5amJnH7CH65iP1CMY7KKw4Ak","token_program":"TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb","wallet_id":"512b9637286c120f15d6f5799063a8bee3546f35e021d5ffe37bb8911c745469"}
vault token balance after:    0
receiver token balance after: 1

== Wipe local position state, then recover it from the on-chain root
Scanning positions 1 through 10000...
{"action":"recover","elapsed_ms":292,"pda":"6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6","position":{"child":4,"parent":0},"positions_per_second":13.669691306861653,"scanned_positions":4,"wallet_id":"512b9637286c120f15d6f5799063a8bee3546f35e021d5ffe37bb8911c745469"}
state before wipe: {"wallet_id":"512b9637286c120f15d6f5799063a8bee3546f35e021d5ffe37bb8911c745469","pda":"6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6","parent":0,"child":4}
state after recover: {"wallet_id":"512b9637286c120f15d6f5799063a8bee3546f35e021d5ffe37bb8911c745469","pda":"6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6","parent":0,"child":4}
recover: position matches

== winterwallet info (final)
{"bump":253,"on_chain":{"balance_lamports":400980440,"root":"0a80a6ae55809b40cbe8a37611559285df36628abf6ff8e0d01883dcfc416c0b"},"pda":"6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6","position":{"child":4,"parent":0},"wallet_id":"512b9637286c120f15d6f5799063a8bee3546f35e021d5ffe37bb8911c745469"}

M1 DONE. Payer balance now: 4.38013052 SOL
```
