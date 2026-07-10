import {
  generateCustomerBeaconPackage,
  intakeToBeaconDocument,
  NORTHSTAR_BEACON_TIERS,
  verifyCustomerBeaconHash,
} from "./customerBeacon/packageGenerator";
import { hashCustomerBeacon, canonicalizeCustomerBeacon } from "./customerBeacon/hash";
import { validateCustomerBeaconDocument } from "./customerBeacon/schema";
import type {
  CustomerBeaconPackageResult,
  CustomerBeaconProposal,
  NorthstarBeaconIntakeInput,
} from "./customerBeacon/types";

const AGENT_ID = "NorthstarBeaconGovernanceApp";

export type NorthstarBeaconOrder = NorthstarBeaconIntakeInput & {
  order_id: string;
  created_at: string;
  status: "package-generated" | "intake-received" | "pending-configuration";
  integrity_hash: string;
  tier_name: string;
  tier_price: number;
  file_count: number;
  package_summary: Record<string, unknown>;
  files: CustomerBeaconPackageResult["files"];
  assisted_implementation: boolean;
  source_route: string;
  next_route: string;
  northstar_alignment: {
    product_boundary: string;
    internal_beacon_leaked: false;
    mutation_allowed: false;
  };
};

const northstarBeaconOrders: NorthstarBeaconOrder[] = [];
const northstarBeaconProposals: CustomerBeaconProposal[] = [];

const TIERS = NORTHSTAR_BEACON_TIERS;
const TIER_IDS = ["beacon-core", "beacon-governance-pro", "beacon-enterprise"] as const;
const DEPLOYMENT_ENVIRONMENTS = [
  "cloudflare_workers",
  "node_service",
  "kubernetes",
  "hybrid",
  "local_only",
  "not_sure",
] as const;
const LANGUAGES = ["typescript", "python", "go", "mixed", "not_sure"] as const;

function normalizeText(value: unknown, maxLength = 512): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeStringArray(value: unknown, maxItems = 16, itemMax = 256): string[] {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const entry of value) {
    const text = normalizeText(entry, itemMax);
    if (!text) continue;
    if (/(\bimport\b|\brequire\b|<script|javascript:)/i.test(text)) continue;
    items.push(text);
    if (items.length >= maxItems) break;
  }
  return items;
}

function clampEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const text = normalizeText(value, 64) as T;
  return allowed.includes(text) ? text : fallback;
}

function generateOrderId(): string {
  return `beacon-order-${1001 + northstarBeaconOrders.length}`;
}

export const northstarBeaconGovernanceMarketplaceModule = {
  id: "northstar-beacon-governance-app",
  slug: "northstar-beacon",
  module_id: "msh-northstar-beacon-governance-app",
  service_slug: "northstar_beacon_governance",
  name: "Northstar Beacon Governance App",
  subtitle: "Operator-controlled AI governance for multi-agent systems",
  category: "AI Governance / Agent Control / Compliance / Multi-Agent Infrastructure",
  public_service_route: "/apps/northstar-beacon",
  operator_route: "/operator/northstar-beacon-orders",
  description:
    "Create an immutable strategic Beacon that every agent must load at initialization, validate before use, and reference when generating recommendations or requesting execution approval.",
  short_description:
    "Tamper-evident strategic governance for AI agencies, SaaS teams, and regulated multi-agent operators.",
  fulfillmentType: "generated-governance-package",
  governanceClassification: "operator-controlled",
  riskClassification: "low-execution-risk",
  product_version: "1.0.0",
  status: "active",
  revenue_type: "governance_package",
  purchase_cta: "Select Tier and Configure Beacon",
  implementation_cta: "Request Assisted Implementation",
  tiers: TIERS,
  buyer_outcomes: [
    "Single strategic source of truth for every agent",
    "Hash-verified beacon integrity with safe-mode failure",
    "Operator approval gates for all governance mutations",
    "Read-only MCP governance signal ingestion",
    "Auditable proposal and approval workflow",
  ],
  core_features: [
    "Customer-configurable northstar.json",
    "JSON Schema validation",
    "SHA-256 integrity checks",
    "Agent initialization loader",
    "Autonomy policy enforcement",
    "Governance proposal pipeline",
    "Operator approval workflow",
    "No internal MSHOPS beacon leakage",
  ],
  supported_use_cases: [
    "AI agencies standardizing client agent governance",
    "SaaS teams governing multi-tenant agent behavior",
    "Regulated businesses requiring approval gates",
    "Enterprise automation teams with bounded autonomy",
    "Federal subcontractors documenting governance controls",
  ],
  technical_requirements: [
    "TypeScript or Node-compatible runtime for generated package",
    "Operator-controlled deployment environment",
    "Ability to load JSON at agent initialization",
  ],
  security_guarantees: [
    "Beacon is read-only to agents",
    "No MCP mutation rights",
    "No agent self-approval",
    "SHA-256 integrity verification",
    "Fail-closed safe mode",
    "Proposal and approval logging",
  ],
  faq: [
    {
      q: "Does this include MSHOPS internal governance doctrine?",
      a: "No. The package is generated from your intake and never exposes private MSHOPS beacon values.",
    },
    {
      q: "Can agents update the beacon automatically?",
      a: "No. Governance proposals require explicit operator approval and manual application.",
    },
    {
      q: "Which tier includes MCP ingestion?",
      a: "Beacon Governance Pro and Beacon Enterprise include read-only MCP governance ingestion.",
    },
  ],
  marketplace_metadata: {
    listing_tags: ["ai-governance", "agent-control", "compliance", "multi-agent"],
    listing_status: "active",
    assisted_implementation_available: true,
  },
  delivery_outputs: [
    "northstar.json",
    "beacon.schema.json",
    "beacon.hash",
    "beaconLoader.ts",
    "governancePolicy.ts",
    "checkAutonomy.ts",
    "README.md",
    "tests",
  ],
};

