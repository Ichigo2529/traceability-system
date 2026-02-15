import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { User } from "@traceability/sdk";
import { sdk } from "../lib/api-client";

export { sdk };

type AuthMode = "backend";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  mode: AuthMode;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeUserRoles(input: User): User {
  return {
    ...input,
    roles: (input.roles ?? []).map((role) => String(role).toUpperCase()),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<AuthMode>("backend");

  useEffect(() => {
    const storedMode = (localStorage.getItem("auth_mode") as AuthMode | null) ?? "backend";
    const raw = localStorage.getItem("user_info");
    if (storedMode !== "backend") {
      localStorage.removeItem("user_info");
      localStorage.removeItem("auth_tokens");
      localStorage.removeItem("auth_mode");
      setMode("backend");
      setUser(null);
      setIsLoading(false);
      return;
    }

    setMode("backend");
    if (!raw) {
      setIsLoading(false);
      return;
    }

    const parsedUser = normalizeUserRoles(JSON.parse(raw) as User);
    // If user is persisted as backend mode but token is missing, force sign-in again.
    if (storedMode === "backend" && !sdk.auth.isAuthenticated()) {
      localStorage.removeItem("user_info");
      localStorage.removeItem("auth_tokens");
      localStorage.removeItem("auth_mode");
      setUser(null);
      setMode("backend");
      setIsLoading(false);
      return;
    }

    setUser(parsedUser);
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const nextUser = normalizeUserRoles(await sdk.auth.login(username, password));
    setUser(nextUser);
    setMode("backend");
    localStorage.setItem("user_info", JSON.stringify(nextUser));
    localStorage.setItem("auth_mode", "backend");
  };

  const logout = () => {
    sdk.auth.logout();
    setUser(null);
    localStorage.removeItem("user_info");
    localStorage.removeItem("auth_tokens");
    localStorage.removeItem("auth_mode");
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      mode,
      login,
      logout,
      hasRole: (role: string) => Boolean(user?.roles?.includes(role.toUpperCase())),
    }),
    [user, isLoading, mode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
