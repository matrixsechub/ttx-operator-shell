const federationLayers = [
  { key: "cloudflareUCIPMode", label: "UCIP" },
  { key: "cloudflareAMGMode", label: "AMG" },
  { key: "cloudflareCBAMode", label: "CBA" },
  { key: "cloudflareCALMode", label: "CAL" },
  { key: "cloudflareIHLMode", label: "IHL" },
  { key: "cloudflareIARLMode", label: "IARL" },
  { key: "cloudflareACLMode", label: "ACL" },
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function formatDate(value) {
  if (!value) return "n/a";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function setText(id, value) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = value;
}

function token(value) {
  return String(value ?? "n/a").replace(/[_-]+/g, " ").toUpperCase();
}

function summarizeKvHealth(kvHealth) {
  if (!kvHealth || typeof kvHealth !== "object" || Array.isArray(kvHealth)) {
    return token(kvHealth || "unknown");
  }

  const values = Object.values(kvHealth);
  const okCount = values.filter((value) => value === "ok").length;
  return `${okCount}/${values.length} OK`;
}

function buildCard(title, headline, copy, meta = []) {
  const metaMarkup = meta.length
    ? `<div class="telemetry-list">${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`
    : "";

  return `
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ ${escapeHtml(title)} ]</p>
        <h3>${escapeHtml(headline)}</h3>
        <p class="system-copy">${escapeHtml(copy)}</p>
        ${metaMarkup}
      </div>
    </article>
  `;
}

function renderSystemCards(model) {
  const target = document.getElementById("system-status-grid");
  if (!target) return;

  const version = model.version;
  const governance = model.governance;
  const releases = model.releases;
  const integrations = model.integrations;
  const certification = model.certification;
  const heartbeat = model.heartbeat;
  const identity = model.identity;

  const governanceConfig = governance?.config || {};
  const governanceDecisions = Array.isArray(governance?.decisions) ? governance.decisions : [];
  const releaseList = Array.isArray(releases?.releases) ? releases.releases : [];
  const integrationList = Array.isArray(integrations?.integrations) ? integrations.integrations : [];
  const certificationList = Array.isArray(certification?.certifications) ? certification.certifications : [];
  const agents = Array.isArray(identity?.agents) ? identity.agents : [];

  target.innerHTML = [
    buildCard(
      "VERSION",
      version?.current || "v3.5",
      `Last upgrade ${formatDate(version?.lastUpgrade)}.`,
      [
        `History entries :: ${Array.isArray(version?.history) ? version.history.length : 0}`,
        `Version health :: ${token(heartbeat?.versionHealth || version?.current || "ready")}`,
      ],
    ),
    buildCard(
      "GOVERNANCE",
      token(heartbeat?.governanceHealth || "ready"),
      `${governanceDecisions.length} governance decisions recorded.`,
      [
        `Autonomy thresholds :: ${Object.keys(governanceConfig.autonomyThresholds || {}).length}`,
        `Chain length limit :: ${governanceConfig.chainLengthLimit ?? "n/a"}`,
        `Override rules :: ${Array.isArray(governanceConfig.operatorOverrideRules) ? governanceConfig.operatorOverrideRules.length : 0}`,
      ],
    ),
    buildCard(
      "SAFETY",
      token(heartbeat?.safetyHealth || "ready"),
      "Safety checks remain active for chains, pipelines, scenarios, and sandbox execution.",
      [
        `Agent safety rules :: ${Array.isArray(governanceConfig.agentSafetyRules) ? governanceConfig.agentSafetyRules.length : 0}`,
        `Pipeline safety rules :: ${Array.isArray(governanceConfig.pipelineSafetyRules) ? governanceConfig.pipelineSafetyRules.length : 0}`,
        `Scenario safety rules :: ${Array.isArray(governanceConfig.scenarioSafetyRules) ? governanceConfig.scenarioSafetyRules.length : 0}`,
      ],
    ),
    buildCard(
      "RELEASES",
      `${releaseList.length} recorded`,
      "Release engineering remains available without changing deployment topology from the root dashboard.",
      [
        `Latest release :: ${releaseList[0]?.version || "n/a"}`,
        `Cloudflare build status :: ${token(releases?.cloudflareBuildStatus?.status || "unknown")}`,
      ],
    ),
    buildCard(
      "INTEGRATIONS",
      `${integrationList.length} registered`,
      "External integrations are governance-gated and advisory-only unless explicitly exercised.",
      [
        `Most recent :: ${integrationList[0]?.name || "n/a"}`,
        `Permissions :: ${Array.isArray(integrationList[0]?.permissions) ? integrationList[0].permissions.join(", ") : "n/a"}`,
      ],
    ),
    buildCard(
      "CERTIFICATION",
      `${certificationList.length} results`,
      "Agent certification remains a prerequisite signal for higher-order pipelines and scenarios.",
      [
        `Latest agent :: ${certificationList[0]?.agent || "n/a"}`,
        `Latest score :: ${certificationList[0]?.score ?? "n/a"}`,
        `Latest status :: ${token(certificationList[0]?.status || "unknown")}`,
      ],
    ),
    buildCard(
      "HEARTBEAT",
      token(heartbeat?.globalRouterHealth || "ready"),
      `Division uptime anchored at ${formatDate(heartbeat?.divisionUptimeStartedAt)}.`,
      [
        `Memory :: ${token(heartbeat?.memoryHealth || "unknown")}`,
        `Pipeline :: ${token(heartbeat?.pipelineEngineHealth || "unknown")}`,
        `Sandbox :: ${token(heartbeat?.sandboxHealth || "unknown")}`,
        `Config :: ${token(heartbeat?.configHealth || "unknown")}`,
        `KV :: ${summarizeKvHealth(heartbeat?.kvHealth)}`,
      ],
    ),
    buildCard(
      "IDENTITY",
      identity?.division || "MSHOPS.NET",
      "Division identity, operator console, marketplace, and federation references remain available at the root layer.",
      [
        `Agents :: ${agents.length}`,
        `Operator console :: ${identity?.operatorConsole || "/operator"}`,
        `Marketplace :: ${identity?.marketplace || "/marketplace"}`,
      ],
    ),
  ].join("");
}

function renderFederationStrip(version) {
  const target = document.getElementById("federation-chip-row");
  if (!target) return;

  target.innerHTML = federationLayers
    .map((layer) => {
      const mode = token(version?.[layer.key] || "unknown");
      return `<span>${escapeHtml(layer.label)} :: ${escapeHtml(mode)}</span>`;
    })
    .join("");
}

function renderAuditLitePanel(snapshot = {}) {
  const target = document.getElementById("audit-lite-operator-panel-grid");
  if (!target) {
    return;
  }

  const summary = snapshot.summary || {};
  const lastRows = Array.isArray(summary.last_10_submissions) ? summary.last_10_submissions.slice(0, 10) : [];
  const risk = summary.risk_tier_distribution || {};
  const lifecycle = summary.lifecycle_distribution || {};

  target.innerHTML = [
    buildCard(
      "AUDIT_LITE",
      `${summary.total || 0} submissions`,
      "Audit-lite routes are lifecycle-backed before the operator queue touches them.",
      [
        `Pending intake :: ${lifecycle.received || 0}`,
        `Validated :: ${lifecycle.validated || 0}`,
        `Queued :: ${lifecycle.queued || 0}`,
        `Processed :: ${lifecycle.processed || 0}`,
      ],
    ),
    buildCard(
      "RISK_TIERS",
      `Critical ${risk.critical || 0}`,
      "Risk-tier distribution for the last visible audit-lite submissions.",
      [
        `Low :: ${risk.low || 0}`,
        `Medium :: ${risk.medium || 0}`,
        `High :: ${risk.high || 0}`,
        `Critical :: ${risk.critical || 0}`,
      ],
    ),
    buildCard(
      "LAST_10",
      lastRows[0]?.audit_id || "No submissions",
      "Most recent audit-lite submissions routed through IntakeAgentV2 lifecycle.",
      lastRows.slice(0, 5).map((row) => `${row.audit_id} :: ${row.lifecycle_label} :: ${row.risk_tier}`),
    ),
  ].join("");
}

function updateHero(model) {
  const version = model.version;
  const heartbeat = model.heartbeat;
  const governance = model.governance;
  const governanceDecisions = Array.isArray(governance?.decisions) ? governance.decisions : [];

  setText("os-version-badge", `[ OS_VERSION :: ${version?.current || "V3.5"} ]`);
  setText("os-heartbeat-badge", `[ OS_HEARTBEAT :: ${token(heartbeat?.globalRouterHealth || "ready")} ]`);
  setText("governance-health-stat", token(heartbeat?.governanceHealth || "ready"));
  setText("governance-copy", `${governanceDecisions.length} governance decisions recorded.`);
  setText("safety-health-stat", token(heartbeat?.safetyHealth || "ready"));
  setText("safety-copy", `Agent :: ${token(heartbeat?.globalRouterHealth || "ready")} | Memory :: ${token(heartbeat?.memoryHealth || "ready")}`);
  setText("heartbeat-health-stat", summarizeKvHealth(heartbeat?.kvHealth || "ready"));
  setText("heartbeat-copy", `Uptime anchor ${formatDate(heartbeat?.divisionUptimeStartedAt)}.`);
}

async function loadDashboard() {
  const [
    versionResult,
    governanceResult,
    releasesResult,
    integrationsResult,
    certificationResult,
    heartbeatResult,
    identityResult,
    auditLiteResult,
  ] = await Promise.allSettled([
    fetchJson("/api/os/version"),
    fetchJson("/api/os/governance"),
    fetchJson("/api/os/releases"),
    fetchJson("/api/os/integration"),
    fetchJson("/api/os/certification"),
    fetchJson("/api/os/heartbeat"),
    fetchJson("/api/identity"),
    fetchJson("/api/operator/audit-lite"),
  ]);

  const identity = identityResult.status === "fulfilled" ? identityResult.value : {};
  const version = versionResult.status === "fulfilled"
    ? versionResult.value
    : {
        current: identity.version || "v3.5",
        history: Array.isArray(identity.versionHistory) ? identity.versionHistory : [],
        lastUpgrade: identity.lastUpgrade || null,
      };
  const governance = governanceResult.status === "fulfilled" ? governanceResult.value : { config: {}, decisions: [] };
  const releases = releasesResult.status === "fulfilled" ? releasesResult.value : { releases: [] };
  const integrations = integrationsResult.status === "fulfilled" ? integrationsResult.value : { integrations: [] };
  const certification = certificationResult.status === "fulfilled" ? certificationResult.value : { certifications: [] };
  const heartbeat = heartbeatResult.status === "fulfilled"
    ? heartbeatResult.value
    : {
        globalRouterHealth: "degraded",
        governanceHealth: "degraded",
        safetyHealth: "degraded",
        versionHealth: version.current || "v3.5",
        memoryHealth: "unknown",
        pipelineEngineHealth: "unknown",
        sandboxHealth: "unknown",
        configHealth: "unknown",
        kvHealth: null,
        divisionUptimeStartedAt: null,
      };
  const auditLite = auditLiteResult.status === "fulfilled" ? auditLiteResult.value : { rows: [], summary: {} };

  const model = { version, governance, releases, integrations, certification, heartbeat, identity, auditLite };
  updateHero(model);
  renderSystemCards(model);
  renderFederationStrip(version);
  renderAuditLitePanel(auditLite);
}

async function boot() {
  const refreshButton = document.getElementById("refresh-dashboard");
  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      refreshButton.disabled = true;
      refreshButton.textContent = "[ REFRESHING ]";
      try {
        await loadDashboard();
      } catch (error) {
        console.error("Dashboard refresh failed.", error);
      } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = "[ REFRESH STATUS ]";
      }
    });
  }

  try {
    await loadDashboard();
  } catch (error) {
    console.error("OS dashboard bootstrap failed.", error);
    const fallback = buildCard(
      "ROOT_STATUS",
      "Dashboard data unavailable",
      error.message || "The OS dashboard could not load its subsystem summaries.",
      ["Check /api/os/heartbeat", "Check /api/os/version", "Check /api/identity"],
    );
    const target = document.getElementById("system-status-grid");
    if (target) {
      target.innerHTML = fallback;
    }
    setText("os-version-badge", "[ OS_VERSION :: ERROR ]");
    setText("os-heartbeat-badge", "[ OS_HEARTBEAT :: ERROR ]");
    setText("governance-health-stat", "ERR");
    setText("safety-health-stat", "ERR");
    setText("heartbeat-health-stat", "ERR");
  }
}

boot();
