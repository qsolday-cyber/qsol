import { useState } from "react";
import { BRAND } from "./brand";
import { ASSETS, EXPLORER, FEE_BPS, PROGRAM_ID, TREASURY } from "./config";
import { WalletBar } from "./components/WalletBar";
import { Deposit } from "./screens/Deposit";
import { Withdraw } from "./screens/Withdraw";
import { Label, Logo, Stat } from "./components/ui";
import { LogProvider } from "./lib/log";
import { useWalletSession } from "@solana/react-hooks";

type Tab = "deposit" | "withdraw";

/** One-line orientation under the mode switch: wallet status + what the wallet is for. */
function ConsoleHint() {
  const session = useWalletSession();
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-x border-b px-5 py-2.5 text-[13px] ${session ? "border-hairline text-ink-soft" : "border-warn/50 bg-warn/10 text-warn"}`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${session ? "bg-ok" : "bg-warn"}`}
        aria-hidden
      />
      {session ? (
        <span>
          Fee wallet connected. It only pays Solana network fees — it never
          holds or controls the vault. Your 24-word note does that.
        </span>
      ) : (
        <span>
          <b>Step 0 — connect a wallet (top right).</b> It only pays the small
          Solana network fee; it never touches the vault. You still need it
          before depositing or withdrawing.
        </span>
      )}
    </div>
  );
}

const TICKER = [
  "WINTERNITZ ONE-TIME SIGNATURES — HASH-BASED, NO ELLIPTIC CURVES ON THE SPEND PATH",
  "NIST FIPS 205 (SLH-DSA) — HASH-BASED SIGNATURES STANDARDIZED 2024",
  "NSA CNSA 2.0 — PQC MIGRATION 2030–2035",
  "768-BYTE SIGNATURE — 24 SHA-256 HASH CHAINS — VERIFIED ON-CHAIN",
  "KEY ROTATES ON EVERY WITHDRAWAL — VAULT ADDRESS NEVER CHANGES",
  "DEVNET BETA — NOT AUDITED — TEST TOKENS ONLY",
];

