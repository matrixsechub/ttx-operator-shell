import { DurableObject } from "cloudflare:workers";
import type { FlywheelCommand, FlywheelEvent, FlywheelEvidence, FlywheelMetric, FlywheelRun, FlywheelRunDetail, FlywheelStageExecution } from "../../shared/flywheel/contracts";
import { STAGE_BY_ID } from "../../shared/flywheel/stages";
import { expectedStageTarget } from "./commandParser";
import { DeterministicMockAdapter } from "./adapters";
import { buildFlywheelEvent, mirrorFlywheelEvent } from "./telemetry";
import { buildQueuedNextCycle } from "./cycle";
import { resolveIdempotency } from "./idempotency";

interface FlywheelDoEnv { TTX_STATE: KVNamespace; FLYWHEEL_TENANT_ID?: string }
interface StoredCommand { command: FlywheelCommand; runId: string; digest: string; state: "awaiting_approval" | "completed" | "denied"; proposalId?: string; response: Record<string, unknown> }

function rowValue<T>(cursor: { toArray(): Record<string, unknown>[] }, field = "payload"): T | null {
  const row = cursor.toArray()[0];
  if (!row || typeof row[field] !== "string") return null;
  return JSON.parse(row[field] as string) as T;
}
async function digest(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class FlywheelDO extends DurableObject<FlywheelDoEnv> {
  private schemaReady = false;
  private ensureSchema(): void {
    if (this.schemaReady) return;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS executions (execution_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS commands (command_id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, digest TEXT NOT NULL, run_id TEXT NOT NULL, state TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (event_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS metrics (event_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS evidence (evidence_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);
    `);
    this.schemaReady = true;
  }
  private saveRun(run: FlywheelRun): void { this.ctx.storage.sql.exec("INSERT OR REPLACE INTO runs (id, tenant_id, created_at, payload) VALUES (?, ?, ?, ?)", run.id, run.tenantId, run.createdAt, JSON.stringify(run)); }
  private getRun(runId: string): FlywheelRun | null { return rowValue<FlywheelRun>(this.ctx.storage.sql.exec("SELECT payload FROM runs WHERE id = ?", runId)); }
  private async emit(event: FlywheelEvent): Promise<void> {
    this.ctx.storage.sql.exec("INSERT OR REPLACE INTO events (event_id, run_id, created_at, payload) VALUES (?, ?, ?, ?)", event.eventId, event.runId, event.timestamp, JSON.stringify(event));
    await mirrorFlywheelEvent(this.env, event);
  }
  private listPayloads<T>(table: string, runId: string): T[] {
    return this.ctx.storage.sql.exec(`SELECT payload FROM ${table} WHERE run_id = ? ORDER BY created_at ASC`, runId).toArray().map((row) => JSON.parse(String(row.payload)) as T);
  }
  private detail(run: FlywheelRun): FlywheelRunDetail {
    return { run, executions: this.listPayloads<FlywheelStageExecution>("executions", run.id), metrics: this.listPayloads<FlywheelMetric>("metrics", run.id), evidence: this.listPayloads<FlywheelEvidence>("evidence", run.id), events: this.listPayloads<FlywheelEvent>("events", run.id), governance: { beaconActive: true, approvalState: run.state === "awaiting_approval" ? "required" : run.approvalReceiptId ? "approved" : "not_required", safeMode: run.state === "safe_mode" } };
  }
  private async execute(stored: StoredCommand, approvalId?: string): Promise<Record<string, unknown>> {
    const run = this.getRun(stored.runId);
    if (!run) return { ok: false, code: "RUN_NOT_FOUND" };
    const command = stored.command;
    const now = new Date().toISOString();
    if (command.category === "PAUSE") {
      if (command.parameter === "LOWER_AUTONOMY") run.autonomyLevel = Math.max(0, run.autonomyLevel - 1) as 0 | 1 | 2;
      else run.state = "paused";
    } else if (command.category === "RESUME") {
      run.state = "running";
    } else if (command.category === "TERMINATE") {
      run.state = "completed"; run.completedAt = now; run.terminationReason = "operator_terminated";
    } else if (command.category === "REQUEST_EVIDENCE" || command.category === "ANALYZE") {
      run.state = run.state === "awaiting_approval" ? "queued" : run.state;
    } else {
      const target = expectedStageTarget(run.currentStage);
      if (command.target !== target) return { ok: false, code: "GOVERNANCE_INVALID_TRANSITION" };
      const started = Date.now();
      const adapter = new DeterministicMockAdapter(run.currentStage);
      const output = await adapter.execute({ runId: run.id, missionId: run.missionId, tenantId: run.tenantId, stageId: run.currentStage, traceId: command.traceId, idempotencyKey: command.idempotencyKey, input: command.payload });
      const execution: FlywheelStageExecution = { executionId: crypto.randomUUID(), runId: run.id, stageId: run.currentStage, inputArtifactRefs: [], outputArtifactRefs: output.artifactRefs, state: "completed", retryCount: 0, maxRetries: 3, startedAt: new Date(started).toISOString(), completedAt: now, latencyMs: Date.now() - started, evidenceRefs: output.evidenceRefs, operatorDecision: approvalId ? "approved" : "not_required" };
      this.ctx.storage.sql.exec("INSERT INTO executions (execution_id, run_id, created_at, payload) VALUES (?, ?, ?, ?)", execution.executionId, run.id, now, JSON.stringify(execution));
      for (const evidenceRef of output.evidenceRefs) {
        const evidence: FlywheelEvidence = { evidenceId: crypto.randomUUID(), runId: run.id, stageId: run.currentStage, artifactRef: output.artifactRefs[0] ?? evidenceRef, sha256: evidenceRef.replace(/^sha256:/, ""), attachedAt: now, attachedBy: "deterministic-mock-adapter" };
        this.ctx.storage.sql.exec("INSERT INTO evidence (evidence_id, run_id, created_at, payload) VALUES (?, ?, ?, ?)", evidence.evidenceId, run.id, now, JSON.stringify(evidence));
      }
      for (const [metricName, metricValue] of Object.entries(output.metrics)) {
        const metric: FlywheelMetric = { eventId: crypto.randomUUID(), runId: run.id, stageId: run.currentStage, metricName, metricValue, unit: "count", status: "unknown", timestamp: now, traceId: command.traceId };
        this.ctx.storage.sql.exec("INSERT INTO metrics (event_id, run_id, created_at, payload) VALUES (?, ?, ?, ?)", metric.eventId, run.id, now, JSON.stringify(metric));
      }
      const stage = STAGE_BY_ID[run.currentStage];
      const materialTransition = Number(command.actionClass.slice(1)) >= 2;
      if (!materialTransition) {
        run.state = "queued";
      } else if (run.currentStage === "continuous_improvement") {
        const next = buildQueuedNextCycle(run, now, crypto.randomUUID());
        this.saveRun(next); run.state = "completed"; run.completedAt = now; run.nextCycleRunId = next.id;
        await this.emit(buildFlywheelEvent({ eventType: "flywheel.cycle.proposed", tenantId: run.tenantId, missionId: run.missionId, runId: run.id, stageId: run.currentStage, traceId: command.traceId, actorType: "system", actorId: "flywheel-engine", governanceDecision: "approved", metadata: { nextCycleRunId: next.id } }));
      } else { run.currentStage = stage.nextStage; run.state = "queued"; }
    }
    run.updatedAt = now;
    if (approvalId) run.approvalReceiptId = approvalId;
    this.saveRun(run);
    const eventType = command.category === "TERMINATE" ? "flywheel.run.terminated" : command.category === "PAUSE" ? "flywheel.run.paused" : command.category === "RESUME" ? "flywheel.run.resumed" : command.category === "REQUEST_EVIDENCE" ? "flywheel.evidence.requested" : "flywheel.command.accepted";
    await this.emit(buildFlywheelEvent({ eventType, tenantId: run.tenantId, missionId: run.missionId, runId: run.id, stageId: run.currentStage, traceId: command.traceId, actorType: "operator", actorId: command.requestedBy, governanceDecision: approvalId ? "approved" : "allowed", metadata: { commandId: command.commandId, category: command.category } }));
    const response = { commandId: command.commandId, state: "completed", run: this.detail(run) };
    const updated: StoredCommand = { ...stored, state: "completed", response };
    this.ctx.storage.sql.exec("UPDATE commands SET state = ?, payload = ? WHERE command_id = ?", updated.state, JSON.stringify(updated), command.commandId);
    return response;
  }
  async fetch(request: Request): Promise<Response> {
    this.ensureSchema();
    const url = new URL(request.url);
    const body = request.method === "GET" ? {} : await request.json() as Record<string, unknown>;
    if (url.pathname === "/runs" && request.method === "GET") {
      const runs = this.ctx.storage.sql.exec("SELECT payload FROM runs ORDER BY created_at DESC").toArray().map((row) => JSON.parse(String(row.payload)) as FlywheelRun);
      return Response.json({ runs });
    }
    if (url.pathname === "/runs" && request.method === "POST") {
      const existing = rowValue<FlywheelRun>(this.ctx.storage.sql.exec("SELECT payload FROM runs WHERE tenant_id = ? AND json_extract(payload, '$.idempotencyKey') = ?", body.tenantId, body.idempotencyKey));
      if (existing) return Response.json({ run: existing, replay: true });
      const run = body.run as unknown as FlywheelRun; this.saveRun(run);
      await this.emit(buildFlywheelEvent({ eventType: "flywheel.run.created", tenantId: run.tenantId, missionId: run.missionId, runId: run.id, stageId: run.currentStage, traceId: run.traceId, actorType: "operator", actorId: "operator", governanceDecision: "allowed", metadata: {} }));
      return Response.json({ run, replay: false }, { status: 201 });
    }
    const runMatch = url.pathname.match(/^\/runs\/([^/]+)$/);
    if (runMatch && request.method === "GET") { const run = this.getRun(runMatch[1]); return run ? Response.json(this.detail(run)) : Response.json({ code: "RUN_NOT_FOUND" }, { status: 404 }); }
    if (url.pathname === "/commands" && request.method === "POST") {
      const command = body.command as unknown as FlywheelCommand; const commandDigest = await digest(command);
      const existing = rowValue<StoredCommand>(this.ctx.storage.sql.exec("SELECT payload FROM commands WHERE idempotency_key = ?", command.idempotencyKey));
      const idempotency = resolveIdempotency(existing, commandDigest);
      if (idempotency.kind === "replay") return Response.json({ ...idempotency.response, replay: true });
      if (idempotency.kind === "conflict") return Response.json({ code: idempotency.code }, { status: 409 });
      const awaiting = Boolean(body.approvalRequired);
      const stored: StoredCommand = { command, runId: String(body.runId), digest: commandDigest, state: awaiting ? "awaiting_approval" : "completed", proposalId: typeof body.proposalId === "string" ? body.proposalId : undefined, response: awaiting ? { commandId: command.commandId, proposalId: body.proposalId, state: "awaiting_approval" } : {} };
      this.ctx.storage.sql.exec("INSERT INTO commands (command_id, idempotency_key, digest, run_id, state, payload) VALUES (?, ?, ?, ?, ?, ?)", command.commandId, command.idempotencyKey, commandDigest, stored.runId, stored.state, JSON.stringify(stored));
      if (awaiting) { const run = this.getRun(stored.runId); if (run) { run.state = "awaiting_approval"; run.updatedAt = new Date().toISOString(); this.saveRun(run); } return Response.json(stored.response, { status: 202 }); }
      return Response.json(await this.execute(stored));
    }
    const commandMatch = url.pathname.match(/^\/commands\/([^/]+)$/);
    if (commandMatch && request.method === "GET") {
      const stored = rowValue<StoredCommand>(this.ctx.storage.sql.exec("SELECT payload FROM commands WHERE command_id = ?", commandMatch[1]));
      return stored ? Response.json(stored) : Response.json({ code: "COMMAND_NOT_FOUND" }, { status: 404 });
    }
    if (url.pathname === "/approve" && request.method === "POST") {
      const stored = rowValue<StoredCommand>(this.ctx.storage.sql.exec("SELECT payload FROM commands WHERE command_id = ?", body.commandId));
      if (!stored) return Response.json({ code: "COMMAND_NOT_FOUND" }, { status: 404 });
      if (stored.proposalId !== body.proposalId) return Response.json({ code: "GOVERNANCE_SCOPE_MISMATCH" }, { status: 409 });
      if (stored.state === "completed") return Response.json({ ...stored.response, replay: true });
      return Response.json(await this.execute(stored, String(body.approvalId)));
    }
    if (url.pathname === "/safe-mode" && request.method === "POST") {
      const run = this.getRun(String(body.runId)); if (!run) return Response.json({ code: "RUN_NOT_FOUND" }, { status: 404 });
      run.state = "safe_mode"; run.updatedAt = new Date().toISOString(); this.saveRun(run);
      await this.emit(buildFlywheelEvent({ eventType: "flywheel.safe_mode.entered", tenantId: run.tenantId, missionId: run.missionId, runId: run.id, stageId: run.currentStage, traceId: String(body.traceId), actorType: "operator", actorId: String(body.actorId), governanceDecision: "allowed", metadata: { reason: body.reason } }));
      return Response.json({ run: this.detail(run) });
    }
    if (url.pathname.endsWith("/events") && request.method === "GET") { const runId = url.pathname.split("/")[2]; return Response.json({ events: this.listPayloads<FlywheelEvent>("events", runId) }); }
    return Response.json({ code: "FLYWHEEL_DO_ROUTE_NOT_FOUND" }, { status: 404 });
  }
}
