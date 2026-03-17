import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type GuardRole = "ADMIN" | "OPERATOR";

export function RoleGuard({ role, children }: { role: GuardRole; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-[200px] w-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const isAllowed = role === "ADMIN" ? user.roles?.includes("ADMIN") : !user.roles?.includes("ADMIN");
  if (!isAllowed) return <Navigate to={role === "ADMIN" ? "/station/scan" : "/admin"} replace />;
  return <>{children}</>;
}
