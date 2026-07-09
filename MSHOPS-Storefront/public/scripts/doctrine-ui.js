/**
 * DOCTRINE UI INTEGRATION LAYER
 * -----------------------------------------------------------------------
 * DRIFT-MARKER: layer=page-script file=public/scripts/doctrine-ui.js version=1.0
 *
 * Standalone, additive script scoped to /scenario.html only. Populates the
 * Doctrine Panel's version/chunk/evidence viewers from the ONE doctrine
 * endpoint this reference-only console is permitted to call.
 *
 * HARD CONSTRAINTS (do not relax without a governance review):
 *   1. The ONLY network call this file makes is:
 *        POST <same-origin>/doctrine/broker
 *      exactly matching worker/doctrine/index.js's handleDoctrineBroker
 *      contract: { agentId, versionId, classification } -> approved
 *      chunks for that (agent, version, classification) triple, or a 403
 *      if the ACL/approval checks fail.
 *   2. This file NEVER calls /doctrine/sync or /doctrine/approve-version
 *      or /doctrine/approve-chunk (all three require an operator token
 *      this front-end reference console does not, and should not, hold -
 *      see requireOperatorToken() in worker/doctrine/index.js).
 *   3. This file NEVER constructs an absolute URL to any upstream source
 *      (e.g. writing.io). BROKER_ENDPOINT is always a same-origin
 *      relative path - see assertSameOriginRelativePath() below.
 *   4. This file NEVER fabricates doctrine content. If the broker denies
 *      access or a category of data (diff, sync/approval evidence) has no
 *      corresponding read endpoint, the UI renders an explicit
 *      "unavailable" state instead of inventing placeholder content.
 *
 * Publishes doctrine classification state for scenario.js to read (per
 * DESIGN_SYSTEM.md §42's integration rules: scenario.js annotates events
 * with doctrine tags but never fetches doctrine itself):
 *   - `window.__mshopsScenarioDoctrine.classification` (string | null)
 *   - `window.__mshopsScenarioDoctrine.versionId` (string | null)
 *   - A `"scenario:doctrine-updated"` CustomEvent dispatched on `document`
 *     with `detail: { classification, versionId, timestamp, granted }`
 *     every time a broker request resolves (success or denial).
 *
 * Does not modify any existing script - included as its own <script> tag
 * on scenario.html only, loaded before scenario.js.
 */

