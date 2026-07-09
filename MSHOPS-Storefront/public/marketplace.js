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

const INTERNAL_AGENT_MODULES = [
  {
    slug: "intake_agent",
    name: "Intake Agent",
    category: "internal_agents",
    description:
      "Links AI Service Selector submissions with funnel engagements and prepares operator-ready intake records.",
    route: "/operator/agents/intake",
    active: true,
  },
  {
    slug: "ai_security_intake_agent",
    name: "AI Security Intake Agent",
    category: "internal_agents",
    description:
      "Analyzes AI usage, risk, and exposure to generate operator-ready security intake records.",
    route: "/operator/agents/security-intake",
    active: true,
  },
];

function renderCfBadge(label, extraClass = "") {
  const tip =
    (typeof window !== "undefined" && window.CloudflareFederationUI?.badgeTooltips?.[label]) ||
    "Cloudflare federation advisory badge.";
  return `<span class="status-chip cf-badge ${extraClass}" title="${escapeHtml(tip)}">${escapeHtml(label)}</span>`;
}

function formatStatus(value) {
  return String(value || "unknown").replace(/_/g, " ").toUpperCase();
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    : "n/a";
}

const MODULE_ICON_MAP = {
  intake_agent: "🛰️",
  ai_security_intake_agent: "🛡️",
  agent: "🤖",
  security: "🔐",
  governance: "🧭",
  marketplace: "🧩",
  scenario: "🎯",
  cloudflare: "☁️",
  service: "⚙️",
  audit: "📊",
  risk: "⚠️",
};

function getModuleIcon(module) {
  const nameKey = `${module?.name || ""} ${module?.slug || ""} ${module?.category || ""}`.toLowerCase();
  const matched = Object.entries(MODULE_ICON_MAP).find(([token]) => nameKey.includes(token));
  return matched ? matched[1] : "◆";
}

const INTERNAL_AGENT_SLUGS = new Set(INTERNAL_AGENT_MODULES.map((entry) => entry.slug));

function getModuleAccentClass(module) {
  if (INTERNAL_AGENT_SLUGS.has(module?.slug)) {
    return "accent-gold";
  }
  const category = `${module?.category || ""} ${module?.name || ""}`.toLowerCase();
  if (category.includes("security") || category.includes("risk") || category.includes("audit")) {
    return "accent-purple";
  }
  if (category.includes("governance") || category.includes("compliance") || category.includes("doctrine")) {
    return "accent-cyan";
  }
  return "accent-blue";
}

function renderMembershipBadges(module) {
  const accessLevel = String(module?.metadata?.accessLevel || module?.access_level || "public").toLowerCase();
  const isOperator = accessLevel === "operator" || accessLevel === "restricted";
  const isIncluded = accessLevel === "public" || module?.base_price === 0;
  const badges = [];

  if (isIncluded) {
    badges.push('<span class="membership-badge membership-badge--included">Included in Membership</span>');
  }
  if (isOperator) {
    badges.push('<span class="membership-badge membership-badge--exclusive">Operator Exclusive</span>');
  }
  if (!badges.length) {
    badges.push('<span class="membership-badge membership-badge--included">Included in Membership</span>');
  }

  return `<div class="membership-badge-row">${badges.join("")}</div>`;
}

function getMembershipValueStatement(module) {
  const accessLevel = String(module?.metadata?.accessLevel || module?.access_level || "public").toLowerCase();
  const name = module?.name || module?.title || "This module";

  if (module?.slug === "public-register" || module?.service_slug === "public_register") {
    return "Establish operator identity and receive cockpit readiness updates as systems activate.";
  }
  if (accessLevel === "operator" || accessLevel === "restricted") {
    return `${name} delivers operator-exclusive controls, queue visibility, and security plane routing for members.`;
  }
  if (accessLevel === "public") {
    return `${name} is included with membership — explore value before escalating into operator workflows.`;
  }
  return `${name} extends your membership with guided intake, governance signals, and ecosystem lifecycle visibility.`;
}

function renderMembershipValueStatement(module) {
  return `<p class="module-value-statement">${escapeHtml(getMembershipValueStatement(module))}</p>`;
}

function animateGridRender(grid) {
  if (!grid) {
    return;
  }
  grid.classList.add("is-rendering");
  requestAnimationFrame(() => {
    grid.classList.remove("is-rendering");
  });
}

function severityBucket(value) {
  const severity = Number(value || 0);
  if (severity >= 81) {
    return "critical";
  }
  if (severity >= 61) {
    return "high";
  }
  if (severity >= 31) {
    return "medium";
  }
  return "low";
}

async function fetchJson(url) {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return payload;
}

async function fetchOptional(url, fallback) {
  try {
    return await fetchJson(url);
  } catch (error) {
    console.warn(`Marketplace advisory fetch failed for ${url}`, error);
    return fallback;
  }
}

function getView() {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") || "all";
}

function moduleMatchesView(module, view) {
  if (view === "operator") {
    return module.metadata.accessLevel === "operator";
  }

  if (view === "public") {
    return module.metadata.accessLevel === "public";
  }

  if (view === "restricted") {
    return module.status === "restricted" || module.metadata.accessLevel === "restricted";
  }

  return true;
}

function viewDescription(view) {
  const descriptions = {
    all: "All validated modules currently exposed by the live registry.",
    operator: "Modules aligned to operator access and implementation workflows.",
    public: "Public briefs and doctrine surfaces suitable for broad stakeholder review.",
    restricted: "Restricted modules that require additional clearance or routing."
  };

  return descriptions[view] || descriptions.all;
}

function normalizeModule(entry, metadataMap = new Map()) {
  const metadata = metadataMap.get(entry.id) || entry.metadata || {};
  return {
    ...entry,
    metadata: {
      ...metadata,
      ...entry.metadata
    },
    searchableText: `${entry.name} ${entry.description || ""} ${entry.metadata?.longDescription || ""}`.toLowerCase(),
    publishDate: entry.metadata?.publishedAt || entry.lastUpdated || null,
    agentSource: entry.metadata?.synced ? "marketplace-sync" : "registry",
    severity: entry.metadata?.severity || entry.severity || 0
  };
}

function renderSummary(modules, statusRecords, metadataRecords) {
  const summaryGrid = document.getElementById("summary-grid");
  const activeCount = statusRecords.filter((entry) => entry.status === "active" || entry.status === "published").length;
  const restrictedCount = statusRecords.filter((entry) => entry.status === "restricted").length;
  const readyRoutes = metadataRecords.filter((entry) => entry.route && entry.static_path).length;
  const publishedCount = modules.filter((entry) => entry.metadata?.publishedAt).length;

  summaryGrid.innerHTML = `
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ REGISTRY_COUNT ]</p>
        <h3>${modules.length}</h3>
        <p>Front-end cards mapped to backend module objects.</p>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ ACTIVE ]</p>
        <h3>${activeCount}</h3>
        <p>Status values are sourced from the backend tracking plane.</p>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ PUBLISHED ]</p>
        <h3>${publishedCount}</h3>
        <p>Modules already promoted to public module pages.</p>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ CLEAN_ROUTES ]</p>
        <h3>${readyRoutes}</h3>
        <p>Module detail paths are available under /marketplace/:moduleId.</p>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ RESTRICTED ]</p>
        <h3>${restrictedCount}</h3>
        <p>Modules with extra access handling or clearance requirements.</p>
      </div>
    </article>
  `;
  animateGridRender(summaryGrid);
}

