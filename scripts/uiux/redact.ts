const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /msh-operator-token/gi,
  /msh-operator-refresh-token/gi,
  /msh-operator-identity/gi,
  /authorization:\s*[^\s]+/gi,
  /cookie:\s*[^\n]+/gi,
  /set-cookie:\s*[^\n]+/gi,
  /password["']?\s*[:=]\s*["']?[^"'\s,}]+/gi,
  /localStorage/gi,
  /sessionStorage/gi,
  /OPERATOR_PASSWORD/gi,
  /PRISM_OPERATOR_PASSWORD/gi,
  /AUTH_SIGNING_KEY/gi,
  /OPERATOR_SECRET/gi,
];

const SECRET_VALUE_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /Bearer\s+[A-Za-z0-9._-]{10,}/i, category: "Bearer token detected" },
  { pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, category: "JWT detected" },
  { pattern: /msh-operator-(token|refresh-token|identity)/i, category: "Operator storage key detected" },
  { pattern: /authorization:\s*[^\s\n]+/i, category: "Authorization header detected" },
  { pattern: /set-cookie:/i, category: "Cookie header detected" },
  { pattern: /cookie:\s*[^\n]+/i, category: "Cookie value detected" },
  { pattern: /password["']?\s*[:=]\s*["']?[^"'\s,}]{4,}/i, category: "Password value detected" },
  { pattern: /localStorage\.[gs]etItem\(/i, category: "localStorage dump detected" },
  { pattern: /sessionStorage\.[gs]etItem\(/i, category: "sessionStorage dump detected" },
  { pattern: /(AUTH_SIGNING_KEY|OPERATOR_SECRET|OPERATOR_PASSWORD_HASH)\s*[:=]\s*\S+/i, category: "Secret env value detected" },
];

function containsCredentialBearingUrl(text: string): boolean {
  const urlPattern = /https?:\/\/[^\s"'<>]+/gi;
  for (const match of text.matchAll(urlPattern)) {
    try {
      const parsed = new URL(match[0]);
      if (parsed.username || parsed.password) return true;
    } catch {
      // ignore malformed URL fragments
    }
  }
  return false;
}

export function redactSensitiveText(input: string): string {
  let out = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

export function redactObject<T>(value: T): T {
  const json = redactSensitiveText(JSON.stringify(value));
  return JSON.parse(json) as T;
}

export function assertNoSecretsInArtifact(text: string): string[] {
  const violations: string[] = [];
  for (const { pattern, category } of SECRET_VALUE_PATTERNS) {
    if (pattern.test(text)) violations.push(category);
  }
  if (containsCredentialBearingUrl(text)) {
    violations.push("Credential-bearing URL detected");
  }
  return [...new Set(violations)];
}
