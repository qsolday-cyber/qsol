// DEV-ONLY in-browser Wallet Standard wallet backed by a keypair in localStorage.
// Exists so the app can be driven end to end in a browser without an extension.
// Guarded by DEV_WALLET_ENABLED (import.meta.env.DEV && VITE_DEV_WALLET=1); the
// production bundle never includes a code path that registers it.
import {
  createKeyPairFromPrivateKeyBytes,
  getAddressFromPublicKey,
  getTransactionDecoder,
  getTransactionEncoder,
  signTransaction,
} from "@solana/kit";

const SEED_KEY = "qv:dev-wallet-seed";
const CHAIN = "solana:devnet";

type Account = {
  address: string;
  publicKey: Uint8Array;
  chains: readonly string[];
  features: readonly string[];
  label: string;
};

export function registerDevWallet(): void {
  let keyPair: CryptoKeyPair | null = null;
  let account: Account | null = null;
  const listeners = new Set<(props: { accounts: Account[] }) => void>();

  async function ensureKeys(): Promise<Account> {
    if (account) return account;
    let seed: Uint8Array;
    const envSeed = import.meta.env.VITE_DEV_WALLET_SEED as string | undefined; // 64 hex chars, gitignored .env.development.local
    const saved = localStorage.getItem(SEED_KEY);
    if (envSeed && /^[0-9a-f]{64}$/i.test(envSeed)) {
      seed = Uint8Array.from(envSeed.match(/../g)!.map((h) => parseInt(h, 16)));
    } else if (saved) {
      seed = Uint8Array.from(JSON.parse(saved) as number[]);
    } else {
      seed = crypto.getRandomValues(new Uint8Array(32));
      localStorage.setItem(SEED_KEY, JSON.stringify(Array.from(seed)));
    }
    keyPair = await createKeyPairFromPrivateKeyBytes(seed, false);
    const addr = await getAddressFromPublicKey(keyPair.publicKey);
    const pub = new Uint8Array(
      await crypto.subtle.exportKey("raw", keyPair.publicKey)
    );
    account = {
      address: addr,
      publicKey: pub,
      chains: [CHAIN],
      features: ["solana:signTransaction"],
      label: "Dev test wallet",
    };
    return account;
  }

  const wallet = {
    version: "1.0.0",
    name: "Quantum Vault dev wallet (devnet test keypair)",
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iIzc3MyIvPjx0ZXh0IHg9IjE2IiB5PSIyMSIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiI+RFY8L3RleHQ+PC9zdmc+",
    chains: [CHAIN],
    get accounts() {
      return account ? [account] : [];
    },
    features: {
      "standard:connect": {
        version: "1.0.0",
        connect: async () => {
          const a = await ensureKeys();
          listeners.forEach((l) => l({ accounts: [a] }));
          return { accounts: [a] };
        },
      },
      "standard:disconnect": { version: "1.0.0", disconnect: async () => {} },
      "standard:events": {
        version: "1.0.0",
        on: (
          event: string,
          listener: (props: { accounts: Account[] }) => void
        ) => {
          if (event === "change") listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signTransaction: async (...inputs: { transaction: Uint8Array }[]) => {
          if (!keyPair) await ensureKeys();
          const out = [];
          for (const { transaction } of inputs) {
            const tx = getTransactionDecoder().decode(transaction);
            const signed = await signTransaction([keyPair!], tx);
            out.push({
              signedTransaction: new Uint8Array(
                getTransactionEncoder().encode(signed)
              ),
            });
          }
          return out;
        },
      },
    },
  };

  const callback = ({ register }: { register: (w: unknown) => void }) =>
    register(wallet);
  window.addEventListener("wallet-standard:app-ready", ((e: CustomEvent) =>
    callback(e.detail)) as EventListener);
  window.dispatchEvent(
    new CustomEvent("wallet-standard:register-wallet", { detail: callback })
  );
}
