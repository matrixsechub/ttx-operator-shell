type AuditLiteEnv = {
  TTX_STATE?: KVNamespace;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  ORIGIN_URL?: string;
};

type PaymentStatus = "unpaid" | "paid";
type AuditJobStatus = "pending" | "running" | "complete" | "failed";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
type FindingSeverity = "LOW" | "MEDIUM" | "HIGH";

type HeaderPresence = {
  csp: boolean;
  hsts: boolean;
  xFrameOptions: boolean;
  xContentTypeOptions: boolean;
  referrerPolicy: boolean;
  permissionsPolicy: boolean;
};

export type AuditFinding = {
  type: string;
  severity: FindingSeverity;
  description: string;
  recommendation: string;
};

type AuditTeaser = {
  score: number;
  risk_level: RiskLevel;
  sample_findings: AuditFinding[];
  locked: true;
  payment_required: true;
};

type AuditJob = {
  id: string;
  domain: string;
  status: AuditJobStatus;
  created_at: string;
  updated_at: string;
  payment_status: PaymentStatus;
  score: number | null;
  checkout_session_id: string | null;
};

type AuditPayment = {
  audit_id: string;
  payment_status: PaymentStatus;
  checkout_session_id: string | null;
  checkout_url: string | null;
  paid_at: string | null;
  updated_at: string;
};

export type AuditResult = {
  id: string;
  domain: string;
  score: number;
  risk_level: RiskLevel;
  findings: AuditFinding[];
  signals: {
    tls: "valid" | "unreachable_or_invalid";
    headers: string[];
    cloudflare: boolean;
    fetch_status: number | null;
  };
  remediation_plan: string[];
  implementation_complexity: "LOW" | "MEDIUM" | "HIGH";
  executive_summary: string;
  urgency_narrative: string;
  upsell_paths: Array<{ tier: string; label: string; price_range: string; cta: string }>;
  generated_at: string;
};

class AuditLiteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const AUDIT_PREFIX = "mshops:audit-lite:v1";
const AUDIT_RETENTION_SECONDS = 60 * 60 * 24 * 30;
const MAX_START_BODY_BYTES = 2_048;
const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;
const AUDIT_PRICE_CENTS = 29_900;
const AUDIT_PRODUCT_NAME = "Cloudflare Security Audit Lite - Instant AI Report";

const SECONDARY_HEADER_FINDINGS: Array<{
  key: keyof HeaderPresence;
  type: string;
  description: string;
  recommendation: string;
}> = [
  {
    key: "xFrameOptions",
    type: "missing_x_frame_options",
    description: "X-Frame-Options is missing, which can leave browser pages exposed to clickjacking.",
    recommendation: "Add X-Frame-Options DENY or SAMEORIGIN, or enforce equivalent frame-ancestors CSP.",
  },
  {
    key: "xContentTypeOptions",
    type: "missing_x_content_type_options",
    description: "X-Content-Type-Options is missing, which can allow MIME sniffing in older browser paths.",
    recommendation: "Set X-Content-Type-Options to nosniff on all HTML and asset responses.",
  },
  {
    key: "referrerPolicy",
    type: "missing_referrer_policy",
    description: "Referrer-Policy is missing, which may leak path or query context to third-party destinations.",
    recommendation: "Set Referrer-Policy to strict-origin-when-cross-origin or a stricter site policy.",
  },
  {
    key: "permissionsPolicy",
    type: "missing_permissions_policy",
    description: "Permissions-Policy is missing, leaving browser capability boundaries undefined.",
    recommendation: "Add a Permissions-Policy header that disables unused browser features.",
  },
];

function jobKey(id: string): string {
  return `${AUDIT_PREFIX}:job:${id}`;
}

function resultKey(id: string): string {
  return `${AUDIT_PREFIX}:result:${id}`;
}

function paymentKey(id: string): string {
  return `${AUDIT_PREFIX}:payment:${id}`;
}

function webhookKey(id: string): string {
  return `${AUDIT_PREFIX}:webhook:${id}`;
}

