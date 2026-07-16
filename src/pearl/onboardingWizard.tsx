/**
 * PEARL-SPECTRAL — ONBOARDING WIZARD (Track 5, live)
 * ---------------------------------------------------------------------------
 * The 5-step guided onboarding wizard, mounted at /onboarding on the
 * ecosystem surface (replaces the static pager). Option B is structural:
 * step 1 is CAPTURE — qualification questions only ever follow capture.
 *
 *   Step 1  Contact      AURELIUS   POST /api/register (existing contract)
 *   Step 2  Objective    AURELIUS   evidence: answer(objective)
 *   Step 3  Context      AURELIUS   evidence: answer(team_size)
 *   Step 4  Blueprint    BEACON     evidence: route_shown (recommendation)
 *   Step 5  Activation   OPERATOR   evidence: upgrade_decision + checklist
 *
 * Stage → entity voice comes from STAGE_VOICE via the qualification
 * runtime; every transition emits PRISM capture. Wizard primitives are
 * the promoted Track 3 components (WizardPrimitives/ChecklistPrimitives).
 * Token discipline: op-* / entity-* utilities only.
 */

import { useCallback, useMemo, useState } from "react";
import { EntityVoice, type EntityName } from "../components/EntityVoice";
import { recordFlowEvent } from "../lib/flowTracker";
import { getOrCreateSessionId } from "../lib/usageBeacon";
import {
  nextStep,
  prevStep,
  ObjectiveRadioGroup,
  StepFrame,
  WizardProgressRail,
  type WizardStepState,
} from "./WizardPrimitives";
import { ActivationChecklist, type ChecklistItemDef } from "./ChecklistPrimitives";
import type { SubscriptionTier } from "./qualificationContract";

const WIZARD_STEPS = [
  { id: "contact", label: "Contact" },
  { id: "objective", label: "Objective" },
  { id: "context", label: "Context" },
  { id: "blueprint", label: "Blueprint" },
  { id: "activation", label: "Activation" },
] as const;

const STEP_VOICE: readonly EntityName[] = ["aurelius", "aurelius", "aurelius", "beacon", "operator"];

const OBJECTIVES = [
  { id: "efficiency", label: "Improve efficiency / reduce manual work" },
  { id: "security", label: "Enhance security / reduce risk" },
  { id: "integration", label: "Integrate systems or data" },
  { id: "ai-build", label: "Build or deploy AI capabilities" },
  { id: "other", label: "Something else" },
] as const;

const TEAM_SIZES = [
  { id: "solo", label: "Just me" },
  { id: "team", label: "A team (2–20)" },
  { id: "org", label: "An organization (20+)" },
] as const;

/** Mission-path recommendation (ROUTE payload) from Option B answers. */
export function recommendPath(objective: string, teamSize: string): { path: string; tier: SubscriptionTier } {
  const path =
    objective === "efficiency"
      ? "ai-automation"
      : objective === "security"
        ? "cybersecurity"
        : objective === "integration"
          ? "data-integration"
          : objective === "ai-build"
            ? "ai-agents"
            : "consulting";
  const tier: SubscriptionTier = teamSize === "org" ? "ops-division" : "operator";
  return { path, tier };
}

const CAPTURE_STORAGE_KEY = "msh_pearl_capture_id";

