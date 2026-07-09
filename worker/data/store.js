import validators from "./validate.js";

const {
  validateCollection,
  validateModuleRecord,
  validatePackageRecord,
  validateDeliverableRecord,
  validateIdentityRecord
} = validators;

const moduleRegistry = validateCollection([
  {
    id: "multi-agent-cockpit",
    num: "01",
    title: "Multi-Agent Cockpit",
    description: "Command-and-control interface for monitoring, logging, and auditing multi-agent AI deployments in real time. Map agent interactions, trace tool calls, and flag anomalous behavior before it becomes a breach.",
    long_description: "The cockpit is the operator control surface for live mission oversight. It is built to trace agent handoffs, inspect tool execution, and keep escalation decisions anchored to telemetry instead of guesswork.",
    status: "active",
    tags: ["MONITORING", "OBSERVABILITY", "LIVE_AUDIT", "AGENT_TRACE"],
    cta_label: "VIEW MODULE",
    cta_href: "/marketplace/modules/multi-agent-cockpit",
    access_level: "operator",
    access_instructions: [
      "Schedule an operator briefing to map cockpit telemetry into your environment.",
      "Provide your agent topology and tool inventory for trace correlation.",
      "Use the module payload to align registry sync before implementation."
    ],
    features: [
      "Trace agent-to-agent and agent-to-tool handoffs in one registry view.",
      "Review escalation decisions against a live telemetry timeline.",
      "Export operator-facing audit context for downstream reporting."
    ],
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-06T00:00:00Z"
  },
  {
    id: "msh-ops-doctrine",
    num: "02",
    title: "MSH OPS Doctrine",
    description: "The operational playbook behind every MSHOPS engagement. Threat modeling frameworks, red team protocols, escalation paths, and post-engagement reporting standards for AI orchestration security.",
    long_description: "Doctrine is the reference layer that keeps operator workflow, threat modeling, and reporting language consistent across the MSH OPS ecosystem. It packages methodology, escalation boundaries, and execution standards into a single retrieval surface.",
    status: "active",
    tags: ["DOCTRINE", "PLAYBOOK", "RED_TEAM_OPS", "STANDARDS"],
    cta_label: "GET BRIEF",
    cta_href: "/marketplace/modules/msh-ops-doctrine",
    access_level: "public",
    access_instructions: [
      "Use the brief to align internal operators before an engagement kickoff.",
      "Reference doctrine terms directly when mapping control ownership."
    ],
    features: [
      "Threat modeling frameworks tuned for multi-agent systems.",
      "Escalation-path definitions for operator and engineering handoff.",
      "Reporting standards that keep findings executable."
    ],
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-06T00:00:00Z"
  },
  {
    id: "scenario-engine",
    num: "03",
    title: "Scenario Engine",
    description: "Library of pre-built adversarial scenarios for multi-agent AI systems. Attack chain documentation, detection signatures, and remediation guidance ready to run in your sandbox.",
    long_description: "Scenario Engine packages adversarial runs as reusable operator drills. Each scenario includes attack-chain framing, expected telemetry, and remediation checkpoints so the same exercise can be rerun as the environment changes.",
    status: "active",
    tags: ["ATTACK_CHAINS", "SANDBOX", "ADVERSARIAL", "SCENARIO_LIB"],
    cta_label: "DEPLOY SCENARIO",
    cta_href: "/marketplace/modules/scenario-engine",
    access_level: "operator",
    access_instructions: [
      "Provide a sandbox or staging environment before scenario deployment.",
      "Confirm agent tool permissions and rollback boundaries before execution."
    ],
    features: [
      "Pre-built adversarial exercises for multi-agent systems.",
      "Detection signatures mapped to each scenario path.",
      "Remediation guidance packaged beside the attack narrative."
    ],
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-06T00:00:00Z"
  },
  {
    id: "ai-agent-threat-report",
    num: "04",
    title: "AI Agent Threat Report",
    description: "Quarterly intelligence briefing on emerging threats to multi-agent AI systems. New attack vectors, exploited vulnerabilities, tool poisoning incidents, and tactical recommendations for defensive posture.",
    long_description: "The threat report turns emerging AI-agent risk into an operator-readable briefing. It is designed for engineering leads, security leadership, and operators who need the newest attack paths tied back to concrete defensive actions.",
    status: "active",
    tags: ["INTEL", "QUARTERLY", "THREAT_LANDSCAPE", "PDF"],
    cta_label: "GET BRIEF",
    cta_href: "/marketplace/modules/ai-agent-threat-report",
    access_level: "public",
    access_instructions: [
      "Use the brief for threat-landscape updates between engagements.",
      "Tie new findings to telemetry and remediation backlogs."
    ],
    features: [
      "Quarterly threat intelligence focused on agentic systems.",
      "Coverage of tool poisoning, identity drift, and orchestration failures.",
      "Action-oriented recommendations for defensive posture updates."
    ],
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-06T00:00:00Z"
  },
  {
    id: "n8n-automation-packs",
    num: "05",
    title: "n8n Automation Packs",
    description: "Pre-configured n8n workflow packs for AI security operations: agent monitoring pipelines, alert routing, incident triage automation, and remediation tracking.",
    long_description: "Automation Packs are distributed under operator clearance because they codify response motion directly into workflow tooling. The package includes alert routing, evidence collection, and triage scaffolding for teams already operating at production tempo.",
    status: "restricted",
    tags: ["AUTOMATION", "N8N", "PIPELINES", "NO_CODE"],
    cta_label: "REQUEST CLEARANCE",
    cta_href: "mailto:matrixsechub@outlook.com?subject=CLEARANCE_REQUEST_N8N_PACKS",
    access_level: "restricted",
    access_instructions: [
      "Submit a clearance request with deployment context and tool inventory.",
      "Operator review is required before workflow packs are distributed.",
      "Expect follow-up questions on alerting destinations and approval gates."
    ],
    features: [
      "Agent monitoring pipelines for workflow-native observability.",
      "Alert routing and triage automation for operator queues.",
      "Remediation tracking templates that preserve approval boundaries."
    ],
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-06T00:00:00Z"
  }
], validateModuleRecord, "moduleRegistry");

