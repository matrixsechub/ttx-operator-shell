import { Link } from "react-router-dom";

const COLUMNS = ["Queued", "Active", "Done"] as const;

export function MissionBoard() {
  return (
    <div id="mission-board" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Mission Board</h2>
        <Link to="/ttx/builder" className="text-[10px] uppercase tracking-widest text-op-accent hover:underline">
          compose in TTX &rarr;
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {COLUMNS.map((column) => (
          <div key={column} className="op-panel-raised rounded-sm border-dashed p-2.5">
            <p className="text-[10px] uppercase tracking-widest text-op-text-dim">{column}</p>
            <p className="mt-2 text-[11px] italic text-op-text-dim/70">No missions</p>
          </div>
        ))}
      </div>
    </div>
  );
}
