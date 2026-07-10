import {
  buildIntentQualificationReport,
  formatIntentQualificationReport,
  redactQualificationRecordForReport,
} from "./intentQualification";
import {
  INTENT_QUALIFICATION_GOVERNANCE,
  INTENT_QUALIFICATION_MAX_BODY_BYTES,
} from "./intentQualificationGovernance";
import {
  countPendingQualifications,
  getQualificationLog,
  getQualificationProposals,
  getQualificationRollup,
  qualifyCaptureBatch,
  qualifyCaptureById,
  type IntentQualificationStorageEnv,
} from "./intentQualificationStorage";

function sanitizeCaptureId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("intent-") || trimmed.length > 128) return null;
  return trimmed;
}

function governanceResponse<T extends Record<string, unknown>>(payload: T): Response {
  return Response.json({
    ...payload,
    governance: INTENT_QUALIFICATION_GOVERNANCE,
  });
}

export async function handleIntentQualificationRoute(
  request: Request,
  pathname: string,
  env: IntentQualificationStorageEnv,
): Promise<Response | null> {
  if (pathname === "/api/growth/intent-qualification/report") {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }

    await qualifyCaptureBatch(env, { limit: 20 });

    const [rollup, qualifiedLog, proposals, pendingCaptures] = await Promise.all([
      getQualificationRollup(env),
      getQualificationLog(env),
      getQualificationProposals(env),
      countPendingQualifications(env),
    ]);

    const report = buildIntentQualificationReport(rollup, qualifiedLog, proposals, pendingCaptures);

    return governanceResponse({
      ok: true,
      ...report,
      report: formatIntentQualificationReport(report),
    });
  }

  if (pathname !== "/api/growth/intent-qualify") return null;
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > INTENT_QUALIFICATION_MAX_BODY_BYTES) {
    return Response.json({ error: "Request body too large" }, { status: 413 });
  }

  const rawBody = await request.text();
  if (rawBody.length > INTENT_QUALIFICATION_MAX_BODY_BYTES) {
    return Response.json({ error: "Request body too large" }, { status: 413 });
  }

  let body: { captureId?: unknown };
  try {
    body = rawBody ? (JSON.parse(rawBody) as typeof body) : {};
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const captureId = sanitizeCaptureId(body.captureId);

  if (captureId) {
    const { record, created } = await qualifyCaptureById(env, captureId);
    if (!record) {
      return Response.json({ error: "captureId not found" }, { status: 404 });
    }
    return governanceResponse({
      ok: true,
      created,
      qualified: [redactQualificationRecordForReport(record)],
    });
  }

  const batch = await qualifyCaptureBatch(env, { limit: 20 });
  return governanceResponse({
    ok: true,
    batch: true,
    processed: batch.processed,
    skipped: batch.skipped,
    failed: batch.failed,
    qualified: batch.qualified.map(redactQualificationRecordForReport),
  });
}
