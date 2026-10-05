import { useMemo, useState } from "react";
import { useSolanaClient, useWalletSession } from "@solana/react-hooks";
import { address, type Instruction } from "@solana/kit";
import {
  ASSETS,
  EXPLORER,
  FEE_BPS,
  TREASURY,
  type Asset,
  type TokenAsset,
} from "../config";
import { useWasm } from "../lib/useWasm";
import { useLog } from "../lib/logContext";
import { sendInstructions, toInstruction, walletSigner } from "../lib/tx";
import {
  accountExists,
  ataFor,
  createAtaIx,
  feeFor,
  fetchBalances,
  fetchVault,
  hexToBytes,
  maxWithdrawable,
  rentFloor,
  type Balance,
  type VaultInfo,
} from "../lib/vault";
import {
  clearPending,
  loadPending,
  savePending,
  type PendingAdvance,
} from "../lib/pending";
import type { SignedAdvanceOut } from "../lib/wasm";
import {
  errorMessage,
  formatUnits,
  parseUnits,
  shortAddr,
} from "../lib/format";
import {
  Button,
  Field,
  Notice,
  Readout,
  Row,
  Step,
  Working,
} from "../components/ui";
import { Console } from "../components/Console";

type Loaded = {
  info: VaultInfo & { exists: true };
  balances: Balance[];
  rent: bigint;
  pending: PendingAdvance | null;
};

