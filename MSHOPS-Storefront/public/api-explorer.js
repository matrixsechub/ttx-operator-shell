const apiEndpoints = [
  { label: "Public Modules", path: "/api/public/modules" },
  { label: "Single Public Module", path: "/api/public/modules/multi-agent-cockpit" },
  { label: "Public Search", path: "/api/public/search?q=cockpit" },
  { label: "Public Agents", path: "/api/public/agents" },
  { label: "Public Telemetry", path: "/api/public/telemetry" },
  { label: "Heartbeat", path: "/api/heartbeat" },
  { label: "Marketplace Ecosystem", path: "/marketplace/ecosystem" },
  { label: "OS Route", path: "/api/os/route" },
  { label: "OS Memory", path: "/api/os/memory" },
  { label: "OS Config", path: "/api/os/config" },
  { label: "OS Governance", path: "/api/os/governance" },
  { label: "OS Integrations", path: "/api/os/integration" },
  { label: "OS Certification", path: "/api/os/certification" },
  { label: "OS Releases", path: "/api/os/releases" },
  { label: "OS Version", path: "/api/os/version" },
  { label: "OS Safety Check", path: "/api/os/safety/check" },
  { label: "OS Heartbeat", path: "/api/os/heartbeat" },
  { label: "OS Cloudflare", path: "/api/os/cloudflare" },
  { label: "OS Cloudflare Docs", path: "/api/os/cloudflare/docs?q=workers" },
  { label: "OS Cloudflare Quick Actions", path: "/api/os/cloudflare/quick-actions" },
  { label: "OS Cloudflare Federation", path: "/api/os/federation/cloudflare" },
  { label: "OS Cloudflare Logs Fetch", path: "/api/os/cloudflare/logs/fetch", method: "POST" },
  { label: "OS Cloudflare Metrics Fetch", path: "/api/os/cloudflare/metrics/fetch", method: "POST" },
  { label: "OS Cloudflare Build Run", path: "/api/os/cloudflare/build/run", method: "POST" },
  { label: "OS Cloudflare Bindings Validate", path: "/api/os/cloudflare/bindings/validate", method: "POST" },
  { label: "OS Cloudflare Docs Query", path: "/api/os/cloudflare/docs/query", method: "POST" },
  { label: "Marketplace Catalog", path: "/api/marketplace/catalog" },
  { label: "OS Cloudflare Releases", path: "/api/os/releases/cloudflare" },
  { label: "OS Cloudflare Logs", path: "/api/os/cloudflare/logs" },
  { label: "OS Cloudflare Metrics", path: "/api/os/cloudflare/metrics" },
  { label: "OS Cloudflare Build", path: "/api/os/cloudflare/build", method: "POST", body: "{}" },
  { label: "OS Cloudflare Validate Bindings", path: "/api/os/cloudflare/validate-bindings", method: "POST", body: "{}" },
  { label: "OS Cloudflare Autonomous", path: "/api/os/cloudflare/autonomous" },
  { label: "OS Cloudflare Automation", path: "/api/os/cloudflare/automation" },
  { label: "OS Cloudflare Events", path: "/api/os/cloudflare/events" },
  { label: "OS Cloudflare Insights", path: "/api/os/cloudflare/insights" },
  { label: "OS Cloudflare Decision", path: "/api/os/cloudflare/decision" },
  { label: "OS Cloudflare Sync", path: "/api/os/cloudflare/sync" },
  { label: "OS Cloudflare Cross-Division", path: "/api/os/cloudflare/cross-division" },
  { label: "OS Cloudflare Orchestration", path: "/api/os/cloudflare/orchestration" },
  { label: "OS Cloudflare Agents", path: "/api/os/cloudflare/agents" },
  { label: "OS Cloudflare Execution", path: "/api/os/cloudflare/execution" },
  { label: "OS Cloudflare Execution Signals", path: "/api/os/cloudflare/execution/signals" },
  { label: "OS Cloudflare Adaptive", path: "/api/os/cloudflare/adaptive" },
  { label: "OS Cloudflare Predictive", path: "/api/os/cloudflare/predictive" },
  { label: "OS Cloudflare Strategic", path: "/api/os/cloudflare/strategic" },
  { label: "OS Cloudflare UCIP", path: "/api/os/cloudflare/ucip" },
  { label: "OS Cloudflare AMG", path: "/api/os/cloudflare/amg" },
  { label: "OS Cloudflare CBA", path: "/api/os/cloudflare/cba" },
  { label: "OS Cloudflare CAL", path: "/api/os/cloudflare/cal" },
  { label: "OS Cloudflare IHL", path: "/api/os/cloudflare/ihl" },
  { label: "OS Cloudflare IARL", path: "/api/os/cloudflare/iarl" },
  { label: "OS Cloudflare ACL", path: "/api/os/cloudflare/acl" },
  { label: "OS Cloudflare Certification", path: "/api/os/cloudflare/certification" },
  { label: "CF Federation Route Catalog", path: "/api/os/cloudflare/federation/routes" },
  { label: "CF Federation Docs (JSON)", path: "/api/os/cloudflare/federation/docs" },
  { label: "Marketplace Certification", path: "/api/marketplace/certification" },
  { label: "OS Pipeline", path: "/api/pipeline" },
  { label: "Public Scenario", path: "/api/public/scenario" }
];

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

