(function conversionTelemetry() {
  function getSessionId() {
    try {
      const key = "msh_session";
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const sessionId = crypto.randomUUID();
      localStorage.setItem(key, sessionId);
      return sessionId;
    } catch {
      return crypto.randomUUID();
    }
  }

  function send(event, details) {
    const payload = {
      event,
      sessionId: getSessionId(),
      sourceRoute: window.location.pathname || "/",
      ...details,
    };

    fetch("/api/public/conversion-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});

    fetch("/api/growth/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }

  window.conversionTelemetry = {
    track(event, details) {
      send(event, details ?? {});
    },
  };
})();