function storedCaptureId(): string | null {
  try {
    return sessionStorage.getItem(CAPTURE_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function postEvidence(
  captureId: string,
  kind: string,
  data: Record<string, unknown>,
): Promise<void> {
  await fetch("/api/qualification/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ captureId, kind, data, sessionId: getOrCreateSessionId() }),
  }).catch(() => {
    // Evidence is append-only and recomputable; a lost item degrades the
    // snapshot, never the visitor's flow.
  });
}

export function OnboardingWizard() {
  const [steps, setSteps] = useState<WizardStepState>({ steps: [...WIZARD_STEPS], activeIndex: 0 });
  const [captureId, setCaptureId] = useState<string | null>(storedCaptureId);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [objective, setObjective] = useState<string | null>(null);
  const [teamSize, setTeamSize] = useState<string | null>(null);
  const [decision, setDecision] = useState<"accept" | "defer" | null>(null);

  const active = steps.activeIndex;
  const voice = STEP_VOICE[active];

  const advance = useCallback(
    (fromStepId: string) => {
      recordFlowEvent("cta_click", { ctaId: `onboarding-wizard-${fromStepId}-next` });
      setSteps((current) => nextStep(current));
    },
    [],
  );

  const retreat = useCallback(() => {
    recordFlowEvent("cta_click", { ctaId: `onboarding-wizard-step-${active + 1}-back` });
    setSteps((current) => prevStep(current));
  }, [active]);

  /* ── Step 1: capture (Option B — the lifecycle starts here) ─────────── */
  const submitCapture = useCallback(async () => {
    if (captureId) {
      advance("contact");
      return;
    }
    if (!consent || !/.+@.+\..+/.test(email)) {
      setCaptureError(consent ? "Enter a valid email address." : "Consent is required to continue.");
      return;
    }
    setCapturing(true);
    setCaptureError(null);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, email, role: "onboarding", reason: "onboarding wizard capture" }),
      });
      const payload = (await response.json()) as { register_id?: string; error?: string };
      if (!response.ok || !payload.register_id) {
        setCaptureError(payload.error ?? "Registration is temporarily unavailable.");
        return;
      }
      try {
        sessionStorage.setItem(CAPTURE_STORAGE_KEY, payload.register_id);
      } catch {
        // storage unavailable — lifecycle still works for this page view
      }
      setCaptureId(payload.register_id);
      await postEvidence(payload.register_id, "surface_visit", { page: "/onboarding" });
      recordFlowEvent("form_submit", { formId: "onboarding-wizard-capture" });
      advance("contact");
    } catch {
      setCaptureError("Registration is not reachable.");
    } finally {
      setCapturing(false);
    }
  }, [advance, captureId, consent, email, name]);

  /* ── Steps 2–3: qualification answers (after capture, never before) ─── */
  const submitAnswer = useCallback(
    async (questionId: string, answer: string, stepId: string) => {
      if (captureId) await postEvidence(captureId, "answer", { questionId, answer });
      advance(stepId);
    },
    [advance, captureId],
  );

  const recommendation = useMemo(
    () => recommendPath(objective ?? "other", teamSize ?? "solo"),
    [objective, teamSize],
  );

  /* ── Step 4: blueprint shown (ROUTE evidence) ───────────────────────── */
  const confirmBlueprint = useCallback(async () => {
    if (captureId) {
      await postEvidence(captureId, "route_shown", {
        recommendedPath: recommendation.path,
        recommendedTier: recommendation.tier,
      });
    }
    advance("blueprint");
  }, [advance, captureId, recommendation]);

  /* ── Step 5: activation decision (UPGRADE evidence) ─────────────────── */
  const submitDecision = useCallback(
    async (choice: "accept" | "defer") => {
      setDecision(choice);
      recordFlowEvent("cta_click", { ctaId: `onboarding-wizard-decision-${choice}` });
      if (captureId) {
        await postEvidence(captureId, "upgrade_decision", {
          decision: choice === "accept" ? "accept" : "defer",
          tier: choice === "accept" ? recommendation.tier : "access",
        });
      }
    },
    [captureId, recommendation.tier],
  );

  const checklist: ChecklistItemDef[] = [
    { id: "account", label: "Contact captured", status: captureId ? "complete" : "active" },
    { id: "objective", label: "Objective recorded", status: objective ? "complete" : active >= 1 ? "active" : "pending" },
    { id: "context", label: "Context recorded", status: teamSize ? "complete" : active >= 2 ? "active" : "pending" },
    { id: "blueprint", label: "System blueprint", status: active >= 4 ? "complete" : active >= 3 ? "active" : "pending" },
    {
      id: "access",
      label: "Access decision",
      status: decision ? "complete" : active >= 4 ? "active" : "pending",
      note: decision === "accept" ? recommendation.tier.toUpperCase() : decision === "defer" ? "ACCESS" : undefined,
    },
  ];
  const progressPercent = (checklist.filter((item) => item.status === "complete").length / checklist.length) * 100;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-6 py-10">
      <header>
        <p className="text-[11px] uppercase tracking-[0.4em] text-op-text-dim">MSH OPS // Onboarding</p>
        <h1 className="mt-2 text-lg uppercase tracking-widest text-op-accent">Let's understand your mission.</h1>
        <EntityVoice entity={voice}>
          {voice === "aurelius" && "your answers shape the guided path — nothing is committed without you."}
          {voice === "beacon" && "the blueprint below is a governed recommendation, never a wall."}
          {voice === "operator" && "the decision is yours; the system executes and reports."}
        </EntityVoice>
      </header>

      <WizardProgressRail state={steps} />

      {active === 0 && (
        <StepFrame title="Where should we send your mission blueprint?">
          <label className="flex flex-col gap-1 text-sm text-op-text">
            Name <span className="text-[10px] uppercase tracking-wider text-op-text-dim">(optional)</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              className="rounded-sm border border-op-border bg-op-bg px-3 py-2 text-sm text-op-text outline-none focus-visible:border-op-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-op-text">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="rounded-sm border border-op-border bg-op-bg px-3 py-2 text-sm text-op-text outline-none focus-visible:border-op-accent"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-op-text-dim">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            I agree to receive onboarding updates. Capture first, questions after — you can stop anytime.
          </label>
          {captureError && <p className="text-xs text-op-danger">{captureError}</p>}
          <button
            type="button"
            data-flow-cta="onboarding-wizard-capture-continue"
            onClick={() => void submitCapture()}
            disabled={capturing}
            className="self-start rounded-sm border border-op-accent/60 bg-op-accent/10 px-4 py-2 text-xs uppercase tracking-widest text-op-accent transition-colors hover:bg-op-accent/20 disabled:opacity-50"
          >
            {capturing ? "Capturing…" : captureId ? "Continue" : "Continue →"}
          </button>
        </StepFrame>
      )}

      {active === 1 && (
        <StepFrame title="What is your primary objective?">
          <ObjectiveRadioGroup
            name="onboarding-objective"
            legend="Select the mission that fits best."
            options={OBJECTIVES}
            value={objective}
            onChange={setObjective}
          />
        </StepFrame>
      )}

      {active === 2 && (
        <StepFrame title="Who is on this mission?">
          <ObjectiveRadioGroup
            name="onboarding-team-size"
            legend="Team context calibrates the blueprint."
            options={TEAM_SIZES}
            value={teamSize}
            onChange={setTeamSize}
          />
        </StepFrame>
      )}

      {active === 3 && (
        <StepFrame title="Your system blueprint">
          <p className="text-sm text-op-text">
            Recommended mission path: <span className="text-entity-aurelius">{recommendation.path}</span>
          </p>
          <p className="text-sm text-op-text">
            Recommended tier: <span className="text-entity-aurelius">{recommendation.tier.toUpperCase()}</span>
          </p>
          <p className="text-xs text-op-text-dim">
            Derived from your objective and team context. You can choose a lower tier at any time — the
            recommendation never blocks you.
          </p>
        </StepFrame>
      )}

      {active === 4 && (
        <StepFrame title="Activate your ecosystem">
          <ActivationChecklist items={checklist} percent={progressPercent} />
          {!decision && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                data-flow-cta="onboarding-wizard-accept-tier"
                onClick={() => void submitDecision("accept")}
                className="rounded-sm border border-op-accent/60 bg-op-accent/10 px-4 py-2 text-xs uppercase tracking-widest text-op-accent hover:bg-op-accent/20"
              >
                Proceed toward {recommendation.tier.toUpperCase()}
              </button>
              <button
                type="button"
                data-flow-cta="onboarding-wizard-defer-tier"
                onClick={() => void submitDecision("defer")}
                className="rounded-sm border border-op-border-bright px-4 py-2 text-xs uppercase tracking-widest text-op-text-dim hover:border-op-accent/50 hover:text-op-accent"
              >
                Stay on ACCESS for now
              </button>
            </div>
          )}
          {decision && (
            <div className="flex flex-wrap gap-3">
              <a
                href="/marketplace"
                data-flow-cta="onboarding-wizard-explore-marketplace"
                className="rounded-sm border border-op-accent/60 bg-op-accent/10 px-4 py-2 text-xs uppercase tracking-widest text-op-accent hover:bg-op-accent/20"
              >
                Explore Marketplace
              </a>
              <a
                href="/login"
                data-flow-cta="onboarding-wizard-enter-cockpit"
                className="rounded-sm border border-op-border-bright px-4 py-2 text-xs uppercase tracking-widest text-op-text-dim hover:border-op-accent/50 hover:text-op-accent"
              >
                Operator Login
              </a>
            </div>
          )}
        </StepFrame>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={retreat}
          disabled={active === 0}
          className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/50 hover:text-op-accent disabled:opacity-40"
        >
          Previous
        </button>
        {active === 1 && (
          <button
            type="button"
            data-flow-cta="onboarding-wizard-objective-continue"
            onClick={() => objective && void submitAnswer("objective", objective, "objective")}
            disabled={!objective}
            className="rounded-sm border border-op-accent/60 bg-op-accent/10 px-4 py-2 text-xs uppercase tracking-widest text-op-accent hover:bg-op-accent/20 disabled:opacity-40"
          >
            Continue
          </button>
        )}
        {active === 2 && (
          <button
            type="button"
            data-flow-cta="onboarding-wizard-context-continue"
            onClick={() => teamSize && void submitAnswer("team_size", teamSize, "context")}
            disabled={!teamSize}
            className="rounded-sm border border-op-accent/60 bg-op-accent/10 px-4 py-2 text-xs uppercase tracking-widest text-op-accent hover:bg-op-accent/20 disabled:opacity-40"
          >
            Continue
          </button>
        )}
        {active === 3 && (
          <button
            type="button"
            data-flow-cta="onboarding-wizard-blueprint-continue"
            onClick={() => void confirmBlueprint()}
            className="rounded-sm border border-op-accent/60 bg-op-accent/10 px-4 py-2 text-xs uppercase tracking-widest text-op-accent hover:bg-op-accent/20"
          >
            Looks right →
          </button>
        )}
      </div>
    </main>
  );
}
