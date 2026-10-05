//! Quantum Vault browser signing module.
//!
//! This crate is a *thin* wasm-bindgen wrapper around Winterwallet's own
//! crates. It performs no cryptography itself:
//!
//! * mnemonic generation / validation / derivation → `winterwallet_core::WinternitzKeypair`
//! * signing → `winterwallet_client::UnsignedAdvance::sign`, which calls
//!   `WinternitzKeypair::sign_and_increment` and refuses to sign unless the
//!   key at the requested position matches the on-chain root
//! * instruction construction → `winterwallet_client` builders
//!
//! The module is stateless. The caller must recover the current key position
//! from the on-chain root (`recover_position`) immediately before signing, and
//! must never ask for a second signature at the same position with a
//! different message. Re-signing the *identical* message (e.g. to refresh an
//! expired blockhash) is safe because Winternitz signing is deterministic.

use serde::Serialize;
use solana_address::Address;
use solana_instruction::Instruction;
use wasm_bindgen::prelude::*;
use winterwallet_client::{
    SigningPosition, WinterWallet, WinterWalletAccount, find_wallet_address, token_transfer,
    wallet_id_from_mnemonic, withdraw,
};
use winterwallet_common::WINTERNITZ_SCALARS;
use winterwallet_core::WinternitzKeypair;
use zeroize::Zeroizing;

// ── JSON shapes returned to JS ───────────────────────────────────────

#[derive(Serialize)]
struct JsAccountMeta {
    pubkey: String,
    is_signer: bool,
    is_writable: bool,
}

#[derive(Serialize)]
struct JsInstruction {
    program_id: String,
    accounts: Vec<JsAccountMeta>,
    /// Raw instruction data bytes.
    data: Vec<u8>,
}

impl From<&Instruction> for JsInstruction {
    fn from(ix: &Instruction) -> Self {
        Self {
            program_id: ix.program_id.to_string(),
            accounts: ix
                .accounts
                .iter()
                .map(|m| JsAccountMeta {
                    pubkey: m.pubkey.to_string(),
                    is_signer: m.is_signer,
                    is_writable: m.is_writable,
                })
                .collect(),
            data: ix.data.clone(),
        }
    }
}

#[derive(Serialize)]
struct SignedAdvanceOut {
    /// The signed `Advance` instruction, ready to be placed in a transaction.
    instruction: JsInstruction,
    /// Position consumed by this signature (child index).
    signed_child: u32,
    /// Position the vault will expect next.
    next_child: u32,
    /// New root committed on-chain by this Advance (hex).
    new_root: String,
}

#[derive(Serialize)]
struct SignedInitializeOut {
    instruction: JsInstruction,
    wallet_id: String,
    vault_address: String,
    next_child: u32,
    next_root: String,
}

#[derive(Serialize)]
struct VaultState {
    wallet_id: String,
    root: String,
    bump: u8,
}

// ── helpers ──────────────────────────────────────────────────────────

