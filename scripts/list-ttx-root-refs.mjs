#!/usr/bin/env node
const html = await fetch("https://ttx-operator-shell.sogellagepul.workers.dev/").then((r) => r.text());
const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((m) => m[1]);
const local = refs.filter((r) => r.startsWith("/"));
console.log(JSON.stringify({ all: refs, local }, null, 2));