const packageCatalog = validateCollection([
  {
    id: "operator-assessment",
    title: "OPERATOR ASSESSMENT",
    subtitle: "Entry Point Engagement",
    fee_type: "fixed",
    description: "A rapid-fire assessment of your AI agent deployment's orchestration layer. Designed for teams who need a fast, credible answer to \"are we exposed?\" before a board meeting, audit, or go-live.",
    outcomes: [
      "Know your exact exposure before your next board meeting.",
      "Receive a prioritized action list instead of a vague risk assessment.",
      "Give engineers specific fixes instead of generic recommendations."
    ],
    scope: [
      "Single agent system or defined agent cluster.",
      "Up to 5 tool integrations reviewed.",
      "Architecture documentation review plus 1 sandbox session.",
      "Deliverable in 3 business days."
    ],
    cta_label: "INITIATE_ASSESSMENT",
    is_flagship: false,
    accent_color: "#00ff41",
    available: true,
    display_order: 1,
    created_at: "2026-07-01T00:00:00Z"
  },
  {
    id: "multi-agent-red-team",
    title: "MULTI-AGENT RED TEAM",
    subtitle: "Full Adversarial Engagement",
    fee_type: "custom",
    description: "The full MSHOPS engagement. End-to-end red team of your multi-agent system from architecture threat modeling through active adversarial testing to a prioritized remediation roadmap your engineers can act on immediately.",
    outcomes: [
      "Get a full map of your orchestration layer attack surface.",
      "Adversarially test every critical path before go-live.",
      "Receive a remediation roadmap your engineers can execute the same week.",
      "Arm leadership with a board-ready executive brief."
    ],
    scope: [
      "Full multi-agent deployment with all tool chains in scope.",
      "Staging or sandbox environment required.",
      "2 engineering collaboration sessions included.",
      "Deliverable in 5 business days."
    ],
    cta_label: "DEPLOY_RED_TEAM",
    is_flagship: true,
    accent_color: "#c9a84c",
    available: true,
    display_order: 2,
    created_at: "2026-07-01T00:00:00Z"
  },
  {
    id: "ongoing-monitoring",
    title: "ONGOING MONITORING",
    subtitle: "Continuous Threat Coverage",
    fee_type: "subscription",
    description: "Monthly retainer for teams running multi-agent AI in production. Quarterly red team passes, continuous threat intelligence briefings, and on-call access for incident triage when something unexpected surfaces.",
    outcomes: [
      "Maintain visibility as new attack vectors emerge.",
      "Validate that earlier remediations still hold each quarter.",
      "Get on-call incident support when something unexpected surfaces.",
      "Receive the AI Agent Threat Report every quarter automatically."
    ],
    scope: [
      "1 red team pass per quarter scoped to changes since the last engagement.",
      "Monthly threat intelligence briefings delivered async.",
      "On-call triage with a 4-hour SLA during business hours in Mountain Time.",
      "Cancel any time without lock-in."
    ],
    cta_label: "ESTABLISH_MONITORING",
    is_flagship: false,
    accent_color: "#5bd6ff",
    available: true,
    display_order: 3,
    created_at: "2026-07-01T00:00:00Z"
  }
], validatePackageRecord, "packageCatalog");

