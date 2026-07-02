// Local, self-contained type mirroring src/lib/types.ts's CatalogItem shape.
// Not imported directly from src/ -- the Worker and app are separate
// TypeScript projects (tsconfig.worker.json doesn't include src/) by
// design, so this is a small deliberate duplication of a data contract,
// not shared logic.
export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  status?: string;
  price?: string | number;
  kind?: "product" | "content";
  service_tier?: string;
  compliance_tags?: string[];
  ttx_eligible?: boolean;
  deployment_target?: string;
  access_level?: string;
  source?: string;
  lastUpdated?: string;
  capabilities?: string[];
}

// Real, curated catalog data -- the first genuine backend content in this
// repo. Spans most of MARKETPLACE_CATEGORIES' tagMatch values so the
// existing filtering logic in CategoryPageBody actually has something to
// match against.
export const CATALOG_ITEMS: CatalogItem[] = [
  {
    id: "gear-001",
    name: "Operator Field Jacket",
    description: "Weatherproof field jacket, embroidered operator insignia.",
    tags: ["gear"],
    status: "active",
    price: "$120",
    kind: "product",
    access_level: "Public",
  },
  {
    id: "digital-001",
    name: "Cockpit Wallpaper Pack Vol. 1",
    description: "12 dark-theme wallpapers matching the operator aesthetic.",
    tags: ["digital", "digital-asset"],
    status: "active",
    price: "$8",
    kind: "product",
  },
  {
    id: "mission-001",
    name: "Perimeter Sweep — Standard",
    description: "Pre-built mission template for routine perimeter checks.",
    tags: ["mission", "mission-pack"],
    status: "active",
    price: "$25",
    kind: "product",
    service_tier: "standard",
    deployment_target: "cloud",
  },
  {
    id: "theme-001",
    name: "Signal Cyan Theme",
    description: "Alternate cockpit color scheme, cyan-forward palette.",
    tags: ["theme"],
    status: "active",
    price: "$5",
    kind: "product",
  },
  {
    id: "ai-architect-001",
    name: "Architect Prompt Kit — Recon",
    description: "Prompt and agent-config bundle for recon-focused Architect work.",
    tags: ["ai-architect", "architect-kit"],
    status: "active",
    price: "$40",
    kind: "content",
    capabilities: ["recon", "prompt-engineering"],
  },
  {
    id: "cockpit-hw-001",
    name: "Triple-Monitor Deck Recommendation",
    description: "Curated hardware list for a 3-monitor operator cockpit.",
    tags: ["hardware", "cockpit-hardware"],
    status: "active",
    kind: "content",
    source: "Operator Hardware Working Group",
    lastUpdated: "2026-05-14",
  },
  {
    id: "identity-001",
    name: "Callsign Card — Standard",
    description: "Printable operator identity card template.",
    tags: ["identity", "identity-asset"],
    status: "active",
    price: "$3",
    kind: "product",
    access_level: "Public",
  },
  {
    id: "ttx-001",
    name: "AI Supply Chain Compromise — Scenario Pack",
    description: "TTX scenario pack covering adversarial model injection via third-party APIs.",
    tags: ["ttx", "ttx-pack", "scenario-pack"],
    status: "active",
    price: "$60",
    kind: "product",
    ttx_eligible: true,
    service_tier: "premium",
    compliance_tags: ["NIST-relevant"],
  },
  {
    id: "governance-001",
    name: "Q3 Governance Metadata Briefing",
    description: "Operator-authored briefing on catalog governance metadata practices.",
    tags: ["governance", "briefing"],
    status: "active",
    kind: "content",
    source: "MatrixSecHub Governance Desk",
    lastUpdated: "2026-06-20",
    compliance_tags: ["internal-review"],
  },
  {
    id: "threat-intel-001",
    name: "Weekly Threat Landscape — Recon Division",
    description: "Recon-authored threat intelligence summary for operator review.",
    tags: ["threat-intel", "intelligence-report"],
    status: "active",
    kind: "content",
    access_level: "Operator",
    source: "Recon Suite",
    lastUpdated: "2026-06-28",
  },
];
