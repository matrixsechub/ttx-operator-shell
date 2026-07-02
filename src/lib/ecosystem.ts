// Cross-reference graph wiring divisions, operator systems, marketplace
// categories, future modules, and dashboard panels into one ecosystem.
// Every entry here points at a slug that already exists in its source
// registry (src/pages/divisions/data.ts, src/operator/registry.ts,
// src/pages/marketplace/categories.ts, src/future/registry.ts) — this file
// only links things, it doesn't introduce new entities.
import { DIVISIONS } from "../pages/divisions/data";
import { OPERATOR_SYSTEMS } from "../operator/registry";
import { MARKETPLACE_CATEGORIES, type MarketplaceCategory } from "../pages/marketplace/categories";
import { FUTURE_MODULES } from "../future/registry";
import type { RelatedLink } from "../components/RelatedLinksRail";

interface WidgetRef {
  label: string;
  anchor: string;
}

const DOCTRINE_LINK: RelatedLink = { label: "Operator Doctrine", to: "/about#operator-doctrine" };

// Division -> Operator Systems
const DIVISION_SYSTEMS: Record<string, string[]> = {
  recon: ["recon", "signals", "hunter"],
  analysis: ["analyzer"],
  operations: ["workflow", "missions"],
  archives: [],
  engineering: ["terminal", "perimeter", "sandbox", "health"],
  commerce: [],
  identity: ["vault"],
  "ai-security": ["ai-security"],
};

// Division -> Dashboard / cockpit panels (used where no system covers it,
// or as a clean extra alongside one that does)
const DIVISION_WIDGETS: Record<string, WidgetRef[]> = {
  archives: [{ label: "Operator Logbook", anchor: "operator-logbook" }],
  operations: [{ label: "Mission Board", anchor: "mission-board" }],
  commerce: [{ label: "Operator Inventory", anchor: "operator-inventory" }],
};

// Commerce division owns the marketplace itself, not a single category
const DIVISION_MARKETPLACE: Record<string, RelatedLink> = {
  commerce: { label: "Marketplace", to: "/marketplace" },
};

// Divisions with an active TTX SaaS hook
const DIVISION_TTX: string[] = ["operations", "engineering"];

// Operator System -> Marketplace category
const SYSTEM_MARKETPLACE_CATEGORY: Record<string, string> = {
  missions: "mission-packs",
  vault: "identity-assets",
  terminal: "ai-architect-kits",
  "ai-security": "ai-architect-kits",
  recon: "threat-intelligence-reports",
};

// Operator System -> Dashboard / cockpit panels
const SYSTEM_WIDGETS: Record<string, WidgetRef[]> = {
  missions: [{ label: "Mission Board", anchor: "mission-board" }],
  "ai-security": [{ label: "AI Node Console", anchor: "ai-node-console" }],
  vault: [{ label: "Operator Inventory", anchor: "operator-inventory" }],
  workflow: [{ label: "Operator Status Rail", anchor: "operator-status-rail" }],
  health: [
    { label: "Telemetry Rails", anchor: "telemetry-rails" },
    { label: "Alert System", anchor: "alert-system" },
  ],
};

// Future module -> existing ecosystem entities
const FUTURE_RELATED: Record<string, RelatedLink[]> = {
  "ai-threat-lab": [
    { label: "AI Security Architect Rail", to: "/systems/ai-security" },
    { label: "AI Security Division", to: "/divisions/ai-security" },
  ],
  "operator-academy": [DOCTRINE_LINK],
  "operator-social-graph": [
    { label: "Archives Division", to: "/divisions/archives" },
    { label: "Operator Logbook", to: "/dashboard#operator-logbook" },
  ],
  "operator-reputation-system": [{ label: "Archives Division", to: "/divisions/archives" }],
  "mission-economy": [
    { label: "Mission Composer", to: "/systems/missions" },
    { label: "Mission Packs", to: "/marketplace/mission-packs" },
    { label: "Operations Division", to: "/divisions/operations" },
  ],
  "cloudflare-mesh": [
    { label: "Cloudflare Perimeter Console", to: "/systems/perimeter" },
    { label: "Engineering Division", to: "/divisions/engineering" },
  ],
  "operator-ai-companion": [
    { label: "Codex Terminal", to: "/systems/terminal" },
    { label: "AI Node Console", to: "/dashboard#ai-node-console" },
  ],
};

