// A signed Advance that may not have landed yet. Persisted BEFORE sending so a
// retry (even after a reload) re-sends the identical message instead of asking
// the one-time key at this position to sign something else.
// Nothing here is secret: the instruction goes on chain verbatim.
import type { WasmInstruction } from "./wasm";

export type PendingAdvance = {
  walletId: string; // hex
  child: number;
  root: string; // hex root the signature was made against
  instruction: WasmInstruction;
  label: string;
  createdAt: number;
};

const key = (walletId: string) => `qv:pending-advance:${walletId}`;

export function loadPending(walletId: string): PendingAdvance | null {
  try {
    const raw = localStorage.getItem(key(walletId));
    return raw ? (JSON.parse(raw) as PendingAdvance) : null;
  } catch {
    return null;
  }
}

export function savePending(p: PendingAdvance): void {
  try {
    localStorage.setItem(key(p.walletId), JSON.stringify(p));
  } catch {
    // If storage is unavailable we still proceed; the in-memory copy is used for the current session.
  }
}

export function clearPending(walletId: string): void {
  try {
    localStorage.removeItem(key(walletId));
  } catch {
    /* ignore */
  }
}