function jsonResponse(payload: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function requireStore(env: AuditLiteEnv): KVNamespace {
  if (!env.TTX_STATE) {
    throw new AuditLiteError(503, "Audit Lite storage is temporarily unavailable");
  }
  return env.TTX_STATE;
}

function randomAuditId(): string {
  return `aud_${crypto.randomUUID().replaceAll("-", "")}`;
}

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

function isIpv4(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

function parseIpv4(host: string): number[] | null {
  if (!isIpv4(host)) return null;
  const octets = host.split(".").map((part) => Number(part));
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return octets;
}

function isPrivateOrReservedIpv4(host: string): boolean {
  const octets = parseIpv4(host);
  if (!octets) return false;
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  return a >= 224;
}

export function isBlockedAuditTarget(host: string): boolean {
  const normalized = host.toLowerCase().replace(/\.$/, "");
  if (!normalized || normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  if (normalized.includes(":")) return true;
  if (isPrivateOrReservedIpv4(normalized)) return true;
  if (normalized.endsWith(".local") || normalized.endsWith(".internal") || normalized.endsWith(".invalid")) return true;
  if (!isIpv4(normalized) && !normalized.includes(".")) return true;
  return false;
}

function isValidHostname(host: string): boolean {
  if (isIpv4(host)) return parseIpv4(host) !== null;
  if (host.length > 253 || host.includes("..")) return false;
  return host.split(".").every((label) => {
    if (!label || label.length > 63) return false;
    return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label);
  });
}

export function normalizeAuditDomain(value: unknown): string {
  if (typeof value !== "string") {
    throw new AuditLiteError(400, "domain is required");
  }

  const trimmed = value.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  if (!trimmed) {
    throw new AuditLiteError(400, "domain is required");
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new AuditLiteError(400, "domain must be a valid hostname");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AuditLiteError(400, "domain must use http or https");
  }
  if (parsed.username || parsed.password) {
    throw new AuditLiteError(400, "domain must not include credentials");
  }

  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!isValidHostname(host)) {
    throw new AuditLiteError(400, "domain must be a valid hostname");
  }
  if (isBlockedAuditTarget(host)) {
    throw new AuditLiteError(400, "domain target is not allowed");
  }

  return host;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function readJsonBody(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new AuditLiteError(415, "Content-Type must be application/json");
  }

  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new AuditLiteError(413, "Payload too large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AuditLiteError(400, "Invalid JSON body");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AuditLiteError(400, "JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

async function readKvJson<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function putKvJson(kv: KVNamespace, key: string, value: unknown): Promise<void> {
  await kv.put(key, JSON.stringify(value), { expirationTtl: AUDIT_RETENTION_SECONDS });
}

function headerPresence(headers: Headers): HeaderPresence {
  return {
    csp: headers.has("content-security-policy"),
    hsts: headers.has("strict-transport-security"),
    xFrameOptions: headers.has("x-frame-options"),
    xContentTypeOptions: headers.has("x-content-type-options"),
    referrerPolicy: headers.has("referrer-policy"),
    permissionsPolicy: headers.has("permissions-policy"),
  };
}

function presentHeaderNames(presence: HeaderPresence): string[] {
  const names: string[] = [];
  if (presence.hsts) names.push("hsts");
  if (presence.csp) names.push("csp");
  if (presence.xFrameOptions) names.push("x-frame-options");
  if (presence.xContentTypeOptions) names.push("x-content-type-options");
  if (presence.referrerPolicy) names.push("referrer-policy");
  if (presence.permissionsPolicy) names.push("permissions-policy");
  return names;
}

function detectCloudflareHeaders(headers: Headers): boolean {
  const server = headers.get("server")?.toLowerCase() ?? "";
  return (
    server.includes("cloudflare") ||
    headers.has("cf-ray") ||
    headers.has("cf-cache-status") ||
    headers.has("cf-request-id") ||
    headers.has("cf-worker")
  );
}

async function detectCloudflareDns(domain: string, auditFetch: typeof fetch): Promise<boolean> {
  try {
    const response = await auditFetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=NS`, {
      headers: { Accept: "application/dns-json" },
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { Answer?: Array<{ data?: string }> };
    return (payload.Answer ?? []).some((answer) => String(answer.data ?? "").toLowerCase().includes("cloudflare"));
  } catch {
    return false;
  }
}

function classifyRisk(score: number): RiskLevel {
  if (score >= 80) return "LOW";
  if (score >= 50) return "MEDIUM";
  return "HIGH";
}

export function computeSecurityScore(input: {
  tlsValid: boolean;
  headers: HeaderPresence;
  cloudflare: boolean;
}): { score: number; risk_level: RiskLevel; findings: AuditFinding[]; implementation_complexity: "LOW" | "MEDIUM" | "HIGH" } {
  let score = 100;
  const findings: AuditFinding[] = [];

  if (!input.headers.csp) {
    score -= 25;
    findings.push({
      type: "missing_csp",
      severity: "HIGH",
      description: "No Content Security Policy was detected.",
      recommendation: "Implement a strict CSP that limits scripts, frames, images, and connect sources to approved origins.",
    });
  }

  if (!input.headers.hsts) {
    score -= 20;
    findings.push({
      type: "missing_hsts",
      severity: "HIGH",
      description: "HTTP Strict Transport Security was not detected.",
      recommendation: "Enable HSTS with a long max-age after confirming all subdomains support HTTPS.",
    });
  }

  if (!input.tlsValid) {
    score -= 15;
    findings.push({
      type: "tls_unreachable_or_invalid",
      severity: "HIGH",
      description: "The HTTPS endpoint could not be reached successfully from the audit Worker.",
      recommendation: "Verify certificate validity, HTTPS routing, and origin availability.",
    });
  }

  if (!input.cloudflare) {
    score -= 10;
    findings.push({
      type: "no_cloudflare_signal",
      severity: "MEDIUM",
      description: "No Cloudflare edge signal was detected from response headers or DNS nameservers.",
      recommendation: "Place the site behind Cloudflare proxying and confirm WAF, bot, and cache policies are enabled.",
    });
  }

  const missingSecondary = SECONDARY_HEADER_FINDINGS.filter((item) => !input.headers[item.key]);
  if (missingSecondary.length) {
    score -= Math.min(10, missingSecondary.length * 3);
    for (const item of missingSecondary) {
      findings.push({
        type: item.type,
        severity: "MEDIUM",
        description: item.description,
        recommendation: item.recommendation,
      });
    }
  }

  score = Math.max(0, Math.min(100, score));
  const risk_level = classifyRisk(score);
  const implementation_complexity =
    score < 50 || findings.length >= 6 ? "HIGH" : score < 80 || findings.length >= 3 ? "MEDIUM" : "LOW";

  return { score, risk_level, findings, implementation_complexity };
}

function remediationPlan(findings: AuditFinding[], cloudflare: boolean): string[] {
  const plan = findings.slice(0, 5).map((finding) => finding.recommendation);
  if (!cloudflare) {
    plan.unshift("Confirm Cloudflare proxying, baseline WAF rules, bot protection posture, and DNS routing.");
  }
  if (!plan.length) {
    plan.push("Maintain current controls, review WAF logs weekly, and schedule continuous monitoring.");
  }
  return Array.from(new Set(plan)).slice(0, 6);
}

function executiveSummary(domain: string, score: number, riskLevel: RiskLevel, findingCount: number): string {
  if (riskLevel === "LOW") {
    return `${domain} shows a strong baseline posture with a score of ${score}. The remaining work is mostly hardening and monitoring.`;
  }
  if (riskLevel === "MEDIUM") {
    return `${domain} scored ${score}, indicating material hardening gaps that should be remediated before relying on this site for sensitive traffic. ${findingCount} prioritized findings were detected.`;
  }
  return `${domain} scored ${score}, indicating high security exposure. Immediate remediation is recommended before expanding public traffic or compliance-sensitive workflows.`;
}

function urgencyNarrative(riskLevel: RiskLevel): string {
  if (riskLevel === "HIGH") return "Treat this as an immediate remediation track. Missing transport or browser controls can compound quickly on public assets.";
  if (riskLevel === "MEDIUM") return "Treat this as a near-term hardening track. The site is reachable, but policy coverage is incomplete.";
  return "Treat this as a monitoring and tuning track. Keep controls current and verify changes after each release.";
}

function upsellPaths() {
  return [
    { tier: "implementation", label: "Fix these issues for you", price_range: "$2K-$10K", cta: "/enter?service=ai_security_audit&source=cf-sec-audit-lite" },
    { tier: "subscription", label: "Continuous monitoring and AI alerts", price_range: "$49-$149/mo", cta: "/enter?service=security_monitoring&source=cf-sec-audit-lite" },
    { tier: "advanced_audit", label: "FedGrade and compliance security audit", price_range: "$999+", cta: "/enter?service=fedgrade_audit&source=cf-sec-audit-lite" },
  ];
}

export async function runAuditLiteScan(domain: string, auditFetch: typeof fetch = fetch): Promise<Omit<AuditResult, "id">> {
  let tlsValid = false;
  let fetchStatus: number | null = null;
  let headers = new Headers();

  try {
    const response = await auditFetch(`https://${domain}/`, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    fetchStatus = response.status;
    tlsValid = response.status > 0 && response.status < 600;
    headers = response.headers;
  } catch {
    tlsValid = false;
  }

  const presence = headerPresence(headers);
  const cloudflare = detectCloudflareHeaders(headers) || (await detectCloudflareDns(domain, auditFetch));
  const scored = computeSecurityScore({ tlsValid, headers: presence, cloudflare });

  return {
    domain,
    score: scored.score,
    risk_level: scored.risk_level,
    findings: scored.findings,
    signals: {
      tls: tlsValid ? "valid" : "unreachable_or_invalid",
      headers: presentHeaderNames(presence),
      cloudflare,
      fetch_status: fetchStatus,
    },
    remediation_plan: remediationPlan(scored.findings, cloudflare),
    implementation_complexity: scored.implementation_complexity,
    executive_summary: executiveSummary(domain, scored.score, scored.risk_level, scored.findings.length),
    urgency_narrative: urgencyNarrative(scored.risk_level),
    upsell_paths: upsellPaths(),
    generated_at: new Date().toISOString(),
  };
}

function buildTeaser(result: AuditResult): AuditTeaser {
  return {
    score: result.score,
    risk_level: result.risk_level,
    sample_findings: result.findings.slice(0, 2),
    locked: true,
    payment_required: true,
  };
}

async function createCheckoutSession(
  env: AuditLiteEnv,
  request: Request,
  job: AuditJob,
  email: string | null,
): Promise<{ id: string; url: string } | null> {
  if (!env.STRIPE_SECRET_KEY) return null;

  const requestOrigin = new URL(request.url).origin;
  const origin = requestOrigin || env.ORIGIN_URL?.trim() || "";
  const successUrl = `${origin}/apps/cloudflare-security-audit-lite?audit_id=${encodeURIComponent(job.id)}&checkout=success`;
  const cancelUrl = `${origin}/apps/cloudflare-security-audit-lite?audit_id=${encodeURIComponent(job.id)}&checkout=cancelled`;
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("client_reference_id", job.id);
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("metadata[audit_id]", job.id);
  params.set("metadata[product]", "CF_SEC_AUDIT_LITE::INSTANT");
  if (email) params.set("customer_email", email);

  if (env.STRIPE_PRICE_ID) {
    params.set("line_items[0][price]", env.STRIPE_PRICE_ID);
  } else {
    params.set("line_items[0][price_data][currency]", "usd");
    params.set("line_items[0][price_data][unit_amount]", String(AUDIT_PRICE_CENTS));
    params.set("line_items[0][price_data][product_data][name]", AUDIT_PRODUCT_NAME);
  }
  params.set("line_items[0][quantity]", "1");

  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { id?: string; url?: string };
    if (!payload.id || !payload.url) return null;
    return { id: payload.id, url: payload.url };
  } catch {
    return null;
  }
}

async function handleStart(request: Request, env: AuditLiteEnv): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "POST" });
  }

  const kv = requireStore(env);
  const payload = await readJsonBody(request, MAX_START_BODY_BYTES);
  const domain = normalizeAuditDomain(payload.domain);
  const email = isValidEmail(payload.email) ? payload.email.trim().toLowerCase() : null;
  const id = randomAuditId();
  const now = new Date().toISOString();

  const scan = await runAuditLiteScan(domain);
  const result: AuditResult = { id, ...scan };
  const job: AuditJob = {
    id,
    domain,
    status: "complete",
    created_at: now,
    updated_at: now,
    payment_status: "unpaid",
    score: result.score,
    checkout_session_id: null,
  };

  const checkout = await createCheckoutSession(env, request, job, email);
  job.checkout_session_id = checkout?.id ?? null;
  const payment: AuditPayment = {
    audit_id: id,
    payment_status: "unpaid",
    checkout_session_id: checkout?.id ?? null,
    checkout_url: checkout?.url ?? null,
    paid_at: null,
    updated_at: now,
  };

  await Promise.all([
    putKvJson(kv, jobKey(id), job),
    putKvJson(kv, resultKey(id), result),
    putKvJson(kv, paymentKey(id), payment),
  ]);

  return jsonResponse(
    {
      job_id: id,
      status: job.status,
      payment_status: job.payment_status,
      teaser: buildTeaser(result),
      checkout_url: checkout?.url ?? null,
      checkout_configured: Boolean(checkout?.url),
    },
    201,
  );
}