export default function App() {
  const [tab, setTab] = useState<Tab>("deposit");
  return (
    <LogProvider>
      <div className="min-h-screen">
        {/* top bar */}
        <header className="sticky top-0 z-20 hairline-b bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-4">
              <Logo />
              <a href="/" className="font-mono text-[12px] font-semibold">
                {BRAND.console.split("/")[0]}
                <span className="font-normal text-ink-faint">
                  /{BRAND.console.split("/")[1]}
                </span>
              </a>
              <nav
                className="hidden items-center border border-hairline-strong sm:flex"
                aria-label="Deposit or withdraw"
              >
                {(["deposit", "withdraw"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTab(t);
                      document.getElementById("console")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                    aria-current={tab === t ? "page" : undefined}
                    className={`px-3 py-1 font-mono text-[10px] tracking-[0.14em] uppercase cursor-pointer ${tab === t ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
                  >
                    {t}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="label hidden md:inline">
                program{" "}
                <span className="text-ink">{PROGRAM_ID.slice(0, 10)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-[10px] tracking-[0.14em] whitespace-nowrap text-warn uppercase">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-warn"
                  aria-hidden
                />
                <span className="hidden sm:inline">
                  devnet beta · not audited
                </span>
                <span className="sm:hidden">devnet · unaudited</span>
              </span>
              <WalletBar />
            </div>
          </div>
        </header>

        {/* ticker */}
        <div className="hairline-b overflow-hidden whitespace-nowrap">
          <div className="ticker inline-block py-1.5 font-mono text-[10px] tracking-[0.18em] text-ink-soft uppercase">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i}>
                {t}
                <span className="mx-5 text-ink-faint">///</span>
              </span>
            ))}
          </div>
        </div>

        <main className="mx-auto max-w-[1240px] px-5">
          {/* hero */}
          <section className="pt-14 pb-10 sm:pt-20">
            <Label className="mb-6 block">{BRAND.eyebrow}</Label>
            <h1 className="display text-[clamp(52px,11vw,132px)]">
              {BRAND.headline.map((line, i) => (
                <span
                  key={line}
                  className={`block ${i === BRAND.headline.length - 1 ? "text-ink-faint" : ""}`}
                >
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-8 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
              {BRAND.description}
            </p>
            <div className="mt-10 grid grid-cols-2 gap-x-8 lg:grid-cols-4">
              <Stat
                label="signature"
                value="768 bytes"
                sub="24 hash chains, sha-256"
              />
              <Stat
                label="ed25519 on spend path"
                value="none"
                sub="no elliptic curves anywhere"
              />
              <Stat
                label="pq security level"
                value="~128 bit"
                sub="grover-adjusted, 256-bit note"
              />
              <Stat
                label="key reuse"
                value="impossible"
                sub="atomic rotation every withdrawal"
              />
            </div>
          </section>

          {/* console */}
          <section id="console" className="py-10">
            <div className="hairline-t flex flex-wrap items-center justify-between gap-3 py-2.5">
              <Label strong>vault console</Label>
              <Label>
                cryptography: winterwallet · ledger: solana {BRAND.network}
              </Label>
            </div>

            {/* mode switch — the two things a user can do */}
            <div
              className="grid border border-ink sm:grid-cols-2"
              role="tablist"
              aria-label="Choose deposit or withdraw"
            >
              {(
                [
                  [
                    "deposit",
                    "Deposit",
                    "Create a vault with a new 24-word note and put SOL, USDC or qSOL into it.",
                  ],
                  [
                    "withdraw",
                    "Withdraw",
                    "Paste your 24-word note to open a vault and send funds anywhere.",
                  ],
                ] as [Tab, string, string][]
              ).map(([t, title, desc], i) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`flex items-start gap-4 px-5 py-4 text-left transition cursor-pointer ${i === 0 ? "sm:border-r sm:border-ink" : "border-t border-ink sm:border-t-0"} ${
                    tab === t
                      ? "bg-ink text-paper"
                      : "bg-paper-raised text-ink hover:bg-paper-sunk"
                  }`}
                >
                  <span
                    className={`mt-0.5 font-mono text-[11px] ${tab === t ? "text-paper/60" : "text-ink-faint"}`}
                  >
                    {i === 0 ? "01" : "02"}
                  </span>
                  <span>
                    <span className="block text-[18px] font-semibold tracking-tight uppercase">
                      {title}
                      {tab === t ? (
                        <span className="label ml-3 !text-paper/70">
                          selected
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`mt-1 block text-[13px] leading-snug ${tab === t ? "text-paper/75" : "text-ink-soft"}`}
                    >
                      {desc}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <ConsoleHint />

            <div className="mt-4">
              {tab === "deposit" ? <Deposit /> : <Withdraw />}
            </div>
          </section>

          {/* anatomy */}
          <section className="hairline-t py-16">
            <Label className="mb-6 block">the cryptography, up close</Label>
            <h2 className="display text-[clamp(36px,6vw,72px)]">
              Anatomy of a<br />
              quantum-safe <span className="text-ink-faint">withdrawal.</span>
            </h2>
            <p className="mt-8 max-w-3xl text-[16px] leading-relaxed text-ink-soft">
              Your 24-word note deterministically derives a ladder of one-time
              Winternitz keys. Each key is 24 hash chains. Signing reveals one
              intermediate point per chain — which point depends on the message
              bytes. The on-chain program simply keeps hashing each revealed
              point to the end of its chain: if all 24 ends reproduce the stored
              key root, the signature is genuine. Nothing but hash preimage
              resistance stands guard, and quantum computers are no better at
              reversing SHA-256 than classical ones, square-root Grover speedup
              aside.
            </p>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {[
                [
                  "01 — one-time only",
                  "Signing twice with the same key leaks chain midpoints and eventually lets an attacker forge. The vault makes reuse structurally impossible: every withdrawal commits to the next key's root inside the signed message itself, and the app re-sends an unconfirmed withdrawal verbatim rather than signing again.",
                ],
                [
                  "02 — quantum-safe by construction",
                  "Shor's algorithm breaks elliptic-curve discrete logs. It says nothing about reversing SHA-256. Grover's search only halves the bits: a 256-bit note keeps ~128-bit security — the same margin Bitcoin targets today.",
                ],
                [
                  "03 — cheap enough for a blockchain",
                  "Verification is a few thousand hashes: ~400k compute units, well inside Solana's 1.4M budget. The 768-byte signature plus two inner transfers (payout and fee) fit a single 1232-byte transaction — no buffer accounts needed.",
                ],
              ].map(([t, d]) => (
                <div key={t} className="hairline-t pt-5">
                  <p className="label-strong mb-3">{t}</p>
                  <p className="text-[14px] leading-relaxed text-ink-soft">
                    {d}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* protocol */}
          <section className="hairline-t py-16">
            <Label className="mb-6 block">
              protocol · winterwallet program
            </Label>
            <h2 className="display text-[clamp(36px,6vw,72px)]">
              Four instructions.
              <br />
              <span className="text-ink-faint">Zero curves.</span>
            </h2>
            <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_420px]">
              <div>
                <table className="w-full border-collapse font-mono text-[12px]">
                  <tbody>
                    {[
                      [
                        "0",
                        "INITIALIZE",
                        "creates the vault PDA; address anchored to the root of key 0, stores the root of key 1",
                      ],
                      [
                        "1",
                        "ADVANCE",
                        "verify Winternitz signature → store next key root → run the inner transfers (payout + fee) as the vault",
                      ],
                      [
                        "2",
                        "WITHDRAW",
                        "inner CPI: move lamports out of the vault (used twice per SOL withdrawal: recipient, treasury)",
                      ],
                      [
                        "3",
                        "CLOSE",
                        "inner CPI: sweep everything and tear the vault down (not exposed in this app)",
                      ],
                    ].map(([n, name, d]) => (
                      <tr key={n} className="hairline-b align-top">
                        <td className="w-10 py-3 text-ink-faint">{n}</td>
                        <td className="w-32 py-3 font-semibold">{name}</td>
                        <td className="py-3 text-ink-soft">{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-8 space-y-4 text-[14px] leading-relaxed text-ink-soft">
                  <p>
                    <b className="text-ink">
                      The withdrawal path trusts no classical key.
                    </b>{" "}
                    The wallet you connect only pays the network fee. There is
                    no owner ed25519 signature anywhere in ADVANCE — only
                    knowledge of the current one-time key derived from your
                    note. An attacker who breaks every elliptic-curve key on
                    Solana, including your fee payer, still cannot move the
                    vault.
                  </p>
                  <p>
                    <b className="text-ink">Rotation is atomic.</b> The signed
                    digest commits to the next key's root, the recipient, the
                    amounts and every account involved, so key rotation and
                    payout happen in one instruction. Replay and key reuse are
                    excluded by construction.
                  </p>
                  <p>
                    <b className="text-ink">Honest limits.</b> Unaudited devnet
                    beta built on Winterwallet (also unaudited). Token transfers
                    use the plain SPL{" "}
                    <span className="font-mono">Transfer</span>; mints with
                    transfer hooks or transfer fees are not supported. Position
                    recovery scans linearly, so a vault with thousands of
                    withdrawals takes seconds to open.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-term-bg p-4 font-mono text-[11.5px] leading-[1.7] text-term">
                  <p className="mb-3 text-[10px] tracking-[0.18em] text-term-dim uppercase">
                    run it yourself
                  </p>
                  <pre className="whitespace-pre-wrap">{`# web app (no Rust needed — the WASM is committed)
cd web && npm install && npm run dev

# rebuild the signing module from Winterwallet's crates
cd wasm && wasm-pack build --release --target web

# deploy your own program instance to devnet
cargo build-sbf --manifest-path winterwallet/program/Cargo.toml
solana program deploy winterwallet/target/deploy/winterwallet_program.so \\
  --program-id keys/program-devnet.json -u devnet

# prove the browser signs exactly like the CLI
cd wasm/test-page && npm run test:cli-equivalence`}</pre>
                </div>
                <div className="border border-hairline p-4 font-mono text-[11.5px] leading-[1.7]">
                  <p className="label mb-2">what ships in the repo</p>
                  <p>
                    winterwallet/ — vendored program + crates (MIT), program id
                    pinned
                  </p>
                  <p>wasm/ — wasm-bindgen wrapper, zero custom crypto</p>
                  <p>wasm/test-page/ — CLI-equivalence test, 32 checks</p>
                  <p>
                    web/ — this app (Vite · @solana/client · Wallet Standard)
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* footer */}
        <footer className="bg-term-bg text-paper">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 md:grid-cols-3">
            <div>
              <p className="font-mono text-[12px] font-semibold">
                {BRAND.console}
              </p>
              <p className="mt-3 font-mono text-[11px] leading-[1.7] text-term-dim">
                quantum-safe {BRAND.token.symbol}, SOL and USDC vault on Solana.
                winternitz one-time signatures · sha-256 · key rotation per
                spend.
              </p>
            </div>
            <div>
              <p className="label !text-paper/60">integrity</p>
              <p className="mt-3 font-mono text-[11px] text-term">
                ● cli-equivalence: pass
              </p>
              <p className="font-mono text-[11px] leading-[1.7] text-term-dim">
                32 checks — browser signatures byte-identical to the
                winterwallet cli on devnet. withdrawals re-send verbatim; a
                position never signs twice.
              </p>
            </div>
            <div>
              <p className="label !text-paper/60">status &amp; disclaimer</p>
              <p className="mt-3 font-mono text-[11px] leading-[1.7] text-term-dim">
                devnet beta · unaudited · test tokens only. your note never
                leaves this browser; losing it loses the funds. fee{" "}
                {Number(FEE_BPS) / 100}% →{" "}
                <a
                  className="underline"
                  href={EXPLORER.address(TREASURY)}
                  target="_blank"
                  rel="noreferrer"
                >
                  treasury
                </a>
                . assets:{" "}
                {ASSETS.map((a) => `${a.symbol} (cap ${a.depositCapUi})`).join(
                  " · "
                )}
                . not investment, legal or security advice.
              </p>
            </div>
          </div>
          <div className="border-t border-term-dim/30">
            <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-2 px-5 py-4 font-mono text-[10px] tracking-[0.18em] text-term-dim uppercase">
              <span>mit / winterwallet / {BRAND.name}</span>
              <a
                className="hover:text-term"
                href={EXPLORER.address(PROGRAM_ID)}
                target="_blank"
                rel="noreferrer"
              >
                program {PROGRAM_ID}
              </a>
              <span>built for the q-day that has no fix</span>
            </div>
          </div>
        </footer>
      </div>
    </LogProvider>
  );
}
