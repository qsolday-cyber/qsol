#!/usr/bin/env bash
# Milestone 1: exercise the Winterwallet CLI against OUR program instance on devnet.
# create -> init -> fund -> info -> withdraw -> SPL token transfer (Token + Token-2022)
#   -> wipe local state -> recover -> info
#
# Usage: scripts/m1-devnet.sh            (expects payer at ~/.config/solana/id.json with >= 1.5 SOL)
set -euo pipefail

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WW="$ROOT/winterwallet/target/debug/winterwallet"
RPC="${RPC:-https://api.devnet.solana.com}"
PAYER="${PAYER:-$HOME/.config/solana/id.json}"
NOTE_FILE="${NOTE_FILE:-$ROOT/keys/vault-m1.json}"   # output of `winterwallet create --json`
PROGRAM_KEYPAIR="$ROOT/keys/program-devnet.json"
PROGRAM_SO="$ROOT/winterwallet/target/deploy/winterwallet_program.so"
LOG="$ROOT/scripts/m1-devnet.log"
TOKEN22=TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb

FUND_LAMPORTS=500000000      # 0.5 SOL into the vault
WITHDRAW_LAMPORTS=100000000  # 0.1 SOL out of the vault
TOKEN_AMOUNT=1000000         # base units (6 decimals -> 1.0 token)

: > "$LOG"
log() { printf '%s\n' "$*" | tee -a "$LOG"; }
step() { log; log "== $*"; }
delay() { sleep "${DELAY:-3}"; }

PROGRAM_ID=$(solana-keygen pubkey "$PROGRAM_KEYPAIR")
PAYER_ADDR=$(solana-keygen pubkey "$PAYER")
MNEMONIC=$(jq -r .mnemonic "$NOTE_FILE")
PDA=$(jq -r .pda "$NOTE_FILE")
WALLET_ID=$(jq -r .wallet_id "$NOTE_FILE")
log "RPC:        $RPC"
log "Payer:      $PAYER_ADDR ($(solana balance -u "$RPC" -k "$PAYER"))"
log "Program ID: $PROGRAM_ID"
log "Vault PDA:  $PDA"
log "Wallet ID:  $WALLET_ID"
grep -q "$PROGRAM_ID" "$ROOT/winterwallet/common/src/lib.rs" || { log "common/src/lib.rs does not declare $PROGRAM_ID"; exit 1; }

step "Deploy program (skipped if already deployed)"
if solana program show "$PROGRAM_ID" -u "$RPC" >/dev/null 2>&1; then
  log "already deployed"
else
  solana program deploy "$PROGRAM_SO" --program-id "$PROGRAM_KEYPAIR" -u "$RPC" -k "$PAYER" --commitment confirmed | tee -a "$LOG"
fi
solana program show "$PROGRAM_ID" -u "$RPC" | tee -a "$LOG"
delay

step "winterwallet init  (burns position (0,0), stores root of (0,1))"
if solana account "$PDA" -u "$RPC" >/dev/null 2>&1; then
  log "vault already initialized on-chain; skipping init"
else
  rm -f "$HOME/.winterwallet/$WALLET_ID.json"
  INIT=$(printf '%s\n' "$MNEMONIC" | "$WW" init --json --rpc-url "$RPC" --keypair "$PAYER")
  log "$INIT"
fi
delay

step "Fund vault PDA with $FUND_LAMPORTS lamports (plain system transfer = 'deposit')"
solana transfer "$PDA" "$(awk "BEGIN{print $FUND_LAMPORTS/1e9}")" -u "$RPC" -k "$PAYER" --allow-unfunded-recipient --commitment confirmed | tee -a "$LOG"
delay

step "winterwallet info (post-deposit)"
INFO1=$(printf '%s\n' "$MNEMONIC" | "$WW" info --json --rpc-url "$RPC")
log "$INFO1"
delay

RECEIVER_KP=$(mktemp); solana-keygen new --no-bip39-passphrase -o "$RECEIVER_KP" --force --silent
RECEIVER=$(solana-keygen pubkey "$RECEIVER_KP")
step "winterwallet withdraw $WITHDRAW_LAMPORTS lamports -> $RECEIVER"
WD=$(printf '%s\n' "$MNEMONIC" | "$WW" withdraw --to "$RECEIVER" --amount "$WITHDRAW_LAMPORTS" --json --rpc-url "$RPC" --keypair "$PAYER")
log "$WD"
log "receiver balance: $(solana balance "$RECEIVER" -u "$RPC")"
delay

for TP in TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA "$TOKEN22"; do
  if [[ "$TP" == "$TOKEN22" ]]; then LABEL="Token-2022"; EXTRA=(--program-id "$TOKEN22"); else LABEL="SPL Token"; EXTRA=(); fi
  step "$LABEL: create mint, ATAs, mint $TOKEN_AMOUNT to vault"
  MINT=$(spl-token create-token ${EXTRA[@]+"${EXTRA[@]}"} --decimals 6 -u "$RPC" --fee-payer "$PAYER" --mint-authority "$PAYER" --output json | jq -r .commandOutput.address)
  log "mint: $MINT"
  spl-token create-account "$MINT" --owner "$PDA" -u "$RPC" --fee-payer "$PAYER" >/dev/null
  spl-token create-account "$MINT" --owner "$RECEIVER" -u "$RPC" --fee-payer "$PAYER" >/dev/null
  spl-token mint "$MINT" 1 --recipient-owner "$PDA" -u "$RPC" --fee-payer "$PAYER" --mint-authority "$PAYER" >/dev/null
  log "vault token balance before: $(spl-token balance "$MINT" --owner "$PDA" -u "$RPC")"
  delay
  step "winterwallet transfer $TOKEN_AMOUNT ($LABEL) -> $RECEIVER"
  TR=$(printf '%s\n' "$MNEMONIC" | "$WW" transfer --to "$RECEIVER" --mint "$MINT" --amount "$TOKEN_AMOUNT" --token-program "$TP" --json --rpc-url "$RPC" --keypair "$PAYER")
  log "$TR"
  log "vault token balance after:    $(spl-token balance "$MINT" --owner "$PDA" -u "$RPC")"
  log "receiver token balance after: $(spl-token balance "$MINT" --owner "$RECEIVER" -u "$RPC")"
  echo "$MINT" >> "$ROOT/keys/m1-mints.txt"
  delay
done

step "Wipe local position state, then recover it from the on-chain root"
STATE_BEFORE=$(cat "$HOME/.winterwallet/$WALLET_ID.json")
rm -f "$HOME/.winterwallet/$WALLET_ID.json"
REC=$(printf '%s\n' "$MNEMONIC" | "$WW" recover --json --rpc-url "$RPC" 2>>"$LOG")
log "$REC"
log "state before wipe: $(echo "$STATE_BEFORE" | jq -c .)"
log "state after recover: $(jq -c . "$HOME/.winterwallet/$WALLET_ID.json")"
[[ "$(echo "$STATE_BEFORE" | jq .child)" == "$(jq .child "$HOME/.winterwallet/$WALLET_ID.json")" ]] && log "recover: position matches" || { log "recover: MISMATCH"; exit 1; }

step "winterwallet info (final)"
printf '%s\n' "$MNEMONIC" | "$WW" info --json --rpc-url "$RPC" | tee -a "$LOG"
rm -f "$RECEIVER_KP"
log; log "M1 DONE. Payer balance now: $(solana balance -u "$RPC" -k "$PAYER")"
