export type OperatorAuthResult = {
  ok: true;
  token: string;
};

export type OperatorAuthFailure = {
  ok: false;
  error: string;
};

export type OperatorAuthOutcome = OperatorAuthResult | OperatorAuthFailure;

export async function bootstrapOperatorSession(origin: string): Promise<OperatorAuthOutcome> {
  const callsign = process.env.PRISM_OPERATOR_CALLSIGN ?? process.env.OPERATOR_CALLSIGN;
  const password = process.env.PRISM_OPERATOR_PASSWORD ?? process.env.OPERATOR_PASSWORD;

  if (!callsign || !password) {
    return { ok: false, error: "Operator credentials not configured (PRISM_OPERATOR_CALLSIGN / PRISM_OPERATOR_PASSWORD)" };
  }

  const response = await fetch(new URL("/api/auth/login", origin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: callsign, password }),
  });

  if (!response.ok) {
    return { ok: false, error: `Operator authentication failed with status ${response.status}` };
  }

  const body = (await response.json()) as { token?: string };
  if (!body.token || typeof body.token !== "string") {
    return { ok: false, error: "Operator authentication response missing token" };
  }

  return { ok: true, token: body.token };
}

export async function applyOperatorAuthToContext(
  context: import("@playwright/test").BrowserContext,
  origin: string,
): Promise<OperatorAuthOutcome> {
  const auth = await bootstrapOperatorSession(origin);
  if (!auth.ok) return auth;

  await context.addInitScript((token: string) => {
    window.localStorage.setItem("msh-operator-token", token);
    window.localStorage.setItem("msh-operator-identity", JSON.stringify({ role: "operator", access_level: "internal" }));
  }, auth.token);

  return auth;
}
