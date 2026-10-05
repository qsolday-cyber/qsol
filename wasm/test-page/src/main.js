// Bare test page: drives the Quantum Vault WASM module against devnet with a
// browser-local test keypair as fee payer. No framework, no wallet adapter.
import init, * as wasm from "../../pkg/quantum_vault_wasm.js";
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
  SystemProgram, ComputeBudgetProgram, LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { Buffer } from "buffer";
globalThis.Buffer ??= Buffer;

const RPC = "https://api.devnet.solana.com";
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SIM_CU_CEILING = 1_400_000;
const conn = new Connection(RPC, "confirmed");
const $ = (id) => document.getElementById(id);
const logEl = $("log");
const log = (...a) => { logEl.textContent += a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ") + "\n"; logEl.scrollTop = logEl.scrollHeight; };
const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (h) => Uint8Array.from(h.match(/../g), (x) => parseInt(x, 16));

// ── payer (browser test keypair) ─────────────────────────────────────
let payer;
try {
  const saved = localStorage.getItem("qv-test-payer");
  payer = saved ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved))) : Keypair.generate();
  localStorage.setItem("qv-test-payer", JSON.stringify(Array.from(payer.secretKey)));
} catch { payer = Keypair.generate(); }
$("payer-addr").textContent = payer.publicKey.toBase58();
async function refreshPayer() {
  $("payer-bal").textContent = (await conn.getBalance(payer.publicKey)) / LAMPORTS_PER_SOL + " SOL";
}

// ── tx plumbing (mirrors cli/src/helpers.rs simulate_sign_send) ──────
function toIx(j) {
  return new TransactionInstruction({
    programId: new PublicKey(j.program_id),
    keys: j.accounts.map((a) => ({ pubkey: new PublicKey(a.pubkey), isSigner: a.is_signer, isWritable: a.is_writable })),
    data: Buffer.from(j.data),
  });
}
async function sendIxs(ixs, { budget = false } = {}) {
  let final = ixs;
  if (budget) {
    const sim = new Transaction().add(ComputeBudgetProgram.setComputeUnitLimit({ units: SIM_CU_CEILING }), ...ixs);
    sim.feePayer = payer.publicKey;
    sim.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
    const r = await conn.simulateTransaction(sim);
    if (r.value.err) throw new Error("simulation failed: " + JSON.stringify(r.value.err) + "\n" + (r.value.logs ?? []).join("\n"));
    const cu = Math.max(10_000, Math.floor((r.value.unitsConsumed * 11 + 9) / 10));
    log(`  simulated ${r.value.unitsConsumed} CU → limit ${cu}`);
    final = [ComputeBudgetProgram.setComputeUnitLimit({ units: cu }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 0 }), ...ixs];
  }
  const tx = new Transaction().add(...final);
  tx.feePayer = payer.publicKey;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.sign(payer);
  const raw = tx.serialize();
  log(`  tx size ${raw.length} bytes`);
  const sig = await conn.sendRawTransaction(raw, { skipPreflight: true });
  const conf = await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  if (conf.value.err) throw new Error("tx failed: " + JSON.stringify(conf.value.err));
  log(`  confirmed ${sig}`);
  return sig;
}

// ── note ─────────────────────────────────────────────────────────────
const noteEl = $("note");
const note = () => noteEl.value.trim();
function onNoteChange() {
  const n = note();
  const ok = n.length > 0 && wasm.validate_note(n);
  $("note-valid").textContent = n ? String(ok) : "—";
  $("wallet-id").textContent = ok ? hex(wasm.wallet_id(n)) : "—";
  $("vault-addr").textContent = ok ? wasm.vault_address(n) : "—";
}
noteEl.addEventListener("input", onNoteChange);
$("btn-generate").onclick = () => {
  const entropy = new Uint8Array(32);
  crypto.getRandomValues(entropy);
  noteEl.value = wasm.generate_note(entropy);
  entropy.fill(0);
  onNoteChange();
  log("generated a new 24-word note in the browser");
};
function requireNote() { const n = note(); if (!wasm.validate_note(n)) throw new Error("invalid note"); return n; }
const pda = () => new PublicKey(wasm.vault_address(requireNote()));

// ── vault info + position recovery ───────────────────────────────────
async function vaultInfo() {
  const n = requireNote();
  const acct = await conn.getAccountInfo(pda());
  if (!acct) { $("v-exists").textContent = "no"; $("v-bal").textContent = $("v-root").textContent = $("v-pos").textContent = "—"; return null; }
  const state = JSON.parse(wasm.decode_vault_account(new Uint8Array(acct.data)));
  const t0 = performance.now();
  const child = wasm.recover_position(n, fromHex(state.root), 10000);
  $("v-exists").textContent = "yes"; $("v-bal").textContent = acct.lamports / LAMPORTS_PER_SOL + " SOL";
  $("v-root").textContent = state.root; $("v-pos").textContent = `${child} (recovered in ${(performance.now() - t0).toFixed(0)} ms)`;
  return { state, child, lamports: acct.lamports };
}
$("btn-info").onclick = () => vaultInfo().then((i) => log("vault info", i ?? "not initialized")).catch((e) => log("ERR", String(e)));

