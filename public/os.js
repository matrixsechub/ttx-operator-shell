function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function cfDegradedListItem(feed, message) {
  const fn = window.CloudflareFederationUI?.renderCfAdvisoryDegradedListItem;
  return fn ? fn(feed, message) : "";
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    : "n/a";
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || `Request failed: ${response.status}`);
  return payload;
}

async function fetchOptional(url, fallback = { advisoryOnly: true }) {
  if (typeof window !== "undefined" && window.CloudflareFederationUI?.fetchAdvisoryJson) {
    return window.CloudflareFederationUI.fetchAdvisoryJson(url, fallback);
  }
  try {
    return await fetchJson(url);
  } catch (error) {
    return { ...fallback, advisoryDegraded: true, advisoryDegradedReason: error.message };
  }
}

function renderCloudflareActionsGrid(heartbeat) {
  const grid = document.getElementById("os-cloudflare-actions-grid");
  if (!grid) return;

  const latency = heartbeat.cloudflareLatencyMs || {};
  const oauth = heartbeat.cloudflareOAuthStatus || {};
  const entries = [
    { label: "LOGS", health: heartbeat.cloudflareLogsHealth },
    { label: "METRICS", health: heartbeat.cloudflareMetricsHealth },
    { label: "BUILD", health: heartbeat.cloudflareBuildHealth },
    { label: "BINDINGS", health: heartbeat.cloudflareBindingHealth },
    { label: "DOCS", health: heartbeat.cloudflareDocsHealth },
    { label: "FEDERATION_SCORE", health: `${heartbeat.cloudflareFederationScore ?? "n/a"}/100` },
  ];

  grid.innerHTML = entries
    .map(
      (entry) => `
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ ${escapeHtml(entry.label)} ]</p>
        <h3>${escapeHtml(String(entry.health || "optional"))}</h3>
      </div>
    </article>
  `,
    )
    .concat([
      `
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ LOGS_FETCH ]</p>
        <div class="cta-row"><button class="button ghost" type="button" id="os-cloudflare-fetch-logs">[ FETCH ]</button></div>
        <pre class="payload-json" id="os-cloudflare-logs-preview">Tap fetch for advisory logs.</pre>
      </div>
    </article>
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ METRICS_FETCH ]</p>
        <div class="cta-row"><button class="button ghost" type="button" id="os-cloudflare-fetch-metrics">[ FETCH ]</button></div>
        <pre class="payload-json" id="os-cloudflare-metrics-preview">Tap fetch for advisory metrics.</pre>
      </div>
    </article>
    `,
    ])
    .concat(
      Object.keys(latency)
        .slice(0, 5)
        .map(
          (serverId) => `
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ ${escapeHtml(serverId.toUpperCase())} ]</p>
        <h3>${escapeHtml(String(latency[serverId] ?? "n/a"))}ms</h3>
        <p class="section-copy">OAuth ${escapeHtml(oauth[serverId] || "unknown")}</p>
      </div>
    </article>
  `,
        ),
    )
    .join("");
}

function renderCloudflareAutonomousGrid(heartbeat) {
  const grid = document.getElementById("os-cloudflare-autonomous-grid");
  if (!grid) return;
  const breakdown = heartbeat.cloudflareFederationScoreBreakdown || {};
  const triggers = heartbeat.cloudflareAutonomousSignals?.triggers || [];
  grid.innerHTML = `
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ AUTO_HEALTH ]</p><h3>${escapeHtml(heartbeat.cloudflareAutonomousHealth || "optional")}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareAutonomousScore ?? "n/a"))}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ INSIGHTS_HEALTH ]</p><h3>${escapeHtml(heartbeat.cloudflareInsightsHealth || "optional")}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareInsightsScore ?? "n/a"))}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ EVENTS_HEALTH ]</p><h3>${escapeHtml(heartbeat.cloudflareEventsHealth || "idle")}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ FED_SCORE ]</p><h3>${escapeHtml(String(heartbeat.cloudflareFederationScore ?? "n/a"))}</h3><p class="section-copy">R ${escapeHtml(String(breakdown.readiness ?? "n/a"))} :: A ${escapeHtml(String(breakdown.autonomous ?? "n/a"))} :: I ${escapeHtml(String(breakdown.insights ?? "n/a"))}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ TRIGGERS ]</p><h3>${escapeHtml(String(triggers.length))}</h3><p class="section-copy">${escapeHtml(triggers.join(", ") || "none")}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ DECISION ]</p><h3>${escapeHtml(String(heartbeat.cloudflareDecision || "optional").toUpperCase())}</h3><p class="section-copy">${escapeHtml(heartbeat.cloudflareDecisionHealth || "optional")} :: ${escapeHtml(String(heartbeat.cloudflareDecisionScore ?? "n/a"))}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ AUTO_LOOPS ]</p><h3>${escapeHtml(heartbeat.cloudflareAutomationHealth || "optional")}</h3><p class="section-copy">${escapeHtml(String(Object.values(heartbeat.cloudflareAutomationLoops || {}).filter((loop) => loop.active).length))} active</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CERTIFICATION ]</p><h3>${escapeHtml(heartbeat.cloudflareCertificationHealth || "optional")}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareCertificationScore ?? "n/a"))}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CROSS_DIV_SYNC ]</p><h3>${escapeHtml(String(heartbeat.cloudflareCrossDivisionSyncStatus || "partial").toUpperCase())}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareCrossDivisionScore ?? "n/a"))} :: ${escapeHtml(heartbeat.cloudflareCrossDivisionHealth || "optional")}</p></div></article>
  `;
}

