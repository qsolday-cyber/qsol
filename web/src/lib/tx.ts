// Transaction pipeline, mirroring winterwallet/cli/src/helpers.rs `simulate_sign_send`:
// simulate with a generous CU ceiling -> pad 10% -> rebuild with a tight budget
// -> the connected wallet signs (and pays the fee) -> send -> confirm.
import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getBase58Decoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  signTransactionMessageWithSigners,
  type Instruction,
} from "@solana/kit";
import {
  createWalletTransactionSigner,
  type SolanaClient,
  type WalletSession,
} from "@solana/client";
import {
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction,
} from "@solana-program/compute-budget";
import type { WasmInstruction } from "./wasm";

const SIMULATION_CU_CEILING = 1_400_000;

// kit requires ONE signer instance per address within a transaction, so every
// caller (instruction builders and the send pipeline) must share this wrapper.
const signerCache = new WeakMap<
  WalletSession,
  ReturnType<typeof createWalletTransactionSigner>
>();
export function walletSigner(session: WalletSession) {
  let s = signerCache.get(session);
  if (!s) {
    s = createWalletTransactionSigner(session, { commitment: "confirmed" });
    signerCache.set(session, s);
  }
  return s;
}

export function toInstruction(ix: WasmInstruction): Instruction {
  return {
    programAddress: address(ix.program_id),
    accounts: ix.accounts.map((a) => ({
      address: address(a.pubkey),
      role: a.is_signer
        ? a.is_writable
          ? AccountRole.WRITABLE_SIGNER
          : AccountRole.READONLY_SIGNER
        : a.is_writable
          ? AccountRole.WRITABLE
          : AccountRole.READONLY,
    })),
    data: Uint8Array.from(ix.data),
  };
}

export type SendOptions = {
  /** Size the compute budget by simulation (needed for every Winterwallet instruction). */
  budget?: boolean;
  onStatus?: (s: string) => void;
};

export class SimulationError extends Error {
  logs: string[];
  constructor(message: string, logs: string[]) {
    super(message);
    this.logs = logs;
  }
}

export async function sendInstructions(
  client: SolanaClient,
  session: WalletSession,
  instructions: Instruction[],
  { budget = false, onStatus = () => {} }: SendOptions = {}
): Promise<string> {
  const rpc = client.runtime.rpc;
  const { signer, mode } = walletSigner(session);

  const build = async (ixs: Instruction[]) => {
    const { value: lifetime } = await rpc
      .getLatestBlockhash({ commitment: "confirmed" })
      .send();
    return {
      lifetime,
      message: pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayerSigner(signer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
        (m) => appendTransactionMessageInstructions(ixs, m)
      ),
    };
  };

  let finalIxs = instructions;
  if (budget) {
    onStatus("Simulating…");
    const { message } = await build([
      getSetComputeUnitLimitInstruction({ units: SIMULATION_CU_CEILING }),
      ...instructions,
    ]);
    const wire = getBase64EncodedWireTransaction(compileTransaction(message));
    const sim = await rpc
      .simulateTransaction(wire, {
        encoding: "base64",
        sigVerify: false,
        replaceRecentBlockhash: true,
        commitment: "confirmed",
      })
      .send();
    if (sim.value.err) {
      throw new SimulationError(
        `Simulation failed: ${JSON.stringify(sim.value.err)}`,
        [...(sim.value.logs ?? [])]
      );
    }
    const consumed = Number(sim.value.unitsConsumed ?? 0n);
    const limit = Math.max(10_000, Math.floor((consumed * 11 + 9) / 10));
    finalIxs = [
      getSetComputeUnitLimitInstruction({ units: limit }),
      getSetComputeUnitPriceInstruction({ microLamports: 0n }),
      ...instructions,
    ];
  }

  onStatus("Waiting for wallet signature…");
  const { message, lifetime } = await build(finalIxs);
  let sig: string;
  if (mode === "send") {
    // Wallet can only sign-and-send.
    const raw = await signAndSendTransactionMessageWithSigners(message);
    sig = getBase58Decoder().decode(raw);
  } else {
    const signed = await signTransactionMessageWithSigners(message);
    onStatus("Sending…");
    sig = await rpc
      .sendTransaction(getBase64EncodedWireTransaction(signed), {
        encoding: "base64",
        preflightCommitment: "confirmed",
        maxRetries: 5n,
      })
      .send();
  }

  onStatus("Confirming…");
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1200));
    const { value } = await rpc.getSignatureStatuses([sig as never]).send();
    const st = value[0];
    if (st) {
      if (st.err)
        throw new Error(
          `Transaction ${sig} failed on chain: ${JSON.stringify(st.err)}`
        );
      if (
        st.confirmationStatus === "confirmed" ||
        st.confirmationStatus === "finalized"
      )
        return sig;
    }
    const height = await rpc.getBlockHeight({ commitment: "confirmed" }).send();
    if (height > lifetime.lastValidBlockHeight)
      throw new Error(
        `Transaction ${sig} expired before confirmation. You can retry.`
      );
  }
  throw new Error(`Timed out waiting for confirmation of ${sig}`);
}
