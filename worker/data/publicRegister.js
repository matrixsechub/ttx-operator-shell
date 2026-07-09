export const SecurityLifecycleStage = {
  INTAKE: "intake",
  VALIDATION: "validation",
  QUEUED: "queued",
  PROCESSED: "processed",
};

const REGISTER_LIFECYCLE_SEQUENCE = ["received", "validated", "queued", "processed"];
const REGISTER_LIFECYCLE_LABELS = {
  received: "Pending Intake",
  validated: "Validated",
  queued: "Queued",
  processed: "Processed",
};

const REGISTER_QUEUE_WEIGHT = {
  queued: 0,
  validated: 1,
  received: 2,
  processed: 3,
};

const allowedRoles = new Set(["operator", "builder", "partner", "observer"]);

export class AgentPermissionValidator {
  static validate(profile = "") {
    const normalized = String(profile || "").trim().toLowerCase();
    if (!normalized) {
      return { allowed: false, profile: null, reason: "permission_profile_missing" };
    }
    if (normalized === "public_intake") {
      return { allowed: true, profile: normalized, reason: "public_intake_allowed" };
    }
    return { allowed: false, profile: normalized, reason: "permission_profile_denied" };
  }
}

export const ThreatHookRegistry = {
  hooks: [
    {
      id: "public_register_intake",
      stage: SecurityLifecycleStage.INTAKE,
      severity: "info",
      description: "Public registration intake captured for operator review.",
    },
    {
      id: "permission_profile_check",
      stage: SecurityLifecycleStage.VALIDATION,
      severity: "low",
      description: "Permission profile validated before queue routing.",
    },
  ],
  evaluate(context = {}) {
    const fired = [];
    if (context.source === "public-register") {
      fired.push(this.hooks[0]);
    }
    if (context.permission_profile === "public_intake") {
      fired.push(this.hooks[1]);
    }
    return {
      advisoryOnly: true,
      firedCount: fired.length,
      hooks: fired,
      checkedAt: new Date().toISOString(),
    };
  },
};

export const publicRegisterMarketplaceModule = {
  module_id: "msh-public-register",
  service_slug: "public_register",
  slug: "public-register",
  name: "Access Request Intake",
  title: "Access Request Intake",
  category: "public_intake",
  public_service_route: "/register",
  operator_route: "/operator/register-intake",
  description: "Public registration intake routed through IntakeAgentV2.",
  revenue_type: "access",
  base_price: 0,
  recommended_upsell: "Operator-guided ecosystem onboarding",
  required_inputs: ["name", "email", "role", "reason"],
  delivery_outputs: ["register_id", "lifecycle_status", "security_plane", "next_route"],
  status: "active",
  security_stage: SecurityLifecycleStage.INTAKE,
  requires_threat_modeling: false,
  permission_profile: "public_intake",
  agent_config_key: "intake_agent_v2",
};

