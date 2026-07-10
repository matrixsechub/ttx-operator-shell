#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORIGIN = process.env.PHASE2_SMOKE_ORIGIN ?? "http://127.0.0.1:8787";
const OUT_PATH = join(__dirname, "phase2-dashboard-smoke-report.json");

function loadDevVars() {
  try {
    const raw = readFileSync(join(__dirname, "..", ".dev.vars"), "utf8");
    const env = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
    }
    return env;
  } catch {
    return {};
  }
}

const devVars = loadDevVars();
const callsign = process.env.OPERATOR_CALLSIGN ?? devVars.OPERATOR_CALLSIGN ?? "operator";
const password = process.env.OPERATOR_PASSWORD ?? devVars.OPERATOR_PASSWORD ?? "";

const ROUTES = [
  { path: "/dashboard", markers: ["Operator Cockpit", "global-command-header"], label: "Executive overview" },
  { path: "/dashboard/beacon", markers: ["Beacon Panel"], label: "Beacon deep panel" },
  { path: "/dashboard/runtime", markers: ["Runtime Panel"], label: "Runtime deep panel" },
  { path: "/dashboard/marketplace", markers: ["Marketplace Panel"], label: "Marketplace deep panel" },
  { path: "/dashboard/agents", markers: ["Agent Panel"], label: "Agents deep panel" },
  { path: "/dashboard/governance", markers: ["Governance Panel"], label: "Governance deep panel" },
  { path: "/dashboard/subscription", markers: ["Subscription Panel"], label: "Subscription deep panel" },
  { path: "/dashboard/audit", markers: ["Audit Panel"], label: "Audit deep panel" },
];

const DEGRADED_MARKERS = [
  "No report published to KV",
  "No audit events recorded yet",
  "No pending proposals",
  "No entitlements seeded",
  "safe mode",
  "WATCH",
  "DEGRADED",
  "HALTED",
];

async function login() {
  const response = await fetch(`${ORIGIN}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: callsign, password }),
  });
  const body = await response.json();
  if (!response.ok || !body.token) {
    throw new Error(`login failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body.token;
}

async function main() {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  const token = await login();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript((accessToken) => {
    window.localStorage.setItem("msh-operator-token", accessToken);
    window.localStorage.setItem(
      "msh-operator-identity",
      JSON.stringify({ role: "operator", access_level: "internal" }),
    );
  }, token);

  const report = {
    origin: ORIGIN,
    testedAt: new Date().toISOString(),
    auth: { ok: true, callsign },
    routes: [],
    globalConsoleErrors: [],
    globalFailedRequests: [],
    degradedMarkersObserved: [],
  };

  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.globalConsoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });
  page.on("requestfailed", (req) => {
    report.globalFailedRequests.push({
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText ?? "unknown",
    });
  });

  for (const route of ROUTES) {
    const apiRequests = [];
    const consoleErrors = [];
    const failedRequests = [];

    const onRequest = (req) => {
      if (req.url().includes("/api/")) {
        apiRequests.push({ method: req.method(), url: req.url() });
      }
    };
    const onConsole = (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    };
    const onFailed = (req) => {
      failedRequests.push({
        url: req.url(),
        method: req.method(),
        failure: req.failure()?.errorText ?? "unknown",
      });
    };

    page.on("request", onRequest);
    page.on("console", onConsole);
    page.on("requestfailed", onFailed);

    const response = await page.goto(`${ORIGIN}${route.path}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector("body", { timeout: 10_000 });
    await page.waitForTimeout(2500);

    const finalUrl = page.url();
    const bodyText = await page.locator("body").innerText();
    const markersFound = route.markers.filter((m) => bodyText.includes(m));
    const degradedFound = DEGRADED_MARKERS.filter((m) => bodyText.toLowerCase().includes(m.toLowerCase()));
    for (const marker of degradedFound) {
      if (!report.degradedMarkersObserved.includes(marker)) report.degradedMarkersObserved.push(marker);
    }

    const redirectedToLogin = finalUrl.includes("/login");
    const authProblem = redirectedToLogin || (response?.status() === 401);

    report.routes.push({
      path: route.path,
      label: route.label,
      httpStatus: response?.status() ?? null,
      finalUrl,
      navigationOk: !redirectedToLogin && (response?.ok ?? false),
      authProblem,
      markersExpected: route.markers,
      markersFound,
      markersMissing: route.markers.filter((m) => !bodyText.includes(m)),
      degradedMarkersOnPage: degradedFound,
      apiRequests: [...new Map(apiRequests.map((r) => [`${r.method} ${r.url}`, r])).values()],
      consoleErrors,
      failedRequests,
      renderedSnippet: bodyText.replace(/\s+/g, " ").trim().slice(0, 400),
    });

    page.off("request", onRequest);
    page.off("console", onConsole);
    page.off("requestfailed", onFailed);
  }

  await browser.close();
  writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