export function normalizeNorthstarBeaconIntake(payload: Record<string, unknown>): NorthstarBeaconIntakeInput {
  const priorities = normalizeStringArray(payload.priorities, 12, 512);
  const strategicAxis = normalizeStringArray(payload.strategic_axis, 12, 128);
  if (priorities.length === 0) {
    throw new Error("priorities must include at least one item");
  }
  if (strategicAxis.length === 0) {
    throw new Error("strategic_axis must include at least one item");
  }

  return {
    organization_name: normalizeText(payload.organization_name, 128),
    strategic_northstar: normalizeText(payload.strategic_northstar, 2000),
    strategic_axis: strategicAxis,
    priorities,
    prohibited_actions: normalizeStringArray(payload.prohibited_actions, 16, 256),
    approval_required_actions: normalizeStringArray(payload.approval_required_actions, 16, 256),
    agent_roles: normalizeStringArray(payload.agent_roles, 16, 128),
    agent_permissions: normalizeStringArray(payload.agent_permissions, 16, 128),
    allowed_governance_sources: normalizeStringArray(payload.allowed_governance_sources, 8, 128).length
      ? normalizeStringArray(payload.allowed_governance_sources, 8, 128)
      : ["pieces-os-mcp"],
    mutation_policy: normalizeText(payload.mutation_policy, 128) || "operator-only-manual-apply",
    escalation_rules: normalizeStringArray(payload.escalation_rules, 16, 256),
    recursion_depth_limit: Math.min(
      16,
      Math.max(0, Number.isFinite(Number(payload.recursion_depth_limit)) ? Number(payload.recursion_depth_limit) : 3),
    ),
    termination_conditions: normalizeStringArray(payload.termination_conditions, 16, 256),
    audit_requirements: normalizeStringArray(payload.audit_requirements, 16, 256),
    deployment_environment: clampEnum(payload.deployment_environment, DEPLOYMENT_ENVIRONMENTS, "not_sure"),
    preferred_language: clampEnum(payload.preferred_language, LANGUAGES, "typescript"),
    compliance_framework: normalizeText(payload.compliance_framework, 128) || undefined,
    selected_tier: clampEnum(payload.selected_tier, TIER_IDS, "beacon-core"),
    source_type: normalizeText(payload.source_type, 64) || "marketplace_purchase",
    source_reference_id: normalizeText(payload.source_reference_id, 128) || undefined,
    source_route: normalizeText(payload.source_route, 256) || "/apps/northstar-beacon",
    buyer_email: normalizeText(payload.buyer_email, 256) || undefined,
    assisted_implementation: payload.assisted_implementation === true,
  };
}

function buildNextRoute(order: NorthstarBeaconOrder): string {
  const params = new URLSearchParams({
    service: "northstar_beacon_governance",
    source: "northstar-beacon",
    beacon_order_id: order.order_id,
    package_tier: order.selected_tier,
    organization: order.organization_name,
    integrity_hash: order.integrity_hash,
    tier_price: String(order.tier_price),
    assisted_implementation: order.assisted_implementation ? "true" : "false",
  });
  return `/enter?${params.toString()}`;
}

export async function generateNorthstarBeaconPackage(
  input: NorthstarBeaconIntakeInput,
  orderId?: string,
): Promise<NorthstarBeaconOrder> {
  if (!input.organization_name) throw new Error("organization_name is required");
  if (!input.strategic_northstar) throw new Error("strategic_northstar is required");

  const order_id = orderId || generateOrderId();
  const generated = await generateCustomerBeaconPackage({ orderId: order_id, input });
  const order: NorthstarBeaconOrder = {
    ...input,
    order_id,
    created_at: new Date().toISOString(),
    status: "package-generated",
    integrity_hash: generated.integrity_hash,
    tier_name: generated.tier_name,
    tier_price: generated.tier_price,
    file_count: generated.files.length,
    package_summary: generated.configuration_summary,
    files: generated.files,
    assisted_implementation: input.assisted_implementation === true,
    source_route: input.source_route || "/apps/northstar-beacon",
    next_route: "",
    northstar_alignment: {
      product_boundary: generated.product_boundary,
      internal_beacon_leaked: false,
      mutation_allowed: false,
    },
  };
  order.next_route = buildNextRoute(order);
  return order;
}

