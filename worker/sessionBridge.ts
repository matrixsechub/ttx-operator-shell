import type { OperatorSession } from "./do/types";
import type { BackboneEnv } from "./backboneEnv";

function doRequest(stub: DurableObjectStub, path: string, init?: RequestInit): Promise<Response> {
  return stub.fetch(new Request(`https://backbone.do${path}`, init));
}

export async function createOperatorSession(
  env: BackboneEnv,
  operator: { id: string; handle: string; role?: string; access_level?: string },
): Promise<{ sessionId: string } | null> {
  const stub = env.SESSION.getByName("operator");
  const response = await doRequest(stub, "/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operatorId: operator.id,
      handle: operator.handle,
      role: operator.role,
      accessLevel: operator.access_level,
    }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { session?: OperatorSession };
  return body.session ? { sessionId: body.session.sessionId } : null;
}

export async function getOperatorSession(
  env: BackboneEnv,
  operatorId: string,
): Promise<OperatorSession | null> {
  const stub = env.SESSION.getByName("operator");
  const response = await doRequest(stub, `/by-operator?operatorId=${encodeURIComponent(operatorId)}`);
  if (!response.ok) return null;
  const body = (await response.json()) as { session?: OperatorSession };
  return body.session ?? null;
}

export async function listOperatorSessions(
  env: BackboneEnv,
  operatorId: string,
): Promise<OperatorSession[]> {
  const stub = env.SESSION.getByName("operator");
  const response = await doRequest(stub, `/list?operatorId=${encodeURIComponent(operatorId)}`);
  if (!response.ok) return [];
  const body = (await response.json()) as { sessions?: OperatorSession[] };
  return body.sessions ?? [];
}

export async function validateOperatorSession(
  env: BackboneEnv,
  sessionId: string,
): Promise<{ valid: boolean; session?: OperatorSession; reason?: string }> {
  const stub = env.SESSION.getByName("operator");
  const response = await doRequest(stub, "/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  const body = (await response.json()) as { valid?: boolean; session?: OperatorSession; reason?: string };
  if (!response.ok || !body.valid) {
    return { valid: false, reason: body.reason ?? "invalid" };
  }
  return { valid: true, session: body.session };
}