(function doctrineUiIntegration() {
  "use strict";

  var BROKER_ENDPOINT = "/doctrine/broker";

  window.__mshopsScenarioDoctrine = window.__mshopsScenarioDoctrine || {
    classification: null,
    versionId: null,
  };

  function assertSameOriginRelativePath(path) {
    if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
      throw new Error("doctrine-ui.js: refusing to call a non-relative, non-same-origin path: " + path);
    }
    if (/^https?:/i.test(path)) {
      throw new Error("doctrine-ui.js: refusing to call an absolute URL: " + path);
    }
    return path;
  }

  function byData(root, attr) {
    return root.querySelector("[" + attr + "]");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function setBrokerStatus(el, state, label) {
    if (!el) return;
    el.textContent = label;
    el.setAttribute("data-state", state);
  }

  function renderVersion(panel, payload) {
    var container = byData(panel, "data-doctrine-version");
    if (!container) return;
    var empty = byData(container, "data-doctrine-version-empty");
    var meta = byData(container, "data-doctrine-version-meta");
    if (!meta) return;

    meta.innerHTML = "";

    function addRow(label, value) {
      var dt = document.createElement("dt");
      dt.textContent = label;
      var dd = document.createElement("dd");
      dd.textContent = value;
      meta.appendChild(dt);
      meta.appendChild(dd);
    }

    addRow("Version ID", payload.versionId);
    addRow("Classification", payload.classification);
    addRow("Access granted", payload.timestamp);
    addRow(
      "Operator",
      "not exposed by /doctrine/broker (approval metadata requires an operator-token-authenticated endpoint)"
    );

    meta.hidden = false;
    if (empty) empty.hidden = true;
  }

  function renderChunks(panel, chunks) {
    var container = byData(panel, "data-doctrine-chunks");
    if (!container) return;
    var empty = byData(container, "data-doctrine-chunks-empty");
    var list = byData(container, "data-doctrine-chunks-list");
    if (!list) return;

    list.innerHTML = "";

    if (!chunks || !chunks.length) {
      if (empty) empty.hidden = false;
      return;
    }

    chunks.forEach(function (chunk, index) {
      var item = document.createElement("li");
      item.className = "doctrine-chunk-viewer__item";

      var label = document.createElement("span");
      label.textContent = "Chunk " + (index + 1) + " — " + (chunk.classification || "UNCLASSIFIED");

      var hash = document.createElement("span");
      hash.className = "doctrine-chunk-viewer__item-hash";
      hash.textContent = chunk.hash ? "hash: " + chunk.hash : "(no hash provided by broker)";

      item.appendChild(label);
      item.appendChild(hash);
      list.appendChild(item);
    });

    if (empty) empty.hidden = true;
  }

  function appendEvidence(panel, entry) {
    var container = byData(panel, "data-doctrine-evidence");
    if (!container) return;
    var list = byData(container, "data-doctrine-evidence-list");
    if (!list) return;

    var item = document.createElement("li");
    item.className = "doctrine-evidence-viewer__item";
    item.setAttribute("data-state", entry.state);

    var time = document.createElement("time");
    time.textContent = "[" + entry.timestamp + "]";

    var text = document.createElement("span");
    text.textContent = entry.eventType + " — " + entry.details;

    item.appendChild(time);
    item.appendChild(text);
    list.appendChild(item);
  }

  function publishDoctrineState(classification, versionId, timestamp, granted) {
    window.__mshopsScenarioDoctrine.classification = granted ? classification : null;
    window.__mshopsScenarioDoctrine.versionId = granted ? versionId : null;

    document.dispatchEvent(
      new CustomEvent("scenario:doctrine-updated", {
        detail: { classification: classification, versionId: versionId, timestamp: timestamp, granted: granted },
      })
    );
  }

  async function requestDoctrine(agentId, versionId, classification) {
    var endpoint = assertSameOriginRelativePath(BROKER_ENDPOINT);
    var response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agentId, versionId: versionId, classification: classification }),
    });

    var payload = null;
    try {
      payload = await response.json();
    } catch (parseError) {
      payload = null;
    }

    return { ok: response.ok, status: response.status, payload: payload };
  }

  function init() {
    var panel = document.querySelector("[data-doctrine-panel]");
    if (!panel) {
      /* Not on the Scenario Engine page - nothing to wire up. */
      return;
    }

    var form = byData(panel, "data-doctrine-broker-form");
    var statusEl = byData(panel, "data-doctrine-broker-status");
    if (!form) return;

    console.info(
      "%c[doctrine-ui] Doctrine UI integration layer ready - broker-only, no upstream/unapproved calls.",
      "color:#f5c451;font-weight:600;"
    );

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var agentId = (form.querySelector('[data-doctrine-input="agentId"]') || {}).value || "";
      var versionId = (form.querySelector('[data-doctrine-input="versionId"]') || {}).value || "";
      var classification = (form.querySelector('[data-doctrine-input="classification"]') || {}).value || "";

      if (!agentId.trim() || !versionId.trim() || !classification.trim()) {
        setBrokerStatus(statusEl, "denied", "Agent ID, Version ID, and Classification are all required.");
        return;
      }

      setBrokerStatus(statusEl, "pending", "Requesting via /doctrine/broker...");
      console.log("[doctrine-ui] POST /doctrine/broker", { agentId: agentId, versionId: versionId, classification: classification });

      requestDoctrine(agentId.trim(), versionId.trim(), classification.trim())
        .then(function (result) {
          var timestamp = (result.payload && result.payload.timestamp) || nowIso();

          if (result.ok && result.payload) {
            setBrokerStatus(statusEl, "granted", "Access granted — approved doctrine loaded.");
            renderVersion(panel, result.payload);
            renderChunks(panel, result.payload.chunks);
            appendEvidence(panel, {
              state: "APPROVED",
              eventType: "doctrine.access",
              details: "Broker granted classification " + result.payload.classification + " for version " + result.payload.versionId + ".",
              timestamp: timestamp,
            });
            console.info("[doctrine-ui] broker access granted", result.payload);
            publishDoctrineState(result.payload.classification, result.payload.versionId, timestamp, true);
          } else {
            var reason = (result.payload && result.payload.error) || "Request denied (status " + result.status + ").";
            setBrokerStatus(statusEl, "denied", "Access denied — " + reason);
            appendEvidence(panel, {
              state: "DENIED",
              eventType: "doctrine.access.denied",
              details: reason,
              timestamp: timestamp,
            });
            console.warn("[doctrine-ui] broker access denied:", reason);
            publishDoctrineState(classification.trim(), versionId.trim(), timestamp, false);
          }
        })
        .catch(function (error) {
          setBrokerStatus(statusEl, "denied", "Broker request failed: " + error.message);
          appendEvidence(panel, {
            state: "DENIED",
            eventType: "doctrine.access.denied",
            details: "Network/client error: " + error.message,
            timestamp: nowIso(),
          });
          console.error("[doctrine-ui] broker request failed", error);
          publishDoctrineState(null, null, nowIso(), false);
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