export function Withdraw() {
  const { wasm, error: wasmError } = useWasm();
  const client = useSolanaClient();
  const session = useWalletSession();
  const { log } = useLog();

  const [noteInput, setNoteInput] = useState("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [assetSymbol, setAssetSymbol] = useState<string>("SOL");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    sig: string;
    from: number;
    to: number;
  } | null>(null);

  const note = noteInput
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
  const wordCount = note ? note.split(" ").length : 0;
  const noteValid = !!wasm && note.length > 0 && wasm.validate_note(note);
  const vaultAddr = noteValid && wasm ? wasm.vault_address(note) : null;

  const asset = useMemo(
    () => ASSETS.find((a) => a.symbol === assetSymbol) as Asset,
    [assetSymbol]
  );
  const balance = loaded?.balances.find((b) => b.asset.symbol === assetSymbol);
  const available = balance
    ? asset.kind === "sol"
      ? balance.amount - (loaded?.rent ?? 0n)
      : balance.amount
    : 0n;
  const maxAmount = maxWithdrawable(available);
  const report = (s: string) => {
    setStatus(s);
    log(s.toLowerCase(), "dim");
  };

  let parsed: bigint | null = null;
  let fee = 0n;
  try {
    parsed = amount ? parseUnits(amount, asset.decimals) : null;
    fee = parsed ? feeFor(parsed) : 0n;
  } catch {
    parsed = null;
  }

  async function load(keepResult = false) {
    if (!wasm || !noteValid) return;
    setBusy(true);
    setError(null);
    if (!keepResult) setResult(null);
    setNotFound(null);
    try {
      report("Reading vault and recovering key position…");
      const rpc = client.runtime.rpc;
      const t0 = performance.now();
      const info = await fetchVault(rpc, wasm, note);
      if (!info.exists) {
        setLoaded(null);
        setNotFound(info.address);
        log(`no vault at ${info.address}`, "err");
        return;
      }
      const [balances, rent] = await Promise.all([
        fetchBalances(rpc, info.address),
        rentFloor(rpc),
      ]);
      let pending = loadPending(info.state.wallet_id);
      if (
        pending &&
        (pending.child !== info.child || pending.root !== info.state.root)
      ) {
        clearPending(info.state.wallet_id);
        pending = null;
      }
      setLoaded({ info, balances, rent, pending });
      log(
        `vault ${info.address} · root ${info.state.root.slice(0, 16)}… · key position ${info.child} recovered in ${(performance.now() - t0).toFixed(0)} ms`,
        "ok"
      );
      if (pending)
        log(
          `unsent signed withdrawal found at position ${pending.child}: ${pending.label}`,
          "err"
        );
      const first = balances.find((b) => b.amount > 0n);
      if (
        first &&
        !balances.find((b) => b.asset.symbol === assetSymbol && b.amount > 0n)
      )
        setAssetSymbol(first.asset.symbol);
      if (!destination && session)
        setDestination(session.account.address.toString());
    } catch (e) {
      const m = errorMessage(e);
      setError(m);
      log(m, "err");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function sendAdvance(walletId: string, child: number, ix: Instruction) {
    if (!session) throw new Error("Connect a wallet to pay the network fee.");
    const sig = await sendInstructions(client, session, [ix], {
      budget: true,
      onStatus: report,
    });
    clearPending(walletId);
    log(`confirmed ${sig}`, "ok");
    log(
      `key rotated: position ${child} → ${child + 1}; vault address unchanged`,
      "ok"
    );
    setResult({ sig, from: child, to: child + 1 });
    setAmount("");
    await load(true);
  }

  async function retryPending() {
    if (!loaded?.pending) return;
    setBusy(true);
    setError(null);
    try {
      log(
        `re-sending the previously signed ADVANCE for position ${loaded.pending.child} verbatim`
      );
      await sendAdvance(
        loaded.pending.walletId,
        loaded.pending.child,
        toInstruction(loaded.pending.instruction)
      );
    } catch (e) {
      const m = errorMessage(e);
      setError(m);
      log(m, "err");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function withdraw() {
    if (!wasm || !loaded || !session) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { info } = loaded;
      const amt = parseUnits(amount, asset.decimals);
      if (amt <= 0n) throw new Error("Enter an amount greater than zero.");
      const feeAmt = feeFor(amt);
      if (amt + feeAmt > available)
        throw new Error(
          `Amount plus fee exceeds what the vault can send. Max ${formatUnits(maxAmount, asset.decimals)} ${asset.symbol}.`
        );
      let dest: string;
      try {
        dest = address(destination.trim());
      } catch {
        throw new Error("That destination is not a valid Solana address.");
      }
      const { signer } = walletSigner(session);
      const rpc = client.runtime.rpc;

      report("Re-checking vault state…");
      const fresh = await fetchVault(rpc, wasm, note);
      if (
        !fresh.exists ||
        fresh.child !== info.child ||
        fresh.state.root !== info.state.root
      ) {
        throw new Error(
          "The vault changed since it was opened. Open it again and retry."
        );
      }

      let signed: SignedAdvanceOut;
      let label: string;
      if (asset.kind === "sol") {
        const transfers = [{ to: dest, lamports: amt.toString() }];
        if (feeAmt > 0n)
          transfers.push({ to: TREASURY, lamports: feeAmt.toString() });
        label = `${formatUnits(amt, 9)} SOL → ${shortAddr(dest)} (+ fee ${formatUnits(feeAmt, 9)} SOL)`;
        report("Signing in your browser…");
        signed = JSON.parse(
          wasm.sign_withdraw_sol(
            note,
            info.child,
            hexToBytes(info.state.root),
            JSON.stringify(transfers)
          )
        ) as SignedAdvanceOut;
      } else {
        const tok = asset as TokenAsset;
        const vaultAta = await ataFor(info.address, tok);
        const destAta = await ataFor(dest, tok);
        const treasuryAta = await ataFor(TREASURY, tok);
        const prep: Instruction[] = [];
        if (!(await accountExists(rpc, destAta)))
          prep.push(createAtaIx(signer, dest, tok, destAta));
        if (feeAmt > 0n && !(await accountExists(rpc, treasuryAta)))
          prep.push(createAtaIx(signer, TREASURY, tok, treasuryAta));
        if (prep.length) {
          report("Creating the destination token account first…");
          const s = await sendInstructions(client, session, prep, {
            onStatus: report,
          });
          log(`token account(s) created ${s}`, "ok");
        }
        const transfers = [
          { destination_token_account: destAta, amount: amt.toString() },
        ];
        if (feeAmt > 0n)
          transfers.push({
            destination_token_account: treasuryAta,
            amount: feeAmt.toString(),
          });
        label = `${formatUnits(amt, tok.decimals)} ${tok.symbol} → ${shortAddr(dest)} (+ fee ${formatUnits(feeAmt, tok.decimals)})`;
        report("Signing in your browser…");
        signed = JSON.parse(
          wasm.sign_transfer_tokens(
            note,
            info.child,
            hexToBytes(info.state.root),
            tok.tokenProgram,
            vaultAta,
            JSON.stringify(transfers)
          )
        ) as SignedAdvanceOut;
      }
      log(
        `signed ADVANCE with one-time key ${info.child} in wasm (768-byte winternitz signature); next root ${signed.new_root.slice(0, 16)}…`
      );

      const pending: PendingAdvance = {
        walletId: info.state.wallet_id,
        child: info.child,
        root: info.state.root,
        instruction: signed.instruction,
        label,
        createdAt: Date.now(),
      };
      savePending(pending);
      log(
        "signed instruction persisted locally before sending (re-sent verbatim on retry)",
        "dim"
      );
      setLoaded({ ...loaded, pending });
      await sendAdvance(
        pending.walletId,
        pending.child,
        toInstruction(signed.instruction)
      );
    } catch (e) {
      const m = errorMessage(e);
      setError(m);
      log(m, "err");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  if (wasmError)
    return (
      <Notice kind="error">
        The signing module failed to load: {wasmError}
      </Notice>
    );

  const instrument = (
    <div className="divide-y divide-hairline">
      {!loaded ? (
        <p className="py-3 text-[13px] leading-relaxed text-ink-soft">
          Your vault will appear here once you paste your note and open it.
        </p>
      ) : null}
      <Readout
        label="pda"
        value={
          loaded
            ? shortAddr(loaded.info.address, 8)
            : vaultAddr
              ? shortAddr(vaultAddr, 8)
              : null
        }
        sub={
          loaded ? (
            <a
              className="underline"
              href={EXPLORER.address(loaded.info.address)}
              target="_blank"
              rel="noreferrer"
            >
              explorer ↗
            </a>
          ) : undefined
        }
      />
      <Readout
        label="balances"
        value={
          loaded
            ? loaded.balances
                .filter((b) => b.amount > 0n)
                .map(
                  (b) =>
                    `${formatUnits(b.amount, b.asset.decimals, 6)} ${b.asset.symbol}`
                )
                .join(" · ") || "0"
            : null
        }
        sub={
          loaded
            ? `${formatUnits(loaded.rent, 9)} SOL stays as rent`
            : undefined
        }
      />
      <Readout
        label="key position"
        value={loaded ? loaded.info.child : null}
        sub={loaded ? "recovered from on-chain root" : undefined}
      />
      <Readout
        label="root"
        value={loaded ? `${loaded.info.state.root.slice(0, 20)}…` : null}
      />
      <Readout
        label="key sync"
        value={
          loaded ? (loaded.pending ? "UNSENT SIGNATURE" : "in sync") : null
        }
        className={loaded?.pending ? "text-crit" : ""}
      />
    </div>
  );

  return (
    <Console instrument={instrument}>
      <Step
        n="1"
        title="Paste your quantum note"
        summary={
          loaded
            ? `vault ${shortAddr(loaded.info.address, 4)} opened`
            : undefined
        }
        done={!!loaded}
        active={!loaded}
      >
        <textarea
          className="field min-h-20"
          rows={3}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          placeholder="24 words, separated by spaces"
          value={noteInput}
          onChange={(e) => {
            setNoteInput(e.target.value);
            setLoaded(null);
            setResult(null);
            setNotFound(null);
          }}
          disabled={busy}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={() => load()}
            disabled={!noteValid || busy}
          >
            {busy && !loaded ? (
              <Working text={status || "opening…"} />
            ) : loaded ? (
              "reload vault"
            ) : (
              "open vault →"
            )}
          </Button>
          {noteInput && !noteValid ? (
            <span className="label !text-crit">
              {wordCount !== 24
                ? `${wordCount} / 24 words`
                : "invalid note — check for typos"}
            </span>
          ) : null}
        </div>
        {notFound ? (
          <Notice kind="warn">
            No vault exists yet at{" "}
            <span className="font-mono">{shortAddr(notFound, 6)}</span>. Check
            the note, or create it from the deposit console.
          </Notice>
        ) : null}
      </Step>

      <Step n="2" title="Check your vault" done={!!loaded} active={!!loaded}>
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Balances and the current key position are shown on the left. The app
          derives keys from your note until one matches the on-chain root — that
          position is the only key that can spend.
        </p>
        {result ? (
          <Notice kind="success" title="Withdrawal confirmed.">
            <a
              className="underline underline-offset-4"
              href={EXPLORER.tx(result.sig)}
              target="_blank"
              rel="noreferrer"
            >
              view transaction ↗
            </a>
            . Key rotated {result.from} → {result.to}; vault address unchanged.
          </Notice>
        ) : null}
      </Step>

      {loaded && loaded.pending ? (
        <Step n="3" title="Unsent withdrawal found — re-send it" active>
          <Notice
            kind="warn"
            title="A withdrawal was signed but has not landed."
          >
            {loaded.pending.label}. A one-time key must never sign two different
            messages, so only that exact withdrawal can be re-sent.
          </Notice>
          {error ? <Notice kind="error">{error}</Notice> : null}
          <Button size="lg" onClick={retryPending} disabled={busy || !session}>
            {busy ? (
              <Working text={status || "working…"} />
            ) : session ? (
              "re-send signed withdrawal →"
            ) : (
              "connect a wallet first (top right)"
            )}
          </Button>
        </Step>
      ) : (
        <Step n="3" title="Withdraw" active={!!loaded}>
          <p className="text-[14px] leading-relaxed text-ink-soft">
            Choose what to send and where. Your note signs the withdrawal in
            this page (WebAssembly); the chain verifies it, pays out, and
            rotates to the next one-time key. Your wallet only pays the network
            fee.
          </p>
          {loaded ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="asset">
                  <select
                    className="field"
                    value={assetSymbol}
                    onChange={(e) => {
                      setAssetSymbol(e.target.value);
                      setAmount("");
                    }}
                    disabled={busy}
                  >
                    {loaded.balances.map((b) => (
                      <option
                        key={b.asset.symbol}
                        value={b.asset.symbol}
                        disabled={b.amount <= 0n}
                      >
                        {b.asset.symbol} —{" "}
                        {formatUnits(b.amount, b.asset.decimals)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="amount to recipient"
                  right={
                    <button
                      type="button"
                      className="cursor-pointer underline underline-offset-4 hover:text-ink"
                      onClick={() =>
                        setAmount(formatUnits(maxAmount, asset.decimals))
                      }
                    >
                      max {formatUnits(maxAmount, asset.decimals, 6)}
                    </button>
                  }
                >
                  <input
                    className="field"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={busy}
                    placeholder="0.0"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    label="destination"
                    hint="defaults to the connected wallet · any solana address works"
                  >
                    <input
                      className="field"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      disabled={busy}
                      spellCheck={false}
                    />
                  </Field>
                </div>
              </div>
              <div className="border border-hairline bg-paper-raised px-4 py-2">
                <Row
                  label="recipient receives"
                  value={`${parsed !== null ? formatUnits(parsed, asset.decimals) : "—"} ${asset.symbol}`}
                />
                <Row
                  label={`fee ${Number(FEE_BPS) / 100}% → treasury`}
                  value={`${parsed !== null ? formatUnits(fee, asset.decimals) : "—"} ${asset.symbol}`}
                  muted
                />
                <Row
                  label="leaves the vault"
                  value={`${parsed !== null ? formatUnits(parsed + fee, asset.decimals) : "—"} ${asset.symbol}`}
                  strong
                />
              </div>
              {error ? <Notice kind="error">{error}</Notice> : null}
              <Button
                size="lg"
                onClick={withdraw}
                disabled={
                  busy ||
                  !session ||
                  parsed === null ||
                  parsed <= 0n ||
                  !destination
                }
              >
                {busy ? (
                  <Working text={status || "working…"} />
                ) : session ? (
                  "sign & withdraw →"
                ) : (
                  "connect a wallet first (top right)"
                )}
              </Button>
            </>
          ) : null}
        </Step>
      )}
    </Console>
  );
}
