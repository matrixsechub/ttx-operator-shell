/**
 * MISSION ENGINE - UI INTEGRATION LAYER
 * -----------------------------------------------------------------------
 * DRIFT-MARKER: layer=page-script file=public/scripts/mission-engine.js version=1.0
 *
 * Standalone, additive script scoped to /mission-engine.html only. Reads
 * the mission integration hooks (`data-mission-objectives`, `data-mission-
 * objective-toggle`, `data-mission-state`, `data-mission-transitions`,
 * `data-mission-actions`, `data-mission-action`, `data-mission-evidence`),
 * drives a small client-side mission state machine, logs operator actions
 * and simulated agent responses, and annotates every event with the
 * doctrine classification of whichever objective is currently active.
 *
 * THIS FILE NEVER CALLS A BACKEND, WORKER, OR MISSION ENGINE API. All
 * mission lifecycle state is simulated client-side for UI integration/demo
 * purposes, exactly like scenario.js. Wiring this up to a real Mission /
 * TTX / Simulation Engine is a future, backend-touching pass.
 *
 * DOCTRINE ANNOTATION - READ BEFORE EDITING (DESIGN_SYSTEM.md §49):
 * The doctrine classification tags this file renders (`.mission-doctrine-
 * tag`) come ONLY from each objective's static `data-doctrine-
 * classification` HTML attribute - a client-side reference constant, not a
 * broker-verified value. This file NEVER calls `/doctrine/broker` or any
 * other `/doctrine/*` route; that capability belongs exclusively to
 * `doctrine-ui.js` on `/scenario.html`. If a future pass wants these tags
 * to reflect real, ACL-checked doctrine access, it must reuse
 * `doctrine-ui.js`'s broker-only pattern (published state + CustomEvent),
 * not add a new fetch call here. `mission-engine.html` says this
 * explicitly in its own on-page copy so operators are never misled into
 * thinking these tags are broker-verified.
 *
 * Does not modify any existing script (scenario.js, doctrine-ui.js, a11y.js,
 * rgbgold-motion.js, etc.) - it is included as its own <script> tag on
 * mission-engine.html only.
 *
 * HOW FUTURE JS MODULES ATTACH WITHOUT EDITING mission-engine.html:
 *   - Objectives:  document.querySelectorAll('[data-mission-objective]')
 *                  Each item's completion toggle is
 *                  `[data-mission-objective-toggle]`; its doctrine tag
 *                  comes from the item's own `data-doctrine-classification`.
 *   - State:       document.querySelector('[data-mission-state]') for the
 *                  current-state readout, `[data-mission-transitions]` for
 *                  the transition button row - see MISSION_STATES below.
 *   - Actions:     document.querySelectorAll('[data-mission-action]')
 *                  Each button's action id is on the attribute itself
 *                  ("log-note" | "request-agent-response" | "flag-doctrine").
 *   - Evidence:    document.querySelector('[data-mission-evidence]') ->
 *                  append into the nested `[data-mission-evidence-list]`
 *                  child - see `appendEvidence()` below for the exact shape.
 * A future integration module can replace this file wholesale by keeping
 * the same attribute contract, without touching mission-engine.html.
 */

