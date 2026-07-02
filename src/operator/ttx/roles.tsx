import { InfoCard } from "../../components/InfoCard";
import { useApiResource } from "../../lib/useApiResource";
import { ttxService } from "./service";
import type { TTXOperatorRole } from "./types";

const DEFAULT_ROLES: TTXOperatorRole[] = [
  { id: "facilitator", name: "Facilitator", description: "Runs the session, fires injects, keeps pace.", isFacilitator: true },
  { id: "player", name: "Player", description: "Responds to injects in-character as the team under test.", isFacilitator: false },
  { id: "observer", name: "Observer", description: "Watches and takes notes without participating.", isFacilitator: false },
  { id: "white-cell", name: "White Cell", description: "Adjudicates ambiguous player actions during the exercise.", isFacilitator: false },
  { id: "evaluator", name: "Evaluator", description: "Scores performance against the scenario's objectives.", isFacilitator: false },
];

// Falls back to the standard TTX role taxonomy when the engine's
// /api/ttx/roles isn't reachable, so this tab is useful even before that
// endpoint exists.
export function TTXRoles() {
  const { result } = useApiResource(ttxService.listRoles);
  const roles = result?.ok && result.data.roles.length > 0 ? result.data.roles : DEFAULT_ROLES;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {roles.map((role) => (
        <InfoCard key={role.id} label={role.name}>
          {role.description}
          {role.isFacilitator && (
            <span className="ml-2 rounded-sm border border-op-accent/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-accent">
              facilitator
            </span>
          )}
        </InfoCard>
      ))}
    </div>
  );
}