export function recordNorthstarBeaconOrder(order: NorthstarBeaconOrder): NorthstarBeaconOrder {
  const index = northstarBeaconOrders.findIndex((entry) => entry.order_id === order.order_id);
  if (index >= 0) {
    northstarBeaconOrders[index] = { ...northstarBeaconOrders[index], ...order };
    return northstarBeaconOrders[index];
  }
  northstarBeaconOrders.unshift(order);
  return order;
}

export async function createNorthstarBeaconProposal(input: {
  order_id: string;
  source_id: string;
  payload_type: "northstar-update" | "governance-signal";
  rationale: string;
  signal_message?: string;
  proposed_beacon?: unknown;
  operator_approval?: boolean;
}): Promise<CustomerBeaconProposal> {
  const order = northstarBeaconOrders.find((entry) => entry.order_id === input.order_id);
  if (!order) {
    throw new Error("Unknown beacon order");
  }

  if (input.payload_type === "northstar-update" && input.proposed_beacon) {
    const validated = validateCustomerBeaconDocument(input.proposed_beacon);
    const current = intakeToBeaconDocument(order);
    if (JSON.stringify(validated) === JSON.stringify(current)) {
      throw new Error("proposed beacon is identical to active customer beacon");
    }
  }

  const proposal: CustomerBeaconProposal = {
    proposal_id: `beacon-proposal-${Date.now()}`,
    order_id: input.order_id,
    source_id: input.source_id,
    payload_type: input.payload_type,
    status: input.operator_approval ? "approved" : "pending_operator_approval",
    created_at: new Date().toISOString(),
    rationale: input.rationale,
    signal_message: input.signal_message,
    current_beacon_hash: order.integrity_hash,
    operator_approval: input.operator_approval,
  };

  if (input.proposed_beacon) {
    proposal.proposed_beacon_hash = await hashCustomerBeacon(
      validateCustomerBeaconDocument(input.proposed_beacon),
    );
  }

  northstarBeaconProposals.unshift(proposal);
  return proposal;
}

export async function validateNorthstarBeaconIntake(payload: Record<string, unknown>): Promise<{
  valid: boolean;
  errors: string[];
  beacon?: ReturnType<typeof validateCustomerBeaconDocument>;
}> {
  try {
    const input = normalizeNorthstarBeaconIntake(payload);
    const beacon = intakeToBeaconDocument(input);
    return { valid: true, errors: [], beacon };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "invalid beacon intake"],
    };
  }
}

export async function validateNorthstarBeaconConfiguration(raw: unknown): Promise<{
  valid: boolean;
  errors: string[];
  beacon?: ReturnType<typeof validateCustomerBeaconDocument>;
}> {
  try {
    const beacon = validateCustomerBeaconDocument(raw);
    return { valid: true, errors: [], beacon };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "invalid beacon configuration"],
    };
  }
}

export async function hashNorthstarBeaconConfiguration(raw: unknown): Promise<{
  hash: string;
  canonical: string;
}> {
  const beacon = validateCustomerBeaconDocument(raw);
  const canonical = canonicalizeCustomerBeacon(beacon);
  const hash = await hashCustomerBeacon(beacon);
  return { hash, canonical };
}

export async function verifyNorthstarBeaconHash(raw: unknown, expectedHash: string): Promise<boolean> {
  const beacon = validateCustomerBeaconDocument(raw);
  return verifyCustomerBeaconHash(beacon, expectedHash);
}

export function listNorthstarBeaconOrders(): NorthstarBeaconOrder[] {
  return northstarBeaconOrders.map((order) => ({ ...order }));
}

export function listNorthstarBeaconProposals(): CustomerBeaconProposal[] {
  return northstarBeaconProposals.map((proposal) => ({ ...proposal }));
}

export function resolveBeaconOrderId(payload: Record<string, unknown>): string | null {
  const candidate = normalizeText(payload.beacon_order_id || payload.order_id, 128);
  if (!candidate) return null;
  return /^beacon-order-\d+$/.test(candidate) ? candidate : null;
}

export function attachEngagementToNorthstarBeacon(details: {
  beacon_order_id?: string;
  engagement_id?: string;
  status?: string;
}): NorthstarBeaconOrder | null {
  const orderId = normalizeText(details.beacon_order_id, 128);
  if (!orderId) return null;
  const existing = northstarBeaconOrders.find((entry) => entry.order_id === orderId);
  if (!existing) return null;
  const updated = {
    ...existing,
    status: "intake-received" as const,
  };
  return recordNorthstarBeaconOrder(updated);
}

export { NORTHSTAR_BEACON_TIERS, AGENT_ID };