async function getJobAndPayment(kv: KVNamespace, id: string): Promise<{ job: AuditJob; payment: AuditPayment | null } | null> {
  const job = await readKvJson<AuditJob>(kv, jobKey(id));
  if (!job) return null;
  const payment = await readKvJson<AuditPayment>(kv, paymentKey(id));
  return { job, payment };
}

async function handleStatus(request: Request, env: AuditLiteEnv, id: string): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET" });
  }
  const kv = requireStore(env);
  const state = await getJobAndPayment(kv, id);
  if (!state) return jsonResponse({ error: "Audit job not found" }, 404);
  const paymentStatus = state.payment?.payment_status ?? state.job.payment_status;
  return jsonResponse({
    id: state.job.id,
    domain: state.job.domain,
    status: state.job.status,
    payment_status: paymentStatus,
    score: state.job.score,
    risk_level: state.job.score === null ? null : classifyRisk(state.job.score),
    created_at: state.job.created_at,
    updated_at: state.job.updated_at,
  });
}

function responseFilename(domain: string, extension: "json" | "pdf"): string {
  const safe = domain.replace(/[^a-z0-9.-]+/gi, "-").replace(/^-+|-+$/g, "") || "audit";
  return `cloudflare-security-audit-lite-${safe}.${extension}`;
}

