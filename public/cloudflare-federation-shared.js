/**
 * Shared Cloudflare federation UI for Operator, Mission, OS, and Marketplace.
 * Field resolution order: route feed → heartbeat → catalog federation block.
 */
const CloudflareFederationUI = {
  advisoryNote:
    "Advisory only — signals inform operator judgment; they do not block pipelines unless explicit governance rules say otherwise.",

  panelTitles: {
    automation: "Cloudflare Automation Loops",
    autonomous: "Cloudflare Autonomous Governance",
    decision: "Cloudflare Decision Layer",
    certification: "Cloudflare Certification",
    sync: "Cloudflare Cross-Division Sync",
    orchestration: "Cloudflare Orchestration",
    execution: "Cloudflare Autonomous Execution",
    adaptive: "Cloudflare Adaptive Runtime",
    predictive: "Cloudflare Predictive Modeling",
    strategic: "Cloudflare Strategic Planning",
  },

  decisionHelp: {
    PROCEED: "Federation signals are healthy enough to continue normal workflows.",
    CAUTION: "Review advisories before promotion; federation does not block actions.",
    HOLD: "Defer promotion or autonomous actions until signals improve.",
  },

  strategicStripHelp: {
    STABLE: "No urgent strategic actions; maintain current federation posture.",
    WATCH: "Monitor trends; prepare optional hardening steps.",
    PRIORITIZE: "Focus on top strategic plan items over the next hours–days.",
  },

  ucipStripHelp: {
    GREEN: "Stable federation: proceed + steady + stable forecast.",
    YELLOW: "Caution/watch: review unified advisories.",
    ORANGE: "Hold/alert/prioritize: defer promotion; act on UCIP actions.",
    RED: "Degraded/fallback: minimal payload; restore signals.",
  },

  amgStripHelp: {
    GOVERN_GREEN: "Stable UCIP: low-risk governance environment.",
    GOVERN_YELLOW: "Caution UCIP: review AMG rules and nudges.",
    GOVERN_ORANGE: "Alert UCIP: defer promotion; follow AMG rules.",
    GOVERN_RED: "Degraded UCIP: minimal AMG fallback payload.",
  },

  cbaStripHelp: {
    BEHAVIOR_GREEN: "Stable behavior aligned with UCIP + AMG.",
    BEHAVIOR_YELLOW: "Mild drift or inconsistent operator/system behavior.",
    BEHAVIOR_ORANGE: "Significant drift or conflicting governance signals.",
    BEHAVIOR_RED: "Degraded upstream or severe behavioral drift.",
  },

  calStripHelp: {
    ALIGN_GREEN: "Strong cognitive alignment with UCIP + AMG + CBA.",
    ALIGN_YELLOW: "Partial alignment; mild cognitive drift.",
    ALIGN_ORANGE: "Significant misalignment or conflicting signals.",
    ALIGN_RED: "Degraded upstream or severe cognitive misalignment.",
  },

  ihlStripHelp: {
    INTENT_GREEN: "Strong intent harmony across operator, mission, and OS.",
    INTENT_YELLOW: "Partial harmony; mild intent drift.",
    INTENT_ORANGE: "Significant intent conflict or divergent signals.",
    INTENT_RED: "Degraded upstream or severe intent misalignment.",
  },

  iarlStripHelp: {
    RESONANCE_GREEN: "Strong resonance between intent and actual operator/system actions.",
    RESONANCE_YELLOW: "Partial resonance; mild intent-to-action mismatch.",
    RESONANCE_ORANGE: "Significant mismatch or divergent action posture.",
    RESONANCE_RED: "Degraded upstream or severe intent-to-action mismatch.",
  },

  aclStripHelp: {
    COHERENCE_GREEN: "Strong coherence across operator, mission, marketplace, and OS layers.",
    COHERENCE_YELLOW: "Partial coherence; mild fragmentation across federation layers.",
    COHERENCE_ORANGE: "Significant fragmentation or divergent meta-intelligence signals.",
    COHERENCE_RED: "Degraded upstream or severe OS fragmentation.",
  },

  healthHelp: {
    healthy: "Within normal advisory thresholds.",
    advisory: "Worth review; optional operator attention.",
    degraded: "Minimal fallback payload — complete OAuth or restore MCP/upstream.",
    optional: "Cloudflare federation not required for core OS operation.",
  },

  healthClass: {
    healthy: "cf-health-healthy",
    advisory: "cf-health-advisory",
    degraded: "cf-health-degraded",
    optional: "cf-health-optional",
  },

  badgeTooltips: {
    CF_READY: "Module meets baseline Cloudflare federation readiness.",
    "CF_READY+": "Module meets elevated federation readiness (4+ actions).",
    CF_OPTIONAL: "Cloudflare federation is optional for this module.",
    CF_DECISION_PROCEED: "Decision layer: proceed — continue normal workflows.",
    CF_DECISION_CAUTION: "Decision layer: caution — review before promotion.",
    CF_DECISION_HOLD: "Decision layer: hold — defer promotion actions.",
    CF_CERT_CERTIFIED: "Certification: module passes Cloudflare compatibility checks.",
    CF_CERT_REVIEW: "Certification: review recommended before promotion.",
    CF_CERT_INCOMPATIBLE: "Certification: incompatible signals detected.",
    CF_SYNC_ALIGNED: "Cross-division sync: divisions aligned.",
    CF_SYNC_SYNCED: "Cross-division sync: divisions aligned.",
    CF_SYNC_PARTIAL: "Cross-division sync: partial alignment.",
    CF_SYNC_DIVERGENT: "Cross-division sync: divergent — review sync advisories.",
    CF_ORCH_HEALTHY: "Orchestration: plan score healthy.",
    CF_ORCH_ADVISORY: "Orchestration: advisory review recommended.",
    CF_ORCH_DEFERRED: "Orchestration: defer promotion until plan steps resolve.",
    CF_EXEC_READY: "Execution: ready for advisory next actions.",
    CF_EXEC_REVIEW: "Execution: review next actions before proceeding.",
    CF_EXEC_DEFERRED: "Execution: defer until orchestration improves.",
    ADAPT_STEADY: "Adaptive: steady mode — minimal UI adjustments.",
    ADAPT_CAUTION: "Adaptive: caution mode — review federation hints.",
    ADAPT_REVIEW: "Adaptive: review mode — heightened attention on sync/cert.",
    PREDICT_STABLE: "Predictive: stable forecast.",
    PREDICT_WATCH: "Predictive: watch for drift or risk trends.",
    PREDICT_ALERT: "Predictive: alert or fallback — signals missing or elevated risk.",
    STRAT_REVIEW: "Strategic: module flagged for strategic review.",
    STRAT_STABILIZE: "Strategic: stabilize module posture this cycle.",
    STRAT_PROMOTE: "Strategic: candidate for promotion when signals allow.",
    UCIP_GREEN: "UCIP green: synthesized federation stable across all layers.",
    UCIP_YELLOW: "UCIP yellow: caution/watch — review unified advisories.",
    UCIP_ORANGE: "UCIP orange: hold/alert — defer promotion actions.",
    UCIP_RED: "UCIP red: degraded/fallback — restore OAuth or MCP signals.",
    AMG_OK: "AMG OK: stable UCIP governance; module may proceed with standard review.",
    AMG_REVIEW: "AMG review: caution UCIP; verify certification and sync before promotion.",
    AMG_CAUTION: "AMG caution: alert/degraded UCIP; defer promotion actions.",
    CBA_STABLE: "CBA stable: behavioral patterns align with UCIP + AMG.",
    CBA_DRIFT: "CBA drift: mild behavioral inconsistency detected.",
    CBA_RISK: "CBA risk: significant drift or degraded upstream signals.",
    CAL_ALIGNED: "CAL aligned: cognitive posture matches UCIP + AMG + CBA.",
    CAL_PARTIAL: "CAL partial: mild cognitive drift detected.",
    CAL_MISALIGNED: "CAL misaligned: significant drift or degraded upstream signals.",
    IHL_ALIGNED: "IHL aligned: intent harmonized across operator, mission, and OS.",
    IHL_PARTIAL: "IHL partial: mild intent drift detected.",
    IHL_CONFLICT: "IHL conflict: significant intent misalignment or degraded upstream.",
    IARL_ALIGNED: "IARL aligned: intent and actions resonate across operator, mission, and OS.",
    IARL_PARTIAL: "IARL partial: mild intent-to-action mismatch detected.",
    IARL_MISMATCH: "IARL mismatch: significant resonance gap or degraded upstream.",
    ACL_ALIGNED: "ACL aligned: OS coherence across operator, mission, marketplace, and system layers.",
    ACL_PARTIAL: "ACL partial: mild fragmentation detected across federation layers.",
    ACL_FRAGMENTED: "ACL fragmented: significant coherence gap or degraded upstream.",
  },

  panelHelp: {
    automation: "Automation loops surface logs, metrics, build, bindings, OAuth, and latency advisories.",
    autonomous: "Autonomous governance aggregates safety, triggers, and event hooks from federation probes.",
    decision: "PROCEED = continue; CAUTION = review advisories; HOLD = defer promotion.",
    certification: "Certification scores module Cloudflare compatibility — advisory only.",
    sync: "Sync compares operator-shell and marketplace-backend federation snapshots.",
    orchestration: "Orchestration plans multi-agent actions across divisions.",
    execution: "Execution recommends next advisory steps from orchestration context.",
    adaptive: "Adaptive mode (steady/caution/review/degraded) drives UI hints and operator guidance.",
    predictive: "Predictive forecasts drift, module risk, and pipeline advisories.",
    strategic: "Strategic strip: STABLE / WATCH / PRIORITIZE — medium-horizon federation plans.",
    ucip: "Unified Cloudflare Intelligence Plane: GREEN / YELLOW / ORANGE / RED from all 11 layers.",
    amg: "Autonomous Meta-Governance: GOVERN_GREEN / GOVERN_YELLOW / GOVERN_ORANGE / GOVERN_RED from UCIP.",
    cba: "Behavioral Autonomy: BEHAVIOR_GREEN / YELLOW / ORANGE / RED from AMG + UCIP.",
    cal: "Cognitive Alignment: ALIGN_GREEN / YELLOW / ORANGE / RED from CBA + AMG + UCIP.",
    ihl: "Intent Harmonization: INTENT_GREEN / YELLOW / ORANGE / RED from CAL + CBA + AMG + UCIP.",
    iarl: "Intent-to-Action Resonance: RESONANCE_GREEN / YELLOW / ORANGE / RED from IHL + CAL + CBA + AMG + UCIP.",
    acl: "Autonomous Coherence: COHERENCE_GREEN / YELLOW / ORANGE / RED from IARL + IHL + CAL + CBA + AMG + UCIP.",
  },

  domainFieldMap: {
    decision: {
      health: ["health", "cloudflareDecisionHealth"],
      score: ["score", "cloudflareDecisionScore"],
      mode: ["decision", "cloudflareDecision"],
      reasons: ["reasons", "cloudflareDecisionReasons"],
    },
    adaptive: {
      health: ["adaptiveHealth", "cloudflareAdaptiveHealth"],
      score: ["adaptiveScore", "cloudflareAdaptiveScore"],
      mode: ["adaptiveState.mode", "cloudflareAdaptiveMode"],
      reasons: ["adaptiveState.reasons", "cloudflareAdaptiveReasons"],
    },
    predictive: {
      health: ["predictiveHealth", "cloudflarePredictiveHealth"],
      score: ["predictiveScore", "cloudflarePredictiveScore"],
      mode: ["predictiveState.forecastMode", "cloudflarePredictiveMode"],
      reasons: ["predictiveState.forecastReasons", "cloudflarePredictiveReasons"],
    },
    strategic: {
      health: ["strategicHealth", "cloudflareStrategicHealth"],
      score: ["strategicScore", "cloudflareStrategicScore"],
      mode: ["strategicState.stripMode", "cloudflareStrategicStripMode"],
      reasons: ["strategicState.planReasons", "cloudflareStrategicReasons"],
    },
    ucip: {
      health: ["ucipHealth", "cloudflareUCIPHealth"],
      score: ["ucipScore", "cloudflareUCIPScore"],
      mode: ["ucipState.mode", "cloudflareUCIPMode"],
      reasons: ["ucipReasons", "cloudflareUCIPReasons"],
    },
    amg: {
      health: ["amgHealth", "cloudflareAMGHealth"],
      score: ["amgScore", "cloudflareAMGScore"],
      mode: ["amgState.mode", "cloudflareAMGMode"],
      reasons: ["amgReasons", "cloudflareAMGReasons"],
    },
    cba: {
      health: ["cbaHealth", "cloudflareCBAHealth"],
      score: ["cbaScore", "cloudflareCBAScore"],
      mode: ["cbaState.mode", "cloudflareCBAMode"],
      reasons: ["cbaReasons", "cloudflareCBAReasons"],
    },
    cal: {
      health: ["calHealth", "cloudflareCALHealth"],
      score: ["calScore", "cloudflareCALScore"],
      mode: ["calState.mode", "cloudflareCALMode"],
      reasons: ["calReasons", "cloudflareCALReasons"],
    },
    ihl: {
      health: ["ihlHealth", "cloudflareIHLHealth"],
      score: ["ihlScore", "cloudflareIHLScore"],
      mode: ["ihlState.mode", "cloudflareIHLMode"],
      reasons: ["ihlReasons", "cloudflareIHLReasons"],
    },
    iarl: {
      health: ["iarlHealth", "cloudflareIARLHealth"],
      score: ["iarlScore", "cloudflareIARLScore"],
      mode: ["iarlState.mode", "cloudflareIARLMode"],
      reasons: ["iarlReasons", "cloudflareIARLReasons"],
    },
    acl: {
      health: ["aclHealth", "cloudflareACLHealth"],
      score: ["aclScore", "cloudflareACLScore"],
      mode: ["aclState.mode", "cloudflareACLMode"],
      reasons: ["aclReasons", "cloudflareACLReasons"],
    },
    orchestration: {
      health: ["orchestrationHealth", "cloudflareOrchestrationHealth"],
      score: ["orchestrationScore", "cloudflareOrchestrationScore"],
      mode: ["syncStatus"],
      reasons: ["orchestrationReasons", "cloudflareOrchestrationReasons"],
    },
    execution: {
      health: ["executionHealth", "cloudflareExecutionHealth"],
      score: ["executionScore", "cloudflareExecutionScore"],
      mode: ["syncStatus"],
      reasons: ["executionReasons", "cloudflareExecutionReasons"],
    },
    automation: {
      health: ["health", "cloudflareAutomationHealth"],
      score: ["score", "cloudflareAutomationScore"],
      mode: ["mode"],
      reasons: ["reasons", "cloudflareAutomationReasons"],
    },
  },
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function getNestedValue(source, path) {
  if (!source || !path) {
    return undefined;
  }
  return path.split(".").reduce((current, key) => (current == null ? undefined : current[key]), source);
}

function resolveCfField(domain, field, sources = {}) {
  const feed = sources.feed || {};
  const heartbeat = sources.heartbeat || {};
  const meta = feed.federationMeta || {};
  const map = CloudflareFederationUI.domainFieldMap[domain] || {};
  const paths = map[field] || [field];

  for (const path of paths) {
    const fromMeta = getNestedValue(meta, path);
    if (fromMeta != null && fromMeta !== "") {
      return fromMeta;
    }
    const fromFeed = getNestedValue(feed, path);
    if (fromFeed != null && fromFeed !== "") {
      return fromFeed;
    }
    const fromHeartbeat = getNestedValue(heartbeat, path);
    if (fromHeartbeat != null && fromHeartbeat !== "") {
      return fromHeartbeat;
    }
  }

  if (field === "reasons") {
    return [];
  }
  return field === "score" ? "n/a" : "optional";
}

function renderCfAdvisoryNote(className = "cf-advisory-note") {
  return `<p class="${className} mono">${escapeHtml(CloudflareFederationUI.advisoryNote)}</p>`;
}

function renderCfPanelHelp(domain, className = "section-copy cf-panel-help") {
  const help = CloudflareFederationUI.panelHelp[domain];
  return help ? `<p class="${className}">${escapeHtml(help)}</p>` : "";
}

function renderCfTelemetryCards(cards = [], cardClass = "operator-panel bracket") {
  return cards
    .map(
      (card) => `
    <article class="${escapeHtml(cardClass)} ${escapeHtml(card.healthClass || "")}">
      <div class="bracket-inner">
        <p class="section-label mono">[ ${escapeHtml(card.label)} ]</p>
        <h3>${escapeHtml(String(card.value))}</h3>
        ${card.copy ? `<p class="section-copy">${escapeHtml(card.copy)}</p>` : ""}
      </div>
    </article>`,
    )
    .join("");
}

function cfBadge(label, extraClass = "") {
  const tip = CloudflareFederationUI.badgeTooltips[label] || "Cloudflare federation advisory badge.";
  return `<span class="status-chip cf-badge ${extraClass}" title="${escapeHtml(tip)}">${escapeHtml(label)}</span>`;
}

function cfHealthClass(health) {
  const normalized = String(health || "optional").toLowerCase();
  return CloudflareFederationUI.healthClass[normalized] || CloudflareFederationUI.healthClass.optional;
}

function getAdaptiveBadge(mode) {
  const normalized = String(mode || "caution").toLowerCase();
  if (normalized === "steady") {
    return "ADAPT_STEADY";
  }
  if (normalized === "review" || normalized === "degraded") {
    return "ADAPT_REVIEW";
  }
  return "ADAPT_CAUTION";
}

function getPredictiveBadge(mode) {
  const normalized = String(mode || "watch").toLowerCase();
  if (normalized === "stable") {
    return "PREDICT_STABLE";
  }
  if (normalized === "alert" || normalized === "fallback") {
    return "PREDICT_ALERT";
  }
  return "PREDICT_WATCH";
}

const CBA_MODES = ["behavior_green", "behavior_yellow", "behavior_orange", "behavior_red"];

function getCbaBadge(mode) {
  const normalized = String(mode || "behavior_yellow").toLowerCase();
  if (normalized === "behavior_green") {
    return "CBA_STABLE";
  }
  if (normalized === "behavior_red" || normalized === "behavior_orange") {
    return "CBA_RISK";
  }
  return "CBA_DRIFT";
}

function cbaModeClass(mode) {
  return `cba-mode-${String(mode || "behavior_yellow").replace(/_/g, "-")}`;
}

const CAL_MODES = ["align_green", "align_yellow", "align_orange", "align_red"];

function getCalBadge(mode) {
  const normalized = String(mode || "align_yellow").toLowerCase();
  if (normalized === "align_green") {
    return "CAL_ALIGNED";
  }
  if (normalized === "align_red" || normalized === "align_orange") {
    return "CAL_MISALIGNED";
  }
  return "CAL_PARTIAL";
}

function calModeClass(mode) {
  return `cal-mode-${String(mode || "align_yellow").replace(/_/g, "-")}`;
}

const IHL_MODES = ["intent_green", "intent_yellow", "intent_orange", "intent_red"];

function getIhlBadge(mode) {
  const normalized = String(mode || "intent_yellow").toLowerCase();
  if (normalized === "intent_green") {
    return "IHL_ALIGNED";
  }
  if (normalized === "intent_red" || normalized === "intent_orange") {
    return "IHL_CONFLICT";
  }
  return "IHL_PARTIAL";
}

function ihlModeClass(mode) {
  return `ihl-mode-${String(mode || "intent_yellow").replace(/_/g, "-")}`;
}

const IARL_MODES = ["resonance_green", "resonance_yellow", "resonance_orange", "resonance_red"];

function getIarlBadge(mode) {
  const normalized = String(mode || "resonance_yellow").toLowerCase();
  if (normalized === "resonance_green") {
    return "IARL_ALIGNED";
  }
  if (normalized === "resonance_red" || normalized === "resonance_orange") {
    return "IARL_MISMATCH";
  }
  return "IARL_PARTIAL";
}

function iarlModeClass(mode) {
  return `iarl-mode-${String(mode || "resonance_yellow").replace(/_/g, "-")}`;
}

const ACL_MODES = ["coherence_green", "coherence_yellow", "coherence_orange", "coherence_red"];

function getAclBadge(mode) {
  const normalized = String(mode || "coherence_yellow").toLowerCase();
  if (normalized === "coherence_green") {
    return "ACL_ALIGNED";
  }
  if (normalized === "coherence_red" || normalized === "coherence_orange") {
    return "ACL_FRAGMENTED";
  }
  return "ACL_PARTIAL";
}

function aclModeClass(mode) {
  return `acl-mode-${String(mode || "coherence_yellow").replace(/_/g, "-")}`;
}

function isCloudflareAdvisoryDegraded(payload = {}) {
  return Boolean(
    payload.advisoryDegraded ||
      payload.degraded ||
      payload.federationMeta?.stale ||
      payload.federationMeta?.failureKind,
  );
}

function renderCfAdvisoryDegradedBadge(payload = {}, label = "ADVISORY") {
  if (!isCloudflareAdvisoryDegraded(payload)) {
    return "";
  }
  const stale = payload.federationMeta?.stale ? " (cached)" : "";
  return `<span class="status-chip cf-advisory-degraded warning" title="Advisory layer degraded; showing fallback or cached data.">[ ${escapeHtml(label)}_DEGRADED${escapeHtml(stale)} ]</span>`;
}

function renderCfAdvisorySoftWarning(payload = {}, message = "Advisory signals degraded — federation optional.") {
  if (!isCloudflareAdvisoryDegraded(payload)) {
    return "";
  }
  return `<p class="section-copy mono cf-advisory-warning">${escapeHtml(message)}</p>`;
}

function renderCfAdvisoryDegradedListItem(payload = {}, message = "Advisory signals degraded — federation optional.") {
  if (!isCloudflareAdvisoryDegraded(payload)) {
    return "";
  }
  return `<li class="cf-advisory-warning">${escapeHtml(message)}</li>`;
}

async function fetchAdvisoryJson(url, fallback = { advisoryOnly: true }) {
  try {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : null;
    if (!payload) {
      return { ...fallback, advisoryDegraded: true };
    }
    if (!response.ok) {
      return { ...fallback, ...payload, advisoryDegraded: true };
    }
    return payload;
  } catch (error) {
    return {
      ...fallback,
      advisoryDegraded: true,
      advisoryDegradedReason: error?.message || "Advisory fetch failed.",
    };
  }
}

const AMG_MODES = ["govern_green", "govern_yellow", "govern_orange", "govern_red"];

function getAmgBadge(mode) {
  const normalized = String(mode || "govern_yellow").toLowerCase();
  if (normalized === "govern_green") {
    return "AMG_OK";
  }
  if (normalized === "govern_red" || normalized === "govern_orange") {
    return "AMG_CAUTION";
  }
  return "AMG_REVIEW";
}

function amgModeClass(mode) {
  return `amg-mode-${String(mode || "govern_yellow").replace(/_/g, "-")}`;
}

const UCIP_MODES = ["green", "yellow", "orange", "red"];

function getUcipBadge(mode) {
  const normalized = String(mode || "yellow").toLowerCase();
  if (UCIP_MODES.includes(normalized)) {
    return `UCIP_${normalized.toUpperCase()}`;
  }
  return "UCIP_YELLOW";
}

function ucipModeClass(mode) {
  const normalized = String(mode || "yellow").toLowerCase();
  return `ucip-mode-${normalized}`;
}

const api = {
  ...CloudflareFederationUI,
  escapeHtml,
  resolveCfField,
  renderCfAdvisoryNote,
  renderCfPanelHelp,
  renderCfTelemetryCards,
  cfBadge,
  cfHealthClass,
  getAdaptiveBadge,
  getPredictiveBadge,
  getUcipBadge,
  ucipModeClass,
  UCIP_MODES,
  getAmgBadge,
  amgModeClass,
  AMG_MODES,
  getCbaBadge,
  cbaModeClass,
  CBA_MODES,
  getCalBadge,
  calModeClass,
  CAL_MODES,
  getIhlBadge,
  ihlModeClass,
  IHL_MODES,
  getIarlBadge,
  iarlModeClass,
  IARL_MODES,
  getAclBadge,
  aclModeClass,
  ACL_MODES,
  isCloudflareAdvisoryDegraded,
  renderCfAdvisoryDegradedBadge,
  renderCfAdvisorySoftWarning,
  renderCfAdvisoryDegradedListItem,
  fetchAdvisoryJson,
};

if (typeof window !== "undefined") {
  window.CloudflareFederationUI = api;
}

if (typeof module !== "undefined") {
  module.exports = api;
}
