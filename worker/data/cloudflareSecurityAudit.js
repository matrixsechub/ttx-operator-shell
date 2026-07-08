const SECURITY_AUDIT_AGENT_PLACEHOLDER_URL =
  "https://placeholder.agents.cloudflare.com/security-audit/start";

import serviceSelector from "./serviceSelector.js";

const {
  getServiceIntakeSubmissionByEngagementId,
  getEngagementById,
  upsertServiceSelectorSubmission,
} = serviceSelector;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readHeader(request, name) {
  const headers = request?.headers || {};
  if (typeof headers.get === "function") {
    return headers.get(name) || "";
  }
  return headers[name] || headers[name.toLowerCase()] || "";
}

function isOperatorSurfaceRequest(request) {
  const surface = readHeader(request, "X-MSH-Operator-Surface");
  if (surface === "service-intake" || surface === "1") {
    return true;
  }

  const referer = readHeader(request, "Referer");
  const origin = readHeader(request, "Origin");
  return referer.includes("/operator") || origin.includes("/operator");
}

function normalizeSecurityAuditStatus(value) {
  const normalized = normalizeText(value).toLowerCase().replace(/\s+/g, "_");
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

function buildSelectorRaw(submission = {}) {
  return {
    primary_goal: submission.primary_goal || null,
    business_type: submission.business_type || null,
    current_ai_usage: [...(submission.current_ai_usage || [])],
    risk_level: submission.risk_level || null,
    budget_range: submission.budget_range || null,
    urgency: submission.urgency || null,
    source_route: submission.source_route || null,
  };
}

function buildEngagementDetails(engagement = {}) {
  if (!engagement || !engagement.id) {
    return null;
  }
  return {
    operatorHandle: engagement.operatorHandle || null,
    organization: engagement.organization || null,
    contactEmail: engagement.contactEmail || null,
    transmission: engagement.transmission || null,
    source: engagement.source || null,
  };
}

function buildAuditContext(submission, engagement) {
  return {
    engagement_id: submission.engagement_id,
    selector_id: submission.selector_id || null,
    recommended_service: submission.recommended_service || engagement?.recommendedService || null,
    secondary_service: submission.secondary_service || engagement?.secondaryService || null,
    engagement_details: buildEngagementDetails(engagement),
    selector_raw: buildSelectorRaw(submission),
  };
}

async function startSecurityAudit({ engagementId, engagements = [], webhookUrl, requestOrigin }) {
  const normalizedId = normalizeText(engagementId);
  if (!normalizedId) {
    throw new Error("engagement_id is required");
  }

  const submission = getServiceIntakeSubmissionByEngagementId(normalizedId);
  if (!submission) {
    throw new Error("Intake submission not found for engagement");
  }

  const engagement = getEngagementById(engagements, normalizedId);
  const updated = upsertServiceSelectorSubmission({
    ...submission,
    security_audit_status: "running",
    security_audit_started_at: new Date().toISOString(),
  });

  const payload = {
    engagement_id: normalizedId,
    webhook_url: webhookUrl,
    request_origin: requestOrigin || null,
    context: buildAuditContext(updated, engagement),
  };

  let agentError = null;
  try {
    const response = await fetch(SECURITY_AUDIT_AGENT_PLACEHOLDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      agentError = new Error(`Agent request failed with status ${response.status}`);
    }
  } catch (error) {
    agentError = error instanceof Error ? error : new Error("Agent request failed");
  }

  if (agentError) {
    upsertServiceSelectorSubmission({
      ...updated,
      security_audit_summary: `Agent dispatch failed: ${agentError.message}`,
    });
    throw agentError;
  }

  return {
    status: "security-audit-started",
    engagement_id: normalizedId,
    security_audit_status: "running",
  };
}

function applySecurityAuditWebhook({ engagementId, auditStatus, auditSummary, findings }) {
  const normalizedId = normalizeText(engagementId);
  if (!normalizedId) {
    throw new Error("engagement_id is required");
  }

  const submission = getServiceIntakeSubmissionByEngagementId(normalizedId);
  if (!submission) {
    throw new Error("Intake submission not found for engagement");
  }

  const normalizedStatus = normalizeSecurityAuditStatus(auditStatus);
  const summary = normalizeText(auditSummary) || null;
  const normalizedFindings = Array.isArray(findings) ? findings : [];

  upsertServiceSelectorSubmission({
    ...submission,
    security_audit_status: normalizedStatus,
    security_audit_summary: summary,
    security_findings: normalizedFindings,
    security_audit_completed_at:
      normalizedStatus === "complete" ? new Date().toISOString() : submission.security_audit_completed_at || null,
  });

  return {
    status: "security-audit-updated",
    engagement_id: normalizedId,
    security_audit_status: normalizedStatus,
    security_audit_summary: summary,
  };
}

export default {
  SECURITY_AUDIT_AGENT_PLACEHOLDER_URL,
  isOperatorSurfaceRequest,
  normalizeSecurityAuditStatus,
  startSecurityAudit,
  applySecurityAuditWebhook,
};
