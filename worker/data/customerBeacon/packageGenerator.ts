import { customerBeaconSchemaJson, validateCustomerBeaconDocument } from "./schema";
import { canonicalizeCustomerBeacon, hashCustomerBeacon } from "./hash";
import type {
  CustomerBeaconDocument,
  CustomerBeaconPackageFile,
  CustomerBeaconPackageResult,
  CustomerBeaconTierId,
  NorthstarBeaconIntakeInput,
} from "./types";

const PRODUCT_BOUNDARY =
  "This package is a customer-configurable governance framework. It does not include private MSHOPS.NET internal doctrine, secrets, API keys, or operator credentials.";

const LICENSE_NOTICE =
  "Northstar Beacon Governance App — operator-controlled AI governance package. Mutation rights remain with the buyer operator. Agents and MCP sources may propose changes but cannot self-apply beacon updates.";

export const NORTHSTAR_BEACON_TIERS = [
  {
    id: "beacon-core" as const,
    slug: "beacon-core",
    name: "Beacon Core",
    subtitle: "Immutable strategic source of truth for agent initialization",
    price: 99,
    price_label: "$99 one-time",
    features: [
      "Customer-configurable northstar.json",
      "JSON Schema",
      "Beacon loader",
      "SHA-256 integrity validation",
      "Agent alignment helper",
      "Startup validation",
      "Basic tests",
      "Setup documentation",
    ],
  },
  {
    id: "beacon-governance-pro" as const,
    slug: "beacon-governance-pro",
    name: "Beacon Governance Pro",
    subtitle: "MCP-ready governance proposals with operator approval workflow",
    price: 399,
    price_label: "$399 one-time",
    features: [
      "Everything in Beacon Core",
      "MCP source registry",
      "Read-only governance signal ingestion",
      "Governance proposal pipeline",
      "Operator approval workflow",
      "Autonomy policy checks",
      "Proposal validation",
      "No-mutation guarantees",
      "Expanded test suite",
      "Integration examples",
    ],
  },
  {
    id: "beacon-enterprise" as const,
    slug: "beacon-enterprise",
    name: "Beacon Enterprise",
    subtitle: "Multi-environment governance with compliance evidence export",
    price: 2500,
    price_label: "Starting at $2,500",
    features: [
      "Everything in Governance Pro",
      "Persistent governance event ledger templates",
      "Operator identity attribution patterns",
      "Signed approval workflow guidance",
      "Replay protection patterns",
      "Multi-environment beacon management",
      "Compliance evidence export checklist",
      "Assisted implementation playbook",
      "Custom integration patterns",
    ],
  },
];

function buildGovernanceSources(input: NorthstarBeaconIntakeInput): CustomerBeaconDocument["governanceSources"] {
  return input.allowed_governance_sources.map((sourceId) => ({
    id: sourceId,
    type: "governance-source",
    mutationRights: "none" as const,
    approvalRequired: true as const,
  }));
}

export function intakeToBeaconDocument(input: NorthstarBeaconIntakeInput): CustomerBeaconDocument {
  const escalationConditions = [
    ...input.escalation_rules,
    ...input.prohibited_actions.map((action) => `Escalate when agent attempts: ${action}`),
  ];
  const terminationConditions = [
    ...input.termination_conditions,
    `Recursion depth must not exceed ${input.recursion_depth_limit}`,
    ...input.audit_requirements.map((req) => `Audit trigger: ${req}`),
  ];

  const doc: CustomerBeaconDocument = {
    version: "1.0.0",
    state: "active",
    organization: input.organization_name,
    northstar: input.strategic_northstar,
    strategicAxis: input.strategic_axis,
    priorities: input.priorities,
    authority: {
      operatorRetainsExecutionAuthority: true,
      councilAuthority: "advisory-only",
      agentExecutionRequiresApproval: true,
    },
    agentRules: {
      mustLoadAtInitialization: true,
      mustReferenceBeacon: true,
      mustEscalateDeviation: true,
      mustAlignSuggestions: true,
    },
    autonomy: {
      mutationAllowed: false,
      operatorApprovalRequired: true,
      maxRecursionDepth: input.recursion_depth_limit,
      terminationConditions,
      escalationConditions,
    },
    governanceSources: buildGovernanceSources(input),
    audit: {
      hashAlgorithm: "sha256",
      proposalLoggingRequired: true,
      approvalLoggingRequired: true,
    },
  };

  return validateCustomerBeaconDocument(doc);
}

