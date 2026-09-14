/**
 * Fixture data for PEARL Chat + Integrations UI layer (read-only / simulation-only).
 */

import { ROOM_IDENTITY } from "../room-identity.js";
import { operatorFullWristband, architectAuditorNarrowWristband } from "../wristband-presentation.js";

export const CHAT_ROOMS = Object.freeze(
  Object.values(ROOM_IDENTITY).map((r) => ({
    ...r,
    context:
      r.id === "operator"
        ? "isolated"
        : r.id === "council"
          ? "council"
          : "shared",
    beacon:
      r.id === "security"
        ? "BLOCKED"
        : r.id === "council" || r.id === "factory" || r.id === "marketplace-ops"
          ? "HOLD"
          : "PASS",
    unread: r.id === "marketplace-ops" ? 3 : r.id === "factory" ? 1 : 0,
    pending: r.id === "marketplace-ops" || r.id === "council" || r.id === "factory" ? 1 : 0,
    purpose:
      r.id === "operator"
        ? "Operator intake and routing"
        : r.id === "council"
          ? "Advisory deliberation"
          : r.id === "factory"
            ? "Build / prepare simulation"
            : r.id === "security"
              ? "Security review · fail-closed"
              : r.id === "marketplace-ops"
                ? "Marketplace evaluation"
                : r.id === "school-pilot"
                  ? "School pilot guide"
                  : r.id === "architecture"
                    ? "Mission architecture"
                    : "Evidence / audit review",
  }))
);

export const CHAT_AGENTS = Object.freeze([
  { id: "architect", name: "MISSION_ARCHITECT", role: "Architect", room: "architecture", state: "ONLINE", provider: "fixture", model: "sim-a", grantsAuthority: false },
  { id: "builder", name: "BUILDER", role: "Builder", room: "factory", state: "WAITING", provider: "fixture", model: "sim-b", grantsAuthority: false },
  { id: "auditor", name: "AUDITOR", role: "Auditor", room: "audit", state: "ONLINE", provider: "fixture", model: "sim-c", grantsAuthority: false },
  { id: "recon", name: "RECON", role: "Recon", room: "security", state: "BLOCKED", provider: "fixture", model: "sim-d", grantsAuthority: false },
  { id: "planning", name: "PLANNING", role: "Planning", room: "marketplace-ops", state: "WAITING", provider: "fixture", model: "sim-e", grantsAuthority: false },
  { id: "security", name: "SECURITY_SENTINEL", role: "Security", room: "security", state: "NEEDS_APPROVAL", provider: "fixture", model: "sim-f", grantsAuthority: false },
  { id: "scout", name: "MARKETPLACE_SCOUT", role: "Scout", room: "marketplace-ops", state: "COMPLETE", provider: "fixture", model: "sim-g", grantsAuthority: false },
  { id: "school", name: "SCHOOL_PILOT_GUIDE", role: "Guide", room: "school-pilot", state: "WAITING", provider: "disabled", model: "—", grantsAuthority: false },
]);