const deliverableCatalog = validateCollection([
  {
    id: "threat-model-map",
    artifact_num: "01",
    title: "Threat Model Map",
    description: "A visual and documented map of your agent system's entire attack surface: trust boundaries, tool call chains, data flows, agent handoff points, and privilege escalation paths.",
    formats: ["PDF", "VISUAL DIAGRAM"],
    delivery_day: "DAY 1",
    sample_url: null,
    icon_symbol: "<>",
    accent_color: "#00ff41",
    display_order: 1
  },
  {
    id: "remediation-roadmap",
    artifact_num: "02",
    title: "Remediation Roadmap",
    description: "Every finding triaged by severity and exploitability, with specific fix recommendations, affected components, engineering effort estimates, and detection guidance.",
    formats: ["PDF", "STRUCTURED DATA"],
    delivery_day: "DAY 5",
    sample_url: "/api/deliverables/download?id=remediation-roadmap",
    icon_symbol: "[]",
    accent_color: "#c9a84c",
    display_order: 2
  },
  {
    id: "attack-narrative",
    artifact_num: "03",
    title: "Attack Narrative",
    description: "A written account of the adversarial testing: what was attempted, what succeeded, what failed, and what an actual attacker would have done with the access that was gained.",
    formats: ["PDF", "EXECUTIVE READABLE"],
    delivery_day: "DAY 5",
    sample_url: null,
    icon_symbol: "!!",
    accent_color: "#ff5959",
    display_order: 3
  },
  {
    id: "telemetry-guide",
    artifact_num: "04",
    title: "Telemetry Recommendations",
    description: "A specific, actionable list of what your team should be logging, monitoring, and alerting on across your agent deployment based on the actual attack paths discovered.",
    formats: ["PDF", "IMPLEMENTATION GUIDE"],
    delivery_day: "DAY 5",
    sample_url: null,
    icon_symbol: "//",
    accent_color: "#5bd6ff",
    display_order: 4
  }
], validateDeliverableRecord, "deliverableCatalog");

const deliverableDownloads = {
  "threat-model-map": {
    downloadName: "threat-model-map.txt",
    content: "MSH OPS Threat Model Map\n\n- Trust boundaries across the orchestration layer\n- Tool-call paths and approval gates\n- Agent handoff dependencies\n- Privilege escalation checkpoints\n"
  },
  "remediation-roadmap": {
    downloadName: "remediation-roadmap.txt",
    content: "MSH OPS Remediation Roadmap\n\n1. Wire validated module metadata into the registry surface.\n2. Align identity intake with engagement creation.\n3. Close telemetry gaps around agent handoffs.\n4. Sequence fixes by exploitability and operator impact.\n"
  },
  "attack-narrative": {
    downloadName: "attack-narrative.txt",
    content: "MSH OPS Attack Narrative\n\nThe simulated adversary pivots through orchestration assumptions, enumerates tool permissions, and pressures the operator response path before defensive controls close the window.\n"
  },
  "telemetry-guide": {
    downloadName: "telemetry-guide.txt",
    content: "MSH OPS Telemetry Recommendations\n\n- Capture agent state transitions and tool invocation context.\n- Preserve operator approvals and escalation timestamps.\n- Log identity resolution outcomes tied to conversion events.\n- Track scenario execution and remediation evidence.\n"
  }
};

