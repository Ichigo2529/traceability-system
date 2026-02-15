import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type GuardRole = "ADMIN" | "OPERATOR";

export function RoleGuard({ role, children }: { role: GuardRole; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const isAllowed = role === "ADMIN" ? user.roles?.includes("ADMIN") : !user.roles?.includes("ADMIN");
  if (!isAllowed) return <Navigate to={role === "ADMIN" ? "/station/scan" : "/admin"} replace />;
  return <>{children}</>;
}
