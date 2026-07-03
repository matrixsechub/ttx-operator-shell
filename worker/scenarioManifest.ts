// Scenario graph definitions for the TTX scenario engine (Phase 25).
// Source of truth for phase/inject/branching content — the frontend never
// hardcodes this, it only ever sees what /api/ttx/sessions/* returns (see
// worker/ttx.ts). This supersedes Phase 24's single hardcoded 3-phase
// scenario; SCENARIO_DEFINITIONS carries that same content forward as
// "baseline-01" so nothing operators already ran disappears.
//
// Two scope decisions, both driven by SCOPE-LOCK.md (which retires RBAC
// and any "inject sequencing engine" beyond a real TTX data model):
// - Deterministic only. Every transition is either an automatic single-
//   path advance or an explicit operator choice — never random/weighted.
//   There is no probabilistic branching here.
// - `role` is a display-only tag on a node (which "voice" an inject is
//   framed as — e.g. ops vs leadership). It is never used to hide or
//   restrict content from anyone; every operator sees every node. This
//   mirrors how `access_level`/`compliance_tags` already work on
//   CatalogItem — a label, not an enforcement mechanism.
//
// Phase 26 adds operator-authored scenarios (see worker/localScenarioRoutes.ts)
// using this exact same shape, persisted in KV rather than hardcoded here —
// `description` below exists for their benefit (the builtins don't need it).
// validateScenarioDefinition is the gate every authored scenario passes
// through before being stored: it strictly allow-lists fields (rejecting
// any payload that tries to smuggle in a probability/weight field on a
// transition, keeping "deterministic only" true by construction, not just
// by convention) and defers structural graph checks to
// scenarioGraph.ts's validateScenarioGraph.
//
// Phase 29 adds `tags` — purely descriptive labels for authoring-plane
// organization/filtering, same "display-only, never enforced" status as
// `role` above. Builtins never carry tags (there's no authoring UI for
// them, and nothing here adds tags to SCENARIO_DEFINITIONS); tags only
// ever come from an authored scenario's create/update/import payload.
//
// Phase 30 adds `notes` — free-text operator commentary, same non-
// executable, authoring-plane-only status as `tags`. Never read by the
// session engine (worker/ttx.ts never looks at it), never exported to the
// SaaS scaffold, builtins never carry it.

import { validateScenarioGraph } from "./scenarioGraph";

export interface ScenarioTransition {
  choice: string;
  label: string;
  next: string;
}

export interface ScenarioNode {
  id: string;
  title: string;
  inject: string;
  role?: string;
  transitions: ScenarioTransition[];
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  description?: string;
  roles: string[];
  entry: string;
  nodes: Record<string, ScenarioNode>;
  tags?: string[];
  notes?: string;
}

export const SCENARIO_DEFINITIONS: Record<string, ScenarioDefinition> = {
  "baseline-01": {
    id: "baseline-01",
    title: "Baseline Scenario",
    roles: [],
    entry: "phase1",
    nodes: {
      phase1: {
        id: "phase1",
        title: "Initial Inject",
        inject: "Market volatility begins.",
        transitions: [{ choice: "default", label: "Continue", next: "phase2" }],
      },
      phase2: {
        id: "phase2",
        title: "Escalation",
        inject: "Liquidity crunch detected.",
        transitions: [{ choice: "default", label: "Continue", next: "phase3" }],
      },
      phase3: {
        id: "phase3",
        title: "Critical Event",
        inject: "Counterparty default risk rising.",
        transitions: [],
      },
    },
  },
  "branching-01": {
    id: "branching-01",
    title: "Liquidity Crisis (Branching)",
    roles: ["ops", "leadership"],
    entry: "assess",
    nodes: {
      assess: {
        id: "assess",
        title: "Initial Assessment",
        inject: "Market volatility begins. A liquidity gap is forming.",
        transitions: [
          { choice: "contain", label: "Attempt containment", next: "contain" },
          { choice: "escalate", label: "Escalate to leadership", next: "escalate" },
        ],
      },
      contain: {
        id: "contain",
        title: "Containment",
        inject: "Containment measures buy time, but the gap persists.",
        role: "ops",
        transitions: [{ choice: "default", label: "Continue", next: "resolve" }],
      },
      escalate: {
        id: "escalate",
        title: "Escalation",
        inject: "Leadership is briefed; liquidity crunch confirmed organization-wide.",
        role: "leadership",
        transitions: [{ choice: "default", label: "Continue", next: "resolve" }],
      },
      resolve: {
        id: "resolve",
        title: "Resolution",
        inject: "Incident resolved and logged for after-action review.",
        transitions: [],
      },
    },
  },
};

export interface ScenarioValidationOptions {
  requireId: boolean;
}

export type ScenarioValidationResult = { ok: true; value: ScenarioDefinition } | { ok: false; error: string };

const ALLOWED_SCENARIO_FIELDS = new Set(["id", "title", "description", "roles", "entry", "nodes", "tags", "notes"]);
const ALLOWED_NODE_FIELDS = new Set(["id", "title", "inject", "role", "transitions"]);
const ALLOWED_TRANSITION_FIELDS = new Set(["choice", "label", "next"]);
const MAX_TAG_LENGTH = 64;
const MAX_TAGS = 16;
const MAX_NOTES_LENGTH = 5000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyAllowedFields(obj: Record<string, unknown>, allowed: Set<string>): boolean {
  return Object.keys(obj).every((key) => allowed.has(key));
}

