import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";
import { ScanInput } from "../../components/shared/ScanInput";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Laptop, Factory, Cog, User } from "lucide-react";

function getShiftByTime(date: Date) {
  const h = date.getHours();
  if (h >= 6 && h < 14) return { code: "A", window: "06:00–14:00" };
  if (h >= 14 && h < 22) return { code: "B", window: "14:00–22:00" };
  return { code: "C", window: "22:00–06:00" };
}

const glassClassName = "bg-card/80 backdrop-blur-md border border-border shadow-lg rounded-2xl";

function StationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full relative">
      <div className="premium-mesh-bg" />
      <div className="flex items-center justify-center h-full p-8">{children}</div>
    </div>
  );
}

export function OperatorLoginPage() {
  const navigate = useNavigate();
  const badgeRef = useRef<HTMLInputElement>(null);
  const [badge, setBadge] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const heartbeatQuery = useQuery({
    queryKey: ["station-heartbeat"],
    queryFn: () => sdk.device.heartbeat(),
    retry: false,
  });

  useEffect(() => {
    badgeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!heartbeatQuery.error) return;
    const err = heartbeatQuery.error as { code?: string };
    if (err.code === "DEVICE_NOT_REGISTERED") {
      navigate("/station/register", { replace: true });
    }
  }, [heartbeatQuery.error, navigate]);

  const operatorQuery = useQuery({
    queryKey: ["operator-session"],
    queryFn: () => sdk.device.getOperator(),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: () => sdk.device.operatorLogin(badge.trim(), password),
    onSuccess: () => {
      setError(null);
      navigate("/station/scan", { replace: true });
    },
    onError: (err) => {
      const e = err as { message?: string };
      setError(e.message || "Operator login failed");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => sdk.device.operatorLogout(),
    onSuccess: () => {
      operatorQuery.refetch();
      setBadge("");
      setPassword("");
      setTimeout(() => badgeRef.current?.focus(), 100);
    },
  });

  const shift = useMemo(() => getShiftByTime(new Date()), []);

  if (heartbeatQuery.isLoading || operatorQuery.isLoading) {
    return (
      <StationShell>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <Label className="opacity-65">Loading station info…</Label>
        </div>
      </StationShell>
    );
  }

  if (heartbeatQuery.error) {
    return (
      <StationShell>
        <div className={`${glassClassName} p-8 max-w-[480px] w-full`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-destructive">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold m-0">Station Unavailable</h2>
          </div>
          <Alert variant="destructive" className="rounded-lg">
            Cannot connect to station. Device token missing or invalid. Please register this device first.
          </Alert>
          <Button className="w-full mt-5 rounded-lg" onClick={() => navigate("/station/register")}>
            Register Device
          </Button>
        </div>
      </StationShell>
    );
  }

  const station = heartbeatQuery.data?.station?.name || "Unassigned";
  const process = heartbeatQuery.data?.process?.name || "Unassigned";
  const status = heartbeatQuery.data?.status || "active";

  if (status === "disabled") {
    return (
      <StationShell>
        <div className={`${glassClassName} p-8 max-w-[480px] w-full`}>
          <Alert variant="destructive" className="rounded-lg">
            This device has been <strong>disabled</strong> by the administrator. Contact your supervisor.
          </Alert>
        </div>
      </StationShell>
    );
  }

  return (
    <div className="h-full relative">
      <div className="premium-mesh-bg" />
      <div className="border-b border-border py-4 px-4">
        <h1 className="text-xl font-semibold text-foreground">Operator Login</h1>
      </div>
      <div className="min-h-full grid justify-center content-start gap-8 p-8 pt-12">
        <Card className="w-[720px] max-w-full bg-card/80 backdrop-blur-md border border-border shadow-lg rounded-2xl">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary">
              <Laptop className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">Current Device</p>
              <p className="text-xs text-muted-foreground">
                Shift {shift.code} · {shift.window}
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Factory className="w-4 h-4 text-orange-500" />
              <Label className="font-semibold">Station:</Label>
              <span className="font-bold text-foreground">{station}</span>
            </div>
            <div className="flex items-center gap-2">
              <Cog className="w-4 h-4 text-green-600" />
              <Label className="font-semibold">Process:</Label>
              <span className="font-bold text-foreground">{process}</span>
            </div>
            <div className="mt-1">
              <StatusBadge status={status} />
            </div>
          </CardContent>
        </Card>

        <Card className="w-[720px] max-w-full bg-card/80 backdrop-blur-md border border-border shadow-lg rounded-2xl">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">Badge Authentication</p>
              <p className="text-xs text-muted-foreground">Scan badge or enter Employee ID</p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {operatorQuery.data && (
              <Alert className="mb-4 rounded-lg">An operator session is currently active on this device.</Alert>
            )}

            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (loginMutation.isPending || !badge || !password) return;
                loginMutation.mutate();
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="operator-badge" className="font-semibold">
                  Badge / Employee ID
                </Label>
                <ScanInput
                  ref={badgeRef}
                  id="operator-badge"
                  name="operator-badge"
                  ariaLabel="Badge or employee ID"
                  value={badge}
                  onChange={(nextValue) => {
                    setError(null);
                    setBadge(nextValue);
                  }}
                  onSubmit={() => {
                    if (!password) return;
                    loginMutation.mutate();
                  }}
                  placeholder="Scan badge or type ID…"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="operator-password" className="font-semibold">
                  Password / PIN
                </Label>
                <Input
                  id="operator-password"
                  name="operator-password"
                  type="password"
                  autoComplete="current-password"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => {
                    setError(null);
                    setPassword(e.target.value);
                  }}
                  placeholder="Enter password or PIN…"
                  className="min-h-12 w-full text-base"
                />
              </div>

              {error && (
                <Alert variant="destructive" className="rounded-lg">
                  {error}
                </Alert>
              )}

              <div className="mt-2 flex gap-3">
                <Button
                  type="submit"
                  className="flex-1 rounded-lg h-12"
                  disabled={loginMutation.isPending || !badge || !password}
                >
                  {loginMutation.isPending ? "Signing in…" : "Login"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-lg h-12"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  Logout Operator
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
