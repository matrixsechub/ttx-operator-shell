import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./apiClient";
import { getToken, setToken, clearToken, setStoredIdentity, clearStoredIdentity } from "./authToken";
import type { LoginPayload, Operator } from "./types";

interface AuthContextValue {
  operator: Operator | null;
  isAuthenticated: boolean;
  /** True while rehydrating a persisted token on first load — guards RequireAuth from flashing a redirect. */
  initializing: boolean;
  loggingIn: boolean;
  loginError: string | null;
  login: (payload: LoginPayload) => Promise<boolean>;
  /** Log in with an existing operator token directly (no username/password). */
  loginWithToken: (token: string) => Promise<boolean>;
  logout: () => void;
}

function applyOperator(operator: Operator): void {
  setStoredIdentity({ role: operator.role, access_level: operator.access_level });
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function rehydrate() {
      if (!getToken()) {
        setInitializing(false);
        return;
      }
      const result = await api.me();
      if (cancelled) return;
      if (result.ok) {
        setOperator(result.data.operator);
        applyOperator(result.data.operator);
      } else {
        // Stale/invalid token — drop it rather than pretend we're logged in.
        clearToken();
        clearStoredIdentity();
      }
      setInitializing(false);
    }

    rehydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(payload: LoginPayload): Promise<boolean> {
    setLoggingIn(true);
    setLoginError(null);
    const result = await api.login(payload);
    setLoggingIn(false);

    if (!result.ok) {
      setLoginError(result.error);
      return false;
    }

    setToken(result.data.token);
    const operator = result.data.operator ?? { id: payload.username, handle: payload.username };
    setOperator(operator);
    applyOperator(operator);
    return true;
  }

  async function loginWithToken(token: string): Promise<boolean> {
    setLoggingIn(true);
    setLoginError(null);
    setToken(token);

    const result = await api.me();
    setLoggingIn(false);

    if (!result.ok) {
      clearToken();
      setLoginError(result.error);
      return false;
    }

    setOperator(result.data.operator);
    applyOperator(result.data.operator);
    return true;
  }

  function logout() {
    // Best-effort server-side invalidation — local logout succeeds either way.
    void api.logout();
    clearToken();
    clearStoredIdentity();
    setOperator(null);
  }

  return (
    <AuthContext.Provider
      value={{
        operator,
        isAuthenticated: operator !== null,
        initializing,
        loggingIn,
        loginError,
        login,
        loginWithToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
