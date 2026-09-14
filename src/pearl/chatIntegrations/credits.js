/**
 * PEARL Credits — display-only. No wallet, billing, metering, or token counts.
 */

export function formatCreditsDisplay({ est, actual, cls, ref, charged }) {
  const out = {
    cls: cls || "read",
    ref: ref || null,
    charged: charged === true,
    // Never expose provider cost or token counts
    tokenCount: undefined,
    price: undefined,
    providerCost: undefined,
  };

  if (typeof actual === "number" && Number.isFinite(actual)) {
    out.label = `${actual} cr actual`;
    out.actual = actual;
  } else if (typeof est === "number" && Number.isFinite(est)) {
    out.label = `${est} cr est.`;
    out.est = est;
  } else {
    out.label = "credits · n/a";
  }

  if (charged === false) {
    out.label = `${out.label} · not charged`;
  }

  return Object.freeze(out);
}

/** Credits never unlock or gate a decision row. */
export function creditsGateDecision(_credits, decisionAvailable) {
  return decisionAvailable === true;
}

export function assertNoCostLeak(display) {
  const forbidden = ["tokenCount", "price", "providerCost", "usd", "tokens"];
  for (const key of forbidden) {
    if (display[key] !== undefined && display[key] !== null) return false;
  }
  const text = String(display.label || "");
  if (/\b(usd|\$|token|price|cost)\b/i.test(text)) return false;
  return true;
}
