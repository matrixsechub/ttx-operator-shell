var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/data/contracts.js
var MODULE_STATUSES = ["active", "coming_soon", "restricted", "deprecated"];
var MODULE_CTA_LABELS = [
  "VIEW MODULE",
  "GET BRIEF",
  "DEPLOY SCENARIO",
  "GET PACKS",
  "COMING SOON",
  "REQUEST CLEARANCE"
];
var MODULE_ACCESS_LEVELS = ["public", "operator", "restricted"];
var PACKAGE_IDS = [
  "operator-assessment",
  "multi-agent-red-team",
  "ongoing-monitoring"
];
var PACKAGE_FEE_TYPES = ["fixed", "custom", "subscription"];
var DELIVERABLE_IDS = [
  "threat-model-map",
  "remediation-roadmap",
  "attack-narrative",
  "telemetry-guide"
];
var DELIVERABLE_FORMATS = [
  "PDF",
  "VISUAL DIAGRAM",
  "STRUCTURED DATA",
  "EXECUTIVE READABLE",
  "IMPLEMENTATION GUIDE"
];
var DELIVERABLE_DAYS = ["DAY 1", "DAY 3", "DAY 5"];
var IDENTITY_SOURCE_PAGES = ["landing", "marketplace", "packages", "deliverables", "contact"];
var IDENTITY_PACKAGE_INTEREST = [...PACKAGE_IDS, null];
var IDENTITY_URGENCY = ["immediate", "within_30_days", "exploring", null];
var IDENTITY_STATUSES = ["new", "contacted", "qualified", "booked", "engaged", "closed"];
var componentMapping = {
  "hero.html": "landing hero section in public/index.html",
  "operator-profile.html": "operator profile section in public/index.html",
  "marketplace-strip.html": "landing marketplace strip and public/marketplace.html",
  "packages-strip.html": "packages section in public/index.html",
  "deliverables-strip.html": "deliverables section in public/index.html",
  "contact-component.html": "contact section in public/index.html"
};
var deploymentReference = {
  redirects: {
    "/home": "/",
    "/book": "https://calendly.com/mshops",
    "/report": "/marketplace/modules/ai-agent-threat-report"
  },
  headers: {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Deployment": "mshops-v1"
  },
  env: {
    CALENDLY_URL: "https://calendly.com/mshops",
    CONTACT_EMAIL: "matrixsechub@outlook.com",
    API_BASE_URL: "https://api.mshops.net"
  },
  notes: [
    "Workers routing for /api/* remains a separate concern from Pages configuration.",
    "Calendly embeds require frame-src https://calendly.com in a deployed CSP."
  ]
};
var contracts_default = {
  MODULE_STATUSES,
  MODULE_CTA_LABELS,
  MODULE_ACCESS_LEVELS,
  PACKAGE_IDS,
  PACKAGE_FEE_TYPES,
  DELIVERABLE_IDS,
  DELIVERABLE_FORMATS,
  DELIVERABLE_DAYS,
  IDENTITY_SOURCE_PAGES,
  IDENTITY_PACKAGE_INTEREST,
  IDENTITY_URGENCY,
  IDENTITY_STATUSES,
  componentMapping,
  deploymentReference
};

// worker/data/validate.js
var {
  MODULE_STATUSES: MODULE_STATUSES2,
  MODULE_CTA_LABELS: MODULE_CTA_LABELS2,
  MODULE_ACCESS_LEVELS: MODULE_ACCESS_LEVELS2,
  PACKAGE_IDS: PACKAGE_IDS2,
  PACKAGE_FEE_TYPES: PACKAGE_FEE_TYPES2,
  DELIVERABLE_IDS: DELIVERABLE_IDS2,
  DELIVERABLE_FORMATS: DELIVERABLE_FORMATS2,
  DELIVERABLE_DAYS: DELIVERABLE_DAYS2,
  IDENTITY_SOURCE_PAGES: IDENTITY_SOURCE_PAGES2,
  IDENTITY_PACKAGE_INTEREST: IDENTITY_PACKAGE_INTEREST2,
  IDENTITY_URGENCY: IDENTITY_URGENCY2,
  IDENTITY_STATUSES: IDENTITY_STATUSES2
} = contracts_default;
var ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
var HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
var MODULE_ID = /^[a-z0-9-]+$/;
var MODULE_NUM = /^0[1-9]$/;
var TAG_VALUE = /^[A-Z0-9_]+$/;
var DELIVERABLE_NUM = /^0[1-4]$/;
var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
__name(assert, "assert");
function assertString(value, field, minLength = 1, maxLength = Infinity) {
  assert(typeof value === "string", `${field} must be a string`);
  assert(value.length >= minLength, `${field} must be at least ${minLength} characters`);
  assert(value.length <= maxLength, `${field} must be at most ${maxLength} characters`);
}
__name(assertString, "assertString");
function assertOptionalString(value, field, maxLength = Infinity) {
  if (value == null) {
    return;
  }
  assertString(value, field, 0, maxLength);
}
__name(assertOptionalString, "assertOptionalString");
function assertArray(value, field, minItems = 0, maxItems = Infinity) {
  assert(Array.isArray(value), `${field} must be an array`);
  assert(value.length >= minItems, `${field} must include at least ${minItems} item(s)`);
  assert(value.length <= maxItems, `${field} must include at most ${maxItems} item(s)`);
}
__name(assertArray, "assertArray");
function assertEnum(value, field, validValues) {
  assert(validValues.includes(value), `${field} must be one of: ${validValues.join(", ")}`);
}
__name(assertEnum, "assertEnum");
function assertOptionalEnum(value, field, validValues) {
  if (value === void 0) {
    return;
  }
  assertEnum(value, field, validValues);
}
__name(assertOptionalEnum, "assertOptionalEnum");
function assertDateTime(value, field) {
  assertString(value, field);
  assert(ISO_DATE_TIME.test(value), `${field} must be an ISO 8601 UTC date-time`);
}
__name(assertDateTime, "assertDateTime");
function assertOptionalDateTime(value, field) {
  if (value === void 0) {
    return;
  }
  assertDateTime(value, field);
}
__name(assertOptionalDateTime, "assertOptionalDateTime");
function assertUriReference(value, field) {
  assertString(value, field);
  assert(/^(?:\/|https?:\/\/|mailto:)/i.test(value), `${field} must be a uri-reference`);
}
__name(assertUriReference, "assertUriReference");
function assertOptionalUriReference(value, field) {
  if (value == null) {
    return;
  }
  assertUriReference(value, field);
}
__name(assertOptionalUriReference, "assertOptionalUriReference");
function validateModuleRecord(record) {
  assert(record && typeof record === "object" && !Array.isArray(record), "module record must be an object");
  assertString(record.id, "module.id");
  assert(MODULE_ID.test(record.id), "module.id must be a lowercase slug");
  assertString(record.num, "module.num");
  assert(MODULE_NUM.test(record.num), "module.num must be a two-digit module number");
  assertString(record.title, "module.title", 3, 80);
  assertString(record.description, "module.description", 10, 500);
  assertOptionalString(record.long_description, "module.long_description");
  assertEnum(record.status, "module.status", MODULE_STATUSES2);
  assertArray(record.tags, "module.tags", 1, 8);
  record.tags.forEach((tag, index) => {
    assertString(tag, `module.tags[${index}]`);
    assert(TAG_VALUE.test(tag), `module.tags[${index}] must be uppercase and underscore-safe`);
  });
  assertEnum(record.cta_label, "module.cta_label", MODULE_CTA_LABELS2);
  assertOptionalUriReference(record.cta_href, "module.cta_href");
  assertOptionalUriReference(record.thumbnail_url, "module.thumbnail_url");
  assertOptionalUriReference(record.icon_url, "module.icon_url");
  assertEnum(record.access_level, "module.access_level", MODULE_ACCESS_LEVELS2);
  if (record.access_instructions !== void 0) {
    assertArray(record.access_instructions, "module.access_instructions", 0, 6);
    record.access_instructions.forEach((line, index) => assertString(line, `module.access_instructions[${index}]`));
  }
  if (record.features !== void 0) {
    assertArray(record.features, "module.features", 0, 12);
    record.features.forEach((line, index) => assertString(line, `module.features[${index}]`));
  }
  assertOptionalDateTime(record.created_at, "module.created_at");
  assertOptionalDateTime(record.updated_at, "module.updated_at");
  return record;
}
__name(validateModuleRecord, "validateModuleRecord");
function validatePackageRecord(record) {
  assert(record && typeof record === "object" && !Array.isArray(record), "package record must be an object");
  assertEnum(record.id, "package.id", PACKAGE_IDS2);
  assertString(record.title, "package.title", 1, 80);
  assertString(record.subtitle, "package.subtitle", 1, 120);
  assertEnum(record.fee_type, "package.fee_type", PACKAGE_FEE_TYPES2);
  assertString(record.description, "package.description", 20, 600);
  assertArray(record.outcomes, "package.outcomes", 1, 8);
  assertArray(record.scope, "package.scope", 1, 8);
  record.outcomes.forEach((line, index) => assertString(line, `package.outcomes[${index}]`));
  record.scope.forEach((line, index) => assertString(line, `package.scope[${index}]`));
  assertString(record.cta_label, "package.cta_label");
  if (record.is_flagship !== void 0) {
    assert(typeof record.is_flagship === "boolean", "package.is_flagship must be a boolean");
  }
  if (record.accent_color !== void 0) {
    assertString(record.accent_color, "package.accent_color");
    assert(HEX_COLOR.test(record.accent_color), "package.accent_color must be a hex color");
  }
  if (record.available !== void 0) {
    assert(typeof record.available === "boolean", "package.available must be a boolean");
  }
  if (record.display_order !== void 0) {
    assert(Number.isInteger(record.display_order), "package.display_order must be an integer");
    assert(record.display_order >= 1 && record.display_order <= 10, "package.display_order must be between 1 and 10");
  }
  assertOptionalDateTime(record.created_at, "package.created_at");
  return record;
}
__name(validatePackageRecord, "validatePackageRecord");
function validateDeliverableRecord(record) {
  assert(record && typeof record === "object" && !Array.isArray(record), "deliverable record must be an object");
  assertEnum(record.id, "deliverable.id", DELIVERABLE_IDS2);
  assertString(record.artifact_num, "deliverable.artifact_num");
  assert(DELIVERABLE_NUM.test(record.artifact_num), "deliverable.artifact_num must be a two-digit artifact number");
  assertString(record.title, "deliverable.title");
  assertString(record.description, "deliverable.description");
  assertArray(record.formats, "deliverable.formats", 1);
  record.formats.forEach((format, index) => assertEnum(format, `deliverable.formats[${index}]`, DELIVERABLE_FORMATS2));
  assertEnum(record.delivery_day, "deliverable.delivery_day", DELIVERABLE_DAYS2);
  assertOptionalUriReference(record.thumbnail_url, "deliverable.thumbnail_url");
  assertOptionalUriReference(record.sample_url, "deliverable.sample_url");
  assertOptionalString(record.icon_symbol, "deliverable.icon_symbol", 4);
  if (record.accent_color !== void 0) {
    assertString(record.accent_color, "deliverable.accent_color");
    assert(HEX_COLOR.test(record.accent_color), "deliverable.accent_color must be a hex color");
  }
  if (record.display_order !== void 0) {
    assert(Number.isInteger(record.display_order), "deliverable.display_order must be an integer");
    assert(record.display_order >= 1 && record.display_order <= 4, "deliverable.display_order must be between 1 and 4");
  }
  return record;
}
__name(validateDeliverableRecord, "validateDeliverableRecord");
function validateIdentityRecord(record) {
  assert(record && typeof record === "object" && !Array.isArray(record), "identity record must be an object");
  if (record.id !== void 0) {
    assertString(record.id, "identity.id");
    assert(UUID.test(record.id), "identity.id must be a UUID");
  }
  assertString(record.operator_handle, "identity.operator_handle", 1, 120);
  if (record.organization !== void 0 && record.organization !== null) {
    assertString(record.organization, "identity.organization", 0, 200);
  }
  assertString(record.contact_email, "identity.contact_email");
  assert(EMAIL.test(record.contact_email), "identity.contact_email must be an email");
  assertString(record.transmission, "identity.transmission", 1, 2e3);
  assertOptionalEnum(record.source_page, "identity.source_page", IDENTITY_SOURCE_PAGES2);
  assertOptionalEnum(record.package_interest, "identity.package_interest", IDENTITY_PACKAGE_INTEREST2);
  if (record.module_interest !== void 0 && record.module_interest !== null) {
    assertString(record.module_interest, "identity.module_interest");
  }
  assertOptionalEnum(record.urgency, "identity.urgency", IDENTITY_URGENCY2);
  if (record.utm_source !== void 0 && record.utm_source !== null) {
    assertString(record.utm_source, "identity.utm_source");
  }
  if (record.utm_medium !== void 0 && record.utm_medium !== null) {
    assertString(record.utm_medium, "identity.utm_medium");
  }
  if (record.auto_reply_sent !== void 0) {
    assert(typeof record.auto_reply_sent === "boolean", "identity.auto_reply_sent must be a boolean");
  }
  assertOptionalDateTime(record.contacted_at, "identity.contacted_at");
  if (record.ip_address !== void 0 && record.ip_address !== null) {
    assertString(record.ip_address, "identity.ip_address");
  }
  assertOptionalEnum(record.status, "identity.status", IDENTITY_STATUSES2);
  return record;
}
__name(validateIdentityRecord, "validateIdentityRecord");
function validateCollection(records, validator, label) {
  return records.map((record, index) => {
    try {
      return validator(record);
    } catch (error) {
      error.message = `${label}[${index}] ${error.message}`;
      throw error;
    }
  });
}
__name(validateCollection, "validateCollection");
var validate_default = {
  validateModuleRecord,
  validatePackageRecord,
  validateDeliverableRecord,
  validateIdentityRecord,
  validateCollection
};

// worker/data/store.js
var {
  validateCollection: validateCollection2,
  validateModuleRecord: validateModuleRecord2,
  validatePackageRecord: validatePackageRecord2,
  validateDeliverableRecord: validateDeliverableRecord2,
  validateIdentityRecord: validateIdentityRecord2
} = validate_default;
var moduleRegistry = validateCollection2([
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
], validateModuleRecord2, "moduleRegistry");
var packageCatalog = validateCollection2([
  {
    id: "operator-assessment",
    title: "OPERATOR ASSESSMENT",
    subtitle: "Entry Point Engagement",
    fee_type: "fixed",
    description: `A rapid-fire assessment of your AI agent deployment's orchestration layer. Designed for teams who need a fast, credible answer to "are we exposed?" before a board meeting, audit, or go-live.`,
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
], validatePackageRecord2, "packageCatalog");
var deliverableCatalog = validateCollection2([
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
], validateDeliverableRecord2, "deliverableCatalog");
var deliverableDownloads = {
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
var engagements = [
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
var identities = validateCollection2([
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
], validateIdentityRecord2, "identities");
var moduleScenarioMetadataById = {
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
__name(getModuleRoute, "getModuleRoute");
function getModuleStaticPath(id) {
  return `/modules/${id}.html`;
}
__name(getModuleStaticPath, "getModuleStaticPath");
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
      accessInstructions: [...record.access_instructions || []],
      features: [...record.features || []],
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
__name(toModulePayload, "toModulePayload");
function toDeliverablePayload(record) {
  return {
    ...record,
    formats: [...record.formats],
    sample_url: record.sample_url || null,
    download_url: `/api/deliverables/download?id=${record.id}`
  };
}
__name(toDeliverablePayload, "toDeliverablePayload");
function createId(prefix, collection) {
  const next = collection.length + 1001;
  return `${prefix}-${next}`;
}
__name(createId, "createId");
function createIdentityId() {
  return crypto.randomUUID();
}
__name(createIdentityId, "createIdentityId");
var modules = moduleRegistry.map(toModulePayload);
var packages = packageCatalog.map((entry) => ({
  ...entry,
  outcomes: [...entry.outcomes],
  scope: [...entry.scope]
}));
var deliverables = deliverableCatalog.map(toDeliverablePayload);
var store_default = {
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

// worker/data/serviceSelector.js
var serviceCatalog = [
  {
    slug: "ai_security_audit",
    name: "AI Security Audit",
    category: "ai_security",
    public_description: "Identify vulnerabilities in your AI stack before they become breaches.",
    operator_description: "AI and LLM risk audit with controls mapping, remediation planning, and operator escalation support.",
    best_for: "Businesses with customer-facing AI or regulated data",
    starting_price: 2500,
    price_range: "$2,500 - $8,500",
    delivery_time: "5-10 business days",
    default_cta: "Start Security Intake",
    active: true,
    icon: "SEC"
  },
  {
    slug: "ai_agent_build",
    name: "AI Agent Build",
    category: "ai_agents",
    public_description: "Custom AI agents that take action across real business workflows.",
    operator_description: "Agent design and build covering tools, permissions, memory, orchestration, and safety gates.",
    best_for: "Teams automating multi-step business processes",
    starting_price: 4e3,
    price_range: "$4,000 - $18,000",
    delivery_time: "2-6 weeks",
    default_cta: "Start Agent Intake",
    active: true,
    icon: "AGT"
  },
  {
    slug: "ai_automation_systems",
    name: "AI Automation Systems",
    category: "ai_automation",
    public_description: "Replace manual workflows with intelligent, reliable automation.",
    operator_description: "Workflow automation for n8n, Make, Zapier, CRM, email, intake, and reporting pipelines.",
    best_for: "Ops-heavy teams with repetitive processes",
    starting_price: 3e3,
    price_range: "$3,000 - $12,000",
    delivery_time: "2-4 weeks",
    default_cta: "Start Automation Intake",
    active: true,
    icon: "AUT"
  },
  {
    slug: "rag_governance_review",
    name: "RAG Governance Review",
    category: "rag",
    public_description: "Audit and improve your retrieval-augmented generation pipelines.",
    operator_description: "Review vector stores, retrieval boundaries, attribution, hallucination risk, and retention policy.",
    best_for: "Teams with existing RAG or knowledge-base AI",
    starting_price: 3500,
    price_range: "$3,500 - $9,000",
    delivery_time: "1-2 weeks",
    default_cta: "Start RAG Intake",
    active: true,
    icon: "RAG"
  },
  {
    slug: "local_ai_setup",
    name: "Local AI Setup",
    category: "local_ai",
    public_description: "Deploy AI models on your own infrastructure without cloud dependency.",
    operator_description: "Private and local AI setup for Ollama, LM Studio, self-hosted model workflows, and private RAG.",
    best_for: "Privacy-first or air-gapped environments",
    starting_price: 2e3,
    price_range: "$2,000 - $7,500",
    delivery_time: "1-3 weeks",
    default_cta: "Start Local AI Intake",
    active: true,
    icon: "LOC"
  },
  {
    slug: "copilot_governance",
    name: "Copilot Governance",
    category: "copilot",
    public_description: "Govern, monitor, and secure Microsoft Copilot in your enterprise.",
    operator_description: "Enterprise Copilot governance review covering access, policy, logging, compliance, and user controls.",
    best_for: "Microsoft 365 and enterprise Copilot deployments",
    starting_price: 3e3,
    price_range: "$3,000 - $10,000",
    delivery_time: "1-3 weeks",
    default_cta: "Start Governance Intake",
    active: true,
    icon: "COP"
  },
  {
    slug: "aeo_visibility_setup",
    name: "AEO Visibility Setup",
    category: "aeo",
    public_description: "Optimize your content to appear in AI-generated answers and search summaries.",
    operator_description: "Answer Engine Optimization package for llms.txt, schema, structured content, glossary APIs, and citation-ready pages.",
    best_for: "Brands wanting visibility in AI search and summary products",
    starting_price: 1500,
    price_range: "$1,500 - $5,000",
    delivery_time: "1-2 weeks",
    default_cta: "Start AEO Intake",
    active: true,
    icon: "AEO"
  },
  {
    slug: "multimodal_ai_risk_review",
    name: "Multimodal AI Risk Review",
    category: "multimodal_ai",
    public_description: "Assess risks in AI systems using text, images, audio, video, or documents.",
    operator_description: "Risk review for multimodal inputs, media retention, biometric exposure, moderation, latency, cost, and explainability.",
    best_for: "Teams using document upload, image analysis, voice AI, or video AI",
    starting_price: 3e3,
    price_range: "$3,000 - $9,500",
    delivery_time: "1-3 weeks",
    default_cta: "Start Multimodal Intake",
    active: true,
    icon: "MM"
  }
];
var serviceMarketplaceModules = [
  {
    module_id: "msh-ai-security-audit",
    service_slug: "ai_security_audit",
    name: "AI Security Audit",
    category: "ai_security",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=ai_security_audit",
    description: "AI and LLM security risk audit with remediation roadmap.",
    revenue_type: "consulting",
    base_price: 2500,
    recommended_upsell: "Monthly AI Governance Retainer",
    required_inputs: ["AI tools", "data sensitivity", "current AI usage", "compliance requirements"],
    delivery_outputs: ["Risk score", "Findings", "Controls matrix", "30-day remediation roadmap"],
    status: "active"
  },
  {
    module_id: "msh-ai-agent-build",
    service_slug: "ai_agent_build",
    name: "AI Agent Build",
    category: "ai_agents",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=ai_agent_build",
    description: "Custom AI agent build for business workflows.",
    revenue_type: "consulting",
    base_price: 4e3,
    recommended_upsell: "Agent Ops Retainer",
    required_inputs: ["Agent goal", "tools", "permissions", "data access", "approval gates"],
    delivery_outputs: ["Agent blueprint", "Implementation", "Safety controls", "Handoff documentation"],
    status: "active"
  },
  {
    module_id: "msh-ai-automation-systems",
    service_slug: "ai_automation_systems",
    name: "AI Automation Systems",
    category: "ai_automation",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=ai_automation_systems",
    description: "Automated business workflows using AI and workflow orchestration tools.",
    revenue_type: "consulting",
    base_price: 3e3,
    recommended_upsell: "Automation Maintenance Retainer",
    required_inputs: ["Workflow description", "current tools", "volume", "failure points"],
    delivery_outputs: ["Workflow map", "Automation build", "Testing plan", "Runbook"],
    status: "active"
  },
  {
    module_id: "msh-rag-governance-review",
    service_slug: "rag_governance_review",
    name: "RAG Governance Review",
    category: "rag",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=rag_governance_review",
    description: "Governance and security review for RAG and knowledge assistant systems.",
    revenue_type: "consulting",
    base_price: 3500,
    recommended_upsell: "Private RAG Build",
    required_inputs: ["Data sources", "vector database", "user roles", "sensitive documents"],
    delivery_outputs: ["Retrieval risk score", "Access-control recommendations", "Governance plan"],
    status: "active"
  },
  {
    module_id: "msh-local-ai-setup",
    service_slug: "local_ai_setup",
    name: "Local AI Setup",
    category: "local_ai",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=local_ai_setup",
    description: "Private local and self-hosted AI setup for sensitive workflows.",
    revenue_type: "consulting",
    base_price: 2e3,
    recommended_upsell: "Local AI Support Retainer",
    required_inputs: ["Hardware", "privacy needs", "model requirements", "workflow goals"],
    delivery_outputs: ["Local AI setup", "Model recommendations", "Security controls", "Operator guide"],
    status: "active"
  },
  {
    module_id: "msh-aeo-visibility-setup",
    service_slug: "aeo_visibility_setup",
    name: "AEO Visibility Setup",
    category: "aeo",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=aeo_visibility_setup",
    description: "Answer Engine Optimization for AI search discoverability.",
    revenue_type: "consulting",
    base_price: 1500,
    recommended_upsell: "Monthly AEO Content Retainer",
    required_inputs: ["Website", "target topics", "existing content", "schema status"],
    delivery_outputs: ["AEO audit", "llms.txt", "schema plan", "citation-ready content map"],
    status: "active"
  },
  {
    module_id: "msh-multimodal-ai-risk-review",
    service_slug: "multimodal_ai_risk_review",
    name: "Multimodal AI Risk Review",
    category: "multimodal_ai",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=multimodal_ai_risk_review",
    description: "Risk review for AI systems using images, audio, video, documents, or biometric-adjacent data.",
    revenue_type: "consulting",
    base_price: 3e3,
    recommended_upsell: "AI Security Audit",
    required_inputs: ["Modalities", "media retention", "privacy needs", "moderation controls"],
    delivery_outputs: ["Multimodal risk profile", "Privacy controls", "Moderation recommendations", "Roadmap"],
    status: "active"
  },
  {
    module_id: "msh-copilot-governance",
    service_slug: "copilot_governance",
    name: "Copilot Governance",
    category: "copilot",
    public_service_route: "/services",
    operator_route: "/operator/service-intake?service=copilot_governance",
    description: "Governance package for Microsoft Copilot and enterprise AI adoption.",
    revenue_type: "consulting",
    base_price: 3e3,
    recommended_upsell: "Enterprise AI Governance Sprint",
    required_inputs: ["Microsoft 365 tenant context", "user groups", "data access", "policy requirements"],
    delivery_outputs: ["Governance map", "Risk controls", "Policy recommendations", "Rollout checklist"],
    status: "active"
  }
];
var serviceMap = {
  secure_ai_tools: { primary: "ai_security_audit", secondary: "copilot_governance" },
  build_ai_agent: { primary: "ai_agent_build", secondary: "ai_automation_systems" },
  automate_workflow: { primary: "ai_automation_systems", secondary: "ai_agent_build" },
  improve_ai_visibility: { primary: "aeo_visibility_setup", secondary: "rag_governance_review" },
  build_private_local_ai: { primary: "local_ai_setup", secondary: "ai_security_audit" },
  govern_copilot_enterprise_ai: { primary: "copilot_governance", secondary: "ai_security_audit" },
  assess_multimodal_ai: { primary: "multimodal_ai_risk_review", secondary: "ai_security_audit" },
  not_sure: { primary: "ai_security_audit", secondary: "aeo_visibility_setup" }
};
var selectorIdPattern = /^sel-[a-z0-9]{6,}$/;
var serviceSelectorSubmissions = [];
var allowedBusinessTypes = /* @__PURE__ */ new Set([
  "solo_freelancer",
  "small_business",
  "agency",
  "saas_company",
  "enterprise_team",
  "nonprofit",
  "regulated_business"
]);
var allowedUsage = /* @__PURE__ */ new Set([
  "chatgpt",
  "microsoft_copilot",
  "gemini",
  "claude",
  "customer_chatbot",
  "internal_knowledge_assistant",
  "rag_system",
  "n8n_make_zapier",
  "local_models_ollama",
  "multimodal_ai",
  "no_ai_yet"
]);
var allowedRiskLevels = /* @__PURE__ */ new Set([
  "handling_sensitive_data",
  "customer_facing_ai",
  "internal_only_ai",
  "regulated_compliance_heavy",
  "unknown"
]);
var allowedBudgetRanges = /* @__PURE__ */ new Set(["under_500", "500_2500", "2500_10000", "10000_plus", "not_sure"]);
var allowedUrgency = /* @__PURE__ */ new Set(["this_week", "this_month", "planning_phase", "research_only"]);
function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeText, "normalizeText");
function normalizeNullable(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}
__name(normalizeNullable, "normalizeNullable");
function normalizeArray(values) {
  return Array.isArray(values) ? values.map((value) => normalizeText(value)).filter(Boolean) : [];
}
__name(normalizeArray, "normalizeArray");
function clampCatalogUsage(values) {
  const filtered = normalizeArray(values).filter((value) => allowedUsage.has(value));
  if (!filtered.length) {
    return ["no_ai_yet"];
  }
  if (filtered.includes("no_ai_yet")) {
    return ["no_ai_yet"];
  }
  return [...new Set(filtered)];
}
__name(clampCatalogUsage, "clampCatalogUsage");
function generateSelectorId() {
  return `sel-${Date.now().toString(36)}${Math.floor(Math.random() * 1679616).toString(36).padStart(4, "0")}`;
}
__name(generateSelectorId, "generateSelectorId");
function derivePriority(score2) {
  if (score2 >= 75) {
    return "high";
  }
  if (score2 >= 40) {
    return "medium";
  }
  return "low";
}
__name(derivePriority, "derivePriority");
function deriveRevenuePotential(budgetRange) {
  switch (budgetRange) {
    case "under_500":
      return "low";
    case "500_2500":
      return "medium";
    case "2500_10000":
      return "high";
    case "10000_plus":
      return "enterprise";
    default:
      return "medium";
  }
}
__name(deriveRevenuePotential, "deriveRevenuePotential");
function computeUrgencyScore(answers) {
  let score2 = 20;
  const usage = answers.current_ai_usage || [];
  switch (answers.urgency) {
    case "this_week":
      score2 += 25;
      break;
    case "this_month":
      score2 += 15;
      break;
    case "planning_phase":
      score2 += 5;
      break;
    default:
      break;
  }
  switch (answers.risk_level) {
    case "regulated_compliance_heavy":
      score2 += 30;
      break;
    case "customer_facing_ai":
    case "handling_sensitive_data":
      score2 += 20;
      break;
    case "unknown":
      score2 += 10;
      break;
    case "internal_only_ai":
      score2 += 5;
      break;
    default:
      break;
  }
  if (answers.business_type === "enterprise_team" || answers.business_type === "regulated_business") {
    score2 += 20;
  } else if (answers.business_type === "saas_company" || answers.business_type === "agency") {
    score2 += 10;
  }
  if (usage.includes("customer_chatbot")) score2 += 15;
  if (usage.includes("rag_system")) score2 += 10;
  if (usage.includes("multimodal_ai")) score2 += 10;
  if (usage.includes("microsoft_copilot")) score2 += 5;
  if (usage.includes("n8n_make_zapier")) score2 += 5;
  if (usage.includes("local_models_ollama")) score2 += 5;
  return Math.max(0, Math.min(100, score2));
}
__name(computeUrgencyScore, "computeUrgencyScore");
function normalizeSelectorAnswers(payload = {}) {
  const usage = clampCatalogUsage(payload.current_ai_usage);
  const primaryGoal = normalizeText(payload.primary_goal) || "not_sure";
  const businessType = normalizeText(payload.business_type);
  const riskLevel = normalizeText(payload.risk_level) || "unknown";
  const budgetRange = normalizeText(payload.budget_range) || "not_sure";
  const urgency = normalizeText(payload.urgency) || "research_only";
  return {
    primary_goal: Object.prototype.hasOwnProperty.call(serviceMap, primaryGoal) ? primaryGoal : "not_sure",
    business_type: allowedBusinessTypes.has(businessType) ? businessType : null,
    current_ai_usage: usage,
    risk_level: allowedRiskLevels.has(riskLevel) ? riskLevel : "unknown",
    budget_range: allowedBudgetRanges.has(budgetRange) ? budgetRange : "not_sure",
    urgency: allowedUrgency.has(urgency) ? urgency : "research_only",
    source_route: normalizeText(payload.source_route) || "/services"
  };
}
__name(normalizeSelectorAnswers, "normalizeSelectorAnswers");
function computeServiceSelectorResult(answers, selectorId = generateSelectorId()) {
  const usage = answers.current_ai_usage || [];
  const primaryGoal = answers.primary_goal || "not_sure";
  const match = serviceMap[primaryGoal] || serviceMap.not_sure;
  let recommendedService = match.primary;
  let secondaryService = match.secondary;
  if (usage.includes("customer_chatbot") && recommendedService !== "ai_security_audit") {
    secondaryService = "ai_security_audit";
  } else if (usage.includes("rag_system") && recommendedService !== "rag_governance_review") {
    secondaryService = "rag_governance_review";
  } else if (usage.includes("n8n_make_zapier") && recommendedService !== "ai_automation_systems") {
    secondaryService = "ai_automation_systems";
  } else if (usage.includes("local_models_ollama") && recommendedService !== "local_ai_setup") {
    secondaryService = "local_ai_setup";
  } else if (usage.includes("microsoft_copilot") && recommendedService !== "copilot_governance") {
    secondaryService = "copilot_governance";
  } else if (usage.includes("multimodal_ai") && recommendedService !== "multimodal_ai_risk_review") {
    secondaryService = "multimodal_ai_risk_review";
  }
  const urgencyScore = computeUrgencyScore(answers);
  const revenuePotential = deriveRevenuePotential(answers.budget_range);
  const priority = derivePriority(urgencyScore);
  const params = new URLSearchParams({
    service: recommendedService,
    priority,
    source: "service-selector",
    selector_id: selectorId
  });
  const primary = getServiceBySlug(recommendedService);
  return {
    status: "service-match-ready",
    recommended_service: recommendedService,
    secondary_service: secondaryService,
    urgency_score: urgencyScore,
    revenue_potential: revenuePotential,
    priority,
    next_route: `/enter?${params.toString()}`,
    selector_id: selectorId,
    explanation: primary ? `${primary.name} is the strongest fit based on your stated goal, AI usage, urgency, and risk profile.` : "AI Security Audit is the default recommended starting point."
  };
}
__name(computeServiceSelectorResult, "computeServiceSelectorResult");
function getServiceBySlug(slug) {
  return serviceCatalog.find((service) => service.slug === slug);
}
__name(getServiceBySlug, "getServiceBySlug");
function upsertServiceSelectorSubmission(submission) {
  const index = serviceSelectorSubmissions.findIndex((entry) => entry.selector_id === submission.selector_id);
  if (index >= 0) {
    serviceSelectorSubmissions[index] = { ...serviceSelectorSubmissions[index], ...submission };
    return serviceSelectorSubmissions[index];
  }
  serviceSelectorSubmissions.unshift(submission);
  return submission;
}
__name(upsertServiceSelectorSubmission, "upsertServiceSelectorSubmission");
function recordServiceSelectorSubmission(answers, result) {
  return upsertServiceSelectorSubmission({
    selector_id: result.selector_id,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    primary_goal: answers.primary_goal,
    business_type: answers.business_type || null,
    current_ai_usage: [...answers.current_ai_usage || []],
    risk_level: answers.risk_level || null,
    budget_range: answers.budget_range || null,
    urgency: answers.urgency || null,
    source_route: answers.source_route || "/services",
    recommended_service: result.recommended_service,
    secondary_service: result.secondary_service || null,
    urgency_score: result.urgency_score,
    revenue_potential: result.revenue_potential,
    priority: result.priority,
    next_route: result.next_route,
    engagement_id: null,
    status: "service-match-ready"
  });
}
__name(recordServiceSelectorSubmission, "recordServiceSelectorSubmission");
function attachEngagementToSelector(details = {}) {
  const selectorId = normalizeText(details.selector_id || details.selectorId);
  if (!selectorId) {
    return null;
  }
  const existing = serviceSelectorSubmissions.find((entry) => entry.selector_id === selectorId);
  const base = existing || {
    selector_id: selectorId,
    created_at: details.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    source_route: details.source || "service-selector",
    recommended_service: normalizeText(details.recommended_service || details.moduleInterest || details.service) || "ai_security_audit",
    secondary_service: normalizeNullable(details.secondary_service),
    urgency_score: Number.isFinite(Number(details.urgency_score)) ? Number(details.urgency_score) : 0,
    revenue_potential: normalizeText(details.revenue_potential) || "medium",
    priority: normalizeText(details.priority) || "medium",
    next_route: "",
    status: "service-match-ready"
  };
  base.engagement_id = normalizeText(details.engagement_id || details.engagementId) || base.engagement_id || null;
  base.status = normalizeText(details.status) || "intake-received";
  base.recommended_service = normalizeText(details.recommended_service || details.moduleInterest || details.service) || base.recommended_service;
  base.secondary_service = normalizeNullable(details.secondary_service) || base.secondary_service || null;
  base.priority = normalizeText(details.priority) || base.priority || "medium";
  base.revenue_potential = normalizeText(details.revenue_potential) || base.revenue_potential || "medium";
  base.urgency_score = Number.isFinite(Number(details.urgency_score)) ? Number(details.urgency_score) : base.urgency_score || 0;
  base.created_at = details.created_at || base.created_at || (/* @__PURE__ */ new Date()).toISOString();
  return upsertServiceSelectorSubmission(base);
}
__name(attachEngagementToSelector, "attachEngagementToSelector");
function getServiceSelectorSubmission(selectorId) {
  const normalizedId = normalizeText(selectorId);
  if (!normalizedId) {
    return null;
  }
  return serviceSelectorSubmissions.find((entry) => entry.selector_id === normalizedId) || null;
}
__name(getServiceSelectorSubmission, "getServiceSelectorSubmission");
function getServiceIntakeSubmissionByEngagementId(engagementId) {
  const normalizedId = normalizeText(engagementId);
  if (!normalizedId) {
    return null;
  }
  return serviceSelectorSubmissions.find((entry) => entry.engagement_id === normalizedId) || null;
}
__name(getServiceIntakeSubmissionByEngagementId, "getServiceIntakeSubmissionByEngagementId");
function getEngagementById(engagements3 = [], engagementId) {
  const normalizedId = normalizeText(engagementId);
  if (!normalizedId) {
    return null;
  }
  return engagements3.find((entry) => entry.id === normalizedId) || null;
}
__name(getEngagementById, "getEngagementById");
function buildSelectorRaw(submission = {}) {
  return {
    primary_goal: submission.primary_goal || null,
    business_type: submission.business_type || null,
    current_ai_usage: [...submission.current_ai_usage || []],
    risk_level: submission.risk_level || null,
    budget_range: submission.budget_range || null,
    urgency: submission.urgency || null,
    source_route: submission.source_route || null
  };
}
__name(buildSelectorRaw, "buildSelectorRaw");
function buildEngagementDetails(engagement = {}) {
  if (!engagement || !engagement.id) {
    return null;
  }
  return {
    operatorHandle: engagement.operatorHandle || null,
    organization: engagement.organization || null,
    contactEmail: engagement.contactEmail || null,
    transmission: engagement.transmission || null,
    source: engagement.source || null
  };
}
__name(buildEngagementDetails, "buildEngagementDetails");
function buildIntakeQueueRow(submission = {}, engagementEntry = null, engagementRecord = null) {
  const engagement = engagementRecord || null;
  return {
    selector_id: submission.selector_id || engagement?.selectorId || null,
    engagement_id: submission.engagement_id || engagementEntry?.engagement_id || engagement?.id || null,
    recommended_service: submission.recommended_service || engagementEntry?.recommended_service || engagement?.recommendedService || engagement?.moduleInterest || null,
    secondary_service: submission.secondary_service || engagementEntry?.secondary_service || engagement?.secondaryService || null,
    urgency_score: submission.urgency_score ?? engagementEntry?.urgency_score ?? engagement?.urgencyScore ?? 0,
    revenue_potential: submission.revenue_potential || engagementEntry?.revenue_potential || engagement?.revenuePotential || "medium",
    priority: submission.priority || engagementEntry?.priority || engagement?.priority || engagement?.urgency || "medium",
    status: submission.status || engagementEntry?.status || engagement?.status || "service-match-ready",
    agent_summary: submission.agent_summary || null,
    agent_notes: submission.agent_notes || null,
    processed_at: submission.processed_at || null,
    created_at: engagementEntry?.created_at || submission.created_at || engagement?.createdAt || null,
    security_audit_status: submission.security_audit_status || "not_started",
    security_audit_summary: submission.security_audit_summary || null,
    security_risk_score: submission.security_risk_score ?? null,
    security_exposure_level: submission.security_exposure_level || null,
    security_summary: submission.security_summary || null,
    recommended_security_service: submission.recommended_security_service || null,
    agent_type: submission.agent_type || null,
    selector_raw: buildSelectorRaw(submission),
    engagement_details: buildEngagementDetails(engagement)
  };
}
__name(buildIntakeQueueRow, "buildIntakeQueueRow");
function persistIntakeAgentRecord(record = {}, engagements3 = []) {
  const selectorId = normalizeText(record.selector_id);
  const engagementId = normalizeText(record.engagement_id);
  if (!selectorId || !engagementId) {
    throw new Error("selector_id and engagement_id are required");
  }
  upsertServiceSelectorSubmission({
    selector_id: selectorId,
    engagement_id: engagementId,
    recommended_service: record.recommended_service,
    secondary_service: record.secondary_service || null,
    urgency_score: record.urgency_score ?? 0,
    revenue_potential: record.revenue_potential || "medium",
    priority: record.priority || "normal",
    agent_summary: record.agent_summary || null,
    agent_notes: record.agent_notes || null,
    status: record.status || "intake-received",
    processed_at: record.processed_at || (/* @__PURE__ */ new Date()).toISOString(),
    created_at: record.created_at || (/* @__PURE__ */ new Date()).toISOString()
  });
  const engagement = getEngagementById(engagements3, engagementId);
  if (engagement) {
    engagement.selectorId = selectorId;
    engagement.recommendedService = record.recommended_service || engagement.recommendedService;
    engagement.secondaryService = record.secondary_service || engagement.secondaryService;
    engagement.urgencyScore = record.urgency_score ?? engagement.urgencyScore;
    engagement.revenuePotential = record.revenue_potential || engagement.revenuePotential;
    engagement.priority = record.priority || engagement.priority;
    engagement.status = record.status || "intake-received";
  }
  return getServiceSelectorSubmission(selectorId);
}
__name(persistIntakeAgentRecord, "persistIntakeAgentRecord");
function persistSecurityIntakeRecord(record = {}, engagements3 = []) {
  const selectorId = normalizeText(record.selector_id);
  const engagementId = normalizeText(record.engagement_id);
  if (!selectorId || !engagementId) {
    throw new Error("selector_id and engagement_id are required");
  }
  upsertServiceSelectorSubmission({
    selector_id: selectorId,
    engagement_id: engagementId,
    security_risk_score: record.security_risk_score ?? 0,
    security_exposure_level: record.security_exposure_level || "low",
    security_summary: record.security_summary || null,
    recommended_security_service: record.recommended_security_service || "ai_security_audit",
    agent_type: record.agent_type || "security-intake",
    status: record.status || "ready-for-review",
    processed_at: record.processed_at || (/* @__PURE__ */ new Date()).toISOString(),
    created_at: record.created_at || (/* @__PURE__ */ new Date()).toISOString()
  });
  const engagement = getEngagementById(engagements3, engagementId);
  if (engagement) {
    engagement.selectorId = selectorId;
    engagement.status = record.status || "ready-for-review";
  }
  return getServiceSelectorSubmission(selectorId);
}
__name(persistSecurityIntakeRecord, "persistSecurityIntakeRecord");
var ALLOWED_INTAKE_STATUSES = /* @__PURE__ */ new Set(["intake-received", "ready-for-review", "closed"]);
function updateServiceIntakeStatus(selectorId, status, engagements3 = []) {
  const normalizedId = normalizeText(selectorId);
  const normalizedStatus = normalizeText(status);
  if (!normalizedId) {
    throw new Error("selector_id is required");
  }
  if (!ALLOWED_INTAKE_STATUSES.has(normalizedStatus)) {
    throw new Error("Invalid intake status");
  }
  const submission = getServiceSelectorSubmission(normalizedId);
  if (!submission) {
    throw new Error("Selector submission not found");
  }
  submission.status = normalizedStatus;
  upsertServiceSelectorSubmission(submission);
  const engagementId = submission.engagement_id;
  if (engagementId) {
    const engagement = getEngagementById(engagements3, engagementId);
    if (engagement) {
      engagement.status = normalizedStatus;
    }
  }
  return submission;
}
__name(updateServiceIntakeStatus, "updateServiceIntakeStatus");
function listServiceIntakeQueue(engagements3 = []) {
  const engagementBySelector = /* @__PURE__ */ new Map();
  const engagementById = /* @__PURE__ */ new Map();
  for (const entry of engagements3) {
    engagementById.set(entry.id, entry);
    if (entry.selectorId) {
      engagementBySelector.set(entry.selectorId, entry);
    }
  }
  const engagementMap = new Map(
    engagements3.filter((entry) => entry.selectorId || entry.recommendedService).map((entry) => [
      entry.selectorId || entry.id,
      {
        selector_id: entry.selectorId || null,
        engagement_id: entry.id,
        recommended_service: entry.recommendedService || entry.moduleInterest || null,
        secondary_service: entry.secondaryService || null,
        urgency_score: entry.urgencyScore || 0,
        revenue_potential: entry.revenuePotential || "medium",
        priority: entry.priority || entry.urgency || "medium",
        status: entry.status || "intake-received",
        created_at: entry.createdAt || null
      }
    ])
  );
  const queue = [];
  for (const submission of serviceSelectorSubmissions) {
    const engagementEntry = submission.selector_id ? engagementMap.get(submission.selector_id) : null;
    const engagementRecord = submission.engagement_id && engagementById.get(submission.engagement_id) || submission.selector_id && engagementBySelector.get(submission.selector_id) || null;
    queue.push(buildIntakeQueueRow(submission, engagementEntry, engagementRecord));
  }
  for (const engagement of engagements3) {
    if (!engagement.selectorId && !engagement.recommendedService) {
      continue;
    }
    if (queue.some((entry) => entry.engagement_id === engagement.id)) {
      continue;
    }
    const engagementEntry = engagementMap.get(engagement.selectorId || engagement.id);
    queue.push(buildIntakeQueueRow({}, engagementEntry, engagement));
  }
  return queue.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}
__name(listServiceIntakeQueue, "listServiceIntakeQueue");
var serviceSelector_default = {
  selectorIdPattern,
  serviceCatalog,
  serviceMarketplaceModules,
  serviceSelectorSubmissions,
  normalizeSelectorAnswers,
  computeServiceSelectorResult,
  recordServiceSelectorSubmission,
  attachEngagementToSelector,
  listServiceIntakeQueue,
  getServiceSelectorSubmission,
  getServiceIntakeSubmissionByEngagementId,
  getEngagementById,
  persistIntakeAgentRecord,
  persistSecurityIntakeRecord,
  updateServiceIntakeStatus,
  upsertServiceSelectorSubmission,
  getServiceBySlug,
  generateSelectorId
};

// worker/data/auditLite.js
var auditLiteMarketplaceModule = {
  module_id: "msh-ai-security-audit-lite",
  service_slug: "ai_security_audit_lite",
  name: "AI Security Audit Lite",
  category: "ai_security",
  public_service_route: "/apps/ai-security-audit",
  operator_route: "/operator/audit-lite",
  description: "Free diagnostic AI security risk check that scores exposure and routes qualified leads into a full audit intake.",
  revenue_type: "consulting",
  base_price: 0,
  recommended_upsell: "Full AI Security Audit",
  required_inputs: [
    "company_type",
    "ai_tools_used",
    "data_used_with_ai",
    "ai_exposure",
    "governance_controls",
    "main_concern"
  ],
  delivery_outputs: [
    "risk_score",
    "risk_tier",
    "top_3_risks",
    "recommended_next_step",
    "intake_route"
  ],
  status: "active"
};
var allowedCompanyTypes = /* @__PURE__ */ new Set([
  "solo_operator",
  "small_business",
  "agency",
  "saas_company",
  "enterprise_team",
  "regulated_business"
]);
var allowedAiTools = /* @__PURE__ */ new Set([
  "chatgpt",
  "microsoft_copilot",
  "gemini",
  "claude",
  "customer_chatbot",
  "internal_ai_assistant",
  "rag_knowledge_base",
  "ai_agent",
  "n8n_make_zapier",
  "local_llm_ollama",
  "multimodal_ai",
  "none_yet"
]);
var allowedData = /* @__PURE__ */ new Set([
  "public_content",
  "internal_docs",
  "customer_data",
  "financial_data",
  "health_data",
  "legal_data",
  "credentials_or_secrets",
  "regulated_data",
  "not_sure"
]);
var allowedExposure = /* @__PURE__ */ new Set([
  "internal_only",
  "customer_facing",
  "public_website",
  "connected_to_business_tools",
  "autonomous_actions",
  "not_sure"
]);
var allowedControls = /* @__PURE__ */ new Set([
  "written_ai_policy",
  "approved_tool_list",
  "access_controls",
  "logging_monitoring",
  "human_review",
  "vendor_review",
  "prompt_security_testing",
  "none",
  "not_sure"
]);
var allowedConcern = /* @__PURE__ */ new Set([
  "data_leakage",
  "prompt_injection",
  "employee_misuse",
  "compliance",
  "agent_actions",
  "automation_failure",
  "hallucinations",
  "not_sure"
]);
var riskMetadata = {
  data_leakage: {
    title: "Data leakage exposure",
    description: "Your AI tooling appears to touch business or sensitive data that could leak through prompts, outputs, or connector misuse.",
    recommended_control: "Add data classification boundaries, approved usage rules, and human review for sensitive workflows."
  },
  prompt_injection: {
    title: "Prompt injection risk",
    description: "Your AI environment has exposure paths where hostile content may steer models or connected workflows in unsafe ways.",
    recommended_control: "Introduce prompt-security testing, input boundary controls, and safer retrieval and tool invocation patterns."
  },
  ai_agent_action_risk: {
    title: "AI agent action risk",
    description: "Your AI setup may be able to trigger business actions with insufficient guardrails or human checkpoints.",
    recommended_control: "Add approval gates, scoped permissions, action logging, and escalation paths for autonomous behavior."
  },
  rag_data_exposure: {
    title: "RAG data exposure",
    description: "Knowledge-base AI and retrieval flows can expose internal documents or retrieval results beyond intended audiences.",
    recommended_control: "Review retrieval permissions, document segmentation, and prompt injection boundaries for RAG systems."
  },
  workflow_automation_risk: {
    title: "Workflow automation risk",
    description: "Connected automation tools may create downstream failures, over-sharing, or unintended execution chains.",
    recommended_control: "Add workflow runbooks, failure controls, scoped credentials, and monitored human checkpoints."
  },
  copilot_governance_gap: {
    title: "Copilot governance gap",
    description: "Microsoft Copilot and enterprise AI use may be running ahead of formal governance, policy, or review controls.",
    recommended_control: "Define approved-tool policy, access boundaries, logging expectations, and vendor review for enterprise AI."
  },
  multimodal_privacy_risk: {
    title: "Multimodal privacy risk",
    description: "Image, document, audio, or video AI introduces media handling and privacy exposure that often lacks explicit controls.",
    recommended_control: "Document retention rules, moderation controls, and privacy review for multimodal inputs and outputs."
  },
  local_ai_governance_gap: {
    title: "Local AI governance gap",
    description: "Local or self-hosted models can bypass central governance even when they reduce external exposure.",
    recommended_control: "Establish local model policy, logging, approved deployment patterns, and operator review expectations."
  },
  missing_policy_controls: {
    title: "Missing policy controls",
    description: "The current AI environment appears to lack enough written policy, review, or monitoring controls.",
    recommended_control: "Start with written AI policy, access controls, prompt testing, and monitoring for high-risk workflows."
  },
  compliance_exposure: {
    title: "Compliance exposure",
    description: "Your AI usage may intersect with regulated or sensitive data obligations that require more formal controls.",
    recommended_control: "Map compliance obligations to AI usage, vendor review, logging, and human approval requirements."
  }
};
var auditLiteSubmissions = [];
function normalizeText2(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeText2, "normalizeText");
function normalizeArray2(values) {
  return Array.isArray(values) ? values.map((value) => normalizeText2(value)).filter(Boolean) : [];
}
__name(normalizeArray2, "normalizeArray");
function validateSingle(value, allowedSet, fieldName, fallback = "") {
  const normalized = normalizeText2(value);
  if (!allowedSet.has(normalized)) {
    if (fallback) {
      return fallback;
    }
    throw new Error(`${fieldName} is invalid`);
  }
  return normalized;
}
__name(validateSingle, "validateSingle");
function validateMulti(values, allowedSet, fieldName, fallbackValue) {
  const filtered = normalizeArray2(values).filter((value) => allowedSet.has(value));
  if (!filtered.length) {
    return [fallbackValue];
  }
  if (filtered.includes(fallbackValue)) {
    return [fallbackValue];
  }
  return [...new Set(filtered)];
}
__name(validateMulti, "validateMulti");
function normalizeAuditLiteAnswers(payload = {}) {
  return {
    company_type: validateSingle(payload.company_type, allowedCompanyTypes, "company_type", "small_business"),
    ai_tools_used: validateMulti(payload.ai_tools_used, allowedAiTools, "ai_tools_used", "none_yet"),
    data_used_with_ai: validateMulti(payload.data_used_with_ai, allowedData, "data_used_with_ai", "not_sure"),
    ai_exposure: validateSingle(payload.ai_exposure, allowedExposure, "ai_exposure", "not_sure"),
    governance_controls: validateMulti(payload.governance_controls, allowedControls, "governance_controls", "not_sure"),
    main_concern: validateSingle(payload.main_concern, allowedConcern, "main_concern", "not_sure"),
    source_route: normalizeText2(payload.source_route) || "/apps/ai-security-audit"
  };
}
__name(normalizeAuditLiteAnswers, "normalizeAuditLiteAnswers");
function clampScore(score2) {
  return Math.max(0, Math.min(100, score2));
}
__name(clampScore, "clampScore");
function deriveRiskTier(score2) {
  if (score2 >= 85) return "critical";
  if (score2 >= 65) return "high";
  if (score2 >= 35) return "medium";
  return "low";
}
__name(deriveRiskTier, "deriveRiskTier");
function derivePriorityFromTier(tier) {
  if (tier === "low") return "low";
  if (tier === "medium") return "medium";
  return "high";
}
__name(derivePriorityFromTier, "derivePriorityFromTier");
function computeRiskScore(answers) {
  let score2 = 20;
  if (answers.ai_exposure === "customer_facing") score2 += 20;
  if (answers.ai_exposure === "public_website") score2 += 15;
  if (answers.ai_exposure === "autonomous_actions") score2 += 20;
  if (answers.ai_exposure === "connected_to_business_tools") score2 += 10;
  if (answers.data_used_with_ai.includes("regulated_data")) score2 += 20;
  if (answers.data_used_with_ai.includes("credentials_or_secrets")) score2 += 20;
  if (answers.data_used_with_ai.includes("customer_data")) score2 += 15;
  if (answers.data_used_with_ai.includes("financial_data")) score2 += 15;
  if (answers.data_used_with_ai.includes("health_data")) score2 += 15;
  if (answers.data_used_with_ai.includes("legal_data")) score2 += 15;
  if (answers.ai_tools_used.includes("customer_chatbot")) score2 += 10;
  if (answers.ai_tools_used.includes("ai_agent")) score2 += 10;
  if (answers.ai_tools_used.includes("rag_knowledge_base")) score2 += 10;
  if (answers.ai_tools_used.includes("n8n_make_zapier")) score2 += 10;
  if (answers.ai_tools_used.includes("microsoft_copilot")) score2 += 10;
  if (answers.ai_tools_used.includes("multimodal_ai")) score2 += 10;
  if (answers.governance_controls.includes("none")) score2 += 15;
  if (answers.governance_controls.includes("not_sure")) score2 += 10;
  if (answers.governance_controls.includes("written_ai_policy")) score2 -= 10;
  if (answers.governance_controls.includes("access_controls")) score2 -= 10;
  if (answers.governance_controls.includes("logging_monitoring")) score2 -= 10;
  if (answers.governance_controls.includes("human_review")) score2 -= 10;
  if (answers.governance_controls.includes("vendor_review")) score2 -= 10;
  if (answers.governance_controls.includes("prompt_security_testing")) score2 -= 10;
  return clampScore(score2);
}
__name(computeRiskScore, "computeRiskScore");
function addRisk(risks, category, severity) {
  if (risks.some((risk) => risk.category === category)) {
    return;
  }
  const meta = riskMetadata[category];
  if (!meta) {
    return;
  }
  risks.push({
    title: meta.title,
    severity,
    category,
    description: meta.description,
    recommended_control: meta.recommended_control
  });
}
__name(addRisk, "addRisk");
function buildTopRisks(answers, riskScore, riskTier) {
  const risks = [];
  const elevatedSeverity = riskTier === "critical" ? "critical" : riskTier === "high" ? "high" : "medium";
  if (answers.data_used_with_ai.includes("customer_data") || answers.data_used_with_ai.includes("credentials_or_secrets") || answers.data_used_with_ai.includes("financial_data")) {
    addRisk(risks, "data_leakage", elevatedSeverity);
  }
  if (answers.main_concern === "prompt_injection" || answers.ai_exposure === "public_website" || answers.ai_exposure === "customer_facing") {
    addRisk(risks, "prompt_injection", elevatedSeverity);
  }
  if (answers.ai_tools_used.includes("ai_agent") || answers.ai_exposure === "autonomous_actions") {
    addRisk(risks, "ai_agent_action_risk", elevatedSeverity);
  }
  if (answers.ai_tools_used.includes("rag_knowledge_base")) {
    addRisk(risks, "rag_data_exposure", elevatedSeverity);
  }
  if (answers.ai_tools_used.includes("n8n_make_zapier") || answers.main_concern === "automation_failure") {
    addRisk(risks, "workflow_automation_risk", elevatedSeverity);
  }
  if (answers.ai_tools_used.includes("microsoft_copilot")) {
    addRisk(risks, "copilot_governance_gap", riskTier === "low" ? "medium" : elevatedSeverity);
  }
  if (answers.ai_tools_used.includes("multimodal_ai")) {
    addRisk(risks, "multimodal_privacy_risk", elevatedSeverity);
  }
  if (answers.ai_tools_used.includes("local_llm_ollama")) {
    addRisk(risks, "local_ai_governance_gap", riskTier === "low" ? "medium" : elevatedSeverity);
  }
  if (answers.governance_controls.includes("none") || answers.governance_controls.includes("not_sure")) {
    addRisk(risks, "missing_policy_controls", elevatedSeverity);
  }
  if (answers.company_type === "regulated_business" || answers.data_used_with_ai.includes("regulated_data") || answers.data_used_with_ai.includes("health_data") || answers.data_used_with_ai.includes("legal_data") || answers.main_concern === "compliance") {
    addRisk(risks, "compliance_exposure", elevatedSeverity);
  }
  if (!risks.length) {
    addRisk(risks, "missing_policy_controls", riskScore >= 35 ? "medium" : "low");
  }
  if (risks.length < 3) {
    const fillOrder = [
      "data_leakage",
      "prompt_injection",
      "workflow_automation_risk",
      "missing_policy_controls",
      "compliance_exposure"
    ];
    for (const category of fillOrder) {
      addRisk(risks, category, riskTier === "low" ? "low" : "medium");
      if (risks.length >= 3) {
        break;
      }
    }
  }
  return risks.slice(0, 3);
}
__name(buildTopRisks, "buildTopRisks");
function generateAuditLiteId() {
  return `aud-lite-${1001 + auditLiteSubmissions.length}`;
}
__name(generateAuditLiteId, "generateAuditLiteId");
function computeAuditLiteResult(answers, auditId = generateAuditLiteId()) {
  const riskScore = computeRiskScore(answers);
  const riskTier = deriveRiskTier(riskScore);
  const priority = derivePriorityFromTier(riskTier);
  const topRisks = buildTopRisks(answers, riskScore, riskTier);
  const params = new URLSearchParams({
    service: "ai_security_audit",
    priority,
    source: "audit-lite",
    audit_id: auditId,
    risk_score: String(riskScore),
    risk_tier: riskTier
  });
  return {
    status: "audit-lite-complete",
    audit_id: auditId,
    risk_score: riskScore,
    risk_tier: riskTier,
    priority,
    top_risks: topRisks,
    recommended_service: "ai_security_audit",
    next_route: `/enter?${params.toString()}`
  };
}
__name(computeAuditLiteResult, "computeAuditLiteResult");
function upsertAuditLiteSubmission(submission) {
  const index = auditLiteSubmissions.findIndex((entry) => entry.audit_id === submission.audit_id);
  if (index >= 0) {
    auditLiteSubmissions[index] = { ...auditLiteSubmissions[index], ...submission };
    return auditLiteSubmissions[index];
  }
  auditLiteSubmissions.unshift(submission);
  return submission;
}
__name(upsertAuditLiteSubmission, "upsertAuditLiteSubmission");
function recordAuditLiteSubmission(answers, result) {
  return upsertAuditLiteSubmission({
    audit_id: result.audit_id,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    source_route: answers.source_route,
    company_type: answers.company_type,
    ai_tools_used: [...answers.ai_tools_used],
    data_used_with_ai: [...answers.data_used_with_ai],
    ai_exposure: answers.ai_exposure,
    governance_controls: [...answers.governance_controls],
    main_concern: answers.main_concern,
    risk_score: result.risk_score,
    risk_tier: result.risk_tier,
    priority: result.priority,
    top_risks: result.top_risks.map((risk) => ({ ...risk })),
    recommended_service: "ai_security_audit",
    next_route: result.next_route,
    engagement_id: null,
    status: "audit-lite-complete"
  });
}
__name(recordAuditLiteSubmission, "recordAuditLiteSubmission");
function attachEngagementToAuditLite(details = {}) {
  const auditId = normalizeText2(details.audit_id || details.auditId);
  if (!auditId) {
    return null;
  }
  const existing = auditLiteSubmissions.find((entry) => entry.audit_id === auditId);
  const base = existing || {
    audit_id: auditId,
    created_at: details.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    source_route: details.source || "audit-lite",
    company_type: normalizeText2(details.company_type) || "",
    ai_tools_used: [],
    data_used_with_ai: [],
    ai_exposure: "",
    governance_controls: [],
    main_concern: "",
    risk_score: Number.isFinite(Number(details.risk_score)) ? Number(details.risk_score) : 0,
    risk_tier: normalizeText2(details.risk_tier) || "low",
    priority: normalizeText2(details.priority) || "low",
    top_risks: Array.isArray(details.top_risks) ? details.top_risks : [],
    recommended_service: "ai_security_audit",
    next_route: "",
    status: "audit-lite-complete"
  };
  base.engagement_id = normalizeText2(details.engagement_id || details.engagementId) || base.engagement_id || null;
  base.risk_score = Number.isFinite(Number(details.risk_score)) ? Number(details.risk_score) : base.risk_score || 0;
  base.risk_tier = normalizeText2(details.risk_tier) || base.risk_tier || "low";
  base.priority = normalizeText2(details.priority) || base.priority || "low";
  base.status = normalizeText2(details.status) || "intake-received";
  base.recommended_service = normalizeText2(details.recommended_service || details.recommendedService) || "ai_security_audit";
  if (Array.isArray(details.top_risks) && details.top_risks.length) {
    base.top_risks = details.top_risks;
  }
  return upsertAuditLiteSubmission(base);
}
__name(attachEngagementToAuditLite, "attachEngagementToAuditLite");
function listAuditLiteQueue(engagements3 = []) {
  const queue = [];
  for (const submission of auditLiteSubmissions) {
    const linkedEngagement = engagements3.find((entry) => entry.auditId && entry.auditId === submission.audit_id);
    queue.push({
      audit_id: submission.audit_id,
      engagement_id: submission.engagement_id || linkedEngagement?.id || null,
      risk_score: submission.risk_score,
      risk_tier: submission.risk_tier,
      priority: submission.priority,
      top_risk_category: submission.top_risks?.[0]?.category || null,
      recommended_service: submission.recommended_service,
      status: linkedEngagement?.status || submission.status,
      created_at: linkedEngagement?.createdAt || submission.created_at
    });
  }
  for (const engagement of engagements3) {
    if (!engagement.auditId) {
      continue;
    }
    if (queue.some((entry) => entry.engagement_id === engagement.id)) {
      continue;
    }
    queue.push({
      audit_id: engagement.auditId,
      engagement_id: engagement.id,
      risk_score: engagement.riskScore || 0,
      risk_tier: engagement.riskTier || "low",
      priority: engagement.priority || "low",
      top_risk_category: engagement.topRiskCategory || null,
      recommended_service: engagement.recommendedService || "ai_security_audit",
      status: engagement.status || "intake-received",
      created_at: engagement.createdAt || null
    });
  }
  return queue.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}
__name(listAuditLiteQueue, "listAuditLiteQueue");
var auditLite_default = {
  auditLiteMarketplaceModule,
  auditLiteSubmissions,
  normalizeAuditLiteAnswers,
  computeAuditLiteResult,
  recordAuditLiteSubmission,
  attachEngagementToAuditLite,
  listAuditLiteQueue
};

// worker/data/promptInjectionScanner.js
var promptInjectionMarketplaceModule = {
  module_id: "msh-prompt-injection-scanner",
  service_slug: "prompt_injection_review",
  name: "Prompt Injection Scanner",
  category: "ai_security",
  public_service_route: "/apps/prompt-injection-scanner",
  operator_route: "/operator/prompt-injection-scans",
  description: "Free prompt injection diagnostic that scores exposure, identifies top risks, and routes leads into a full prompt injection review.",
  revenue_type: "consulting",
  base_price: 0,
  recommended_upsell: "Full Prompt Injection Review",
  required_inputs: [
    "ai_system_type",
    "deployment_context",
    "prompt_sensitivity",
    "tool_permissions",
    "data_access",
    "existing_controls",
    "main_concern"
  ],
  delivery_outputs: [
    "injection_score",
    "risk_tier",
    "top_3_risks",
    "recommended_controls",
    "intake_route"
  ],
  status: "active"
};
var allowedAiSystemTypes = /* @__PURE__ */ new Set([
  "customer_chatbot",
  "internal_assistant",
  "ai_agent",
  "rag_assistant",
  "copilot_workflow",
  "automation_bot",
  "multimodal_assistant",
  "not_sure"
]);
var allowedDeploymentContexts = /* @__PURE__ */ new Set([
  "public_website",
  "customer_portal",
  "internal_only",
  "employee_copilot",
  "connected_to_business_tools",
  "testing_only",
  "not_sure"
]);
var allowedPromptSensitivity = /* @__PURE__ */ new Set([
  "no_sensitive_info",
  "includes_business_rules",
  "includes_internal_processes",
  "includes_customer_data_rules",
  "includes_tool_instructions",
  "includes_security_or_access_rules",
  "not_sure"
]);
var allowedToolPermissions = /* @__PURE__ */ new Set([
  "no_tools",
  "web_search",
  "email",
  "calendar",
  "crm",
  "database",
  "file_storage",
  "payments",
  "code_execution",
  "workflow_automation",
  "admin_actions",
  "not_sure"
]);
var allowedDataAccess = /* @__PURE__ */ new Set([
  "public_content",
  "internal_docs",
  "customer_data",
  "financial_data",
  "health_data",
  "legal_data",
  "credentials_or_secrets",
  "regulated_data",
  "not_sure"
]);
var allowedExistingControls = /* @__PURE__ */ new Set([
  "input_filtering",
  "output_filtering",
  "retrieval_boundaries",
  "tool_permission_limits",
  "human_approval",
  "logging_monitoring",
  "red_team_testing",
  "prompt_versioning",
  "none",
  "not_sure"
]);
var allowedMainConcern = /* @__PURE__ */ new Set([
  "prompt_injection",
  "data_leakage",
  "tool_misuse",
  "rag_data_exposure",
  "hallucinations",
  "compliance",
  "not_sure"
]);
var riskCatalog = {
  direct_prompt_injection: {
    title: "Direct prompt injection exposure",
    description: "Untrusted prompt input appears able to compete with or override the assistant's intended instruction hierarchy.",
    recommended_control: "Add strict instruction hierarchy, input filtering, refusal boundaries, and prompt injection red-team testing before production use."
  },
  indirect_prompt_injection: {
    title: "Indirect prompt injection exposure",
    description: "Connected content or retrieved context may carry hostile instructions into the assistant flow without enough isolation controls.",
    recommended_control: "Add retrieval boundaries, context validation, and content filtering before retrieved or external text reaches the model."
  },
  tool_permission_abuse: {
    title: "Tool permission abuse risk",
    description: "The assistant appears to have connected tool capabilities that could be triggered too broadly during adversarial or malformed interactions.",
    recommended_control: "Add tool permission boundaries, narrow scopes, and human approval for external or high-impact actions."
  },
  sensitive_data_exposure: {
    title: "Sensitive data exposure risk",
    description: "The deployment appears to touch sensitive information that could leak through prompts, retrieval context, outputs, or connected tools.",
    recommended_control: "Remove secrets from prompts, add refusal rules for sensitive data, and enforce data minimization across prompts and outputs."
  },
  rag_context_poisoning: {
    title: "RAG context poisoning risk",
    description: "Retrieved content may be able to influence the assistant in unsafe ways if retrieval scope and instruction separation are weak.",
    recommended_control: "Add retrieval boundaries, source validation, segmentation, and prompt injection tests focused on retrieval flows."
  },
  missing_human_approval: {
    title: "Missing human approval for high-impact actions",
    description: "The workflow appears to allow external actions or sensitive operations without an explicit human checkpoint.",
    recommended_control: "Add human approval for external actions, privilege changes, payment actions, and sensitive business workflows."
  },
  weak_output_filtering: {
    title: "Weak output filtering",
    description: "Output safety boundaries appear incomplete, increasing the chance of unsafe content, private data disclosure, or over-compliance with malicious requests.",
    recommended_control: "Add output filtering, refusal rules for sensitive requests, and logging to review unsafe completion attempts."
  },
  public_chatbot_exposure: {
    title: "Public chatbot exposure",
    description: "The assistant is exposed to untrusted public input while handling business logic, tools, or sensitive context.",
    recommended_control: "Reduce exposed capability, tighten prompts, add input boundaries, and test public-facing paths before wider deployment."
  },
  autonomous_action_risk: {
    title: "Autonomous action risk",
    description: "Prompt or tool configuration suggests the assistant may act with too much autonomy for the surrounding controls.",
    recommended_control: "Require approval for external actions, limit action scopes, and remove unrestricted execution language from prompts."
  },
  compliance_exposure: {
    title: "Compliance exposure",
    description: "Prompt, data, or workflow configuration appears to intersect with regulated or sensitive obligations without enough governance evidence.",
    recommended_control: "Add logging and monitoring, data minimization, human approval, and documented prompt version control for regulated use cases."
  }
};
var promptInjectionSubmissions = [];
function normalizeText3(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeText3, "normalizeText");
function normalizeArray3(values) {
  return Array.isArray(values) ? values.map((value) => normalizeText3(value)).filter(Boolean) : [];
}
__name(normalizeArray3, "normalizeArray");
function validateSingle2(value, allowedSet, fallback) {
  const normalized = normalizeText3(value);
  return allowedSet.has(normalized) ? normalized : fallback;
}
__name(validateSingle2, "validateSingle");
function validateMulti2(values, allowedSet, fallbackValue) {
  const filtered = normalizeArray3(values).filter((value) => allowedSet.has(value));
  if (!filtered.length) {
    return [fallbackValue];
  }
  if (filtered.includes(fallbackValue)) {
    return [fallbackValue];
  }
  return [...new Set(filtered)];
}
__name(validateMulti2, "validateMulti");
function sanitizePromptPreview(value) {
  return normalizeText3(value).replace(/\s+/g, " ").replace(/[<>{}]/g, "").slice(0, 120) || null;
}
__name(sanitizePromptPreview, "sanitizePromptPreview");
function clampScore2(score2) {
  return Math.max(0, Math.min(100, score2));
}
__name(clampScore2, "clampScore");
function deriveRiskTier2(score2) {
  if (score2 >= 85) return "critical";
  if (score2 >= 65) return "high";
  if (score2 >= 35) return "medium";
  return "low";
}
__name(deriveRiskTier2, "deriveRiskTier");
function derivePriority2(riskTier) {
  if (riskTier === "low") return "low";
  if (riskTier === "medium") return "medium";
  return "high";
}
__name(derivePriority2, "derivePriority");
function normalizePromptInjectionAnswers(payload = {}) {
  const allowPromptText = Boolean(payload.allow_prompt_text);
  const normalizedPromptText = allowPromptText ? normalizeText3(payload.prompt_text).slice(0, 4e3) : "";
  return {
    ai_system_type: validateSingle2(payload.ai_system_type, allowedAiSystemTypes, "not_sure"),
    deployment_context: validateSingle2(payload.deployment_context, allowedDeploymentContexts, "not_sure"),
    prompt_text: normalizedPromptText,
    allow_prompt_text: allowPromptText,
    prompt_sensitivity: validateSingle2(payload.prompt_sensitivity, allowedPromptSensitivity, "not_sure"),
    tool_permissions: validateMulti2(payload.tool_permissions, allowedToolPermissions, "not_sure"),
    data_access: validateMulti2(payload.data_access, allowedDataAccess, "not_sure"),
    existing_controls: validateMulti2(payload.existing_controls, allowedExistingControls, "not_sure"),
    main_concern: validateSingle2(payload.main_concern, allowedMainConcern, "not_sure"),
    source_route: normalizeText3(payload.source_route) || "/apps/prompt-injection-scanner"
  };
}
__name(normalizePromptInjectionAnswers, "normalizePromptInjectionAnswers");
function computePromptInjectionScore(answers) {
  let score2 = 20;
  if (answers.deployment_context === "public_website") score2 += 20;
  if (answers.deployment_context === "customer_portal") score2 += 15;
  if (answers.deployment_context === "connected_to_business_tools") score2 += 15;
  if (answers.ai_system_type === "ai_agent") score2 += 15;
  if (answers.ai_system_type === "rag_assistant") score2 += 10;
  if (answers.ai_system_type === "customer_chatbot") score2 += 10;
  if (answers.ai_system_type === "automation_bot") score2 += 10;
  if (answers.ai_system_type === "multimodal_assistant") score2 += 10;
  if (answers.prompt_sensitivity === "includes_tool_instructions") score2 += 15;
  if (answers.prompt_sensitivity === "includes_security_or_access_rules") score2 += 15;
  if (answers.prompt_sensitivity === "includes_customer_data_rules") score2 += 10;
  if (answers.prompt_sensitivity === "includes_internal_processes") score2 += 10;
  if (answers.tool_permissions.includes("admin_actions")) score2 += 20;
  if (answers.tool_permissions.includes("payments")) score2 += 20;
  if (answers.tool_permissions.includes("database")) score2 += 15;
  if (answers.tool_permissions.includes("file_storage")) score2 += 15;
  if (answers.tool_permissions.includes("email")) score2 += 15;
  if (answers.tool_permissions.includes("code_execution")) score2 += 15;
  if (answers.tool_permissions.includes("workflow_automation")) score2 += 15;
  if (answers.data_access.includes("credentials_or_secrets")) score2 += 20;
  if (answers.data_access.includes("regulated_data")) score2 += 20;
  if (answers.data_access.includes("customer_data")) score2 += 15;
  if (answers.data_access.includes("financial_data")) score2 += 15;
  if (answers.data_access.includes("health_data")) score2 += 15;
  if (answers.data_access.includes("legal_data")) score2 += 15;
  if (answers.existing_controls.includes("none")) score2 += 15;
  if (answers.existing_controls.includes("not_sure")) score2 += 10;
  if (answers.existing_controls.includes("input_filtering")) score2 -= 10;
  if (answers.existing_controls.includes("output_filtering")) score2 -= 10;
  if (answers.existing_controls.includes("retrieval_boundaries")) score2 -= 10;
  if (answers.existing_controls.includes("tool_permission_limits")) score2 -= 10;
  if (answers.existing_controls.includes("human_approval")) score2 -= 10;
  if (answers.existing_controls.includes("logging_monitoring")) score2 -= 10;
  if (answers.existing_controls.includes("red_team_testing")) score2 -= 10;
  if (answers.existing_controls.includes("prompt_versioning")) score2 -= 5;
  const promptText = answers.prompt_text.toLowerCase();
  if (/(api[_ -]?key|secret|password|token|credential|private[_ -]?key|bearer\s+[a-z0-9._-]+)/i.test(promptText)) score2 += 15;
  if (/(ignore previous instructions|developer mode|bypass|override|do anything now)/i.test(promptText)) score2 += 10;
  if (/(you may take any action|no approval needed|autonomously execute)/i.test(promptText)) score2 += 10;
  if (/(customer data|private data|internal data|sensitive data|confidential)/i.test(promptText) && !/(refuse|do not disclose|never reveal|must not share|only summarize)/i.test(promptText)) {
    score2 += 10;
  }
  if (/(refuse|do not comply|never reveal secrets|must not disclose|decline requests)/i.test(promptText)) score2 -= 5;
  if (/(human approval required|requires approval|await approval)/i.test(promptText)) score2 -= 5;
  if (/(data minimization|minimum necessary|no secrets in prompts|never store secrets)/i.test(promptText)) score2 -= 5;
  return clampScore2(score2);
}
__name(computePromptInjectionScore, "computePromptInjectionScore");
function addRisk2(risks, category, severity) {
  if (risks.some((risk) => risk.category === category)) {
    return;
  }
  const meta = riskCatalog[category];
  if (!meta) {
    return;
  }
  risks.push({
    title: meta.title,
    severity,
    category,
    description: meta.description,
    recommended_control: meta.recommended_control
  });
}
__name(addRisk2, "addRisk");
function buildTopRisks2(answers, riskTier) {
  const risks = [];
  const severity = riskTier === "critical" ? "critical" : riskTier === "high" ? "high" : riskTier === "medium" ? "medium" : "low";
  const promptText = answers.prompt_text.toLowerCase();
  if (answers.deployment_context === "public_website" || answers.ai_system_type === "customer_chatbot") {
    addRisk2(risks, "public_chatbot_exposure", severity);
    addRisk2(risks, "direct_prompt_injection", severity);
  }
  if (answers.ai_system_type === "rag_assistant" || answers.data_access.includes("internal_docs") || answers.main_concern === "rag_data_exposure") {
    addRisk2(risks, "rag_context_poisoning", severity);
    addRisk2(risks, "indirect_prompt_injection", severity);
  }
  if (answers.tool_permissions.some(
    (entry) => ["email", "calendar", "crm", "database", "file_storage", "payments", "code_execution", "workflow_automation", "admin_actions"].includes(entry)
  )) {
    addRisk2(risks, "tool_permission_abuse", severity);
  }
  if (answers.tool_permissions.includes("payments") || answers.tool_permissions.includes("admin_actions") || /(autonomously execute|no approval needed)/i.test(promptText)) {
    addRisk2(risks, "autonomous_action_risk", severity);
  }
  if (answers.data_access.some(
    (entry) => ["customer_data", "financial_data", "health_data", "legal_data", "credentials_or_secrets", "regulated_data"].includes(entry)
  ) || answers.prompt_sensitivity === "includes_customer_data_rules" || answers.prompt_sensitivity === "includes_security_or_access_rules") {
    addRisk2(risks, "sensitive_data_exposure", severity);
  }
  if (!answers.existing_controls.includes("human_approval") && (answers.tool_permissions.includes("payments") || answers.tool_permissions.includes("admin_actions") || answers.tool_permissions.includes("workflow_automation"))) {
    addRisk2(risks, "missing_human_approval", severity);
  }
  if (!answers.existing_controls.includes("output_filtering")) {
    addRisk2(risks, "weak_output_filtering", riskTier === "low" ? "medium" : severity);
  }
  if (answers.main_concern === "compliance" || answers.data_access.includes("regulated_data") || answers.data_access.includes("health_data") || answers.data_access.includes("legal_data")) {
    addRisk2(risks, "compliance_exposure", severity);
  }
  if (answers.main_concern === "prompt_injection") {
    addRisk2(risks, "direct_prompt_injection", severity);
  }
  if (answers.main_concern === "tool_misuse") {
    addRisk2(risks, "tool_permission_abuse", severity);
  }
  if (answers.main_concern === "data_leakage") {
    addRisk2(risks, "sensitive_data_exposure", severity);
  }
  if (!risks.length) {
    addRisk2(risks, "direct_prompt_injection", riskTier === "low" ? "low" : "medium");
  }
  const fillOrder = [
    "direct_prompt_injection",
    "tool_permission_abuse",
    "sensitive_data_exposure",
    "rag_context_poisoning",
    "missing_human_approval",
    "weak_output_filtering",
    "compliance_exposure"
  ];
  for (const category of fillOrder) {
    if (risks.length >= 3) {
      break;
    }
    addRisk2(risks, category, riskTier === "low" ? "low" : "medium");
  }
  return risks.slice(0, 3);
}
__name(buildTopRisks2, "buildTopRisks");
function generatePromptInjectionScanId() {
  return `pinj-${1001 + promptInjectionSubmissions.length}`;
}
__name(generatePromptInjectionScanId, "generatePromptInjectionScanId");
function computePromptInjectionResult(answers, scanId = generatePromptInjectionScanId()) {
  const injectionScore = computePromptInjectionScore(answers);
  const riskTier = deriveRiskTier2(injectionScore);
  const priority = derivePriority2(riskTier);
  const topRisks = buildTopRisks2(answers, riskTier);
  const params = new URLSearchParams({
    service: "prompt_injection_review",
    priority,
    source: "prompt-injection-scanner",
    scan_id: scanId
  });
  const nextRoute = `/enter?${params.toString()}`;
  return {
    status: "prompt-injection-scan-complete",
    scan_id: scanId,
    injection_score: injectionScore,
    risk_tier: riskTier,
    priority,
    top_risks: topRisks,
    recommended_service: "prompt_injection_review",
    secondary_service: "ai_security_audit",
    recommended_controls: [...new Set(topRisks.map((risk) => risk.recommended_control))].slice(0, 3),
    recommended_next_step: "Request a full Prompt Injection Review to validate boundaries, approvals, retrieval safety, and prompt governance.",
    next_route: nextRoute
  };
}
__name(computePromptInjectionResult, "computePromptInjectionResult");
function upsertPromptInjectionSubmission(submission) {
  const index = promptInjectionSubmissions.findIndex((entry) => entry.scan_id === submission.scan_id);
  if (index >= 0) {
    promptInjectionSubmissions[index] = { ...promptInjectionSubmissions[index], ...submission };
    return promptInjectionSubmissions[index];
  }
  promptInjectionSubmissions.unshift(submission);
  return submission;
}
__name(upsertPromptInjectionSubmission, "upsertPromptInjectionSubmission");
function recordPromptInjectionSubmission(answers, result) {
  return upsertPromptInjectionSubmission({
    scan_id: result.scan_id,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    source_route: answers.source_route,
    ai_system_type: answers.ai_system_type,
    deployment_context: answers.deployment_context,
    prompt_text_present: Boolean(answers.prompt_text),
    prompt_text_preview: sanitizePromptPreview(answers.prompt_text),
    prompt_sensitivity: answers.prompt_sensitivity,
    tool_permissions: [...answers.tool_permissions],
    data_access: [...answers.data_access],
    existing_controls: [...answers.existing_controls],
    main_concern: answers.main_concern,
    injection_score: result.injection_score,
    risk_tier: result.risk_tier,
    priority: result.priority,
    top_risks: result.top_risks.map((risk) => ({ ...risk })),
    recommended_service: "prompt_injection_review",
    secondary_service: "ai_security_audit",
    next_route: result.next_route,
    engagement_id: null,
    status: "prompt-injection-scan-complete"
  });
}
__name(recordPromptInjectionSubmission, "recordPromptInjectionSubmission");
function attachEngagementToPromptInjectionScan(details = {}) {
  const scanId = normalizeText3(details.scan_id || details.scanId);
  if (!scanId) {
    return null;
  }
  const existing = promptInjectionSubmissions.find((entry) => entry.scan_id === scanId);
  const base = existing || {
    scan_id: scanId,
    created_at: details.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    source_route: details.source || "prompt-injection-scanner",
    ai_system_type: "",
    deployment_context: "",
    prompt_text_present: false,
    prompt_text_preview: null,
    prompt_sensitivity: "",
    tool_permissions: [],
    data_access: [],
    existing_controls: [],
    main_concern: "",
    injection_score: Number.isFinite(Number(details.injection_score)) ? Number(details.injection_score) : 0,
    risk_tier: normalizeText3(details.risk_tier) || "low",
    priority: normalizeText3(details.priority) || "low",
    top_risks: Array.isArray(details.top_risks) ? details.top_risks : [],
    recommended_service: "prompt_injection_review",
    secondary_service: "ai_security_audit",
    next_route: "",
    status: "prompt-injection-scan-complete"
  };
  base.engagement_id = normalizeText3(details.engagement_id || details.engagementId) || base.engagement_id || null;
  base.injection_score = Number.isFinite(Number(details.injection_score)) ? Number(details.injection_score) : base.injection_score || 0;
  base.risk_tier = normalizeText3(details.risk_tier) || base.risk_tier || "low";
  base.priority = normalizeText3(details.priority) || base.priority || "low";
  base.status = normalizeText3(details.status) || "intake-received";
  base.recommended_service = normalizeText3(details.recommended_service || details.recommendedService) || "prompt_injection_review";
  base.secondary_service = normalizeText3(details.secondary_service || details.secondaryService) || base.secondary_service || "ai_security_audit";
  if (Array.isArray(details.top_risks) && details.top_risks.length) {
    base.top_risks = details.top_risks;
  }
  return upsertPromptInjectionSubmission(base);
}
__name(attachEngagementToPromptInjectionScan, "attachEngagementToPromptInjectionScan");
function listPromptInjectionScanQueue(engagements3 = []) {
  const queue = [];
  for (const submission of promptInjectionSubmissions) {
    const linkedEngagement = engagements3.find((entry) => entry.scanId && entry.scanId === submission.scan_id);
    queue.push({
      scan_id: submission.scan_id,
      engagement_id: submission.engagement_id || linkedEngagement?.id || null,
      injection_score: submission.injection_score,
      risk_tier: submission.risk_tier,
      priority: submission.priority,
      top_risk_category: submission.top_risks?.[0]?.category || null,
      recommended_service: submission.recommended_service,
      secondary_service: submission.secondary_service,
      status: linkedEngagement?.status || submission.status,
      created_at: linkedEngagement?.createdAt || submission.created_at
    });
  }
  for (const engagement of engagements3) {
    if (!engagement.scanId) {
      continue;
    }
    if (queue.some((entry) => entry.engagement_id === engagement.id)) {
      continue;
    }
    queue.push({
      scan_id: engagement.scanId,
      engagement_id: engagement.id,
      injection_score: engagement.injectionScore || 0,
      risk_tier: engagement.riskTier || "low",
      priority: engagement.priority || "low",
      top_risk_category: engagement.topRiskCategory || null,
      recommended_service: engagement.recommendedService || "prompt_injection_review",
      secondary_service: engagement.secondaryService || "ai_security_audit",
      status: engagement.status || "intake-received",
      created_at: engagement.createdAt || null
    });
  }
  return queue.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}
__name(listPromptInjectionScanQueue, "listPromptInjectionScanQueue");
var promptInjectionScanner_default = {
  promptInjectionMarketplaceModule,
  promptInjectionSubmissions,
  normalizePromptInjectionAnswers,
  computePromptInjectionResult,
  recordPromptInjectionSubmission,
  attachEngagementToPromptInjectionScan,
  listPromptInjectionScanQueue
};

// worker/data/agentReadinessChecker.js
var agentReadinessMarketplaceModule = {
  module_id: "msh-ai-agent-readiness-checker",
  service_slug: "ai_agent_readiness_checker",
  name: "AI Agent Readiness Checker",
  category: "AI Agents",
  public_service_route: "/apps/ai-agent-readiness-checker",
  operator_route: "/operator/agent-readiness",
  description: "Free advisory diagnostic that scores whether an AI agent idea is ready to build, how complex it is, and what controls are required before deployment.",
  revenue_type: "consulting",
  base_price: 0,
  recommended_upsell: "AI Agent Build / Agent Security Review",
  required_inputs: [
    "agent_goal",
    "agent_autonomy_level",
    "tool_connections",
    "data_access",
    "human_review",
    "deployment_context",
    "workflow_clarity",
    "success_metric",
    "timeline"
  ],
  delivery_outputs: [
    "readiness_score",
    "readiness_tier",
    "build_complexity",
    "safety_level",
    "top_build_requirements",
    "top_risk_controls",
    "recommended_service",
    "intake_route"
  ],
  status: "active"
};
var allowedAgentGoals = /* @__PURE__ */ new Set([
  "customer_support_agent",
  "sales_or_lead_agent",
  "research_agent",
  "operations_agent",
  "inbox_triage_agent",
  "meeting_prep_agent",
  "crm_agent",
  "reporting_agent",
  "content_agent",
  "security_or_compliance_agent",
  "custom_agent",
  "not_sure"
]);
var allowedAutonomyLevels = /* @__PURE__ */ new Set([
  "answers_only",
  "drafts_recommendations",
  "takes_low_risk_actions",
  "takes_external_actions",
  "fully_autonomous",
  "not_sure"
]);
var allowedToolConnections = /* @__PURE__ */ new Set([
  "no_tools",
  "email",
  "calendar",
  "crm",
  "database",
  "file_storage",
  "project_management",
  "slack_or_teams",
  "payments",
  "web_search",
  "browser_or_scraper",
  "code_execution",
  "workflow_automation",
  "not_sure"
]);
var allowedDataAccess2 = /* @__PURE__ */ new Set([
  "public_content",
  "internal_docs",
  "customer_data",
  "sales_data",
  "financial_data",
  "health_data",
  "legal_data",
  "credentials_or_secrets",
  "regulated_data",
  "not_sure"
]);
var allowedHumanReview = /* @__PURE__ */ new Set([
  "every_action",
  "sensitive_actions_only",
  "periodic_review",
  "no_review",
  "not_sure"
]);
var allowedDeploymentContexts2 = /* @__PURE__ */ new Set([
  "internal_only",
  "customer_facing",
  "public_website",
  "employee_copilot",
  "connected_to_business_tools",
  "not_sure"
]);
var allowedWorkflowClarity = /* @__PURE__ */ new Set([
  "clearly_documented",
  "partially_documented",
  "tribal_knowledge",
  "not_documented",
  "not_sure"
]);
var allowedSuccessMetrics = /* @__PURE__ */ new Set([
  "time_saved",
  "revenue_generated",
  "response_quality",
  "error_reduction",
  "faster_research",
  "better_follow_up",
  "compliance_or_risk_reduction",
  "not_sure"
]);
var allowedTimeline = /* @__PURE__ */ new Set([
  "this_week",
  "this_month",
  "this_quarter",
  "exploring"
]);
var requirementCatalog = {
  workflow_mapping: {
    title: "Map the workflow before building",
    category: "workflow_mapping",
    description: "Document the exact triggers, steps, decisions, and handoffs the agent should follow.",
    why_it_matters: "Agent builds fail when the operating workflow exists only in tribal knowledge."
  },
  tool_integration_plan: {
    title: "Define the tool integration plan",
    category: "tool_integration_plan",
    description: "List each system the agent should read from or write to and define the minimum required access.",
    why_it_matters: "Clear integration scope prevents connector sprawl and unsafe downstream behavior."
  },
  permissions_model: {
    title: "Define the agent action boundary",
    category: "permissions_model",
    description: "Set explicit limits on which records, actions, and state changes the agent can perform.",
    why_it_matters: "Permission boundaries reduce accidental data exposure and unsafe actions."
  },
  data_access_design: {
    title: "Design the data access layer",
    category: "data_access_design",
    description: "Separate public, internal, customer, and regulated data access before any tool execution path is enabled.",
    why_it_matters: "Data-access design determines whether the build can operate safely in production contexts."
  },
  human_approval_flow: {
    title: "Add a human approval flow",
    category: "human_approval_flow",
    description: "Insert approval checkpoints for sensitive actions, external messages, or record changes.",
    why_it_matters: "Approval gates are often the difference between a safe copilot and an unsafe agent."
  },
  evaluation_plan: {
    title: "Define the success evaluation plan",
    category: "evaluation_plan",
    description: "Choose measurable acceptance criteria tied to the stated success metric.",
    why_it_matters: "Without evaluation, the team cannot tell whether the agent actually helps or just creates noise."
  },
  logging_monitoring: {
    title: "Instrument logging and monitoring",
    category: "logging_monitoring",
    description: "Log prompts, decisions, tool calls, approvals, and failure states for operator review.",
    why_it_matters: "Operational visibility is required for troubleshooting and safe governance."
  },
  fallback_process: {
    title: "Design the fallback process",
    category: "fallback_process",
    description: "Define what happens when the agent is uncertain, blocked, or should hand work back to a person.",
    why_it_matters: "Fallback design prevents silent failures and brittle automation paths."
  },
  deployment_plan: {
    title: "Set the deployment plan",
    category: "deployment_plan",
    description: "Choose the rollout sequence, sandbox scope, and initial production boundaries before launch.",
    why_it_matters: "Safe deployment sequencing reduces launch risk for customer-facing or tool-connected agents."
  },
  maintenance_plan: {
    title: "Plan post-launch maintenance",
    category: "maintenance_plan",
    description: "Define who owns prompt updates, runbook changes, connector drift, and ongoing quality review.",
    why_it_matters: "AI agents degrade over time if nobody owns their operating model after launch."
  }
};
var riskControlCatalog = {
  human_approval: {
    title: "Human approval for sensitive actions",
    category: "human_approval",
    description: "The agent may perform or recommend actions that affect customers, systems, or business records.",
    recommended_control: "Require human approval before sending messages, modifying records, or triggering external workflow actions."
  },
  tool_permission_boundaries: {
    title: "Restrict tool permission boundaries",
    category: "tool_permission_boundaries",
    description: "The idea depends on connected tools that could be over-scoped during early delivery.",
    recommended_control: "Use least-privilege credentials and narrow tool permissions to the smallest required action set."
  },
  data_minimization: {
    title: "Minimize sensitive data exposure",
    category: "data_minimization",
    description: "The build touches internal, customer, or regulated data that should not flow through every prompt or tool path.",
    recommended_control: "Limit prompts and outputs to minimum-necessary data and separate regulated data from general flows."
  },
  prompt_injection_testing: {
    title: "Test prompt injection paths",
    category: "prompt_injection_testing",
    description: "The deployment context or autonomy model creates exposure to hostile or untrusted instructions.",
    recommended_control: "Run prompt injection testing before launch, especially for public, customer-facing, or tool-connected agents."
  },
  audit_logging: {
    title: "Add audit logging",
    category: "audit_logging",
    description: "Higher-risk agents need a record of prompts, actions, approvals, and failures for operator review.",
    recommended_control: "Log prompts, tool invocations, approvals, and state transitions in a reviewable audit trail."
  },
  access_control: {
    title: "Harden access control",
    category: "access_control",
    description: "The workflow appears to involve sensitive systems, privileged records, or internal-only access paths.",
    recommended_control: "Separate operator, reviewer, and runtime access with explicit permission boundaries and credential isolation."
  },
  output_review: {
    title: "Review outputs before release",
    category: "output_review",
    description: "The agent may produce external-facing or business-critical outputs where silent mistakes are costly.",
    recommended_control: "Require output review for customer-facing, compliance-sensitive, or high-impact responses."
  },
  rollback_plan: {
    title: "Create a rollback plan",
    category: "rollback_plan",
    description: "The build complexity and deployment context suggest failure modes that need a fast containment path.",
    recommended_control: "Define manual override, rollback, and disable procedures before enabling live workflows."
  },
  compliance_review: {
    title: "Run compliance review",
    category: "compliance_review",
    description: "The idea intersects with regulated, financial, health, legal, or other policy-sensitive data.",
    recommended_control: "Review data obligations, retention, approval flows, and audit requirements before deployment."
  },
  credential_isolation: {
    title: "Isolate credentials from the agent",
    category: "credential_isolation",
    description: "The design touches secrets, privileged tokens, or systems where raw credentials should not appear in prompts.",
    recommended_control: "Keep credentials outside prompts, scope secrets per tool, and isolate privileged execution paths."
  }
};
var agentReadinessSubmissions = [];
function normalizeText4(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeText4, "normalizeText");
function normalizeArray4(values) {
  return Array.isArray(values) ? values.map((value) => normalizeText4(value)).filter(Boolean) : [];
}
__name(normalizeArray4, "normalizeArray");
function validateSingle3(value, allowedSet, fallback) {
  const normalized = normalizeText4(value);
  return allowedSet.has(normalized) ? normalized : fallback;
}
__name(validateSingle3, "validateSingle");
function validateMulti3(values, allowedSet, fallbackValue) {
  const filtered = normalizeArray4(values).filter((value) => allowedSet.has(value));
  if (!filtered.length) {
    return [fallbackValue];
  }
  if (filtered.includes("no_tools")) {
    return ["no_tools"];
  }
  if (filtered.includes("not_sure")) {
    return ["not_sure"];
  }
  return [...new Set(filtered)];
}
__name(validateMulti3, "validateMulti");
function clampScore3(score2) {
  return Math.max(0, Math.min(100, score2));
}
__name(clampScore3, "clampScore");
function normalizeAgentReadinessAnswers(payload = {}) {
  return {
    agent_goal: validateSingle3(payload.agent_goal, allowedAgentGoals, "not_sure"),
    agent_autonomy_level: validateSingle3(payload.agent_autonomy_level, allowedAutonomyLevels, "not_sure"),
    tool_connections: validateMulti3(payload.tool_connections, allowedToolConnections, "not_sure"),
    data_access: validateMulti3(payload.data_access, allowedDataAccess2, "not_sure"),
    human_review: validateSingle3(payload.human_review, allowedHumanReview, "not_sure"),
    deployment_context: validateSingle3(payload.deployment_context, allowedDeploymentContexts2, "not_sure"),
    workflow_clarity: validateSingle3(payload.workflow_clarity, allowedWorkflowClarity, "not_sure"),
    success_metric: validateSingle3(payload.success_metric, allowedSuccessMetrics, "not_sure"),
    timeline: validateSingle3(payload.timeline, allowedTimeline, "exploring"),
    source_route: normalizeText4(payload.source_route) || "/apps/ai-agent-readiness-checker"
  };
}
__name(normalizeAgentReadinessAnswers, "normalizeAgentReadinessAnswers");
function computeReadinessScore(answers) {
  let score2 = 50;
  if (answers.workflow_clarity === "clearly_documented") score2 += 15;
  if (answers.workflow_clarity === "partially_documented") score2 += 8;
  if (answers.human_review === "every_action") score2 += 10;
  if (answers.human_review === "sensitive_actions_only") score2 += 8;
  if (answers.success_metric !== "not_sure") score2 += 8;
  if (answers.agent_autonomy_level === "answers_only") score2 += 8;
  if (answers.agent_autonomy_level === "drafts_recommendations") score2 += 5;
  if (answers.deployment_context === "internal_only") score2 += 5;
  if (answers.workflow_clarity === "tribal_knowledge") score2 -= 10;
  if (answers.workflow_clarity === "not_documented") score2 -= 20;
  if (answers.workflow_clarity === "not_sure") score2 -= 10;
  if (answers.human_review === "no_review") score2 -= 15;
  if (answers.human_review === "not_sure") score2 -= 10;
  if (answers.agent_autonomy_level === "takes_external_actions") score2 -= 10;
  if (answers.agent_autonomy_level === "fully_autonomous") score2 -= 20;
  if (answers.deployment_context === "customer_facing") score2 -= 10;
  if (answers.deployment_context === "public_website") score2 -= 15;
  if (answers.tool_connections.includes("payments")) score2 -= 10;
  if (answers.tool_connections.includes("code_execution")) score2 -= 10;
  if (answers.tool_connections.includes("browser_or_scraper")) score2 -= 10;
  if (answers.data_access.includes("credentials_or_secrets")) score2 -= 10;
  if (answers.data_access.includes("regulated_data")) score2 -= 10;
  if (answers.data_access.includes("financial_data")) score2 -= 8;
  if (answers.data_access.includes("health_data")) score2 -= 8;
  if (answers.data_access.includes("legal_data")) score2 -= 8;
  return clampScore3(score2);
}
__name(computeReadinessScore, "computeReadinessScore");
function deriveReadinessTier(score2) {
  if (score2 <= 34) return "not_ready";
  if (score2 <= 64) return "needs_design";
  if (score2 <= 84) return "build_ready_with_controls";
  return "build_ready";
}
__name(deriveReadinessTier, "deriveReadinessTier");
function computeComplexityScore(answers) {
  let score2 = 0;
  const realTools = answers.tool_connections.filter((value) => value !== "no_tools" && value !== "not_sure");
  if (answers.agent_autonomy_level === "fully_autonomous") score2 += 20;
  if (answers.agent_autonomy_level === "takes_external_actions") score2 += 15;
  if (answers.agent_autonomy_level === "takes_low_risk_actions") score2 += 10;
  if (realTools.length >= 4) score2 += 10;
  if (answers.tool_connections.includes("payments")) score2 += 15;
  if (answers.tool_connections.includes("code_execution")) score2 += 15;
  if (answers.tool_connections.includes("database")) score2 += 10;
  if (answers.tool_connections.includes("workflow_automation")) score2 += 10;
  if (answers.data_access.includes("regulated_data")) score2 += 10;
  if (answers.data_access.includes("credentials_or_secrets")) score2 += 10;
  if (answers.deployment_context === "customer_facing") score2 += 10;
  if (answers.deployment_context === "public_website") score2 += 15;
  return score2;
}
__name(computeComplexityScore, "computeComplexityScore");
function deriveBuildComplexity(score2) {
  if (score2 <= 24) return "simple";
  if (score2 <= 49) return "moderate";
  if (score2 <= 74) return "advanced";
  return "high_risk_complex";
}
__name(deriveBuildComplexity, "deriveBuildComplexity");
function computeSafetyScore(answers) {
  let score2 = 0;
  if (answers.agent_autonomy_level === "fully_autonomous") score2 += 20;
  if (answers.agent_autonomy_level === "takes_external_actions") score2 += 15;
  if (answers.deployment_context === "public_website") score2 += 15;
  if (answers.deployment_context === "customer_facing") score2 += 10;
  if (answers.tool_connections.includes("payments")) score2 += 20;
  if (answers.tool_connections.includes("code_execution")) score2 += 20;
  if (answers.tool_connections.includes("email")) score2 += 15;
  if (answers.tool_connections.includes("database")) score2 += 15;
  if (answers.tool_connections.includes("file_storage")) score2 += 15;
  if (answers.data_access.includes("credentials_or_secrets")) score2 += 20;
  if (answers.data_access.includes("regulated_data")) score2 += 20;
  if (answers.data_access.includes("financial_data")) score2 += 15;
  if (answers.data_access.includes("health_data")) score2 += 15;
  if (answers.data_access.includes("legal_data")) score2 += 15;
  if (answers.human_review === "no_review") score2 += 15;
  if (answers.human_review === "not_sure") score2 += 10;
  return score2;
}
__name(computeSafetyScore, "computeSafetyScore");
function deriveSafetyLevel(score2) {
  if (score2 <= 24) return "low";
  if (score2 <= 49) return "medium";
  if (score2 <= 74) return "high";
  return "critical";
}
__name(deriveSafetyLevel, "deriveSafetyLevel");
function derivePriority3(answers, readinessTier, buildComplexity, safetyLevel) {
  if (answers.timeline === "this_week") return "high";
  if (safetyLevel === "high" || safetyLevel === "critical") return "high";
  if (buildComplexity === "advanced" || buildComplexity === "high_risk_complex") return "high";
  if (readinessTier === "build_ready" || readinessTier === "build_ready_with_controls") return "medium";
  return "low";
}
__name(derivePriority3, "derivePriority");
function deriveRecommendedService(answers, readinessTier, buildComplexity, safetyLevel) {
  if (safetyLevel === "critical") return "ai_agent_security_review";
  if (buildComplexity === "high_risk_complex") return "ai_agent_security_review";
  if (answers.agent_goal === "operations_agent" || answers.agent_goal === "reporting_agent" || answers.tool_connections.includes("workflow_automation")) {
    return "ai_automation_build";
  }
  if (readinessTier === "build_ready" || readinessTier === "build_ready_with_controls") {
    return "ai_agent_build";
  }
  return "ai_agent_blueprint_session";
}
__name(deriveRecommendedService, "deriveRecommendedService");
function deriveSecondaryService(answers, recommendedService) {
  if (answers.data_access.some(
    (entry) => ["regulated_data", "credentials_or_secrets", "financial_data", "health_data", "legal_data"].includes(entry)
  ) || answers.deployment_context === "public_website") {
    return "ai_security_audit";
  }
  if (answers.deployment_context === "public_website" || answers.agent_autonomy_level === "takes_external_actions" || answers.agent_autonomy_level === "fully_autonomous") {
    return "prompt_injection_review";
  }
  if (answers.tool_connections.includes("workflow_automation")) {
    return "ai_automation_build";
  }
  if (recommendedService !== "ai_agent_build") {
    return "ai_agent_build";
  }
  return null;
}
__name(deriveSecondaryService, "deriveSecondaryService");
function pickUnique(items, limit = 3) {
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  for (const item of items) {
    if (!item || seen.has(item.category)) continue;
    seen.add(item.category);
    results.push(item);
    if (results.length >= limit) break;
  }
  return results;
}
__name(pickUnique, "pickUnique");
function buildTopBuildRequirements(answers, readinessTier, buildComplexity) {
  const picks = [];
  if (answers.workflow_clarity !== "clearly_documented") picks.push(requirementCatalog.workflow_mapping);
  if (answers.tool_connections.some((entry) => !["no_tools", "not_sure"].includes(entry))) {
    picks.push(requirementCatalog.tool_integration_plan);
    picks.push(requirementCatalog.permissions_model);
  }
  if (answers.data_access.some(
    (entry) => ["customer_data", "sales_data", "financial_data", "health_data", "legal_data", "credentials_or_secrets", "regulated_data"].includes(entry)
  )) {
    picks.push(requirementCatalog.data_access_design);
  }
  if (answers.human_review === "no_review" || answers.human_review === "not_sure" || ["takes_external_actions", "fully_autonomous"].includes(answers.agent_autonomy_level)) {
    picks.push(requirementCatalog.human_approval_flow);
  }
  if (answers.success_metric === "not_sure") picks.push(requirementCatalog.evaluation_plan);
  if (buildComplexity === "advanced" || buildComplexity === "high_risk_complex") {
    picks.push(requirementCatalog.logging_monitoring);
    picks.push(requirementCatalog.fallback_process);
  }
  if (answers.deployment_context === "customer_facing" || answers.deployment_context === "public_website") {
    picks.push(requirementCatalog.deployment_plan);
  }
  if (readinessTier === "build_ready" || readinessTier === "build_ready_with_controls") {
    picks.push(requirementCatalog.maintenance_plan);
  }
  return pickUnique(
    picks.length ? picks : [requirementCatalog.workflow_mapping, requirementCatalog.evaluation_plan, requirementCatalog.deployment_plan]
  );
}
__name(buildTopBuildRequirements, "buildTopBuildRequirements");
function buildTopRiskControls(answers, safetyLevel, buildComplexity) {
  const severity = safetyLevel;
  const picks = [];
  if (answers.human_review === "no_review" || answers.human_review === "not_sure" || ["takes_external_actions", "fully_autonomous"].includes(answers.agent_autonomy_level)) {
    picks.push({ ...riskControlCatalog.human_approval, severity });
  }
  if (answers.tool_connections.some(
    (entry) => ["email", "calendar", "crm", "database", "file_storage", "payments", "browser_or_scraper", "code_execution", "workflow_automation"].includes(entry)
  )) {
    picks.push({ ...riskControlCatalog.tool_permission_boundaries, severity });
  }
  if (answers.data_access.some(
    (entry) => ["customer_data", "sales_data", "financial_data", "health_data", "legal_data", "regulated_data"].includes(entry)
  )) {
    picks.push({ ...riskControlCatalog.data_minimization, severity });
  }
  if (answers.deployment_context === "public_website" || answers.agent_autonomy_level === "takes_external_actions" || answers.agent_autonomy_level === "fully_autonomous") {
    picks.push({ ...riskControlCatalog.prompt_injection_testing, severity });
  }
  if (buildComplexity === "advanced" || buildComplexity === "high_risk_complex" || safetyLevel === "high" || safetyLevel === "critical") {
    picks.push({ ...riskControlCatalog.audit_logging, severity });
    picks.push({ ...riskControlCatalog.rollback_plan, severity });
  }
  if (answers.data_access.includes("credentials_or_secrets") || answers.tool_connections.includes("payments") || answers.tool_connections.includes("database")) {
    picks.push({ ...riskControlCatalog.access_control, severity });
  }
  if (answers.deployment_context === "customer_facing" || answers.deployment_context === "public_website") {
    picks.push({ ...riskControlCatalog.output_review, severity });
  }
  if (answers.data_access.some(
    (entry) => ["regulated_data", "financial_data", "health_data", "legal_data"].includes(entry)
  )) {
    picks.push({ ...riskControlCatalog.compliance_review, severity });
  }
  if (answers.data_access.includes("credentials_or_secrets")) {
    picks.push({ ...riskControlCatalog.credential_isolation, severity });
  }
  return pickUnique(
    picks.length ? picks : [
      { ...riskControlCatalog.human_approval, severity: "medium" },
      { ...riskControlCatalog.audit_logging, severity: "medium" },
      { ...riskControlCatalog.rollback_plan, severity: "medium" }
    ]
  );
}
__name(buildTopRiskControls, "buildTopRiskControls");
function generateAgentCheckId() {
  return `agent-${1001 + agentReadinessSubmissions.length}`;
}
__name(generateAgentCheckId, "generateAgentCheckId");
function computeAgentReadinessResult(answers, agentCheckId = generateAgentCheckId()) {
  const readinessScore = computeReadinessScore(answers);
  const readinessTier = deriveReadinessTier(readinessScore);
  const buildComplexity = deriveBuildComplexity(computeComplexityScore(answers));
  const safetyLevel = deriveSafetyLevel(computeSafetyScore(answers));
  const priority = derivePriority3(answers, readinessTier, buildComplexity, safetyLevel);
  const recommendedService = deriveRecommendedService(answers, readinessTier, buildComplexity, safetyLevel);
  const secondaryService = deriveSecondaryService(answers, recommendedService);
  const topBuildRequirements = buildTopBuildRequirements(answers, readinessTier, buildComplexity);
  const topRiskControls = buildTopRiskControls(answers, safetyLevel, buildComplexity);
  const params = new URLSearchParams({
    service: recommendedService,
    priority,
    source: "agent-readiness-checker",
    agent_check_id: agentCheckId,
    readiness_score: String(readinessScore),
    readiness_tier: readinessTier,
    build_complexity: buildComplexity,
    safety_level: safetyLevel
  });
  return {
    status: "agent-readiness-complete",
    agent_check_id: agentCheckId,
    readiness_score: readinessScore,
    readiness_tier: readinessTier,
    build_complexity: buildComplexity,
    safety_level: safetyLevel,
    priority,
    recommended_service: recommendedService,
    secondary_service: secondaryService || void 0,
    top_build_requirements: topBuildRequirements.map((entry) => ({ ...entry })),
    top_risk_controls: topRiskControls.map((entry) => ({ ...entry })),
    next_route: `/enter?${params.toString()}`
  };
}
__name(computeAgentReadinessResult, "computeAgentReadinessResult");
function upsertAgentReadinessSubmission(submission) {
  const index = agentReadinessSubmissions.findIndex((entry) => entry.agent_check_id === submission.agent_check_id);
  if (index >= 0) {
    agentReadinessSubmissions[index] = { ...agentReadinessSubmissions[index], ...submission };
    return agentReadinessSubmissions[index];
  }
  agentReadinessSubmissions.unshift(submission);
  return submission;
}
__name(upsertAgentReadinessSubmission, "upsertAgentReadinessSubmission");
function recordAgentReadinessSubmission(answers, result) {
  return upsertAgentReadinessSubmission({
    agent_check_id: result.agent_check_id,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    source_route: answers.source_route,
    agent_goal: answers.agent_goal,
    agent_autonomy_level: answers.agent_autonomy_level,
    tool_connections: [...answers.tool_connections],
    data_access: [...answers.data_access],
    human_review: answers.human_review,
    deployment_context: answers.deployment_context,
    workflow_clarity: answers.workflow_clarity,
    success_metric: answers.success_metric,
    timeline: answers.timeline,
    readiness_score: result.readiness_score,
    readiness_tier: result.readiness_tier,
    build_complexity: result.build_complexity,
    safety_level: result.safety_level,
    priority: result.priority,
    recommended_service: result.recommended_service,
    secondary_service: result.secondary_service || null,
    top_build_requirements: result.top_build_requirements.map((entry) => ({ ...entry })),
    top_risk_controls: result.top_risk_controls.map((entry) => ({ ...entry })),
    next_route: result.next_route,
    engagement_id: null,
    status: "agent-readiness-complete"
  });
}
__name(recordAgentReadinessSubmission, "recordAgentReadinessSubmission");
function attachEngagementToAgentReadiness(details = {}) {
  const agentCheckId = normalizeText4(details.agent_check_id || details.agentCheckId);
  if (!agentCheckId) {
    return null;
  }
  const existing = agentReadinessSubmissions.find((entry) => entry.agent_check_id === agentCheckId);
  const base = existing || {
    agent_check_id: agentCheckId,
    created_at: details.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    source_route: details.source || "agent-readiness-checker",
    agent_goal: "",
    agent_autonomy_level: "",
    tool_connections: [],
    data_access: [],
    human_review: "",
    deployment_context: "",
    workflow_clarity: "",
    success_metric: "",
    timeline: "",
    readiness_score: Number.isFinite(Number(details.readiness_score)) ? Number(details.readiness_score) : 0,
    readiness_tier: normalizeText4(details.readiness_tier) || "needs_design",
    build_complexity: normalizeText4(details.build_complexity) || "moderate",
    safety_level: normalizeText4(details.safety_level) || "medium",
    priority: normalizeText4(details.priority) || "low",
    recommended_service: normalizeText4(details.recommended_service || details.recommendedService) || "ai_agent_blueprint_session",
    secondary_service: normalizeText4(details.secondary_service || details.secondaryService) || null,
    top_build_requirements: Array.isArray(details.top_build_requirements) ? details.top_build_requirements : [],
    top_risk_controls: Array.isArray(details.top_risk_controls) ? details.top_risk_controls : [],
    next_route: "",
    status: "agent-readiness-complete"
  };
  base.engagement_id = normalizeText4(details.engagement_id || details.engagementId) || base.engagement_id || null;
  base.readiness_score = Number.isFinite(Number(details.readiness_score)) ? Number(details.readiness_score) : base.readiness_score || 0;
  base.readiness_tier = normalizeText4(details.readiness_tier) || base.readiness_tier || "needs_design";
  base.build_complexity = normalizeText4(details.build_complexity) || base.build_complexity || "moderate";
  base.safety_level = normalizeText4(details.safety_level) || base.safety_level || "medium";
  base.priority = normalizeText4(details.priority) || base.priority || "low";
  base.recommended_service = normalizeText4(details.recommended_service || details.recommendedService) || base.recommended_service || "ai_agent_blueprint_session";
  base.secondary_service = normalizeText4(details.secondary_service || details.secondaryService) || base.secondary_service || null;
  base.status = normalizeText4(details.status) || "intake-received";
  if (Array.isArray(details.top_build_requirements) && details.top_build_requirements.length) {
    base.top_build_requirements = details.top_build_requirements;
  }
  if (Array.isArray(details.top_risk_controls) && details.top_risk_controls.length) {
    base.top_risk_controls = details.top_risk_controls;
  }
  return upsertAgentReadinessSubmission(base);
}
__name(attachEngagementToAgentReadiness, "attachEngagementToAgentReadiness");
function listAgentReadinessQueue(engagements3 = []) {
  const queue = [];
  for (const submission of agentReadinessSubmissions) {
    const linkedEngagement = engagements3.find((entry) => entry.agentCheckId && entry.agentCheckId === submission.agent_check_id);
    queue.push({
      agent_check_id: submission.agent_check_id,
      engagement_id: submission.engagement_id || linkedEngagement?.id || null,
      readiness_score: submission.readiness_score,
      readiness_tier: submission.readiness_tier,
      build_complexity: submission.build_complexity,
      safety_level: submission.safety_level,
      priority: submission.priority,
      recommended_service: submission.recommended_service,
      secondary_service: submission.secondary_service,
      status: linkedEngagement?.status || submission.status,
      created_at: linkedEngagement?.createdAt || submission.created_at
    });
  }
  for (const engagement of engagements3) {
    if (!engagement.agentCheckId) continue;
    if (queue.some((entry) => entry.engagement_id === engagement.id)) continue;
    queue.push({
      agent_check_id: engagement.agentCheckId,
      engagement_id: engagement.id,
      readiness_score: engagement.readinessScore || 0,
      readiness_tier: engagement.readinessTier || "needs_design",
      build_complexity: engagement.buildComplexity || "moderate",
      safety_level: engagement.safetyLevel || "medium",
      priority: engagement.priority || "low",
      recommended_service: engagement.recommendedService || "ai_agent_blueprint_session",
      secondary_service: engagement.secondaryService || null,
      status: engagement.status || "intake-received",
      created_at: engagement.createdAt || null
    });
  }
  return queue.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}
__name(listAgentReadinessQueue, "listAgentReadinessQueue");
var agentReadinessChecker_default = {
  agentReadinessMarketplaceModule,
  agentReadinessSubmissions,
  normalizeAgentReadinessAnswers,
  computeAgentReadinessResult,
  recordAgentReadinessSubmission,
  attachEngagementToAgentReadiness,
  listAgentReadinessQueue
};

// worker/data/automationRoiCalculator.js
var automationRoiMarketplaceModule = {
  module_id: "msh-automation-roi-calculator",
  service_slug: "automation_roi_calculator",
  name: "Automation ROI Calculator",
  category: "AI Automation",
  public_service_route: "/apps/automation-roi-calculator",
  operator_route: "/operator/automation-roi",
  description: "Free advisory calculator that estimates time savings, cost savings, automation complexity, and the recommended automation path for repetitive workflows.",
  revenue_type: "consulting",
  base_price: 0,
  recommended_upsell: "AI Automation Build / Automation Maintenance",
  required_inputs: [
    "workflow_type",
    "current_process",
    "weekly_volume",
    "time_per_item_minutes",
    "team_hourly_cost",
    "error_rate",
    "tools_involved",
    "ai_needed",
    "risk_sensitivity",
    "timeline"
  ],
  delivery_outputs: [
    "roi_score",
    "roi_tier",
    "estimated_monthly_savings",
    "estimated_annual_savings",
    "hours_saved_per_month",
    "automation_complexity",
    "top_automation_opportunities",
    "top_implementation_requirements",
    "recommended_service",
    "intake_route"
  ],
  status: "active"
};
var allowedWorkflowType = /* @__PURE__ */ new Set([
  "lead_capture_followup",
  "customer_support",
  "reporting_dashboard",
  "document_processing",
  "data_entry",
  "crm_updates",
  "invoice_or_billing",
  "appointment_scheduling",
  "email_triage",
  "social_content_ops",
  "sales_prospecting",
  "security_or_compliance_process",
  "internal_operations",
  "custom_workflow",
  "not_sure"
]);
var allowedCurrentProcess = /* @__PURE__ */ new Set([
  "fully_manual",
  "spreadsheets_and_email",
  "partially_automated",
  "scattered_tools",
  "legacy_system",
  "not_sure"
]);
var allowedWeeklyVolume = /* @__PURE__ */ new Set([
  "under_25",
  "25_100",
  "100_500",
  "500_2000",
  "2000_plus",
  "not_sure"
]);
var allowedTimePerItem = /* @__PURE__ */ new Set([
  "under_5",
  "5_15",
  "15_30",
  "30_60",
  "60_plus",
  "not_sure"
]);
var allowedHourlyCost = /* @__PURE__ */ new Set([
  "under_25",
  "25_50",
  "50_100",
  "100_200",
  "200_plus",
  "not_sure"
]);
var allowedErrorRate = /* @__PURE__ */ new Set([
  "low_under_2_percent",
  "moderate_2_5_percent",
  "high_5_10_percent",
  "severe_over_10_percent",
  "not_sure"
]);
var allowedTools = /* @__PURE__ */ new Set([
  "email",
  "calendar",
  "crm",
  "spreadsheet",
  "database",
  "file_storage",
  "slack_or_teams",
  "project_management",
  "payments_or_invoicing",
  "forms",
  "website",
  "ai_chatbot",
  "n8n_make_zapier",
  "custom_api",
  "not_sure"
]);
var allowedAiNeeded = /* @__PURE__ */ new Set([
  "no_rules_based_is_enough",
  "maybe",
  "yes_text_or_email_generation",
  "yes_document_understanding",
  "yes_decision_support",
  "yes_agentic_workflow",
  "not_sure"
]);
var allowedRiskSensitivity = /* @__PURE__ */ new Set([
  "low_internal_only",
  "medium_business_data",
  "high_customer_data",
  "regulated_or_financial_data",
  "credentials_or_admin_actions",
  "not_sure"
]);
var allowedTimeline2 = /* @__PURE__ */ new Set([
  "this_week",
  "this_month",
  "this_quarter",
  "exploring"
]);
var weeklyVolumeMap = {
  under_25: 15,
  "25_100": 60,
  "100_500": 250,
  "500_2000": 1e3,
  "2000_plus": 2500,
  not_sure: 60
};
var timePerItemMap = {
  under_5: 3,
  "5_15": 10,
  "15_30": 22,
  "30_60": 45,
  "60_plus": 75,
  not_sure: 15
};
var hourlyCostMap = {
  under_25: 20,
  "25_50": 40,
  "50_100": 75,
  "100_200": 150,
  "200_plus": 250,
  not_sure: 50
};
var captureRateMap = {
  fully_manual: 0.65,
  spreadsheets_and_email: 0.55,
  partially_automated: 0.35,
  scattered_tools: 0.5,
  legacy_system: 0.4,
  not_sure: 0.4
};
var errorAdjustmentMap = {
  low_under_2_percent: 0,
  moderate_2_5_percent: 0.1,
  high_5_10_percent: 0.2,
  severe_over_10_percent: 0.35,
  not_sure: 0.1
};
var opportunityCatalog = {
  intake_and_routing: {
    title: "Automate intake and routing",
    category: "intake_and_routing",
    description: "Forms, websites, and internal handoffs can route work automatically instead of waiting for manual triage.",
    estimated_impact: "Reduce intake lag and remove repetitive assignment work."
  },
  follow_up_automation: {
    title: "Automate follow-up workflows",
    category: "follow_up_automation",
    description: "Email and CRM follow-up patterns are strong candidates for templated automation with timing logic.",
    estimated_impact: "Save response time and improve follow-up consistency."
  },
  reporting_automation: {
    title: "Automate recurring reporting",
    category: "reporting_automation",
    description: "Dashboard and report preparation can be triggered on schedule instead of built manually every cycle.",
    estimated_impact: "Reduce recurring reporting effort and improve visibility cadence."
  },
  document_processing: {
    title: "Automate document processing",
    category: "document_processing",
    description: "Document intake, extraction, and routing can be standardized into repeatable workflows.",
    estimated_impact: "Lower manual review time and reduce processing backlog."
  },
  crm_sync: {
    title: "Automate CRM synchronization",
    category: "crm_sync",
    description: "CRM updates are often spread across forms, email, and spreadsheets and can be synchronized automatically.",
    estimated_impact: "Reduce duplicate entry and improve data freshness."
  },
  email_triage: {
    title: "Automate email triage",
    category: "email_triage",
    description: "Routine inbox sorting, tagging, and routing can be handled faster by workflow logic or light AI support.",
    estimated_impact: "Reduce manual inbox overhead and shorten routing time."
  },
  scheduling: {
    title: "Automate scheduling workflows",
    category: "scheduling",
    description: "Appointment coordination and follow-up reminders can run without manual back-and-forth.",
    estimated_impact: "Save coordination time and reduce missed scheduling steps."
  },
  billing_or_invoicing: {
    title: "Automate billing handoffs",
    category: "billing_or_invoicing",
    description: "Invoice, payment, and approval handoffs can be standardized with safer routing logic and validation.",
    estimated_impact: "Reduce billing overhead and improve cycle consistency."
  },
  data_cleanup: {
    title: "Automate data cleanup",
    category: "data_cleanup",
    description: "Spreadsheets and scattered records can be normalized before they create downstream reporting errors.",
    estimated_impact: "Cut cleanup time and improve operational data quality."
  },
  workflow_orchestration: {
    title: "Orchestrate multi-step workflows",
    category: "workflow_orchestration",
    description: "Connected tools and multi-step handoffs can be coordinated through a single workflow layer.",
    estimated_impact: "Reduce manual context-switching across systems."
  },
  ai_assisted_decisioning: {
    title: "Add AI-assisted decisioning",
    category: "ai_assisted_decisioning",
    description: "Document understanding, classification, or recommendation support can shorten manual judgment tasks.",
    estimated_impact: "Reduce review effort and improve decision support speed."
  },
  agentic_task_execution: {
    title: "Evaluate agentic task execution",
    category: "agentic_task_execution",
    description: "Higher-autonomy workflows may justify an agent build rather than simple workflow automation.",
    estimated_impact: "Expand automation scope when the process is well defined and controls are strong."
  }
};
var requirementCatalog2 = {
  workflow_mapping: {
    title: "Map the current workflow",
    category: "workflow_mapping",
    description: "Document each step, handoff, exception, and approval in the current process.",
    why_it_matters: "Clear process mapping prevents automation gaps and duplicate work paths."
  },
  integration_design: {
    title: "Design the integration layer",
    category: "integration_design",
    description: "Define how the workflow should move data between tools before any build starts.",
    why_it_matters: "Integration design is what determines whether the automation is reliable in production."
  },
  data_validation: {
    title: "Add data validation rules",
    category: "data_validation",
    description: "Validate inputs, routing fields, and update conditions before records move across systems.",
    why_it_matters: "Validation reduces downstream cleanup and broken automations."
  },
  error_handling: {
    title: "Define error handling",
    category: "error_handling",
    description: "Plan what should happen when an automation cannot complete, receives bad data, or hits a system exception.",
    why_it_matters: "Operational reliability depends on predictable failure behavior."
  },
  human_approval: {
    title: "Insert human approval checkpoints",
    category: "human_approval",
    description: "Higher-risk updates, external messages, or financial steps should require human signoff.",
    why_it_matters: "Approval steps reduce the blast radius of incorrect automation behavior."
  },
  access_control: {
    title: "Set access control boundaries",
    category: "access_control",
    description: "Constrain which tools, fields, and records the workflow can touch.",
    why_it_matters: "Access boundaries prevent accidental exposure or unsafe actions."
  },
  logging_monitoring: {
    title: "Instrument logging and monitoring",
    category: "logging_monitoring",
    description: "Track run status, failures, approvals, and changed records for operator visibility.",
    why_it_matters: "Without visibility, teams cannot trust or improve production automation."
  },
  testing_plan: {
    title: "Create a testing plan",
    category: "testing_plan",
    description: "Validate edge cases, bad inputs, duplicate triggers, and fallback paths before launch.",
    why_it_matters: "Testing reduces rework and fragile automation launches."
  },
  fallback_process: {
    title: "Define the fallback process",
    category: "fallback_process",
    description: "Specify how work returns to humans when the automation is blocked or uncertain.",
    why_it_matters: "Fallback design prevents silent failures and stranded work items."
  },
  maintenance_plan: {
    title: "Plan ongoing maintenance",
    category: "maintenance_plan",
    description: "Assign ownership for workflow updates, connector drift, rule changes, and operational review.",
    why_it_matters: "Automations degrade without clear ownership after launch."
  },
  security_review: {
    title: "Run a security review",
    category: "security_review",
    description: "Review data sensitivity, approval boundaries, and privileged tool access before deployment.",
    why_it_matters: "Security review is required when automations handle customer, financial, or privileged data."
  },
  roi_tracking: {
    title: "Track ROI after launch",
    category: "roi_tracking",
    description: "Measure time saved, volume processed, and error reduction against the baseline estimate.",
    why_it_matters: "ROI tracking proves whether the automation delivered the expected business value."
  }
};
var automationRoiSubmissions = [];
function normalizeText5(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeText5, "normalizeText");
function normalizeArray5(values) {
  return Array.isArray(values) ? values.map((value) => normalizeText5(value)).filter(Boolean) : [];
}
__name(normalizeArray5, "normalizeArray");
function validateSingle4(value, allowedSet, fallback) {
  const normalized = normalizeText5(value);
  return allowedSet.has(normalized) ? normalized : fallback;
}
__name(validateSingle4, "validateSingle");
function validateMulti4(values, allowedSet, fallbackValue) {
  const filtered = normalizeArray5(values).filter((value) => allowedSet.has(value));
  if (!filtered.length) {
    return [fallbackValue];
  }
  if (filtered.includes("not_sure")) {
    return ["not_sure"];
  }
  return [...new Set(filtered)];
}
__name(validateMulti4, "validateMulti");
function clampScore4(score2) {
  return Math.max(0, Math.min(100, score2));
}
__name(clampScore4, "clampScore");
function roundMoney(value) {
  return Math.round(Number(value) || 0);
}
__name(roundMoney, "roundMoney");
function roundHours(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}
__name(roundHours, "roundHours");
function normalizeAutomationRoiAnswers(payload = {}) {
  return {
    workflow_type: validateSingle4(payload.workflow_type, allowedWorkflowType, "not_sure"),
    current_process: validateSingle4(payload.current_process, allowedCurrentProcess, "not_sure"),
    weekly_volume: validateSingle4(payload.weekly_volume, allowedWeeklyVolume, "not_sure"),
    time_per_item_minutes: validateSingle4(payload.time_per_item_minutes, allowedTimePerItem, "not_sure"),
    team_hourly_cost: validateSingle4(payload.team_hourly_cost, allowedHourlyCost, "not_sure"),
    error_rate: validateSingle4(payload.error_rate, allowedErrorRate, "not_sure"),
    tools_involved: validateMulti4(payload.tools_involved, allowedTools, "not_sure"),
    ai_needed: validateSingle4(payload.ai_needed, allowedAiNeeded, "not_sure"),
    risk_sensitivity: validateSingle4(payload.risk_sensitivity, allowedRiskSensitivity, "not_sure"),
    timeline: validateSingle4(payload.timeline, allowedTimeline2, "exploring"),
    source_route: normalizeText5(payload.source_route) || "/apps/automation-roi-calculator"
  };
}
__name(normalizeAutomationRoiAnswers, "normalizeAutomationRoiAnswers");
function computeSavings(answers) {
  const weeklyVolume = weeklyVolumeMap[answers.weekly_volume];
  const timePerItem = timePerItemMap[answers.time_per_item_minutes];
  const hourlyCost = hourlyCostMap[answers.team_hourly_cost];
  const captureRate = captureRateMap[answers.current_process];
  const weeklyHours = weeklyVolume * timePerItem / 60;
  const monthlyHours = weeklyHours * 4.33;
  const hoursSavedPerMonth = monthlyHours * captureRate;
  const baseMonthlySavings = hoursSavedPerMonth * hourlyCost;
  const adjustedMonthlySavings = baseMonthlySavings + baseMonthlySavings * errorAdjustmentMap[answers.error_rate];
  return {
    weekly_hours: weeklyHours,
    monthly_hours: monthlyHours,
    hours_saved_per_month: roundHours(hoursSavedPerMonth),
    estimated_monthly_savings: roundMoney(adjustedMonthlySavings),
    estimated_annual_savings: roundMoney(adjustedMonthlySavings * 12)
  };
}
__name(computeSavings, "computeSavings");
function deriveRoiTier(score2) {
  if (score2 <= 34) return "low";
  if (score2 <= 64) return "moderate";
  if (score2 <= 84) return "strong";
  return "exceptional";
}
__name(deriveRoiTier, "deriveRoiTier");
function computeRoiScore(answers, estimatedMonthlySavings) {
  let score2 = 20;
  if (estimatedMonthlySavings >= 1e4) score2 += 25;
  else if (estimatedMonthlySavings >= 5e3) score2 += 20;
  else if (estimatedMonthlySavings >= 2500) score2 += 15;
  else if (estimatedMonthlySavings >= 1e3) score2 += 10;
  else if (estimatedMonthlySavings >= 500) score2 += 5;
  if (answers.current_process === "fully_manual") score2 += 15;
  if (answers.current_process === "spreadsheets_and_email") score2 += 10;
  if (answers.current_process === "scattered_tools") score2 += 10;
  if (answers.weekly_volume === "500_2000" || answers.weekly_volume === "2000_plus") score2 += 10;
  if (answers.error_rate === "high_5_10_percent" || answers.error_rate === "severe_over_10_percent") score2 += 10;
  if (answers.tools_involved.includes("n8n_make_zapier")) score2 += 8;
  if (answers.tools_involved.includes("crm")) score2 += 8;
  if (answers.tools_involved.includes("forms")) score2 += 8;
  if (answers.tools_involved.includes("spreadsheet")) score2 += 8;
  if (answers.ai_needed === "yes_text_or_email_generation") score2 += 8;
  if (answers.ai_needed === "yes_document_understanding") score2 += 8;
  if (answers.ai_needed === "yes_decision_support") score2 += 8;
  if (answers.ai_needed === "yes_agentic_workflow") score2 += 10;
  if (answers.risk_sensitivity === "credentials_or_admin_actions") score2 -= 10;
  if (answers.risk_sensitivity === "regulated_or_financial_data") score2 -= 8;
  if (answers.timeline === "exploring") score2 -= 5;
  return clampScore4(score2);
}
__name(computeRoiScore, "computeRoiScore");
function computeComplexityScore2(answers) {
  let score2 = 0;
  const realTools = answers.tools_involved.filter((entry) => entry !== "not_sure");
  if (realTools.length >= 4) score2 += 10;
  if (answers.tools_involved.includes("custom_api")) score2 += 10;
  if (answers.tools_involved.includes("database")) score2 += 10;
  if (answers.tools_involved.includes("payments_or_invoicing")) score2 += 10;
  if (answers.tools_involved.includes("ai_chatbot")) score2 += 10;
  if (answers.ai_needed === "yes_document_understanding") score2 += 10;
  if (answers.ai_needed === "yes_decision_support") score2 += 10;
  if (answers.ai_needed === "yes_agentic_workflow") score2 += 15;
  if (answers.risk_sensitivity === "high_customer_data") score2 += 10;
  if (answers.risk_sensitivity === "regulated_or_financial_data") score2 += 15;
  if (answers.risk_sensitivity === "credentials_or_admin_actions") score2 += 20;
  if (answers.current_process === "legacy_system") score2 += 10;
  return score2;
}
__name(computeComplexityScore2, "computeComplexityScore");
function deriveAutomationComplexity(score2) {
  if (score2 <= 24) return "simple";
  if (score2 <= 49) return "moderate";
  if (score2 <= 74) return "advanced";
  return "high_risk_complex";
}
__name(deriveAutomationComplexity, "deriveAutomationComplexity");
function derivePriority4(answers, estimatedMonthlySavings, roiTier, automationComplexity) {
  if (answers.timeline === "this_week") return "high";
  if (estimatedMonthlySavings >= 5e3) return "high";
  if (roiTier === "strong" || roiTier === "exceptional") return "high";
  if (automationComplexity === "advanced" || automationComplexity === "high_risk_complex") return "high";
  if (estimatedMonthlySavings >= 1e3) return "medium";
  return "low";
}
__name(derivePriority4, "derivePriority");
function deriveRecommendedService2(answers, roiTier, automationComplexity) {
  if (automationComplexity === "high_risk_complex") return "automation_blueprint_session";
  if (answers.risk_sensitivity === "credentials_or_admin_actions") return "automation_blueprint_session";
  if (answers.ai_needed === "yes_agentic_workflow") return "ai_agent_build";
  if (answers.ai_needed === "yes_decision_support") return "ai_automation_build";
  if (roiTier === "strong" || roiTier === "exceptional") return "ai_automation_build";
  if (roiTier === "moderate") return "automation_blueprint_session";
  return "workflow_optimization_review";
}
__name(deriveRecommendedService2, "deriveRecommendedService");
function deriveSecondaryService2(answers, recommendedService) {
  if (answers.risk_sensitivity === "regulated_or_financial_data" || answers.risk_sensitivity === "credentials_or_admin_actions") {
    return "ai_security_audit";
  }
  if (answers.ai_needed === "yes_agentic_workflow") {
    return "ai_agent_readiness_checker";
  }
  if (answers.tools_involved.includes("ai_chatbot")) {
    return "prompt_injection_review";
  }
  if (recommendedService !== "ai_agent_build" && ["yes_text_or_email_generation", "yes_document_understanding", "yes_decision_support", "yes_agentic_workflow"].includes(answers.ai_needed)) {
    return "ai_agent_build";
  }
  return null;
}
__name(deriveSecondaryService2, "deriveSecondaryService");
function pickUnique2(items, limit = 3) {
  const seen = /* @__PURE__ */ new Set();
  const output = [];
  for (const item of items) {
    if (!item || seen.has(item.category)) continue;
    seen.add(item.category);
    output.push(item);
    if (output.length >= limit) break;
  }
  return output;
}
__name(pickUnique2, "pickUnique");
function buildTopAutomationOpportunities(answers) {
  const picks = [];
  if (answers.workflow_type === "lead_capture_followup") {
    picks.push(opportunityCatalog.follow_up_automation, opportunityCatalog.intake_and_routing, opportunityCatalog.crm_sync);
  }
  if (answers.workflow_type === "customer_support") {
    picks.push(opportunityCatalog.email_triage, opportunityCatalog.follow_up_automation);
  }
  if (answers.workflow_type === "reporting_dashboard") {
    picks.push(opportunityCatalog.reporting_automation, opportunityCatalog.data_cleanup);
  }
  if (answers.workflow_type === "document_processing") {
    picks.push(opportunityCatalog.document_processing);
  }
  if (answers.workflow_type === "crm_updates") {
    picks.push(opportunityCatalog.crm_sync);
  }
  if (answers.workflow_type === "invoice_or_billing") {
    picks.push(opportunityCatalog.billing_or_invoicing);
  }
  if (answers.workflow_type === "appointment_scheduling") {
    picks.push(opportunityCatalog.scheduling);
  }
  if (answers.workflow_type === "email_triage") {
    picks.push(opportunityCatalog.email_triage);
  }
  if (answers.workflow_type === "security_or_compliance_process") {
    picks.push(opportunityCatalog.workflow_orchestration, opportunityCatalog.reporting_automation);
  }
  if (answers.workflow_type === "internal_operations") {
    picks.push(opportunityCatalog.workflow_orchestration, opportunityCatalog.data_cleanup);
  }
  if (answers.tools_involved.includes("forms") || answers.tools_involved.includes("website")) {
    picks.push(opportunityCatalog.intake_and_routing);
  }
  if (answers.tools_involved.includes("crm")) {
    picks.push(opportunityCatalog.crm_sync);
  }
  if (answers.tools_involved.includes("email")) {
    picks.push(opportunityCatalog.follow_up_automation, opportunityCatalog.email_triage);
  }
  if (answers.tools_involved.includes("spreadsheet")) {
    picks.push(opportunityCatalog.data_cleanup, opportunityCatalog.reporting_automation);
  }
  if (answers.tools_involved.includes("payments_or_invoicing")) {
    picks.push(opportunityCatalog.billing_or_invoicing);
  }
  if (answers.ai_needed === "yes_decision_support" || answers.ai_needed === "yes_document_understanding") {
    picks.push(opportunityCatalog.ai_assisted_decisioning);
  }
  if (answers.ai_needed === "yes_agentic_workflow") {
    picks.push(opportunityCatalog.agentic_task_execution);
  }
  return pickUnique2(
    picks.length ? picks : [opportunityCatalog.workflow_orchestration, opportunityCatalog.follow_up_automation, opportunityCatalog.reporting_automation]
  );
}
__name(buildTopAutomationOpportunities, "buildTopAutomationOpportunities");
function buildTopImplementationRequirements(answers, automationComplexity) {
  const picks = [];
  picks.push(requirementCatalog2.workflow_mapping);
  if (answers.tools_involved.some((entry) => !["not_sure"].includes(entry))) {
    picks.push(requirementCatalog2.integration_design, requirementCatalog2.data_validation);
  }
  if (automationComplexity === "advanced" || automationComplexity === "high_risk_complex") {
    picks.push(requirementCatalog2.error_handling, requirementCatalog2.logging_monitoring, requirementCatalog2.testing_plan);
  }
  if (answers.risk_sensitivity === "high_customer_data" || answers.risk_sensitivity === "regulated_or_financial_data" || answers.risk_sensitivity === "credentials_or_admin_actions") {
    picks.push(requirementCatalog2.access_control, requirementCatalog2.security_review);
  }
  if (answers.risk_sensitivity === "credentials_or_admin_actions" || answers.tools_involved.includes("payments_or_invoicing")) {
    picks.push(requirementCatalog2.human_approval);
  }
  if (answers.current_process === "legacy_system" || answers.current_process === "scattered_tools") {
    picks.push(requirementCatalog2.fallback_process);
  }
  if (answers.timeline !== "exploring") {
    picks.push(requirementCatalog2.roi_tracking);
  }
  picks.push(requirementCatalog2.maintenance_plan);
  return pickUnique2(
    picks.length ? picks : [requirementCatalog2.workflow_mapping, requirementCatalog2.integration_design, requirementCatalog2.roi_tracking]
  );
}
__name(buildTopImplementationRequirements, "buildTopImplementationRequirements");
function generateAutomationRoiId() {
  return `auto-roi-${1001 + automationRoiSubmissions.length}`;
}
__name(generateAutomationRoiId, "generateAutomationRoiId");
function computeAutomationRoiResult(answers, automationRoiId = generateAutomationRoiId()) {
  const savings = computeSavings(answers);
  const roiScore = computeRoiScore(answers, savings.estimated_monthly_savings);
  const roiTier = deriveRoiTier(roiScore);
  const automationComplexity = deriveAutomationComplexity(computeComplexityScore2(answers));
  const priority = derivePriority4(answers, savings.estimated_monthly_savings, roiTier, automationComplexity);
  const recommendedService = deriveRecommendedService2(answers, roiTier, automationComplexity);
  const secondaryService = deriveSecondaryService2(answers, recommendedService);
  const topAutomationOpportunities = buildTopAutomationOpportunities(answers);
  const topImplementationRequirements = buildTopImplementationRequirements(answers, automationComplexity);
  const params = new URLSearchParams({
    service: recommendedService,
    priority,
    source: "automation-roi-calculator",
    automation_roi_id: automationRoiId,
    roi_score: String(roiScore),
    roi_tier: roiTier,
    estimated_monthly_savings: String(savings.estimated_monthly_savings),
    estimated_annual_savings: String(savings.estimated_annual_savings),
    hours_saved_per_month: String(savings.hours_saved_per_month),
    automation_complexity: automationComplexity
  });
  return {
    status: "automation-roi-complete",
    automation_roi_id: automationRoiId,
    roi_score: roiScore,
    roi_tier: roiTier,
    estimated_monthly_savings: savings.estimated_monthly_savings,
    estimated_annual_savings: savings.estimated_annual_savings,
    hours_saved_per_month: savings.hours_saved_per_month,
    automation_complexity: automationComplexity,
    priority,
    recommended_service: recommendedService,
    secondary_service: secondaryService || void 0,
    top_automation_opportunities: topAutomationOpportunities.map((entry) => ({ ...entry })),
    top_implementation_requirements: topImplementationRequirements.map((entry) => ({ ...entry })),
    next_route: `/enter?${params.toString()}`
  };
}
__name(computeAutomationRoiResult, "computeAutomationRoiResult");
function upsertAutomationRoiSubmission(submission) {
  const index = automationRoiSubmissions.findIndex((entry) => entry.automation_roi_id === submission.automation_roi_id);
  if (index >= 0) {
    automationRoiSubmissions[index] = { ...automationRoiSubmissions[index], ...submission };
    return automationRoiSubmissions[index];
  }
  automationRoiSubmissions.unshift(submission);
  return submission;
}
__name(upsertAutomationRoiSubmission, "upsertAutomationRoiSubmission");
function recordAutomationRoiSubmission(answers, result) {
  return upsertAutomationRoiSubmission({
    automation_roi_id: result.automation_roi_id,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    source_route: answers.source_route,
    workflow_type: answers.workflow_type,
    current_process: answers.current_process,
    weekly_volume: answers.weekly_volume,
    time_per_item_minutes: answers.time_per_item_minutes,
    team_hourly_cost: answers.team_hourly_cost,
    error_rate: answers.error_rate,
    tools_involved: [...answers.tools_involved],
    ai_needed: answers.ai_needed,
    risk_sensitivity: answers.risk_sensitivity,
    timeline: answers.timeline,
    roi_score: result.roi_score,
    roi_tier: result.roi_tier,
    estimated_monthly_savings: result.estimated_monthly_savings,
    estimated_annual_savings: result.estimated_annual_savings,
    hours_saved_per_month: result.hours_saved_per_month,
    automation_complexity: result.automation_complexity,
    priority: result.priority,
    recommended_service: result.recommended_service,
    secondary_service: result.secondary_service || null,
    top_automation_opportunities: result.top_automation_opportunities.map((entry) => ({ ...entry })),
    top_implementation_requirements: result.top_implementation_requirements.map((entry) => ({ ...entry })),
    next_route: result.next_route,
    engagement_id: null,
    status: "automation-roi-complete"
  });
}
__name(recordAutomationRoiSubmission, "recordAutomationRoiSubmission");
function attachEngagementToAutomationRoi(details = {}) {
  const automationRoiId = normalizeText5(details.automation_roi_id || details.automationRoiId);
  if (!automationRoiId) {
    return null;
  }
  const existing = automationRoiSubmissions.find((entry) => entry.automation_roi_id === automationRoiId);
  const base = existing || {
    automation_roi_id: automationRoiId,
    created_at: details.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    source_route: details.source || "automation-roi-calculator",
    workflow_type: "",
    current_process: "",
    weekly_volume: "",
    time_per_item_minutes: "",
    team_hourly_cost: "",
    error_rate: "",
    tools_involved: [],
    ai_needed: "",
    risk_sensitivity: "",
    timeline: "",
    roi_score: Number.isFinite(Number(details.roi_score)) ? Number(details.roi_score) : 0,
    roi_tier: normalizeText5(details.roi_tier) || "moderate",
    estimated_monthly_savings: Number.isFinite(Number(details.estimated_monthly_savings)) ? Number(details.estimated_monthly_savings) : 0,
    estimated_annual_savings: Number.isFinite(Number(details.estimated_annual_savings)) ? Number(details.estimated_annual_savings) : 0,
    hours_saved_per_month: Number.isFinite(Number(details.hours_saved_per_month)) ? Number(details.hours_saved_per_month) : 0,
    automation_complexity: normalizeText5(details.automation_complexity) || "moderate",
    priority: normalizeText5(details.priority) || "low",
    recommended_service: normalizeText5(details.recommended_service || details.recommendedService) || "workflow_optimization_review",
    secondary_service: normalizeText5(details.secondary_service || details.secondaryService) || null,
    top_automation_opportunities: Array.isArray(details.top_automation_opportunities) ? details.top_automation_opportunities : [],
    top_implementation_requirements: Array.isArray(details.top_implementation_requirements) ? details.top_implementation_requirements : [],
    next_route: "",
    status: "automation-roi-complete"
  };
  base.engagement_id = normalizeText5(details.engagement_id || details.engagementId) || base.engagement_id || null;
  base.roi_score = Number.isFinite(Number(details.roi_score)) ? Number(details.roi_score) : base.roi_score || 0;
  base.roi_tier = normalizeText5(details.roi_tier) || base.roi_tier || "moderate";
  base.estimated_monthly_savings = Number.isFinite(Number(details.estimated_monthly_savings)) ? Number(details.estimated_monthly_savings) : base.estimated_monthly_savings || 0;
  base.estimated_annual_savings = Number.isFinite(Number(details.estimated_annual_savings)) ? Number(details.estimated_annual_savings) : base.estimated_annual_savings || 0;
  base.hours_saved_per_month = Number.isFinite(Number(details.hours_saved_per_month)) ? Number(details.hours_saved_per_month) : base.hours_saved_per_month || 0;
  base.automation_complexity = normalizeText5(details.automation_complexity) || base.automation_complexity || "moderate";
  base.priority = normalizeText5(details.priority) || base.priority || "low";
  base.recommended_service = normalizeText5(details.recommended_service || details.recommendedService) || base.recommended_service || "workflow_optimization_review";
  base.secondary_service = normalizeText5(details.secondary_service || details.secondaryService) || base.secondary_service || null;
  base.status = normalizeText5(details.status) || "intake-received";
  if (Array.isArray(details.top_automation_opportunities) && details.top_automation_opportunities.length) {
    base.top_automation_opportunities = details.top_automation_opportunities;
  }
  if (Array.isArray(details.top_implementation_requirements) && details.top_implementation_requirements.length) {
    base.top_implementation_requirements = details.top_implementation_requirements;
  }
  return upsertAutomationRoiSubmission(base);
}
__name(attachEngagementToAutomationRoi, "attachEngagementToAutomationRoi");
function listAutomationRoiQueue(engagements3 = []) {
  const queue = [];
  for (const submission of automationRoiSubmissions) {
    const linkedEngagement = engagements3.find((entry) => entry.automationRoiId && entry.automationRoiId === submission.automation_roi_id);
    queue.push({
      automation_roi_id: submission.automation_roi_id,
      engagement_id: submission.engagement_id || linkedEngagement?.id || null,
      roi_score: submission.roi_score,
      roi_tier: submission.roi_tier,
      estimated_monthly_savings: submission.estimated_monthly_savings,
      estimated_annual_savings: submission.estimated_annual_savings,
      hours_saved_per_month: submission.hours_saved_per_month,
      automation_complexity: submission.automation_complexity,
      priority: submission.priority,
      recommended_service: submission.recommended_service,
      secondary_service: submission.secondary_service,
      status: linkedEngagement?.status || submission.status,
      created_at: linkedEngagement?.createdAt || submission.created_at
    });
  }
  for (const engagement of engagements3) {
    if (!engagement.automationRoiId) continue;
    if (queue.some((entry) => entry.engagement_id === engagement.id)) continue;
    queue.push({
      automation_roi_id: engagement.automationRoiId,
      engagement_id: engagement.id,
      roi_score: engagement.roiScore || 0,
      roi_tier: engagement.roiTier || "moderate",
      estimated_monthly_savings: engagement.estimatedMonthlySavings || 0,
      estimated_annual_savings: engagement.estimatedAnnualSavings || 0,
      hours_saved_per_month: engagement.hoursSavedPerMonth || 0,
      automation_complexity: engagement.automationComplexity || "moderate",
      priority: engagement.priority || "low",
      recommended_service: engagement.recommendedService || "workflow_optimization_review",
      secondary_service: engagement.secondaryService || null,
      status: engagement.status || "intake-received",
      created_at: engagement.createdAt || null
    });
  }
  return queue.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}
__name(listAutomationRoiQueue, "listAutomationRoiQueue");
var automationRoiCalculator_default = {
  automationRoiMarketplaceModule,
  automationRoiSubmissions,
  normalizeAutomationRoiAnswers,
  computeAutomationRoiResult,
  recordAutomationRoiSubmission,
  attachEngagementToAutomationRoi,
  listAutomationRoiQueue
};

// worker/data/ragRiskAnalyzer.js
var ragRiskMarketplaceModule = {
  module_id: "msh-rag-risk-analyzer",
  service_slug: "rag_risk_analyzer",
  name: "RAG Risk Analyzer",
  category: "RAG Systems",
  public_service_route: "/apps/rag-risk-analyzer",
  operator_route: "/operator/rag-risk",
  description: "Free advisory analyzer that evaluates retrieval exposure, access controls, governance maturity, and prompt-injection risk in RAG systems.",
  revenue_type: "consulting",
  base_price: 0,
  recommended_upsell: "RAG Governance Review / Private RAG System Build",
  required_inputs: [
    "rag_system_type",
    "deployment_context",
    "data_sources",
    "retrieval_scope",
    "access_controls",
    "source_governance",
    "retrieval_quality_controls",
    "prompt_injection_controls",
    "logging_monitoring",
    "business_impact",
    "timeline"
  ],
  delivery_outputs: [
    "rag_risk_score",
    "rag_risk_tier",
    "retrieval_exposure_level",
    "access_control_level",
    "governance_maturity",
    "top_rag_risks",
    "top_recommended_controls",
    "recommended_service",
    "intake_route"
  ],
  status: "active"
};
var allowedRagSystemType = /* @__PURE__ */ new Set([
  "internal_knowledge_assistant",
  "customer_support_rag",
  "sales_enablement_assistant",
  "legal_or_policy_assistant",
  "technical_docs_assistant",
  "research_assistant",
  "employee_copilot",
  "document_qna_tool",
  "agent_with_rag",
  "planning_only",
  "not_sure"
]);
var allowedDeploymentContext = /* @__PURE__ */ new Set([
  "internal_only",
  "customer_facing",
  "public_website",
  "partner_or_client_portal",
  "employee_copilot",
  "connected_to_business_tools",
  "planning_only",
  "not_sure"
]);
var allowedDataSources = /* @__PURE__ */ new Set([
  "public_docs",
  "internal_docs",
  "customer_records",
  "sales_materials",
  "support_tickets",
  "legal_docs",
  "financial_docs",
  "health_or_patient_docs",
  "policy_or_hr_docs",
  "source_code",
  "credentials_or_secrets",
  "regulated_data",
  "not_sure"
]);
var allowedRetrievalScope = /* @__PURE__ */ new Set([
  "public_only",
  "team_specific",
  "department_specific",
  "company_wide",
  "customer_specific",
  "mixed_sensitive_and_public",
  "not_sure"
]);
var allowedAccessControls = /* @__PURE__ */ new Set([
  "user_role_filtering",
  "document_level_permissions",
  "tenant_isolation",
  "source_based_filtering",
  "approval_required_for_sensitive_docs",
  "no_access_controls",
  "not_sure"
]);
var allowedSourceGovernance = /* @__PURE__ */ new Set([
  "curated_approved_sources",
  "mostly_curated",
  "mixed_sources",
  "user_uploaded_docs",
  "web_crawled_sources",
  "unknown_or_unmanaged",
  "not_sure"
]);
var allowedRetrievalQualityControls = /* @__PURE__ */ new Set([
  "citations_required",
  "source_links_shown",
  "confidence_scoring",
  "answer_abstention",
  "retrieval_evaluation",
  "hallucination_testing",
  "no_quality_controls",
  "not_sure"
]);
var allowedPromptInjectionControls = /* @__PURE__ */ new Set([
  "instruction_hierarchy",
  "retrieved_content_sandboxing",
  "input_filtering",
  "output_filtering",
  "prompt_injection_testing",
  "tool_permission_limits",
  "no_prompt_injection_controls",
  "not_sure"
]);
var allowedLoggingMonitoring = /* @__PURE__ */ new Set([
  "full_query_and_response_logging",
  "security_event_logging",
  "limited_usage_logging",
  "no_logging",
  "not_sure"
]);
var allowedBusinessImpact = /* @__PURE__ */ new Set([
  "experimental",
  "internal_productivity",
  "customer_support",
  "revenue_workflow",
  "compliance_or_legal_workflow",
  "mission_critical",
  "not_sure"
]);
var allowedTimeline3 = /* @__PURE__ */ new Set(["this_week", "this_month", "this_quarter", "exploring"]);
var ragRiskCatalog = {
  sensitive_data_retrieval: {
    title: "Sensitive data retrieval exposure",
    severity: "high",
    category: "sensitive_data_retrieval",
    description: "Sensitive or regulated documents may be exposed through retrieval paths that are broader than intended.",
    recommended_control: "Enforce document-level permissions, retrieval boundaries, and answer abstention for uncertain access decisions."
  },
  access_control_gap: {
    title: "Weak retrieval access controls",
    severity: "high",
    category: "access_control_gap",
    description: "The current RAG system does not appear to apply strong access-control checks before returning retrieved content.",
    recommended_control: "Apply role filters, document permissions, source filters, and approval gates for sensitive documents."
  },
  tenant_isolation_gap: {
    title: "Tenant isolation gap",
    severity: "critical",
    category: "tenant_isolation_gap",
    description: "Cross-tenant or cross-customer retrieval can leak content between organizations when isolation is missing.",
    recommended_control: "Isolate indexes, retrieval filters, and access claims at the tenant boundary."
  },
  source_governance_gap: {
    title: "Unmanaged source governance",
    severity: "high",
    category: "source_governance_gap",
    description: "Uncurated, user-uploaded, or web-crawled sources increase the chance of unsafe retrieval and stale knowledge.",
    recommended_control: "Move to approved source allowlists with provenance tracking and review workflows."
  },
  hallucination_or_attribution_risk: {
    title: "Hallucination or attribution gap",
    severity: "medium",
    category: "hallucination_or_attribution_risk",
    description: "Without citations, abstention, or evaluation, answers may overstate confidence or misattribute facts.",
    recommended_control: "Require citations, confidence signals, abstention logic, and regular retrieval evaluation."
  },
  prompt_injection_via_retrieved_content: {
    title: "Prompt injection through retrieved content",
    severity: "high",
    category: "prompt_injection_via_retrieved_content",
    description: "Retrieved documents can carry malicious instructions that influence the assistant or connected tools.",
    recommended_control: "Sandbox retrieved content, enforce instruction hierarchy, and test prompt-injection controls regularly."
  },
  unsafe_public_rag_exposure: {
    title: "Unsafe public RAG exposure",
    severity: "critical",
    category: "unsafe_public_rag_exposure",
    description: "Public or customer-facing RAG systems create a larger attack surface when retrieval and monitoring are weak.",
    recommended_control: "Harden public retrieval boundaries, reduce exposed sources, and add security event logging."
  },
  compliance_exposure: {
    title: "Compliance exposure",
    severity: "high",
    category: "compliance_exposure",
    description: "Regulated, legal, financial, or HR content in retrieval flows introduces audit and policy risk.",
    recommended_control: "Run a formal compliance review with data minimization, scoped access, and human approval for sensitive content."
  },
  unmanaged_user_uploads: {
    title: "Unmanaged user uploads",
    severity: "high",
    category: "unmanaged_user_uploads",
    description: "User-provided documents can expand retrieval scope and introduce prompt injection or sensitive data issues.",
    recommended_control: "Review uploads before indexing and isolate them from sensitive production knowledge sources."
  },
  logging_monitoring_gap: {
    title: "Logging and monitoring gap",
    severity: "medium",
    category: "logging_monitoring_gap",
    description: "Without logging, teams cannot investigate suspicious retrieval patterns or unsafe outputs.",
    recommended_control: "Add query, response, and security event logging with operator review paths."
  },
  agentic_rag_action_risk: {
    title: "Agentic RAG action risk",
    severity: "high",
    category: "agentic_rag_action_risk",
    description: "When RAG is connected to agent actions, unsafe retrieved content can influence real operational behavior.",
    recommended_control: "Add tool permission limits, human approval, and prompt-injection testing before any action execution."
  }
};
var controlCatalog = {
  document_level_permissions: {
    title: "Document-level permission enforcement",
    priority: "high",
    category: "document_level_permissions",
    description: "Restrict retrieval results to documents the current user is explicitly authorized to access.",
    implementation_note: "Apply permission filters before retrieval and verify enforcement in retrieval evaluation tests."
  },
  tenant_isolation: {
    title: "Tenant isolation for retrieval",
    priority: "high",
    category: "tenant_isolation",
    description: "Separate customer or organization retrieval paths so one tenant cannot access another tenant's content.",
    implementation_note: "Isolate indexes, claims, and filters at query time and validate with cross-tenant tests."
  },
  source_allowlisting: {
    title: "Approved source allowlisting",
    priority: "high",
    category: "source_allowlisting",
    description: "Limit retrieval to reviewed sources with clear provenance and lifecycle ownership.",
    implementation_note: "Tag approved collections and exclude unmanaged sources from production retrieval."
  },
  retrieval_boundaries: {
    title: "Scoped retrieval boundaries",
    priority: "high",
    category: "retrieval_boundaries",
    description: "Constrain which documents and contexts are eligible for retrieval in each user or workflow path.",
    implementation_note: "Use metadata filters, user scopes, and sensitivity tags before scoring results."
  },
  citation_requirements: {
    title: "Citations and source links",
    priority: "medium",
    category: "citation_requirements",
    description: "Require answers to reference the source material they relied on.",
    implementation_note: "Return source links and suppress unsupported claims when citations are unavailable."
  },
  answer_abstention: {
    title: "Answer abstention for uncertain cases",
    priority: "medium",
    category: "answer_abstention",
    description: "Avoid confident answers when retrieval quality is weak, access is uncertain, or citations are missing.",
    implementation_note: "Define thresholds that trigger fallback, escalation, or human review."
  },
  prompt_injection_testing: {
    title: "Prompt-injection testing",
    priority: "high",
    category: "prompt_injection_testing",
    description: "Test retrieved content and query flows for instruction override and tool misuse behaviors.",
    implementation_note: "Run adversarial tests against retrieved documents, user prompts, and action-connected flows."
  },
  retrieved_content_sandboxing: {
    title: "Retrieved content sandboxing",
    priority: "high",
    category: "retrieved_content_sandboxing",
    description: "Treat retrieved text as untrusted input rather than executable instruction content.",
    implementation_note: "Separate system instructions from retrieved content and enforce instruction hierarchy."
  },
  logging_monitoring: {
    title: "Security logging and monitoring",
    priority: "medium",
    category: "logging_monitoring",
    description: "Track query patterns, risky retrievals, and suspicious outputs for operator review.",
    implementation_note: "Capture both usage telemetry and security-specific events with retention and review ownership."
  },
  human_review: {
    title: "Human review for sensitive outputs",
    priority: "medium",
    category: "human_review",
    description: "Add a human approval path for sensitive, compliance-heavy, or high-blast-radius answers.",
    implementation_note: "Use approval gates for legal, regulated, or customer-impacting content."
  },
  compliance_review: {
    title: "Compliance and legal review",
    priority: "high",
    category: "compliance_review",
    description: "Review regulated data handling and content access rules before broader rollout.",
    implementation_note: "Validate retention, access, user rights, and policy requirements against actual retrieval scope."
  },
  data_minimization: {
    title: "Data minimization for RAG sources",
    priority: "medium",
    category: "data_minimization",
    description: "Reduce indexed sensitive content to the minimum necessary for the use case.",
    implementation_note: "Split highly sensitive documents from general retrieval and remove unnecessary fields from indexing."
  }
};
var ragRiskSubmissions = [];
function normalizeText6(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeText6, "normalizeText");
function normalizeArray6(values) {
  return Array.isArray(values) ? values.map((value) => normalizeText6(value)).filter(Boolean) : [];
}
__name(normalizeArray6, "normalizeArray");
function validateSingle5(value, allowedSet, fallback) {
  const normalized = normalizeText6(value);
  return allowedSet.has(normalized) ? normalized : fallback;
}
__name(validateSingle5, "validateSingle");
function validateMulti5(values, allowedSet, fallbackValue) {
  const filtered = normalizeArray6(values).filter((value) => allowedSet.has(value));
  if (!filtered.length) {
    return [fallbackValue];
  }
  if (filtered.includes("not_sure")) {
    return ["not_sure"];
  }
  return [...new Set(filtered)];
}
__name(validateMulti5, "validateMulti");
function clampScore5(score2) {
  return Math.max(0, Math.min(100, score2));
}
__name(clampScore5, "clampScore");
function normalizeRagRiskAnswers(payload = {}) {
  return {
    rag_system_type: validateSingle5(payload.rag_system_type, allowedRagSystemType, "not_sure"),
    deployment_context: validateSingle5(payload.deployment_context, allowedDeploymentContext, "not_sure"),
    data_sources: validateMulti5(payload.data_sources, allowedDataSources, "not_sure"),
    retrieval_scope: validateSingle5(payload.retrieval_scope, allowedRetrievalScope, "not_sure"),
    access_controls: validateMulti5(payload.access_controls, allowedAccessControls, "not_sure"),
    source_governance: validateSingle5(payload.source_governance, allowedSourceGovernance, "not_sure"),
    retrieval_quality_controls: validateMulti5(payload.retrieval_quality_controls, allowedRetrievalQualityControls, "not_sure"),
    prompt_injection_controls: validateMulti5(payload.prompt_injection_controls, allowedPromptInjectionControls, "not_sure"),
    logging_monitoring: validateSingle5(payload.logging_monitoring, allowedLoggingMonitoring, "not_sure"),
    business_impact: validateSingle5(payload.business_impact, allowedBusinessImpact, "not_sure"),
    timeline: validateSingle5(payload.timeline, allowedTimeline3, "exploring"),
    source_route: normalizeText6(payload.source_route) || "/apps/rag-risk-analyzer"
  };
}
__name(normalizeRagRiskAnswers, "normalizeRagRiskAnswers");
function scoreIncludes(values, target, amount) {
  return values.includes(target) ? amount : 0;
}
__name(scoreIncludes, "scoreIncludes");
function computeRagRiskScore(answers) {
  let score2 = 25;
  if (answers.deployment_context === "public_website") score2 += 20;
  if (answers.deployment_context === "customer_facing") score2 += 15;
  if (answers.deployment_context === "partner_or_client_portal") score2 += 15;
  if (answers.deployment_context === "connected_to_business_tools") score2 += 10;
  if (answers.rag_system_type === "customer_support_rag") score2 += 15;
  if (answers.rag_system_type === "agent_with_rag") score2 += 15;
  if (answers.rag_system_type === "legal_or_policy_assistant") score2 += 10;
  if (answers.rag_system_type === "employee_copilot") score2 += 10;
  score2 += scoreIncludes(answers.data_sources, "credentials_or_secrets", 20);
  score2 += scoreIncludes(answers.data_sources, "regulated_data", 20);
  score2 += scoreIncludes(answers.data_sources, "customer_records", 15);
  score2 += scoreIncludes(answers.data_sources, "financial_docs", 15);
  score2 += scoreIncludes(answers.data_sources, "health_or_patient_docs", 15);
  score2 += scoreIncludes(answers.data_sources, "legal_docs", 15);
  score2 += scoreIncludes(answers.data_sources, "policy_or_hr_docs", 10);
  score2 += scoreIncludes(answers.data_sources, "source_code", 10);
  if (answers.retrieval_scope === "mixed_sensitive_and_public") score2 += 15;
  if (answers.retrieval_scope === "company_wide") score2 += 10;
  if (answers.retrieval_scope === "customer_specific") score2 += 10;
  score2 += scoreIncludes(answers.access_controls, "no_access_controls", 20);
  score2 += scoreIncludes(answers.access_controls, "not_sure", 10);
  if (answers.source_governance === "unknown_or_unmanaged") score2 += 15;
  if (answers.source_governance === "user_uploaded_docs") score2 += 10;
  if (answers.source_governance === "web_crawled_sources") score2 += 10;
  score2 += scoreIncludes(answers.retrieval_quality_controls, "no_quality_controls", 15);
  score2 += scoreIncludes(answers.retrieval_quality_controls, "not_sure", 10);
  score2 += scoreIncludes(answers.prompt_injection_controls, "no_prompt_injection_controls", 15);
  score2 += scoreIncludes(answers.prompt_injection_controls, "not_sure", 10);
  if (answers.logging_monitoring === "no_logging") score2 += 15;
  if (answers.logging_monitoring === "not_sure") score2 += 10;
  if (answers.business_impact === "mission_critical") score2 += 15;
  if (answers.business_impact === "compliance_or_legal_workflow") score2 += 10;
  if (answers.business_impact === "revenue_workflow") score2 += 10;
  score2 -= scoreIncludes(answers.access_controls, "user_role_filtering", 10);
  score2 -= scoreIncludes(answers.access_controls, "document_level_permissions", 10);
  score2 -= scoreIncludes(answers.access_controls, "tenant_isolation", 10);
  score2 -= scoreIncludes(answers.access_controls, "source_based_filtering", 8);
  score2 -= scoreIncludes(answers.access_controls, "approval_required_for_sensitive_docs", 8);
  if (answers.source_governance === "curated_approved_sources") score2 -= 10;
  if (answers.source_governance === "mostly_curated") score2 -= 5;
  score2 -= scoreIncludes(answers.retrieval_quality_controls, "citations_required", 8);
  score2 -= scoreIncludes(answers.retrieval_quality_controls, "source_links_shown", 8);
  score2 -= scoreIncludes(answers.retrieval_quality_controls, "confidence_scoring", 8);
  score2 -= scoreIncludes(answers.retrieval_quality_controls, "answer_abstention", 8);
  score2 -= scoreIncludes(answers.retrieval_quality_controls, "retrieval_evaluation", 8);
  score2 -= scoreIncludes(answers.retrieval_quality_controls, "hallucination_testing", 8);
  score2 -= scoreIncludes(answers.prompt_injection_controls, "instruction_hierarchy", 10);
  score2 -= scoreIncludes(answers.prompt_injection_controls, "retrieved_content_sandboxing", 10);
  score2 -= scoreIncludes(answers.prompt_injection_controls, "input_filtering", 8);
  score2 -= scoreIncludes(answers.prompt_injection_controls, "output_filtering", 8);
  score2 -= scoreIncludes(answers.prompt_injection_controls, "prompt_injection_testing", 8);
  score2 -= scoreIncludes(answers.prompt_injection_controls, "tool_permission_limits", 8);
  if (answers.logging_monitoring === "full_query_and_response_logging") score2 -= 8;
  if (answers.logging_monitoring === "security_event_logging") score2 -= 8;
  return clampScore5(score2);
}
__name(computeRagRiskScore, "computeRagRiskScore");
function deriveRagRiskTier(score2) {
  if (score2 <= 34) return "low";
  if (score2 <= 64) return "medium";
  if (score2 <= 84) return "high";
  return "critical";
}
__name(deriveRagRiskTier, "deriveRagRiskTier");
function computeExposureLevel(answers) {
  let score2 = 0;
  if (answers.deployment_context === "public_website") score2 += 20;
  if (answers.deployment_context === "customer_facing") score2 += 15;
  if (answers.deployment_context === "partner_or_client_portal") score2 += 15;
  if (answers.retrieval_scope === "mixed_sensitive_and_public") score2 += 15;
  if (answers.retrieval_scope === "company_wide") score2 += 10;
  if (answers.retrieval_scope === "customer_specific") score2 += 10;
  score2 += scoreIncludes(answers.data_sources, "regulated_data", 15);
  score2 += scoreIncludes(answers.data_sources, "credentials_or_secrets", 15);
  score2 += scoreIncludes(answers.data_sources, "customer_records", 10);
  score2 += scoreIncludes(answers.data_sources, "financial_docs", 10);
  score2 += scoreIncludes(answers.data_sources, "health_or_patient_docs", 10);
  if (answers.source_governance === "user_uploaded_docs") score2 += 10;
  if (answers.source_governance === "web_crawled_sources") score2 += 10;
  if (score2 <= 24) return "low";
  if (score2 <= 49) return "medium";
  if (score2 <= 74) return "high";
  return "critical";
}
__name(computeExposureLevel, "computeExposureLevel");
function computeAccessControlLevel(answers) {
  let score2 = 0;
  score2 += scoreIncludes(answers.access_controls, "user_role_filtering", 20);
  score2 += scoreIncludes(answers.access_controls, "document_level_permissions", 20);
  score2 += scoreIncludes(answers.access_controls, "tenant_isolation", 20);
  score2 += scoreIncludes(answers.access_controls, "source_based_filtering", 15);
  score2 += scoreIncludes(answers.access_controls, "approval_required_for_sensitive_docs", 15);
  score2 -= scoreIncludes(answers.access_controls, "no_access_controls", 25);
  score2 -= scoreIncludes(answers.access_controls, "not_sure", 15);
  if (score2 <= 0) return "absent";
  if (score2 <= 29) return "weak";
  if (score2 <= 59) return "partial";
  return "strong";
}
__name(computeAccessControlLevel, "computeAccessControlLevel");
function computeGovernanceMaturity(answers) {
  let score2 = 0;
  if (answers.source_governance === "curated_approved_sources") score2 += 20;
  if (answers.source_governance === "mostly_curated") score2 += 10;
  score2 += scoreIncludes(answers.retrieval_quality_controls, "citations_required", 15);
  score2 += scoreIncludes(answers.retrieval_quality_controls, "source_links_shown", 15);
  score2 += scoreIncludes(answers.retrieval_quality_controls, "confidence_scoring", 15);
  score2 += scoreIncludes(answers.retrieval_quality_controls, "answer_abstention", 15);
  score2 += scoreIncludes(answers.retrieval_quality_controls, "retrieval_evaluation", 15);
  score2 += scoreIncludes(answers.prompt_injection_controls, "instruction_hierarchy", 15);
  score2 += scoreIncludes(answers.prompt_injection_controls, "retrieved_content_sandboxing", 15);
  score2 += scoreIncludes(answers.prompt_injection_controls, "prompt_injection_testing", 10);
  if (answers.logging_monitoring === "full_query_and_response_logging") score2 += 10;
  if (answers.logging_monitoring === "security_event_logging") score2 += 10;
  if (answers.source_governance === "unknown_or_unmanaged") score2 -= 20;
  score2 -= scoreIncludes(answers.retrieval_quality_controls, "no_quality_controls", 15);
  score2 -= scoreIncludes(answers.prompt_injection_controls, "no_prompt_injection_controls", 15);
  if (answers.logging_monitoring === "no_logging") score2 -= 15;
  if (score2 <= 0) return "absent";
  if (score2 <= 29) return "weak";
  if (score2 <= 59) return "developing";
  return "mature";
}
__name(computeGovernanceMaturity, "computeGovernanceMaturity");
function derivePriority5(answers, ragRiskTier, retrievalExposureLevel, accessControlLevel, governanceMaturity) {
  if (answers.timeline === "this_week") return "high";
  if (ragRiskTier === "high" || ragRiskTier === "critical") return "high";
  if (retrievalExposureLevel === "high" || retrievalExposureLevel === "critical") return "high";
  if (accessControlLevel === "absent" || accessControlLevel === "weak") return "high";
  if (governanceMaturity === "absent" || governanceMaturity === "weak") return "medium";
  if (answers.business_impact === "mission_critical" || answers.business_impact === "compliance_or_legal_workflow") return "medium";
  return "low";
}
__name(derivePriority5, "derivePriority");
function deriveRecommendedService3(answers, ragRiskTier, retrievalExposureLevel, accessControlLevel) {
  if (ragRiskTier === "critical") return "rag_governance_review";
  if (retrievalExposureLevel === "critical") return "rag_governance_review";
  if (accessControlLevel === "absent" || accessControlLevel === "weak") return "rag_governance_review";
  if (answers.deployment_context === "public_website" || answers.deployment_context === "customer_facing") return "ai_security_audit";
  if (answers.rag_system_type === "planning_only") return "private_rag_system_blueprint";
  return "rag_governance_review";
}
__name(deriveRecommendedService3, "deriveRecommendedService");
function deriveSecondaryService3(answers) {
  if (answers.data_sources.includes("regulated_data") || answers.data_sources.includes("credentials_or_secrets") || answers.data_sources.includes("financial_docs") || answers.data_sources.includes("health_or_patient_docs") || answers.data_sources.includes("legal_docs") || answers.deployment_context === "public_website") {
    return "ai_security_audit";
  }
  if (answers.prompt_injection_controls.includes("no_prompt_injection_controls") || answers.prompt_injection_controls.includes("not_sure")) {
    return "prompt_injection_review";
  }
  if (answers.rag_system_type === "agent_with_rag") {
    return "ai_agent_security_review";
  }
  if (answers.source_governance === "unknown_or_unmanaged" || answers.retrieval_scope === "mixed_sensitive_and_public") {
    return "private_rag_system_build";
  }
  return null;
}
__name(deriveSecondaryService3, "deriveSecondaryService");
function uniqueByCategory(items, limit = 3) {
  const seen = /* @__PURE__ */ new Set();
  const output = [];
  for (const item of items) {
    if (!item || seen.has(item.category)) continue;
    seen.add(item.category);
    output.push(item);
    if (output.length >= limit) break;
  }
  return output;
}
__name(uniqueByCategory, "uniqueByCategory");
function buildTopRagRisks(answers, ragRiskTier, retrievalExposureLevel, accessControlLevel, governanceMaturity) {
  const picks = [];
  if (answers.data_sources.some(
    (entry) => ["customer_records", "financial_docs", "health_or_patient_docs", "legal_docs", "regulated_data", "credentials_or_secrets"].includes(entry)
  )) {
    picks.push(ragRiskCatalog.sensitive_data_retrieval, ragRiskCatalog.compliance_exposure);
  }
  if (accessControlLevel === "absent" || accessControlLevel === "weak") {
    picks.push(ragRiskCatalog.access_control_gap);
  }
  if (!answers.access_controls.includes("tenant_isolation") && answers.retrieval_scope === "customer_specific") {
    picks.push(ragRiskCatalog.tenant_isolation_gap);
  }
  if (answers.source_governance === "unknown_or_unmanaged" || answers.source_governance === "web_crawled_sources") {
    picks.push(ragRiskCatalog.source_governance_gap);
  }
  if (answers.retrieval_quality_controls.includes("no_quality_controls") || !answers.retrieval_quality_controls.some(
    (entry) => ["citations_required", "source_links_shown", "confidence_scoring", "answer_abstention", "retrieval_evaluation"].includes(entry)
  )) {
    picks.push(ragRiskCatalog.hallucination_or_attribution_risk);
  }
  if (answers.prompt_injection_controls.includes("no_prompt_injection_controls") || answers.prompt_injection_controls.includes("not_sure")) {
    picks.push(ragRiskCatalog.prompt_injection_via_retrieved_content);
  }
  if (retrievalExposureLevel === "critical" || answers.deployment_context === "public_website" || answers.deployment_context === "customer_facing") {
    picks.push(ragRiskCatalog.unsafe_public_rag_exposure);
  }
  if (answers.source_governance === "user_uploaded_docs") {
    picks.push(ragRiskCatalog.unmanaged_user_uploads);
  }
  if (answers.logging_monitoring === "no_logging" || answers.logging_monitoring === "not_sure") {
    picks.push(ragRiskCatalog.logging_monitoring_gap);
  }
  if (answers.rag_system_type === "agent_with_rag") {
    picks.push(ragRiskCatalog.agentic_rag_action_risk);
  }
  if (ragRiskTier === "critical" && governanceMaturity === "absent") {
    picks.push(ragRiskCatalog.source_governance_gap, ragRiskCatalog.access_control_gap);
  }
  return uniqueByCategory(
    picks.length ? picks : [ragRiskCatalog.access_control_gap, ragRiskCatalog.hallucination_or_attribution_risk, ragRiskCatalog.logging_monitoring_gap]
  );
}
__name(buildTopRagRisks, "buildTopRagRisks");
function buildTopRecommendedControls(answers, retrievalExposureLevel, accessControlLevel, governanceMaturity) {
  const picks = [];
  if (!answers.access_controls.includes("document_level_permissions")) {
    picks.push(controlCatalog.document_level_permissions);
  }
  if (answers.retrieval_scope === "customer_specific" && !answers.access_controls.includes("tenant_isolation")) {
    picks.push(controlCatalog.tenant_isolation);
  }
  if (answers.source_governance === "unknown_or_unmanaged" || answers.source_governance === "web_crawled_sources" || answers.source_governance === "user_uploaded_docs") {
    picks.push(controlCatalog.source_allowlisting);
  }
  if (retrievalExposureLevel === "high" || retrievalExposureLevel === "critical") {
    picks.push(controlCatalog.retrieval_boundaries, controlCatalog.data_minimization);
  }
  if (!answers.retrieval_quality_controls.includes("citations_required")) {
    picks.push(controlCatalog.citation_requirements);
  }
  if (!answers.retrieval_quality_controls.includes("answer_abstention")) {
    picks.push(controlCatalog.answer_abstention);
  }
  if (!answers.prompt_injection_controls.includes("prompt_injection_testing")) {
    picks.push(controlCatalog.prompt_injection_testing);
  }
  if (!answers.prompt_injection_controls.includes("retrieved_content_sandboxing")) {
    picks.push(controlCatalog.retrieved_content_sandboxing);
  }
  if (answers.logging_monitoring === "no_logging" || answers.logging_monitoring === "limited_usage_logging" || answers.logging_monitoring === "not_sure") {
    picks.push(controlCatalog.logging_monitoring);
  }
  if (answers.business_impact === "mission_critical" || answers.business_impact === "compliance_or_legal_workflow") {
    picks.push(controlCatalog.human_review);
  }
  if (answers.data_sources.some(
    (entry) => ["regulated_data", "financial_docs", "health_or_patient_docs", "legal_docs", "policy_or_hr_docs"].includes(entry)
  )) {
    picks.push(controlCatalog.compliance_review);
  }
  if (accessControlLevel === "absent" || governanceMaturity === "absent") {
    picks.push(controlCatalog.document_level_permissions, controlCatalog.logging_monitoring);
  }
  return uniqueByCategory(
    picks.length ? picks : [controlCatalog.retrieval_boundaries, controlCatalog.citation_requirements, controlCatalog.logging_monitoring]
  );
}
__name(buildTopRecommendedControls, "buildTopRecommendedControls");
function generateRagRiskId() {
  return `rag-${1001 + ragRiskSubmissions.length}`;
}
__name(generateRagRiskId, "generateRagRiskId");
function computeRagRiskResult(answers, ragRiskId = generateRagRiskId()) {
  const ragRiskScore = computeRagRiskScore(answers);
  const ragRiskTier = deriveRagRiskTier(ragRiskScore);
  const retrievalExposureLevel = computeExposureLevel(answers);
  const accessControlLevel = computeAccessControlLevel(answers);
  const governanceMaturity = computeGovernanceMaturity(answers);
  const priority = derivePriority5(answers, ragRiskTier, retrievalExposureLevel, accessControlLevel, governanceMaturity);
  const recommendedService = deriveRecommendedService3(answers, ragRiskTier, retrievalExposureLevel, accessControlLevel);
  const secondaryService = deriveSecondaryService3(answers);
  const topRagRisks = buildTopRagRisks(answers, ragRiskTier, retrievalExposureLevel, accessControlLevel, governanceMaturity);
  const topRecommendedControls = buildTopRecommendedControls(answers, retrievalExposureLevel, accessControlLevel, governanceMaturity);
  const params = new URLSearchParams({
    service: recommendedService,
    priority,
    source: "rag-risk-analyzer",
    rag_risk_id: ragRiskId,
    rag_risk_score: String(ragRiskScore),
    rag_risk_tier: ragRiskTier,
    retrieval_exposure_level: retrievalExposureLevel,
    access_control_level: accessControlLevel,
    governance_maturity: governanceMaturity
  });
  return {
    status: "rag-risk-complete",
    rag_risk_id: ragRiskId,
    rag_risk_score: ragRiskScore,
    rag_risk_tier: ragRiskTier,
    retrieval_exposure_level: retrievalExposureLevel,
    access_control_level: accessControlLevel,
    governance_maturity: governanceMaturity,
    priority,
    recommended_service: recommendedService,
    secondary_service: secondaryService || void 0,
    top_rag_risks: topRagRisks.map((entry) => ({ ...entry })),
    top_recommended_controls: topRecommendedControls.map((entry) => ({ ...entry })),
    next_route: `/enter?${params.toString()}`
  };
}
__name(computeRagRiskResult, "computeRagRiskResult");
function upsertRagRiskSubmission(submission) {
  const index = ragRiskSubmissions.findIndex((entry) => entry.rag_risk_id === submission.rag_risk_id);
  if (index >= 0) {
    ragRiskSubmissions[index] = { ...ragRiskSubmissions[index], ...submission };
    return ragRiskSubmissions[index];
  }
  ragRiskSubmissions.unshift(submission);
  return submission;
}
__name(upsertRagRiskSubmission, "upsertRagRiskSubmission");
function recordRagRiskSubmission(answers, result) {
  return upsertRagRiskSubmission({
    rag_risk_id: result.rag_risk_id,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    source_route: answers.source_route,
    rag_system_type: answers.rag_system_type,
    deployment_context: answers.deployment_context,
    data_sources: [...answers.data_sources],
    retrieval_scope: answers.retrieval_scope,
    access_controls: [...answers.access_controls],
    source_governance: answers.source_governance,
    retrieval_quality_controls: [...answers.retrieval_quality_controls],
    prompt_injection_controls: [...answers.prompt_injection_controls],
    logging_monitoring: answers.logging_monitoring,
    business_impact: answers.business_impact,
    timeline: answers.timeline,
    rag_risk_score: result.rag_risk_score,
    rag_risk_tier: result.rag_risk_tier,
    retrieval_exposure_level: result.retrieval_exposure_level,
    access_control_level: result.access_control_level,
    governance_maturity: result.governance_maturity,
    priority: result.priority,
    recommended_service: result.recommended_service,
    secondary_service: result.secondary_service || null,
    top_rag_risks: result.top_rag_risks.map((entry) => ({ ...entry })),
    top_recommended_controls: result.top_recommended_controls.map((entry) => ({ ...entry })),
    next_route: result.next_route,
    engagement_id: null,
    status: "rag-risk-complete"
  });
}
__name(recordRagRiskSubmission, "recordRagRiskSubmission");
function attachEngagementToRagRisk(details = {}) {
  const ragRiskId = normalizeText6(details.rag_risk_id || details.ragRiskId);
  if (!ragRiskId) {
    return null;
  }
  const existing = ragRiskSubmissions.find((entry) => entry.rag_risk_id === ragRiskId);
  const base = existing || {
    rag_risk_id: ragRiskId,
    created_at: details.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    source_route: details.source || "rag-risk-analyzer",
    rag_system_type: "",
    deployment_context: "",
    data_sources: [],
    retrieval_scope: "",
    access_controls: [],
    source_governance: "",
    retrieval_quality_controls: [],
    prompt_injection_controls: [],
    logging_monitoring: "",
    business_impact: "",
    timeline: "",
    rag_risk_score: Number.isFinite(Number(details.rag_risk_score)) ? Number(details.rag_risk_score) : 0,
    rag_risk_tier: normalizeText6(details.rag_risk_tier) || "medium",
    retrieval_exposure_level: normalizeText6(details.retrieval_exposure_level) || "medium",
    access_control_level: normalizeText6(details.access_control_level) || "weak",
    governance_maturity: normalizeText6(details.governance_maturity) || "weak",
    priority: normalizeText6(details.priority) || "low",
    recommended_service: normalizeText6(details.recommended_service || details.recommendedService) || "rag_governance_review",
    secondary_service: normalizeText6(details.secondary_service || details.secondaryService) || null,
    top_rag_risks: Array.isArray(details.top_rag_risks) ? details.top_rag_risks : [],
    top_recommended_controls: Array.isArray(details.top_recommended_controls) ? details.top_recommended_controls : [],
    next_route: "",
    status: "rag-risk-complete"
  };
  base.engagement_id = normalizeText6(details.engagement_id || details.engagementId) || base.engagement_id || null;
  base.rag_risk_score = Number.isFinite(Number(details.rag_risk_score)) ? Number(details.rag_risk_score) : base.rag_risk_score || 0;
  base.rag_risk_tier = normalizeText6(details.rag_risk_tier) || base.rag_risk_tier || "medium";
  base.retrieval_exposure_level = normalizeText6(details.retrieval_exposure_level) || base.retrieval_exposure_level || "medium";
  base.access_control_level = normalizeText6(details.access_control_level) || base.access_control_level || "weak";
  base.governance_maturity = normalizeText6(details.governance_maturity) || base.governance_maturity || "weak";
  base.priority = normalizeText6(details.priority) || base.priority || "low";
  base.recommended_service = normalizeText6(details.recommended_service || details.recommendedService) || base.recommended_service || "rag_governance_review";
  base.secondary_service = normalizeText6(details.secondary_service || details.secondaryService) || base.secondary_service || null;
  base.status = normalizeText6(details.status) || "intake-received";
  if (Array.isArray(details.top_rag_risks) && details.top_rag_risks.length) {
    base.top_rag_risks = details.top_rag_risks;
  }
  if (Array.isArray(details.top_recommended_controls) && details.top_recommended_controls.length) {
    base.top_recommended_controls = details.top_recommended_controls;
  }
  return upsertRagRiskSubmission(base);
}
__name(attachEngagementToRagRisk, "attachEngagementToRagRisk");
function listRagRiskQueue(engagements3 = []) {
  const queue = [];
  for (const submission of ragRiskSubmissions) {
    const linkedEngagement = engagements3.find((entry) => entry.ragRiskId && entry.ragRiskId === submission.rag_risk_id);
    queue.push({
      rag_risk_id: submission.rag_risk_id,
      engagement_id: submission.engagement_id || linkedEngagement?.id || null,
      rag_risk_score: submission.rag_risk_score,
      rag_risk_tier: submission.rag_risk_tier,
      retrieval_exposure_level: submission.retrieval_exposure_level,
      access_control_level: submission.access_control_level,
      governance_maturity: submission.governance_maturity,
      priority: submission.priority,
      recommended_service: submission.recommended_service,
      secondary_service: submission.secondary_service,
      status: linkedEngagement?.status || submission.status,
      created_at: linkedEngagement?.createdAt || submission.created_at
    });
  }
  for (const engagement of engagements3) {
    if (!engagement.ragRiskId) continue;
    if (queue.some((entry) => entry.engagement_id === engagement.id)) continue;
    queue.push({
      rag_risk_id: engagement.ragRiskId,
      engagement_id: engagement.id,
      rag_risk_score: engagement.ragRiskScore || 0,
      rag_risk_tier: engagement.ragRiskTier || "medium",
      retrieval_exposure_level: engagement.retrievalExposureLevel || "medium",
      access_control_level: engagement.accessControlLevel || "weak",
      governance_maturity: engagement.governanceMaturity || "weak",
      priority: engagement.priority || "low",
      recommended_service: engagement.recommendedService || "rag_governance_review",
      secondary_service: engagement.secondaryService || null,
      status: engagement.status || "intake-received",
      created_at: engagement.createdAt || null
    });
  }
  return queue.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}
__name(listRagRiskQueue, "listRagRiskQueue");
var ragRiskAnalyzer_default = {
  ragRiskMarketplaceModule,
  ragRiskSubmissions,
  normalizeRagRiskAnswers,
  computeRagRiskResult,
  recordRagRiskSubmission,
  attachEngagementToRagRisk,
  listRagRiskQueue
};

// worker/agents/intakeAgent.js
var { getServiceBySlug: getServiceBySlug2 } = serviceSelector_default;
var serviceMap2 = {
  secure_ai_tools: { primary: "ai_security_audit", secondary: "copilot_governance" },
  build_ai_agent: { primary: "ai_agent_build", secondary: "ai_automation_systems" },
  automate_workflow: { primary: "ai_automation_systems", secondary: "ai_agent_build" },
  improve_ai_visibility: { primary: "aeo_visibility_setup", secondary: "rag_governance_review" },
  build_private_local_ai: { primary: "local_ai_setup", secondary: "ai_security_audit" },
  govern_copilot_enterprise_ai: { primary: "copilot_governance", secondary: "ai_security_audit" },
  assess_multimodal_ai: { primary: "multimodal_ai_risk_review", secondary: "ai_security_audit" },
  not_sure: { primary: "ai_security_audit", secondary: "aeo_visibility_setup" }
};
var allowedUsage2 = /* @__PURE__ */ new Set([
  "chatgpt",
  "microsoft_copilot",
  "gemini",
  "claude",
  "customer_chatbot",
  "internal_knowledge_assistant",
  "rag_system",
  "n8n_make_zapier",
  "local_models_ollama",
  "multimodal_ai",
  "no_ai_yet"
]);
var allowedRiskLevels2 = /* @__PURE__ */ new Set([
  "handling_sensitive_data",
  "customer_facing_ai",
  "internal_only_ai",
  "regulated_compliance_heavy",
  "unknown"
]);
var allowedBudgetRanges2 = /* @__PURE__ */ new Set(["under_500", "500_2500", "2500_10000", "10000_plus", "not_sure"]);
var allowedUrgency2 = /* @__PURE__ */ new Set(["this_week", "this_month", "planning_phase", "research_only"]);
var RISK_LABELS = {
  handling_sensitive_data: "handling sensitive data",
  customer_facing_ai: "customer-facing AI",
  internal_only_ai: "internal-only AI",
  regulated_compliance_heavy: "regulated / compliance-heavy environment",
  unknown: "unknown risk profile"
};
var URGENCY_LABELS = {
  this_week: "needs attention this week",
  this_month: "targeting delivery this month",
  planning_phase: "in planning phase",
  research_only: "research-only timeline"
};
function normalizeText7(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeText7, "normalizeText");
function normalizeArray7(values) {
  return Array.isArray(values) ? values.map((value) => normalizeText7(value)).filter(Boolean) : [];
}
__name(normalizeArray7, "normalizeArray");
function clampCatalogUsage2(values) {
  const filtered = normalizeArray7(values).filter((value) => allowedUsage2.has(value));
  if (!filtered.length) {
    return ["no_ai_yet"];
  }
  if (filtered.includes("no_ai_yet")) {
    return ["no_ai_yet"];
  }
  return [...new Set(filtered)];
}
__name(clampCatalogUsage2, "clampCatalogUsage");
function computeBaseUrgencyScore(answers) {
  let score2 = 20;
  const usage = answers.current_ai_usage || [];
  switch (answers.urgency) {
    case "this_week":
      score2 += 25;
      break;
    case "this_month":
      score2 += 15;
      break;
    case "planning_phase":
      score2 += 5;
      break;
    default:
      break;
  }
  switch (answers.risk_level) {
    case "regulated_compliance_heavy":
      score2 += 30;
      break;
    case "customer_facing_ai":
    case "handling_sensitive_data":
      score2 += 20;
      break;
    case "unknown":
      score2 += 10;
      break;
    case "internal_only_ai":
      score2 += 5;
      break;
    default:
      break;
  }
  if (answers.business_type === "enterprise_team" || answers.business_type === "regulated_business") {
    score2 += 20;
  } else if (answers.business_type === "saas_company" || answers.business_type === "agency") {
    score2 += 10;
  }
  if (usage.includes("customer_chatbot")) score2 += 15;
  if (usage.includes("rag_system")) score2 += 10;
  if (usage.includes("multimodal_ai")) score2 += 10;
  if (usage.includes("microsoft_copilot")) score2 += 5;
  if (usage.includes("n8n_make_zapier")) score2 += 5;
  if (usage.includes("local_models_ollama")) score2 += 5;
  return Math.max(0, Math.min(100, score2));
}
__name(computeBaseUrgencyScore, "computeBaseUrgencyScore");
function deriveRevenuePotential2(budgetRange) {
  switch (budgetRange) {
    case "under_500":
      return "low";
    case "500_2500":
      return "medium";
    case "2500_10000":
      return "high";
    case "10000_plus":
      return "enterprise";
    default:
      return "medium";
  }
}
__name(deriveRevenuePotential2, "deriveRevenuePotential");
function deriveAgentPriority(score2) {
  if (score2 >= 85) {
    return "critical";
  }
  if (score2 >= 65) {
    return "high";
  }
  if (score2 >= 40) {
    return "normal";
  }
  return "low";
}
__name(deriveAgentPriority, "deriveAgentPriority");
function hasDiagnosticCrossLinks(engagement = {}) {
  return Boolean(
    engagement.auditId || engagement.scanId || engagement.agentCheckId || engagement.automationRoiId || engagement.ragRiskId
  );
}
__name(hasDiagnosticCrossLinks, "hasDiagnosticCrossLinks");
function serviceName(slug) {
  const service = getServiceBySlug2(slug);
  return service ? service.name : slug || "Unknown Service";
}
__name(serviceName, "serviceName");
function normalizeSelector(selector = {}) {
  const primaryGoal = normalizeText7(selector.primary_goal) || "not_sure";
  const riskLevel = normalizeText7(selector.risk_level) || "unknown";
  const budgetRange = normalizeText7(selector.budget_range) || "not_sure";
  const urgency = normalizeText7(selector.urgency) || "research_only";
  const usage = clampCatalogUsage2(selector.current_ai_usage);
  const match = serviceMap2[Object.prototype.hasOwnProperty.call(serviceMap2, primaryGoal) ? primaryGoal : "not_sure"];
  let recommendedService = normalizeText7(selector.recommended_service);
  if (!recommendedService) {
    recommendedService = match.primary;
  }
  let secondaryService = normalizeText7(selector.secondary_service) || match.secondary || null;
  return {
    selector_id: normalizeText7(selector.selector_id) || null,
    primary_goal: Object.prototype.hasOwnProperty.call(serviceMap2, primaryGoal) ? primaryGoal : "not_sure",
    business_type: normalizeText7(selector.business_type) || null,
    current_ai_usage: usage,
    risk_level: allowedRiskLevels2.has(riskLevel) ? riskLevel : "unknown",
    budget_range: allowedBudgetRanges2.has(budgetRange) ? budgetRange : "not_sure",
    urgency: allowedUrgency2.has(urgency) ? urgency : "research_only",
    source_route: normalizeText7(selector.source_route) || "/services",
    recommended_service: recommendedService,
    secondary_service: secondaryService,
    created_at: selector.created_at || null
  };
}
__name(normalizeSelector, "normalizeSelector");
function score(selector, engagement = {}) {
  const normalized = normalizeSelector(selector);
  let urgencyScore = computeBaseUrgencyScore(normalized);
  const engagementUrgency = normalizeText7(engagement.urgency);
  if (engagementUrgency === "this_week") {
    urgencyScore = Math.min(100, urgencyScore + 10);
  }
  if (hasDiagnosticCrossLinks(engagement)) {
    urgencyScore = Math.min(100, urgencyScore + 5);
  }
  const revenuePotential = deriveRevenuePotential2(normalized.budget_range);
  const priority = deriveAgentPriority(urgencyScore);
  return {
    urgency_score: urgencyScore,
    revenue_potential: revenuePotential,
    priority,
    recommended_service: normalized.recommended_service,
    secondary_service: normalized.secondary_service
  };
}
__name(score, "score");
function summarize(selector, engagement = {}, scores = {}) {
  const normalized = normalizeSelector(selector);
  const recommended = scores.recommended_service || normalized.recommended_service;
  const secondary = scores.secondary_service || normalized.secondary_service;
  const urgencyScore = scores.urgency_score ?? 0;
  const priority = scores.priority || "normal";
  const revenuePotential = scores.revenue_potential || "medium";
  const riskNote = RISK_LABELS[normalized.risk_level] || normalized.risk_level;
  const usageList = normalized.current_ai_usage.join(", ") || "no AI yet";
  const org = normalizeText7(engagement.organization) || "unspecified organization";
  const urgencyLabel = URGENCY_LABELS[normalized.urgency] || normalized.urgency;
  const agentSummary = [
    `Recommended service: ${serviceName(recommended)} (${recommended}).`,
    secondary ? `Secondary service: ${serviceName(secondary)} (${secondary}).` : null,
    `Risk profile: ${riskNote}; current AI usage includes ${usageList}.`,
    `Opportunity: ${org} with budget range ${normalized.budget_range.replace(/_/g, " ")} \u2014 revenue potential ${revenuePotential}.`,
    `Urgency: ${urgencyLabel} (score ${urgencyScore}/100) \u2192 priority ${priority}.`,
    engagement.transmission ? `Engagement note: ${normalizeText7(engagement.transmission).slice(0, 200)}${normalizeText7(engagement.transmission).length > 200 ? "\u2026" : ""}.` : null
  ].filter(Boolean).join(" ");
  const agentNotes = [
    `\u2022 Primary: ${serviceName(recommended)}`,
    secondary ? `\u2022 Secondary: ${serviceName(secondary)}` : null,
    `\u2022 Risk: ${riskNote}`,
    `\u2022 Usage: ${usageList}`,
    `\u2022 Priority ${priority} | urgency ${urgencyScore} | revenue ${revenuePotential}`
  ].filter(Boolean).join("\n");
  return { agent_summary: agentSummary, agent_notes: agentNotes };
}
__name(summarize, "summarize");
function process(selector, engagement = {}) {
  const normalized = normalizeSelector(selector);
  const scores = score(normalized, engagement);
  const { agent_summary, agent_notes } = summarize(normalized, engagement, scores);
  const selectorId = normalized.selector_id || normalizeText7(selector.selector_id);
  const engagementId = normalizeText7(engagement.id || engagement.engagement_id);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const record = {
    selector_id: selectorId,
    engagement_id: engagementId,
    recommended_service: scores.recommended_service,
    secondary_service: scores.secondary_service,
    urgency_score: scores.urgency_score,
    revenue_potential: scores.revenue_potential,
    priority: scores.priority,
    agent_summary,
    agent_notes,
    status: "intake-received",
    processed_at: now,
    created_at: normalized.created_at || engagement.createdAt || now
  };
  return {
    record,
    response: {
      status: "intake-agent-complete",
      selector_id: selectorId,
      engagement_id: engagementId,
      recommended_service: scores.recommended_service,
      secondary_service: scores.secondary_service,
      urgency_score: scores.urgency_score,
      revenue_potential: scores.revenue_potential,
      priority: scores.priority,
      agent_summary,
      next_route: "/operator/service-intake"
    }
  };
}
__name(process, "process");
var intakeAgent_default = {
  normalizeSelector,
  score,
  summarize,
  process
};

// worker/agents/securityIntakeAgent.js
var allowedUsage3 = /* @__PURE__ */ new Set([
  "chatgpt",
  "microsoft_copilot",
  "gemini",
  "claude",
  "customer_chatbot",
  "internal_knowledge_assistant",
  "rag_system",
  "n8n_make_zapier",
  "local_models_ollama",
  "multimodal_ai",
  "no_ai_yet"
]);
var allowedRiskLevels3 = /* @__PURE__ */ new Set([
  "handling_sensitive_data",
  "customer_facing_ai",
  "internal_only_ai",
  "regulated_compliance_heavy",
  "unknown"
]);
var allowedBusinessTypes2 = /* @__PURE__ */ new Set([
  "solo_freelancer",
  "small_business",
  "agency",
  "saas_company",
  "enterprise_team",
  "nonprofit",
  "regulated_business"
]);
var RISK_LABELS2 = {
  handling_sensitive_data: "handling sensitive data",
  customer_facing_ai: "customer-facing AI",
  internal_only_ai: "internal-only AI",
  regulated_compliance_heavy: "regulated / compliance-heavy environment",
  unknown: "unknown risk profile"
};
var EXPOSURE_LABELS = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical"
};
var SECURITY_SERVICE_LABELS = {
  ai_security_audit: "AI Security Audit",
  copilot_governance: "Copilot Governance",
  rag_security_review: "RAG Security Review",
  local_ai_hardening: "Local AI Hardening"
};
var UNGOVERNED_TOOLS = /* @__PURE__ */ new Set(["chatgpt", "gemini", "claude"]);
function normalizeText8(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeText8, "normalizeText");
function normalizeArray8(values) {
  return Array.isArray(values) ? values.map((value) => normalizeText8(value)).filter(Boolean) : [];
}
__name(normalizeArray8, "normalizeArray");
function clampCatalogUsage3(values) {
  const filtered = normalizeArray8(values).filter((value) => allowedUsage3.has(value));
  if (!filtered.length) {
    return ["no_ai_yet"];
  }
  if (filtered.includes("no_ai_yet")) {
    return ["no_ai_yet"];
  }
  return [...new Set(filtered)];
}
__name(clampCatalogUsage3, "clampCatalogUsage");
function detectUnsafePatterns(usage, riskLevel, businessType) {
  const patterns = [];
  const hasGovernance = usage.includes("microsoft_copilot") || usage.includes("internal_knowledge_assistant");
  const sensitiveContext = riskLevel === "handling_sensitive_data" || riskLevel === "customer_facing_ai" || riskLevel === "regulated_compliance_heavy" || businessType === "regulated_business" || businessType === "enterprise_team";
  for (const tool of UNGOVERNED_TOOLS) {
    if (usage.includes(tool) && !hasGovernance) {
      patterns.push(`ungoverned_${tool}`);
    }
  }
  if (usage.includes("n8n_make_zapier") && sensitiveContext) {
    patterns.push("ungoverned_automation_with_sensitive_data");
  }
  if (usage.includes("multimodal_ai") && !hasGovernance) {
    patterns.push("ungoverned_multimodal_ai");
  }
  if (usage.includes("customer_chatbot") && UNGOVERNED_TOOLS.has(usage.find((item) => UNGOVERNED_TOOLS.has(item)))) {
    patterns.push("consumer_llm_behind_customer_chatbot");
  }
  return patterns;
}
__name(detectUnsafePatterns, "detectUnsafePatterns");
function normalize(selector = {}, engagement = {}) {
  const riskLevel = normalizeText8(selector.risk_level) || "unknown";
  const businessType = normalizeText8(selector.business_type);
  const usage = clampCatalogUsage3(selector.current_ai_usage);
  const customerFacing = riskLevel === "customer_facing_ai" || usage.includes("customer_chatbot") || normalizeText8(engagement.safetyLevel) === "customer_facing";
  return {
    selector_id: normalizeText8(selector.selector_id) || null,
    primary_goal: normalizeText8(selector.primary_goal) || "not_sure",
    business_type: allowedBusinessTypes2.has(businessType) ? businessType : null,
    current_ai_usage: usage,
    risk_level: allowedRiskLevels3.has(riskLevel) ? riskLevel : "unknown",
    customer_facing: customerFacing,
    unsafe_patterns: detectUnsafePatterns(usage, riskLevel, businessType),
    created_at: selector.created_at || null
  };
}
__name(normalize, "normalize");
function hasDiagnosticCrossLinks2(engagement = {}) {
  return Boolean(
    engagement.auditId || engagement.scanId || engagement.agentCheckId || engagement.automationRoiId || engagement.ragRiskId
  );
}
__name(hasDiagnosticCrossLinks2, "hasDiagnosticCrossLinks");
function deriveExposureLevel(score2) {
  if (score2 >= 85) {
    return "critical";
  }
  if (score2 >= 65) {
    return "high";
  }
  if (score2 >= 40) {
    return "medium";
  }
  return "low";
}
__name(deriveExposureLevel, "deriveExposureLevel");
function deriveRecommendedSecurityService(normalized) {
  const usage = normalized.current_ai_usage || [];
  if (usage.includes("microsoft_copilot") || normalized.primary_goal === "govern_copilot_enterprise_ai") {
    return "copilot_governance";
  }
  if (usage.includes("rag_system") || usage.includes("internal_knowledge_assistant")) {
    return "rag_security_review";
  }
  if (usage.includes("local_models_ollama") || normalized.primary_goal === "build_private_local_ai") {
    return "local_ai_hardening";
  }
  if (normalized.customer_facing || normalized.risk_level === "regulated_compliance_heavy" || normalized.unsafe_patterns.length > 0) {
    return "ai_security_audit";
  }
  return "ai_security_audit";
}
__name(deriveRecommendedSecurityService, "deriveRecommendedSecurityService");
function computeSecurityRisk(selector = {}, engagement = {}) {
  const normalized = normalize(selector, engagement);
  let score2 = 15;
  const usage = normalized.current_ai_usage || [];
  switch (normalized.risk_level) {
    case "regulated_compliance_heavy":
      score2 += 30;
      break;
    case "customer_facing_ai":
      score2 += 25;
      break;
    case "handling_sensitive_data":
      score2 += 20;
      break;
    case "unknown":
      score2 += 10;
      break;
    case "internal_only_ai":
      score2 += 5;
      break;
    default:
      break;
  }
  if (normalized.business_type === "enterprise_team" || normalized.business_type === "regulated_business") {
    score2 += 15;
  } else if (normalized.business_type === "saas_company" || normalized.business_type === "agency") {
    score2 += 8;
  }
  if (normalized.customer_facing) {
    score2 += 20;
  }
  if (usage.includes("customer_chatbot")) {
    score2 += 18;
  }
  if (usage.includes("rag_system")) {
    score2 += 12;
  }
  if (usage.includes("multimodal_ai")) {
    score2 += 10;
  }
  if (usage.includes("n8n_make_zapier")) {
    score2 += 8;
  }
  score2 += Math.min(20, normalized.unsafe_patterns.length * 7);
  if (hasDiagnosticCrossLinks2(engagement)) {
    score2 += 5;
  }
  if (engagement.injectionScore && engagement.injectionScore >= 70) {
    score2 += 10;
  }
  if (engagement.riskScore && engagement.riskScore >= 70) {
    score2 += 8;
  }
  const securityRiskScore = Math.max(0, Math.min(100, score2));
  const securityExposureLevel = deriveExposureLevel(securityRiskScore);
  const recommendedSecurityService = deriveRecommendedSecurityService(normalized);
  return {
    security_risk_score: securityRiskScore,
    security_exposure_level: securityExposureLevel,
    recommended_security_service: recommendedSecurityService,
    normalized
  };
}
__name(computeSecurityRisk, "computeSecurityRisk");
function generateSecuritySummary(selector = {}, engagement = {}, scores = {}) {
  const normalized = scores.normalized || normalize(selector, engagement);
  const riskScore = scores.security_risk_score ?? 0;
  const exposureLevel = scores.security_exposure_level || "low";
  const recommendedService = scores.recommended_security_service || "ai_security_audit";
  const usageList = normalized.current_ai_usage.join(", ") || "no AI yet";
  const riskNote = RISK_LABELS2[normalized.risk_level] || normalized.risk_level;
  const org = normalizeText8(engagement.organization) || "unspecified organization";
  const serviceLabel = SECURITY_SERVICE_LABELS[recommendedService] || recommendedService;
  const exposureNote = normalized.customer_facing ? "Customer-facing AI exposure detected \u2014 external users may interact with ungoverned models." : "No direct customer-facing AI surface identified.";
  const governanceGaps = normalized.unsafe_patterns.length > 0 ? `Governance gaps: ${normalized.unsafe_patterns.map((pattern) => pattern.replace(/_/g, " ")).join("; ")}.` : "No major ungoverned AI usage patterns detected.";
  const nextSteps = `Recommended next step: route to ${serviceLabel} (${recommendedService}) for operator review.`;
  return [
    `AI footprint for ${org}: ${usageList}.`,
    `Risk profile: ${riskNote} (${EXPOSURE_LABELS[exposureLevel]} exposure, score ${riskScore}/100).`,
    exposureNote,
    governanceGaps,
    nextSteps,
    engagement.transmission ? `Engagement context: ${normalizeText8(engagement.transmission).slice(0, 180)}${normalizeText8(engagement.transmission).length > 180 ? "\u2026" : ""}.` : null
  ].filter(Boolean).join(" ");
}
__name(generateSecuritySummary, "generateSecuritySummary");
function process2(selector = {}, engagement = {}) {
  const scores = computeSecurityRisk(selector, engagement);
  const securitySummary = generateSecuritySummary(selector, engagement, scores);
  const selectorId = scores.normalized.selector_id || normalizeText8(selector.selector_id);
  const engagementId = normalizeText8(engagement.id || engagement.engagement_id);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const record = {
    selector_id: selectorId,
    engagement_id: engagementId,
    security_risk_score: scores.security_risk_score,
    security_exposure_level: scores.security_exposure_level,
    recommended_security_service: scores.recommended_security_service,
    security_summary: securitySummary,
    agent_type: "security-intake",
    status: "ready-for-review",
    processed_at: now,
    created_at: scores.normalized.created_at || engagement.createdAt || now
  };
  return {
    record,
    response: {
      status: "security-intake-complete",
      selector_id: selectorId,
      engagement_id: engagementId,
      security_risk_score: scores.security_risk_score,
      security_exposure_level: scores.security_exposure_level,
      recommended_security_service: scores.recommended_security_service,
      security_summary: securitySummary,
      next_route: "/operator/service-intake"
    }
  };
}
__name(process2, "process");
var securityIntakeAgent_default = {
  normalize,
  computeSecurityRisk,
  generateSecuritySummary,
  process: process2
};

// worker/data/cloudflareSecurityAudit.js
var SECURITY_AUDIT_AGENT_PLACEHOLDER_URL = "https://placeholder.agents.cloudflare.com/security-audit/start";
var {
  getServiceIntakeSubmissionByEngagementId: getServiceIntakeSubmissionByEngagementId2,
  getEngagementById: getEngagementById2,
  upsertServiceSelectorSubmission: upsertServiceSelectorSubmission2
} = serviceSelector_default;
function normalizeText9(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeText9, "normalizeText");
function readHeader(request, name) {
  const headers = request?.headers || {};
  if (typeof headers.get === "function") {
    return headers.get(name) || "";
  }
  return headers[name] || headers[name.toLowerCase()] || "";
}
__name(readHeader, "readHeader");
function isOperatorSurfaceRequest(request) {
  const surface = readHeader(request, "X-MSH-Operator-Surface");
  if (surface === "service-intake" || surface === "1") {
    return true;
  }
  const referer = readHeader(request, "Referer");
  const origin = readHeader(request, "Origin");
  return referer.includes("/operator") || origin.includes("/operator");
}
__name(isOperatorSurfaceRequest, "isOperatorSurfaceRequest");
function normalizeSecurityAuditStatus(value) {
  const normalized = normalizeText9(value).toLowerCase().replace(/\s+/g, "_");
  if (!normalized || normalized === "not_started" || normalized === "not-started") {
    return "not_started";
  }
  if (["running", "in_progress", "in-progress", "started", "pending"].includes(normalized)) {
    return "running";
  }
  if (["complete", "completed", "done", "finished"].includes(normalized)) {
    return "complete";
  }
  return "not_started";
}
__name(normalizeSecurityAuditStatus, "normalizeSecurityAuditStatus");
function buildSelectorRaw2(submission = {}) {
  return {
    primary_goal: submission.primary_goal || null,
    business_type: submission.business_type || null,
    current_ai_usage: [...submission.current_ai_usage || []],
    risk_level: submission.risk_level || null,
    budget_range: submission.budget_range || null,
    urgency: submission.urgency || null,
    source_route: submission.source_route || null
  };
}
__name(buildSelectorRaw2, "buildSelectorRaw");
function buildEngagementDetails2(engagement = {}) {
  if (!engagement || !engagement.id) {
    return null;
  }
  return {
    operatorHandle: engagement.operatorHandle || null,
    organization: engagement.organization || null,
    contactEmail: engagement.contactEmail || null,
    transmission: engagement.transmission || null,
    source: engagement.source || null
  };
}
__name(buildEngagementDetails2, "buildEngagementDetails");
function buildAuditContext(submission, engagement) {
  return {
    engagement_id: submission.engagement_id,
    selector_id: submission.selector_id || null,
    recommended_service: submission.recommended_service || engagement?.recommendedService || null,
    secondary_service: submission.secondary_service || engagement?.secondaryService || null,
    engagement_details: buildEngagementDetails2(engagement),
    selector_raw: buildSelectorRaw2(submission)
  };
}
__name(buildAuditContext, "buildAuditContext");
async function startSecurityAudit({ engagementId, engagements: engagements3 = [], webhookUrl, requestOrigin }) {
  const normalizedId = normalizeText9(engagementId);
  if (!normalizedId) {
    throw new Error("engagement_id is required");
  }
  const submission = getServiceIntakeSubmissionByEngagementId2(normalizedId);
  if (!submission) {
    throw new Error("Intake submission not found for engagement");
  }
  const engagement = getEngagementById2(engagements3, normalizedId);
  const updated = upsertServiceSelectorSubmission2({
    ...submission,
    security_audit_status: "running",
    security_audit_started_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  const payload = {
    engagement_id: normalizedId,
    webhook_url: webhookUrl,
    request_origin: requestOrigin || null,
    context: buildAuditContext(updated, engagement)
  };
  let agentError = null;
  try {
    const response = await fetch(SECURITY_AUDIT_AGENT_PLACEHOLDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      agentError = new Error(`Agent request failed with status ${response.status}`);
    }
  } catch (error) {
    agentError = error instanceof Error ? error : new Error("Agent request failed");
  }
  if (agentError) {
    upsertServiceSelectorSubmission2({
      ...updated,
      security_audit_summary: `Agent dispatch failed: ${agentError.message}`
    });
    throw agentError;
  }
  return {
    status: "security-audit-started",
    engagement_id: normalizedId,
    security_audit_status: "running"
  };
}
__name(startSecurityAudit, "startSecurityAudit");
function applySecurityAuditWebhook({ engagementId, auditStatus, auditSummary, findings }) {
  const normalizedId = normalizeText9(engagementId);
  if (!normalizedId) {
    throw new Error("engagement_id is required");
  }
  const submission = getServiceIntakeSubmissionByEngagementId2(normalizedId);
  if (!submission) {
    throw new Error("Intake submission not found for engagement");
  }
  const normalizedStatus = normalizeSecurityAuditStatus(auditStatus);
  const summary = normalizeText9(auditSummary) || null;
  const normalizedFindings = Array.isArray(findings) ? findings : [];
  upsertServiceSelectorSubmission2({
    ...submission,
    security_audit_status: normalizedStatus,
    security_audit_summary: summary,
    security_findings: normalizedFindings,
    security_audit_completed_at: normalizedStatus === "complete" ? (/* @__PURE__ */ new Date()).toISOString() : submission.security_audit_completed_at || null
  });
  return {
    status: "security-audit-updated",
    engagement_id: normalizedId,
    security_audit_status: normalizedStatus,
    security_audit_summary: summary
  };
}
__name(applySecurityAuditWebhook, "applySecurityAuditWebhook");
var cloudflareSecurityAudit_default = {
  SECURITY_AUDIT_AGENT_PLACEHOLDER_URL,
  isOperatorSurfaceRequest,
  normalizeSecurityAuditStatus,
  startSecurityAudit,
  applySecurityAuditWebhook
};

// worker/doctrine/repository.js
var APPROVED_FLAG = 1;
var QUARANTINE_FLAG = 0;
function normalizeText10(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeText10, "normalizeText");
function normalizeClassification(value) {
  return normalizeText10(value).toUpperCase();
}
__name(normalizeClassification, "normalizeClassification");
function requireDoctrineDb(env) {
  if (!env.DOCTRINE_DB) {
    throw new Error("DOCTRINE_DB binding is required.");
  }
  return env.DOCTRINE_DB;
}
__name(requireDoctrineDb, "requireDoctrineDb");
function mapDoctrineVersion(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    source_url: row.source_url,
    created_at: row.created_at,
    approved: Number(row.approved) === APPROVED_FLAG,
    operator_id: row.operator_id || null
  };
}
__name(mapDoctrineVersion, "mapDoctrineVersion");
function mapDoctrineChunk(row) {
  if (!row) {
    return null;
  }
  return {
    id: Number(row.id),
    version_id: row.version_id,
    hash: row.hash,
    classification: row.classification,
    created_at: row.created_at,
    approved: Number(row.approved) === APPROVED_FLAG
  };
}
__name(mapDoctrineChunk, "mapDoctrineChunk");
function mapDoctrineAcl(row) {
  if (!row) {
    return null;
  }
  return {
    agent_id: row.agent_id,
    allowed_classifications: row.allowed_classifications || ""
  };
}
__name(mapDoctrineAcl, "mapDoctrineAcl");
async function getDoctrineVersion(env, versionId) {
  const normalizedVersionId = normalizeText10(versionId);
  if (!normalizedVersionId) {
    return null;
  }
  const row = await requireDoctrineDb(env).prepare(
    `SELECT id, source_url, created_at, approved, operator_id
       FROM doctrine_versions
       WHERE id = ?
       LIMIT 1`
  ).bind(normalizedVersionId).first();
  return mapDoctrineVersion(row);
}
__name(getDoctrineVersion, "getDoctrineVersion");
async function getLatestDoctrineVersion(env) {
  const row = await requireDoctrineDb(env).prepare(
    `SELECT id, source_url, created_at, approved, operator_id
       FROM doctrine_versions
       ORDER BY created_at DESC
       LIMIT 1`
  ).first();
  return mapDoctrineVersion(row);
}
__name(getLatestDoctrineVersion, "getLatestDoctrineVersion");
async function createDoctrineVersion(env, { id, sourceUrl, createdAt, approved = QUARANTINE_FLAG, operatorId = null }) {
  const normalizedId = normalizeText10(id);
  const normalizedSourceUrl = normalizeText10(sourceUrl);
  const normalizedCreatedAt = normalizeText10(createdAt);
  if (!normalizedId || !normalizedSourceUrl || !normalizedCreatedAt) {
    throw new Error("id, sourceUrl, and createdAt are required.");
  }
  await requireDoctrineDb(env).prepare(
    `INSERT INTO doctrine_versions (id, source_url, created_at, approved, operator_id)
       VALUES (?, ?, ?, ?, ?)`
  ).bind(
    normalizedId,
    normalizedSourceUrl,
    normalizedCreatedAt,
    Number(approved) === APPROVED_FLAG ? APPROVED_FLAG : QUARANTINE_FLAG,
    normalizeText10(operatorId) || null
  ).run();
  return getDoctrineVersion(env, normalizedId);
}
__name(createDoctrineVersion, "createDoctrineVersion");
async function getDoctrineChunk(env, versionId, chunkHash) {
  const row = await requireDoctrineDb(env).prepare(
    `SELECT id, version_id, hash, classification, created_at, approved
       FROM doctrine_chunks
       WHERE version_id = ? AND hash = ?
       LIMIT 1`
  ).bind(normalizeText10(versionId), normalizeText10(chunkHash)).first();
  return mapDoctrineChunk(row);
}
__name(getDoctrineChunk, "getDoctrineChunk");
async function insertDoctrineChunkMetadata(env, { versionId, hash, classification, createdAt, approved = QUARANTINE_FLAG }) {
  const normalizedVersionId = normalizeText10(versionId);
  const normalizedHash = normalizeText10(hash);
  const normalizedClassification = normalizeClassification(classification);
  const normalizedCreatedAt = normalizeText10(createdAt);
  if (!normalizedVersionId || !normalizedHash || !normalizedClassification || !normalizedCreatedAt) {
    throw new Error("versionId, hash, classification, and createdAt are required.");
  }
  await requireDoctrineDb(env).prepare(
    `INSERT INTO doctrine_chunks (version_id, hash, classification, created_at, approved)
       VALUES (?, ?, ?, ?, ?)`
  ).bind(
    normalizedVersionId,
    normalizedHash,
    normalizedClassification,
    normalizedCreatedAt,
    Number(approved) === APPROVED_FLAG ? APPROVED_FLAG : QUARANTINE_FLAG
  ).run();
  return getDoctrineChunk(env, normalizedVersionId, normalizedHash);
}
__name(insertDoctrineChunkMetadata, "insertDoctrineChunkMetadata");
async function listDoctrineChunksByVersion(env, versionId) {
  const normalizedVersionId = normalizeText10(versionId);
  if (!normalizedVersionId) {
    return [];
  }
  const result = await requireDoctrineDb(env).prepare(
    `SELECT id, version_id, hash, classification, created_at, approved
       FROM doctrine_chunks
       WHERE version_id = ?
       ORDER BY id ASC`
  ).bind(normalizedVersionId).all();
  return (result.results || []).map(mapDoctrineChunk);
}
__name(listDoctrineChunksByVersion, "listDoctrineChunksByVersion");
async function listDoctrineHashesByVersion(env, versionId) {
  const chunks = await listDoctrineChunksByVersion(env, versionId);
  return chunks.map((chunk) => chunk.hash);
}
__name(listDoctrineHashesByVersion, "listDoctrineHashesByVersion");
async function approveDoctrineVersion(env, { versionId, operatorId }) {
  const version = await getDoctrineVersion(env, versionId);
  if (!version) {
    return null;
  }
  await requireDoctrineDb(env).prepare(
    `UPDATE doctrine_versions
       SET approved = ?, operator_id = ?
       WHERE id = ?`
  ).bind(APPROVED_FLAG, normalizeText10(operatorId) || null, version.id).run();
  return getDoctrineVersion(env, version.id);
}
__name(approveDoctrineVersion, "approveDoctrineVersion");
async function approveDoctrineChunk(env, { versionId, chunkHash }) {
  const chunk = await getDoctrineChunk(env, versionId, chunkHash);
  if (!chunk) {
    return null;
  }
  await requireDoctrineDb(env).prepare(
    `UPDATE doctrine_chunks
       SET approved = ?
       WHERE version_id = ? AND hash = ?`
  ).bind(APPROVED_FLAG, chunk.version_id, chunk.hash).run();
  return getDoctrineChunk(env, chunk.version_id, chunk.hash);
}
__name(approveDoctrineChunk, "approveDoctrineChunk");
async function getDoctrineAclEntry(env, agentId) {
  const normalizedAgentId = normalizeText10(agentId);
  if (!normalizedAgentId) {
    return null;
  }
  const row = await requireDoctrineDb(env).prepare(
    `SELECT agent_id, allowed_classifications
       FROM doctrine_acl
       WHERE agent_id = ?
       LIMIT 1`
  ).bind(normalizedAgentId).first();
  return mapDoctrineAcl(row);
}
__name(getDoctrineAclEntry, "getDoctrineAclEntry");
async function listApprovedDoctrineChunks(env, { versionId, classification }) {
  const result = await requireDoctrineDb(env).prepare(
    `SELECT id, version_id, hash, classification, created_at, approved
       FROM doctrine_chunks
       WHERE version_id = ?
         AND classification = ?
         AND approved = ?
       ORDER BY id ASC`
  ).bind(normalizeText10(versionId), normalizeClassification(classification), APPROVED_FLAG).all();
  return (result.results || []).map(mapDoctrineChunk);
}
__name(listApprovedDoctrineChunks, "listApprovedDoctrineChunks");
async function countApprovedDoctrineChunks(env, { versionId, classification }) {
  const row = await requireDoctrineDb(env).prepare(
    `SELECT COUNT(*) AS count
       FROM doctrine_chunks
       WHERE version_id = ?
         AND classification = ?
         AND approved = ?`
  ).bind(normalizeText10(versionId), normalizeClassification(classification), APPROVED_FLAG).first();
  return Number(row?.count || 0);
}
__name(countApprovedDoctrineChunks, "countApprovedDoctrineChunks");
async function insertDoctrineAccessLog(env, { agentId, versionId, classification, timestamp }) {
  const normalizedAgentId = normalizeText10(agentId);
  const normalizedVersionId = normalizeText10(versionId);
  const normalizedClassification = normalizeClassification(classification);
  const normalizedTimestamp = normalizeText10(timestamp);
  if (!normalizedAgentId || !normalizedVersionId || !normalizedClassification || !normalizedTimestamp) {
    throw new Error("agentId, versionId, classification, and timestamp are required.");
  }
  await requireDoctrineDb(env).prepare(
    `INSERT INTO doctrine_access_logs (agent_id, version_id, classification, timestamp)
       VALUES (?, ?, ?, ?)`
  ).bind(normalizedAgentId, normalizedVersionId, normalizedClassification, normalizedTimestamp).run();
}
__name(insertDoctrineAccessLog, "insertDoctrineAccessLog");
async function insertDoctrineEvidenceLog(env, {
  eventType,
  actorType,
  operatorId = null,
  agentId = null,
  versionId = null,
  chunkHash = null,
  classification = null,
  sourceUrl = null,
  timestamp,
  state,
  details = null
}) {
  const normalizedTimestamp = normalizeText10(timestamp);
  const normalizedEventType = normalizeText10(eventType);
  const normalizedActorType = normalizeText10(actorType);
  const normalizedState = normalizeText10(state).toUpperCase();
  if (!normalizedTimestamp || !normalizedEventType || !normalizedActorType || !normalizedState) {
    throw new Error("timestamp, eventType, actorType, and state are required.");
  }
  await requireDoctrineDb(env).prepare(
    `INSERT INTO doctrine_evidence_logs (
        event_type,
        actor_type,
        operator_id,
        agent_id,
        version_id,
        chunk_hash,
        classification,
        source_url,
        timestamp,
        state,
        details
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    normalizedEventType,
    normalizedActorType,
    normalizeText10(operatorId) || null,
    normalizeText10(agentId) || null,
    normalizeText10(versionId) || null,
    normalizeText10(chunkHash) || null,
    normalizeClassification(classification) || null,
    normalizeText10(sourceUrl) || null,
    normalizedTimestamp,
    normalizedState,
    normalizeText10(details) || null
  ).run();
}
__name(insertDoctrineEvidenceLog, "insertDoctrineEvidenceLog");

// worker/doctrine/acl.js
function parseAllowedClassifications(value) {
  return normalizeText10(value).split(",").map((entry) => normalizeClassification(entry)).filter(Boolean);
}
__name(parseAllowedClassifications, "parseAllowedClassifications");
function hasDoctrineClassificationAccess(allowedClassifications, classification) {
  const normalizedClassification = normalizeClassification(classification);
  return Boolean(
    normalizedClassification && (allowedClassifications.includes("*") || allowedClassifications.includes(normalizedClassification))
  );
}
__name(hasDoctrineClassificationAccess, "hasDoctrineClassificationAccess");
async function checkDoctrineAcl(env, agentId, classification, versionId) {
  const normalizedAgentId = normalizeText10(agentId);
  const normalizedClassification = normalizeClassification(classification);
  const normalizedVersionId = normalizeText10(versionId);
  if (!normalizedAgentId || !normalizedClassification || !normalizedVersionId) {
    return {
      allowed: false,
      reason: "missing_required_fields",
      allowedClassifications: [],
      versionApproved: false,
      approvedChunkCount: 0
    };
  }
  const aclEntry = await getDoctrineAclEntry(env, normalizedAgentId);
  if (!aclEntry) {
    return {
      allowed: false,
      reason: "acl_not_found",
      allowedClassifications: [],
      versionApproved: false,
      approvedChunkCount: 0
    };
  }
  const allowedClassifications = parseAllowedClassifications(aclEntry.allowed_classifications);
  if (!hasDoctrineClassificationAccess(allowedClassifications, normalizedClassification)) {
    return {
      allowed: false,
      reason: "classification_not_allowed",
      allowedClassifications,
      versionApproved: false,
      approvedChunkCount: 0
    };
  }
  const version = await getDoctrineVersion(env, normalizedVersionId);
  if (!version || !version.approved) {
    return {
      allowed: false,
      reason: "version_not_approved",
      allowedClassifications,
      versionApproved: false,
      approvedChunkCount: 0
    };
  }
  const approvedChunkCount = await countApprovedDoctrineChunks(env, {
    versionId: normalizedVersionId,
    classification: normalizedClassification
  });
  if (approvedChunkCount < 1) {
    return {
      allowed: false,
      reason: "no_approved_chunks",
      allowedClassifications,
      versionApproved: true,
      approvedChunkCount: 0
    };
  }
  return {
    allowed: true,
    reason: "allowed",
    allowedClassifications,
    versionApproved: true,
    approvedChunkCount
  };
}
__name(checkDoctrineAcl, "checkDoctrineAcl");

// worker/doctrine/evidence.js
async function logDoctrineSyncQuarantine(env, { versionId, sourceUrl, chunkCount, newChunkCount, timestamp = null }) {
  const resolvedTimestamp = normalizeText10(timestamp) || (/* @__PURE__ */ new Date()).toISOString();
  await insertDoctrineEvidenceLog(env, {
    eventType: "doctrine.sync",
    actorType: "system",
    operatorId: null,
    versionId,
    sourceUrl,
    timestamp: resolvedTimestamp,
    state: "QUARANTINE",
    details: `Doctrine sync stored ${Number(chunkCount) || 0} chunks; ${Number(newChunkCount) || 0} marked new.`
  });
  return resolvedTimestamp;
}
__name(logDoctrineSyncQuarantine, "logDoctrineSyncQuarantine");
async function logDoctrineVersionApproval(env, { operatorId, versionId, timestamp = null }) {
  const resolvedTimestamp = normalizeText10(timestamp) || (/* @__PURE__ */ new Date()).toISOString();
  await insertDoctrineEvidenceLog(env, {
    eventType: "doctrine.version.approval",
    actorType: "operator",
    operatorId,
    versionId,
    timestamp: resolvedTimestamp,
    state: "APPROVED",
    details: "Doctrine version approved by operator token workflow."
  });
  return resolvedTimestamp;
}
__name(logDoctrineVersionApproval, "logDoctrineVersionApproval");
async function logDoctrineChunkApproval(env, { operatorId, versionId, chunkHash, classification = null, timestamp = null }) {
  const resolvedTimestamp = normalizeText10(timestamp) || (/* @__PURE__ */ new Date()).toISOString();
  await insertDoctrineEvidenceLog(env, {
    eventType: "doctrine.chunk.approval",
    actorType: "operator",
    operatorId,
    versionId,
    chunkHash,
    classification,
    timestamp: resolvedTimestamp,
    state: "APPROVED",
    details: "Doctrine chunk approved by operator token workflow."
  });
  return resolvedTimestamp;
}
__name(logDoctrineChunkApproval, "logDoctrineChunkApproval");
async function logDoctrineAccess(env, { agentId, versionId, classification, timestamp = null }) {
  const resolvedTimestamp = normalizeText10(timestamp) || (/* @__PURE__ */ new Date()).toISOString();
  await insertDoctrineAccessLog(env, {
    agentId,
    versionId,
    classification,
    timestamp: resolvedTimestamp
  });
  await insertDoctrineEvidenceLog(env, {
    eventType: "doctrine.access",
    actorType: "agent",
    agentId,
    versionId,
    classification: normalizeClassification(classification),
    timestamp: resolvedTimestamp,
    state: "APPROVED",
    details: "Approved doctrine delivered through broker."
  });
  return resolvedTimestamp;
}
__name(logDoctrineAccess, "logDoctrineAccess");
async function logDoctrineDeniedAccess(env, { agentId, versionId, classification, reason, timestamp = null }) {
  const resolvedTimestamp = normalizeText10(timestamp) || (/* @__PURE__ */ new Date()).toISOString();
  await insertDoctrineEvidenceLog(env, {
    eventType: "doctrine.access.denied",
    actorType: "agent",
    agentId,
    versionId,
    classification: normalizeClassification(classification),
    timestamp: resolvedTimestamp,
    state: "DENIED",
    details: normalizeText10(reason) || "Doctrine broker access denied."
  });
  return resolvedTimestamp;
}
__name(logDoctrineDeniedAccess, "logDoctrineDeniedAccess");

// worker/doctrine/pipeline.js
var DEFAULT_DOCTRINE_SOURCE_URL = "https://matrixsechub.writing.io/";
var MAX_CHUNK_CHARACTERS = 1800;
var MAX_CHUNK_WORDS = 260;
var SAFE_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
var CLASSIFICATION_RULES = [
  {
    classification: "INTAKE_SCORING",
    keywords: ["intake", "routing", "triage", "score", "scoring", "qualification", "priority"]
  },
  {
    classification: "ACL_POLICY",
    keywords: ["acl", "permission", "access control", "least privilege", "policy", "allow", "deny"]
  },
  {
    classification: "ESCALATION_PATHS",
    keywords: ["escalation", "containment", "handoff", "pager", "operator", "incident"]
  },
  {
    classification: "RED_TEAM_PROTOCOLS",
    keywords: ["red team", "adversary", "attack chain", "exploit", "exercise", "test plan"]
  },
  {
    classification: "REPORTING_STANDARDS",
    keywords: ["report", "finding", "evidence", "brief", "artifact", "remediation"]
  }
];
function normalizeText11(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeText11, "normalizeText");
function normalizeWhitespace(value) {
  return String(value || "").replace(/\r\n/g, "\n").replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
__name(normalizeWhitespace, "normalizeWhitespace");
function decodeHtmlEntities(value) {
  const namedEntities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " "
  };
  return String(value || "").replace(/&(amp|lt|gt|quot|nbsp);|&#39;/gi, (match) => namedEntities[match.toLowerCase()] || match).replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}
__name(decodeHtmlEntities, "decodeHtmlEntities");
function stripTags(value) {
  return String(value || "").replace(/<\/?[^>]+>/g, " ");
}
__name(stripTags, "stripTags");
function normalizeDoctrineSourceUrl(value) {
  const raw = normalizeText11(value) || DEFAULT_DOCTRINE_SOURCE_URL;
  const url = new URL(raw);
  url.hash = "";
  url.search = "";
  if (!url.pathname) {
    url.pathname = "/";
  }
  return url.toString();
}
__name(normalizeDoctrineSourceUrl, "normalizeDoctrineSourceUrl");
function getDoctrineAllowlist(env) {
  const configured = normalizeText11(env.DOCTRINE_SOURCE_ALLOWLIST);
  const values = configured ? configured.split(",").map((entry) => normalizeDoctrineSourceUrl(entry)).filter(Boolean) : [normalizeDoctrineSourceUrl(DEFAULT_DOCTRINE_SOURCE_URL)];
  if (!values.length) {
    throw new Error("DOCTRINE_SOURCE_ALLOWLIST must contain at least one URL.");
  }
  return values;
}
__name(getDoctrineAllowlist, "getDoctrineAllowlist");
function assertDoctrineSourceUrlAllowed(env, sourceUrl) {
  const normalizedSourceUrl = normalizeDoctrineSourceUrl(sourceUrl);
  const allowlist = getDoctrineAllowlist(env);
  if (!allowlist.includes(normalizedSourceUrl)) {
    throw new Error(`Doctrine source URL is not allowlisted: ${normalizedSourceUrl}`);
  }
  return normalizedSourceUrl;
}
__name(assertDoctrineSourceUrlAllowed, "assertDoctrineSourceUrlAllowed");
function sanitizeDoctrineHtml(html2) {
  return String(html2 || "").replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|video|audio|canvas)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<(meta|link|base)[^>]*>/gi, " ").replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "").replace(/\sstyle\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "").replace(/\s(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, "").replace(/\s(href|src)\s*=\s*("data:[^"]*"|'data:[^']*'|data:[^\s>]+)/gi, "");
}
__name(sanitizeDoctrineHtml, "sanitizeDoctrineHtml");
function toInlineMarkdown(fragment) {
  let output = String(fragment || "");
  output = output.replace(
    /<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi,
    (_, __, hrefA, hrefB, label) => {
      const href = normalizeText11(hrefA || hrefB);
      try {
        const url = new URL(href, DEFAULT_DOCTRINE_SOURCE_URL);
        if (!SAFE_PROTOCOLS.has(url.protocol)) {
          return toInlineMarkdown(label);
        }
        return `[${toInlineMarkdown(label)}](${url.toString()})`;
      } catch {
        return toInlineMarkdown(label);
      }
    }
  );
  output = output.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, text2) => `**${toInlineMarkdown(text2)}**`);
  output = output.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, text2) => `_${toInlineMarkdown(text2)}_`);
  output = output.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, text2) => `\`${decodeHtmlEntities(stripTags(text2)).trim()}\``);
  output = output.replace(/<br\s*\/?>/gi, "\n");
  output = decodeHtmlEntities(stripTags(output));
  return normalizeWhitespace(output);
}
__name(toInlineMarkdown, "toInlineMarkdown");
function convertHtmlListsToMarkdown(value) {
  return value.replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => {
    const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => `- ${toInlineMarkdown(match[1])}`);
    return items.length ? `
${items.join("\n")}

` : "\n";
  });
}
__name(convertHtmlListsToMarkdown, "convertHtmlListsToMarkdown");
function htmlToCanonicalMarkdown(untrustedHtml) {
  let markdown = sanitizeDoctrineHtml(untrustedHtml);
  markdown = markdown.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, content) => {
    const code = decodeHtmlEntities(stripTags(content)).trim();
    return code ? `

\`\`\`
${code}
\`\`\`

` : "\n";
  });
  markdown = markdown.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const lines = toInlineMarkdown(content).split("\n").map((line) => line.trim()).filter(Boolean).map((line) => `> ${line}`);
    return lines.length ? `

${lines.join("\n")}

` : "\n";
  });
  markdown = markdown.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) => {
    const prefix = "#".repeat(Number(level));
    return `

${prefix} ${toInlineMarkdown(content)}

`;
  });
  markdown = convertHtmlListsToMarkdown(markdown);
  markdown = markdown.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
    const paragraph = toInlineMarkdown(content);
    return paragraph ? `

${paragraph}

` : "\n";
  });
  markdown = markdown.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");
  markdown = markdown.replace(/<(section|article|main|div)[^>]*>/gi, "\n");
  markdown = markdown.replace(/<\/(section|article|main|div)>/gi, "\n");
  markdown = markdown.replace(/<\/?[^>]+>/g, " ");
  markdown = decodeHtmlEntities(markdown);
  markdown = normalizeWhitespace(markdown);
  if (!markdown) {
    throw new Error("Doctrine markdown is empty after sanitization.");
  }
  return markdown;
}
__name(htmlToCanonicalMarkdown, "htmlToCanonicalMarkdown");
function splitOversizedChunk(content, maxChars, maxWords) {
  const paragraphs = normalizeWhitespace(content).split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const chunks = [];
  let buffer = [];
  let bufferWordCount = 0;
  for (const paragraph of paragraphs) {
    const paragraphWordCount = paragraph.split(/\s+/).filter(Boolean).length;
    const candidate = buffer.length ? `${buffer.join("\n\n")}

${paragraph}` : paragraph;
    const candidateWordCount = bufferWordCount + paragraphWordCount;
    if (candidate.length > maxChars || candidateWordCount > maxWords) {
      if (buffer.length) {
        chunks.push(buffer.join("\n\n"));
      }
      buffer = [paragraph];
      bufferWordCount = paragraphWordCount;
      continue;
    }
    buffer.push(paragraph);
    bufferWordCount = candidateWordCount;
  }
  if (buffer.length) {
    chunks.push(buffer.join("\n\n"));
  }
  return chunks;
}
__name(splitOversizedChunk, "splitOversizedChunk");
function chunkDoctrineMarkdown(markdown, options = {}) {
  const maxChars = Number(options.maxChars) || MAX_CHUNK_CHARACTERS;
  const maxWords = Number(options.maxWords) || MAX_CHUNK_WORDS;
  const sections = normalizeWhitespace(markdown).split(/\n(?=#{1,6}\s)/g).map((section) => section.trim()).filter(Boolean);
  const chunkBodies = [];
  for (const section of sections.length ? sections : [normalizeWhitespace(markdown)]) {
    const wordCount = section.split(/\s+/).filter(Boolean).length;
    if (section.length <= maxChars && wordCount <= maxWords) {
      chunkBodies.push(section);
      continue;
    }
    chunkBodies.push(...splitOversizedChunk(section, maxChars, maxWords));
  }
  return chunkBodies.map((content, index) => ({
    index: index + 1,
    markdown: content,
    wordCount: content.split(/\s+/).filter(Boolean).length
  }));
}
__name(chunkDoctrineMarkdown, "chunkDoctrineMarkdown");
async function hashDoctrineChunk(markdown) {
  const payload = new TextEncoder().encode(markdown);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(hashDoctrineChunk, "hashDoctrineChunk");
function classifyDoctrineChunk(markdown) {
  const haystack = normalizeText11(markdown).toLowerCase();
  let best = { classification: "GENERAL_DOCTRINE", score: 0 };
  for (const rule of CLASSIFICATION_RULES) {
    const score2 = rule.keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
    if (score2 > best.score) {
      best = { classification: rule.classification, score: score2 };
    }
  }
  return best.classification;
}
__name(classifyDoctrineChunk, "classifyDoctrineChunk");
async function fetchDoctrineSourceHtml(env, sourceUrl = null) {
  const allowlist = getDoctrineAllowlist(env);
  const targetUrl = assertDoctrineSourceUrlAllowed(env, sourceUrl || allowlist[0]);
  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8",
      "User-Agent": "mshops-doctrine-sync/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`Doctrine source fetch failed with status ${response.status}.`);
  }
  return {
    sourceUrl: targetUrl,
    html: await response.text()
  };
}
__name(fetchDoctrineSourceHtml, "fetchDoctrineSourceHtml");
async function buildDoctrineSyncPayload(env, { sourceUrl = null, previousHashes = [] } = {}) {
  const fetched = await fetchDoctrineSourceHtml(env, sourceUrl);
  const markdown = htmlToCanonicalMarkdown(fetched.html);
  const previousHashSet = new Set(Array.isArray(previousHashes) ? previousHashes : []);
  const chunkSkeletons = chunkDoctrineMarkdown(markdown);
  const chunks = await Promise.all(
    chunkSkeletons.map(async (chunk) => {
      const hash = await hashDoctrineChunk(chunk.markdown);
      return {
        index: chunk.index,
        markdown: chunk.markdown,
        wordCount: chunk.wordCount,
        hash,
        classification: classifyDoctrineChunk(chunk.markdown),
        diffStatus: previousHashSet.has(hash) ? "UNCHANGED" : "NEW"
      };
    })
  );
  const newChunkCount = chunks.filter((chunk) => chunk.diffStatus === "NEW").length;
  return {
    sourceUrl: fetched.sourceUrl,
    markdown,
    chunks,
    totalChunkCount: chunks.length,
    newChunkCount,
    hasChanges: newChunkCount > 0 || previousHashes.length !== chunks.length
  };
}
__name(buildDoctrineSyncPayload, "buildDoctrineSyncPayload");

// worker/doctrine/storage.js
var DOCTRINE_OBJECT_PREFIX = "doctrine";
var DOCTRINE_CACHE_PREFIX = "doctrine:chunk";
function requireDoctrineCache(env) {
  if (!env.DOCTRINE_CACHE) {
    throw new Error("DOCTRINE_CACHE binding is required.");
  }
  return env.DOCTRINE_CACHE;
}
__name(requireDoctrineCache, "requireDoctrineCache");
function requireDoctrineBucket(env) {
  if (!env.DOCTRINE_CHUNKS) {
    throw new Error("DOCTRINE_CHUNKS binding is required.");
  }
  return env.DOCTRINE_CHUNKS;
}
__name(requireDoctrineBucket, "requireDoctrineBucket");
function buildDoctrineChunkCacheKey(versionId, hash) {
  return `${DOCTRINE_CACHE_PREFIX}:${versionId}:${hash}`;
}
__name(buildDoctrineChunkCacheKey, "buildDoctrineChunkCacheKey");
function buildDoctrineChunkObjectKey(versionId, hash) {
  return `${DOCTRINE_OBJECT_PREFIX}/${versionId}/${hash}.md`;
}
__name(buildDoctrineChunkObjectKey, "buildDoctrineChunkObjectKey");
async function storeDoctrineChunk(env, { versionId, hash, classification, markdown }) {
  if (!versionId || !hash || !classification || typeof markdown !== "string") {
    throw new Error("versionId, hash, classification, and markdown are required.");
  }
  const storedAt = (/* @__PURE__ */ new Date()).toISOString();
  const cacheKey = buildDoctrineChunkCacheKey(versionId, hash);
  const objectKey = buildDoctrineChunkObjectKey(versionId, hash);
  await Promise.all([
    requireDoctrineCache(env).put(
      cacheKey,
      JSON.stringify({
        versionId,
        hash,
        classification,
        markdown,
        storedAt,
        referenceOnly: true
      })
    ),
    requireDoctrineBucket(env).put(objectKey, markdown, {
      httpMetadata: {
        contentType: "text/markdown; charset=utf-8"
      },
      customMetadata: {
        versionId,
        hash,
        classification,
        storedAt,
        referenceOnly: "true"
      }
    })
  ]);
  return {
    cacheKey,
    objectKey,
    storedAt
  };
}
__name(storeDoctrineChunk, "storeDoctrineChunk");
async function readDoctrineChunk(env, { versionId, hash }) {
  if (!versionId || !hash) {
    throw new Error("versionId and hash are required.");
  }
  const cacheKey = buildDoctrineChunkCacheKey(versionId, hash);
  const cached = await requireDoctrineCache(env).get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    return {
      versionId,
      hash,
      classification: parsed.classification || null,
      markdown: typeof parsed.markdown === "string" ? parsed.markdown : "",
      storedAt: parsed.storedAt || null
    };
  }
  const objectKey = buildDoctrineChunkObjectKey(versionId, hash);
  const object = await requireDoctrineBucket(env).get(objectKey);
  if (!object) {
    return null;
  }
  const markdown = await object.text();
  const classification = object.customMetadata?.classification || null;
  const storedAt = object.customMetadata?.storedAt || null;
  await requireDoctrineCache(env).put(
    cacheKey,
    JSON.stringify({
      versionId,
      hash,
      classification,
      markdown,
      storedAt,
      referenceOnly: true
    })
  );
  return {
    versionId,
    hash,
    classification,
    markdown,
    storedAt
  };
}
__name(readDoctrineChunk, "readDoctrineChunk");
async function hydrateDoctrineChunks(env, chunkRows) {
  return Promise.all(
    chunkRows.map(async (chunkRow) => {
      const stored = await readDoctrineChunk(env, {
        versionId: chunkRow.version_id,
        hash: chunkRow.hash
      });
      if (!stored) {
        throw new Error(`Doctrine chunk body missing for ${chunkRow.version_id}:${chunkRow.hash}`);
      }
      return {
        hash: chunkRow.hash,
        classification: chunkRow.classification,
        created_at: chunkRow.created_at,
        markdown: stored.markdown
      };
    })
  );
}
__name(hydrateDoctrineChunks, "hydrateDoctrineChunks");

// worker/doctrine/index.js
var DoctrineHttpError = class extends Error {
  static {
    __name(this, "DoctrineHttpError");
  }
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
var RESPONSE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Doctrine-Mode": "reference-only"
};
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: RESPONSE_HEADERS
  });
}
__name(json, "json");
async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
__name(readBody, "readBody");
function getRequestToken(request) {
  const authorization = normalizeText10(request.headers.get("Authorization"));
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  return normalizeText10(request.headers.get("X-MSH-Operator-Token"));
}
__name(getRequestToken, "getRequestToken");
function requireOperatorToken(request, env) {
  const configuredToken = normalizeText10(env.DOCTRINE_OPERATOR_TOKEN);
  if (!configuredToken) {
    throw new DoctrineHttpError(500, "DOCTRINE_OPERATOR_TOKEN is not configured.");
  }
  if (getRequestToken(request) !== configuredToken) {
    throw new DoctrineHttpError(403, "Operator token is invalid.");
  }
}
__name(requireOperatorToken, "requireOperatorToken");
function requireOperatorId(request, body) {
  const operatorId = normalizeText10(
    body.operatorId || body.operator_id || request.headers.get("X-MSH-Operator-Id")
  );
  if (!operatorId) {
    throw new DoctrineHttpError(400, "operatorId is required.");
  }
  return operatorId;
}
__name(requireOperatorId, "requireOperatorId");
async function handleDoctrineSync(request, env) {
  requireOperatorToken(request, env);
  const body = await readBody(request);
  const latestVersion = await getLatestDoctrineVersion(env);
  const previousHashes = latestVersion ? await listDoctrineHashesByVersion(env, latestVersion.id) : [];
  const syncPayload = await buildDoctrineSyncPayload(env, {
    sourceUrl: body.sourceUrl || body.source_url || body.url || null,
    previousHashes
  });
  if (!syncPayload.hasChanges && latestVersion) {
    return json({
      status: "NO_CHANGE",
      versionId: latestVersion.id,
      sourceUrl: syncPayload.sourceUrl,
      approved: latestVersion.approved,
      totalChunkCount: syncPayload.totalChunkCount,
      newChunkCount: 0
    });
  }
  const versionId = crypto.randomUUID();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  await createDoctrineVersion(env, {
    id: versionId,
    sourceUrl: syncPayload.sourceUrl,
    createdAt,
    approved: QUARANTINE_FLAG,
    operatorId: null
  });
  for (const chunk of syncPayload.chunks) {
    await storeDoctrineChunk(env, {
      versionId,
      hash: chunk.hash,
      classification: chunk.classification,
      markdown: chunk.markdown
    });
    await insertDoctrineChunkMetadata(env, {
      versionId,
      hash: chunk.hash,
      classification: chunk.classification,
      createdAt,
      approved: QUARANTINE_FLAG
    });
  }
  await logDoctrineSyncQuarantine(env, {
    versionId,
    sourceUrl: syncPayload.sourceUrl,
    chunkCount: syncPayload.totalChunkCount,
    newChunkCount: syncPayload.newChunkCount,
    timestamp: createdAt
  });
  return json(
    {
      status: "QUARANTINE",
      versionId,
      sourceUrl: syncPayload.sourceUrl,
      approved: false,
      totalChunkCount: syncPayload.totalChunkCount,
      newChunkCount: syncPayload.newChunkCount,
      chunks: syncPayload.chunks.map((chunk) => ({
        index: chunk.index,
        hash: chunk.hash,
        classification: chunk.classification,
        diffStatus: chunk.diffStatus,
        approved: false
      }))
    },
    201
  );
}
__name(handleDoctrineSync, "handleDoctrineSync");
async function handleDoctrineApproveVersion(request, env) {
  requireOperatorToken(request, env);
  const body = await readBody(request);
  const versionId = normalizeText10(body.versionId || body.version_id);
  const operatorId = requireOperatorId(request, body);
  if (!versionId) {
    throw new DoctrineHttpError(400, "versionId is required.");
  }
  const version = await approveDoctrineVersion(env, {
    versionId,
    operatorId
  });
  if (!version) {
    throw new DoctrineHttpError(404, "Doctrine version not found.");
  }
  const timestamp = await logDoctrineVersionApproval(env, {
    operatorId,
    versionId: version.id
  });
  return json({
    status: "APPROVED",
    operator_id: operatorId,
    version_id: version.id,
    approved: true,
    timestamp
  });
}
__name(handleDoctrineApproveVersion, "handleDoctrineApproveVersion");
async function handleDoctrineApproveChunk(request, env) {
  requireOperatorToken(request, env);
  const body = await readBody(request);
  const versionId = normalizeText10(body.versionId || body.version_id);
  const chunkHash = normalizeText10(body.chunkHash || body.chunk_hash || body.hash);
  const operatorId = requireOperatorId(request, body);
  if (!versionId || !chunkHash) {
    throw new DoctrineHttpError(400, "versionId and chunkHash are required.");
  }
  const chunk = await approveDoctrineChunk(env, {
    versionId,
    chunkHash
  });
  if (!chunk) {
    throw new DoctrineHttpError(404, "Doctrine chunk not found.");
  }
  const timestamp = await logDoctrineChunkApproval(env, {
    operatorId,
    versionId,
    chunkHash,
    classification: chunk.classification
  });
  return json({
    status: "APPROVED",
    operator_id: operatorId,
    version_id: versionId,
    chunk_hash: chunkHash,
    approved: true,
    timestamp
  });
}
__name(handleDoctrineApproveChunk, "handleDoctrineApproveChunk");
async function handleDoctrineBroker(request, env) {
  const body = await readBody(request);
  const agentId = normalizeText10(body.agentId || body.agent_id);
  const versionId = normalizeText10(body.versionId || body.version_id);
  const classification = normalizeClassification(body.classification);
  if (!agentId || !versionId || !classification) {
    throw new DoctrineHttpError(400, "agentId, versionId, and classification are required.");
  }
  const aclResult = await checkDoctrineAcl(env, agentId, classification, versionId);
  if (!aclResult.allowed) {
    await logDoctrineDeniedAccess(env, {
      agentId,
      versionId,
      classification,
      reason: aclResult.reason
    });
    throw new DoctrineHttpError(403, `Doctrine access denied: ${aclResult.reason}`);
  }
  const version = await getDoctrineVersion(env, versionId);
  if (!version || !version.approved) {
    await logDoctrineDeniedAccess(env, {
      agentId,
      versionId,
      classification,
      reason: "version_not_approved"
    });
    throw new DoctrineHttpError(403, "Doctrine version is not approved.");
  }
  const chunkRows = await listApprovedDoctrineChunks(env, {
    versionId,
    classification
  });
  if (!chunkRows.length) {
    await logDoctrineDeniedAccess(env, {
      agentId,
      versionId,
      classification,
      reason: "no_approved_chunks"
    });
    throw new DoctrineHttpError(403, "No approved chunks are available for this classification.");
  }
  const chunks = await hydrateDoctrineChunks(env, chunkRows);
  const timestamp = await logDoctrineAccess(env, {
    agentId,
    versionId,
    classification
  });
  return json({
    referenceOnly: true,
    nonExecutable: true,
    agentId,
    versionId,
    classification,
    timestamp,
    constraints: [
      "REFERENCE_ONLY",
      "NON_EXECUTABLE",
      "NO_DIRECT_WRITING_IO_FETCH",
      "NO_DOCTRINE_MUTATION",
      "NO_PERMISSION_EXPANSION"
    ],
    chunks
  });
}
__name(handleDoctrineBroker, "handleDoctrineBroker");
async function handleDoctrineRequest(request, env, url = new URL(request.url)) {
  try {
    const pathname = url.pathname;
    const method = request.method || "GET";
    if (method === "POST" && pathname === "/doctrine/sync") {
      return handleDoctrineSync(request, env);
    }
    if (method === "POST" && pathname === "/doctrine/approve-version") {
      return handleDoctrineApproveVersion(request, env);
    }
    if (method === "POST" && pathname === "/doctrine/approve-chunk") {
      return handleDoctrineApproveChunk(request, env);
    }
    if (method === "POST" && pathname === "/doctrine/broker") {
      return handleDoctrineBroker(request, env);
    }
    return json({ error: "Doctrine route not found." }, 404);
  } catch (error) {
    const status = error instanceof DoctrineHttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Doctrine request failed.";
    return json({ error: message }, status);
  }
}
__name(handleDoctrineRequest, "handleDoctrineRequest");
var doctrine_default = handleDoctrineRequest;

// worker/data/cloudflareMcp.js
var CLOUDFLARE_MCP_SERVERS = {
  cloudflare: {
    id: "cloudflare",
    label: "Cloudflare API",
    url: "https://mcp.cloudflare.com/mcp",
    auth: "oauth",
    description: "Cloudflare API MCP server (Code Mode)."
  },
  "cloudflare-docs": {
    id: "cloudflare-docs",
    label: "Cloudflare Docs",
    url: "https://docs.mcp.cloudflare.com/mcp",
    auth: "none",
    description: "Public Cloudflare documentation search."
  },
  "cloudflare-bindings": {
    id: "cloudflare-bindings",
    label: "Cloudflare Bindings",
    url: "https://bindings.mcp.cloudflare.com/mcp",
    auth: "oauth",
    description: "Wrangler bindings inspection and management."
  },
  "cloudflare-builds": {
    id: "cloudflare-builds",
    label: "Cloudflare Builds",
    url: "https://builds.mcp.cloudflare.com/mcp",
    auth: "oauth",
    description: "Workers Builds CI/CD status and logs."
  },
  "cloudflare-observability": {
    id: "cloudflare-observability",
    label: "Cloudflare Observability",
    url: "https://observability.mcp.cloudflare.com/mcp",
    auth: "oauth",
    description: "Worker logs, metrics, and observability queries."
  }
};
var CLOUDFLARE_SKILLS = [
  "agents-sdk",
  "cloudflare",
  "cloudflare-email-service",
  "cloudflare-one",
  "cloudflare-one-migrations",
  "durable-objects",
  "sandbox-sdk",
  "turnstile-spin",
  "web-perf",
  "workers-best-practices",
  "wrangler"
];
var FEDERATION_SURFACES = {
  hq: {
    id: "hq",
    label: "HQ",
    path: "/",
    description: "Division landing and public command surface."
  },
  constellation: {
    id: "constellation",
    label: "Constellation",
    path: "/marketplace",
    description: "Module constellation and marketplace registry."
  },
  operator: {
    id: "operator",
    label: "Operator",
    path: "/operator",
    description: "Operator console and execution controls."
  },
  federation: {
    id: "federation",
    label: "Federation",
    path: "/os",
    description: "OS federation plane and cross-surface health."
  },
  mission: {
    id: "mission",
    label: "Mission Control",
    path: "/mission",
    description: "Advisory Cloudflare federation mission board."
  }
};
var WRANGLER_BINDINGS_MANIFEST = {
  worker: "mshops-public",
  compatibilityDate: "2026-07-06",
  bindings: [
    { name: "PAYLOADS", type: "kv_namespace" },
    { name: "ESCALATIONS", type: "kv_namespace" },
    { name: "MODULES", type: "kv_namespace" },
    { name: "ROUTING_LOGS", type: "kv_namespace" },
    { name: "SEARCH_LOGS", type: "kv_namespace" },
    { name: "EVENTS", type: "kv_namespace" },
    { name: "AUTONOMY_LOGS", type: "kv_namespace" },
    { name: "ECOSYSTEM", type: "kv_namespace" },
    { name: "NOTIFICATIONS", type: "kv_namespace" },
    { name: "AUDIT", type: "kv_namespace" },
    { name: "SCENARIOS", type: "kv_namespace" },
    { name: "HEARTBEAT", type: "kv_namespace" },
    { name: "OS_ROUTING", type: "kv_namespace" },
    { name: "DIVISION_MEMORY", type: "kv_namespace" },
    { name: "OPERATOR_INTENTS", type: "kv_namespace" },
    { name: "PIPELINES", type: "kv_namespace" },
    { name: "SANDBOX_LOGS", type: "kv_namespace" },
    { name: "OS_CONFIG", type: "kv_namespace" },
    { name: "PUBLIC_SCENARIOS", type: "kv_namespace" },
    { name: "TELEMETRY", type: "kv_namespace" },
    { name: "GOVERNANCE", type: "kv_namespace" },
    { name: "RELEASES", type: "kv_namespace" },
    { name: "INTEGRATIONS", type: "kv_namespace" },
    { name: "CERTIFICATION", type: "kv_namespace" },
    { name: "ASSETS", type: "assets" }
  ],
  vars: ["UPSTREAM_ENGINE_URL"],
  crons: ["*/5 * * * *"]
};
var PIPELINE_REQUIRED_BINDINGS = ["MODULES", "PIPELINES", "ASSETS", "GOVERNANCE"];
var CURATED_DOCS_INDEX = [
  { title: "Workers", url: "https://developers.cloudflare.com/workers/", keywords: ["workers", "serverless", "edge"], topic: "workers" },
  { title: "Workers KV", url: "https://developers.cloudflare.com/kv/", keywords: ["kv", "key-value", "storage"], topic: "kv" },
  { title: "Durable Objects", url: "https://developers.cloudflare.com/durable-objects/", keywords: ["durable", "objects", "state"], topic: "durable-objects" },
  { title: "Email Routing", url: "https://developers.cloudflare.com/email-routing/", keywords: ["email", "routing", "mail"], topic: "email" },
  { title: "Cloudflare Email Service", url: "https://developers.cloudflare.com/email-security/", keywords: ["email", "security", "service"], topic: "email" },
  { title: "Cloudflare One", url: "https://developers.cloudflare.com/cloudflare-one/", keywords: ["cloudflare", "one", "zero", "trust", "access"], topic: "cloudflare-one" },
  { title: "Wrangler CLI", url: "https://developers.cloudflare.com/workers/wrangler/", keywords: ["wrangler", "deploy", "cli"], topic: "workers" },
  { title: "Workers Builds", url: "https://developers.cloudflare.com/workers/ci-cd/builds/", keywords: ["builds", "ci", "cd", "deploy"], topic: "workers" },
  { title: "Workers Observability", url: "https://developers.cloudflare.com/workers/observability/", keywords: ["observability", "logs", "metrics", "tracing"], topic: "workers" },
  { title: "MCP on Cloudflare", url: "https://developers.cloudflare.com/agents/model-context-protocol/", keywords: ["mcp", "model context protocol", "agents"], topic: "workers" },
  { title: "Agent Setup", url: "https://developers.cloudflare.com/agent-setup/", keywords: ["agent", "setup", "skills", "cursor"], topic: "workers" },
  { title: "Workers Bindings", url: "https://developers.cloudflare.com/workers/runtime-apis/bindings/", keywords: ["bindings", "kv", "r2", "d1"], topic: "kv" },
  { title: "Cron Triggers", url: "https://developers.cloudflare.com/workers/configuration/cron-triggers/", keywords: ["cron", "scheduled", "triggers"], topic: "workers" },
  { title: "Workers Performance", url: "https://developers.cloudflare.com/workers/observability/metrics-and-analytics/", keywords: ["performance", "metrics", "analytics", "latency"], topic: "performance" },
  { title: "Cloudflare Security", url: "https://developers.cloudflare.com/security/", keywords: ["security", "waf", "ddos", "zero trust"], topic: "security" }
];
var DOCS_TOPIC_CATEGORIES = [
  "workers",
  "kv",
  "durable-objects",
  "email",
  "cloudflare-one",
  "security",
  "performance"
];
var DOCS_QUICK_ACTIONS = [
  { id: "kv-best-practices", label: "KV Best Practices", query: "KV namespace best practices workers storage", topic: "kv", category: "kv" },
  { id: "workers-deploy", label: "Workers Deployment", query: "Workers deployment wrangler CI CD", topic: "workers", category: "workers" },
  { id: "do-patterns", label: "Durable Objects Patterns", query: "Durable Objects patterns state coordination", topic: "durable-objects", category: "durable-objects" },
  { id: "workers-kv", label: "Workers KV", query: "workers kv bindings storage", topic: "kv", category: "kv" },
  { id: "durable-objects", label: "Durable Objects", query: "durable objects state coordination", topic: "durable-objects", category: "durable-objects" },
  { id: "email-service", label: "Email Service", query: "cloudflare email routing security", topic: "email", category: "email" },
  { id: "cloudflare-one", label: "Cloudflare One", query: "cloudflare one zero trust access", topic: "cloudflare-one", category: "cloudflare-one" },
  { id: "workers-observability", label: "Workers Observability", query: "workers observability logs metrics", topic: "workers", category: "performance" },
  { id: "workers-builds", label: "Workers Builds", query: "workers builds ci cd deploy", topic: "workers", category: "workers" },
  { id: "security-posture", label: "Security Posture", query: "cloudflare security zero trust WAF", topic: "security", category: "security" },
  { id: "web-performance", label: "Web Performance", query: "web performance core web vitals caching", topic: "performance", category: "performance" }
];
var CLOUDFLARE_FEDERATION_ACTIONS = [
  { id: "logs", label: "Fetch Logs", method: "POST", route: "/api/os/cloudflare/logs/fetch", mcpServer: "cloudflare-observability", capability: "logs" },
  { id: "metrics", label: "Fetch Metrics", method: "POST", route: "/api/os/cloudflare/metrics/fetch", mcpServer: "cloudflare-observability", capability: "metrics" },
  { id: "build", label: "Run Build", method: "POST", route: "/api/os/cloudflare/build/run", mcpServer: "cloudflare-builds", capability: "build" },
  { id: "validate-bindings", label: "Validate Bindings", method: "POST", route: "/api/os/cloudflare/bindings/validate", mcpServer: "cloudflare-bindings", capability: "bindings" },
  { id: "docs-query", label: "Docs Query", method: "POST", route: "/api/os/cloudflare/docs/query", mcpServer: "cloudflare-docs", capability: "docs" }
];
var MODULE_CF_ACTION_COMPATIBILITY = {
  "multi-agent-cockpit": ["logs", "metrics", "build", "bindings", "docs"],
  "scenario-engine": ["logs", "metrics", "build", "bindings", "docs"],
  "msh-ops-doctrine": ["docs", "bindings"],
  "n8n-automation-packs": ["docs", "metrics"],
  "ai-agent-threat-report": ["logs", "metrics", "docs"]
};
var STATIC_LOGS_FALLBACK = {
  source: "advisory-fallback",
  status: "requires_oauth",
  logs: [
    "[advisory] cloudflare-observability MCP requires OAuth for live Worker logs.",
    "[manifest] Worker mshops-public registered in wrangler.jsonc.",
    "[hint] Connect Cursor cloudflare-observability MCP and authenticate to fetch live logs."
  ]
};
var STATIC_METRICS_FALLBACK = {
  source: "advisory-fallback",
  status: "requires_oauth",
  metrics: [
    { name: "kvHealth", value: "manifest-only", note: "OAuth required for live metrics." },
    { name: "pipelineEngine", value: "optional", note: "Pipeline engine online when records exist." },
    { name: "autonomyLoop", value: "*/5 * * * *", note: "Cron registered in wrangler manifest." }
  ]
};
var STATIC_BUILD_MANIFEST = {
  worker: "mshops-public",
  source: "wrangler-manifest",
  stages: [
    { name: "validate", status: "optional", note: "Wrangler dry-run validation available locally." },
    { name: "bundle", status: "optional", note: "Worker bundle served via ASSETS binding." },
    { name: "deploy", status: "optional", note: "OAuth required for live Workers Builds MCP logs." }
  ],
  logs: [
    "[manifest] Worker mshops-public declared in wrangler.jsonc",
    "[manifest] 24 KV namespaces + ASSETS binding configured",
    "[manifest] Cron */5 * * * * autonomy loop registered",
    "[note] Connect cloudflare-builds MCP via OAuth for live build logs"
  ]
};
var AUTONOMOUS_SIGNAL_TRIGGERS = {
  "logs-anomaly": {
    id: "logs-anomaly",
    label: "Logs anomaly",
    description: "Error, failure, timeout, or degraded patterns detected in Worker logs.",
    severity: "advisory"
  },
  "metrics-spike": {
    id: "metrics-spike",
    label: "Metrics spike",
    description: "Elevated request volume or latency indicators in Worker metrics.",
    severity: "advisory"
  },
  "build-failure": {
    id: "build-failure",
    label: "Build failure",
    description: "Workers Builds MCP or manifest reports a failed or unreachable build stage.",
    severity: "advisory"
  },
  "binding-mismatch": {
    id: "binding-mismatch",
    label: "Binding mismatch",
    description: "Wrangler manifest bindings diverge from pipeline requirements or MCP inspection.",
    severity: "advisory"
  }
};
var ANOMALY_LOG_PATTERNS = [/error/i, /fail/i, /timeout/i, /degraded/i, /warning/i, /exception/i, /spike/i];
var METRICS_SPIKE_KEYWORDS = [/spike/i, /elevated/i, /high/i, /surge/i];
var CLOUDFLARE_EVENT_HOOKS = {
  onBuildComplete: {
    id: "onBuildComplete",
    label: "Build complete",
    description: "Advisory hook when a Cloudflare build completes or manifest stage is satisfied.",
    simulated: true,
    advisoryOnly: true
  },
  onBindingMismatch: {
    id: "onBindingMismatch",
    label: "Binding mismatch",
    description: "Advisory hook when wrangler or MCP binding validation detects a mismatch.",
    simulated: true,
    advisoryOnly: true
  },
  onObservabilitySpike: {
    id: "onObservabilitySpike",
    label: "Observability spike",
    description: "Advisory hook when logs anomalies or metrics spikes are detected.",
    simulated: true,
    advisoryOnly: true
  }
};
var CLOUDFLARE_INSIGHTS_RECOMMENDATIONS = [
  {
    id: "oauth-cloudflare-mcp",
    topic: "oauth",
    message: "Complete OAuth for cloudflare, cloudflare-builds, cloudflare-bindings, and cloudflare-observability MCP servers in Cursor for live federation actions."
  },
  {
    id: "wrangler-dry-run",
    topic: "build",
    message: "Run `npx wrangler deploy --dry-run` locally before promoting releases to validate bundle size and binding declarations."
  },
  {
    id: "kv-namespace-audit",
    topic: "bindings",
    message: "Audit KV namespace IDs in wrangler.jsonc against Cloudflare dashboard; placeholder IDs block production deploys."
  },
  {
    id: "workers-observability",
    topic: "observability",
    message: "Enable Workers Observability and connect cloudflare-observability MCP for live logs and metrics instead of advisory fallbacks."
  },
  {
    id: "durable-objects-patterns",
    topic: "architecture",
    message: "Review Durable Objects patterns for stateful operator modules before scaling multi-agent pipelines."
  },
  {
    id: "governance-safety-rules",
    topic: "governance",
    message: "Keep cloudflareSafetyRules.blockOnMcpOffline false unless you explicitly want MCP offline states to block execution."
  }
];
var CROSS_DIVISION_SYNC = {
  operatorShell: {
    repo: "ttx-operator-shell",
    division: "operator-shell",
    syncRoute: "/api/os/cloudflare/sync",
    crossDivisionRoute: "/api/os/cloudflare/cross-division"
  },
  marketplaceBackend: {
    repo: "marketplace-tracking-backend",
    division: "marketplace-backend",
    syncRoute: "/api/cloudflare/sync",
    crossDivisionRoute: "/api/cloudflare/cross-division",
    defaultPort: 3099
  },
  sharedDimensions: ["decision", "certification", "automation", "insights", "autonomous", "score"],
  alignmentThresholds: {
    aligned: 0.85,
    partial: 0.5
  },
  scoreTolerance: 8
};
var CLOUDFLARE_ORCHESTRATION = {
  routes: {
    orchestration: "/api/os/cloudflare/orchestration",
    agents: "/api/os/cloudflare/agents"
  },
  agents: {
    operatorShell: "route-advisory",
    marketplaceBackend: "marketplace-sync",
    crossDivision: "operator-sentinel",
    pipeline: "payload-generator"
  },
  statuses: ["coordinated", "review", "deferred"],
  advisoryOnly: true
};
var CLOUDFLARE_EXECUTION = {
  routes: {
    execution: "/api/os/cloudflare/execution",
    signals: "/api/os/cloudflare/execution/signals"
  },
  agents: CLOUDFLARE_ORCHESTRATION.agents,
  statuses: ["ready", "review", "deferred"],
  advisoryOnly: true
};
var CLOUDFLARE_ADAPTIVE = {
  route: "/api/os/cloudflare/adaptive",
  modes: ["steady", "caution", "review", "degraded"],
  badges: ["ADAPT_STEADY", "ADAPT_CAUTION", "ADAPT_REVIEW"],
  inputs: [
    "executionScore",
    "orchestrationScore",
    "crossDivisionScore",
    "certificationScore",
    "decision",
    "automationLoops",
    "insightsHealth",
    "autonomousTriggers"
  ],
  advisoryOnly: true
};
var CLOUDFLARE_PREDICTIVE = {
  route: "/api/os/cloudflare/predictive",
  forecastModes: ["stable", "watch", "alert", "fallback"],
  badges: ["PREDICT_STABLE", "PREDICT_WATCH", "PREDICT_ALERT"],
  inputs: [
    "adaptiveMode",
    "executionScore",
    "orchestrationScore",
    "crossDivisionScore",
    "certificationScore",
    "decision",
    "automationLoops",
    "insightsHealth",
    "autonomousTriggers",
    "moduleRiskPatterns"
  ],
  advisoryOnly: true
};
var CLOUDFLARE_STRATEGIC = {
  route: "/api/os/cloudflare/strategic",
  horizons: ["short", "medium", "long"],
  stripModes: ["stable", "watch", "prioritize"],
  tags: ["STRAT_REVIEW", "STRAT_STABILIZE", "STRAT_PROMOTE"],
  themes: ["stability", "risk_reduction", "performance", "observability"],
  advisoryOnly: true
};
var CLOUDFLARE_UCIP = {
  route: "/api/os/cloudflare/ucip",
  modes: ["green", "yellow", "orange", "red"],
  badges: ["UCIP_GREEN", "UCIP_YELLOW", "UCIP_ORANGE", "UCIP_RED"],
  layers: [
    "automation",
    "autonomous",
    "decision",
    "certification",
    "sync",
    "orchestration",
    "execution",
    "adaptive",
    "predictive",
    "strategic"
  ],
  advisoryOnly: true
};
var CLOUDFLARE_AMG = {
  route: "/api/os/cloudflare/amg",
  modes: ["govern_green", "govern_yellow", "govern_orange", "govern_red"],
  badges: ["AMG_OK", "AMG_REVIEW", "AMG_CAUTION"],
  tags: ["AMG_OK", "AMG_REVIEW", "AMG_CAUTION"],
  surfaces: ["operator", "mission", "marketplace", "os"],
  upstream: "/api/os/cloudflare/ucip",
  advisoryOnly: true
};
var CLOUDFLARE_CBA = {
  route: "/api/os/cloudflare/cba",
  modes: ["behavior_green", "behavior_yellow", "behavior_orange", "behavior_red"],
  badges: ["CBA_STABLE", "CBA_DRIFT", "CBA_RISK"],
  tags: ["CBA_STABLE", "CBA_DRIFT", "CBA_RISK"],
  surfaces: ["operator", "mission", "marketplace", "os"],
  upstream: ["/api/os/cloudflare/amg", "/api/os/cloudflare/ucip"],
  advisoryOnly: true
};
var CLOUDFLARE_CAL = {
  route: "/api/os/cloudflare/cal",
  modes: ["align_green", "align_yellow", "align_orange", "align_red"],
  badges: ["CAL_ALIGNED", "CAL_PARTIAL", "CAL_MISALIGNED"],
  tags: ["CAL_ALIGNED", "CAL_PARTIAL", "CAL_MISALIGNED"],
  surfaces: ["operator", "mission", "marketplace", "os"],
  upstream: [
    "/api/os/cloudflare/cba",
    "/api/os/cloudflare/amg",
    "/api/os/cloudflare/ucip"
  ],
  advisoryOnly: true
};
var CLOUDFLARE_IHL = {
  route: "/api/os/cloudflare/ihl",
  modes: ["intent_green", "intent_yellow", "intent_orange", "intent_red"],
  badges: ["IHL_ALIGNED", "IHL_PARTIAL", "IHL_CONFLICT"],
  tags: ["IHL_ALIGNED", "IHL_PARTIAL", "IHL_CONFLICT"],
  surfaces: ["operator", "mission", "marketplace", "os"],
  upstream: [
    "/api/os/cloudflare/cal",
    "/api/os/cloudflare/cba",
    "/api/os/cloudflare/amg",
    "/api/os/cloudflare/ucip"
  ],
  advisoryOnly: true
};
var CLOUDFLARE_IARL = {
  route: "/api/os/cloudflare/iarl",
  modes: ["resonance_green", "resonance_yellow", "resonance_orange", "resonance_red"],
  badges: ["IARL_ALIGNED", "IARL_PARTIAL", "IARL_MISMATCH"],
  tags: ["IARL_ALIGNED", "IARL_PARTIAL", "IARL_MISMATCH"],
  surfaces: ["operator", "mission", "marketplace", "os"],
  upstream: [
    "/api/os/cloudflare/ihl",
    "/api/os/cloudflare/cal",
    "/api/os/cloudflare/cba",
    "/api/os/cloudflare/amg",
    "/api/os/cloudflare/ucip"
  ],
  advisoryOnly: true
};
var CLOUDFLARE_ACL = {
  route: "/api/os/cloudflare/acl",
  modes: ["coherence_green", "coherence_yellow", "coherence_orange", "coherence_red"],
  badges: ["ACL_ALIGNED", "ACL_PARTIAL", "ACL_FRAGMENTED"],
  tags: ["ACL_ALIGNED", "ACL_PARTIAL", "ACL_FRAGMENTED"],
  surfaces: ["operator", "mission", "marketplace", "os"],
  upstream: [
    "/api/os/cloudflare/iarl",
    "/api/os/cloudflare/ihl",
    "/api/os/cloudflare/cal",
    "/api/os/cloudflare/cba",
    "/api/os/cloudflare/amg",
    "/api/os/cloudflare/ucip"
  ],
  advisoryOnly: true
};
var cloudflareMcp_default = {
  CLOUDFLARE_MCP_SERVERS,
  CLOUDFLARE_SKILLS,
  FEDERATION_SURFACES,
  CROSS_DIVISION_SYNC,
  CLOUDFLARE_ORCHESTRATION,
  CLOUDFLARE_EXECUTION,
  CLOUDFLARE_ADAPTIVE,
  CLOUDFLARE_PREDICTIVE,
  CLOUDFLARE_STRATEGIC,
  CLOUDFLARE_UCIP,
  CLOUDFLARE_AMG,
  CLOUDFLARE_CBA,
  CLOUDFLARE_CAL,
  CLOUDFLARE_IHL,
  CLOUDFLARE_IARL,
  CLOUDFLARE_ACL,
  WRANGLER_BINDINGS_MANIFEST,
  PIPELINE_REQUIRED_BINDINGS,
  CURATED_DOCS_INDEX,
  DOCS_TOPIC_CATEGORIES,
  DOCS_QUICK_ACTIONS,
  CLOUDFLARE_FEDERATION_ACTIONS,
  MODULE_CF_ACTION_COMPATIBILITY,
  STATIC_BUILD_MANIFEST,
  STATIC_LOGS_FALLBACK,
  STATIC_METRICS_FALLBACK,
  AUTONOMOUS_SIGNAL_TRIGGERS,
  ANOMALY_LOG_PATTERNS,
  METRICS_SPIKE_KEYWORDS,
  CLOUDFLARE_EVENT_HOOKS,
  CLOUDFLARE_INSIGHTS_RECOMMENDATIONS
};

// worker/cloudflare-federation-utils.js
var CLOUDFLARE_HEALTH_VALUES = ["healthy", "advisory", "degraded", "optional"];
var CLOUDFLARE_NORMALIZED_FIELDS = ["health", "score", "mode", "reasons"];
function normalizeCloudflareHealth(value) {
  const raw = String(value || "optional").toLowerCase();
  if (raw === "healthy" || raw === "online" || raw === "ready" || raw === "aligned" || raw === "certified" || raw === "steady" || raw === "stable" || raw === "proceed") {
    return "healthy";
  }
  if (raw === "degraded" || raw === "offline" || raw === "hold" || raw === "incompatible" || raw === "divergent" || raw === "alert" || raw === "fallback" || raw === "prioritize") {
    return "degraded";
  }
  if (raw === "optional") {
    return "optional";
  }
  return "advisory";
}
__name(normalizeCloudflareHealth, "normalizeCloudflareHealth");
function normalizeCloudflareScore(value, fallback = 50) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}
__name(normalizeCloudflareScore, "normalizeCloudflareScore");
function extractDomainMode(payload = {}, domain = "unknown") {
  switch (domain) {
    case "decision":
      return payload.decision || payload.mode || null;
    case "adaptive":
      return payload.adaptiveState?.mode || payload.mode || null;
    case "predictive":
      return payload.predictiveState?.forecastMode || payload.mode || null;
    case "strategic":
      return payload.strategicState?.stripMode || payload.mode || null;
    case "ucip":
      return payload.ucipState?.mode || payload.mode || null;
    case "amg":
      return payload.amgState?.mode || payload.mode || null;
    case "cba":
      return payload.cbaState?.mode || payload.mode || null;
    case "cal":
      return payload.calState?.mode || payload.mode || null;
    case "ihl":
      return payload.ihlState?.mode || payload.mode || null;
    case "iarl":
      return payload.iarlState?.mode || payload.mode || null;
    case "acl":
      return payload.aclState?.mode || payload.mode || null;
    case "meta-stack":
      return payload.cloudflareACL?.aclState?.mode || payload.aclState?.mode || payload.mode || null;
    case "version":
      return payload.cloudflareACLMode || payload.cloudflareUCIPMode || payload.health || null;
    case "sync":
    case "cross-division":
      return payload.syncStatus || payload.mode || null;
    case "certification":
      return payload.aggregate?.status || payload.mode || null;
    case "automation":
      return (payload.activeCount ?? 0) > 0 ? "active" : "idle";
    default:
      return payload.mode || payload.status || null;
  }
}
__name(extractDomainMode, "extractDomainMode");
function extractDomainNormalizedFields(payload = {}, domain = "unknown") {
  const health = normalizeCloudflareHealth(
    payload.health || payload.federationMeta?.health || payload.adaptiveHealth || payload.predictiveHealth || payload.strategicHealth || payload.orchestrationHealth || payload.executionHealth || payload.crossDivisionHealth || payload.cloudflareCrossDivisionHealth || payload.aggregate?.status || (domain === "decision" ? payload.decision : null)
  );
  const score2 = normalizeCloudflareScore(
    payload.score ?? payload.federationMeta?.score ?? payload.adaptiveScore ?? payload.predictiveScore ?? payload.strategicScore ?? payload.orchestrationScore ?? payload.executionScore ?? payload.crossDivisionScore ?? payload.cloudflareCrossDivisionScore ?? payload.adaptiveState?.score ?? payload.predictiveState?.forecastScore ?? payload.strategicState?.planScore ?? payload.aggregate?.score ?? payload.cloudflareInsightsScore ?? payload.activeCount != null ? Math.max(0, 100 - Number(payload.activeCount) * 15) : null
  );
  const reasons = Array.isArray(payload.reasons) && payload.reasons.length ? payload.reasons : Array.isArray(payload.federationMeta?.reasons) && payload.federationMeta.reasons.length ? payload.federationMeta.reasons : [
    ...payload.crossDivisionReasons || [],
    ...payload.cloudflareCrossDivisionReasons || [],
    ...payload.orchestrationReasons || [],
    ...payload.executionReasons || [],
    ...payload.adaptiveState?.reasons || [],
    ...payload.predictiveState?.forecastReasons || [],
    ...payload.strategicState?.planReasons || [],
    ...payload.aggregate?.reasons || []
  ].filter(Boolean);
  return {
    health,
    score: score2,
    mode: extractDomainMode(payload, domain),
    reasons
  };
}
__name(extractDomainNormalizedFields, "extractDomainNormalizedFields");
function normalizeCrossDivisionFields(payload = {}) {
  const score2 = payload.cloudflareCrossDivisionScore ?? payload.crossDivisionScore ?? null;
  const health = payload.cloudflareCrossDivisionHealth ?? payload.crossDivisionHealth ?? "optional";
  const reasons = payload.cloudflareCrossDivisionReasons ?? payload.crossDivisionReasons ?? [];
  return {
    ...payload,
    crossDivisionScore: score2,
    crossDivisionHealth: normalizeCloudflareHealth(health),
    crossDivisionReasons: reasons,
    cloudflareCrossDivisionScore: score2,
    cloudflareCrossDivisionHealth: normalizeCloudflareHealth(health),
    cloudflareCrossDivisionReasons: reasons
  };
}
__name(normalizeCrossDivisionFields, "normalizeCrossDivisionFields");
function buildCloudflareCatalogFederationBlock({
  decision = {},
  certification = {},
  crossDivision = {},
  orchestration = {},
  execution = {},
  adaptive = {},
  predictive = {},
  strategic = {},
  ucip = {},
  amg = {},
  cba = {},
  cal = {},
  ihl = {},
  iarl = {},
  acl = {}
} = {}) {
  const sync = normalizeCrossDivisionFields(crossDivision);
  return {
    cloudflareDecision: decision.decision,
    cloudflareDecisionScore: decision.score,
    cloudflareCertification: certification.aggregate,
    cloudflareCrossDivisionSync: {
      syncStatus: sync.syncStatus,
      crossDivisionScore: sync.crossDivisionScore,
      crossDivisionHealth: sync.crossDivisionHealth
    },
    cloudflareOrchestration: {
      orchestrationScore: orchestration.orchestrationScore,
      orchestrationHealth: normalizeCloudflareHealth(orchestration.orchestrationHealth),
      planCount: (orchestration.plan || []).length
    },
    cloudflareExecution: {
      executionScore: execution.executionScore,
      executionHealth: normalizeCloudflareHealth(execution.executionHealth),
      planCount: (execution.executionPlan || []).length
    },
    cloudflareAdaptive: {
      adaptiveScore: adaptive.adaptiveScore,
      adaptiveHealth: normalizeCloudflareHealth(adaptive.adaptiveHealth),
      mode: adaptive.adaptiveState?.mode
    },
    cloudflarePredictive: {
      predictiveScore: predictive.predictiveScore,
      predictiveHealth: normalizeCloudflareHealth(predictive.predictiveHealth),
      forecastMode: predictive.predictiveState?.forecastMode
    },
    cloudflareStrategic: {
      strategicScore: strategic.strategicScore,
      strategicHealth: normalizeCloudflareHealth(strategic.strategicHealth),
      horizon: strategic.strategicState?.horizon,
      stripMode: strategic.strategicState?.stripMode
    },
    cloudflareUCIP: {
      ucipScore: ucip.ucipScore ?? ucip.ucipState?.score,
      ucipHealth: normalizeCloudflareHealth(ucip.ucipHealth || ucip.ucipState?.health),
      mode: ucip.ucipState?.mode,
      horizon: ucip.ucipState?.horizon
    },
    cloudflareAMG: {
      amgScore: amg.amgScore ?? amg.amgState?.score,
      amgHealth: normalizeCloudflareHealth(amg.amgHealth || amg.amgState?.health),
      mode: amg.amgState?.mode
    },
    cloudflareCBA: {
      cbaScore: cba.cbaScore ?? cba.cbaState?.score,
      cbaHealth: normalizeCloudflareHealth(cba.cbaHealth || cba.cbaState?.health),
      mode: cba.cbaState?.mode
    },
    cloudflareCAL: {
      calScore: cal.calScore ?? cal.calState?.score,
      calHealth: normalizeCloudflareHealth(cal.calHealth || cal.calState?.health),
      mode: cal.calState?.mode
    },
    cloudflareIHL: {
      ihlScore: ihl.ihlScore ?? ihl.ihlState?.score,
      ihlHealth: normalizeCloudflareHealth(ihl.ihlHealth || ihl.ihlState?.health),
      mode: ihl.ihlState?.mode
    },
    cloudflareIARL: {
      iarlScore: iarl.iarlScore ?? iarl.iarlState?.score,
      iarlHealth: normalizeCloudflareHealth(iarl.iarlHealth || iarl.iarlState?.health),
      mode: iarl.iarlState?.mode
    },
    cloudflareACL: {
      aclScore: acl.aclScore ?? acl.aclState?.score,
      aclHealth: normalizeCloudflareHealth(acl.aclHealth || acl.aclState?.health),
      mode: acl.aclState?.mode
    }
  };
}
__name(buildCloudflareCatalogFederationBlock, "buildCloudflareCatalogFederationBlock");
function buildCloudflareHeartbeatFields({
  federationReadiness = {},
  federationHeartbeat = {},
  cloudflareObservability = {},
  cloudflareAutonomous = {},
  cloudflareInsights = {},
  cloudflareDecision = {},
  cloudflareAutomation = {},
  cloudflareCertification = {},
  cloudflareCrossDivision = {},
  cloudflareOrchestration = {},
  cloudflareExecution = {},
  cloudflareAdaptive = {},
  cloudflarePredictive = {},
  cloudflareStrategic = {},
  cloudflareUcip = {},
  cloudflareAmg = {},
  cloudflareCba = {},
  cloudflareCal = {},
  cloudflareIhl = {},
  cloudflareIarl = {},
  cloudflareAcl = {},
  expandedFederationScore = null,
  triggers = [],
  cloudflareAutonomousHealth = null,
  cloudflareEventsHealth = null
} = {}) {
  const sync = normalizeCrossDivisionFields(cloudflareCrossDivision);
  const eventsHealth = cloudflareEventsHealth != null ? cloudflareEventsHealth : cloudflareAutonomous.cloudflareEvents?.length === 0 ? "optional" : "healthy";
  return {
    cloudflareObservability,
    cloudflareObservabilityHealth: normalizeCloudflareHealth(cloudflareObservability.health),
    cloudflareFederationHealth: federationReadiness.readiness,
    cloudflareFederationScore: expandedFederationScore,
    cloudflareFederationScoreBreakdown: {
      readiness: federationHeartbeat.cloudflareFederationScore,
      autonomous: cloudflareAutonomous.cloudflareSafety?.autonomousScore ?? null,
      insights: cloudflareInsights.cloudflareInsightsScore,
      expanded: expandedFederationScore,
      autonomousTriggers: triggers
    },
    cloudflareFederationSummary: federationReadiness.actionsSummary,
    cloudflareLatencyMs: federationHeartbeat.cloudflareLatencyMs,
    cloudflareOAuthStatus: federationHeartbeat.cloudflareOAuthStatus,
    cloudflareServerStatus: cloudflareObservability.serverStatuses,
    cloudflareDocsServerHealth: cloudflareObservability.docsServerHealth,
    cloudflareLogsHealth: federationHeartbeat.cloudflareLogsHealth,
    cloudflareMetricsHealth: federationHeartbeat.cloudflareMetricsHealth,
    cloudflareBuildHealth: federationHeartbeat.cloudflareBuildHealth,
    cloudflareBindingHealth: federationHeartbeat.cloudflareBindingHealth,
    cloudflareDocsHealth: federationHeartbeat.cloudflareDocsHealth,
    cloudflareAutonomousScore: cloudflareAutonomous.cloudflareSafety?.autonomousScore ?? null,
    cloudflareAutonomousWarnings: cloudflareAutonomous.cloudflareSafety?.autonomousWarnings || [],
    cloudflareLatencyRisk: cloudflareAutonomous.cloudflareSafety?.latencyRisk || "low",
    cloudflareOAuthRisk: cloudflareAutonomous.cloudflareSafety?.oauthRisk || "low",
    cloudflareEventHooks: cloudflareAutonomous.cloudflareEvents || {},
    cloudflareAutonomousSignals: cloudflareAutonomous.cloudflareGovernance?.autonomousSignals || {},
    cloudflareAutonomousHealth: normalizeCloudflareHealth(
      cloudflareAutonomousHealth ?? (cloudflareAutonomous.cloudflareGovernance?.health || (triggers.length ? "advisory" : "healthy"))
    ),
    cloudflareInsightsHealth: normalizeCloudflareHealth(cloudflareInsights.health),
    cloudflareInsightsScore: cloudflareInsights.cloudflareInsightsScore,
    cloudflareInsights: cloudflareInsights.cloudflareInsights,
    cloudflareEventsHealth: normalizeCloudflareHealth(eventsHealth),
    cloudflareDecisionHealth: normalizeCloudflareHealth(cloudflareDecision.decision),
    cloudflareDecisionScore: cloudflareDecision.score,
    cloudflareDecisionReasons: cloudflareDecision.reasons || [],
    cloudflareDecisionSummary: cloudflareDecision.summary,
    cloudflareDecision: cloudflareDecision.decision,
    cloudflareDecisionRiskBadges: cloudflareDecision.riskBadges,
    cloudflareAutomationHealth: normalizeCloudflareHealth(
      cloudflareAutomation.health || (cloudflareAutomation.activeCount > 0 ? "advisory" : "healthy")
    ),
    cloudflareAutomationScore: normalizeCloudflareScore(
      cloudflareAutomation.score ?? (cloudflareAutomation.activeCount != null ? 100 - cloudflareAutomation.activeCount * 15 : 50)
    ),
    cloudflareAutomationReasons: cloudflareAutomation.reasons || [],
    cloudflareAutomationLoops: cloudflareAutomation.loops || {},
    cloudflareCertificationHealth: normalizeCloudflareHealth(cloudflareCertification.aggregate?.status),
    cloudflareCertificationScore: cloudflareCertification.aggregate?.score ?? null,
    cloudflareCertificationReasons: cloudflareCertification.aggregate?.reasons || [],
    cloudflareCrossDivisionScore: sync.crossDivisionScore,
    cloudflareCrossDivisionHealth: sync.crossDivisionHealth,
    cloudflareCrossDivisionReasons: sync.crossDivisionReasons,
    cloudflareCrossDivisionSyncStatus: sync.syncStatus || "partial",
    cloudflareCrossDivisionSync: sync,
    cloudflareOrchestrationHealth: normalizeCloudflareHealth(cloudflareOrchestration.orchestrationHealth),
    cloudflareOrchestrationScore: cloudflareOrchestration.orchestrationScore ?? null,
    cloudflareOrchestrationReasons: cloudflareOrchestration.orchestrationReasons || [],
    cloudflareOrchestrationPlan: cloudflareOrchestration.plan || [],
    cloudflareAgentSignals: cloudflareOrchestration.cloudflareAgentSignals || cloudflareOrchestration.agents || {},
    cloudflareExecutionHealth: normalizeCloudflareHealth(cloudflareExecution.executionHealth),
    cloudflareExecutionScore: cloudflareExecution.executionScore ?? null,
    cloudflareExecutionReasons: cloudflareExecution.executionReasons || [],
    cloudflareExecutionPlan: cloudflareExecution.executionPlan || [],
    cloudflareExecutionNextActions: cloudflareExecution.nextActions || [],
    cloudflareExecutionSignals: cloudflareExecution.cloudflareExecutionSignals || {},
    cloudflareAdaptiveHealth: normalizeCloudflareHealth(cloudflareAdaptive.adaptiveHealth),
    cloudflareAdaptiveScore: cloudflareAdaptive.adaptiveScore,
    cloudflareAdaptiveMode: cloudflareAdaptive.adaptiveState?.mode || "caution",
    cloudflareAdaptiveReasons: cloudflareAdaptive.adaptiveState?.reasons || [],
    cloudflareAdaptiveUiHints: cloudflareAdaptive.uiHints || [],
    cloudflareAdaptiveOperatorGuidance: cloudflareAdaptive.operatorGuidance || [],
    cloudflarePredictiveHealth: normalizeCloudflareHealth(cloudflarePredictive.predictiveHealth),
    cloudflarePredictiveScore: cloudflarePredictive.predictiveScore,
    cloudflarePredictiveMode: cloudflarePredictive.predictiveState?.forecastMode || "watch",
    cloudflarePredictiveReasons: cloudflarePredictive.predictiveState?.forecastReasons || [],
    cloudflarePredictiveForecast: cloudflarePredictive.predictions || [],
    cloudflarePredictivePreemptiveActions: cloudflarePredictive.recommendedPreemptiveActions || [],
    cloudflareStrategicHealth: normalizeCloudflareHealth(cloudflareStrategic.strategicHealth),
    cloudflareStrategicScore: cloudflareStrategic.strategicScore,
    cloudflareStrategicHorizon: cloudflareStrategic.strategicState?.horizon || "short",
    cloudflareStrategicStripMode: cloudflareStrategic.strategicState?.stripMode || "watch",
    cloudflareStrategicReasons: cloudflareStrategic.strategicState?.planReasons || [],
    cloudflareStrategicPlan: cloudflareStrategic.strategicPlan || [],
    cloudflareStrategicThemes: cloudflareStrategic.strategicThemes || [],
    cloudflareStrategicCampaigns: cloudflareStrategic.recommendedCampaigns || [],
    cloudflareUCIPHealth: cloudflareUcip.ucipHealth || cloudflareUcip.ucipState?.health || "optional",
    cloudflareUCIPScore: cloudflareUcip.ucipScore ?? cloudflareUcip.ucipState?.score ?? null,
    cloudflareUCIPMode: cloudflareUcip.ucipState?.mode || "yellow",
    cloudflareUCIPReasons: cloudflareUcip.ucipReasons || [],
    cloudflareUCIPRecommendedActions: cloudflareUcip.ucipRecommendedActions || [],
    cloudflareUCIPCampaigns: cloudflareUcip.ucipCampaigns || [],
    cloudflareUCIPSignals: cloudflareUcip.ucipSignals || {},
    cloudflareAMGHealth: cloudflareAmg.amgHealth || cloudflareAmg.amgState?.health || "optional",
    cloudflareAMGScore: cloudflareAmg.amgScore ?? cloudflareAmg.amgState?.score ?? null,
    cloudflareAMGMode: cloudflareAmg.amgState?.mode || "govern_yellow",
    cloudflareAMGReasons: cloudflareAmg.amgReasons || [],
    cloudflareAMGRules: cloudflareAmg.amgRules || [],
    cloudflareAMGOperatorNudges: cloudflareAmg.amgOperatorNudges || [],
    cloudflareAMGPolicyHints: cloudflareAmg.amgPolicyHints || [],
    cloudflareCBAHealth: cloudflareCba.cbaHealth || cloudflareCba.cbaState?.health || "optional",
    cloudflareCBAScore: cloudflareCba.cbaScore ?? cloudflareCba.cbaState?.score ?? null,
    cloudflareCBAMode: cloudflareCba.cbaState?.mode || "behavior_yellow",
    cloudflareCBABehaviorPatterns: cloudflareCba.cbaBehaviorPatterns || [],
    cloudflareCBABehaviorDriftWarnings: cloudflareCba.cbaBehaviorDriftWarnings || [],
    cloudflareCBAOperatorBehaviorHints: cloudflareCba.cbaOperatorBehaviorHints || [],
    cloudflareCBASystemBehaviorHints: cloudflareCba.cbaSystemBehaviorHints || [],
    cloudflareCBAReasons: cloudflareCba.cbaReasons || [],
    cloudflareCALHealth: cloudflareCal.calHealth || cloudflareCal.calState?.health || "optional",
    cloudflareCALScore: cloudflareCal.calScore ?? cloudflareCal.calState?.score ?? null,
    cloudflareCALMode: cloudflareCal.calState?.mode || "align_yellow",
    cloudflareCALAlignmentFindings: cloudflareCal.calAlignmentFindings || [],
    cloudflareCALAlignmentWarnings: cloudflareCal.calAlignmentWarnings || [],
    cloudflareCALOperatorAlignmentHints: cloudflareCal.calOperatorAlignmentHints || [],
    cloudflareCALSystemAlignmentHints: cloudflareCal.calSystemAlignmentHints || [],
    cloudflareCALReasons: cloudflareCal.calReasons || [],
    cloudflareIHLHealth: cloudflareIhl.ihlHealth || cloudflareIhl.ihlState?.health || "optional",
    cloudflareIHLScore: cloudflareIhl.ihlScore ?? cloudflareIhl.ihlState?.score ?? null,
    cloudflareIHLMode: cloudflareIhl.ihlState?.mode || "intent_yellow",
    cloudflareIHLIntentFindings: cloudflareIhl.ihlIntentFindings || [],
    cloudflareIHLIntentWarnings: cloudflareIhl.ihlIntentWarnings || [],
    cloudflareIHLOperatorIntentHints: cloudflareIhl.ihlOperatorIntentHints || [],
    cloudflareIHLSystemIntentHints: cloudflareIhl.ihlSystemIntentHints || [],
    cloudflareIHLReasons: cloudflareIhl.ihlReasons || [],
    cloudflareIARLHealth: cloudflareIarl.iarlHealth || cloudflareIarl.iarlState?.health || "optional",
    cloudflareIARLScore: cloudflareIarl.iarlScore ?? cloudflareIarl.iarlState?.score ?? null,
    cloudflareIARLMode: cloudflareIarl.iarlState?.mode || "resonance_yellow",
    cloudflareIARLResonanceFindings: cloudflareIarl.iarlResonanceFindings || [],
    cloudflareIARLResonanceWarnings: cloudflareIarl.iarlResonanceWarnings || [],
    cloudflareIARLOperatorResonanceHints: cloudflareIarl.iarlOperatorResonanceHints || [],
    cloudflareIARLSystemResonanceHints: cloudflareIarl.iarlSystemResonanceHints || [],
    cloudflareIARLReasons: cloudflareIarl.iarlReasons || [],
    cloudflareACLHealth: cloudflareAcl.aclHealth || cloudflareAcl.aclState?.health || "optional",
    cloudflareACLScore: cloudflareAcl.aclScore ?? cloudflareAcl.aclState?.score ?? null,
    cloudflareACLMode: cloudflareAcl.aclState?.mode || "coherence_yellow",
    cloudflareACLCoherenceFindings: cloudflareAcl.aclCoherenceFindings || [],
    cloudflareACLCoherenceWarnings: cloudflareAcl.aclCoherenceWarnings || [],
    cloudflareACLOperatorCoherenceHints: cloudflareAcl.aclOperatorCoherenceHints || [],
    cloudflareACLSystemCoherenceHints: cloudflareAcl.aclSystemCoherenceHints || [],
    cloudflareACLReasons: cloudflareAcl.aclReasons || [],
    advisoryOnly: true
  };
}
__name(buildCloudflareHeartbeatFields, "buildCloudflareHeartbeatFields");
var CLOUDFLARE_FEDERATION_ROUTES = [
  {
    domain: "automation",
    route: "/api/os/cloudflare/automation",
    purpose: "Advisory automation loops for logs, metrics, build, bindings, OAuth, and latency signals.",
    layer: "automation"
  },
  {
    domain: "autonomous",
    route: "/api/os/cloudflare/autonomous",
    purpose: "Governance, safety, and event-hook snapshot from autonomous Cloudflare signal inputs.",
    layer: "autonomous"
  },
  {
    domain: "decision",
    route: "/api/os/cloudflare/decision",
    purpose: "Proceed / caution / hold advisory from federation, insights, and autonomous signals.",
    layer: "decision"
  },
  {
    domain: "certification",
    route: "/api/os/cloudflare/certification",
    aliasOf: "/api/marketplace/certification",
    purpose: "Marketplace module Cloudflare certification scores and compatibility advisories.",
    layer: "certification"
  },
  {
    domain: "sync",
    route: "/api/os/cloudflare/sync",
    purpose: "Cross-division sync comparison between operator-shell and marketplace-backend.",
    layer: "sync"
  },
  {
    domain: "cross-division",
    route: "/api/os/cloudflare/cross-division",
    purpose: "Prefixed cross-division federation view with routes and division snapshots.",
    layer: "sync"
  },
  {
    domain: "orchestration",
    route: "/api/os/cloudflare/orchestration",
    purpose: "Multi-agent orchestration plan and recommended actions across divisions.",
    layer: "orchestration"
  },
  {
    domain: "execution",
    route: "/api/os/cloudflare/execution",
    purpose: "Execution plan and next actions derived from orchestration and sync signals.",
    layer: "execution"
  },
  {
    domain: "adaptive",
    route: "/api/os/cloudflare/adaptive",
    purpose: "Adaptive runtime mode, UI hints, and operator guidance from federation signals.",
    layer: "adaptive"
  },
  {
    domain: "predictive",
    route: "/api/os/cloudflare/predictive",
    purpose: "Predictive forecasts for drift, module risk, and pipeline advisories.",
    layer: "predictive"
  },
  {
    domain: "strategic",
    route: "/api/os/cloudflare/strategic",
    purpose: "Medium-horizon strategic plans, themes, and recommended campaigns.",
    layer: "strategic"
  },
  {
    domain: "ucip",
    route: "/api/os/cloudflare/ucip",
    purpose: "Unified Cloudflare Intelligence Plane synthesizing all federation layers into one advisory signal.",
    layer: "ucip"
  },
  {
    domain: "amg",
    route: "/api/os/cloudflare/amg",
    purpose: "Autonomous Meta-Governance: advisory rules, nudges, and policy hints derived from UCIP.",
    layer: "amg"
  },
  {
    domain: "cba",
    route: "/api/os/cloudflare/cba",
    purpose: "Behavioral Autonomy: advisory behavior patterns and drift warnings from AMG + UCIP.",
    layer: "cba"
  },
  {
    domain: "cal",
    route: "/api/os/cloudflare/cal",
    purpose: "Cognitive Alignment Layer: unified alignment signal from CBA + AMG + UCIP.",
    layer: "cal"
  },
  {
    domain: "ihl",
    route: "/api/os/cloudflare/ihl",
    purpose: "Intent Harmonization Layer: unified intent signal from CAL + CBA + AMG + UCIP.",
    layer: "ihl"
  },
  {
    domain: "iarl",
    route: "/api/os/cloudflare/iarl",
    purpose: "Intent-to-Action Resonance Layer: evaluates intent vs action resonance from IHL + CAL + CBA + AMG + UCIP.",
    layer: "iarl"
  },
  {
    domain: "acl",
    route: "/api/os/cloudflare/acl",
    purpose: "Autonomous Coherence Layer: OS-wide coherence signal from IARL + IHL + CAL + CBA + AMG + UCIP.",
    layer: "acl"
  }
];
var AUTOMATION_LOOP_IDS = ["logs", "metrics", "build", "bindings", "oauth", "latency"];
var DOMAIN_DEFAULT_SCORES = {
  automation: 50,
  autonomous: 50,
  decision: 50,
  certification: 50,
  sync: 50,
  "cross-division": 50,
  orchestration: 50,
  execution: 50,
  adaptive: 35,
  predictive: 30,
  strategic: 25,
  ucip: 20,
  amg: 15,
  cba: 10,
  cal: 5,
  ihl: 3,
  iarl: 2,
  acl: 1,
  version: 50,
  "meta-stack": 1,
  insights: 0,
  events: 50
};
var ADVISORY_MEMORY_CACHE = /* @__PURE__ */ new Map();
var META_ADVISORY_DOMAINS = /* @__PURE__ */ new Set([
  "ucip",
  "amg",
  "cba",
  "cal",
  "ihl",
  "iarl",
  "acl",
  "version",
  "meta-stack"
]);
var ADVISORY_TIMEOUT_MS = 60;
var ADVISORY_HEAVY_TIMEOUT_MS = 75;
var ADVISORY_VERSION_TIMEOUT_MS = 200;
var ADVISORY_CACHE_TTL_MS = 3e3;
var ADVISORY_VERSION_CACHE_TTL_MS = 5e3;
var ADVISORY_STALE_CACHE_MS = 3e4;
function advisoryCacheKey(domain, suffix = "") {
  return suffix ? `${domain}:${suffix}` : domain;
}
__name(advisoryCacheKey, "advisoryCacheKey");
function readAdvisoryMemoryCache(domain, suffix = "", { allowStale = false } = {}) {
  const entry = ADVISORY_MEMORY_CACHE.get(advisoryCacheKey(domain, suffix));
  if (!entry) {
    return null;
  }
  const age = Date.now() - entry.storedAt;
  if (!allowStale && Date.now() > entry.expiresAt) {
    return null;
  }
  if (allowStale && age > ADVISORY_STALE_CACHE_MS) {
    ADVISORY_MEMORY_CACHE.delete(advisoryCacheKey(domain, suffix));
    return null;
  }
  return entry.payload;
}
__name(readAdvisoryMemoryCache, "readAdvisoryMemoryCache");
function writeAdvisoryMemoryCache(domain, payload, suffix = "", ttlMs = ADVISORY_CACHE_TTL_MS) {
  ADVISORY_MEMORY_CACHE.set(advisoryCacheKey(domain, suffix), {
    payload,
    expiresAt: Date.now() + ttlMs,
    storedAt: Date.now()
  });
}
__name(writeAdvisoryMemoryCache, "writeAdvisoryMemoryCache");
function createAdvisoryTimeoutError(domain) {
  const error = new Error(`Cloudflare advisory timeout for ${domain}`);
  error.name = "AdvisoryTimeoutError";
  return error;
}
__name(createAdvisoryTimeoutError, "createAdvisoryTimeoutError");
async function withAdvisoryTimeout(handler, domain, timeoutMs = ADVISORY_TIMEOUT_MS) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(createAdvisoryTimeoutError(domain)), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(handler), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}
__name(withAdvisoryTimeout, "withAdvisoryTimeout");
function isCloudflareAdvisoryDegraded(payload = {}) {
  return Boolean(
    payload.advisoryDegraded || payload.degraded || payload.federationMeta?.stale || payload.federationMeta?.failureKind
  );
}
__name(isCloudflareAdvisoryDegraded, "isCloudflareAdvisoryDegraded");
function classifyCloudflareFailure(error) {
  const message = String(error?.message || error || "Unknown error");
  if (/AdvisoryTimeout|advisory timeout/i.test(message)) {
    return "timeout";
  }
  if (/oauth|401|403|requires.?oauth/i.test(message)) {
    return "requires_oauth";
  }
  if (/mcp|offline|probe timeout|initialize failed|no content from/i.test(message)) {
    return "mcp_offline";
  }
  if (/upstream|engine|fetch|timeout|unreachable|ECONNREFUSED|1102|503/i.test(message)) {
    return "upstream_unreachable";
  }
  return "degraded";
}
__name(classifyCloudflareFailure, "classifyCloudflareFailure");
function buildDegradedReason(error, domain) {
  const kind = classifyCloudflareFailure(error);
  const message = String(error?.message || error || `${domain} unavailable.`);
  switch (kind) {
    case "requires_oauth":
      return "Cloudflare MCP OAuth required; federation remains advisory-only.";
    case "mcp_offline":
      return "Cloudflare MCP offline; using minimal advisory payload.";
    case "upstream_unreachable":
      return "Upstream engine unreachable; federation signals degraded.";
    case "timeout":
      return "Advisory layer timed out; serving cached or minimal fallback.";
    default:
      return message;
  }
}
__name(buildDegradedReason, "buildDegradedReason");
function idleAutomationLoops(checkedAt, reason) {
  const loops = {};
  for (const id of AUTOMATION_LOOP_IDS) {
    loops[id] = {
      active: false,
      lastSignal: "unavailable",
      recommendedAction: reason,
      lastRun: checkedAt
    };
  }
  return loops;
}
__name(idleAutomationLoops, "idleAutomationLoops");
function buildCloudflareAdvisoryFallback(domain, error, overrides = {}) {
  const checkedAt = (/* @__PURE__ */ new Date()).toISOString();
  const reason = buildDegradedReason(error, domain);
  const reasons = [reason];
  const score2 = DOMAIN_DEFAULT_SCORES[domain] ?? 50;
  const health = domain === "adaptive" || domain === "predictive" || domain === "strategic" ? "degraded" : "advisory";
  const base = {
    advisoryOnly: true,
    advisoryDegraded: true,
    checkedAt,
    degraded: true,
    federationMeta: {
      domain,
      health,
      score: score2,
      reasons,
      failureKind: classifyCloudflareFailure(error)
    },
    ...error?.message ? { error: error.message } : {}
  };
  switch (domain) {
    case "sync":
      return {
        ...base,
        operatorShell: {},
        marketplaceBackend: {},
        syncStatus: "partial",
        crossDivisionScore: score2,
        crossDivisionHealth: health,
        crossDivisionReasons: reasons,
        ...overrides
      };
    case "cross-division":
      return {
        ...base,
        cloudflareCrossDivisionScore: score2,
        cloudflareCrossDivisionHealth: health,
        cloudflareCrossDivisionReasons: reasons,
        syncStatus: "partial",
        operatorShell: {},
        marketplaceBackend: {},
        routes: {},
        sources: {},
        ...overrides
      };
    case "automation":
      return {
        ...base,
        loops: idleAutomationLoops(checkedAt, reason),
        activeCount: 0,
        health,
        score: score2,
        reasons,
        mode: "idle",
        ...overrides
      };
    case "autonomous":
      return {
        ...base,
        cloudflareGovernance: {
          health: "degraded",
          autonomousSignals: { triggers: [], advisories: [], signals: {} }
        },
        cloudflareSafety: {
          autonomousScore: score2,
          latencyRisk: "unknown",
          oauthRisk: "unknown",
          autonomousWarnings: reasons
        },
        cloudflareEvents: [],
        eventHooks: { simulated: true, cloudflareEvents: [] },
        ...overrides
      };
    case "decision":
      return {
        ...base,
        decision: "caution",
        score: score2,
        reasons,
        riskBadges: { latency: "unknown", oauth: "unknown" },
        summary: { triggerCount: 0 },
        route: "/api/os/cloudflare/decision",
        ...overrides
      };
    case "certification":
      return {
        ...base,
        certifications: {},
        modules: [],
        aggregate: {
          status: "review",
          score: score2,
          reasons,
          advisoryOnly: true
        },
        ...overrides
      };
    case "orchestration":
      return {
        ...base,
        plan: [],
        agents: {},
        recommendedActions: reasons,
        orchestrationScore: score2,
        orchestrationHealth: health,
        orchestrationReasons: reasons,
        syncStatus: "partial",
        ...overrides
      };
    case "execution":
      return {
        ...base,
        executionPlan: [],
        nextActions: reasons,
        executionScore: score2,
        executionHealth: health,
        executionReasons: reasons,
        syncStatus: "partial",
        ...overrides
      };
    case "execution-signals":
      return {
        ...base,
        cloudflareExecutionSignals: {
          operatorShell: { executionReadiness: "review", advisoryOnly: true },
          marketplaceBackend: { executionReadiness: "review", advisoryOnly: true },
          crossDivision: { syncStatus: "partial", executionReadiness: "review", advisoryOnly: true }
        },
        ...overrides
      };
    case "agents":
      return {
        ...base,
        cloudflareAgentSignals: {
          operatorShell: { health: "optional", advisoryOnly: true },
          marketplaceBackend: { health: "optional", advisoryOnly: true },
          crossDivision: { syncStatus: "partial", advisoryOnly: true }
        },
        ...overrides
      };
    case "adaptive":
      return {
        ...base,
        adaptiveState: { mode: "degraded", reasons, score: score2 },
        uiHints: [{ surface: "operator", hint: reason, priority: "high" }],
        operatorGuidance: ["Federation remains optional; complete OAuth when ready."],
        adaptiveScore: score2,
        adaptiveHealth: health,
        ...overrides
      };
    case "predictive":
      return {
        ...base,
        predictiveState: {
          forecastMode: "fallback",
          forecastScore: score2,
          forecastReasons: reasons
        },
        predictions: [],
        recommendedPreemptiveActions: ["Federation remains optional; complete OAuth when ready."],
        predictiveScore: score2,
        predictiveHealth: health,
        ...overrides
      };
    case "strategic":
      return {
        ...base,
        strategicState: {
          horizon: "short",
          planScore: score2,
          planReasons: reasons,
          stripMode: "prioritize"
        },
        strategicPlan: [
          {
            action: "Use short-horizon advisory plan until Cloudflare signals recover.",
            horizon: "short",
            theme: "risk_reduction",
            priority: "high"
          }
        ],
        strategicThemes: ["risk_reduction"],
        recommendedCampaigns: ["Signal Recovery Check"],
        strategicScore: score2,
        strategicHealth: health,
        ...overrides
      };
    case "ucip":
      return {
        ...base,
        ucipState: {
          mode: "red",
          score: score2,
          health: "degraded",
          horizon: "short",
          stripMode: "prioritize"
        },
        ucipReasons: reasons,
        ucipSignals: {},
        ucipRecommendedActions: ["Use minimal advisory payload until Cloudflare signals recover."],
        ucipCampaigns: ["Signal Recovery Check"],
        ucipHealth: "degraded",
        ucipScore: score2,
        mode: "red",
        ...overrides
      };
    case "amg":
      return {
        ...base,
        amgState: {
          mode: "govern_red",
          score: score2,
          health: "degraded"
        },
        amgRules: [
          {
            id: "amg-fallback",
            rule: "UCIP degraded: use minimal AMG governance fallback until signals recover.",
            surface: "os",
            priority: "critical"
          }
        ],
        amgOperatorNudges: [
          { surface: "operator", nudge: "Restore Cloudflare MCP OAuth or upstream UCIP signals.", priority: "critical" }
        ],
        amgPolicyHints: [
          { surface: "os", hint: "AMG fallback active; federation guidance is advisory-only." }
        ],
        amgReasons: reasons,
        amgHealth: "degraded",
        amgScore: score2,
        mode: "govern_red",
        ...overrides
      };
    case "cba":
      return {
        ...base,
        cbaState: {
          mode: "behavior_red",
          score: score2,
          health: "degraded"
        },
        cbaBehaviorPatterns: [
          { id: "cba-fallback", pattern: "AMG/UCIP degraded: minimal behavioral advisory payload.", surface: "os" }
        ],
        cbaBehaviorDriftWarnings: ["Upstream AMG or UCIP degraded; behavioral drift cannot be fully assessed."],
        cbaOperatorBehaviorHints: ["Restore UCIP/AMG signals before relying on behavioral guidance."],
        cbaSystemBehaviorHints: ["CBA fallback active; advisory-only behavioral hints."],
        cbaReasons: reasons,
        cbaHealth: "degraded",
        cbaScore: score2,
        mode: "behavior_red",
        ...overrides
      };
    case "cal":
      return {
        ...base,
        calState: {
          mode: "align_red",
          score: score2,
          health: "degraded"
        },
        calAlignmentFindings: [
          {
            id: "cal-fallback",
            finding: "CBA/AMG/UCIP degraded: minimal cognitive alignment advisory payload.",
            surface: "os",
            aligned: false
          }
        ],
        calAlignmentWarnings: ["Upstream CBA, AMG, or UCIP degraded; cognitive alignment cannot be fully assessed."],
        calOperatorAlignmentHints: ["Restore UCIP/AMG/CBA signals before relying on alignment guidance."],
        calSystemAlignmentHints: ["CAL fallback active; advisory-only alignment hints."],
        calReasons: reasons,
        calHealth: "degraded",
        calScore: score2,
        mode: "align_red",
        ...overrides
      };
    case "ihl":
      return {
        ...base,
        ihlState: {
          mode: "intent_red",
          score: score2,
          health: "degraded"
        },
        ihlIntentFindings: [
          {
            id: "ihl-fallback",
            finding: "CAL/CBA/AMG/UCIP degraded: minimal intent harmonization advisory payload.",
            surface: "os",
            harmonized: false
          }
        ],
        ihlIntentWarnings: ["Upstream CAL, CBA, AMG, or UCIP degraded; intent harmonization cannot be fully assessed."],
        ihlOperatorIntentHints: ["Restore UCIP/AMG/CBA/CAL signals before relying on intent guidance."],
        ihlSystemIntentHints: ["IHL fallback active; advisory-only intent hints."],
        ihlReasons: reasons,
        ihlHealth: "degraded",
        ihlScore: score2,
        mode: "intent_red",
        ...overrides
      };
    case "iarl":
      return {
        ...base,
        iarlState: {
          mode: "resonance_red",
          score: score2,
          health: "degraded"
        },
        iarlResonanceFindings: [
          {
            id: "iarl-fallback",
            finding: "IHL/CAL/CBA/AMG/UCIP degraded: minimal intent-to-action resonance advisory payload.",
            surface: "os",
            resonant: false
          }
        ],
        iarlResonanceWarnings: ["Upstream IHL, CAL, CBA, AMG, or UCIP degraded; resonance cannot be fully assessed."],
        iarlOperatorResonanceHints: ["Restore UCIP/AMG/CBA/CAL/IHL signals before relying on resonance guidance."],
        iarlSystemResonanceHints: ["IARL fallback active; advisory-only resonance hints."],
        iarlReasons: reasons,
        iarlHealth: "degraded",
        iarlScore: score2,
        mode: "resonance_red",
        ...overrides
      };
    case "acl":
      return {
        ...base,
        aclState: {
          mode: "coherence_red",
          score: score2,
          health: "degraded"
        },
        aclCoherenceFindings: [
          {
            id: "acl-fallback",
            finding: "IARL/IHL/CAL/CBA/AMG/UCIP degraded: minimal autonomous coherence advisory payload.",
            surface: "os",
            coherent: false
          }
        ],
        aclCoherenceWarnings: ["Upstream IARL, IHL, CAL, CBA, AMG, or UCIP degraded; coherence cannot be fully assessed."],
        aclOperatorCoherenceHints: ["Restore UCIP/AMG/CBA/CAL/IHL/IARL signals before relying on coherence guidance."],
        aclSystemCoherenceHints: ["ACL fallback active; advisory-only coherence hints."],
        aclReasons: reasons,
        aclHealth: "degraded",
        aclScore: score2,
        mode: "coherence_red",
        ...overrides
      };
    case "insights":
      return {
        ...base,
        cloudflareInsights: { recommendations: [] },
        cloudflareInsightsScore: score2,
        health,
        ...overrides
      };
    case "events":
      return {
        ...base,
        simulated: true,
        cloudflareEvents: [],
        ...overrides
      };
    case "version":
      return buildCloudflareVersionHealthFallback(error, { ...base, ...overrides });
    case "meta-stack":
      return {
        ...base,
        cloudflareAmg: buildCloudflareAdvisoryFallback("amg", error),
        cloudflareCba: buildCloudflareAdvisoryFallback("cba", error),
        cloudflareCal: buildCloudflareAdvisoryFallback("cal", error),
        cloudflareIhl: buildCloudflareAdvisoryFallback("ihl", error),
        cloudflareIarl: buildCloudflareAdvisoryFallback("iarl", error),
        cloudflareAcl: buildCloudflareAdvisoryFallback("acl", error),
        ...overrides
      };
    default:
      return { ...base, reasons, ...overrides };
  }
}
__name(buildCloudflareAdvisoryFallback, "buildCloudflareAdvisoryFallback");
function buildCloudflareVersionHealthFallback(error, overrides = {}) {
  const score2 = DOMAIN_DEFAULT_SCORES.version;
  const reason = buildDegradedReason(error, "version");
  return {
    advisoryOnly: true,
    advisoryDegraded: true,
    degraded: true,
    health: "degraded",
    reasons: [reason],
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    cloudflareFederationHealth: "degraded",
    cloudflareAutonomousHealth: "optional",
    cloudflareInsightsHealth: "optional",
    cloudflareDecisionHealth: "advisory",
    cloudflareAutomationHealth: "optional",
    cloudflareCertificationHealth: "optional",
    cloudflareCrossDivisionHealth: "optional",
    cloudflareOrchestrationHealth: "optional",
    cloudflareExecutionHealth: "optional",
    cloudflareAdaptiveHealth: "degraded",
    cloudflareAdaptiveMode: "degraded",
    cloudflarePredictiveHealth: "degraded",
    cloudflarePredictiveMode: "fallback",
    cloudflareStrategicHealth: "degraded",
    cloudflareStrategicHorizon: "short",
    cloudflareUCIPHealth: "degraded",
    cloudflareUCIPScore: DOMAIN_DEFAULT_SCORES.ucip,
    cloudflareUCIPMode: "red",
    cloudflareAMGHealth: "degraded",
    cloudflareAMGScore: DOMAIN_DEFAULT_SCORES.amg,
    cloudflareAMGMode: "govern_red",
    cloudflareCBAHealth: "degraded",
    cloudflareCBAScore: DOMAIN_DEFAULT_SCORES.cba,
    cloudflareCBAMode: "behavior_red",
    cloudflareCALHealth: "degraded",
    cloudflareCALScore: DOMAIN_DEFAULT_SCORES.cal,
    cloudflareCALMode: "align_red",
    cloudflareIHLHealth: "degraded",
    cloudflareIHLScore: DOMAIN_DEFAULT_SCORES.ihl,
    cloudflareIHLMode: "intent_red",
    cloudflareIARLHealth: "degraded",
    cloudflareIARLScore: DOMAIN_DEFAULT_SCORES.iarl,
    cloudflareIARLMode: "resonance_red",
    cloudflareACLHealth: "degraded",
    cloudflareACLScore: DOMAIN_DEFAULT_SCORES.acl,
    cloudflareACLMode: "coherence_red",
    cloudflareAutonomousScore: score2,
    cloudflareInsightsScore: score2,
    cloudflareDecisionScore: score2,
    cloudflareCertificationScore: score2,
    cloudflareCrossDivisionScore: score2,
    cloudflareOrchestrationScore: score2,
    cloudflareExecutionScore: score2,
    cloudflareAdaptiveScore: DOMAIN_DEFAULT_SCORES.adaptive,
    cloudflarePredictiveScore: DOMAIN_DEFAULT_SCORES.predictive,
    cloudflareStrategicScore: DOMAIN_DEFAULT_SCORES.strategic,
    federationMeta: {
      domain: "version",
      health: "degraded",
      score: score2,
      reasons: [reason],
      failureKind: classifyCloudflareFailure(error)
    },
    ...overrides
  };
}
__name(buildCloudflareVersionHealthFallback, "buildCloudflareVersionHealthFallback");
function flattenCloudflareVersionHealthResponse(health = {}) {
  return {
    cloudflareMcpHealth: health,
    cloudflareFederationHealth: health.cloudflareFederationHealth ?? health.health ?? "optional",
    cloudflareAutonomousHealth: health.cloudflareAutonomousHealth ?? "optional",
    cloudflareInsightsHealth: health.cloudflareInsightsHealth ?? "optional",
    cloudflareAutonomousScore: health.cloudflareAutonomousScore ?? null,
    cloudflareInsightsScore: health.cloudflareInsightsScore ?? null,
    cloudflareDecisionHealth: health.cloudflareDecisionHealth ?? "optional",
    cloudflareDecisionScore: health.cloudflareDecisionScore ?? null,
    cloudflareAutomationHealth: health.cloudflareAutomationHealth ?? "optional",
    cloudflareCertificationHealth: health.cloudflareCertificationHealth ?? "optional",
    cloudflareCertificationScore: health.cloudflareCertificationScore ?? null,
    cloudflareCrossDivisionHealth: health.cloudflareCrossDivisionHealth ?? "optional",
    cloudflareCrossDivisionScore: health.cloudflareCrossDivisionScore ?? null,
    cloudflareOrchestrationHealth: health.cloudflareOrchestrationHealth ?? "optional",
    cloudflareOrchestrationScore: health.cloudflareOrchestrationScore ?? null,
    cloudflareExecutionHealth: health.cloudflareExecutionHealth ?? "optional",
    cloudflareExecutionScore: health.cloudflareExecutionScore ?? null,
    cloudflareAdaptiveHealth: health.cloudflareAdaptiveHealth ?? "optional",
    cloudflareAdaptiveScore: health.cloudflareAdaptiveScore ?? null,
    cloudflareAdaptiveMode: health.cloudflareAdaptiveMode ?? null,
    cloudflarePredictiveHealth: health.cloudflarePredictiveHealth ?? "optional",
    cloudflarePredictiveScore: health.cloudflarePredictiveScore ?? null,
    cloudflarePredictiveMode: health.cloudflarePredictiveMode ?? null,
    cloudflareStrategicHealth: health.cloudflareStrategicHealth ?? "optional",
    cloudflareStrategicScore: health.cloudflareStrategicScore ?? null,
    cloudflareStrategicHorizon: health.cloudflareStrategicHorizon ?? null,
    cloudflareUCIPHealth: health.cloudflareUCIPHealth ?? "optional",
    cloudflareUCIPScore: health.cloudflareUCIPScore ?? null,
    cloudflareUCIPMode: health.cloudflareUCIPMode ?? null,
    cloudflareAMGHealth: health.cloudflareAMGHealth ?? "optional",
    cloudflareAMGScore: health.cloudflareAMGScore ?? null,
    cloudflareAMGMode: health.cloudflareAMGMode ?? null,
    cloudflareCBAHealth: health.cloudflareCBAHealth ?? "optional",
    cloudflareCBAScore: health.cloudflareCBAScore ?? null,
    cloudflareCBAMode: health.cloudflareCBAMode ?? null,
    cloudflareCALHealth: health.cloudflareCALHealth ?? "optional",
    cloudflareCALScore: health.cloudflareCALScore ?? null,
    cloudflareCALMode: health.cloudflareCALMode ?? null,
    cloudflareIHLHealth: health.cloudflareIHLHealth ?? "optional",
    cloudflareIHLScore: health.cloudflareIHLScore ?? null,
    cloudflareIHLMode: health.cloudflareIHLMode ?? null,
    cloudflareIARLHealth: health.cloudflareIARLHealth ?? "optional",
    cloudflareIARLScore: health.cloudflareIARLScore ?? null,
    cloudflareIARLMode: health.cloudflareIARLMode ?? null,
    cloudflareACLHealth: health.cloudflareACLHealth ?? "optional",
    cloudflareACLScore: health.cloudflareACLScore ?? null,
    cloudflareACLMode: health.cloudflareACLMode ?? null,
    cloudflareAdvisoryDegraded: isCloudflareAdvisoryDegraded(health),
    advisoryOnly: true
  };
}
__name(flattenCloudflareVersionHealthResponse, "flattenCloudflareVersionHealthResponse");
function ensureCloudflareAdvisoryEnvelope(payload = {}, domain = "unknown") {
  const normalized = extractDomainNormalizedFields(payload, domain);
  const health = normalized.health;
  const score2 = normalized.score;
  const reasons = normalized.reasons;
  const mode = normalized.mode;
  const routeEntry = CLOUDFLARE_FEDERATION_ROUTES.find((entry) => entry.domain === domain);
  return {
    ...payload,
    health,
    score: score2,
    mode,
    reasons,
    advisoryOnly: payload.advisoryOnly !== false,
    checkedAt: payload.checkedAt || (/* @__PURE__ */ new Date()).toISOString(),
    federationMeta: {
      domain,
      route: routeEntry?.route || null,
      purpose: routeEntry?.purpose || null,
      layer: routeEntry?.layer || domain,
      health,
      score: score2,
      mode,
      reasons,
      ...payload.federationMeta || {}
    }
  };
}
__name(ensureCloudflareAdvisoryEnvelope, "ensureCloudflareAdvisoryEnvelope");
function buildAdvisoryHeartbeatFallback(error = null) {
  const reason = error ? buildDegradedReason(error, "heartbeat") : "Advisory heartbeat unavailable.";
  return {
    cloudflareFederationHealth: "degraded",
    cloudflareFederationScore: DOMAIN_DEFAULT_SCORES.version,
    cloudflareUCIPHealth: "degraded",
    cloudflareUCIPMode: "red",
    cloudflareAMGHealth: "degraded",
    cloudflareAMGMode: "govern_red",
    cloudflareCBAHealth: "degraded",
    cloudflareCBAMode: "behavior_red",
    cloudflareCALHealth: "degraded",
    cloudflareCALMode: "align_red",
    cloudflareIHLHealth: "degraded",
    cloudflareIHLMode: "intent_red",
    cloudflareIARLHealth: "degraded",
    cloudflareIARLMode: "resonance_red",
    cloudflareACLHealth: "degraded",
    cloudflareACLMode: "coherence_red",
    cloudflareAutonomousHealth: "optional",
    cloudflareInsightsHealth: "optional",
    cloudflareDecisionHealth: "advisory",
    cloudflareAutomationHealth: "optional",
    cloudflareCertificationHealth: "optional",
    cloudflareCrossDivisionHealth: "degraded",
    cloudflareCrossDivisionSyncStatus: "partial",
    cloudflareOrchestrationHealth: "optional",
    cloudflareExecutionHealth: "optional",
    cloudflareAdaptiveHealth: "degraded",
    cloudflareAdaptiveMode: "degraded",
    cloudflarePredictiveHealth: "degraded",
    cloudflarePredictiveMode: "fallback",
    cloudflareStrategicHealth: "degraded",
    cloudflareStrategicStripMode: "watch",
    cloudflareAdvisoryDegraded: true,
    cloudflareAdvisoryDegradedReason: reason,
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildAdvisoryHeartbeatFallback, "buildAdvisoryHeartbeatFallback");
async function resolveCloudflareAdvisoryCall(handler, domain, options = {}) {
  const {
    timeoutMs = domain === "version" ? ADVISORY_VERSION_TIMEOUT_MS : META_ADVISORY_DOMAINS.has(domain) ? ADVISORY_HEAVY_TIMEOUT_MS : ADVISORY_TIMEOUT_MS,
    cacheTtlMs = domain === "version" ? ADVISORY_VERSION_CACHE_TTL_MS : ADVISORY_CACHE_TTL_MS,
    cacheKeySuffix = "",
    useCache = true
  } = options;
  if (useCache) {
    const cached = readAdvisoryMemoryCache(domain, cacheKeySuffix);
    if (cached) {
      return {
        ...cached,
        federationMeta: {
          ...cached.federationMeta || {},
          cacheHit: true
        }
      };
    }
  }
  try {
    const raw = await withAdvisoryTimeout(handler, domain, timeoutMs);
    const payload = ensureCloudflareAdvisoryEnvelope(raw, domain);
    if (useCache) {
      writeAdvisoryMemoryCache(domain, payload, cacheKeySuffix, cacheTtlMs);
    }
    return payload;
  } catch (error) {
    const stale = useCache ? readAdvisoryMemoryCache(domain, cacheKeySuffix, { allowStale: true }) : null;
    if (stale) {
      return {
        ...stale,
        advisoryDegraded: true,
        degraded: true,
        federationMeta: {
          ...stale.federationMeta || {},
          cacheHit: true,
          stale: true,
          failureKind: classifyCloudflareFailure(error),
          reasons: [
            buildDegradedReason(error, domain),
            ...(stale.federationMeta?.reasons || []).slice(0, 1)
          ]
        }
      };
    }
    return buildCloudflareAdvisoryFallback(domain, error);
  }
}
__name(resolveCloudflareAdvisoryCall, "resolveCloudflareAdvisoryCall");
async function resolveCloudflareFederationRoute(handler, domain, options = {}) {
  return resolveCloudflareAdvisoryCall(handler, domain, options);
}
__name(resolveCloudflareFederationRoute, "resolveCloudflareFederationRoute");
function getCloudflareFederationRouteCatalog() {
  return {
    routes: CLOUDFLARE_FEDERATION_ROUTES.map((entry) => ({
      ...entry,
      advisoryOnly: true
    })),
    normalizedFields: {
      health: CLOUDFLARE_HEALTH_VALUES,
      score: "0-100",
      mode: "domain-specific status (decision, adaptive mode, forecast, strip, sync)",
      reasons: "string[]",
      topLevel: CLOUDFLARE_NORMALIZED_FIELDS,
      federationMeta: "{ domain, route, purpose, layer, health, score, mode, reasons }"
    },
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareFederationRouteCatalog, "getCloudflareFederationRouteCatalog");
function getCloudflareFederationDocumentation(format = "json") {
  const layers = [
    { name: "Automation", route: "/api/os/cloudflare/automation", summary: "Loop advisories for observability and binding signals." },
    { name: "Autonomous", route: "/api/os/cloudflare/autonomous", summary: "Governance and safety triggers from federation probes." },
    { name: "Decision", route: "/api/os/cloudflare/decision", summary: "PROCEED / CAUTION / HOLD operator guidance." },
    { name: "Certification", route: "/api/os/cloudflare/certification", summary: "Module compatibility and certification scores." },
    { name: "Sync / Cross-division", route: "/api/os/cloudflare/cross-division", summary: "Operator-shell vs marketplace-backend alignment." },
    { name: "Orchestration", route: "/api/os/cloudflare/orchestration", summary: "Multi-agent plan and recommended actions." },
    { name: "Execution", route: "/api/os/cloudflare/execution", summary: "Next execution steps from orchestration context." },
    { name: "Adaptive", route: "/api/os/cloudflare/adaptive", summary: "Runtime mode and UI hints (steady / caution / review / degraded)." },
    { name: "Predictive", route: "/api/os/cloudflare/predictive", summary: "Forecasts for drift, risk, and pipeline advisories." },
    { name: "Strategic", route: "/api/os/cloudflare/strategic", summary: "Medium-horizon plans, themes, and campaigns." },
    { name: "UCIP", route: "/api/os/cloudflare/ucip", summary: "Unified intelligence plane synthesizing all layers into one signal." },
    { name: "AMG", route: "/api/os/cloudflare/amg", summary: "Autonomous Meta-Governance: UCIP-derived rules, nudges, and policy hints." },
    { name: "CBA", route: "/api/os/cloudflare/cba", summary: "Behavioral Autonomy: advisory patterns and drift warnings from AMG + UCIP." },
    { name: "CAL", route: "/api/os/cloudflare/cal", summary: "Cognitive Alignment Layer: unified alignment signal from CBA + AMG + UCIP." },
    { name: "IHL", route: "/api/os/cloudflare/ihl", summary: "Intent Harmonization Layer: unified intent signal from CAL + CBA + AMG + UCIP." },
    { name: "IARL", route: "/api/os/cloudflare/iarl", summary: "Intent-to-Action Resonance Layer: intent vs action resonance from IHL + CAL + CBA + AMG + UCIP." },
    { name: "ACL", route: "/api/os/cloudflare/acl", summary: "Autonomous Coherence Layer: OS-wide coherence from IARL + IHL + CAL + CBA + AMG + UCIP." }
  ];
  const interpretation = {
    acl: {
      COHERENCE_GREEN: "Strong coherence across operator, mission, marketplace, and OS layers.",
      COHERENCE_YELLOW: "Partial coherence; mild fragmentation \u2014 review coherence hints.",
      COHERENCE_ORANGE: "Significant fragmentation or divergent meta-intelligence signals.",
      COHERENCE_RED: "Degraded upstream or severe fragmentation; minimal fallback."
    },
    iarl: {
      RESONANCE_GREEN: "Strong resonance between operator/mission/OS intent and actual actions.",
      RESONANCE_YELLOW: "Partial resonance; mild intent-to-action mismatch \u2014 review resonance hints.",
      RESONANCE_ORANGE: "Significant mismatch or divergent action posture vs harmonized intent.",
      RESONANCE_RED: "Degraded upstream or severe intent-to-action mismatch; minimal fallback."
    },
    ihl: {
      INTENT_GREEN: "Strong intent harmony across operator, mission, and OS layers.",
      INTENT_YELLOW: "Partial harmony; mild intent drift \u2014 review intent hints.",
      INTENT_ORANGE: "Significant intent conflict or divergent governance signals.",
      INTENT_RED: "Degraded upstream or severe intent misalignment; minimal fallback."
    },
    cal: {
      ALIGN_GREEN: "Strong cognitive alignment with UCIP + AMG + CBA; mission and operator posture coherent.",
      ALIGN_YELLOW: "Partial alignment; mild cognitive drift \u2014 review alignment hints.",
      ALIGN_ORANGE: "Significant misalignment or conflicting governance/behavior signals.",
      ALIGN_RED: "Degraded upstream or severe cognitive misalignment; minimal fallback."
    },
    cba: {
      BEHAVIOR_GREEN: "Stable behavior aligned with UCIP + AMG; no significant drift.",
      BEHAVIOR_YELLOW: "Mild drift or inconsistent operator/system behavior; review hints.",
      BEHAVIOR_ORANGE: "Significant drift or conflicting governance signals.",
      BEHAVIOR_RED: "Degraded upstream or severe behavioral drift; minimal fallback."
    },
    amg: {
      GOVERN_GREEN: "Stable UCIP: low-risk governance environment; proceed with optional review.",
      GOVERN_YELLOW: "Caution UCIP: medium-risk; review rules and nudges before promotion.",
      GOVERN_ORANGE: "Alert UCIP: high-risk; defer promotion and follow AMG rules.",
      GOVERN_RED: "Degraded UCIP: fallback governance payload; restore signals."
    },
    ucip: {
      GREEN: "Stable federation posture: proceed + steady + stable forecast.",
      YELLOW: "Caution/watch: review advisories; federation remains optional.",
      ORANGE: "Hold/alert/prioritize: defer promotion; focus strategic actions.",
      RED: "Degraded/fallback: minimal payload; restore OAuth or MCP signals."
    },
    decision: {
      PROCEED: "Signals are healthy enough to continue normal operator workflows.",
      CAUTION: "Review advisories before promotion; federation does not block actions.",
      HOLD: "Defer promotion or autonomous actions until signals improve."
    },
    strategicStrip: {
      STABLE: "No urgent strategic actions; maintain current federation posture.",
      WATCH: "Monitor trends; prepare optional hardening steps.",
      PRIORITIZE: "Focus on top strategic plan items in the next hours\u2013days."
    },
    health: {
      healthy: "Signals within normal advisory thresholds.",
      advisory: "Worth review; optional operator attention.",
      degraded: "Minimal fallback payload; complete OAuth or restore MCP/upstream.",
      optional: "Cloudflare federation not required for core OS operation."
    }
  };
  const doc = {
    title: "Cloudflare Federation \u2014 Operator Guide",
    version: "3.5",
    advisoryOnly: true,
    layers,
    interpretation,
    routes: CLOUDFLARE_FEDERATION_ROUTES,
    surfaces: {
      mission: "UCIP + AMG + CBA + CAL + IHL + IARL + ACL strips; top actions, rules, drift, alignment, intent, resonance, and coherence hints.",
      os: "Heartbeat aggregates cloudflareUCIP*, cloudflareAMG*, cloudflareCBA*, cloudflareCAL*, cloudflareIHL*, cloudflareIARL*, and cloudflareACL* fields.",
      marketplace: "Module badges: UCIP_*, AMG_*, CBA_*, CAL_*, IHL_*, IARL_*, and ACL_ALIGNED / ACL_PARTIAL / ACL_FRAGMENTED.",
      operator: "UCIP + AMG + CBA + CAL + IHL + IARL + Cloudflare Autonomous Coherence Layer panels."
    },
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (format === "html") {
    const layerRows = layers.map(
      (layer) => `<tr><td>${layer.name}</td><td><code>${layer.route}</code></td><td>${layer.summary}</td></tr>`
    ).join("");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cloudflare Federation \u2014 MSHOPS v3.5</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    code { background: #f4f4f5; padding: 0.1rem 0.35rem; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; vertical-align: top; }
    th { background: #fafafa; }
    .note { background: #fffbeb; border: 1px solid #fcd34d; padding: 1rem; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>Cloudflare Federation \u2014 Operator Guide</h1>
  <p class="note"><strong>Advisory only.</strong> Cloudflare federation never blocks core OS pipelines unless explicit governance rules enable blocking. All routes return <code>advisoryOnly: true</code>.</p>
  <h2>Layers (automation \u2192 strategic)</h2>
  <table><thead><tr><th>Layer</th><th>Route</th><th>Summary</th></tr></thead><tbody>${layerRows}</tbody></table>
  <h2>Reading Mission signals</h2>
  <ul>
    <li><strong>PROCEED</strong> \u2014 ${interpretation.decision.PROCEED}</li>
    <li><strong>CAUTION</strong> \u2014 ${interpretation.decision.CAUTION}</li>
    <li><strong>HOLD</strong> \u2014 ${interpretation.decision.HOLD}</li>
  </ul>
  <h2>Strategic strip</h2>
  <ul>
    <li><strong>STABLE</strong> \u2014 ${interpretation.strategicStrip.STABLE}</li>
    <li><strong>WATCH</strong> \u2014 ${interpretation.strategicStrip.WATCH}</li>
    <li><strong>PRIORITIZE</strong> \u2014 ${interpretation.strategicStrip.PRIORITIZE}</li>
  </ul>
  <h2>UCIP (Unified Cloudflare Intelligence Plane)</h2>
  <p>Single synthesized signal from all 11 federation layers. Route: <code>/api/os/cloudflare/ucip</code></p>
  <ul>
    <li><strong>GREEN</strong> \u2014 ${interpretation.ucip.GREEN}</li>
    <li><strong>YELLOW</strong> \u2014 ${interpretation.ucip.YELLOW}</li>
    <li><strong>ORANGE</strong> \u2014 ${interpretation.ucip.ORANGE}</li>
    <li><strong>RED</strong> \u2014 ${interpretation.ucip.RED}</li>
  </ul>
  <h2>AMG (Autonomous Meta-Governance)</h2>
  <p>UCIP-derived advisory governance rules, operator nudges, and OS policy hints. Route: <code>/api/os/cloudflare/amg</code></p>
  <ul>
    <li><strong>GOVERN_GREEN</strong> \u2014 ${interpretation.amg.GOVERN_GREEN}</li>
    <li><strong>GOVERN_YELLOW</strong> \u2014 ${interpretation.amg.GOVERN_YELLOW}</li>
    <li><strong>GOVERN_ORANGE</strong> \u2014 ${interpretation.amg.GOVERN_ORANGE}</li>
    <li><strong>GOVERN_RED</strong> \u2014 ${interpretation.amg.GOVERN_RED}</li>
  </ul>
  <h2>CBA (Behavioral Autonomy)</h2>
  <p>AMG + UCIP-derived advisory behavioral patterns and drift warnings. Route: <code>/api/os/cloudflare/cba</code></p>
  <ul>
    <li><strong>BEHAVIOR_GREEN</strong> \u2014 ${interpretation.cba.BEHAVIOR_GREEN}</li>
    <li><strong>BEHAVIOR_YELLOW</strong> \u2014 ${interpretation.cba.BEHAVIOR_YELLOW}</li>
    <li><strong>BEHAVIOR_ORANGE</strong> \u2014 ${interpretation.cba.BEHAVIOR_ORANGE}</li>
    <li><strong>BEHAVIOR_RED</strong> \u2014 ${interpretation.cba.BEHAVIOR_RED}</li>
  </ul>
  <h2>CAL (Cognitive Alignment Layer)</h2>
  <p>CBA + AMG + UCIP-derived unified cognitive alignment signal. Route: <code>/api/os/cloudflare/cal</code></p>
  <ul>
    <li><strong>ALIGN_GREEN</strong> \u2014 ${interpretation.cal.ALIGN_GREEN}</li>
    <li><strong>ALIGN_YELLOW</strong> \u2014 ${interpretation.cal.ALIGN_YELLOW}</li>
    <li><strong>ALIGN_ORANGE</strong> \u2014 ${interpretation.cal.ALIGN_ORANGE}</li>
    <li><strong>ALIGN_RED</strong> \u2014 ${interpretation.cal.ALIGN_RED}</li>
  </ul>
  <h2>IHL (Intent Harmonization Layer)</h2>
  <p>CAL + CBA + AMG + UCIP-derived unified intent harmonization signal. Route: <code>/api/os/cloudflare/ihl</code></p>
  <ul>
    <li><strong>INTENT_GREEN</strong> \u2014 ${interpretation.ihl.INTENT_GREEN}</li>
    <li><strong>INTENT_YELLOW</strong> \u2014 ${interpretation.ihl.INTENT_YELLOW}</li>
    <li><strong>INTENT_ORANGE</strong> \u2014 ${interpretation.ihl.INTENT_ORANGE}</li>
    <li><strong>INTENT_RED</strong> \u2014 ${interpretation.ihl.INTENT_RED}</li>
  </ul>
  <h2>IARL (Intent-to-Action Resonance Layer)</h2>
  <p>IHL + CAL + CBA + AMG + UCIP-derived intent-to-action resonance signal. Route: <code>/api/os/cloudflare/iarl</code></p>
  <ul>
    <li><strong>RESONANCE_GREEN</strong> \u2014 ${interpretation.iarl.RESONANCE_GREEN}</li>
    <li><strong>RESONANCE_YELLOW</strong> \u2014 ${interpretation.iarl.RESONANCE_YELLOW}</li>
    <li><strong>RESONANCE_ORANGE</strong> \u2014 ${interpretation.iarl.RESONANCE_ORANGE}</li>
    <li><strong>RESONANCE_RED</strong> \u2014 ${interpretation.iarl.RESONANCE_RED}</li>
  </ul>
  <h2>ACL (Autonomous Coherence Layer)</h2>
  <p>IARL + IHL + CAL + CBA + AMG + UCIP-derived OS-wide coherence signal. Route: <code>/api/os/cloudflare/acl</code></p>
  <ul>
    <li><strong>COHERENCE_GREEN</strong> \u2014 ${interpretation.acl.COHERENCE_GREEN}</li>
    <li><strong>COHERENCE_YELLOW</strong> \u2014 ${interpretation.acl.COHERENCE_YELLOW}</li>
    <li><strong>COHERENCE_ORANGE</strong> \u2014 ${interpretation.acl.COHERENCE_ORANGE}</li>
    <li><strong>COHERENCE_RED</strong> \u2014 ${interpretation.acl.COHERENCE_RED}</li>
  </ul>
  <h2>Health values</h2>
  <ul>
    <li><strong>healthy</strong> \u2014 ${interpretation.health.healthy}</li>
    <li><strong>advisory</strong> \u2014 ${interpretation.health.advisory}</li>
    <li><strong>degraded</strong> \u2014 ${interpretation.health.degraded}</li>
    <li><strong>optional</strong> \u2014 ${interpretation.health.optional}</li>
  </ul>
  <p><a href="/mission">Mission Control</a> \xB7 <a href="/operator">Operator</a> \xB7 <a href="/os">OS Dashboard</a> \xB7 <a href="/api/os/cloudflare/federation/routes">Route catalog (JSON)</a></p>
</body>
</html>`;
  }
  return doc;
}
__name(getCloudflareFederationDocumentation, "getCloudflareFederationDocumentation");
async function runAdvisoryGuarded(handler, domain, options = {}) {
  return resolveCloudflareAdvisoryCall(handler, domain, options);
}
__name(runAdvisoryGuarded, "runAdvisoryGuarded");

// worker/cloudflare-integration.js
function metaAdvisoryCacheSuffix(options = {}) {
  if (options.cacheKeySuffix) {
    return options.cacheKeySuffix;
  }
  if (options.moduleIds) {
    return `m${options.moduleIds.length}`;
  }
  return "default";
}
__name(metaAdvisoryCacheSuffix, "metaAdvisoryCacheSuffix");
var {
  CLOUDFLARE_MCP_SERVERS: CLOUDFLARE_MCP_SERVERS2,
  CLOUDFLARE_SKILLS: CLOUDFLARE_SKILLS2,
  FEDERATION_SURFACES: FEDERATION_SURFACES2,
  WRANGLER_BINDINGS_MANIFEST: WRANGLER_BINDINGS_MANIFEST2,
  PIPELINE_REQUIRED_BINDINGS: PIPELINE_REQUIRED_BINDINGS2,
  CURATED_DOCS_INDEX: CURATED_DOCS_INDEX2,
  DOCS_QUICK_ACTIONS: DOCS_QUICK_ACTIONS2,
  DOCS_TOPIC_CATEGORIES: DOCS_TOPIC_CATEGORIES2,
  CLOUDFLARE_FEDERATION_ACTIONS: CLOUDFLARE_FEDERATION_ACTIONS2,
  STATIC_BUILD_MANIFEST: STATIC_BUILD_MANIFEST2,
  STATIC_LOGS_FALLBACK: STATIC_LOGS_FALLBACK2,
  STATIC_METRICS_FALLBACK: STATIC_METRICS_FALLBACK2,
  MODULE_CF_ACTION_COMPATIBILITY: MODULE_CF_ACTION_COMPATIBILITY2,
  AUTONOMOUS_SIGNAL_TRIGGERS: AUTONOMOUS_SIGNAL_TRIGGERS2,
  ANOMALY_LOG_PATTERNS: ANOMALY_LOG_PATTERNS2,
  METRICS_SPIKE_KEYWORDS: METRICS_SPIKE_KEYWORDS2,
  CLOUDFLARE_EVENT_HOOKS: CLOUDFLARE_EVENT_HOOKS2,
  CLOUDFLARE_INSIGHTS_RECOMMENDATIONS: CLOUDFLARE_INSIGHTS_RECOMMENDATIONS2,
  CROSS_DIVISION_SYNC: CROSS_DIVISION_SYNC2,
  CLOUDFLARE_ORCHESTRATION: CLOUDFLARE_ORCHESTRATION2,
  CLOUDFLARE_EXECUTION: CLOUDFLARE_EXECUTION2,
  CLOUDFLARE_ADAPTIVE: CLOUDFLARE_ADAPTIVE2,
  CLOUDFLARE_PREDICTIVE: CLOUDFLARE_PREDICTIVE2,
  CLOUDFLARE_STRATEGIC: CLOUDFLARE_STRATEGIC2,
  CLOUDFLARE_UCIP: CLOUDFLARE_UCIP2,
  CLOUDFLARE_AMG: CLOUDFLARE_AMG2,
  CLOUDFLARE_CBA: CLOUDFLARE_CBA2,
  CLOUDFLARE_CAL: CLOUDFLARE_CAL2,
  CLOUDFLARE_IHL: CLOUDFLARE_IHL2,
  CLOUDFLARE_IARL: CLOUDFLARE_IARL2,
  CLOUDFLARE_ACL: CLOUDFLARE_ACL2
} = cloudflareMcp_default;
var CROSS_DIVISION_FETCH_TIMEOUT_MS = 3500;
var MCP_PROBE_TIMEOUT_MS = 3500;
var MCP_CLIENT_INFO = { name: "mshops-os", version: "3.5" };
function withTimeout(promise, timeoutMs = MCP_PROBE_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("probe timeout")), timeoutMs);
    })
  ]);
}
__name(withTimeout, "withTimeout");
async function mcpJsonRpc(url, method, params = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${Date.now()}`,
      method,
      params
    })
  });
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    const text2 = await response.text();
    const dataLine = text2.split("\n").find((line) => line.startsWith("data: "));
    if (!dataLine) {
      return { ok: response.ok, status: response.status, result: null, raw: text2.slice(0, 500) };
    }
    const payload2 = JSON.parse(dataLine.replace(/^data:\s*/, ""));
    return { ok: response.ok, status: response.status, result: payload2.result, error: payload2.error };
  }
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    return { ok: response.ok, status: response.status, result: null, error: "Invalid JSON response" };
  }
  return { ok: response.ok, status: response.status, result: payload.result, error: payload.error };
}
__name(mcpJsonRpc, "mcpJsonRpc");
function normalizeDocsTopic(topic) {
  if (!topic) return null;
  const normalized = String(topic).trim().toLowerCase();
  if (normalized === "email-service") return "email";
  return DOCS_TOPIC_CATEGORIES2.includes(normalized) ? normalized : normalized;
}
__name(normalizeDocsTopic, "normalizeDocsTopic");
function getObservabilityTimeframe(hours = 1) {
  const to = /* @__PURE__ */ new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1e3);
  return { to: to.toISOString(), from: from.toISOString() };
}
__name(getObservabilityTimeframe, "getObservabilityTimeframe");
async function tryMcpToolCall(serverId, toolName, toolArguments = {}) {
  const server = CLOUDFLARE_MCP_SERVERS2[serverId];
  if (!server) {
    return { status: "unknown", requiresOAuth: false, result: null, error: "Unknown MCP server." };
  }
  try {
    const init = await withTimeout(
      mcpJsonRpc(server.url, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: MCP_CLIENT_INFO
      })
    );
    if (init.status === 401 || init.status === 403) {
      return { status: "requires_oauth", requiresOAuth: true, result: null, advisory: `OAuth required for ${serverId}.` };
    }
    if (!init.ok) {
      return { status: "degraded", requiresOAuth: false, result: null, advisory: `${serverId} MCP initialize failed.` };
    }
    const toolCall = await withTimeout(
      mcpJsonRpc(server.url, "tools/call", {
        name: toolName,
        arguments: toolArguments
      })
    );
    if (toolCall.status === 401 || toolCall.status === 403) {
      return { status: "requires_oauth", requiresOAuth: true, result: null, advisory: `OAuth required for ${toolName}.` };
    }
    if (toolCall.result?.content) {
      const text2 = toolCall.result.content.filter((block) => block.type === "text").map((block) => block.text).join("\n");
      return { status: "online", requiresOAuth: false, result: text2, source: `${serverId}-mcp` };
    }
    return { status: "degraded", requiresOAuth: false, result: null, advisory: `No content from ${toolName}.` };
  } catch (error) {
    return { status: "offline", requiresOAuth: server.auth === "oauth", result: null, advisory: error.message };
  }
}
__name(tryMcpToolCall, "tryMcpToolCall");
async function getCloudflareLogs(options = {}) {
  const worker = options.worker || WRANGLER_BINDINGS_MANIFEST2.worker;
  const probe = await probeMcpServer("cloudflare-observability");
  if (probe.status === "requires_oauth" || probe.status === "offline") {
    return {
      status: probe.status === "offline" ? "offline" : "requires_oauth",
      health: probe.status === "offline" ? "offline" : "requires_oauth",
      worker,
      source: STATIC_LOGS_FALLBACK2.source,
      logs: STATIC_LOGS_FALLBACK2.logs,
      advisory: probe.status === "requires_oauth" ? "OAuth required for live Worker logs via cloudflare-observability MCP." : "cloudflare-observability MCP is offline; returning advisory logs.",
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const mcp = await tryMcpToolCall("cloudflare-observability", "query_worker_observability", {
    query: {
      queryId: "workers-logs-events",
      view: "events",
      limit: Number(options.limit) || 5,
      dry: true,
      parameters: {
        datasets: ["cloudflare-workers"],
        filters: [
          {
            key: "$metadata.service",
            operation: "eq",
            type: "string",
            value: worker
          }
        ]
      },
      timeframe: getObservabilityTimeframe(Number(options.hours) || 1)
    }
  });
  if (mcp.status === "requires_oauth" || !mcp.result) {
    return {
      status: mcp.status || "requires_oauth",
      health: mcp.status || "requires_oauth",
      worker,
      source: STATIC_LOGS_FALLBACK2.source,
      logs: STATIC_LOGS_FALLBACK2.logs,
      advisory: mcp.advisory || STATIC_LOGS_FALLBACK2.logs[0],
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  return {
    status: "online",
    health: "online",
    worker,
    source: mcp.source,
    logs: mcp.result.split("\n").filter(Boolean).slice(0, 50),
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareLogs, "getCloudflareLogs");
async function getCloudflareMetrics(options = {}) {
  const worker = options.worker || WRANGLER_BINDINGS_MANIFEST2.worker;
  const probe = await probeMcpServer("cloudflare-observability");
  if (probe.status === "requires_oauth" || probe.status === "offline") {
    return {
      status: probe.status === "offline" ? "offline" : "requires_oauth",
      health: probe.status === "offline" ? "offline" : "requires_oauth",
      worker,
      source: STATIC_METRICS_FALLBACK2.source,
      metrics: STATIC_METRICS_FALLBACK2.metrics,
      advisory: probe.status === "requires_oauth" ? "OAuth required for live Worker metrics via cloudflare-observability MCP." : "cloudflare-observability MCP is offline; returning advisory metrics.",
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const mcp = await tryMcpToolCall("cloudflare-observability", "query_worker_observability", {
    query: {
      queryId: "workers-metrics-calculations",
      view: "calculations",
      parameters: {
        datasets: ["cloudflare-workers"],
        filters: [
          {
            key: "$metadata.service",
            operation: "eq",
            type: "string",
            value: worker
          }
        ],
        calculations: [{ operator: "count", alias: "requests" }]
      },
      timeframe: getObservabilityTimeframe(Number(options.hours) || 1)
    }
  });
  if (mcp.status === "requires_oauth" || !mcp.result) {
    return {
      status: mcp.status || "requires_oauth",
      health: mcp.status || "requires_oauth",
      worker,
      source: STATIC_METRICS_FALLBACK2.source,
      metrics: STATIC_METRICS_FALLBACK2.metrics,
      advisory: mcp.advisory || STATIC_METRICS_FALLBACK2.metrics[0]?.note,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  return {
    status: "online",
    health: "online",
    worker,
    source: mcp.source,
    metrics: [{ name: "observability", value: mcp.result.slice(0, 500) }],
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareMetrics, "getCloudflareMetrics");
async function runCloudflareBuild(options = {}) {
  const worker = options.worker || WRANGLER_BINDINGS_MANIFEST2.worker;
  const buildsProbe = await probeMcpServer("cloudflare-builds");
  if (buildsProbe.status === "requires_oauth" || buildsProbe.status === "offline") {
    return {
      status: buildsProbe.status === "offline" ? "offline" : "requires_oauth",
      health: buildsProbe.status === "offline" ? "offline" : "requires_oauth",
      worker,
      source: STATIC_BUILD_MANIFEST2.source,
      stages: STATIC_BUILD_MANIFEST2.stages,
      logs: STATIC_BUILD_MANIFEST2.logs,
      advisory: buildsProbe.status === "requires_oauth" ? "OAuth required to trigger Workers Builds via cloudflare-builds MCP." : "cloudflare-builds MCP is offline; returning static build manifest.",
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const listBuilds = await tryMcpToolCall("cloudflare-builds", "workers_builds_list_builds", {});
  const logs = listBuilds.result ? listBuilds.result.split("\n").filter(Boolean).slice(0, 50) : STATIC_BUILD_MANIFEST2.logs;
  return {
    status: listBuilds.status === "online" ? "online" : "requires_oauth",
    health: listBuilds.status === "online" ? "online" : "requires_oauth",
    worker,
    source: listBuilds.source || STATIC_BUILD_MANIFEST2.source,
    stages: STATIC_BUILD_MANIFEST2.stages,
    logs,
    advisory: listBuilds.advisory || null,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(runCloudflareBuild, "runCloudflareBuild");
async function postValidateCloudflareBindings(options = {}) {
  const manifestValidation = await validateCloudflareBindings(options.moduleId || null);
  const bindingsProbe = await probeMcpServer("cloudflare-bindings");
  if (bindingsProbe.status === "requires_oauth" || bindingsProbe.status === "offline") {
    return {
      ...manifestValidation,
      status: bindingsProbe.status === "offline" ? "offline" : "requires_oauth",
      source: "manifest-only",
      mcpValidation: null,
      advisory: bindingsProbe.status === "requires_oauth" ? "OAuth required for live binding validation via cloudflare-bindings MCP." : "cloudflare-bindings MCP is offline; manifest-only validation applied.",
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const mcp = await tryMcpToolCall("cloudflare-bindings", "kv_namespaces_list", {});
  return {
    ...manifestValidation,
    status: mcp.status === "online" ? manifestValidation.valid ? "online" : "warning" : mcp.status,
    source: mcp.status === "online" ? "manifest+mcp" : "manifest-only",
    mcpValidation: mcp.result ? { kvNamespaces: mcp.result.slice(0, 800) } : null,
    advisory: mcp.advisory || null,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(postValidateCloudflareBindings, "postValidateCloudflareBindings");
async function getCloudflareFederationActions() {
  const probes = await probeAllMcpServers();
  const oauthStatus = Object.fromEntries(probes.servers.map((server) => [server.id, server.oauthStatus]));
  const actions = CLOUDFLARE_FEDERATION_ACTIONS2.map((action) => ({
    ...action,
    usable: oauthStatus[action.mcpServer] === "ready" || oauthStatus[action.mcpServer] === "not_required",
    oauthStatus: oauthStatus[action.mcpServer] || "unknown",
    serverStatus: probes.servers.find((server) => server.id === action.mcpServer)?.status || "unknown"
  }));
  return {
    actions,
    oauthStatus,
    topics: DOCS_TOPIC_CATEGORIES2,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareFederationActions, "getCloudflareFederationActions");
async function getCloudflareActionsHealth() {
  const [logs, metrics, build, bindings] = await Promise.all([
    getCloudflareLogs(),
    getCloudflareMetrics(),
    runCloudflareBuild(),
    postValidateCloudflareBindings()
  ]);
  const entries = [
    { id: "logs", health: logs.health },
    { id: "metrics", health: metrics.health },
    { id: "build", health: build.health },
    { id: "validate-bindings", health: bindings.valid ? bindings.status === "online" ? "online" : bindings.status : "warning" },
    { id: "docs-search", health: "online" }
  ];
  const offline = entries.filter((entry) => entry.health === "offline").length;
  const requiresOAuth = entries.filter((entry) => entry.health === "requires_oauth").length;
  return {
    health: offline ? "degraded" : requiresOAuth ? "requires_oauth" : "online",
    actions: entries,
    summary: { total: entries.length, online: entries.filter((e) => e.health === "online").length, requiresOAuth, offline },
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareActionsHealth, "getCloudflareActionsHealth");
async function getCloudflareActionHealthSummary() {
  const [logsHealth, metricsHealth, buildHealth, bindingHealth, docsProbe] = await Promise.all([
    probeMcpServer("cloudflare-observability").then((p) => p.status === "online" ? "online" : p.status),
    probeMcpServer("cloudflare-observability").then((p) => p.status === "online" ? "online" : p.status),
    probeMcpServer("cloudflare-builds").then((p) => p.status === "online" ? "online" : p.status === "requires_oauth" ? "requires_oauth" : p.status),
    probeMcpServer("cloudflare-bindings").then((p) => p.status === "online" ? "online" : p.status === "requires_oauth" ? "requires_oauth" : p.status),
    probeMcpServer("cloudflare-docs")
  ]);
  const actionsHealth = await getCloudflareActionsHealth();
  return {
    cloudflareLogsHealth: logsHealth,
    cloudflareMetricsHealth: metricsHealth,
    cloudflareBuildHealth: buildHealth,
    cloudflareBindingHealth: bindingHealth,
    cloudflareDocsHealth: docsProbe.reachable ? docsProbe.status === "online" ? "online" : docsProbe.status : "offline",
    actionsHealth,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareActionHealthSummary, "getCloudflareActionHealthSummary");
function wrapAdvisoryAction(actionId, payload) {
  return {
    ok: true,
    advisory: true,
    action: actionId,
    ...payload,
    checkedAt: payload.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(wrapAdvisoryAction, "wrapAdvisoryAction");
async function postFetchCloudflareLogs(body = {}) {
  const result = await getCloudflareLogs(body);
  return wrapAdvisoryAction("logs", result);
}
__name(postFetchCloudflareLogs, "postFetchCloudflareLogs");
async function postFetchCloudflareMetrics(body = {}) {
  const result = await getCloudflareMetrics(body);
  return wrapAdvisoryAction("metrics", result);
}
__name(postFetchCloudflareMetrics, "postFetchCloudflareMetrics");
async function postRunCloudflareBuild(body = {}) {
  const result = await runCloudflareBuild(body);
  return wrapAdvisoryAction("build", result);
}
__name(postRunCloudflareBuild, "postRunCloudflareBuild");
async function postValidateCloudflareBindingsAction(body = {}) {
  const result = await postValidateCloudflareBindings(body);
  return wrapAdvisoryAction("validate-bindings", result);
}
__name(postValidateCloudflareBindingsAction, "postValidateCloudflareBindingsAction");
async function postQueryCloudflareDocs(body = {}) {
  const query = String(body.query || body.q || "").trim();
  const topic = body.topic || body.category || null;
  const result = await searchCloudflareDocs(query, { topic });
  const probe = await probeMcpServer("cloudflare-docs");
  return wrapAdvisoryAction("docs-query", {
    status: probe.status === "online" ? "online" : probe.status,
    source: result.source,
    query: result.query,
    topic: result.topic,
    category: body.category || null,
    results: result.results,
    advisory: result.source !== "cloudflare-docs-mcp" ? "Docs query used curated fallback when MCP search unavailable." : null
  });
}
__name(postQueryCloudflareDocs, "postQueryCloudflareDocs");
function getModuleCfCompatibility(moduleId) {
  const actions = MODULE_CF_ACTION_COMPATIBILITY2[moduleId] || ["docs"];
  return {
    moduleId,
    cfReadyPlus: actions.length >= 4,
    actions,
    actionLabels: CLOUDFLARE_FEDERATION_ACTIONS2.filter((action) => actions.includes(action.capability)).map((action) => action.label)
  };
}
__name(getModuleCfCompatibility, "getModuleCfCompatibility");
function getMarketplaceCfMetadata() {
  return {
    federationActions: CLOUDFLARE_FEDERATION_ACTIONS2,
    moduleCompatibility: MODULE_CF_ACTION_COMPATIBILITY2,
    docsCategories: DOCS_TOPIC_CATEGORIES2,
    quickActions: getDocsQuickActions(),
    decisionRoute: "/api/os/cloudflare/decision",
    automationRoute: "/api/os/cloudflare/automation",
    certificationRoute: "/api/marketplace/certification",
    syncRoute: CROSS_DIVISION_SYNC2.operatorShell.syncRoute,
    crossDivisionRoute: CROSS_DIVISION_SYNC2.operatorShell.crossDivisionRoute,
    marketplaceSyncRoute: CROSS_DIVISION_SYNC2.marketplaceBackend.syncRoute,
    orchestrationRoute: CLOUDFLARE_ORCHESTRATION2.routes.orchestration,
    agentsRoute: CLOUDFLARE_ORCHESTRATION2.routes.agents,
    executionRoute: CLOUDFLARE_EXECUTION2.routes.execution,
    executionSignalsRoute: CLOUDFLARE_EXECUTION2.routes.signals,
    adaptiveRoute: CLOUDFLARE_ADAPTIVE2.route,
    predictiveRoute: CLOUDFLARE_PREDICTIVE2.route,
    strategicRoute: CLOUDFLARE_STRATEGIC2.route,
    ucipRoute: CLOUDFLARE_UCIP2.route,
    amgRoute: CLOUDFLARE_AMG2.route,
    cbaRoute: CLOUDFLARE_CBA2.route,
    calRoute: CLOUDFLARE_CAL2.route,
    ihlRoute: CLOUDFLARE_IHL2.route,
    iarlRoute: CLOUDFLARE_IARL2.route,
    aclRoute: CLOUDFLARE_ACL2.route
  };
}
__name(getMarketplaceCfMetadata, "getMarketplaceCfMetadata");
async function getCloudflareFederationHeartbeat() {
  const [actionSummary, federation] = await Promise.all([
    getCloudflareActionHealthSummary(),
    getCloudflareFederationReadiness()
  ]);
  const probes = federation.mcp?.servers || [];
  return {
    cloudflareLogsHealth: actionSummary.cloudflareLogsHealth,
    cloudflareMetricsHealth: actionSummary.cloudflareMetricsHealth,
    cloudflareBuildHealth: actionSummary.cloudflareBuildHealth,
    cloudflareBindingHealth: actionSummary.cloudflareBindingHealth,
    cloudflareDocsHealth: actionSummary.cloudflareDocsHealth,
    cloudflareFederationScore: federation.readinessScore ?? 0,
    cloudflareLatencyMs: Object.fromEntries(probes.map((server) => [server.id, server.latencyMs ?? null])),
    cloudflareOAuthStatus: Object.fromEntries(probes.map((server) => [server.id, server.oauthStatus])),
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareFederationHeartbeat, "getCloudflareFederationHeartbeat");
async function getCloudflareIdentityFederation(env = {}) {
  const governance = {};
  const [actions, federation, heartbeat, autonomous, insights, eventHooks, certification, crossDivision, orchestration, execution, automation] = await Promise.all([
    getCloudflareFederationActions(),
    getCloudflareFederationReadiness(),
    getCloudflareFederationHeartbeat(),
    getCloudflareAutonomousSnapshot(governance),
    getCloudflareInsights(governance),
    (async () => {
      const inputs = await collectAutonomousSignalInputs();
      const signals = buildAutonomousGovernanceSignals(inputs, governance);
      return simulateCloudflareEventHooks(signals, inputs);
    })(),
    getMarketplaceCloudflareCertification(governance),
    getCloudflareCrossDivisionFederation(governance, env),
    getCloudflareOrchestration(governance, env),
    getCloudflareExecution(governance, env),
    getCloudflareAutomationLoops(governance)
  ]);
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
  const expandedScore = getExpandedFederationScore(
    federation.readinessScore,
    autonomous.cloudflareSafety?.autonomousScore,
    insights.cloudflareInsightsScore,
    triggers
  );
  const decision = await getCloudflareDecision(governance);
  const adaptiveRuntime = buildCloudflareAdaptiveFromSignals({
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous
  });
  const predictiveRuntime = buildCloudflarePredictiveFromSignals({
    adaptive: adaptiveRuntime,
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous
  });
  const strategicRuntime = buildCloudflareStrategicFromSignals({
    predictive: predictiveRuntime,
    adaptive: adaptiveRuntime,
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous
  });
  const ucipRuntime = buildCloudflareUcipFromSignals({
    automation,
    autonomous,
    decision,
    certification,
    crossDivision,
    orchestration,
    execution,
    adaptive: adaptiveRuntime,
    predictive: predictiveRuntime,
    strategic: strategicRuntime,
    insights
  });
  const amgRuntime = buildCloudflareAmgFromUcip(ucipRuntime);
  const identityAlignmentContext = await buildCalAlignmentContextFromEnv({}, env, {});
  const cbaRuntime = buildCloudflareCbaFromAmg(amgRuntime, ucipRuntime, identityAlignmentContext);
  const calRuntime = buildCloudflareCalFromCba(cbaRuntime, amgRuntime, ucipRuntime, identityAlignmentContext);
  const ihlRuntime = buildCloudflareIhlFromCal(calRuntime, cbaRuntime, amgRuntime, ucipRuntime, identityAlignmentContext);
  const iarlRuntime = buildCloudflareIarlFromIhl(ihlRuntime, calRuntime, cbaRuntime, amgRuntime, ucipRuntime, identityAlignmentContext);
  const aclRuntime = buildCloudflareAclFromIarl(iarlRuntime, ihlRuntime, calRuntime, cbaRuntime, amgRuntime, ucipRuntime, identityAlignmentContext);
  return {
    actions: Object.fromEntries(
      CLOUDFLARE_FEDERATION_ACTIONS2.map((action) => [
        action.id,
        {
          route: action.route,
          method: action.method,
          capability: action.capability,
          oauthStatus: actions.oauthStatus[action.mcpServer] || "unknown",
          usable: actions.actions.find((entry) => entry.id === action.id)?.usable ?? false
        }
      ])
    ),
    oauthStatus: heartbeat.cloudflareOAuthStatus,
    capabilities: CLOUDFLARE_FEDERATION_ACTIONS2.map((action) => action.capability),
    latency: heartbeat.cloudflareLatencyMs,
    federationScore: expandedScore,
    federationScoreBreakdown: {
      readiness: federation.readinessScore,
      autonomous: autonomous.cloudflareSafety?.autonomousScore ?? null,
      insights: insights.cloudflareInsightsScore,
      expanded: expandedScore,
      triggerPenalty: triggers.length * 5
    },
    readiness: federation.readiness,
    autonomousCapabilities: {
      triggers: Object.keys(AUTONOMOUS_SIGNAL_TRIGGERS2),
      safety: autonomous.cloudflareSafety,
      autonomousSignals: autonomous.cloudflareGovernance?.autonomousSignals,
      routes: {
        autonomous: "/api/os/cloudflare/autonomous",
        events: "/api/os/cloudflare/events",
        insights: "/api/os/cloudflare/insights"
      },
      advisoryOnly: true
    },
    insights: {
      score: insights.cloudflareInsightsScore,
      health: insights.health,
      summaries: insights.cloudflareInsights
    },
    events: {
      hooks: eventHooks.cloudflareEvents,
      health: deriveEventsHealth(eventHooks),
      simulated: true,
      advisoryOnly: true
    },
    decisioningCapabilities: {
      decisions: ["proceed", "caution", "hold"],
      route: "/api/os/cloudflare/decision",
      advisoryOnly: true,
      riskDimensions: ["latency", "oauth", "logs", "metrics", "build", "bindings"]
    },
    automationCapabilities: {
      loops: ["logs", "metrics", "build", "bindings", "oauth", "latency"],
      route: "/api/os/cloudflare/automation",
      advisoryOnly: true
    },
    certificationCapabilities: {
      statuses: ["certified", "review", "incompatible"],
      route: "/api/marketplace/certification",
      advisoryOnly: true
    },
    certificationScore: certification.aggregate?.score ?? null,
    crossDivisionCapabilities: {
      dimensions: CROSS_DIVISION_SYNC2.sharedDimensions,
      routes: {
        sync: CROSS_DIVISION_SYNC2.operatorShell.syncRoute,
        crossDivision: CROSS_DIVISION_SYNC2.operatorShell.crossDivisionRoute,
        marketplaceSync: CROSS_DIVISION_SYNC2.marketplaceBackend.syncRoute
      },
      advisoryOnly: true
    },
    crossDivisionScore: crossDivision.cloudflareCrossDivisionScore ?? null,
    crossDivisionHealth: crossDivision.cloudflareCrossDivisionHealth || "optional",
    crossDivisionSyncStatus: crossDivision.syncStatus || "partial",
    orchestrationCapabilities: {
      routes: CLOUDFLARE_ORCHESTRATION2.routes,
      agents: CLOUDFLARE_ORCHESTRATION2.agents,
      statuses: CLOUDFLARE_ORCHESTRATION2.statuses,
      advisoryOnly: true
    },
    orchestrationScore: orchestration.orchestrationScore ?? null,
    orchestrationHealth: orchestration.orchestrationHealth || "optional",
    executionCapabilities: {
      routes: CLOUDFLARE_EXECUTION2.routes,
      agents: CLOUDFLARE_EXECUTION2.agents,
      statuses: CLOUDFLARE_EXECUTION2.statuses,
      advisoryOnly: true
    },
    executionScore: execution.executionScore ?? null,
    executionHealth: execution.executionHealth || "optional",
    adaptiveCapabilities: {
      modes: CLOUDFLARE_ADAPTIVE2.modes,
      route: CLOUDFLARE_ADAPTIVE2.route,
      badges: CLOUDFLARE_ADAPTIVE2.badges,
      inputs: CLOUDFLARE_ADAPTIVE2.inputs,
      advisoryOnly: true
    },
    adaptiveScore: adaptiveRuntime.adaptiveScore,
    adaptiveHealth: adaptiveRuntime.adaptiveHealth,
    predictiveCapabilities: {
      forecastModes: CLOUDFLARE_PREDICTIVE2.forecastModes,
      route: CLOUDFLARE_PREDICTIVE2.route,
      badges: CLOUDFLARE_PREDICTIVE2.badges,
      inputs: CLOUDFLARE_PREDICTIVE2.inputs,
      advisoryOnly: true
    },
    predictiveScore: predictiveRuntime.predictiveScore,
    predictiveHealth: predictiveRuntime.predictiveHealth,
    strategicCapabilities: {
      horizons: CLOUDFLARE_STRATEGIC2.horizons,
      stripModes: CLOUDFLARE_STRATEGIC2.stripModes,
      tags: CLOUDFLARE_STRATEGIC2.tags,
      themes: CLOUDFLARE_STRATEGIC2.themes,
      route: CLOUDFLARE_STRATEGIC2.route,
      advisoryOnly: true
    },
    strategicScore: strategicRuntime.strategicScore,
    strategicHealth: strategicRuntime.strategicHealth,
    ucipCapabilities: {
      modes: CLOUDFLARE_UCIP2.modes,
      route: CLOUDFLARE_UCIP2.route,
      badges: CLOUDFLARE_UCIP2.badges,
      layers: CLOUDFLARE_UCIP2.layers,
      advisoryOnly: true
    },
    ucipScore: ucipRuntime.ucipScore,
    ucipHealth: ucipRuntime.ucipHealth,
    amgCapabilities: {
      modes: CLOUDFLARE_AMG2.modes,
      route: CLOUDFLARE_AMG2.route,
      badges: CLOUDFLARE_AMG2.badges,
      tags: CLOUDFLARE_AMG2.tags,
      surfaces: CLOUDFLARE_AMG2.surfaces,
      upstream: CLOUDFLARE_AMG2.upstream,
      advisoryOnly: true
    },
    amgScore: amgRuntime.amgScore,
    amgHealth: amgRuntime.amgHealth,
    cbaCapabilities: {
      modes: CLOUDFLARE_CBA2.modes,
      route: CLOUDFLARE_CBA2.route,
      badges: CLOUDFLARE_CBA2.badges,
      tags: CLOUDFLARE_CBA2.tags,
      surfaces: CLOUDFLARE_CBA2.surfaces,
      upstream: CLOUDFLARE_CBA2.upstream,
      advisoryOnly: true
    },
    cbaScore: cbaRuntime.cbaScore,
    cbaHealth: cbaRuntime.cbaHealth,
    calCapabilities: {
      modes: CLOUDFLARE_CAL2.modes,
      route: CLOUDFLARE_CAL2.route,
      badges: CLOUDFLARE_CAL2.badges,
      tags: CLOUDFLARE_CAL2.tags,
      surfaces: CLOUDFLARE_CAL2.surfaces,
      upstream: CLOUDFLARE_CAL2.upstream,
      advisoryOnly: true
    },
    calScore: calRuntime.calScore,
    calHealth: calRuntime.calHealth,
    ihlCapabilities: {
      modes: CLOUDFLARE_IHL2.modes,
      route: CLOUDFLARE_IHL2.route,
      badges: CLOUDFLARE_IHL2.badges,
      tags: CLOUDFLARE_IHL2.tags,
      surfaces: CLOUDFLARE_IHL2.surfaces,
      upstream: CLOUDFLARE_IHL2.upstream,
      advisoryOnly: true
    },
    ihlScore: ihlRuntime.ihlScore,
    ihlHealth: ihlRuntime.ihlHealth,
    iarlCapabilities: {
      modes: CLOUDFLARE_IARL2.modes,
      route: CLOUDFLARE_IARL2.route,
      badges: CLOUDFLARE_IARL2.badges,
      tags: CLOUDFLARE_IARL2.tags,
      surfaces: CLOUDFLARE_IARL2.surfaces,
      upstream: CLOUDFLARE_IARL2.upstream,
      advisoryOnly: true
    },
    iarlScore: iarlRuntime.iarlScore,
    iarlHealth: iarlRuntime.iarlHealth,
    aclCapabilities: {
      modes: CLOUDFLARE_ACL2.modes,
      route: CLOUDFLARE_ACL2.route,
      badges: CLOUDFLARE_ACL2.badges,
      tags: CLOUDFLARE_ACL2.tags,
      surfaces: CLOUDFLARE_ACL2.surfaces,
      upstream: CLOUDFLARE_ACL2.upstream,
      advisoryOnly: true
    },
    aclScore: aclRuntime.aclScore,
    aclHealth: aclRuntime.aclHealth,
    decisionScore: decision.score,
    decisionReasons: decision.reasons,
    optional: true,
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareIdentityFederation, "getCloudflareIdentityFederation");
async function probeMcpServer(serverId) {
  const server = CLOUDFLARE_MCP_SERVERS2[serverId];
  if (!server) {
    return { id: serverId, status: "unknown", reachable: false, error: "Unknown MCP server." };
  }
  const startedAt = Date.now();
  try {
    const init = await withTimeout(
      mcpJsonRpc(server.url, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: MCP_CLIENT_INFO
      })
    );
    const latencyMs = Date.now() - startedAt;
    const reachable = init.ok || init.status === 401 || init.status === 403;
    const requiresAuth = init.status === 401 || init.status === 403;
    return {
      id: server.id,
      label: server.label,
      url: server.url,
      auth: server.auth,
      reachable,
      requiresAuth,
      oauthStatus: requiresAuth ? "pending" : server.auth === "none" ? "not_required" : "ready",
      status: requiresAuth ? "requires_oauth" : init.ok ? "online" : "degraded",
      latencyMs,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    return {
      id: server.id,
      label: server.label,
      url: server.url,
      auth: server.auth,
      reachable: false,
      requiresAuth: server.auth === "oauth",
      oauthStatus: server.auth === "oauth" ? "unavailable" : "not_required",
      status: "offline",
      latencyMs: Date.now() - startedAt,
      error: error.message,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}
__name(probeMcpServer, "probeMcpServer");
async function probeAllMcpServers() {
  const entries = await Promise.all(Object.keys(CLOUDFLARE_MCP_SERVERS2).map((serverId) => probeMcpServer(serverId)));
  return {
    servers: entries,
    summary: {
      total: entries.length,
      online: entries.filter((entry) => entry.status === "online").length,
      requiresOAuth: entries.filter((entry) => entry.status === "requires_oauth").length,
      offline: entries.filter((entry) => entry.status === "offline").length,
      averageLatencyMs: Math.round(
        entries.filter((entry) => typeof entry.latencyMs === "number").reduce((sum, entry) => sum + entry.latencyMs, 0) / Math.max(entries.filter((entry) => typeof entry.latencyMs === "number").length, 1)
      )
    },
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(probeAllMcpServers, "probeAllMcpServers");
async function getCloudflareObservabilityChecks() {
  const observabilityProbe = await probeMcpServer("cloudflare-observability");
  const docsProbe = await probeMcpServer("cloudflare-docs");
  return {
    observabilityMcp: observabilityProbe,
    docsMcp: docsProbe,
    health: observabilityProbe.reachable ? observabilityProbe.requiresAuth ? "requires_oauth" : "online" : "offline",
    docsHealth: docsProbe.reachable ? docsProbe.status === "online" ? "online" : docsProbe.status : "offline",
    latencyMs: observabilityProbe.latencyMs,
    oauthStatus: observabilityProbe.oauthStatus,
    serverStatus: observabilityProbe.status,
    worker: WRANGLER_BINDINGS_MANIFEST2.worker,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareObservabilityChecks, "getCloudflareObservabilityChecks");
async function getCloudflareHeartbeatDeep() {
  const probes = await probeAllMcpServers();
  const observability = await getCloudflareObservabilityChecks();
  return {
    ...observability,
    servers: probes.servers,
    summary: probes.summary,
    docsServerHealth: observability.docsHealth,
    averageLatencyMs: probes.summary.averageLatencyMs,
    oauthStatuses: Object.fromEntries(probes.servers.map((server) => [server.id, server.oauthStatus])),
    serverStatuses: Object.fromEntries(probes.servers.map((server) => [server.id, server.status])),
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareHeartbeatDeep, "getCloudflareHeartbeatDeep");
async function getCloudflareBuildStatus() {
  const buildsProbe = await probeMcpServer("cloudflare-builds");
  return {
    buildsMcp: buildsProbe,
    worker: WRANGLER_BINDINGS_MANIFEST2.worker,
    health: buildsProbe.reachable ? buildsProbe.requiresAuth ? "requires_oauth" : "online" : "offline",
    activeWorker: WRANGLER_BINDINGS_MANIFEST2.worker,
    note: buildsProbe.requiresAuth ? "OAuth required to list Workers Builds. Probe confirms MCP endpoint reachability." : "Workers Builds MCP endpoint reachable.",
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareBuildStatus, "getCloudflareBuildStatus");
async function tryMcpBuildLogs() {
  const buildsServer = CLOUDFLARE_MCP_SERVERS2["cloudflare-builds"];
  try {
    const init = await withTimeout(
      mcpJsonRpc(buildsServer.url, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: MCP_CLIENT_INFO
      })
    );
    if (!init.ok || init.status === 401 || init.status === 403) {
      return null;
    }
    const toolCall = await withTimeout(
      mcpJsonRpc(buildsServer.url, "tools/call", {
        name: "workers_builds_list_builds",
        arguments: {}
      })
    );
    if (toolCall.result?.content) {
      const text2 = toolCall.result.content.filter((block) => block.type === "text").map((block) => block.text).join("\n");
      return { source: "cloudflare-builds-mcp", logs: text2.split("\n").filter(Boolean).slice(0, 50) };
    }
  } catch {
    return null;
  }
  return null;
}
__name(tryMcpBuildLogs, "tryMcpBuildLogs");
async function getCloudflareBuildPreview() {
  const buildStatus = await getCloudflareBuildStatus();
  const liveLogs = await tryMcpBuildLogs();
  return {
    ...buildStatus,
    preview: {
      worker: WRANGLER_BINDINGS_MANIFEST2.worker,
      stages: STATIC_BUILD_MANIFEST2.stages,
      source: liveLogs?.source || STATIC_BUILD_MANIFEST2.source,
      logs: liveLogs?.logs || STATIC_BUILD_MANIFEST2.logs
    },
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareBuildPreview, "getCloudflareBuildPreview");
function getWranglerBindingsManifest() {
  return {
    ...WRANGLER_BINDINGS_MANIFEST2,
    bindingCount: WRANGLER_BINDINGS_MANIFEST2.bindings.length,
    kvBindingCount: WRANGLER_BINDINGS_MANIFEST2.bindings.filter((entry) => entry.type === "kv_namespace").length
  };
}
__name(getWranglerBindingsManifest, "getWranglerBindingsManifest");
async function getCloudflareBindingsInspection() {
  const bindingsProbe = await probeMcpServer("cloudflare-bindings");
  const manifest = getWranglerBindingsManifest();
  return {
    bindingsMcp: bindingsProbe,
    manifest,
    health: bindingsProbe.reachable ? bindingsProbe.requiresAuth ? "requires_oauth" : "online" : "offline",
    note: bindingsProbe.requiresAuth ? "OAuth required for live binding queries. Manifest reflects wrangler.jsonc declaration." : "Bindings MCP endpoint reachable.",
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareBindingsInspection, "getCloudflareBindingsInspection");
async function validateCloudflareBindings(moduleId = null) {
  const manifest = getWranglerBindingsManifest();
  const bindingNames = new Set(manifest.bindings.map((entry) => entry.name));
  const missing = PIPELINE_REQUIRED_BINDINGS2.filter((name) => !bindingNames.has(name));
  const bindingsProbe = await probeMcpServer("cloudflare-bindings");
  const warnings = [];
  if (missing.length) {
    warnings.push(`Missing required bindings: ${missing.join(", ")}`);
  }
  if (bindingsProbe.status === "offline") {
    warnings.push("cloudflare-bindings MCP is offline; using manifest-only validation.");
  }
  if (bindingsProbe.status === "requires_oauth") {
    warnings.push("cloudflare-bindings MCP requires OAuth for live inspection.");
  }
  return {
    valid: missing.length === 0,
    health: missing.length ? "warning" : bindingsProbe.status === "offline" ? "degraded" : "online",
    moduleId,
    requiredBindings: PIPELINE_REQUIRED_BINDINGS2,
    presentBindings: PIPELINE_REQUIRED_BINDINGS2.filter((name) => bindingNames.has(name)),
    missingBindings: missing,
    bindingsMcp: bindingsProbe,
    warnings,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(validateCloudflareBindings, "validateCloudflareBindings");
async function getCloudflareBindingHealth() {
  const validation = await validateCloudflareBindings();
  const inspection = await getCloudflareBindingsInspection();
  return {
    health: validation.health,
    validation,
    inspection,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareBindingHealth, "getCloudflareBindingHealth");
function searchCuratedDocs(query, topic = null) {
  const normalizedTopic = normalizeDocsTopic(topic);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length && !normalizedTopic) {
    return [];
  }
  return CURATED_DOCS_INDEX2.filter((entry) => {
    if (normalizedTopic && entry.topic !== normalizedTopic) {
      return false;
    }
    const haystack = `${entry.title} ${entry.keywords.join(" ")} ${entry.topic || ""}`.toLowerCase();
    return terms.length ? terms.every((term) => haystack.includes(term)) : true;
  }).map((entry) => ({
    title: entry.title,
    url: entry.url,
    topic: entry.topic,
    source: "curated-fallback"
  }));
}
__name(searchCuratedDocs, "searchCuratedDocs");
async function searchCloudflareDocs(query, options = {}) {
  const normalizedQuery = String(query || "").trim();
  const topic = normalizeDocsTopic(options.topic);
  if (!normalizedQuery && !topic) {
    return { query: "", topic: null, results: [], source: "none", checkedAt: (/* @__PURE__ */ new Date()).toISOString() };
  }
  const searchQuery = normalizedQuery || DOCS_QUICK_ACTIONS2.find((action) => action.topic === topic)?.query || topic;
  const docsServer = CLOUDFLARE_MCP_SERVERS2["cloudflare-docs"];
  try {
    const init = await withTimeout(
      mcpJsonRpc(docsServer.url, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: MCP_CLIENT_INFO
      })
    );
    if (init.ok && !init.error) {
      const toolCall = await withTimeout(
        mcpJsonRpc(docsServer.url, "tools/call", {
          name: "search_cloudflare_documentation",
          arguments: { query: searchQuery }
        })
      );
      if (toolCall.result?.content) {
        const textBlocks = toolCall.result.content.filter((block) => block.type === "text").map((block) => block.text).join("\n");
        return {
          query: searchQuery,
          topic,
          source: "cloudflare-docs-mcp",
          results: [{ title: "Documentation search", snippet: textBlocks.slice(0, 1200), topic, source: "mcp" }],
          checkedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    }
  } catch {
  }
  const fallbackResults = searchCuratedDocs(searchQuery, topic);
  return {
    query: searchQuery,
    topic,
    source: fallbackResults.length ? "curated-fallback" : "no-results",
    results: fallbackResults,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(searchCloudflareDocs, "searchCloudflareDocs");
function getDocsQuickActions(category = null) {
  const filtered = category ? DOCS_QUICK_ACTIONS2.filter((action) => action.category === normalizeDocsTopic(category) || action.topic === normalizeDocsTopic(category)) : DOCS_QUICK_ACTIONS2;
  return filtered.map((action) => ({
    ...action,
    endpoint: `/api/os/cloudflare/docs?q=${encodeURIComponent(action.query)}&topic=${encodeURIComponent(action.topic)}`
  }));
}
__name(getDocsQuickActions, "getDocsQuickActions");
async function getCloudflareApiReachability() {
  const apiProbe = await probeMcpServer("cloudflare");
  const allProbes = await probeAllMcpServers();
  return {
    apiMcp: apiProbe,
    servers: allProbes.servers,
    summary: allProbes.summary,
    health: apiProbe.reachable ? apiProbe.requiresAuth ? "requires_oauth" : "online" : "offline",
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareApiReachability, "getCloudflareApiReachability");
function evaluateCloudflareSafetyFactor(reachability, governance = {}, actionsHealth = null) {
  const servers = reachability?.servers || [];
  const offline = servers.filter((server) => server.status === "offline");
  const requiresOAuth = servers.filter((server) => server.status === "requires_oauth");
  const warnings = [];
  if (offline.length) {
    warnings.push(`Offline MCP servers: ${offline.map((server) => server.id).join(", ")}`);
  }
  if (requiresOAuth.length) {
    warnings.push(`OAuth pending for: ${requiresOAuth.map((server) => server.id).join(", ")}`);
  }
  const score2 = Math.max(0, 100 - offline.length * 25 - requiresOAuth.length * 5);
  const status = offline.length ? "degraded" : requiresOAuth.length ? "requires_oauth" : "healthy";
  const blockOnOffline = governance.cloudflareSafetyRules?.blockOnMcpOffline === true;
  const actionMap = Object.fromEntries((actionsHealth?.actions || []).map((entry) => [entry.id, entry.health]));
  return {
    score: score2,
    status,
    warnings,
    offlineCount: offline.length,
    requiresOAuthCount: requiresOAuth.length,
    blockRecommended: blockOnOffline && offline.length > 0,
    advisoryOnly: !blockOnOffline,
    actions: {
      logs: actionMap.logs || "unknown",
      metrics: actionMap.metrics || "unknown",
      build: actionMap.build || "unknown",
      bindings: actionMap["validate-bindings"] || "unknown",
      docs: actionMap["docs-search"] || "online"
    },
    metrics: {
      score: score2,
      offlineCount: offline.length,
      requiresOAuthCount: requiresOAuth.length,
      averageLatencyMs: reachability?.summary?.averageLatencyMs ?? null
    },
    bindings: {
      health: actionMap["validate-bindings"] || "unknown",
      advisoryOnly: true
    },
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(evaluateCloudflareSafetyFactor, "evaluateCloudflareSafetyFactor");
function detectLogAnomalies(logsResult = {}) {
  const lines = (logsResult.logs || []).map((line) => String(line));
  const hits = lines.filter((line) => ANOMALY_LOG_PATTERNS2.some((pattern) => pattern.test(line)));
  const triggered = hits.length >= 2 || hits.length > 0 && logsResult.health === "online";
  return {
    triggered,
    trigger: AUTONOMOUS_SIGNAL_TRIGGERS2["logs-anomaly"],
    hits: hits.slice(0, 5),
    health: logsResult.health || "unknown",
    advisory: triggered ? "Worker logs show anomaly patterns or degraded observability health." : "No log anomalies detected."
  };
}
__name(detectLogAnomalies, "detectLogAnomalies");
function detectMetricsSpike(metricsResult = {}) {
  const metrics = metricsResult.metrics || [];
  const metricText = metrics.map((entry) => JSON.stringify(entry)).join(" ");
  const keywordHits = METRICS_SPIKE_KEYWORDS2.filter((pattern) => pattern.test(metricText));
  const triggered = keywordHits.length > 0 && metricsResult.health === "online";
  return {
    triggered,
    trigger: AUTONOMOUS_SIGNAL_TRIGGERS2["metrics-spike"],
    keywordHits,
    health: metricsResult.health || "unknown",
    advisory: triggered ? "Worker metrics indicate elevated activity or degraded observability health." : "No metrics spike detected."
  };
}
__name(detectMetricsSpike, "detectMetricsSpike");
function detectBuildFailure(buildResult = {}) {
  const logs = (buildResult.logs || []).map((line) => String(line));
  const failedStage = (buildResult.stages || []).find((stage) => stage.status === "failed" || stage.status === "error");
  const logFailure = logs.some((line) => /fail|error|rejected/i.test(line));
  const healthFailure = buildResult.health === "offline" || buildResult.status === "offline";
  const triggered = Boolean(failedStage) || logFailure || healthFailure;
  return {
    triggered,
    trigger: AUTONOMOUS_SIGNAL_TRIGGERS2["build-failure"],
    failedStage: failedStage || null,
    health: buildResult.health || "unknown",
    advisory: triggered ? "Cloudflare build pipeline reports failure, offline status, or error logs." : "No build failures detected."
  };
}
__name(detectBuildFailure, "detectBuildFailure");
function detectBindingMismatch(bindingsResult = {}) {
  const missing = bindingsResult.missingBindings || [];
  const triggered = bindingsResult.valid === false || missing.length > 0;
  return {
    triggered,
    trigger: AUTONOMOUS_SIGNAL_TRIGGERS2["binding-mismatch"],
    missingBindings: missing,
    warnings: (bindingsResult.warnings || []).slice(0, 5),
    health: bindingsResult.health || bindingsResult.status || "unknown",
    advisory: triggered ? "Wrangler manifest or MCP binding validation detected mismatches." : "Bindings validated against manifest."
  };
}
__name(detectBindingMismatch, "detectBindingMismatch");
async function collectAutonomousSignalInputs() {
  const [logs, metrics, build, bindings] = await Promise.all([
    getCloudflareLogs(),
    getCloudflareMetrics(),
    runCloudflareBuild(),
    postValidateCloudflareBindings()
  ]);
  return { logs, metrics, build, bindings };
}
__name(collectAutonomousSignalInputs, "collectAutonomousSignalInputs");
function buildAutonomousGovernanceSignals(inputs = {}, governance = {}) {
  const logsAnomaly = detectLogAnomalies(inputs.logs);
  const metricsSpike = detectMetricsSpike(inputs.metrics);
  const buildFailure = detectBuildFailure(inputs.build);
  const bindingMismatch = detectBindingMismatch(inputs.bindings);
  const triggers = [];
  const advisories = [];
  const signalMap = { logsAnomaly, metricsSpike, buildFailure, bindingMismatch };
  for (const [key, signal] of Object.entries(signalMap)) {
    if (!signal.triggered) {
      continue;
    }
    triggers.push(signal.trigger.id);
    advisories.push({
      id: signal.trigger.id,
      label: signal.trigger.label,
      severity: signal.trigger.severity,
      message: signal.advisory,
      source: key
    });
  }
  const blockOnOffline = governance.cloudflareSafetyRules?.blockOnMcpOffline === true;
  return {
    triggers,
    advisories,
    signals: signalMap,
    triggerCatalog: AUTONOMOUS_SIGNAL_TRIGGERS2,
    blocking: blockOnOffline && advisories.length > 0,
    advisoryOnly: !blockOnOffline,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildAutonomousGovernanceSignals, "buildAutonomousGovernanceSignals");
async function getCloudflareAutonomousGovernanceSignals(governance = {}) {
  const inputs = await collectAutonomousSignalInputs();
  return buildAutonomousGovernanceSignals(inputs, governance);
}
__name(getCloudflareAutonomousGovernanceSignals, "getCloudflareAutonomousGovernanceSignals");
function computeCloudflareAutonomousSafety(reachability, autonomousSignals = {}, governance = {}) {
  const servers = reachability?.servers || [];
  const avgLatency = reachability?.summary?.averageLatencyMs ?? 0;
  const oauthPending = servers.filter((server) => server.status === "requires_oauth").length;
  const offline = servers.filter((server) => server.status === "offline").length;
  const autonomousWarnings = (autonomousSignals.advisories || []).map((entry) => entry.message);
  if (offline > 0) {
    autonomousWarnings.push(`Offline MCP servers detected: ${offline}.`);
  }
  if (oauthPending > 0) {
    autonomousWarnings.push(`OAuth pending on ${oauthPending} Cloudflare MCP server(s).`);
  }
  const latencyRisk = avgLatency > 2e3 ? "high" : avgLatency > 1e3 ? "medium" : "low";
  const oauthRisk = oauthPending >= 3 ? "high" : oauthPending >= 1 ? "medium" : "low";
  let autonomousScore = 100;
  autonomousScore -= offline * 15;
  autonomousScore -= oauthPending * 5;
  autonomousScore -= (autonomousSignals.triggers || []).length * 8;
  if (latencyRisk === "high") {
    autonomousScore -= 10;
  } else if (latencyRisk === "medium") {
    autonomousScore -= 5;
  }
  if (oauthRisk === "high") {
    autonomousScore -= 10;
  } else if (oauthRisk === "medium") {
    autonomousScore -= 5;
  }
  autonomousScore = Math.max(0, Math.min(100, Math.round(autonomousScore)));
  const blockOnOffline = governance.cloudflareSafetyRules?.blockOnMcpOffline === true;
  return {
    autonomousWarnings,
    autonomousScore,
    latencyRisk,
    oauthRisk,
    advisoryOnly: !blockOnOffline,
    blockRecommended: blockOnOffline && (offline > 0 || autonomousScore < 40),
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(computeCloudflareAutonomousSafety, "computeCloudflareAutonomousSafety");
async function getCloudflareSafetySnapshot(governance = {}) {
  const [reachability, actionsHealth, autonomousSignals] = await Promise.all([
    getCloudflareApiReachability(),
    getCloudflareActionsHealth(),
    getCloudflareAutonomousGovernanceSignals(governance)
  ]);
  const factor = evaluateCloudflareSafetyFactor(reachability, governance, actionsHealth);
  const autonomous = computeCloudflareAutonomousSafety(reachability, autonomousSignals, governance);
  return {
    ...factor,
    cloudflareSafety: {
      autonomousWarnings: autonomous.autonomousWarnings,
      autonomousScore: autonomous.autonomousScore,
      latencyRisk: autonomous.latencyRisk,
      oauthRisk: autonomous.oauthRisk,
      advisoryOnly: autonomous.advisoryOnly,
      blockRecommended: autonomous.blockRecommended
    },
    autonomousSignals,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareSafetySnapshot, "getCloudflareSafetySnapshot");
function simulateCloudflareEventHooks(autonomousSignals = {}, inputs = {}) {
  const signals = autonomousSignals.signals || {};
  const buildComplete = !signals.buildFailure?.triggered && (inputs.build?.health === "online" || inputs.build?.source === STATIC_BUILD_MANIFEST2.source);
  const bindingMismatch = Boolean(signals.bindingMismatch?.triggered);
  const observabilitySpike = Boolean(signals.metricsSpike?.triggered || signals.logsAnomaly?.triggered);
  const cloudflareEvents = {
    onBuildComplete: {
      ...CLOUDFLARE_EVENT_HOOKS2.onBuildComplete,
      fired: buildComplete,
      advisory: buildComplete ? "Advisory: Cloudflare build manifest stage satisfied or live build completed." : "Advisory: Build hook idle; no successful build signal detected.",
      payload: {
        worker: inputs.build?.worker || WRANGLER_BINDINGS_MANIFEST2.worker,
        status: inputs.build?.health || inputs.build?.status || "unknown",
        source: inputs.build?.source || STATIC_BUILD_MANIFEST2.source
      }
    },
    onBindingMismatch: {
      ...CLOUDFLARE_EVENT_HOOKS2.onBindingMismatch,
      fired: bindingMismatch,
      advisory: bindingMismatch ? "Advisory: Binding mismatch detected; review wrangler manifest and MCP validation." : "Advisory: Binding hook idle; no mismatch detected.",
      payload: {
        missingBindings: signals.bindingMismatch?.missingBindings || [],
        warnings: signals.bindingMismatch?.warnings || []
      }
    },
    onObservabilitySpike: {
      ...CLOUDFLARE_EVENT_HOOKS2.onObservabilitySpike,
      fired: observabilitySpike,
      advisory: observabilitySpike ? "Advisory: Observability spike or log anomaly detected." : "Advisory: Observability hook idle; no spike detected.",
      payload: {
        logsAnomaly: signals.logsAnomaly?.triggered || false,
        metricsSpike: signals.metricsSpike?.triggered || false
      }
    }
  };
  return {
    cloudflareEvents,
    simulated: true,
    advisoryOnly: true,
    firedCount: Object.values(cloudflareEvents).filter((hook) => hook.fired).length,
    hookCatalog: CLOUDFLARE_EVENT_HOOKS2,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(simulateCloudflareEventHooks, "simulateCloudflareEventHooks");
async function getCloudflareAutonomousSnapshot(governance = {}) {
  try {
    const inputs = await collectAutonomousSignalInputs();
    const autonomousSignals = buildAutonomousGovernanceSignals(inputs, governance);
    const [governanceHealth, safetySnapshot, events] = await Promise.all([
      getCloudflareGovernanceHealth(governance),
      getCloudflareSafetySnapshot(governance),
      Promise.resolve(simulateCloudflareEventHooks(autonomousSignals, inputs))
    ]);
    return {
      cloudflareGovernance: {
        ...governanceHealth,
        autonomousSignals
      },
      cloudflareSafety: safetySnapshot.cloudflareSafety,
      cloudflareEvents: events.cloudflareEvents,
      eventHooks: events,
      advisoryOnly: true,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    return buildCloudflareAdvisoryFallback("autonomous", error);
  }
}
__name(getCloudflareAutonomousSnapshot, "getCloudflareAutonomousSnapshot");
function deriveAutonomousHealth(autonomousSnapshot = {}) {
  const score2 = autonomousSnapshot.cloudflareSafety?.autonomousScore ?? 100;
  const triggers = autonomousSnapshot.cloudflareGovernance?.autonomousSignals?.triggers?.length || 0;
  if (triggers > 0) {
    return "advisory";
  }
  if (score2 >= 80) {
    return "healthy";
  }
  if (score2 >= 50) {
    return "partial";
  }
  return "degraded";
}
__name(deriveAutonomousHealth, "deriveAutonomousHealth");
function deriveInsightsHealth(insightsSnapshot = {}) {
  const score2 = insightsSnapshot.cloudflareInsightsScore ?? 100;
  if (score2 >= 80) {
    return "healthy";
  }
  if (score2 >= 50) {
    return "partial";
  }
  return "degraded";
}
__name(deriveInsightsHealth, "deriveInsightsHealth");
function deriveEventsHealth(eventsSnapshot = {}) {
  const hooks = eventsSnapshot.cloudflareEvents || eventsSnapshot;
  const fired = Object.values(hooks).filter((hook) => hook?.fired).length;
  return fired > 0 ? "advisory" : "idle";
}
__name(deriveEventsHealth, "deriveEventsHealth");
var AUTOMATION_LOOP_RECOMMENDATIONS = {
  logs: "Review Worker log anomalies and complete OAuth for cloudflare-observability MCP.",
  metrics: "Investigate metrics spike signals and validate observability dashboards.",
  build: "Run wrangler deploy --dry-run and connect cloudflare-builds MCP for live build health.",
  bindings: "Validate wrangler manifest bindings against pipeline requirements.",
  oauth: "Complete OAuth for Cloudflare MCP servers reporting requires_oauth status.",
  latency: "Review MCP server latency; investigate servers with latency above 2000ms."
};
function buildAutomationLoopEntry(active, lastSignal, recommendedAction, checkedAt) {
  return {
    active: Boolean(active),
    advisoryOnly: true,
    lastRun: checkedAt,
    lastSignal: lastSignal || "idle",
    recommendedAction
  };
}
__name(buildAutomationLoopEntry, "buildAutomationLoopEntry");
async function getCloudflareAutomationLoops(governance = {}) {
  try {
    const [reachability, autonomousSignals] = await Promise.all([
      getCloudflareApiReachability(),
      getCloudflareAutonomousGovernanceSignals(governance)
    ]);
    const checkedAt = (/* @__PURE__ */ new Date()).toISOString();
    const signals = autonomousSignals.signals || {};
    const autonomous = computeCloudflareAutonomousSafety(reachability, autonomousSignals, governance);
    const oauthServers = (reachability.servers || []).filter((server) => server.status === "requires_oauth");
    const oauthPending = oauthServers.length > 0;
    const loops = {
      logs: buildAutomationLoopEntry(
        signals.logsAnomaly?.triggered,
        signals.logsAnomaly?.triggered ? signals.logsAnomaly.advisory : "idle",
        AUTOMATION_LOOP_RECOMMENDATIONS.logs,
        checkedAt
      ),
      metrics: buildAutomationLoopEntry(
        signals.metricsSpike?.triggered,
        signals.metricsSpike?.triggered ? signals.metricsSpike.advisory : "idle",
        AUTOMATION_LOOP_RECOMMENDATIONS.metrics,
        checkedAt
      ),
      build: buildAutomationLoopEntry(
        signals.buildFailure?.triggered,
        signals.buildFailure?.triggered ? signals.buildFailure.advisory : "idle",
        AUTOMATION_LOOP_RECOMMENDATIONS.build,
        checkedAt
      ),
      bindings: buildAutomationLoopEntry(
        signals.bindingMismatch?.triggered,
        signals.bindingMismatch?.triggered ? signals.bindingMismatch.advisory : "idle",
        AUTOMATION_LOOP_RECOMMENDATIONS.bindings,
        checkedAt
      ),
      oauth: buildAutomationLoopEntry(
        oauthPending || autonomous.oauthRisk !== "low",
        oauthPending ? `OAuth pending on ${oauthServers.length} server(s)` : autonomous.oauthRisk !== "low" ? `OAuth risk: ${autonomous.oauthRisk}` : "idle",
        AUTOMATION_LOOP_RECOMMENDATIONS.oauth,
        checkedAt
      ),
      latency: buildAutomationLoopEntry(
        autonomous.latencyRisk !== "low",
        autonomous.latencyRisk !== "low" ? `Latency risk: ${autonomous.latencyRisk}` : "idle",
        AUTOMATION_LOOP_RECOMMENDATIONS.latency,
        checkedAt
      )
    };
    const activeCount = Object.values(loops).filter((loop) => loop.active).length;
    const health = deriveAutomationHealth({ loops, activeCount });
    const score2 = Math.max(0, 100 - activeCount * 15);
    const reasons = Object.entries(loops).filter(([, loop]) => loop.active).map(([id, loop]) => `${id}: ${loop.lastSignal || loop.recommendedAction || "active"}`);
    return {
      loops,
      activeCount,
      health,
      score: score2,
      mode: activeCount > 0 ? "active" : "idle",
      reasons,
      advisoryOnly: true,
      checkedAt
    };
  } catch (error) {
    return buildCloudflareAdvisoryFallback("automation", error);
  }
}
__name(getCloudflareAutomationLoops, "getCloudflareAutomationLoops");
function deriveAutomationHealth(automationSnapshot = {}) {
  const activeCount = automationSnapshot.activeCount ?? Object.values(automationSnapshot.loops || {}).filter((loop) => loop.active).length;
  if (activeCount === 0) {
    return automationSnapshot.error ? "optional" : "healthy";
  }
  if (activeCount <= 2) {
    return "advisory";
  }
  return "degraded";
}
__name(deriveAutomationHealth, "deriveAutomationHealth");
function certifyModuleForCloudflare(moduleId, context = {}) {
  const compatibility = getModuleCfCompatibility(moduleId);
  const requiredActions = compatibility.actions || ["docs"];
  const actionsHealth = context.actionsHealth || { actions: [] };
  const autonomousSignals = context.autonomousSignals || { triggers: [], advisories: [] };
  const reasons = [];
  const actionStatuses = {};
  let score2 = 30;
  const capabilityMap = {
    logs: "logs",
    metrics: "metrics",
    build: "build",
    bindings: "validate-bindings",
    docs: "docs-search"
  };
  const actionHealthMap = Object.fromEntries(
    (actionsHealth.actions || []).map((entry) => [entry.id, entry.health || "unknown"])
  );
  for (const cap of ["logs", "metrics", "build", "bindings", "docs"]) {
    const required = requiredActions.includes(cap);
    const health = actionHealthMap[capabilityMap[cap]] || actionHealthMap[cap] || "unknown";
    if (!required) {
      actionStatuses[cap] = "not-required";
      continue;
    }
    if (health === "online") {
      actionStatuses[cap] = "compatible";
      score2 += 14;
      reasons.push(`${cap} federation action online for module.`);
    } else if (health === "requires_oauth") {
      actionStatuses[cap] = "oauth-pending";
      score2 += 8;
      reasons.push(`${cap} requires OAuth; advisory compatibility maintained.`);
    } else {
      actionStatuses[cap] = "degraded";
      score2 += 2;
      reasons.push(`${cap} action degraded; certification review recommended.`);
    }
  }
  if (compatibility.cfReadyPlus) {
    score2 += 10;
    reasons.push("Module meets CF_READY+ action breadth.");
  }
  if ((autonomousSignals.triggers || []).length) {
    for (const advisory of autonomousSignals.advisories || []) {
      reasons.push(advisory.message || advisory.label || String(advisory));
    }
  }
  score2 = Math.max(0, Math.min(100, Math.round(score2)));
  let status = score2 >= 80 ? "certified" : score2 >= 50 ? "review" : "incompatible";
  if (status === "certified" && (autonomousSignals.triggers || []).length >= 3) {
    status = "review";
    reasons.push("Multiple autonomous signals active; downgrade to review.");
  }
  return {
    status,
    score: score2,
    reasons: [...new Set(reasons)].slice(0, 10),
    actions: actionStatuses,
    moduleId,
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(certifyModuleForCloudflare, "certifyModuleForCloudflare");
async function getMarketplaceCloudflareCertification(governance = {}, moduleIds = null) {
  try {
    const [actionsHealth, autonomousSignals, federation] = await Promise.all([
      getCloudflareActionsHealth(),
      getCloudflareAutonomousGovernanceSignals(governance),
      getCloudflareFederationReadiness()
    ]);
    const context = { actionsHealth, autonomousSignals, federation };
    const ids = moduleIds?.length ? moduleIds : Object.keys(MODULE_CF_ACTION_COMPATIBILITY2);
    const certifications = Object.fromEntries(ids.map((id) => [id, certifyModuleForCloudflare(id, context)]));
    const scores = Object.values(certifications).map((entry) => entry.score);
    const aggregateScore = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
    const aggregateStatus = aggregateScore >= 80 ? "certified" : aggregateScore >= 50 ? "review" : "incompatible";
    const aggregateReasons = [
      `Federation readiness ${federation.readiness} (${federation.readinessScore ?? 0}).`,
      ...(autonomousSignals.advisories || []).slice(0, 4).map((entry) => entry.message)
    ];
    return {
      certifications,
      aggregate: {
        status: aggregateStatus,
        score: aggregateScore,
        reasons: [...new Set(aggregateReasons)].slice(0, 12),
        advisoryOnly: true
      },
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    return buildCloudflareAdvisoryFallback("certification", error);
  }
}
__name(getMarketplaceCloudflareCertification, "getMarketplaceCloudflareCertification");
function deriveCertificationHealth(certificationSnapshot = {}) {
  const score2 = certificationSnapshot.aggregate?.score ?? certificationSnapshot.score ?? 100;
  if (score2 >= 80) {
    return "healthy";
  }
  if (score2 >= 50) {
    return "advisory";
  }
  return "degraded";
}
__name(deriveCertificationHealth, "deriveCertificationHealth");
function buildCloudflareSafetyAutomationFactor(automationSnapshot = {}) {
  return {
    health: deriveAutomationHealth(automationSnapshot),
    activeCount: automationSnapshot.activeCount ?? 0,
    loops: automationSnapshot.loops || {},
    advisoryOnly: true,
    checkedAt: automationSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyAutomationFactor, "buildCloudflareSafetyAutomationFactor");
function buildCloudflareSafetyCertificationFactor(certificationSnapshot = {}) {
  const aggregate = certificationSnapshot.aggregate || certificationSnapshot;
  return {
    health: deriveCertificationHealth(certificationSnapshot),
    score: aggregate.score ?? null,
    status: aggregate.status || "review",
    reasons: aggregate.reasons || [],
    advisoryOnly: true,
    checkedAt: certificationSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyCertificationFactor, "buildCloudflareSafetyCertificationFactor");
function computeInsightsScore(summaries = {}, autonomousSignals = {}, reachability = {}) {
  let score2 = 100;
  const healthPenalty = {
    offline: 20,
    degraded: 12,
    requires_oauth: 6,
    warning: 8
  };
  for (const summary of Object.values(summaries)) {
    const penalty = healthPenalty[summary.health] || healthPenalty[summary.status] || 0;
    score2 -= penalty;
    if (summary.anomaly) {
      score2 -= 10;
    }
  }
  score2 -= (autonomousSignals.triggers || []).length * 6;
  score2 -= (reachability.servers || []).filter((server) => server.status === "offline").length * 8;
  return Math.max(0, Math.min(100, Math.round(score2)));
}
__name(computeInsightsScore, "computeInsightsScore");
function getExpandedFederationScore(readinessScore, autonomousScore, insightsScore, triggers = []) {
  const base = readinessScore ?? 0;
  const auto = autonomousScore ?? 100;
  const insights = insightsScore ?? 100;
  const penalty = triggers.length * 5;
  return Math.max(0, Math.min(100, Math.round(base * 0.4 + auto * 0.3 + insights * 0.3 - penalty)));
}
__name(getExpandedFederationScore, "getExpandedFederationScore");
async function getCloudflareInsights(governance = {}) {
  const [inputs, reachability, autonomousSignals] = await Promise.all([
    collectAutonomousSignalInputs(),
    getCloudflareApiReachability(),
    getCloudflareAutonomousGovernanceSignals(governance)
  ]);
  const logs = {
    health: inputs.logs?.health || "unknown",
    status: inputs.logs?.status || "unknown",
    source: inputs.logs?.source || "unknown",
    count: (inputs.logs?.logs || []).length,
    advisory: inputs.logs?.advisory || null,
    anomaly: Boolean(autonomousSignals.signals?.logsAnomaly?.triggered),
    sample: (inputs.logs?.logs || []).slice(0, 3)
  };
  const metrics = {
    health: inputs.metrics?.health || "unknown",
    status: inputs.metrics?.status || "unknown",
    source: inputs.metrics?.source || "unknown",
    count: (inputs.metrics?.metrics || []).length,
    advisory: inputs.metrics?.advisory || null,
    anomaly: Boolean(autonomousSignals.signals?.metricsSpike?.triggered),
    sample: (inputs.metrics?.metrics || []).slice(0, 3)
  };
  const build = {
    health: inputs.build?.health || "unknown",
    status: inputs.build?.status || "unknown",
    source: inputs.build?.source || "unknown",
    stages: (inputs.build?.stages || []).map((stage) => stage.name),
    advisory: inputs.build?.advisory || null,
    anomaly: Boolean(autonomousSignals.signals?.buildFailure?.triggered),
    logCount: (inputs.build?.logs || []).length
  };
  const bindings = {
    health: inputs.bindings?.health || inputs.bindings?.status || "unknown",
    valid: inputs.bindings?.valid ?? null,
    source: inputs.bindings?.source || "unknown",
    missingBindings: inputs.bindings?.missingBindings || [],
    advisory: inputs.bindings?.advisory || null,
    anomaly: Boolean(autonomousSignals.signals?.bindingMismatch?.triggered)
  };
  const cloudflareInsights = {
    logs,
    metrics,
    build,
    bindings,
    recommendations: CLOUDFLARE_INSIGHTS_RECOMMENDATIONS2
  };
  const cloudflareInsightsScore = computeInsightsScore(
    { logs, metrics, build, bindings },
    autonomousSignals,
    reachability
  );
  return {
    cloudflareInsights,
    cloudflareInsightsScore,
    health: deriveInsightsHealth({ cloudflareInsightsScore }),
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareInsights, "getCloudflareInsights");
function computeCloudflareDecision(context = {}) {
  const reasons = [];
  const signals = context.signals || {};
  const riskBadges = {
    latency: context.latencyRisk || "low",
    oauth: context.oauthRisk || "low",
    bindings: signals.bindingMismatch?.triggered ? "anomaly" : "ok",
    build: signals.buildFailure?.triggered ? "anomaly" : "ok",
    logs: signals.logsAnomaly?.triggered ? "anomaly" : "ok",
    metrics: signals.metricsSpike?.triggered ? "anomaly" : "ok"
  };
  for (const advisory of context.advisories || []) {
    if (advisory.message) {
      reasons.push(advisory.message);
    }
  }
  let score2 = Math.round(
    (context.insightsScore ?? 50) * 0.35 + (context.federationScore ?? 50) * 0.35 + (context.autonomousScore ?? 50) * 0.3
  );
  if (context.latencyRisk === "high") {
    reasons.push("Elevated Cloudflare MCP latency risk.");
    score2 -= 10;
  } else if (context.latencyRisk === "medium") {
    reasons.push("Moderate Cloudflare MCP latency risk.");
    score2 -= 5;
  }
  if (context.oauthRisk === "high") {
    reasons.push("OAuth pending on multiple Cloudflare MCP servers.");
    score2 -= 10;
  } else if (context.oauthRisk === "medium") {
    reasons.push("OAuth required for some Cloudflare federation actions.");
    score2 -= 5;
  }
  score2 -= (context.triggers || []).length * 4;
  score2 = Math.max(0, Math.min(100, score2));
  const bindingMismatch = Boolean(signals.bindingMismatch?.triggered);
  const buildFailure = Boolean(signals.buildFailure?.triggered);
  const logsAnomaly = Boolean(signals.logsAnomaly?.triggered);
  const metricsSpike = Boolean(signals.metricsSpike?.triggered);
  const triggerCount = (context.triggers || []).length;
  let decision = "proceed";
  if (score2 < 45 || bindingMismatch || buildFailure || logsAnomaly && metricsSpike) {
    decision = "hold";
    if (bindingMismatch) {
      reasons.unshift("Binding mismatch detected \u2014 review wrangler manifest.");
    }
    if (buildFailure) {
      reasons.unshift("Build failure or offline builds MCP detected.");
    }
  } else if (score2 < 70 || triggerCount > 0 || context.latencyRisk !== "low" || context.oauthRisk !== "low") {
    decision = "caution";
  }
  const blockOnOffline = context.blockOnOffline === true;
  return {
    decision,
    reasons: [...new Set(reasons)].slice(0, 12),
    score: score2,
    advisoryOnly: !blockOnOffline,
    riskBadges,
    summary: {
      decision,
      score: score2,
      triggerCount,
      federationScore: context.federationScore ?? null,
      insightsScore: context.insightsScore ?? null,
      autonomousScore: context.autonomousScore ?? null
    },
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(computeCloudflareDecision, "computeCloudflareDecision");
async function getCloudflareDecision(governance = {}, options = {}) {
  try {
    const [autonomous, insights, federation] = await Promise.all([
      getCloudflareAutonomousSnapshot(governance),
      getCloudflareInsights(governance),
      getCloudflareFederationReadiness()
    ]);
    const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
    const federationScore = getExpandedFederationScore(
      federation.readinessScore,
      autonomous.cloudflareSafety?.autonomousScore,
      insights.cloudflareInsightsScore,
      triggers
    );
    const context = {
      insightsScore: insights.cloudflareInsightsScore,
      federationScore,
      autonomousScore: autonomous.cloudflareSafety?.autonomousScore,
      triggers,
      advisories: autonomous.cloudflareGovernance?.autonomousSignals?.advisories || [],
      signals: autonomous.cloudflareGovernance?.autonomousSignals?.signals || {},
      latencyRisk: autonomous.cloudflareSafety?.latencyRisk || "low",
      oauthRisk: autonomous.cloudflareSafety?.oauthRisk || "low",
      blockOnOffline: governance.cloudflareSafetyRules?.blockOnMcpOffline === true,
      moduleId: options.moduleId || null
    };
    const decision = computeCloudflareDecision(context);
    return {
      ...decision,
      advisoryOnly: true,
      route: "/api/os/cloudflare/decision"
    };
  } catch (error) {
    return buildCloudflareAdvisoryFallback("decision", error);
  }
}
__name(getCloudflareDecision, "getCloudflareDecision");
function deriveDecisionHealth(decision = {}) {
  if (decision.decision === "proceed") {
    return "healthy";
  }
  if (decision.decision === "caution") {
    return "advisory";
  }
  return "degraded";
}
__name(deriveDecisionHealth, "deriveDecisionHealth");
function derivePipelineRisk(decision = {}) {
  if (decision.decision === "hold") {
    return "high";
  }
  if (decision.decision === "caution") {
    return "medium";
  }
  return "low";
}
__name(derivePipelineRisk, "derivePipelineRisk");
async function getCloudflarePipelineDecision(governance = {}, moduleId = null) {
  const decision = await getCloudflareDecision(governance, { moduleId });
  return {
    cloudflarePipelineDecision: decision.decision,
    cloudflarePipelineRisk: derivePipelineRisk(decision),
    cloudflarePipelineAdvisories: decision.reasons,
    advisoryOnly: true,
    score: decision.score,
    riskBadges: decision.riskBadges,
    checkedAt: decision.checkedAt
  };
}
__name(getCloudflarePipelineDecision, "getCloudflarePipelineDecision");
function pickModuleInsights(insights, moduleActions = []) {
  if (!insights) {
    return {};
  }
  const picked = {};
  if (moduleActions.includes("logs")) {
    picked.logs = insights.logs;
  }
  if (moduleActions.includes("metrics")) {
    picked.metrics = insights.metrics;
  }
  if (moduleActions.includes("build")) {
    picked.build = insights.build;
  }
  if (moduleActions.includes("bindings")) {
    picked.bindings = insights.bindings;
  }
  if (!Object.keys(picked).length) {
    return { docs: { advisory: "Module uses docs-first Cloudflare federation." } };
  }
  return picked;
}
__name(pickModuleInsights, "pickModuleInsights");
function getModuleCloudflareDecisionFields(moduleId, baseDecision, insightsSnapshot) {
  const compatibility = getModuleCfCompatibility(moduleId);
  const moduleInsights = pickModuleInsights(insightsSnapshot?.cloudflareInsights, compatibility.actions);
  let risk = "low";
  if (baseDecision.decision === "hold") {
    risk = "high";
  } else if (baseDecision.decision === "caution") {
    risk = "medium";
  }
  if (compatibility.actions.includes("bindings") && baseDecision.riskBadges?.bindings === "anomaly") {
    risk = risk === "low" ? "medium" : "high";
  }
  return {
    cloudflareDecision: baseDecision.decision,
    cloudflareModuleRisk: risk,
    cloudflareModuleInsights: moduleInsights
  };
}
__name(getModuleCloudflareDecisionFields, "getModuleCloudflareDecisionFields");
async function getCloudflareGovernanceDecisioning(governance = {}, env = {}) {
  const [decision, automation, certification, crossDivision, orchestration, execution, insights, autonomous, reachability] = await Promise.all([
    getCloudflareDecision(governance),
    getCloudflareAutomationLoops(governance),
    getMarketplaceCloudflareCertification(governance),
    getCloudflareCrossDivisionSync(governance, env),
    getCloudflareOrchestration(governance, env),
    getCloudflareExecution(governance, env),
    getCloudflareInsights(governance),
    getCloudflareAutonomousSnapshot(governance),
    getCloudflareApiReachability()
  ]);
  const activeLoops = Object.entries(automation.loops || {}).filter(([, loop]) => loop.active).map(([id]) => id);
  let recommendedAction = decision.decision === "proceed" ? "Continue with optional Cloudflare MCP federation; no blocking advisories." : decision.decision === "caution" ? "Review Cloudflare advisories and complete OAuth before high-impact pipeline or release actions." : "Pause promotion activities until binding mismatches and build issues are resolved.";
  if (activeLoops.length) {
    recommendedAction += ` Active automation loops: ${activeLoops.join(", ")}.`;
  }
  if (certification.aggregate?.status === "incompatible") {
    recommendedAction += " Marketplace certification reports incompatible modules; review before promotion.";
  }
  if (crossDivision.syncStatus === "divergent") {
    recommendedAction += " Cross-division Cloudflare sync is divergent; reconcile operator-shell and marketplace-backend federation metadata.";
  } else if (crossDivision.syncStatus === "partial") {
    recommendedAction += " Cross-division sync is partial; review marketplace sync advisories.";
  }
  const crossDivisionRecommendedAction = crossDivision.syncStatus === "aligned" ? "Cross-division Cloudflare federation metadata is aligned across repos." : crossDivision.syncStatus === "partial" ? "Review cross-division sync reasons and reconcile certification/automation deltas between divisions." : "Cross-division federation divergent; pause promotion until operator-shell and marketplace-backend signals reconcile.";
  const orchestrationRecommendedAction = orchestration.orchestrationHealth === "healthy" ? "Multi-agent Cloudflare orchestration coordinated; continue advisory federation workflows." : orchestration.orchestrationHealth === "advisory" ? `Review orchestration plan (${(orchestration.plan || []).length} steps); ${(orchestration.recommendedActions || [])[0] || "advisory coordination recommended."}` : `Orchestration degraded (score ${orchestration.orchestrationScore ?? "n/a"}); defer promotion until high-priority steps resolve.`;
  const executionRecommendedAction = execution.executionHealth === "healthy" ? "Autonomous execution recommendations ready; proceed with advisory operator actions." : execution.executionHealth === "advisory" ? `Review execution plan (${(execution.executionPlan || []).length} steps); ${(execution.nextActions || [])[0] || "advisory execution review recommended."}` : `Execution degraded (score ${execution.executionScore ?? "n/a"}); defer autonomous actions until high-priority steps resolve.`;
  const adaptive = buildCloudflareAdaptiveFromSignals({
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
    reachability
  });
  const adaptiveRecommendedAction = adaptive.adaptiveState?.mode === "steady" ? "Adaptive runtime steady; normal UI hints." : adaptive.adaptiveState?.mode === "review" ? `Adaptive review mode: ${(adaptive.adaptiveState.reasons || []).slice(0, 2).join(" ")}` : adaptive.adaptiveState?.mode === "degraded" ? "Adaptive degraded; Cloudflare signals missing \u2014 use fallback hints." : `Adaptive caution mode: ${(adaptive.operatorGuidance || [])[0] || "review advisories."}`;
  const predictive = buildCloudflarePredictiveFromSignals({
    adaptive,
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
    reachability
  });
  const predictiveRecommendedAction = predictive.predictiveState?.forecastMode === "stable" ? "Predictive forecast stable; no major federation changes expected." : predictive.predictiveState?.forecastMode === "watch" ? `Predictive watch: ${(predictive.predictiveState.forecastReasons || []).slice(0, 2).join(" ")}` : predictive.predictiveState?.forecastMode === "fallback" ? "Predictive fallback; complete OAuth to improve forecast accuracy." : `Predictive alert: ${(predictive.recommendedPreemptiveActions || [])[0] || "review preemptive advisories."}`;
  const strategic = buildCloudflareStrategicFromSignals({
    predictive,
    adaptive,
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous
  });
  const strategicRecommendedAction = strategic.strategicState?.stripMode === "stable" ? `Strategic posture stable (${strategic.strategicState.horizon} horizon); maintain federation steady-state.` : strategic.strategicState?.stripMode === "prioritize" ? `Strategic prioritize: ${(strategic.strategicPlan || []).slice(0, 2).map((step) => step.action).join(" ")}` : `Strategic watch (${strategic.strategicState?.horizon || "medium"} horizon): ${(strategic.recommendedCampaigns || [])[0] || "review advisory plan."}`;
  const ucip = buildCloudflareUcipFromSignals({
    automation,
    autonomous,
    decision,
    certification,
    crossDivision,
    orchestration,
    execution,
    adaptive,
    predictive,
    strategic,
    insights
  });
  const ucipRecommendedAction = ucip.ucipState?.mode === "green" ? "UCIP green: synthesized federation stable; continue normal workflows." : ucip.ucipState?.mode === "red" ? `UCIP red: ${(ucip.ucipReasons || []).slice(0, 2).join(" ")}` : `UCIP ${ucip.ucipState?.mode}: ${(ucip.ucipRecommendedActions || [])[0] || "review unified advisories."}`;
  const amg = buildCloudflareAmgFromUcip(ucip);
  const amgRecommendedAction = amg.amgState?.mode === "govern_green" ? "AMG green: UCIP stable; continue with standard governance review." : amg.amgState?.mode === "govern_red" ? `AMG red: ${(amg.amgReasons || []).slice(0, 2).join(" ")}` : `AMG ${amg.amgState?.mode}: ${(amg.amgOperatorNudges || [])[0]?.nudge || (amg.amgRules || [])[0]?.rule || "review AMG guidance."}`;
  const alignmentContext = await buildCalAlignmentContextFromEnv(governance, env, {});
  const cba = buildCloudflareCbaFromAmg(amg, ucip, alignmentContext);
  const cal = buildCloudflareCalFromCba(cba, amg, ucip, alignmentContext);
  const ihl = buildCloudflareIhlFromCal(cal, cba, amg, ucip, alignmentContext);
  const iarl = buildCloudflareIarlFromIhl(ihl, cal, cba, amg, ucip, alignmentContext);
  const acl = buildCloudflareAclFromIarl(iarl, ihl, cal, cba, amg, ucip, alignmentContext);
  const calRecommendedAction = cal.calState?.mode === "align_green" ? "CAL green: cognitive posture aligned with UCIP + AMG + CBA." : cal.calState?.mode === "align_red" ? `CAL red: ${(cal.calReasons || []).slice(0, 2).join(" ")}` : `CAL ${cal.calState?.mode}: ${(cal.calOperatorAlignmentHints || [])[0] || (cal.calAlignmentWarnings || [])[0] || "review alignment guidance."}`;
  const ihlRecommendedAction = ihl.ihlState?.mode === "intent_green" ? "IHL green: operator, mission, and OS intent harmonized with UCIP + AMG + CBA + CAL." : ihl.ihlState?.mode === "intent_red" ? `IHL red: ${(ihl.ihlReasons || []).slice(0, 2).join(" ")}` : `IHL ${ihl.ihlState?.mode}: ${(ihl.ihlOperatorIntentHints || [])[0] || (ihl.ihlIntentWarnings || [])[0] || "review intent harmonization guidance."}`;
  const iarlRecommendedAction = iarl.iarlState?.mode === "resonance_green" ? "IARL green: intent and actions resonate across operator, mission, and OS layers." : iarl.iarlState?.mode === "resonance_red" ? `IARL red: ${(iarl.iarlReasons || []).slice(0, 2).join(" ")}` : `IARL ${iarl.iarlState?.mode}: ${(iarl.iarlOperatorResonanceHints || [])[0] || (iarl.iarlResonanceWarnings || [])[0] || "review resonance guidance."}`;
  const aclRecommendedAction = acl.aclState?.mode === "coherence_green" ? "ACL green: OS coherence aligned across operator, mission, marketplace, and system layers." : acl.aclState?.mode === "coherence_red" ? `ACL red: ${(acl.aclReasons || []).slice(0, 2).join(" ")}` : `ACL ${acl.aclState?.mode}: ${(acl.aclOperatorCoherenceHints || [])[0] || (acl.aclCoherenceWarnings || [])[0] || "review coherence guidance."}`;
  return {
    decisioning: decision,
    recommendedAction,
    automationSignals: automation,
    certificationSignals: certification.aggregate,
    crossDivisionSignals: crossDivision,
    crossDivisionRecommendedAction,
    orchestrationSignals: orchestration,
    orchestrationRecommendedAction,
    executionSignals: execution,
    executionRecommendedAction,
    adaptiveSignals: adaptive,
    adaptiveRecommendedAction,
    predictiveSignals: predictive,
    predictiveRecommendedAction,
    strategicSignals: strategic,
    strategicRecommendedAction,
    ucipSignals: ucip,
    ucipRecommendedAction,
    amgState: amg.amgState,
    amgRules: amg.amgRules,
    amgOperatorNudges: amg.amgOperatorNudges,
    amgPolicyHints: amg.amgPolicyHints,
    amgRecommendedAction,
    cbaState: cba.cbaState,
    cbaBehaviorPatterns: cba.cbaBehaviorPatterns,
    cbaBehaviorDriftWarnings: cba.cbaBehaviorDriftWarnings,
    cbaBehaviorHints: [...cba.cbaOperatorBehaviorHints || [], ...cba.cbaSystemBehaviorHints || []],
    calState: cal.calState,
    calAlignmentFindings: cal.calAlignmentFindings,
    calAlignmentWarnings: cal.calAlignmentWarnings,
    calAlignmentHints: [...cal.calOperatorAlignmentHints || [], ...cal.calSystemAlignmentHints || []],
    calRecommendedAction,
    ihlState: ihl.ihlState,
    ihlIntentFindings: ihl.ihlIntentFindings,
    ihlIntentWarnings: ihl.ihlIntentWarnings,
    ihlIntentHints: [...ihl.ihlOperatorIntentHints || [], ...ihl.ihlSystemIntentHints || []],
    ihlRecommendedAction,
    iarlState: iarl.iarlState,
    iarlResonanceFindings: iarl.iarlResonanceFindings,
    iarlResonanceWarnings: iarl.iarlResonanceWarnings,
    iarlResonanceHints: [...iarl.iarlOperatorResonanceHints || [], ...iarl.iarlSystemResonanceHints || []],
    iarlRecommendedAction,
    aclState: acl.aclState,
    aclCoherenceFindings: acl.aclCoherenceFindings,
    aclCoherenceWarnings: acl.aclCoherenceWarnings,
    aclCoherenceHints: [...acl.aclOperatorCoherenceHints || [], ...acl.aclSystemCoherenceHints || []],
    aclRecommendedAction,
    riskSummary: {
      latency: decision.riskBadges?.latency || "low",
      oauth: decision.riskBadges?.oauth || "low",
      logs: decision.riskBadges?.logs || "ok",
      metrics: decision.riskBadges?.metrics || "ok",
      build: decision.riskBadges?.build || "ok",
      bindings: decision.riskBadges?.bindings || "ok",
      score: decision.score,
      decision: decision.decision,
      triggerCount: decision.summary?.triggerCount ?? 0
    },
    advisoryOnly: governance.cloudflareSafetyRules?.blockOnMcpOffline !== true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareGovernanceDecisioning, "getCloudflareGovernanceDecisioning");
async function getCloudflareGovernanceSignals(governance = {}) {
  const observability = await getCloudflareObservabilityChecks();
  const reachability = await getCloudflareApiReachability();
  const actionsHealth = await getCloudflareActionsHealth();
  const federation = await getCloudflareFederationReadiness();
  const autonomousSignals = await getCloudflareAutonomousGovernanceSignals(governance);
  return {
    observabilityHealth: observability.health,
    docsHealth: observability.docsHealth,
    reachabilityHealth: reachability.health,
    actionsHealth: actionsHealth.health,
    federationScore: federation.readinessScore ?? 0,
    oauthStatus: Object.fromEntries((reachability.servers || []).map((server) => [server.id, server.oauthStatus])),
    latencyMs: observability.latencyMs,
    serverStatus: observability.serverStatus,
    offlineServers: (reachability.servers || []).filter((server) => server.status === "offline").map((server) => server.id),
    requiresOAuthServers: (reachability.servers || []).filter((server) => server.status === "requires_oauth").map((server) => server.id),
    autonomousSignals,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareGovernanceSignals, "getCloudflareGovernanceSignals");
async function getCloudflareGovernanceHealth(governance = {}) {
  const signals = await getCloudflareGovernanceSignals(governance);
  const health = signals.offlineServers.length ? "degraded" : signals.requiresOAuthServers.length ? "requires_oauth" : "online";
  const blockOnOffline = governance.cloudflareSafetyRules?.blockOnMcpOffline === true;
  return {
    health,
    signals,
    actionsHealth: signals.actionsHealth,
    autonomousSignals: signals.autonomousSignals,
    advisoryOnly: !blockOnOffline,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareGovernanceHealth, "getCloudflareGovernanceHealth");
function getCloudflareMcpMetadata() {
  return {
    enabled: true,
    optional: true,
    configPath: ".cursor/mcp.json",
    surfaces: FEDERATION_SURFACES2,
    servers: Object.values(CLOUDFLARE_MCP_SERVERS2).map((server) => ({
      id: server.id,
      label: server.label,
      url: server.url,
      auth: server.auth,
      description: server.description
    })),
    skills: CLOUDFLARE_SKILLS2,
    routes: {
      status: "/api/os/cloudflare",
      docs: "/api/os/cloudflare/docs",
      federation: "/api/os/federation/cloudflare",
      releases: "/api/os/releases/cloudflare",
      logsFetch: "/api/os/cloudflare/logs/fetch",
      metricsFetch: "/api/os/cloudflare/metrics/fetch",
      buildRun: "/api/os/cloudflare/build/run",
      bindingsValidate: "/api/os/cloudflare/bindings/validate",
      docsQuery: "/api/os/cloudflare/docs/query",
      quickActions: "/api/os/cloudflare/quick-actions",
      autonomous: "/api/os/cloudflare/autonomous",
      automation: "/api/os/cloudflare/automation",
      events: "/api/os/cloudflare/events",
      insights: "/api/os/cloudflare/insights",
      decision: "/api/os/cloudflare/decision",
      certification: "/api/marketplace/certification",
      sync: "/api/os/cloudflare/sync",
      crossDivision: "/api/os/cloudflare/cross-division",
      orchestration: CLOUDFLARE_ORCHESTRATION2.routes.orchestration,
      agents: CLOUDFLARE_ORCHESTRATION2.routes.agents,
      execution: CLOUDFLARE_EXECUTION2.routes.execution,
      executionSignals: CLOUDFLARE_EXECUTION2.routes.signals,
      adaptive: CLOUDFLARE_ADAPTIVE2.route,
      predictive: CLOUDFLARE_PREDICTIVE2.route,
      strategic: CLOUDFLARE_STRATEGIC2.route,
      ucip: CLOUDFLARE_UCIP2.route,
      amg: CLOUDFLARE_AMG2.route,
      cba: CLOUDFLARE_CBA2.route,
      cal: CLOUDFLARE_CAL2.route,
      ihl: CLOUDFLARE_IHL2.route,
      iarl: CLOUDFLARE_IARL2.route,
      acl: CLOUDFLARE_ACL2.route
    },
    actions: CLOUDFLARE_FEDERATION_ACTIONS2,
    topics: DOCS_TOPIC_CATEGORIES2,
    quickActions: getDocsQuickActions()
  };
}
__name(getCloudflareMcpMetadata, "getCloudflareMcpMetadata");
async function getCloudflareFederationReadiness() {
  const reachability = await getCloudflareApiReachability();
  const observability = await getCloudflareObservabilityChecks();
  const actionHealth = await getCloudflareActionHealthSummary();
  const surfaces = Object.values(FEDERATION_SURFACES2).map((surface) => ({
    ...surface,
    cloudflareReady: reachability.health !== "offline",
    observabilityHealth: observability.health
  }));
  const readinessScore = Math.round(
    ((reachability.summary?.online || 0) + (reachability.summary?.requiresOAuth || 0) * 0.5) / Math.max(reachability.summary?.total || 1, 1) * 100
  );
  const actionSummary = actionHealth.actionsHealth?.summary || {};
  return {
    readiness: readinessScore >= 80 ? "ready" : readinessScore >= 50 ? "partial" : "degraded",
    readinessScore,
    surfaces,
    mcp: reachability,
    observability,
    actionHealth,
    actionsSummary: actionSummary,
    skills: CLOUDFLARE_SKILLS2,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareFederationReadiness, "getCloudflareFederationReadiness");
async function getCloudflareFederationSnapshot() {
  const readiness = await getCloudflareFederationReadiness();
  return {
    federation: "cloudflare-mcp",
    optional: true,
    metadata: getCloudflareMcpMetadata(),
    readiness,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareFederationSnapshot, "getCloudflareFederationSnapshot");
async function getCloudflareVersionHealth(governance = {}, env = {}) {
  return runAdvisoryGuarded(
    () => computeCloudflareVersionHealthCore(governance, env),
    "version",
    { timeoutMs: ADVISORY_VERSION_TIMEOUT_MS, cacheTtlMs: ADVISORY_VERSION_CACHE_TTL_MS }
  );
}
__name(getCloudflareVersionHealth, "getCloudflareVersionHealth");
async function computeCloudflareVersionHealthCore(governance = {}, env = {}) {
  const [probes, federationHeartbeat, autonomous, insights, automation, certification, crossDivision, orchestration, execution] = await Promise.all([
    probeAllMcpServers(),
    getCloudflareFederationHeartbeat(),
    getCloudflareAutonomousSnapshot(governance),
    getCloudflareInsights(governance),
    getCloudflareAutomationLoops(governance),
    getMarketplaceCloudflareCertification(governance),
    getCloudflareCrossDivisionFederation(governance, env),
    getCloudflareOrchestration(governance, env),
    getCloudflareExecution(governance, env)
  ]);
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
  const expandedScore = getExpandedFederationScore(
    federationHeartbeat.cloudflareFederationScore,
    autonomous.cloudflareSafety?.autonomousScore,
    insights.cloudflareInsightsScore,
    triggers
  );
  const decision = await getCloudflareDecision(governance);
  const adaptiveRuntime = buildCloudflareAdaptiveFromSignals({
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
    reachability: { servers: probes.servers, health: probes.summary.offline ? "offline" : "online" }
  });
  const predictiveRuntime = buildCloudflarePredictiveFromSignals({
    adaptive: adaptiveRuntime,
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous,
    reachability: { servers: probes.servers, health: probes.summary.offline ? "offline" : "online" }
  });
  const strategicRuntime = buildCloudflareStrategicFromSignals({
    predictive: predictiveRuntime,
    adaptive: adaptiveRuntime,
    orchestration,
    crossDivision,
    certification,
    decision,
    execution,
    automation,
    insights,
    autonomous
  });
  const ucipRuntime = buildCloudflareUcipFromSignals({
    automation,
    autonomous,
    decision,
    certification,
    crossDivision,
    orchestration,
    execution,
    adaptive: adaptiveRuntime,
    predictive: predictiveRuntime,
    strategic: strategicRuntime,
    insights
  });
  const amgRuntime = buildCloudflareAmgFromUcip(ucipRuntime);
  const versionAlignmentContext = await buildCalAlignmentContextFromEnv(governance, env, {});
  const cbaRuntime = buildCloudflareCbaFromAmg(amgRuntime, ucipRuntime, versionAlignmentContext);
  const calRuntime = buildCloudflareCalFromCba(cbaRuntime, amgRuntime, ucipRuntime, versionAlignmentContext);
  const ihlRuntime = buildCloudflareIhlFromCal(calRuntime, cbaRuntime, amgRuntime, ucipRuntime, versionAlignmentContext);
  const iarlRuntime = buildCloudflareIarlFromIhl(ihlRuntime, calRuntime, cbaRuntime, amgRuntime, ucipRuntime, versionAlignmentContext);
  const aclRuntime = buildCloudflareAclFromIarl(iarlRuntime, ihlRuntime, calRuntime, cbaRuntime, amgRuntime, ucipRuntime, versionAlignmentContext);
  return {
    health: probes.summary.offline ? "degraded" : probes.summary.requiresOAuth ? "requires_oauth" : "online",
    cloudflareFederationHealth: expandedScore >= 80 ? "ready" : expandedScore >= 50 ? "partial" : "degraded",
    cloudflareAutonomousHealth: deriveAutonomousHealth(autonomous),
    cloudflareInsightsHealth: insights.health,
    cloudflareDecisionHealth: deriveDecisionHealth(decision),
    cloudflareAutomationHealth: deriveAutomationHealth(automation),
    cloudflareCertificationHealth: deriveCertificationHealth(certification),
    cloudflareAutonomousScore: autonomous.cloudflareSafety?.autonomousScore ?? null,
    cloudflareInsightsScore: insights.cloudflareInsightsScore,
    cloudflareDecisionScore: decision.score,
    cloudflareCertificationScore: certification.aggregate?.score ?? null,
    cloudflareCrossDivisionHealth: crossDivision.cloudflareCrossDivisionHealth,
    cloudflareCrossDivisionScore: crossDivision.cloudflareCrossDivisionScore,
    cloudflareCrossDivisionSyncStatus: crossDivision.syncStatus,
    cloudflareOrchestrationHealth: orchestration.orchestrationHealth,
    cloudflareOrchestrationScore: orchestration.orchestrationScore,
    cloudflareExecutionHealth: execution.executionHealth,
    cloudflareExecutionScore: execution.executionScore,
    cloudflareAdaptiveHealth: adaptiveRuntime.adaptiveHealth,
    cloudflareAdaptiveScore: adaptiveRuntime.adaptiveScore,
    cloudflareAdaptiveMode: adaptiveRuntime.adaptiveState?.mode,
    cloudflarePredictiveHealth: predictiveRuntime.predictiveHealth,
    cloudflarePredictiveScore: predictiveRuntime.predictiveScore,
    cloudflarePredictiveMode: predictiveRuntime.predictiveState?.forecastMode,
    cloudflareStrategicHealth: strategicRuntime.strategicHealth,
    cloudflareStrategicScore: strategicRuntime.strategicScore,
    cloudflareStrategicHorizon: strategicRuntime.strategicState?.horizon,
    cloudflareUCIPHealth: ucipRuntime.ucipHealth,
    cloudflareUCIPScore: ucipRuntime.ucipScore,
    cloudflareUCIPMode: ucipRuntime.ucipState?.mode,
    cloudflareAMGHealth: amgRuntime.amgHealth,
    cloudflareAMGScore: amgRuntime.amgScore,
    cloudflareAMGMode: amgRuntime.amgState?.mode,
    cloudflareCBAHealth: cbaRuntime.cbaHealth,
    cloudflareCBAScore: cbaRuntime.cbaScore,
    cloudflareCBAMode: cbaRuntime.cbaState?.mode,
    cloudflareCALHealth: calRuntime.calHealth,
    cloudflareCALScore: calRuntime.calScore,
    cloudflareCALMode: calRuntime.calState?.mode,
    cloudflareIHLHealth: ihlRuntime.ihlHealth,
    cloudflareIHLScore: ihlRuntime.ihlScore,
    cloudflareIHLMode: ihlRuntime.ihlState?.mode,
    cloudflareIARLHealth: iarlRuntime.iarlHealth,
    cloudflareIARLScore: iarlRuntime.iarlScore,
    cloudflareIARLMode: iarlRuntime.iarlState?.mode,
    cloudflareACLHealth: aclRuntime.aclHealth,
    cloudflareACLScore: aclRuntime.aclScore,
    cloudflareACLMode: aclRuntime.aclState?.mode,
    servers: probes.servers.map((server) => ({
      id: server.id,
      status: server.status,
      latencyMs: server.latencyMs,
      oauthStatus: server.oauthStatus
    })),
    summary: probes.summary,
    federation: {
      ...federationHeartbeat,
      expandedScore
    },
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(computeCloudflareVersionHealthCore, "computeCloudflareVersionHealthCore");
async function getCloudflareIntegrationSnapshot(governance = {}) {
  const [observability, builds, bindings, reachability, federation, governanceHealth, autonomous, insights] = await Promise.all([
    getCloudflareHeartbeatDeep(),
    getCloudflareBuildPreview(),
    getCloudflareBindingsInspection(),
    getCloudflareApiReachability(),
    getCloudflareFederationSnapshot(),
    getCloudflareGovernanceHealth(governance),
    getCloudflareAutonomousSnapshot(governance),
    getCloudflareInsights(governance)
  ]);
  return {
    metadata: getCloudflareMcpMetadata(),
    observability,
    builds,
    bindings,
    reachability,
    federation,
    governance: governanceHealth,
    cloudflareGovernance: autonomous.cloudflareGovernance,
    cloudflareSafety: autonomous.cloudflareSafety,
    cloudflareEvents: autonomous.cloudflareEvents,
    cloudflareInsights: insights.cloudflareInsights,
    cloudflareInsightsScore: insights.cloudflareInsightsScore,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getCloudflareIntegrationSnapshot, "getCloudflareIntegrationSnapshot");
function compactDivisionSnapshot(snapshot = {}) {
  return {
    decision: snapshot.decision ?? "optional",
    certification: snapshot.certification ?? { status: "review", score: 50 },
    automation: snapshot.automation ?? { activeCount: 0, loops: {} },
    insights: snapshot.insights ?? { score: 50, health: "optional" },
    autonomous: snapshot.autonomous ?? { triggers: [], advisoryCount: 0 },
    score: snapshot.score ?? 0
  };
}
__name(compactDivisionSnapshot, "compactDivisionSnapshot");
async function buildOperatorShellDivisionSnapshot(governance = {}, moduleIds = null) {
  const [decision, certification, automation, insights, federation, autonomous, reachability] = await Promise.all([
    getCloudflareDecision(governance),
    getMarketplaceCloudflareCertification(governance, moduleIds),
    getCloudflareAutomationLoops(governance),
    getCloudflareInsights(governance),
    getCloudflareFederationReadiness(),
    getCloudflareAutonomousGovernanceSignals(governance),
    getCloudflareApiReachability()
  ]);
  const autonomousSafety = computeCloudflareAutonomousSafety(reachability, autonomous, governance);
  const score2 = getExpandedFederationScore(
    federation.readinessScore,
    autonomousSafety.autonomousScore,
    insights.cloudflareInsightsScore,
    autonomous.triggers || []
  );
  return {
    division: CROSS_DIVISION_SYNC2.operatorShell.division,
    repo: CROSS_DIVISION_SYNC2.operatorShell.repo,
    decision: decision.decision,
    certification: certification.aggregate || { status: "review", score: 50 },
    automation: {
      activeCount: automation.activeCount ?? 0,
      loops: automation.loops || {}
    },
    insights: {
      score: insights.cloudflareInsightsScore,
      health: insights.health
    },
    autonomous: {
      triggers: autonomous.triggers || [],
      advisoryCount: (autonomous.advisories || []).length,
      signals: autonomous.signals || {}
    },
    score: score2,
    advisoryOnly: true,
    source: "live",
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildOperatorShellDivisionSnapshot, "buildOperatorShellDivisionSnapshot");
function buildAdvisoryMarketplaceBackendSnapshot(operatorSnapshot = null) {
  const operator = compactDivisionSnapshot(operatorSnapshot || {});
  const oauthMissing = true;
  return {
    division: CROSS_DIVISION_SYNC2.marketplaceBackend.division,
    repo: CROSS_DIVISION_SYNC2.marketplaceBackend.repo,
    decision: operator.decision === "hold" ? "caution" : operator.decision,
    certification: {
      status: operator.certification?.status || "review",
      score: Math.max(0, (operator.certification?.score ?? 50) - (oauthMissing ? 6 : 0)),
      reasons: ["Advisory manifest snapshot; live marketplace backend unavailable or OAuth pending."]
    },
    automation: {
      activeCount: Math.max(0, (operator.automation?.activeCount ?? 0) - (oauthMissing ? 1 : 0)),
      loops: operator.automation?.loops || {}
    },
    insights: {
      score: Math.max(0, (operator.insights?.score ?? 50) - (oauthMissing ? 4 : 0)),
      health: operator.insights?.health || "optional"
    },
    autonomous: {
      triggers: (operator.autonomous?.triggers || []).slice(0, 2),
      advisoryCount: operator.autonomous?.advisoryCount ?? 0
    },
    score: Math.max(0, (operator.score ?? 50) - (oauthMissing ? 5 : 0)),
    advisoryOnly: true,
    source: "advisory-manifest",
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildAdvisoryMarketplaceBackendSnapshot, "buildAdvisoryMarketplaceBackendSnapshot");
async function fetchMarketplaceBackendDivisionSnapshot(env = {}, operatorSnapshot = null) {
  const syncConfig = CROSS_DIVISION_SYNC2.marketplaceBackend;
  const candidates = [
    env.MARKETPLACE_TRACKING_URL,
    env.MARKETPLACE_BACKEND_URL,
    env.UPSTREAM_ENGINE_URL ? `${String(env.UPSTREAM_ENGINE_URL).replace(/\/$/, "")}${syncConfig.syncRoute}` : null,
    `http://127.0.0.1:${syncConfig.defaultPort}${syncConfig.syncRoute}`
  ].filter(Boolean);
  for (const candidate of candidates) {
    const url = candidate.includes("/api/") ? candidate : `${String(candidate).replace(/\/$/, "")}${syncConfig.syncRoute}`;
    try {
      const response = await withTimeout(fetch(url, { headers: { Accept: "application/json" } }), CROSS_DIVISION_FETCH_TIMEOUT_MS);
      if (!response.ok) {
        continue;
      }
      const payload = await response.json();
      const snapshot = payload.marketplaceBackend ? {
        ...payload.marketplaceBackend,
        certifications: payload.certifications,
        modules: payload.modules
      } : payload.snapshot || payload;
      if (snapshot && (snapshot.decision || snapshot.score != null)) {
        return {
          ...snapshot,
          division: syncConfig.division,
          repo: syncConfig.repo,
          source: "live",
          advisoryOnly: true,
          checkedAt: snapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    } catch {
    }
  }
  return buildAdvisoryMarketplaceBackendSnapshot(operatorSnapshot);
}
__name(fetchMarketplaceBackendDivisionSnapshot, "fetchMarketplaceBackendDivisionSnapshot");
function valuesWithinTolerance(left, right, tolerance = CROSS_DIVISION_SYNC2.scoreTolerance) {
  if (left == null || right == null) {
    return false;
  }
  if (typeof left === "number" && typeof right === "number") {
    return Math.abs(left - right) <= tolerance;
  }
  return String(left) === String(right);
}
__name(valuesWithinTolerance, "valuesWithinTolerance");
function compareCrossDivisionSnapshots(operatorSnapshot = {}, marketplaceSnapshot = {}) {
  const operator = compactDivisionSnapshot(operatorSnapshot);
  const marketplace = compactDivisionSnapshot(marketplaceSnapshot);
  const reasons = [];
  let matchPoints = 0;
  let totalPoints = 0;
  const compareValue = /* @__PURE__ */ __name((label, left, right, weight = 1) => {
    totalPoints += weight;
    if (valuesWithinTolerance(left, right)) {
      matchPoints += weight;
      return;
    }
    if (typeof left === "number" && typeof right === "number") {
      const delta = Math.abs(left - right);
      if (delta <= CROSS_DIVISION_SYNC2.scoreTolerance * 2) {
        matchPoints += weight * 0.6;
        reasons.push(`${label} within advisory tolerance (${left} vs ${right}).`);
        return;
      }
    }
    reasons.push(`${label} divergent: operator-shell ${left} vs marketplace-backend ${right}.`);
  }, "compareValue");
  compareValue("decision", operator.decision, marketplace.decision, 2);
  compareValue("certification.status", operator.certification?.status, marketplace.certification?.status, 2);
  compareValue("certification.score", operator.certification?.score, marketplace.certification?.score, 1.5);
  compareValue("automation.activeCount", operator.automation?.activeCount, marketplace.automation?.activeCount, 1);
  compareValue("insights.score", operator.insights?.score, marketplace.insights?.score, 1.5);
  compareValue("autonomous.triggers", (operator.autonomous?.triggers || []).length, (marketplace.autonomous?.triggers || []).length, 1);
  compareValue("federation.score", operator.score, marketplace.score, 2);
  const alignmentRatio = totalPoints ? matchPoints / totalPoints : 1;
  let syncStatus = "divergent";
  if (alignmentRatio >= CROSS_DIVISION_SYNC2.alignmentThresholds.aligned) {
    syncStatus = "aligned";
  } else if (alignmentRatio >= CROSS_DIVISION_SYNC2.alignmentThresholds.partial) {
    syncStatus = "partial";
  }
  const crossDivisionScore = Math.max(0, Math.min(100, Math.round(alignmentRatio * 100)));
  if (marketplaceSnapshot.source === "advisory-manifest") {
    reasons.unshift("Marketplace backend live sync unavailable; comparing against advisory manifest snapshot.");
  }
  if (operatorSnapshot.source === "live" && marketplaceSnapshot.source === "advisory-manifest") {
    syncStatus = syncStatus === "aligned" ? "partial" : syncStatus;
  }
  return {
    syncStatus,
    crossDivisionScore,
    crossDivisionHealth: deriveCrossDivisionHealth(crossDivisionScore, syncStatus),
    crossDivisionReasons: [...new Set(reasons)].slice(0, 12),
    alignmentRatio,
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(compareCrossDivisionSnapshots, "compareCrossDivisionSnapshots");
function deriveCrossDivisionHealth(score2 = 100, syncStatus = "aligned") {
  if (syncStatus === "aligned" && score2 >= 85) {
    return "healthy";
  }
  if (syncStatus === "partial" || score2 >= 50) {
    return "advisory";
  }
  return "degraded";
}
__name(deriveCrossDivisionHealth, "deriveCrossDivisionHealth");
function computeModuleCrossDivisionSync(moduleId, operatorCert = {}, marketplaceCert = {}, aggregateSync = {}) {
  const operatorScore = operatorCert.score ?? 50;
  const marketplaceScore = marketplaceCert.score ?? 50;
  const delta = Math.abs(operatorScore - marketplaceScore);
  let cloudflareSyncStatus = aggregateSync.syncStatus || "partial";
  if (delta > 20) {
    cloudflareSyncStatus = "divergent";
  } else if (delta > CROSS_DIVISION_SYNC2.scoreTolerance && cloudflareSyncStatus === "aligned") {
    cloudflareSyncStatus = "partial";
  }
  const cloudflareSyncScore = Math.max(0, Math.min(100, Math.round((aggregateSync.crossDivisionScore ?? 70) - delta)));
  const cloudflareSyncReasons = [
    `Module ${moduleId} certification delta ${delta} (${operatorScore} vs ${marketplaceScore}).`,
    ...(aggregateSync.crossDivisionReasons || []).slice(0, 2)
  ];
  return {
    cloudflareSyncStatus,
    cloudflareSyncScore,
    cloudflareSyncReasons,
    advisoryOnly: true
  };
}
__name(computeModuleCrossDivisionSync, "computeModuleCrossDivisionSync");
function getOperatorMarketplaceCrossDivisionFields(crossDivisionSync = {}) {
  const marketplace = crossDivisionSync.marketplaceBackend || crossDivisionSync.marketplaceSnapshot || {};
  return {
    cloudflareMarketplaceDecision: marketplace.decision || "optional",
    cloudflareMarketplaceCertification: marketplace.certification || { status: "review", score: null },
    cloudflareMarketplaceAutomation: marketplace.automation || { activeCount: 0 },
    cloudflareMarketplaceInsights: marketplace.insights || { score: null, health: "optional" },
    cloudflareMarketplaceScore: marketplace.score ?? null,
    cloudflareCrossDivisionSyncStatus: crossDivisionSync.syncStatus || "partial",
    advisoryOnly: true
  };
}
__name(getOperatorMarketplaceCrossDivisionFields, "getOperatorMarketplaceCrossDivisionFields");
function buildCloudflareSafetyCrossDivisionFactor(crossDivisionSnapshot = {}) {
  return {
    health: crossDivisionSnapshot.crossDivisionHealth || deriveCrossDivisionHealth(crossDivisionSnapshot.crossDivisionScore, crossDivisionSnapshot.syncStatus),
    score: crossDivisionSnapshot.crossDivisionScore ?? null,
    syncStatus: crossDivisionSnapshot.syncStatus || "partial",
    reasons: crossDivisionSnapshot.crossDivisionReasons || [],
    advisoryOnly: true,
    checkedAt: crossDivisionSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyCrossDivisionFactor, "buildCloudflareSafetyCrossDivisionFactor");
async function getCloudflareCrossDivisionSync(governance = {}, env = {}, options = {}) {
  try {
    const moduleIds = options.moduleIds || null;
    const operatorShell = await buildOperatorShellDivisionSnapshot(governance, moduleIds);
    const marketplaceBackend = await fetchMarketplaceBackendDivisionSnapshot(env, operatorShell);
    const comparison = compareCrossDivisionSnapshots(operatorShell, marketplaceBackend);
    return {
      operatorShell: compactDivisionSnapshot(operatorShell),
      marketplaceBackend: compactDivisionSnapshot(marketplaceBackend),
      syncStatus: comparison.syncStatus,
      crossDivisionScore: comparison.crossDivisionScore,
      crossDivisionHealth: comparison.crossDivisionHealth,
      crossDivisionReasons: comparison.crossDivisionReasons,
      sources: {
        operatorShell: operatorShell.source,
        marketplaceBackend: marketplaceBackend.source
      },
      advisoryOnly: true,
      checkedAt: comparison.checkedAt
    };
  } catch (error) {
    const operatorShell = compactDivisionSnapshot({});
    const marketplaceBackend = compactDivisionSnapshot(buildAdvisoryMarketplaceBackendSnapshot());
    return {
      operatorShell,
      marketplaceBackend,
      syncStatus: "partial",
      crossDivisionScore: 50,
      crossDivisionHealth: "advisory",
      crossDivisionReasons: [error.message || "Cross-division sync unavailable."],
      advisoryOnly: true,
      error: error.message,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}
__name(getCloudflareCrossDivisionSync, "getCloudflareCrossDivisionSync");
async function getCloudflareCrossDivisionFederation(governance = {}, env = {}, options = {}) {
  const sync = await getCloudflareCrossDivisionSync(governance, env, options);
  return {
    cloudflareCrossDivisionScore: sync.crossDivisionScore,
    cloudflareCrossDivisionHealth: sync.crossDivisionHealth,
    cloudflareCrossDivisionReasons: sync.crossDivisionReasons,
    syncStatus: sync.syncStatus,
    operatorShell: sync.operatorShell,
    marketplaceBackend: sync.marketplaceBackend,
    sources: sync.sources,
    routes: {
      sync: CROSS_DIVISION_SYNC2.operatorShell.syncRoute,
      crossDivision: CROSS_DIVISION_SYNC2.operatorShell.crossDivisionRoute,
      marketplaceSync: CROSS_DIVISION_SYNC2.marketplaceBackend.syncRoute
    },
    advisoryOnly: true,
    checkedAt: sync.checkedAt
  };
}
__name(getCloudflareCrossDivisionFederation, "getCloudflareCrossDivisionFederation");
async function collectOrchestrationContext(governance = {}, env = {}, options = {}) {
  const moduleIds = options.moduleIds || null;
  const [crossDivision, automation, certification, decision, insights, autonomous] = await Promise.all([
    getCloudflareCrossDivisionSync(governance, env, { moduleIds }),
    getCloudflareAutomationLoops(governance),
    getMarketplaceCloudflareCertification(governance, moduleIds),
    getCloudflareDecision(governance, options),
    getCloudflareInsights(governance),
    getCloudflareAutonomousSnapshot(governance)
  ]);
  return {
    crossDivision,
    automation,
    certification,
    decision,
    insights,
    autonomous,
    moduleIds
  };
}
__name(collectOrchestrationContext, "collectOrchestrationContext");
function buildCloudflareAgentSignals(context = {}) {
  const {
    crossDivision = {},
    automation = {},
    certification = {},
    decision = {},
    insights = {},
    autonomous = {}
  } = context;
  const operatorShell = crossDivision.operatorShell || {};
  const marketplaceBackend = crossDivision.marketplaceBackend || {};
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
  return {
    operatorShell: {
      division: CROSS_DIVISION_SYNC2.operatorShell.division,
      agent: CLOUDFLARE_ORCHESTRATION2.agents.operatorShell,
      decision: operatorShell.decision || decision.decision || "optional",
      certification: operatorShell.certification || certification.aggregate || { status: "review", score: 50 },
      automation: operatorShell.automation || { activeCount: automation.activeCount ?? 0 },
      insights: operatorShell.insights || { score: insights.cloudflareInsightsScore, health: insights.health },
      autonomous: {
        triggers,
        advisoryCount: (autonomous.cloudflareGovernance?.autonomousSignals?.advisories || []).length
      },
      score: operatorShell.score ?? decision.score ?? 50,
      health: deriveDecisionHealth(decision),
      advisoryOnly: true
    },
    marketplaceBackend: {
      division: CROSS_DIVISION_SYNC2.marketplaceBackend.division,
      agent: CLOUDFLARE_ORCHESTRATION2.agents.marketplaceBackend,
      decision: marketplaceBackend.decision || "optional",
      certification: marketplaceBackend.certification || { status: "review", score: 50 },
      automation: marketplaceBackend.automation || { activeCount: 0 },
      insights: marketplaceBackend.insights || { score: null, health: "optional" },
      autonomous: marketplaceBackend.autonomous || { triggers: [], advisoryCount: 0 },
      score: marketplaceBackend.score ?? null,
      source: crossDivision.sources?.marketplaceBackend || "advisory-manifest",
      advisoryOnly: true
    },
    crossDivision: {
      agent: CLOUDFLARE_ORCHESTRATION2.agents.crossDivision,
      syncStatus: crossDivision.syncStatus || "partial",
      score: crossDivision.crossDivisionScore ?? null,
      health: crossDivision.crossDivisionHealth || "optional",
      reasons: crossDivision.crossDivisionReasons || [],
      advisoryOnly: true
    }
  };
}
__name(buildCloudflareAgentSignals, "buildCloudflareAgentSignals");
function buildOrchestrationPlanStep(id, order, agent, division, action, reason, priority = "medium") {
  return {
    id,
    order,
    agent,
    division,
    action,
    reason,
    priority,
    advisoryOnly: true
  };
}
__name(buildOrchestrationPlanStep, "buildOrchestrationPlanStep");
function buildCloudflareOrchestrationPlan(context = {}) {
  const {
    crossDivision = {},
    automation = {},
    certification = {},
    decision = {},
    insights = {},
    autonomous = {}
  } = context;
  const plan = [];
  let order = 1;
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
  const activeLoops = Object.entries(automation.loops || {}).filter(([, loop]) => loop.active).map(([id]) => id);
  if (crossDivision.syncStatus === "divergent") {
    plan.push(
      buildOrchestrationPlanStep(
        "cross-division-reconcile",
        order++,
        CLOUDFLARE_ORCHESTRATION2.agents.crossDivision,
        "cross-division",
        "Reconcile operator-shell and marketplace-backend Cloudflare federation metadata.",
        (crossDivision.crossDivisionReasons || [])[0] || "Cross-division sync divergent.",
        "high"
      )
    );
  } else if (crossDivision.syncStatus === "partial") {
    plan.push(
      buildOrchestrationPlanStep(
        "cross-division-review",
        order++,
        CLOUDFLARE_ORCHESTRATION2.agents.marketplaceBackend,
        CROSS_DIVISION_SYNC2.marketplaceBackend.division,
        "Review partial cross-division sync advisories before promotion.",
        (crossDivision.crossDivisionReasons || [])[0] || "Cross-division sync partial.",
        "medium"
      )
    );
  }
  if (decision.decision === "hold") {
    plan.push(
      buildOrchestrationPlanStep(
        "decision-hold-review",
        order++,
        CLOUDFLARE_ORCHESTRATION2.agents.operatorShell,
        CROSS_DIVISION_SYNC2.operatorShell.division,
        "Pause high-impact pipeline actions until Cloudflare decisioning moves off hold.",
        (decision.reasons || [])[0] || "Decision hold active.",
        "high"
      )
    );
  } else if (decision.decision === "caution") {
    plan.push(
      buildOrchestrationPlanStep(
        "decision-caution-review",
        order++,
        CLOUDFLARE_ORCHESTRATION2.agents.operatorShell,
        CROSS_DIVISION_SYNC2.operatorShell.division,
        "Review Cloudflare cautions before operator pipeline execution.",
        (decision.reasons || [])[0] || "Decision caution active.",
        "medium"
      )
    );
  }
  if (certification.aggregate?.status === "incompatible") {
    plan.push(
      buildOrchestrationPlanStep(
        "certification-remediation",
        order++,
        CLOUDFLARE_ORCHESTRATION2.agents.marketplaceBackend,
        CROSS_DIVISION_SYNC2.marketplaceBackend.division,
        "Remediate incompatible marketplace module certification before sync.",
        (certification.aggregate.reasons || [])[0] || "Certification incompatible.",
        "high"
      )
    );
  } else if (certification.aggregate?.status === "review") {
    plan.push(
      buildOrchestrationPlanStep(
        "certification-review",
        order++,
        CLOUDFLARE_ORCHESTRATION2.agents.marketplaceBackend,
        CROSS_DIVISION_SYNC2.marketplaceBackend.division,
        "Review marketplace certification scores and module compatibility.",
        `Aggregate certification score ${certification.aggregate.score ?? "n/a"}.`,
        "medium"
      )
    );
  }
  if (activeLoops.length) {
    plan.push(
      buildOrchestrationPlanStep(
        "automation-loop-review",
        order++,
        CLOUDFLARE_ORCHESTRATION2.agents.operatorShell,
        CROSS_DIVISION_SYNC2.operatorShell.division,
        `Review active automation loops: ${activeLoops.join(", ")}.`,
        automation.loops?.[activeLoops[0]]?.recommendedAction || "Automation loops active.",
        activeLoops.length > 2 ? "high" : "medium"
      )
    );
  }
  if (triggers.length) {
    plan.push(
      buildOrchestrationPlanStep(
        "autonomous-trigger-review",
        order++,
        CLOUDFLARE_ORCHESTRATION2.agents.crossDivision,
        "cross-division",
        `Review autonomous triggers: ${triggers.join(", ")}.`,
        (autonomous.cloudflareSafety?.autonomousWarnings || [])[0] || "Autonomous advisories active.",
        triggers.length > 2 ? "high" : "medium"
      )
    );
  }
  if ((insights.cloudflareInsightsScore ?? 100) < 70) {
    plan.push(
      buildOrchestrationPlanStep(
        "insights-improvement",
        order++,
        CLOUDFLARE_ORCHESTRATION2.agents.operatorShell,
        CROSS_DIVISION_SYNC2.operatorShell.division,
        "Apply Cloudflare insights recommendations to improve federation readiness.",
        (insights.cloudflareInsights?.recommendations || [])[0]?.message || "Insights score below threshold.",
        "low"
      )
    );
  }
  if (!plan.length) {
    plan.push(
      buildOrchestrationPlanStep(
        "steady-state",
        order++,
        CLOUDFLARE_ORCHESTRATION2.agents.pipeline,
        CROSS_DIVISION_SYNC2.operatorShell.division,
        "Continue advisory multi-agent orchestration; no blocking Cloudflare advisories.",
        "Federation signals within advisory tolerance.",
        "low"
      )
    );
  }
  return plan.sort((a, b) => a.order - b.order);
}
__name(buildCloudflareOrchestrationPlan, "buildCloudflareOrchestrationPlan");
function computeOrchestrationScore(context = {}, plan = []) {
  const {
    crossDivision = {},
    certification = {},
    decision = {},
    insights = {},
    automation = {},
    autonomous = {}
  } = context;
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
  const activeLoopCount = automation.activeCount ?? Object.values(automation.loops || {}).filter((loop) => loop.active).length;
  const components = [
    decision.score ?? 50,
    certification.aggregate?.score ?? 50,
    insights.cloudflareInsightsScore ?? 50,
    crossDivision.crossDivisionScore ?? 50
  ];
  const base = components.reduce((sum, value) => sum + value, 0) / components.length;
  let penalty = triggers.length * 4 + activeLoopCount * 3;
  if (crossDivision.syncStatus === "divergent") {
    penalty += 15;
  } else if (crossDivision.syncStatus === "partial") {
    penalty += 8;
  }
  if (decision.decision === "hold") {
    penalty += 12;
  } else if (decision.decision === "caution") {
    penalty += 6;
  }
  if (certification.aggregate?.status === "incompatible") {
    penalty += 10;
  }
  const highPrioritySteps = plan.filter((step) => step.priority === "high").length;
  penalty += highPrioritySteps * 2;
  return Math.max(0, Math.min(100, Math.round(base - penalty)));
}
__name(computeOrchestrationScore, "computeOrchestrationScore");
function deriveOrchestrationHealth(score2 = 100, plan = []) {
  const highPriority = plan.filter((step) => step.priority === "high").length;
  if (score2 >= 80 && highPriority === 0) {
    return "healthy";
  }
  if (score2 >= 50 || highPriority <= 2) {
    return "advisory";
  }
  return "degraded";
}
__name(deriveOrchestrationHealth, "deriveOrchestrationHealth");
function buildOrchestrationRecommendedActions(context = {}, plan = []) {
  const actions = plan.map((step) => `${step.agent}: ${step.action}`);
  if (context.crossDivision?.syncStatus === "divergent") {
    actions.unshift("Cross-division sync divergent; coordinate marketplace-sync with operator-sentinel.");
  }
  if ((context.autonomous?.cloudflareGovernance?.autonomousSignals?.triggers || []).length) {
    actions.push("Review autonomous trigger advisories before multi-agent handoff.");
  }
  return [...new Set(actions)].slice(0, 12);
}
__name(buildOrchestrationRecommendedActions, "buildOrchestrationRecommendedActions");
async function getCloudflareOrchestration(governance = {}, env = {}, options = {}) {
  try {
    const context = await collectOrchestrationContext(governance, env, options);
    const plan = buildCloudflareOrchestrationPlan(context);
    const agents = buildCloudflareAgentSignals(context);
    const orchestrationScore = computeOrchestrationScore(context, plan);
    const recommendedActions = buildOrchestrationRecommendedActions(context, plan);
    const orchestrationHealth = deriveOrchestrationHealth(orchestrationScore, plan);
    const reasons = [
      ...(context.crossDivision.crossDivisionReasons || []).slice(0, 3),
      ...(context.decision.reasons || []).slice(0, 2),
      ...(context.certification.aggregate?.reasons || []).slice(0, 2)
    ];
    return {
      plan,
      agents,
      recommendedActions,
      orchestrationScore,
      orchestrationHealth,
      orchestrationReasons: [...new Set(reasons)].slice(0, 12),
      cloudflareAgentSignals: agents,
      syncStatus: context.crossDivision.syncStatus,
      certification: context.certification?.aggregate,
      advisoryOnly: true,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    return {
      plan: [
        buildOrchestrationPlanStep(
          "orchestration-unavailable",
          1,
          CLOUDFLARE_ORCHESTRATION2.agents.operatorShell,
          CROSS_DIVISION_SYNC2.operatorShell.division,
          "Cloudflare orchestration unavailable; continue with advisory defaults.",
          error.message || "OAuth or upstream unavailable.",
          "low"
        )
      ],
      agents: {
        operatorShell: { health: "optional", advisoryOnly: true },
        marketplaceBackend: { health: "optional", advisoryOnly: true },
        crossDivision: { syncStatus: "partial", advisoryOnly: true }
      },
      cloudflareAgentSignals: {
        operatorShell: { health: "optional", advisoryOnly: true },
        marketplaceBackend: { health: "optional", advisoryOnly: true },
        crossDivision: { syncStatus: "partial", advisoryOnly: true }
      },
      recommendedActions: [error.message || "Orchestration degraded gracefully."],
      orchestrationScore: 50,
      orchestrationHealth: "advisory",
      orchestrationReasons: [error.message || "Orchestration unavailable without OAuth."],
      syncStatus: "partial",
      advisoryOnly: true,
      error: error.message,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}
__name(getCloudflareOrchestration, "getCloudflareOrchestration");
async function getCloudflareAgentSignals(governance = {}, env = {}, options = {}) {
  const orchestration = await getCloudflareOrchestration(governance, env, options);
  return {
    cloudflareAgentSignals: orchestration.cloudflareAgentSignals || orchestration.agents,
    agents: orchestration.agents,
    orchestrationScore: orchestration.orchestrationScore,
    syncStatus: orchestration.syncStatus,
    advisoryOnly: true,
    checkedAt: orchestration.checkedAt
  };
}
__name(getCloudflareAgentSignals, "getCloudflareAgentSignals");
function getCloudflarePipelineOrchestrationFields(orchestration = {}) {
  return {
    cloudflarePipelineOrchestrationPlan: orchestration.plan || [],
    cloudflarePipelineOrchestrationScore: orchestration.orchestrationScore ?? null,
    cloudflarePipelineOrchestrationReasons: orchestration.orchestrationReasons || orchestration.recommendedActions || [],
    advisoryOnly: true
  };
}
__name(getCloudflarePipelineOrchestrationFields, "getCloudflarePipelineOrchestrationFields");
function computeModuleOrchestrationFields(moduleId, orchestration = {}, moduleCert = {}) {
  const certScore = moduleCert.score ?? 50;
  const baseScore = orchestration.orchestrationScore ?? 50;
  const aggregateCert = orchestration.certification?.score ?? moduleCert.score ?? 50;
  const certDelta = Math.abs(certScore - aggregateCert);
  let cloudflareOrchestrationStatus = "coordinated";
  if (certScore < 50 || orchestration.syncStatus === "divergent") {
    cloudflareOrchestrationStatus = "deferred";
  } else if (certDelta > 15 || orchestration.syncStatus === "partial" || moduleCert.status === "review") {
    cloudflareOrchestrationStatus = "review";
  }
  const cloudflareOrchestrationScore = Math.max(0, Math.min(100, Math.round(baseScore - certDelta * 0.4)));
  const cloudflareOrchestrationReasons = [
    `Module ${moduleId} orchestration ${cloudflareOrchestrationStatus} (cert ${certScore}, base ${baseScore}).`,
    ...(orchestration.orchestrationReasons || []).slice(0, 2)
  ];
  return {
    cloudflareOrchestrationStatus,
    cloudflareOrchestrationScore,
    cloudflareOrchestrationReasons,
    advisoryOnly: true
  };
}
__name(computeModuleOrchestrationFields, "computeModuleOrchestrationFields");
function buildCloudflareSafetyOrchestrationFactor(orchestrationSnapshot = {}) {
  return {
    health: orchestrationSnapshot.orchestrationHealth || deriveOrchestrationHealth(orchestrationSnapshot.orchestrationScore, orchestrationSnapshot.plan),
    score: orchestrationSnapshot.orchestrationScore ?? null,
    planCount: (orchestrationSnapshot.plan || []).length,
    highPrioritySteps: (orchestrationSnapshot.plan || []).filter((step) => step.priority === "high").length,
    reasons: orchestrationSnapshot.orchestrationReasons || [],
    advisoryOnly: true,
    checkedAt: orchestrationSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyOrchestrationFactor, "buildCloudflareSafetyOrchestrationFactor");
async function collectExecutionContext(governance = {}, env = {}, options = {}) {
  const [orchestrationContext, orchestration] = await Promise.all([
    collectOrchestrationContext(governance, env, options),
    getCloudflareOrchestration(governance, env, options)
  ]);
  return {
    ...orchestrationContext,
    orchestration
  };
}
__name(collectExecutionContext, "collectExecutionContext");
function buildExecutionPlanStep(orchestrationStep = {}, order = 1) {
  return {
    id: orchestrationStep.id || `execution-step-${order}`,
    order: orchestrationStep.order ?? order,
    agent: orchestrationStep.agent || CLOUDFLARE_EXECUTION2.agents.operatorShell,
    division: orchestrationStep.division || CROSS_DIVISION_SYNC2.operatorShell.division,
    action: orchestrationStep.action || "Review advisory execution recommendation.",
    reason: orchestrationStep.reason || "Advisory execution step.",
    priority: orchestrationStep.priority || "medium",
    executeWhen: orchestrationStep.priority === "high" ? "before-promotion" : "advisory-review",
    advisoryOnly: true
  };
}
__name(buildExecutionPlanStep, "buildExecutionPlanStep");
function buildCloudflareExecutionPlan(context = {}) {
  const orchestrationPlan = context.orchestration?.plan || buildCloudflareOrchestrationPlan(context);
  const executionPlan = orchestrationPlan.map((step, index) => buildExecutionPlanStep(step, index + 1));
  const { crossDivision = {}, orchestration = {} } = context;
  if (crossDivision.syncStatus === "divergent" && !executionPlan.some((step) => step.id === "cross-division-review")) {
    executionPlan.unshift(
      buildExecutionPlanStep(
        {
          id: "execution-cross-division-hold",
          agent: CLOUDFLARE_EXECUTION2.agents.crossDivision,
          division: "cross-division",
          action: "Defer autonomous execution until cross-division sync reconciles.",
          reason: (crossDivision.crossDivisionReasons || [])[0] || "Cross-division sync divergent.",
          priority: "high"
        },
        0
      )
    );
  }
  if (orchestration.orchestrationHealth === "degraded" && !executionPlan.some((step) => step.id === "orchestration-degraded-review")) {
    executionPlan.push(
      buildExecutionPlanStep(
        {
          id: "orchestration-degraded-review",
          agent: CLOUDFLARE_EXECUTION2.agents.operatorShell,
          division: CROSS_DIVISION_SYNC2.operatorShell.division,
          action: "Review degraded orchestration before executing pipeline or release actions.",
          reason: `Orchestration score ${orchestration.orchestrationScore ?? "n/a"}.`,
          priority: "high"
        },
        executionPlan.length + 1
      )
    );
  }
  if (!executionPlan.length) {
    executionPlan.push(
      buildExecutionPlanStep(
        {
          id: "execution-steady-state",
          agent: CLOUDFLARE_EXECUTION2.agents.pipeline,
          division: CROSS_DIVISION_SYNC2.operatorShell.division,
          action: "Proceed with advisory operator actions; no blocking execution advisories.",
          reason: "Federation execution signals within tolerance.",
          priority: "low"
        },
        1
      )
    );
  }
  return executionPlan.sort((a, b) => a.order - b.order);
}
__name(buildCloudflareExecutionPlan, "buildCloudflareExecutionPlan");
function buildCloudflareExecutionSignals(context = {}) {
  const agentSignals = buildCloudflareAgentSignals(context);
  const orchestration = context.orchestration || {};
  const executionPlan = buildCloudflareExecutionPlan(context);
  const highPriority = executionPlan.filter((step) => step.priority === "high").length;
  return {
    operatorShell: {
      ...agentSignals.operatorShell,
      executionReadiness: highPriority === 0 ? "ready" : highPriority <= 2 ? "review" : "deferred",
      nextStep: executionPlan.find((step) => step.agent === CLOUDFLARE_EXECUTION2.agents.operatorShell)?.action || null,
      orchestrationScore: orchestration.orchestrationScore ?? null,
      advisoryOnly: true
    },
    marketplaceBackend: {
      ...agentSignals.marketplaceBackend,
      executionReadiness: agentSignals.marketplaceBackend?.certification?.status === "incompatible" ? "deferred" : agentSignals.marketplaceBackend?.source === "advisory-manifest" ? "review" : "ready",
      nextStep: executionPlan.find((step) => step.agent === CLOUDFLARE_EXECUTION2.agents.marketplaceBackend)?.action || null,
      advisoryOnly: true
    },
    crossDivision: {
      ...agentSignals.crossDivision,
      executionReadiness: context.crossDivision?.syncStatus === "aligned" ? "ready" : context.crossDivision?.syncStatus === "partial" ? "review" : "deferred",
      nextStep: executionPlan.find((step) => step.agent === CLOUDFLARE_EXECUTION2.agents.crossDivision)?.action || null,
      advisoryOnly: true
    }
  };
}
__name(buildCloudflareExecutionSignals, "buildCloudflareExecutionSignals");
function computeExecutionScore(context = {}, executionPlan = []) {
  const orchestrationScore = context.orchestration?.orchestrationScore ?? computeOrchestrationScore(context, context.orchestration?.plan || []);
  const highPriority = executionPlan.filter((step) => step.priority === "high").length;
  const mediumPriority = executionPlan.filter((step) => step.priority === "medium").length;
  let score2 = orchestrationScore;
  score2 -= highPriority * 5;
  score2 -= mediumPriority * 2;
  if (context.crossDivision?.syncStatus === "divergent") {
    score2 -= 10;
  }
  const triggers = context.autonomous?.cloudflareGovernance?.autonomousSignals?.triggers || [];
  score2 -= triggers.length * 3;
  return Math.max(0, Math.min(100, Math.round(score2)));
}
__name(computeExecutionScore, "computeExecutionScore");
function deriveExecutionHealth(score2 = 100, executionPlan = []) {
  const highPriority = executionPlan.filter((step) => step.priority === "high").length;
  if (score2 >= 80 && highPriority === 0) {
    return "healthy";
  }
  if (score2 >= 50 || highPriority <= 2) {
    return "advisory";
  }
  return "degraded";
}
__name(deriveExecutionHealth, "deriveExecutionHealth");
function buildExecutionNextActions(context = {}, executionPlan = []) {
  const nextActions = executionPlan.filter((step) => step.priority === "high" || step.priority === "medium").slice(0, 5).map((step) => `[${step.agent}] ${step.action}`);
  if (context.crossDivision?.syncStatus === "divergent") {
    nextActions.unshift("Reconcile cross-division sync before autonomous execution.");
  }
  if ((context.orchestration?.recommendedActions || []).length) {
    nextActions.push(...context.orchestration.recommendedActions.slice(0, 3));
  }
  return [...new Set(nextActions)].slice(0, 10);
}
__name(buildExecutionNextActions, "buildExecutionNextActions");
async function getCloudflareExecution(governance = {}, env = {}, options = {}) {
  try {
    const context = await collectExecutionContext(governance, env, options);
    const executionPlan = buildCloudflareExecutionPlan(context);
    const cloudflareExecutionSignals = buildCloudflareExecutionSignals(context);
    const executionScore = computeExecutionScore(context, executionPlan);
    const executionHealth = deriveExecutionHealth(executionScore, executionPlan);
    const nextActions = buildExecutionNextActions(context, executionPlan);
    const executionReasons = [
      ...(context.orchestration?.orchestrationReasons || []).slice(0, 3),
      ...(context.crossDivision?.crossDivisionReasons || []).slice(0, 2),
      ...executionPlan.filter((step) => step.priority === "high").map((step) => step.reason)
    ];
    return {
      executionPlan,
      nextActions,
      executionScore,
      executionHealth,
      executionReasons: [...new Set(executionReasons)].slice(0, 12),
      cloudflareExecutionSignals,
      syncStatus: context.crossDivision?.syncStatus || "partial",
      orchestrationScore: context.orchestration?.orchestrationScore ?? null,
      advisoryOnly: true,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    return {
      executionPlan: [
        buildExecutionPlanStep(
          {
            id: "execution-unavailable",
            agent: CLOUDFLARE_EXECUTION2.agents.operatorShell,
            division: CROSS_DIVISION_SYNC2.operatorShell.division,
            action: "Continue with manual operator review; autonomous execution recommendations unavailable.",
            reason: error.message || "OAuth or upstream unavailable.",
            priority: "medium"
          },
          1
        )
      ],
      nextActions: [error.message || "Review Cloudflare federation manually."],
      executionScore: 50,
      executionHealth: "advisory",
      executionReasons: [error.message || "Execution recommendations unavailable without OAuth."],
      cloudflareExecutionSignals: {
        operatorShell: { executionReadiness: "review", advisoryOnly: true },
        marketplaceBackend: { executionReadiness: "review", advisoryOnly: true },
        crossDivision: { syncStatus: "partial", executionReadiness: "review", advisoryOnly: true }
      },
      syncStatus: "partial",
      advisoryOnly: true,
      error: error.message,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}
__name(getCloudflareExecution, "getCloudflareExecution");
async function getCloudflareExecutionSignals(governance = {}, env = {}, options = {}) {
  const execution = await getCloudflareExecution(governance, env, options);
  return {
    cloudflareExecutionSignals: execution.cloudflareExecutionSignals,
    executionScore: execution.executionScore,
    executionHealth: execution.executionHealth,
    syncStatus: execution.syncStatus,
    advisoryOnly: true,
    checkedAt: execution.checkedAt
  };
}
__name(getCloudflareExecutionSignals, "getCloudflareExecutionSignals");
function getCloudflarePipelineExecutionFields(execution = {}) {
  return {
    cloudflarePipelineExecutionPlan: execution.executionPlan || [],
    cloudflarePipelineExecutionScore: execution.executionScore ?? null,
    cloudflarePipelineExecutionReasons: execution.executionReasons || execution.nextActions || [],
    advisoryOnly: true
  };
}
__name(getCloudflarePipelineExecutionFields, "getCloudflarePipelineExecutionFields");
function computeModuleExecutionFields(moduleId, execution = {}, moduleCert = {}, moduleOrch = {}) {
  const certScore = moduleCert.score ?? 50;
  const baseScore = execution.executionScore ?? moduleOrch.cloudflareOrchestrationScore ?? 50;
  const syncStatus = execution.syncStatus || "partial";
  let cloudflareExecutionStatus = "ready";
  if (certScore < 50 || syncStatus === "divergent" || execution.executionHealth === "degraded") {
    cloudflareExecutionStatus = "deferred";
  } else if (certScore < 70 || syncStatus === "partial" || moduleCert.status === "review" || execution.executionHealth === "advisory") {
    cloudflareExecutionStatus = "review";
  }
  const cloudflareExecutionScore = Math.max(0, Math.min(100, Math.round(baseScore - Math.abs(certScore - baseScore) * 0.3)));
  const cloudflareExecutionReasons = [
    `Module ${moduleId} execution ${cloudflareExecutionStatus} (cert ${certScore}, execution base ${baseScore}).`,
    ...(execution.executionReasons || []).slice(0, 2)
  ];
  return {
    cloudflareExecutionStatus,
    cloudflareExecutionScore,
    cloudflareExecutionReasons,
    advisoryOnly: true
  };
}
__name(computeModuleExecutionFields, "computeModuleExecutionFields");
function buildCloudflareSafetyExecutionFactor(executionSnapshot = {}) {
  return {
    health: executionSnapshot.executionHealth || deriveExecutionHealth(executionSnapshot.executionScore, executionSnapshot.executionPlan),
    score: executionSnapshot.executionScore ?? null,
    planCount: (executionSnapshot.executionPlan || []).length,
    nextActionCount: (executionSnapshot.nextActions || []).length,
    highPrioritySteps: (executionSnapshot.executionPlan || []).filter((step) => step.priority === "high").length,
    reasons: executionSnapshot.executionReasons || [],
    advisoryOnly: true,
    checkedAt: executionSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyExecutionFactor, "buildCloudflareSafetyExecutionFactor");
var ADAPTIVE_MODES = ["steady", "caution", "review", "degraded"];
function deriveAdaptiveHealth(score2, signalsMissing = false) {
  if (signalsMissing || score2 == null) {
    return "degraded";
  }
  if (score2 >= 80) {
    return "healthy";
  }
  if (score2 >= 50) {
    return "advisory";
  }
  return "degraded";
}
__name(deriveAdaptiveHealth, "deriveAdaptiveHealth");
function scoreAutomationContribution(automation = {}) {
  const activeCount = automation.activeCount ?? Object.values(automation.loops || {}).filter((loop) => loop.active).length;
  return Math.max(0, 100 - activeCount * 12);
}
__name(scoreAutomationContribution, "scoreAutomationContribution");
function scoreAutonomousContribution(triggers = []) {
  return Math.max(0, 100 - triggers.length * 10);
}
__name(scoreAutonomousContribution, "scoreAutonomousContribution");
function scoreInsightsContribution(insightsHealth) {
  if (insightsHealth === "healthy") {
    return 100;
  }
  if (insightsHealth === "partial" || insightsHealth === "advisory") {
    return 65;
  }
  if (insightsHealth === "degraded") {
    return 35;
  }
  return 50;
}
__name(scoreInsightsContribution, "scoreInsightsContribution");
function computeCloudflareAdaptiveScore(context = {}) {
  const executionScore = context.executionScore ?? 50;
  const orchestrationScore = context.orchestrationScore ?? 50;
  const crossDivisionScore = context.crossDivisionScore ?? 50;
  const certificationScore = context.certificationScore ?? 50;
  const decisionScore = context.decisionScore ?? 50;
  const automationScore = scoreAutomationContribution(context.automation || {});
  const insightsScore = scoreInsightsContribution(context.insightsHealth);
  const autonomousScore = scoreAutonomousContribution(context.autonomousTriggers || []);
  const weighted = Math.round(
    executionScore * 0.12 + orchestrationScore * 0.13 + crossDivisionScore * 0.13 + certificationScore * 0.13 + decisionScore * 0.18 + automationScore * 0.08 + insightsScore * 0.08 + autonomousScore * 0.15
  );
  return Math.max(0, Math.min(100, weighted));
}
__name(computeCloudflareAdaptiveScore, "computeCloudflareAdaptiveScore");
function computeCloudflareAdaptiveMode(context = {}) {
  const reasons = [];
  const offlineCount = (context.reachability?.servers || []).filter((server) => server.status === "offline").length;
  const signalsMissing = context.signalsMissing === true || offlineCount >= 3 || context.reachability?.health === "offline" && offlineCount > 0;
  if (signalsMissing) {
    reasons.push("Cloudflare federation signals unavailable; using fallback adaptive hints.");
    if (offlineCount) {
      reasons.push(`${offlineCount} MCP server(s) offline.`);
    }
    return {
      mode: "degraded",
      reasons,
      score: Math.max(20, computeCloudflareAdaptiveScore({ ...context, decisionScore: 40 }) - 15)
    };
  }
  const decision = String(context.decision || "caution").toLowerCase();
  const syncStatus = context.syncStatus || "partial";
  const certStatus = context.certificationStatus || "review";
  const activeLoops = context.automationActiveCount ?? Object.values(context.automation?.loops || {}).filter((loop) => loop.active).length;
  const triggers = context.autonomousTriggers || [];
  const orchestrationScore = context.orchestrationScore ?? 50;
  const crossDivisionScore = context.crossDivisionScore ?? 50;
  const certificationScore = context.certificationScore ?? 50;
  const executionScore = context.executionScore ?? 50;
  const insightsHealth = context.insightsHealth || "optional";
  const reviewSignals = syncStatus === "partial" || syncStatus === "divergent" || certStatus === "review" || certStatus === "incompatible" || activeLoops >= 2 || insightsHealth === "degraded" || insightsHealth === "partial" || executionScore < 50;
  const cautionSignals = decision === "caution" || decision === "hold" || orchestrationScore < 60 || crossDivisionScore < 60 || certificationScore < 50 || executionScore < 60 || activeLoops >= 1 || triggers.length > 0;
  const score2 = computeCloudflareAdaptiveScore(context);
  if (reviewSignals) {
    if (syncStatus === "divergent") {
      reasons.push("Cross-division sync divergent; emphasize reconciliation advisories.");
    } else if (syncStatus === "partial") {
      reasons.push("Cross-division sync partial; review federation alignment.");
    }
    if (certStatus === "incompatible" || certStatus === "review") {
      reasons.push(`Marketplace certification status: ${certStatus}.`);
    }
    if (activeLoops >= 2) {
      reasons.push(`${activeLoops} automation loops active; review loop advisories.`);
    }
    if (insightsHealth === "degraded" || insightsHealth === "partial") {
      reasons.push(`Insights health ${insightsHealth}; review observability advisories.`);
    }
    if (executionScore < 50) {
      reasons.push(`Execution score ${executionScore} below advisory threshold.`);
    }
    if (triggers.length) {
      reasons.push(`${triggers.length} autonomous trigger(s) active.`);
    }
    return { mode: "review", reasons, score: score2 };
  }
  if (cautionSignals) {
    if (decision === "hold") {
      reasons.push("Cloudflare decision is HOLD; highlight caution badges.");
    } else if (decision === "caution") {
      reasons.push("Cloudflare decision is CAUTION; dim risky modules.");
    }
    if (orchestrationScore < 60) {
      reasons.push(`Orchestration score ${orchestrationScore} below advisory threshold.`);
    }
    if (executionScore < 60) {
      reasons.push(`Execution score ${executionScore} below advisory threshold.`);
    }
    if (activeLoops >= 1) {
      reasons.push(`${activeLoops} automation loop(s) active.`);
    }
    return { mode: "caution", reasons, score: score2 };
  }
  if (decision === "proceed" && orchestrationScore >= 70 && crossDivisionScore >= 70 && certificationScore >= 70 && executionScore >= 70) {
    reasons.push("Federation signals stable; normal UI hints.");
    return { mode: "steady", reasons, score: score2 };
  }
  reasons.push("Mixed federation signals; defaulting to caution guidance.");
  return { mode: "caution", reasons, score: score2 };
}
__name(computeCloudflareAdaptiveMode, "computeCloudflareAdaptiveMode");
function buildAdaptiveUiHints(mode, context = {}) {
  const hints = [];
  if (mode === "steady") {
    hints.push({ surface: "operator", hint: "Normal operator console layout; optional Cloudflare badges only.", priority: "low" });
    hints.push({ surface: "marketplace", hint: "Standard module cards; no adaptive dimming.", priority: "low" });
    hints.push({ surface: "os", hint: "OS dashboard at standard emphasis.", priority: "low" });
    return hints;
  }
  if (mode === "caution") {
    hints.push({ surface: "operator", hint: "Highlight caution badges and decision advisories.", priority: "high" });
    hints.push({ surface: "marketplace", hint: "Dim modules with HOLD decision, incompatible certification, or high risk.", priority: "high" });
    hints.push({ surface: "os", hint: "Elevate decision, orchestration, and execution telemetry cards.", priority: "medium" });
    if (context.executionScore != null && context.executionScore < 60) {
      hints.push({ surface: "operator", hint: "Execution score below threshold; surface execution plan advisories.", priority: "high" });
    }
    if (context.decision === "hold") {
      hints.push({ surface: "mission", hint: "Mission strip should reflect HOLD advisory.", priority: "high" });
    }
    return hints;
  }
  if (mode === "review") {
    hints.push({ surface: "operator", hint: "Emphasize cross-division sync, certification, automation, and execution panels.", priority: "high" });
    hints.push({ surface: "marketplace", hint: "Highlight modules with sync or certification advisories.", priority: "high" });
    hints.push({ surface: "os", hint: "Show sync, certification, and automation warnings prominently.", priority: "high" });
    if ((context.automationActiveCount || 0) >= 2) {
      hints.push({ surface: "operator", hint: "Surface active automation loop recommendations.", priority: "medium" });
    }
    return hints;
  }
  hints.push({ surface: "operator", hint: "Cloudflare signals unavailable; show fallback advisory banner.", priority: "high" });
  hints.push({ surface: "marketplace", hint: "Use ADAPT_REVIEW badge; avoid blocking module access.", priority: "medium" });
  hints.push({ surface: "os", hint: "Display degraded adaptive health with optional federation copy.", priority: "medium" });
  return hints;
}
__name(buildAdaptiveUiHints, "buildAdaptiveUiHints");
function buildAdaptiveOperatorGuidance(mode, context = {}) {
  const guidance = [];
  if (mode === "steady") {
    guidance.push("Continue normal operator workflows; Cloudflare federation is advisory-only.");
    return guidance;
  }
  if (mode === "caution") {
    guidance.push("Review Cloudflare decision advisories before promotion or release actions.");
    if (context.decision === "hold") {
      guidance.push("HOLD advisory active; defer high-impact pipeline steps until signals improve.");
    }
    if ((context.automationActiveCount || 0) > 0) {
      guidance.push("Active automation loops detected; review loop recommendations in the automation panel.");
    }
    if (context.executionScore != null && context.executionScore < 60) {
      guidance.push(`Execution score ${context.executionScore} is low; review execution plan before autonomous actions.`);
    }
    return guidance;
  }
  if (mode === "review") {
    guidance.push("Prioritize cross-division sync, certification, and automation loop review.");
    if (context.syncStatus === "divergent" || context.syncStatus === "partial") {
      guidance.push("Reconcile operator-shell and marketplace-backend federation metadata.");
    }
    if (context.certificationStatus === "incompatible" || context.certificationStatus === "review") {
      guidance.push("Review marketplace module certification before binding new modules.");
    }
    if ((context.autonomousTriggers || []).length) {
      guidance.push("Autonomous triggers fired; inspect autonomous signals before chaining agents.");
    }
    if (context.executionScore != null && context.executionScore < 50) {
      guidance.push(`Execution score ${context.executionScore} degraded; defer promotion until execution advisories clear.`);
    }
    return guidance;
  }
  guidance.push("Cloudflare MCP or upstream signals unavailable; federation remains optional.");
  guidance.push("Complete OAuth for Cloudflare MCP servers when ready; no operator actions are blocked.");
  return guidance;
}
__name(buildAdaptiveOperatorGuidance, "buildAdaptiveOperatorGuidance");
function buildCloudflareAdaptiveRuntime(context = {}) {
  const adaptive = computeCloudflareAdaptiveMode(context);
  const signalsMissing = adaptive.mode === "degraded";
  const adaptiveHealth = deriveAdaptiveHealth(adaptive.score, signalsMissing);
  const mode = ADAPTIVE_MODES.includes(adaptive.mode) ? adaptive.mode : "caution";
  return {
    adaptiveState: {
      mode,
      reasons: adaptive.reasons,
      score: adaptive.score
    },
    uiHints: buildAdaptiveUiHints(mode, context),
    operatorGuidance: buildAdaptiveOperatorGuidance(mode, context),
    adaptiveScore: adaptive.score,
    adaptiveHealth,
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareAdaptiveRuntime, "buildCloudflareAdaptiveRuntime");
function buildCloudflareAdaptiveFromSignals({
  orchestration = {},
  crossDivision = {},
  certification = {},
  decision = {},
  execution = {},
  automation = {},
  insights = {},
  autonomous = {},
  reachability = null,
  signalsMissing = false
} = {}) {
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || autonomous.triggers || [];
  const context = {
    executionScore: execution.executionScore ?? null,
    orchestrationScore: orchestration.orchestrationScore ?? null,
    crossDivisionScore: crossDivision.cloudflareCrossDivisionScore ?? crossDivision.crossDivisionScore ?? null,
    certificationScore: certification.aggregate?.score ?? certification.cloudflareCertificationScore ?? null,
    certificationStatus: certification.aggregate?.status ?? "review",
    decision: decision.decision,
    decisionScore: decision.score ?? null,
    syncStatus: crossDivision.syncStatus || "partial",
    automation,
    automationActiveCount: automation.activeCount ?? 0,
    insightsHealth: insights.health ?? insights.cloudflareInsightsHealth,
    autonomousTriggers: triggers,
    reachability,
    signalsMissing
  };
  return buildCloudflareAdaptiveRuntime(context);
}
__name(buildCloudflareAdaptiveFromSignals, "buildCloudflareAdaptiveFromSignals");
async function getCloudflareAdaptiveRuntime(governance = {}, env = {}, options = {}) {
  try {
    const moduleIds = options.moduleIds || null;
    const [orchestration, crossDivision, certification, decision, execution, automation, insights, autonomous, reachability] = await Promise.all([
      getCloudflareOrchestration(governance, env, { moduleIds }),
      getCloudflareCrossDivisionSync(governance, env),
      getMarketplaceCloudflareCertification(governance, moduleIds),
      getCloudflareDecision(governance),
      getCloudflareExecution(governance, env, { moduleIds }),
      getCloudflareAutomationLoops(governance),
      getCloudflareInsights(governance),
      getCloudflareAutonomousSnapshot(governance),
      getCloudflareApiReachability()
    ]);
    return buildCloudflareAdaptiveFromSignals({
      orchestration,
      crossDivision,
      certification,
      decision,
      execution,
      automation,
      insights,
      autonomous,
      reachability
    });
  } catch (error) {
    return buildCloudflareAdvisoryFallback("adaptive", error);
  }
}
__name(getCloudflareAdaptiveRuntime, "getCloudflareAdaptiveRuntime");
function buildCloudflareSafetyAdaptiveFactor(adaptiveSnapshot = {}) {
  const state = adaptiveSnapshot.adaptiveState || adaptiveSnapshot;
  return {
    health: adaptiveSnapshot.adaptiveHealth || deriveAdaptiveHealth(state.score, state.mode === "degraded"),
    score: adaptiveSnapshot.adaptiveScore ?? state.score ?? null,
    mode: state.mode || "caution",
    reasons: state.reasons || [],
    advisoryOnly: true,
    checkedAt: adaptiveSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyAdaptiveFactor, "buildCloudflareSafetyAdaptiveFactor");
function getModuleAdaptiveBadge(mode) {
  const normalized = ADAPTIVE_MODES.includes(mode) ? mode : "caution";
  if (normalized === "steady") {
    return "ADAPT_STEADY";
  }
  if (normalized === "review" || normalized === "degraded") {
    return "ADAPT_REVIEW";
  }
  return "ADAPT_CAUTION";
}
__name(getModuleAdaptiveBadge, "getModuleAdaptiveBadge");
function computeModuleAdaptiveFields(adaptiveRuntime = {}, moduleFields = {}) {
  const globalMode = adaptiveRuntime.adaptiveState?.mode || "caution";
  const cfDecision = moduleFields.cloudflareDecision || "optional";
  const cfCertStatus = moduleFields.cloudflareCertification?.status || "review";
  const cfSyncStatus = moduleFields.cloudflareSyncStatus || "partial";
  let emphasis = globalMode;
  if (globalMode === "caution" && (cfDecision === "hold" || cfCertStatus === "incompatible")) {
    emphasis = "caution";
  } else if (globalMode === "review" && (cfSyncStatus === "partial" || cfSyncStatus === "divergent" || cfCertStatus === "review")) {
    emphasis = "review";
  }
  return {
    cloudflareAdaptiveBadge: getModuleAdaptiveBadge(emphasis),
    cloudflareAdaptiveMode: globalMode,
    cloudflareAdaptiveEmphasis: emphasis,
    cloudflareAdaptiveDim: globalMode === "caution" && (cfDecision === "hold" || cfCertStatus === "incompatible"),
    cloudflareAdaptiveHighlight: globalMode === "review" && (cfSyncStatus === "partial" || cfSyncStatus === "divergent" || cfCertStatus === "review")
  };
}
__name(computeModuleAdaptiveFields, "computeModuleAdaptiveFields");
var PREDICTIVE_FORECAST_MODES = ["stable", "watch", "alert", "fallback"];
function derivePredictiveHealth(forecastScore, signalsMissing = false) {
  if (signalsMissing || forecastScore == null) {
    return "degraded";
  }
  if (forecastScore >= 80) {
    return "healthy";
  }
  if (forecastScore >= 50) {
    return "advisory";
  }
  return "degraded";
}
__name(derivePredictiveHealth, "derivePredictiveHealth");
function countHighRiskModules(certification = {}) {
  const moduleCerts = certification.certifications || {};
  return Object.values(moduleCerts).filter(
    (entry) => entry.status === "incompatible" || (entry.score ?? 100) < 50
  ).length;
}
__name(countHighRiskModules, "countHighRiskModules");
function computePredictiveForecastScore(context = {}) {
  const adaptiveScore = context.adaptiveScore ?? 50;
  const executionScore = context.executionScore ?? 50;
  const orchestrationScore = context.orchestrationScore ?? 50;
  const crossDivisionScore = context.crossDivisionScore ?? 50;
  const certificationScore = context.certificationScore ?? 50;
  const decisionScore = context.decisionScore ?? 50;
  const automationPenalty = (context.automationActiveCount ?? 0) * 8;
  const insightsPenalty = context.insightsHealth === "degraded" ? 20 : context.insightsHealth === "partial" ? 10 : 0;
  const triggerPenalty = (context.autonomousTriggers || []).length * 10;
  const moduleRiskPenalty = (context.highRiskModuleCount ?? 0) * 5;
  const weighted = Math.round(
    adaptiveScore * 0.15 + executionScore * 0.12 + orchestrationScore * 0.12 + crossDivisionScore * 0.15 + certificationScore * 0.12 + decisionScore * 0.18 + 50 * 0.16
  );
  return Math.max(0, Math.min(100, weighted - automationPenalty - insightsPenalty - triggerPenalty - moduleRiskPenalty));
}
__name(computePredictiveForecastScore, "computePredictiveForecastScore");
function computePredictiveForecastMode(context = {}) {
  const reasons = [];
  const offlineCount = (context.reachability?.servers || []).filter((server) => server.status === "offline").length;
  const signalsMissing = context.signalsMissing === true || offlineCount >= 3 || context.adaptiveMode === "degraded" || context.reachability?.health === "offline" && offlineCount > 0;
  if (signalsMissing) {
    reasons.push("Insufficient Cloudflare signals for forecasting; using fallback mode.");
    if (offlineCount) {
      reasons.push(`${offlineCount} MCP server(s) offline.`);
    }
    return {
      mode: "fallback",
      reasons,
      score: Math.max(25, computePredictiveForecastScore({ ...context, decisionScore: 40 }) - 20)
    };
  }
  const syncStatus = context.syncStatus || "partial";
  const decision = String(context.decision || "caution").toLowerCase();
  const adaptiveMode = context.adaptiveMode || "caution";
  const executionScore = context.executionScore ?? 50;
  const orchestrationScore = context.orchestrationScore ?? 50;
  const crossDivisionScore = context.crossDivisionScore ?? 50;
  const certStatus = context.certificationStatus || "review";
  const activeLoops = context.automationActiveCount ?? 0;
  const triggers = context.autonomousTriggers || [];
  const highRiskModules = context.highRiskModuleCount ?? 0;
  const score2 = computePredictiveForecastScore(context);
  const alertSignals = syncStatus === "divergent" || certStatus === "incompatible" || decision === "hold" || adaptiveMode === "degraded" || executionScore < 45 || orchestrationScore < 45 || triggers.length >= 2 || highRiskModules >= 3;
  if (alertSignals) {
    if (syncStatus === "divergent") {
      reasons.push("Predicted sync divergence escalation without reconciliation.");
    }
    if (certStatus === "incompatible") {
      reasons.push("Forecast module certification degradation across federation.");
    }
    if (decision === "hold") {
      reasons.push("HOLD decision may escalate into pipeline blocking advisories.");
    }
    if (highRiskModules >= 3) {
      reasons.push(`${highRiskModules} high-risk module patterns detected.`);
    }
    if (triggers.length >= 2) {
      reasons.push(`${triggers.length} autonomous triggers may compound federation drift.`);
    }
    return { mode: "alert", reasons, score: score2 };
  }
  const watchSignals = syncStatus === "partial" || decision === "caution" || adaptiveMode === "review" || adaptiveMode === "caution" || activeLoops >= 1 || triggers.length >= 1 || crossDivisionScore < 65 || executionScore < 60 || orchestrationScore < 60 || highRiskModules >= 1;
  if (watchSignals) {
    if (syncStatus === "partial") {
      reasons.push("Cross-division sync drift likely without preemptive review.");
    }
    if (activeLoops >= 1) {
      reasons.push(`${activeLoops} automation loop(s) may increase advisory surface area.`);
    }
    if (highRiskModules >= 1) {
      reasons.push(`${highRiskModules} module(s) show rising risk patterns.`);
    }
    if (executionScore < 60 || orchestrationScore < 60) {
      reasons.push("Execution or orchestration scores trending below advisory threshold.");
    }
    return { mode: "watch", reasons, score: score2 };
  }
  if (decision === "proceed" && adaptiveMode === "steady" && score2 >= 75) {
    reasons.push("Federation signals stable; no major changes forecast.");
    return { mode: "stable", reasons, score: score2 };
  }
  reasons.push("Mixed federation signals; monitoring recommended.");
  return { mode: "watch", reasons, score: score2 };
}
__name(computePredictiveForecastMode, "computePredictiveForecastMode");
function buildPredictiveForecastItems(context = {}, mode = "watch") {
  const predictions = [];
  if (mode === "fallback") {
    predictions.push({
      type: "signal_gap",
      severity: "medium",
      forecast: "OAuth or upstream repos may limit forecast accuracy.",
      confidence: 0.5
    });
    return predictions;
  }
  if (context.syncStatus === "partial" || context.syncStatus === "divergent") {
    predictions.push({
      type: "sync_drift",
      severity: context.syncStatus === "divergent" ? "high" : "medium",
      forecast: context.syncStatus === "divergent" ? "Cross-division sync divergence may persist without reconciliation." : "Cross-division sync may drift toward partial divergence.",
      confidence: context.syncStatus === "divergent" ? 0.82 : 0.68
    });
  }
  if ((context.highRiskModuleCount ?? 0) > 0) {
    predictions.push({
      type: "module_risk",
      severity: (context.highRiskModuleCount ?? 0) >= 3 ? "high" : "medium",
      forecast: `${context.highRiskModuleCount} module(s) show elevated risk patterns.`,
      confidence: 0.7
    });
  }
  if (context.decision === "hold" || context.decision === "caution") {
    predictions.push({
      type: "pipeline_advisory",
      severity: context.decision === "hold" ? "high" : "medium",
      forecast: `Pipeline promotions may face ${String(context.decision).toUpperCase()} advisories.`,
      confidence: 0.75
    });
  }
  if ((context.automationActiveCount ?? 0) >= 2) {
    predictions.push({
      type: "automation_loop",
      severity: "medium",
      forecast: "Active automation loops may compound federation drift.",
      confidence: 0.65
    });
  }
  if ((context.autonomousTriggers || []).length >= 1) {
    predictions.push({
      type: "autonomous_trigger",
      severity: "medium",
      forecast: "Autonomous triggers may escalate advisory volume.",
      confidence: 0.62
    });
  }
  if (mode === "stable" && predictions.length === 0) {
    predictions.push({
      type: "federation_stable",
      severity: "low",
      forecast: "No major federation changes forecast in the current window.",
      confidence: 0.8
    });
  }
  return predictions;
}
__name(buildPredictiveForecastItems, "buildPredictiveForecastItems");
function buildPredictivePreemptiveActions(mode = "watch", context = {}, predictions = []) {
  const actions = [];
  if (mode === "fallback") {
    actions.push("Complete Cloudflare MCP OAuth when ready to improve forecast accuracy.");
    actions.push("Continue advisory-only workflows; predictive modeling does not block operations.");
    return actions;
  }
  if (mode === "alert") {
    actions.push("Review cross-division sync and reconcile divergent federation metadata.");
    actions.push("Defer high-impact pipeline steps until certification and execution scores improve.");
  }
  if (mode === "watch") {
    actions.push("Monitor automation loops and autonomous triggers for escalation.");
    if (context.syncStatus === "partial") {
      actions.push("Schedule marketplace sync review before the next promotion window.");
    }
  }
  if (mode === "stable") {
    actions.push("No preemptive actions required; continue normal advisory federation workflows.");
  }
  predictions.filter((entry) => entry.severity === "high").forEach((entry) => {
    if (entry.type === "sync_drift") {
      actions.push("Preemptively reconcile operator-shell and marketplace-backend sync payloads.");
    }
    if (entry.type === "module_risk") {
      actions.push("Review high-risk module certification before binding new modules.");
    }
  });
  return [...new Set(actions)];
}
__name(buildPredictivePreemptiveActions, "buildPredictivePreemptiveActions");
function buildCloudflarePredictiveRuntime(context = {}) {
  const forecast = computePredictiveForecastMode(context);
  const signalsMissing = forecast.mode === "fallback";
  const predictiveHealth = derivePredictiveHealth(forecast.score, signalsMissing);
  const mode = PREDICTIVE_FORECAST_MODES.includes(forecast.mode) ? forecast.mode : "watch";
  const predictions = buildPredictiveForecastItems(context, mode);
  const recommendedPreemptiveActions = buildPredictivePreemptiveActions(mode, context, predictions);
  return {
    predictiveState: {
      forecastMode: mode,
      forecastScore: forecast.score,
      forecastReasons: forecast.reasons
    },
    predictions,
    recommendedPreemptiveActions,
    predictiveScore: forecast.score,
    predictiveHealth,
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflarePredictiveRuntime, "buildCloudflarePredictiveRuntime");
function buildCloudflarePredictiveFromSignals({
  adaptive = {},
  orchestration = {},
  crossDivision = {},
  certification = {},
  decision = {},
  execution = {},
  automation = {},
  insights = {},
  autonomous = {},
  reachability = null
} = {}) {
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || autonomous.triggers || [];
  const highRiskModuleCount = countHighRiskModules(certification);
  const context = {
    adaptiveMode: adaptive.adaptiveState?.mode,
    adaptiveScore: adaptive.adaptiveScore ?? adaptive.adaptiveState?.score,
    executionScore: execution.executionScore ?? null,
    orchestrationScore: orchestration.orchestrationScore ?? null,
    crossDivisionScore: crossDivision.cloudflareCrossDivisionScore ?? crossDivision.crossDivisionScore ?? null,
    certificationScore: certification.aggregate?.score ?? certification.cloudflareCertificationScore ?? null,
    certificationStatus: certification.aggregate?.status ?? "review",
    decision: decision.decision,
    decisionScore: decision.score ?? null,
    syncStatus: crossDivision.syncStatus || "partial",
    automationActiveCount: automation.activeCount ?? Object.values(automation.loops || {}).filter((loop) => loop.active).length,
    insightsHealth: insights.health ?? insights.cloudflareInsightsHealth,
    autonomousTriggers: triggers,
    highRiskModuleCount,
    reachability,
    signalsMissing: adaptive.adaptiveState?.mode === "degraded"
  };
  return buildCloudflarePredictiveRuntime(context);
}
__name(buildCloudflarePredictiveFromSignals, "buildCloudflarePredictiveFromSignals");
async function getCloudflarePredictiveModeling(governance = {}, env = {}, options = {}) {
  try {
    const moduleIds = options.moduleIds || null;
    const [adaptive, orchestration, crossDivision, certification, decision, execution, automation, insights, autonomous, reachability] = await Promise.all([
      getCloudflareAdaptiveRuntime(governance, env, { moduleIds }),
      getCloudflareOrchestration(governance, env, { moduleIds }),
      getCloudflareCrossDivisionSync(governance, env, moduleIds ? { moduleIds } : {}),
      getMarketplaceCloudflareCertification(governance, moduleIds),
      getCloudflareDecision(governance),
      getCloudflareExecution(governance, env, { moduleIds }),
      getCloudflareAutomationLoops(governance),
      getCloudflareInsights(governance),
      getCloudflareAutonomousSnapshot(governance),
      getCloudflareApiReachability()
    ]);
    return buildCloudflarePredictiveFromSignals({
      adaptive,
      orchestration,
      crossDivision,
      certification,
      decision,
      execution,
      automation,
      insights,
      autonomous,
      reachability
    });
  } catch (error) {
    return buildCloudflareAdvisoryFallback("predictive", error);
  }
}
__name(getCloudflarePredictiveModeling, "getCloudflarePredictiveModeling");
function buildCloudflareSafetyPredictiveFactor(predictiveSnapshot = {}) {
  const state = predictiveSnapshot.predictiveState || predictiveSnapshot;
  return {
    health: predictiveSnapshot.predictiveHealth || derivePredictiveHealth(state.forecastScore ?? state.score, state.forecastMode === "fallback"),
    score: predictiveSnapshot.predictiveScore ?? state.forecastScore ?? null,
    mode: state.forecastMode || "watch",
    reasons: state.forecastReasons || [],
    predictionCount: (predictiveSnapshot.predictions || []).length,
    advisoryOnly: true,
    checkedAt: predictiveSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyPredictiveFactor, "buildCloudflareSafetyPredictiveFactor");
function getModulePredictiveBadge(mode) {
  const normalized = PREDICTIVE_FORECAST_MODES.includes(mode) ? mode : "watch";
  if (normalized === "stable") {
    return "PREDICT_STABLE";
  }
  if (normalized === "alert" || normalized === "fallback") {
    return "PREDICT_ALERT";
  }
  return "PREDICT_WATCH";
}
__name(getModulePredictiveBadge, "getModulePredictiveBadge");
function computeModulePredictiveFields(predictiveRuntime = {}, moduleFields = {}) {
  const globalMode = predictiveRuntime.predictiveState?.forecastMode || "watch";
  const cfDecision = moduleFields.cloudflareDecision || "optional";
  const cfCertStatus = moduleFields.cloudflareCertification?.status || "review";
  const cfModuleRisk = moduleFields.cloudflareModuleRisk || "low";
  const cfSyncStatus = moduleFields.cloudflareSyncStatus || "partial";
  let moduleForecast = globalMode;
  if (globalMode === "watch" && (cfModuleRisk === "high" || cfCertStatus === "incompatible")) {
    moduleForecast = "alert";
  } else if (globalMode === "stable" && (cfModuleRisk === "high" || cfDecision === "hold")) {
    moduleForecast = "watch";
  } else if (globalMode === "alert" && cfModuleRisk === "low" && cfCertStatus === "certified" && cfSyncStatus === "aligned") {
    moduleForecast = "watch";
  }
  const badgeMode = moduleForecast === "fallback" ? "alert" : moduleForecast;
  return {
    cloudflarePredictiveBadge: getModulePredictiveBadge(badgeMode),
    cloudflarePredictiveMode: globalMode,
    cloudflarePredictiveModuleForecast: moduleForecast,
    cloudflarePredictiveDim: badgeMode === "alert" || badgeMode === "fallback",
    cloudflarePredictiveHighlight: badgeMode === "watch" && (cfSyncStatus === "partial" || cfSyncStatus === "divergent" || cfCertStatus === "review")
  };
}
__name(computeModulePredictiveFields, "computeModulePredictiveFields");
function deriveStrategicHealth(planScore, signalsMissing = false) {
  if (signalsMissing || planScore == null) {
    return "degraded";
  }
  if (planScore >= 80) {
    return "healthy";
  }
  if (planScore >= 50) {
    return "advisory";
  }
  return "degraded";
}
__name(deriveStrategicHealth, "deriveStrategicHealth");
function computeStrategicPlanScore(context = {}) {
  const predictiveScore = context.predictiveScore ?? 50;
  const adaptiveScore = context.adaptiveScore ?? 50;
  const executionScore = context.executionScore ?? 50;
  const orchestrationScore = context.orchestrationScore ?? 50;
  const crossDivisionScore = context.crossDivisionScore ?? 50;
  const certificationScore = context.certificationScore ?? 50;
  const decisionScore = context.decisionScore ?? 50;
  const loopPenalty = (context.automationActiveCount ?? 0) * 6;
  const triggerPenalty = (context.autonomousTriggers || []).length * 8;
  const riskPenalty = (context.highRiskModuleCount ?? 0) * 4;
  const weighted = Math.round(
    predictiveScore * 0.2 + adaptiveScore * 0.15 + executionScore * 0.12 + orchestrationScore * 0.12 + crossDivisionScore * 0.13 + certificationScore * 0.13 + decisionScore * 0.15
  );
  return Math.max(0, Math.min(100, weighted - loopPenalty - triggerPenalty - riskPenalty));
}
__name(computeStrategicPlanScore, "computeStrategicPlanScore");
function computeStrategicHorizon(context = {}) {
  const signalsMissing = context.signalsMissing === true || context.predictiveMode === "fallback" || context.adaptiveMode === "degraded";
  if (signalsMissing) {
    return "short";
  }
  if (context.predictiveMode === "stable" && context.adaptiveMode === "steady" && context.decision === "proceed" && (context.planScore ?? 0) >= 75) {
    return "long";
  }
  return "medium";
}
__name(computeStrategicHorizon, "computeStrategicHorizon");
function computeStrategicStripMode(context = {}) {
  if (context.predictiveMode === "alert" || context.predictiveMode === "fallback" || context.adaptiveMode === "degraded" || context.adaptiveMode === "review" || context.decision === "hold" || context.syncStatus === "divergent") {
    return "prioritize";
  }
  if (context.predictiveMode === "watch" || context.adaptiveMode === "caution" || context.decision === "caution" || context.syncStatus === "partial" || (context.automationActiveCount ?? 0) >= 1 || (context.autonomousTriggers || []).length >= 1) {
    return "watch";
  }
  return "stable";
}
__name(computeStrategicStripMode, "computeStrategicStripMode");
function buildStrategicThemes(context = {}) {
  const themes = [];
  if (context.syncStatus === "partial" || context.syncStatus === "divergent") {
    themes.push("stability");
  }
  if ((context.highRiskModuleCount ?? 0) > 0 || context.certificationStatus === "incompatible" || context.certificationStatus === "review" || context.decision === "hold") {
    themes.push("risk_reduction");
  }
  if ((context.executionScore ?? 100) < 70 || (context.orchestrationScore ?? 100) < 70) {
    themes.push("performance");
  }
  if (context.insightsHealth === "degraded" || context.insightsHealth === "partial" || (context.automationActiveCount ?? 0) >= 1) {
    themes.push("observability");
  }
  if (!themes.length) {
    themes.push("stability");
  }
  return [...new Set(themes)];
}
__name(buildStrategicThemes, "buildStrategicThemes");
function buildStrategicPlan(context = {}, horizon = "medium") {
  const steps = [];
  if (context.signalsMissing || context.predictiveMode === "fallback") {
    steps.push({
      action: "Complete OAuth for Cloudflare MCP servers and refresh federation signals.",
      horizon: "short",
      theme: "observability",
      priority: "high"
    });
    steps.push({
      action: "Run short-horizon advisory review; defer promotion until signals improve.",
      horizon: "short",
      theme: "risk_reduction",
      priority: "high"
    });
    return steps;
  }
  if (context.syncStatus === "partial" || context.syncStatus === "divergent") {
    steps.push({
      action: "Tighten cross-division sync between operator-shell and marketplace-backend.",
      horizon,
      theme: "stability",
      priority: context.syncStatus === "divergent" ? "high" : "medium"
    });
  }
  if (context.certificationStatus === "review" || context.certificationStatus === "incompatible") {
    steps.push({
      action: "Review marketplace module certification and rotate high-risk modules.",
      horizon,
      theme: "risk_reduction",
      priority: "high"
    });
  }
  if ((context.automationActiveCount ?? 0) >= 2) {
    steps.push({
      action: "Address active automation loops before expanding federation campaigns.",
      horizon,
      theme: "observability",
      priority: "medium"
    });
  }
  if (context.decision === "caution" || context.decision === "hold") {
    steps.push({
      action: "Review pipeline advisories and tighten promotion gates for HOLD/CAUTION decisions.",
      horizon,
      theme: "risk_reduction",
      priority: context.decision === "hold" ? "high" : "medium"
    });
  }
  if ((context.executionScore ?? 100) < 65 || (context.orchestrationScore ?? 100) < 65) {
    steps.push({
      action: "Improve execution and orchestration scores via advisory plan review.",
      horizon,
      theme: "performance",
      priority: "medium"
    });
  }
  if (!steps.length) {
    steps.push({
      action: "Maintain steady federation posture; schedule routine observability review.",
      horizon: horizon === "long" ? "long" : "medium",
      theme: "stability",
      priority: "low"
    });
  }
  return steps.slice(0, 8);
}
__name(buildStrategicPlan, "buildStrategicPlan");
function buildRecommendedCampaigns(context = {}, themes = []) {
  const campaigns = [];
  if (themes.includes("stability") && (context.syncStatus === "partial" || context.syncStatus === "divergent")) {
    campaigns.push("Sync Hardening Week");
  }
  if (themes.includes("risk_reduction")) {
    campaigns.push("Certification Review Sprint");
  }
  if (themes.includes("observability")) {
    campaigns.push("Observability Loop Triage");
  }
  if (themes.includes("performance") && !campaigns.length) {
    campaigns.push("Orchestration Tune-Up");
  }
  if (!campaigns.length) {
    campaigns.push("Federation Steady-State Check");
  }
  return [...new Set(campaigns)].slice(0, 4);
}
__name(buildRecommendedCampaigns, "buildRecommendedCampaigns");
function buildStrategicPlanReasons(context = {}, horizon = "medium", stripMode = "watch") {
  const reasons = [];
  if (context.signalsMissing) {
    reasons.push("Predictive/adaptive signals missing; short-horizon fallback plan.");
  }
  reasons.push(`Strategic horizon: ${horizon} (hours\u2013days advisory window).`);
  reasons.push(`Mission strip alignment: ${stripMode.toUpperCase()}.`);
  if (context.predictiveMode) {
    reasons.push(`Predictive forecast: ${context.predictiveMode} (score ${context.predictiveScore ?? "n/a"}).`);
  }
  if ((context.highRiskModuleCount ?? 0) > 0) {
    reasons.push(`${context.highRiskModuleCount} module(s) show evolving risk patterns.`);
  }
  return reasons;
}
__name(buildStrategicPlanReasons, "buildStrategicPlanReasons");
function buildCloudflareStrategicRuntime(context = {}) {
  const signalsMissing = context.signalsMissing === true || context.predictiveMode === "fallback" || context.adaptiveMode === "degraded";
  const planScore = computeStrategicPlanScore(context);
  const horizon = computeStrategicHorizon({ ...context, planScore });
  const stripMode = computeStrategicStripMode(context);
  const strategicThemes = buildStrategicThemes(context);
  const strategicPlan = buildStrategicPlan(context, horizon);
  const recommendedCampaigns = buildRecommendedCampaigns(context, strategicThemes);
  const planReasons = buildStrategicPlanReasons(context, horizon, stripMode);
  return {
    strategicState: {
      horizon,
      planScore,
      planReasons,
      stripMode
    },
    strategicPlan,
    strategicThemes,
    recommendedCampaigns,
    strategicScore: planScore,
    strategicHealth: deriveStrategicHealth(planScore, signalsMissing),
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareStrategicRuntime, "buildCloudflareStrategicRuntime");
function buildCloudflareStrategicFromSignals({
  predictive = {},
  adaptive = {},
  orchestration = {},
  crossDivision = {},
  certification = {},
  decision = {},
  execution = {},
  automation = {},
  insights = {},
  autonomous = {}
} = {}) {
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || autonomous.triggers || [];
  const highRiskModuleCount = countHighRiskModules(certification);
  const context = {
    predictiveMode: predictive.predictiveState?.forecastMode,
    predictiveScore: predictive.predictiveScore ?? predictive.predictiveState?.forecastScore,
    adaptiveMode: adaptive.adaptiveState?.mode,
    adaptiveScore: adaptive.adaptiveScore ?? adaptive.adaptiveState?.score,
    executionScore: execution.executionScore ?? null,
    orchestrationScore: orchestration.orchestrationScore ?? null,
    crossDivisionScore: crossDivision.cloudflareCrossDivisionScore ?? crossDivision.crossDivisionScore ?? null,
    certificationScore: certification.aggregate?.score ?? null,
    certificationStatus: certification.aggregate?.status ?? "review",
    decision: decision.decision,
    decisionScore: decision.score ?? null,
    syncStatus: crossDivision.syncStatus || "partial",
    automationActiveCount: automation.activeCount ?? Object.values(automation.loops || {}).filter((loop) => loop.active).length,
    insightsHealth: insights.health ?? insights.cloudflareInsightsHealth,
    autonomousTriggers: triggers,
    highRiskModuleCount,
    signalsMissing: predictive.predictiveState?.forecastMode === "fallback" || adaptive.adaptiveState?.mode === "degraded",
    predictions: predictive.predictions || []
  };
  return buildCloudflareStrategicRuntime(context);
}
__name(buildCloudflareStrategicFromSignals, "buildCloudflareStrategicFromSignals");
async function getCloudflareStrategicPlanning(governance = {}, env = {}, options = {}) {
  try {
    const moduleIds = options.moduleIds || null;
    const [predictive, adaptive, orchestration, crossDivision, certification, decision, execution, automation, insights, autonomous] = await Promise.all([
      getCloudflarePredictiveModeling(governance, env, { moduleIds }),
      getCloudflareAdaptiveRuntime(governance, env, { moduleIds }),
      getCloudflareOrchestration(governance, env, { moduleIds }),
      getCloudflareCrossDivisionSync(governance, env, moduleIds ? { moduleIds } : {}),
      getMarketplaceCloudflareCertification(governance, moduleIds),
      getCloudflareDecision(governance),
      getCloudflareExecution(governance, env, { moduleIds }),
      getCloudflareAutomationLoops(governance),
      getCloudflareInsights(governance),
      getCloudflareAutonomousSnapshot(governance)
    ]);
    return buildCloudflareStrategicFromSignals({
      predictive,
      adaptive,
      orchestration,
      crossDivision,
      certification,
      decision,
      execution,
      automation,
      insights,
      autonomous
    });
  } catch (error) {
    return buildCloudflareAdvisoryFallback("strategic", error);
  }
}
__name(getCloudflareStrategicPlanning, "getCloudflareStrategicPlanning");
function buildCloudflareSafetyStrategicFactor(strategicSnapshot = {}) {
  const state = strategicSnapshot.strategicState || strategicSnapshot;
  return {
    health: strategicSnapshot.strategicHealth || deriveStrategicHealth(state.planScore ?? state.score, state.horizon === "short" && state.planScore < 40),
    score: strategicSnapshot.strategicScore ?? state.planScore ?? null,
    horizon: state.horizon || "medium",
    stripMode: state.stripMode || "watch",
    planSteps: (strategicSnapshot.strategicPlan || []).length,
    campaigns: strategicSnapshot.recommendedCampaigns || [],
    advisoryOnly: true,
    checkedAt: strategicSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyStrategicFactor, "buildCloudflareSafetyStrategicFactor");
function getModuleStrategicTag(moduleFields = {}, strategicRuntime = {}) {
  const certStatus = moduleFields.cloudflareCertification?.status || "review";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  const syncStatus = moduleFields.cloudflareSyncStatus || "partial";
  const decision = moduleFields.cloudflareDecision || "optional";
  const stripMode = strategicRuntime.strategicState?.stripMode || "watch";
  if (certStatus === "incompatible" || moduleRisk === "high" || decision === "hold" || stripMode === "prioritize") {
    return "STRAT_REVIEW";
  }
  if (syncStatus === "partial" || syncStatus === "divergent" || certStatus === "review") {
    return "STRAT_STABILIZE";
  }
  if (decision === "proceed" && certStatus === "certified" && moduleRisk === "low" && stripMode === "stable") {
    return "STRAT_PROMOTE";
  }
  return stripMode === "stable" ? "STRAT_PROMOTE" : "STRAT_STABILIZE";
}
__name(getModuleStrategicTag, "getModuleStrategicTag");
function computeModuleStrategicFields(strategicRuntime = {}, moduleFields = {}, moduleId = null) {
  const tag = getModuleStrategicTag(moduleFields, strategicRuntime);
  const inPlan = (strategicRuntime.strategicPlan || []).some(
    (step) => step.theme === "risk_reduction" && tag === "STRAT_REVIEW" || step.theme === "stability" && tag === "STRAT_STABILIZE" || step.theme === "performance" && tag === "STRAT_PROMOTE"
  );
  return {
    cloudflareStrategicTag: tag,
    cloudflareStrategicHorizon: strategicRuntime.strategicState?.horizon || "medium",
    cloudflareStrategicStripMode: strategicRuntime.strategicState?.stripMode || "watch",
    cloudflareStrategicHighlight: inPlan || tag === "STRAT_REVIEW",
    cloudflareStrategicInPlan: inPlan,
    cloudflareStrategicModuleId: moduleId
  };
}
__name(computeModuleStrategicFields, "computeModuleStrategicFields");
function computeUcipMode(context = {}) {
  const decision = context.decision || "caution";
  const adaptiveMode = context.adaptiveMode || "caution";
  const predictiveMode = context.predictiveMode || "watch";
  const stripMode = context.stripMode || "watch";
  const horizon = context.horizon || "medium";
  if (context.signalsMissing || adaptiveMode === "degraded" || predictiveMode === "fallback") {
    return "red";
  }
  if (decision === "hold" || predictiveMode === "alert" || stripMode === "prioritize" || horizon === "short") {
    return "orange";
  }
  if (decision === "caution" || predictiveMode === "watch" || stripMode === "watch" || adaptiveMode === "caution" || adaptiveMode === "review") {
    return "yellow";
  }
  if (decision === "proceed" && adaptiveMode === "steady" && predictiveMode === "stable" && (stripMode === "stable" || horizon === "long")) {
    return "green";
  }
  return "yellow";
}
__name(computeUcipMode, "computeUcipMode");
function deriveUcipHealth(mode) {
  if (mode === "green") {
    return "healthy";
  }
  if (mode === "red") {
    return "degraded";
  }
  return "advisory";
}
__name(deriveUcipHealth, "deriveUcipHealth");
function computeUcipScore(context = {}) {
  const scores = [
    context.decisionScore,
    context.adaptiveScore,
    context.predictiveScore,
    context.strategicScore,
    context.executionScore,
    context.orchestrationScore,
    context.crossDivisionScore,
    context.certificationScore,
    context.automationScore,
    context.autonomousScore,
    context.insightsScore
  ].filter((entry) => entry != null && !Number.isNaN(Number(entry)));
  if (!scores.length) {
    return 25;
  }
  const modePenalty = { green: 0, yellow: 5, orange: 12, red: 25 }[context.mode] ?? 8;
  const weighted = Math.round(scores.reduce((sum, entry) => sum + Number(entry), 0) / scores.length);
  return Math.max(0, Math.min(100, weighted - modePenalty));
}
__name(computeUcipScore, "computeUcipScore");
function buildUcipSignals({
  automation = {},
  autonomous = {},
  decision = {},
  certification = {},
  crossDivision = {},
  orchestration = {},
  execution = {},
  adaptive = {},
  predictive = {},
  strategic = {},
  insights = {}
} = {}) {
  const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || autonomous.triggers || [];
  return {
    automation: {
      activeCount: automation.activeCount ?? 0,
      health: automation.health,
      score: automation.score,
      loops: Object.keys(automation.loops || {}).filter((id) => automation.loops[id]?.active)
    },
    autonomous: {
      triggerCount: triggers.length,
      triggers,
      score: autonomous.cloudflareSafety?.autonomousScore ?? null,
      warnings: autonomous.cloudflareSafety?.autonomousWarnings || []
    },
    decision: {
      decision: decision.decision,
      score: decision.score,
      reasons: decision.reasons || []
    },
    certification: {
      status: certification.aggregate?.status,
      score: certification.aggregate?.score,
      reasons: certification.aggregate?.reasons || []
    },
    sync: {
      syncStatus: crossDivision.syncStatus,
      score: crossDivision.crossDivisionScore ?? crossDivision.cloudflareCrossDivisionScore,
      health: crossDivision.crossDivisionHealth ?? crossDivision.cloudflareCrossDivisionHealth
    },
    orchestration: {
      score: orchestration.orchestrationScore,
      health: orchestration.orchestrationHealth,
      planCount: (orchestration.plan || []).length
    },
    execution: {
      score: execution.executionScore,
      health: execution.executionHealth,
      nextActions: (execution.nextActions || []).slice(0, 3)
    },
    adaptive: {
      mode: adaptive.adaptiveState?.mode,
      score: adaptive.adaptiveScore,
      hints: (adaptive.uiHints || []).length,
      guidance: (adaptive.operatorGuidance || []).slice(0, 2)
    },
    predictive: {
      forecastMode: predictive.predictiveState?.forecastMode,
      score: predictive.predictiveScore,
      predictions: (predictive.predictions || []).length,
      preemptiveActions: (predictive.recommendedPreemptiveActions || []).slice(0, 2)
    },
    strategic: {
      horizon: strategic.strategicState?.horizon,
      stripMode: strategic.strategicState?.stripMode,
      score: strategic.strategicScore,
      planCount: (strategic.strategicPlan || []).length
    },
    insights: {
      score: insights.cloudflareInsightsScore,
      health: insights.health
    }
  };
}
__name(buildUcipSignals, "buildUcipSignals");
function buildUcipRecommendedActions(context = {}, signals = {}) {
  const actions = [];
  if (signals.execution?.nextActions?.length) {
    actions.push(...signals.execution.nextActions);
  }
  if (signals.predictive?.preemptiveActions?.length) {
    actions.push(...signals.predictive.preemptiveActions);
  }
  if (context.strategicPlan?.length) {
    actions.push(...context.strategicPlan.slice(0, 3).map((step) => step.action));
  }
  if (signals.orchestration?.planCount > 0 && signals.orchestration.health !== "healthy") {
    actions.push("Review orchestration plan advisories.");
  }
  if (signals.sync?.syncStatus === "divergent" || signals.sync?.syncStatus === "partial") {
    actions.push("Reconcile cross-division Cloudflare sync.");
  }
  if (signals.automation?.activeCount >= 2) {
    actions.push("Address active automation loops before promotion.");
  }
  if (!actions.length) {
    actions.push("Maintain advisory federation steady-state; optional OAuth when ready.");
  }
  return [...new Set(actions)].slice(0, 8);
}
__name(buildUcipRecommendedActions, "buildUcipRecommendedActions");
function buildCloudflareUcipFromSignals({
  automation = {},
  autonomous = {},
  decision = {},
  certification = {},
  crossDivision = {},
  orchestration = {},
  execution = {},
  adaptive = {},
  predictive = {},
  strategic = {},
  insights = {}
} = {}) {
  const strategicPlan = strategic.strategicPlan || [];
  const horizon = strategic.strategicState?.horizon || "medium";
  const stripMode = strategic.strategicState?.stripMode || "watch";
  const signalsMissing = adaptive.adaptiveState?.mode === "degraded" || predictive.predictiveState?.forecastMode === "fallback";
  const context = {
    decision: decision.decision,
    adaptiveMode: adaptive.adaptiveState?.mode,
    predictiveMode: predictive.predictiveState?.forecastMode,
    stripMode,
    horizon,
    signalsMissing,
    decisionScore: decision.score,
    adaptiveScore: adaptive.adaptiveScore,
    predictiveScore: predictive.predictiveScore,
    strategicScore: strategic.strategicScore,
    executionScore: execution.executionScore,
    orchestrationScore: orchestration.orchestrationScore,
    crossDivisionScore: crossDivision.crossDivisionScore ?? crossDivision.cloudflareCrossDivisionScore,
    certificationScore: certification.aggregate?.score,
    automationScore: automation.score ?? (automation.activeCount != null ? 100 - automation.activeCount * 15 : null),
    autonomousScore: autonomous.cloudflareSafety?.autonomousScore,
    insightsScore: insights.cloudflareInsightsScore,
    strategicPlan
  };
  const mode = computeUcipMode(context);
  context.mode = mode;
  const score2 = computeUcipScore(context);
  const health = deriveUcipHealth(mode);
  const ucipSignals = buildUcipSignals({
    automation,
    autonomous,
    decision,
    certification,
    crossDivision,
    orchestration,
    execution,
    adaptive,
    predictive,
    strategic,
    insights
  });
  const ucipReasons = [
    `UCIP mode: ${mode} (synthesized across ${CLOUDFLARE_UCIP2.layers.length} federation layers).`,
    ...(decision.reasons || []).slice(0, 2),
    ...(adaptive.adaptiveState?.reasons || []).slice(0, 1),
    ...(predictive.predictiveState?.forecastReasons || []).slice(0, 1),
    ...(strategic.strategicState?.planReasons || []).slice(0, 1)
  ].filter(Boolean);
  const ucipRecommendedActions = buildUcipRecommendedActions(
    { ...context, strategicPlan },
    ucipSignals
  );
  const ucipCampaigns = strategic.recommendedCampaigns || [];
  return {
    ucipState: {
      mode,
      score: score2,
      health,
      horizon,
      stripMode
    },
    ucipReasons,
    ucipSignals,
    ucipRecommendedActions,
    ucipCampaigns,
    ucipHealth: health,
    ucipScore: score2,
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareUcipFromSignals, "buildCloudflareUcipFromSignals");
async function getCloudflareUcip(governance = {}, env = {}, options = {}) {
  const moduleIds = options.moduleIds || null;
  return runAdvisoryGuarded(
    async () => {
      const [automation, autonomous, decision, certification, crossDivision, orchestration, execution, adaptive, predictive, strategic, insights] = await Promise.all([
        getCloudflareAutomationLoops(governance),
        getCloudflareAutonomousSnapshot(governance),
        getCloudflareDecision(governance),
        getMarketplaceCloudflareCertification(governance, moduleIds),
        getCloudflareCrossDivisionSync(governance, env, moduleIds ? { moduleIds } : {}),
        getCloudflareOrchestration(governance, env, { moduleIds }),
        getCloudflareExecution(governance, env, { moduleIds }),
        getCloudflareAdaptiveRuntime(governance, env, { moduleIds }),
        getCloudflarePredictiveModeling(governance, env, { moduleIds }),
        getCloudflareStrategicPlanning(governance, env, { moduleIds }),
        getCloudflareInsights(governance)
      ]);
      return buildCloudflareUcipFromSignals({
        automation,
        autonomous,
        decision,
        certification,
        crossDivision,
        orchestration,
        execution,
        adaptive,
        predictive,
        strategic,
        insights
      });
    },
    "ucip",
    { cacheKeySuffix: metaAdvisoryCacheSuffix({ moduleIds }), timeoutMs: ADVISORY_HEAVY_TIMEOUT_MS }
  );
}
__name(getCloudflareUcip, "getCloudflareUcip");
function buildCloudflareSafetyUcipFactor(ucipSnapshot = {}) {
  const state = ucipSnapshot.ucipState || ucipSnapshot;
  return {
    health: ucipSnapshot.ucipHealth || state.health || deriveUcipHealth(state.mode),
    score: ucipSnapshot.ucipScore ?? state.score ?? null,
    mode: state.mode || "red",
    horizon: state.horizon || "short",
    stripMode: state.stripMode || "prioritize",
    actionCount: (ucipSnapshot.ucipRecommendedActions || []).length,
    campaigns: ucipSnapshot.ucipCampaigns || [],
    advisoryOnly: true,
    checkedAt: ucipSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyUcipFactor, "buildCloudflareSafetyUcipFactor");
function getModuleUcipTag(ucipMode = "yellow", moduleFields = {}) {
  const certStatus = moduleFields.cloudflareCertification?.status || "review";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  const decision = moduleFields.cloudflareDecision || "optional";
  let mode = ucipMode;
  if (certStatus === "incompatible" || moduleRisk === "high" || decision === "hold") {
    mode = "red";
  } else if (moduleRisk === "medium" && mode === "green") {
    mode = "yellow";
  }
  return `UCIP_${mode.toUpperCase()}`;
}
__name(getModuleUcipTag, "getModuleUcipTag");
function computeModuleUcipFields(ucipRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = ucipRuntime.ucipState?.mode || "yellow";
  const tag = getModuleUcipTag(mode, moduleFields);
  const risk = tag === "UCIP_RED" || moduleFields.cloudflareModuleRisk === "high" ? "high" : tag === "UCIP_ORANGE" || moduleFields.cloudflareModuleRisk === "medium" ? "medium" : "low";
  const highlight = tag === "UCIP_RED" || tag === "UCIP_ORANGE" || moduleFields.cloudflareStrategicHighlight;
  return {
    cloudflareUCIPTag: tag,
    cloudflareUCIPMode: mode,
    cloudflareUCIPRisk: risk,
    cloudflareUCIPHighlight: highlight,
    cloudflareUCIPScore: ucipRuntime.ucipScore ?? ucipRuntime.ucipState?.score ?? null,
    cloudflareUCIPModuleId: moduleId
  };
}
__name(computeModuleUcipFields, "computeModuleUcipFields");
var UCIP_TO_AMG_MODE = {
  green: "govern_green",
  yellow: "govern_yellow",
  orange: "govern_orange",
  red: "govern_red"
};
function computeAmgMode(ucipMode = "yellow") {
  return UCIP_TO_AMG_MODE[String(ucipMode || "yellow").toLowerCase()] || "govern_yellow";
}
__name(computeAmgMode, "computeAmgMode");
function deriveAmgHealth(mode) {
  if (mode === "govern_green") {
    return "healthy";
  }
  if (mode === "govern_red") {
    return "degraded";
  }
  return "advisory";
}
__name(deriveAmgHealth, "deriveAmgHealth");
function computeAmgScore(ucipSnapshot = {}, mode = "govern_yellow") {
  const ucipScore = ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? 20;
  const modePenalty = {
    govern_green: 0,
    govern_yellow: 5,
    govern_orange: 12,
    govern_red: 25
  };
  return Math.max(0, Math.min(100, Number(ucipScore) - (modePenalty[mode] ?? 8)));
}
__name(computeAmgScore, "computeAmgScore");
function buildAmgRules(mode, ucip = {}) {
  const rules = [
    {
      id: "amg-advisory-only",
      rule: "AMG guidance is advisory-only; it does not execute pipelines, deployments, or governance blocks.",
      surface: "os",
      priority: "baseline"
    }
  ];
  if (mode === "govern_green") {
    rules.push(
      { id: "amg-proceed", rule: "UCIP stable: continue normal operator workflows with optional federation review.", surface: "operator", priority: "low" },
      { id: "amg-promote", rule: "Marketplace module promotion permitted with standard certification advisories.", surface: "marketplace", priority: "low" },
      { id: "amg-mission-steady", rule: "Mission board may proceed; no elevated governance nudges required.", surface: "mission", priority: "low" }
    );
  } else if (mode === "govern_yellow") {
    rules.push(
      { id: "amg-review", rule: "Review UCIP advisories before promotion or autonomous actions.", surface: "operator", priority: "medium" },
      { id: "amg-cert-check", rule: "Verify module certification and sync alignment before marketplace highlights.", surface: "marketplace", priority: "medium" },
      { id: "amg-mission-watch", rule: "Mission board: monitor UCIP reasons and top recommended actions.", surface: "mission", priority: "medium" }
    );
  } else if (mode === "govern_orange") {
    rules.push(
      { id: "amg-hold-promote", rule: "Defer module promotion until UCIP orange signals clear.", surface: "marketplace", priority: "high" },
      { id: "amg-operator-focus", rule: "Operator: prioritize UCIP recommended actions over new deployments.", surface: "operator", priority: "high" },
      { id: "amg-mission-alert", rule: "Mission board: treat UCIP campaigns and hold advisories as active.", surface: "mission", priority: "high" }
    );
  } else {
    rules.push(
      { id: "amg-fallback", rule: "UCIP degraded: use minimal advisory payload; restore OAuth or MCP signals.", surface: "os", priority: "critical" },
      { id: "amg-no-promote", rule: "Do not promote marketplace modules until UCIP recovers from red.", surface: "marketplace", priority: "critical" },
      { id: "amg-operator-recover", rule: "Operator: focus on signal recovery before governance escalation.", surface: "operator", priority: "critical" }
    );
  }
  if ((ucip.ucipCampaigns || []).length) {
    rules.push({
      id: "amg-campaign",
      rule: `Active UCIP campaigns: ${(ucip.ucipCampaigns || []).slice(0, 2).join("; ")}`,
      surface: "mission",
      priority: mode === "govern_red" ? "critical" : "medium"
    });
  }
  return rules.slice(0, 8);
}
__name(buildAmgRules, "buildAmgRules");
function buildAmgOperatorNudges(mode, ucip = {}) {
  const nudges = (ucip.ucipRecommendedActions || []).slice(0, 4).map((action) => ({
    surface: "operator",
    nudge: action,
    priority: mode === "govern_red" ? "critical" : "medium"
  }));
  if (mode === "govern_green") {
    nudges.push({ surface: "operator", nudge: "Federation steady-state: optional OAuth hardening when convenient.", priority: "low" });
  } else if (mode === "govern_red") {
    nudges.push({ surface: "operator", nudge: "Restore Cloudflare MCP OAuth or upstream signals before acting on governance hints.", priority: "critical" });
  } else if (mode === "govern_orange") {
    nudges.push({ surface: "operator", nudge: "Review UCIP hold/alert posture before pipeline promotion.", priority: "high" });
  } else {
    nudges.push({ surface: "operator", nudge: "Scan UCIP reasons on the mission board before operator execution.", priority: "medium" });
  }
  return nudges.slice(0, 6);
}
__name(buildAmgOperatorNudges, "buildAmgOperatorNudges");
function buildAmgPolicyHints(mode, ucip = {}) {
  const hints = [
    {
      surface: "mission",
      hint: mode === "govern_green" ? "Maintain UCIP steady-state; AMG requires no elevated mission posture." : `AMG ${mode}: align mission strip with UCIP and review top rules.`
    },
    {
      surface: "marketplace",
      hint: mode === "govern_green" ? "Module badges may show AMG_OK when UCIP and module risk are low." : mode === "govern_red" ? "Marketplace: defer promotion; expect AMG_CAUTION on modules." : "Marketplace: review AMG tags alongside UCIP badges before promotion."
    },
    {
      surface: "operator",
      hint: mode === "govern_orange" || mode === "govern_red" ? "Operator console: prioritize AMG nudges over per-layer federation panels." : "Operator console: AMG consolidates UCIP into governance rules and nudges."
    }
  ];
  (ucip.ucipCampaigns || []).slice(0, 2).forEach((campaign) => {
    hints.push({ surface: "marketplace", hint: `Campaign advisory: ${campaign}` });
  });
  if ((ucip.ucipReasons || []).length) {
    hints.push({ surface: "os", hint: `UCIP context: ${(ucip.ucipReasons || []).slice(0, 1).join("")}` });
  }
  return hints.slice(0, 8);
}
__name(buildAmgPolicyHints, "buildAmgPolicyHints");
function buildCloudflareAmgFromUcip(ucipSnapshot = {}) {
  const ucipState = ucipSnapshot.ucipState || {};
  const ucipMode = ucipState.mode || "red";
  const signalsMissing = ucipMode === "red" && (ucipSnapshot.ucipHealth === "degraded" || !ucipSnapshot.ucipSignals || !Object.keys(ucipSnapshot.ucipSignals || {}).length);
  const mode = signalsMissing ? "govern_red" : computeAmgMode(ucipMode);
  const score2 = computeAmgScore(ucipSnapshot, mode);
  const health = deriveAmgHealth(mode);
  const amgRules = buildAmgRules(mode, ucipSnapshot);
  const amgOperatorNudges = buildAmgOperatorNudges(mode, ucipSnapshot);
  const amgPolicyHints = buildAmgPolicyHints(mode, ucipSnapshot);
  const amgReasons = [
    `AMG mode: ${mode} (derived from UCIP ${ucipMode}).`,
    ...(ucipSnapshot.ucipReasons || []).slice(0, 3),
    signalsMissing ? "UCIP degraded; AMG using minimal governance fallback." : null
  ].filter(Boolean);
  return {
    amgState: { mode, score: score2, health },
    amgRules,
    amgOperatorNudges,
    amgPolicyHints,
    amgReasons,
    amgHealth: health,
    amgScore: score2,
    ucipUpstream: {
      mode: ucipMode,
      score: ucipSnapshot.ucipScore ?? ucipState.score ?? null,
      health: ucipSnapshot.ucipHealth || ucipState.health || "optional"
    },
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareAmgFromUcip, "buildCloudflareAmgFromUcip");
async function getCloudflareAmg(governance = {}, env = {}, options = {}) {
  return runAdvisoryGuarded(
    async () => {
      const ucip = options.ucip || await getCloudflareUcip(governance, env, options);
      return buildCloudflareAmgFromUcip(ucip);
    },
    "amg",
    { cacheKeySuffix: metaAdvisoryCacheSuffix(options) }
  );
}
__name(getCloudflareAmg, "getCloudflareAmg");
function buildCloudflareSafetyAmgFactor(amgSnapshot = {}) {
  const state = amgSnapshot.amgState || amgSnapshot;
  return {
    health: amgSnapshot.amgHealth || state.health || deriveAmgHealth(state.mode),
    score: amgSnapshot.amgScore ?? state.score ?? null,
    mode: state.mode || "govern_red",
    reasons: amgSnapshot.amgReasons || [],
    ruleCount: (amgSnapshot.amgRules || []).length,
    nudgeCount: (amgSnapshot.amgOperatorNudges || []).length,
    advisoryOnly: true,
    checkedAt: amgSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyAmgFactor, "buildCloudflareSafetyAmgFactor");
function getModuleAmgTag(amgMode = "govern_yellow", moduleFields = {}) {
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  const ucipTag = moduleFields.cloudflareUCIPTag || "";
  if (amgMode === "govern_red" || amgMode === "govern_orange" || moduleRisk === "high" || ucipTag === "UCIP_RED") {
    return "AMG_CAUTION";
  }
  if (amgMode === "govern_yellow" || moduleRisk === "medium" || ucipTag === "UCIP_ORANGE" || ucipTag === "UCIP_YELLOW") {
    return "AMG_REVIEW";
  }
  return "AMG_OK";
}
__name(getModuleAmgTag, "getModuleAmgTag");
function computeModuleAmgFields(amgRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = amgRuntime.amgState?.mode || "govern_yellow";
  const tag = getModuleAmgTag(mode, moduleFields);
  const risk = tag === "AMG_CAUTION" || moduleFields.cloudflareModuleRisk === "high" ? "high" : tag === "AMG_REVIEW" || moduleFields.cloudflareModuleRisk === "medium" ? "medium" : "low";
  const highlight = tag === "AMG_CAUTION" || tag === "AMG_REVIEW" && moduleFields.cloudflareUCIPHighlight;
  return {
    cloudflareAMGTag: tag,
    cloudflareAMGMode: mode,
    cloudflareAMGRisk: risk,
    cloudflareAMGHighlight: highlight,
    cloudflareAMGScore: amgRuntime.amgScore ?? amgRuntime.amgState?.score ?? null,
    cloudflareAMGModuleId: moduleId
  };
}
__name(computeModuleAmgFields, "computeModuleAmgFields");
function deriveCbaBehaviorContext(ucipSnapshot = {}, amgSnapshot = {}, context = {}) {
  const signals = ucipSnapshot.ucipSignals || {};
  const heartbeat = context.heartbeat || {};
  const moduleStats = context.moduleStats || {};
  const operatorPosture = {
    governanceHealth: heartbeat.governanceHealth || "optional",
    pipelineHealth: heartbeat.pipelineEngineHealth || "idle",
    safetyHealth: heartbeat.safetyHealth || "optional",
    decision: signals.decision?.decision || heartbeat.cloudflareDecision || "optional"
  };
  const osIndicators = {
    automationLoops: signals.automation?.activeCount ?? 0,
    syncStatus: signals.sync?.syncStatus || heartbeat.cloudflareCrossDivisionSyncStatus || "partial",
    orchestrationHealth: signals.orchestration?.health || heartbeat.cloudflareOrchestrationHealth || "optional",
    executionHealth: signals.execution?.health || heartbeat.cloudflareExecutionHealth || "optional",
    autonomousTriggers: signals.autonomous?.triggerCount ?? 0
  };
  const marketplaceIndicators = {
    highRiskModules: moduleStats.highRiskCount ?? 0,
    driftModules: moduleStats.driftCount ?? 0,
    totalModules: moduleStats.totalModules ?? 0
  };
  return { operatorPosture, osIndicators, marketplaceIndicators, heartbeat, moduleStats };
}
__name(deriveCbaBehaviorContext, "deriveCbaBehaviorContext");
function computeBehaviorDriftScore(behaviorContext = {}, ucipSnapshot = {}, amgSnapshot = {}) {
  let drift = 0;
  const { operatorPosture, osIndicators, marketplaceIndicators } = behaviorContext;
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  if (osIndicators.syncStatus === "divergent") {
    drift += 2;
  } else if (osIndicators.syncStatus === "partial") {
    drift += 1;
  }
  if (osIndicators.automationLoops >= 2) {
    drift += 1;
  }
  if (osIndicators.autonomousTriggers >= 2) {
    drift += 1;
  }
  if (operatorPosture.decision === "hold" && amgMode === "govern_green") {
    drift += 2;
  }
  if (operatorPosture.decision === "caution" && ucipMode === "green") {
    drift += 1;
  }
  if (osIndicators.orchestrationHealth === "deferred" || osIndicators.executionHealth === "deferred") {
    drift += 1;
  }
  if (marketplaceIndicators.highRiskModules >= 2) {
    drift += 1;
  }
  if (marketplaceIndicators.driftModules >= 3) {
    drift += 1;
  }
  if (amgMode === "govern_red" || ucipMode === "red") {
    drift += 3;
  } else if (amgMode === "govern_orange" || ucipMode === "orange") {
    drift += 2;
  }
  return drift;
}
__name(computeBehaviorDriftScore, "computeBehaviorDriftScore");
function computeCbaMode(amgSnapshot = {}, ucipSnapshot = {}, behaviorContext = {}) {
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const signalsMissing = amgMode === "govern_red" && (amgSnapshot.amgHealth === "degraded" || ucipSnapshot.ucipHealth === "degraded" || !ucipSnapshot.ucipSignals || !Object.keys(ucipSnapshot.ucipSignals || {}).length);
  if (signalsMissing) {
    return "behavior_red";
  }
  const drift = computeBehaviorDriftScore(behaviorContext, ucipSnapshot, amgSnapshot);
  if (amgMode === "govern_red" || ucipMode === "red" || drift >= 5) {
    return "behavior_red";
  }
  if (amgMode === "govern_orange" || ucipMode === "orange" || drift >= 3) {
    return "behavior_orange";
  }
  if (amgMode === "govern_yellow" || ucipMode === "yellow" || drift >= 1) {
    return "behavior_yellow";
  }
  return "behavior_green";
}
__name(computeCbaMode, "computeCbaMode");
function deriveCbaHealth(mode) {
  if (mode === "behavior_green") {
    return "healthy";
  }
  if (mode === "behavior_red") {
    return "degraded";
  }
  return "advisory";
}
__name(deriveCbaHealth, "deriveCbaHealth");
function computeCbaScore(amgSnapshot = {}, ucipSnapshot = {}, mode = "behavior_yellow", drift = 0) {
  const amgScore = amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? 20;
  const ucipScore = ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? 20;
  const base = Math.round((Number(amgScore) + Number(ucipScore)) / 2);
  const modePenalty = {
    behavior_green: 0,
    behavior_yellow: 6,
    behavior_orange: 14,
    behavior_red: 28
  };
  return Math.max(0, Math.min(100, base - (modePenalty[mode] ?? 8) - drift * 2));
}
__name(computeCbaScore, "computeCbaScore");
function buildCbaBehaviorPatterns(mode, behaviorContext = {}, ucipSnapshot = {}, amgSnapshot = {}) {
  const patterns = [];
  const { operatorPosture, osIndicators, marketplaceIndicators } = behaviorContext;
  patterns.push({
    id: "cba-advisory-only",
    pattern: "CBA observes behavior patterns only; it does not execute operator or system actions.",
    surface: "os"
  });
  if (operatorPosture.pipelineHealth === "online" && operatorPosture.governanceHealth === "online") {
    patterns.push({ id: "cba-operator-steady", pattern: "Operator surfaces show steady governance and pipeline posture.", surface: "operator" });
  }
  if (osIndicators.automationLoops > 0) {
    patterns.push({ id: "cba-automation-active", pattern: `${osIndicators.automationLoops} active automation loop(s) detected in federation signals.`, surface: "os" });
  }
  if (osIndicators.syncStatus === "aligned") {
    patterns.push({ id: "cba-sync-aligned", pattern: "Cross-division sync appears aligned with marketplace-backend.", surface: "marketplace" });
  }
  if (marketplaceIndicators.highRiskModules > 0) {
    patterns.push({ id: "cba-module-risk", pattern: `${marketplaceIndicators.highRiskModules} module(s) flagged with elevated risk in catalog.`, surface: "marketplace" });
  }
  if (amgSnapshot.amgRules?.length) {
    patterns.push({ id: "cba-amg-rules", pattern: `AMG active with ${amgSnapshot.amgRules.length} governance rule(s).`, surface: "operator" });
  }
  if (mode === "behavior_green") {
    patterns.push({ id: "cba-aligned", pattern: "Operator, OS, and marketplace behavior align with UCIP + AMG posture.", surface: "mission" });
  }
  return patterns.slice(0, 8);
}
__name(buildCbaBehaviorPatterns, "buildCbaBehaviorPatterns");
function buildCbaBehaviorDriftWarnings(mode, behaviorContext = {}, ucipSnapshot = {}, amgSnapshot = {}) {
  const warnings = [];
  const { operatorPosture, osIndicators, marketplaceIndicators } = behaviorContext;
  if (osIndicators.syncStatus === "divergent" || osIndicators.syncStatus === "partial") {
    warnings.push(`Sync drift detected (${osIndicators.syncStatus}); reconcile cross-division alignment.`);
  }
  if (operatorPosture.decision === "hold" && amgSnapshot.amgState?.mode === "govern_green") {
    warnings.push("Decision posture HOLD conflicts with AMG govern_green \u2014 review operator behavior.");
  }
  if (osIndicators.automationLoops >= 2) {
    warnings.push("Multiple automation loops active while behavioral posture may not reflect loop load.");
  }
  if (marketplaceIndicators.driftModules >= 2) {
    warnings.push(`${marketplaceIndicators.driftModules} marketplace module(s) show behavioral drift indicators.`);
  }
  if (ucipSnapshot.ucipState?.mode === "orange" && amgSnapshot.amgState?.mode === "govern_green") {
    warnings.push("UCIP orange conflicts with AMG govern_green \u2014 governance/behavior mismatch.");
  }
  if (mode === "behavior_red") {
    warnings.push("Severe behavioral drift or degraded upstream AMG/UCIP signals.");
  }
  if (!warnings.length) {
    warnings.push("No significant behavioral drift warnings at this time.");
  }
  return warnings.slice(0, 6);
}
__name(buildCbaBehaviorDriftWarnings, "buildCbaBehaviorDriftWarnings");
function buildCbaOperatorBehaviorHints(mode, behaviorContext = {}, amgSnapshot = {}) {
  const hints = (amgSnapshot.amgOperatorNudges || []).slice(0, 3).map(
    (entry) => typeof entry === "string" ? entry : entry.nudge || ""
  );
  if (mode === "behavior_green") {
    hints.push("Maintain current operator cadence; behavioral signals align with AMG guidance.");
  } else if (mode === "behavior_red") {
    hints.push("Pause promotion workflows; restore UCIP/AMG signals before changing operator behavior.");
  } else if (mode === "behavior_orange") {
    hints.push("Reduce concurrent operator actions; prioritize drift warnings on mission board.");
  } else {
    hints.push("Review mission UCIP/AMG strips before executing new operator intents.");
  }
  return [...new Set(hints.filter(Boolean))].slice(0, 6);
}
__name(buildCbaOperatorBehaviorHints, "buildCbaOperatorBehaviorHints");
function buildCbaSystemBehaviorHints(mode, behaviorContext = {}, ucipSnapshot = {}, amgSnapshot = {}) {
  const hints = (amgSnapshot.amgPolicyHints || []).slice(0, 2).map(
    (entry) => typeof entry === "string" ? entry : `[${entry.surface || "os"}] ${entry.hint || ""}`
  );
  const { osIndicators } = behaviorContext;
  if (osIndicators.syncStatus !== "aligned") {
    hints.push(`OS sync posture: ${osIndicators.syncStatus} \u2014 monitor execution and orchestration loops.`);
  }
  if ((ucipSnapshot.ucipRecommendedActions || []).length) {
    hints.push(`UCIP suggests: ${(ucipSnapshot.ucipRecommendedActions || [])[0]}`);
  }
  if (mode === "behavior_red") {
    hints.push("System behavior fallback: use minimal advisory payload until AMG/UCIP recover.");
  }
  return [...new Set(hints.filter(Boolean))].slice(0, 6);
}
__name(buildCbaSystemBehaviorHints, "buildCbaSystemBehaviorHints");
function buildCloudflareCbaFromAmg(amgSnapshot = {}, ucipSnapshot = {}, behaviorContext = {}) {
  const context = deriveCbaBehaviorContext(ucipSnapshot, amgSnapshot, behaviorContext);
  const drift = computeBehaviorDriftScore(context, ucipSnapshot, amgSnapshot);
  const mode = computeCbaMode(amgSnapshot, ucipSnapshot, context);
  const score2 = computeCbaScore(amgSnapshot, ucipSnapshot, mode, drift);
  const health = deriveCbaHealth(mode);
  const cbaBehaviorPatterns = buildCbaBehaviorPatterns(mode, context, ucipSnapshot, amgSnapshot);
  const cbaBehaviorDriftWarnings = buildCbaBehaviorDriftWarnings(mode, context, ucipSnapshot, amgSnapshot);
  const cbaOperatorBehaviorHints = buildCbaOperatorBehaviorHints(mode, context, amgSnapshot);
  const cbaSystemBehaviorHints = buildCbaSystemBehaviorHints(mode, context, ucipSnapshot, amgSnapshot);
  const cbaReasons = [
    `CBA mode: ${mode} (derived from AMG ${amgSnapshot.amgState?.mode || "govern_yellow"} + UCIP ${ucipSnapshot.ucipState?.mode || "yellow"}).`,
    `Behavioral drift score: ${drift}.`,
    ...(amgSnapshot.amgReasons || []).slice(0, 2),
    mode === "behavior_red" && drift >= 5 ? "Severe behavioral drift or degraded upstream signals." : null
  ].filter(Boolean);
  return {
    cbaState: { mode, score: score2, health },
    cbaBehaviorPatterns,
    cbaBehaviorDriftWarnings,
    cbaOperatorBehaviorHints,
    cbaSystemBehaviorHints,
    cbaReasons,
    cbaHealth: health,
    cbaScore: score2,
    behaviorDriftScore: drift,
    amgUpstream: {
      mode: amgSnapshot.amgState?.mode,
      score: amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? null
    },
    ucipUpstream: {
      mode: ucipSnapshot.ucipState?.mode,
      score: ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? null
    },
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareCbaFromAmg, "buildCloudflareCbaFromAmg");
async function buildCbaBehaviorContextFromEnv(governance = {}, env = {}, options = {}) {
  const moduleIds = options.moduleIds || [];
  let heartbeat = options.heartbeat || null;
  if (!heartbeat && env.HEARTBEAT) {
    try {
      heartbeat = await env.HEARTBEAT.get("division-heartbeat", "json");
    } catch {
      heartbeat = {};
    }
  }
  let moduleStats = { highRiskCount: 0, driftCount: 0, totalModules: moduleIds.length };
  if (moduleIds.length) {
    try {
      const certification = await getMarketplaceCloudflareCertification(governance, moduleIds);
      const crossDivision = await getCloudflareCrossDivisionSync(governance, env, { moduleIds });
      moduleStats = moduleIds.reduce(
        (acc, id) => {
          const cert = certification.certifications?.[id];
          const risk = cert?.status === "incompatible" ? "high" : cert?.status === "review" ? "medium" : "low";
          if (risk === "high") {
            acc.highRiskCount += 1;
          }
          if (crossDivision.syncStatus === "partial" || crossDivision.syncStatus === "divergent") {
            acc.driftCount += 1;
          }
          return acc;
        },
        { highRiskCount: 0, driftCount: 0, totalModules: moduleIds.length }
      );
    } catch {
      moduleStats = { highRiskCount: 0, driftCount: 0, totalModules: moduleIds.length };
    }
  }
  return { heartbeat: heartbeat || {}, moduleStats };
}
__name(buildCbaBehaviorContextFromEnv, "buildCbaBehaviorContextFromEnv");
async function getCloudflareCba(governance = {}, env = {}, options = {}) {
  return runAdvisoryGuarded(
    async () => {
      const ucip = options.ucip || await getCloudflareUcip(governance, env, options);
      const amg = options.amg || buildCloudflareAmgFromUcip(ucip);
      const behavioralContext = options.behavioralContext || await buildCbaBehaviorContextFromEnv(governance, env, options);
      return buildCloudflareCbaFromAmg(amg, ucip, behavioralContext);
    },
    "cba",
    { cacheKeySuffix: metaAdvisoryCacheSuffix(options) }
  );
}
__name(getCloudflareCba, "getCloudflareCba");
function buildCloudflareSafetyCbaFactor(cbaSnapshot = {}) {
  const state = cbaSnapshot.cbaState || cbaSnapshot;
  return {
    health: cbaSnapshot.cbaHealth || state.health || deriveCbaHealth(state.mode),
    score: cbaSnapshot.cbaScore ?? state.score ?? null,
    mode: state.mode || "behavior_red",
    reasons: cbaSnapshot.cbaReasons || [],
    driftWarningCount: (cbaSnapshot.cbaBehaviorDriftWarnings || []).length,
    patternCount: (cbaSnapshot.cbaBehaviorPatterns || []).length,
    advisoryOnly: true,
    checkedAt: cbaSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyCbaFactor, "buildCloudflareSafetyCbaFactor");
function getModuleCbaTag(cbaMode = "behavior_yellow", moduleFields = {}) {
  const amgTag = moduleFields.cloudflareAMGTag || "";
  const ucipTag = moduleFields.cloudflareUCIPTag || "";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  if (cbaMode === "behavior_red" || cbaMode === "behavior_orange" || moduleRisk === "high" || amgTag === "AMG_CAUTION" || ucipTag === "UCIP_RED") {
    return "CBA_RISK";
  }
  if (cbaMode === "behavior_yellow" || moduleRisk === "medium" || amgTag === "AMG_REVIEW" || ucipTag === "UCIP_ORANGE" || ucipTag === "UCIP_YELLOW") {
    return "CBA_DRIFT";
  }
  return "CBA_STABLE";
}
__name(getModuleCbaTag, "getModuleCbaTag");
function computeModuleCbaFields(cbaRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = cbaRuntime.cbaState?.mode || "behavior_yellow";
  const tag = getModuleCbaTag(mode, moduleFields);
  const risk = tag === "CBA_RISK" || moduleFields.cloudflareModuleRisk === "high" ? "high" : tag === "CBA_DRIFT" || moduleFields.cloudflareModuleRisk === "medium" ? "medium" : "low";
  const highlight = tag === "CBA_RISK" || tag === "CBA_DRIFT" && moduleFields.cloudflareAMGHighlight;
  return {
    cloudflareCBATag: tag,
    cloudflareCBAMode: mode,
    cloudflareCBARisk: risk,
    cloudflareCBAHighlight: highlight,
    cloudflareCBAScore: cbaRuntime.cbaScore ?? cbaRuntime.cbaState?.score ?? null,
    cloudflareCBAModuleId: moduleId
  };
}
__name(computeModuleCbaFields, "computeModuleCbaFields");
function deriveCalAlignmentContext(cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, context = {}) {
  const behaviorContext = deriveCbaBehaviorContext(ucipSnapshot, amgSnapshot, context);
  const heartbeat = context.heartbeat || {};
  const missionTrajectory = {
    ucipMode: ucipSnapshot.ucipState?.mode || heartbeat.cloudflareUCIPMode || "yellow",
    amgMode: amgSnapshot.amgState?.mode || heartbeat.cloudflareAMGMode || "govern_yellow",
    cbaMode: cbaSnapshot.cbaState?.mode || heartbeat.cloudflareCBAMode || "behavior_yellow",
    strategicStrip: heartbeat.cloudflareStrategicStripMode || "watch",
    decision: behaviorContext.operatorPosture.decision
  };
  const operatorIntent = {
    governanceHealth: heartbeat.governanceHealth || "optional",
    pipelineHealth: heartbeat.pipelineEngineHealth || "idle",
    safetyHealth: heartbeat.safetyHealth || "optional",
    intentCount: context.intentCount ?? 0
  };
  const marketplacePosture = {
    ...behaviorContext.marketplaceIndicators,
    cbaDriftWarnings: (cbaSnapshot.cbaBehaviorDriftWarnings || []).length,
    cbaPatterns: (cbaSnapshot.cbaBehaviorPatterns || []).length
  };
  const osCognitivePosture = {
    ...behaviorContext.osIndicators,
    behaviorDriftScore: cbaSnapshot.behaviorDriftScore ?? 0,
    amgRuleCount: (amgSnapshot.amgRules || []).length,
    ucipSignalLayers: Object.keys(ucipSnapshot.ucipSignals || {}).length
  };
  return {
    ...behaviorContext,
    missionTrajectory,
    operatorIntent,
    marketplacePosture,
    osCognitivePosture,
    heartbeat
  };
}
__name(deriveCalAlignmentContext, "deriveCalAlignmentContext");
function computeCognitiveMisalignmentScore(alignmentContext = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  let misalignment = 0;
  const { missionTrajectory, operatorPosture, marketplacePosture, osCognitivePosture } = alignmentContext;
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  if (cbaMode === "behavior_green" && amgMode === "govern_orange") {
    misalignment += 2;
  }
  if (cbaMode === "behavior_yellow" && amgMode === "govern_green" && ucipMode === "green") {
    misalignment += 1;
  }
  if (cbaMode === "behavior_orange" && (amgMode === "govern_green" || ucipMode === "green")) {
    misalignment += 2;
  }
  if (missionTrajectory.ucipMode === "orange" && missionTrajectory.amgMode === "govern_green") {
    misalignment += 2;
  }
  if (missionTrajectory.cbaMode === "behavior_red" && missionTrajectory.amgMode !== "govern_red") {
    misalignment += 2;
  }
  if (operatorPosture.decision === "hold" && cbaMode === "behavior_green") {
    misalignment += 2;
  }
  if (operatorPosture.decision === "proceed" && (cbaMode === "behavior_orange" || cbaMode === "behavior_red")) {
    misalignment += 1;
  }
  if (marketplacePosture.cbaDriftWarnings >= 2) {
    misalignment += 1;
  }
  if (marketplacePosture.highRiskModules >= 2 && cbaMode === "behavior_green") {
    misalignment += 1;
  }
  if (osCognitivePosture.syncStatus === "divergent") {
    misalignment += 2;
  } else if (osCognitivePosture.syncStatus === "partial") {
    misalignment += 1;
  }
  if (osCognitivePosture.behaviorDriftScore >= 3) {
    misalignment += 1;
  }
  if (cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red") {
    misalignment += 3;
  } else if (cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange") {
    misalignment += 2;
  }
  if (cbaSnapshot.cbaHealth === "degraded" || amgSnapshot.amgHealth === "degraded" || ucipSnapshot.ucipHealth === "degraded") {
    misalignment += 2;
  }
  return misalignment;
}
__name(computeCognitiveMisalignmentScore, "computeCognitiveMisalignmentScore");
function computeCalMode(cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, alignmentContext = {}) {
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const signalsMissing = cbaMode === "behavior_red" && cbaSnapshot.cbaHealth === "degraded" || amgMode === "govern_red" && amgSnapshot.amgHealth === "degraded" || ucipMode === "red" && ucipSnapshot.ucipHealth === "degraded" || !ucipSnapshot.ucipSignals || !Object.keys(ucipSnapshot.ucipSignals || {}).length;
  if (signalsMissing) {
    return "align_red";
  }
  const misalignment = computeCognitiveMisalignmentScore(alignmentContext, cbaSnapshot, amgSnapshot, ucipSnapshot);
  if (cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red" || misalignment >= 6) {
    return "align_red";
  }
  if (cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange" || misalignment >= 4) {
    return "align_orange";
  }
  if (cbaMode === "behavior_yellow" || amgMode === "govern_yellow" || ucipMode === "yellow" || misalignment >= 2) {
    return "align_yellow";
  }
  return "align_green";
}
__name(computeCalMode, "computeCalMode");
function deriveCalHealth(mode) {
  if (mode === "align_green") {
    return "healthy";
  }
  if (mode === "align_red") {
    return "degraded";
  }
  return "advisory";
}
__name(deriveCalHealth, "deriveCalHealth");
function computeCalScore(cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, mode = "align_yellow", misalignment = 0) {
  const cbaScore = cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? 20;
  const amgScore = amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? 20;
  const ucipScore = ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? 20;
  const base = Math.round((Number(cbaScore) + Number(amgScore) + Number(ucipScore)) / 3);
  const modePenalty = {
    align_green: 0,
    align_yellow: 5,
    align_orange: 12,
    align_red: 25
  };
  return Math.max(0, Math.min(100, base - (modePenalty[mode] ?? 8) - misalignment * 2));
}
__name(computeCalScore, "computeCalScore");
function buildCalAlignmentFindings(mode, alignmentContext = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  const findings = [];
  const { missionTrajectory, operatorIntent, marketplacePosture, osCognitivePosture } = alignmentContext;
  findings.push({
    id: "cal-advisory-only",
    finding: "CAL evaluates cognitive alignment only; it does not execute operator or system actions.",
    surface: "os",
    aligned: true
  });
  if (missionTrajectory.ucipMode === missionTrajectory.amgMode?.replace("govern_", "") || mode === "align_green") {
    findings.push({
      id: "cal-mission-ucip-amg",
      finding: "Mission trajectory UCIP and AMG strips show coherent governance posture.",
      surface: "mission",
      aligned: true
    });
  } else {
    findings.push({
      id: "cal-mission-mismatch",
      finding: `Mission trajectory mismatch: UCIP ${missionTrajectory.ucipMode} vs AMG ${missionTrajectory.amgMode}.`,
      surface: "mission",
      aligned: false
    });
  }
  if (cbaSnapshot.cbaState?.mode === "behavior_green" && mode === "align_green") {
    findings.push({
      id: "cal-cba-aligned",
      finding: "CBA behavioral patterns align with cognitive alignment posture.",
      surface: "operator",
      aligned: true
    });
  }
  if (operatorIntent.governanceHealth === "online" && operatorIntent.pipelineHealth === "online") {
    findings.push({
      id: "cal-operator-steady",
      finding: "Operator intent surfaces show steady governance and pipeline posture.",
      surface: "operator",
      aligned: true
    });
  }
  if (osCognitivePosture.syncStatus === "aligned") {
    findings.push({
      id: "cal-os-sync",
      finding: "OS cognitive posture: cross-division sync aligned with federation signals.",
      surface: "os",
      aligned: true
    });
  }
  if (marketplacePosture.highRiskModules > 0) {
    findings.push({
      id: "cal-marketplace-risk",
      finding: `${marketplacePosture.highRiskModules} module(s) elevate marketplace cognitive risk.`,
      surface: "marketplace",
      aligned: marketplacePosture.highRiskModules < 2
    });
  }
  if ((amgSnapshot.amgRules || []).length) {
    findings.push({
      id: "cal-amg-rules",
      finding: `AMG active with ${amgSnapshot.amgRules.length} governance rule(s) informing alignment.`,
      surface: "operator",
      aligned: amgSnapshot.amgState?.mode !== "govern_red"
    });
  }
  if (mode === "align_red") {
    findings.push({
      id: "cal-severe-misalignment",
      finding: "Severe cognitive misalignment or degraded CBA/AMG/UCIP upstream signals.",
      surface: "os",
      aligned: false
    });
  }
  return findings.slice(0, 8);
}
__name(buildCalAlignmentFindings, "buildCalAlignmentFindings");
function buildCalAlignmentWarnings(mode, alignmentContext = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  const warnings = [];
  const { missionTrajectory, operatorPosture, marketplacePosture, osCognitivePosture } = alignmentContext;
  const driftWarnings = cbaSnapshot.cbaBehaviorDriftWarnings || [];
  if (driftWarnings.length) {
    warnings.push(...driftWarnings.slice(0, 2).map((entry) => `CBA drift: ${entry}`));
  }
  if (missionTrajectory.ucipMode === "orange" && missionTrajectory.cbaMode === "behavior_green") {
    warnings.push("UCIP orange conflicts with CBA behavior_green \u2014 cognitive/governance mismatch.");
  }
  if (missionTrajectory.amgMode === "govern_green" && cbaSnapshot.cbaState?.mode === "behavior_orange") {
    warnings.push("AMG govern_green conflicts with CBA behavior_orange \u2014 review operator alignment.");
  }
  if (operatorPosture.decision === "hold" && mode === "align_green") {
    warnings.push("Decision posture HOLD conflicts with CAL align_green \u2014 operator intent may diverge.");
  }
  if (osCognitivePosture.syncStatus === "divergent" || osCognitivePosture.syncStatus === "partial") {
    warnings.push(`OS sync drift (${osCognitivePosture.syncStatus}) may indicate cognitive misalignment.`);
  }
  if (marketplacePosture.cbaDriftWarnings >= 2) {
    warnings.push("Multiple CBA behavioral drift warnings affect marketplace cognitive posture.");
  }
  if (mode === "align_red") {
    warnings.push("Severe cognitive misalignment or degraded CBA/AMG/UCIP signals.");
  }
  if (!warnings.length) {
    warnings.push("No significant cognitive misalignment warnings at this time.");
  }
  return warnings.slice(0, 6);
}
__name(buildCalAlignmentWarnings, "buildCalAlignmentWarnings");
function buildCalOperatorAlignmentHints(mode, alignmentContext = {}, cbaSnapshot = {}, amgSnapshot = {}) {
  const hints = (cbaSnapshot.cbaOperatorBehaviorHints || []).slice(0, 2);
  const nudges = (amgSnapshot.amgOperatorNudges || []).slice(0, 2).map(
    (entry) => typeof entry === "string" ? entry : entry.nudge || ""
  );
  if (mode === "align_green") {
    hints.push("Maintain current operator cadence; cognitive alignment matches UCIP + AMG + CBA.");
  } else if (mode === "align_red") {
    hints.push("Pause promotion workflows; restore CBA/AMG/UCIP signals before changing operator posture.");
  } else if (mode === "align_orange") {
    hints.push("Reduce concurrent operator actions; prioritize alignment warnings on mission board.");
  } else {
    hints.push("Review mission UCIP/AMG/CBA strips before executing new operator intents.");
  }
  return [...new Set([...hints, ...nudges].filter(Boolean))].slice(0, 6);
}
__name(buildCalOperatorAlignmentHints, "buildCalOperatorAlignmentHints");
function buildCalSystemAlignmentHints(mode, alignmentContext = {}, ucipSnapshot = {}, amgSnapshot = {}, cbaSnapshot = {}) {
  const hints = (cbaSnapshot.cbaSystemBehaviorHints || []).slice(0, 2);
  const policyHints = (amgSnapshot.amgPolicyHints || []).slice(0, 2).map(
    (entry) => typeof entry === "string" ? entry : `[${entry.surface || "os"}] ${entry.hint || ""}`
  );
  const { osCognitivePosture } = alignmentContext;
  if (osCognitivePosture.syncStatus !== "aligned") {
    hints.push(`OS sync posture: ${osCognitivePosture.syncStatus} \u2014 reconcile cognitive alignment across divisions.`);
  }
  if ((ucipSnapshot.ucipRecommendedActions || []).length) {
    hints.push(`UCIP suggests: ${(ucipSnapshot.ucipRecommendedActions || [])[0]}`);
  }
  if (mode === "align_red") {
    hints.push("System alignment fallback: use minimal advisory payload until CBA/AMG/UCIP recover.");
  }
  return [...new Set([...hints, ...policyHints].filter(Boolean))].slice(0, 6);
}
__name(buildCalSystemAlignmentHints, "buildCalSystemAlignmentHints");
function buildCloudflareCalFromCba(cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, alignmentContext = {}) {
  const context = deriveCalAlignmentContext(cbaSnapshot, amgSnapshot, ucipSnapshot, alignmentContext);
  const misalignment = computeCognitiveMisalignmentScore(context, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const mode = computeCalMode(cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const score2 = computeCalScore(cbaSnapshot, amgSnapshot, ucipSnapshot, mode, misalignment);
  const health = deriveCalHealth(mode);
  const calAlignmentFindings = buildCalAlignmentFindings(mode, context, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const calAlignmentWarnings = buildCalAlignmentWarnings(mode, context, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const calOperatorAlignmentHints = buildCalOperatorAlignmentHints(mode, context, cbaSnapshot, amgSnapshot);
  const calSystemAlignmentHints = buildCalSystemAlignmentHints(mode, context, ucipSnapshot, amgSnapshot, cbaSnapshot);
  const calReasons = [
    `CAL mode: ${mode} (derived from CBA ${cbaSnapshot.cbaState?.mode || "behavior_yellow"} + AMG ${amgSnapshot.amgState?.mode || "govern_yellow"} + UCIP ${ucipSnapshot.ucipState?.mode || "yellow"}).`,
    `Cognitive misalignment score: ${misalignment}.`,
    ...(cbaSnapshot.cbaReasons || []).slice(0, 1),
    ...(amgSnapshot.amgReasons || []).slice(0, 1),
    mode === "align_red" && misalignment >= 6 ? "Severe cognitive misalignment or degraded upstream signals." : null
  ].filter(Boolean);
  return {
    calState: { mode, score: score2, health },
    calAlignmentFindings,
    calAlignmentWarnings,
    calOperatorAlignmentHints,
    calSystemAlignmentHints,
    calReasons,
    calHealth: health,
    calScore: score2,
    cognitiveMisalignmentScore: misalignment,
    cbaUpstream: {
      mode: cbaSnapshot.cbaState?.mode,
      score: cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? null
    },
    amgUpstream: {
      mode: amgSnapshot.amgState?.mode,
      score: amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? null
    },
    ucipUpstream: {
      mode: ucipSnapshot.ucipState?.mode,
      score: ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? null
    },
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareCalFromCba, "buildCloudflareCalFromCba");
async function buildCalAlignmentContextFromEnv(governance = {}, env = {}, options = {}) {
  const behavioralContext = await buildCbaBehaviorContextFromEnv(governance, env, options);
  let intentCount = 0;
  if (env.OPERATOR_INTENTS) {
    try {
      const intents = await env.OPERATOR_INTENTS.list({ limit: 20 });
      intentCount = intents.keys?.length ?? 0;
    } catch {
      intentCount = 0;
    }
  }
  return { ...behavioralContext, intentCount };
}
__name(buildCalAlignmentContextFromEnv, "buildCalAlignmentContextFromEnv");
async function getCloudflareCal(governance = {}, env = {}, options = {}) {
  return runAdvisoryGuarded(
    async () => {
      const ucip = options.ucip || await getCloudflareUcip(governance, env, options);
      const amg = options.amg || buildCloudflareAmgFromUcip(ucip);
      const cba = options.cba || buildCloudflareCbaFromAmg(amg, ucip, options.behavioralContext);
      const alignmentContext = options.alignmentContext || await buildCalAlignmentContextFromEnv(governance, env, options);
      return buildCloudflareCalFromCba(cba, amg, ucip, alignmentContext);
    },
    "cal",
    { cacheKeySuffix: metaAdvisoryCacheSuffix(options) }
  );
}
__name(getCloudflareCal, "getCloudflareCal");
function buildCloudflareSafetyCalFactor(calSnapshot = {}) {
  const state = calSnapshot.calState || calSnapshot;
  return {
    health: calSnapshot.calHealth || state.health || deriveCalHealth(state.mode),
    score: calSnapshot.calScore ?? state.score ?? null,
    mode: state.mode || "align_red",
    reasons: calSnapshot.calReasons || [],
    warningCount: (calSnapshot.calAlignmentWarnings || []).length,
    findingCount: (calSnapshot.calAlignmentFindings || []).length,
    advisoryOnly: true,
    checkedAt: calSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyCalFactor, "buildCloudflareSafetyCalFactor");
function getModuleCalTag(calMode = "align_yellow", moduleFields = {}) {
  const cbaTag = moduleFields.cloudflareCBATag || "";
  const amgTag = moduleFields.cloudflareAMGTag || "";
  const ucipTag = moduleFields.cloudflareUCIPTag || "";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  if (calMode === "align_red" || calMode === "align_orange" || moduleRisk === "high" || cbaTag === "CBA_RISK" || amgTag === "AMG_CAUTION" || ucipTag === "UCIP_RED") {
    return "CAL_MISALIGNED";
  }
  if (calMode === "align_yellow" || moduleRisk === "medium" || cbaTag === "CBA_DRIFT" || amgTag === "AMG_REVIEW" || ucipTag === "UCIP_ORANGE" || ucipTag === "UCIP_YELLOW") {
    return "CAL_PARTIAL";
  }
  return "CAL_ALIGNED";
}
__name(getModuleCalTag, "getModuleCalTag");
function computeModuleCalFields(calRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = calRuntime.calState?.mode || "align_yellow";
  const tag = getModuleCalTag(mode, moduleFields);
  const risk = tag === "CAL_MISALIGNED" || moduleFields.cloudflareModuleRisk === "high" ? "high" : tag === "CAL_PARTIAL" || moduleFields.cloudflareModuleRisk === "medium" ? "medium" : "low";
  const highlight = tag === "CAL_MISALIGNED" || tag === "CAL_PARTIAL" && moduleFields.cloudflareCBAHighlight;
  return {
    cloudflareCALTag: tag,
    cloudflareCALMode: mode,
    cloudflareCALRisk: risk,
    cloudflareCALHighlight: highlight,
    cloudflareCALScore: calRuntime.calScore ?? calRuntime.calState?.score ?? null,
    cloudflareCALModuleId: moduleId
  };
}
__name(computeModuleCalFields, "computeModuleCalFields");
function deriveIhlIntentContext(calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, context = {}) {
  const alignmentContext = deriveCalAlignmentContext(cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const heartbeat = context.heartbeat || {};
  const missionIntent = {
    ucipMode: ucipSnapshot.ucipState?.mode || heartbeat.cloudflareUCIPMode || "yellow",
    amgMode: amgSnapshot.amgState?.mode || heartbeat.cloudflareAMGMode || "govern_yellow",
    cbaMode: cbaSnapshot.cbaState?.mode || heartbeat.cloudflareCBAMode || "behavior_yellow",
    calMode: calSnapshot.calState?.mode || heartbeat.cloudflareCALMode || "align_yellow",
    decision: alignmentContext.operatorPosture?.decision || heartbeat.cloudflareDecision || "optional"
  };
  const operatorIntent = {
    governanceHealth: heartbeat.governanceHealth || "optional",
    pipelineHealth: heartbeat.pipelineEngineHealth || "idle",
    safetyHealth: heartbeat.safetyHealth || "optional",
    intentCount: context.intentCount ?? 0,
    calHints: (calSnapshot.calOperatorAlignmentHints || []).length,
    cbaHints: (cbaSnapshot.cbaOperatorBehaviorHints || []).length
  };
  const marketplaceIntent = {
    ...alignmentContext.marketplaceIndicators,
    calWarnings: (calSnapshot.calAlignmentWarnings || []).length,
    cbaDriftWarnings: (cbaSnapshot.cbaBehaviorDriftWarnings || []).length,
    highRiskModules: alignmentContext.marketplaceIndicators?.highRiskModules ?? 0
  };
  const osIntentPosture = {
    ...alignmentContext.osIndicators,
    cognitiveMisalignmentScore: calSnapshot.cognitiveMisalignmentScore ?? 0,
    behaviorDriftScore: cbaSnapshot.behaviorDriftScore ?? 0,
    calFindings: (calSnapshot.calAlignmentFindings || []).length,
    amgRuleCount: (amgSnapshot.amgRules || []).length
  };
  return {
    ...alignmentContext,
    missionIntent,
    operatorIntent,
    marketplaceIntent,
    osIntentPosture,
    heartbeat
  };
}
__name(deriveIhlIntentContext, "deriveIhlIntentContext");
function computeIntentMisalignmentScore(intentContext = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  let misalignment = 0;
  const { missionIntent, operatorPosture, marketplaceIntent, osIntentPosture } = intentContext;
  const calMode = calSnapshot.calState?.mode || "align_yellow";
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  if (calMode === "align_green" && cbaMode === "behavior_orange") {
    misalignment += 2;
  }
  if (calMode === "align_yellow" && cbaMode === "behavior_green" && amgMode === "govern_green") {
    misalignment += 1;
  }
  if (missionIntent.calMode === "align_orange" && missionIntent.cbaMode === "behavior_green") {
    misalignment += 2;
  }
  if (missionIntent.ucipMode === "orange" && missionIntent.calMode === "align_green") {
    misalignment += 2;
  }
  if (operatorPosture?.decision === "hold" && calMode === "align_green") {
    misalignment += 2;
  }
  if (operatorPosture?.decision === "proceed" && (calMode === "align_orange" || calMode === "align_red")) {
    misalignment += 1;
  }
  if (marketplaceIntent.calWarnings >= 2 || marketplaceIntent.cbaDriftWarnings >= 2) {
    misalignment += 1;
  }
  if (marketplaceIntent.highRiskModules >= 2 && calMode === "align_green") {
    misalignment += 1;
  }
  if (osIntentPosture.syncStatus === "divergent") {
    misalignment += 2;
  } else if (osIntentPosture.syncStatus === "partial") {
    misalignment += 1;
  }
  if (osIntentPosture.cognitiveMisalignmentScore >= 4 || osIntentPosture.behaviorDriftScore >= 4) {
    misalignment += 1;
  }
  if (calMode === "align_red" || cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red") {
    misalignment += 3;
  } else if (calMode === "align_orange" || cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange") {
    misalignment += 2;
  }
  if (calSnapshot.calHealth === "degraded" || cbaSnapshot.cbaHealth === "degraded" || amgSnapshot.amgHealth === "degraded" || ucipSnapshot.ucipHealth === "degraded") {
    misalignment += 2;
  }
  return misalignment;
}
__name(computeIntentMisalignmentScore, "computeIntentMisalignmentScore");
function computeIhlMode(calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, intentContext = {}) {
  const calMode = calSnapshot.calState?.mode || "align_yellow";
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const signalsMissing = calMode === "align_red" && calSnapshot.calHealth === "degraded" || cbaMode === "behavior_red" && cbaSnapshot.cbaHealth === "degraded" || amgMode === "govern_red" && amgSnapshot.amgHealth === "degraded" || ucipMode === "red" && ucipSnapshot.ucipHealth === "degraded" || !ucipSnapshot.ucipSignals || !Object.keys(ucipSnapshot.ucipSignals || {}).length;
  if (signalsMissing) {
    return "intent_red";
  }
  const misalignment = computeIntentMisalignmentScore(intentContext, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  if (calMode === "align_red" || cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red" || misalignment >= 7) {
    return "intent_red";
  }
  if (calMode === "align_orange" || cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange" || misalignment >= 5) {
    return "intent_orange";
  }
  if (calMode === "align_yellow" || cbaMode === "behavior_yellow" || amgMode === "govern_yellow" || ucipMode === "yellow" || misalignment >= 2) {
    return "intent_yellow";
  }
  return "intent_green";
}
__name(computeIhlMode, "computeIhlMode");
function deriveIhlHealth(mode) {
  if (mode === "intent_green") {
    return "healthy";
  }
  if (mode === "intent_red") {
    return "degraded";
  }
  return "advisory";
}
__name(deriveIhlHealth, "deriveIhlHealth");
function computeIhlScore(calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, mode = "intent_yellow", misalignment = 0) {
  const calScore = calSnapshot.calScore ?? calSnapshot.calState?.score ?? 20;
  const cbaScore = cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? 20;
  const amgScore = amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? 20;
  const ucipScore = ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? 20;
  const base = Math.round((Number(calScore) + Number(cbaScore) + Number(amgScore) + Number(ucipScore)) / 4);
  const modePenalty = {
    intent_green: 0,
    intent_yellow: 4,
    intent_orange: 10,
    intent_red: 22
  };
  return Math.max(0, Math.min(100, base - (modePenalty[mode] ?? 8) - misalignment * 2));
}
__name(computeIhlScore, "computeIhlScore");
function buildIhlIntentFindings(mode, intentContext = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  const findings = [];
  const { missionIntent, operatorIntent, marketplaceIntent, osIntentPosture } = intentContext;
  findings.push({
    id: "ihl-advisory-only",
    finding: "IHL evaluates intent harmonization only; it does not execute operator or system actions.",
    surface: "os",
    harmonized: true
  });
  if (missionIntent.calMode === missionIntent.cbaMode?.replace("behavior_", "align_") || mode === "intent_green") {
    findings.push({
      id: "ihl-mission-cal-cba",
      finding: "Mission intent trajectory shows coherent CAL + CBA posture.",
      surface: "mission",
      harmonized: true
    });
  } else {
    findings.push({
      id: "ihl-mission-mismatch",
      finding: `Mission intent mismatch: CAL ${missionIntent.calMode} vs CBA ${missionIntent.cbaMode}.`,
      surface: "mission",
      harmonized: false
    });
  }
  if (calSnapshot.calState?.mode === "align_green" && mode === "intent_green") {
    findings.push({
      id: "ihl-cal-aligned",
      finding: "CAL cognitive alignment supports intent harmonization posture.",
      surface: "operator",
      harmonized: true
    });
  }
  if (operatorIntent.governanceHealth === "online" && operatorIntent.pipelineHealth === "online") {
    findings.push({
      id: "ihl-operator-steady",
      finding: "Operator intent surfaces show steady governance and pipeline posture.",
      surface: "operator",
      harmonized: true
    });
  }
  if (osIntentPosture.syncStatus === "aligned") {
    findings.push({
      id: "ihl-os-sync",
      finding: "OS intent posture: cross-division sync aligned with federation signals.",
      surface: "os",
      harmonized: true
    });
  }
  if (marketplaceIntent.highRiskModules > 0) {
    findings.push({
      id: "ihl-marketplace-risk",
      finding: `${marketplaceIntent.highRiskModules} module(s) elevate marketplace intent conflict risk.`,
      surface: "marketplace",
      harmonized: marketplaceIntent.highRiskModules < 2
    });
  }
  if ((amgSnapshot.amgRules || []).length) {
    findings.push({
      id: "ihl-amg-rules",
      finding: `AMG active with ${amgSnapshot.amgRules.length} governance rule(s) informing intent harmonization.`,
      surface: "operator",
      harmonized: amgSnapshot.amgState?.mode !== "govern_red"
    });
  }
  if (mode === "intent_red") {
    findings.push({
      id: "ihl-severe-conflict",
      finding: "Severe intent misalignment or degraded CAL/CBA/AMG/UCIP upstream signals.",
      surface: "os",
      harmonized: false
    });
  }
  return findings.slice(0, 8);
}
__name(buildIhlIntentFindings, "buildIhlIntentFindings");
function buildIhlIntentWarnings(mode, intentContext = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  const warnings = [];
  const { missionIntent, operatorPosture, marketplaceIntent, osIntentPosture } = intentContext;
  const calWarnings = calSnapshot.calAlignmentWarnings || [];
  const cbaWarnings = cbaSnapshot.cbaBehaviorDriftWarnings || [];
  if (calWarnings.length) {
    warnings.push(...calWarnings.slice(0, 2).map((entry) => `CAL alignment: ${entry}`));
  }
  if (cbaWarnings.length) {
    warnings.push(...cbaWarnings.slice(0, 1).map((entry) => `CBA drift: ${entry}`));
  }
  if (missionIntent.calMode === "align_orange" && missionIntent.cbaMode === "behavior_green") {
    warnings.push("CAL align_orange conflicts with CBA behavior_green \u2014 intent harmonization mismatch.");
  }
  if (missionIntent.amgMode === "govern_green" && calSnapshot.calState?.mode === "align_orange") {
    warnings.push("AMG govern_green conflicts with CAL align_orange \u2014 review operator intent alignment.");
  }
  if (operatorPosture?.decision === "hold" && mode === "intent_green") {
    warnings.push("Decision posture HOLD conflicts with IHL intent_green \u2014 operator intent may diverge.");
  }
  if (osIntentPosture.syncStatus === "divergent" || osIntentPosture.syncStatus === "partial") {
    warnings.push(`OS sync drift (${osIntentPosture.syncStatus}) may indicate intent misalignment.`);
  }
  if (marketplaceIntent.calWarnings >= 2 || marketplaceIntent.cbaDriftWarnings >= 2) {
    warnings.push("Multiple CAL/CBA warnings affect marketplace intent posture.");
  }
  if (mode === "intent_red") {
    warnings.push("Severe intent misalignment or degraded CAL/CBA/AMG/UCIP signals.");
  }
  if (!warnings.length) {
    warnings.push("No significant intent misalignment warnings at this time.");
  }
  return warnings.slice(0, 6);
}
__name(buildIhlIntentWarnings, "buildIhlIntentWarnings");
function buildIhlOperatorIntentHints(mode, intentContext = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}) {
  const hints = (calSnapshot.calOperatorAlignmentHints || []).slice(0, 2);
  const cbaHints = (cbaSnapshot.cbaOperatorBehaviorHints || []).slice(0, 2);
  const nudges = (amgSnapshot.amgOperatorNudges || []).slice(0, 2).map(
    (entry) => typeof entry === "string" ? entry : entry.nudge || ""
  );
  if (mode === "intent_green") {
    hints.push("Maintain current operator cadence; intent harmonized with UCIP + AMG + CBA + CAL.");
  } else if (mode === "intent_red") {
    hints.push("Pause promotion workflows; restore CAL/CBA/AMG/UCIP signals before changing operator intent.");
  } else if (mode === "intent_orange") {
    hints.push("Reduce concurrent operator actions; prioritize intent warnings on mission board.");
  } else {
    hints.push("Review mission UCIP/AMG/CBA/CAL strips before executing new operator intents.");
  }
  return [...new Set([...hints, ...cbaHints, ...nudges].filter(Boolean))].slice(0, 6);
}
__name(buildIhlOperatorIntentHints, "buildIhlOperatorIntentHints");
function buildIhlSystemIntentHints(mode, intentContext = {}, ucipSnapshot = {}, amgSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}) {
  const hints = (calSnapshot.calSystemAlignmentHints || []).slice(0, 2);
  const cbaHints = (cbaSnapshot.cbaSystemBehaviorHints || []).slice(0, 1);
  const policyHints = (amgSnapshot.amgPolicyHints || []).slice(0, 2).map(
    (entry) => typeof entry === "string" ? entry : `[${entry.surface || "os"}] ${entry.hint || ""}`
  );
  const { osIntentPosture } = intentContext;
  if (osIntentPosture.syncStatus !== "aligned") {
    hints.push(`OS sync posture: ${osIntentPosture.syncStatus} \u2014 reconcile intent harmonization across divisions.`);
  }
  if ((ucipSnapshot.ucipRecommendedActions || []).length) {
    hints.push(`UCIP suggests: ${(ucipSnapshot.ucipRecommendedActions || [])[0]}`);
  }
  if (mode === "intent_red") {
    hints.push("System intent fallback: use minimal advisory payload until CAL/CBA/AMG/UCIP recover.");
  }
  return [...new Set([...hints, ...cbaHints, ...policyHints].filter(Boolean))].slice(0, 6);
}
__name(buildIhlSystemIntentHints, "buildIhlSystemIntentHints");
function buildCloudflareIhlFromCal(calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, intentContext = {}) {
  const context = deriveIhlIntentContext(calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, intentContext);
  const misalignment = computeIntentMisalignmentScore(context, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const mode = computeIhlMode(calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const score2 = computeIhlScore(calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, mode, misalignment);
  const health = deriveIhlHealth(mode);
  const ihlIntentFindings = buildIhlIntentFindings(mode, context, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const ihlIntentWarnings = buildIhlIntentWarnings(mode, context, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const ihlOperatorIntentHints = buildIhlOperatorIntentHints(mode, context, calSnapshot, cbaSnapshot, amgSnapshot);
  const ihlSystemIntentHints = buildIhlSystemIntentHints(mode, context, ucipSnapshot, amgSnapshot, calSnapshot, cbaSnapshot);
  const ihlReasons = [
    `IHL mode: ${mode} (derived from CAL ${calSnapshot.calState?.mode || "align_yellow"} + CBA ${cbaSnapshot.cbaState?.mode || "behavior_yellow"} + AMG ${amgSnapshot.amgState?.mode || "govern_yellow"} + UCIP ${ucipSnapshot.ucipState?.mode || "yellow"}).`,
    `Intent misalignment score: ${misalignment}.`,
    ...(calSnapshot.calReasons || []).slice(0, 1),
    ...(cbaSnapshot.cbaReasons || []).slice(0, 1),
    mode === "intent_red" && misalignment >= 7 ? "Severe intent misalignment or degraded upstream signals." : null
  ].filter(Boolean);
  return {
    ihlState: { mode, score: score2, health },
    ihlIntentFindings,
    ihlIntentWarnings,
    ihlOperatorIntentHints,
    ihlSystemIntentHints,
    ihlReasons,
    ihlHealth: health,
    ihlScore: score2,
    intentMisalignmentScore: misalignment,
    calUpstream: {
      mode: calSnapshot.calState?.mode,
      score: calSnapshot.calScore ?? calSnapshot.calState?.score ?? null
    },
    cbaUpstream: {
      mode: cbaSnapshot.cbaState?.mode,
      score: cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? null
    },
    amgUpstream: {
      mode: amgSnapshot.amgState?.mode,
      score: amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? null
    },
    ucipUpstream: {
      mode: ucipSnapshot.ucipState?.mode,
      score: ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? null
    },
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareIhlFromCal, "buildCloudflareIhlFromCal");
async function buildIhlIntentContextFromEnv(governance = {}, env = {}, options = {}) {
  return buildCalAlignmentContextFromEnv(governance, env, options);
}
__name(buildIhlIntentContextFromEnv, "buildIhlIntentContextFromEnv");
async function getCloudflareIhl(governance = {}, env = {}, options = {}) {
  return runAdvisoryGuarded(
    async () => {
      const ucip = options.ucip || await getCloudflareUcip(governance, env, options);
      const amg = options.amg || buildCloudflareAmgFromUcip(ucip);
      const intentContext = options.intentContext || await buildIhlIntentContextFromEnv(governance, env, options);
      const cba = options.cba || buildCloudflareCbaFromAmg(amg, ucip, intentContext);
      const cal = options.cal || buildCloudflareCalFromCba(cba, amg, ucip, intentContext);
      return buildCloudflareIhlFromCal(cal, cba, amg, ucip, intentContext);
    },
    "ihl",
    { cacheKeySuffix: metaAdvisoryCacheSuffix(options) }
  );
}
__name(getCloudflareIhl, "getCloudflareIhl");
function buildCloudflareSafetyIhlFactor(ihlSnapshot = {}) {
  const state = ihlSnapshot.ihlState || ihlSnapshot;
  return {
    health: ihlSnapshot.ihlHealth || state.health || deriveIhlHealth(state.mode),
    score: ihlSnapshot.ihlScore ?? state.score ?? null,
    mode: state.mode || "intent_red",
    reasons: ihlSnapshot.ihlReasons || [],
    warningCount: (ihlSnapshot.ihlIntentWarnings || []).length,
    findingCount: (ihlSnapshot.ihlIntentFindings || []).length,
    advisoryOnly: true,
    checkedAt: ihlSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyIhlFactor, "buildCloudflareSafetyIhlFactor");
function getModuleIhlTag(ihlMode = "intent_yellow", moduleFields = {}) {
  const calTag = moduleFields.cloudflareCALTag || "";
  const cbaTag = moduleFields.cloudflareCBATag || "";
  const amgTag = moduleFields.cloudflareAMGTag || "";
  const ucipTag = moduleFields.cloudflareUCIPTag || "";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  if (ihlMode === "intent_red" || ihlMode === "intent_orange" || moduleRisk === "high" || calTag === "CAL_MISALIGNED" || cbaTag === "CBA_RISK" || amgTag === "AMG_CAUTION" || ucipTag === "UCIP_RED") {
    return "IHL_CONFLICT";
  }
  if (ihlMode === "intent_yellow" || moduleRisk === "medium" || calTag === "CAL_PARTIAL" || cbaTag === "CBA_DRIFT" || amgTag === "AMG_REVIEW" || ucipTag === "UCIP_ORANGE" || ucipTag === "UCIP_YELLOW") {
    return "IHL_PARTIAL";
  }
  return "IHL_ALIGNED";
}
__name(getModuleIhlTag, "getModuleIhlTag");
function computeModuleIhlFields(ihlRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = ihlRuntime.ihlState?.mode || "intent_yellow";
  const tag = getModuleIhlTag(mode, moduleFields);
  const risk = tag === "IHL_CONFLICT" || moduleFields.cloudflareModuleRisk === "high" ? "high" : tag === "IHL_PARTIAL" || moduleFields.cloudflareModuleRisk === "medium" ? "medium" : "low";
  const highlight = tag === "IHL_CONFLICT" || tag === "IHL_PARTIAL" && moduleFields.cloudflareCALHighlight;
  return {
    cloudflareIHLTag: tag,
    cloudflareIHLMode: mode,
    cloudflareIHLRisk: risk,
    cloudflareIHLHighlight: highlight,
    cloudflareIHLScore: ihlRuntime.ihlScore ?? ihlRuntime.ihlState?.score ?? null,
    cloudflareIHLModuleId: moduleId
  };
}
__name(computeModuleIhlFields, "computeModuleIhlFields");
function deriveIarlResonanceContext(ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, context = {}) {
  const intentContext = deriveIhlIntentContext(calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const heartbeat = context.heartbeat || {};
  const missionActionTrajectory = {
    intendedUcip: intentContext.missionIntent?.ucipMode || heartbeat.cloudflareUCIPMode || "yellow",
    intendedIhl: ihlSnapshot.ihlState?.mode || heartbeat.cloudflareIHLMode || "intent_yellow",
    actualDecision: intentContext.operatorPosture?.decision || heartbeat.cloudflareDecision || "optional",
    pipelineHealth: heartbeat.pipelineEngineHealth || "idle",
    governanceHealth: heartbeat.governanceHealth || "optional"
  };
  const operatorActions = {
    intentCount: context.intentCount ?? 0,
    actionLogSignals: context.actionLogCount ?? 0,
    ihlWarnings: (ihlSnapshot.ihlIntentWarnings || []).length,
    calWarnings: (calSnapshot.calAlignmentWarnings || []).length,
    cbaDrift: (cbaSnapshot.cbaBehaviorDriftWarnings || []).length
  };
  const marketplaceActionPosture = {
    ...intentContext.marketplaceIntent,
    highRiskModules: intentContext.marketplaceIntent?.highRiskModules ?? 0,
    moduleUsageDrift: context.moduleUsageDrift ?? 0
  };
  const osActionPosture = {
    ...intentContext.osIntentPosture,
    automationLoops: intentContext.osIndicators?.automationLoops ?? 0,
    syncStatus: intentContext.osIndicators?.syncStatus || heartbeat.cloudflareCrossDivisionSyncStatus || "partial",
    executionHealth: intentContext.osIndicators?.executionHealth || heartbeat.cloudflareExecutionHealth || "optional",
    intentMisalignmentScore: ihlSnapshot.intentMisalignmentScore ?? 0
  };
  return {
    ...intentContext,
    missionActionTrajectory,
    operatorActions,
    marketplaceActionPosture,
    osActionPosture,
    heartbeat
  };
}
__name(deriveIarlResonanceContext, "deriveIarlResonanceContext");
function computeResonanceMismatchScore(resonanceContext = {}, ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  let mismatch = 0;
  const { missionActionTrajectory, operatorPosture, operatorActions, marketplaceActionPosture, osActionPosture } = resonanceContext;
  const ihlMode = ihlSnapshot.ihlState?.mode || "intent_yellow";
  const calMode = calSnapshot.calState?.mode || "align_yellow";
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  if (ihlMode === "intent_green" && operatorPosture?.decision === "hold") {
    mismatch += 2;
  }
  if (ihlMode === "intent_red" && operatorPosture?.decision === "proceed") {
    mismatch += 2;
  }
  if (missionActionTrajectory.intendedIhl === "intent_green" && calMode === "align_orange") {
    mismatch += 2;
  }
  if (missionActionTrajectory.actualDecision === "proceed" && (ihlMode === "intent_orange" || ihlMode === "intent_red")) {
    mismatch += 2;
  }
  if (missionActionTrajectory.actualDecision === "caution" && ihlMode === "intent_green" && calMode === "align_green") {
    mismatch += 1;
  }
  if (operatorActions.ihlWarnings >= 2 && operatorActions.intentCount > 0) {
    mismatch += 1;
  }
  if (operatorActions.cbaDrift >= 2 && missionActionTrajectory.pipelineHealth === "online") {
    mismatch += 1;
  }
  if (osActionPosture.automationLoops >= 2 && ihlMode === "intent_green") {
    mismatch += 1;
  }
  if (osActionPosture.syncStatus === "divergent") {
    mismatch += 2;
  } else if (osActionPosture.syncStatus === "partial") {
    mismatch += 1;
  }
  if (marketplaceActionPosture.highRiskModules >= 2 && ihlMode === "intent_green") {
    mismatch += 1;
  }
  if (osActionPosture.intentMisalignmentScore >= 5) {
    mismatch += 1;
  }
  if (ihlMode === "intent_red" || calMode === "align_red" || cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red") {
    mismatch += 3;
  } else if (ihlMode === "intent_orange" || calMode === "align_orange" || cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange") {
    mismatch += 2;
  }
  if (ihlSnapshot.ihlHealth === "degraded" || calSnapshot.calHealth === "degraded" || cbaSnapshot.cbaHealth === "degraded" || amgSnapshot.amgHealth === "degraded" || ucipSnapshot.ucipHealth === "degraded") {
    mismatch += 2;
  }
  return mismatch;
}
__name(computeResonanceMismatchScore, "computeResonanceMismatchScore");
function computeIarlMode(ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, resonanceContext = {}) {
  const ihlMode = ihlSnapshot.ihlState?.mode || "intent_yellow";
  const calMode = calSnapshot.calState?.mode || "align_yellow";
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const signalsMissing = ihlMode === "intent_red" && ihlSnapshot.ihlHealth === "degraded" || calMode === "align_red" && calSnapshot.calHealth === "degraded" || cbaMode === "behavior_red" && cbaSnapshot.cbaHealth === "degraded" || amgMode === "govern_red" && amgSnapshot.amgHealth === "degraded" || ucipMode === "red" && ucipSnapshot.ucipHealth === "degraded" || !ucipSnapshot.ucipSignals || !Object.keys(ucipSnapshot.ucipSignals || {}).length;
  if (signalsMissing) {
    return "resonance_red";
  }
  const mismatch = computeResonanceMismatchScore(resonanceContext, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  if (ihlMode === "intent_red" || calMode === "align_red" || cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red" || mismatch >= 8) {
    return "resonance_red";
  }
  if (ihlMode === "intent_orange" || calMode === "align_orange" || cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange" || mismatch >= 6) {
    return "resonance_orange";
  }
  if (ihlMode === "intent_yellow" || calMode === "align_yellow" || cbaMode === "behavior_yellow" || amgMode === "govern_yellow" || ucipMode === "yellow" || mismatch >= 3) {
    return "resonance_yellow";
  }
  return "resonance_green";
}
__name(computeIarlMode, "computeIarlMode");
function deriveIarlHealth(mode) {
  if (mode === "resonance_green") {
    return "healthy";
  }
  if (mode === "resonance_red") {
    return "degraded";
  }
  return "advisory";
}
__name(deriveIarlHealth, "deriveIarlHealth");
function computeIarlScore(ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, mode = "resonance_yellow", mismatch = 0) {
  const ihlScore = ihlSnapshot.ihlScore ?? ihlSnapshot.ihlState?.score ?? 20;
  const calScore = calSnapshot.calScore ?? calSnapshot.calState?.score ?? 20;
  const cbaScore = cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? 20;
  const amgScore = amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? 20;
  const ucipScore = ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? 20;
  const base = Math.round((Number(ihlScore) + Number(calScore) + Number(cbaScore) + Number(amgScore) + Number(ucipScore)) / 5);
  const modePenalty = {
    resonance_green: 0,
    resonance_yellow: 4,
    resonance_orange: 9,
    resonance_red: 20
  };
  return Math.max(0, Math.min(100, base - (modePenalty[mode] ?? 8) - mismatch * 2));
}
__name(computeIarlScore, "computeIarlScore");
function buildIarlResonanceFindings(mode, resonanceContext = {}, ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  const findings = [];
  const { missionActionTrajectory, operatorActions, marketplaceActionPosture, osActionPosture } = resonanceContext;
  findings.push({
    id: "iarl-advisory-only",
    finding: "IARL evaluates intent-to-action resonance only; it does not execute operator or system actions.",
    surface: "os",
    resonant: true
  });
  if (missionActionTrajectory.intendedIhl === "intent_green" && missionActionTrajectory.actualDecision !== "hold") {
    findings.push({
      id: "iarl-mission-resonant",
      finding: "Mission intent trajectory resonates with operator decision posture.",
      surface: "mission",
      resonant: true
    });
  } else if (missionActionTrajectory.actualDecision === "hold" && ihlSnapshot.ihlState?.mode === "intent_green") {
    findings.push({
      id: "iarl-mission-mismatch",
      finding: "Operator HOLD action conflicts with IHL intent_green \u2014 intent/action mismatch.",
      surface: "mission",
      resonant: false
    });
  }
  if (ihlSnapshot.ihlState?.mode === "intent_green" && mode === "resonance_green") {
    findings.push({
      id: "iarl-ihl-resonant",
      finding: "IHL intent harmonization supports intent-to-action resonance.",
      surface: "operator",
      resonant: true
    });
  }
  if (operatorActions.intentCount > 0 && operatorActions.ihlWarnings === 0) {
    findings.push({
      id: "iarl-operator-actions",
      finding: `${operatorActions.intentCount} operator intent signal(s) with no IHL warnings \u2014 actions appear resonant.`,
      surface: "operator",
      resonant: true
    });
  }
  if (osActionPosture.syncStatus === "aligned") {
    findings.push({
      id: "iarl-os-sync",
      finding: "OS action posture: cross-division sync aligned with federation execution signals.",
      surface: "os",
      resonant: true
    });
  }
  if (marketplaceActionPosture.highRiskModules > 0) {
    findings.push({
      id: "iarl-marketplace-usage",
      finding: `${marketplaceActionPosture.highRiskModules} high-risk module(s) may diverge from intended marketplace posture.`,
      surface: "marketplace",
      resonant: marketplaceActionPosture.highRiskModules < 2
    });
  }
  if ((amgSnapshot.amgRules || []).length) {
    findings.push({
      id: "iarl-amg-rules",
      finding: `AMG active with ${amgSnapshot.amgRules.length} rule(s) informing action resonance.`,
      surface: "operator",
      resonant: amgSnapshot.amgState?.mode !== "govern_red"
    });
  }
  if (mode === "resonance_red") {
    findings.push({
      id: "iarl-severe-mismatch",
      finding: "Severe intent-to-action mismatch or degraded IHL/CAL/CBA/AMG/UCIP upstream signals.",
      surface: "os",
      resonant: false
    });
  }
  return findings.slice(0, 8);
}
__name(buildIarlResonanceFindings, "buildIarlResonanceFindings");
function buildIarlResonanceWarnings(mode, resonanceContext = {}, ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  const warnings = [];
  const { missionActionTrajectory, operatorPosture, operatorActions, osActionPosture } = resonanceContext;
  const ihlWarnings = ihlSnapshot.ihlIntentWarnings || [];
  const calWarnings = calSnapshot.calAlignmentWarnings || [];
  if (ihlWarnings.length) {
    warnings.push(...ihlWarnings.slice(0, 2).map((entry) => `IHL intent: ${entry}`));
  }
  if (calWarnings.length) {
    warnings.push(...calWarnings.slice(0, 1).map((entry) => `CAL alignment: ${entry}`));
  }
  if (missionActionTrajectory.actualDecision === "proceed" && ihlSnapshot.ihlState?.mode === "intent_orange") {
    warnings.push("Operator PROCEED conflicts with IHL intent_orange \u2014 action/intent resonance mismatch.");
  }
  if (missionActionTrajectory.actualDecision === "hold" && mode === "resonance_green") {
    warnings.push("Decision HOLD conflicts with IARL resonance_green \u2014 review operator action cadence.");
  }
  if (operatorPosture?.decision === "caution" && (cbaSnapshot.cbaState?.mode === "behavior_orange" || cbaSnapshot.cbaState?.mode === "behavior_red")) {
    warnings.push("CAUTION decision with elevated CBA behavioral drift \u2014 action may not match intent.");
  }
  if (osActionPosture.syncStatus === "divergent" || osActionPosture.syncStatus === "partial") {
    warnings.push(`OS sync drift (${osActionPosture.syncStatus}) may indicate action/intent resonance gap.`);
  }
  if (operatorActions.ihlWarnings >= 2 && operatorActions.intentCount > 0) {
    warnings.push("Operator actions active while IHL reports multiple intent warnings.");
  }
  if (mode === "resonance_red") {
    warnings.push("Severe intent-to-action mismatch or degraded upstream federation signals.");
  }
  if (!warnings.length) {
    warnings.push("No significant intent-to-action resonance warnings at this time.");
  }
  return warnings.slice(0, 6);
}
__name(buildIarlResonanceWarnings, "buildIarlResonanceWarnings");
function buildIarlOperatorResonanceHints(mode, resonanceContext = {}, ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}) {
  const hints = (ihlSnapshot.ihlOperatorIntentHints || []).slice(0, 2);
  const calHints = (calSnapshot.calOperatorAlignmentHints || []).slice(0, 2);
  const nudges = (amgSnapshot.amgOperatorNudges || []).slice(0, 2).map(
    (entry) => typeof entry === "string" ? entry : entry.nudge || ""
  );
  if (mode === "resonance_green") {
    hints.push("Maintain current operator cadence; intent and actions resonate with IHL + CAL + CBA.");
  } else if (mode === "resonance_red") {
    hints.push("Pause new operator actions; restore IHL/CAL/CBA/AMG/UCIP signals before proceeding.");
  } else if (mode === "resonance_orange") {
    hints.push("Reduce concurrent operator actions; prioritize resonance warnings on mission board.");
  } else {
    hints.push("Review mission IHL/CAL/CBA strips before executing new operator actions.");
  }
  return [...new Set([...hints, ...calHints, ...nudges].filter(Boolean))].slice(0, 6);
}
__name(buildIarlOperatorResonanceHints, "buildIarlOperatorResonanceHints");
function buildIarlSystemResonanceHints(mode, resonanceContext = {}, ucipSnapshot = {}, amgSnapshot = {}, ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}) {
  const hints = (ihlSnapshot.ihlSystemIntentHints || []).slice(0, 2);
  const calHints = (calSnapshot.calSystemAlignmentHints || []).slice(0, 1);
  const policyHints = (amgSnapshot.amgPolicyHints || []).slice(0, 2).map(
    (entry) => typeof entry === "string" ? entry : `[${entry.surface || "os"}] ${entry.hint || ""}`
  );
  const { osActionPosture } = resonanceContext;
  if (osActionPosture.syncStatus !== "aligned") {
    hints.push(`OS sync posture: ${osActionPosture.syncStatus} \u2014 reconcile action resonance across divisions.`);
  }
  if (osActionPosture.automationLoops > 0) {
    hints.push(`${osActionPosture.automationLoops} automation loop(s) active \u2014 verify actions match IHL intent.`);
  }
  if ((ucipSnapshot.ucipRecommendedActions || []).length) {
    hints.push(`UCIP suggests: ${(ucipSnapshot.ucipRecommendedActions || [])[0]}`);
  }
  if (mode === "resonance_red") {
    hints.push("System resonance fallback: use minimal advisory payload until IHL/CAL/CBA/AMG/UCIP recover.");
  }
  return [...new Set([...hints, ...calHints, ...policyHints].filter(Boolean))].slice(0, 6);
}
__name(buildIarlSystemResonanceHints, "buildIarlSystemResonanceHints");
function buildCloudflareIarlFromIhl(ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, resonanceContext = {}) {
  const context = deriveIarlResonanceContext(ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, resonanceContext);
  const mismatch = computeResonanceMismatchScore(context, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const mode = computeIarlMode(ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const score2 = computeIarlScore(ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, mode, mismatch);
  const health = deriveIarlHealth(mode);
  const iarlResonanceFindings = buildIarlResonanceFindings(mode, context, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const iarlResonanceWarnings = buildIarlResonanceWarnings(mode, context, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const iarlOperatorResonanceHints = buildIarlOperatorResonanceHints(mode, context, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot);
  const iarlSystemResonanceHints = buildIarlSystemResonanceHints(mode, context, ucipSnapshot, amgSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot);
  const iarlReasons = [
    `IARL mode: ${mode} (derived from IHL ${ihlSnapshot.ihlState?.mode || "intent_yellow"} + CAL ${calSnapshot.calState?.mode || "align_yellow"} + CBA ${cbaSnapshot.cbaState?.mode || "behavior_yellow"} + AMG ${amgSnapshot.amgState?.mode || "govern_yellow"} + UCIP ${ucipSnapshot.ucipState?.mode || "yellow"}).`,
    `Resonance mismatch score: ${mismatch}.`,
    ...(ihlSnapshot.ihlReasons || []).slice(0, 1),
    ...(calSnapshot.calReasons || []).slice(0, 1),
    mode === "resonance_red" && mismatch >= 8 ? "Severe intent-to-action mismatch or degraded upstream signals." : null
  ].filter(Boolean);
  return {
    iarlState: { mode, score: score2, health },
    iarlResonanceFindings,
    iarlResonanceWarnings,
    iarlOperatorResonanceHints,
    iarlSystemResonanceHints,
    iarlReasons,
    iarlHealth: health,
    iarlScore: score2,
    resonanceMismatchScore: mismatch,
    ihlUpstream: {
      mode: ihlSnapshot.ihlState?.mode,
      score: ihlSnapshot.ihlScore ?? ihlSnapshot.ihlState?.score ?? null
    },
    calUpstream: {
      mode: calSnapshot.calState?.mode,
      score: calSnapshot.calScore ?? calSnapshot.calState?.score ?? null
    },
    cbaUpstream: {
      mode: cbaSnapshot.cbaState?.mode,
      score: cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? null
    },
    amgUpstream: {
      mode: amgSnapshot.amgState?.mode,
      score: amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? null
    },
    ucipUpstream: {
      mode: ucipSnapshot.ucipState?.mode,
      score: ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? null
    },
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareIarlFromIhl, "buildCloudflareIarlFromIhl");
async function buildIarlResonanceContextFromEnv(governance = {}, env = {}, options = {}) {
  const intentContext = await buildIhlIntentContextFromEnv(governance, env, options);
  let actionLogCount = 0;
  if (env.AUDIT) {
    try {
      const audit = await env.AUDIT.list({ prefix: "operator-", limit: 20 });
      actionLogCount = audit.keys?.length ?? 0;
    } catch {
      actionLogCount = 0;
    }
  }
  return { ...intentContext, actionLogCount };
}
__name(buildIarlResonanceContextFromEnv, "buildIarlResonanceContextFromEnv");
async function getCloudflareIarl(governance = {}, env = {}, options = {}) {
  return runAdvisoryGuarded(
    async () => {
      const ucip = options.ucip || await getCloudflareUcip(governance, env, options);
      const amg = options.amg || buildCloudflareAmgFromUcip(ucip);
      const resonanceContext = options.resonanceContext || await buildIarlResonanceContextFromEnv(governance, env, options);
      const cba = options.cba || buildCloudflareCbaFromAmg(amg, ucip, resonanceContext);
      const cal = options.cal || buildCloudflareCalFromCba(cba, amg, ucip, resonanceContext);
      const ihl = options.ihl || buildCloudflareIhlFromCal(cal, cba, amg, ucip, resonanceContext);
      return buildCloudflareIarlFromIhl(ihl, cal, cba, amg, ucip, resonanceContext);
    },
    "iarl",
    { cacheKeySuffix: metaAdvisoryCacheSuffix(options) }
  );
}
__name(getCloudflareIarl, "getCloudflareIarl");
function buildCloudflareSafetyIarlFactor(iarlSnapshot = {}) {
  const state = iarlSnapshot.iarlState || iarlSnapshot;
  return {
    health: iarlSnapshot.iarlHealth || state.health || deriveIarlHealth(state.mode),
    score: iarlSnapshot.iarlScore ?? state.score ?? null,
    mode: state.mode || "resonance_red",
    reasons: iarlSnapshot.iarlReasons || [],
    warningCount: (iarlSnapshot.iarlResonanceWarnings || []).length,
    findingCount: (iarlSnapshot.iarlResonanceFindings || []).length,
    advisoryOnly: true,
    checkedAt: iarlSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyIarlFactor, "buildCloudflareSafetyIarlFactor");
function getModuleIarlTag(iarlMode = "resonance_yellow", moduleFields = {}) {
  const ihlTag = moduleFields.cloudflareIHLTag || "";
  const calTag = moduleFields.cloudflareCALTag || "";
  const cbaTag = moduleFields.cloudflareCBATag || "";
  const amgTag = moduleFields.cloudflareAMGTag || "";
  const ucipTag = moduleFields.cloudflareUCIPTag || "";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  if (iarlMode === "resonance_red" || iarlMode === "resonance_orange" || moduleRisk === "high" || ihlTag === "IHL_CONFLICT" || calTag === "CAL_MISALIGNED" || cbaTag === "CBA_RISK" || amgTag === "AMG_CAUTION" || ucipTag === "UCIP_RED") {
    return "IARL_MISMATCH";
  }
  if (iarlMode === "resonance_yellow" || moduleRisk === "medium" || ihlTag === "IHL_PARTIAL" || calTag === "CAL_PARTIAL" || cbaTag === "CBA_DRIFT" || amgTag === "AMG_REVIEW" || ucipTag === "UCIP_ORANGE" || ucipTag === "UCIP_YELLOW") {
    return "IARL_PARTIAL";
  }
  return "IARL_ALIGNED";
}
__name(getModuleIarlTag, "getModuleIarlTag");
function computeModuleIarlFields(iarlRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = iarlRuntime.iarlState?.mode || "resonance_yellow";
  const tag = getModuleIarlTag(mode, moduleFields);
  const risk = tag === "IARL_MISMATCH" || moduleFields.cloudflareModuleRisk === "high" ? "high" : tag === "IARL_PARTIAL" || moduleFields.cloudflareModuleRisk === "medium" ? "medium" : "low";
  const highlight = tag === "IARL_MISMATCH" || tag === "IARL_PARTIAL" && moduleFields.cloudflareIHLHighlight;
  return {
    cloudflareIARLTag: tag,
    cloudflareIARLMode: mode,
    cloudflareIARLRisk: risk,
    cloudflareIARLHighlight: highlight,
    cloudflareIARLScore: iarlRuntime.iarlScore ?? iarlRuntime.iarlState?.score ?? null,
    cloudflareIARLModuleId: moduleId
  };
}
__name(computeModuleIarlFields, "computeModuleIarlFields");
function deriveAclCoherenceContext(iarlSnapshot = {}, ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, context = {}) {
  const resonanceContext = deriveIarlResonanceContext(ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const heartbeat = context.heartbeat || resonanceContext.heartbeat || {};
  const operatorCoherencePosture = {
    decision: resonanceContext.operatorPosture?.decision || heartbeat.cloudflareDecision || "optional",
    iarlMode: iarlSnapshot.iarlState?.mode || heartbeat.cloudflareIARLMode || "resonance_yellow",
    ihlMode: ihlSnapshot.ihlState?.mode || heartbeat.cloudflareIHLMode || "intent_yellow",
    intentCount: resonanceContext.operatorActions?.intentCount ?? context.intentCount ?? 0,
    resonanceWarnings: (iarlSnapshot.iarlResonanceWarnings || []).length,
    intentWarnings: (ihlSnapshot.ihlIntentWarnings || []).length
  };
  const missionCoherencePosture = {
    ...resonanceContext.missionActionTrajectory,
    calMode: calSnapshot.calState?.mode || heartbeat.cloudflareCALMode || "align_yellow",
    executionHealth: resonanceContext.osActionPosture?.executionHealth || heartbeat.cloudflareExecutionHealth || "optional"
  };
  const marketplaceCoherencePosture = {
    ...resonanceContext.marketplaceActionPosture,
    highRiskModules: resonanceContext.marketplaceActionPosture?.highRiskModules ?? 0,
    moduleUsageDrift: context.moduleUsageDrift ?? 0
  };
  const osCoherencePosture = {
    ...resonanceContext.osActionPosture,
    automationLoops: resonanceContext.osActionPosture?.automationLoops ?? 0,
    syncStatus: resonanceContext.osActionPosture?.syncStatus || heartbeat.cloudflareCrossDivisionSyncStatus || "partial",
    ucipMode: ucipSnapshot.ucipState?.mode || heartbeat.cloudflareUCIPMode || "yellow",
    amgMode: amgSnapshot.amgState?.mode || heartbeat.cloudflareAMGMode || "govern_yellow",
    fragmentationScore: iarlSnapshot.resonanceMismatchScore ?? 0
  };
  return {
    ...resonanceContext,
    operatorCoherencePosture,
    missionCoherencePosture,
    marketplaceCoherencePosture,
    osCoherencePosture,
    heartbeat
  };
}
__name(deriveAclCoherenceContext, "deriveAclCoherenceContext");
function computeCoherenceFragmentationScore(coherenceContext = {}, iarlSnapshot = {}, ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  let fragmentation = 0;
  const { operatorCoherencePosture, missionCoherencePosture, marketplaceCoherencePosture, osCoherencePosture } = coherenceContext;
  const iarlMode = iarlSnapshot.iarlState?.mode || "resonance_yellow";
  const ihlMode = ihlSnapshot.ihlState?.mode || "intent_yellow";
  const calMode = calSnapshot.calState?.mode || "align_yellow";
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const layerModes = [iarlMode, ihlMode, calMode, cbaMode, amgMode, ucipMode];
  const redCount = layerModes.filter((m) => m.includes("red") || m === "red").length;
  const orangeCount = layerModes.filter((m) => m.includes("orange") || m === "orange").length;
  fragmentation += redCount * 2;
  fragmentation += orangeCount;
  if (iarlMode === "resonance_green" && (ihlMode === "intent_orange" || ihlMode === "intent_red")) {
    fragmentation += 2;
  }
  if (ihlMode === "intent_green" && calMode === "align_orange") {
    fragmentation += 1;
  }
  if (operatorCoherencePosture.resonanceWarnings >= 2 && operatorCoherencePosture.intentWarnings >= 2) {
    fragmentation += 2;
  }
  if (missionCoherencePosture.actualDecision === "proceed" && (iarlMode === "resonance_orange" || iarlMode === "resonance_red")) {
    fragmentation += 2;
  }
  if (osCoherencePosture.syncStatus === "divergent") {
    fragmentation += 2;
  } else if (osCoherencePosture.syncStatus === "partial") {
    fragmentation += 1;
  }
  if (marketplaceCoherencePosture.highRiskModules >= 2 && iarlMode === "resonance_green") {
    fragmentation += 1;
  }
  if (osCoherencePosture.automationLoops >= 2) {
    fragmentation += 1;
  }
  if (iarlSnapshot.iarlHealth === "degraded" || ihlSnapshot.ihlHealth === "degraded" || calSnapshot.calHealth === "degraded" || cbaSnapshot.cbaHealth === "degraded" || amgSnapshot.amgHealth === "degraded" || ucipSnapshot.ucipHealth === "degraded") {
    fragmentation += 3;
  }
  if (!ucipSnapshot.ucipSignals || !Object.keys(ucipSnapshot.ucipSignals || {}).length) {
    fragmentation += 2;
  }
  return fragmentation;
}
__name(computeCoherenceFragmentationScore, "computeCoherenceFragmentationScore");
function computeAclMode(iarlSnapshot = {}, ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, coherenceContext = {}) {
  const iarlMode = iarlSnapshot.iarlState?.mode || "resonance_yellow";
  const ihlMode = ihlSnapshot.ihlState?.mode || "intent_yellow";
  const calMode = calSnapshot.calState?.mode || "align_yellow";
  const cbaMode = cbaSnapshot.cbaState?.mode || "behavior_yellow";
  const amgMode = amgSnapshot.amgState?.mode || "govern_yellow";
  const ucipMode = ucipSnapshot.ucipState?.mode || "yellow";
  const signalsMissing = iarlMode === "resonance_red" && iarlSnapshot.iarlHealth === "degraded" || ihlMode === "intent_red" && ihlSnapshot.ihlHealth === "degraded" || calMode === "align_red" && calSnapshot.calHealth === "degraded" || cbaMode === "behavior_red" && cbaSnapshot.cbaHealth === "degraded" || amgMode === "govern_red" && amgSnapshot.amgHealth === "degraded" || ucipMode === "red" && ucipSnapshot.ucipHealth === "degraded" || !ucipSnapshot.ucipSignals || !Object.keys(ucipSnapshot.ucipSignals || {}).length;
  if (signalsMissing) {
    return "coherence_red";
  }
  const fragmentation = computeCoherenceFragmentationScore(coherenceContext, iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  if (iarlMode === "resonance_red" || ihlMode === "intent_red" || calMode === "align_red" || cbaMode === "behavior_red" || amgMode === "govern_red" || ucipMode === "red" || fragmentation >= 10) {
    return "coherence_red";
  }
  if (iarlMode === "resonance_orange" || ihlMode === "intent_orange" || calMode === "align_orange" || cbaMode === "behavior_orange" || amgMode === "govern_orange" || ucipMode === "orange" || fragmentation >= 7) {
    return "coherence_orange";
  }
  if (iarlMode === "resonance_yellow" || ihlMode === "intent_yellow" || calMode === "align_yellow" || cbaMode === "behavior_yellow" || amgMode === "govern_yellow" || ucipMode === "yellow" || fragmentation >= 4) {
    return "coherence_yellow";
  }
  return "coherence_green";
}
__name(computeAclMode, "computeAclMode");
function deriveAclHealth(mode) {
  if (mode === "coherence_green") {
    return "healthy";
  }
  if (mode === "coherence_red") {
    return "degraded";
  }
  return "advisory";
}
__name(deriveAclHealth, "deriveAclHealth");
function computeAclScore(iarlSnapshot = {}, ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, mode = "coherence_yellow", fragmentation = 0) {
  const iarlScore = iarlSnapshot.iarlScore ?? iarlSnapshot.iarlState?.score ?? 20;
  const ihlScore = ihlSnapshot.ihlScore ?? ihlSnapshot.ihlState?.score ?? 20;
  const calScore = calSnapshot.calScore ?? calSnapshot.calState?.score ?? 20;
  const cbaScore = cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? 20;
  const amgScore = amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? 20;
  const ucipScore = ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? 20;
  const base = Math.round((Number(iarlScore) + Number(ihlScore) + Number(calScore) + Number(cbaScore) + Number(amgScore) + Number(ucipScore)) / 6);
  const modePenalty = {
    coherence_green: 0,
    coherence_yellow: 4,
    coherence_orange: 9,
    coherence_red: 20
  };
  return Math.max(0, Math.min(100, base - (modePenalty[mode] ?? 8) - fragmentation * 2));
}
__name(computeAclScore, "computeAclScore");
function buildAclCoherenceFindings(mode, coherenceContext = {}, iarlSnapshot = {}, ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  const findings = [];
  const { operatorCoherencePosture, missionCoherencePosture, marketplaceCoherencePosture, osCoherencePosture } = coherenceContext;
  findings.push({
    id: "acl-advisory-only",
    finding: "ACL evaluates OS-wide coherence only; it does not execute operator or system actions.",
    surface: "os",
    coherent: true
  });
  if (mode === "coherence_green") {
    findings.push({
      id: "acl-layers-aligned",
      finding: "IARL + IHL + CAL + CBA + AMG + UCIP layers show coherent alignment.",
      surface: "os",
      coherent: true
    });
  }
  if (operatorCoherencePosture.iarlMode === "resonance_green" && operatorCoherencePosture.ihlMode === "intent_green") {
    findings.push({
      id: "acl-operator-coherent",
      finding: "Operator intent, action resonance, and harmonization are coherently aligned.",
      surface: "operator",
      coherent: true
    });
  }
  if (missionCoherencePosture.executionHealth === "online" || missionCoherencePosture.pipelineHealth === "online") {
    findings.push({
      id: "acl-mission-execution",
      finding: "Mission trajectory and execution posture appear coherent with federation signals.",
      surface: "mission",
      coherent: mode !== "coherence_red"
    });
  }
  if (osCoherencePosture.syncStatus === "aligned") {
    findings.push({
      id: "acl-os-sync",
      finding: "OS cross-division sync aligned \u2014 system coherence supported.",
      surface: "os",
      coherent: true
    });
  }
  if (marketplaceCoherencePosture.highRiskModules > 0) {
    findings.push({
      id: "acl-marketplace-mix",
      finding: `${marketplaceCoherencePosture.highRiskModules} high-risk module(s) may fragment marketplace coherence.`,
      surface: "marketplace",
      coherent: marketplaceCoherencePosture.highRiskModules < 2
    });
  }
  if ((amgSnapshot.amgRules || []).length && amgSnapshot.amgState?.mode !== "govern_red") {
    findings.push({
      id: "acl-amg-governance",
      finding: `AMG governance (${amgSnapshot.amgRules.length} rule(s)) supports meta-intelligence coherence.`,
      surface: "operator",
      coherent: true
    });
  }
  if (mode === "coherence_red") {
    findings.push({
      id: "acl-severe-fragmentation",
      finding: "Severe OS fragmentation or degraded IARL/IHL/CAL/CBA/AMG/UCIP upstream signals.",
      surface: "os",
      coherent: false
    });
  }
  return findings.slice(0, 8);
}
__name(buildAclCoherenceFindings, "buildAclCoherenceFindings");
function buildAclCoherenceWarnings(mode, coherenceContext = {}, iarlSnapshot = {}, ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}) {
  const warnings = [];
  const { operatorCoherencePosture, osCoherencePosture } = coherenceContext;
  const iarlWarnings = iarlSnapshot.iarlResonanceWarnings || [];
  const ihlWarnings = ihlSnapshot.ihlIntentWarnings || [];
  const calWarnings = calSnapshot.calAlignmentWarnings || [];
  if (iarlWarnings.length) {
    warnings.push(...iarlWarnings.slice(0, 2).map((entry) => `IARL resonance: ${entry}`));
  }
  if (ihlWarnings.length) {
    warnings.push(...ihlWarnings.slice(0, 1).map((entry) => `IHL intent: ${entry}`));
  }
  if (calWarnings.length) {
    warnings.push(...calWarnings.slice(0, 1).map((entry) => `CAL alignment: ${entry}`));
  }
  if (operatorCoherencePosture.iarlMode !== operatorCoherencePosture.ihlMode?.replace("intent_", "resonance_")) {
    if (operatorCoherencePosture.iarlMode === "resonance_green" && operatorCoherencePosture.ihlMode === "intent_orange") {
      warnings.push("IARL/IHL mode divergence \u2014 operator coherence fragmentation detected.");
    }
  }
  if (osCoherencePosture.syncStatus === "divergent" || osCoherencePosture.syncStatus === "partial") {
    warnings.push(`OS sync drift (${osCoherencePosture.syncStatus}) fragments cross-layer coherence.`);
  }
  if ((cbaSnapshot.cbaBehaviorDriftWarnings || []).length >= 2) {
    warnings.push("Elevated CBA behavioral drift warnings reduce OS coherence.");
  }
  if (mode === "coherence_red") {
    warnings.push("Severe OS fragmentation or degraded upstream federation signals.");
  }
  if (!warnings.length) {
    warnings.push("No significant coherence warnings at this time.");
  }
  return warnings.slice(0, 6);
}
__name(buildAclCoherenceWarnings, "buildAclCoherenceWarnings");
function buildAclOperatorCoherenceHints(mode, coherenceContext = {}, iarlSnapshot = {}, ihlSnapshot = {}, calSnapshot = {}, amgSnapshot = {}) {
  const hints = (iarlSnapshot.iarlOperatorResonanceHints || []).slice(0, 2);
  const ihlHints = (ihlSnapshot.ihlOperatorIntentHints || []).slice(0, 2);
  const calHints = (calSnapshot.calOperatorAlignmentHints || []).slice(0, 1);
  const nudges = (amgSnapshot.amgOperatorNudges || []).slice(0, 2).map(
    (entry) => typeof entry === "string" ? entry : entry.nudge || ""
  );
  if (mode === "coherence_green") {
    hints.push("Maintain current operator cadence; all federation layers show coherent alignment.");
  } else if (mode === "coherence_red") {
    hints.push("Pause operator actions; restore IARL/IHL/CAL/CBA/AMG/UCIP before proceeding.");
  } else if (mode === "coherence_orange") {
    hints.push("Reduce concurrent actions; prioritize coherence warnings across mission strips.");
  } else {
    hints.push("Review mission IARL/IHL/CAL strips before new operator actions.");
  }
  return [...new Set([...hints, ...ihlHints, ...calHints, ...nudges].filter(Boolean))].slice(0, 6);
}
__name(buildAclOperatorCoherenceHints, "buildAclOperatorCoherenceHints");
function buildAclSystemCoherenceHints(mode, coherenceContext = {}, ucipSnapshot = {}, amgSnapshot = {}, iarlSnapshot = {}, ihlSnapshot = {}, cbaSnapshot = {}) {
  const hints = (iarlSnapshot.iarlSystemResonanceHints || []).slice(0, 2);
  const ihlHints = (ihlSnapshot.ihlSystemIntentHints || []).slice(0, 1);
  const cbaHints = (cbaSnapshot.cbaSystemBehaviorHints || []).slice(0, 1);
  const policyHints = (amgSnapshot.amgPolicyHints || []).slice(0, 2).map(
    (entry) => typeof entry === "string" ? entry : `[${entry.surface || "os"}] ${entry.hint || ""}`
  );
  const { osCoherencePosture } = coherenceContext;
  if (osCoherencePosture.syncStatus !== "aligned") {
    hints.push(`OS sync: ${osCoherencePosture.syncStatus} \u2014 reconcile coherence across divisions.`);
  }
  if (osCoherencePosture.automationLoops > 0) {
    hints.push(`${osCoherencePosture.automationLoops} automation loop(s) \u2014 verify layer coherence before promotion.`);
  }
  if ((ucipSnapshot.ucipRecommendedActions || []).length) {
    hints.push(`UCIP meta-intelligence: ${(ucipSnapshot.ucipRecommendedActions || [])[0]}`);
  }
  if (mode === "coherence_red") {
    hints.push("ACL fallback: minimal advisory payload until IARL/IHL/CAL/CBA/AMG/UCIP recover.");
  }
  return [...new Set([...hints, ...ihlHints, ...cbaHints, ...policyHints].filter(Boolean))].slice(0, 6);
}
__name(buildAclSystemCoherenceHints, "buildAclSystemCoherenceHints");
function buildCloudflareAclFromIarl(iarlSnapshot = {}, ihlSnapshot = {}, calSnapshot = {}, cbaSnapshot = {}, amgSnapshot = {}, ucipSnapshot = {}, coherenceContext = {}) {
  const context = deriveAclCoherenceContext(iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, coherenceContext);
  const fragmentation = computeCoherenceFragmentationScore(context, iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const mode = computeAclMode(iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, context);
  const score2 = computeAclScore(iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot, mode, fragmentation);
  const health = deriveAclHealth(mode);
  const aclCoherenceFindings = buildAclCoherenceFindings(mode, context, iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const aclCoherenceWarnings = buildAclCoherenceWarnings(mode, context, iarlSnapshot, ihlSnapshot, calSnapshot, cbaSnapshot, amgSnapshot, ucipSnapshot);
  const aclOperatorCoherenceHints = buildAclOperatorCoherenceHints(mode, context, iarlSnapshot, ihlSnapshot, calSnapshot, amgSnapshot);
  const aclSystemCoherenceHints = buildAclSystemCoherenceHints(mode, context, ucipSnapshot, amgSnapshot, iarlSnapshot, ihlSnapshot, cbaSnapshot);
  const aclReasons = [
    `ACL mode: ${mode} (derived from IARL ${iarlSnapshot.iarlState?.mode || "resonance_yellow"} + IHL ${ihlSnapshot.ihlState?.mode || "intent_yellow"} + CAL ${calSnapshot.calState?.mode || "align_yellow"} + CBA ${cbaSnapshot.cbaState?.mode || "behavior_yellow"} + AMG ${amgSnapshot.amgState?.mode || "govern_yellow"} + UCIP ${ucipSnapshot.ucipState?.mode || "yellow"}).`,
    `Coherence fragmentation score: ${fragmentation}.`,
    ...(iarlSnapshot.iarlReasons || []).slice(0, 1),
    ...(ihlSnapshot.ihlReasons || []).slice(0, 1),
    mode === "coherence_red" && fragmentation >= 10 ? "Severe OS fragmentation or degraded upstream signals." : null
  ].filter(Boolean);
  return {
    aclState: { mode, score: score2, health },
    aclCoherenceFindings,
    aclCoherenceWarnings,
    aclOperatorCoherenceHints,
    aclSystemCoherenceHints,
    aclReasons,
    aclHealth: health,
    aclScore: score2,
    coherenceFragmentationScore: fragmentation,
    iarlUpstream: {
      mode: iarlSnapshot.iarlState?.mode,
      score: iarlSnapshot.iarlScore ?? iarlSnapshot.iarlState?.score ?? null
    },
    ihlUpstream: {
      mode: ihlSnapshot.ihlState?.mode,
      score: ihlSnapshot.ihlScore ?? ihlSnapshot.ihlState?.score ?? null
    },
    calUpstream: {
      mode: calSnapshot.calState?.mode,
      score: calSnapshot.calScore ?? calSnapshot.calState?.score ?? null
    },
    cbaUpstream: {
      mode: cbaSnapshot.cbaState?.mode,
      score: cbaSnapshot.cbaScore ?? cbaSnapshot.cbaState?.score ?? null
    },
    amgUpstream: {
      mode: amgSnapshot.amgState?.mode,
      score: amgSnapshot.amgScore ?? amgSnapshot.amgState?.score ?? null
    },
    ucipUpstream: {
      mode: ucipSnapshot.ucipState?.mode,
      score: ucipSnapshot.ucipScore ?? ucipSnapshot.ucipState?.score ?? null
    },
    advisoryOnly: true,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareAclFromIarl, "buildCloudflareAclFromIarl");
async function buildAclCoherenceContextFromEnv(governance = {}, env = {}, options = {}) {
  return buildIarlResonanceContextFromEnv(governance, env, options);
}
__name(buildAclCoherenceContextFromEnv, "buildAclCoherenceContextFromEnv");
async function getCloudflareAcl(governance = {}, env = {}, options = {}) {
  return runAdvisoryGuarded(
    async () => {
      const ucip = options.ucip || await getCloudflareUcip(governance, env, options);
      const amg = options.amg || buildCloudflareAmgFromUcip(ucip);
      const coherenceContext = options.coherenceContext || await buildAclCoherenceContextFromEnv(governance, env, options);
      const cba = options.cba || buildCloudflareCbaFromAmg(amg, ucip, coherenceContext);
      const cal = options.cal || buildCloudflareCalFromCba(cba, amg, ucip, coherenceContext);
      const ihl = options.ihl || buildCloudflareIhlFromCal(cal, cba, amg, ucip, coherenceContext);
      const iarl = options.iarl || buildCloudflareIarlFromIhl(ihl, cal, cba, amg, ucip, coherenceContext);
      return buildCloudflareAclFromIarl(iarl, ihl, cal, cba, amg, ucip, coherenceContext);
    },
    "acl",
    { cacheKeySuffix: metaAdvisoryCacheSuffix(options) }
  );
}
__name(getCloudflareAcl, "getCloudflareAcl");
function buildCloudflareSafetyAclFactor(aclSnapshot = {}) {
  const state = aclSnapshot.aclState || aclSnapshot;
  return {
    health: aclSnapshot.aclHealth || state.health || deriveAclHealth(state.mode),
    score: aclSnapshot.aclScore ?? state.score ?? null,
    mode: state.mode || "coherence_red",
    reasons: aclSnapshot.aclReasons || [],
    warningCount: (aclSnapshot.aclCoherenceWarnings || []).length,
    findingCount: (aclSnapshot.aclCoherenceFindings || []).length,
    advisoryOnly: true,
    checkedAt: aclSnapshot.checkedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCloudflareSafetyAclFactor, "buildCloudflareSafetyAclFactor");
function getModuleAclTag(aclMode = "coherence_yellow", moduleFields = {}) {
  const iarlTag = moduleFields.cloudflareIARLTag || "";
  const ihlTag = moduleFields.cloudflareIHLTag || "";
  const calTag = moduleFields.cloudflareCALTag || "";
  const cbaTag = moduleFields.cloudflareCBATag || "";
  const amgTag = moduleFields.cloudflareAMGTag || "";
  const ucipTag = moduleFields.cloudflareUCIPTag || "";
  const moduleRisk = moduleFields.cloudflareModuleRisk || "low";
  if (aclMode === "coherence_red" || aclMode === "coherence_orange" || moduleRisk === "high" || iarlTag === "IARL_MISMATCH" || ihlTag === "IHL_CONFLICT" || calTag === "CAL_MISALIGNED" || cbaTag === "CBA_RISK" || amgTag === "AMG_CAUTION" || ucipTag === "UCIP_RED") {
    return "ACL_FRAGMENTED";
  }
  if (aclMode === "coherence_yellow" || moduleRisk === "medium" || iarlTag === "IARL_PARTIAL" || ihlTag === "IHL_PARTIAL" || calTag === "CAL_PARTIAL" || cbaTag === "CBA_DRIFT" || amgTag === "AMG_REVIEW" || ucipTag === "UCIP_ORANGE" || ucipTag === "UCIP_YELLOW") {
    return "ACL_PARTIAL";
  }
  return "ACL_ALIGNED";
}
__name(getModuleAclTag, "getModuleAclTag");
function computeModuleAclFields(aclRuntime = {}, moduleFields = {}, moduleId = null) {
  const mode = aclRuntime.aclState?.mode || "coherence_yellow";
  const tag = getModuleAclTag(mode, moduleFields);
  const risk = tag === "ACL_FRAGMENTED" || moduleFields.cloudflareModuleRisk === "high" ? "high" : tag === "ACL_PARTIAL" || moduleFields.cloudflareModuleRisk === "medium" ? "medium" : "low";
  const highlight = tag === "ACL_FRAGMENTED" || tag === "ACL_PARTIAL" && moduleFields.cloudflareIARLHighlight;
  return {
    cloudflareACLTag: tag,
    cloudflareACLMode: mode,
    cloudflareACLRisk: risk,
    cloudflareACLHighlight: highlight,
    cloudflareACLScore: aclRuntime.aclScore ?? aclRuntime.aclState?.score ?? null,
    cloudflareACLModuleId: moduleId
  };
}
__name(computeModuleAclFields, "computeModuleAclFields");

// worker/index.js
var META_CLOUDFLARE_ADVISORY_DOMAINS = /* @__PURE__ */ new Set(["ucip", "amg", "cba", "cal", "ihl", "iarl", "acl"]);
async function resolveMetaIntelligenceStack(governance, env, inputs = {}, cacheSuffix = "default") {
  const { cloudflareUcip, moduleIds, heartbeat } = inputs;
  const resolved = await resolveCloudflareAdvisoryCall(
    async () => {
      const alignmentContext = await buildCalAlignmentContextFromEnv(governance, env, {
        moduleIds: moduleIds || modules2.map((entry) => entry.id),
        heartbeat
      });
      const cloudflareAmg = buildCloudflareAmgFromUcip(cloudflareUcip);
      const cloudflareCba = buildCloudflareCbaFromAmg(cloudflareAmg, cloudflareUcip, alignmentContext);
      const cloudflareCal = buildCloudflareCalFromCba(cloudflareCba, cloudflareAmg, cloudflareUcip, alignmentContext);
      const cloudflareIhl = buildCloudflareIhlFromCal(cloudflareCal, cloudflareCba, cloudflareAmg, cloudflareUcip, alignmentContext);
      const cloudflareIarl = buildCloudflareIarlFromIhl(cloudflareIhl, cloudflareCal, cloudflareCba, cloudflareAmg, cloudflareUcip, alignmentContext);
      const cloudflareAcl = buildCloudflareAclFromIarl(cloudflareIarl, cloudflareIhl, cloudflareCal, cloudflareCba, cloudflareAmg, cloudflareUcip, alignmentContext);
      return { cloudflareAmg, cloudflareCba, cloudflareCal, cloudflareIhl, cloudflareIarl, cloudflareAcl };
    },
    "meta-stack",
    { cacheKeySuffix: cacheSuffix, timeoutMs: ADVISORY_HEAVY_TIMEOUT_MS }
  );
  return resolved;
}
__name(resolveMetaIntelligenceStack, "resolveMetaIntelligenceStack");
var {
  moduleRegistry: moduleRegistry2,
  modules: modules2,
  packages: packages2,
  deliverables: deliverables2,
  deliverableDownloads: deliverableDownloads2,
  engagements: engagements2,
  identities: identities2,
  createId: createId2,
  createIdentityId: createIdentityId2,
  getModuleRoute: getModuleRoute2,
  getModuleStaticPath: getModuleStaticPath2
} = store_default;
var { deploymentReference: deploymentReference2 } = contracts_default;
var { validateIdentityRecord: validateIdentityRecord3 } = validate_default;
var {
  serviceCatalog: serviceCatalog2,
  normalizeSelectorAnswers: normalizeSelectorAnswers2,
  computeServiceSelectorResult: computeServiceSelectorResult2,
  recordServiceSelectorSubmission: recordServiceSelectorSubmission2,
  attachEngagementToSelector: attachEngagementToSelector2,
  listServiceIntakeQueue: listServiceIntakeQueue2,
  getServiceSelectorSubmission: getServiceSelectorSubmission2,
  getEngagementById: getEngagementById3,
  persistIntakeAgentRecord: persistIntakeAgentRecord2,
  persistSecurityIntakeRecord: persistSecurityIntakeRecord2,
  updateServiceIntakeStatus: updateServiceIntakeStatus2,
  serviceMarketplaceModules: serviceMarketplaceModules2
} = serviceSelector_default;
var {
  auditLiteMarketplaceModule: auditLiteMarketplaceModule2,
  normalizeAuditLiteAnswers: normalizeAuditLiteAnswers2,
  computeAuditLiteResult: computeAuditLiteResult2,
  recordAuditLiteSubmission: recordAuditLiteSubmission2,
  attachEngagementToAuditLite: attachEngagementToAuditLite2,
  listAuditLiteQueue: listAuditLiteQueue2
} = auditLite_default;
var {
  promptInjectionMarketplaceModule: promptInjectionMarketplaceModule2,
  normalizePromptInjectionAnswers: normalizePromptInjectionAnswers2,
  computePromptInjectionResult: computePromptInjectionResult2,
  recordPromptInjectionSubmission: recordPromptInjectionSubmission2,
  attachEngagementToPromptInjectionScan: attachEngagementToPromptInjectionScan2,
  listPromptInjectionScanQueue: listPromptInjectionScanQueue2
} = promptInjectionScanner_default;
var {
  agentReadinessMarketplaceModule: agentReadinessMarketplaceModule2,
  normalizeAgentReadinessAnswers: normalizeAgentReadinessAnswers2,
  computeAgentReadinessResult: computeAgentReadinessResult2,
  recordAgentReadinessSubmission: recordAgentReadinessSubmission2,
  attachEngagementToAgentReadiness: attachEngagementToAgentReadiness2,
  listAgentReadinessQueue: listAgentReadinessQueue2
} = agentReadinessChecker_default;
var {
  automationRoiMarketplaceModule: automationRoiMarketplaceModule2,
  normalizeAutomationRoiAnswers: normalizeAutomationRoiAnswers2,
  computeAutomationRoiResult: computeAutomationRoiResult2,
  recordAutomationRoiSubmission: recordAutomationRoiSubmission2,
  attachEngagementToAutomationRoi: attachEngagementToAutomationRoi2,
  listAutomationRoiQueue: listAutomationRoiQueue2
} = automationRoiCalculator_default;
var {
  ragRiskMarketplaceModule: ragRiskMarketplaceModule2,
  normalizeRagRiskAnswers: normalizeRagRiskAnswers2,
  computeRagRiskResult: computeRagRiskResult2,
  recordRagRiskSubmission: recordRagRiskSubmission2,
  attachEngagementToRagRisk: attachEngagementToRagRisk2,
  listRagRiskQueue: listRagRiskQueue2
} = ragRiskAnalyzer_default;
var {
  isOperatorSurfaceRequest: isOperatorSurfaceRequest2,
  startSecurityAudit: startSecurityAudit2,
  applySecurityAuditWebhook: applySecurityAuditWebhook2
} = cloudflareSecurityAudit_default;
var DEFAULT_HEADERS = { ...deploymentReference2.headers };
var STORE_CONFIG = {
  PAYLOADS: { envKey: "PAYLOADS", indexKey: "payload:index", prefix: "payload", limit: 250 },
  ESCALATIONS: { envKey: "ESCALATIONS", indexKey: "escalation:index", prefix: "escalation", limit: 250 },
  MODULES: { envKey: "MODULES", indexKey: "module:index", prefix: "module", limit: 250 },
  ROUTING_LOGS: { envKey: "ROUTING_LOGS", indexKey: "routing:index", prefix: "routing", limit: 500 },
  SEARCH_LOGS: { envKey: "SEARCH_LOGS", indexKey: "search:index", prefix: "search", limit: 250 },
  EVENTS: { envKey: "EVENTS", indexKey: "event:index", prefix: "event", limit: 500 },
  AUTONOMY_LOGS: { envKey: "AUTONOMY_LOGS", indexKey: "autonomy:index", prefix: "autonomy", limit: 250 },
  ECOSYSTEM: { envKey: "ECOSYSTEM", indexKey: "ecosystem:index", prefix: "ecosystem", limit: 100 },
  NOTIFICATIONS: { envKey: "NOTIFICATIONS", indexKey: "notification:index", prefix: "notification", limit: 250 },
  AUDIT: { envKey: "AUDIT", indexKey: "audit:index", prefix: "audit", limit: 500 },
  SCENARIOS: { envKey: "SCENARIOS", indexKey: "scenario:index", prefix: "scenario", limit: 100 },
  HEARTBEAT: { envKey: "HEARTBEAT", indexKey: "heartbeat:index", prefix: "heartbeat", limit: 20 },
  OS_ROUTING: { envKey: "OS_ROUTING", indexKey: "os-routing:index", prefix: "os-routing", limit: 250 },
  DIVISION_MEMORY: { envKey: "DIVISION_MEMORY", indexKey: "division-memory:index", prefix: "division-memory", limit: 500 },
  OPERATOR_INTENTS: { envKey: "OPERATOR_INTENTS", indexKey: "operator-intent:index", prefix: "operator-intent", limit: 250 },
  PIPELINES: { envKey: "PIPELINES", indexKey: "pipeline:index", prefix: "pipeline", limit: 250 },
  SANDBOX_LOGS: { envKey: "SANDBOX_LOGS", indexKey: "sandbox:index", prefix: "sandbox", limit: 250 },
  OS_CONFIG: { envKey: "OS_CONFIG", indexKey: "os-config:index", prefix: "os-config", limit: 100 },
  PUBLIC_SCENARIOS: { envKey: "PUBLIC_SCENARIOS", indexKey: "public-scenario:index", prefix: "public-scenario", limit: 100 },
  GOVERNANCE: { envKey: "GOVERNANCE", indexKey: "governance:index", prefix: "governance", limit: 250 },
  RELEASES: { envKey: "RELEASES", indexKey: "release:index", prefix: "release", limit: 250 },
  INTEGRATIONS: { envKey: "INTEGRATIONS", indexKey: "integration:index", prefix: "integration", limit: 250 },
  CERTIFICATION: { envKey: "CERTIFICATION", indexKey: "certification:index", prefix: "certification", limit: 250 }
};
var MEMORY_DATA = Object.fromEntries(Object.keys(STORE_CONFIG).map((key) => [key, /* @__PURE__ */ new Map()]));
var MEMORY_INDEX = Object.fromEntries(Object.keys(STORE_CONFIG).map((key) => [key, []]));
var AGENTS = ["route-advisory", "payload-generator", "operator-sentinel", "marketplace-sync"];
var worker_default = {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const redirectRule = getRedirect(url.pathname);
      if (redirectRule) {
        return redirect(redirectRule.location, redirectRule.status);
      }
      if (url.pathname.startsWith("/doctrine/")) {
        return doctrine_default(request, env, url);
      }
      if (url.pathname === "/marketplace/ecosystem") {
        return json2(await computeEcosystemData(env));
      }
      if (url.pathname === "/marketplace/search") {
        return handleMarketplaceSearch(request, env, url, true);
      }
      if (url.pathname === "/" || url.pathname === "/index.html") {
        return serveStatic(request, env, "/index.html");
      }
      if (url.pathname === "/services" || url.pathname === "/services/") {
        return serveStatic(request, env, "/services.html");
      }
      if (url.pathname === "/apps/ai-security-audit" || url.pathname === "/apps/ai-security-audit/") {
        return serveStatic(request, env, "/ai-security-audit.html");
      }
      if (url.pathname === "/apps/prompt-injection-scanner" || url.pathname === "/apps/prompt-injection-scanner/") {
        return serveStatic(request, env, "/prompt-injection-scanner.html");
      }
      if (url.pathname === "/apps/ai-agent-readiness-checker" || url.pathname === "/apps/ai-agent-readiness-checker/") {
        return serveStatic(request, env, "/ai-agent-readiness-checker.html");
      }
      if (url.pathname === "/apps/automation-roi-calculator" || url.pathname === "/apps/automation-roi-calculator/") {
        return serveStatic(request, env, "/automation-roi-calculator.html");
      }
      if (url.pathname === "/apps/rag-risk-analyzer" || url.pathname === "/apps/rag-risk-analyzer/") {
        return serveStatic(request, env, "/rag-risk-analyzer.html");
      }
      if (url.pathname === "/operator" || url.pathname === "/operator/") {
        return serveStatic(request, env, "/operator.html");
      }
      if (url.pathname === "/operator/service-intake" || url.pathname === "/operator/service-intake/") {
        return serveStatic(request, env, "/service-intake.html");
      }
      if (url.pathname === "/operator/audit-lite" || url.pathname === "/operator/audit-lite/") {
        return serveStatic(request, env, "/audit-lite-operator.html");
      }
      if (url.pathname === "/operator/prompt-injection-scans" || url.pathname === "/operator/prompt-injection-scans/") {
        return serveStatic(request, env, "/prompt-injection-scans-operator.html");
      }
      if (url.pathname === "/operator/agent-readiness" || url.pathname === "/operator/agent-readiness/") {
        return serveStatic(request, env, "/agent-readiness-operator.html");
      }
      if (url.pathname === "/operator/automation-roi" || url.pathname === "/operator/automation-roi/") {
        return serveStatic(request, env, "/automation-roi-operator.html");
      }
      if (url.pathname === "/operator/rag-risk" || url.pathname === "/operator/rag-risk/") {
        return serveStatic(request, env, "/rag-risk-operator.html");
      }
      if (url.pathname === "/operator/agents/intake" || url.pathname === "/operator/agents/intake/") {
        return serveStatic(request, env, "/operator-agents-intake.html");
      }
      if (url.pathname === "/operator/agents/security-intake" || url.pathname === "/operator/agents/security-intake/") {
        return serveStatic(request, env, "/operator-agents-security-intake.html");
      }
      if (url.pathname === "/enter" || url.pathname === "/enter/") {
        return serveStatic(request, env, "/enter.html");
      }
      if (url.pathname === "/marketplace" || url.pathname === "/marketplace/") {
        const wantsJson = url.searchParams.get("format") === "json" || (request.headers.get("accept") || "").includes("application/json");
        if (!wantsJson) {
          return serveStatic(request, env, "/marketplace.html");
        }
        return handleMarketplaceIndex(request, env, url);
      }
      if (url.pathname === "/api-explorer" || url.pathname === "/api-explorer/") {
        return serveStatic(request, env, "/api-explorer.html");
      }
      const dynamicModuleMatch = url.pathname.match(/^\/marketplace\/([a-z0-9-]+)$/);
      if (dynamicModuleMatch) {
        return renderDynamicModulePage(env, dynamicModuleMatch[1]);
      }
      if (url.pathname.startsWith("/api/")) {
        return handleApi(request, env, url);
      }
      return serveStatic(request, env, url.pathname);
    } catch (error) {
      const url = new URL(request.url);
      const isApi = url.pathname.startsWith("/api/");
      const message = error instanceof Error ? error.message : "Unexpected worker error";
      console.error("worker-fetch-failed", request.method, url.pathname, message);
      if (isApi) {
        return json2({ error: "Worker request failed", message }, 500, { "Cache-Control": "no-store" });
      }
      return html(
        `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>MSHOPS.NET | Worker Error</title></head><body><main><h1>Temporary Worker Error</h1><p>The request could not be completed in the Worker runtime.</p></main></body></html>`,
        500,
        { "Cache-Control": "no-store" }
      );
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const actions = await runAutonomyLoopV2(env, event.cron);
        await updateHeartbeatSnapshot(env, {
          lastAutonomyLoopRun: (/* @__PURE__ */ new Date()).toISOString(),
          autonomyActionCount: actions.length,
          cron: event.cron
        });
        const osHeartbeat = await computeOsHeartbeat(env);
        await putRecord(env, "HEARTBEAT", "os-heartbeat", {
          id: "os-heartbeat",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          ...osHeartbeat
        });
      })()
    );
  }
};
function getRedirect(pathname) {
  if (pathname === "/home") {
    return { status: 301, location: deploymentReference2.redirects["/home"] };
  }
  if (pathname === "/book") {
    return { status: 302, location: deploymentReference2.redirects["/book"] };
  }
  if (pathname === "/report") {
    return { status: 302, location: deploymentReference2.redirects["/report"] };
  }
  return null;
}
__name(getRedirect, "getRedirect");
function json2(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}
__name(json2, "json");
async function jsonCloudflareRoute(handler, domain, options = {}) {
  try {
    const advisoryOptions = META_CLOUDFLARE_ADVISORY_DOMAINS.has(domain) ? { timeoutMs: ADVISORY_HEAVY_TIMEOUT_MS, cacheTtlMs: ADVISORY_CACHE_TTL_MS, ...options } : { timeoutMs: ADVISORY_TIMEOUT_MS, cacheTtlMs: ADVISORY_CACHE_TTL_MS, ...options };
    const payload = META_CLOUDFLARE_ADVISORY_DOMAINS.has(domain) ? await handler() : await resolveCloudflareFederationRoute(handler, domain, advisoryOptions);
    return json2({
      ...payload || {},
      advisoryOnly: payload?.advisoryOnly !== false
    });
  } catch (error) {
    return json2(buildCloudflareAdvisoryFallback(domain, error));
  }
}
__name(jsonCloudflareRoute, "jsonCloudflareRoute");
function html(payload, status = 200, headers = {}) {
  return new Response(payload, {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      ...headers
    }
  });
}
__name(html, "html");
function text(payload, status = 200, headers = {}) {
  return new Response(payload, {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
      ...headers
    }
  });
}
__name(text, "text");
function redirect(location, status) {
  return new Response(null, {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      Location: location
    }
  });
}
__name(redirect, "redirect");
function notFound() {
  return json2({ error: "Not found" }, 404);
}
__name(notFound, "notFound");
async function readBody2(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}
__name(readBody2, "readBody");
function normalizeText12(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(normalizeText12, "normalizeText");
function normalizeNullable2(value) {
  const normalized = normalizeText12(value);
  return normalized || null;
}
__name(normalizeNullable2, "normalizeNullable");
function normalizeEmail(value) {
  return normalizeText12(value).toLowerCase();
}
__name(normalizeEmail, "normalizeEmail");
function normalizeAnnotationPayload(payload) {
  return {
    annotation: normalizeText12(payload.annotation || payload.note)
  };
}
__name(normalizeAnnotationPayload, "normalizeAnnotationPayload");
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return table[character];
  });
}
__name(escapeHtml, "escapeHtml");
function resolveStaticPath(requestPath) {
  const normalizedRequestPath = String(requestPath || "/").replace(/\\/g, "/");
  if (normalizedRequestPath === "/" || normalizedRequestPath === "/index.html") {
    return "/index.html";
  }
  if (normalizedRequestPath === "/services" || normalizedRequestPath === "/services/") {
    return "/services.html";
  }
  if (normalizedRequestPath === "/apps/ai-security-audit" || normalizedRequestPath === "/apps/ai-security-audit/") {
    return "/ai-security-audit.html";
  }
  if (normalizedRequestPath === "/apps/prompt-injection-scanner" || normalizedRequestPath === "/apps/prompt-injection-scanner/") {
    return "/prompt-injection-scanner.html";
  }
  if (normalizedRequestPath === "/apps/ai-agent-readiness-checker" || normalizedRequestPath === "/apps/ai-agent-readiness-checker/") {
    return "/ai-agent-readiness-checker.html";
  }
  if (normalizedRequestPath === "/apps/automation-roi-calculator" || normalizedRequestPath === "/apps/automation-roi-calculator/") {
    return "/automation-roi-calculator.html";
  }
  if (normalizedRequestPath === "/apps/rag-risk-analyzer" || normalizedRequestPath === "/apps/rag-risk-analyzer/") {
    return "/rag-risk-analyzer.html";
  }
  if (normalizedRequestPath === "/operator" || normalizedRequestPath === "/operator/") {
    return "/operator.html";
  }
  if (normalizedRequestPath === "/operator/service-intake" || normalizedRequestPath === "/operator/service-intake/") {
    return "/service-intake.html";
  }
  if (normalizedRequestPath === "/operator/audit-lite" || normalizedRequestPath === "/operator/audit-lite/") {
    return "/audit-lite-operator.html";
  }
  if (normalizedRequestPath === "/operator/prompt-injection-scans" || normalizedRequestPath === "/operator/prompt-injection-scans/") {
    return "/prompt-injection-scans-operator.html";
  }
  if (normalizedRequestPath === "/operator/agent-readiness" || normalizedRequestPath === "/operator/agent-readiness/") {
    return "/agent-readiness-operator.html";
  }
  if (normalizedRequestPath === "/operator/automation-roi" || normalizedRequestPath === "/operator/automation-roi/") {
    return "/automation-roi-operator.html";
  }
  if (normalizedRequestPath === "/operator/rag-risk" || normalizedRequestPath === "/operator/rag-risk/") {
    return "/rag-risk-operator.html";
  }
  if (normalizedRequestPath === "/operator/agents/intake" || normalizedRequestPath === "/operator/agents/intake/") {
    return "/operator-agents-intake.html";
  }
  if (normalizedRequestPath === "/operator/agents/security-intake" || normalizedRequestPath === "/operator/agents/security-intake/") {
    return "/operator-agents-security-intake.html";
  }
  if (normalizedRequestPath === "/enter" || normalizedRequestPath === "/enter/") {
    return "/enter.html";
  }
  if (normalizedRequestPath === "/marketplace" || normalizedRequestPath === "/marketplace/") {
    return "/marketplace.html";
  }
  if (normalizedRequestPath === "/os" || normalizedRequestPath === "/os/") {
    return "/os.html";
  }
  if (normalizedRequestPath === "/api-explorer" || normalizedRequestPath === "/api-explorer/") {
    return "/api-explorer.html";
  }
  if (normalizedRequestPath === "/mission" || normalizedRequestPath === "/mission/") {
    return "/mission.html";
  }
  const moduleRoute = normalizedRequestPath.match(/^\/marketplace\/modules\/([a-z0-9-]+)$/);
  if (moduleRoute) {
    return getModuleStaticPath2(moduleRoute[1]);
  }
  return normalizedRequestPath;
}
__name(resolveStaticPath, "resolveStaticPath");
async function serveStatic(request, env, pathname) {
  const targetUrl = new URL(request.url);
  targetUrl.pathname = resolveStaticPath(pathname);
  let response = await env.ASSETS.fetch(new Request(targetUrl, request));
  if (response.status === 404 && !targetUrl.pathname.includes(".") && targetUrl.pathname !== "/index.html") {
    const fallbackUrl = new URL(request.url);
    fallbackUrl.pathname = "/index.html";
    response = await env.ASSETS.fetch(new Request(fallbackUrl, request));
  }
  return withDefaultHeaders(response);
}
__name(serveStatic, "serveStatic");
function withDefaultHeaders(response) {
  const next = new Response(response.body, response);
  for (const [key, value] of Object.entries(DEFAULT_HEADERS)) {
    next.headers.set(key, value);
  }
  return next;
}
__name(withDefaultHeaders, "withDefaultHeaders");
function getModuleById(id) {
  return modules2.find((entry) => entry.id === id);
}
__name(getModuleById, "getModuleById");
function getDeliverableById(id) {
  return deliverables2.find((entry) => entry.id === id);
}
__name(getDeliverableById, "getDeliverableById");
function getPackageById(id) {
  return packages2.find((entry) => entry.id === id);
}
__name(getPackageById, "getPackageById");
function serializeModuleSummary(moduleEntry) {
  return {
    id: moduleEntry.id,
    name: moduleEntry.name,
    description: moduleEntry.description,
    tags: [...moduleEntry.tags],
    status: moduleEntry.status,
    metadata: {
      ...moduleEntry.metadata,
      accessInstructions: [...moduleEntry.metadata.accessInstructions],
      features: [...moduleEntry.metadata.features],
      scenarioIds: [...moduleEntry.metadata.scenarioIds || []]
    },
    lastUpdated: moduleEntry.lastUpdated
  };
}
__name(serializeModuleSummary, "serializeModuleSummary");
function serializeModuleMetadata(record) {
  return {
    ...record,
    tags: [...record.tags],
    access_instructions: [...record.access_instructions || []],
    features: [...record.features || []],
    route: getModuleRoute2(record.id),
    static_path: getModuleStaticPath2(record.id),
    lastUpdated: record.updated_at || record.created_at || null
  };
}
__name(serializeModuleMetadata, "serializeModuleMetadata");
function moduleToCatalogItem(module) {
  const cfCompatibility = getModuleCfCompatibility(module.id);
  return {
    id: module.id,
    name: module.name,
    description: module.description,
    tags: [...module.tags || []],
    status: module.status,
    kind: module.metadata.kind,
    price: module.metadata.price,
    service_tier: module.metadata.service_tier,
    compliance_tags: [...module.metadata.compliance_tags || []],
    ttx_eligible: module.metadata.ttx_eligible,
    ttxEligible: module.metadata.ttxEligible,
    scenarioIds: [...module.metadata.scenarioIds || []],
    launchPath: module.metadata.launchPath,
    deployment_target: module.metadata.deployment_target,
    access_level: module.metadata.access_level,
    accessLevel: module.metadata.accessLevel,
    source: module.metadata.source,
    capabilities: [...module.metadata.capabilities || []],
    lastUpdated: module.lastUpdated,
    cloudflareFederation: cfCompatibility,
    cfReadyPlus: cfCompatibility.cfReadyPlus,
    cfActionCompatibility: cfCompatibility.actions
  };
}
__name(moduleToCatalogItem, "moduleToCatalogItem");
function serializeIdentity(identity) {
  return {
    id: identity.id,
    operator_handle: identity.operator_handle,
    organization: identity.organization,
    contact_email: identity.contact_email,
    transmission: identity.transmission,
    source_page: identity.source_page,
    package_interest: identity.package_interest,
    module_interest: identity.module_interest,
    urgency: identity.urgency,
    auto_reply_sent: identity.auto_reply_sent,
    contacted_at: identity.contacted_at,
    status: identity.status
  };
}
__name(serializeIdentity, "serializeIdentity");
function normalizeIdentityPayload(payload, fallbackSourcePage, request) {
  const identity = {
    id: payload.id || void 0,
    operator_handle: normalizeText12(payload.operator_handle || payload.name || payload.operatorHandle),
    organization: normalizeNullable2(payload.organization || payload.org || payload.company),
    contact_email: normalizeEmail(payload.contact_email || payload.email || payload.contactEmail),
    transmission: normalizeText12(payload.transmission || payload.message || payload.notes),
    source_page: normalizeText12(payload.source_page || payload.source || fallbackSourcePage) || void 0,
    package_interest: normalizeNullable2(payload.package_interest || payload.packageId || payload.packageIdValue),
    module_interest: normalizeNullable2(payload.module_interest || payload.moduleId),
    urgency: normalizeNullable2(payload.urgency),
    utm_source: normalizeNullable2(payload.utm_source),
    utm_medium: normalizeNullable2(payload.utm_medium),
    auto_reply_sent: Boolean(payload.auto_reply_sent),
    contacted_at: payload.contacted_at || (/* @__PURE__ */ new Date()).toISOString(),
    ip_address: request.headers.get("CF-Connecting-IP"),
    status: normalizeText12(payload.status) || "new"
  };
  validateIdentityRecord3(identity);
  return identity;
}
__name(normalizeIdentityPayload, "normalizeIdentityPayload");
function normalizeEngagementPayload(payload) {
  return {
    packageId: normalizeNullable2(payload.package_interest || payload.packageId),
    operatorHandle: normalizeText12(payload.operator_handle || payload.name || payload.operatorHandle || payload.contactName),
    organization: normalizeNullable2(payload.organization || payload.org || payload.company),
    contactEmail: normalizeEmail(payload.contact_email || payload.email || payload.contactEmail),
    transmission: normalizeText12(payload.transmission || payload.message || payload.notes),
    source: normalizeText12(payload.source || payload.source_page) || "landing",
    moduleInterest: normalizeNullable2(payload.module_interest || payload.moduleId),
    urgency: normalizeNullable2(payload.urgency),
    selectorId: normalizeNullable2(payload.selector_id || payload.selectorId),
    recommendedService: normalizeNullable2(payload.recommended_service || payload.recommendedService || payload.service),
    secondaryService: normalizeNullable2(payload.secondary_service || payload.secondaryService),
    priority: normalizeNullable2(payload.priority),
    revenuePotential: normalizeNullable2(payload.revenue_potential || payload.revenuePotential),
    urgencyScore: Number.isFinite(Number(payload.urgency_score)) ? Number(payload.urgency_score) : null,
    auditId: normalizeNullable2(payload.audit_id || payload.auditId),
    scanId: normalizeNullable2(payload.scan_id || payload.scanId),
    agentCheckId: normalizeNullable2(payload.agent_check_id || payload.agentCheckId),
    automationRoiId: normalizeNullable2(payload.automation_roi_id || payload.automationRoiId),
    ragRiskId: normalizeNullable2(payload.rag_risk_id || payload.ragRiskId),
    riskScore: Number.isFinite(Number(payload.risk_score)) ? Number(payload.risk_score) : null,
    injectionScore: Number.isFinite(Number(payload.injection_score)) ? Number(payload.injection_score) : null,
    readinessScore: Number.isFinite(Number(payload.readiness_score)) ? Number(payload.readiness_score) : null,
    roiScore: Number.isFinite(Number(payload.roi_score)) ? Number(payload.roi_score) : null,
    ragRiskScore: Number.isFinite(Number(payload.rag_risk_score)) ? Number(payload.rag_risk_score) : null,
    riskTier: normalizeNullable2(payload.risk_tier || payload.riskTier),
    readinessTier: normalizeNullable2(payload.readiness_tier || payload.readinessTier),
    roiTier: normalizeNullable2(payload.roi_tier || payload.roiTier),
    ragRiskTier: normalizeNullable2(payload.rag_risk_tier || payload.ragRiskTier),
    estimatedMonthlySavings: Number.isFinite(Number(payload.estimated_monthly_savings)) ? Number(payload.estimated_monthly_savings) : null,
    estimatedAnnualSavings: Number.isFinite(Number(payload.estimated_annual_savings)) ? Number(payload.estimated_annual_savings) : null,
    hoursSavedPerMonth: Number.isFinite(Number(payload.hours_saved_per_month)) ? Number(payload.hours_saved_per_month) : null,
    retrievalExposureLevel: normalizeNullable2(payload.retrieval_exposure_level || payload.retrievalExposureLevel),
    accessControlLevel: normalizeNullable2(payload.access_control_level || payload.accessControlLevel),
    governanceMaturity: normalizeNullable2(payload.governance_maturity || payload.governanceMaturity),
    buildComplexity: normalizeNullable2(payload.build_complexity || payload.buildComplexity),
    automationComplexity: normalizeNullable2(payload.automation_complexity || payload.automationComplexity),
    safetyLevel: normalizeNullable2(payload.safety_level || payload.safetyLevel)
  };
}
__name(normalizeEngagementPayload, "normalizeEngagementPayload");
function normalizeIntentPayload(payload) {
  return {
    intent: normalizeText12(payload.intent),
    source: normalizeText12(payload.source) || "public-landing",
    agent: normalizeText12(payload.agent) || "route-advisory"
  };
}
__name(normalizeIntentPayload, "normalizeIntentPayload");
function buildId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().split("-")[0]}`;
}
__name(buildId, "buildId");
function getStoreBinding(env, logicalName) {
  return env[STORE_CONFIG[logicalName].envKey] || null;
}
__name(getStoreBinding, "getStoreBinding");
function getRecordKey(logicalName, id) {
  return `${STORE_CONFIG[logicalName].prefix}:${id}`;
}
__name(getRecordKey, "getRecordKey");
async function readIndex(env, logicalName) {
  const binding = getStoreBinding(env, logicalName);
  const config = STORE_CONFIG[logicalName];
  if (binding) {
    const raw = await binding.get(config.indexKey);
    return raw ? JSON.parse(raw) : [];
  }
  return [...MEMORY_INDEX[logicalName]];
}
__name(readIndex, "readIndex");
async function writeIndex(env, logicalName, entries) {
  const binding = getStoreBinding(env, logicalName);
  const config = STORE_CONFIG[logicalName];
  if (binding) {
    await binding.put(config.indexKey, JSON.stringify(entries));
    return;
  }
  MEMORY_INDEX[logicalName].splice(0, MEMORY_INDEX[logicalName].length, ...entries);
}
__name(writeIndex, "writeIndex");
function buildIndexSummary(logicalName, record) {
  if (logicalName === "PAYLOADS") {
    return {
      id: record.id,
      agent: record.agent,
      source: record.source,
      createdAt: record.createdAt,
      summary: record.summary,
      chain: record.chain
    };
  }
  if (logicalName === "ESCALATIONS") {
    return {
      id: record.id,
      payloadId: record.payloadId,
      severity: record.severity,
      createdAt: record.createdAt,
      summary: record.summary,
      resolved: Boolean(record.resolvedAt)
    };
  }
  if (logicalName === "MODULES") {
    return {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      summary: record.summary,
      publicUrl: record.publicUrl,
      published: Boolean(record.publishedAt)
    };
  }
  if (logicalName === "ROUTING_LOGS") {
    return {
      id: record.id,
      agent: record.agent,
      intent: record.intent,
      timestamp: record.timestamp,
      summary: record.summary
    };
  }
  if (logicalName === "SEARCH_LOGS") {
    return {
      id: record.id,
      query: record.query,
      timestamp: record.timestamp,
      resultCount: record.resultCount,
      source: record.source
    };
  }
  if (logicalName === "EVENTS") {
    return {
      id: record.id,
      type: record.type,
      timestamp: record.timestamp,
      details: record.details
    };
  }
  if (logicalName === "DIVISION_MEMORY") {
    return {
      id: record.id,
      key: record.key,
      type: record.type,
      updatedAt: record.updatedAt,
      summary: record.summary || record.value
    };
  }
  if (logicalName === "OS_ROUTING") {
    return {
      id: record.id,
      intent: record.intent,
      createdAt: record.createdAt,
      pipeline: record.pipeline
    };
  }
  if (logicalName === "OPERATOR_INTENTS") {
    return {
      id: record.id,
      goal: record.goal,
      priority: record.priority,
      createdAt: record.createdAt
    };
  }
  if (logicalName === "PIPELINES") {
    return {
      id: record.id,
      moduleId: record.moduleId,
      createdAt: record.createdAt,
      status: record.status
    };
  }
  if (logicalName === "SANDBOX_LOGS") {
    return {
      id: record.id,
      agent: record.agent,
      createdAt: record.createdAt,
      summary: record.summary
    };
  }
  if (logicalName === "OS_CONFIG") {
    return {
      id: record.id,
      key: record.key,
      updatedAt: record.updatedAt
    };
  }
  if (logicalName === "PUBLIC_SCENARIOS") {
    return {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      stepCount: record.steps?.length || 0
    };
  }
  return {
    id: record.id,
    triggerPayloadId: record.triggerPayloadId,
    agent: record.agent,
    createdAt: record.createdAt,
    reason: record.reason
  };
}
__name(buildIndexSummary, "buildIndexSummary");
async function putRecord(env, logicalName, id, record) {
  const binding = getStoreBinding(env, logicalName);
  const key = getRecordKey(logicalName, id);
  const index = await readIndex(env, logicalName);
  const summary = buildIndexSummary(logicalName, record);
  const nextIndex = [summary, ...index.filter((entry) => entry.id !== id)].slice(0, STORE_CONFIG[logicalName].limit);
  if (binding) {
    await binding.put(key, JSON.stringify(record));
    await writeIndex(env, logicalName, nextIndex);
    return;
  }
  MEMORY_DATA[logicalName].set(key, record);
  await writeIndex(env, logicalName, nextIndex);
}
__name(putRecord, "putRecord");
async function getRecord(env, logicalName, id) {
  const binding = getStoreBinding(env, logicalName);
  const key = getRecordKey(logicalName, id);
  if (binding) {
    const raw = await binding.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  return MEMORY_DATA[logicalName].get(key) || null;
}
__name(getRecord, "getRecord");
async function deleteRecord(env, logicalName, id) {
  const binding = getStoreBinding(env, logicalName);
  const key = getRecordKey(logicalName, id);
  const index = await readIndex(env, logicalName);
  const nextIndex = index.filter((entry) => entry.id !== id);
  if (binding) {
    await binding.delete(key);
    await writeIndex(env, logicalName, nextIndex);
    return;
  }
  MEMORY_DATA[logicalName].delete(key);
  await writeIndex(env, logicalName, nextIndex);
}
__name(deleteRecord, "deleteRecord");
async function listRecords(env, logicalName, limit = 10) {
  const index = await readIndex(env, logicalName);
  const results = [];
  for (const entry of index.slice(0, limit)) {
    const record = await getRecord(env, logicalName, entry.id);
    if (record) {
      results.push(record);
    }
  }
  return results;
}
__name(listRecords, "listRecords");
async function emitEvent(env, type, fields = {}) {
  const event = {
    id: buildId("ev"),
    type,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    payloadId: fields.payloadId || null,
    moduleId: fields.moduleId || null,
    escalationId: fields.escalationId || null,
    agent: fields.agent || null,
    details: fields.details || ""
  };
  await putRecord(env, "EVENTS", event.id, event);
  await maybeCreateNotification(env, event);
  return event;
}
__name(emitEvent, "emitEvent");
async function maybeCreateNotification(env, event) {
  const notificationMap = {
    "escalation-created": "Escalation created",
    "module-published": "Module published",
    "autonomy-loop-action": "Autonomy loop action",
    "operator-command-executed": "Operator command executed",
    "agent-failed": "Agent failure detected",
    "heartbeat-warning": "Heartbeat warning"
  };
  if (!notificationMap[event.type]) {
    return null;
  }
  const notification = {
    id: buildId("notif"),
    type: event.type,
    title: notificationMap[event.type],
    details: event.details,
    createdAt: event.timestamp,
    readAt: null,
    payloadId: event.payloadId,
    moduleId: event.moduleId,
    escalationId: event.escalationId,
    agent: event.agent
  };
  await putRecord(env, "NOTIFICATIONS", notification.id, notification);
  return notification;
}
__name(maybeCreateNotification, "maybeCreateNotification");
async function markNotificationRead(env, notificationId) {
  const notification = await getRecord(env, "NOTIFICATIONS", notificationId);
  if (!notification) {
    return null;
  }
  notification.readAt = (/* @__PURE__ */ new Date()).toISOString();
  await putRecord(env, "NOTIFICATIONS", notification.id, notification);
  return notification;
}
__name(markNotificationRead, "markNotificationRead");
async function recordAudit(env, action, details, operator = "system") {
  const auditRecord = {
    id: buildId("audit"),
    operator,
    action,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    details
  };
  await putRecord(env, "AUDIT", auditRecord.id, auditRecord);
  return auditRecord;
}
__name(recordAudit, "recordAudit");
function getIdentityDescriptor() {
  return {
    division: "MSHOPS.NET - AI Operator Division",
    version: "v3.5",
    agents: [...AGENTS],
    autonomy: "v2",
    operatorConsole: "/operator",
    marketplace: "/marketplace",
    operatingSystem: "/os",
    governance: "/api/os/governance",
    release: "/api/os/releases",
    integrations: "/api/os/integration",
    certification: "/api/os/certification",
    safety: "/api/os/safety/check",
    versioning: "/api/os/version",
    cloudflare: "/api/os/cloudflare",
    cloudflareDocs: "/api/os/cloudflare/docs",
    cloudflareFederation: "/api/os/federation/cloudflare",
    cloudflareReleases: "/api/os/releases/cloudflare"
  };
}
__name(getIdentityDescriptor, "getIdentityDescriptor");
var DEFAULT_OS_CONFIG = {
  routingThresholds: {
    autoChainConfidence: 0.56,
    escalationSeverity: 61
  },
  autonomyLoopTriggers: ["error", "failure", "issue", "update", "refresh", "sync"],
  modulePublishRules: {
    autoPublishSynced: true,
    requireOperatorReviewAboveSeverity: 80
  },
  pipelineDefaults: ["payload-generator", "marketplace-sync", "operator-sentinel"]
};
var DEFAULT_GOVERNANCE = {
  autonomyThresholds: {
    maxAutoChainLength: 4,
    maxPipelineSteps: 6,
    maxScenarioSteps: 6,
    allowSandbox: true
  },
  escalationPolicies: {
    severityThreshold: 61,
    operatorReviewAboveSeverity: 80
  },
  chainLengthLimits: {
    default: 4,
    pipeline: 4,
    scenario: 4,
    publicScenario: 4
  },
  agentSafetyRules: Object.fromEntries(
    AGENTS.map((agent) => [
      agent,
      {
        enabled: true,
        requireCertification: agent !== "route-advisory"
      }
    ])
  ),
  pipelineSafetyRules: {
    allowUncertifiedAgents: false,
    maxSteps: 6
  },
  scenarioSafetyRules: {
    allowUncertifiedAgents: false,
    maxSteps: 6
  },
  operatorOverrideRules: {
    allowManualBypass: false
  },
  externalIntegrationPermissions: {
    allowRoute: true,
    allowPipeline: true,
    allowScenario: true
  },
  cloudflareSafetyRules: {
    blockOnMcpOffline: false,
    requireObservabilityReachable: false
  }
};
var DEFAULT_OS_VERSION = {
  current: "v3.5",
  history: ["v1.0", "v2.0", "v3.0", "v3.5"],
  lastUpgrade: (/* @__PURE__ */ new Date()).toISOString()
};
async function getOsConfig(env) {
  const current = await getRecord(env, "OS_CONFIG", "current");
  return current?.value || DEFAULT_OS_CONFIG;
}
__name(getOsConfig, "getOsConfig");
async function saveOsConfig(env, value, source = "operator") {
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const record = {
    id: "current",
    key: "current",
    value,
    updatedAt,
    source
  };
  await putRecord(env, "OS_CONFIG", record.id, record);
  const historyId = buildId("config");
  await putRecord(env, "OS_CONFIG", historyId, {
    id: historyId,
    key: "history",
    value,
    updatedAt,
    source
  });
  return record;
}
__name(saveOsConfig, "saveOsConfig");
async function getGovernanceConfig(env) {
  const current = await getRecord(env, "GOVERNANCE", "current");
  return current?.value || DEFAULT_GOVERNANCE;
}
__name(getGovernanceConfig, "getGovernanceConfig");
async function saveGovernanceConfig(env, value, source = "operator") {
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const record = {
    id: "current",
    key: "current",
    value,
    updatedAt,
    source
  };
  await putRecord(env, "GOVERNANCE", record.id, record);
  const historyId = buildId("governance-config");
  await putRecord(env, "GOVERNANCE", historyId, {
    id: historyId,
    key: "config-history",
    value,
    updatedAt,
    source
  });
  return record;
}
__name(saveGovernanceConfig, "saveGovernanceConfig");
async function storeGovernanceDecision(env, decision) {
  const cloudflareSignals = await getCloudflareGovernanceSignals();
  const record = {
    id: buildId("governance"),
    type: "decision",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    cloudflareSignals,
    ...decision
  };
  await putRecord(env, "GOVERNANCE", record.id, record);
  await emitEvent(env, record.allowed ? "governance-allowed" : "governance-blocked", {
    agent: record.agent || null,
    details: record.allowed ? `Governance allowed ${record.surface || "execution"} for ${record.agent || "system"}.` : `Governance blocked ${record.surface || "execution"} for ${record.agent || "system"}: ${record.reason}.`
  });
  return record;
}
__name(storeGovernanceDecision, "storeGovernanceDecision");
async function getRecentGovernanceDecisions(env, limit = 50) {
  const records = await listRecords(env, "GOVERNANCE", limit + 10);
  return records.filter((entry) => entry.type === "decision").slice(0, limit);
}
__name(getRecentGovernanceDecisions, "getRecentGovernanceDecisions");
async function getOsVersion(env) {
  const current = await getRecord(env, "DIVISION_MEMORY", "os-version");
  return current?.value || DEFAULT_OS_VERSION;
}
__name(getOsVersion, "getOsVersion");
async function saveOsVersion(env, value, source = "operator") {
  const versionRecord = {
    id: "os-version",
    key: "os-version",
    type: "system-version",
    value,
    summary: `Division OS version ${value.current}.`,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    source
  };
  await putRecord(env, "DIVISION_MEMORY", versionRecord.id, versionRecord);
  await emitEvent(env, "os-version-updated", {
    details: `OS version updated to ${value.current}.`
  });
  return value;
}
__name(saveOsVersion, "saveOsVersion");
async function listIntegrations(env) {
  return listRecords(env, "INTEGRATIONS", 100);
}
__name(listIntegrations, "listIntegrations");
async function createIntegration(env, payload) {
  const endpoint = normalizeText12(payload.endpoint);
  const integration = {
    id: buildId("int"),
    name: normalizeText12(payload.name) || "Unnamed Integration",
    type: normalizeText12(payload.type) || "api",
    endpoint,
    permissions: Array.isArray(payload.permissions) ? payload.permissions.map((entry) => normalizeText12(entry)).filter(Boolean) : [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await putRecord(env, "INTEGRATIONS", integration.id, integration);
  await emitEvent(env, "integration-created", {
    details: `Integration ${integration.name} created.`
  });
  return integration;
}
__name(createIntegration, "createIntegration");
async function deleteIntegration(env, integrationId) {
  const existing = await getRecord(env, "INTEGRATIONS", integrationId);
  if (!existing) {
    return null;
  }
  await deleteRecord(env, "INTEGRATIONS", integrationId);
  await emitEvent(env, "integration-deleted", {
    details: `Integration ${existing.name} deleted.`
  });
  return existing;
}
__name(deleteIntegration, "deleteIntegration");
async function resolveIntegrationContext(env, value, requiredPermission) {
  const integrationId = normalizeText12(value);
  if (!integrationId) {
    return null;
  }
  const integration = await getRecord(env, "INTEGRATIONS", integrationId);
  if (!integration) {
    throw new Error("Unknown integration");
  }
  if (requiredPermission && !integration.permissions.includes(requiredPermission)) {
    throw new Error(`Integration ${integration.name} lacks ${requiredPermission} permission`);
  }
  await emitEvent(env, "integration-authorized", {
    details: `Integration ${integration.name} authorized for ${requiredPermission || "runtime"} access.`
  });
  return integration;
}
__name(resolveIntegrationContext, "resolveIntegrationContext");
function getIntegrationIdFromPayload(payload) {
  return normalizeText12(
    payload.integrationId || payload.integration_id || payload.context?.integrationId || payload.context?.integration_id
  );
}
__name(getIntegrationIdFromPayload, "getIntegrationIdFromPayload");
function buildRecommendedFix(reason) {
  if (reason.includes("certification")) {
    return "Run /api/os/certify for the affected agent before using it in a pipeline or scenario.";
  }
  if (reason.includes("chain length")) {
    return "Reduce the requested chain depth or raise the governance chain length limit.";
  }
  if (reason.includes("sandbox")) {
    return "Enable sandbox execution in governance or run the agent outside the sandbox surface.";
  }
  if (reason.includes("permission")) {
    return "Add the required permission to the integration or remove the integration trigger.";
  }
  return "Adjust governance policy or execution inputs, then retry.";
}
__name(buildRecommendedFix, "buildRecommendedFix");
async function getAgentCertification(env, agent) {
  return getRecord(env, "CERTIFICATION", `agent:${agent}`);
}
__name(getAgentCertification, "getAgentCertification");
async function assertCertifiedAgents(env, agents, surface, governance, options = {}) {
  const shouldRequire = surface === "pipeline" ? !governance.pipelineSafetyRules?.allowUncertifiedAgents : surface === "scenario" || surface === "public-scenario" ? !governance.scenarioSafetyRules?.allowUncertifiedAgents : false;
  if (!shouldRequire && !options.force) {
    return;
  }
  for (const agent of agents) {
    const rule = governance.agentSafetyRules?.[agent];
    if (rule?.enabled === false) {
      throw new Error(`Agent ${agent} is disabled by governance.`);
    }
    if (rule?.requireCertification === false && !options.force) {
      continue;
    }
    const certification = await getAgentCertification(env, agent);
    if (!certification || certification.status !== "certified") {
      throw new Error(`Agent ${agent} lacks certification for ${surface}.`);
    }
  }
}
__name(assertCertifiedAgents, "assertCertifiedAgents");
async function evaluateSafetyCheck(env, payload) {
  const governance = await getGovernanceConfig(env);
  const intent = normalizeText12(payload.intent);
  const agent = normalizeText12(payload.agent);
  const pipelineName = normalizeText12(payload.pipeline);
  const scenarioName = normalizeText12(payload.scenario);
  const reasons = [];
  if (agent) {
    const rule = governance.agentSafetyRules?.[agent];
    if (rule?.enabled === false) {
      reasons.push(`Agent ${agent} is disabled by governance.`);
    }
  }
  const chainLength = Array.isArray(payload.chain) ? payload.chain.length : 0;
  if (chainLength > (governance.chainLengthLimits?.default || 4)) {
    reasons.push(`Requested chain length ${chainLength} exceeds governance chain length limits.`);
  }
  if (pipelineName && payload.pipelineSteps && payload.pipelineSteps.length > (governance.pipelineSafetyRules?.maxSteps || 6)) {
    reasons.push(`Pipeline ${pipelineName} exceeds the configured pipeline safety rule step limit.`);
  }
  if (scenarioName && payload.scenarioSteps && payload.scenarioSteps.length > (governance.scenarioSafetyRules?.maxSteps || 6)) {
    reasons.push(`Scenario ${scenarioName} exceeds the configured scenario safety rule step limit.`);
  }
  const severitySignal = scoreSeverity(intent || `${pipelineName} ${scenarioName}`);
  if (severitySignal > (governance.escalationPolicies?.operatorReviewAboveSeverity || 80)) {
    reasons.push(`Severity signal ${severitySignal} exceeds operator review threshold.`);
  }
  const cloudflareReachability = await getCloudflareApiReachability();
  const cloudflareActionsHealth = await getCloudflareActionsHealth();
  const cloudflareSafetySnapshot = await getCloudflareSafetySnapshot(governance);
  const [cloudflareAutomation, cloudflareCertification, cloudflareCrossDivision, cloudflareOrchestration, cloudflareExecution, cloudflareDecision, cloudflareInsights, cloudflareAutonomous] = await Promise.all([
    getCloudflareAutomationLoops(governance),
    getMarketplaceCloudflareCertification(governance),
    getCloudflareCrossDivisionSync(governance, env),
    getCloudflareOrchestration(governance, env),
    getCloudflareExecution(governance, env),
    getCloudflareDecision(governance),
    getCloudflareInsights(governance),
    getCloudflareAutonomousSnapshot(governance)
  ]);
  const cloudflareAdaptive = buildCloudflareAdaptiveFromSignals({
    orchestration: cloudflareOrchestration,
    crossDivision: cloudflareCrossDivision,
    certification: cloudflareCertification,
    decision: cloudflareDecision,
    execution: cloudflareExecution,
    automation: cloudflareAutomation,
    insights: cloudflareInsights,
    autonomous: cloudflareAutonomous,
    reachability: cloudflareReachability
  });
  const cloudflarePredictive = buildCloudflarePredictiveFromSignals({
    adaptive: cloudflareAdaptive,
    orchestration: cloudflareOrchestration,
    crossDivision: cloudflareCrossDivision,
    certification: cloudflareCertification,
    decision: cloudflareDecision,
    execution: cloudflareExecution,
    automation: cloudflareAutomation,
    insights: cloudflareInsights,
    autonomous: cloudflareAutonomous,
    reachability: cloudflareReachability
  });
  const cloudflareStrategic = buildCloudflareStrategicFromSignals({
    predictive: cloudflarePredictive,
    adaptive: cloudflareAdaptive,
    orchestration: cloudflareOrchestration,
    crossDivision: cloudflareCrossDivision,
    certification: cloudflareCertification,
    decision: cloudflareDecision,
    execution: cloudflareExecution,
    automation: cloudflareAutomation,
    insights: cloudflareInsights,
    autonomous: cloudflareAutonomous
  });
  const cloudflareUcip = buildCloudflareUcipFromSignals({
    automation: cloudflareAutomation,
    autonomous: cloudflareAutonomous,
    decision: cloudflareDecision,
    certification: cloudflareCertification,
    crossDivision: cloudflareCrossDivision,
    orchestration: cloudflareOrchestration,
    execution: cloudflareExecution,
    adaptive: cloudflareAdaptive,
    predictive: cloudflarePredictive,
    strategic: cloudflareStrategic,
    insights: cloudflareInsights
  });
  const moduleIds = modules2.map((entry) => entry.id);
  const metaStack = await resolveMetaIntelligenceStack(governance, env, { cloudflareUcip, moduleIds }, "safety");
  const cloudflareAmg = metaStack.cloudflareAmg;
  const cloudflareCba = metaStack.cloudflareCba;
  const cloudflareCal = metaStack.cloudflareCal;
  const cloudflareIhl = metaStack.cloudflareIhl;
  const cloudflareIarl = metaStack.cloudflareIarl;
  const cloudflareAcl = metaStack.cloudflareAcl;
  const cloudflareSafetyFactor = evaluateCloudflareSafetyFactor(cloudflareReachability, governance, cloudflareActionsHealth);
  cloudflareSafetyFactor.automation = buildCloudflareSafetyAutomationFactor(cloudflareAutomation);
  cloudflareSafetyFactor.certification = buildCloudflareSafetyCertificationFactor(cloudflareCertification);
  cloudflareSafetyFactor.crossDivision = buildCloudflareSafetyCrossDivisionFactor(cloudflareCrossDivision);
  cloudflareSafetyFactor.orchestration = buildCloudflareSafetyOrchestrationFactor(cloudflareOrchestration);
  cloudflareSafetyFactor.execution = buildCloudflareSafetyExecutionFactor(cloudflareExecution);
  cloudflareSafetyFactor.adaptive = buildCloudflareSafetyAdaptiveFactor(cloudflareAdaptive);
  cloudflareSafetyFactor.predictive = buildCloudflareSafetyPredictiveFactor(cloudflarePredictive);
  cloudflareSafetyFactor.strategic = buildCloudflareSafetyStrategicFactor(cloudflareStrategic);
  cloudflareSafetyFactor.ucip = buildCloudflareSafetyUcipFactor(cloudflareUcip);
  cloudflareSafetyFactor.amg = buildCloudflareSafetyAmgFactor(cloudflareAmg);
  cloudflareSafetyFactor.cba = buildCloudflareSafetyCbaFactor(cloudflareCba);
  cloudflareSafetyFactor.cal = buildCloudflareSafetyCalFactor(cloudflareCal);
  cloudflareSafetyFactor.ihl = buildCloudflareSafetyIhlFactor(cloudflareIhl);
  cloudflareSafetyFactor.iarl = buildCloudflareSafetyIarlFactor(cloudflareIarl);
  cloudflareSafetyFactor.acl = buildCloudflareSafetyAclFactor(cloudflareAcl);
  if (cloudflareSafetyFactor.blockRecommended) {
    reasons.push(...cloudflareSafetyFactor.warnings);
  }
  if (cloudflareSafetySnapshot.cloudflareSafety?.blockRecommended) {
    reasons.push(...cloudflareSafetySnapshot.cloudflareSafety.autonomousWarnings || []);
  }
  if (governance.cloudflareSafetyRules?.requireObservabilityReachable) {
    const observabilityOffline = (cloudflareReachability.servers || []).find(
      (server) => server.id === "cloudflare-observability" && server.status === "offline"
    );
    if (observabilityOffline) {
      reasons.push("Cloudflare observability MCP is offline and required by governance.");
    }
  }
  const allowed = reasons.length === 0;
  const decision = {
    allowed,
    reason: allowed ? "Execution allowed by governance." : reasons.join(" "),
    recommendedFix: allowed ? "None." : buildRecommendedFix(reasons[0]),
    intent,
    agent,
    pipeline: pipelineName || null,
    scenario: scenarioName || null,
    severitySignal,
    cloudflareReachability,
    cloudflareSafetyFactor,
    cloudflareSafety: cloudflareSafetySnapshot.cloudflareSafety,
    cloudflareAutonomousSignals: cloudflareSafetySnapshot.autonomousSignals
  };
  await storeGovernanceDecision(env, {
    surface: "safety-check",
    agent: agent || null,
    allowed,
    reason: decision.reason,
    recommendedFix: decision.recommendedFix
  });
  return decision;
}
__name(evaluateSafetyCheck, "evaluateSafetyCheck");
async function enforceGovernance(env, surface, payload, options = {}) {
  const governance = await getGovernanceConfig(env);
  const requestedChainLength = options.requestedChainLength || (Array.isArray(payload.chain) ? payload.chain.length : 0);
  const integrationId = getIntegrationIdFromPayload(payload);
  const requiredPermission = options.requiredPermission || null;
  const agent = normalizeText12(options.agent || payload.agent);
  if (integrationId) {
    const integration = await resolveIntegrationContext(env, integrationId, requiredPermission);
    if (!integration) {
      throw new Error("Integration lookup failed.");
    }
    const permissionMap = {
      route: governance.externalIntegrationPermissions?.allowRoute,
      pipeline: governance.externalIntegrationPermissions?.allowPipeline,
      scenario: governance.externalIntegrationPermissions?.allowScenario
    };
    if (requiredPermission && permissionMap[requiredPermission] === false) {
      const reason = `External integration permission ${requiredPermission} is disabled by governance.`;
      await storeGovernanceDecision(env, {
        surface,
        agent,
        allowed: false,
        reason,
        recommendedFix: buildRecommendedFix(reason)
      });
      throw new Error(reason);
    }
  }
  if (surface === "sandbox" && governance.autonomyThresholds?.allowSandbox === false) {
    const reason = "Sandbox execution is disabled by governance.";
    await storeGovernanceDecision(env, {
      surface,
      agent,
      allowed: false,
      reason,
      recommendedFix: buildRecommendedFix(reason)
    });
    throw new Error(reason);
  }
  const chainLimit = governance.chainLengthLimits?.[surface] || governance.chainLengthLimits?.default || governance.autonomyThresholds?.maxAutoChainLength || 4;
  if (requestedChainLength && requestedChainLength > chainLimit) {
    const reason = `Requested chain length ${requestedChainLength} exceeds the ${surface} chain length limit ${chainLimit}.`;
    await storeGovernanceDecision(env, {
      surface,
      agent,
      allowed: false,
      reason,
      recommendedFix: buildRecommendedFix(reason)
    });
    throw new Error(reason);
  }
  const decision = await evaluateSafetyCheck(env, {
    intent: payload.intent,
    agent,
    pipeline: surface === "pipeline" ? payload.moduleId || "pipeline" : "",
    scenario: surface.includes("scenario") ? payload.name || "scenario" : "",
    chain: options.chain || [],
    pipelineSteps: payload.steps,
    scenarioSteps: payload.steps
  });
  if (!decision.allowed) {
    await storeGovernanceDecision(env, {
      surface,
      agent,
      allowed: false,
      reason: decision.reason,
      recommendedFix: decision.recommendedFix
    });
    throw new Error(decision.reason);
  }
  await storeGovernanceDecision(env, {
    surface,
    agent,
    allowed: true,
    reason: "Execution allowed by governance.",
    recommendedFix: "None."
  });
  return governance;
}
__name(enforceGovernance, "enforceGovernance");
async function runCertification(env, payload) {
  const agent = normalizeText12(payload.agent);
  if (!AGENTS.includes(agent)) {
    throw new Error("Valid agent is required for certification.");
  }
  const tests = Array.isArray(payload.tests) && payload.tests.length ? payload.tests.map((entry) => normalizeText12(entry)).filter(Boolean) : ["route-smoke", "payload-shape", "safety-compat"];
  const results = [];
  for (const test of tests) {
    const intentRecord = buildIntentRecord({
      intent: `Certification test ${test} for ${agent}`,
      source: "certification",
      agent
    });
    const output = await executeAgent(intentRecord, env, {
      previousOutput: null,
      chain: [agent],
      payloadId: null
    });
    results.push({
      test,
      passed: Boolean(output),
      summary: output.summary || `${agent} passed ${test}.`
    });
  }
  const passedCount = results.filter((entry) => entry.passed).length;
  const score2 = Math.round(passedCount / Math.max(results.length, 1) * 100);
  const certification = {
    id: `agent:${agent}`,
    agent,
    tests,
    score: score2,
    status: score2 >= 75 ? "certified" : "failed",
    certifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
    results
  };
  await putRecord(env, "CERTIFICATION", certification.id, certification);
  await emitEvent(env, "agent-certified", {
    agent,
    details: `Certification completed for ${agent} with score ${score2}.`
  });
  return certification;
}
__name(runCertification, "runCertification");
async function applyRelease(env, payload) {
  const version = normalizeText12(payload.version);
  if (!version) {
    throw new Error("version is required");
  }
  const changes = Array.isArray(payload.changes) ? payload.changes.map((entry) => normalizeText12(entry)).filter(Boolean) : [];
  const migrations = Array.isArray(payload.migrations) ? payload.migrations.map((entry) => normalizeText12(entry)).filter(Boolean) : [];
  const release = {
    id: `rel-${Date.now()}`,
    version,
    changes,
    migrations,
    appliedAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "applied",
    logs: []
  };
  for (const migration of migrations) {
    if (migration.startsWith("config:")) {
      const key = migration.replace("config:", "");
      const config = await getOsConfig(env);
      release.logs.push(`Config migration requested for ${key}.`);
      await saveOsConfig(env, config, "release");
    } else if (migration.startsWith("version:")) {
      await saveOsVersion(env, {
        current: migration.replace("version:", ""),
        history: [.../* @__PURE__ */ new Set([...(await getOsVersion(env)).history, migration.replace("version:", "")])],
        lastUpgrade: (/* @__PURE__ */ new Date()).toISOString()
      }, "release");
      release.logs.push(`Version migration applied: ${migration}.`);
    } else if (migration === "governance:refresh") {
      await saveGovernanceConfig(env, await getGovernanceConfig(env), "release");
      release.logs.push("Governance config snapshot refreshed.");
    } else {
      release.logs.push(`No-op migration recorded: ${migration}.`);
    }
  }
  await putRecord(env, "RELEASES", release.id, release);
  await emitEvent(env, "release-applied", {
    details: `Release ${release.version} applied with ${release.migrations.length} migrations.`
  });
  return release;
}
__name(applyRelease, "applyRelease");
function buildPipelineDefaults(config, moduleId, recommendedAgent) {
  const base = Array.isArray(config?.pipelineDefaults) ? [...config.pipelineDefaults] : ["payload-generator", "marketplace-sync", "operator-sentinel"];
  if (recommendedAgent && !base.includes(recommendedAgent)) {
    base.unshift(recommendedAgent);
  }
  return {
    moduleId,
    pipeline: base,
    expectedOutputs: ["payload", "module-sync", "sentinel-review"]
  };
}
__name(buildPipelineDefaults, "buildPipelineDefaults");
async function getDivisionMemoryPreview(env, limit = 8) {
  const memories = await listRecords(env, "DIVISION_MEMORY", limit);
  return memories.map((entry) => ({
    key: entry.key,
    type: entry.type,
    value: entry.value,
    updatedAt: entry.updatedAt
  }));
}
__name(getDivisionMemoryPreview, "getDivisionMemoryPreview");
async function computeGlobalRoutePlan(env, payload) {
  const osConfig = await getOsConfig(env);
  const normalizedIntent = normalizeText12(payload.intent);
  const mode = normalizeText12(payload.mode) || "auto";
  const context = typeof payload.context === "object" && payload.context ? payload.context : {};
  const semantic = lightweightSemanticScore(normalizedIntent);
  const selectedAgent = mode === "manual" && context.agent && AGENTS.includes(context.agent) ? context.agent : semantic.recommendedAgent;
  const moduleId = deriveModuleId(normalizedIntent);
  const pipelinePlan = buildPipelineDefaults(osConfig, moduleId, selectedAgent);
  const memory = await getDivisionMemoryPreview(env, 6);
  await enforceGovernance(
    env,
    "route",
    {
      intent: normalizedIntent,
      agent: selectedAgent,
      context,
      integrationId: getIntegrationIdFromPayload(payload)
    },
    {
      requestedChainLength: [selectedAgent, ...pipelinePlan.pipeline.filter((step) => step !== selectedAgent)].length,
      requiredPermission: "route",
      chain: [selectedAgent, ...pipelinePlan.pipeline.filter((step) => step !== selectedAgent)]
    }
  );
  const routePlan = {
    id: buildId("os-route"),
    intent: normalizedIntent,
    mode,
    context,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    semantic,
    selectedAgent,
    pipeline: pipelinePlan.pipeline,
    expectedOutputs: pipelinePlan.expectedOutputs,
    chain: [selectedAgent, ...pipelinePlan.pipeline.filter((step) => step !== selectedAgent)],
    memory,
    configSnapshot: osConfig
  };
  await putRecord(env, "OS_ROUTING", routePlan.id, routePlan);
  await emitEvent(env, "os-route-created", {
    agent: selectedAgent,
    details: `Global routing plan ${routePlan.id} created for ${selectedAgent}.`
  });
  return routePlan;
}
__name(computeGlobalRoutePlan, "computeGlobalRoutePlan");
async function saveDivisionMemoryEntry(env, payload) {
  const key = normalizeText12(payload.key || payload.id);
  if (!key) {
    throw new Error("memory key is required");
  }
  const record = {
    id: key,
    key,
    type: normalizeText12(payload.type) || "operator-note",
    value: payload.value ?? payload.note ?? payload.metadata ?? null,
    summary: normalizeText12(payload.summary) || normalizeText12(typeof payload.value === "string" ? payload.value : key),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await putRecord(env, "DIVISION_MEMORY", record.id, record);
  await emitEvent(env, "division-memory-updated", {
    details: `Division memory key ${record.key} updated.`
  });
  return record;
}
__name(saveDivisionMemoryEntry, "saveDivisionMemoryEntry");
async function runPipeline(env, payload, source = "pipeline-engine") {
  const moduleId = normalizeText12(payload.moduleId);
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  if (!moduleId || !steps.length) {
    throw new Error("moduleId and steps are required");
  }
  const governance = await enforceGovernance(
    env,
    "pipeline",
    {
      ...payload,
      intent: normalizeText12(payload.intent) || `Pipeline for ${moduleId}`,
      integrationId: getIntegrationIdFromPayload(payload)
    },
    {
      requestedChainLength: steps.length,
      requiredPermission: "pipeline",
      chain: steps.map((step) => normalizeText12(step.agent)).filter(Boolean)
    }
  );
  await assertCertifiedAgents(
    env,
    steps.map((step) => normalizeText12(step.agent)).filter(Boolean),
    "pipeline",
    governance
  );
  const cloudflareBindingValidation = await validateCloudflareBindings(moduleId);
  const cloudflareBindingHealth = await getCloudflareBindingHealth();
  const moduleRecord = await getRecord(env, "MODULES", moduleId);
  const pipeline = {
    id: buildId("pipeline"),
    moduleId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "completed",
    steps,
    results: []
  };
  let previousOutput = moduleRecord ? {
    envelope: {
      module: moduleId,
      content: moduleRecord.content,
      summary: moduleRecord.summary
    },
    severity: moduleRecord.severity || 0
  } : null;
  for (const step of steps) {
    if (!step.agent || !AGENTS.includes(step.agent)) {
      throw new Error("Pipeline steps must declare a supported agent");
    }
    const flow = await executeAgentFlow(
      env,
      {
        intent: normalizeText12(step.intent) || moduleRecord?.summary || `Pipeline for ${moduleId}`,
        source,
        agent: step.agent
      },
      {
        initialAgent: step.agent,
        allowChaining: false,
        source,
        previousOutput,
        kind: "pipeline-step"
      }
    );
    previousOutput = flow.outputs[0]?.output || previousOutput;
    pipeline.results.push({ agent: step.agent, flow });
  }
  await putRecord(env, "PIPELINES", pipeline.id, pipeline);
  await emitEvent(env, "pipeline-executed", {
    moduleId,
    details: `Pipeline ${pipeline.id} executed for module ${moduleId}.`
  });
  const pipelineDecision = await getCloudflarePipelineDecision(governance, moduleId);
  const crossDivision = await getCloudflareCrossDivisionSync(governance, env);
  const orchestration = await getCloudflareOrchestration(governance, env, { moduleIds: [moduleId] });
  const execution = await getCloudflareExecution(governance, env, { moduleIds: [moduleId] });
  const marketplaceFields = getOperatorMarketplaceCrossDivisionFields(crossDivision);
  const orchestrationFields = getCloudflarePipelineOrchestrationFields(orchestration);
  const executionFields = getCloudflarePipelineExecutionFields(execution);
  return {
    ...pipeline,
    cloudflareBindings: await getCloudflareBindingsInspection(),
    cloudflareBindingValidation,
    cloudflareBindingHealth: cloudflareBindingHealth.health,
    ...pipelineDecision,
    ...marketplaceFields,
    ...orchestrationFields,
    ...executionFields
  };
}
__name(runPipeline, "runPipeline");
async function runSandbox(env, payload) {
  const agent = normalizeText12(payload.agent);
  const input = normalizeText12(payload.input);
  if (!AGENTS.includes(agent) || !input) {
    throw new Error("sandbox agent and input are required");
  }
  await enforceGovernance(env, "sandbox", payload, {
    requestedChainLength: 1,
    chain: [agent],
    agent
  });
  const intentRecord = buildIntentRecord({ intent: input, source: "sandbox", agent });
  const output = await executeAgent(intentRecord, env, {
    previousOutput: null,
    chain: [agent],
    payloadId: null
  });
  const record = {
    id: buildId("sandbox"),
    agent,
    input,
    output,
    summary: output.summary || `Sandbox run for ${agent}.`,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await putRecord(env, "SANDBOX_LOGS", record.id, record);
  await emitEvent(env, "sandbox-executed", {
    agent,
    details: `Sandbox run ${record.id} executed for ${agent}.`
  });
  return record;
}
__name(runSandbox, "runSandbox");
async function createOperatorIntent(env, payload) {
  const goal = normalizeText12(payload.goal);
  if (!goal) {
    throw new Error("goal is required");
  }
  const routePlan = await computeGlobalRoutePlan(env, {
    intent: goal,
    mode: "manual",
    context: {
      priority: normalizeText12(payload.priority) || "medium",
      constraints: Array.isArray(payload.constraints) ? payload.constraints : []
    }
  });
  const record = {
    id: buildId("op-intent"),
    goal,
    constraints: Array.isArray(payload.constraints) ? payload.constraints : [],
    priority: normalizeText12(payload.priority) || "medium",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    routePlan
  };
  await putRecord(env, "OPERATOR_INTENTS", record.id, record);
  await emitEvent(env, "operator-intent-created", {
    agent: routePlan.selectedAgent,
    details: `Operator intent ${record.id} created for ${routePlan.selectedAgent}.`
  });
  return record;
}
__name(createOperatorIntent, "createOperatorIntent");
async function runPublicScenario(env, payload) {
  const name = normalizeText12(payload.name);
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  if (!name || !steps.length) {
    throw new Error("name and steps are required");
  }
  const governance = await enforceGovernance(
    env,
    "publicScenario",
    {
      ...payload,
      integrationId: getIntegrationIdFromPayload(payload)
    },
    {
      requestedChainLength: steps.length,
      requiredPermission: "scenario",
      chain: steps.map((step) => lightweightSemanticScore(normalizeText12(step.intent)).recommendedAgent)
    }
  );
  const plannedAgents = [];
  for (const step of steps) {
    const previewPlan = await computeGlobalRoutePlan(env, {
      intent: normalizeText12(step.intent),
      mode: "auto",
      context: { surface: "public-scenario-preview" }
    });
    plannedAgents.push(previewPlan.selectedAgent);
  }
  await assertCertifiedAgents(env, plannedAgents, "public-scenario", governance);
  const record = {
    id: buildId("public-scenario"),
    name,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    steps,
    results: []
  };
  for (const step of steps) {
    const plan = await computeGlobalRoutePlan(env, {
      intent: normalizeText12(step.intent),
      mode: "auto",
      context: { surface: "public-scenario" }
    });
    const flow = await executeAgentFlow(
      env,
      {
        intent: normalizeText12(step.intent),
        source: "public-scenario",
        agent: plan.selectedAgent
      },
      {
        initialAgent: plan.selectedAgent,
        allowChaining: true,
        source: "public-scenario",
        kind: "public-scenario"
      }
    );
    record.results.push({ plan, flow });
  }
  await putRecord(env, "PUBLIC_SCENARIOS", record.id, record);
  await emitEvent(env, "public-scenario-executed", {
    details: `Public scenario ${record.id} executed with ${steps.length} steps.`
  });
  return record;
}
__name(runPublicScenario, "runPublicScenario");
function deriveModuleId(textValue) {
  const text2 = textValue.toLowerCase();
  if (text2.includes("cockpit") || text2.includes("multi-agent")) {
    return "multi-agent-cockpit";
  }
  if (text2.includes("doctrine")) {
    return "msh-ops-doctrine";
  }
  if (text2.includes("scenario")) {
    return "scenario-engine";
  }
  if (text2.includes("automation") || text2.includes("n8n")) {
    return "n8n-automation-packs";
  }
  if (text2.includes("threat") || text2.includes("report")) {
    return "ai-agent-threat-report";
  }
  return "multi-agent-cockpit";
}
__name(deriveModuleId, "deriveModuleId");
function deriveModuleName(moduleId) {
  return moduleId.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
__name(deriveModuleName, "deriveModuleName");
function deriveModuleCategory(moduleId) {
  const map = [
    { match: "cockpit", slug: "operations", label: "Operations" },
    { match: "doctrine", slug: "doctrine", label: "Doctrine" },
    { match: "scenario", slug: "scenarios", label: "Scenarios" },
    { match: "automation", slug: "automation", label: "Automation" },
    { match: "report", slug: "intelligence", label: "Intelligence" },
    { match: "threat", slug: "intelligence", label: "Intelligence" }
  ];
  const hit = map.find((entry) => moduleId.includes(entry.match));
  return hit || { slug: "operators", label: "Operators" };
}
__name(deriveModuleCategory, "deriveModuleCategory");
function hourBucket(value) {
  return new Date(value).getHours();
}
__name(hourBucket, "hourBucket");
function emptyHourSeries() {
  return Array.from({ length: 24 }, () => 0);
}
__name(emptyHourSeries, "emptyHourSeries");
function lightweightSemanticScore(intentText) {
  const text2 = intentText.toLowerCase();
  const lanes = [
    {
      lane: "routing-lane",
      recommendedAgent: "route-advisory",
      keywords: ["route", "lane", "intent", "decision", "classify"]
    },
    {
      lane: "payload-lane",
      recommendedAgent: "payload-generator",
      keywords: ["payload", "json", "module", "envelope", "content"]
    },
    {
      lane: "escalation-lane",
      recommendedAgent: "operator-sentinel",
      keywords: ["anomaly", "incident", "urgent", "breach", "escalate", "critical"]
    },
    {
      lane: "sync-lane",
      recommendedAgent: "marketplace-sync",
      keywords: ["marketplace", "publish", "sync", "public page", "listing", "update", "refresh"]
    }
  ];
  const scored = lanes.map((entry) => {
    const matches = entry.keywords.filter((keyword) => text2.includes(keyword)).length;
    return {
      ...entry,
      confidence: Math.min(0.98, 0.22 + matches * 0.18)
    };
  });
  const winner = scored.sort((left, right) => right.confidence - left.confidence)[0];
  return {
    lane: winner.lane,
    confidence: Number(winner.confidence.toFixed(2)),
    recommendedAgent: winner.recommendedAgent
  };
}
__name(lightweightSemanticScore, "lightweightSemanticScore");
function scoreSeverity(textValue) {
  const text2 = textValue.toLowerCase();
  let severity = 18;
  const weights = [
    ["critical", 34],
    ["urgent", 22],
    ["breach", 28],
    ["exploit", 24],
    ["incident", 18],
    ["anomaly", 16],
    ["escalate", 14],
    ["failure", 12],
    ["attack", 16],
    ["leak", 18],
    ["error", 18],
    ["issue", 12]
  ];
  for (const [keyword, weight] of weights) {
    if (text2.includes(keyword)) {
      severity += weight;
    }
  }
  return Math.min(100, severity);
}
__name(scoreSeverity, "scoreSeverity");
function buildIntentRecord(normalizedIntent, overrides = {}) {
  return {
    id: overrides.id || buildId("intent"),
    source: overrides.source || normalizedIntent.source,
    agent: overrides.agent || normalizedIntent.agent,
    intent: normalizedIntent.intent,
    receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
    triggerPayloadId: overrides.triggerPayloadId || null
  };
}
__name(buildIntentRecord, "buildIntentRecord");
function buildPayloadRecord(intentRecord, agentOutput, chain, durationMs) {
  return {
    id: buildId("payload"),
    intentId: intentRecord.id,
    agent: intentRecord.agent,
    source: intentRecord.source,
    intent: intentRecord.intent,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    summary: agentOutput.summary,
    output: agentOutput,
    chain,
    annotations: [],
    triggerPayloadId: intentRecord.triggerPayloadId,
    executionDurationMs: durationMs
  };
}
__name(buildPayloadRecord, "buildPayloadRecord");
function buildRoutingLog(intentRecord, agentOutput, chain, durationMs, kind = "direct") {
  return {
    id: buildId("rt"),
    intent: intentRecord.intent,
    agent: intentRecord.agent,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    summary: agentOutput.summary,
    kind,
    chain,
    triggerPayloadId: intentRecord.triggerPayloadId,
    executionDurationMs: durationMs
  };
}
__name(buildRoutingLog, "buildRoutingLog");
async function routeAdvisory(intentRecord) {
  const result = lightweightSemanticScore(intentRecord.intent);
  return {
    lane: result.lane,
    confidence: result.confidence,
    recommendedAgent: result.recommendedAgent === "route-advisory" ? "payload-generator" : result.recommendedAgent,
    summary: `Intent classified into ${result.lane} with ${Math.round(result.confidence * 100)}% confidence.`
  };
}
__name(routeAdvisory, "routeAdvisory");
async function payloadGenerator(intentRecord) {
  const moduleId = deriveModuleId(intentRecord.intent);
  return {
    envelope: {
      id: `pl-${Date.now()}`,
      type: "module",
      module: moduleId,
      summary: `Payload generated for ${moduleId}.`,
      content: `Structured payload prepared from intent: ${intentRecord.intent}`,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    recommendedAgent: "marketplace-sync",
    summary: `Structured payload envelope generated for ${moduleId}.`
  };
}
__name(payloadGenerator, "payloadGenerator");
async function operatorSentinel(intentRecord, env, context) {
  const severity = scoreSeverity(intentRecord.intent);
  let escalationId = null;
  let escalated = false;
  if (severity > 60) {
    escalated = true;
    escalationId = buildId("esc");
    const escalation = {
      id: escalationId,
      payloadId: context.payloadId,
      intentId: intentRecord.id,
      agent: intentRecord.agent,
      severity,
      summary: `Operator escalation generated for payload ${context.payloadId}.`,
      details: `Severity ${severity} triggered from intent: ${intentRecord.intent}`,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      resolvedAt: null
    };
    await putRecord(env, "ESCALATIONS", escalation.id, escalation);
    await emitEvent(env, "escalation-created", {
      escalationId: escalation.id,
      payloadId: escalation.payloadId,
      agent: "operator-sentinel",
      details: `Escalation ${escalation.id} created at severity ${severity}.`
    });
  }
  return {
    severity,
    escalated,
    escalationId,
    summary: escalated ? `Severity ${severity} triggered operator escalation ${escalationId}.` : `Severity ${severity} remained below escalation threshold.`
  };
}
__name(operatorSentinel, "operatorSentinel");
async function marketplaceSync(intentRecord, env, context) {
  const moduleId = context.previousOutput?.envelope?.module || deriveModuleId(intentRecord.intent);
  const moduleName = deriveModuleName(moduleId);
  const content = context.previousOutput?.envelope?.content || `Marketplace module content derived from intent: ${intentRecord.intent}`;
  const summary = context.previousOutput?.envelope?.summary || `Marketplace sync completed for ${moduleId}.`;
  const existing = await getRecord(env, "MODULES", moduleId);
  const record = {
    id: moduleId,
    name: moduleName,
    summary,
    content,
    createdAt: existing?.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    agent: "marketplace-sync",
    lineage: context.chain,
    publicUrl: `/marketplace/${moduleId}`,
    publishedAt: existing?.publishedAt || null,
    annotations: existing?.annotations || [],
    categorySlug: existing?.categorySlug || deriveModuleCategory(moduleId).slug,
    category: existing?.category || deriveModuleCategory(moduleId).label,
    severity: existing?.severity || context.previousOutput?.severity || 0,
    lastPayloadId: context.payloadId || existing?.lastPayloadId || null
  };
  await putRecord(env, "MODULES", record.id, record);
  await emitEvent(env, "module-synced", {
    moduleId: record.id,
    agent: "marketplace-sync",
    details: `Module ${record.id} synced to public URL ${record.publicUrl}.`
  });
  return {
    moduleId: record.id,
    synced: true,
    publicUrl: record.publicUrl,
    summary: `Marketplace sync completed for ${record.id}.`
  };
}
__name(marketplaceSync, "marketplaceSync");
async function executeAgent(intentRecord, env, context = {}) {
  if (intentRecord.agent === "route-advisory") {
    return routeAdvisory(intentRecord);
  }
  if (intentRecord.agent === "payload-generator") {
    return payloadGenerator(intentRecord);
  }
  if (intentRecord.agent === "operator-sentinel") {
    return operatorSentinel(intentRecord, env, context);
  }
  if (intentRecord.agent === "marketplace-sync") {
    return marketplaceSync(intentRecord, env, context);
  }
  throw new Error("Unsupported agent");
}
__name(executeAgent, "executeAgent");
async function executeAgentFlow(env, normalizedIntent, options = {}) {
  await enforceGovernance(env, options.surface || "route", normalizedIntent, {
    requestedChainLength: options.maxDepth || 4,
    chain: [options.initialAgent || normalizedIntent.agent].filter(Boolean),
    agent: options.initialAgent || normalizedIntent.agent
  });
  const visited = /* @__PURE__ */ new Set();
  const payloadIds = [];
  const routingIds = [];
  const outputs = [];
  const chain = [];
  const rootIntentId = buildId("intent");
  let currentAgent = options.initialAgent || normalizedIntent.agent;
  let previousOutput = options.previousOutput || null;
  let currentPayloadId = null;
  let depth = 0;
  while (currentAgent && depth < 4 && !visited.has(currentAgent)) {
    visited.add(currentAgent);
    chain.push(currentAgent);
    const intentRecord = buildIntentRecord(normalizedIntent, {
      id: rootIntentId,
      source: options.source || normalizedIntent.source,
      agent: currentAgent,
      triggerPayloadId: options.triggerPayloadId || null
    });
    const startedAt = Date.now();
    let agentOutput;
    try {
      agentOutput = await executeAgent(intentRecord, env, {
        previousOutput,
        chain: [...chain],
        payloadId: currentPayloadId
      });
    } catch (error) {
      await emitEvent(env, "agent-failed", {
        payloadId: currentPayloadId,
        agent: currentAgent,
        details: `Agent ${currentAgent} failed: ${error instanceof Error ? error.message : String(error)}`
      });
      throw error;
    }
    let durationMs = Date.now() - startedAt;
    let payloadRecord = buildPayloadRecord(intentRecord, agentOutput, [...chain], durationMs);
    currentPayloadId = payloadRecord.id;
    if (currentAgent === "operator-sentinel" && agentOutput.escalated) {
      payloadRecord = buildPayloadRecord(intentRecord, agentOutput, [...chain], durationMs);
      currentPayloadId = payloadRecord.id;
    }
    await putRecord(env, "PAYLOADS", payloadRecord.id, payloadRecord);
    payloadIds.push(payloadRecord.id);
    const routingLog = buildRoutingLog(intentRecord, agentOutput, [...chain], durationMs, depth === 0 ? options.kind || "direct" : "chained");
    await putRecord(env, "ROUTING_LOGS", routingLog.id, routingLog);
    routingIds.push(routingLog.id);
    await emitEvent(env, "agent-executed", {
      payloadId: payloadRecord.id,
      agent: currentAgent,
      details: `Agent ${currentAgent} executed in ${durationMs}ms.`
    });
    outputs.push({
      agent: currentAgent,
      payloadId: payloadRecord.id,
      output: agentOutput,
      executionDurationMs: durationMs
    });
    previousOutput = agentOutput;
    currentAgent = options.allowChaining === false ? null : agentOutput.recommendedAgent || null;
    depth += 1;
  }
  if (chain.length > 1) {
    await emitEvent(env, "chain-executed", {
      payloadId: payloadIds[0] || null,
      agent: chain[0],
      details: `Chain executed: ${chain.join(" -> ")}.`
    });
  }
  return {
    intentId: rootIntentId,
    chain,
    payloadIds,
    routingIds,
    outputs,
    primary: outputs[0] || null
  };
}
__name(executeAgentFlow, "executeAgentFlow");
function toDynamicModuleSummary(moduleRecord) {
  return {
    id: moduleRecord.id,
    name: moduleRecord.name,
    description: moduleRecord.summary,
    tags: ["SYNCED", "MARKETPLACE"],
    status: moduleRecord.publishedAt ? "published" : "active",
    metadata: {
      num: "SYNC",
      route: moduleRecord.publicUrl,
      ctaHref: moduleRecord.publicUrl,
      ctaLabel: moduleRecord.publishedAt ? "OPEN PUBLISHED MODULE" : "OPEN MODULE",
      accessLevel: "public",
      category: "MARKETPLACE_SYNC",
      longDescription: moduleRecord.content,
      accessInstructions: ["Generated by marketplace-sync."],
      features: ["KV-backed sync record", "Public URL", "Operator-visible"],
      synced: true,
      publicUrl: moduleRecord.publicUrl,
      publishedAt: moduleRecord.publishedAt
    },
    lastUpdated: moduleRecord.updatedAt || moduleRecord.createdAt
  };
}
__name(toDynamicModuleSummary, "toDynamicModuleSummary");
function toMarketplaceIndexItem(moduleRecord) {
  return {
    id: moduleRecord.id,
    name: moduleRecord.name,
    summary: moduleRecord.summary,
    content: moduleRecord.content,
    createdAt: moduleRecord.createdAt,
    publishedAt: moduleRecord.publishedAt,
    publicUrl: moduleRecord.publicUrl,
    agent: moduleRecord.agent,
    lineage: moduleRecord.lineage || [moduleRecord.agent],
    categorySlug: moduleRecord.categorySlug || deriveModuleCategory(moduleRecord.id).slug,
    category: moduleRecord.category || deriveModuleCategory(moduleRecord.id).label,
    severity: moduleRecord.severity || 0
  };
}
__name(toMarketplaceIndexItem, "toMarketplaceIndexItem");
async function listDynamicModules(env) {
  const records = await listRecords(env, "MODULES", STORE_CONFIG.MODULES.limit);
  return records.map(toDynamicModuleSummary);
}
__name(listDynamicModules, "listDynamicModules");
async function listMarketplaceIndex(env) {
  const dynamicRecords = await listRecords(env, "MODULES", STORE_CONFIG.MODULES.limit);
  return dynamicRecords.map(toMarketplaceIndexItem).sort((left, right) => new Date(right.publishedAt || right.createdAt).getTime() - new Date(left.publishedAt || left.createdAt).getTime());
}
__name(listMarketplaceIndex, "listMarketplaceIndex");
function rankMarketplaceSearch(items, term) {
  const query = term.toLowerCase();
  return items.map((item) => {
    let score2 = 0;
    if (item.name.toLowerCase().includes(query)) {
      score2 += 3;
    }
    if (item.summary.toLowerCase().includes(query)) {
      score2 += 2;
    }
    if ((item.content || "").toLowerCase().includes(query)) {
      score2 += 1;
    }
    return { item, score: score2 };
  }).filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score).map((entry) => entry.item);
}
__name(rankMarketplaceSearch, "rankMarketplaceSearch");
async function logSearch(env, query, resultCount, source = "marketplace-search") {
  const record = {
    id: buildId("search"),
    query,
    resultCount,
    source,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  await putRecord(env, "SEARCH_LOGS", record.id, record);
  await emitEvent(env, "search-executed", {
    details: `Search "${query}" returned ${resultCount} results.`
  });
  return record;
}
__name(logSearch, "logSearch");
async function computeTelemetry(env) {
  const payloads = await listRecords(env, "PAYLOADS", STORE_CONFIG.PAYLOADS.limit);
  const escalations = await listRecords(env, "ESCALATIONS", STORE_CONFIG.ESCALATIONS.limit);
  const moduleRecords = await listRecords(env, "MODULES", STORE_CONFIG.MODULES.limit);
  const routing = await listRecords(env, "ROUTING_LOGS", STORE_CONFIG.ROUTING_LOGS.limit);
  const agentExecutionCounts = payloads.reduce((accumulator, payload) => {
    accumulator[payload.agent] = (accumulator[payload.agent] || 0) + 1;
    return accumulator;
  }, {});
  const averageSeverity = escalations.length ? Number((escalations.reduce((sum, entry) => sum + (entry.severity || 0), 0) / escalations.length).toFixed(2)) : 0;
  const chainFrequency = payloads.reduce((accumulator, payload) => {
    const key = Array.isArray(payload.chain) && payload.chain.length ? payload.chain.join(" -> ") : "single-step";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
  return {
    totalPayloads: payloads.length,
    totalEscalations: escalations.length,
    totalModules: moduleRecords.length + modules2.length,
    totalRoutingLogs: routing.length,
    agentExecutionCounts,
    averageSeverity,
    chainFrequency
  };
}
__name(computeTelemetry, "computeTelemetry");
async function computeAnalytics(env) {
  const payloads = await listRecords(env, "PAYLOADS", STORE_CONFIG.PAYLOADS.limit);
  const escalations = await listRecords(env, "ESCALATIONS", STORE_CONFIG.ESCALATIONS.limit);
  const moduleRecords = await listRecords(env, "MODULES", STORE_CONFIG.MODULES.limit);
  const autonomyLogs = await listRecords(env, "AUTONOMY_LOGS", STORE_CONFIG.AUTONOMY_LOGS.limit);
  const searchLogs = await listRecords(env, "SEARCH_LOGS", STORE_CONFIG.SEARCH_LOGS.limit);
  const events = await listRecords(env, "EVENTS", STORE_CONFIG.EVENTS.limit);
  const agentExecutionCounts = payloads.reduce((accumulator, payload) => {
    accumulator[payload.agent] = (accumulator[payload.agent] || 0) + 1;
    return accumulator;
  }, {});
  const averageExecutionTime = payloads.length ? Number((payloads.reduce((sum, payload) => sum + (payload.executionDurationMs || 0), 0) / payloads.length).toFixed(2)) : 0;
  const chainFrequency = payloads.reduce((accumulator, payload) => {
    const key = Array.isArray(payload.chain) && payload.chain.length ? payload.chain.join(" -> ") : "single-step";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
  const escalationRate = payloads.length ? Number((escalations.length / payloads.length).toFixed(2)) : 0;
  const modulePublishRate = moduleRecords.length ? Number((moduleRecords.filter((entry) => entry.publishedAt).length / moduleRecords.length).toFixed(2)) : 0;
  const autonomyLoopTriggers = autonomyLogs.length;
  const searchFrequency = searchLogs.length;
  const operatorCommandFrequency = events.filter((entry) => entry.type === "operator-command-executed").length;
  return {
    agentExecutionCounts,
    averageExecutionTime,
    chainFrequency,
    escalationRate,
    modulePublishRate,
    autonomyLoopTriggers,
    searchFrequency,
    operatorCommandFrequency
  };
}
__name(computeAnalytics, "computeAnalytics");
async function computeHeatmap(env) {
  const payloads = await listRecords(env, "PAYLOADS", STORE_CONFIG.PAYLOADS.limit);
  const escalations = await listRecords(env, "ESCALATIONS", STORE_CONFIG.ESCALATIONS.limit);
  const moduleRecords = await listRecords(env, "MODULES", STORE_CONFIG.MODULES.limit);
  const agentExecutionDensity = Object.fromEntries(AGENTS.map((agent) => [agent, emptyHourSeries()]));
  const chainFrequencyByHour = emptyHourSeries();
  const modulePublishDistribution = emptyHourSeries();
  const escalationSeverityDistribution = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };
  for (const payload of payloads) {
    const bucket = hourBucket(payload.createdAt);
    if (agentExecutionDensity[payload.agent]) {
      agentExecutionDensity[payload.agent][bucket] += 1;
    }
    if (Array.isArray(payload.chain) && payload.chain.length > 1) {
      chainFrequencyByHour[bucket] += 1;
    }
  }
  for (const escalation of escalations) {
    const severity = escalation.severity || 0;
    if (severity >= 81) {
      escalationSeverityDistribution.critical += 1;
    } else if (severity >= 61) {
      escalationSeverityDistribution.high += 1;
    } else if (severity >= 31) {
      escalationSeverityDistribution.medium += 1;
    } else {
      escalationSeverityDistribution.low += 1;
    }
  }
  for (const moduleRecord of moduleRecords) {
    if (moduleRecord.publishedAt) {
      modulePublishDistribution[hourBucket(moduleRecord.publishedAt)] += 1;
    }
  }
  return {
    agentExecutionDensity,
    chainFrequencyByHour,
    escalationSeverityDistribution,
    modulePublishDistribution
  };
}
__name(computeHeatmap, "computeHeatmap");
async function computeEcosystemData(env) {
  const dynamicRecords = await listRecords(env, "MODULES", STORE_CONFIG.MODULES.limit);
  const fallbackRecords = modules2.map((entry) => ({
    id: entry.id,
    name: entry.name,
    summary: entry.description,
    content: entry.metadata.longDescription,
    createdAt: entry.lastUpdated,
    publishedAt: entry.lastUpdated,
    publicUrl: entry.metadata.route || getModuleRoute2(entry.id),
    categorySlug: String(entry.metadata.category || deriveModuleCategory(entry.id).slug).toLowerCase().replace(/\s+/g, "-"),
    category: entry.metadata.category || deriveModuleCategory(entry.id).label
  }));
  const searchLogs = await listRecords(env, "SEARCH_LOGS", STORE_CONFIG.SEARCH_LOGS.limit);
  const routingLogs = await listRecords(env, "ROUTING_LOGS", STORE_CONFIG.ROUTING_LOGS.limit);
  const universe = [...dynamicRecords.map(toMarketplaceIndexItem), ...fallbackRecords];
  const categoriesMap = /* @__PURE__ */ new Map();
  const scoreMap = /* @__PURE__ */ new Map();
  for (const moduleRecord of universe) {
    const slug = moduleRecord.categorySlug || deriveModuleCategory(moduleRecord.id).slug;
    const label = moduleRecord.category || deriveModuleCategory(moduleRecord.id).label;
    categoriesMap.set(slug, {
      slug,
      label,
      count: (categoriesMap.get(slug)?.count || 0) + 1
    });
    scoreMap.set(moduleRecord.id, 0);
  }
  for (const log of searchLogs) {
    const query = String(log.query || "").toLowerCase();
    for (const moduleRecord of universe) {
      if (query.includes(moduleRecord.id) || query.includes(moduleRecord.name.toLowerCase())) {
        scoreMap.set(moduleRecord.id, (scoreMap.get(moduleRecord.id) || 0) + 3);
      }
    }
  }
  for (const log of routingLogs) {
    const intent = String(log.intent || "").toLowerCase();
    for (const moduleRecord of universe) {
      if (intent.includes(moduleRecord.id) || intent.includes(moduleRecord.name.toLowerCase())) {
        scoreMap.set(moduleRecord.id, (scoreMap.get(moduleRecord.id) || 0) + 2);
      }
    }
  }
  const trendingModules = [...universe].sort((left, right) => (scoreMap.get(right.id) || 0) - (scoreMap.get(left.id) || 0)).slice(0, 5).map((moduleRecord) => ({
    ...moduleRecord,
    trendScore: scoreMap.get(moduleRecord.id) || 0
  }));
  const recentlyPublishedModules = [...universe].filter((moduleRecord) => moduleRecord.publishedAt).sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()).slice(0, 5);
  const snapshot = {
    id: "ecosystem-latest",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    categories: [...categoriesMap.values()].sort((left, right) => right.count - left.count),
    moduleCountsPerCategory: Object.fromEntries([...categoriesMap.values()].map((entry) => [entry.slug, entry.count])),
    recentlyPublishedModules,
    trendingModules
  };
  await putRecord(env, "ECOSYSTEM", snapshot.id, snapshot);
  return snapshot;
}
__name(computeEcosystemData, "computeEcosystemData");
async function runScenario(env, payload) {
  const name = normalizeText12(payload.name);
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  if (!name || !steps.length) {
    throw new Error("name and steps are required");
  }
  const governance = await enforceGovernance(
    env,
    "scenario",
    payload,
    {
      requestedChainLength: steps.length,
      chain: steps.map((step) => normalizeText12(step.agent)).filter(Boolean)
    }
  );
  await assertCertifiedAgents(
    env,
    steps.map((step) => normalizeText12(step.agent)).filter(Boolean),
    "scenario",
    governance
  );
  const scenario = {
    id: buildId("scenario"),
    name,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    steps,
    results: []
  };
  let previousOutput = null;
  for (const step of steps) {
    if (!step.agent || !AGENTS.includes(step.agent)) {
      throw new Error("Scenario steps must declare a supported agent");
    }
    const intent = normalizeText12(step.intent) || normalizeText12(previousOutput?.envelope?.content) || name;
    const flow = await executeAgentFlow(
      env,
      { intent, source: "scenario-engine", agent: step.agent },
      {
        initialAgent: step.agent,
        allowChaining: false,
        source: "scenario-engine",
        previousOutput,
        kind: "scenario-step"
      }
    );
    previousOutput = flow.outputs[0]?.output || previousOutput;
    scenario.results.push({
      step: step.agent,
      intent,
      flow
    });
  }
  await putRecord(env, "SCENARIOS", scenario.id, scenario);
  await emitEvent(env, "scenario-executed", {
    agent: scenario.steps[0]?.agent || null,
    details: `Scenario ${scenario.name} executed with ${scenario.steps.length} steps.`
  });
  return scenario;
}
__name(runScenario, "runScenario");
async function runKvHealthCheck(env) {
  const kvHealth = {};
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  for (const [logicalName, config] of Object.entries(STORE_CONFIG)) {
    const binding = env[config.envKey];
    if (!binding) {
      kvHealth[logicalName] = "memory";
      continue;
    }
    try {
      const key = `${config.prefix}:heartbeat-check`;
      await binding.put(key, timestamp);
      const value = await binding.get(key);
      kvHealth[logicalName] = value === timestamp ? "ok" : "degraded";
    } catch {
      kvHealth[logicalName] = "error";
    }
  }
  return kvHealth;
}
__name(runKvHealthCheck, "runKvHealthCheck");
async function computeHeartbeat(env) {
  const latestAutonomy = (await listRecords(env, "AUTONOMY_LOGS", 1))[0] || null;
  const latestEvent = (await listRecords(env, "EVENTS", 1))[0] || null;
  const latestAudit = (await listRecords(env, "AUDIT", 1))[0] || null;
  const latestModule = (await listRecords(env, "MODULES", 1))[0] || null;
  const latestEscalation = (await listRecords(env, "ESCALATIONS", 1))[0] || null;
  const kvHealth = await runKvHealthCheck(env);
  return {
    lastAutonomyLoopRun: latestAutonomy?.createdAt || null,
    lastEventEmitted: latestEvent?.timestamp || null,
    lastOperatorAction: latestAudit?.timestamp || null,
    lastModulePublish: latestModule?.publishedAt || null,
    lastEscalation: latestEscalation?.createdAt || null,
    agentHealth: Object.fromEntries(AGENTS.map((agent) => [agent, "online"])),
    kvHealth
  };
}
__name(computeHeartbeat, "computeHeartbeat");
async function computeOsHeartbeat(env) {
  const base = await computeHeartbeat(env);
  const routingHealth = (await listRecords(env, "OS_ROUTING", 1))[0] || null;
  const memoryHealth = (await listRecords(env, "DIVISION_MEMORY", 1)).length >= 0 ? "online" : "offline";
  const pipelineHealth = (await listRecords(env, "PIPELINES", 1))[0] ? "online" : "idle";
  const sandboxHealth = (await listRecords(env, "SANDBOX_LOGS", 1))[0] ? "online" : "idle";
  const configHealth = await getRecord(env, "OS_CONFIG", "current") ? "online" : "default";
  const publicScenarioHealth = (await listRecords(env, "PUBLIC_SCENARIOS", 1))[0] ? "online" : "idle";
  const autonomyHealth = (await listRecords(env, "AUTONOMY_LOGS", 1))[0] ? "online" : "idle";
  const governanceHealth = await getRecord(env, "GOVERNANCE", "current") ? "online" : "default";
  const releaseHealth = (await listRecords(env, "RELEASES", 1))[0] ? "online" : "idle";
  const integrationHealth = (await listRecords(env, "INTEGRATIONS", 1))[0] ? "online" : "idle";
  const certificationHealth = (await listRecords(env, "CERTIFICATION", 1))[0] ? "online" : "idle";
  const latestSafetyDecision = (await getRecentGovernanceDecisions(env, 1))[0] || null;
  const versionInfo = await getOsVersion(env);
  const startedAtRecord = await getRecord(env, "HEARTBEAT", "division-started-at");
  let startedAt = startedAtRecord?.startedAt;
  if (!startedAt) {
    startedAt = (/* @__PURE__ */ new Date()).toISOString();
    await putRecord(env, "HEARTBEAT", "division-started-at", {
      id: "division-started-at",
      startedAt,
      createdAt: startedAt
    });
  }
  let cfHeartbeat = buildAdvisoryHeartbeatFallback();
  try {
    const cloudflareObservability = await getCloudflareHeartbeatDeep();
    const federationReadiness = await getCloudflareFederationReadiness();
    const federationHeartbeat = await getCloudflareFederationHeartbeat();
    const actionHealth = federationReadiness.actionHealth || await getCloudflareActionHealthSummary();
    const governance = await getGovernanceConfig(env);
    const cloudflareAutonomous = await getCloudflareAutonomousSnapshot(governance);
    const cloudflareInsights = await getCloudflareInsights(governance);
    const cloudflareDecision = await getCloudflareDecision(governance);
    const [cloudflareAutomation, cloudflareCertification, cloudflareCrossDivision, cloudflareOrchestration, cloudflareExecution] = await Promise.all([
      getCloudflareAutomationLoops(governance),
      getMarketplaceCloudflareCertification(governance, modules2.map((entry) => entry.id)),
      getCloudflareCrossDivisionSync(governance, env),
      getCloudflareOrchestration(governance, env, { moduleIds: modules2.map((entry) => entry.id) }),
      getCloudflareExecution(governance, env, { moduleIds: modules2.map((entry) => entry.id) })
    ]);
    const cloudflareAdaptive = buildCloudflareAdaptiveFromSignals({
      orchestration: cloudflareOrchestration,
      crossDivision: cloudflareCrossDivision,
      certification: cloudflareCertification,
      decision: cloudflareDecision,
      execution: cloudflareExecution,
      automation: cloudflareAutomation,
      insights: cloudflareInsights,
      autonomous: cloudflareAutonomous
    });
    const cloudflarePredictive = buildCloudflarePredictiveFromSignals({
      adaptive: cloudflareAdaptive,
      orchestration: cloudflareOrchestration,
      crossDivision: cloudflareCrossDivision,
      certification: cloudflareCertification,
      decision: cloudflareDecision,
      execution: cloudflareExecution,
      automation: cloudflareAutomation,
      insights: cloudflareInsights,
      autonomous: cloudflareAutonomous
    });
    const cloudflareStrategic = buildCloudflareStrategicFromSignals({
      predictive: cloudflarePredictive,
      adaptive: cloudflareAdaptive,
      orchestration: cloudflareOrchestration,
      crossDivision: cloudflareCrossDivision,
      certification: cloudflareCertification,
      decision: cloudflareDecision,
      execution: cloudflareExecution,
      automation: cloudflareAutomation,
      insights: cloudflareInsights,
      autonomous: cloudflareAutonomous
    });
    const cloudflareUcip = buildCloudflareUcipFromSignals({
      automation: cloudflareAutomation,
      autonomous: cloudflareAutonomous,
      decision: cloudflareDecision,
      certification: cloudflareCertification,
      crossDivision: cloudflareCrossDivision,
      orchestration: cloudflareOrchestration,
      execution: cloudflareExecution,
      adaptive: cloudflareAdaptive,
      predictive: cloudflarePredictive,
      strategic: cloudflareStrategic,
      insights: cloudflareInsights
    });
    const heartbeatModuleIds = modules2.map((entry) => entry.id);
    const metaStack = await resolveMetaIntelligenceStack(
      governance,
      env,
      {
        cloudflareUcip,
        moduleIds: heartbeatModuleIds,
        heartbeat: { governanceHealth, pipelineEngineHealth: pipelineHealth }
      },
      "heartbeat"
    );
    const cloudflareAmg = metaStack.cloudflareAmg;
    const cloudflareCba = metaStack.cloudflareCba;
    const cloudflareCal = metaStack.cloudflareCal;
    const cloudflareIhl = metaStack.cloudflareIhl;
    const cloudflareIarl = metaStack.cloudflareIarl;
    const cloudflareAcl = metaStack.cloudflareAcl;
    const triggers = cloudflareAutonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
    const expandedFederationScore = getExpandedFederationScore(
      federationHeartbeat.cloudflareFederationScore,
      cloudflareAutonomous.cloudflareSafety?.autonomousScore,
      cloudflareInsights.cloudflareInsightsScore,
      triggers
    );
    cfHeartbeat = buildCloudflareHeartbeatFields({
      federationReadiness,
      federationHeartbeat,
      cloudflareObservability,
      cloudflareAutonomous,
      cloudflareInsights,
      cloudflareDecision,
      cloudflareAutomation,
      cloudflareCertification,
      cloudflareCrossDivision,
      cloudflareOrchestration,
      cloudflareExecution,
      cloudflareAdaptive,
      cloudflarePredictive,
      cloudflareStrategic,
      cloudflareUcip,
      cloudflareAmg,
      cloudflareCba,
      cloudflareCal,
      cloudflareIhl,
      cloudflareIarl,
      cloudflareAcl,
      expandedFederationScore,
      triggers,
      cloudflareAutonomousHealth: deriveAutonomousHealth(cloudflareAutonomous),
      cloudflareEventsHealth: deriveEventsHealth({ cloudflareEvents: cloudflareAutonomous.cloudflareEvents })
    });
    if (metaStack.advisoryDegraded || metaStack.degraded) {
      cfHeartbeat = {
        ...cfHeartbeat,
        cloudflareAdvisoryDegraded: true,
        cloudflareAdvisoryDegradedReason: metaStack.federationMeta?.reasons?.[0] || "Meta-intelligence stack returned degraded advisory payload."
      };
    }
  } catch (error) {
    cfHeartbeat = buildAdvisoryHeartbeatFallback(error);
  }
  return {
    ...base,
    globalRouterHealth: routingHealth ? "online" : "idle",
    memoryHealth,
    pipelineEngineHealth: pipelineHealth,
    sandboxHealth,
    configHealth,
    scenarioEngineHealth: publicScenarioHealth,
    autonomyLoopV2Health: autonomyHealth,
    governanceHealth,
    releaseHealth,
    integrationHealth,
    certificationHealth,
    safetyHealth: latestSafetyDecision?.allowed === false ? "warning" : "online",
    versionHealth: versionInfo.current || "v3.5",
    divisionUptimeStartedAt: startedAt,
    ...cfHeartbeat
  };
}
__name(computeOsHeartbeat, "computeOsHeartbeat");
async function updateHeartbeatSnapshot(env, overrides = {}) {
  const heartbeat = {
    id: "division-heartbeat",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...await computeHeartbeat(env),
    ...overrides
  };
  await putRecord(env, "HEARTBEAT", heartbeat.id, heartbeat);
  if (Object.values(heartbeat.kvHealth || {}).some((status) => status === "error" || status === "degraded")) {
    await emitEvent(env, "heartbeat-warning", {
      details: "Heartbeat detected KV degradation in the division runtime."
    });
  }
  return heartbeat;
}
__name(updateHeartbeatSnapshot, "updateHeartbeatSnapshot");
async function resolveEscalation(env, escalationId) {
  const escalation = await getRecord(env, "ESCALATIONS", escalationId);
  if (!escalation) {
    return null;
  }
  escalation.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
  await putRecord(env, "ESCALATIONS", escalation.id, escalation);
  await emitEvent(env, "escalation-resolved", {
    escalationId: escalation.id,
    payloadId: escalation.payloadId,
    details: `Escalation ${escalation.id} resolved.`
  });
  return escalation;
}
__name(resolveEscalation, "resolveEscalation");
async function publishModule(env, moduleId) {
  const moduleRecord = await getRecord(env, "MODULES", moduleId);
  if (!moduleRecord) {
    return null;
  }
  moduleRecord.publishedAt = (/* @__PURE__ */ new Date()).toISOString();
  moduleRecord.updatedAt = moduleRecord.publishedAt;
  await putRecord(env, "MODULES", moduleRecord.id, moduleRecord);
  await emitEvent(env, "module-published", {
    moduleId: moduleRecord.id,
    details: `Module ${moduleRecord.id} published.`
  });
  return moduleRecord;
}
__name(publishModule, "publishModule");
async function annotatePayload(env, payloadId, annotationPayload) {
  const payload = await getRecord(env, "PAYLOADS", payloadId);
  if (!payload) {
    return null;
  }
  const annotation = normalizeAnnotationPayload(annotationPayload);
  if (!annotation.annotation) {
    throw new Error("annotation is required");
  }
  payload.annotations = Array.isArray(payload.annotations) ? payload.annotations : [];
  payload.annotations.push({
    id: buildId("note"),
    annotation: annotation.annotation,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await putRecord(env, "PAYLOADS", payload.id, payload);
  await emitEvent(env, "payload-annotated", {
    payloadId: payload.id,
    details: `Payload ${payload.id} annotated by operator.`
  });
  return payload;
}
__name(annotatePayload, "annotatePayload");
async function rerunPayloadChain(env, payloadId) {
  const payload = await getRecord(env, "PAYLOADS", payloadId);
  if (!payload) {
    return null;
  }
  const initialAgent = Array.isArray(payload.chain) && payload.chain.length ? payload.chain[0] : payload.agent;
  const flow = await executeAgentFlow(
    env,
    {
      intent: payload.intent,
      source: "operator-rerun",
      agent: initialAgent
    },
    {
      initialAgent,
      allowChaining: true,
      source: "operator-rerun",
      triggerPayloadId: payload.id,
      kind: "operator-rerun"
    }
  );
  return flow;
}
__name(rerunPayloadChain, "rerunPayloadChain");
async function executeOperatorCommand(env, commandText) {
  const command = normalizeText12(commandText);
  if (!command) {
    throw new Error("command is required");
  }
  const parts = command.split(" ");
  const verb = parts[0];
  if (verb === "resolve" && parts[1]) {
    const escalation = await resolveEscalation(env, parts[1]);
    if (!escalation) {
      throw new Error("Escalation not found");
    }
    return { action: "resolve", escalation };
  }
  if (verb === "publish" && parts[1]) {
    const moduleRecord = await publishModule(env, parts[1]);
    if (!moduleRecord) {
      throw new Error("Module not found");
    }
    return { action: "publish", module: moduleRecord };
  }
  if (verb === "annotate" && parts[1] && parts.length > 2) {
    const payload = await annotatePayload(env, parts[1], { annotation: parts.slice(2).join(" ") });
    if (!payload) {
      throw new Error("Payload not found");
    }
    return { action: "annotate", payload };
  }
  if (verb === "rerun" && parts[1]) {
    const flow = await rerunPayloadChain(env, parts[1]);
    if (!flow) {
      throw new Error("Payload not found");
    }
    return { action: "rerun", flow };
  }
  if (verb === "route" && parts.length > 2) {
    const maybeAgent = parts[parts.length - 1];
    if (!AGENTS.includes(maybeAgent)) {
      throw new Error("Unknown agent in route command");
    }
    const intent = parts.slice(1, -1).join(" ");
    const flow = await executeAgentFlow(
      env,
      {
        intent,
        source: "operator-command",
        agent: maybeAgent
      },
      {
        initialAgent: maybeAgent,
        allowChaining: true,
        source: "operator-command",
        kind: "operator-command"
      }
    );
    return { action: "route", flow };
  }
  throw new Error("Unsupported command");
}
__name(executeOperatorCommand, "executeOperatorCommand");
async function handleMarketplaceIndex(request, env, url) {
  const wantsJson = url.searchParams.get("format") === "json" || (request.headers.get("accept") || "").includes("application/json");
  if (!wantsJson) {
    return serveStatic(request, env, "/marketplace");
  }
  const items = await listMarketplaceIndex(env);
  return json2({ modules: items });
}
__name(handleMarketplaceIndex, "handleMarketplaceIndex");
async function handleMarketplaceSearch(request, env, url, logSearches = true) {
  const term = normalizeText12(url.searchParams.get("q"));
  const source = url.searchParams.get("source") || "marketplace-search";
  const items = await listMarketplaceIndex(env);
  const results = term ? rankMarketplaceSearch(items, term) : items;
  if (logSearches && term) {
    await logSearch(env, term, results.length, source);
  }
  return json2({ query: term, results });
}
__name(handleMarketplaceSearch, "handleMarketplaceSearch");
async function renderDynamicModulePage(env, moduleId) {
  const moduleRecord = await getRecord(env, "MODULES", moduleId);
  if (!moduleRecord) {
    return html("<h1>Module not found</h1>", 404);
  }
  const lineage = Array.isArray(moduleRecord.lineage) && moduleRecord.lineage.length ? moduleRecord.lineage.join(" -> ") : moduleRecord.agent;
  const markup = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(moduleRecord.name)} | MSHOPS.NET</title>
    <style>
      body {
        margin: 0;
        padding: 32px;
        font: 400 16px/1.7 Inter Tight, sans-serif;
        color: #f0eee8;
        background: linear-gradient(180deg, #050608 0%, #0a0d12 100%);
      }
      main {
        max-width: 820px;
        margin: 0 auto;
        padding: 28px;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px;
        background: rgba(14, 17, 22, 0.92);
      }
      h1, h2 { margin-top: 0; }
      p { color: #97a0a8; }
      .eyebrow {
        color: #f2c14e;
        font: 600 12px/1.4 IBM Plex Mono, monospace;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .meta {
        display: grid;
        gap: 8px;
        margin-top: 24px;
      }
      .meta span {
        color: #52b8ff;
        font: 500 12px/1.4 IBM Plex Mono, monospace;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      a { color: #f2c14e; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">[ MARKETPLACE MODULE :: PUBLIC PAGE ]</p>
      <h1>${escapeHtml(moduleRecord.name)}</h1>
      <p>${escapeHtml(moduleRecord.summary)}</p>
      <h2>Content</h2>
      <p>${escapeHtml(moduleRecord.content)}</p>
      <div class="meta">
        <span>Created: ${escapeHtml(moduleRecord.createdAt)}</span>
        <span>Published: ${escapeHtml(moduleRecord.publishedAt || "pending")}</span>
        <span>Agent: ${escapeHtml(moduleRecord.agent)}</span>
        <span>Agent Lineage: ${escapeHtml(lineage)}</span>
      </div>
      <p><a href="/marketplace">Return to marketplace</a></p>
    </main>
  </body>
</html>`;
  return html(markup);
}
__name(renderDynamicModulePage, "renderDynamicModulePage");
async function runAutonomyLoopV2(env, cronLabel = "manual") {
  const payloads = await listRecords(env, "PAYLOADS", 30);
  const actions = [];
  for (const payload of payloads) {
    const payloadText = `${payload.summary} ${payload.intent}`.toLowerCase();
    if ((payload.output?.severity || 0) > 80) {
      const escalation = payload.output?.escalationId ? await resolveEscalation(env, payload.output.escalationId) : null;
      const annotated = await annotatePayload(env, payload.id, {
        annotation: "Autonomy loop v2 auto-resolved high severity escalation."
      });
      const action = {
        id: buildId("auto"),
        triggerPayloadId: payload.id,
        agent: "operator-sentinel",
        reason: "high-severity-auto-resolve",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        cron: cronLabel,
        result: {
          escalationId: escalation?.id || null,
          annotationCount: annotated?.annotations?.length || 0
        }
      };
      await putRecord(env, "AUTONOMY_LOGS", action.id, action);
      await emitEvent(env, "autonomy-loop-action", {
        payloadId: payload.id,
        escalationId: escalation?.id || null,
        agent: "operator-sentinel",
        details: "Autonomy loop auto-resolved high severity escalation and annotated payload."
      });
      actions.push(action);
    }
    const moduleId = payload.output?.moduleId || payload.output?.envelope?.module || null;
    if (moduleId) {
      const moduleRecord = await getRecord(env, "MODULES", moduleId);
      if (moduleRecord && !moduleRecord.publishedAt) {
        const published = await publishModule(env, moduleId);
        const action = {
          id: buildId("auto"),
          triggerPayloadId: payload.id,
          agent: "marketplace-sync",
          reason: "auto-publish-module",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          cron: cronLabel,
          result: {
            moduleId: published?.id || moduleId
          }
        };
        await putRecord(env, "AUTONOMY_LOGS", action.id, action);
        await emitEvent(env, "autonomy-loop-action", {
          payloadId: payload.id,
          moduleId,
          agent: "marketplace-sync",
          details: `Autonomy loop auto-published module ${moduleId}.`
        });
        actions.push(action);
      }
    }
    const chain = Array.isArray(payload.chain) ? payload.chain : [];
    if (chain.includes("route-advisory") && !chain.includes("payload-generator")) {
      const flow = await executeAgentFlow(
        env,
        { intent: payload.intent, source: "autonomy-loop", agent: "payload-generator" },
        {
          initialAgent: "payload-generator",
          allowChaining: true,
          source: "autonomy-loop",
          triggerPayloadId: payload.id,
          kind: "autonomy-chain"
        }
      );
      const action = {
        id: buildId("auto"),
        triggerPayloadId: payload.id,
        agent: "payload-generator",
        reason: "chain-incomplete",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        cron: cronLabel,
        result: {
          payloadIds: flow.payloadIds
        }
      };
      await putRecord(env, "AUTONOMY_LOGS", action.id, action);
      await emitEvent(env, "autonomy-loop-action", {
        payloadId: payload.id,
        agent: "payload-generator",
        details: "Autonomy loop completed missing chain agents."
      });
      actions.push(action);
    }
    if (["update", "refresh", "sync"].some((keyword) => payloadText.includes(keyword))) {
      const flow = await executeAgentFlow(
        env,
        { intent: payload.intent, source: "autonomy-loop", agent: "marketplace-sync" },
        {
          initialAgent: "marketplace-sync",
          allowChaining: false,
          source: "autonomy-loop",
          triggerPayloadId: payload.id,
          kind: "autonomy-sync"
        }
      );
      const action = {
        id: buildId("auto"),
        triggerPayloadId: payload.id,
        agent: "marketplace-sync",
        reason: "refresh-sync-trigger",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        cron: cronLabel,
        result: {
          payloadIds: flow.payloadIds
        }
      };
      await putRecord(env, "AUTONOMY_LOGS", action.id, action);
      await emitEvent(env, "autonomy-loop-action", {
        payloadId: payload.id,
        agent: "marketplace-sync",
        details: "Autonomy loop re-ran marketplace-sync for refresh/update signal."
      });
      actions.push(action);
    }
  }
  try {
    const governance = await getGovernanceConfig(env);
    const [autonomous, automation] = await Promise.all([
      getCloudflareAutonomousSnapshot(governance),
      getCloudflareAutomationLoops(governance)
    ]);
    const triggers = autonomous.cloudflareGovernance?.autonomousSignals?.triggers || [];
    if (triggers.length) {
      const action = {
        id: buildId("auto"),
        agent: "cloudflare-federation",
        reason: "cloudflare-autonomous-advisory",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        cron: cronLabel,
        advisoryOnly: true,
        result: {
          triggers,
          autonomousScore: autonomous.cloudflareSafety?.autonomousScore ?? null,
          eventHooks: autonomous.cloudflareEvents || {}
        }
      };
      await putRecord(env, "AUTONOMY_LOGS", action.id, action);
      await emitEvent(env, "cloudflare-autonomous-advisory", {
        agent: "cloudflare-federation",
        details: `Cloudflare autonomous advisories: ${triggers.join(", ")}`
      });
      actions.push(action);
    }
    if (automation.activeCount > 0) {
      const activeLoops = Object.entries(automation.loops || {}).filter(([, loop]) => loop.active).map(([id]) => id);
      const action = {
        id: buildId("auto"),
        agent: "cloudflare-federation",
        reason: "cloudflare-automation-advisory",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        cron: cronLabel,
        advisoryOnly: true,
        result: {
          activeLoops,
          loops: automation.loops,
          activeCount: automation.activeCount
        }
      };
      await putRecord(env, "AUTONOMY_LOGS", action.id, action);
      await emitEvent(env, "cloudflare-automation-advisory", {
        agent: "cloudflare-federation",
        details: `Cloudflare automation loops active: ${activeLoops.join(", ")}`
      });
      actions.push(action);
    }
  } catch {
  }
  return actions;
}
__name(runAutonomyLoopV2, "runAutonomyLoopV2");
function makePublicModuleView(module) {
  return {
    id: module.id,
    name: module.name,
    summary: module.summary || module.description,
    publicUrl: module.publicUrl || module.metadata?.publicUrl || module.metadata?.route || `/marketplace/${module.id}`,
    publishedAt: module.publishedAt || module.metadata?.publishedAt || null
  };
}
__name(makePublicModuleView, "makePublicModuleView");
async function handleApi(request, env, url) {
  const method = request.method || "GET";
  const pathname = url.pathname;
  if (method === "POST" && pathname === "/api/service-selector") {
    try {
      const payload = await readBody2(request);
      const answers = normalizeSelectorAnswers2(payload);
      const result = computeServiceSelectorResult2(answers);
      recordServiceSelectorSubmission2(answers, result);
      return json2(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json2({ error: error.message || "service-selector-failed" }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/service-selector/catalog") {
    return json2({
      services: serviceCatalog2.filter((service) => service.active)
    });
  }
  if (method === "POST" && pathname === "/api/audit-lite") {
    try {
      const payload = await readBody2(request);
      const answers = normalizeAuditLiteAnswers2(payload);
      const result = computeAuditLiteResult2(answers);
      recordAuditLiteSubmission2(answers, result);
      return json2(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json2({ error: error.message || "audit-lite-failed" }, 400);
    }
  }
  if (method === "POST" && pathname === "/api/prompt-injection-scan") {
    try {
      const payload = await readBody2(request);
      const answers = normalizePromptInjectionAnswers2(payload);
      const result = computePromptInjectionResult2(answers);
      recordPromptInjectionSubmission2(answers, result);
      return json2(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json2({ error: error.message || "prompt-injection-scan-failed" }, 400);
    }
  }
  if (method === "POST" && pathname === "/api/agent-readiness-check") {
    try {
      const payload = await readBody2(request);
      const answers = normalizeAgentReadinessAnswers2(payload);
      const result = computeAgentReadinessResult2(answers);
      recordAgentReadinessSubmission2(answers, result);
      return json2(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json2({ error: error.message || "agent-readiness-check-failed" }, 400);
    }
  }
  if (method === "POST" && pathname === "/api/automation-roi-calculate") {
    try {
      const payload = await readBody2(request);
      const answers = normalizeAutomationRoiAnswers2(payload);
      const result = computeAutomationRoiResult2(answers);
      recordAutomationRoiSubmission2(answers, result);
      return json2(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json2({ error: error.message || "automation-roi-calculate-failed" }, 400);
    }
  }
  if (method === "POST" && pathname === "/api/rag-risk-analyze") {
    try {
      const payload = await readBody2(request);
      const answers = normalizeRagRiskAnswers2(payload);
      const result = computeRagRiskResult2(answers);
      recordRagRiskSubmission2(answers, result);
      return json2(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json2({ error: error.message || "rag-risk-analyze-failed" }, 400);
    }
  }
  if (method === "POST" && pathname === "/api/os/route") {
    try {
      const body = await readBody2(request);
      return json2(await computeGlobalRoutePlan(env, body), 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/os/route") {
    try {
      const routes = await listRecords(env, "OS_ROUTING", 100);
      return json2({ routes });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/os/memory") {
    try {
      const memory = await listRecords(env, "DIVISION_MEMORY", 200);
      return json2({ memory });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && pathname === "/api/os/memory") {
    try {
      const body = await readBody2(request);
      return json2(await saveDivisionMemoryEntry(env, body), 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "DELETE" && pathname.startsWith("/api/os/memory/")) {
    try {
      const key = pathname.split("/").pop();
      await deleteRecord(env, "DIVISION_MEMORY", key);
      await emitEvent(env, "division-memory-deleted", {
        details: `Division memory key ${key} deleted.`
      });
      return json2({ deleted: true, key });
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/os/config") {
    try {
      const config = await getOsConfig(env);
      const history = await listRecords(env, "OS_CONFIG", 20);
      return json2({ config, history });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && pathname === "/api/os/config") {
    try {
      const body = await readBody2(request);
      const saved = await saveOsConfig(env, body);
      await emitEvent(env, "os-config-updated", {
        details: "OS config updated."
      });
      await recordAudit(env, "os-config", "Updated OS config.");
      return json2(saved, 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/os/governance") {
    try {
      const config = await getGovernanceConfig(env);
      const decisions = await getRecentGovernanceDecisions(env, 50);
      const cloudflareGovernanceHealth = await getCloudflareGovernanceHealth(config);
      const cloudflareDecisioning = await getCloudflareGovernanceDecisioning(config, env);
      return json2({
        config,
        decisions,
        cloudflareGovernanceHealth,
        cloudflareGovernance: {
          health: cloudflareGovernanceHealth.health,
          signals: cloudflareGovernanceHealth.signals,
          actionsHealth: cloudflareGovernanceHealth.actionsHealth,
          autonomousSignals: cloudflareGovernanceHealth.autonomousSignals,
          automationSignals: cloudflareDecisioning.automationSignals,
          certificationSignals: cloudflareDecisioning.certificationSignals,
          crossDivisionSignals: cloudflareDecisioning.crossDivisionSignals,
          crossDivisionRecommendedAction: cloudflareDecisioning.crossDivisionRecommendedAction,
          orchestrationSignals: cloudflareDecisioning.orchestrationSignals,
          orchestrationRecommendedAction: cloudflareDecisioning.orchestrationRecommendedAction,
          executionSignals: cloudflareDecisioning.executionSignals,
          executionRecommendedAction: cloudflareDecisioning.executionRecommendedAction,
          adaptiveSignals: cloudflareDecisioning.adaptiveSignals,
          adaptiveRecommendedAction: cloudflareDecisioning.adaptiveRecommendedAction,
          predictiveSignals: cloudflareDecisioning.predictiveSignals,
          predictiveRecommendedAction: cloudflareDecisioning.predictiveRecommendedAction,
          strategicSignals: cloudflareDecisioning.strategicSignals,
          strategicRecommendedAction: cloudflareDecisioning.strategicRecommendedAction,
          ucipSignals: cloudflareDecisioning.ucipSignals,
          ucipRecommendedAction: cloudflareDecisioning.ucipRecommendedAction,
          amgState: cloudflareDecisioning.amgState,
          amgRules: cloudflareDecisioning.amgRules,
          amgOperatorNudges: cloudflareDecisioning.amgOperatorNudges,
          amgPolicyHints: cloudflareDecisioning.amgPolicyHints,
          amgRecommendedAction: cloudflareDecisioning.amgRecommendedAction,
          cbaState: cloudflareDecisioning.cbaState,
          cbaBehaviorPatterns: cloudflareDecisioning.cbaBehaviorPatterns,
          cbaBehaviorDriftWarnings: cloudflareDecisioning.cbaBehaviorDriftWarnings,
          cbaBehaviorHints: cloudflareDecisioning.cbaBehaviorHints,
          calState: cloudflareDecisioning.calState,
          calAlignmentFindings: cloudflareDecisioning.calAlignmentFindings,
          calAlignmentWarnings: cloudflareDecisioning.calAlignmentWarnings,
          calAlignmentHints: cloudflareDecisioning.calAlignmentHints,
          calRecommendedAction: cloudflareDecisioning.calRecommendedAction,
          ihlState: cloudflareDecisioning.ihlState,
          ihlIntentFindings: cloudflareDecisioning.ihlIntentFindings,
          ihlIntentWarnings: cloudflareDecisioning.ihlIntentWarnings,
          ihlIntentHints: cloudflareDecisioning.ihlIntentHints,
          ihlRecommendedAction: cloudflareDecisioning.ihlRecommendedAction,
          iarlState: cloudflareDecisioning.iarlState,
          iarlResonanceFindings: cloudflareDecisioning.iarlResonanceFindings,
          iarlResonanceWarnings: cloudflareDecisioning.iarlResonanceWarnings,
          iarlResonanceHints: cloudflareDecisioning.iarlResonanceHints,
          iarlRecommendedAction: cloudflareDecisioning.iarlRecommendedAction,
          aclState: cloudflareDecisioning.aclState,
          aclCoherenceFindings: cloudflareDecisioning.aclCoherenceFindings,
          aclCoherenceWarnings: cloudflareDecisioning.aclCoherenceWarnings,
          aclCoherenceHints: cloudflareDecisioning.aclCoherenceHints,
          aclRecommendedAction: cloudflareDecisioning.aclRecommendedAction,
          advisoryOnly: cloudflareGovernanceHealth.advisoryOnly,
          decisioning: cloudflareDecisioning.decisioning,
          recommendedAction: cloudflareDecisioning.recommendedAction,
          riskSummary: cloudflareDecisioning.riskSummary
        }
      });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && pathname === "/api/os/governance") {
    try {
      const body = await readBody2(request);
      const saved = await saveGovernanceConfig(env, body);
      await recordAudit(env, "governance", "Updated governance config.");
      return json2(saved, 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "POST" && pathname === "/api/os/safety/check") {
    try {
      const body = await readBody2(request);
      return json2(await evaluateSafetyCheck(env, body), 200);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/os/version") {
    let version = { current: "v3.5", history: ["v3.5"], lastUpgrade: null };
    try {
      version = await getOsVersion(env);
    } catch {
    }
    let cloudflareMcpHealth = buildCloudflareVersionHealthFallback(new Error("Cloudflare version health unavailable"));
    try {
      const governance = await getGovernanceConfig(env);
      cloudflareMcpHealth = await getCloudflareVersionHealth(governance, env);
    } catch (error) {
      cloudflareMcpHealth = buildCloudflareVersionHealthFallback(error);
    }
    return json2({
      ...version,
      ...flattenCloudflareVersionHealthResponse(cloudflareMcpHealth)
    });
  }
  if (method === "POST" && pathname === "/api/os/version") {
    try {
      const body = await readBody2(request);
      const current = await getOsVersion(env);
      const nextVersion = {
        current: normalizeText12(body.current) || current.current,
        history: Array.isArray(body.history) && body.history.length ? body.history : [.../* @__PURE__ */ new Set([...current.history, normalizeText12(body.current) || current.current])],
        lastUpgrade: body.lastUpgrade || (/* @__PURE__ */ new Date()).toISOString()
      };
      const saved = await saveOsVersion(env, nextVersion);
      await recordAudit(env, "version", `Updated OS version to ${saved.current}.`);
      let cloudflareMcpHealth = buildCloudflareVersionHealthFallback(new Error("Cloudflare version health unavailable"));
      try {
        cloudflareMcpHealth = await getCloudflareVersionHealth(await getGovernanceConfig(env), env);
      } catch (error) {
        cloudflareMcpHealth = buildCloudflareVersionHealthFallback(error);
      }
      return json2({
        ...saved,
        ...flattenCloudflareVersionHealthResponse(cloudflareMcpHealth)
      }, 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/os/integration") {
    try {
      return json2({ integrations: await listIntegrations(env) });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && pathname === "/api/os/integration") {
    try {
      const body = await readBody2(request);
      const integration = await createIntegration(env, body);
      await recordAudit(env, "integration", `Created integration ${integration.name}.`);
      return json2(integration, 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "DELETE" && pathname.startsWith("/api/os/integration/")) {
    try {
      const integrationId = pathname.split("/").pop();
      const deleted = await deleteIntegration(env, integrationId);
      if (!deleted) {
        return notFound();
      }
      await recordAudit(env, "integration-delete", `Deleted integration ${deleted.name}.`);
      return json2({ deleted: true, integration: deleted });
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "POST" && pathname === "/api/os/certify") {
    try {
      const body = await readBody2(request);
      const certification = await runCertification(env, body);
      await recordAudit(env, "certification", `Ran certification for ${certification.agent}.`);
      return json2(certification, 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/os/certification") {
    try {
      const certifications = await listRecords(env, "CERTIFICATION", 100);
      return json2({ certifications });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && pathname === "/api/os/release") {
    try {
      const body = await readBody2(request);
      const release = await applyRelease(env, body);
      await recordAudit(env, "release", `Applied release ${release.version}.`);
      return json2(release, 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/os/releases/cloudflare") {
    try {
      return json2(await getCloudflareBuildPreview());
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/os/releases") {
    try {
      const releases = await listRecords(env, "RELEASES", 100);
      return json2({
        releases,
        cloudflareBuildStatus: await getCloudflareBuildStatus()
      });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname.startsWith("/api/os/releases/")) {
    try {
      const releaseId = pathname.split("/").pop();
      const release = await getRecord(env, "RELEASES", releaseId);
      if (!release) {
        return notFound();
      }
      return json2(release);
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && pathname === "/api/operator/intent") {
    try {
      const body = await readBody2(request);
      return json2(await createOperatorIntent(env, body), 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/operator/intent") {
    try {
      const intents = await listRecords(env, "OPERATOR_INTENTS", 100);
      return json2({ intents });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && pathname === "/api/pipeline") {
    try {
      const body = await readBody2(request);
      return json2(await runPipeline(env, body), 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/pipeline") {
    try {
      const pipelines = await listRecords(env, "PIPELINES", 100);
      const cloudflareBindingHealth = await getCloudflareBindingHealth();
      const governance = await getGovernanceConfig(env);
      const pipelineDecision = await getCloudflarePipelineDecision(governance);
      const crossDivision = await getCloudflareCrossDivisionSync(governance, env);
      const orchestration = await getCloudflareOrchestration(governance, env, { moduleIds: modules2.map((entry) => entry.id) });
      const execution = await getCloudflareExecution(governance, env, { moduleIds: modules2.map((entry) => entry.id) });
      const marketplaceFields = getOperatorMarketplaceCrossDivisionFields(crossDivision);
      const orchestrationFields = getCloudflarePipelineOrchestrationFields(orchestration);
      const executionFields = getCloudflarePipelineExecutionFields(execution);
      return json2({
        pipelines,
        cloudflareBindings: cloudflareBindingHealth.inspection,
        cloudflareBindingHealth: cloudflareBindingHealth.health,
        cloudflareBindingValidation: cloudflareBindingHealth.validation,
        ...pipelineDecision,
        ...marketplaceFields,
        ...orchestrationFields,
        ...executionFields
      });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && pathname === "/api/sandbox") {
    try {
      const body = await readBody2(request);
      return json2(await runSandbox(env, body), 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/sandbox") {
    try {
      const logs = await listRecords(env, "SANDBOX_LOGS", 100);
      return json2({ logs });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && pathname === "/api/public/scenario") {
    try {
      const body = await readBody2(request);
      return json2(await runPublicScenario(env, body), 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/public/scenario") {
    try {
      const scenarios = await listRecords(env, "PUBLIC_SCENARIOS", 50);
      return json2({ scenarios });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/os/heartbeat") {
    try {
      return json2(await computeOsHeartbeat(env));
    } catch (error) {
      const fallback = buildCloudflareAdvisoryFallback("autonomous", error);
      return json2({
        globalRouterHealth: "idle",
        memoryHealth: "idle",
        pipelineEngineHealth: "idle",
        governanceHealth: "default",
        versionHealth: "v3.5",
        advisoryOnly: true,
        degraded: true,
        ...buildCloudflareHeartbeatFields({}),
        cloudflareFederationHealth: "degraded",
        cloudflareFederationScore: fallback.score,
        reasons: fallback.reasons,
        error: error.message,
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  if (method === "GET" && pathname === "/api/os/federation/cloudflare") {
    try {
      return json2(await getCloudflareFederationSnapshot());
    } catch (error) {
      return json2({
        federation: "cloudflare-mcp",
        optional: true,
        advisoryOnly: true,
        degraded: true,
        ...buildCloudflareAdvisoryFallback("autonomous", error),
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  if (method === "GET" && pathname === "/api/os/cloudflare") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => getCloudflareIntegrationSnapshot(governance), "autonomous");
  }
  if (method === "GET" && pathname === "/docs/cloudflare-federation") {
    return html(getCloudflareFederationDocumentation("html"));
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/federation/routes") {
    return json2(getCloudflareFederationRouteCatalog());
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/federation/docs") {
    return json2(getCloudflareFederationDocumentation("json"));
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/sync") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const sync = await getCloudflareCrossDivisionSync(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      });
      return normalizeCrossDivisionFields({
        operatorShell: sync.operatorShell,
        marketplaceBackend: sync.marketplaceBackend,
        syncStatus: sync.syncStatus,
        crossDivisionScore: sync.crossDivisionScore,
        crossDivisionHealth: sync.crossDivisionHealth,
        crossDivisionReasons: sync.crossDivisionReasons,
        sources: sync.sources,
        checkedAt: sync.checkedAt
      });
    }, "sync");
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/cross-division") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const federation = await getCloudflareCrossDivisionFederation(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      });
      return normalizeCrossDivisionFields({
        cloudflareCrossDivisionScore: federation.cloudflareCrossDivisionScore,
        cloudflareCrossDivisionHealth: federation.cloudflareCrossDivisionHealth,
        cloudflareCrossDivisionReasons: federation.cloudflareCrossDivisionReasons,
        syncStatus: federation.syncStatus,
        operatorShell: federation.operatorShell,
        marketplaceBackend: federation.marketplaceBackend,
        routes: federation.routes,
        sources: federation.sources,
        checkedAt: federation.checkedAt
      });
    }, "cross-division");
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/automation") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const automation = await getCloudflareAutomationLoops(governance);
      return {
        loops: automation.loops,
        activeCount: automation.activeCount,
        health: automation.health,
        score: automation.score,
        mode: automation.mode,
        reasons: automation.reasons,
        checkedAt: automation.checkedAt
      };
    }, "automation");
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/autonomous") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => getCloudflareAutonomousSnapshot(governance), "autonomous");
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/orchestration") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const orchestration = await getCloudflareOrchestration(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      });
      return {
        plan: orchestration.plan,
        agents: orchestration.agents,
        recommendedActions: orchestration.recommendedActions,
        orchestrationScore: orchestration.orchestrationScore,
        orchestrationHealth: orchestration.orchestrationHealth,
        orchestrationReasons: orchestration.orchestrationReasons,
        syncStatus: orchestration.syncStatus,
        checkedAt: orchestration.checkedAt
      };
    }, "orchestration");
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/agents") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () => getCloudflareAgentSignals(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      }),
      "agents"
    );
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/execution") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const execution = await getCloudflareExecution(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      });
      return {
        executionPlan: execution.executionPlan,
        nextActions: execution.nextActions,
        executionScore: execution.executionScore,
        executionHealth: execution.executionHealth,
        executionReasons: execution.executionReasons,
        syncStatus: execution.syncStatus,
        checkedAt: execution.checkedAt
      };
    }, "execution");
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/execution/signals") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () => getCloudflareExecutionSignals(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      }),
      "execution-signals"
    );
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/events") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const inputs = await collectAutonomousSignalInputs();
      const autonomousSignals = buildAutonomousGovernanceSignals(inputs, governance);
      return simulateCloudflareEventHooks(autonomousSignals, inputs);
    }, "events");
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/insights") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => getCloudflareInsights(governance), "insights");
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/decision") {
    const governance = await getGovernanceConfig(env);
    const moduleId = url.searchParams.get("moduleId") || null;
    return jsonCloudflareRoute(async () => getCloudflareDecision(governance, { moduleId }), "decision");
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/adaptive") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () => getCloudflareAdaptiveRuntime(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      }),
      "adaptive"
    );
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/predictive") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () => getCloudflarePredictiveModeling(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      }),
      "predictive"
    );
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/strategic") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () => getCloudflareStrategicPlanning(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      }),
      "strategic"
    );
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/ucip") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () => getCloudflareUcip(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      }),
      "ucip"
    );
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/amg") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () => getCloudflareAmg(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      }),
      "amg"
    );
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/cba") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () => getCloudflareCba(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      }),
      "cba"
    );
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/cal") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () => getCloudflareCal(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      }),
      "cal"
    );
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/ihl") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () => getCloudflareIhl(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      }),
      "ihl"
    );
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/iarl") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () => getCloudflareIarl(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      }),
      "iarl"
    );
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/acl") {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(
      async () => getCloudflareAcl(governance, env, {
        moduleIds: modules2.map((entry) => entry.id)
      }),
      "acl"
    );
  }
  if (method === "GET" && (pathname === "/api/marketplace/certification" || pathname === "/api/os/cloudflare/certification")) {
    const governance = await getGovernanceConfig(env);
    return jsonCloudflareRoute(async () => {
      const certification = await getMarketplaceCloudflareCertification(
        governance,
        modules2.map((entry) => entry.id)
      );
      return {
        ...certification,
        modules: Object.values(certification.certifications || {})
      };
    }, "certification");
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/docs") {
    try {
      const query = url.searchParams.get("q") || url.searchParams.get("query") || "";
      const topic = url.searchParams.get("topic") || null;
      return json2(await searchCloudflareDocs(query, { topic }));
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/quick-actions") {
    try {
      const category = url.searchParams.get("category") || null;
      return json2({ quickActions: getDocsQuickActions(category), topics: ["workers", "kv", "durable-objects", "email", "cloudflare-one", "security", "performance"] });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/logs") {
    try {
      return json2(await getCloudflareLogs({
        worker: url.searchParams.get("worker") || void 0,
        hours: url.searchParams.get("hours") || void 0,
        limit: url.searchParams.get("limit") || void 0
      }));
    } catch (error) {
      return json2({ status: "degraded", health: "degraded", advisory: error.message, logs: [], checkedAt: (/* @__PURE__ */ new Date()).toISOString() });
    }
  }
  if (method === "GET" && pathname === "/api/os/cloudflare/metrics") {
    try {
      return json2(await getCloudflareMetrics({
        worker: url.searchParams.get("worker") || void 0,
        hours: url.searchParams.get("hours") || void 0
      }));
    } catch (error) {
      return json2({ status: "degraded", health: "degraded", advisory: error.message, metrics: [], checkedAt: (/* @__PURE__ */ new Date()).toISOString() });
    }
  }
  if (method === "POST" && pathname === "/api/os/cloudflare/build") {
    try {
      const body = await readBody2(request);
      return json2(await runCloudflareBuild(body), 201);
    } catch (error) {
      return json2({
        status: "requires_oauth",
        health: "requires_oauth",
        advisory: error.message,
        source: "advisory-fallback",
        logs: [],
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  if (method === "POST" && pathname === "/api/os/cloudflare/validate-bindings") {
    try {
      const body = await readBody2(request);
      return json2(await postValidateCloudflareBindings(body), 200);
    } catch (error) {
      return json2({
        valid: false,
        status: "degraded",
        advisory: error.message,
        warnings: [error.message],
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  if (method === "POST" && pathname === "/api/os/cloudflare/logs/fetch") {
    try {
      const body = await readBody2(request).catch(() => ({}));
      return json2(await postFetchCloudflareLogs(body || {}));
    } catch {
      return json2(await postFetchCloudflareLogs({}));
    }
  }
  if (method === "POST" && pathname === "/api/os/cloudflare/metrics/fetch") {
    try {
      const body = await readBody2(request).catch(() => ({}));
      return json2(await postFetchCloudflareMetrics(body || {}));
    } catch {
      return json2(await postFetchCloudflareMetrics({}));
    }
  }
  if (method === "POST" && pathname === "/api/os/cloudflare/build/run") {
    try {
      const body = await readBody2(request).catch(() => ({}));
      return json2(await postRunCloudflareBuild(body || {}));
    } catch {
      return json2(await postRunCloudflareBuild({}));
    }
  }
  if (method === "POST" && pathname === "/api/os/cloudflare/bindings/validate") {
    try {
      const body = await readBody2(request).catch(() => ({}));
      return json2(await postValidateCloudflareBindingsAction(body || {}));
    } catch {
      return json2(await postValidateCloudflareBindingsAction({}));
    }
  }
  if (method === "POST" && pathname === "/api/os/cloudflare/docs/query") {
    try {
      const body = await readBody2(request).catch(() => ({}));
      return json2(await postQueryCloudflareDocs(body || {}));
    } catch {
      return json2(await postQueryCloudflareDocs({ query: "workers observability" }));
    }
  }
  if (method === "POST" && pathname === "/api/intents") {
    try {
      const payload = await readBody2(request);
      const normalized = normalizeIntentPayload(payload);
      if (!normalized.intent) {
        return json2({ error: "intent is required" }, 400);
      }
      await emitEvent(env, "intent-received", {
        agent: normalized.agent,
        details: `Intent received for ${normalized.agent}.`
      });
      const flow = await executeAgentFlow(env, normalized, {
        initialAgent: normalized.agent,
        allowChaining: true,
        source: normalized.source
      });
      return json2(
        {
          id: flow.intentId,
          status: "accepted",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          agent: normalized.agent,
          payloadId: flow.primary?.payloadId || null,
          chain: flow.chain,
          outputs: flow.outputs
        },
        202
      );
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/payloads") {
    try {
      const payloads = await listRecords(env, "PAYLOADS", 20);
      return json2({ payloads });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname.startsWith("/api/payloads/") && !pathname.includes("/annotate")) {
    try {
      const payloadId = pathname.split("/").pop();
      const payloadRecord = await getRecord(env, "PAYLOADS", payloadId);
      if (!payloadRecord) {
        return notFound();
      }
      return json2(payloadRecord);
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && /^\/api\/operator\/payloads\/[^/]+\/annotate$/.test(pathname)) {
    try {
      const payloadId = pathname.split("/")[4];
      const body = await readBody2(request);
      const payload = await annotatePayload(env, payloadId, body);
      if (!payload) {
        return notFound();
      }
      await emitEvent(env, "operator-command-executed", {
        payloadId: payload.id,
        details: `Payload ${payload.id} annotated via operator route.`
      });
      await recordAudit(env, "annotate", `Annotated payload ${payload.id}.`);
      return json2(payload);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/escalations") {
    try {
      const escalations = await listRecords(env, "ESCALATIONS", 100);
      return json2({ escalations });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname.startsWith("/api/escalations/")) {
    try {
      const escalationId = pathname.split("/").pop();
      const escalation = await getRecord(env, "ESCALATIONS", escalationId);
      if (!escalation) {
        return notFound();
      }
      return json2(escalation);
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && /^\/api\/operator\/escalations\/[^/]+\/resolve$/.test(pathname)) {
    try {
      const escalationId = pathname.split("/")[4];
      const escalation = await resolveEscalation(env, escalationId);
      if (!escalation) {
        return notFound();
      }
      await emitEvent(env, "operator-command-executed", {
        escalationId: escalation.id,
        details: `Escalation ${escalation.id} resolved via operator route.`
      });
      await recordAudit(env, "resolve", `Resolved escalation ${escalation.id}.`);
      return json2(escalation);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/modules") {
    try {
      const syncedModules = await listDynamicModules(env);
      const fallbackModules = modules2.map(serializeModuleSummary);
      const governance = await getGovernanceConfig(env);
      const crossDivision = await getCloudflareCrossDivisionSync(governance, env);
      const marketplaceFields = getOperatorMarketplaceCrossDivisionFields(crossDivision);
      const enriched = [...syncedModules, ...fallbackModules].map((entry) => ({
        ...entry,
        ...marketplaceFields
      }));
      return json2({ modules: enriched, cloudflareCrossDivisionSync: crossDivision.syncStatus });
    } catch (error) {
      const fallbackModules = modules2.map(serializeModuleSummary);
      return json2({ modules: fallbackModules });
    }
  }
  if (method === "GET" && pathname.startsWith("/api/modules/") && pathname !== "/api/modules/status" && pathname !== "/api/modules/metadata") {
    try {
      const moduleId = pathname.split("/").pop();
      const syncedModule = await getRecord(env, "MODULES", moduleId);
      if (syncedModule) {
        return json2(toDynamicModuleSummary(syncedModule));
      }
      const moduleEntry = getModuleById(moduleId);
      if (!moduleEntry) {
        return notFound();
      }
      return json2(serializeModuleSummary(moduleEntry));
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && /^\/api\/operator\/modules\/[^/]+\/publish$/.test(pathname)) {
    try {
      const moduleId = pathname.split("/")[4];
      const moduleRecord = await publishModule(env, moduleId);
      if (!moduleRecord) {
        return notFound();
      }
      await emitEvent(env, "operator-command-executed", {
        moduleId: moduleRecord.id,
        details: `Module ${moduleRecord.id} published via operator route.`
      });
      await recordAudit(env, "publish", `Published module ${moduleRecord.id}.`);
      return json2(moduleRecord);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/modules/status") {
    const status = modules2.map(({ id, name, status: moduleStatus, lastUpdated, metadata }) => ({
      id,
      name,
      status: moduleStatus,
      accessLevel: metadata.accessLevel,
      ctaLabel: metadata.ctaLabel,
      lastUpdated
    }));
    return json2({ status });
  }
  if (method === "GET" && pathname === "/api/modules/metadata") {
    return json2({
      metadata: moduleRegistry2.map(serializeModuleMetadata)
    });
  }
  if (method === "GET" && pathname === "/api/routing") {
    try {
      const routing = await listRecords(env, "ROUTING_LOGS", 200);
      return json2({ routing });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/events") {
    try {
      const type = normalizeText12(url.searchParams.get("type"));
      const events = await listRecords(env, "EVENTS", 200);
      return json2({ events: type ? events.filter((entry) => entry.type === type) : events });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/operator/notifications") {
    try {
      const unreadOnly = url.searchParams.get("unread") === "true";
      const notifications = await listRecords(env, "NOTIFICATIONS", 100);
      return json2({
        notifications: unreadOnly ? notifications.filter((entry) => !entry.readAt) : notifications
      });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && /^\/api\/operator\/notifications\/read\/[^/]+$/.test(pathname)) {
    try {
      const notificationId = pathname.split("/").pop();
      const notification = await markNotificationRead(env, notificationId);
      if (!notification) {
        return notFound();
      }
      await recordAudit(env, "notification-read", `Marked notification ${notification.id} as read.`);
      return json2(notification);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/analytics") {
    try {
      const analytics = await computeAnalytics(env);
      return json2(analytics);
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/analytics/heatmap") {
    try {
      return json2(await computeHeatmap(env));
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/telemetry") {
    try {
      const telemetry = await computeTelemetry(env);
      return json2(telemetry);
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/autonomy") {
    try {
      const actions = await listRecords(env, "AUTONOMY_LOGS", 20);
      return json2({ actions });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/autonomy/logs") {
    try {
      const actions = await listRecords(env, "AUTONOMY_LOGS", 20);
      return json2({ actions });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/search/logs") {
    try {
      const logs = await listRecords(env, "SEARCH_LOGS", 100);
      return json2({ logs });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/operator/audit") {
    try {
      const action = normalizeText12(url.searchParams.get("action"));
      const audit = await listRecords(env, "AUDIT", 200);
      return json2({ audit: action ? audit.filter((entry) => entry.action === action) : audit });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "POST" && pathname === "/api/operator/command") {
    try {
      const body = await readBody2(request);
      const result = await executeOperatorCommand(env, body.command);
      await emitEvent(env, "operator-command-executed", {
        details: `Operator command executed: ${body.command}`
      });
      await recordAudit(env, "command", `Executed operator command: ${body.command}`);
      return json2(result);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "POST" && pathname === "/api/scenario") {
    try {
      const body = await readBody2(request);
      const scenario = await runScenario(env, body);
      await recordAudit(env, "scenario-run", `Executed scenario ${scenario.name} (${scenario.id}).`);
      return json2(scenario, 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/scenario") {
    try {
      const scenarios = await listRecords(env, "SCENARIOS", 50);
      return json2({ scenarios });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname.startsWith("/api/scenario/")) {
    try {
      const scenarioId = pathname.split("/").pop();
      const scenario = await getRecord(env, "SCENARIOS", scenarioId);
      if (!scenario) {
        return notFound();
      }
      return json2(scenario);
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/heartbeat") {
    try {
      const heartbeat = await updateHeartbeatSnapshot(env);
      return json2(heartbeat);
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/public/modules") {
    try {
      const modulesView = await listMarketplaceIndex(env);
      return json2({ modules: modulesView.map(makePublicModuleView) });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname.startsWith("/api/public/modules/")) {
    try {
      const moduleId = pathname.split("/").pop();
      const moduleRecord = await getRecord(env, "MODULES", moduleId);
      if (!moduleRecord) {
        return notFound();
      }
      return json2(makePublicModuleView(toMarketplaceIndexItem(moduleRecord)));
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/public/search") {
    try {
      const searchResponse = await handleMarketplaceSearch(request, env, new URL(`/marketplace/search${url.search}`, url.origin), false);
      const data = await searchResponse.json();
      if (data.query) {
        await logSearch(env, data.query, data.results.length, "public-search");
      }
      return json2({ query: data.query, results: data.results.map(makePublicModuleView) });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/public/agents") {
    return json2({ agents: AGENTS });
  }
  if (method === "GET" && pathname === "/api/public/telemetry") {
    try {
      const telemetry = await computeTelemetry(env);
      return json2({
        totalPayloads: telemetry.totalPayloads,
        totalModules: telemetry.totalModules,
        totalRoutingLogs: telemetry.totalRoutingLogs,
        totalEscalations: telemetry.totalEscalations
      });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/identity") {
    try {
      const identity = getIdentityDescriptor();
      const version = await getOsVersion(env);
      const cloudflareMcp = getCloudflareMcpMetadata();
      const cloudflareReachability = await getCloudflareApiReachability();
      const cloudflareFederationDetail = await getCloudflareIdentityFederation(env);
      return json2({
        ...identity,
        version: version.current,
        versionHistory: version.history,
        lastUpgrade: version.lastUpgrade,
        cloudflareMcp,
        cloudflareMcpReachability: cloudflareReachability,
        cloudflareFederation: cloudflareFederationDetail
      });
    } catch (error) {
      return json2({ error: error.message }, 500);
    }
  }
  if (method === "GET" && pathname === "/api/marketplace/catalog") {
    try {
      const governance = await getGovernanceConfig(env);
      const moduleIds = modules2.map((entry) => entry.id);
      const [decision, insights, certification, crossDivision, orchestration, execution, adaptive, predictive, strategic, ucip] = await Promise.all([
        getCloudflareDecision(governance),
        getCloudflareInsights(governance),
        getMarketplaceCloudflareCertification(governance, moduleIds),
        getCloudflareCrossDivisionSync(governance, env, { moduleIds }),
        getCloudflareOrchestration(governance, env, { moduleIds }),
        getCloudflareExecution(governance, env, { moduleIds }),
        getCloudflareAdaptiveRuntime(governance, env, { moduleIds }),
        getCloudflarePredictiveModeling(governance, env, { moduleIds }),
        getCloudflareStrategicPlanning(governance, env, { moduleIds }),
        getCloudflareUcip(governance, env, { moduleIds })
      ]);
      const amg = buildCloudflareAmgFromUcip(ucip);
      const catalogAlignmentContext = await buildCalAlignmentContextFromEnv(governance, env, { moduleIds });
      const cba = buildCloudflareCbaFromAmg(amg, ucip, catalogAlignmentContext);
      const cal = buildCloudflareCalFromCba(cba, amg, ucip, catalogAlignmentContext);
      const ihl = buildCloudflareIhlFromCal(cal, cba, amg, ucip, catalogAlignmentContext);
      const iarl = buildCloudflareIarlFromIhl(ihl, cal, cba, amg, ucip, catalogAlignmentContext);
      const acl = buildCloudflareAclFromIarl(iarl, ihl, cal, cba, amg, ucip, catalogAlignmentContext);
      return json2({
        items: modules2.map((module) => {
          const moduleCert = certification.certifications?.[module.id] || certifyModuleForCloudflare(module.id);
          const marketplaceModuleCert = certification.certifications?.[module.id] || {
            score: crossDivision.marketplaceBackend?.certification?.score ?? 50,
            status: crossDivision.marketplaceBackend?.certification?.status ?? "review"
          };
          const syncFields = computeModuleCrossDivisionSync(
            module.id,
            moduleCert,
            marketplaceModuleCert,
            crossDivision
          );
          const orchestrationFields = computeModuleOrchestrationFields(module.id, orchestration, moduleCert);
          const executionFields = computeModuleExecutionFields(module.id, execution, moduleCert, orchestrationFields);
          const adaptiveFields = computeModuleAdaptiveFields(adaptive, {
            cloudflareDecision: decision.decision,
            cloudflareCertification: moduleCert,
            cloudflareSyncStatus: syncFields.cloudflareSyncStatus
          });
          const decisionFields = getModuleCloudflareDecisionFields(module.id, decision, insights);
          const predictiveFields = computeModulePredictiveFields(predictive, {
            cloudflareDecision: decisionFields.cloudflareDecision,
            cloudflareCertification: moduleCert,
            cloudflareSyncStatus: syncFields.cloudflareSyncStatus,
            cloudflareModuleRisk: decisionFields.cloudflareModuleRisk
          });
          const strategicFields = computeModuleStrategicFields(
            strategic,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareSyncStatus: syncFields.cloudflareSyncStatus,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk
            },
            module.id
          );
          const ucipFields = computeModuleUcipFields(
            ucip,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareSyncStatus: syncFields.cloudflareSyncStatus,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareStrategicHighlight: strategicFields.cloudflareStrategicHighlight
            },
            module.id
          );
          const amgFields = computeModuleAmgFields(
            amg,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareUCIPTag: ucipFields.cloudflareUCIPTag,
              cloudflareUCIPHighlight: ucipFields.cloudflareUCIPHighlight
            },
            module.id
          );
          const cbaFields = computeModuleCbaFields(
            cba,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareUCIPTag: ucipFields.cloudflareUCIPTag,
              cloudflareAMGTag: amgFields.cloudflareAMGTag,
              cloudflareAMGHighlight: amgFields.cloudflareAMGHighlight
            },
            module.id
          );
          const calFields = computeModuleCalFields(
            cal,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareUCIPTag: ucipFields.cloudflareUCIPTag,
              cloudflareAMGTag: amgFields.cloudflareAMGTag,
              cloudflareCBATag: cbaFields.cloudflareCBATag,
              cloudflareCBAHighlight: cbaFields.cloudflareCBAHighlight
            },
            module.id
          );
          const ihlFields = computeModuleIhlFields(
            ihl,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareUCIPTag: ucipFields.cloudflareUCIPTag,
              cloudflareAMGTag: amgFields.cloudflareAMGTag,
              cloudflareCBATag: cbaFields.cloudflareCBATag,
              cloudflareCALTag: calFields.cloudflareCALTag,
              cloudflareCALHighlight: calFields.cloudflareCALHighlight
            },
            module.id
          );
          const iarlFields = computeModuleIarlFields(
            iarl,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareUCIPTag: ucipFields.cloudflareUCIPTag,
              cloudflareAMGTag: amgFields.cloudflareAMGTag,
              cloudflareCBATag: cbaFields.cloudflareCBATag,
              cloudflareCALTag: calFields.cloudflareCALTag,
              cloudflareIHLTag: ihlFields.cloudflareIHLTag,
              cloudflareIHLHighlight: ihlFields.cloudflareIHLHighlight
            },
            module.id
          );
          const aclFields = computeModuleAclFields(
            acl,
            {
              cloudflareDecision: decisionFields.cloudflareDecision,
              cloudflareCertification: moduleCert,
              cloudflareModuleRisk: decisionFields.cloudflareModuleRisk,
              cloudflareUCIPTag: ucipFields.cloudflareUCIPTag,
              cloudflareAMGTag: amgFields.cloudflareAMGTag,
              cloudflareCBATag: cbaFields.cloudflareCBATag,
              cloudflareCALTag: calFields.cloudflareCALTag,
              cloudflareIHLTag: ihlFields.cloudflareIHLTag,
              cloudflareIARLTag: iarlFields.cloudflareIARLTag,
              cloudflareIARLHighlight: iarlFields.cloudflareIARLHighlight
            },
            module.id
          );
          return {
            ...moduleToCatalogItem(module),
            ...decisionFields,
            cloudflareCertification: moduleCert,
            ...syncFields,
            ...orchestrationFields,
            ...executionFields,
            ...adaptiveFields,
            ...predictiveFields,
            ...strategicFields,
            ...ucipFields,
            ...amgFields,
            ...cbaFields,
            ...calFields,
            ...ihlFields,
            ...iarlFields,
            ...aclFields
          };
        }),
        cloudflareFederation: {
          ...getMarketplaceCfMetadata(),
          ...buildCloudflareCatalogFederationBlock({
            decision,
            certification,
            crossDivision,
            orchestration,
            execution,
            adaptive,
            predictive,
            strategic,
            ucip,
            amg,
            cba,
            cal,
            ihl,
            iarl,
            acl
          })
        }
      });
    } catch (error) {
      return json2({
        items: modules2.map((module) => ({
          ...moduleToCatalogItem(module),
          cloudflareCertification: certifyModuleForCloudflare(module.id),
          cloudflareSyncStatus: "partial",
          cloudflareSyncScore: 50,
          cloudflareSyncReasons: [error.message || "Sync unavailable."],
          cloudflareOrchestrationStatus: "review",
          cloudflareOrchestrationScore: 50,
          cloudflareOrchestrationReasons: [error.message || "Orchestration unavailable."],
          cloudflareExecutionStatus: "review",
          cloudflareExecutionScore: 50,
          cloudflareExecutionReasons: [error.message || "Execution unavailable."],
          cloudflareAdaptiveBadge: "ADAPT_REVIEW",
          cloudflareAdaptiveMode: "degraded",
          cloudflarePredictiveBadge: "PREDICT_ALERT",
          cloudflarePredictiveMode: "fallback",
          cloudflareStrategicTag: "STRAT_REVIEW",
          cloudflareStrategicHorizon: "short",
          cloudflareStrategicStripMode: "prioritize",
          cloudflareStrategicHighlight: true,
          cloudflareUCIPTag: "UCIP_RED",
          cloudflareUCIPMode: "red",
          cloudflareUCIPRisk: "high",
          cloudflareUCIPHighlight: true,
          cloudflareAMGTag: "AMG_CAUTION",
          cloudflareAMGMode: "govern_red",
          cloudflareAMGRisk: "high",
          cloudflareAMGHighlight: true,
          cloudflareCBATag: "CBA_RISK",
          cloudflareCBAMode: "behavior_red",
          cloudflareCBARisk: "high",
          cloudflareCBAHighlight: true,
          cloudflareCALTag: "CAL_MISALIGNED",
          cloudflareCALMode: "align_red",
          cloudflareCALRisk: "high",
          cloudflareCALHighlight: true,
          cloudflareIHLTag: "IHL_CONFLICT",
          cloudflareIHLMode: "intent_red",
          cloudflareIHLRisk: "high",
          cloudflareIHLHighlight: true,
          cloudflareIARLTag: "IARL_MISMATCH",
          cloudflareIARLMode: "resonance_red",
          cloudflareIARLRisk: "high",
          cloudflareIARLHighlight: true,
          cloudflareACLTag: "ACL_FRAGMENTED",
          cloudflareACLMode: "coherence_red",
          cloudflareACLRisk: "high",
          cloudflareACLHighlight: true
        })),
        cloudflareFederation: getMarketplaceCfMetadata()
      });
    }
  }
  if (method === "GET" && pathname === "/api/engagements") {
    return json2({ engagements: engagements2, packages: packages2 });
  }
  if (method === "GET" && pathname === "/api/engagements/status") {
    const summary = engagements2.map(({ id, packageId, status, source, createdAt }) => ({
      id,
      engagement_id: id,
      packageId,
      status,
      source,
      createdAt
    }));
    return json2({ engagements: summary });
  }
  if (method === "POST" && pathname === "/api/engagements/create" || method === "POST" && pathname === "/api/engagements") {
    try {
      const payload = await readBody2(request);
      const engagementPayload = normalizeEngagementPayload(payload);
      if (!engagementPayload.operatorHandle || !engagementPayload.contactEmail || !engagementPayload.transmission) {
        return json2({ error: "operator_handle, contact_email, and transmission are required" }, 400);
      }
      if (engagementPayload.packageId && !getPackageById(engagementPayload.packageId)) {
        return json2({ error: "Unknown package_interest" }, 400);
      }
      const engagement = {
        id: createId2("eng", engagements2),
        packageId: engagementPayload.packageId,
        operatorHandle: engagementPayload.operatorHandle,
        organization: engagementPayload.organization,
        contactEmail: engagementPayload.contactEmail,
        transmission: engagementPayload.transmission,
        moduleInterest: engagementPayload.moduleInterest,
        urgency: engagementPayload.urgency,
        source: engagementPayload.source,
        selectorId: engagementPayload.selectorId,
        recommendedService: engagementPayload.recommendedService,
        secondaryService: engagementPayload.secondaryService,
        priority: engagementPayload.priority,
        revenuePotential: engagementPayload.revenuePotential,
        urgencyScore: engagementPayload.urgencyScore,
        auditId: engagementPayload.auditId,
        scanId: engagementPayload.scanId,
        agentCheckId: engagementPayload.agentCheckId,
        automationRoiId: engagementPayload.automationRoiId,
        ragRiskId: engagementPayload.ragRiskId,
        riskScore: engagementPayload.riskScore,
        injectionScore: engagementPayload.injectionScore,
        riskTier: engagementPayload.riskTier,
        readinessScore: engagementPayload.readinessScore,
        readinessTier: engagementPayload.readinessTier,
        roiScore: engagementPayload.roiScore,
        roiTier: engagementPayload.roiTier,
        ragRiskScore: engagementPayload.ragRiskScore,
        ragRiskTier: engagementPayload.ragRiskTier,
        estimatedMonthlySavings: engagementPayload.estimatedMonthlySavings,
        estimatedAnnualSavings: engagementPayload.estimatedAnnualSavings,
        hoursSavedPerMonth: engagementPayload.hoursSavedPerMonth,
        retrievalExposureLevel: engagementPayload.retrievalExposureLevel,
        accessControlLevel: engagementPayload.accessControlLevel,
        governanceMaturity: engagementPayload.governanceMaturity,
        buildComplexity: engagementPayload.buildComplexity,
        automationComplexity: engagementPayload.automationComplexity,
        safetyLevel: engagementPayload.safetyLevel,
        topRiskCategory: null,
        status: "intake-received",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      engagements2.push(engagement);
      attachEngagementToSelector2({
        selector_id: engagement.selectorId,
        engagement_id: engagement.id,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        secondary_service: engagement.secondaryService,
        priority: engagement.priority,
        revenue_potential: engagement.revenuePotential,
        urgency_score: engagement.urgencyScore,
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source
      });
      attachEngagementToAuditLite2({
        audit_id: engagement.auditId,
        engagement_id: engagement.id,
        risk_score: engagement.riskScore,
        risk_tier: engagement.riskTier,
        priority: engagement.priority,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source
      });
      attachEngagementToPromptInjectionScan2({
        scan_id: engagement.scanId,
        engagement_id: engagement.id,
        injection_score: engagement.injectionScore,
        risk_tier: engagement.riskTier,
        priority: engagement.priority,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        secondary_service: engagement.secondaryService,
        top_risks: engagement.topRiskCategory ? [{ category: engagement.topRiskCategory }] : [],
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source
      });
      attachEngagementToAgentReadiness2({
        agent_check_id: engagement.agentCheckId,
        engagement_id: engagement.id,
        readiness_score: engagement.readinessScore,
        readiness_tier: engagement.readinessTier,
        build_complexity: engagement.buildComplexity,
        safety_level: engagement.safetyLevel,
        priority: engagement.priority,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        secondary_service: engagement.secondaryService,
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source
      });
      attachEngagementToAutomationRoi2({
        automation_roi_id: engagement.automationRoiId,
        engagement_id: engagement.id,
        roi_score: engagement.roiScore,
        roi_tier: engagement.roiTier,
        estimated_monthly_savings: engagement.estimatedMonthlySavings,
        estimated_annual_savings: engagement.estimatedAnnualSavings,
        hours_saved_per_month: engagement.hoursSavedPerMonth,
        automation_complexity: engagement.automationComplexity,
        priority: engagement.priority,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        secondary_service: engagement.secondaryService,
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source
      });
      attachEngagementToRagRisk2({
        rag_risk_id: engagement.ragRiskId,
        engagement_id: engagement.id,
        rag_risk_score: engagement.ragRiskScore,
        rag_risk_tier: engagement.ragRiskTier,
        retrieval_exposure_level: engagement.retrievalExposureLevel,
        access_control_level: engagement.accessControlLevel,
        governance_maturity: engagement.governanceMaturity,
        priority: engagement.priority,
        recommended_service: engagement.recommendedService || engagement.moduleInterest,
        secondary_service: engagement.secondaryService,
        status: engagement.status,
        created_at: engagement.createdAt,
        source: engagement.source
      });
      return json2(
        {
          ...engagement,
          engagement_id: engagement.id
        },
        201
      );
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/operator/service-intake") {
    return json2({
      rows: listServiceIntakeQueue2(engagements2)
    });
  }
  if (method === "PATCH" && pathname === "/api/operator/service-intake/status") {
    try {
      const payload = await readBody2(request);
      const selectorId = normalizeText12(payload.selector_id || payload.selectorId);
      const status = normalizeText12(payload.status);
      if (!selectorId || !status) {
        return json2({ error: "selector_id and status are required" }, 400);
      }
      const updated = updateServiceIntakeStatus2(selectorId, status, engagements2);
      return json2({ status: "updated", selector_id: selectorId, record_status: updated.status });
    } catch (error) {
      return json2({ error: error.message || "status-update-failed" }, 400);
    }
  }
  if (method === "POST" && pathname === "/api/cloudflare/security-audit/start") {
    if (!isOperatorSurfaceRequest2(request)) {
      return json2({ error: "Operator surface access required" }, 403);
    }
    try {
      const payload = await readBody2(request);
      const engagementId = normalizeText12(payload.engagement_id || payload.engagementId);
      if (!engagementId) {
        return json2({ error: "engagement_id is required" }, 400);
      }
      const origin = new URL(request.url).origin;
      const webhookUrl = `${origin}/api/cloudflare/security-audit/webhook`;
      const result = await startSecurityAudit2({
        engagementId,
        engagements: engagements2,
        webhookUrl,
        requestOrigin: origin
      });
      return json2(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      const message = error.message || "security-audit-start-failed";
      if (message.includes("not found")) {
        return json2({ error: message }, 404);
      }
      return json2({ error: message }, 502);
    }
  }
  if (method === "POST" && pathname === "/api/cloudflare/security-audit/webhook") {
    try {
      const payload = await readBody2(request);
      const engagementId = normalizeText12(payload.engagement_id || payload.engagementId);
      const auditStatus = payload.audit_status ?? payload.auditStatus;
      const auditSummary = payload.audit_summary ?? payload.auditSummary;
      const findings = payload.findings;
      if (!engagementId || auditStatus === void 0 || auditStatus === null || auditStatus === "") {
        return json2({ error: "engagement_id and audit_status are required" }, 400);
      }
      const result = applySecurityAuditWebhook2({
        engagementId,
        auditStatus,
        auditSummary,
        findings
      });
      return json2(result, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      const message = error.message || "security-audit-webhook-failed";
      if (message.includes("not found")) {
        return json2({ error: message }, 404);
      }
      return json2({ error: message }, 400);
    }
  }
  if (method === "POST" && pathname === "/api/agent/intake/process") {
    try {
      const payload = await readBody2(request);
      const selectorId = normalizeText12(payload.selector_id || payload.selectorId);
      const engagementId = normalizeText12(payload.engagement_id || payload.engagementId);
      if (!selectorId || !engagementId) {
        return json2({ error: "selector_id and engagement_id are required" }, 400);
      }
      const selector = getServiceSelectorSubmission2(selectorId);
      if (!selector) {
        return json2({ error: "Selector submission not found" }, 404);
      }
      const engagement = getEngagementById3(engagements2, engagementId);
      if (!engagement) {
        return json2({ error: "Engagement not found" }, 404);
      }
      const { record, response: agentResponse } = intakeAgent_default.process(selector, engagement);
      persistIntakeAgentRecord2(record, engagements2);
      return json2(agentResponse, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json2({ error: error.message || "intake-agent-process-failed" }, 400);
    }
  }
  if (method === "POST" && pathname === "/api/agent/security-intake/process") {
    if (!isOperatorSurfaceRequest2(request)) {
      return json2({ error: "Operator surface access required" }, 403);
    }
    try {
      const payload = await readBody2(request);
      const selectorId = normalizeText12(payload.selector_id || payload.selectorId);
      const engagementId = normalizeText12(payload.engagement_id || payload.engagementId);
      if (!selectorId || !engagementId) {
        return json2({ error: "selector_id and engagement_id are required" }, 400);
      }
      const selector = getServiceSelectorSubmission2(selectorId);
      if (!selector) {
        return json2({ error: "Selector submission not found" }, 404);
      }
      const engagement = getEngagementById3(engagements2, engagementId);
      if (!engagement) {
        return json2({ error: "Engagement not found" }, 404);
      }
      const { record, response: agentResponse } = securityIntakeAgent_default.process(selector, engagement);
      persistSecurityIntakeRecord2(record, engagements2);
      return json2(agentResponse, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      return json2({ error: error.message || "security-intake-process-failed" }, 400);
    }
  }
  if (method === "GET" && pathname === "/api/operator/audit-lite") {
    return json2({
      rows: listAuditLiteQueue2(engagements2)
    });
  }
  if (method === "GET" && pathname === "/api/operator/prompt-injection-scans") {
    return json2({
      rows: listPromptInjectionScanQueue2(engagements2)
    });
  }
  if (method === "GET" && pathname === "/api/operator/agent-readiness") {
    return json2({
      rows: listAgentReadinessQueue2(engagements2)
    });
  }
  if (method === "GET" && pathname === "/api/operator/automation-roi") {
    return json2({
      rows: listAutomationRoiQueue2(engagements2)
    });
  }
  if (method === "GET" && pathname === "/api/operator/rag-risk") {
    return json2({
      rows: listRagRiskQueue2(engagements2)
    });
  }
  if (method === "GET" && pathname === "/api/marketplace/service-modules") {
    return json2({
      modules: [
        ...serviceMarketplaceModules2,
        auditLiteMarketplaceModule2,
        promptInjectionMarketplaceModule2,
        agentReadinessMarketplaceModule2,
        automationRoiMarketplaceModule2,
        ragRiskMarketplaceModule2
      ]
    });
  }
  if (method === "GET" && pathname === "/api/deliverables") {
    return json2({ deliverables: deliverables2 });
  }
  if (method === "GET" && pathname === "/api/deliverables/download") {
    const id = url.searchParams.get("id");
    const deliverable = getDeliverableById(id);
    const download = deliverableDownloads2[id];
    if (!deliverable || !download) {
      return notFound();
    }
    return text(download.content, 200, {
      "Content-Disposition": `attachment; filename="${download.downloadName}"`
    });
  }
  if (method === "GET" && pathname.startsWith("/api/deliverables/")) {
    const deliverableId = pathname.split("/").pop();
    const deliverable = getDeliverableById(deliverableId);
    if (!deliverable) {
      return notFound();
    }
    return json2(deliverable);
  }
  if (method === "POST" && pathname === "/api/identity/resolve") {
    try {
      const payload = await readBody2(request);
      const contactEmail = normalizeEmail(payload.contact_email || payload.email || payload.contactEmail);
      if (!contactEmail) {
        return json2({ error: "contact_email is required" }, 400);
      }
      const identity = identities2.find((entry) => entry.contact_email.toLowerCase() === contactEmail);
      return json2({
        found: Boolean(identity),
        identity: identity ? serializeIdentity(identity) : null
      });
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  if (method === "POST" && pathname === "/api/identity/create") {
    try {
      const payload = await readBody2(request);
      const normalized = normalizeIdentityPayload(payload, "contact", request);
      const existing = identities2.find((entry) => entry.contact_email.toLowerCase() === normalized.contact_email);
      if (existing) {
        return json2({ created: false, identity: serializeIdentity(existing) });
      }
      const identity = {
        ...normalized,
        id: normalized.id || createIdentityId2()
      };
      identities2.push(identity);
      return json2({ created: true, identity: serializeIdentity(identity) }, 201);
    } catch (error) {
      return json2({ error: error.message }, 400);
    }
  }
  return proxyToUpstream(request, env, url);
}
__name(handleApi, "handleApi");
async function proxyToUpstream(request, env, url) {
  if (!env.UPSTREAM_ENGINE_URL) {
    return json2({ error: "UPSTREAM_ENGINE_URL is not configured" }, 503);
  }
  let target;
  try {
    target = new URL(url.pathname + url.search, env.UPSTREAM_ENGINE_URL);
  } catch {
    return json2({ error: "UPSTREAM_ENGINE_URL is not a valid URL" }, 500);
  }
  try {
    const upstreamResponse = await fetch(new Request(target, request));
    const response = new Response(upstreamResponse.body, upstreamResponse);
    response.headers.set("X-Proxied-By", "mshops-public-worker");
    for (const [key, value] of Object.entries(DEFAULT_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  } catch (error) {
    return json2(
      {
        error: "Upstream API unreachable",
        detail: error instanceof Error ? error.message : String(error)
      },
      502
    );
  }
}
__name(proxyToUpstream, "proxyToUpstream");

// ../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-BTVQap/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = worker_default;

// ../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-BTVQap/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
