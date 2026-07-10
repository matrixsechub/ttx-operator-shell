// Phase 36 — Frontend copy of live TTX protocol types.
// The worker/liveTtxProtocol.ts is excluded from tsconfig.app.json (src-only).
// This file keeps the two in sync; types must match exactly.
// Do not add business logic here.

export type LiveSessionStatus =
  | "lobby"
  | "running"
  | "node_open"
  | "node_locked"
  | "completed"
  | "archived";

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

export type PublicLiveTtxState = Omit<LiveTtxSessionState, "hostOperatorId">;

export type ServerMessage =
  | { type: "state.update"; state: PublicLiveTtxState }
  | { type: "error"; code: string; message: string }
  | { type: "pong" };
