/**
 * PEARL-SPECTRAL — ENTITY NAMES (shared, dependency-free)
 * ---------------------------------------------------------------------------
 * Single source of truth for the entity cast's names. Lives in a pure .ts
 * module with zero imports so BOTH TypeScript projects can consume it:
 * the app (EntityVoice component, wizard) and the worker (qualification
 * runtime), whose tsconfig cannot include .tsx files.
 */
export type EntityName = "beacon" | "aurelius" | "hsx" | "ghost" | "operator";
