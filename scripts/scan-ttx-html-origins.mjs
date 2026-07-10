#!/usr/bin/env node
const html = await fetch("https://ttx-operator-shell.sogellagepul.workers.dev/").then((r) => r.text());
const originRefs = html.match(/https:\/\/ttx-operator-shell[^"'\s)]+/g) || [];
const sogRefs = html.match(/sogellagepul[^"'\s)]+/g) || [];
console.log("originRefs", originRefs);
console.log("sogRefs", [...new Set(sogRefs)].slice(0, 20));
