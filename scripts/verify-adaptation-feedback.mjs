#!/usr/bin/env node
/**
 * Adaptation feedback gate — per-mode progression metrics exposed on system state.
 */
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

const res = await fetch(`${base}/api/behavior/intelligence`, {
  headers: { Accept: "application/json", "Cache-Control": "no-cache" },
});
const json = await res.json().catch(() => null);
const adaptation = json?.adaptation;

const checks = {
  endpointOk: res.status === 200 && Boolean(adaptation),
  hasModes:
    typeof adaptation?.modes?.CONFUSION?.entryRate === "number" &&
    typeof adaptation?.modes?.FRICTION?.marketplaceRate === "number" &&
    typeof adaptation?.modes?.ENGAGED?.conversionSignal === "number",
  ratesBounded:
    Object.values(adaptation?.modes ?? {}).every((mode) => {
      if (!mode || typeof mode !== "object") return false;
      const rates = [mode.entryRate, mode.marketplaceRate, mode.dropOffRate].filter(
        (value) => typeof value === "number",
      );
      return rates.every((value) => value >= 0 && value <= 1);
    }),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);

console.log(
  JSON.stringify(
    {
      base,
      adaptationFeedbackStatus: failed.length === 0 ? "active" : "incomplete",
      failed,
      checks,
      adaptation,
    },
    null,
    2,
  ),
);

process.exit(failed.length === 0 ? 0 : 1);
