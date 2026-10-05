// Read-side helpers for vault state, balances, token accounts, fees and caps.
import {
  address,
  getBase64Encoder,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import type { SolanaClient } from "@solana/client";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferInstruction,
} from "@solana-program/token";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  ASSETS,
  FEE_BPS,
  VAULT_ACCOUNT_LEN,
  type Asset,
  type TokenAsset,
} from "../config";
import type { Wasm, VaultState } from "./wasm";
import { parseUnits } from "./format";

export type Rpc = SolanaClient["runtime"]["rpc"];

export type VaultInfo =
  | { exists: false; address: string }
  | {
      exists: true;
      address: string;
      lamports: bigint;
      state: VaultState;
      child: number;
    };

export async function fetchVault(
  rpc: Rpc,
  wasm: Wasm,
  note: string
): Promise<VaultInfo> {
  const pda = wasm.vault_address(note);
  const { value } = await rpc
    .getAccountInfo(address(pda), {
      encoding: "base64",
      commitment: "confirmed",
    })
    .send();
  if (!value) return { exists: false, address: pda };
  const data = getBase64Encoder().encode(value.data[0]);
  const state = JSON.parse(
    wasm.decode_vault_account(new Uint8Array(data))
  ) as VaultState;
  const child = wasm.recover_position(note, hexToBytes(state.root), 10_000);
  return {
    exists: true,
    address: pda,
    lamports: BigInt(value.lamports),
    state,
    child,
  };
}

export async function rentFloor(rpc: Rpc): Promise<bigint> {
  return BigInt(
    await rpc.getMinimumBalanceForRentExemption(VAULT_ACCOUNT_LEN).send()
  );
}

export async function ataFor(
  owner: string,
  asset: TokenAsset
): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({
    owner: address(owner),
    mint: address(asset.mint),
    tokenProgram: address(asset.tokenProgram),
  });
  return ata;
}

export async function accountExists(rpc: Rpc, addr: Address): Promise<boolean> {
  const { value } = await rpc
    .getAccountInfo(addr, {
      encoding: "base64",
      dataSlice: { offset: 0, length: 0 },
      commitment: "confirmed",
    })
    .send();
  return value !== null;
}

export type Balance = { asset: Asset; amount: bigint; exists: boolean };

/** Balances of every allowlisted asset for `owner` (SOL lamports + each token ATA). */
export async function fetchBalances(
  rpc: Rpc,
  owner: string
): Promise<Balance[]> {
  return Promise.all(
    ASSETS.map(async (asset): Promise<Balance> => {
      if (asset.kind === "sol") {
        const { value } = await rpc
          .getBalance(address(owner), { commitment: "confirmed" })
          .send();
        return { asset, amount: BigInt(value), exists: true };
      }
      const ata = await ataFor(owner, asset);
      try {
        const { value } = await rpc
          .getTokenAccountBalance(ata, { commitment: "confirmed" })
          .send();
        return { asset, amount: BigInt(value.amount), exists: true };
      } catch {
        return { asset, amount: 0n, exists: false };
      }
    })
  );
}

export function feeFor(amount: bigint): bigint {
  return (amount * FEE_BPS) / 10_000n;
}

/** Largest `amount` such that amount + fee(amount) <= available. */
export function maxWithdrawable(available: bigint): bigint {
  if (available <= 0n) return 0n;
  let amount = (available * 10_000n) / (10_000n + FEE_BPS);
  while (amount > 0n && amount + feeFor(amount) > available) amount -= 1n;
  return amount;
}

export function depositCap(asset: Asset): bigint {
  const cfg = ASSETS.find((a) => a.symbol === asset.symbol)!;
  return parseUnits(cfg.depositCapUi, asset.decimals);
}

/** Deposit instructions: SOL -> system transfer to the vault; token -> create vault ATA (idempotent) + transfer from the wallet's ATA. */
export async function depositInstructions(
  signer: TransactionSigner,
  vault: string,
  asset: Asset,
  amount: bigint
): Promise<Instruction[]> {
  if (asset.kind === "sol") {
    return [
      getTransferSolInstruction({
        source: signer,
        destination: address(vault),
        amount,
      }),
    ];
  }
  const source = await ataFor(signer.address, asset);
  const destination = await ataFor(vault, asset);
  return [
    getCreateAssociatedTokenIdempotentInstruction({
      payer: signer,
      ata: destination,
      owner: address(vault),
      mint: address(asset.mint),
      tokenProgram: address(asset.tokenProgram),
    }),
    getTransferInstruction(
      { source, destination, authority: signer, amount },
      { programAddress: address(asset.tokenProgram) }
    ),
  ];
}

/** Idempotent ATA creation for an arbitrary owner, paid by `payer`. */
export function createAtaIx(
  payer: TransactionSigner,
  owner: string,
  asset: TokenAsset,
  ata: Address
): Instruction {
  return getCreateAssociatedTokenIdempotentInstruction({
    payer,
    ata,
    owner: address(owner),
    mint: address(asset.mint),
    tokenProgram: address(asset.tokenProgram),
  });
}

export function hexToBytes(h: string): Uint8Array {
  return Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));
}