function renderEcosystem(ecosystem) {
  const grid = document.getElementById("ecosystem-grid");
  const categoryLines = (ecosystem.categories || [])
    .map((entry) => `<span>${escapeHtml(entry.label)} :: ${escapeHtml(String(entry.count))}</span>`)
    .join("");
  const recentLines = (ecosystem.recentlyPublishedModules || [])
    .map((entry) => `<span>${escapeHtml(entry.name)} :: ${escapeHtml(formatDate(entry.publishedAt || entry.createdAt))}</span>`)
    .join("");
  const trendLines = (ecosystem.trendingModules || [])
    .map((entry) => `<span>${escapeHtml(entry.name)} :: ${escapeHtml(String(entry.trendScore || 0))}</span>`)
    .join("");

  grid.innerHTML = `
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ CATEGORIES ]</p>
        <div class="telemetry-list">${categoryLines || "<span>No category data yet.</span>"}</div>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ RECENT_PUBLISHES ]</p>
        <div class="telemetry-list">${recentLines || "<span>No published modules yet.</span>"}</div>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ TRENDING ]</p>
        <div class="telemetry-list">${trendLines || "<span>No trending data yet.</span>"}</div>
      </div>
    </article>
  `;
  animateGridRender(grid);
}

function renderHeartbeat(heartbeat) {
  const grid = document.getElementById("heartbeat-grid");
  const kvLines = Object.entries(heartbeat.kvHealth || {})
    .map(([name, status]) => `<span>${escapeHtml(name)} :: ${escapeHtml(status)}</span>`)
    .join("");

  grid.innerHTML = `
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ HEARTBEAT ]</p>
        <h3>${Object.values(heartbeat.kvHealth || {}).includes("error") ? "DEGRADED" : formatStatus(heartbeat.globalRouterHealth || "online")}</h3>
        <p>Last autonomy ${escapeHtml(formatDate(heartbeat.lastAutonomyLoopRun))}</p>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ KV_HEALTH ]</p>
        <div class="telemetry-list">${kvLines || "<span>No KV health data.</span>"}</div>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ OS_HEALTH ]</p>
        <div class="telemetry-list">
          <span>GOVERNANCE :: ${escapeHtml(formatStatus(heartbeat.governanceHealth || "unknown"))}</span>
          <span>SAFETY :: ${escapeHtml(formatStatus(heartbeat.safetyHealth || "unknown"))}</span>
          <span>VERSION :: ${escapeHtml(formatStatus(heartbeat.versionHealth || "unknown"))}</span>
          <span>CONFIG :: ${escapeHtml(formatStatus(heartbeat.configHealth || "unknown"))}</span>
        </div>
      </div>
    </article>
  `;
  animateGridRender(grid);
}

function renderOsGovernance(governance, version, releases, integrations, certification, heartbeat) {
  const grid = document.getElementById("os-governance-grid");
  grid.innerHTML = `
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ GOVERNANCE ]</p>
        <h3>${escapeHtml(String(governance.config?.autonomyThresholds?.maxAutoChainLength || 0))} MAX CHAIN</h3>
        <p>Pipeline max ${escapeHtml(String(governance.config?.pipelineSafetyRules?.maxSteps || 0))} :: scenario max ${escapeHtml(String(governance.config?.scenarioSafetyRules?.maxSteps || 0))}</p>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ VERSION ]</p>
        <h3>${escapeHtml(version.current || "v3.5")}</h3>
        <p>${escapeHtml((version.history || []).join(" -> ") || "No version history.")}</p>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ DECISIONS ]</p>
        <p>${escapeHtml(String(governance.decisions?.length || 0))} governance decisions stored.</p>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ RELEASES ]</p>
        <h3>${escapeHtml(String(releases.releases?.length || 0))}</h3>
        <p>Latest build health :: ${escapeHtml(formatStatus(releases.cloudflareBuildStatus?.health || "unknown"))}</p>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ INTEGRATIONS ]</p>
        <h3>${escapeHtml(String(integrations.integrations?.length || 0))}</h3>
        <p>Most recent :: ${escapeHtml(integrations.integrations?.[0]?.name || "none")}</p>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ CERTIFICATION ]</p>
        <h3>${escapeHtml(String(certification.certifications?.length || 0))}</h3>
        <p>Heartbeat safety :: ${escapeHtml(formatStatus(heartbeat.safetyHealth || "unknown"))}</p>
      </div>
    </article>
  `;
  animateGridRender(grid);
}

function renderScenarios(scenarios) {
  const grid = document.getElementById("scenario-examples-grid");
  grid.innerHTML = (scenarios || []).length
    ? scenarios.map((scenario) => `
        <article class="summary-card bracket">
          <div class="bracket-inner">
            <p class="section-label mono">[ PUBLIC_SCENARIO ]</p>
            <h3>${escapeHtml(scenario.name)}</h3>
            <p>${escapeHtml(String(scenario.steps?.length || 0))} steps :: ${escapeHtml(formatDate(scenario.createdAt))}</p>
          </div>
        </article>
      `).join("")
    : `<article class="summary-card bracket"><div class="bracket-inner"><p>No public scenarios yet.</p></div></article>`;
  animateGridRender(grid);
}

