import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Permission boundary: authenticated vs not, nothing finer-grained. No
// roles, no RBAC matrix — a single operator identity is either logged in
// or it isn't. Wrapped around every operator-facing route in router.tsx.
export function RequireAuth() {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-op-bg text-xs uppercase tracking-widest text-op-text-dim">
        Checking session…
      </div>
    );
  }

  if (!isAuthenticated) {
    // #region agent log
    fetch("http://127.0.0.1:7654/ingest/c1420f4a-f03f-408c-822d-3c63b334f1b9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "14ea90" },
      body: JSON.stringify({
        sessionId: "14ea90",
        runId: "fix-auth-redirect",
        hypothesisId: "H-require-auth",
        location: "src/lib/RequireAuth.tsx",
        message: "client redirect to login",
        data: { pathname: location.pathname },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
