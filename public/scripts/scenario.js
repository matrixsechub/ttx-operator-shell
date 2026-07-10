/**
 * SCENARIO ENGINE - UI INTEGRATION LAYER
 * -----------------------------------------------------------------------
 * DRIFT-MARKER: layer=page-script file=public/scripts/scenario.js version=1.0
 *
 * Standalone, additive script scoped to /scenario.html only. Reads the
 * scenario integration hooks (`data-scenario-control`, `data-scenario-
 * status`, `data-scenario-event*`), updates the status readout and event
 * feed, and logs every transition to the console.
 *
 * THIS FILE NEVER CALLS A BACKEND, WORKER, OR SCENARIO ENGINE API. All
 * state is simulated client-side for UI integration/demo purposes. Wiring
 * this up to the real TTX / Mission / Simulation Engine is a future,
 * backend-touching pass - this file only proves out the UI contract.
 *
 * Does not modify any existing script (app.js, a11y.js, rgbgold-motion.js,
 * etc.) - it is included as its own <script> tag on scenario.html only.
 *
 * HOW FUTURE JS MODULES ATTACH WITHOUT EDITING scenario.html:
 *   - Controls:      document.querySelectorAll('[data-scenario-control]')
 *                     Each button's value is on the `data-scenario-control`
 *                     attribute itself ("start" | "pause" | "reset").
 *   - Status readout: document.querySelector('[data-scenario-status]')
 *                     Set `.textContent` and optionally `[data-state]`
 *                     ("idle" | "running" | "paused") for the color hook
 *                     defined in scenario.css.
 *   - Event feed:     document.querySelector('[data-scenario-event]')
 *                     Append <li class="scenario-event-feed__item"> nodes
 *                     into the nested `[data-scenario-event-list]` child -
 *                     see `appendEvent()` below for the exact shape.
 *   - Timeline:       document.querySelector('[data-scenario-event-track]')
 *                     Append `.scenario-timeline__node` nodes; remove the
 *                     `[data-scenario-timeline-empty]` placeholder once at
 *                     least one real node exists (see `appendTimelineNode()`).
 *   - Cinematic hook: document.querySelector('[data-cinematic]') inside
 *                     `.scenario-timeline` - remove `hidden` and insert a
 *                     future animation component per DESIGN_SYSTEM.md §34.
 * A future integration module can import none of this file's internals -
 * it only needs to know the attribute contract above, so this file can be
 * replaced wholesale by a real Scenario Engine client without touching
 * scenario.html.
 *
 * DOCTRINE AWARENESS (DESIGN_SYSTEM.md §42) - READ THIS BEFORE EDITING:
 * This file reads the current doctrine classification to annotate scenario
 * events with a small tag, but it NEVER calls /doctrine/broker or any
 * other doctrine endpoint itself - that is doctrine-ui.js's exclusive
 * responsibility (see that file's header for the full constraint list).
 * The only channels this file is allowed to use for doctrine state are:
 *   - `window.__mshopsScenarioDoctrine.classification` /
 *     `.versionId` (read-only snapshot published by doctrine-ui.js)
 *   - The `"scenario:doctrine-updated"` CustomEvent dispatched on
 *     `document` by doctrine-ui.js after each broker call resolves
 * If doctrine-ui.js is not present on a page (or no successful broker
 * grant has occurred yet), `window.__mshopsScenarioDoctrine` is simply
 * absent/null and scenario events render with no doctrine tag - this file
 * degrades gracefully and never throws in that case.
 */