export const CHAT_MESSAGES = Object.freeze({
  "marketplace-ops": [
    { id: "m1", kind: "human", text: "@MarketplaceOps evaluate this opportunity and have @Security check the external-data source", ts: "09:12" },
    { id: "m2", kind: "agent", agentId: "scout", text: "Running a read-class market scan.", ts: "09:12" },
    {
      id: "m3",
      kind: "tool",
      title: "Tool call",
      cls: "read",
      name: "market.scan",
      source: "marketplace-mcp",
      beacon: "PASS",
      approval: false,
      status: "auto",
      credits: { est: 2, cls: "read", ref: "cap:market.scan" },
      grantsAuthority: false,
    },
    { id: "m4", kind: "receipt", receiptId: "rcpt-0912-01", subject: "market.scan", beacon: "PASS", credits: { actual: 2, cls: "read", charged: true, ref: "cap:market.scan" } },
    { id: "m5", kind: "agent", agentId: "security", text: "I will call the external-data source now.", intentMarked: true, ts: "09:13" },
    {
      id: "m6",
      kind: "tool",
      title: "Tool request",
      cls: "external-action",
      name: "ext.data.fetch",
      source: "browser-mcp",
      beacon: "HOLD",
      approval: true,
      status: "pending",
      pendingId: "PA-0912-07",
      policyRef: "POL-EXT-01",
      credits: { est: 8, cls: "external-action", ref: "cap:ext.data.fetch" },
      grantsAuthority: false,
    },
  ],
  security: [
    { id: "s1", kind: "agent", agentId: "recon", text: "I will run the external scan now.", intentMarked: true, ts: "10:01" },
    {
      id: "s2",
      kind: "tool",
      title: "Tool request",
      cls: "external-action",
      name: "recon.external_scan",
      source: "recon-mcp",
      beacon: "BLOCKED",
      approval: true,
      status: "blocked",
      reason: "allow-list · secret missing",
      grantsAuthority: false,
    },
    { id: "s3", kind: "receipt", receiptId: "rcpt-denial-01", subject: "recon.external_scan", beacon: "BLOCKED", credits: { charged: false, cls: "external-action" } },
  ],
  factory: [
    {
      id: "f1",
      kind: "tool",
      title: "Tool request",
      cls: "write",
      name: "build.write_artifact",
      source: "factory-mcp",
      beacon: "PASS",
      approval: true,
      status: "approved",
      pendingId: "APR-2294",
      credits: { est: 5, actual: 5, cls: "write", charged: true },
      grantsAuthority: false,
    },
    { id: "f2", kind: "exec", label: "EXECUTION — SIMULATED ONLY", state: "Complete" },
    { id: "f3", kind: "receipt", receiptId: "rcpt-2294", subject: "build.write_artifact", beacon: "PASS", credits: { actual: 5, cls: "write", charged: true } },
    {
      id: "f4",
      kind: "tool",
      title: "Tool request",
      cls: "consequential",
      name: "build.prepare",
      source: "factory-mcp",
      beacon: "HOLD",
      approval: true,
      status: "pending",
      pendingId: "PA-GATE-01",
      note: "CHAMBER_FACTORY_GATE_ENABLED=false",
      credits: { est: 12, cls: "consequential" },
      grantsAuthority: false,
    },
  ],
  operator: [
    { id: "o1", kind: "human", text: "Route intake packet to Architecture.", ts: "08:00" },
    { id: "o2", kind: "system", text: "Routed · Architecture — routing is a message, not an action." },
    { id: "o3", kind: "denied", text: "Unknown room event · BLOCKED · fail-closed", roomId: "not-a-room" },
  ],
});

export const CHAT_WRISTBANDS = Object.freeze({
  full: operatorFullWristband(),
  narrow: architectAuditorNarrowWristband(),
});

export const INTEGRATIONS_FIXTURES = Object.freeze({
  providers: [
    { id: "anthropic", name: "Anthropic", health: "Connected", enabled: true, beacon: "PASS", safeMode: false, models: 4, lastCheck: "2m", p50: "180ms", failures: 0 },
    { id: "openai", name: "OpenAI", health: "Degraded", enabled: true, beacon: "HOLD", safeMode: false, models: 6, lastCheck: "5m", p50: "420ms", failures: 3 },
    { id: "voyage", name: "Voyage", health: "Blocked", enabled: true, beacon: "BLOCKED", safeMode: false, models: 2, lastCheck: "1h", p50: "—", failures: 12 },
    { id: "gemini", name: "Gemini", health: "Disabled", enabled: false, beacon: "PASS", safeMode: false, models: 3, lastCheck: "—", p50: "—", failures: 0 },
  ],
  mcp: [
    { id: "github-mcp", name: "GitHub MCP", health: "Connected", enabled: true, beacon: "PASS", safeMode: false, tools: 12, grantsAuthority: false },
    { id: "slack-mcp", name: "Slack MCP", health: "Degraded", enabled: true, beacon: "HOLD", safeMode: false, tools: 8, grantsAuthority: false },
    { id: "filesystem-mcp", name: "Filesystem MCP", health: "Connected", enabled: true, beacon: "PASS", safeMode: true, tools: 5, grantsAuthority: false },
    { id: "browser-mcp", name: "Browser MCP", health: "Blocked", enabled: true, beacon: "BLOCKED", safeMode: false, tools: 4, grantsAuthority: false },
    { id: "postgres-mcp", name: "Postgres MCP", health: "Disabled", enabled: false, beacon: "HOLD", safeMode: false, tools: 6, grantsAuthority: false },
  ],
  secrets: [
    { name: "ANTHROPIC_API_KEY", state: "configured", storage: "ref-only" },
    { name: "OPENAI_API_KEY", state: "rotation-needed", storage: "ref-only" },
    { name: "VOYAGE_API_KEY", state: "missing", storage: "ref-only" },
    { name: "SLACK_BOT_TOKEN", state: "expired", storage: "ref-only" },
  ],
  disclosure: "Fixture data · no runtime · dispositions are fixtures · grantsAuthority:false",
});
