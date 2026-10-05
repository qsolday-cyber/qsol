/* tslint:disable */
/* eslint-disable */

/**
 * Decode the 65-byte on-chain vault account.
 */
export function decode_vault_account(data: Uint8Array): string;

/**
 * Turn 32 bytes of caller-supplied entropy (from `crypto.getRandomValues`)
 * into a 24-word quantum note. Pure BIP-39 encoding from Winterwallet core.
 */
export function generate_note(entropy: Uint8Array): string;

/**
 * Number of words in a quantum note.
 */
export function note_word_count(): number;

/**
 * Program ID this module (and the vendored Winterwallet crates) is pinned to.
 */
export function program_id(): string;

/**
 * Find the child position whose key root equals `on_chain_root`, scanning
 * positions `1..=max_depth` (position 0 is consumed by Initialize).
 * Mirrors `winterwallet recover`.
 */
export function recover_position(note: string, on_chain_root: Uint8Array, max_depth: number): number;

/**
 * Root (32 bytes) of the key at child position `child`.
 */
export function root_at(note: string, child: number): Uint8Array;

/**
 * Sign the Initialize preimage with position 0 and build the Initialize
 * instruction (`payer` pays rent). Position 0 is consumed; the vault will
 * expect position 1 next.
 */
export function sign_initialize(note: string, payer: string): string;

/**
 * Transfer SPL / Token-2022 tokens out of the vault's token account.
 * `transfers` is JSON `[{"destination_token_account": "<base58>", "amount": "<u64>"}, ...]`.
 */
export function sign_transfer_tokens(note: string, child: number, current_root: Uint8Array, token_program: string, source_token_account: string, transfers_json: string): string;

/**
 * Withdraw SOL from the vault. `transfers` is JSON
 * `[{"to": "<base58>", "lamports": "<u64 as string>"}, ...]` — the vault's
 * fee transfer is simply a second entry. All transfers are inner CPIs of one
 * Advance, i.e. covered by one signature.
 */
export function sign_withdraw_sol(note: string, child: number, current_root: Uint8Array, transfers_json: string): string;

/**
 * True if the note has a valid word count, words and checksum.
 */
export function validate_note(note: string): boolean;

/**
 * Vault PDA (base58) for a note.
 */
export function vault_address(note: string): string;

/**
 * 32-byte wallet ID (merkle root of the position-0 key) for a note.
 */
export function wallet_id(note: string): Uint8Array;

/**
 * The BIP-39 English wordlist, newline separated (for the backup quiz UI).
 */
export function wordlist(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly decode_vault_account: (a: number, b: number) => [number, number, number, number];
    readonly generate_note: (a: number, b: number) => [number, number, number, number];
    readonly note_word_count: () => number;
    readonly program_id: () => [number, number];
    readonly recover_position: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly root_at: (a: number, b: number, c: number) => [number, number, number, number];
    readonly sign_initialize: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly sign_transfer_tokens: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number, number, number];
    readonly sign_withdraw_sol: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number, number];
    readonly validate_note: (a: number, b: number) => number;
    readonly vault_address: (a: number, b: number) => [number, number, number, number];
    readonly wallet_id: (a: number, b: number) => [number, number, number, number];
    readonly wordlist: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
