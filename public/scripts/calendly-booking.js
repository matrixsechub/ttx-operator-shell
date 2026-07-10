document.addEventListener("DOMContentLoaded", async () => {
  const blocks = Array.from(document.querySelectorAll("[data-calendly-block]"));
  if (!blocks.length) return;

  let config = null;
  try {
    const response = await fetch("/api/public/calendly-config", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      blocks.forEach((block) => renderUnavailable(block, "Booking is temporarily unavailable."));
      window.conversionTelemetry?.track("calendly_embed_failed", {
        failureCode: "BLOCKED_CALENDLY_URL_REQUIRED",
      });
      return;
    }
    config = await response.json();
  } catch {
    blocks.forEach((block) => renderUnavailable(block, "Booking is temporarily unavailable."));
    window.conversionTelemetry?.track("calendly_embed_failed", {
      failureCode: "CALENDLY_CONFIG_FETCH_FAILED",
    });
    return;
  }

  blocks.forEach((block) => {
    window.conversionTelemetry?.track("calendly_block_viewed", {
      ctaId: block.id || "calendly-block",
    });
    renderBlock(block, config);
  });

  if (!document.querySelector('script[src*="assets.calendly.com"]')) {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
  }
});

function renderUnavailable(block, message) {
  const fallback = document.createElement("p");
  fallback.className = "system-copy calendly-fallback";
  fallback.textContent = message;
  block.replaceChildren(fallback);
}

function renderBlock(block, config) {
  const title = block.dataset.calendlyTitle || config.title;
  const duration = block.dataset.calendlyDuration || `${config.duration_minutes} minutes`;
  const description =
    block.dataset.calendlyDescription ||
    "Book a consultation to review intake scope, activation readiness, and next steps.";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const copy = document.createElement("p");
  copy.className = "system-copy";
  copy.textContent = `${description} Expected duration: ${duration}.`;

  const actions = document.createElement("div");
  actions.className = "cta-row";

  const directLink = document.createElement("a");
  directLink.className = "button primary";
  directLink.href = config.url;
  directLink.target = "_blank";
  directLink.rel = "noopener noreferrer";
  directLink.textContent = "Book consultation";
  directLink.addEventListener("click", () => {
    window.conversionTelemetry?.track("calendly_booking_clicked", {
      ctaId: block.id || "calendly-direct-link",
    });
  });

  actions.appendChild(directLink);

  const widgetHost = document.createElement("div");
  widgetHost.className = "calendly-inline-widget";
  widgetHost.dataset.url = config.url;
  widgetHost.style.minWidth = "320px";
  widgetHost.style.height = "700px";

  block.replaceChildren(heading, copy, actions, widgetHost);
  window.conversionTelemetry?.track("calendly_embed_loaded", {
    ctaId: block.id || "calendly-embed",
  });
}
