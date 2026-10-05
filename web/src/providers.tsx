import { SolanaProvider } from "@solana/react-hooks";
import { PropsWithChildren } from "react";
import { autoDiscover, createClient } from "@solana/client";
import { RPC_URL, WS_URL } from "./config";

const client = createClient({
  endpoint: RPC_URL,
  websocketEndpoint: WS_URL,
  commitment: "confirmed",
  walletConnectors: autoDiscover(),
});

export function Providers({ children }: PropsWithChildren) {
  return <SolanaProvider client={client}>{children}</SolanaProvider>;
}
