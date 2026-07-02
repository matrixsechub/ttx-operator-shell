import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./apiClient";
import { getToken, setToken, clearToken } from "./authToken";
import type { LoginPayload, Operator } from "./types";

interface AuthContextValue {
  operator: Operator | null;
  isAuthenticated: boolean;
  /** True while rehydrating a persisted token on first load — guards RequireAuth from flashing a redirect. */
  initializing: boolean;
  loggingIn: boolean;
  loginError: string | null;
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => void;
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
      } else {
        // Stale/invalid token — drop it rather than pretend we're logged in.
        clearToken();
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
    setOperator(result.data.operator ?? { id: payload.username, handle: payload.username });
    return true;
  }

  function logout() {
    // Best-effort server-side invalidation — local logout succeeds either way.
    void api.logout();
    clearToken();
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
