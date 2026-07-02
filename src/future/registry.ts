export interface FutureModule {
  slug: string;
  name: string;
  tagline: string;
  detail: string;
}

export const FUTURE_MODULES: FutureModule[] = [
  {
    slug: "ai-threat-lab",
    name: "AI Threat Lab",
    tagline: "Adversarial testing ground for the system's own AI surfaces.",
    detail: "Sandboxed environment for red-teaming agent permissions, prompt-injection paths, and model-facing attack surface before they reach production.",
  },
  {
    slug: "operator-academy",
    name: "Operator Academy",
    tagline: "Onboarding and training for new operators.",
    detail: "Structured courses and walkthroughs covering the harness, the divisions, and operator doctrine — for operators joining after Phase 1.",
  },
  {
    slug: "operator-social-graph",
    name: "Operator Social Graph",
    tagline: "Maps relationships between operators, divisions, and missions.",
    detail: "Who worked which mission, which division, with which other operators — a graph view over the audit trail Archives already keeps.",
  },
  {
    slug: "operator-reputation-system",
    name: "Operator Reputation System",
    tagline: "Tracks operator track record across missions.",
    detail: "Reputation derived from audited mission outcomes, not self-reported claims — feeds back into mission assignment.",
  },
  {
    slug: "mission-economy",
    name: "Mission Economy",
    tagline: "Pricing and value exchange for missions and scenario packs.",
    detail: "Economic layer over the marketplace — mission bounties, scenario pack royalties, and operator compensation.",
  },
  {
    slug: "cloudflare-mesh",
    name: "Cloudflare Mesh",
    tagline: "Multi-Worker mesh for distributed harness execution.",
    detail: "Coordinates multiple Workers and Durable Objects across regions, beyond the single-Worker storefront this repo currently is.",
  },
  {
    slug: "operator-ai-companion",
    name: "Operator AI Companion",
    tagline: "A persistent AI presence inside the cockpit itself.",
    detail: "An in-cockpit assistant with context on the operator's missions, divisions, and history — distinct from the AI Node Console's tool status view.",
  },
];

export function getFutureModule(slug: string): FutureModule | undefined {
  return FUTURE_MODULES.find((module) => module.slug === slug);
}
