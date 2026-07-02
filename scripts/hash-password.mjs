// Generates an OPERATOR_PASSWORD_HASH value for the Worker's auth backend.
//
//   node scripts/hash-password.mjs <passphrase>
//
// Output format: pbkdf2$<iterations>$<saltB64Url>$<hashB64Url>
// Uses the same Web Crypto PBKDF2 derivation as worker/auth.ts, so a hash
// generated here verifies identically in the Worker. Put the output in
// .dev.vars locally, or pipe it to `wrangler secret put OPERATOR_PASSWORD_HASH`
// for a deploy — never commit it.

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.mjs <passphrase>");
  process.exit(1);
}

const iterations = 100_000;
const salt = crypto.getRandomValues(new Uint8Array(16));

const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = new Uint8Array(
  await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256),
);

const b64url = (bytes) => Buffer.from(bytes).toString("base64url");
console.log(`pbkdf2$${iterations}$${b64url(salt)}$${b64url(bits)}`);
