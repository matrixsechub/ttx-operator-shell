import { DurableObject } from "cloudflare:workers";
import type { GovernanceEvent, GovernanceState, Mandate, NorthstarState, StrategicAxis } from "./types";

const STATE_KEY = "governance:v1";

function defaultState(): GovernanceState {
  const now = new Date().toISOString();
  const northstar: NorthstarState = {
    statement: "Operator-grade OS with FedGrade gates, marketplace integrity, and council oversight.",
    version: 1,
    updatedAt: now,
  };
  const strategicAxis: StrategicAxis[] = [
    { id: "axis-security", name: "Security Posture", weight: 0.35, status: "active" },
    { id: "axis-delivery", name: "Delivery Velocity", weight: 0.3, status: "active" },
    { id: "axis-market", name: "Marketplace Integrity", weight: 0.2, status: "watch" },
    { id: "axis-governance", name: "Council Mandates", weight: 0.15, status: "active" },
  ];
  const mandateRegistry: Mandate[] = [
    {
      id: "mandate-fedgrade",
      title: "Maintain FedGrade advisory gates on protected routes",
      status: "approved",
      owner: "council",
      axisId: "axis-security",
    },
    {
      id: "mandate-marketplace",
      title: "Validate marketplace module entitlements before cockpit unlock",
      status: "approved",
      owner: "council",
      axisId: "axis-market",
    },
  ];
  return { northstar, strategicAxis, mandateRegistry, eventLog: [] };
}

export class GovernanceDO extends DurableObject {
  private async loadState(): Promise<GovernanceState> {
    const stored = await this.ctx.storage.get<GovernanceState>(STATE_KEY);
    if (stored) return stored;
    const initial = defaultState();
    await this.ctx.storage.put(STATE_KEY, initial);
    return initial;
  }

  private async saveState(state: GovernanceState): Promise<void> {
    await this.ctx.storage.put(STATE_KEY, state);
  }

  private appendEvent(
    state: GovernanceState,
    type: GovernanceEvent["type"],
    actor: string,
    payload: Record<string, unknown>,
  ): GovernanceEvent {
    const event: GovernanceEvent = {
      id: crypto.randomUUID(),
      type,
      actor,
      ts: new Date().toISOString(),
      payload,
    };
    state.eventLog = [event, ...state.eventLog].slice(0, 200);
    return event;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/state" && request.method === "GET") {
      const state = await this.loadState();
      return Response.json({ ok: true, state });
    }

    if (path === "/propose" && request.method === "POST") {
      let body: { actor?: string; title?: string; axisId?: string };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }
      if (!body.actor || !body.title) {
        return Response.json({ error: "actor and title are required" }, { status: 400 });
      }

      const state = await this.loadState();
      const mandate: Mandate = {
        id: `mandate-${crypto.randomUUID().slice(0, 8)}`,
        title: body.title,
        status: "proposed",
        owner: body.actor,
        axisId: body.axisId,
      };
      state.mandateRegistry.push(mandate);
      const event = this.appendEvent(state, "propose", body.actor, { mandateId: mandate.id, title: mandate.title });
      await this.saveState(state);
      return Response.json({ ok: true, mandate, event }, { status: 201 });
    }

    if (path === "/event" && request.method === "POST") {
      let body: { type?: string; actor?: string; payload?: Record<string, unknown> };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }
      if (!body.type) {
        return Response.json({ error: "type is required" }, { status: 400 });
      }

      const state = await this.loadState();
      const event = this.appendEvent(state, "system", body.actor ?? "kernel", {
        telemetryType: body.type,
        ...(body.payload ?? {}),
      });
      await this.saveState(state);
      return Response.json({ ok: true, event });
    }

    if (path === "/approve" && request.method === "POST") {
      let body: { actor?: string; mandateId?: string };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }
      if (!body.actor || !body.mandateId) {
        return Response.json({ error: "actor and mandateId are required" }, { status: 400 });
      }

      const state = await this.loadState();
      const mandate = state.mandateRegistry.find((m) => m.id === body.mandateId);
      if (!mandate) {
        return Response.json({ error: "Mandate not found" }, { status: 404 });
      }
      mandate.status = "approved";
      const event = this.appendEvent(state, "approve", body.actor, { mandateId: mandate.id });
      await this.saveState(state);
      return Response.json({ ok: true, mandate, event });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
