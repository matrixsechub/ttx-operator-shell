import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { OperatorShell } from "../../components/OperatorShell";
import {
  CHAT_AGENTS,
  CHAT_MESSAGES,
  CHAT_ROOMS,
  CHAT_WRISTBANDS,
  NON_EQUIVALENCES,
  bandState,
  canSimulatePending,
  decisionRowForRequest,
  detectIntentMarker,
  formatCreditsDisplay,
  requestOutcomeAfterDecision,
} from "../../pearl/chatIntegrations/index.js";
import "../../styles/pearl-chat-integrations.css";

type BandMode = "full" | "narrow";
type SimDecision = "approve" | "deny" | "inspect";

type TimelineRow = {
  kind: string;
  text?: string;
  agentId?: string;
  title?: string;
  name?: string;
  cls?: string;
  source?: string;
  beacon?: string;
  status?: string;
  pendingId?: string;
  policyRef?: string;
  credits?: Record<string, unknown>;
  receiptId?: string;
  subject?: string;
  label?: string;
  state?: string;
  intentMarked?: boolean;
  approval?: boolean;
};

function Badge({
  tone,
  children,
}: {
  tone: "pass" | "hold" | "blocked" | "gold" | "neutral" | "signal";
  children: string;
}) {
  return <span className={`pearl-badge pearl-badge--${tone}`}>{children}</span>;
}

function dispositionTone(value: string): "pass" | "hold" | "blocked" {
  if (value === "PASS") return "pass";
  if (value === "HOLD") return "hold";
  return "blocked";
}