async function fetchJson(path, options) {
  const response = await fetch(path, options);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return payload;
}

async function runRequest(path, method = "GET", body = "") {
  if (!path) {
    setStatus("Endpoint path is required.", "error");
    return;
  }

  setStatus(`Running ${method} ${path}...`);
  setViewer("Loading...", "loading");

  try {
    const options = method === "POST"
      ? { method: "POST", headers: { "Content-Type": "application/json" }, body: body || "{}" }
      : undefined;
    const payload = await fetchJson(path, options);
    setStatus(`Request complete :: ${method} ${path}`, "success");
    setViewer(JSON.stringify(payload, null, 2), "ready");
  } catch (error) {
    setStatus(error.message || "Unable to fetch endpoint.", "error");
    setViewer(error.message || "Unable to fetch endpoint.", "error");
  }
}

function setStatus(message, state = "") {
  const status = document.getElementById("api-status");
  status.dataset.state = state;
  status.textContent = message;
}

function setViewer(value, state = "") {
  const viewer = document.getElementById("api-response-viewer");
  viewer.dataset.state = state;
  viewer.textContent = value;
}

function renderEndpoints() {
  const grid = document.getElementById("api-endpoint-grid");
  grid.innerHTML = apiEndpoints
    .map(
      (entry) => `
        <article class="telemetry-card bracket">
          <div class="bracket-inner">
            <p class="section-label mono">[ ENDPOINT ]</p>
            <h3>${escapeHtml(entry.label)}</h3>
            <p class="section-copy">${escapeHtml(entry.path)}${entry.method === "POST" ? " :: POST" : ""}</p>
            <div class="cta-row">
              <button class="button primary" type="button" data-endpoint-path="${escapeHtml(entry.path)}" data-endpoint-method="${escapeHtml(entry.method || "GET")}" data-endpoint-body="${escapeHtml(entry.body || "")}">[ LOAD ]</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function getPath() {
  return document.getElementById("api-path-input").value.trim();
}

function buildCurl(path) {
  return `curl ${window.location.origin}${path}`;
}

function buildFetch(path) {
  return `fetch("${path}").then((response) => response.json()).then(console.log);`;
}

async function copyText(value) {
  await navigator.clipboard.writeText(value);
}

document.addEventListener("DOMContentLoaded", () => {
  renderEndpoints();

  document.getElementById("api-tester-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await runRequest(getPath());
  });

  document.getElementById("api-endpoint-grid").addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-endpoint-path]");
    if (!trigger) {
      return;
    }

    const path = trigger.getAttribute("data-endpoint-path");
    const method = trigger.getAttribute("data-endpoint-method") || "GET";
    const body = trigger.getAttribute("data-endpoint-body") || "";
    document.getElementById("api-path-input").value = path;
    await runRequest(path, method, body);
  });

  document.getElementById("copy-curl-trigger").addEventListener("click", async () => {
    const path = getPath();
    await copyText(buildCurl(path));
    setStatus("curl command copied.", "success");
  });

  document.getElementById("copy-fetch-trigger").addEventListener("click", async () => {
    const path = getPath();
    await copyText(buildFetch(path));
    setStatus("fetch() snippet copied.", "success");
  });
});
