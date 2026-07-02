import { Link } from "react-router-dom";
import { OperatorShell } from "../../components/OperatorShell";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { DIVISIONS } from "./data";
import { TONE_BORDER, TONE_TEXT } from "../../lib/tone";

export function DivisionsIndex() {
  return (
    <OperatorShell>
      <div className="flex flex-col gap-6">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Divisions" }]} />

        <div>
          <h1 className="text-lg uppercase tracking-widest text-op-accent">Divisions</h1>
          <p className="mt-1 text-xs text-op-text-dim">The eight operating divisions of MSH OPS.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {DIVISIONS.map((division) => (
            <Link
              key={division.slug}
              to={`/divisions/${division.slug}`}
              className={`op-panel rounded-sm border-l-2 p-4 transition-colors hover:bg-white/5 ${TONE_BORDER[division.tone]}`}
            >
              <span className={`text-[10px] uppercase tracking-widest ${TONE_TEXT[division.tone]}`}>
                {division.codename}
              </span>
              <h2 className="mt-1 text-sm text-op-text">{division.name}</h2>
              <p className="mt-2 line-clamp-2 text-xs text-op-text-dim">{division.summary}</p>
            </Link>
          ))}
        </div>
      </div>
    </OperatorShell>
  );
}