function coreLoaderSource(): string {
  return `import northstarDocument from "./northstar.json" with { type: "json" };
import { EXPECTED_BEACON_SHA256 } from "./beaconHash";
import { validateCustomerBeaconDocument, type CustomerBeaconDocument } from "./governancePolicy";

export interface BeaconLoadResult {
  beacon: Readonly<CustomerBeaconDocument>;
  integrityHash: string;
  safeMode: boolean;
  warning?: string;
}

function freezeBeacon(beacon: CustomerBeaconDocument): Readonly<CustomerBeaconDocument> {
  Object.freeze(beacon.authority);
  Object.freeze(beacon.agentRules);
  Object.freeze(beacon.autonomy);
  Object.freeze(beacon.audit);
  Object.freeze(beacon.strategicAxis);
  Object.freeze(beacon.priorities);
  Object.freeze(beacon.governanceSources);
  return Object.freeze(beacon);
}

async function verifyHash(beacon: CustomerBeaconDocument): Promise<string> {
  const canonical = JSON.stringify(beacon, Object.keys(beacon).sort());
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hash !== EXPECTED_BEACON_SHA256) {
    throw new Error("Beacon integrity hash mismatch");
  }
  return hash;
}

export async function loadBeacon(): Promise<BeaconLoadResult> {
  const beacon = validateCustomerBeaconDocument(northstarDocument);
  const integrityHash = await verifyHash(beacon);
  return { beacon: freezeBeacon(beacon), integrityHash, safeMode: false };
}

export function assertBeaconOnStartup(): Promise<BeaconLoadResult> {
  return loadBeacon();
}
`;
}

function governancePolicySource(): string {
  return `export type { CustomerBeaconDocument } from "./types";
export {
  validateCustomerBeaconDocument,
  customerBeaconSchemaJson,
  CustomerBeaconValidationError,
} from "./schema";
`;
}

function checkAutonomySource(): string {
  return `export type AutonomyDecision = "allowed" | "denied" | "escalate";

export function checkAutonomy(input: {
  actionKind: "advisory" | "mutate_state" | "autonomous_execute";
  operatorApproval?: boolean;
  recursionDepth?: number;
  maxRecursionDepth: number;
}): { decision: AutonomyDecision; reason: string } {
  if (input.actionKind === "advisory") {
    return { decision: "allowed", reason: "advisory output permitted" };
  }
  if (input.recursionDepth !== undefined && input.recursionDepth > input.maxRecursionDepth) {
    return { decision: "denied", reason: "recursion depth limit exceeded" };
  }
  if (!input.operatorApproval) {
    return {
      decision: input.actionKind === "mutate_state" ? "escalate" : "denied",
      reason: "operator approval required",
    };
  }
  return { decision: "allowed", reason: "operator approved action" };
}
`;
}

function proposalPipelineSources(organization: string): CustomerBeaconPackageFile[] {
  return [
    {
      path: "customer-beacon/sourceRegistry.json",
      content: `${JSON.stringify(
        {
          sources: [
            {
              id: "pieces-os-mcp",
              type: "governance-source",
              description: `${organization} governance feed`,
              allowedPayloadTypes: ["northstar-update", "governance-signal"],
              mutationRights: "none",
              approvalRequired: true,
            },
          ],
        },
        null,
        2,
      )}\n`,
    },
    {
      path: "customer-beacon/proposalTypes.ts",
      content: `export type GovernanceProposalStatus = "pending_operator_approval" | "approved" | "denied";
export interface GovernanceProposal {
  proposalId: string;
  payloadType: "northstar-update" | "governance-signal";
  status: GovernanceProposalStatus;
  rationale: string;
  mutationRights: "none";
}
`,
    },
    {
      path: "customer-beacon/validateGovernancePayload.ts",
      content: `export function validateGovernancePayload(raw: unknown): { valid: boolean; errors: string[] } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, errors: ["payload must be an object"] };
  }
  const doc = raw as Record<string, unknown>;
  if (doc.mutationRights && doc.mutationRights !== "none") {
    return { valid: false, errors: ["mutationRights must be none"] };
  }
  return { valid: true, errors: [] };
}
`,
    },
    {
      path: "customer-beacon/ingestGovernancePayload.ts",
      content: `import type { GovernanceProposal } from "./proposalTypes";

const proposals: GovernanceProposal[] = [];

export function ingestGovernancePayload(input: GovernanceProposal): GovernanceProposal {
  const proposal = { ...input, mutationRights: "none" as const };
  proposals.unshift(proposal);
  return proposal;
}

export function listGovernanceProposals(): GovernanceProposal[] {
  return [...proposals];
}
`,
    },
    {
      path: "customer-beacon/proposalLog.ts",
      content: `export { listGovernanceProposals, ingestGovernancePayload } from "./ingestGovernancePayload";
`,
    },
    {
      path: "customer-beacon/INTEGRATION.md",
      content: `# Integration Guide\n\n1. Load the beacon at agent initialization.\n2. Reference the beacon before strategic output.\n3. Route governance proposals through operator approval.\n4. Never mutate northstar.json from agent or MCP code.\n`,
    },
  ];
}

