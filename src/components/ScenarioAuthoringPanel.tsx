import { useMemo, useRef, useState } from "react";
import { StatusPill } from "./StatusPill";
import { useApiResource } from "../lib/useApiResource";
import { ttxLocalScenarioService } from "../lib/ttxLocalScenarioService";
import { ttxSessionService } from "../lib/ttxSessionService";
import { ttxService } from "../operator/ttx/service";
import type {
  TtxLocalScenario,
  TtxScenarioDraft,
  TtxScenarioExportBlob,
  TtxScenarioNode,
  TtxScenarioTransition,
} from "../lib/ttxTypes";

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
  tags: string[];
}

const MAX_TAG_LENGTH = 64;
const MAX_TAGS = 16;

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
    tags: [],
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
    tags: scenario.tags ?? [],
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
  const tags = Array.from(new Set(draft.tags.map((t) => t.trim()).filter(Boolean)));
  return {
    ...(draft.id ? { id: draft.id } : {}),
    title: draft.title.trim(),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    roles,
    entry: draft.entry,
    nodes,
    ...(tags.length > 0 ? { tags } : {}),
  };
}

// Structural pre-check only — does this file even look like an export
// blob (right top-level fields, right types)? Real validation (schema,
// deterministic-only graph, signature) happens server-side in
// worker/localScenarioRoutes.ts's handleImport; this just avoids showing
// a preview for something that obviously isn't an export blob at all.
function looksLikeExportBlob(value: unknown): value is TtxScenarioExportBlob {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.version === "number" &&
    typeof record.title === "string" &&
    typeof record.entry === "string" &&
    typeof record.nodes === "object" &&
    record.nodes !== null &&
    typeof record.signature === "string"
  );
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

  // Phase 29 — tags are purely descriptive, authoring-plane-only
  // organization/filtering; nothing here reaches the session engine.
  const [tagFilter, setTagFilter] = useState("");
  const allTags = useMemo(
    () => Array.from(new Set(localScenarios.flatMap((s) => s.tags ?? []))).sort(),
    [localScenarios],
  );
  const filteredScenarios = useMemo(
    () => (tagFilter ? localScenarios.filter((s) => (s.tags ?? []).includes(tagFilter)) : localScenarios),
    [localScenarios, tagFilter],
  );

  const [draft, setDraft] = useState<Draft | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tagInputError, setTagInputError] = useState<string | null>(null);

  const isEditing = draft?.id !== undefined;

  function startCreate() {
    setDraft(emptyDraft());
    setValidationError(null);
    setSubmitError(null);
    setTagInput("");
    setTagInputError(null);
  }

  function startEdit(scenario: TtxLocalScenario) {
    setDraft(draftFromScenario(scenario));
    setValidationError(null);
    setSubmitError(null);
    setTagInput("");
    setTagInputError(null);
  }

  function cancelEdit() {
    setDraft(null);
    setValidationError(null);
    setSubmitError(null);
    setTagInput("");
    setTagInputError(null);
  }

  // Normalizes to lowercase so "Fraud" and "fraud" are treated as the same
  // tag — consistent, not case-preserving, per the phase's "your choice,
  // but be consistent" instruction. Mirrors worker/scenarioManifest.ts's
  // length/count limits for immediate feedback; the Worker is still the
  // actual authority on submit.
  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    setTagInputError(null);
    if (!tag) return;
    if (tag.length > MAX_TAG_LENGTH) {
      setTagInputError(`Tags must be ${MAX_TAG_LENGTH} characters or fewer.`);
      return;
    }
    setDraft((prev) => {
      if (!prev) return prev;
      if (prev.tags.includes(tag)) {
        setTagInputError(`"${tag}" is already added.`);
        return prev;
      }
      if (prev.tags.length >= MAX_TAGS) {
        setTagInputError(`A scenario may have at most ${MAX_TAGS} tags.`);
        return prev;
      }
      return { ...prev, tags: [...prev.tags, tag] };
    });
    setTagInput("");
  }

  function removeTag(tag: string) {
    setDraft((prev) => (prev ? { ...prev, tags: prev.tags.filter((t) => t !== tag) } : prev));
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

  // --- Export / Import (Phase 28) ---
  const [exportError, setExportError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<TtxScenarioExportBlob | null>(null);
  const [importParseError, setImportParseError] = useState<string | null>(null);
  const [importSubmitError, setImportSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleExport(id: string, title: string) {
    setExportError(null);
    const response = await ttxLocalScenarioService.exportScenario(id);
    if (!response.ok) {
      setExportError(response.error);
      return;
    }
    const json = JSON.stringify(response.data, null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "scenario"}.ttx-scenario.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function openImport() {
    setShowImport(true);
    setImportPreview(null);
    setImportParseError(null);
    setImportSubmitError(null);
  }

  function cancelImport() {
    setShowImport(false);
    setImportPreview(null);
    setImportParseError(null);
    setImportSubmitError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileSelected(file: File) {
    setImportParseError(null);
    setImportSubmitError(null);
    setImportPreview(null);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!looksLikeExportBlob(parsed)) {
        setImportParseError("This file doesn't look like a scenario export.");
        return;
      }
      setImportPreview(parsed);
    } catch {
      setImportParseError("Couldn't parse this file as JSON.");
    }
  }

  // Explicit operator action — the file is only parsed for preview above;
  // nothing is imported until this button is clicked.
  async function handleImportConfirm() {
    if (!importPreview) return;
    setBusy(true);
    setImportSubmitError(null);
    const response = await ttxLocalScenarioService.importScenario(importPreview);
    if (response.ok) {
      cancelImport();
      await refreshLocal();
    } else {
      setImportSubmitError(response.error);
    }
    setBusy(false);
  }

  return (
    <div id="scenario-authoring-panel" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Scenario Authoring</h2>
        {!draft && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={openImport}
              className="text-[10px] uppercase tracking-widest text-op-accent hover:underline"
            >
              Import Scenario
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="text-[10px] uppercase tracking-widest text-op-accent hover:underline"
            >
              + New Scenario
            </button>
          </div>
        )}
      </div>

      {showImport && (
        <div className="mt-3 flex flex-col gap-2 rounded-sm border border-op-border-bright p-3">
          <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Import Scenario</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelected(file);
            }}
            className="text-xs text-op-text-dim file:mr-2 file:rounded-sm file:border file:border-op-border-bright file:bg-transparent file:px-2 file:py-1 file:text-[11px] file:uppercase file:tracking-widest file:text-op-text-dim"
          />

          {importParseError && <p className="text-[11px] italic text-op-danger">{importParseError}</p>}

          {importPreview && (
            <div className="rounded-sm border border-op-border-bright px-2.5 py-1.5 text-xs">
              <p className="text-op-text">{importPreview.title}</p>
              {importPreview.description && <p className="mt-0.5 text-[10px] text-op-text-dim">{importPreview.description}</p>}
              <p className="mt-0.5 text-[10px] text-op-text-dim/70">
                {Object.keys(importPreview.nodes).length} phases
                {importPreview.roles.length > 0 ? `, roles: ${importPreview.roles.join(", ")}` : ""} — exported{" "}
                {new Date(importPreview.exportedAt).toLocaleString()}
              </p>
            </div>
          )}

          {importSubmitError && <p className="text-[11px] italic text-op-danger">{importSubmitError}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !importPreview}
              onClick={handleImportConfirm}
              className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "importing…" : "Import"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={cancelImport}
              className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-danger/50 hover:text-op-danger disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {exportError && <p className="mt-2 text-[11px] italic text-op-danger">{exportError}</p>}

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
          {allTags.length > 0 && (
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Filter</span>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="op-panel rounded-sm px-1.5 py-1 text-xs text-op-text focus:border-op-accent/60 focus:outline-none"
              >
                <option value="">All tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              {tagFilter && (
                <button type="button" onClick={() => setTagFilter("")} className="text-[10px] text-op-accent hover:underline">
                  clear
                </button>
              )}
            </div>
          )}

          {filteredScenarios.length === 0 ? (
            <p className="text-xs italic text-op-text-dim">
              {localScenarios.length === 0 ? "No authored scenarios yet." : "No scenarios match this tag."}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {filteredScenarios.map((scenario) => (
                <li key={scenario.id} className="rounded-sm border border-op-border-bright px-2.5 py-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-op-text">{scenario.title}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleExport(scenario.id, scenario.title)}
                        className="text-op-accent hover:underline"
                      >
                        export
                      </button>
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
                  {scenario.tags && scenario.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {scenario.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-sm border border-op-border-bright px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-text-dim"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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
            <h4 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Tags</h4>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {draft.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-sm border border-op-border-bright px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-text-dim"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="text-op-danger hover:text-op-danger/70"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add a tag…"
                className={`${inputClass} w-32`}
              />
              <button type="button" onClick={addTag} className="text-[10px] text-op-accent hover:underline">
                Add tag
              </button>
            </div>
            {tagInputError && <p className="mt-1 text-[11px] italic text-op-danger">{tagInputError}</p>}
          </div>

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