// Gate every authored scenario passes through before being stored (see
// worker/localScenarioRoutes.ts). Strictly allow-lists fields at every
// level — a payload that adds e.g. `probability` or `weight` to a
// transition is rejected outright, not silently ignored, so "deterministic
// only" holds by construction. Structural checks (dangling edges, no
// terminal node) are delegated to scenarioGraph.ts's validateScenarioGraph.
export function validateScenarioDefinition(input: unknown, options: ScenarioValidationOptions): ScenarioValidationResult {
  if (!isPlainObject(input)) return { ok: false, error: "Scenario must be an object" };
  if (!hasOnlyAllowedFields(input, ALLOWED_SCENARIO_FIELDS)) {
    return {
      ok: false,
      error: "Scenario contains unsupported fields (deterministic-only: no probability/weight fields allowed)",
    };
  }

  if (options.requireId && (typeof input.id !== "string" || !input.id.trim())) {
    return { ok: false, error: "id is required" };
  }
  if (typeof input.title !== "string" || !input.title.trim()) return { ok: false, error: "title is required" };
  if (input.description !== undefined && typeof input.description !== "string") {
    return { ok: false, error: "description must be a string" };
  }
  if (input.roles !== undefined && (!Array.isArray(input.roles) || !input.roles.every((role) => typeof role === "string"))) {
    return { ok: false, error: "roles must be an array of strings" };
  }
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags)) return { ok: false, error: "tags must be an array of strings" };
    if (input.tags.length > MAX_TAGS) return { ok: false, error: `A scenario may have at most ${MAX_TAGS} tags` };
    for (const tag of input.tags) {
      if (typeof tag !== "string" || !tag.trim()) return { ok: false, error: "tags must be non-empty strings" };
      if (tag.length > MAX_TAG_LENGTH) return { ok: false, error: `Tags must be ${MAX_TAG_LENGTH} characters or fewer` };
    }
  }
  if (input.notes !== undefined) {
    if (typeof input.notes !== "string") return { ok: false, error: "notes must be a string" };
    if (input.notes.trim().length > MAX_NOTES_LENGTH) {
      return { ok: false, error: `notes must be ${MAX_NOTES_LENGTH} characters or fewer` };
    }
  }
  if (typeof input.entry !== "string" || !input.entry.trim()) return { ok: false, error: "entry is required" };
  if (!isPlainObject(input.nodes) || Object.keys(input.nodes).length === 0) {
    return { ok: false, error: "nodes must be a non-empty object" };
  }

  const nodes: Record<string, ScenarioNode> = {};
  for (const [nodeId, rawNode] of Object.entries(input.nodes)) {
    if (!isPlainObject(rawNode) || !hasOnlyAllowedFields(rawNode, ALLOWED_NODE_FIELDS)) {
      return { ok: false, error: `Node "${nodeId}" has an invalid shape` };
    }
    if (typeof rawNode.id !== "string" || rawNode.id !== nodeId) {
      return { ok: false, error: `Node "${nodeId}" id must match its key` };
    }
    if (typeof rawNode.title !== "string" || !rawNode.title.trim()) {
      return { ok: false, error: `Node "${nodeId}" is missing a title` };
    }
    if (typeof rawNode.inject !== "string" || !rawNode.inject.trim()) {
      return { ok: false, error: `Node "${nodeId}" is missing inject text` };
    }
    if (rawNode.role !== undefined && typeof rawNode.role !== "string") {
      return { ok: false, error: `Node "${nodeId}" role must be a string` };
    }
    if (!Array.isArray(rawNode.transitions)) {
      return { ok: false, error: `Node "${nodeId}" transitions must be an array` };
    }

    const transitions: ScenarioTransition[] = [];
    for (const rawTransition of rawNode.transitions) {
      if (!isPlainObject(rawTransition) || !hasOnlyAllowedFields(rawTransition, ALLOWED_TRANSITION_FIELDS)) {
        return { ok: false, error: `Node "${nodeId}" has a transition with an invalid shape (deterministic-only)` };
      }
      if (typeof rawTransition.choice !== "string" || !rawTransition.choice.trim()) {
        return { ok: false, error: `Node "${nodeId}" has a transition missing "choice"` };
      }
      if (typeof rawTransition.label !== "string" || !rawTransition.label.trim()) {
        return { ok: false, error: `Node "${nodeId}" has a transition missing "label"` };
      }
      if (typeof rawTransition.next !== "string" || !rawTransition.next.trim()) {
        return { ok: false, error: `Node "${nodeId}" has a transition missing "next"` };
      }
      transitions.push({ choice: rawTransition.choice, label: rawTransition.label, next: rawTransition.next });
    }

    nodes[nodeId] = {
      id: rawNode.id,
      title: rawNode.title,
      inject: rawNode.inject,
      ...(typeof rawNode.role === "string" ? { role: rawNode.role } : {}),
      transitions,
    };
  }

  const scenario: ScenarioDefinition = {
    id: options.requireId ? (input.id as string) : "", // filled in by the caller (create generates a fresh id)
    title: input.title,
    ...(typeof input.description === "string" ? { description: input.description } : {}),
    roles: Array.isArray(input.roles) ? (input.roles as string[]) : [],
    entry: input.entry,
    nodes,
    ...(Array.isArray(input.tags) ? { tags: (input.tags as string[]).map((tag) => tag.trim()) } : {}),
    ...(typeof input.notes === "string" ? { notes: input.notes.trim() } : {}),
  };

  const graphCheck = validateScenarioGraph(scenario);
  if (!graphCheck.ok) return { ok: false, error: graphCheck.error };

  return { ok: true, value: scenario };
}
