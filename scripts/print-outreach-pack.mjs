#!/usr/bin/env node
/**
 * Print outreach copy with tracked entry URLs for manual distribution.
 */
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

const packs = [
  {
    channel: "reddit",
    title: "AI / cybersecurity / SaaS communities",
    subreddits: ["r/cybersecurity", "r/devops", "r/SaaS", "r/selfhosted", "r/CloudFlare"],
    post: `I built a public Operator OS entry surface that adapts its UI based on real visitor behavior (entry → marketplace funnel). Looking for honest feedback from builders and security folks — not a product pitch, just testing whether the entry flow makes sense.

Public entry: ${base}/?src=reddit

What it is: unified cockpit for operator workflows, marketplace modules, and governance telemetry. The landing page A/B tests confusion vs friction vs engaged states automatically.

Would love to know: does "Enter System" vs "Explore Marketplace" feel clear on first visit?`,
  },
  {
    channel: "x",
    title: "X / Twitter thread hook",
    post: `Shipping an adaptive Operator OS entry layer.

→ visit tracking
→ behavior-classified UI modes
→ experimentation engine that biases toward winning layouts

Try it: ${base}/?src=x

Thread: the system moves from EXPERIMENTING → OPTIMIZING once each UI mode hits 20 real sessions. Looking for operators to stress-test the funnel.`,
  },
  {
    channel: "direct",
    title: "Direct outreach (10–20 real users)",
    post: `Hey — I'm testing a public Operator OS entry page and need real clicks (not bots). 2-minute ask:

1. Open ${base}/?src=direct
2. Tell me if you'd click "Enter System" or "Explore Marketplace" first
3. Optional: what confused you?

This feeds a live experimentation loop on the worker. Thanks!`,
  },
  {
    channel: "discord",
    title: "Discord / Slack communities",
    post: `Sharing a live Operator OS sandbox — public entry, no login required for the landing page.

${base}/?src=discord

The UI adapts based on aggregate visitor behavior. If you're into cybersecurity ops, SaaS control planes, or Cloudflare Workers patterns, I'd appreciate a visit and blunt feedback on the entry CTAs.`,
  },
  {
    channel: "slack",
    title: "Slack workspace drop-in",
    post: `Dropped a public Operator OS entry surface in staging/production — adaptive UI + experimentation loop running on Cloudflare Workers.

${base}/?src=slack

Looking for 100–200 real sessions over a few days to validate mode performance. Visits with ?src=slack are tracked separately.`,
  },
];

console.log(
  JSON.stringify(
    {
      entryPoint: `${base}/`,
      target: { sessions: "100-200", windowDays: "3-5" },
      trackedParams: "Add ?src=reddit|x|direct|discord|slack to any link",
      packs,
      injectionCommand: `node scripts/inject-traffic-sessions.mjs ${base} 150 synthetic_injection 50`,
      monitorCommand: `node scripts/traffic-activation-report.mjs ${base}`,
    },
    null,
    2,
  ),
);
