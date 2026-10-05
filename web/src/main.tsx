import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DEV_WALLET_ENABLED } from "./config";
import "./index.css";

async function boot() {
  if (DEV_WALLET_ENABLED) {
    const { registerDevWallet } = await import("./lib/devWallet");
    registerDevWallet();
  }
  const [{ Providers }, { default: App }] = await Promise.all([
    import("./providers"),
    import("./App"),
  ]);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Providers>
        <App />
      </Providers>
    </StrictMode>
  );
}

void boot();
