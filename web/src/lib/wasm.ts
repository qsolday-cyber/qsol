// Loads the Winterwallet-based signing module (built from ../../wasm with wasm-pack).
import init, * as wasm from "../wasm/quantum_vault_wasm.js";

export type Wasm = typeof wasm;

let ready: Promise<Wasm> | null = null;

export function loadWasm(): Promise<Wasm> {
  ready ??= init().then(() => wasm);
  return ready;
}

export type WasmAccountMeta = {
  pubkey: string;
  is_signer: boolean;
  is_writable: boolean;
};
export type WasmInstruction = {
  program_id: string;
  accounts: WasmAccountMeta[];
  data: number[];
};
export type SignedAdvanceOut = {
  instruction: WasmInstruction;
  signed_child: number;
  next_child: number;
  new_root: string;
};
export type SignedInitializeOut = {
  instruction: WasmInstruction;
  wallet_id: string;
  vault_address: string;
  next_child: number;
  next_root: string;
};
export type VaultState = { wallet_id: string; root: string; bump: number };