$("btn-init").onclick = async () => {
  try {
    const out = JSON.parse(wasm.sign_initialize(requireNote(), payer.publicKey.toBase58()));
    log(`init: vault ${out.vault_address}, position 0 signed in WASM, next root ${out.next_root.slice(0, 16)}…`);
    await sendIxs([toIx(out.instruction)], { budget: true });
    await vaultInfo(); await refreshPayer();
  } catch (e) { log("ERR", String(e)); }
};
$("btn-deposit").onclick = async () => {
  try {
    log("deposit 0.2 SOL → vault (plain system transfer)");
    await sendIxs([SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: pda(), lamports: 0.2 * LAMPORTS_PER_SOL })]);
    await vaultInfo(); await refreshPayer();
  } catch (e) { log("ERR", String(e)); }
};

// A signed Advance that has not confirmed yet. If sending fails we re-send
// THIS instruction (same message, same signature) rather than signing again.
let pendingAdvance = null;
async function advance(label, signFn) {
  const info = await vaultInfo();
  if (!info) throw new Error("vault not initialized");
  let ix;
  if (pendingAdvance && pendingAdvance.child === info.child && pendingAdvance.root === info.state.root) {
    log(`  re-sending previously signed Advance for position ${info.child} (never re-sign a different message)`);
    ix = pendingAdvance.ix;
  } else {
    const out = JSON.parse(signFn(info.child, fromHex(info.state.root)));
    log(`${label}: signed position ${out.signed_child} in WASM, new root ${out.new_root.slice(0, 16)}…`);
    ix = toIx(out.instruction);
    pendingAdvance = { child: info.child, root: info.state.root, ix };
  }
  await sendIxs([ix], { budget: true });
  pendingAdvance = null;
  await vaultInfo(); await refreshPayer();
}
$("btn-withdraw").onclick = () => advance("withdraw 0.05 SOL → payer", (child, root) =>
  wasm.sign_withdraw_sol(requireNote(), child, root, JSON.stringify([{ to: payer.publicKey.toBase58(), lamports: String(0.05 * LAMPORTS_PER_SOL) }]))
).catch((e) => log("ERR", String(e)));

// ── tokens ───────────────────────────────────────────────────────────
const mint = () => new PublicKey($("tok-mint").value.trim());
const tokProg = () => new PublicKey($("tok-program").value);
const ata = (owner) => PublicKey.findProgramAddressSync([owner.toBytes(), tokProg().toBytes(), mint().toBytes()], ATA_PROGRAM)[0];
const createAtaIdempotent = (owner) => new TransactionInstruction({
  programId: ATA_PROGRAM, data: Buffer.from([1]),
  keys: [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true }, { pubkey: ata(owner), isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false }, { pubkey: mint(), isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, { pubkey: tokProg(), isSigner: false, isWritable: false },
  ],
});
async function tokBal(owner) {
  try { return (await conn.getTokenAccountBalance(ata(owner))).value.amount; } catch { return "(no account)"; }
}
async function refreshTokens() {
  $("tok-vault-bal").textContent = await tokBal(pda()); $("tok-payer-bal").textContent = await tokBal(payer.publicKey);
}
$("btn-tok-refresh").onclick = () => refreshTokens().catch((e) => log("ERR", String(e)));
$("btn-tok-deposit").onclick = async () => {
  try {
    const amount = BigInt($("tok-amount").value);
    const data = Buffer.alloc(9); data[0] = 3; data.writeBigUInt64LE(amount, 1); // SPL Token `Transfer`
    log(`deposit ${amount} base units payer → vault (create vault ATA if needed + transfer)`);
    await sendIxs([createAtaIdempotent(pda()), new TransactionInstruction({ programId: tokProg(), data, keys: [
      { pubkey: ata(payer.publicKey), isSigner: false, isWritable: true }, { pubkey: ata(pda()), isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false } ] })]);
    await refreshTokens();
  } catch (e) { log("ERR", String(e)); }
};
$("btn-tok-withdraw").onclick = async () => {
  try {
    if (!(await conn.getAccountInfo(ata(payer.publicKey)))) { log("creating payer ATA first"); await sendIxs([createAtaIdempotent(payer.publicKey)]); }
    const amount = $("tok-amount").value;
    await advance(`transfer ${amount} base units vault → payer`, (child, root) =>
      wasm.sign_transfer_tokens(requireNote(), child, root, tokProg().toBase58(), ata(pda()).toBase58(),
        JSON.stringify([{ destination_token_account: ata(payer.publicKey).toBase58(), amount }])));
    await refreshTokens();
  } catch (e) { log("ERR", String(e)); }
};

