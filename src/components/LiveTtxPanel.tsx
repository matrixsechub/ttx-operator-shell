// Phase 36 — Live TTX Panel (host view).
// Used from TTXPanel.tsx when the operator clicks "Start Live Session".
// Participant join view lives at /join (src/pages/LiveJoin.tsx).

import { useCallback, useEffect, useState } from "react";
import { InfoCard } from "./InfoCard";
import { LiveParticipantRoster } from "./LiveParticipantRoster";
import { LiveVoteBoard } from "./LiveVoteBoard";
import { LiveSessionLog } from "./LiveSessionLog";
import {
  liveSessionService,
  connectToLiveSession,
  buildJoinUrl,
  type PublicLiveTtxState,
  type LiveWsStatus,
} from "../lib/liveSessionService";
import { useApiResource } from "../lib/useApiResource";
import { ttxSessionService } from "../lib/ttxSessionService";

interface Props {
  onClose: () => void;
}

type HostView = "setup" | "lobby" | "running" | "complete";

interface InviteEntry {
  name: string;
  role: string;
  token: string;
  url: string;
}

export function LiveTtxPanel({ onClose }: Props) {
  const [view, setView] = useState<HostView>("setup");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Setup state
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const { result: scenariosResult } = useApiResource(() => ttxSessionService.listScenarios());
  const scenarios = scenariosResult?.ok ? scenariosResult.data.scenarios : [];

  // Session state
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<PublicLiveTtxState | null>(null);
  const [wsStatus, setWsStatus] = useState<LiveWsStatus>("closed");

  // Invite management
  const [invites, setInvites] = useState<InviteEntry[]>([]);
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteObserver, setInviteObserver] = useState(false);

  // WebSocket connection
  const [ws, setWs] = useState<ReturnType<typeof connectToLiveSession> | null>(null);

  const connectWs = useCallback((token: string) => {
    const conn = connectToLiveSession(token);
    conn.onStatus(setWsStatus);
    conn.onState((state) => {
      setSessionState(state);
      if (state.status === "lobby") setView("lobby");
      else if (state.status === "completed" || state.status === "archived") setView("complete");
      else setView("running");
    });
    conn.onError((code, msg) => setError(`[${code}] ${msg}`));
    setWs(conn);
  }, []);

  useEffect(() => {
    return () => { ws?.close(); };
  }, [ws]);

  // ── Setup: create session ────────────────────────────────────────────────

  async function handleCreate() {
    if (!selectedScenarioId) return;
    setBusy(true);
    setError(null);
    const resp = await liveSessionService.createSession(selectedScenarioId);
    if (!resp.ok) {
      setError(resp.error);
      setBusy(false);
      return;
    }
    const { code, hostToken: token } = resp.data;
    setSessionCode(code);
    connectWs(token);
    setView("lobby");
    setBusy(false);
  }

  // ── Lobby: generate invite links ─────────────────────────────────────────

  async function handleAddInvite() {
    if (!sessionCode || !inviteName.trim() || !inviteRole.trim()) return;
    setBusy(true);
    const resp = await liveSessionService.generateToken(
      sessionCode, inviteName.trim(), inviteRole.trim(), inviteObserver,
    );
    if (!resp.ok) { setError(resp.error); setBusy(false); return; }
    setInvites((prev) => [
      ...prev,
      { name: inviteName.trim(), role: inviteRole.trim(), token: resp.data.token, url: buildJoinUrl(resp.data.token) },
    ]);
    setInviteName("");
    setInviteRole("");
    setInviteObserver(false);
    setBusy(false);
  }

  function handleStart() {
    ws?.send({ type: "host.start" });
  }

  // ── Running: host controls ───────────────────────────────────────────────

  function handleAdvance(choiceKey?: string) {
    ws?.send({ type: "host.advance", selectedChoiceKey: choiceKey });
  }

  function handleOverride(nodeId: string, choiceKey: string, reason: string) {
    ws?.send({ type: "host.override", nodeId, choiceKey, reason });
  }

  function handleLock() {
    ws?.send({ type: "host.lock" });
  }

  async function handleClose() {
    if (!sessionCode) { onClose(); return; }
    await liveSessionService.closeSession(sessionCode, "archive");
    onClose();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const currentNodeEvent = sessionState
    ? [...sessionState.eventLog].reverse().find((e) => e.type === "node_opened")
    : undefined;
  const currentChoices =
    currentNodeEvent && "choices" in currentNodeEvent ? currentNodeEvent.choices : [];
  const currentInject =
    currentNodeEvent && "inject" in currentNodeEvent ? currentNodeEvent.inject : null;
  const currentTitle =
    currentNodeEvent && "title" in currentNodeEvent ? currentNodeEvent.title : null;
  const currentRole =
    currentNodeEvent && "role" in currentNodeEvent ? currentNodeEvent.role : undefined;

  return (
    <div className="op-panel rounded-sm p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-accent">Live TTX Session</h2>
        <div className="flex items-center gap-3">
          {wsStatus === "open" && <span className="text-[10px] text-op-accent-2">● connected</span>}
          {wsStatus === "reconnecting" && <span className="text-[10px] text-op-text-dim">● reconnecting…</span>}
          {sessionCode && (
            <span className="text-[10px] font-mono text-op-text-dim">
              Room: <span className="text-op-accent">{sessionCode}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="text-[10px] uppercase tracking-widest text-op-text-dim hover:text-op-danger transition-colors"
          >
            close
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[11px] italic text-op-danger">{error}</p>
      )}

      {/* ── Setup ── */}
      {view === "setup" && (
        <InfoCard label="Create Live Room">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <select
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="op-panel rounded-sm px-1.5 py-1 text-xs text-op-text focus:outline-none"
            >
              {scenarios.length === 0 && <option value="">loading…</option>}
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.title} ({s.phaseCount} phases)</option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !selectedScenarioId}
              onClick={handleCreate}
              className="rounded-sm border border-op-accent/50 px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-accent hover:bg-op-accent/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? "creating…" : "Create Room"}
            </button>
          </div>
          <p className="text-xs text-op-text-dim">
            Creates a live session room. You'll then generate invite links for each participant.
          </p>
        </InfoCard>
      )}

      {/* ── Lobby ── */}
      {view === "lobby" && sessionState && (
        <>
          <InfoCard label="Participant Invites">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input
                type="text"
                placeholder="Name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="op-panel rounded-sm px-2 py-1 text-xs text-op-text focus:outline-none w-28"
              />
              <input
                type="text"
                placeholder="Role (e.g. CISO)"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="op-panel rounded-sm px-2 py-1 text-xs text-op-text focus:outline-none w-32"
              />
              <label className="flex items-center gap-1 text-xs text-op-text-dim cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteObserver}
                  onChange={(e) => setInviteObserver(e.target.checked)}
                  className="accent-op-accent"
                />
                Observer
              </label>
              <button
                type="button"
                disabled={busy || !inviteName.trim() || !inviteRole.trim()}
                onClick={handleAddInvite}
                className="rounded-sm border border-op-border-bright px-3 py-1 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/40 hover:text-op-text disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "…" : "Generate Link"}
              </button>
            </div>
            {invites.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {invites.map((inv, i) => (
                  <li key={i} className="rounded-sm border border-op-border-bright px-2 py-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-op-text">{inv.name} <span className="text-op-text-dim">({inv.role})</span></span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(inv.url)}
                        className="text-[10px] text-op-accent hover:underline"
                      >
                        copy link
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </InfoCard>

          <LiveParticipantRoster
            participants={sessionState.participants}
            votes={sessionState.votes}
            currentNodeId={null}
          />

          <button
            type="button"
            onClick={handleStart}
            className="self-start rounded-sm border border-op-accent/60 px-4 py-2 text-[11px] uppercase tracking-widest text-op-accent hover:bg-op-accent/10 transition-colors"
          >
            Start Exercise
          </button>
        </>
      )}

      {/* ── Running ── */}
      {(view === "running") && sessionState && (
        <>
          <InfoCard label={currentTitle ?? "Current Inject"}>
            {currentRole && (
              <span className="rounded-sm border border-op-accent-2/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-accent-2 mb-2 inline-block">
                {currentRole}
              </span>
            )}
            <p className="text-xs text-op-text-dim mt-1">{currentInject ?? "—"}</p>
          </InfoCard>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LiveParticipantRoster
              participants={sessionState.participants}
              votes={sessionState.votes}
              currentNodeId={sessionState.currentNodeId}
            />
            <LiveVoteBoard
              votes={sessionState.votes}
              currentNodeId={sessionState.currentNodeId}
              choices={currentChoices as Array<{ choice: string; label: string }>}
              isHost
              onAdvance={handleAdvance}
              onOverride={handleOverride}
              onLock={handleLock}
              sessionStatus={sessionState.status}
            />
          </div>

          <LiveSessionLog events={sessionState.eventLog} />
        </>
      )}

      {/* ── Complete ── */}
      {view === "complete" && sessionState && (
        <InfoCard label="Exercise Complete">
          <p className="text-xs text-op-accent mb-3">
            Session finished — results saved to history and intelligence pipeline.
          </p>
          <LiveSessionLog events={sessionState.eventLog} />
        </InfoCard>
      )}

      {/* Always show log during running */}
      {view !== "running" && view !== "complete" && view !== "setup" && sessionState && (
        <LiveSessionLog events={sessionState.eventLog} />
      )}
    </div>
  );
}
