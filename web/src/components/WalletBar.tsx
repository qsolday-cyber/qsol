import { useEffect, useState } from "react";
import { useSolanaClient, useWalletConnection } from "@solana/react-hooks";
import { address } from "@solana/kit";
import { formatUnits, shortAddr, errorMessage } from "../lib/format";

export function WalletBar() {
  const { connectors, connect, disconnect, wallet, status, error } =
    useWalletConnection();
  const client = useSolanaClient();
  const addr = wallet?.account.address.toString();
  const [lamports, setLamports] = useState<bigint | null>(null);

  useEffect(() => {
    if (!addr) return setLamports(null);
    let live = true;
    const load = () =>
      client.actions
        .fetchBalance(address(addr))
        .then((l) => live && setLamports(BigInt(l)))
        .catch(() => {});
    load();
    const t = setInterval(load, 15_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [addr, client]);

  if (status === "connected" && addr) {
    return (
      <div className="flex items-center gap-3" title={addr} data-address={addr}>
        <span className="label hidden sm:inline">fee wallet</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] whitespace-nowrap">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-ok"
            aria-hidden
          />
          {shortAddr(addr, 4)}
          {lamports !== null ? (
            <span className="text-ink-faint">
              · {formatUnits(lamports, 9, 3)} SOL
            </span>
          ) : null}
        </span>
        <button
          className="label cursor-pointer underline underline-offset-4 hover:text-ink"
          onClick={() => disconnect()}
        >
          disconnect
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {connectors.length === 0 ? (
        <span className="label">
          no wallet detected — install phantom / solflare / backpack
        </span>
      ) : null}
      {connectors.map((c) => (
        <button
          key={c.id}
          className="btn btn-sm"
          disabled={status === "connecting"}
          onClick={() => connect(c.id)}
        >
          {status === "connecting"
            ? "connecting…"
            : `connect ${c.name.replace(/\s*\(.*\)$/, "")}`}
        </button>
      ))}
      {error ? (
        <span className="label !text-crit">{errorMessage(error)}</span>
      ) : null}
    </div>
  );
}
