/**
 * PEARL-SPECTRAL — WIZARD PRIMITIVES (Track 3 scaffold, non-production)
 * ---------------------------------------------------------------------------
 * Presentational primitives extracted ahead of the Track 2 structural
 * rebuild (WIZARD-SCAFFOLD.md). Nothing routes to these components and no
 * live surface imports them. They are deliberately CONTROLLED components:
 * all state lives in the caller, so no wizard *logic* ships here — only
 * the rendering vocabulary the future wizard will use.
 *
 * Token discipline: op-* / entity-* utilities only (brand lint R9–R11).
 * The reference design is board frame ③ ("Let's understand your mission",
 * STEP 2 OF 5) rendered in the operator token system until the pearl
 * theme lands.
 */

import type { ReactNode } from "react";

/** Immutable description of a wizard's steps. */
export interface WizardStepDef {
  id: string;
  label: string;
}

/** Caller-owned step position (see wizardStepState helpers). */
export interface WizardStepState {
  steps: readonly WizardStepDef[];
  activeIndex: number;
}

/** Pure helpers — no persistence, no navigation, no side effects. */
export function nextStep(state: WizardStepState): WizardStepState {
  return state.activeIndex >= state.steps.length - 1
    ? state
    : { ...state, activeIndex: state.activeIndex + 1 };
}

export function prevStep(state: WizardStepState): WizardStepState {
  return state.activeIndex <= 0 ? state : { ...state, activeIndex: state.activeIndex - 1 };
}

/** Progress rail — "STEP 2 OF 5" + segment bar (board frame ③). */
export function WizardProgressRail({ state }: { state: WizardStepState }) {
  const { steps, activeIndex } = state;
  return (
    <div aria-label={`Step ${activeIndex + 1} of ${steps.length}`}>
      <p className="text-[10px] uppercase tracking-widest text-op-text-dim">
        Step {activeIndex + 1} of {steps.length}
      </p>
      <div className="mt-1 flex gap-1" role="presentation">
        {steps.map((step, index) => (
          <span
            key={step.id}
            className={`h-1 flex-1 rounded-sm ${
              index < activeIndex
                ? "bg-entity-aurelius"
                : index === activeIndex
                  ? "bg-entity-ghost"
                  : "bg-op-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/** One objective choice (board frame ③ radio list). */
export interface ObjectiveOption {
  id: string;
  label: string;
}

/**
 * Objective radio group — fully controlled; selection handling belongs to
 * the caller. Keyboard/focus behavior is native radio semantics.
 */
export function ObjectiveRadioGroup({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: readonly ObjectiveOption[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-op-text">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.id}
          className={`flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 text-sm transition-colors ${
            value === option.id
              ? "border-op-accent/60 bg-op-accent/10 text-op-accent"
              : "border-op-border text-op-text hover:border-op-accent/40"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={option.id}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
            className="accent-current"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

/** Frame for a single wizard step's content. */
export function StepFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="op-panel flex flex-col gap-4 rounded-sm p-6">
      <h2 className="text-sm uppercase tracking-widest text-op-accent">{title}</h2>
      {children}
    </section>
  );
}
