import { sanitizeTrafficSource } from "./trafficSources";
import { isValidSessionId } from "./usage";
import { recordFlowEvent } from "./flowStorage";
import type { FlowEventType } from "./flowTypes";
import { sanitizeCtaId, sanitizeFlowPage } from "./flowTypes";
import type { FlowStorageEnv } from "./flowStorage";

const VALID_EVENTS: FlowEventType[] = [
  "page_view",
  "click",
  "cta_impression",
  "cta_click",
  "form_start",
  "form_submit",
];

export async function handleFlowEventRoute(
  request: Request,
  pathname: string,
  env: FlowStorageEnv,
): Promise<Response | null> {
  if (pathname !== "/api/flow/event") return null;
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let body: {
    event?: unknown;
    sessionId?: unknown;
    page?: unknown;
    trafficSource?: unknown;
    ctaId?: unknown;
    dwellMs?: unknown;
    formId?: unknown;
    clickDelta?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!VALID_EVENTS.includes(body.event as FlowEventType)) {
    return Response.json(
      { error: "event must be page_view, click, cta_impression, cta_click, form_start, or form_submit" },
      { status: 400 },
    );
  }

  if (!isValidSessionId(body.sessionId)) {
    return Response.json({ error: "sessionId must be a UUID v4" }, { status: 400 });
  }

  if (!sanitizeFlowPage(body.page)) {
    return Response.json({ error: "page must be a valid path starting with /" }, { status: 400 });
  }

  if (body.ctaId !== undefined && !sanitizeCtaId(body.ctaId)) {
    return Response.json({ error: "ctaId is invalid" }, { status: 400 });
  }

  const dwellMs = typeof body.dwellMs === "number" && body.dwellMs >= 0 ? body.dwellMs : undefined;
  const clickDelta =
    typeof body.clickDelta === "number" && body.clickDelta > 0 ? Math.round(body.clickDelta) : undefined;

  const result = await recordFlowEvent(env, {
    event: body.event as FlowEventType,
    sessionId: body.sessionId as string,
    page: body.page as string,
    trafficSource:
      sanitizeTrafficSource(typeof body.trafficSource === "string" ? body.trafficSource : undefined) ?? undefined,
    ctaId: typeof body.ctaId === "string" ? body.ctaId : undefined,
    dwellMs,
    formId: typeof body.formId === "string" ? body.formId : undefined,
    clickDelta,
  });

  return Response.json({
    ok: true,
    counted: result.counted,
    reason: result.reason ?? null,
  });
}
