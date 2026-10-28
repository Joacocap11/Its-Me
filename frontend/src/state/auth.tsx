import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler } from "../api/client";
import type { AuthStatus } from "../api/types";

interface AuthValue {
  status: AuthStatus | null;
  error: string | null;
  enter: (username: string) => void;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export const useAuth = (): AuthValue => {
  const v = useContext(AuthContext);
  if (!v) throw new Error("AuthProvider ausente");
  return v;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setError(null);
    api.status().then(setStatus, (e: Error) => setError(e.message));
  }, [attempt]);

  useEffect(() => {
    setUnauthorizedHandler(() =>
      setStatus((s) => (s ? { ...s, authenticated: false, username: null } : s)),
    );
  }, []);

  const enter = useCallback(
    (username: string) => setStatus({ configured: true, authenticated: true, username }),
    [],
  );
  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setStatus((s) => (s ? { ...s, authenticated: false, username: null } : s));
  }, []);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo(() => ({ status, error, enter, logout, retry }), [status, error, enter, logout, retry]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