function sanitizePdfText(value: string): string {
  return value.replace(/[^\x20-\x7e]/g, " ").replace(/\s+/g, " ").trim();
}

function escapePdfString(value: string): string {
  return sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function makePdf(result: AuditResult): string {
  const lines = [
    "Cloudflare Security Audit Lite - Instant AI Report",
    `Domain: ${result.domain}`,
    `Score: ${result.score}`,
    `Risk: ${result.risk_level}`,
    `Implementation complexity: ${result.implementation_complexity}`,
    "",
    result.executive_summary,
    "",
    "Top Findings:",
    ...result.findings.slice(0, 8).map((finding) => `- ${finding.severity}: ${finding.description}`),
    "",
    "Remediation Plan:",
    ...result.remediation_plan.slice(0, 8).map((item) => `- ${item}`),
  ].slice(0, 42);

  const text = ["BT", "/F1 10 Tf", "14 TL", "50 760 Td", ...lines.map((line, index) => `${index === 0 ? "" : "T* "}${`(${escapePdfString(line)}) Tj`}`), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

async function handleResult(request: Request, env: AuditLiteEnv, id: string): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET" });
  }
  const kv = requireStore(env);
  const state = await getJobAndPayment(kv, id);
  if (!state) return jsonResponse({ error: "Audit job not found" }, 404);
  const result = await readKvJson<AuditResult>(kv, resultKey(id));
  if (!result) return jsonResponse({ error: "Audit result not found" }, 404);

  const paymentStatus = state.payment?.payment_status ?? state.job.payment_status;
  if (paymentStatus !== "paid") {
    return jsonResponse({
      id,
      domain: result.domain,
      locked: true,
      payment_status: paymentStatus,
      teaser: buildTeaser(result),
      checkout_url: state.payment?.checkout_url ?? null,
    });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  if (format === "pdf") {
    return new Response(makePdf(result), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${responseFilename(result.domain, "pdf")}"`,
      },
    });
  }

  const headers: HeadersInit = {};
  if (format === "json") {
    headers["Content-Disposition"] = `attachment; filename="${responseFilename(result.domain, "json")}"`;
  }
  return jsonResponse({ locked: false, payment_status: paymentStatus, report: result }, 200, headers);
}