const publicRegisterSubmissions = [];

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function generatePublicRegisterId() {
  return `reg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureTimeline(submission = {}) {
  if (!Array.isArray(submission.lifecycle_timeline)) {
    submission.lifecycle_timeline = [];
  }
  return submission.lifecycle_timeline;
}

function upsertPublicRegisterSubmission(patch = {}) {
  const registerId = normalizeText(patch.register_id);
  if (!registerId) {
    throw new Error("register_id is required");
  }

  const existingIndex = publicRegisterSubmissions.findIndex((entry) => entry.register_id === registerId);
  const existing = existingIndex >= 0 ? publicRegisterSubmissions[existingIndex] : null;
  const submission = {
    register_id: registerId,
    created_at: patch.created_at || existing?.created_at || new Date().toISOString(),
    name: normalizeText(patch.name) || existing?.name || "",
    email: normalizeText(patch.email) || existing?.email || "",
    role: normalizeText(patch.role) || existing?.role || "",
    reason: normalizeText(patch.reason) || existing?.reason || "",
    source: normalizeText(patch.source) || existing?.source || "public-register",
    priority: normalizeText(patch.priority) || existing?.priority || "standard",
    recommended_service: normalizeText(patch.recommended_service) || existing?.recommended_service || "ecosystem_access",
    next_route: normalizeText(patch.next_route) || existing?.next_route || null,
    engagement_id: patch.engagement_id || existing?.engagement_id || null,
    status: normalizeText(patch.status) || existing?.status || "register-pending",
    lifecycle_status: normalizeText(patch.lifecycle_status) || existing?.lifecycle_status || "received",
    lifecycle_label:
      patch.lifecycle_label || existing?.lifecycle_label || REGISTER_LIFECYCLE_LABELS.received,
    lifecycle_timeline: Array.isArray(patch.lifecycle_timeline)
      ? patch.lifecycle_timeline.map((entry) => ({ ...entry }))
      : ensureTimeline(existing || {}).map((entry) => ({ ...entry })),
  };

  if (existingIndex >= 0) {
    publicRegisterSubmissions[existingIndex] = submission;
  } else {
    publicRegisterSubmissions.push(submission);
  }

  return submission;
}

function advancePublicRegisterLifecycle(registerId, targetStatus, patch = {}) {
  const normalizedId = normalizeText(registerId);
  if (!normalizedId || !REGISTER_LIFECYCLE_SEQUENCE.includes(targetStatus)) {
    return null;
  }

  const submission = upsertPublicRegisterSubmission({
    register_id: normalizedId,
    ...patch,
  });

  const targetIndex = REGISTER_LIFECYCLE_SEQUENCE.indexOf(targetStatus);
  const timeline = ensureTimeline(submission);

  for (let index = 0; index <= targetIndex; index += 1) {
    const status = REGISTER_LIFECYCLE_SEQUENCE[index];
    if (timeline.some((entry) => entry.status === status)) {
      continue;
    }
    timeline.push({
      status,
      label: REGISTER_LIFECYCLE_LABELS[status] || status,
      at: patch.created_at || new Date().toISOString(),
      note: patch.lifecycle_note || `Lifecycle advanced to ${status}.`,
    });
  }

  submission.lifecycle_status = targetStatus;
  submission.lifecycle_label = REGISTER_LIFECYCLE_LABELS[targetStatus] || targetStatus;
  submission.status = normalizeText(patch.status) || submission.status || "register-pending";
  submission.engagement_id = patch.engagement_id || submission.engagement_id || null;
  return upsertPublicRegisterSubmission(submission);
}

export function normalizePublicRegisterAnswers(payload = {}) {
  const name = normalizeText(payload.name);
  const email = normalizeText(payload.email);
  const role = normalizeText(payload.role).toLowerCase();
  const reason = normalizeText(payload.reason);

  if (!name) {
    throw new Error("name is required");
  }
  if (!email || !email.includes("@")) {
    throw new Error("email is invalid");
  }
  if (!allowedRoles.has(role)) {
    throw new Error("role is invalid");
  }
  if (!reason) {
    throw new Error("reason is required");
  }

  const permission = AgentPermissionValidator.validate(publicRegisterMarketplaceModule.permission_profile);
  if (!permission.allowed) {
    throw new Error(permission.reason || "permission_profile_denied");
  }

  return {
    name,
    email,
    role,
    reason,
    source: normalizeText(payload.source) || "public-register",
    source_route: normalizeText(payload.source_route) || "/register",
  };
}

function derivePriorityFromRole(role) {
  if (role === "operator") return "high";
  if (role === "builder") return "medium";
  if (role === "partner") return "medium";
  return "standard";
}

export function computePublicRegisterResult(answers, registerId = generatePublicRegisterId()) {
  const priority = derivePriorityFromRole(answers.role);
  const params = new URLSearchParams({
    service: "ecosystem_access",
    priority,
    source: "public-register",
    register_id: registerId,
    role: answers.role,
  });

  return {
    status: "register-pending",
    register_id: registerId,
    priority,
    recommended_service: "ecosystem_access",
    permission_profile: publicRegisterMarketplaceModule.permission_profile,
    security_stage: publicRegisterMarketplaceModule.security_stage,
    agent_config_key: publicRegisterMarketplaceModule.agent_config_key,
    next_route: `/enter?${params.toString()}`,
    threat_hooks: ThreatHookRegistry.evaluate({
      source: answers.source,
      permission_profile: publicRegisterMarketplaceModule.permission_profile,
      role: answers.role,
    }),
  };
}

export function recordPublicRegisterSubmission(answers, result) {
  const submission = upsertPublicRegisterSubmission({
    register_id: result.register_id,
    created_at: new Date().toISOString(),
    name: answers.name,
    email: answers.email,
    role: answers.role,
    reason: answers.reason,
    source: answers.source,
    priority: result.priority,
    recommended_service: result.recommended_service,
    next_route: result.next_route,
    engagement_id: null,
    status: "register-pending",
    lifecycle_status: "received",
    lifecycle_label: REGISTER_LIFECYCLE_LABELS.received,
    lifecycle_timeline: [],
  });

  advancePublicRegisterLifecycle(result.register_id, "received", {
    created_at: submission.created_at,
    lifecycle_note: "Public registration intake captured.",
  });
  advancePublicRegisterLifecycle(result.register_id, "validated", {
    created_at: submission.created_at,
    lifecycle_note: "Registration payload validated through IntakeAgentV2 intake plane.",
  });
  return advancePublicRegisterLifecycle(result.register_id, "queued", {
    created_at: submission.created_at,
    lifecycle_note: "Registration routed into operator review queue.",
    status: "intake-received",
  });
}

export function getPublicRegisterSubmission(registerId) {
  const normalizedId = normalizeText(registerId);
  if (!normalizedId) {
    return null;
  }
  return publicRegisterSubmissions.find((entry) => entry.register_id === normalizedId) || null;
}

function buildLifecycleSnapshot(submission = {}) {
  const lifecycleStatus = normalizeText(submission.lifecycle_status) || "received";
  return {
    register_id: submission.register_id,
    engagement_id: submission.engagement_id || null,
    recommended_service: submission.recommended_service || "ecosystem_access",
    role: submission.role || null,
    priority: submission.priority || "standard",
    status: lifecycleStatus,
    lifecycle_status: lifecycleStatus,
    lifecycle_label: submission.lifecycle_label || REGISTER_LIFECYCLE_LABELS[lifecycleStatus] || lifecycleStatus,
    lifecycle_timeline: ensureTimeline(submission).map((entry) => ({ ...entry })),
    observer_mode: lifecycleStatus === "received" || lifecycleStatus === "validated",
    operator_mode: lifecycleStatus === "processed",
    permission_profile: publicRegisterMarketplaceModule.permission_profile,
    security_stage: publicRegisterMarketplaceModule.security_stage,
    agent_config_key: publicRegisterMarketplaceModule.agent_config_key,
    next_route: submission.next_route || null,
    created_at: submission.created_at || null,
  };
}

export function getPublicRegisterLifecycle(registerId) {
  const submission = getPublicRegisterSubmission(registerId);
  if (!submission) {
    return null;
  }
  return buildLifecycleSnapshot(submission);
}

export function getPublicRegisterSecurityPlane() {
  return {
    module: {
      slug: publicRegisterMarketplaceModule.slug,
      title: publicRegisterMarketplaceModule.title,
      security_stage: publicRegisterMarketplaceModule.security_stage,
      requires_threat_modeling: publicRegisterMarketplaceModule.requires_threat_modeling,
      permission_profile: publicRegisterMarketplaceModule.permission_profile,
      agent_config_key: publicRegisterMarketplaceModule.agent_config_key,
    },
    permission: AgentPermissionValidator.validate(publicRegisterMarketplaceModule.permission_profile),
    threat_hooks: ThreatHookRegistry.evaluate({
      source: "public-register",
      permission_profile: publicRegisterMarketplaceModule.permission_profile,
    }),
    lifecycle_stages: REGISTER_LIFECYCLE_SEQUENCE.map((status) => ({
      status,
      label: REGISTER_LIFECYCLE_LABELS[status],
    })),
  };
}

export function listPublicRegisterQueue() {
  return [...publicRegisterSubmissions]
    .map((submission) => ({
      register_id: submission.register_id,
      name: submission.name,
      email: submission.email,
      role: submission.role,
      priority: submission.priority,
      recommended_service: submission.recommended_service,
      status: submission.status,
      lifecycle_status: submission.lifecycle_status || "received",
      lifecycle_label: submission.lifecycle_label || REGISTER_LIFECYCLE_LABELS.received,
      lifecycle_timeline: ensureTimeline(submission).map((entry) => ({ ...entry })),
      created_at: submission.created_at,
    }))
    .sort((left, right) => {
      const leftRank = REGISTER_QUEUE_WEIGHT[left.lifecycle_status] ?? 99;
      const rightRank = REGISTER_QUEUE_WEIGHT[right.lifecycle_status] ?? 99;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return String(right.created_at || "").localeCompare(String(left.created_at || ""));
    });
}

export function getPublicRegisterQueuePreview() {
  const rows = listPublicRegisterQueue();
  const latest = rows[0] || null;
  return {
    queue_length: rows.length,
    last_submission: latest
      ? {
          register_id: latest.register_id,
          role: latest.role,
          lifecycle_status: latest.lifecycle_status,
          lifecycle_label: latest.lifecycle_label,
          created_at: latest.created_at,
        }
      : null,
    lifecycle_stage: latest?.lifecycle_status || "received",
    lifecycle_label: latest?.lifecycle_label || REGISTER_LIFECYCLE_LABELS.received,
    security_plane: getPublicRegisterSecurityPlane(),
  };
}

function buildLifecycleDistribution(rows = []) {
  return rows.reduce(
    (distribution, row) => {
      const status = normalizeText(row.lifecycle_status) || "received";
      distribution[status] = (distribution[status] || 0) + 1;
      return distribution;
    },
    { received: 0, validated: 0, queued: 0, processed: 0 },
  );
}

export function getPublicRegisterOperatorSnapshot(options = {}) {
  const rows = listPublicRegisterQueue();
  const shouldMarkProcessed = Boolean(options.markProcessed);
  const visibleRows = shouldMarkProcessed
    ? rows.map((row) => {
        if (row.lifecycle_status !== "queued") {
          return row;
        }
        const advanced = advancePublicRegisterLifecycle(row.register_id, "processed", {
          lifecycle_note: "Operator queue viewed in read-only mode.",
          status: "processed",
        });
        return {
          ...row,
          lifecycle_status: advanced?.lifecycle_status || row.lifecycle_status,
          lifecycle_label: advanced?.lifecycle_label || row.lifecycle_label,
          lifecycle_timeline: advanced?.lifecycle_timeline || row.lifecycle_timeline,
        };
      })
    : rows;

  return {
    rows: visibleRows,
    summary: {
      total: visibleRows.length,
      queue_length: visibleRows.length,
      last_submission: visibleRows[0] || null,
      lifecycle_distribution: buildLifecycleDistribution(visibleRows),
      security_plane: getPublicRegisterSecurityPlane(),
      read_only: true,
    },
  };
}

export function getPublicRegisterMarketplaceSummary() {
  const rows = listPublicRegisterQueue();
  const latest = rows[0] || null;
  return {
    total_submissions: rows.length,
    latest_lifecycle_status: latest?.lifecycle_status || "received",
    latest_lifecycle_label: latest?.lifecycle_label || REGISTER_LIFECYCLE_LABELS.received,
    observer_mode: Boolean(latest && latest.lifecycle_status !== "processed"),
    operator_mode: Boolean(latest && latest.lifecycle_status === "processed"),
    security_stage: publicRegisterMarketplaceModule.security_stage,
    permission_profile: publicRegisterMarketplaceModule.permission_profile,
    requires_threat_modeling: publicRegisterMarketplaceModule.requires_threat_modeling,
    agent_config_key: publicRegisterMarketplaceModule.agent_config_key,
  };
}

export function buildPublicRegisterMarketplacePayload() {
  return {
    ...publicRegisterMarketplaceModule,
    lifecycle_summary: getPublicRegisterMarketplaceSummary(),
    security_plane: getPublicRegisterSecurityPlane(),
    queue_preview: getPublicRegisterQueuePreview(),
  };
}

export default {
  SecurityLifecycleStage,
  AgentPermissionValidator,
  ThreatHookRegistry,
  publicRegisterMarketplaceModule,
  publicRegisterSubmissions,
  normalizePublicRegisterAnswers,
  computePublicRegisterResult,
  recordPublicRegisterSubmission,
  getPublicRegisterSubmission,
  getPublicRegisterLifecycle,
  getPublicRegisterSecurityPlane,
  listPublicRegisterQueue,
  getPublicRegisterQueuePreview,
  getPublicRegisterOperatorSnapshot,
  getPublicRegisterMarketplaceSummary,
  buildPublicRegisterMarketplacePayload,
};
