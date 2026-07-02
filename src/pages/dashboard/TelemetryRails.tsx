const RAILS = ["Harness Latency", "Engine Throughput", "Active Sessions"] as const;

export function TelemetryRails() {
  return (
    <div id="telemetry-rails" className="op-panel rounded-sm p-4">
      <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Telemetry Rails</h2>
      <div className="mt-3 flex flex-col gap-2">
        {RAILS.map((rail) => (
          <div key={rail} className="flex items-center justify-between border-b border-op-border py-1.5 last:border-b-0">
            <span className="text-xs text-op-text-dim">{rail}</span>
            <span className="text-xs text-op-text-dim/60">&mdash;</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] italic text-op-text-dim/70">Rail metrics are not yet connected to the engine.</p>
    </div>
  );
}
