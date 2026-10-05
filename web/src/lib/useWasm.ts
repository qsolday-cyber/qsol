import { useEffect, useState } from "react";
import { loadWasm, type Wasm } from "./wasm";

export function useWasm(): { wasm: Wasm | null; error: string | null } {
  const [wasm, setWasm] = useState<Wasm | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadWasm().then(setWasm, (e) => setError(String(e)));
  }, []);
  return { wasm, error };
}