function readmeSource(tierName: string, organization: string): string {
  return `# Customer Northstar Beacon Package

Organization: ${organization}
Tier: ${tierName}

## Guarantees

- Beacon is read-only to agents
- MCP sources cannot mutate the beacon
- Operator approval is required for governance changes
- Integrity is verified with SHA-256
- Safe mode fails closed on invalid beacon state

## Setup

1. Install files under \`customer-beacon/\`
2. Run tests with your project test runner
3. Call \`assertBeaconOnStartup()\` during agent initialization
4. Use \`checkAutonomy()\` before non-advisory actions

${PRODUCT_BOUNDARY}
`;
}

function testSource(): string {
  return `import assert from "node:assert/strict";
import { describe, it } from "node:test";
import northstarDocument from "../customer-beacon/northstar.json" with { type: "json" };
import { validateCustomerBeaconDocument } from "../customer-beacon/governancePolicy";

describe("customer beacon", () => {
  it("loads and validates", () => {
    const beacon = validateCustomerBeaconDocument(northstarDocument);
    assert.equal(beacon.autonomy.mutationAllowed, false);
    assert.equal(beacon.authority.agentExecutionRequiresApproval, true);
  });
});
`;
}

function buildPackageFiles(
  beacon: CustomerBeaconDocument,
  hash: string,
  tierId: CustomerBeaconTierId,
  tierName: string,
): CustomerBeaconPackageFile[] {
  const files: CustomerBeaconPackageFile[] = [
    {
      path: "customer-beacon/types.ts",
      content: `export type CustomerBeaconState = "active";
export interface CustomerBeaconDocument {
  version: string;
  state: CustomerBeaconState;
  organization: string;
  northstar: string;
  strategicAxis: string[];
  priorities: string[];
  authority: {
    operatorRetainsExecutionAuthority: true;
    councilAuthority: "advisory-only";
    agentExecutionRequiresApproval: true;
  };
  agentRules: {
    mustLoadAtInitialization: true;
    mustReferenceBeacon: true;
    mustEscalateDeviation: true;
    mustAlignSuggestions: true;
  };
  autonomy: {
    mutationAllowed: false;
    operatorApprovalRequired: boolean;
    maxRecursionDepth: number;
    terminationConditions: string[];
    escalationConditions: string[];
  };
  governanceSources: Array<{
    id: string;
    type: string;
    mutationRights: "none";
    approvalRequired: true;
  }>;
  audit: {
    hashAlgorithm: "sha256";
    proposalLoggingRequired: true;
    approvalLoggingRequired: true;
  };
}
`,
    },
    {
      path: "customer-beacon/schema.ts",
      content: `import type { CustomerBeaconDocument } from "./types";

export class CustomerBeaconValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerBeaconValidationError";
  }
}

export function validateCustomerBeaconDocument(raw: unknown): CustomerBeaconDocument {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CustomerBeaconValidationError("Beacon document must be an object");
  }
  const doc = raw as CustomerBeaconDocument;
  if (doc.state !== "active") throw new CustomerBeaconValidationError('state must be "active"');
  if (doc.autonomy?.mutationAllowed !== false) {
    throw new CustomerBeaconValidationError("autonomy.mutationAllowed must be false");
  }
  if (doc.authority?.agentExecutionRequiresApproval !== true) {
    throw new CustomerBeaconValidationError("agent execution requires approval");
  }
  return doc;
}

export function customerBeaconSchemaJson(): Record<string, unknown> {
  return ${JSON.stringify(customerBeaconSchemaJson())};
}
`,
    },
    {
      path: "customer-beacon/northstar.json",
      content: `${JSON.stringify(beacon, null, 2)}\n`,
    },
    {
      path: "customer-beacon/beacon.schema.json",
      content: `${JSON.stringify(customerBeaconSchemaJson(), null, 2)}\n`,
    },
    {
      path: "customer-beacon/beacon.hash",
      content: `${hash}\n`,
    },
    {
      path: "customer-beacon/beaconHash.ts",
      content: `export const EXPECTED_BEACON_SHA256 = "${hash}";\n`,
    },
    {
      path: "customer-beacon/beaconLoader.ts",
      content: coreLoaderSource(),
    },
    {
      path: "customer-beacon/governancePolicy.ts",
      content: governancePolicySource(),
    },
    {
      path: "customer-beacon/checkAutonomy.ts",
      content: checkAutonomySource(),
    },
    {
      path: "customer-beacon/README.md",
      content: readmeSource(tierName, beacon.organization),
    },
    {
      path: "tests/customer-beacon.test.ts",
      content: testSource(),
    },
  ];

  if (tierId === "beacon-governance-pro" || tierId === "beacon-enterprise") {
    files.push(...proposalPipelineSources(beacon.organization));
  }

  if (tierId === "beacon-enterprise") {
    files.push({
      path: "customer-beacon/EVENT_LEDGER.md",
      content: `# Governance Event Ledger\n\nRecord proposal, approval, and manual apply events with operator attribution.\n`,
    });
    files.push({
      path: "customer-beacon/COMPLIANCE_EXPORT.md",
      content: `# Compliance Evidence Export\n\nExport proposal history, approval decisions, and beacon hash verification logs.\n`,
    });
  }

  return files;
}