function renderCloudflareCrossDivisionGrid(heartbeat, crossDivisionFeed = {}) {
  const grid = document.getElementById("os-cloudflare-cross-division-grid");
  if (!grid) return;
  const syncStatus = crossDivisionFeed.syncStatus || heartbeat.cloudflareCrossDivisionSyncStatus || "partial";
  const score = crossDivisionFeed.cloudflareCrossDivisionScore ?? heartbeat.cloudflareCrossDivisionScore ?? "n/a";
  const health = crossDivisionFeed.cloudflareCrossDivisionHealth || heartbeat.cloudflareCrossDivisionHealth || "optional";
  const reasons = crossDivisionFeed.cloudflareCrossDivisionReasons || heartbeat.cloudflareCrossDivisionReasons || [];
  grid.innerHTML = `
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ SYNC_STATUS ]</p><h3>${escapeHtml(String(syncStatus).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ SCORE ]</p><h3>${escapeHtml(String(score))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ HEALTH ]</p><h3>${escapeHtml(health)}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ OPERATOR ]</p><h3>${escapeHtml(String(crossDivisionFeed.operatorShell?.decision || heartbeat.cloudflareDecision || "optional").toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ MARKETPLACE ]</p><h3>${escapeHtml(String(crossDivisionFeed.marketplaceBackend?.decision || "optional").toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ REASONS ]</p><h3>${escapeHtml(String(reasons.length))}</h3><p class="section-copy">${escapeHtml(reasons.slice(0, 2).join(" | ") || "No advisories.")}</p></div></article>
  `;
}

function renderCloudflareOrchestrationGrid(heartbeat, orchestrationFeed = {}) {
  const grid = document.getElementById("os-cloudflare-orchestration-grid");
  if (!grid) return;
  const score = orchestrationFeed.orchestrationScore ?? heartbeat.cloudflareOrchestrationScore ?? "n/a";
  const health = orchestrationFeed.orchestrationHealth || heartbeat.cloudflareOrchestrationHealth || "optional";
  const reasons = orchestrationFeed.orchestrationReasons || heartbeat.cloudflareOrchestrationReasons || [];
  const plan = orchestrationFeed.plan || heartbeat.cloudflareOrchestrationPlan || [];
  grid.innerHTML = `
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ ORCH_HEALTH ]</p><h3>${escapeHtml(health)}</h3><p class="section-copy">Score ${escapeHtml(String(score))}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ PLAN_STEPS ]</p><h3>${escapeHtml(String(plan.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ SYNC ]</p><h3>${escapeHtml(String(orchestrationFeed.syncStatus || heartbeat.cloudflareCrossDivisionSyncStatus || "partial").toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ REASONS ]</p><h3>${escapeHtml(String(reasons.length))}</h3><p class="section-copy">${escapeHtml(reasons.slice(0, 2).join(" | ") || "advisory")}</p></div></article>
  `;
  const planNode = document.getElementById("os-cloudflare-orchestration-plan");
  if (planNode) {
    planNode.innerHTML = plan.length
      ? plan.slice(0, 6).map((step) => `<li><strong>${escapeHtml(step.agent || "agent")}:</strong> ${escapeHtml(step.action || "advisory")}</li>`).join("")
      : "<li>No orchestration plan steps.</li>";
  }
}

function renderCloudflareExecutionGrid(heartbeat, executionFeed = {}) {
  const grid = document.getElementById("os-cloudflare-execution-grid");
  if (!grid) return;
  const score = executionFeed.executionScore ?? heartbeat.cloudflareExecutionScore ?? "n/a";
  const health = executionFeed.executionHealth || heartbeat.cloudflareExecutionHealth || "advisory";
  const reasons = executionFeed.executionReasons || heartbeat.cloudflareExecutionReasons || [];
  const plan = executionFeed.executionPlan || heartbeat.cloudflareExecutionPlan || [];
  const syncStatus = executionFeed.syncStatus || heartbeat.cloudflareCrossDivisionSyncStatus || "partial";
  grid.innerHTML = `
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ EXEC_HEALTH ]</p><h3>${escapeHtml(health)}</h3><p class="section-copy">Score ${escapeHtml(String(score))}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ PLAN_STEPS ]</p><h3>${escapeHtml(String(plan.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ SYNC ]</p><h3>${escapeHtml(String(syncStatus).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ REASONS ]</p><h3>${escapeHtml(String(reasons.length))}</h3><p class="section-copy">${escapeHtml(reasons.slice(0, 2).join(" | ") || "advisory")}</p></div></article>
  `;
  const planNode = document.getElementById("os-cloudflare-execution-plan");
  if (planNode) {
    planNode.innerHTML = plan.length
      ? plan.slice(0, 6).map((step) => `<li><strong>${escapeHtml(step.agent || "agent")}:</strong> ${escapeHtml(step.action || step.executeWhen || "advisory")}</li>`).join("")
      : "<li>No execution plan steps.</li>";
  }
}

function renderCloudflareAdaptiveGrid(heartbeat, adaptiveFeed = {}) {
  const grid = document.getElementById("os-cloudflare-adaptive-grid");
  if (!grid) {
    return;
  }
  const mode = adaptiveFeed.adaptiveState?.mode || heartbeat.cloudflareAdaptiveMode || "caution";
  const score = adaptiveFeed.adaptiveScore ?? heartbeat.cloudflareAdaptiveScore ?? "n/a";
  const health = adaptiveFeed.adaptiveHealth || heartbeat.cloudflareAdaptiveHealth || "optional";
  const reasons = adaptiveFeed.adaptiveState?.reasons || heartbeat.cloudflareAdaptiveReasons || [];
  grid.innerHTML = `
    <article class="telemetry-card bracket adaptive-mode-${escapeHtml(mode)}"><div class="bracket-inner"><p class="section-label mono">[ ADAPTIVE_MODE ]</p><h3>${escapeHtml(String(mode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ ADAPTIVE_SCORE ]</p><h3>${escapeHtml(String(score))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ ADAPTIVE_HEALTH ]</p><h3>${escapeHtml(health)}</h3></div></article>
  `;
  const reasonsNode = document.getElementById("os-cloudflare-adaptive-reasons");
  if (reasonsNode) {
    reasonsNode.innerHTML = reasons.length
      ? reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
      : "<li>No adaptive advisories.</li>";
  }
}

