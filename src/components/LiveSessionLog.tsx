import type { LiveEvent } from "../lib/liveSessionService";

interface Props {
  events: LiveEvent[];
}

function eventLabel(e: LiveEvent): string {
  switch (e.type) {
    case "session_created": return `Session created by ${e.by}`;
    case "participant_joined": return `${e.name} joined as ${e.role}`;
    case "participant_left": return `Participant ${e.participantId.slice(0, 8)}… disconnected`;
    case "node_opened": return `Inject: ${e.title}${e.role ? ` [${e.role}]` : ""}`;
    case "vote_cast": return `${e.role} voted "${e.choiceKey}"${e.rationale ? ` — "${e.rationale}"` : ""}`;
    case "host_override": return `HOST OVERRIDE → "${e.choiceKey}": ${e.reason}`;
    case "node_advanced": return `Advanced: ${e.fromNodeId} → ${e.toNodeId} (${e.choiceKey})`;
    case "chat": return `[${e.name}] ${e.text}`;
    case "session_completed": return `Session complete — score: ${e.finalScore ?? "n/a"}`;
    case "session_archived": return "Session archived";
    default: return "Unknown event";
  }
}

function eventTone(type: LiveEvent["type"]): string {
  if (type === "host_override") return "text-op-danger";
  if (type === "vote_cast") return "text-op-accent-2";
  if (type === "session_completed") return "text-op-accent";
  if (type === "node_opened") return "text-op-text";
  if (type === "chat") return "text-op-text-dim";
  return "text-op-text-dim/70";
}

export function LiveSessionLog({ events }: Props) {
  const reversed = [...events].reverse();

  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70 mb-2">Session Log</h3>
      <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto">
        {reversed.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px]">
            <span className="shrink-0 text-op-text-dim/50 font-mono">
              {new Date(e.at).toLocaleTimeString()}
            </span>
            <span className={eventTone(e.type)}>{eventLabel(e)}</span>
          </li>
        ))}
        {events.length === 0 && (
          <li className="text-xs italic text-op-text-dim">No events yet.</li>
        )}
      </ul>
    </div>
  );
}
