// Phase 36 — LiveTtxSession Durable Object.
//
// One DO instance per live session, keyed by session code. The DO is the
// single source of truth for all real-time collaborative state: participant
// roster, vote board, event log, and the current node in the scenario graph.
//
// Architecture decisions:
// - WebSocket hibernation API (this.ctx.acceptWebSocket) so idle sessions
//   don't burn CPU — Cloudflare hibernates the DO between WS messages.
// - Participant identity uses WS tags: acceptWebSocket(server, [id]) so
//   getWebSockets(id) can look up a specific participant's socket quickly.
// - Scoring and analytics are written to TTX_STATE KV via the same pure
//   functions solo sessions use (computeScore, recordAnalytics*) — so
//   live session results flow through the existing history/intelligence
//   pipeline unchanged.
// - The DO never calls internal HTTP routes. It imports shared domain
//   functions directly (scenarioGraph, ttxScoring, ttxAnalytics) as required
//   by the hard constraints.
// - State is persisted in DO SQLite storage after every mutation so
//   reconnects restore exactly where the session was.

import { DurableObject } from "cloudflare:workers";
import type {
  LiveTtxSessionState,
  LiveEvent,
  LiveParticipant,
  PublicLiveTtxState,
  ClientMessage,
  ServerMessage,
  LiveJoinTokenPayload,
} from "./liveTtxProtocol";
import { getScenarioById } from "./localScenarioRoutes";
import { entryNode, step } from "./scenarioGraph";
import { computeScore } from "./ttxScoring";
import { recordAnalyticsStart, recordAnalyticsTransition, recordAnalyticsFinalize } from "./ttxAnalytics";
import { verifyToken } from "./edge/crypto";
import type { ScorePacket } from "./ttxScoring";

const STATE_KEY = "live_state";
const SCORE_PREFIX = "score:";
const SCORE_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_TTL_MS = 48 * 60 * 60 * 1000; // 48h archive alarm
const MAX_CHAT_LENGTH = 500;
const MAX_WS_MSG_BYTES = 8_192;

// Minimum env the DO needs from the Worker binding set.
interface LiveSessionEnv {
  TTX_STATE: KVNamespace;
  LIVE_SESSION_SECRET?: string;
}

export class LiveTtxSession extends DurableObject<LiveSessionEnv> {
  // ── Storage helpers ────────────────────────────────────────────────────

  private async loadState(): Promise<LiveTtxSessionState | null> {
    return (await this.ctx.storage.get<LiveTtxSessionState>(STATE_KEY)) ?? null;
  }

  private async saveState(state: LiveTtxSessionState): Promise<void> {
    await this.ctx.storage.put(STATE_KEY, state);
  }

  // Apply a mutation, persist, and broadcast to all connected WebSockets.
  private async mutate(fn: (s: LiveTtxSessionState) => LiveTtxSessionState): Promise<LiveTtxSessionState> {
    const current = await this.loadState();
    if (!current) throw new Error("Session not initialized");
    const next = fn(current);
    await this.saveState(next);
    this.broadcast({ type: "state.update", state: toPublic(next) });
    return next;
  }