function renderCloudflarePredictiveGrid(heartbeat, predictiveFeed = {}) {
  const grid = document.getElementById("os-cloudflare-predictive-grid");
  if (!grid) {
    return;
  }
  const mode = predictiveFeed.predictiveState?.forecastMode || heartbeat.cloudflarePredictiveMode || "watch";
  const score = predictiveFeed.predictiveScore ?? predictiveFeed.predictiveState?.forecastScore ?? heartbeat.cloudflarePredictiveScore ?? "n/a";
  const health = predictiveFeed.predictiveHealth || heartbeat.cloudflarePredictiveHealth || "optional";
  const reasons = predictiveFeed.predictiveState?.forecastReasons || heartbeat.cloudflarePredictiveReasons || [];
  const predictions = predictiveFeed.predictions || heartbeat.cloudflarePredictiveForecast || [];
  grid.innerHTML = `
    <article class="telemetry-card bracket predictive-mode-${escapeHtml(mode)}"><div class="bracket-inner"><p class="section-label mono">[ FORECAST_MODE ]</p><h3>${escapeHtml(String(mode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ FORECAST_SCORE ]</p><h3>${escapeHtml(String(score))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ PREDICTIVE_HEALTH ]</p><h3>${escapeHtml(health)}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ PREDICTIONS ]</p><h3>${escapeHtml(String(predictions.length))}</h3><p class="section-copy">${escapeHtml(predictions.slice(0, 1).map((entry) => entry.forecast).join("") || "advisory")}</p></div></article>
  `;
  const reasonsNode = document.getElementById("os-cloudflare-predictive-reasons");
  if (reasonsNode) {
    reasonsNode.innerHTML = reasons.length
      ? reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
      : "<li>No predictive advisories.</li>";
  }
}

function renderCloudflareStrategicGrid(heartbeat, strategicFeed = {}) {
  const grid = document.getElementById("os-cloudflare-strategic-grid");
  if (!grid) {
    return;
  }
  const horizon = strategicFeed.strategicState?.horizon || heartbeat.cloudflareStrategicHorizon || "short";
  const score = strategicFeed.strategicScore ?? strategicFeed.strategicState?.planScore ?? heartbeat.cloudflareStrategicScore ?? "n/a";
  const health = strategicFeed.strategicHealth || heartbeat.cloudflareStrategicHealth || "optional";
  const stripMode = strategicFeed.strategicState?.stripMode || heartbeat.cloudflareStrategicStripMode || "watch";
  const reasons = strategicFeed.strategicState?.planReasons || heartbeat.cloudflareStrategicReasons || [];
  const themes = strategicFeed.strategicThemes || heartbeat.cloudflareStrategicThemes || [];
  const campaigns = strategicFeed.recommendedCampaigns || heartbeat.cloudflareStrategicCampaigns || [];
  grid.innerHTML = `
    <article class="telemetry-card bracket strategic-strip-${escapeHtml(stripMode)}"><div class="bracket-inner"><p class="section-label mono">[ STRIP_MODE ]</p><h3>${escapeHtml(String(stripMode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ HORIZON ]</p><h3>${escapeHtml(String(horizon).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ PLAN_SCORE ]</p><h3>${escapeHtml(String(score))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ STRATEGIC_HEALTH ]</p><h3>${escapeHtml(health)}</h3><p class="section-copy">${escapeHtml(themes.slice(0, 2).join(" | ") || campaigns.slice(0, 1).join("") || "advisory")}</p></div></article>
  `;
  const reasonsNode = document.getElementById("os-cloudflare-strategic-reasons");
  if (reasonsNode) {
    reasonsNode.innerHTML = reasons.length
      ? reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
      : "<li>No strategic advisories.</li>";
  }
}

function renderCloudflareUcipGrid(heartbeat, ucipFeed = {}) {
  const grid = document.getElementById("os-cloudflare-ucip-grid");
  if (!grid) {
    return;
  }
  const state = ucipFeed.ucipState || {};
  const mode = state.mode || heartbeat.cloudflareUCIPMode || "yellow";
  const score = ucipFeed.ucipScore ?? state.score ?? heartbeat.cloudflareUCIPScore ?? "n/a";
  const health = ucipFeed.ucipHealth || state.health || heartbeat.cloudflareUCIPHealth || "optional";
  const horizon = state.horizon || heartbeat.cloudflareStrategicHorizon || "medium";
  const stripMode = state.stripMode || heartbeat.cloudflareStrategicStripMode || "watch";
  const reasons = ucipFeed.ucipReasons || heartbeat.cloudflareUCIPReasons || [];
  grid.innerHTML = `
    <article class="telemetry-card bracket ucip-mode-${escapeHtml(mode)}"><div class="bracket-inner"><p class="section-label mono">[ UCIP_MODE ]</p><h3>${escapeHtml(String(mode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ UCIP_SCORE ]</p><h3>${escapeHtml(String(score))}</h3><p class="section-copy">${escapeHtml(health)}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ HORIZON ]</p><h3>${escapeHtml(String(horizon).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ STRIP ]</p><h3>${escapeHtml(String(stripMode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ ACTIONS ]</p><h3>${escapeHtml(String((ucipFeed.ucipRecommendedActions || heartbeat.cloudflareUCIPRecommendedActions || []).length))}</h3></div></article>
  `;
  const reasonsNode = document.getElementById("os-cloudflare-ucip-reasons");
  if (reasonsNode) {
    reasonsNode.innerHTML = cfDegradedListItem(ucipFeed, "UCIP advisory degraded — federation optional.") + (reasons.length
      ? reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
      : "<li>No UCIP advisories.</li>");
  }
}

function renderCloudflareAmgGrid(heartbeat, amgFeed = {}) {
  const grid = document.getElementById("os-cloudflare-amg-grid");
  if (!grid) {
    return;
  }
  const state = amgFeed.amgState || {};
  const mode = state.mode || heartbeat.cloudflareAMGMode || "govern_yellow";
  const score = amgFeed.amgScore ?? state.score ?? heartbeat.cloudflareAMGScore ?? "n/a";
  const health = amgFeed.amgHealth || state.health || heartbeat.cloudflareAMGHealth || "optional";
  const rules = amgFeed.amgRules || heartbeat.cloudflareAMGRules || [];
  const nudges = amgFeed.amgOperatorNudges || heartbeat.cloudflareAMGOperatorNudges || [];
  const hints = amgFeed.amgPolicyHints || heartbeat.cloudflareAMGPolicyHints || [];
  const reasons = amgFeed.amgReasons || heartbeat.cloudflareAMGReasons || [];
  const modeClass = String(mode).replace(/_/g, "-");

  grid.innerHTML = `
    <article class="telemetry-card bracket amg-mode-${escapeHtml(modeClass)}"><div class="bracket-inner"><p class="section-label mono">[ AMG_MODE ]</p><h3>${escapeHtml(String(mode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ AMG_SCORE ]</p><h3>${escapeHtml(String(score))}</h3><p class="section-copy">${escapeHtml(health)}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ RULES ]</p><h3>${escapeHtml(String(rules.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ NUDGES ]</p><h3>${escapeHtml(String(nudges.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ HINTS ]</p><h3>${escapeHtml(String(hints.length))}</h3></div></article>
  `;
  const reasonsNode = document.getElementById("os-cloudflare-amg-reasons");
  if (reasonsNode) {
    reasonsNode.innerHTML = cfDegradedListItem(amgFeed, "AMG advisory degraded — federation optional.") + (reasons.length
      ? reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
      : "<li>No AMG advisories.</li>");
  }
}