fn err<E: std::fmt::Display>(e: E) -> JsError {
    JsError::new(&e.to_string())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn to_32(bytes: &[u8], what: &str) -> Result<[u8; 32], JsError> {
    bytes
        .try_into()
        .map_err(|_| JsError::new(&format!("{what} must be 32 bytes, got {}", bytes.len())))
}

fn parse_address(s: &str, what: &str) -> Result<Address, JsError> {
    s.parse()
        .map_err(|e| JsError::new(&format!("invalid {what} address: {e}")))
}

fn normalize_note(note: &str) -> Zeroizing<String> {
    Zeroizing::new(
        note.split_whitespace()
            .map(|w| w.to_ascii_lowercase())
            .collect::<Vec<_>>()
            .join(" "),
    )
}

/// Root of the key at `(wallet 0, parent 0, child)`.
fn root_at_inner(note: &str, child: u32) -> Result<[u8; 32], JsError> {
    let kp = WinternitzKeypair::from_mnemonic_at(note, 0, 0, child).map_err(err)?;
    Ok(*kp.derive::<WINTERNITZ_SCALARS>().to_pubkey().merklize().as_bytes())
}

fn to_json<T: Serialize>(v: &T) -> Result<String, JsError> {
    serde_json::to_string(v).map_err(err)
}

// ── public API ───────────────────────────────────────────────────────

/// Program ID this module (and the vendored Winterwallet crates) is pinned to.
#[wasm_bindgen]
pub fn program_id() -> String {
    winterwallet_common::ID.to_string()
}

/// Number of words in a quantum note.
#[wasm_bindgen]
pub fn note_word_count() -> u32 {
    24
}

/// Turn 32 bytes of caller-supplied entropy (from `crypto.getRandomValues`)
/// into a 24-word quantum note. Pure BIP-39 encoding from Winterwallet core.
#[wasm_bindgen]
pub fn generate_note(entropy: &[u8]) -> Result<String, JsError> {
    let entropy = to_32(entropy, "entropy")?;
    let words = WinternitzKeypair::generate_mnemonic(entropy);
    Ok(words.join(" "))
}

/// The BIP-39 English wordlist, newline separated (for the backup quiz UI).
#[wasm_bindgen]
pub fn wordlist() -> String {
    WinternitzKeypair::WORDLIST.to_string()
}

/// True if the note has a valid word count, words and checksum.
#[wasm_bindgen]
pub fn validate_note(note: &str) -> bool {
    let note = normalize_note(note);
    WinternitzKeypair::from_mnemonic(&note, 0).is_ok()
}

/// 32-byte wallet ID (merkle root of the position-0 key) for a note.
#[wasm_bindgen]
pub fn wallet_id(note: &str) -> Result<Vec<u8>, JsError> {
    let note = normalize_note(note);
    Ok(wallet_id_from_mnemonic(&note).map_err(err)?.to_vec())
}

/// Vault PDA (base58) for a note.
#[wasm_bindgen]
pub fn vault_address(note: &str) -> Result<String, JsError> {
    let note = normalize_note(note);
    let id = wallet_id_from_mnemonic(&note).map_err(err)?;
    Ok(find_wallet_address(&id).0.to_string())
}

/// Root (32 bytes) of the key at child position `child`.
#[wasm_bindgen]
pub fn root_at(note: &str, child: u32) -> Result<Vec<u8>, JsError> {
    let note = normalize_note(note);
    Ok(root_at_inner(&note, child)?.to_vec())
}

/// Decode the 65-byte on-chain vault account.
#[wasm_bindgen]
pub fn decode_vault_account(data: &[u8]) -> Result<String, JsError> {
    let acc = WinterWalletAccount::from_bytes(data).map_err(err)?;
    to_json(&VaultState {
        wallet_id: hex(&acc.id),
        root: hex(acc.root.as_bytes()),
        bump: acc.bump[0],
    })
}

/// Find the child position whose key root equals `on_chain_root`, scanning
/// positions `1..=max_depth` (position 0 is consumed by Initialize).
/// Mirrors `winterwallet recover`.
#[wasm_bindgen]
pub fn recover_position(note: &str, on_chain_root: &[u8], max_depth: u32) -> Result<u32, JsError> {
    let note = normalize_note(note);
    let target = to_32(on_chain_root, "on_chain_root")?;
    for child in 1..=max_depth {
        if root_at_inner(&note, child)? == target {
            return Ok(child);
        }
    }
    Err(JsError::new(&format!(
        "key position not found within {max_depth} positions; wrong note or vault has rotated further"
    )))
}

/// Sign the Initialize preimage with position 0 and build the Initialize
/// instruction (`payer` pays rent). Position 0 is consumed; the vault will
/// expect position 1 next.
#[wasm_bindgen]
pub fn sign_initialize(note: &str, payer: &str) -> Result<String, JsError> {
    let note = normalize_note(note);
    let payer = parse_address(payer, "payer")?;
    let wallet_id = wallet_id_from_mnemonic(&note).map_err(err)?;
    let (pda, _bump) = find_wallet_address(&wallet_id);

    let mut keypair = WinternitzKeypair::from_mnemonic(&note, 0).map_err(err)?;
    let next = SigningPosition::new(0, 0, 0).next().map_err(err)?;
    let next_root = root_at_inner(&note, next.child())?;

    let preimage = winterwallet_client::initialize_preimage();
    let sig = keypair.sign_and_increment::<WINTERNITZ_SCALARS>(&preimage);
    let sig_bytes: &[u8; winterwallet_common::SIGNATURE_LEN] =
        sig.as_bytes().try_into().map_err(|_| JsError::new("signature size mismatch"))?;

    let ix = winterwallet_client::initialize(&payer, &pda, sig_bytes, &next_root);
    to_json(&SignedInitializeOut {
        instruction: (&ix).into(),
        wallet_id: hex(&wallet_id),
        vault_address: pda.to_string(),
        next_child: next.child(),
        next_root: hex(&next_root),
    })
}

/// Shared Advance signing path: builds the plan, checks the key at `child`
/// matches `current_root`, signs with `sign_and_increment`, returns the
/// instruction. The signature commits to the new root for `child + 1`.
fn sign_advance(
    note: &str,
    child: u32,
    current_root: &[u8],
    inner: &[Instruction],
) -> Result<String, JsError> {
    let current_root = to_32(current_root, "current_root")?;
    let wallet_id = wallet_id_from_mnemonic(note).map_err(err)?;
    let position = SigningPosition::new(0, 0, child);
    let next = position.next().map_err(err)?;
    let new_root = root_at_inner(note, next.child())?;

    let wallet = WinterWallet::new(wallet_id, current_root, position);
    let unsigned = wallet.advance_plan(&new_root, inner).map_err(err)?;

    let mut keypair = WinternitzKeypair::from_mnemonic_at(note, 0, 0, child).map_err(err)?;
    // `sign` verifies the derived root == current_root before consuming the position.
    let signed = unsigned.sign(&mut keypair).map_err(err)?;
    // Winterwallet's state machine: SignedAdvance -> persist -> PersistedAdvance -> instruction.
    // In the browser the durable record of a consumed position is the on-chain
    // root itself (callers always `recover_position` right before signing), so
    // the persistence adapter is a no-op.
    let persisted = signed.persist(&mut NoopPersistence)?;
    let ix = persisted.advance_instruction();
    to_json(&SignedAdvanceOut {
        instruction: (&ix).into(),
        signed_child: child,
        next_child: next.child(),
        new_root: hex(&new_root),
    })
}

struct NoopPersistence;
impl winterwallet_client::AdvancePersistence for NoopPersistence {
    type Error = JsError;
    fn persist_signed_advance(
        &mut self,
        _advance: &winterwallet_client::SignedAdvance,
    ) -> Result<(), Self::Error> {
        Ok(())
    }
}

/// Withdraw SOL from the vault. `transfers` is JSON
/// `[{"to": "<base58>", "lamports": "<u64 as string>"}, ...]` — the vault's
/// fee transfer is simply a second entry. All transfers are inner CPIs of one
/// Advance, i.e. covered by one signature.
#[wasm_bindgen]
pub fn sign_withdraw_sol(
    note: &str,
    child: u32,
    current_root: &[u8],
    transfers_json: &str,
) -> Result<String, JsError> {
    let note = normalize_note(note);
    let wallet_id = wallet_id_from_mnemonic(&note).map_err(err)?;
    let (pda, _bump) = find_wallet_address(&wallet_id);
    let transfers: Vec<SolTransfer> = serde_json::from_str(transfers_json).map_err(err)?;
    if transfers.is_empty() {
        return Err(JsError::new("no transfers"));
    }
    let mut inner = Vec::with_capacity(transfers.len());
    for t in &transfers {
        let to = parse_address(&t.to, "destination")?;
        let lamports: u64 = t.lamports.parse().map_err(err)?;
        if lamports == 0 {
            return Err(JsError::new("lamports must be > 0"));
        }
        inner.push(withdraw(&pda, &to, lamports));
    }
    sign_advance(&note, child, current_root, &inner)
}

/// Transfer SPL / Token-2022 tokens out of the vault's token account.
/// `transfers` is JSON `[{"destination_token_account": "<base58>", "amount": "<u64>"}, ...]`.
#[wasm_bindgen]
pub fn sign_transfer_tokens(
    note: &str,
    child: u32,
    current_root: &[u8],
    token_program: &str,
    source_token_account: &str,
    transfers_json: &str,
) -> Result<String, JsError> {
    let note = normalize_note(note);
    let wallet_id = wallet_id_from_mnemonic(&note).map_err(err)?;
    let (pda, _bump) = find_wallet_address(&wallet_id);
    let token_program = parse_address(token_program, "token program")?;
    let source = parse_address(source_token_account, "source token account")?;
    let transfers: Vec<TokenTransfer> = serde_json::from_str(transfers_json).map_err(err)?;
    if transfers.is_empty() {
        return Err(JsError::new("no transfers"));
    }
    let mut inner = Vec::with_capacity(transfers.len());
    for t in &transfers {
        let dest = parse_address(&t.destination_token_account, "destination token account")?;
        let amount: u64 = t.amount.parse().map_err(err)?;
        if amount == 0 {
            return Err(JsError::new("amount must be > 0"));
        }
        inner.push(token_transfer(&source, &dest, &pda, amount, &token_program));
    }
    sign_advance(&note, child, current_root, &inner)
}

#[derive(serde::Deserialize)]
struct SolTransfer {
    to: String,
    lamports: String,
}

#[derive(serde::Deserialize)]
struct TokenTransfer {
    destination_token_account: String,
    amount: String,
}
