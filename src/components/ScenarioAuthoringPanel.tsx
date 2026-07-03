import { useMemo, useState } from "react";
import { StatusPill } from "./StatusPill";
import { useApiResource } from "../lib/useApiResource";
import { ttxLocalScenarioService } from "../lib/ttxLocalScenarioService";
import { ttxSessionService } from "../lib/ttxSessionService";
import { ttxService } from "../operator/ttx/service";
import type { TtxLocalScenario, TtxScenarioDraft, TtxScenarioNode, TtxScenarioTransition } from "../lib/ttxTypes";

const POLL_INTERVAL_MS = 30_000;

// Draft shapes use arrays instead of the wire format's Record<id, node> —
// much easier to render/reorder as a form. Converted to the real
// ScenarioDefinition shape only at submit time (see toDraftPayload).
interface DraftTransition extends TtxScenarioTransition {
  key: string; // local-only React key, never sent to the server
}

interface DraftNode {
  key: string; // local-only React key, never sent to the server
  id: string;
  title: string;
  inject: string;
  role: string;
  transitions: DraftTransition[];
}

interface Draft {
  id?: string;
  title: string;
  description: string;
  roles: string;
  entry: string;
  nodes: DraftNode[];
}

let localKeyCounter = 0;
function nextKey(): string {
  localKeyCounter += 1;
  return `k${localKeyCounter}`;
}

function emptyDraft(): Draft {
  const nodeKey = nextKey();
  return {
    title: "",
    description: "",
    roles: "",
    entry: "",
    nodes: [{ key: nodeKey, id: "", title: "", inject: "", role: "", transitions: [] }],
  };
}

function draftFromScenario(scenario: TtxLocalScenario): Draft {
  const nodes = Object.values(scenario.nodes).map((node) => ({
    key: nextKey(),
    id: node.id,
    title: node.title,
    inject: node.inject,
    role: node.role ?? "",
    transitions: node.transitions.map((transition) => ({ ...transition, key: nextKey() })),
  }));
  return {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description ?? "",
    roles: scenario.roles.join(", "),
    entry: scenario.entry,
    nodes,
  };
}

// Client-side pre-check mirroring worker/scenarioManifest.ts's
// validateScenarioDefinition + worker/scenarioGraph.ts's
// validateScenarioGraph — for immediate feedback only. The Worker is the
// actual authority; this just avoids a round trip for the common mistakes.
function validateDraft(draft: Draft): string | null {
  if (!draft.title.trim()) return "Title is required.";
  if (draft.nodes.length === 0) return "At least one phase is required.";

  const ids = new Set<string>();
  for (const node of draft.nodes) {
    if (!node.id.trim()) return "Every phase needs an id.";
    if (ids.has(node.id)) return `Phase id "${node.id}" is used more than once.`;
    ids.add(node.id);
    if (!node.title.trim()) return `Phase "${node.id}" needs a title.`;
    if (!node.inject.trim()) return `Phase "${node.id}" needs inject text.`;
    for (const transition of node.transitions) {
      if (!transition.choice.trim() || !transition.label.trim()) {
        return `Phase "${node.id}" has a transition missing a choice key or label.`;
      }
    }
  }

  if (!draft.entry.trim() || !ids.has(draft.entry)) return "Entry phase must be one of the defined phase ids.";
  for (const node of draft.nodes) {
    for (const transition of node.transitions) {
      if (!ids.has(transition.next)) {
        return `Phase "${node.id}" has a transition to unknown phase "${transition.next}".`;
      }
    }
  }
  if (!draft.nodes.some((node) => node.transitions.length === 0)) {
    return "At least one phase must have no transitions (a terminal phase), or the scenario would never end.";
  }
  return null;
}

function toPayload(draft: Draft): TtxScenarioDraft {
  const nodes: Record<string, TtxScenarioNode> = {};
  for (const node of draft.nodes) {
    nodes[node.id] = {
      id: node.id,
      title: node.title.trim(),
      inject: node.inject.trim(),
      ...(node.role.trim() ? { role: node.role.trim() } : {}),
      transitions: node.transitions.map((t) => ({ choice: t.choice.trim(), label: t.label.trim(), next: t.next })),
    };
  }
  const roles = Array.from(new Set(draft.roles.split(",").map((r) => r.trim()).filter(Boolean)));
  return {
    ...(draft.id ? { id: draft.id } : {}),
    title: draft.title.trim(),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    roles,
    entry: draft.entry,
    nodes,
  };
}

const inputClass =
  "op-panel rounded-sm px-2 py-1 text-xs text-op-text placeholder:text-op-text-dim/50 focus:border-op-accent/60 focus:outline-none";