function renderCloudflareCbaGrid(heartbeat, cbaFeed = {}) {
  const grid = document.getElementById("os-cloudflare-cba-grid");
  if (!grid) {
    return;
  }
  const state = cbaFeed.cbaState || {};
  const mode = state.mode || heartbeat.cloudflareCBAMode || "behavior_yellow";
  const score = cbaFeed.cbaScore ?? state.score ?? heartbeat.cloudflareCBAScore ?? "n/a";
  const health = cbaFeed.cbaHealth || state.health || heartbeat.cloudflareCBAHealth || "optional";
  const patterns = cbaFeed.cbaBehaviorPatterns || heartbeat.cloudflareCBABehaviorPatterns || [];
  const drift = cbaFeed.cbaBehaviorDriftWarnings || heartbeat.cloudflareCBABehaviorDriftWarnings || [];
  const operatorHints = cbaFeed.cbaOperatorBehaviorHints || heartbeat.cloudflareCBAOperatorBehaviorHints || [];
  const reasons = cbaFeed.cbaReasons || heartbeat.cloudflareCBAReasons || [];
  const modeClass = String(mode).replace(/_/g, "-");

  grid.innerHTML = `
    <article class="telemetry-card bracket cba-mode-${escapeHtml(modeClass)}"><div class="bracket-inner"><p class="section-label mono">[ CBA_MODE ]</p><h3>${escapeHtml(String(mode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CBA_SCORE ]</p><h3>${escapeHtml(String(score))}</h3><p class="section-copy">${escapeHtml(health)}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ PATTERNS ]</p><h3>${escapeHtml(String(patterns.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ DRIFT ]</p><h3>${escapeHtml(String(drift.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ HINTS ]</p><h3>${escapeHtml(String(operatorHints.length))}</h3></div></article>
  `;
  const reasonsNode = document.getElementById("os-cloudflare-cba-reasons");
  if (reasonsNode) {
    reasonsNode.innerHTML = cfDegradedListItem(cbaFeed, "CBA advisory degraded — federation optional.") + (reasons.length
      ? reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
      : "<li>No CBA advisories.</li>");
  }
}

function renderCloudflareCalGrid(heartbeat, calFeed = {}) {
  const grid = document.getElementById("os-cloudflare-cal-grid");
  if (!grid) {
    return;
  }
  const state = calFeed.calState || {};
  const mode = state.mode || heartbeat.cloudflareCALMode || "align_yellow";
  const score = calFeed.calScore ?? state.score ?? heartbeat.cloudflareCALScore ?? "n/a";
  const health = calFeed.calHealth || state.health || heartbeat.cloudflareCALHealth || "optional";
  const findings = calFeed.calAlignmentFindings || heartbeat.cloudflareCALAlignmentFindings || [];
  const warnings = calFeed.calAlignmentWarnings || heartbeat.cloudflareCALAlignmentWarnings || [];
  const operatorHints = calFeed.calOperatorAlignmentHints || heartbeat.cloudflareCALOperatorAlignmentHints || [];
  const reasons = calFeed.calReasons || heartbeat.cloudflareCALReasons || [];
  const modeClass = String(mode).replace(/_/g, "-");

  grid.innerHTML = `
    <article class="telemetry-card bracket cal-mode-${escapeHtml(modeClass)}"><div class="bracket-inner"><p class="section-label mono">[ CAL_MODE ]</p><h3>${escapeHtml(String(mode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CAL_SCORE ]</p><h3>${escapeHtml(String(score))}</h3><p class="section-copy">${escapeHtml(health)}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ FINDINGS ]</p><h3>${escapeHtml(String(findings.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ WARNINGS ]</p><h3>${escapeHtml(String(warnings.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ HINTS ]</p><h3>${escapeHtml(String(operatorHints.length))}</h3></div></article>
  `;
  const reasonsNode = document.getElementById("os-cloudflare-cal-reasons");
  if (reasonsNode) {
    reasonsNode.innerHTML = cfDegradedListItem(calFeed, "CAL advisory degraded — federation optional.") + (reasons.length
      ? reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
      : "<li>No CAL advisories.</li>");
  }
}

function renderCloudflareIhlGrid(heartbeat, ihlFeed = {}) {
  const grid = document.getElementById("os-cloudflare-ihl-grid");
  if (!grid) {
    return;
  }
  const state = ihlFeed.ihlState || {};
  const mode = state.mode || heartbeat.cloudflareIHLMode || "intent_yellow";
  const score = ihlFeed.ihlScore ?? state.score ?? heartbeat.cloudflareIHLScore ?? "n/a";
  const health = ihlFeed.ihlHealth || state.health || heartbeat.cloudflareIHLHealth || "optional";
  const findings = ihlFeed.ihlIntentFindings || heartbeat.cloudflareIHLIntentFindings || [];
  const warnings = ihlFeed.ihlIntentWarnings || heartbeat.cloudflareIHLIntentWarnings || [];
  const operatorHints = ihlFeed.ihlOperatorIntentHints || heartbeat.cloudflareIHLOperatorIntentHints || [];
  const reasons = ihlFeed.ihlReasons || heartbeat.cloudflareIHLReasons || [];
  const modeClass = String(mode).replace(/_/g, "-");

  grid.innerHTML = `
    <article class="telemetry-card bracket ihl-mode-${escapeHtml(modeClass)}"><div class="bracket-inner"><p class="section-label mono">[ IHL_MODE ]</p><h3>${escapeHtml(String(mode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ IHL_SCORE ]</p><h3>${escapeHtml(String(score))}</h3><p class="section-copy">${escapeHtml(health)}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ FINDINGS ]</p><h3>${escapeHtml(String(findings.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ WARNINGS ]</p><h3>${escapeHtml(String(warnings.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ HINTS ]</p><h3>${escapeHtml(String(operatorHints.length))}</h3></div></article>
  `;
  const reasonsNode = document.getElementById("os-cloudflare-ihl-reasons");
  if (reasonsNode) {
    reasonsNode.innerHTML = cfDegradedListItem(ihlFeed, "IHL advisory degraded — federation optional.") + (reasons.length
      ? reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
      : "<li>No IHL advisories.</li>");
  }
}

