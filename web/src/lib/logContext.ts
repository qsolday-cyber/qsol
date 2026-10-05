import { createContext, useContext } from "react";

export type LogLine = {
  t: number;
  kind: "info" | "ok" | "err" | "dim";
  text: string;
};
export type LogApi = {
  lines: LogLine[];
  log: (text: string, kind?: LogLine["kind"]) => void;
  clear: () => void;
};

export const LogContext = createContext<LogApi | null>(null);

export function useLog(): LogApi {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error("useLog outside LogProvider");
  return ctx;
}