(function missionEngineUi() {
  "use strict";

  window.__mshopsMissionEngine = window.__mshopsMissionEngine || {
    state: "STANDBY",
    activeDoctrineClassification: null,
  };

  var MISSION_STATES = {
    STANDBY: {
      label: "Mission has not been briefed yet.",
      tag: "State // Standby",
      transitions: [{ to: "BRIEFED", label: "Brief Mission" }],
    },
    BRIEFED: {
      label: "Mission briefed - awaiting mission start.",
      tag: "State // Briefed",
      transitions: [
        { to: "IN_PROGRESS", label: "Start Mission" },
        { to: "STANDBY", label: "Reset" },
      ],
    },
    IN_PROGRESS: {
      label: "Mission in progress.",
      tag: "State // In Progress",
      transitions: [
        { to: "DEBRIEF", label: "Enter Debrief" },
        { to: "STANDBY", label: "Abort Mission" },
      ],
    },
    DEBRIEF: {
      label: "Mission complete - debrief in progress.",
      tag: "State // Debrief",
      transitions: [
        { to: "COMPLETE", label: "Close Mission" },
        { to: "IN_PROGRESS", label: "Reopen Mission" },
      ],
    },
    COMPLETE: {
      label: "Mission closed.",
      tag: "State // Complete",
      transitions: [{ to: "STANDBY", label: "Reset" }],
    },
  };

  function byData(root, attr) {
    return root.querySelector("[" + attr + "]");
  }

  function allByData(root, attr) {
    return Array.prototype.slice.call(root.querySelectorAll("[" + attr + "]"));
  }

  function nowLabel() {
    return new Date().toTimeString().slice(0, 8);
  }

  function buildDoctrineTag(classification) {
    var tag = document.createElement("span");
    /* .a11y-override-badge per a11y.css's registration checklist - this is
       a badge/pill, so it opts into the generic override marker instead of
       requiring a bespoke body.a11y-mode rule. */
    tag.className = "mission-doctrine-tag a11y-override-badge";
    tag.textContent = "Doctrine // " + classification;
    return tag;
  }

  function appendEvidence(evidenceEl, kind, message) {
    if (!evidenceEl) return;
    var list = byData(evidenceEl, "data-mission-evidence-list");
    var emptyLabel = byData(evidenceEl, "data-mission-evidence-empty");
    if (!list) return;

    var item = document.createElement("li");
    item.className = "mission-evidence-viewer__item";

    var time = document.createElement("time");
    time.textContent = "[" + nowLabel() + "]";

    var kindBadge = document.createElement("span");
    kindBadge.className = "mission-evidence-viewer__kind";
    kindBadge.textContent = kind;

    var text = document.createElement("span");
    text.textContent = message;

    item.appendChild(time);
    item.appendChild(kindBadge);
    item.appendChild(text);

    var classification = window.__mshopsMissionEngine.activeDoctrineClassification;
    if (classification) {
      item.appendChild(buildDoctrineTag(classification));
    }

    list.appendChild(item);
    evidenceEl.scrollTop = evidenceEl.scrollHeight;

    if (emptyLabel) {
      emptyLabel.hidden = true;
    }

    console.log("[mission-engine] evidence:" + kind + " — " + message);
  }

  function appendTimelineNode(trackEl, message) {
    if (!trackEl) return;
    var placeholder = trackEl.querySelector("[data-mission-timeline-empty]");
    if (placeholder) {
      placeholder.remove();
    }

    var node = document.createElement("li");
    node.className = "mission-timeline__node";

    var tag = document.createElement("span");
    tag.className = "hud-tag";
    tag.textContent = "Event // " + nowLabel();

    var copy = document.createElement("p");
    copy.className = "mono";
    copy.textContent = message;

    node.appendChild(tag);
    node.appendChild(copy);

    var classification = window.__mshopsMissionEngine.activeDoctrineClassification;
    if (classification) {
      node.appendChild(buildDoctrineTag(classification));
    }

    trackEl.appendChild(node);
  }

  function appendActionEntry(feedEl, source, message) {
    if (!feedEl) return;
    var list = byData(feedEl, "data-mission-action-list");
    var emptyLabel = byData(feedEl, "data-mission-action-empty");
    if (!list) return;

    var item = document.createElement("li");
    item.className = "mission-action-console__item";
    item.setAttribute("data-source", source);

    var time = document.createElement("time");
    time.textContent = "[" + nowLabel() + "]";

    var text = document.createElement("span");
    text.textContent = (source === "agent" ? "Agent — " : "Operator — ") + message;

    item.appendChild(time);
    item.appendChild(text);

    var classification = window.__mshopsMissionEngine.activeDoctrineClassification;
    if (classification) {
      item.appendChild(buildDoctrineTag(classification));
    }

    list.appendChild(item);
    feedEl.scrollTop = feedEl.scrollHeight;

    if (emptyLabel) {
      emptyLabel.hidden = true;
    }
  }

  function initObjectives(evidenceEl) {
    var objectiveItems = allByData(document, "data-mission-objective");

    objectiveItems.forEach(function (item) {
      var toggle = byData(item, "data-mission-objective-toggle");
      if (!toggle) return;

      toggle.addEventListener("click", function () {
        var title = (item.querySelector(".mission-objective-panel__item-title") || {}).textContent || "Objective";
        var classification = item.getAttribute("data-doctrine-classification") || null;
        var isComplete = item.getAttribute("data-complete") === "true";
        var nextComplete = !isComplete;

        item.setAttribute("data-complete", String(nextComplete));
        toggle.setAttribute("aria-pressed", String(nextComplete));
        toggle.textContent = nextComplete ? "Reopen Objective" : "Mark Complete";

        if (nextComplete && classification) {
          window.__mshopsMissionEngine.activeDoctrineClassification = classification;
        }

        appendEvidence(
          evidenceEl,
          "objective",
          (nextComplete ? "Completed objective: " : "Reopened objective: ") + title.trim()
        );
        console.log("[mission-engine] objective toggled", { title: title.trim(), complete: nextComplete, classification: classification });
      });
    });
  }

  function renderTransitions(transitionsEl, state, onTransition) {
    if (!transitionsEl) return;
    transitionsEl.innerHTML = "";

    MISSION_STATES[state].transitions.forEach(function (transition) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-secondary";
      button.textContent = transition.label;
      button.addEventListener("click", function () {
        onTransition(transition.to, transition.label);
      });
      transitionsEl.appendChild(button);
    });
  }

  function initStateMachine(evidenceEl, timelineTrackEl) {
    var stateEl = document.querySelector("[data-mission-state]");
    var transitionsEl = document.querySelector("[data-mission-transitions]");
    if (!stateEl) return;

    function renderState(state) {
      var config = MISSION_STATES[state];
      if (!config) return;

      window.__mshopsMissionEngine.state = state;

      var tagEl = stateEl.querySelector(".hud-tag");
      var copyEl = stateEl.querySelector("p");
      if (tagEl) tagEl.textContent = config.tag;
      if (copyEl) copyEl.textContent = config.label;

      renderTransitions(transitionsEl, state, function (nextState, transitionLabel) {
        renderState(nextState);
        appendEvidence(evidenceEl, "state", "Mission state transition: " + transitionLabel + " -> " + nextState + ".");
        appendTimelineNode(timelineTrackEl, transitionLabel + " (" + nextState + ").");
        console.log("[mission-engine] state transition", { to: nextState, via: transitionLabel });
      });
    }

    renderState("STANDBY");
  }

  function initActionConsole(evidenceEl) {
    var actionButtons = allByData(document, "data-mission-action");
    var feedEl = document.querySelector("[data-mission-action-feed]");

    actionButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var action = button.getAttribute("data-mission-action");

        switch (action) {
          case "log-note":
            appendActionEntry(feedEl, "operator", "Logged a mission note.");
            appendEvidence(evidenceEl, "operator-action", "Operator logged a mission note.");
            console.log("[mission-engine] action=log-note");
            break;
          case "request-agent-response":
            appendActionEntry(feedEl, "operator", "Requested an agent response.");
            appendEvidence(evidenceEl, "operator-action", "Operator requested an agent response.");
            console.log("[mission-engine] action=request-agent-response");
            window.setTimeout(function () {
              appendActionEntry(feedEl, "agent", "Acknowledged request and is standing by.");
              appendEvidence(evidenceEl, "agent-response", "Agent acknowledged the operator's request.");
              console.log("[mission-engine] simulated agent response appended");
            }, 600);
            break;
          case "flag-doctrine": {
            var classification = window.__mshopsMissionEngine.activeDoctrineClassification;
            var message = classification
              ? "Flagged doctrine constraint currently in force: " + classification + "."
              : "Flagged doctrine constraint - no objective doctrine classification is currently active.";
            appendActionEntry(feedEl, "operator", message);
            appendEvidence(evidenceEl, "doctrine-reference", message);
            console.log("[mission-engine] action=flag-doctrine", { classification: classification });
            break;
          }
          default:
            console.warn("[mission-engine] Unknown mission action: " + action);
        }
      });
    });
  }

  function init() {
    var missionHook = document.querySelector("[data-mission-hook]");
    if (!missionHook) {
      /* Not on the Mission Engine page - nothing to wire up. */
      return;
    }

    var evidenceEl = document.querySelector("[data-mission-evidence]");
    var timelineTrackEl = document.querySelector("[data-mission-timeline-track]");

    console.info(
      "%c[mission-engine] Mission Engine UI integration layer ready (no backend calls; doctrine tags are client-side reference constants only).",
      "color:#f5c451;font-weight:600;"
    );

    initObjectives(evidenceEl);
    initStateMachine(evidenceEl, timelineTrackEl);
    initActionConsole(evidenceEl);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