function renderCloudflareIarlGrid(heartbeat, iarlFeed = {}) {
  const grid = document.getElementById("os-cloudflare-iarl-grid");
  if (!grid) {
    return;
  }
  const state = iarlFeed.iarlState || {};
  const mode = state.mode || heartbeat.cloudflareIARLMode || "resonance_yellow";
  const score = iarlFeed.iarlScore ?? state.score ?? heartbeat.cloudflareIARLScore ?? "n/a";
  const health = iarlFeed.iarlHealth || state.health || heartbeat.cloudflareIARLHealth || "optional";
  const findings = iarlFeed.iarlResonanceFindings || heartbeat.cloudflareIARLResonanceFindings || [];
  const warnings = iarlFeed.iarlResonanceWarnings || heartbeat.cloudflareIARLResonanceWarnings || [];
  const operatorHints = iarlFeed.iarlOperatorResonanceHints || heartbeat.cloudflareIARLOperatorResonanceHints || [];
  const reasons = iarlFeed.iarlReasons || heartbeat.cloudflareIARLReasons || [];
  const modeClass = String(mode).replace(/_/g, "-");

  grid.innerHTML = `
    <article class="telemetry-card bracket iarl-mode-${escapeHtml(modeClass)}"><div class="bracket-inner"><p class="section-label mono">[ IARL_MODE ]</p><h3>${escapeHtml(String(mode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ IARL_SCORE ]</p><h3>${escapeHtml(String(score))}</h3><p class="section-copy">${escapeHtml(health)}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ FINDINGS ]</p><h3>${escapeHtml(String(findings.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ WARNINGS ]</p><h3>${escapeHtml(String(warnings.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ HINTS ]</p><h3>${escapeHtml(String(operatorHints.length))}</h3></div></article>
  `;
  const reasonsNode = document.getElementById("os-cloudflare-iarl-reasons");
  if (reasonsNode) {
    reasonsNode.innerHTML = cfDegradedListItem(iarlFeed, "IARL advisory degraded — federation optional.") + (reasons.length
      ? reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
      : "<li>No IARL advisories.</li>");
  }
}

function renderCloudflareAclGrid(heartbeat, aclFeed = {}) {
  const grid = document.getElementById("os-cloudflare-acl-grid");
  if (!grid) {
    return;
  }
  const state = aclFeed.aclState || {};
  const mode = state.mode || heartbeat.cloudflareACLMode || "coherence_yellow";
  const score = aclFeed.aclScore ?? state.score ?? heartbeat.cloudflareACLScore ?? "n/a";
  const health = aclFeed.aclHealth || state.health || heartbeat.cloudflareACLHealth || "optional";
  const findings = aclFeed.aclCoherenceFindings || heartbeat.cloudflareACLCoherenceFindings || [];
  const warnings = aclFeed.aclCoherenceWarnings || heartbeat.cloudflareACLCoherenceWarnings || [];
  const operatorHints = aclFeed.aclOperatorCoherenceHints || heartbeat.cloudflareACLOperatorCoherenceHints || [];
  const reasons = aclFeed.aclReasons || heartbeat.cloudflareACLReasons || [];
  const modeClass = String(mode).replace(/_/g, "-");

  grid.innerHTML = `
    <article class="telemetry-card bracket acl-mode-${escapeHtml(modeClass)}"><div class="bracket-inner"><p class="section-label mono">[ ACL_MODE ]</p><h3>${escapeHtml(String(mode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ ACL_SCORE ]</p><h3>${escapeHtml(String(score))}</h3><p class="section-copy">${escapeHtml(health)}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ FINDINGS ]</p><h3>${escapeHtml(String(findings.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ WARNINGS ]</p><h3>${escapeHtml(String(warnings.length))}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ HINTS ]</p><h3>${escapeHtml(String(operatorHints.length))}</h3></div></article>
  `;
  const reasonsNode = document.getElementById("os-cloudflare-acl-reasons");
  if (reasonsNode) {
    reasonsNode.innerHTML = cfDegradedListItem(aclFeed, "ACL advisory degraded — federation optional.") + (reasons.length
      ? reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
      : "<li>No ACL advisories.</li>");
  }
}

function renderCloudflareFederation(federation) {
  const grid = document.getElementById("os-federation-grid");
  if (!grid) return;

  const readiness = federation?.readiness || federation?.federation?.readiness || {};
  const surfaces = readiness.surfaces || [];

  grid.innerHTML = `
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ READINESS ]</p>
        <h3>${escapeHtml(readiness.readiness || "optional")}</h3>
        <p class="section-copy">Score ${escapeHtml(String(readiness.readinessScore ?? "n/a"))}</p>
      </div>
    </article>
    ${surfaces
      .map(
        (surface) => `
      <article class="telemetry-card bracket">
        <div class="bracket-inner">
          <p class="section-label mono">[ ${escapeHtml(String(surface.label || surface.id).toUpperCase())} ]</p>
          <h3>${escapeHtml(surface.cloudflareReady ? "ready" : "optional")}</h3>
          <p class="section-copy">${escapeHtml(surface.path || "/")}</p>
        </div>
      </article>
    `,
      )
      .join("")}
  `;
}