// ── CLI equivalence (Milestone 1 devnet transactions) ────────────────
const M1 = {
  program: "BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r", payer: "5XrgFMT8bjahGeuNApd5mWVvBUiDcdNCT7fWk6cP33Hg",
  receiver: "Gr5LDogEFKd9wVkEht1koj4kM93eNkBNdYTiQoycNZDJ",
  cases: [
    ["Initialize", "42EBVS68DxHHQEASmaWwYge3S4XULweeWM7ZHCkoWGfC4dywUUP6GC3GKGiTR1xEHAD4GBHGRpTJRpoNFhi2kdsy",
      (n) => wasm.sign_initialize(n, "5XrgFMT8bjahGeuNApd5mWVvBUiDcdNCT7fWk6cP33Hg")],
    ["Advance(Withdraw) pos 1", "2xQ3VSaQ2LnB37EdijNahPjkPamRCYDnMBCn16AN6BrV7Z3MPLaqBdETFo6GkGQp8EHgkEumuBzrSeBXyLHmkzHk",
      (n) => wasm.sign_withdraw_sol(n, 1, wasm.root_at(n, 1), JSON.stringify([{ to: "Gr5LDogEFKd9wVkEht1koj4kM93eNkBNdYTiQoycNZDJ", lamports: "100000000" }]))],
    ["Advance(SPL transfer) pos 2", "FbiZDpN988nKXEraGq27imNpiWKtSsRhobctNgstd8ZqzHhgJXux9ZWK7A6HEW6osCe4EMxi9iiotoU636ke2Uf",
      (n) => wasm.sign_transfer_tokens(n, 2, wasm.root_at(n, 2), "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "FjW4f7gKBL1za9tcNEdsbqd9dxApkizeZ1EGYhVGCiR4", JSON.stringify([{ destination_token_account: "HjH8D4yyoiu7vJCzY2TX2DsJKRVeTRLapvH7zG7rb8C9", amount: "1000000" }]))],
    ["Advance(Token-2022 transfer) pos 3", "2dZeEH46TvfVxxitYTmMvYWinGZnNwvufmBRqytTmtMdruk5bjArtcNjKLduPFVYmdrFyonawxJvs3UvJR7qbWZc",
      (n) => wasm.sign_transfer_tokens(n, 3, wasm.root_at(n, 3), "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", "EmNxWATTZtjf7LgxMvcC5amJnH7CH65iP1CMY7KKw4Ak", JSON.stringify([{ destination_token_account: "Dm5asKdxTaJLh8A8yYrCVG6EFHhmBeLBmrnKG5ZiN6Hn", amount: "1000000" }]))],
  ],
};
$("btn-equiv").onclick = async () => {
  try {
    const n = requireNote();
    if (wasm.vault_address(n) !== "6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6") { log("equivalence: this is not the Milestone 1 test note; skipping"); return; }
    let pass = 0;
    for (const [label, sig, build] of M1.cases) {
      const tx = await conn.getTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      const keys = tx.transaction.message.accountKeys.map((k) => k.toBase58());
      const ix = tx.transaction.message.instructions.find((i) => keys[i.programIdIndex] === M1.program);
      const ours = JSON.parse(build(n)).instruction;
      const dataSame = hex(bs58.decode(ix.data)) === hex(Uint8Array.from(ours.data));
      const accSame = JSON.stringify(ix.accounts.map((i) => keys[i])) === JSON.stringify(ours.accounts.map((a) => a.pubkey));
      log(`${dataSame && accSame ? "PASS" : "FAIL"}  ${label}: ${ours.data.length}-byte data ${dataSame ? "identical" : "DIFFERENT"}, accounts ${accSame ? "identical" : "DIFFERENT"}`);
      if (dataSame && accSame) pass++;
    }
    log(`equivalence: ${pass}/${M1.cases.length} CLI instructions reproduced byte-for-byte in the browser`);
  } catch (e) { log("ERR", String(e)); }
};

// ── boot ─────────────────────────────────────────────────────────────
await init({ module_or_path: new URL("/quantum_vault_wasm_bg.wasm", location.href) });
log(`wasm loaded; program ${wasm.program_id()}; note length ${wasm.note_word_count()} words`);
$("btn-payer-refresh").onclick = () => refreshPayer().catch((e) => log("ERR", String(e)));
await refreshPayer();