/** Authenticated PEARL Chat preview — fixtures/simulation only. */
export function PearlChatPage() {
  const [roomId, setRoomId] = useState("marketplace-ops");
  const [band, setBand] = useState<BandMode>("full");
  const [sideOpen, setSideOpen] = useState(true);
  const [composer, setComposer] = useState("");
  const [announce, setAnnounce] = useState("Fixtures only · no runtime authority");
  const [simLog, setSimLog] = useState("No simulation yet · APPROVE/DENY/INSPECT are local-only");

  const wristband = band === "narrow" ? CHAT_WRISTBANDS.narrow : CHAT_WRISTBANDS.full;
  const room = CHAT_ROOMS.find((entry: { id: string }) => entry.id === roomId) ?? null;
  const presentation = bandState(roomId, wristband, room?.beacon);
  const locked = presentation.state === "LOCKED" || presentation.state === "UNKNOWN";
  const rows: TimelineRow[] = locked
    ? [{ kind: "denied", text: `Room redacted · ${presentation.state} · wristband visibility only` }]
    : (((CHAT_MESSAGES as Record<string, TimelineRow[]>)[roomId]) ?? []);
  const agents = useMemo(
    () => CHAT_AGENTS.filter((agent: { room: string }) => agent.room === roomId),
    [roomId],
  );

  function onDecision(row: TimelineRow, decision: SimDecision) {
    const outcome = requestOutcomeAfterDecision(row, decision, false);
    setSimLog(
      [
        `decision=${decision}`,
        `status=${outcome.status}`,
        `beaconRow=${outcome.beaconRow || "—"}`,
        `exec=${outcome.exec ? "SIMULATED ONLY" : "no"}`,
        `factoryGate=${outcome.factoryGateNote || "disabled"}`,
        `charged=${outcome.charged === false ? "not charged" : outcome.charged === true ? "fixture charged" : "n/a"}`,
        "grantsAuthority=false",
      ].join(" · "),
    );
    setAnnounce(`Simulation ${decision} recorded. No runtime execution.`);
  }

  function onSend() {
    const text = composer.trim();
    if (!text || locked) return;
    const intent = detectIntentMarker({ kind: "agent", text, intentMarked: true });
    setAnnounce(
      intent
        ? "Send simulated · intent would be marked NOT AUTHORIZED · no authority created"
        : "Send simulated · fixture only",
    );
    setComposer("");
  }

  return (
    <OperatorShell>
      <div className="pearl-ci pearl-ci--embedded">
        <div className="pearl-ci-shell">
          <header className="pearl-ci-top" aria-label="PEARL chat preview chrome">
            <span className="brand">PEARL · CHAT</span>
            <Link to="/chat" aria-current="page">
              Chat
            </Link>
            <Link to="/settings/integrations">Settings · Integrations</Link>
            <span className="pearl-ci-credits" style={{ marginLeft: "auto" }}>
              grantsAuthority:false · gate:off · fixtures
            </span>
          </header>

          <div className={`pearl-ci-body${sideOpen ? " side-open" : ""}`}>
            <aside className="pearl-ci-rail" aria-label="Rooms">
              <div className="pearl-ci-band">
                <div
                  className="pearl-ci-band__strip"
                  data-state={presentation.state}
                  style={{
                    ["--band-colour" as string]: `var(--room-${presentation.identity?.colour || presentation.strip || "graphite"})`,
                  }}
                >
                  <span>{presentation.label}</span>
                  <span className="state">{presentation.text || presentation.state}</span>
                </div>
                <p className="pearl-ci-credits">
                  {wristband.label} · grantsAuthority:{String(wristband.grantsAuthority)}
                </p>
                <div className="pearl-ci-actions">
                  <button type="button" className="pearl-btn pearl-btn--ghost pearl-btn--xs" aria-pressed={band === "full"} onClick={() => setBand("full")}>
                    Full band
                  </button>
                  <button type="button" className="pearl-btn pearl-btn--ghost pearl-btn--xs" aria-pressed={band === "narrow"} onClick={() => setBand("narrow")}>
                    Narrow band
                  </button>
                  <button type="button" className="pearl-btn pearl-btn--ghost pearl-btn--xs" onClick={() => setSideOpen((value) => !value)}>
                    {sideOpen ? "Hide context" : "Context"}
                  </button>
                </div>
              </div>

              <div role="listbox" aria-label="Chat rooms" className="pearl-ci-room-list">
                {CHAT_ROOMS.map((entry: { id: string; name: string; colour: string; beacon: string; unread?: number; pending?: number }) => {
                  const item = bandState(entry.id, wristband, entry.beacon);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="option"
                      aria-selected={entry.id === roomId}
                      className={`pearl-ci-room${item.state === "LOCKED" ? " is-locked" : ""}`}
                      onClick={() => setRoomId(entry.id)}
                    >
                      <span className={`dot colour-${entry.colour}`} aria-hidden="true" />
                      <span>{entry.name}</span>
                      <span className="meta">
                        {item.state === "LOCKED" ? <span>locked</span> : null}
                        {item.state === "DENIED" ? <span>BLOCKED</span> : null}
                        {entry.unread ? <span>{entry.unread}</span> : null}
                        {entry.pending ? <span className="pending">◆ {entry.pending}</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="pearl-ci-main">
              <header className="page-head">
                <p className="pearl-ci-credits">CHAT · FIXTURE TIMELINE</p>
                <h1 tabIndex={-1}>{room?.name || "Unknown room"}</h1>
                <p>{room?.purpose || "Room identity colour ≠ disposition."}</p>
                <div className="pearl-ci-actions">
                  <Badge tone={dispositionTone(room?.beacon || "BLOCKED")}>{room?.beacon || "BLOCKED"}</Badge>
                  <Badge tone="neutral">{`CONTEXT · ${(room?.context || "shared").toUpperCase()}`}</Badge>
                </div>
              </header>

              <ol className="pearl-ci-timeline" aria-live="polite">
                {rows.map((row, index) => {
                  if (row.kind === "human") {
                    return (
                      <li key={index} className="pearl-ci-row" data-kind="human">
                        <Badge tone="neutral">HUMAN</Badge>
                        <p>{row.text}</p>
                      </li>
                    );
                  }
                  if (row.kind === "agent") {
                    const agent = CHAT_AGENTS.find((entry: { id: string }) => entry.id === row.agentId);
                    const intent = detectIntentMarker(row);
                    return (
                      <li key={index} className="pearl-ci-row" data-kind="agent">
                        <Badge tone="signal">AGENT</Badge>
                        <strong>{agent?.name || row.agentId || "agent"}</strong>
                        <span className="pearl-ci-credits">
                          {agent?.role || ""} · via {agent?.provider || "fixture"} · {agent?.model || "—"}
                        </span>
                        <p>{row.text || ""}</p>
                        {intent ? <span className="pearl-ci-intent">{intent.marker}</span> : null}
                      </li>
                    );
                  }
                  if (row.kind === "tool") {
                    const decision = decisionRowForRequest(row, canSimulatePending(wristband));
                    const credits = formatCreditsDisplay((row.credits || { est: 0, cls: "read", ref: "fixture" }) as never) as { label?: string; ref?: string };
                    return (
                      <li key={index} className="pearl-ci-row" data-kind="tool">
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <Badge tone="gold">Beacon</Badge>
                          <Badge tone={dispositionTone(row.beacon || "BLOCKED")}>{row.beacon || "BLOCKED"}</Badge>
                          <Badge tone="neutral">{row.cls || "tool"}</Badge>
                        </div>
                        <h3 style={{ margin: "8px 0 4px", font: "600 14px/1.2 var(--font-sans, inherit)" }}>
                          {row.title} · {row.name}
                        </h3>
                        <p className="pearl-ci-credits">
                          source {row.source || "—"} · policy {row.policyRef || "—"} · grantsAuthority:false
                        </p>
                        <p className="pearl-ci-credits">
                          {credits.label}
                          {credits.ref ? ` · ${credits.ref}` : ""}
                        </p>
                        {decision.show ? (
                          <>
                            <p className="pearl-ci-credits">{decision.caption}</p>
                            <div className="pearl-ci-actions">
                              {(decision.actions as string[]).map((action) => (
                                <button
                                  key={action}
                                  type="button"
                                  className={
                                    action === "APPROVE"
                                      ? "pearl-btn pearl-btn--approve pearl-btn--xs"
                                      : action === "DENY"
                                        ? "pearl-btn pearl-btn--hold pearl-btn--xs"
                                        : "pearl-btn pearl-btn--inspect pearl-btn--xs"
                                  }
                                  onClick={() =>
                                    onDecision(
                                      row,
                                      action === "APPROVE" ? "approve" : action === "DENY" ? "deny" : "inspect",
                                    )
                                  }
                                >
                                  {action}
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="pearl-ci-credits">{decision.reason || row.status || ""}</p>
                        )}
                      </li>
                    );
                  }
                  if (row.kind === "receipt") {
                    const credits = formatCreditsDisplay((row.credits || { est: 0, cls: "read", ref: "fixture" }) as never) as { label?: string; ref?: string };
                    return (
                      <li key={index} className="pearl-ci-row" data-kind="receipt">
                        <Badge tone="gold">Receipt</Badge>
                        <Badge tone={dispositionTone(row.beacon || "PASS")}>{row.beacon || "PASS"}</Badge>
                        <p>
                          {row.receiptId} · {row.subject || ""}
                        </p>
                        <p className="pearl-ci-credits">{credits.label} · secret_material: none</p>
                      </li>
                    );
                  }
                  if (row.kind === "exec") {
                    return (
                      <li key={index} className="pearl-ci-row" data-kind="exec">
                        <strong>{row.label}</strong>
                        <p className="pearl-ci-credits">{row.state || "running"}</p>
                      </li>
                    );
                  }
                  if (row.kind === "system") {
                    return (
                      <li key={index} className="pearl-ci-row" data-kind="system">
                        <Badge tone="signal">System</Badge>
                        <p>{row.text}</p>
                      </li>
                    );
                  }
                  return (
                    <li key={index} className="pearl-ci-row" data-kind="denied">
                      <Badge tone="blocked">BLOCKED</Badge>
                      <p>{row.text || "fail-closed"}</p>
                    </li>
                  );
                })}
              </ol>

              <div className="pearl-ci-composer">
                <label className="visually-hidden" htmlFor="pearl-composer">
                  Message
                </label>
                <textarea
                  id="pearl-composer"
                  rows={2}
                  value={composer}
                  disabled={locked}
                  onChange={(event) => setComposer(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      onSend();
                    }
                  }}
                  placeholder={locked ? "Composer locked" : "Request only · never creates authority"}
                />
                <button type="button" className="pearl-btn pearl-btn--approve" disabled={locked} onClick={onSend}>
                  Send (sim)
                </button>
                <p className="pearl-ci-credits">
                  {locked
                    ? "Composer disabled · wristband LOCKED/UNKNOWN (visibility only)"
                    : "Messages request. They never create authority."}
                </p>
              </div>

              <p className="pearl-ci-notice pearl-ci-notice--beacon" role="status" aria-live="polite">
                {announce}
              </p>
              <p className="pearl-ci-credits" role="status">
                {simLog}
              </p>
            </main>

            <aside className={`pearl-ci-side${sideOpen ? " is-open" : ""}`} aria-label="Room context">
              <h2 className="pearl-panel__title">Non-equivalences</h2>
              <ul>
                {NON_EQUIVALENCES.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h2 className="pearl-panel__title" style={{ marginTop: 16 }}>
                Agents in room
              </h2>
              <ul>
                {agents.map((agent: { id: string; name: string; state: string }) => (
                  <li key={agent.id}>
                    <strong>{agent.name}</strong> · {agent.state} · grantsAuthority:false
                  </li>
                ))}
                {agents.length === 0 ? <li className="pearl-ci-credits">No fixture agents in this room</li> : null}
              </ul>
            </aside>
          </div>
        </div>
      </div>
    </OperatorShell>
  );
}