function renderCloudflareObservability(heartbeat) {
  const grid = document.getElementById("os-cloudflare-grid");
  if (!grid) return;

  const cf = heartbeat.cloudflareObservability || {};
  const observability = cf.observabilityMcp || {};
  const docs = cf.docsMcp || {};

  grid.innerHTML = `
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ OBSERVABILITY ]</p>
        <h3>${escapeHtml(heartbeat.cloudflareObservabilityHealth || cf.health || "unknown")}</h3>
        <p class="section-copy">${escapeHtml(observability.status || "unprobed")} :: ${escapeHtml(observability.latencyMs != null ? `${observability.latencyMs}ms` : "n/a")} :: OAuth ${escapeHtml(observability.oauthStatus || "n/a")}</p>
      </div>
    </article>
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ DOCS MCP ]</p>
        <h3>${escapeHtml(heartbeat.cloudflareDocsServerHealth || docs.status || "unknown")}</h3>
        <p class="section-copy">${escapeHtml(docs.reachable ? "reachable" : "offline")} :: ${escapeHtml(docs.latencyMs != null ? `${docs.latencyMs}ms` : "n/a")}</p>
      </div>
    </article>
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ FEDERATION ]</p>
        <h3>${escapeHtml(heartbeat.cloudflareFederationHealth || "optional")}</h3>
        <p class="section-copy">Avg latency ${escapeHtml(String(heartbeat.cloudflareLatencyMs ?? cf.averageLatencyMs ?? "n/a"))}ms</p>
      </div>
    </article>
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ WORKER ]</p>
        <h3>${escapeHtml(cf.worker || "mshops-public")}</h3>
        <p class="section-copy">Optional Cloudflare MCP observability layer.</p>
      </div>
    </article>
  `;
}

