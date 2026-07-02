export interface Division {
  slug: string;
  name: string;
  codename: string;
  tone: "accent" | "accent-2" | "magenta" | "amber";
  summary: string;
  focus: string[];
}

export const DIVISIONS: Division[] = [
  {
    slug: "recon",
    name: "Recon",
    codename: "DIV-01 // RECON",
    tone: "accent",
    summary: "Forward intel gathering — scopes targets, surfaces signal, and feeds findings into the harness before anything is built.",
    focus: ["Target scoping", "Signal collection", "Pre-engagement intel"],
  },
  {
    slug: "analysis",
    name: "Analysis",
    codename: "DIV-02 // ANALYSIS",
    tone: "accent-2",
    summary: "Turns raw recon and telemetry into structured findings — risk scoring, pattern detection, and decision-ready reports.",
    focus: ["Risk scoring", "Pattern detection", "Reporting"],
  },
  {
    slug: "operations",
    name: "Operations",
    codename: "DIV-03 // OPERATIONS",
    tone: "magenta",
    summary: "Runs the pipeline — dispatches the Architect/Builder/Auditor chain and keeps missions moving from spec to ship.",
    focus: ["Pipeline execution", "Mission dispatch", "Live coordination"],
  },
  {
    slug: "archives",
    name: "Archives",
    codename: "DIV-04 // ARCHIVES",
    tone: "amber",
    summary: "Keeps the system's memory — logs, audit trails, past missions, and the doctrine that earlier operators wrote down.",
    focus: ["Audit trails", "Mission history", "Doctrine custody"],
  },
  {
    slug: "engineering",
    name: "Engineering",
    codename: "DIV-05 // ENGINEERING",
    tone: "accent",
    summary: "Owns the harness, engine, and cockpit codebase itself — the systems every other division runs on top of.",
    focus: ["Harness", "Engine", "Cockpit infrastructure"],
  },
  {
    slug: "commerce",
    name: "Commerce",
    codename: "DIV-06 // COMMERCE",
    tone: "accent-2",
    summary: "Runs the marketplace — catalog, pricing, scenario packs, and everything an operator can acquire through the storefront.",
    focus: ["Catalog", "Scenario packs", "Marketplace ops"],
  },
  {
    slug: "identity",
    name: "Identity",
    codename: "DIV-07 // IDENTITY",
    tone: "magenta",
    summary: "Maintains operator identity, credentials, and the MatrixSecHub brand and aesthetic doctrine across every surface.",
    focus: ["Operator identity", "Credentials", "Brand doctrine"],
  },
  {
    slug: "ai-security",
    name: "AI Security",
    codename: "DIV-08 // AI SECURITY",
    tone: "amber",
    summary: "Threat-models the system's own AI surfaces — agent permissions, prompt-injection exposure, and model-facing risk.",
    focus: ["Agent threat modeling", "Prompt-injection exposure", "Model-facing risk"],
  },
];

export function getDivision(slug: string): Division | undefined {
  return DIVISIONS.find((division) => division.slug === slug);
}