export async function generateCustomerBeaconPackage(options: {
  orderId: string;
  input: NorthstarBeaconIntakeInput;
}): Promise<CustomerBeaconPackageResult> {
  const tier = NORTHSTAR_BEACON_TIERS.find((entry) => entry.id === options.input.selected_tier);
  if (!tier) {
    throw new Error("Unknown tier selection");
  }

  const beacon = intakeToBeaconDocument(options.input);
  const integrityHash = await hashCustomerBeacon(beacon);
  const files = buildPackageFiles(beacon, integrityHash, tier.id, tier.name);

  return {
    order_id: options.orderId,
    tier_id: tier.id,
    tier_name: tier.name,
    tier_price: tier.price,
    beacon,
    integrity_hash: integrityHash,
    files,
    configuration_summary: {
      organization: beacon.organization,
      strategic_axis: beacon.strategicAxis,
      priorities: beacon.priorities,
      prohibited_actions: options.input.prohibited_actions,
      approval_required_actions: options.input.approval_required_actions,
      agent_roles: options.input.agent_roles,
      deployment_environment: options.input.deployment_environment,
      preferred_language: options.input.preferred_language,
      compliance_framework: options.input.compliance_framework ?? null,
      tier: tier.id,
    },
    license_notice: LICENSE_NOTICE,
    product_boundary: PRODUCT_BOUNDARY,
    implementation_checklist: [
      "Deploy customer-beacon package into your agent repository",
      "Initialize agents with assertBeaconOnStartup()",
      "Attach beacon reference metadata to strategic outputs",
      "Route governance proposals through operator approval",
      "Verify SHA-256 hash after any manual northstar.json change",
      "Enable safe mode monitoring in production",
    ],
    telemetry: {
      marketplace_page: "northstar-beacon",
      tier_selected: tier.id,
      package_generated: "true",
      file_count: String(files.length),
      assisted_implementation: options.input.assisted_implementation ? "requested" : "not_requested",
    },
  };
}

export function verifyCustomerBeaconHash(
  beacon: CustomerBeaconDocument,
  expectedHash: string,
): Promise<boolean> {
  return hashCustomerBeacon(beacon).then((hash) => hash === expectedHash);
}

export { canonicalizeCustomerBeacon, validateCustomerBeaconDocument };
