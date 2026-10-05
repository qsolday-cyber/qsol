import { useMemo, useState } from "react";
import { useSolanaClient, useWalletSession } from "@solana/react-hooks";
import { ASSETS, EXPLORER, type Asset } from "../config";
import { BRAND } from "../brand";
import { useWasm } from "../lib/useWasm";
import { useLog } from "../lib/logContext";
import { sendInstructions, toInstruction, walletSigner } from "../lib/tx";
import {
  depositCap,
  depositInstructions,
  fetchBalances,
  fetchVault,
  type Balance,
} from "../lib/vault";
import type { SignedInitializeOut } from "../lib/wasm";
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
  Step,
  Working,
} from "../components/ui";
import { Console } from "../components/Console";

type Phase = "generate" | "backup" | "deposit" | "done";

function randomIndexes(n: number, max: number): number[] {
  const out = new Set<number>();
  while (out.size < n)
    out.add(crypto.getRandomValues(new Uint32Array(1))[0] % max);
  return [...out].sort((a, b) => a - b);
}

export function Deposit() {
  const { wasm, error: wasmError } = useWasm();
  const client = useSolanaClient();
  const session = useWalletSession();
  const { log } = useLog();

  const [phase, setPhase] = useState<Phase>("generate");
  const [note, setNote] = useState("");
  const [vault, setVault] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const [quiz, setQuiz] = useState<number[]>([]);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [assetSymbol, setAssetSymbol] = useState<string>(ASSETS[0].symbol);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txs, setTxs] = useState<string[]>([]);
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [position, setPosition] = useState<number | null>(null);

  const asset = useMemo(
    () => ASSETS.find((a) => a.symbol === assetSymbol) as Asset,
    [assetSymbol]
  );
  const capUi = ASSETS.find((a) => a.symbol === asset.symbol)!.depositCapUi;
  const words = useMemo(() => note.split(" ").filter(Boolean), [note]);
  const report = (s: string) => {
    setStatus(s);
    log(s.toLowerCase(), "dim");
  };

  function generate() {
    if (!wasm) return;
    const entropy = new Uint8Array(32);
    crypto.getRandomValues(entropy);
    const n = wasm.generate_note(entropy);
    entropy.fill(0);
    setNote(n);
    const v = wasm.vault_address(n);
    setVault(v);
    setDownloaded(false);
    setQuiz(randomIndexes(3, 24));
    setAnswers(["", "", ""]);
    setQuizError(null);
    setPhase("backup");
    log(
      "generated 24-word note from 32 bytes of browser csprng entropy (never leaves this page)"
    );
    log(`derived vault pda ${v} from the root of key 0`);
  }

  function download() {
    const body = [
      `${BRAND.name.toUpperCase()} — QUANTUM NOTE (${BRAND.network} beta)`,
      "",
      "Anyone with these 24 words can withdraw everything in the vault.",
      "If you lose them, the funds are lost. The app never sees or stores them.",
      "",
      note,
      "",
      `Vault address: ${vault}`,
      `Created: ${new Date().toISOString()}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${BRAND.name.toLowerCase()}-note-${vault.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    log("note file downloaded; backup check unlocked");
  }

  function checkQuiz() {
    const ok = quiz.every(
      (idx, i) => answers[i].trim().toLowerCase() === words[idx]
    );
    if (!ok) {
      log("backup check failed — words do not match", "err");
      return setQuizError(
        "One or more words don't match. Open the file you downloaded and check the numbered words."
      );
    }
    setQuizError(null);
    setPhase("deposit");
    log(
      `backup check passed (words ${quiz.map((q) => q + 1).join(", ")})`,
      "ok"
    );
  }

  async function deposit() {
    if (!wasm || !session) return;
    setBusy(true);
    setError(null);
    setTxs([]);
    try {
      const amt = parseUnits(amount, asset.decimals);
      if (amt <= 0n) throw new Error("Enter an amount greater than zero.");
      const { signer } = walletSigner(session);
      const rpc = client.runtime.rpc;

      report("Checking vault…");
      const info = await fetchVault(rpc, wasm, note);
      const current = (await fetchBalances(rpc, vault)).find(
        (b) => b.asset.symbol === asset.symbol
      )!;
      const cap = depositCap(asset);
      if (current.amount + amt > cap) {
        throw new Error(
          `The cap is ${formatUnits(cap, asset.decimals)} ${asset.symbol} per vault. This vault already holds ${formatUnits(current.amount, asset.decimals)}.`
        );
      }

      const sigs: string[] = [];
      const depositIxs = await depositInstructions(signer, vault, asset, amt);
      if (!info.exists) {
        const init = JSON.parse(
          wasm.sign_initialize(note, signer.address)
        ) as SignedInitializeOut;
        log(
          `signed INITIALIZE with key 0 in wasm; next root ${init.next_root.slice(0, 16)}…`
        );
        const initIx = toInstruction(init.instruction);
        if (asset.kind === "sol") {
          log(
            `sending INITIALIZE + transfer ${formatUnits(amt, 9)} SOL → vault (one transaction)`
          );
          sigs.push(
            await sendInstructions(client, session, [initIx, ...depositIxs], {
              budget: true,
              onStatus: report,
            })
          );
        } else {
          log("sending INITIALIZE (1 of 2)");
          sigs.push(
            await sendInstructions(client, session, [initIx], {
              budget: true,
              onStatus: (s) => report(`1 of 2 · ${s}`),
            })
          );
          log(
            `sending create vault ata + transfer ${formatUnits(amt, asset.decimals)} ${asset.symbol} (2 of 2)`
          );
          sigs.push(
            await sendInstructions(client, session, depositIxs, {
              onStatus: (s) => report(`2 of 2 · ${s}`),
            })
          );
        }
      } else {
        log(
          `sending transfer ${formatUnits(amt, asset.decimals)} ${asset.symbol} → vault`
        );
        sigs.push(
          await sendInstructions(client, session, depositIxs, {
            onStatus: report,
          })
        );
      }
      sigs.forEach((s) => log(`confirmed ${s}`, "ok"));
      setTxs(sigs);
      setBalances(await fetchBalances(rpc, vault));
      const after = await fetchVault(rpc, wasm, note);
      setPosition(after.exists ? after.child : null);
      setAmount("");
      setPhase("done");
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
      {!vault ? (
        <p className="py-3 text-[13px] leading-relaxed text-ink-soft">
          Your vault will appear here. Follow the steps on the right: generate a
          note, back it up, deposit.
        </p>
      ) : null}
      <Readout
        label="pda"
        value={vault ? shortAddr(vault, 8) : null}
        sub={vault ? "derived from your note" : undefined}
      />
      <Readout
        label="balances"
        value={
          balances
            ? balances
                .filter((b) => b.amount > 0n)
                .map(
                  (b) =>
                    `${formatUnits(b.amount, b.asset.decimals, 6)} ${b.asset.symbol}`
                )
                .join(" · ") || "0"
            : null
        }
      />
      <Readout
        label="key position"
        value={position ?? (phase === "done" ? 1 : null)}
        sub={position !== null ? "next one-time key" : undefined}
      />
      <Readout
        label="note"
        value={
          phase === "generate"
            ? null
            : `24 words · ${downloaded ? "backed up" : "NOT backed up"}`
        }
      />
    </div>
  );

  return (
    <Console instrument={instrument}>
      <Step
        n="1"
        title="Generate your quantum note"
        summary="note generated"
        done={phase !== "generate"}
        active={phase === "generate"}
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">
          The note is 24 words made in your browser from secure randomness. It
          is the only key to the vault: no account, no password, no reset. You
          will download it and confirm three words before any money moves.
        </p>
        {phase === "generate" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={generate} disabled={!wasm || !session}>
              generate my note →
            </Button>
            {!session ? (
              <span className="label">connect a wallet first (top right)</span>
            ) : null}
          </div>
        ) : null}
      </Step>

      <Step
        n="2"
        title="Back up the note"
        summary="downloaded & verified"
        done={phase === "deposit" || phase === "done"}
        active={phase === "backup"}
      >
        {phase === "backup" ? (
          <>
            <Notice
              kind="warn"
              title="Losing this note means losing the funds."
            >
              No one can recover it, including us. Keep the file offline.
            </Notice>
            <ol className="grid grid-cols-2 gap-x-4 gap-y-1 border border-hairline bg-paper-raised p-3 font-mono text-[12.5px] sm:grid-cols-3 md:grid-cols-4">
              {words.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-5 text-right text-ink-faint tabular-nums">
                    {i + 1}
                  </span>
                  <span>{w}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={download}
                kind={downloaded ? "outline" : "solid"}
              >
                {downloaded ? "download again" : "download note (.txt) →"}
              </Button>
              {downloaded ? (
                <span className="label !text-ok">
                  saved · now confirm three words
                </span>
              ) : null}
            </div>
            {downloaded && (
              <div className="space-y-3 border border-hairline p-4">
                <p className="label-strong">
                  type words {quiz.map((q) => q + 1).join(", ")} from your note
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {quiz.map((q, i) => (
                    <Field key={q} label={`word ${q + 1}`}>
                      <input
                        className="field"
                        autoComplete="off"
                        spellCheck={false}
                        autoCapitalize="none"
                        value={answers[i]}
                        onChange={(e) =>
                          setAnswers(
                            answers.map((a, j) =>
                              j === i ? e.target.value : a
                            )
                          )
                        }
                      />
                    </Field>
                  ))}
                </div>
                {quizError ? <Notice kind="error">{quizError}</Notice> : null}
                <Button
                  size="lg"
                  onClick={checkQuiz}
                  disabled={answers.some((a) => !a.trim())}
                >
                  confirm backup →
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-[14px] leading-relaxed text-ink-soft">
            Download the note file, then re-type three randomly chosen words to
            prove the backup exists.
          </p>
        )}
      </Step>

      <Step
        n="3"
        title={
          phase === "done"
            ? "Vault created — deposit more, or close the tab"
            : "Create the vault and deposit"
        }
        done={phase === "done"}
        active={phase === "deposit" || phase === "done"}
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Pick an asset and an amount. Your wallet pays it into the vault
          address derived from your note. Anyone can pay in; only the note can
          take out.
        </p>
        {txs.length > 0 && (
          <Notice kind="success" title="Confirmed.">
            {txs.map((s, i) => (
              <span key={s}>
                {i > 0 ? " · " : ""}
                <a
                  className="underline underline-offset-4"
                  href={EXPLORER.tx(s)}
                  target="_blank"
                  rel="noreferrer"
                >
                  tx {i + 1} ↗
                </a>
              </span>
            ))}{" "}
            Vault: <span className="font-mono">{vault}</span>
          </Notice>
        )}
        {(phase === "deposit" || phase === "done") && (
          <>
            <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
              <Field label="asset">
                <select
                  className="field"
                  value={assetSymbol}
                  onChange={(e) => setAssetSymbol(e.target.value)}
                  disabled={busy}
                >
                  {ASSETS.map((a) => (
                    <option key={a.symbol} value={a.symbol}>
                      {a.symbol} — {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="amount" right={`cap ${capUi} ${asset.symbol}`}>
                <input
                  className="field"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={busy}
                  placeholder="0.0"
                />
              </Field>
            </div>
            {error ? <Notice kind="error">{error}</Notice> : null}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={deposit}
                disabled={busy || !amount || !session}
              >
                {busy ? (
                  <Working text={status || "working…"} />
                ) : phase === "done" ? (
                  "deposit more →"
                ) : (
                  "create vault & deposit →"
                )}
              </Button>
              <span className="label">
                {asset.kind === "sol"
                  ? "1 wallet approval"
                  : phase === "done"
                    ? "1 wallet approval"
                    : "2 wallet approvals"}
              </span>
            </div>
            {phase === "done" ? (
              <p className="label !normal-case !tracking-normal text-ink-faint">
                Finished? Close the tab. The note exists only in this page's
                memory; withdraw later from the withdraw console.
              </p>
            ) : null}
          </>
        )}
      </Step>
    </Console>
  );
}
