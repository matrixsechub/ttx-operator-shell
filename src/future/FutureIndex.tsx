import { Link } from "react-router-dom";
import { OperatorShell } from "../components/OperatorShell";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FUTURE_MODULES } from "./registry";

export function FutureIndex() {
  return (
    <OperatorShell>
      <div className="flex flex-col gap-6">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Future" }]} />

        <div>
          <h1 className="text-lg uppercase tracking-widest text-op-accent">Future</h1>
          <p className="mt-1 text-xs text-op-text-dim">Scaffolded concepts — not yet built.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {FUTURE_MODULES.map((module) => (
            <Link
              key={module.slug}
              to={`/future/${module.slug}`}
              className="op-panel-raised rounded-sm border-dashed p-4 transition-colors hover:border-op-accent/50"
            >
              <h2 className="text-sm text-op-text">{module.name}</h2>
              <p className="mt-2 text-xs text-op-text-dim">{module.tagline}</p>
            </Link>
          ))}
        </div>
      </div>
    </OperatorShell>
  );
}
