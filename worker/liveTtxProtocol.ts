// Phase 36 — Multi-Participant Live TTX Session protocol types.
// Shared between worker/liveSession.ts (Durable Object) and
// worker/liveTtxRoute.ts (route handler). No I/O here, pure types.

export type LiveSessionStatus =
  | "lobby"
  | "running"
  | "node_open"
  | "node_locked"
  | "completed"
  | "archived";

// "host" is a synthetic role used only internally; it never appears in
// scored outputs. All other strings are scenario-defined role tags
// (matching ScenarioNode.role values) or display names chosen at join time.
export type TtxRole = string;

export interface LiveParticipant {
  id: string;
  name: string;
  role: TtxRole;
  isHost?: boolean;
  isObserver?: boolean;
  connected: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

export interface LiveVote {
  nodeId: string;
  participantId: string;
  role: TtxRole;
  choiceKey: string;
  rationale?: string;
  castAt: string;
}

// Discriminated union — every mutation to session state produces one of
// these and appends it to eventLog. Immutable after the fact.
export type LiveEvent =
  | { type: "session_created"; at: string; by: string; scenarioId: string }
  | { type: "participant_joined"; at: string; participantId: string; name: string; role: string }
  | { type: "participant_left"; at: string; participantId: string }
  | { type: "node_opened"; at: string; nodeId: string; title: string; inject: string; role?: string; choices: Array<{ choice: string; label: string }> }
  | { type: "vote_cast"; at: string; nodeId: string; participantId: string; role: string; choiceKey: string; rationale?: string }
  | { type: "host_override"; at: string; nodeId: string; choiceKey: string; reason: string }
  | { type: "node_advanced"; at: string; fromNodeId: string; toNodeId: string; choiceKey: string }
  | { type: "chat"; at: string; participantId: string; name: string; text: string }
  | { type: "session_completed"; at: string; finalScore: number | null }
  | { type: "session_archived"; at: string };

// Canonical state stored in DO storage. hostOperatorId is not sent to
// clients — it stays server-side only.
export interface LiveTtxSessionState {
  sessionId: string;
  code: string;
  scenarioId: string;
  hostOperatorId: string;
  status: LiveSessionStatus;
  currentNodeId: string | null;
  participants: LiveParticipant[];
  votes: LiveVote[];
  eventLog: LiveEvent[];
  createdAt: string;
  expiresAt: string;
}

// What's broadcast to every connected client — hostOperatorId stripped.
export type PublicLiveTtxState = Omit<LiveTtxSessionState, "hostOperatorId">;

// Payload inside a signed participant join token.
export interface LiveJoinTokenPayload {
  type: "live_join";
  sub: string; // participantId
  sessionCode: string;
  displayName: string;
  assignedRole: string;
  isHost?: boolean;
  isObserver?: boolean;
  exp: number;
  nonce: string;
}

// ── WebSocket protocol ────────────────────────────────────────────────────

export type ClientMessage =
  | { type: "host.start" }
  | { type: "host.advance"; selectedChoiceKey?: string }
  | { type: "host.override"; nodeId: string; choiceKey: string; reason: string }
  | { type: "host.lock" }
  | { type: "vote.cast"; nodeId: string; choiceKey: string; rationale?: string }
  | { type: "chat.send"; text: string }
  | { type: "presence.ping" };

export type ServerMessage =
  | { type: "state.update"; state: PublicLiveTtxState }
  | { type: "error"; code: string; message: string }
  | { type: "pong" };
