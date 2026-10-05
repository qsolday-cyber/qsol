import type { PropsWithChildren, ReactNode } from "react";

/** Mono uppercase eyebrow / micro-label. */
export function Label({
  children,
  strong,
  className = "",
}: PropsWithChildren<{ strong?: boolean; className?: string }>) {
  return (
    <span className={`${strong ? "label-strong" : "label"} ${className}`}>
      {children}
    </span>
  );
}

type ButtonProps = PropsWithChildren<{
  onClick?: () => void;
  disabled?: boolean;
  kind?: "solid" | "outline";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
  className?: string;
}>;

export function Button({
  children,
  onClick,
  disabled,
  kind = "solid",
  size = "md",
  type = "button",
  className = "",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${kind === "solid" ? "btn" : "btn-outline"} ${size === "sm" ? "btn-sm" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  right,
  hint,
}: PropsWithChildren<{ label: string; right?: ReactNode; hint?: ReactNode }>) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        {right ? <span className="label">{right}</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="block font-mono text-[10.5px] leading-relaxed text-ink-faint">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function Mono({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return (
    <span className={`font-mono text-[12px] break-all ${className}`}>
      {children}
    </span>
  );
}

export function Address({ value, href }: { value: string; href?: string }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <Mono>{value}</Mono>
      {href ? (
        <a
          className="label underline underline-offset-4 hover:text-ink"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          explorer ↗
        </a>
      ) : null}
    </span>
  );
}

export function Notice({
  kind = "info",
  children,
  title,
}: PropsWithChildren<{
  kind?: "info" | "warn" | "error" | "success";
  title?: ReactNode;
}>) {
  const tone = {
    info: "border-hairline-strong text-ink",
    warn: "border-warn text-warn",
    error: "border-crit text-crit",
    success: "border-ok text-ok",
  }[kind];
  const tag = { info: "note", warn: "warning", error: "error", success: "ok" }[
    kind
  ];
  return (
    <div
      className={`border-l-2 bg-paper-raised py-2.5 pr-3 pl-3.5 text-[13px] leading-relaxed ${tone}`}
      role={kind === "error" ? "alert" : undefined}
    >
      <span className="label mr-2 !text-current">{tag}</span>
      {title ? <span className="font-semibold">{title} </span> : null}
      <span className="text-ink">{children}</span>
    </div>
  );
}

export function Working({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="spinner" aria-hidden />
      {text}
    </span>
  );
}

/** Numbered console step: big readable title, active step framed, done steps collapsed. */
export function Step({
  n,
  title,
  done,
  active,
  summary,
  children,
}: PropsWithChildren<{
  n: string;
  title: string;
  done?: boolean;
  active?: boolean;
  summary?: ReactNode;
}>) {
  const state = done ? "done" : active ? "active" : "locked";
  return (
    <section
      className={`relative hairline-b py-5 pl-5 transition ${state === "active" ? "border-l-2 border-l-ink bg-paper-raised/70 pr-2" : "border-l-2 border-l-transparent"} ${state === "locked" ? "opacity-45" : ""}`}
      aria-current={active ? "step" : undefined}
    >
      <div className="mb-2 flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-[11px] ${state === "done" ? "border-ok bg-ok text-paper" : state === "active" ? "border-ink bg-ink text-paper" : "border-hairline-strong text-ink-faint"}`}
          aria-hidden
        >
          {done ? "✓" : n}
        </span>
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {state === "locked" ? (
          <span className="label ml-auto">locked</span>
        ) : null}
        {state === "done" && summary ? (
          <span className="label ml-auto !normal-case !tracking-normal !text-ok">
            {summary}
          </span>
        ) : null}
      </div>
      {state === "done" && summary ? null : (
        <div className="space-y-3 pl-10">{children}</div>
      )}
    </section>
  );
}

export function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? "hairline-t pt-2 font-semibold" : ""} ${muted ? "text-ink-soft" : ""}`}
    >
      <span className="label !normal-case !tracking-normal text-[12px]">
        {label}
      </span>
      <span className="font-mono text-[12px] tabular-nums">{value}</span>
    </div>
  );
}

/** Instrument readout: LABEL / value / sub. */
export function Readout({
  label,
  value,
  sub,
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`py-3 ${className}`}>
      <p className="label mb-1">{label}</p>
      <p className="font-mono text-[13px] leading-snug break-all tabular-nums">
        {value ?? "— — —"}
      </p>
      {sub ? (
        <p className="label mt-1 !normal-case !tracking-normal">{sub}</p>
      ) : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="hairline-t py-5">
      <p className="label mb-3">{label}</p>
      <p className="display text-3xl sm:text-4xl">{value}</p>
      <p className="label mt-2 !normal-case !tracking-normal text-ink-faint">
        {sub}
      </p>
    </div>
  );
}

export function Logo({ size = 12 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden>
      <span
        className="inline-block rounded-full bg-ink"
        style={{ width: size, height: size }}
      />
      <span
        className="inline-block rounded-full bg-ink-faint"
        style={{ width: size, height: size }}
      />
      <span
        className="inline-block rounded-full bg-hairline"
        style={{ width: size, height: size }}
      />
    </span>
  );
}
