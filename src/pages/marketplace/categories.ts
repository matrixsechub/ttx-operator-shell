export interface MarketplaceCategory {
  slug: string;
  label: string;
  description: string;
  tagMatch: string[];
  /** Product listings (gear, assets) vs. content listings (briefings, reports). Unset categories are treated as "product". */
  kind?: "product" | "content";
}

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  {
    slug: "gear",
    label: "Gear",
    description: "Operator-branded physical gear.",
    tagMatch: ["gear"],
  },
  {
    slug: "digital-assets",
    label: "Digital Assets",
    description: "Wallpapers, icon packs, and other digital-only assets.",
    tagMatch: ["digital", "digital-asset"],
  },
  {
    slug: "mission-packs",
    label: "Mission Packs",
    description: "Pre-built mission templates for the engine and harness.",
    tagMatch: ["mission", "mission-pack"],
  },
  {
    slug: "themes",
    label: "Themes",
    description: "Cockpit color schemes and visual themes.",
    tagMatch: ["theme"],
  },
  {
    slug: "ai-architect-kits",
    label: "AI Architect Kits",
    description: "Prompt and agent-config kits for the Architect role.",
    tagMatch: ["ai-architect", "architect-kit"],
  },
  {
    slug: "retro-gaming-operator-packs",
    label: "Retro Gaming Operator Packs",
    description: "Retro-styled operator skins and HUD packs.",
    tagMatch: ["retro", "retro-gaming"],
  },
  {
    slug: "cockpit-hardware",
    label: "Cockpit Hardware",
    description: "Recommended monitors, decks, and peripherals for multi-monitor cockpits.",
    tagMatch: ["hardware", "cockpit-hardware"],
  },
  {
    slug: "identity-assets",
    label: "Identity Assets",
    description: "Operator badges, callsign cards, and identity assets.",
    tagMatch: ["identity", "identity-asset"],
  },
  {
    slug: "ttx-packs",
    label: "TTX Packs",
    description: "Tabletop exercise scenario packs, inject bundles, and division-specific TTX modules.",
    tagMatch: ["ttx", "ttx-pack", "scenario-pack"],
  },
  {
    slug: "governance-briefings",
    label: "Governance Briefings",
    description: "Operator-authored governance and compliance-metadata briefings.",
    tagMatch: ["governance", "briefing"],
    kind: "content",
  },
  {
    slug: "threat-intelligence-reports",
    label: "Threat Intelligence Reports",
    description: "Recon and threat-landscape reporting for operator review.",
    tagMatch: ["threat-intel", "intelligence-report"],
    kind: "content",
  },
];

export function getMarketplaceCategory(slug: string): MarketplaceCategory | undefined {
  return MARKETPLACE_CATEGORIES.find((category) => category.slug === slug);
}
