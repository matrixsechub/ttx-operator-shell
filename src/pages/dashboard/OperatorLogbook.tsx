export function OperatorLogbook() {
  return (
    <div id="operator-logbook" className="op-panel rounded-sm p-4">
      <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Operator Logbook</h2>
      <div className="mt-3 op-scrollbar max-h-32 overflow-y-auto">
        <p className="text-xs italic text-op-text-dim">No log entries recorded for this session.</p>
      </div>
    </div>
  );
}
