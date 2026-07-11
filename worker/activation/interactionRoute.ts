import { INTERACTION_SIGNALS, type InteractionSignal } from "./types";
import { recordInteractionSignal } from "./trafficQuality";
import { isValidSessionId } from "../usage";
import type { UsageContextEnv } from "../usage";

export async function handleTrafficInteractionRoute(
  request: Request,
  pathname: string,
  env: UsageContextEnv,
): Promise<Response | null> {
  if (pathname !== "/api/traffic/interaction") return null;
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let body: { sessionId?: unknown; signal?: unknown; timestamp?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidSessionId(body.sessionId)) {
    return Response.json({ error: "sessionId must be a UUID v4" }, { status: 400 });
  }

  if (!INTERACTION_SIGNALS.includes(body.signal as InteractionSignal)) {
    return Response.json(
      { error: `signal must be one of: ${INTERACTION_SIGNALS.join(", ")}` },
      { status: 400 },
    );
  }

  const record = await recordInteractionSignal(env, body.sessionId, body.signal as InteractionSignal);

  return Response.json({
    ok: true,
    quality: record.quality,
    signals: record.signals,
  });
}
