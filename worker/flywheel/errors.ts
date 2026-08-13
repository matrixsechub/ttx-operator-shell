export type FlywheelErrorCategory = "provider" | "schema" | "authorization" | "governance" | "tenant" | "evidence" | "synchronization" | "tool";
export interface FlywheelNormalizedError {
  code: string;
  category: FlywheelErrorCategory;
  retryable: boolean;
  operatorActionRequired: boolean;
  safeModeRequired: boolean;
  retryAfterMs?: number;
  sanitizedMessage: string;
}

const NON_RETRYABLE = new Set(["SCHEMA_MISMATCH", "MISSING_FIELDS", "TOKEN_EXPIRED", "GOVERNANCE_DENIED", "TENANT_MISMATCH", "DUPLICATE_COMMAND", "APPROVAL_REQUIRED"]);
export function normalizeFlywheelError(code: string, message = "Flywheel operation failed."): FlywheelNormalizedError {
  const retryable = !NON_RETRYABLE.has(code);
  const integrity = code === "EVIDENCE_FAILURE" || code === "SCHEMA_MISMATCH";
  const category: FlywheelErrorCategory = code.includes("TENANT") ? "tenant" : code.includes("GOVERNANCE") || code.includes("APPROVAL") ? "governance" : code.includes("SCHEMA") || code.includes("FIELD") ? "schema" : code.includes("EVIDENCE") ? "evidence" : code.includes("TOOL") ? "tool" : "provider";
  return { code, category, retryable, operatorActionRequired: !retryable, safeModeRequired: integrity, retryAfterMs: retryable ? 500 : undefined, sanitizedMessage: message.slice(0, 240) };
}

export async function withFlywheelRetry<T>(operation: (attempt: number) => Promise<T>, onRetry?: (attempt: number, delayMs: number) => Promise<void>, sleep: (delayMs: number) => Promise<void> = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs))): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try { return await operation(attempt); } catch (error) {
      lastError = error;
      if (attempt === 3) break;
      const delayMs = 250 * 2 ** attempt + Math.floor(Math.random() * 50);
      await onRetry?.(attempt + 1, delayMs);
      await sleep(delayMs);
    }
  }
  throw lastError;
}