function renderCloudflareDocsResults(result) {
  const target = document.getElementById("os-cloudflare-docs-results");
  if (!target) return;

  const results = result.results || [];
  if (!results.length) {
    target.innerHTML = `<p class="section-copy">No documentation results for "${escapeHtml(result.query || "")}".</p>`;
    return;
  }

  target.innerHTML = results
    .map((entry) => {
      if (entry.url) {
        return `
          <article class="telemetry-card bracket">
            <div class="bracket-inner">
              <p class="section-label mono">[ ${escapeHtml(String(entry.source || "docs").toUpperCase())} ]</p>
              <h3><a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(entry.title || entry.url)}</a></h3>
            </div>
          </article>
        `;
      }
      return `
        <article class="telemetry-card bracket">
          <div class="bracket-inner">
            <p class="section-label mono">[ ${escapeHtml(String(entry.source || "mcp").toUpperCase())} ]</p>
            <h3>${escapeHtml(entry.title || "Documentation search")}</h3>
            <p class="section-copy">${escapeHtml(entry.snippet || "No snippet available.")}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function bindCloudflareDocsSearch() {
  const form = document.getElementById("os-cloudflare-docs-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = document.getElementById("os-cloudflare-docs-query").value.trim();
    const target = document.getElementById("os-cloudflare-docs-results");
    if (target) {
      target.innerHTML = `<p class="section-copy">Searching Cloudflare documentation...</p>`;
    }

    try {
      const result = await fetchJson(`/api/os/cloudflare/docs?q=${encodeURIComponent(query)}`);
      renderCloudflareDocsResults(result);
    } catch (error) {
      if (target) {
        target.innerHTML = `<p class="section-copy">${escapeHtml(error.message || "Docs search failed.")}</p>`;
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  bindCloudflareDocsSearch();

  try {
    const [heartbeat, routes, memory, intents, pipelines, sandbox, config, publicScenarios, governance, releases, integrations, certification, version, federation, crossDivision, orchestration, execution, adaptive, predictive, strategic, ucip, amg, cba, cal, ihl, iarl, acl] = await Promise.all([
      fetchJson("/api/os/heartbeat"),
      fetchJson("/api/os/route"),
      fetchJson("/api/os/memory"),
      fetchJson("/api/operator/intent"),
      fetchJson("/api/pipeline"),
      fetchJson("/api/sandbox"),
      fetchJson("/api/os/config"),
      fetchJson("/api/public/scenario"),
      fetchJson("/api/os/governance"),
      fetchJson("/api/os/releases"),
      fetchJson("/api/os/integration"),
      fetchJson("/api/os/certification"),
      fetchJson("/api/os/version"),
      fetchOptional("/api/os/federation/cloudflare", { advisoryOnly: true }),
      fetchOptional("/api/os/cloudflare/cross-division", { advisoryOnly: true, syncStatus: "partial" }),
      fetchOptional("/api/os/cloudflare/orchestration", { advisoryOnly: true }),
      fetchOptional("/api/os/cloudflare/execution", { advisoryOnly: true }),
      fetchOptional("/api/os/cloudflare/adaptive", { advisoryOnly: true }),
      fetchOptional("/api/os/cloudflare/predictive", { advisoryOnly: true }),
      fetchOptional("/api/os/cloudflare/strategic", { advisoryOnly: true }),
      fetchOptional("/api/os/cloudflare/ucip", { ucipState: { mode: "yellow" }, advisoryOnly: true }),
      fetchOptional("/api/os/cloudflare/amg", { amgState: { mode: "govern_yellow" }, advisoryOnly: true }),
      fetchOptional("/api/os/cloudflare/cba", { cbaState: { mode: "behavior_yellow" }, advisoryOnly: true }),
      fetchOptional("/api/os/cloudflare/cal", { calState: { mode: "align_yellow" }, advisoryOnly: true }),
      fetchOptional("/api/os/cloudflare/ihl", { ihlState: { mode: "intent_yellow" }, advisoryOnly: true }),
      fetchOptional("/api/os/cloudflare/iarl", { iarlState: { mode: "resonance_yellow" }, advisoryOnly: true }),
      fetchOptional("/api/os/cloudflare/acl", { aclState: { mode: "coherence_yellow" }, advisoryOnly: true }),
    ]);

    document.getElementById("os-heartbeat-grid").innerHTML = `
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ ROUTER ]</p><h3>${escapeHtml(heartbeat.globalRouterHealth || "idle")}</h3></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ MEMORY ]</p><h3>${escapeHtml(heartbeat.memoryHealth || "idle")}</h3></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ PIPELINES ]</p><h3>${escapeHtml(heartbeat.pipelineEngineHealth || "idle")}</h3></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_OBSERVABILITY ]</p><h3>${escapeHtml(heartbeat.cloudflareObservabilityHealth || "idle")}</h3></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_FEDERATION ]</p><h3>${escapeHtml(heartbeat.cloudflareFederationHealth || "optional")}</h3><p class="section-copy">Expanded score ${escapeHtml(String(heartbeat.cloudflareFederationScore ?? "n/a"))}</p></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_AUTO_HEALTH ]</p><h3>${escapeHtml(heartbeat.cloudflareAutonomousHealth || "optional")}</h3></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_INSIGHTS ]</p><h3>${escapeHtml(heartbeat.cloudflareInsightsHealth || "optional")}</h3></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_EVENTS ]</p><h3>${escapeHtml(heartbeat.cloudflareEventsHealth || "idle")}</h3></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_DECISION ]</p><h3>${escapeHtml(String(heartbeat.cloudflareDecision || "optional").toUpperCase())}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareDecisionScore ?? "n/a"))}</p></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_AUTO_LOOPS ]</p><h3>${escapeHtml(heartbeat.cloudflareAutomationHealth || "optional")}</h3></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_CERTIFICATION ]</p><h3>${escapeHtml(heartbeat.cloudflareCertificationHealth || "optional")}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareCertificationScore ?? "n/a"))}</p></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_CROSS_DIV ]</p><h3>${escapeHtml(String(heartbeat.cloudflareCrossDivisionSyncStatus || "partial").toUpperCase())}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareCrossDivisionScore ?? "n/a"))} :: ${escapeHtml((heartbeat.cloudflareCrossDivisionReasons || []).slice(0, 1).join("") || heartbeat.cloudflareCrossDivisionHealth || "optional")}</p></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_ORCHESTRATION ]</p><h3>${escapeHtml(heartbeat.cloudflareOrchestrationHealth || "optional")}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareOrchestrationScore ?? "n/a"))}</p></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_EXECUTION ]</p><h3>${escapeHtml(heartbeat.cloudflareExecutionHealth || "advisory")}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareExecutionScore ?? "n/a"))}</p></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_ADAPTIVE ]</p><h3>${escapeHtml(String(heartbeat.cloudflareAdaptiveMode || adaptive.adaptiveState?.mode || "optional").toUpperCase())}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareAdaptiveScore ?? adaptive.adaptiveScore ?? "n/a"))} :: ${escapeHtml(heartbeat.cloudflareAdaptiveHealth || adaptive.adaptiveHealth || "optional")}</p></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_PREDICTIVE ]</p><h3>${escapeHtml(String(heartbeat.cloudflarePredictiveMode || predictive.predictiveState?.forecastMode || "optional").toUpperCase())}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflarePredictiveScore ?? predictive.predictiveScore ?? "n/a"))} :: ${escapeHtml(heartbeat.cloudflarePredictiveHealth || predictive.predictiveHealth || "optional")}</p></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CF_STRATEGIC ]</p><h3>${escapeHtml(String(heartbeat.cloudflareStrategicStripMode || strategic.strategicState?.stripMode || "watch").toUpperCase())}</h3><p class="section-copy">Horizon ${escapeHtml(String(heartbeat.cloudflareStrategicHorizon || strategic.strategicState?.horizon || "short").toUpperCase())} :: Score ${escapeHtml(String(heartbeat.cloudflareStrategicScore ?? strategic.strategicScore ?? "n/a"))}</p></div></article>
      <article class="telemetry-card bracket ucip-mode-${escapeHtml(heartbeat.cloudflareUCIPMode || ucip.ucipState?.mode || "yellow")}"><div class="bracket-inner"><p class="section-label mono">[ CF_UCIP ]</p><h3>${escapeHtml(String(heartbeat.cloudflareUCIPMode || ucip.ucipState?.mode || "yellow").toUpperCase())}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareUCIPScore ?? ucip.ucipScore ?? "n/a"))} :: ${escapeHtml(heartbeat.cloudflareUCIPHealth || ucip.ucipHealth || "optional")}</p></div></article>
      <article class="telemetry-card bracket amg-mode-${escapeHtml(String(heartbeat.cloudflareAMGMode || amg.amgState?.mode || "govern_yellow").replace(/_/g, "-"))}"><div class="bracket-inner"><p class="section-label mono">[ CF_AMG ]</p><h3>${escapeHtml(String(heartbeat.cloudflareAMGMode || amg.amgState?.mode || "govern_yellow").toUpperCase())}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareAMGScore ?? amg.amgScore ?? "n/a"))} :: ${escapeHtml(heartbeat.cloudflareAMGHealth || amg.amgHealth || "optional")}</p></div></article>
      <article class="telemetry-card bracket cba-mode-${escapeHtml(String(heartbeat.cloudflareCBAMode || cba.cbaState?.mode || "behavior_yellow").replace(/_/g, "-"))}"><div class="bracket-inner"><p class="section-label mono">[ CF_CBA ]</p><h3>${escapeHtml(String(heartbeat.cloudflareCBAMode || cba.cbaState?.mode || "behavior_yellow").toUpperCase())}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareCBAScore ?? cba.cbaScore ?? "n/a"))} :: ${escapeHtml(heartbeat.cloudflareCBAHealth || cba.cbaHealth || "optional")}</p></div></article>
      <article class="telemetry-card bracket cal-mode-${escapeHtml(String(heartbeat.cloudflareCALMode || cal.calState?.mode || "align_yellow").replace(/_/g, "-"))}"><div class="bracket-inner"><p class="section-label mono">[ CF_CAL ]</p><h3>${escapeHtml(String(heartbeat.cloudflareCALMode || cal.calState?.mode || "align_yellow").toUpperCase())}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareCALScore ?? cal.calScore ?? "n/a"))} :: ${escapeHtml(heartbeat.cloudflareCALHealth || cal.calHealth || "optional")}</p></div></article>
      <article class="telemetry-card bracket ihl-mode-${escapeHtml(String(heartbeat.cloudflareIHLMode || ihl.ihlState?.mode || "intent_yellow").replace(/_/g, "-"))}"><div class="bracket-inner"><p class="section-label mono">[ CF_IHL ]</p><h3>${escapeHtml(String(heartbeat.cloudflareIHLMode || ihl.ihlState?.mode || "intent_yellow").toUpperCase())}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareIHLScore ?? ihl.ihlScore ?? "n/a"))} :: ${escapeHtml(heartbeat.cloudflareIHLHealth || ihl.ihlHealth || "optional")}</p></div></article>
      <article class="telemetry-card bracket iarl-mode-${escapeHtml(String(heartbeat.cloudflareIARLMode || iarl.iarlState?.mode || "resonance_yellow").replace(/_/g, "-"))}"><div class="bracket-inner"><p class="section-label mono">[ CF_IARL ]</p><h3>${escapeHtml(String(heartbeat.cloudflareIARLMode || iarl.iarlState?.mode || "resonance_yellow").toUpperCase())}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareIARLScore ?? iarl.iarlScore ?? "n/a"))} :: ${escapeHtml(heartbeat.cloudflareIARLHealth || iarl.iarlHealth || "optional")}</p></div></article>
      <article class="telemetry-card bracket acl-mode-${escapeHtml(String(heartbeat.cloudflareACLMode || acl.aclState?.mode || "coherence_yellow").replace(/_/g, "-"))}"><div class="bracket-inner"><p class="section-label mono">[ CF_ACL ]</p><h3>${escapeHtml(String(heartbeat.cloudflareACLMode || acl.aclState?.mode || "coherence_yellow").toUpperCase())}</h3><p class="section-copy">Score ${escapeHtml(String(heartbeat.cloudflareACLScore ?? acl.aclScore ?? "n/a"))} :: ${escapeHtml(heartbeat.cloudflareACLHealth || acl.aclHealth || "optional")}</p></div></article>
      <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ UPTIME_START ]</p><h3>${escapeHtml(formatDate(heartbeat.divisionUptimeStartedAt))}</h3></div></article>
    `;

    renderCloudflareObservability(heartbeat);
    renderCloudflareActionsGrid(heartbeat);
    renderCloudflareAutonomousGrid(heartbeat);
    renderCloudflareCrossDivisionGrid(heartbeat, crossDivision);
    renderCloudflareOrchestrationGrid(heartbeat, orchestration);
    renderCloudflareExecutionGrid(heartbeat, execution);
    renderCloudflareAdaptiveGrid(heartbeat, adaptive);
    renderCloudflarePredictiveGrid(heartbeat, predictive);
    renderCloudflareStrategicGrid(heartbeat, strategic);
    renderCloudflareUcipGrid(heartbeat, ucip);
    renderCloudflareAmgGrid(heartbeat, amg);
    renderCloudflareCbaGrid(heartbeat, cba);
    renderCloudflareCalGrid(heartbeat, cal);
    renderCloudflareIhlGrid(heartbeat, ihl);
    renderCloudflareIarlGrid(heartbeat, iarl);
    renderCloudflareAclGrid(heartbeat, acl);

    document.getElementById("os-cloudflare-fetch-logs")?.addEventListener("click", async () => {
      const preview = document.getElementById("os-cloudflare-logs-preview");
      if (preview) preview.textContent = "Fetching...";
      try {
        const result = await fetchJson("/api/os/cloudflare/logs/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (preview) preview.textContent = JSON.stringify(result, null, 2);
      } catch (error) {
        if (preview) preview.textContent = error.message || "Logs fetch failed.";
      }
    });
    document.getElementById("os-cloudflare-fetch-metrics")?.addEventListener("click", async () => {
      const preview = document.getElementById("os-cloudflare-metrics-preview");
      if (preview) preview.textContent = "Fetching...";
      try {
        const result = await fetchJson("/api/os/cloudflare/metrics/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (preview) preview.textContent = JSON.stringify(result, null, 2);
      } catch (error) {
        if (preview) preview.textContent = error.message || "Metrics fetch failed.";
      }
    });

    renderCloudflareFederation(federation);

    const surfaces = [
      { label: "Routes", count: routes.routes?.length || 0, summary: "Stored global routing plans." },
      { label: "Memory", count: memory.memory?.length || 0, summary: "Division memory records." },
      { label: "Operator Intents", count: intents.intents?.length || 0, summary: "Stored operator goals and constraints." },
      { label: "Pipelines", count: pipelines.pipelines?.length || 0, summary: "Module pipeline runs." },
      { label: "Sandboxes", count: sandbox.logs?.length || 0, summary: "Isolated sandbox executions." },
      { label: "Config", count: config.history?.length || 0, summary: "OS config history entries." },
      { label: "Public Scenarios", count: publicScenarios.scenarios?.length || 0, summary: "Public scenarios routed through the OS." }
    ];

    document.getElementById("os-surface-grid").innerHTML = surfaces
      .map((surface) => `
        <article class="telemetry-card bracket">
          <div class="bracket-inner">
            <p class="section-label mono">[ ${escapeHtml(surface.label.toUpperCase().replace(/\s+/g, "_"))} ]</p>
            <h3>${escapeHtml(String(surface.count))}</h3>
            <p class="section-copy">${escapeHtml(surface.summary)}</p>
          </div>
        </article>
      `)
      .join("");

    const buildStatus = releases.cloudflareBuildStatus || {};
    const bindingsStatus = pipelines.cloudflareBindings || {};

    const extensions = [
      { label: "Governance", count: governance.decisions?.length || 0, summary: `Chain max ${governance.config?.autonomyThresholds?.maxAutoChainLength || 0} :: CF ${governance.cloudflareGovernanceHealth?.health || "optional"}` },
      { label: "Releases", count: releases.releases?.length || 0, summary: `Release logs :: CF builds ${buildStatus.health || "unknown"}` },
      { label: "Integrations", count: integrations.integrations?.length || 0, summary: "External webhook, API, and agent registrations." },
      { label: "Certification", count: certification.certifications?.length || 0, summary: "Agent certification records used to gate pipelines and scenarios." },
      { label: "Safety", count: governance.decisions?.filter((entry) => entry.surface === "safety-check").length || 0, summary: "Recent safety decisions and block explanations." },
      { label: "Version", count: version.history?.length || 0, summary: `Current ${version.current || "v3.5"} :: CF MCP ${version.cloudflareMcpHealth?.health || "optional"}` },
      { label: "Cloudflare Bindings", count: bindingsStatus.manifest?.bindingCount || 0, summary: `Bindings MCP ${bindingsStatus.health || "unknown"} :: ${bindingsStatus.manifest?.worker || "mshops-public"}` }
    ];

    document.getElementById("os-extension-grid").innerHTML = extensions
      .map((surface) => `
        <article class="telemetry-card bracket">
          <div class="bracket-inner">
            <p class="section-label mono">[ ${escapeHtml(surface.label.toUpperCase().replace(/\s+/g, "_"))} ]</p>
            <h3>${escapeHtml(String(surface.count))}</h3>
            <p class="section-copy">${escapeHtml(surface.summary)}</p>
          </div>
        </article>
      `)
      .join("");
  } catch (error) {
    document.getElementById("os-surface-grid").innerHTML = `<article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-copy">${escapeHtml(error.message || "Unable to load OS surface.")}</p></div></article>`;
  }
});