function renderInternalAgentModules(cards) {
  const activeCards = (cards || []).filter((card) => card.active !== false);
  if (!activeCards.length) {
    return "";
  }

  return activeCards
    .map(
      (card, index) => `
        <article class="module-card bracket is-premium">
          <div class="bracket-inner">
            <span class="premium-ribbon">★ Premium</span>
            <div class="module-head">
              <div>
                <p class="section-label mono">[ INTERNAL_AGENT ]</p>
                <h3 class="module-identity"><span class="module-icon ${getModuleAccentClass(card)}" aria-hidden="true">${getModuleIcon(card)}</span>${escapeHtml(card.name)}</h3>
              </div>
              <span class="module-num">${String(index + 1).padStart(2, "0")}</span>
            </div>
            <p>${escapeHtml(card.description)}</p>
            <div class="membership-badge-row">
              <span class="membership-badge membership-badge--exclusive">Operator Exclusive</span>
            </div>
            <p class="module-value-statement">${escapeHtml(card.name)} routes multi-agent intake through the operator membership plane.</p>
            <div class="tag-row">
              <span>${escapeHtml(card.category)}</span>
              <span>operator-only</span>
              <span>active</span>
            </div>
            <p class="section-copy mono">AGENT_ID :: ${escapeHtml(card.slug)}</p>
            <div class="button-row">
              <a class="button primary" href="${escapeHtml(card.route)}">[ OPEN OPERATOR ROUTE ]</a>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderRegisterSecurityBadges(module) {
  const security = module.security_plane || {};
  const lifecycle = module.lifecycle_summary || {};
  const moduleMeta = security.module || module;
  return `
    <div class="tag-row register-security-badges">
      <span title="Security lifecycle stage for intake routing">SECURITY :: ${escapeHtml(moduleMeta.security_stage || lifecycle.security_stage || "intake")}</span>
      <span title="Permission profile enforced by AgentPermissionValidator">PERMISSION :: ${escapeHtml(moduleMeta.permission_profile || lifecycle.permission_profile || "public_intake")}</span>
      <span title="Linked IntakeAgentV2 configuration key">AGENT :: ${escapeHtml(moduleMeta.agent_config_key || lifecycle.agent_config_key || "intake_agent_v2")}</span>
      <span title="Threat modeling requirement for this module">THREAT_MODEL :: ${moduleMeta.requires_threat_modeling || lifecycle.requires_threat_modeling ? "required" : "not required"}</span>
    </div>
  `;
}

function renderServiceModules(modules) {
  const grid = document.getElementById("service-module-grid");
  if (!grid) {
    return;
  }

  const internalCards = renderInternalAgentModules(INTERNAL_AGENT_MODULES);
  const serviceCards = (modules || []).length
    ? modules
        .map(
          (module) => {
            const lifecycle = module.lifecycle_summary || null;
            const lifecycleLabel = lifecycle?.latest_lifecycle_label || "Pending Intake";
            const lifecycleBanner = lifecycle
              ? lifecycle.operator_mode
                ? "Operator Mode teaser :: processed lifecycle available."
                : "Observer Mode :: lifecycle is still moving through intake."
              : "";
            const isPublicRegister = module.slug === "public-register" || module.service_slug === "public_register";
            const securityBadges = isPublicRegister ? renderRegisterSecurityBadges(module) : "";
            const publicCtaLabel = isPublicRegister ? "Register for Access" : "[ VIEW PUBLIC ROUTE ]";
            const operatorCtaLabel = isPublicRegister ? "[ OPERATOR QUEUE ]" : "[ OPEN OPERATOR ROUTE ]";
            const publicCtaClass = isPublicRegister
              ? "register-cta-enterprise pulse mono"
              : "button primary";
            const publicCtaTitle = isPublicRegister
              ? "Register to receive cockpit activation updates."
              : "Open the public registration intake surface";
            return `
            <article class="module-card bracket">
              <div class="bracket-inner">
                <div class="module-head">
                  <div>
                    <p class="section-label mono">[ ${isPublicRegister ? "ACCESS_INTAKE_MODULE" : "SERVICE_MODULE"} ]</p>
                    <h3 class="module-identity"><span class="module-icon ${getModuleAccentClass(module)}" aria-hidden="true">${getModuleIcon(module)}</span>${escapeHtml(module.name || module.title)}</h3>
                  </div>
                  <span class="module-num">${module.base_price === 0 ? "FREE" : escapeHtml(String(module.base_price || "custom"))}</span>
                </div>
                <p>${escapeHtml(module.description)}</p>
                ${renderMembershipBadges(module)}
                ${renderMembershipValueStatement(module)}
                <div class="tag-row">
                  <span>${escapeHtml(module.category)}</span>
                  <span>${escapeHtml(module.revenue_type)}</span>
                  <span>${escapeHtml(module.status)}</span>
                  ${lifecycle ? `<span title="Latest IntakeAgentV2 lifecycle label">${escapeHtml(lifecycleLabel)}</span>` : ""}
                </div>
                ${securityBadges}
                ${lifecycleBanner ? `<p class="section-copy mono">LIFECYCLE :: ${escapeHtml(lifecycleBanner)}</p>` : ""}
                <p class="section-copy mono">INPUTS :: ${escapeHtml((module.required_inputs || []).join(" | "))}</p>
                <p class="section-copy mono">OUTPUTS :: ${escapeHtml((module.delivery_outputs || []).join(" | "))}</p>
                <div class="button-row">
                  <a class="${publicCtaClass}" href="${escapeHtml(module.public_service_route)}" title="${escapeHtml(publicCtaTitle)}">${publicCtaLabel}</a>
                  <a class="button secondary" href="${escapeHtml(module.operator_route)}" title="Operator-only queue preview for registration intake">${operatorCtaLabel}</a>
                </div>
              </div>
            </article>
          `;
          },
        )
        .join("")
    : "";

  grid.innerHTML =
    internalCards + serviceCards ||
    `<article class="module-card bracket"><div class="bracket-inner"><p>No internal service modules loaded.</p></div></article>`;
  animateGridRender(grid);
}

function renderCloudflareBadges(federation) {
  const grid = document.getElementById("cloudflare-badges-grid");
  if (!grid) return;
  const readiness = federation?.readiness || {};
  grid.innerHTML = `
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ CF_FEDERATION ]</p>
        <h3>${escapeHtml(readiness.readiness || "optional")}</h3>
        <p>Score ${escapeHtml(String(readiness.readinessScore ?? "n/a"))} :: optional Cloudflare MCP integration.</p>
      </div>
    </article>
    <article class="summary-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ CF_SKILLS ]</p>
        <div class="telemetry-list">${(readiness.skills || []).slice(0, 6).map((skill) => `<span>${escapeHtml(skill)}</span>`).join("") || "<span>No skills listed.</span>"}</div>
      </div>
    </article>
  `;
  animateGridRender(grid);
}

function getAdaptiveBadge(mode) {
  if (typeof window !== "undefined" && window.CloudflareFederationUI?.getAdaptiveBadge) {
    return window.CloudflareFederationUI.getAdaptiveBadge(mode);
  }
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
  if (typeof window !== "undefined" && window.CloudflareFederationUI?.getPredictiveBadge) {
    return window.CloudflareFederationUI.getPredictiveBadge(mode);
  }
  const normalized = String(mode || "watch").toLowerCase();
  if (normalized === "stable") {
    return "PREDICT_STABLE";
  }
  if (normalized === "alert" || normalized === "fallback") {
    return "PREDICT_ALERT";
  }
  return "PREDICT_WATCH";
}

function moduleAdaptiveClass(mode, module) {
  const normalized = String(mode || "caution").toLowerCase();
  const cfDecision = module.cloudflareDecision || "optional";
  const cfCertStatus = module.cloudflareCertification?.status || "review";
  const cfModuleRisk = module.cloudflareModuleRisk || "low";
  const cfSyncStatus = module.cloudflareSyncStatus || "partial";
  if (normalized === "caution" && (cfDecision === "hold" || cfCertStatus === "incompatible" || cfModuleRisk === "high")) {
    return "adaptive-dim";
  }
  if (normalized === "review" && (cfSyncStatus === "partial" || cfSyncStatus === "divergent" || cfCertStatus === "review" || cfCertStatus === "incompatible")) {
    return "adaptive-highlight";
  }
  if (normalized === "degraded") {
    return "adaptive-dim";
  }
  return "";
}

function modulePredictiveClass(module) {
  if (module.cloudflarePredictiveDim) {
    return "predictive-dim";
  }
  if (module.cloudflarePredictiveHighlight) {
    return "predictive-highlight";
  }
  return "";
}

function moduleStrategicClass(module) {
  if (module.cloudflareStrategicTag === "STRAT_REVIEW") {
    return "strategic-dim";
  }
  if (module.cloudflareStrategicHighlight || module.cloudflareStrategicInPlan) {
    return "strategic-highlight";
  }
  return "";
}

function moduleUcipClass(module) {
  const tag = module.cloudflareUCIPTag || "";
  if (tag === "UCIP_RED") {
    return "ucip-dim ucip-red-highlight";
  }
  if (tag === "UCIP_ORANGE" || module.cloudflareUCIPHighlight) {
    return "ucip-highlight";
  }
  return "";
}

function moduleAmgClass(module) {
  const tag = module.cloudflareAMGTag || "";
  if (tag === "AMG_CAUTION") {
    return module.cloudflareAMGHighlight ? "amg-highlight" : "amg-dim";
  }
  if (module.cloudflareAMGHighlight) {
    return "amg-highlight";
  }
  return "";
}

function moduleCbaClass(module) {
  const tag = module.cloudflareCBATag || "";
  if (tag === "CBA_RISK") {
    return module.cloudflareCBAHighlight ? "cba-highlight" : "cba-dim";
  }
  if (tag === "CBA_DRIFT" || module.cloudflareCBAHighlight) {
    return "cba-highlight";
  }
  return "";
}

function moduleCalClass(module) {
  const tag = module.cloudflareCALTag || "";
  if (tag === "CAL_MISALIGNED") {
    return module.cloudflareCALHighlight ? "cal-highlight" : "cal-dim";
  }
  if (tag === "CAL_PARTIAL" || module.cloudflareCALHighlight) {
    return "cal-highlight";
  }
  return "";
}

function moduleIhlClass(module) {
  const tag = module.cloudflareIHLTag || "";
  if (tag === "IHL_CONFLICT") {
    return module.cloudflareIHLHighlight ? "ihl-highlight" : "ihl-dim";
  }
  if (tag === "IHL_PARTIAL" || module.cloudflareIHLHighlight) {
    return "ihl-highlight";
  }
  return "";
}

function moduleIarlClass(module) {
  const tag = module.cloudflareIARLTag || "";
  if (tag === "IARL_MISMATCH") {
    return module.cloudflareIARLHighlight ? "iarl-highlight" : "iarl-dim";
  }
  if (tag === "IARL_PARTIAL" || module.cloudflareIARLHighlight) {
    return "iarl-highlight";
  }
  return "";
}

function moduleAclClass(module) {
  const tag = module.cloudflareACLTag || "";
  if (tag === "ACL_FRAGMENTED") {
    return module.cloudflareACLHighlight ? "acl-highlight" : "acl-dim";
  }
  if (tag === "ACL_PARTIAL" || module.cloudflareACLHighlight) {
    return "acl-highlight";
  }
  return "";
}

function renderModules(modules, view, federationMeta = {}, adaptiveMeta = {}, predictiveMeta = {}, strategicMeta = {}, ucipMeta = {}, amgMeta = {}, cbaMeta = {}, calMeta = {}, ihlMeta = {}, iarlMeta = {}, aclMeta = {}) {
  const moduleGrid = document.getElementById("module-grid");
  const filteredModules = modules.filter((module) => moduleMatchesView(module, view));
  const readinessScore = federationMeta.readinessScore ?? 0;
  const cloudflareReady = readinessScore >= 50;
  const cloudflareReadyPlus = readinessScore >= 80;
  const adaptiveMode = adaptiveMeta.adaptiveState?.mode || federationMeta.cloudflareAdaptiveMode || federationMeta.cloudflareFederation?.cloudflareAdaptive?.mode || "caution";
  const adaptiveBadge = adaptiveMeta.adaptiveState?.mode
    ? getAdaptiveBadge(adaptiveMode)
    : federationMeta.cloudflareFederation?.cloudflareAdaptive?.mode
      ? getAdaptiveBadge(federationMeta.cloudflareFederation.cloudflareAdaptive.mode)
      : getAdaptiveBadge(adaptiveMode);
  const predictiveMode =
    predictiveMeta.predictiveState?.forecastMode ||
    federationMeta.cloudflarePredictiveMode ||
    federationMeta.cloudflareFederation?.cloudflarePredictive?.forecastMode ||
    "watch";
  const predictiveBadge = getPredictiveBadge(predictiveMode);
  const strategicStripMode =
    strategicMeta.strategicState?.stripMode ||
    federationMeta.cloudflareStrategicStripMode ||
    federationMeta.cloudflareFederation?.cloudflareStrategic?.stripMode ||
    "watch";
  const ucipMode =
    ucipMeta.ucipState?.mode ||
    federationMeta.cloudflareUCIPMode ||
    federationMeta.cloudflareFederation?.cloudflareUCIP?.mode ||
    "yellow";
  const amgMode =
    amgMeta.amgState?.mode ||
    federationMeta.cloudflareAMGMode ||
    federationMeta.cloudflareFederation?.cloudflareAMG?.mode ||
    "govern_yellow";
  const cbaMode =
    cbaMeta.cbaState?.mode ||
    federationMeta.cloudflareCBAMode ||
    federationMeta.cloudflareFederation?.cloudflareCBA?.mode ||
    "behavior_yellow";
  const calMode =
    calMeta.calState?.mode ||
    federationMeta.cloudflareCALMode ||
    federationMeta.cloudflareFederation?.cloudflareCAL?.mode ||
    "align_yellow";
  const ihlMode =
    ihlMeta.ihlState?.mode ||
    federationMeta.cloudflareIHLMode ||
    federationMeta.cloudflareFederation?.cloudflareIHL?.mode ||
    "intent_yellow";
  const iarlMode =
    iarlMeta.iarlState?.mode ||
    federationMeta.cloudflareIARLMode ||
    federationMeta.cloudflareFederation?.cloudflareIARL?.mode ||
    "resonance_yellow";
  const aclMode =
    aclMeta.aclState?.mode ||
    federationMeta.cloudflareACLMode ||
    federationMeta.cloudflareFederation?.cloudflareACL?.mode ||
    "coherence_yellow";

  moduleGrid.innerHTML = filteredModules.length
    ? filteredModules
        .map(
          (module) => {
            const cfMeta = module.cloudflareFederation || {};
            const cfActions = cfMeta.actions || module.cfActionCompatibility || ["docs"];
            const cfDecision = module.cloudflareDecision || federationMeta.cloudflareDecision || "optional";
            const cfModuleRisk = module.cloudflareModuleRisk || "low";
            const cfCert = module.cloudflareCertification || {};
            const cfCertStatus = cfCert.status || "review";
            const cfCertScore = cfCert.score ?? "n/a";
            const cfSyncStatus = module.cloudflareSyncStatus || federationMeta.cloudflareCrossDivisionSyncStatus || "partial";
            const cfSyncScore = module.cloudflareSyncScore ?? federationMeta.cloudflareFederation?.cloudflareCrossDivisionSync?.crossDivisionScore ?? "n/a";
            const cfReadyBadge = cfMeta.cfReadyPlus || cfActions.length >= 4 ? "CF_READY+" : cloudflareReadyPlus ? "CF_READY+" : cloudflareReady ? "CF_READY" : "CF_OPTIONAL";
            const decisionBadge = `CF_DECISION_${String(cfDecision).toUpperCase()}`;
            const certBadge = `CF_CERT_${String(cfCertStatus).toUpperCase()}`;
            const syncBadge = `CF_SYNC_${String(cfSyncStatus).toUpperCase()}`;
            const orchStatus = module.cloudflareOrchestrationStatus || federationMeta.cloudflareFederation?.cloudflareOrchestration?.orchestrationHealth || "review";
            const orchScore = module.cloudflareOrchestrationScore ?? federationMeta.cloudflareFederation?.cloudflareOrchestration?.orchestrationScore ?? "n/a";
            const orchBadge = `CF_ORCH_${String(orchStatus).toUpperCase()}`;
            const execStatus = module.cloudflareExecutionStatus || federationMeta.cloudflareFederation?.cloudflareExecution?.executionHealth || "review";
            const execScore = module.cloudflareExecutionScore ?? federationMeta.cloudflareFederation?.cloudflareExecution?.executionScore ?? "n/a";
            const execBadge = `CF_EXEC_${String(execStatus).toUpperCase()}`;
            const adaptiveClass = module.cloudflareAdaptiveDim
              ? "adaptive-dim"
              : module.cloudflareAdaptiveHighlight
                ? "adaptive-highlight"
                : moduleAdaptiveClass(adaptiveMode, module);
            const moduleAdaptiveBadge = module.cloudflareAdaptiveBadge || adaptiveBadge;
            const modulePredictiveBadge = module.cloudflarePredictiveBadge || predictiveBadge;
            const moduleStrategicTag = module.cloudflareStrategicTag || (strategicStripMode === "prioritize" ? "STRAT_REVIEW" : strategicStripMode === "stable" ? "STRAT_PROMOTE" : "STRAT_STABILIZE");
            const moduleUcipTag = module.cloudflareUCIPTag || `UCIP_${String(ucipMode).toUpperCase()}`;
            const moduleAmgTag = module.cloudflareAMGTag || (amgMode === "govern_green" ? "AMG_OK" : amgMode === "govern_red" || amgMode === "govern_orange" ? "AMG_CAUTION" : "AMG_REVIEW");
            const moduleCbaTag = module.cloudflareCBATag || (cbaMode === "behavior_green" ? "CBA_STABLE" : cbaMode === "behavior_red" || cbaMode === "behavior_orange" ? "CBA_RISK" : "CBA_DRIFT");
            const moduleCalTag = module.cloudflareCALTag || (calMode === "align_green" ? "CAL_ALIGNED" : calMode === "align_red" || calMode === "align_orange" ? "CAL_MISALIGNED" : "CAL_PARTIAL");
            const moduleIhlTag = module.cloudflareIHLTag || (ihlMode === "intent_green" ? "IHL_ALIGNED" : ihlMode === "intent_red" || ihlMode === "intent_orange" ? "IHL_CONFLICT" : "IHL_PARTIAL");
            const moduleIarlTag = module.cloudflareIARLTag || (iarlMode === "resonance_green" ? "IARL_ALIGNED" : iarlMode === "resonance_red" || iarlMode === "resonance_orange" ? "IARL_MISMATCH" : "IARL_PARTIAL");
            const moduleAclTag = module.cloudflareACLTag || (aclMode === "coherence_green" ? "ACL_ALIGNED" : aclMode === "coherence_red" || aclMode === "coherence_orange" ? "ACL_FRAGMENTED" : "ACL_PARTIAL");
            const cardClass = [adaptiveClass, modulePredictiveClass(module), moduleStrategicClass(module), moduleUcipClass(module), moduleAmgClass(module), moduleCbaClass(module), moduleCalClass(module), moduleIhlClass(module), moduleIarlClass(module), moduleAclClass(module)].filter(Boolean).join(" ");
            return `
            <article class="module-card bracket ${cardClass}">
              <div class="bracket-inner">
                <div class="module-head">
                  <div>
                    <p class="section-label mono">[ MODULE_${escapeHtml(module.metadata.num || "SYNC")} ]</p>
                    <h3 class="module-identity"><span class="module-icon ${getModuleAccentClass(module)}" aria-hidden="true">${getModuleIcon(module)}</span><a href="${escapeHtml(module.metadata.route || module.metadata.publicUrl || `/marketplace/${module.id}`)}">${escapeHtml(module.name)}</a></h3>
                  </div>
                  <span class="module-num">${escapeHtml(module.metadata.num || "SYNC")}</span>
                </div>
                <p>${escapeHtml(module.description)}</p>
                ${renderMembershipBadges(module)}
                ${renderMembershipValueStatement(module)}
                <div class="tag-row">
                  ${(module.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
                  <span>${escapeHtml(module.agentSource)}</span>
                  <span>PIPELINE_READY</span>
                  ${renderCfBadge(cfReadyBadge)}
                  ${renderCfBadge(decisionBadge, cfDecision === "hold" ? "warning" : "")}
                  ${renderCfBadge(certBadge, cfCertStatus === "incompatible" ? "warning" : "")}
                  ${renderCfBadge(syncBadge, cfSyncStatus === "divergent" ? "warning" : "")}
                  ${renderCfBadge(orchBadge, orchStatus === "deferred" ? "warning" : "")}
                  ${renderCfBadge(execBadge, execStatus === "deferred" ? "warning" : "")}
                  ${renderCfBadge(moduleAdaptiveBadge, "adaptive-badge")}
                  ${renderCfBadge(modulePredictiveBadge, `predictive-badge ${modulePredictiveBadge === "PREDICT_ALERT" ? "warning" : ""}`)}
                  ${renderCfBadge(moduleStrategicTag, `strategic-badge ${moduleStrategicTag === "STRAT_REVIEW" ? "warning" : ""}`)}
                  ${renderCfBadge(moduleUcipTag, `ucip-badge ucip-${String(module.cloudflareUCIPMode || ucipMode).toLowerCase()} ${moduleUcipTag === "UCIP_RED" || moduleUcipTag === "UCIP_ORANGE" ? "warning" : ""}`)}
                  ${renderCfBadge(moduleAmgTag, `amg-badge ${moduleAmgTag === "AMG_CAUTION" ? "warning" : ""}`)}
                  ${renderCfBadge(moduleCbaTag, `cba-badge ${moduleCbaTag === "CBA_RISK" ? "warning" : ""}`)}
                  ${renderCfBadge(moduleCalTag, `cal-badge ${moduleCalTag === "CAL_MISALIGNED" ? "warning" : ""}`)}
                  ${renderCfBadge(moduleIhlTag, `ihl-badge ${moduleIhlTag === "IHL_CONFLICT" ? "warning" : ""}`)}
                  ${renderCfBadge(moduleIarlTag, `iarl-badge ${moduleIarlTag === "IARL_MISMATCH" ? "warning" : ""}`)}
                  ${renderCfBadge(moduleAclTag, `acl-badge ${moduleAclTag === "ACL_FRAGMENTED" ? "warning" : ""}`)}
                  <span class="status-chip cf-badge" title="Module UCIP risk synthesis">RISK_${escapeHtml(String(module.cloudflareUCIPRisk || cfModuleRisk).toUpperCase())}</span>
                </div>
                <p class="section-copy mono">CF Actions :: ${escapeHtml(cfActions.join(" | ") || "docs")}</p>
                <p class="section-copy mono">CF Insights :: ${escapeHtml(Object.keys(module.cloudflareModuleInsights || {}).join(" | ") || "docs")}</p>
                <p class="section-copy mono">CF Cert :: ${escapeHtml(String(cfCertScore))} :: ${escapeHtml((cfCert.reasons || []).slice(0, 2).join(" | ") || "advisory compatibility")}</p>
                <p class="section-copy mono">CF Sync :: ${escapeHtml(String(cfSyncStatus).toUpperCase())} :: score ${escapeHtml(String(cfSyncScore))} :: ${escapeHtml((module.cloudflareSyncReasons || []).slice(0, 1).join("") || "advisory")}</p>
                <p class="section-copy mono">CF Orch :: ${escapeHtml(String(orchScore))} :: ${escapeHtml((module.cloudflareOrchestrationReasons || []).slice(0, 1).join("") || orchStatus)}</p>
                <p class="section-copy mono">CF Exec :: ${escapeHtml(String(execScore))} :: ${escapeHtml((module.cloudflareExecutionReasons || []).slice(0, 1).join("") || execStatus)}</p>
                <p class="section-copy mono">CF UCIP :: ${escapeHtml(String(module.cloudflareUCIPMode || ucipMode).toUpperCase())} :: ${escapeHtml(moduleUcipTag)} :: score ${escapeHtml(String(module.cloudflareUCIPScore ?? ucipMeta.ucipScore ?? "n/a"))} :: risk ${escapeHtml(module.cloudflareUCIPRisk || "low")}${module.cloudflareUCIPHighlight ? " :: HIGHLIGHT" : ""}</p>
                <p class="section-copy mono">CF AMG :: ${escapeHtml(String(module.cloudflareAMGMode || amgMode).toUpperCase())} :: ${escapeHtml(moduleAmgTag)} :: risk ${escapeHtml(module.cloudflareAMGRisk || "low")}${module.cloudflareAMGHighlight ? " :: HIGHLIGHT" : ""}</p>
                <p class="section-copy mono">CF CBA :: ${escapeHtml(String(module.cloudflareCBAMode || cbaMode).toUpperCase())} :: ${escapeHtml(moduleCbaTag)} :: risk ${escapeHtml(module.cloudflareCBARisk || "low")}${module.cloudflareCBAHighlight ? " :: HIGHLIGHT" : ""}</p>
                <p class="section-copy mono">CF CAL :: ${escapeHtml(String(module.cloudflareCALMode || calMode).toUpperCase())} :: ${escapeHtml(moduleCalTag)} :: risk ${escapeHtml(module.cloudflareCALRisk || "low")}${module.cloudflareCALHighlight ? " :: HIGHLIGHT" : ""}</p>
                <p class="section-copy mono">CF IHL :: ${escapeHtml(String(module.cloudflareIHLMode || ihlMode).toUpperCase())} :: ${escapeHtml(moduleIhlTag)} :: risk ${escapeHtml(module.cloudflareIHLRisk || "low")}${module.cloudflareIHLHighlight ? " :: HIGHLIGHT" : ""}</p>
                <p class="section-copy mono">CF IARL :: ${escapeHtml(String(module.cloudflareIARLMode || iarlMode).toUpperCase())} :: ${escapeHtml(moduleIarlTag)} :: risk ${escapeHtml(module.cloudflareIARLRisk || "low")}${module.cloudflareIARLHighlight ? " :: HIGHLIGHT" : ""}</p>
                <p class="section-copy mono">CF ACL :: ${escapeHtml(String(module.cloudflareACLMode || aclMode).toUpperCase())} :: ${escapeHtml(moduleAclTag)} :: risk ${escapeHtml(module.cloudflareACLRisk || "low")}${module.cloudflareACLHighlight ? " :: HIGHLIGHT" : ""}</p>
                <div class="detail-chip-row">
                  <span class="status-chip">${escapeHtml(formatStatus(module.status))}</span>
                  <span class="access-chip">${escapeHtml(formatStatus(module.metadata.accessLevel))}</span>
                  <span class="access-chip">${escapeHtml(severityBucket(module.severity))}</span>
                  <span class="access-chip">GOV_${escapeHtml(formatStatus(module.metadata.governance || "tracked"))}</span>
                  <span class="access-chip">SAFE_${escapeHtml(formatStatus(module.metadata.safety || severityBucket(module.severity)))}</span>
                  <span class="access-chip">VER_${escapeHtml(module.metadata.version || module.version || "v3.5")}</span>
                </div>
                <p>${escapeHtml(module.metadata.longDescription || module.description)}</p>
                <p class="mono">UPDATED ${escapeHtml(formatDate(module.lastUpdated))}</p>
                <div class="button-row">
                  <a class="button primary" href="${escapeHtml(module.metadata.route || module.metadata.publicUrl || `/marketplace/${module.id}`)}">[ VIEW MODULE ]</a>
                  <a class="button secondary" href="/api/modules/${escapeHtml(module.id)}" target="_blank" rel="noreferrer">[ BACKEND PAYLOAD ]</a>
                </div>
              </div>
            </article>
          `;
          },
        )
        .join("")
    : `<article class="module-card bracket"><div class="bracket-inner"><p>No modules matched the current controls.</p></div></article>`;

  document.getElementById("view-description").textContent = viewDescription(view);
  animateGridRender(moduleGrid);
}

function highlightActiveFilter(view) {
  document.querySelectorAll("[data-view]").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === view);
  });
}

function applyControls(modules, view, federationMeta = {}, adaptiveMeta = {}, predictiveMeta = {}, strategicMeta = {}, ucipMeta = {}, amgMeta = {}, cbaMeta = {}, calMeta = {}, ihlMeta = {}, iarlMeta = {}, aclMeta = {}) {
  const query = document.getElementById("search-input").value.trim().toLowerCase();
  const agent = document.getElementById("agent-filter").value;
  const dateWindow = document.getElementById("date-filter").value;
  const severity = document.getElementById("severity-filter").value;
  const publishState = document.getElementById("publish-filter").value;
  const now = Date.now();

  const filtered = modules.filter((module) => {
    if (!moduleMatchesView(module, view)) {
      return false;
    }
    if (query && !module.searchableText.includes(query)) {
      return false;
    }
    if (agent !== "all" && module.agentSource !== agent) {
      return false;
    }
    if (dateWindow !== "all" && module.publishDate) {
      const age = now - new Date(module.publishDate).getTime();
      if (age > Number(dateWindow) * 24 * 60 * 60 * 1000) {
        return false;
      }
    }
    if (severity !== "all" && severityBucket(module.severity) !== severity) {
      return false;
    }
    if (publishState === "published" && !module.metadata?.publishedAt) {
      return false;
    }
    if (publishState === "unpublished" && module.metadata?.publishedAt) {
      return false;
    }
    return true;
  });

  renderModules(filtered, "all", federationMeta, adaptiveMeta, predictiveMeta, strategicMeta, ucipMeta, amgMeta, cbaMeta, calMeta, ihlMeta, iarlMeta, aclMeta);
  const statusEl = document.getElementById("marketplace-status");
  if (statusEl) {
    statusEl.dataset.state = "loading";
  }
  const advisoryDegraded = [ucipMeta, amgMeta, cbaMeta, calMeta, ihlMeta, iarlMeta, aclMeta].some(
    (feed) => feed?.advisoryDegraded || feed?.degraded,
  );
  if (statusEl) {
    statusEl.textContent = `Marketplace online :: ${filtered.length} modules match the current controls.${advisoryDegraded ? " :: CF advisory degraded (optional)" : ""}`;
    statusEl.dataset.state = advisoryDegraded ? "warning" : "success";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const view = getView();
  const [
    { modules },
    { status },
    { metadata },
    ecosystem,
    heartbeat,
    publicScenarios,
    governance,
    version,
    integrations,
    releases,
    certification,
    federation,
    catalog,
    ucip,
    amg,
    cba,
    cal,
    ihl,
    iarl,
    acl,
    serviceModulePayload,
  ] = await Promise.all([
    fetchJson("/api/modules"),
    fetchJson("/api/modules/status"),
    fetchJson("/api/modules/metadata"),
    fetchOptional("/marketplace/ecosystem", { categories: [], recentlyPublishedModules: [], trendingModules: [] }),
    fetchOptional("/api/os/heartbeat", { kvHealth: {}, globalRouterHealth: "degraded", governanceHealth: "unknown", safetyHealth: "unknown", versionHealth: "unknown", configHealth: "unknown", lastAutonomyLoopRun: null }),
    fetchOptional("/api/public/scenario", { scenarios: [] }),
    fetchOptional("/api/os/governance", { config: {}, decisions: [] }),
    fetchOptional("/api/os/version", { current: "v3.5", history: ["v3.5"], lastUpgrade: null, cloudflareIHLMode: "intent_partial", cloudflareIARLMode: "resonance_partial", cloudflareACLMode: "coherence_partial" }),
    fetchOptional("/api/os/integration", { integrations: [] }),
    fetchOptional("/api/os/releases", { releases: [], cloudflareBuildStatus: { health: "unknown" } }),
    fetchOptional("/api/os/certification", { certifications: [] }),
    fetchOptional("/api/os/federation/cloudflare", { readiness: {}, metadata: {} }),
    fetchOptional("/api/marketplace/catalog", { items: [], cloudflareFederation: {} }),
    fetchOptional("/api/os/cloudflare/ucip", { ucipState: { mode: "yellow" }, ucipScore: 0 }),
    fetchOptional("/api/os/cloudflare/amg", { amgState: { mode: "govern_yellow" } }),
    fetchOptional("/api/os/cloudflare/cba", { cbaState: { mode: "behavior_yellow" } }),
    fetchOptional("/api/os/cloudflare/cal", { calState: { mode: "align_yellow" } }),
    fetchOptional("/api/os/cloudflare/ihl", { ihlState: { mode: "intent_partial" } }),
    fetchOptional("/api/os/cloudflare/iarl", { iarlState: { mode: "resonance_partial" } }),
    fetchOptional("/api/os/cloudflare/acl", { aclState: { mode: "coherence_partial" } }),
    fetchOptional("/api/marketplace/service-modules", { modules: [] }),
  ]);
  const cfFed = catalog.cloudflareFederation || federation?.metadata || {};
  const adaptive = { adaptiveState: cfFed.cloudflareAdaptive || {} };
  const predictive = { predictiveState: cfFed.cloudflarePredictive || {} };
  const strategic = { strategicState: cfFed.cloudflareStrategic || {} };
  const federationMeta = {
    readinessScore: federation?.readiness?.readinessScore ?? 0,
    cloudflareFederation: cfFed,
    cloudflareCrossDivisionSyncStatus: cfFed.cloudflareCrossDivisionSync?.syncStatus,
    cloudflareAdaptiveMode: adaptive.adaptiveState?.mode,
    cloudflarePredictiveMode: predictive.predictiveState?.forecastMode,
    cloudflareStrategicStripMode: strategic.strategicState?.stripMode,
    cloudflareUCIPMode: ucip.ucipState?.mode,
    cloudflareAMGMode: amg.amgState?.mode,
    cloudflareCBAMode: cba.cbaState?.mode,
    cloudflareCALMode: cal.calState?.mode,
    cloudflareIHLMode: ihl.ihlState?.mode || version.cloudflareIHLMode,
    cloudflareIARLMode: iarl.iarlState?.mode || version.cloudflareIARLMode,
    cloudflareACLMode: acl.aclState?.mode || version.cloudflareACLMode,
  };
  const cfCatalogMap = new Map((catalog.items || []).map((item) => [item.id, item]));
  const metadataMap = new Map(metadata.map((entry) => [entry.id, entry]));
  const normalizedModules = modules.map((entry) => {
    const normalized = normalizeModule(entry, metadataMap);
    normalized.metadata.governance = normalized.metadata.governance || (governance.decisions?.length ? "enforced" : "tracked");
    normalized.metadata.safety = normalized.metadata.safety || severityBucket(normalized.severity);
    normalized.metadata.version = normalized.metadata.version || version.current || "v3.5";
    const cfItem = cfCatalogMap.get(entry.id);
    if (cfItem?.cloudflareFederation) {
      normalized.cloudflareFederation = cfItem.cloudflareFederation;
      normalized.cfActionCompatibility = cfItem.cfActionCompatibility;
    }
    if (cfItem?.cloudflareCertification) {
      normalized.cloudflareCertification = cfItem.cloudflareCertification;
    }
    if (cfItem?.cloudflareSyncStatus) {
      normalized.cloudflareSyncStatus = cfItem.cloudflareSyncStatus;
      normalized.cloudflareSyncScore = cfItem.cloudflareSyncScore;
      normalized.cloudflareSyncReasons = cfItem.cloudflareSyncReasons;
    }
    if (cfItem?.cloudflareOrchestrationStatus) {
      normalized.cloudflareOrchestrationStatus = cfItem.cloudflareOrchestrationStatus;
      normalized.cloudflareOrchestrationScore = cfItem.cloudflareOrchestrationScore;
      normalized.cloudflareOrchestrationReasons = cfItem.cloudflareOrchestrationReasons;
    }
    if (cfItem?.cloudflareExecutionStatus) {
      normalized.cloudflareExecutionStatus = cfItem.cloudflareExecutionStatus;
      normalized.cloudflareExecutionScore = cfItem.cloudflareExecutionScore;
      normalized.cloudflareExecutionReasons = cfItem.cloudflareExecutionReasons;
    }
    if (cfItem?.cloudflareAdaptiveBadge) {
      normalized.cloudflareAdaptiveBadge = cfItem.cloudflareAdaptiveBadge;
      normalized.cloudflareAdaptiveMode = cfItem.cloudflareAdaptiveMode;
      normalized.cloudflareAdaptiveDim = cfItem.cloudflareAdaptiveDim;
      normalized.cloudflareAdaptiveHighlight = cfItem.cloudflareAdaptiveHighlight;
    }
    if (cfItem?.cloudflarePredictiveBadge) {
      normalized.cloudflarePredictiveBadge = cfItem.cloudflarePredictiveBadge;
      normalized.cloudflarePredictiveMode = cfItem.cloudflarePredictiveMode;
      normalized.cloudflarePredictiveDim = cfItem.cloudflarePredictiveDim;
      normalized.cloudflarePredictiveHighlight = cfItem.cloudflarePredictiveHighlight;
      normalized.cloudflarePredictiveModuleForecast = cfItem.cloudflarePredictiveModuleForecast;
    }
    if (cfItem?.cloudflareStrategicTag) {
      normalized.cloudflareStrategicTag = cfItem.cloudflareStrategicTag;
      normalized.cloudflareStrategicHorizon = cfItem.cloudflareStrategicHorizon;
      normalized.cloudflareStrategicStripMode = cfItem.cloudflareStrategicStripMode;
      normalized.cloudflareStrategicHighlight = cfItem.cloudflareStrategicHighlight;
      normalized.cloudflareStrategicInPlan = cfItem.cloudflareStrategicInPlan;
    }
    if (cfItem?.cloudflareUCIPTag) {
      normalized.cloudflareUCIPTag = cfItem.cloudflareUCIPTag;
      normalized.cloudflareUCIPMode = cfItem.cloudflareUCIPMode;
      normalized.cloudflareUCIPRisk = cfItem.cloudflareUCIPRisk;
      normalized.cloudflareUCIPHighlight = cfItem.cloudflareUCIPHighlight;
      normalized.cloudflareUCIPScore = cfItem.cloudflareUCIPScore;
    }
    if (cfItem?.cloudflareAMGTag) {
      normalized.cloudflareAMGTag = cfItem.cloudflareAMGTag;
      normalized.cloudflareAMGMode = cfItem.cloudflareAMGMode;
      normalized.cloudflareAMGRisk = cfItem.cloudflareAMGRisk;
      normalized.cloudflareAMGHighlight = cfItem.cloudflareAMGHighlight;
      normalized.cloudflareAMGScore = cfItem.cloudflareAMGScore;
    }
    if (cfItem?.cloudflareCBATag) {
      normalized.cloudflareCBATag = cfItem.cloudflareCBATag;
      normalized.cloudflareCBAMode = cfItem.cloudflareCBAMode;
      normalized.cloudflareCBARisk = cfItem.cloudflareCBARisk;
      normalized.cloudflareCBAHighlight = cfItem.cloudflareCBAHighlight;
      normalized.cloudflareCBAScore = cfItem.cloudflareCBAScore;
    }
    if (cfItem?.cloudflareCALTag) {
      normalized.cloudflareCALTag = cfItem.cloudflareCALTag;
      normalized.cloudflareCALMode = cfItem.cloudflareCALMode;
      normalized.cloudflareCALRisk = cfItem.cloudflareCALRisk;
      normalized.cloudflareCALHighlight = cfItem.cloudflareCALHighlight;
      normalized.cloudflareCALScore = cfItem.cloudflareCALScore;
    }
    if (cfItem?.cloudflareIHLTag) {
      normalized.cloudflareIHLTag = cfItem.cloudflareIHLTag;
      normalized.cloudflareIHLMode = cfItem.cloudflareIHLMode;
      normalized.cloudflareIHLRisk = cfItem.cloudflareIHLRisk;
      normalized.cloudflareIHLHighlight = cfItem.cloudflareIHLHighlight;
      normalized.cloudflareIHLScore = cfItem.cloudflareIHLScore;
    }
    if (cfItem?.cloudflareIARLTag) {
      normalized.cloudflareIARLTag = cfItem.cloudflareIARLTag;
      normalized.cloudflareIARLMode = cfItem.cloudflareIARLMode;
      normalized.cloudflareIARLRisk = cfItem.cloudflareIARLRisk;
      normalized.cloudflareIARLHighlight = cfItem.cloudflareIARLHighlight;
      normalized.cloudflareIARLScore = cfItem.cloudflareIARLScore;
    }
    if (cfItem?.cloudflareACLTag) {
      normalized.cloudflareACLTag = cfItem.cloudflareACLTag;
      normalized.cloudflareACLMode = cfItem.cloudflareACLMode;
      normalized.cloudflareACLRisk = cfItem.cloudflareACLRisk;
      normalized.cloudflareACLHighlight = cfItem.cloudflareACLHighlight;
      normalized.cloudflareACLScore = cfItem.cloudflareACLScore;
    }
    if (cfItem?.cloudflareDecision) {
      normalized.cloudflareDecision = cfItem.cloudflareDecision;
      normalized.cloudflareModuleRisk = cfItem.cloudflareModuleRisk;
      normalized.cloudflareModuleInsights = cfItem.cloudflareModuleInsights;
    }
    return normalized;
  });

  highlightActiveFilter(view);
  renderSummary(normalizedModules, status, metadata);
  renderEcosystem(ecosystem);
  renderHeartbeat(heartbeat);
  renderScenarios(publicScenarios.scenarios || []);
  renderServiceModules(serviceModulePayload.modules || []);
  renderOsGovernance(governance, version, releases, integrations, certification, heartbeat);
  renderCloudflareBadges(federation);
  renderModules(normalizedModules, view, federationMeta, adaptive, predictive, strategic, ucip, amg, cba, cal, ihl, iarl, acl);
  const advisoryDegraded = [ucip, amg, cba, cal, ihl, iarl, acl].some((feed) => feed?.advisoryDegraded || feed?.degraded);
  const marketplaceStatus = document.getElementById("marketplace-status");
  if (marketplaceStatus && advisoryDegraded) {
    marketplaceStatus.textContent += " :: CF advisory degraded (optional)";
  }

  document.getElementById("marketplace-controls-form").addEventListener("submit", (event) => {
    event.preventDefault();
    applyControls(normalizedModules, view, federationMeta, adaptive, predictive, strategic, ucip, amg, cba, cal, ihl, iarl, acl);
  });

  document.getElementById("reset-filters").addEventListener("click", () => {
    document.getElementById("marketplace-controls-form").reset();
    renderModules(normalizedModules, view, federationMeta, adaptive, predictive, strategic, ucip, amg, cba, cal, ihl, iarl, acl);
    const statusNode = document.getElementById("marketplace-status");
    statusNode.textContent = "Marketplace controls reset.";
    statusNode.dataset.state = "";
  });
});