function systemLink(slug: string): RelatedLink | null {
  const system = OPERATOR_SYSTEMS.find((entry) => entry.slug === slug);
  return system ? { label: system.label, to: `/systems/${slug}` } : null;
}

function divisionLink(slug: string): RelatedLink | null {
  const division = DIVISIONS.find((entry) => entry.slug === slug);
  return division ? { label: division.name, to: `/divisions/${slug}` } : null;
}

function categoryLink(slug: string): RelatedLink | null {
  const category = MARKETPLACE_CATEGORIES.find((entry) => entry.slug === slug);
  return category ? { label: category.label, to: `/marketplace/${slug}` } : null;
}

function widgetLinks(refs: WidgetRef[] = []): RelatedLink[] {
  return refs.map((ref) => ({ label: ref.label, to: `/dashboard#${ref.anchor}` }));
}

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

export function getDivisionRelatedLinks(slug: string): RelatedLink[] {
  const systems = (DIVISION_SYSTEMS[slug] ?? []).map(systemLink).filter(isNotNull);
  const widgets = widgetLinks(DIVISION_WIDGETS[slug]);
  const marketplace = DIVISION_MARKETPLACE[slug] ? [DIVISION_MARKETPLACE[slug]] : [];
  const ttx = DIVISION_TTX.includes(slug) ? [{ label: "MSH TTX", to: "/ttx" }] : [];
  const identityExtra = slug === "identity" ? [{ label: "Identity Statement", to: "/about#identity-statement" }] : [];
  return [...systems, ...widgets, ...marketplace, ...ttx, ...identityExtra, DOCTRINE_LINK];
}

export function getSystemRelatedLinks(slug: string): RelatedLink[] {
  const divisions = Object.entries(DIVISION_SYSTEMS)
    .filter(([, systems]) => systems.includes(slug))
    .map(([divisionSlug]) => divisionLink(divisionSlug))
    .filter(isNotNull);

  const categorySlug = SYSTEM_MARKETPLACE_CATEGORY[slug];
  const category = categorySlug ? [categoryLink(categorySlug)].filter(isNotNull) : [];

  const widgets = widgetLinks(SYSTEM_WIDGETS[slug]);

  const futureBacklinks = Object.entries(FUTURE_RELATED)
    .filter(([, links]) => links.some((link) => link.to === `/systems/${slug}`))
    .map(([futureSlug]) => {
      const module = FUTURE_MODULES.find((entry) => entry.slug === futureSlug);
      return module ? { label: module.name, to: `/future/${futureSlug}` } : null;
    })
    .filter(isNotNull);

  return [...divisions, ...category, ...widgets, ...futureBacklinks, DOCTRINE_LINK];
}

export function getFutureRelatedLinks(slug: string): RelatedLink[] {
  return FUTURE_RELATED[slug] ?? [];
}

export function getCategoryRelatedSystems(categorySlug: string): RelatedLink[] {
  return Object.entries(SYSTEM_MARKETPLACE_CATEGORY)
    .filter(([, mappedCategory]) => mappedCategory === categorySlug)
    .map(([systemSlug]) => systemLink(systemSlug))
    .filter(isNotNull);
}

export function getSystemMarketplaceCategory(slug: string): MarketplaceCategory | undefined {
  const categorySlug = SYSTEM_MARKETPLACE_CATEGORY[slug];
  return categorySlug ? MARKETPLACE_CATEGORIES.find((entry) => entry.slug === categorySlug) : undefined;
}
