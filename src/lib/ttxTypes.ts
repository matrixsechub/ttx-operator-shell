// Types for the minimal TTX scenario engine scaffolding (Phase 24) — not
// to be confused with src/operator/ttx/types.ts, which models the
// separate, richer "TTX SaaS" scenario-builder scaffold (scenarios/roles/
// scoring/injects, still proxied to an Engine that doesn't exist yet).
// This module is a single hardcoded scenario walked as a linear phase
// state machine, backed by a real Worker + KV namespace.
export interface TtxPhaseState {
  phase: string | null;
  title: string | null;
  phaseIndex: number;
  inject: string | null;
  done: boolean;
  total: number;
}