(function scenarioEngineUi() {
  "use strict";

  function byData(root, attr) {
    return root.querySelector("[" + attr + "]");
  }

  function allByData(root, attr) {
    return Array.prototype.slice.call(root.querySelectorAll("[" + attr + "]"));
  }

  function nowLabel() {
    var d = new Date();
    return d.toTimeString().slice(0, 8);
  }

  function getCurrentDoctrineClassification() {
    var state = window.__mshopsScenarioDoctrine;
    return state && state.classification ? state.classification : null;
  }

  function buildDoctrineTag(classification) {
    var tag = document.createElement("span");
    /* .a11y-override-badge per a11y.css's registration checklist - see the
       Mission Engine pass (DESIGN_SYSTEM.md §49) which caught this was
       missing here and added it retroactively. */
    tag.className = "scenario-doctrine-tag a11y-override-badge";
    tag.textContent = "Doctrine // " + classification;
    return tag;
  }

  function setStatus(statusEl, state, label) {
    if (!statusEl) return;
    statusEl.textContent = label;
    statusEl.setAttribute("data-state", state);
  }

  function appendEvent(feedEl, message) {
    if (!feedEl) return;
    var list = byData(feedEl, "data-scenario-event-list");
    var emptyLabel = byData(feedEl, "data-scenario-event-empty");
    if (!list) return;

    var item = document.createElement("li");
    item.className = "scenario-event-feed__item";

    var time = document.createElement("time");
    time.textContent = "[" + nowLabel() + "]";

    var text = document.createElement("span");
    text.textContent = message;

    item.appendChild(time);
    item.appendChild(text);

    var classification = getCurrentDoctrineClassification();
    if (classification) {
      item.appendChild(buildDoctrineTag(classification));
    }

    list.appendChild(item);
    feedEl.scrollTop = feedEl.scrollHeight;

    if (emptyLabel) {
      emptyLabel.hidden = true;
    }
  }

  function appendTimelineNode(trackEl, message) {
    if (!trackEl) return;
    var placeholder = trackEl.querySelector("[data-scenario-timeline-empty]");
    if (placeholder) {
      placeholder.remove();
    }

    var node = document.createElement("li");
    node.className = "scenario-timeline__node";

    var tag = document.createElement("span");
    tag.className = "hud-tag";
    tag.textContent = "Event // " + nowLabel();

    var copy = document.createElement("p");
    copy.className = "mono";
    copy.textContent = message;

    node.appendChild(tag);
    node.appendChild(copy);

    var classification = getCurrentDoctrineClassification();
    if (classification) {
      node.appendChild(buildDoctrineTag(classification));
    }

    trackEl.appendChild(node);
  }

  function init() {
    var statusEl = document.querySelector("[data-scenario-status]");
    var feedEl = document.querySelector("[data-scenario-event]");
    var trackEl = document.querySelector("[data-scenario-event-track]");
    var controls = allByData(document, "data-scenario-control");

    if (!controls.length) {
      /* Not on the Scenario Engine page - nothing to wire up. */
      return;
    }

    console.info("%c[scenario] Scenario Engine UI integration layer ready (no backend calls).", "color:#3cf2ff;font-weight:600;");

    document.addEventListener("scenario:doctrine-updated", function (event) {
      var detail = event.detail || {};
      if (detail.granted) {
        console.log("[scenario] doctrine classification updated: " + detail.classification + " (version " + detail.versionId + ")");
      } else {
        console.log("[scenario] doctrine classification cleared (last broker request was denied or failed).");
      }
    });

    controls.forEach(function (button) {
      button.addEventListener("click", function () {
        var action = button.getAttribute("data-scenario-control");

        switch (action) {
          case "start":
            setStatus(statusEl, "running", "Running — scenario in progress.");
            appendEvent(feedEl, "Scenario started.");
            appendTimelineNode(trackEl, "Scenario started.");
            console.log("[scenario] control=start");
            break;
          case "pause":
            setStatus(statusEl, "paused", "Paused — scenario suspended.");
            appendEvent(feedEl, "Scenario paused.");
            appendTimelineNode(trackEl, "Scenario paused.");
            console.log("[scenario] control=pause");
            break;
          case "reset":
            setStatus(statusEl, "idle", "Idle — no scenario loaded.");
            appendEvent(feedEl, "Scenario reset.");
            if (feedEl) {
              var list = byData(feedEl, "data-scenario-event-list");
              var emptyLabel = byData(feedEl, "data-scenario-event-empty");
              if (list) list.innerHTML = "";
              if (emptyLabel) emptyLabel.hidden = false;
            }
            if (trackEl) {
              trackEl.innerHTML =
                '<li class="scenario-timeline__node scenario-timeline__node--placeholder" data-scenario-timeline-empty>' +
                '<span class="hud-tag">Timeline // Standby</span>' +
                '<p class="mono">No scenario events recorded yet. Timeline nodes populate as the scenario runs.</p>' +
                "</li>";
            }
            console.log("[scenario] control=reset");
            break;
          default:
            console.warn("[scenario] Unknown control action: " + action);
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