function parseStripeSignatureHeader(header: string): { timestamp: string; signatures: string[] } | null {
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || !signatures.length) return null;
  return { timestamp, signatures };
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length === b.length ? 0 : 1;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const left = index < a.length ? a.charCodeAt(index) : 0;
    const right = index < b.length ? b.charCodeAt(index) : 0;
    diff |= left ^ right;
  }
  return diff === 0;
}

export async function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed) return false;

  const timestamp = Number(parsed.timestamp);
  if (!Number.isFinite(timestamp)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > STRIPE_WEBHOOK_TOLERANCE_SECONDS) return false;

  const expected = await hmacSha256Hex(secret, `${parsed.timestamp}.${rawBody}`);
  return parsed.signatures.some((signature) => timingSafeEqual(signature, expected));
}

async function markAuditPaid(kv: KVNamespace, auditId: string, checkoutSessionId: string | null): Promise<void> {
  const state = await getJobAndPayment(kv, auditId);
  if (!state) {
    throw new AuditLiteError(404, "Audit job not found for Stripe event");
  }

  const now = new Date().toISOString();
  const job: AuditJob = {
    ...state.job,
    payment_status: "paid",
    checkout_session_id: checkoutSessionId ?? state.job.checkout_session_id,
    updated_at: now,
  };
  const payment: AuditPayment = {
    audit_id: auditId,
    payment_status: "paid",
    checkout_session_id: checkoutSessionId ?? state.payment?.checkout_session_id ?? null,
    checkout_url: state.payment?.checkout_url ?? null,
    paid_at: state.payment?.paid_at ?? now,
    updated_at: now,
  };

  await Promise.all([putKvJson(kv, jobKey(auditId), job), putKvJson(kv, paymentKey(auditId), payment)]);
}

