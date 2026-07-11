import {
  buildIntentCaptureReport,
  buildIntentHandoff,
  defaultUiMode,
  formatIntentCaptureReport,
  generateIntentPreview,
  normalizeInteractionDepth,
} from "./intentCapture";
import {
  getIntentCaptureLog,
  getIntentCaptureRollup,
  persistIntentCapture,
  recordIntentHandoffEvent,
  type IntentCaptureStorageEnv,
} from "./intentCaptureStorage";
import { getFlowRollup } from "./flowStorage";
import {
  INTENT_CAPTURE_CATEGORIES,
  sanitizeIntentCategory,
  sanitizeIntentSource,
  type IntentCaptureRecord,
  type IntentHandoffEvent,
} from "./intentCaptureTypes";
import { isValidSessionId } from "./usage";

const HANDOFF_EVENTS: IntentHandoffEvent[] = [
  "preview_generated",
  "preview_abandoned",
  "unlock_clicked",
  "booking_clicked",
  "module_clicked",
];

function sanitizePage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return null;
  return trimmed.split("?")[0]?.split("#")[0]?.slice(0, 128) || null;
}

function createCaptureId(): string {
  return `intent-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function handleIntentCaptureRoute(
  request: Request,
  pathname: string,
  env: IntentCaptureStorageEnv,
): Promise<Response | null> {
  if (pathname === "/api/growth/intent-capture/report") {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }

    const [rollup, recent, flowRollup] = await Promise.all([
      getIntentCaptureRollup(env),
      getIntentCaptureLog(env),
      getFlowRollup(env),
    ]);
    const report = buildIntentCaptureReport(rollup, recent, { engagedSessions: flowRollup.sessionCount });
    return Response.json({
      ok: true,
      ...report,
      report: formatIntentCaptureReport(report, {
        triggerWorking: true,
        captureUiLive: true,
        apiWorking: true,
        builderConnected: true,
        handoffActive: rollup.handoffs > 0 || rollup.previews > 0,
      }),
    });
  }

  if (pathname === "/api/growth/intent-handoff") {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
    }

    let body: { event?: unknown; sessionId?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!HANDOFF_EVENTS.includes(body.event as IntentHandoffEvent)) {
      return Response.json({ error: "event is invalid" }, { status: 400 });
    }

    if (body.sessionId !== undefined && !isValidSessionId(body.sessionId)) {
      return Response.json({ error: "sessionId must be a UUID v4 when provided" }, { status: 400 });
    }

    await recordIntentHandoffEvent(env, body.event as IntentHandoffEvent);
    return Response.json({ ok: true, recorded: body.event });
  }

  if (pathname !== "/api/growth/intent-capture") return null;
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let body: {
    sessionId?: unknown;
    source?: unknown;
    page?: unknown;
    uiMode?: unknown;
    experimentId?: unknown;
    variant?: unknown;
    intent?: unknown;
    category?: unknown;
    interactionDepth?: unknown;
    timestamp?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidSessionId(body.sessionId)) {
    return Response.json({ error: "sessionId must be a UUID v4" }, { status: 400 });
  }

  const page = sanitizePage(body.page);
  if (!page) {
    return Response.json({ error: "page must be a valid path starting with /" }, { status: 400 });
  }

  if (typeof body.intent !== "string" || body.intent.trim().length < 3) {
    return Response.json({ error: "intent must be at least 3 characters" }, { status: 400 });
  }

  if (body.category !== undefined && !sanitizeIntentCategory(body.category)) {
    return Response.json(
      { error: `category must be one of ${INTENT_CAPTURE_CATEGORIES.join(", ")}` },
      { status: 400 },
    );
  }

  const category = sanitizeIntentCategory(body.category);
  const captureId = createCaptureId();
  const record: IntentCaptureRecord = {
    captureId,
    sessionId: body.sessionId as string,
    source: sanitizeIntentSource(body.source),
    page,
    uiMode: defaultUiMode(body.uiMode),
    experimentId: typeof body.experimentId === "string" ? body.experimentId.slice(0, 64) : undefined,
    variant: body.variant === "A" || body.variant === "B" ? body.variant : undefined,
    intent: body.intent.trim().slice(0, 2000),
    category,
    interactionDepth: normalizeInteractionDepth(body.interactionDepth),
    timestamp: typeof body.timestamp === "string" ? body.timestamp : new Date().toISOString(),
    previewGenerated: true,
  };

  const preview = generateIntentPreview(record.intent, category, captureId, page);
  const handoff = buildIntentHandoff(preview, captureId, category);

  await persistIntentCapture(env, record);

  const flowRollup = await getFlowRollup(env);
  const rollup = await getIntentCaptureRollup(env);

  return Response.json({
    ok: true,
    captureId,
    status: "intent-captured",
    preview,
    handoff,
    builderRoute: preview.builderRoute,
    report: formatIntentCaptureReport(buildIntentCaptureReport(rollup, [record], { engagedSessions: flowRollup.sessionCount }), {
      triggerWorking: true,
      captureUiLive: true,
      apiWorking: true,
      builderConnected: true,
      handoffActive: true,
    }),
  });
}
