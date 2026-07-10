import { signToken, makeCtxHash } from "./edge/crypto";
import {
  buildPrismCouncilAdvisoryBundle,
  type PrismCouncilAdvisoryBundle,
} from "./data/prismCouncilAdvisory";
import { buildTriageSummary } from "./data/prismTriageEngine";
import type { PrismTriageSummary } from "./data/prismTriageTypes";
import { listTriageSummaries, readTriageItem, type PrismTriageStorageEnv } from "./prismTriageStorage";
import type { PrismUiuxStorageEnv } from "./prismUiuxStorage";

export interface HsxEdgeEnv extends PrismUiuxStorageEnv {
  OPERATOR_SECRET?: string;
  AUTH_SIGNING_KEY?: string;
}

function operatorSecret(env: HsxEdgeEnv): string | undefined {
  return env.OPERATOR_SECRET || env.AUTH_SIGNING_KEY;
}

type HsxPrismAdvisoryRequest = {
  action?: "list" | "brief";
  auditId?: string;
  limit?: number;
};

function parseHsxAdvisoryRequest(body: unknown): HsxPrismAdvisoryRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { action: "list" };
  }
  const record = body as Record<string, unknown>;
  const action = record.action === "brief" ? "brief" : record.action === "list" ? "list" : "list";
  const auditId = typeof record.auditId === "string" && record.auditId.trim() ? record.auditId.trim() : undefined;
  const limit =
    typeof record.limit === "number" && Number.isFinite(record.limit)
      ? Math.min(Math.max(1, Math.floor(record.limit)), 25)
      : undefined;
  return { action, auditId, limit };
}

function hsxAdvisoryResponse(
  bundle: PrismCouncilAdvisoryBundle,
  action: "list" | "brief",
  triageSummary?: PrismTriageSummary,
): Response {
  const payload =
    action === "brief" && bundle.items.length > 0
      ? {
          ok: true,
          advisoryOnly: true as const,
          mutationAuthorized: false as const,
          brief: bundle.items[0],
          rankedAuditIds: bundle.rankedAuditIds,
          evidenceHash: bundle.evidenceHash,
          prismTriageSummary: triageSummary,
        }
      : {
          ok: true,
          advisoryOnly: true as const,
          mutationAuthorized: false as const,
          advisories: bundle,
          prismTriageSummary: triageSummary,
        };

  return Response.json(payload, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function handleHsxEdgeRoute(
  request: Request,
  pathname: string,
  env: HsxEdgeEnv & PrismTriageStorageEnv,
): Promise<Response | null> {
  if (pathname === "/api/hsx/session" && request.method === "POST") {
    const secret = operatorSecret(env);
    if (!secret) {
      return Response.json({ error: "OPERATOR_SECRET not configured" }, { status: 503 });
    }
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ctxHash = await makeCtxHash(ip, request.headers.get("User-Agent") || "");
    const token = await signToken(secret, {
      sub: "hsx-session",
      ctx: ctxHash,
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    return Response.json({ token, expires_in: 300 }, { status: 200 });
  }

  if (pathname === "/api/hsx" && request.method === "POST") {
    let body: unknown = {};
    try {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.toLowerCase().includes("application/json")) {
        body = await request.json();
      }
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseHsxAdvisoryRequest(body);
    try {
      const [bundle, triageSummaries] = await Promise.all([
        buildPrismCouncilAdvisoryBundle(env, {
          auditId: parsed.auditId,
          limit: parsed.action === "brief" && !parsed.auditId ? 1 : parsed.limit,
        }),
        listTriageSummaries(env).catch(() => []),
      ]);
      const triageItems = (
        await Promise.all(triageSummaries.slice(0, 100).map((s) => readTriageItem(env, s.triageId)))
      ).filter((item): item is NonNullable<typeof item> => item !== null);
      const prismTriageSummary = buildTriageSummary(triageItems);
      if (parsed.action === "brief" && bundle.items.length === 0) {
        return Response.json({ error: "PRISM advisory brief unavailable" }, { status: 404 });
      }
      return hsxAdvisoryResponse(bundle, parsed.action ?? "list", prismTriageSummary);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to assemble PRISM advisories";
      const status = message.includes("not found") ? 404 : 500;
      return Response.json({ error: message }, { status });
    }
  }

  return null;
}
