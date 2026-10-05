/** Fixed-point helpers (bigint base units <-> decimal strings). No floats. */

export function parseUnits(input: string, decimals: number): bigint {
  const s = input.trim();
  if (!/^\d*(\.\d*)?$/.test(s) || s === "" || s === ".")
    throw new Error("enter a number");
  const [whole, frac = ""] = s.split(".");
  if (frac.length > decimals)
    throw new Error(`at most ${decimals} decimal places`);
  return (
    BigInt(whole || "0") * 10n ** BigInt(decimals) +
    BigInt((frac + "0".repeat(decimals)).slice(0, decimals) || "0")
  );
}

export function formatUnits(
  amount: bigint,
  decimals: number,
  maxFrac = decimals
): string {
  const neg = amount < 0n;
  const a = neg ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = a / base;
  const frac = (a % base)
    .toString()
    .padStart(decimals, "0")
    .slice(0, maxFrac)
    .replace(/0+$/, "");
  return (neg ? "-" : "") + whole.toString() + (frac ? "." + frac : "");
}

export function shortAddr(a: string, n = 4): string {
  return a.length > 2 * n + 1 ? `${a.slice(0, n)}…${a.slice(-n)}` : a;
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
