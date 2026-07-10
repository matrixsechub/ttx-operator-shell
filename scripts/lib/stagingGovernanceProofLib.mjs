import { createHash } from "node:crypto";
import { cfAccessConfigured, readCfAccessServiceTokenHeaders, validateAccessCredentialPair } from "./cfAccess.mjs";

export const REDACT_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /CF-Access-Client-Secret["']?\s*[:=]\s*["']?[^"'\s,}]+/gi,
  /CF-Access-Client-Id["']?\s*[:=]\s*["']?[^"'\s,}]+/gi,
  /(AUTH_SIGNING_KEY|GOVERNANCE_RECEIPT_SIGNING_KEY|BEACON_SIGNING_KEY|OPERATOR_PASSWORD)\s*[:=]\s*\S+/gi,
];

export function redactValue(value) {
  const json = JSON.stringify(value);
  let out = json;
  for (const pattern of REDACT_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return JSON.parse(out);
}

export function assertArtifactRedaction(text) {
  const violations = [];
  for (const pattern of REDACT_PATTERNS) {
    if (pattern.test(text)) violations.push(pattern.toString());
    pattern.lastIndex = 0;
  }
  return violations;
}

export function isAccessInterstitial(response, text) {
  if (response.status === 302 || response.status === 301) return true;
  if (text.includes("cloudflareaccess.com")) return true;
  if (text.includes("Cloudflare Access")) return true;
  return false;
}

export function workerReached(response, text) {
  if (isAccessInterstitial(response, text)) return false;
  const ct = response.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return true;
  if (response.headers.get("x-build-commit")) return true;
  return false;
}

export function classifyWorkerAuthFailure(status, json) {
  if (status === 401 || status === 403) return "WORKER_AUTH_REJECTED";
  if (json?.code === "OPERATOR_AUTH_REQUIRED") return "OPERATOR_AUTH_REQUIRED";
  return "WORKER_AUTH_BYPASSED";
}

export async function fetchRaw(baseUrl, pathname, init = {}, options = {}) {
  const { token, includeAccess = true, correlationId = crypto.randomUUID() } = options;
  const headers = {
    Accept: "application/json",
    "Cache-Control": "no-cache",
    "x-correlation-id": correlationId,
    ...(init.headers ?? {}),
  };
  if (includeAccess) {
    Object.assign(headers, readCfAccessServiceTokenHeaders());
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${pathname}`, { ...init, headers, redirect: "manual" });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, json, text, correlationId };
}

export async function resolveToken(baseUrl) {
  const bearer = process.env.OPERATOR_BEARER_TOKEN?.trim();
  if (bearer) return bearer;
  const callsign =
    process.env.STAGING_OPERATOR_CALLSIGN?.trim() ?? process.env.OPERATOR_CALLSIGN?.trim();
  const password =
    process.env.STAGING_OPERATOR_PASSWORD?.trim() ?? process.env.OPERATOR_PASSWORD?.trim();
  if (!callsign || !password) return null;
  const login = await fetchRaw(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: callsign, password }),
  });
  return login.json?.token ?? login.json?.accessToken ?? null;
}

export function writeChecksumArtifact(outputPath, packet) {
  const redacted = redactValue(packet);
  const serialized = `${JSON.stringify(redacted, null, 2)}\n`;
  const sha256 = createHash("sha256").update(serialized).digest("hex");
  return { redacted, serialized, sha256 };
}

export function validateTelemetryEvents(events, requiredPrefixes) {
  const names = new Set(events.map((event) => event.name ?? event.eventType ?? ""));
  return requiredPrefixes.every((prefix) => [...names].some((name) => name.includes(prefix)));
}

export function assertPendingForbidden(status) {
  return status !== "PENDING";
}

export { cfAccessConfigured, validateAccessCredentialPair };
