import { DurableObject } from "cloudflare:workers";
import type { OperatorSession } from "./types";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_CONCURRENT_SESSIONS = 10;

export class SessionDO extends DurableObject {
  private sessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private operatorIndexKey(operatorId: string): string {
    return `operator:${operatorId}:sessions`;
  }

  private async appendOperatorSession(operatorId: string, sessionId: string): Promise<void> {
    const existing = (await this.ctx.storage.get<string[]>(this.operatorIndexKey(operatorId))) ?? [];
    const next = [...existing.filter((id) => id !== sessionId), sessionId].slice(-MAX_CONCURRENT_SESSIONS);
    await this.ctx.storage.put(this.operatorIndexKey(operatorId), next);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/create" && request.method === "POST") {
      let body: { operatorId?: string; handle?: string; role?: string; accessLevel?: string };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }
      if (!body.operatorId || !body.handle) {
        return Response.json({ error: "operatorId and handle are required" }, { status: 400 });
      }

      const now = Date.now();
      const session: OperatorSession = {
        sessionId: crypto.randomUUID(),
        operatorId: body.operatorId,
        handle: body.handle,
        role: body.role,
        accessLevel: body.accessLevel,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
        active: true,
      };

      await this.ctx.storage.put(this.sessionKey(session.sessionId), session);
      await this.appendOperatorSession(session.operatorId, session.sessionId);
      return Response.json({ ok: true, session }, { status: 201 });
    }

    if (path === "/validate" && request.method === "POST") {
      let body: { sessionId?: string };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }
      if (!body.sessionId) {
        return Response.json({ error: "sessionId is required" }, { status: 400 });
      }

      const session = await this.ctx.storage.get<OperatorSession>(this.sessionKey(body.sessionId));
      if (!session || !session.active) {
        return Response.json({ valid: false, reason: "inactive" }, { status: 401 });
      }
      if (Date.parse(session.expiresAt) <= Date.now()) {
        session.active = false;
        await this.ctx.storage.put(this.sessionKey(session.sessionId), session);
        return Response.json({ valid: false, reason: "expired" }, { status: 401 });
      }
      return Response.json({ valid: true, session });
    }

    if (path === "/by-operator" && request.method === "GET") {
      const operatorId = url.searchParams.get("operatorId");
      if (!operatorId) {
        return Response.json({ error: "operatorId is required" }, { status: 400 });
      }

      const sessionIds = (await this.ctx.storage.get<string[]>(this.operatorIndexKey(operatorId))) ?? [];
      for (let i = sessionIds.length - 1; i >= 0; i -= 1) {
        const session = await this.ctx.storage.get<OperatorSession>(this.sessionKey(sessionIds[i]));
        if (session && session.active && Date.parse(session.expiresAt) > Date.now()) {
          return Response.json({ ok: true, session });
        }
      }
      return Response.json({ error: "No active session" }, { status: 404 });
    }

    if (path === "/list" && request.method === "GET") {
      const operatorId = url.searchParams.get("operatorId");
      if (!operatorId) {
        return Response.json({ error: "operatorId is required" }, { status: 400 });
      }

      const sessionIds = (await this.ctx.storage.get<string[]>(this.operatorIndexKey(operatorId))) ?? [];
      const sessions: OperatorSession[] = [];
      for (const sessionId of sessionIds) {
        const session = await this.ctx.storage.get<OperatorSession>(this.sessionKey(sessionId));
        if (session && session.active && Date.parse(session.expiresAt) > Date.now()) {
          sessions.push(session);
        }
      }
      return Response.json({ ok: true, sessions, count: sessions.length });
    }

    if (path === "/stats" && request.method === "GET") {
      const keys = await this.ctx.storage.list({ prefix: "session:" });
      let active = 0;
      let expired = 0;
      for (const [, value] of keys) {
        const session = value as OperatorSession;
        if (!session.active || Date.parse(session.expiresAt) <= Date.now()) expired += 1;
        else active += 1;
      }
      return Response.json({ ok: true, active, expired, total: keys.size });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
