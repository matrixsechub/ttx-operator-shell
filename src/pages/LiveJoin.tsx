// Phase 36 — Public participant join page.
// Accessible without operator auth — the join token IS the auth.
// Route: /join?token=<jwt>

import { useEffect, useRef, useState } from "react";
import {
  connectToLiveSession,
  type PublicLiveTtxState,
  type LiveWsStatus,
} from "../lib/liveSessionService";
import { LiveSessionLog } from "../components/LiveSessionLog";

type JoinState = "connecting" | "lobby" | "running" | "complete" | "error";

export default function LiveJoin() {
  const token = new URLSearchParams(window.location.search).get("token");

  const [joinState, setJoinState] = useState<JoinState>(token ? "connecting" : "error");
  const [wsStatus, setWsStatus] = useState<LiveWsStatus>("closed");
  const [sessionState, setSessionState] = useState<PublicLiveTtxState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    token ? null : "No join token found in URL.",
  );
  const [myVote, setMyVote] = useState<string | null>(null);

  const wsRef = useRef<ReturnType<typeof connectToLiveSession> | null>(null);

  useEffect(() => {
    if (!token) return;
    const conn = connectToLiveSession(token);
    wsRef.current = conn;

    conn.onStatus((s) => {
      setWsStatus(s);
      if (s === "closed" && joinState !== "error") setJoinState("error");
    });

    conn.onState((state) => {
      setSessionState(state);
      if (state.status === "lobby") setJoinState("lobby");
      else if (state.status === "completed" || state.status === "archived") setJoinState("complete");
      else setJoinState("running");
    });

    conn.onError((code, msg) => {
      setErrorMsg(`[${code}] ${msg}`);
      setJoinState("error");
    });

    return () => { conn.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function castVote(choiceKey: string) {
    if (!sessionState?.currentNodeId) return;
    wsRef.current?.send({
      type: "vote.cast",
      nodeId: sessionState.currentNodeId,
      choiceKey,
    });
    setMyVote(choiceKey);
  }

  const me = sessionState?.participants.find(
    (p) => wsRef.current && !p.isHost,
  ) ?? null;

  const currentNodeEvent = sessionState
    ? [...sessionState.eventLog].reverse().find((e) => e.type === "node_opened")
    : undefined;
  const currentChoices =
    currentNodeEvent && "choices" in currentNodeEvent
      ? (currentNodeEvent.choices as Array<{ choice: string; label: string }>)
      : [];
  const currentInject =
    currentNodeEvent && "inject" in currentNodeEvent ? currentNodeEvent.inject : null;
  const currentTitle =
    currentNodeEvent && "title" in currentNodeEvent ? currentNodeEvent.title : null;
  const currentRole =
    currentNodeEvent && "role" in currentNodeEvent ? currentNodeEvent.role : null;

  const canVote = sessionState?.status === "node_open" && !me?.isObserver;
  const alreadyVoted = !!myVote && sessionState?.currentNodeId != null;

  return (
    <div className="min-h-screen bg-[#0e0e10] text-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-lg flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-[#888]">
            matrixsechub · live ttx
          </span>
          <span
            className={`text-[10px] ${
              wsStatus === "open"
                ? "text-emerald-400"
                : wsStatus === "reconnecting"
                ? "text-yellow-400"
                : "text-[#666]"
            }`}
          >
            ●{" "}
            {wsStatus === "open"
              ? "connected"
              : wsStatus === "reconnecting"
              ? "reconnecting…"
              : wsStatus === "connecting"
              ? "connecting…"
              : "disconnected"}
          </span>
        </div>

        {/* Error */}
        {joinState === "error" && (
          <div className="rounded border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-400">
            {errorMsg ?? "Connection failed. Your link may have expired — request a new one from the session host."}
          </div>
        )}

        {/* Lobby waiting */}
        {joinState === "lobby" && (
          <div className="rounded border border-[#2a2a2e] bg-[#141416] p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-[#888] mb-2">Waiting for host to start</p>
            <p className="text-2xl font-mono text-emerald-400">{sessionState?.code ?? "…"}</p>
            {me && (
              <p className="mt-3 text-sm text-gray-400">
                Joined as <span className="text-gray-200">{me.name}</span>{" "}
                {me.isObserver ? "(Observer)" : `· ${me.role}`}
              </p>
            )}
          </div>
        )}

        {/* Running — inject + vote */}
        {joinState === "running" && sessionState && (
          <>
            <div className="rounded border border-[#2a2a2e] bg-[#141416] p-4">
              <p className="text-[10px] uppercase tracking-widest text-[#888] mb-1">
                {currentTitle ?? "Current Inject"}
              </p>
              {currentRole && (
                <span className="inline-block rounded border border-emerald-900/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-emerald-400 mb-2">
                  {currentRole}
                </span>
              )}
              <p className="text-sm text-gray-300 leading-relaxed">{currentInject ?? "—"}</p>
            </div>

            {/* Vote buttons */}
            {!me?.isObserver && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] uppercase tracking-widest text-[#888]">Your Vote</p>
                {currentChoices.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No choices — waiting for host to advance.</p>
                ) : (
                  currentChoices.map((c) => (
                    <button
                      key={c.choice}
                      type="button"
                      disabled={!canVote || alreadyVoted}
                      onClick={() => castVote(c.choice)}
                      className={`rounded border px-4 py-3 text-sm text-left transition-colors ${
                        myVote === c.choice
                          ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-300"
                          : canVote && !alreadyVoted
                          ? "border-[#2a2a2e] hover:border-emerald-800/60 hover:bg-emerald-950/10 text-gray-200"
                          : "border-[#1e1e22] text-gray-500 cursor-default"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))
                )}
                {alreadyVoted && (
                  <p className="text-xs text-emerald-400 mt-1">Vote cast — waiting for host to advance.</p>
                )}
                {sessionState.status === "node_locked" && !alreadyVoted && (
                  <p className="text-xs text-yellow-400 mt-1">Voting closed by host.</p>
                )}
              </div>
            )}
            {me?.isObserver && (
              <p className="text-xs text-[#666] italic">Observer mode — you can watch but not vote.</p>
            )}

            <LiveSessionLog events={sessionState.eventLog} />
          </>
        )}

        {/* Complete */}
        {joinState === "complete" && sessionState && (
          <div className="rounded border border-[#2a2a2e] bg-[#141416] p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-emerald-400 mb-3">Exercise Complete</p>
            <p className="text-sm text-gray-400">
              Thanks for participating. The host will share results from the session.
            </p>
            <LiveSessionLog events={sessionState.eventLog} />
          </div>
        )}

        {/* Connecting spinner */}
        {joinState === "connecting" && (
          <p className="text-xs text-[#888] italic text-center">Connecting to session…</p>
        )}
      </div>
    </div>
  );
}
