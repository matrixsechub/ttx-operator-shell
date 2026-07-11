(function intentCapture() {
  const TRIGGER_DWELL_MS = 25000;
  const TRIGGER_SCROLL_DEPTH = 0.5;
  const TRIGGER_MIN_CLICKS = 2;
  const SESSION_KEY = "msh_session";
  const UI_MODE_KEY = "msh_entry_ui_mode";
  const TRAFFIC_SOURCE_KEY = "msh_traffic_source";

  const state = {
    pageLoadedAt: Date.now(),
    dwellMs: 0,
    scrollDepth: 0,
    clicks: 0,
    frictionOnPage: false,
    weakExperimentIntent: false,
    visible: false,
    dismissed: false,
    previewGenerated: false,
  };

  function getSessionId() {
    try {
      const existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const sessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sessionId);
      return sessionId;
    } catch {
      return crypto.randomUUID();
    }
  }

  function readTrafficSource() {
    try {
      return sessionStorage.getItem(TRAFFIC_SOURCE_KEY) || "direct";
    } catch {
      return "direct";
    }
  }

  function readUiMode() {
    try {
      const raw = sessionStorage.getItem(UI_MODE_KEY);
      if (raw === "CONFUSION" || raw === "FRICTION" || raw === "ENGAGED" || raw === "DEFAULT") return raw;
    } catch {
      // ignore
    }
    return "DEFAULT";
  }

  function shouldShow() {
    if (state.dismissed || state.visible) return false;
    if (Date.now() - state.pageLoadedAt < 3000) return false;
    state.dwellMs = Date.now() - state.pageLoadedAt;
    return (
      state.clicks >= TRIGGER_MIN_CLICKS ||
      state.dwellMs > TRIGGER_DWELL_MS ||
      state.scrollDepth > TRIGGER_SCROLL_DEPTH ||
      state.frictionOnPage ||
      state.weakExperimentIntent
    );
  }

  function recordHandoff(event) {
    fetch("/api/growth/intent-handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, sessionId: getSessionId() }),
    }).catch(() => {});
  }

  function renderBlock() {
    if (state.visible || !shouldShow()) return;
    state.visible = true;

    const root = document.createElement("section");
    root.id = "intent-capture-block";
    root.className = "intent-capture-block";
    root.innerHTML = `
      <div class="intent-capture-header">
        <h2>What are you trying to build?</h2>
        <button type="button" data-intent-dismiss>close</button>
      </div>
      <div data-intent-form>
        <textarea data-intent-input rows="4" placeholder="Describe the system, workflow, or outcome you want..."></textarea>
        <label>
          Category (optional)
          <select data-intent-category>
            <option value="general">General</option>
            <option value="ai_agent">AI agent</option>
            <option value="automation">Automation</option>
            <option value="security_audit">Security audit</option>
            <option value="marketplace_module">Marketplace module</option>
          </select>
        </label>
        <p data-intent-error hidden></p>
        <button type="button" data-intent-submit>[ GENERATE MY SYSTEM ]</button>
      </div>
      <div data-intent-preview hidden></div>
    `;
    document.body.appendChild(root);

    root.querySelector("[data-intent-dismiss]")?.addEventListener("click", () => {
      recordHandoff("preview_abandoned");
      state.dismissed = true;
      root.remove();
    });

    root.querySelector("[data-intent-submit]")?.addEventListener("click", async () => {
      const intent = root.querySelector("[data-intent-input]")?.value?.trim() ?? "";
      const category = root.querySelector("[data-intent-category]")?.value ?? "general";
      const errorEl = root.querySelector("[data-intent-error]");
      if (intent.length < 3) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = "Please enter at least 3 characters.";
        }
        return;
      }

      const response = await fetch("/api/growth/intent-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          source: readTrafficSource(),
          page: window.location.pathname,
          uiMode: readUiMode(),
          experimentId: document.body.dataset.flowExperimentId,
          variant: document.body.dataset.flowExperimentVariant || "A",
          intent,
          category,
          interactionDepth: {
            dwellMs: Date.now() - state.pageLoadedAt,
            scrollDepth: state.scrollDepth,
            clicks: state.clicks,
          },
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = "Capture failed. Try again shortly.";
        }
        return;
      }

      const payload = await response.json();
      state.previewGenerated = true;
      recordHandoff("preview_generated");
      const form = root.querySelector("[data-intent-form]");
      const preview = root.querySelector("[data-intent-preview]");
      if (form) form.hidden = true;
      if (preview) {
        preview.hidden = false;
        preview.innerHTML = `
          <p><strong>Problem:</strong> ${payload.preview?.problemSummary ?? ""}</p>
          <p><strong>System:</strong> ${payload.preview?.suggestedSystemType ?? ""}</p>
          <p><strong>Path:</strong> ${payload.preview?.implementationPath ?? ""}</p>
          <p><em>${payload.preview?.riskTrustNote ?? ""}</em></p>
          <p>${payload.preview?.nextAction ?? ""}</p>
          <div class="intent-capture-handoff">
            <a href="${payload.handoff?.unlockBlueprint ?? "#"}" data-handoff="unlock_clicked">Unlock full blueprint</a>
            <a href="${payload.handoff?.bookImplementation ?? "#"}" data-handoff="booking_clicked">Book implementation</a>
            <a href="${payload.handoff?.exploreMarketplaceModule ?? "#"}" data-handoff="module_clicked">Explore matching marketplace module</a>
            <a href="${payload.handoff?.requestServiceFulfillment ?? "#"}">Request service-assisted fulfillment</a>
          </div>
        `;
        preview.querySelectorAll("[data-handoff]").forEach((link) => {
          link.addEventListener("click", () => recordHandoff(link.getAttribute("data-handoff")));
        });
      }
    });
  }

  function bindSignals() {
    document.addEventListener(
      "click",
      () => {
        state.clicks += 1;
        renderBlock();
      },
      { capture: true },
    );

    window.addEventListener(
      "scroll",
      () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        state.scrollDepth = scrollable > 0 ? window.scrollY / scrollable : 0;
        renderBlock();
      },
      { passive: true },
    );

    window.setInterval(() => {
      renderBlock();
    }, 2000);

    fetch(
      `/api/flow/experiment/assignment?sessionId=${encodeURIComponent(getSessionId())}&page=${encodeURIComponent(window.location.pathname)}`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload?.experiment) return;
        const issue = payload.experiment.issue || "";
        state.frictionOnPage =
          issue === "click_no_progression" || issue === "form_abandon" || issue === "high_exit_trap";
        state.weakExperimentIntent = payload.status === "WINNING" && payload.variant === "B";
        renderBlock();
      })
      .catch(() => {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindSignals);
  } else {
    bindSignals();
  }
})();