async function handleWebhook(request: Request, env: AuditLiteEnv): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "POST" });
  }
  const kv = requireStore(env);
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return jsonResponse({ error: "Stripe webhook verification is not configured" }, 503);
  }

  const rawBody = await request.text();
  const verified = await verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!verified) {
    return jsonResponse({ error: "Invalid Stripe signature" }, 400);
  }

  let event: {
    id?: string;
    type?: string;
    data?: { object?: { id?: string; client_reference_id?: string; metadata?: Record<string, string> } };
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return jsonResponse({ error: "Invalid Stripe event JSON" }, 400);
  }

  if (!event.id || !event.type) {
    return jsonResponse({ error: "Stripe event id and type are required" }, 400);
  }

  const existing = await kv.get(webhookKey(event.id));
  if (existing) {
    return jsonResponse({ received: true, duplicate: true });
  }

  let action = "ignored";
  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    const auditId = session?.metadata?.audit_id || session?.client_reference_id;
    if (!auditId) {
      return jsonResponse({ error: "Stripe event missing audit id" }, 400);
    }
    await markAuditPaid(kv, auditId, session?.id ?? null);
    action = "payment-recorded";
  }

  await putKvJson(kv, webhookKey(event.id), { id: event.id, type: event.type, action, processed_at: new Date().toISOString() });
  return jsonResponse({ received: true, action });
}

function routeMatch(pathname: string):
  | { kind: "start" }
  | { kind: "webhook" }
  | { kind: "status"; id: string }
  | { kind: "result"; id: string }
  | null {
  const normalized = normalizePath(pathname);
  if (normalized === "/api/audit-lite/start") return { kind: "start" };
  if (normalized === "/api/audit-lite/webhook") return { kind: "webhook" };
  const status = normalized.match(/^\/api\/audit-lite\/status\/([A-Za-z0-9_-]+)$/);
  if (status?.[1]) return { kind: "status", id: status[1] };
  const result = normalized.match(/^\/api\/audit-lite\/result\/([A-Za-z0-9_-]+)$/);
  if (result?.[1]) return { kind: "result", id: result[1] };
  return null;
}

export async function handleAuditLiteRoute(request: Request, pathname: string, env: AuditLiteEnv): Promise<Response | null> {
  const route = routeMatch(pathname);
  if (!route) return null;

  try {
    if (route.kind === "start") return await handleStart(request, env);
    if (route.kind === "status") return await handleStatus(request, env, route.id);
    if (route.kind === "result") return await handleResult(request, env, route.id);
    return await handleWebhook(request, env);
  } catch (error) {
    if (error instanceof AuditLiteError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    return jsonResponse({ error: "Audit Lite request failed" }, 500);
  }
}
