import { useEffect, useState, type FormEvent } from "react";
import { useLocation, type Location } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { EngineStatusIndicator } from "../components/EngineStatusIndicator";
import { EntityVoice } from "../components/EntityVoice";

type LoginMode = "password" | "token";

function safeReturnPath(statePath: string | undefined, queryPath: string | null): string {
  const candidate = statePath ?? queryPath;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/login")) {
    return "/dashboard";
  }
  return candidate;
}

function CrossSurfaceRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}

export function Login() {
  const [mode, setMode] = useState<LoginMode>("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setTokenInput] = useState("");
  const { login, loginWithToken, loggingIn, loginError, sessionEndedReason, isAuthenticated } = useAuth();
  const location = useLocation();

  const statePath = (location.state as { from?: Location } | null)?.from?.pathname;
  const queryPath = new URLSearchParams(location.search).get("from");
  const from = safeReturnPath(statePath, queryPath);

  // Auth and cockpit use distinct SPA shells, so crossing the boundary must
  // reload through the Worker instead of navigating inside the auth router.
  if (isAuthenticated) {
    return <CrossSurfaceRedirect to={from} />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = mode === "password" ? await login({ username, password }) : await loginWithToken(token);
    if (ok) window.location.replace(from);
  }

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-op-bg text-op-text">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(57,255,199,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,199,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <form
        onSubmit={handleSubmit}
        className="op-panel-raised relative flex w-full max-w-sm flex-col gap-4 rounded-sm p-6"
      >
        <div>
          <span className="text-[11px] uppercase tracking-[0.4em] text-op-text-dim">MatrixSecHub // Ops Division</span>
          <h1 className="mt-2 text-lg uppercase tracking-widest text-op-accent">Operator Login</h1>
          <p className="mt-1 text-xs text-op-text-dim">Authenticate the link to enter the system.</p>
          <EntityVoice entity="hsx">authentication routes through the security plane.</EntityVoice>
        </div>

        {sessionEndedReason && (
          <p className="rounded-sm border border-op-amber/40 bg-op-amber/5 px-3 py-2 text-xs text-op-amber">
            {sessionEndedReason}
          </p>
        )}

        <div className="flex gap-1.5 text-[10px] uppercase tracking-widest">
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`flex-1 rounded-sm border px-2 py-1.5 transition-colors ${
              mode === "password" ? "border-op-accent/60 text-op-accent" : "border-op-border-bright text-op-text-dim"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setMode("token")}
            className={`flex-1 rounded-sm border px-2 py-1.5 transition-colors ${
              mode === "token" ? "border-op-accent/60 text-op-accent" : "border-op-border-bright text-op-text-dim"
            }`}
          >
            Token
          </button>
        </div>

        {mode === "password" ? (
          <>
            <label className="flex flex-col gap-1 text-xs text-op-text-dim">
              Callsign
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoFocus
                autoComplete="username"
                className="op-panel rounded-sm px-3 py-2 text-sm text-op-text placeholder:text-op-text-dim/60 focus:border-op-accent/60 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-op-text-dim">
              Passphrase
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="op-panel rounded-sm px-3 py-2 text-sm text-op-text placeholder:text-op-text-dim/60 focus:border-op-accent/60 focus:outline-none"
              />
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1 text-xs text-op-text-dim">
            Operator token
            <input
              type="password"
              value={token}
              onChange={(event) => setTokenInput(event.target.value)}
              required
              autoFocus
              placeholder="Paste an existing operator token"
              className="op-panel rounded-sm px-3 py-2 text-sm text-op-text placeholder:text-op-text-dim/60 focus:border-op-accent/60 focus:outline-none"
            />
          </label>
        )}

        {loginError && <p className="text-xs text-op-danger">Authentication failed — {loginError}</p>}

        <button
          type="submit"
          disabled={loggingIn}
          className="rounded-sm border border-op-accent/60 px-4 py-2.5 text-xs uppercase tracking-[0.3em] text-op-accent transition-colors hover:bg-op-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loggingIn ? "authenticating…" : "Enter the System"}
        </button>
      </form>

      {/* Public route, no auth required to reach it — proves the engine
          status endpoint is genuinely callable while logged out. */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <EngineStatusIndicator />
      </div>
    </div>
  );
}
