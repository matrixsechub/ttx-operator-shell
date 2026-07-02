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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