  private broadcast(msg: ServerMessage): void {
    const payload = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        // Socket may have closed between getWebSockets() and send().
      }
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Closed.
    }
  }

  // ── Alarm: archive expired sessions ────────────────────────────────────

  async alarm(): Promise<void> {
    const state = await this.loadState();
    if (!state || state.status === "archived") return;
    if (state.status !== "completed") return; // only archive completed sessions
    await this.mutate((s) => ({
      ...s,
      status: "archived",
      eventLog: [...s.eventLog, { type: "session_archived", at: new Date().toISOString() }],
    }));
  }

  // ── HTTP fetch handler ──────────────────────────────────────────────────

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/create" && request.method === "POST") return this.handleCreate(request);
    if (path === "/state" && request.method === "GET") return this.handleState();
    if (path === "/close" && request.method === "POST") return this.handleClose(request);
    if (path === "/ws" && request.headers.get("Upgrade") === "websocket") return this.handleWsUpgrade(request, url);
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // ── /create ─────────────────────────────────────────────────────────────

  private async handleCreate(request: Request): Promise<Response> {
    let body: { sessionId?: unknown; code?: unknown; scenarioId?: unknown; hostOperatorId?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (typeof body.sessionId !== "string" || typeof body.code !== "string" ||
        typeof body.scenarioId !== "string" || typeof body.hostOperatorId !== "string") {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await this.loadState();
    if (existing) return Response.json({ error: "Session already exists" }, { status: 409 });

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    const state: LiveTtxSessionState = {
      sessionId: body.sessionId,
      code: body.code,
      scenarioId: body.scenarioId,
      hostOperatorId: body.hostOperatorId,
      status: "lobby",
      currentNodeId: null,
      participants: [],
      votes: [],
      eventLog: [{ type: "session_created", at: now, by: body.hostOperatorId, scenarioId: body.scenarioId }],
      createdAt: now,
      expiresAt,
    };

    await this.saveState(state);
    await this.ctx.storage.setAlarm(Date.now() + SESSION_TTL_MS);

    return Response.json({ ok: true, state: toPublic(state) }, { status: 201 });
  }

  // ── /state ──────────────────────────────────────────────────────────────

  private async handleState(): Promise<Response> {
    const state = await this.loadState();
    if (!state) return Response.json({ error: "Session not found" }, { status: 404 });
    return Response.json({ state: toPublic(state) });
  }

  // ── /close ──────────────────────────────────────────────────────────────

  private async handleClose(request: Request): Promise<Response> {
    let body: { action?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }
    const action = body.action === "archive" ? "archive" : "complete";
    const state = await this.loadState();
    if (!state) return Response.json({ error: "Session not found" }, { status: 404 });

    if (action === "archive" || state.status === "completed") {
      const next = await this.mutate((s) => ({
        ...s,
        status: "archived",
        eventLog: [...s.eventLog, { type: "session_archived", at: new Date().toISOString() }],
      }));
      return Response.json({ ok: true, state: toPublic(next) });
    }

    return Response.json({ error: "Session not in a closeable state", status: state.status }, { status: 409 });
  }

  // ── WebSocket upgrade ───────────────────────────────────────────────────

  private async handleWsUpgrade(_request: Request, url: URL): Promise<Response> {
    const token = url.searchParams.get("token");
    const secret = this.env.LIVE_SESSION_SECRET;

    if (!secret) {
      return Response.json({ error: "Live sessions not configured" }, { status: 503 });
    }
    if (!token) {
      return Response.json({ error: "Missing join token" }, { status: 400 });
    }

    const verified = await verifyToken(token, secret);
    if (!verified.ok) {
      return Response.json({ error: `Invalid join token: ${verified.error}` }, { status: 403 });
    }

    const payload = verified.payload as Partial<LiveJoinTokenPayload>;
    if (payload.type !== "live_join" || typeof payload.sub !== "string") {
      return Response.json({ error: "Wrong token type" }, { status: 403 });
    }

    const state = await this.loadState();
    if (!state) return Response.json({ error: "Session not found" }, { status: 404 });
    if (state.status === "archived") {
      return Response.json({ error: "Session has ended" }, { status: 410 });
    }

    const participantId = payload.sub;
    const displayName = payload.displayName ?? "Unknown";
    const assignedRole = payload.assignedRole ?? "Observer";
    const isHost = payload.isHost === true;
    const isObserver = payload.isObserver === true || assignedRole === "Observer";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server, [participantId]);

    // Upsert participant record (handles reconnects gracefully).
    await this.mutate((s) => {
      const existing = s.participants.find((p) => p.id === participantId);
      const now = new Date().toISOString();
      const updated: LiveParticipant = existing
        ? { ...existing, connected: true, lastSeenAt: now }
        : {
            id: participantId,
            name: displayName,
            role: assignedRole,
            isHost,
            isObserver,
            connected: true,
            joinedAt: now,
            lastSeenAt: now,
          };
      const participants = existing
        ? s.participants.map((p) => (p.id === participantId ? updated : p))
        : [...s.participants, updated];

      const newEvent: LiveEvent = {
        type: "participant_joined",
        at: now,
        participantId,
        name: displayName,
        role: assignedRole,
      };

      return { ...s, participants, eventLog: [...s.eventLog, newEvent] };
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── WebSocket message handler ───────────────────────────────────────────

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
    if (raw.length > MAX_WS_MSG_BYTES) {
      this.send(ws, { type: "error", code: "msg_too_large", message: "Message too large" });
      return;
    }

    const tags = this.ctx.getTags(ws);
    const participantId = tags[0] ?? "unknown";

    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      this.send(ws, { type: "error", code: "bad_json", message: "Invalid JSON" });
      return;
    }

    const state = await this.loadState();
    if (!state) return;

    const participant = state.participants.find((p) => p.id === participantId);

    switch (msg.type) {
      case "host.start":
        if (!participant?.isHost) {
          this.send(ws, { type: "error", code: "unauthorized", message: "Only the host can start the session" });
          return;
        }
        await this.doStart(state);
        break;

      case "host.advance":
        if (!participant?.isHost) {
          this.send(ws, { type: "error", code: "unauthorized", message: "Only the host can advance" });
          return;
        }
        await this.doAdvance(state, msg.selectedChoiceKey);
        break;

      case "host.lock":
        if (!participant?.isHost) {
          this.send(ws, { type: "error", code: "unauthorized", message: "Only the host can lock votes" });
          return;
        }
        if (state.status !== "node_open") {
          this.send(ws, { type: "error", code: "bad_state", message: "Not in node_open state" });
          return;
        }
        await this.mutate((s) => ({ ...s, status: "node_locked" }));
        break;

      case "host.override":
        if (!participant?.isHost) {
          this.send(ws, { type: "error", code: "unauthorized", message: "Only the host can override" });
          return;
        }
        if (!msg.reason || msg.reason.trim().length === 0) {
          this.send(ws, { type: "error", code: "reason_required", message: "Override requires a reason" });
          return;
        }
        await this.doOverride(state, msg.nodeId, msg.choiceKey, msg.reason.trim());
        break;

      case "vote.cast":
        await this.doCastVote(ws, state, participant, participantId, msg.nodeId, msg.choiceKey, msg.rationale);
        break;

      case "chat.send": {
        const text = (msg.text ?? "").slice(0, MAX_CHAT_LENGTH).trim();
        if (!text) return;
        const at = new Date().toISOString();
        const name = participant?.name ?? "Unknown";
        await this.mutate((s) => ({
          ...s,
          eventLog: [...s.eventLog, { type: "chat", at, participantId, name, text }],
        }));
        break;
      }

      case "presence.ping":
        await this.mutate((s) => ({
          ...s,
          participants: s.participants.map((p) =>
            p.id === participantId ? { ...p, lastSeenAt: new Date().toISOString() } : p
          ),
        }));
        this.send(ws, { type: "pong" });
        break;
    }
  }

  // ── WebSocket close handler ─────────────────────────────────────────────

  override async webSocketClose(ws: WebSocket): Promise<void> {
    const tags = this.ctx.getTags(ws);
    const participantId = tags[0] ?? "unknown";
    const state = await this.loadState();
    if (!state) return;

    await this.mutate((s) => ({
      ...s,
      participants: s.participants.map((p) =>
        p.id === participantId ? { ...p, connected: false, lastSeenAt: new Date().toISOString() } : p
      ),
      eventLog: [
        ...s.eventLog,
        { type: "participant_left", at: new Date().toISOString(), participantId },
      ],
    }));
  }

  // ── State machine actions ───────────────────────────────────────────────

  private async doStart(state: LiveTtxSessionState): Promise<void> {
    if (state.status !== "lobby") return;

    const scenario = await getScenarioById(this.env.TTX_STATE, state.scenarioId);
    if (!scenario) {
      this.broadcast({ type: "error", code: "scenario_not_found", message: "Scenario not found" });
      return;
    }

    const entry = entryNode(scenario);
    const at = new Date().toISOString();

    await this.mutate((s) => ({
      ...s,
      status: "node_open",
      currentNodeId: entry.id,
      eventLog: [
        ...s.eventLog,
        {
          type: "node_opened",
          at,
          nodeId: entry.id,
          title: entry.title,
          inject: entry.inject,
          role: entry.role,
          choices: entry.transitions.map((t) => ({ choice: t.choice, label: t.label })),
        },
      ],
    }));

    // Analytics: record session start (fail-soft — never throws into the DO).
    try {
      await recordAnalyticsStart(this.env.TTX_STATE, state.sessionId, scenario, entry.id);
    } catch {
      // Intentionally swallowed — analytics is best-effort.
    }
  }

  private async doAdvance(state: LiveTtxSessionState, selectedChoiceKey: string | undefined): Promise<void> {
    if (state.status !== "node_open" && state.status !== "node_locked") return;
    if (!state.currentNodeId) return;

    const scenario = await getScenarioById(this.env.TTX_STATE, state.scenarioId);
    if (!scenario) {
      this.broadcast({ type: "error", code: "scenario_not_found", message: "Scenario not found" });
      return;
    }

    // If no explicit choice, pick the winning vote or the only transition.
    const choiceKey = selectedChoiceKey ?? pickVoteWinner(state) ?? undefined;
    const result = step(scenario, state.currentNodeId, choiceKey);

    if (result.status === "error") {
      this.broadcast({ type: "error", code: "advance_error", message: result.message });
      return;
    }

    const fromNodeId = state.currentNodeId;
    const at = new Date().toISOString();

    if (result.status === "done") {
      const finalScore = await this.finalize(state, fromNodeId, choiceKey ?? "default");
      await this.mutate((s) => ({
        ...s,
        status: "completed",
        currentNodeId: null,
        votes: [],
        eventLog: [
          ...s.eventLog,
          { type: "session_completed", at, finalScore },
        ],
      }));
      return;
    }

    const nextNode = result.node;
    const resolvedChoice = choiceKey ?? scenario.nodes[fromNodeId]?.transitions[0]?.choice ?? "default";

    await this.mutate((s) => ({
      ...s,
      status: "node_open",
      currentNodeId: nextNode.id,
      votes: [],
      eventLog: [
        ...s.eventLog,
        { type: "node_advanced", at, fromNodeId, toNodeId: nextNode.id, choiceKey: resolvedChoice },
        {
          type: "node_opened",
          at,
          nodeId: nextNode.id,
          title: nextNode.title,
          inject: nextNode.inject,
          role: nextNode.role,
          choices: nextNode.transitions.map((t) => ({ choice: t.choice, label: t.label })),
        },
      ],
    }));

    // Analytics transition (fail-soft).
    try {
      await recordAnalyticsTransition(
        this.env.TTX_STATE, state.sessionId, fromNodeId, nextNode.id, resolvedChoice, nextNode.role
      );
      if (nextNode.transitions.length === 0) {
        await recordAnalyticsFinalize(this.env.TTX_STATE, state.sessionId, nextNode.id);
      }
    } catch {
      // Swallowed.
    }
  }

  private async doOverride(
    state: LiveTtxSessionState,
    nodeId: string,
    choiceKey: string,
    reason: string,
  ): Promise<void> {
    if (state.currentNodeId !== nodeId) return;

    // Log the override, then advance using the overridden choice.
    await this.mutate((s) => ({
      ...s,
      eventLog: [
        ...s.eventLog,
        { type: "host_override", at: new Date().toISOString(), nodeId, choiceKey, reason },
      ],
    }));

    const fresh = await this.loadState();
    if (fresh) await this.doAdvance(fresh, choiceKey);
  }

  private async doCastVote(
    ws: WebSocket,
    state: LiveTtxSessionState,
    participant: LiveParticipant | undefined,
    participantId: string,
    nodeId: string,
    choiceKey: string,
    rationale: string | undefined,
  ): Promise<void> {
    if (!participant) {
      this.send(ws, { type: "error", code: "not_joined", message: "Participant not found" });
      return;
    }
    if (participant.isObserver) {
      this.send(ws, { type: "error", code: "observer", message: "Observers may not vote" });
      return;
    }
    if (state.status !== "node_open") {
      this.send(ws, { type: "error", code: "bad_state", message: "Voting is not open" });
      return;
    }
    if (state.currentNodeId !== nodeId) {
      this.send(ws, { type: "error", code: "wrong_node", message: "Vote is for a different node" });
      return;
    }

    const at = new Date().toISOString();
    await this.mutate((s) => {
      const prevVote = s.votes.find((v) => v.participantId === participantId && v.nodeId === nodeId);
      const vote = {
        nodeId,
        participantId,
        role: participant.role,
        choiceKey,
        rationale: rationale?.slice(0, 500),
        castAt: at,
      };
      const votes = prevVote
        ? s.votes.map((v) => (v.participantId === participantId && v.nodeId === nodeId ? vote : v))
        : [...s.votes, vote];
      return {
        ...s,
        votes,
        eventLog: [
          ...s.eventLog,
          { type: "vote_cast", at, nodeId, participantId, role: participant.role, choiceKey, rationale },
        ],
      };
    });
  }

  // ── Scoring & analytics finalize ────────────────────────────────────────

  private async finalize(state: LiveTtxSessionState, terminalNodeId: string, finalChoiceKey: string): Promise<number | null> {
    try {
      await recordAnalyticsTransition(
        this.env.TTX_STATE, state.sessionId,
        state.currentNodeId ?? terminalNodeId, terminalNodeId, finalChoiceKey, undefined,
      );
      await recordAnalyticsFinalize(this.env.TTX_STATE, state.sessionId, terminalNodeId);
    } catch {
      // Swallowed.
    }

    try {
      const scenario = await getScenarioById(this.env.TTX_STATE, state.scenarioId);
      if (!scenario) return null;

      // Build transition list from event log for scoring.
      const transitions = state.eventLog
        .filter((e): e is Extract<LiveEvent, { type: "node_advanced" }> => e.type === "node_advanced")
        .map((e) => ({ choice: e.choiceKey }));
      // Include the final advance being made right now.
      transitions.push({ choice: finalChoiceKey });

      const computed = computeScore(transitions, scenario);
      const packet: ScorePacket = {
        sessionId: state.sessionId,
        scenarioId: state.scenarioId,
        computedAt: new Date().toISOString(),
        ...computed,
      };

      await this.env.TTX_STATE.put(
        `${SCORE_PREFIX}${state.sessionId}`,
        JSON.stringify(packet),
        { expirationTtl: SCORE_TTL_SECONDS },
      );

      return packet.score;
    } catch {
      return null;
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toPublic(state: LiveTtxSessionState): PublicLiveTtxState {
  const { hostOperatorId: _omit, ...rest } = state;
  void _omit;
  return rest;
}

// Simple plurality — the choice with the most votes wins. Ties go to the
// first in insertion order (deterministic for a given vote set).
function pickVoteWinner(state: LiveTtxSessionState): string | null {
  if (state.votes.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of state.votes) {
    counts.set(v.choiceKey, (counts.get(v.choiceKey) ?? 0) + 1);
  }
  let winner = "";
  let max = 0;
  for (const [key, count] of counts) {
    if (count > max) { max = count; winner = key; }
  }
  return winner || null;
}
