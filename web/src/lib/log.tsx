// Tiny in-page activity log (UI only). Screens push lines; the console's black
// terminal panel renders them. Nothing is persisted or sent anywhere.
import { useCallback, useMemo, useState, type PropsWithChildren } from "react";
import { LogContext, type LogLine } from "./logContext";

export function LogProvider({ children }: PropsWithChildren) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const log = useCallback((text: string, kind: LogLine["kind"] = "info") => {
    setLines((l) => [...l.slice(-199), { t: Date.now(), kind, text }]);
  }, []);
  const clear = useCallback(() => setLines([]), []);
  const value = useMemo(() => ({ lines, log, clear }), [lines, log, clear]);
  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}
