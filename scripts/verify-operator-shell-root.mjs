#!/usr/bin/env node
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";
const target = "https://ttx-operator-shell.sogellagepul.workers.dev/";

async function probe(path) {
  const r = await fetch(`${base}${path}`, {
    headers: { "Cache-Control": "no-cache" },
    redirect: "manual",
  });
  return {
    path,
    status: r.status,
    location: r.headers.get("location"),
    xEntry: r.headers.get("x-entry-route"),
    xTarget: r.headers.get("x-redirect-target"),
  };
}

const root = await probe("/");
const welcome = await probe("/welcome");
const systems = await probe("/systems");

const checks = {
  rootRedirects: root.status === 302 && root.location === target,
  welcomeRedirects: welcome.status === 302 && welcome.location === target,
  entryHeader: root.xEntry === "operator-shell",
  systemsUnchanged: systems.status === 200,
};

console.log(JSON.stringify({ base, target, root, welcome, systems, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