// Scenario authoring surface (Phase 26) — create/edit/delete
// operator-authored scenarios that the TTX session engine (worker/ttx.ts)
// can run alongside the builtins. Also renders the "SaaS bridge": the
// existing, untouched src/operator/ttx/service.ts's ttxService.
// listScenarios() (SaaS scaffold, still proxied to an Engine that doesn't
// exist yet — expected to show "unavailable") alongside this engine's own
// scenario list, each tagged with its source. This is a frontend-side
// merge, not a Worker-side interception of /api/ttx/scenarios — see
// worker/ttx.ts's header comment for why.
export function ScenarioAuthoringPanel() {
  const { result: localResult, refresh: refreshLocal } = useApiResource(() => ttxLocalScenarioService.list(), {
    pollIntervalMs: POLL_INTERVAL_MS,
  });
  const { result: saasResult } = useApiResource(() => ttxService.listScenarios(), { pollIntervalMs: POLL_INTERVAL_MS });
  const { result: engineResult } = useApiResource(() => ttxSessionService.listScenarios(), {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  const localScenarios = localResult?.ok ? localResult.data.scenarios : [];
  const engineScenarios = engineResult?.ok ? engineResult.data.scenarios : [];

  const [draft, setDraft] = useState<Draft | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isEditing = draft?.id !== undefined;

  function startCreate() {
    setDraft(emptyDraft());
    setValidationError(null);
    setSubmitError(null);
  }

  function startEdit(scenario: TtxLocalScenario) {
    setDraft(draftFromScenario(scenario));
    setValidationError(null);
    setSubmitError(null);
  }

  function cancelEdit() {
    setDraft(null);
    setValidationError(null);
    setSubmitError(null);
  }

  function updateDraft(patch: Partial<Draft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function updateNode(key: string, patch: Partial<DraftNode>) {
    setDraft((prev) => (prev ? { ...prev, nodes: prev.nodes.map((n) => (n.key === key ? { ...n, ...patch } : n)) } : prev));
  }

  function addNode() {
    setDraft((prev) =>
      prev ? { ...prev, nodes: [...prev.nodes, { key: nextKey(), id: "", title: "", inject: "", role: "", transitions: [] }] } : prev,
    );
  }

  function removeNode(key: string) {
    setDraft((prev) => (prev ? { ...prev, nodes: prev.nodes.filter((n) => n.key !== key) } : prev));
  }

  function addTransition(nodeKey: string) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            nodes: prev.nodes.map((n) =>
              n.key === nodeKey ? { ...n, transitions: [...n.transitions, { key: nextKey(), choice: "", label: "", next: "" }] } : n,
            ),
          }
        : prev,
    );
  }

  function updateTransition(nodeKey: string, transitionKey: string, patch: Partial<DraftTransition>) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            nodes: prev.nodes.map((n) =>
              n.key === nodeKey
                ? { ...n, transitions: n.transitions.map((t) => (t.key === transitionKey ? { ...t, ...patch } : t)) }
                : n,
            ),
          }
        : prev,
    );
  }

  function removeTransition(nodeKey: string, transitionKey: string) {
    setDraft((prev) =>
      prev
        ? { ...prev, nodes: prev.nodes.map((n) => (n.key === nodeKey ? { ...n, transitions: n.transitions.filter((t) => t.key !== transitionKey) } : n)) }
        : prev,
    );
  }

  const nodeIdOptions = useMemo(() => (draft ? draft.nodes.map((n) => n.id).filter(Boolean) : []), [draft]);

  async function handleSubmit() {
    if (!draft) return;
    const error = validateDraft(draft);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    setSubmitError(null);
    setBusy(true);

    const payload = toPayload(draft);
    const response = isEditing
      ? await ttxLocalScenarioService.update(payload as TtxLocalScenario)
      : await ttxLocalScenarioService.create(payload);

    if (response.ok) {
      setDraft(null);
      await refreshLocal();
    } else {
      setSubmitError(response.error);
    }
    setBusy(false);
  }

  async function handleDelete(id: string) {
    setBusy(true);
    await ttxLocalScenarioService.remove(id);
    await refreshLocal();
    setBusy(false);
  }

  return (
    <div id="scenario-authoring-panel" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Scenario Authoring</h2>
        {!draft && (
          <button
            type="button"
            onClick={startCreate}
            className="text-[10px] uppercase tracking-widest text-op-accent hover:underline"
          >
            + New Scenario
          </button>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Available Sources</h3>
        <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
          <span className="flex items-center gap-1.5">
            <StatusPill tone={engineResult?.ok ? "ok" : "neutral"}>local</StatusPill>
            <span className="text-op-text-dim">{engineScenarios.length} scenarios</span>
          </span>
          <span className="flex items-center gap-1.5">
            <StatusPill tone={saasResult?.ok ? "ok" : "warn"}>saas</StatusPill>
            <span className="text-op-text-dim">
              {saasResult?.ok ? `${saasResult.data.scenarios.length} scenarios` : `unavailable — ${saasResult && !saasResult.ok ? saasResult.error : "checking…"}`}
            </span>
          </span>
        </div>
      </div>

      {!draft ? (
        <div className="mt-3">
          {localScenarios.length === 0 ? (
            <p className="text-xs italic text-op-text-dim">No authored scenarios yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {localScenarios.map((scenario) => (
                <li key={scenario.id} className="rounded-sm border border-op-border-bright px-2.5 py-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-op-text">{scenario.title}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(scenario)} className="text-op-accent hover:underline">
                        edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDelete(scenario.id)}
                        className="text-op-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                  {scenario.description && <p className="mt-0.5 text-[10px] text-op-text-dim">{scenario.description}</p>}
                  <p className="mt-0.5 text-[10px] text-op-text-dim/70">{Object.keys(scenario.nodes).length} phases</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3 rounded-sm border border-op-border-bright p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={draft.title}
              onChange={(e) => updateDraft({ title: e.target.value })}
              placeholder="Scenario title"
              className={inputClass}
            />
            <input
              value={draft.roles}
              onChange={(e) => updateDraft({ roles: e.target.value })}
              placeholder="Roles (comma-separated, optional)"
              className={inputClass}
            />
          </div>
          <textarea
            value={draft.description}
            onChange={(e) => updateDraft({ description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
            className={inputClass}
          />

          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Entry Phase</h4>
            <select
              value={draft.entry}
              onChange={(e) => updateDraft({ entry: e.target.value })}
              className={`${inputClass} mt-1`}
            >
              <option value="">select…</option>
              {nodeIdOptions.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Phases</h4>
            {draft.nodes.map((node) => (
              <div key={node.key} className="rounded-sm border border-op-border-bright p-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    value={node.id}
                    onChange={(e) => updateNode(node.key, { id: e.target.value })}
                    placeholder="Phase id"
                    className={inputClass}
                  />
                  <input
                    value={node.title}
                    onChange={(e) => updateNode(node.key, { title: e.target.value })}
                    placeholder="Phase title"
                    className={inputClass}
                  />
                  <input
                    value={node.role}
                    onChange={(e) => updateNode(node.key, { role: e.target.value })}
                    placeholder="Role tag (optional, display-only)"
                    className={inputClass}
                  />
                </div>
                <textarea
                  value={node.inject}
                  onChange={(e) => updateNode(node.key, { inject: e.target.value })}
                  placeholder="Inject text"
                  rows={2}
                  className={`${inputClass} mt-2 w-full`}
                />

                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-op-text-dim/60">
                      Transitions{node.transitions.length === 0 ? " (none = terminal)" : ""}
                    </span>
                    <button type="button" onClick={() => addTransition(node.key)} className="text-[10px] text-op-accent hover:underline">
                      + transition
                    </button>
                  </div>
                  {node.transitions.map((transition) => (
                    <div key={transition.key} className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-4">
                      <input
                        value={transition.choice}
                        onChange={(e) => updateTransition(node.key, transition.key, { choice: e.target.value })}
                        placeholder="choice key"
                        className={inputClass}
                      />
                      <input
                        value={transition.label}
                        onChange={(e) => updateTransition(node.key, transition.key, { label: e.target.value })}
                        placeholder="button label"
                        className={inputClass}
                      />
                      <select
                        value={transition.next}
                        onChange={(e) => updateTransition(node.key, transition.key, { next: e.target.value })}
                        className={inputClass}
                      >
                        <option value="">next phase…</option>
                        {nodeIdOptions.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeTransition(node.key, transition.key)}
                        className="text-[10px] text-op-danger hover:underline"
                      >
                        remove
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => removeNode(node.key)}
                  className="mt-2 text-[10px] text-op-danger hover:underline"
                >
                  remove phase
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addNode}
              className="rounded-sm border border-op-border-bright py-1 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent"
            >
              + Add Phase
            </button>
          </div>

          {(validationError || submitError) && (
            <p className="text-[11px] italic text-op-danger">{validationError ?? submitError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleSubmit}
              className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "saving…" : isEditing ? "Save Changes" : "Create Scenario"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={cancelEdit}
              className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-danger/50 hover:text-op-danger disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
