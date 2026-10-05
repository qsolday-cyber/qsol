import type { PropsWithChildren, ReactNode } from "react";
import { useLog } from "../lib/logContext";
import { Label } from "./ui";

/** Three-column console: instrument panel · numbered steps · program log. */
export function Console({
  instrument,
  children,
}: PropsWithChildren<{ instrument: ReactNode }>) {
  return (
    <div className="grid gap-0 border border-hairline lg:grid-cols-[260px_1fr_360px]">
      <aside className="hairline-b bg-paper-sunk/60 p-5 lg:border-r lg:border-b-0">
        <Label strong className="mb-3 block">
          your vault
        </Label>
        {instrument}
      </aside>
      <div className="px-5 lg:border-r lg:border-hairline">{children}</div>
      <Terminal />
    </div>
  );
}

function Terminal() {
  const { lines } = useLog();
  return (
    <div className="flex min-h-[320px] flex-col bg-term-bg text-term">
      <div className="flex items-center justify-between border-b border-term-dim/40 px-4 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase">
          activity log
        </span>
        <span className="font-mono text-[10px] tracking-[0.18em] text-term-dim uppercase">
          winterwallet · devnet
        </span>
      </div>
      <pre className="flex-1 overflow-auto p-4 font-mono text-[11.5px] leading-[1.6] whitespace-pre-wrap">
        {lines.length === 0 ? (
          <>
            <span className="text-term-dim">;; awaiting instructions</span>
            {"\n"}
            <span className="text-term-dim">
              ;; every step of a deposit or withdrawal is narrated here
            </span>
            {"\n"}
          </>
        ) : (
          lines.map((l, i) => (
            <span
              key={i}
              className={
                l.kind === "err"
                  ? "text-crit"
                  : l.kind === "dim"
                    ? "text-term-dim"
                    : l.kind === "ok"
                      ? "text-term"
                      : "text-term"
              }
            >
              {l.kind === "err"
                ? ";; ERR "
                : l.kind === "ok"
                  ? ";; OK  "
                  : ";; "}
              {l.text}
              {"\n"}
            </span>
          ))
        )}
        <span className="cursor" />
      </pre>
    </div>
  );
}
