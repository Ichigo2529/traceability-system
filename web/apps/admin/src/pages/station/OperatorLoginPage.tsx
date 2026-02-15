import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { ScanInput } from "../../components/shared/ScanInput";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ErrorState, LoadingSkeleton } from "../../components/shared/States";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

function getShiftByTime(date: Date) {
  const h = date.getHours();
  if (h >= 6 && h < 14) return { code: "A", window: "06:00-14:00" };
  if (h >= 14 && h < 22) return { code: "B", window: "14:00-22:00" };
  return { code: "C", window: "22:00-06:00" };
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
      badgeRef.current?.focus();
    },
  });

  const shift = useMemo(() => getShiftByTime(new Date()), []);

  if (heartbeatQuery.isLoading || operatorQuery.isLoading) {
    return <LoadingSkeleton label="Preparing station..." />;
  }

  if (heartbeatQuery.error) {
    return <ErrorState title="Cannot load station" description="Device token missing or invalid. Please register this device first." />;
  }

  const station = heartbeatQuery.data?.station?.name || "Unassigned";
  const process = heartbeatQuery.data?.process?.name || "Unassigned";
  const status = heartbeatQuery.data?.status || "active";

  if (status === "disabled") {
    return <ErrorState title="Device Disabled" description="This station is disabled by administrator." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Operator Login" description="Badge scan login for station operation." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Current Device</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Station: <span className="font-semibold">{station}</span>
            </p>
            <p>
              Process: <span className="font-semibold">{process}</span>
            </p>
            <p>
              Shift: <span className="font-semibold">{shift.code}</span> ({shift.window})
            </p>
            <div className="pt-1">
              <StatusBadge status={status} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Badge Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Badge / Employee ID</Label>
              <ScanInput ref={badgeRef} value={badge} onChange={setBadge} onSubmit={() => loginMutation.mutate()} placeholder="Scan badge" />
            </div>
            <div className="space-y-2">
              <Label>Password / PIN</Label>
              <Input type="password" className="h-12 text-xl" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <div className="flex gap-2">
              <Button onClick={() => loginMutation.mutate()} disabled={loginMutation.isPending || !badge || !password}>
                {loginMutation.isPending ? "Signing in..." : "Login Operator"}
              </Button>
              <Button variant="outline" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
                Logout Current Operator
              </Button>
            </div>
            {operatorQuery.data ? (
              <p className="text-sm text-muted-foreground">Current operator session already active on this device.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
