export type SystemMode = "OPERATOR_BETA" | "DEVELOPMENT" | "PRODUCTION";

export interface ModeEnv {
  SYSTEM_MODE?: string;
}

const AUTONOMOUS_PREFIXES = ["/api/lifecycle/advance"] as const;

export function resolveSystemMode(env: ModeEnv): SystemMode {
  if (env.SYSTEM_MODE === "OPERATOR_BETA") return "OPERATOR_BETA";
  if (env.SYSTEM_MODE === "PRODUCTION") return "PRODUCTION";
  return "DEVELOPMENT";
}

export function resolveTelemetryEnvironment(env: ModeEnv): string {
  const mode = resolveSystemMode(env);
  if (mode === "PRODUCTION") return "production";
  if (mode === "OPERATOR_BETA") return "operator_beta";
  return "development";
}

export function isOperatorBetaMode(env: ModeEnv): boolean {
  return resolveSystemMode(env) === "OPERATOR_BETA";
}

/** Public surfaces allowed without cockpit session in OPERATOR_BETA. */
export function isBetaPublicHtmlPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return (
    normalized === "/" ||
    normalized === "/enter" ||
    normalized === "/login" ||
    normalized === "/marketplace" ||
    normalized === "/storefront" ||
    normalized === "/council"
  );
}

export function isAutonomousExecutionPath(pathname: string): boolean {
  return AUTONOMOUS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function blockAutonomousInBeta(pathname: string, env: ModeEnv): Response | null {
  if (!isOperatorBetaMode(env)) return null;
  if (!isAutonomousExecutionPath(pathname)) return null;
  return Response.json(
    {
      error: "Autonomous execution is disabled in OPERATOR_BETA mode",
      code: "BETA_AUTONOMOUS_BLOCKED",
      systemMode: "OPERATOR_BETA",
    },
    { status: 403 },
  );
}
