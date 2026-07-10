import { Link } from "react-router-dom";
import { OperatorShell } from "../../components/OperatorShell";
import { SystemHUD } from "../../components/SystemHUD";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { OPERATOR_SYSTEMS } from "../../operator/registry";

export function SystemsIndex() {
  return (
    <OperatorShell hud={<SystemHUD compact />}>
      <div className="flex flex-col gap-6">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Systems" }]} />

        <div>
          <h1 className="text-lg uppercase tracking-widest text-op-accent">Systems</h1>
          <p className="mt-1 text-xs text-op-text-dim">Operator system modules running under the cockpit.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {OPERATOR_SYSTEMS.map((system) => (
            <Link
              key={system.slug}
              to={`/systems/${system.slug}`}
              className="block transition-transform hover:-translate-y-0.5"
            >
              <system.Component />
            </Link>
          ))}
        </div>
      </div>
    </OperatorShell>
  );
}