const engagements = [
  {
    id: "eng-1001",
    packageId: "multi-agent-red-team",
    operatorHandle: "Demo Operator",
    organization: "MatrixSecHub",
    contactEmail: "operator@mshops.net",
    transmission: "Seed intake for routing validation.",
    source: "seed",
    status: "scheduled",
    createdAt: "2026-07-06T12:00:00Z"
  }
];

const identities = validateCollection([
  {
    id: "11111111-1111-4111-8111-111111111111",
    operator_handle: "Demo Operator",
    organization: "MatrixSecHub",
    contact_email: "operator@mshops.net",
    transmission: "Seed identity for operator pipeline validation.",
    source_page: "landing",
    package_interest: "multi-agent-red-team",
    module_interest: null,
    urgency: "within_30_days",
    auto_reply_sent: true,
    contacted_at: "2026-07-06T12:00:00Z",
    ip_address: null,
    status: "qualified"
  }
], validateIdentityRecord, "identities");

const moduleScenarioMetadataById = {
  "multi-agent-cockpit": {
    ttxEligible: true,
    scenarioIds: [],
    launchPath: "/ops/dashboard"
  },
  "msh-ops-doctrine": {
    ttxEligible: false,
    scenarioIds: [],
    launchPath: null
  },
  "scenario-engine": {
    ttxEligible: true,
    scenarioIds: ["baseline-01", "branching-01"],
    launchPath: "/ops/ttx/builder"
  },
  "ai-agent-threat-report": {
    ttxEligible: false,
    scenarioIds: [],
    launchPath: null
  },
  "n8n-automation-packs": {
    ttxEligible: false,
    scenarioIds: [],
    launchPath: null
  }
};

function getModuleRoute(id) {
  return `/marketplace/modules/${id}`;
}

function getModuleStaticPath(id) {
  return `/modules/${id}.html`;
}

function toModulePayload(record) {
  const scenarioMetadata = moduleScenarioMetadataById[record.id] || {
    ttxEligible: false,
    scenarioIds: [],
    launchPath: null
  };

  return {
    id: record.id,
    name: record.title,
    description: record.description,
    tags: [...record.tags],
    status: record.status,
    metadata: {
      num: record.num,
      title: record.title,
      category: "OPERATOR_MARKETPLACE",
      route: getModuleRoute(record.id),
      staticPath: getModuleStaticPath(record.id),
      ctaLabel: record.cta_label,
      ctaHref: record.cta_href || getModuleRoute(record.id),
      accessLevel: record.access_level,
      accessInstructions: [...(record.access_instructions || [])],
      features: [...(record.features || [])],
      summary: record.description,
      longDescription: record.long_description || record.description,
      ttxEligible: scenarioMetadata.ttxEligible,
      scenarioIds: [...scenarioMetadata.scenarioIds],
      launchPath: scenarioMetadata.launchPath,
      thumbnailUrl: record.thumbnail_url || null,
      iconUrl: record.icon_url || null
    },
    lastUpdated: record.updated_at || record.created_at || null
  };
}

function toDeliverablePayload(record) {
  return {
    ...record,
    formats: [...record.formats],
    sample_url: record.sample_url || null,
    download_url: `/api/deliverables/download?id=${record.id}`
  };
}

function createId(prefix, collection) {
  const next = collection.length + 1001;
  return `${prefix}-${next}`;
}

function createIdentityId() {
  return crypto.randomUUID();
}

const modules = moduleRegistry.map(toModulePayload);
const packages = packageCatalog.map((entry) => ({
  ...entry,
  outcomes: [...entry.outcomes],
  scope: [...entry.scope]
}));
const deliverables = deliverableCatalog.map(toDeliverablePayload);

export default {
  moduleRegistry,
  modules,
  packageCatalog,
  packages,
  deliverableCatalog,
  deliverables,
  deliverableDownloads,
  engagements,
  identities,
  moduleScenarioMetadataById,
  createId,
  createIdentityId,
  getModuleRoute,
  getModuleStaticPath
};
