import { hasValidAccessToken } from "./auth";
import type { BackboneEnv } from "./backboneEnv";
import { routeDisabledInGovernedEnvironment } from "./governance/routeDisabled";
import type { RuntimeEnvSource } from "./governance/runtimeEnv";
import type { ModeEnv } from "./mode";
import type { BuildInfoEnv } from "./buildInfo";
import { GovernanceDO } from "./do/governance";
import { MarketplaceDO } from "./do/marketplace";
import { SessionDO } from "./do/session";
import { recordGovernanceEvent, type TelemetryEnv } from "./telemetry";

function doRequest(stub: DurableObjectStub, path: string, init?: RequestInit): Promise<Response> {
  return stub.fetch(new Request(`https://backbone.do${path}`, init));
}

async function requireOperator(request: Request, env: BackboneEnv): Promise<Response | null> {
  const ok = await hasValidAccessToken(request, env);
  if (!ok) {
    return Response.json({ error: "Operator authentication required" }, { status: 401 });
  }
  return null;
}

export async function handleGovernanceRoute(
  request: Request,
  pathname: string,
  env: BackboneEnv & TelemetryEnv,
): Promise<Response | null> {
  const stub = env.GOVERNANCE.getByName("global");

  if (pathname === "/api/governance/state" && request.method === "GET") {
    const response = await doRequest(stub, "/state");
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (pathname === "/api/governance/propose" && request.method === "POST") {
    const disabled = routeDisabledInGovernedEnvironment(env as RuntimeEnvSource & ModeEnv & BuildInfoEnv, "Legacy GovernanceDO propose disabled");
    if (disabled) return disabled;
    const blocked = await requireOperator(request, env);
    if (blocked) return blocked;

    let payload: Record<string, unknown>;
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const actor =
      typeof payload.actor === "string"
        ? payload.actor
        : (request.headers.get("X-Operator-Role") ?? "operator");

    const response = await doRequest(stub, "/propose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actor,
        title: payload.title,
        axisId: payload.axisId,
      }),
    });
    if (response.ok) await recordGovernanceEvent(env, "propose");
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (pathname === "/api/governance/approve" && request.method === "POST") {
    const disabled = routeDisabledInGovernedEnvironment(env as RuntimeEnvSource & ModeEnv & BuildInfoEnv, "Legacy GovernanceDO approve disabled");
    if (disabled) return disabled;
    const blocked = await requireOperator(request, env);
    if (blocked) return blocked;

    let payload: Record<string, unknown>;
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const actor =
      typeof payload.actor === "string"
        ? payload.actor
        : (request.headers.get("X-Operator-Role") ?? "operator");

    const response = await doRequest(stub, "/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actor,
        mandateId: payload.mandateId,
      }),
    });
    if (response.ok) await recordGovernanceEvent(env, "approve");
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}

export async function handleMarketplaceBackboneRoute(
  request: Request,
  pathname: string,
  env: BackboneEnv,
): Promise<Response | null> {
  const stub = env.MARKETPLACE.getByName("global");

  if (pathname === "/api/marketplace/registry" && request.method === "GET") {
    const response = await doRequest(stub, "/registry");
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (pathname === "/api/marketplace/validate" && request.method === "POST") {
    let payload: Record<string, unknown>;
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const response = await doRequest(stub, "/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (pathname === "/api/marketplace/entitlements" && request.method === "GET") {
    const operatorId = new URL(request.url).searchParams.get("operatorId");
    const response = await doRequest(stub, `/entitlements?operatorId=${encodeURIComponent(operatorId ?? "")}`);
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}

export { GovernanceDO, SessionDO, MarketplaceDO };
