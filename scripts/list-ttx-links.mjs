#!/usr/bin/env node
const html = await fetch("https://ttx-operator-shell.sogellagepul.workers.dev/").then((r) => r.text());
const hrefs = [...html.matchAll(/href=["']([^"']+)["']/g)].map((m) => m[1]);
const srcs = [...html.matchAll(/src=["']([^"']+)["']/g)].map((m) => m[1]);
const unique = [...new Set([...hrefs, ...srcs])].sort();
console.log(JSON.stringify(unique, null, 2));
