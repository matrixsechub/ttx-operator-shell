import type {
  ReceiptCompleteInput,
  ReceiptFailInput,
  ReceiptReserveInput,
  ReceiptReserveStatus,
} from "./receiptReserveLogic";
import { createMemoryReceiptAuthorityClient } from "./receiptAuthorityMemory";
import { resolveRuntimeEnvironment } from "./runtimeEnv";
import type { ModeEnv } from "../mode";
import type { BuildInfoEnv } from "../buildInfo";

import type { ReceiptAuthority } from "../do/receiptAuthority";

export interface ReceiptAuthorityEnv extends ModeEnv, BuildInfoEnv {
  RECEIPT_AUTHORITY?: DurableObjectNamespace<ReceiptAuthority>;
}

async function doFetch<T>(stub: DurableObjectStub, action: string, body: unknown): Promise<T> {
  const response = await stub.fetch(`https://receipt-authority/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : `receipt-authority-${action}-failed`);
  }
  return payload;
}

export interface ReceiptAuthorityClient {
  reserve(input: ReceiptReserveInput): Promise<ReceiptReserveStatus>;
  complete(input: ReceiptCompleteInput): Promise<void>;
  fail(input: ReceiptFailInput): Promise<void>;
  health(): Promise<{ ok: boolean }>;
}

function stubForApproval(env: ReceiptAuthorityEnv, approvalId: string): DurableObjectStub | null {
  if (!env.RECEIPT_AUTHORITY) return null;
  return env.RECEIPT_AUTHORITY.get(env.RECEIPT_AUTHORITY.idFromName(approvalId));
}

function shouldUseMemoryReceiptAuthority(env: ReceiptAuthorityEnv): boolean {
  if (env.RECEIPT_AUTHORITY) return false;
  const runtime = resolveRuntimeEnvironment(env);
  if (runtime === "development") return true;
  return typeof (globalThis as { caches?: CacheStorage }).caches === "undefined";
}

export function createReceiptAuthorityClient(env: ReceiptAuthorityEnv): ReceiptAuthorityClient {
  const useMemory = shouldUseMemoryReceiptAuthority(env);
  const memory = useMemory ? createMemoryReceiptAuthorityClient() : null;

  return {
    async reserve(input) {
      if (memory) return memory.reserve(input);
      const stub = stubForApproval(env, input.approvalId);
      if (!stub) {
        return { status: "conflict", reasonCode: "RECEIPT_AUTHORITY_UNAVAILABLE" };
      }
      return doFetch<ReceiptReserveStatus>(stub, "reserve", input);
    },
    async complete(input) {
      if (memory) return memory.complete(input);
      const stub = stubForApproval(env, input.approvalId);
      if (!stub) throw new Error("RECEIPT_AUTHORITY_UNAVAILABLE");
      await doFetch(stub, "complete", input);
    },
    async fail(input) {
      if (memory) return memory.fail(input);
      const stub = stubForApproval(env, input.approvalId);
      if (!stub) throw new Error("RECEIPT_AUTHORITY_UNAVAILABLE");
      await doFetch(stub, "fail", input);
    },
    async health() {
      if (memory) return memory.health();
      if (!env.RECEIPT_AUTHORITY) return { ok: false };
      const stub = env.RECEIPT_AUTHORITY.get(env.RECEIPT_AUTHORITY.idFromName("__health__"));
      return doFetch<{ ok: boolean }>(stub, "health", {});
    },
  };
}
