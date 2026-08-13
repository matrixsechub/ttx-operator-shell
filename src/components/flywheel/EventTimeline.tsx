import type { FlywheelEvent } from "../../../shared/flywheel/contracts";

export function EventTimeline({ events }: { events: FlywheelEvent[] }) {
  return <section className="op-panel-raised rounded-sm p-4" aria-labelledby="flywheel-events-title">
    <h2 id="flywheel-events-title" className="text-xs font-semibold uppercase tracking-widest text-op-text">Event timeline</h2>
    {events.length === 0 ? <p className="mt-3 text-sm text-op-text-dim">No events recorded.</p> : <ol className="mt-3 max-h-80 space-y-2 overflow-y-auto">{[...events].reverse().map((event) => <li key={event.eventId} className="border-l-2 border-op-border pl-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-op-text">{event.eventType}</span><time className="text-[10px] text-op-text-dim">{new Date(event.timestamp).toLocaleString()}</time></div><p className="mt-1 font-mono text-[10px] text-op-text-dim">{event.governanceDecision} · {event.traceId}</p></li>)}</ol>}
  </section>;
}
