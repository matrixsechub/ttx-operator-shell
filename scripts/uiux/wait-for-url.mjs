#!/usr/bin/env node
const url = process.argv[2];
if (!url) {
  console.error("Usage: wait-for-url.mjs <url>");
  process.exit(1);
}

const deadline = Date.now() + 120_000;
while (Date.now() < deadline) {
  try {
    const res = await fetch(url, { method: "GET" });
    if (res.ok) {
      console.log(`ready: ${url}`);
      process.exit(0);
    }
  } catch {
    // retry
  }
  await new Promise((r) => setTimeout(r, 2000));
}

console.error(`timeout waiting for ${url}`);
process.exit(1);
