// Proves the WASM module reproduces, byte for byte, the instructions the
// Winterwallet CLI submitted to devnet in Milestone 1 (same note, same positions).
// Winternitz signing is deterministic, so re-deriving a signature over an
// already-published message leaks nothing and burns nothing.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import bs58 from "bs58";
import * as wasm from "../../pkg-node/quantum_vault_wasm.js";

const here = dirname(fileURLToPath(import.meta.url));
const RPC = process.env.RPC ?? "https://api.devnet.solana.com";
const note = JSON.parse(readFileSync(join(here, "../../../keys/vault-m1.json"), "utf8")).mnemonic;

// Facts from docs/m1-devnet-run.md (CLI run on devnet, 2026-10-04).
const EXPECTED = {
  program: "BCLxfv6Rv8YGTVFGRVp711k4WSjsGoySmXRwPVyh7n9r",
  walletId: "512b9637286c120f15d6f5799063a8bee3546f35e021d5ffe37bb8911c745469",
  pda: "6wAcVnCz6tm6qN29UHcCbQzGK1jCWbr2RpcspMQfewG6",
  payer: "5XrgFMT8bjahGeuNApd5mWVvBUiDcdNCT7fWk6cP33Hg",
  receiver: "Gr5LDogEFKd9wVkEht1koj4kM93eNkBNdYTiQoycNZDJ",
  tx: {
    init: "42EBVS68DxHHQEASmaWwYge3S4XULweeWM7ZHCkoWGfC4dywUUP6GC3GKGiTR1xEHAD4GBHGRpTJRpoNFhi2kdsy",
    withdraw: "2xQ3VSaQ2LnB37EdijNahPjkPamRCYDnMBCn16AN6BrV7Z3MPLaqBdETFo6GkGQp8EHgkEumuBzrSeBXyLHmkzHk",
    spl: "FbiZDpN988nKXEraGq27imNpiWKtSsRhobctNgstd8ZqzHhgJXux9ZWK7A6HEW6osCe4EMxi9iiotoU636ke2Uf",
    t22: "2dZeEH46TvfVxxitYTmMvYWinGZnNwvufmBRqytTmtMdruk5bjArtcNjKLduPFVYmdrFyonawxJvs3UvJR7qbWZc",
  },
  spl: { program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", src: "FjW4f7gKBL1za9tcNEdsbqd9dxApkizeZ1EGYhVGCiR4", dst: "HjH8D4yyoiu7vJCzY2TX2DsJKRVeTRLapvH7zG7rb8C9" },
  t22: { program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", src: "EmNxWATTZtjf7LgxMvcC5amJnH7CH65iP1CMY7KKw4Ak", dst: "Dm5asKdxTaJLh8A8yYrCVG6EFHhmBeLBmrnKG5ZiN6Hn" },
};

let failures = 0;
const hex = (u8) => Buffer.from(u8).toString("hex");
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
}

async function rpc(method, params) {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(`${method}: ${JSON.stringify(j.error)}`);
  return j.result;
}

/** Fetch the on-chain instruction that targets our program: {accounts:[base58], data:Uint8Array}. */
async function onChainProgramIx(sig) {
  const tx = await rpc("getTransaction", [sig, { encoding: "json", commitment: "confirmed", maxSupportedTransactionVersion: 0 }]);
  const keys = tx.transaction.message.accountKeys;
  const ix = tx.transaction.message.instructions.find((i) => keys[i.programIdIndex] === EXPECTED.program);
  return { accounts: ix.accounts.map((i) => keys[i]), data: bs58.decode(ix.data), err: tx.meta.err };
}

function compareIx(name, onchain, ours) {
  check(`${name}: on-chain tx succeeded`, onchain.err === null);
  check(`${name}: program id`, ours.program_id === EXPECTED.program);
  check(`${name}: account list identical`, JSON.stringify(ours.accounts.map((a) => a.pubkey)) === JSON.stringify(onchain.accounts),
    `(${onchain.accounts.length} accounts)`);
  const same = hex(ours.data) === hex(onchain.data);
  check(`${name}: instruction data identical (${onchain.data.length} bytes incl. 768-byte Winternitz signature)`, same);
  if (!same) {
    console.log("   on-chain:", hex(onchain.data).slice(0, 80), "...");
    console.log("   ours:    ", hex(ours.data).slice(0, 80), "...");
  }
}

// ── static derivations ───────────────────────────────────────────────
check("program_id pinned", wasm.program_id() === EXPECTED.program, wasm.program_id());
check("note validates", wasm.validate_note(note));
check("note has 24 words", note.split(" ").length === 24 && wasm.note_word_count() === 24);
check("wallet_id matches CLI create", hex(wasm.wallet_id(note)) === EXPECTED.walletId);
check("vault PDA matches CLI create", wasm.vault_address(note) === EXPECTED.pda, wasm.vault_address(note));
check("case/whitespace-insensitive note", wasm.vault_address("  " + note.toUpperCase().replace(/ /g, "   ") + "\n") === EXPECTED.pda);
check("12-word mnemonic accepted on input (core validate)", wasm.validate_note("earn foster affair make exclude object spring oppose one hollow garage kind"));
check("bad checksum rejected", !wasm.validate_note(note.replace(/\w+$/, "abandon")));
const gen = wasm.generate_note(new Uint8Array(32).fill(7));
check("generate_note(entropy) -> 24 valid words", gen.split(" ").length === 24 && wasm.validate_note(gen));
const genVec = wasm.generate_note(new Uint8Array(32)); // all-zero entropy = BIP-39 test vector
check("generate_note matches BIP-39 vector for zero entropy", genVec === Array(23).fill("abandon").join(" ") + " art", genVec.slice(0, 40) + "...");

// ── Initialize (position 0) ──────────────────────────────────────────
const init = JSON.parse(wasm.sign_initialize(note, EXPECTED.payer));
compareIx("Initialize", await onChainProgramIx(EXPECTED.tx.init), init.instruction);
check("Initialize: next_root == root_at(1)", init.next_root === hex(wasm.root_at(note, 1)));

// ── Advance(Withdraw) at position 1 ──────────────────────────────────
const wd = JSON.parse(wasm.sign_withdraw_sol(note, 1, wasm.root_at(note, 1),
  JSON.stringify([{ to: EXPECTED.receiver, lamports: "100000000" }])));
compareIx("Advance(Withdraw 0.1 SOL)", await onChainProgramIx(EXPECTED.tx.withdraw), wd.instruction);
check("Withdraw: new_root == root_at(2)", wd.new_root === hex(wasm.root_at(note, 2)) && wd.next_child === 2);

// ── Advance(SPL Token transfer) at position 2 ────────────────────────
const spl = JSON.parse(wasm.sign_transfer_tokens(note, 2, wasm.root_at(note, 2), EXPECTED.spl.program, EXPECTED.spl.src,
  JSON.stringify([{ destination_token_account: EXPECTED.spl.dst, amount: "1000000" }])));
compareIx("Advance(SPL Token transfer)", await onChainProgramIx(EXPECTED.tx.spl), spl.instruction);

// ── Advance(Token-2022 transfer) at position 3 ───────────────────────
const t22 = JSON.parse(wasm.sign_transfer_tokens(note, 3, wasm.root_at(note, 3), EXPECTED.t22.program, EXPECTED.t22.src,
  JSON.stringify([{ destination_token_account: EXPECTED.t22.dst, amount: "1000000" }])));
compareIx("Advance(Token-2022 transfer)", await onChainProgramIx(EXPECTED.tx.t22), t22.instruction);

// ── Safety rails ─────────────────────────────────────────────────────
let threw = false;
try { wasm.sign_withdraw_sol(note, 2, wasm.root_at(note, 1), JSON.stringify([{ to: EXPECTED.receiver, lamports: "1" }])); }
catch (e) { threw = /root/i.test(String(e)); }
check("refuses to sign when position does not match the root (RootMismatch)", threw);

// ── Live recovery from the on-chain root ─────────────────────────────
const acct = await rpc("getAccountInfo", [EXPECTED.pda, { encoding: "base64", commitment: "confirmed" }]);
const data = Buffer.from(acct.value.data[0], "base64");
const state = JSON.parse(wasm.decode_vault_account(data));
check("decode_vault_account: wallet id", state.wallet_id === EXPECTED.walletId);
const t0 = Date.now();
const pos = wasm.recover_position(note, Buffer.from(state.root, "hex"), 10000);
check("recover_position from live on-chain root == 4 (after init + 3 advances)", pos === 4, `child=${pos}, ${Date.now() - t0} ms`);

// ── Multi-transfer (fee) plan fits a legacy transaction ──────────────
const feePlan = JSON.parse(wasm.sign_withdraw_sol(note, pos, Buffer.from(state.root, "hex"),
  JSON.stringify([{ to: EXPECTED.receiver, lamports: "1000000" }, { to: EXPECTED.payer, lamports: "3000" }])));
check("withdraw+fee Advance built (2 inner CPIs, not sent)", feePlan.instruction.accounts.length === 7 && feePlan.instruction.data.length === 1 + 768 + 32 + 1 + 2 * (1 + 2 + 9),
  `${feePlan.instruction.data.length} bytes data, ${feePlan.instruction.accounts.length} accounts`);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
