import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";

import { ScanInput } from "../../components/shared/ScanInput";
import { StatusBadge } from "../../components/shared/StatusBadge";
import {
  Page,
  Bar,
  Title,
  Card,
  CardHeader,
  Label,
  Input,
  Button,
  InputDomRef,
  FlexBox,
  FlexBoxDirection,
  FlexBoxAlignItems,
  FlexBoxJustifyContent,
  MessageStrip,
  BusyIndicator,
  Icon,
} from "@ui5/webcomponents-react";
import layouts from "../../styles/layouts.module.css";

function getShiftByTime(date: Date) {
  const h = date.getHours();
  if (h >= 6 && h < 14) return { code: "A", window: "06:00–14:00" };
  if (h >= 14 && h < 22) return { code: "B", window: "14:00–22:00" };
  return { code: "C", window: "22:00–06:00" };
}

// ─── Shared inline glass style (avoids repetition) ──────────────────────────
const glassStyle: React.CSSProperties = {
  background: "var(--glass-bg)",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
  borderRadius: "20px",
};

// ─── Centred loading/error shell ─────────────────────────────────────────────
function StationShell({ children }: { children: React.ReactNode }) {
  return (
    <Page backgroundDesign="Transparent" style={{ height: "100%", position: "relative" }}>
      <div className="premium-mesh-bg" />
      <FlexBox
        alignItems={FlexBoxAlignItems.Center}
        justifyContent={FlexBoxJustifyContent.Center}
        style={{ height: "100%", padding: "2rem" }}
      >
        {children}
      </FlexBox>
    </Page>
  );
}

export function OperatorLoginPage() {
  const navigate = useNavigate();
  const badgeRef = useRef<InputDomRef>(null);
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
      setTimeout(() => { (badgeRef.current as any)?.focus(); }, 100);
    },
  });

  const shift = useMemo(() => getShiftByTime(new Date()), []);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (heartbeatQuery.isLoading || operatorQuery.isLoading) {
    return (
      <StationShell>
        <FlexBox direction={FlexBoxDirection.Column} alignItems={FlexBoxAlignItems.Center} style={{ gap: "1rem" }}>
          <BusyIndicator active delay={0} size="L" />
          <Label style={{ opacity: 0.65 }}>Loading station info…</Label>
        </FlexBox>
      </StationShell>
    );
  }

  // ── Hard error (no heartbeat) ─────────────────────────────────────────────
  if (heartbeatQuery.error) {
    return (
      <StationShell>
        <div style={{ ...glassStyle, padding: "2rem", maxWidth: "480px", width: "100%" }}>
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{
              width: "2.5rem", height: "2.5rem", borderRadius: "10px",
              background: "linear-gradient(135deg,#f093fb,#f5576c)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Icon name="warning" style={{ color: "white", width: "1.25rem", height: "1.25rem" }} />
            </div>
            <Title level="H4" style={{ margin: 0 }}>Station Unavailable</Title>
          </FlexBox>
          <MessageStrip design="Negative" hideCloseButton style={{ borderRadius: "10px" }}>
            Cannot connect to station. Device token missing or invalid. Please register this device first.
          </MessageStrip>
          <Button
            design="Emphasized"
            style={{ width: "100%", marginTop: "1.25rem", borderRadius: "10px" }}
            onClick={() => navigate("/station/register")}
          >
            Register Device
          </Button>
        </div>
      </StationShell>
    );
  }

  const station = heartbeatQuery.data?.station?.name || "Unassigned";
  const process = heartbeatQuery.data?.process?.name || "Unassigned";
  const status  = heartbeatQuery.data?.status || "active";

  // ── Device disabled ───────────────────────────────────────────────────────
  if (status === "disabled") {
    return (
      <StationShell>
        <div style={{ ...glassStyle, padding: "2rem", maxWidth: "480px", width: "100%" }}>
          <MessageStrip design="Negative" hideCloseButton style={{ borderRadius: "10px" }}>
            This device has been <strong>disabled</strong> by the administrator. Contact your supervisor.
          </MessageStrip>
        </div>
      </StationShell>
    );
  }

  // ── Main login layout ──────────────────────────────────────────────────────
  return (
    <Page
      backgroundDesign="Transparent"
      header={
        <Bar
          style={{ background: "transparent", borderBottom: "1px solid var(--glass-border)" }}
          startContent={<Title level="H2" style={{ color: "var(--sapTitleColor)" }}>Operator Login</Title>}
        />
      }
      style={{ height: "100%", position: "relative" }}
    >
      <div className="premium-mesh-bg" />

      <div className={layouts.station} style={{ padding: "2rem", paddingTop: "3rem" }}>
        {/* ── Device Info Card ── */}
        <Card
          className={layouts.stationCard}
          header={
            <CardHeader
              titleText="Current Device"
              subtitleText={`Shift ${shift.code} · ${shift.window}`}
              avatar={
                <div style={{
                  width: "2.25rem", height: "2.25rem", borderRadius: "8px",
                  background: "linear-gradient(135deg,#4facfe,#00f2fe)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Icon name="laptop" style={{ color: "white", width: "1rem", height: "1rem" }} />
                </div>
              }
            />
          }
        >
          <div style={{ padding: "0.75rem 1.25rem 1.25rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
              <Icon name="factory" style={{ width: "1rem", height: "1rem", color: "var(--icon-orange)" }} />
              <Label style={{ fontWeight: 600 }}>Station:</Label>
              <span style={{ color: "var(--sapTitleColor)", fontWeight: 700 }}>{station}</span>
            </FlexBox>
            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
              <Icon name="process" style={{ width: "1rem", height: "1rem", color: "var(--icon-green)" }} />
              <Label style={{ fontWeight: 600 }}>Process:</Label>
              <span style={{ color: "var(--sapTitleColor)", fontWeight: 700 }}>{process}</span>
            </FlexBox>
            <div style={{ marginTop: "0.25rem" }}>
              <StatusBadge status={status} />
            </div>
          </div>
        </Card>

        {/* ── Auth Card ── */}
        <Card
          className={layouts.stationCard}
          header={
            <CardHeader
              titleText="Badge Authentication"
              subtitleText="Scan badge or enter Employee ID"
              avatar={
                <div style={{
                  width: "2.25rem", height: "2.25rem", borderRadius: "8px",
                  background: "linear-gradient(135deg,#667eea,#764ba2)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Icon name="employee" style={{ color: "white", width: "1rem", height: "1rem" }} />
                </div>
              }
            />
          }
        >
          <div style={{ padding: "0.75rem 1.25rem 1.25rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

            {operatorQuery.data && (
              <MessageStrip design="Information" hideCloseButton style={{ borderRadius: "8px" }}>
                An operator session is currently active on this device.
              </MessageStrip>
            )}

            <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.375rem" }}>
              <Label style={{ fontWeight: 600 }}>Badge / Employee ID</Label>
              <ScanInput
                ref={badgeRef}
                value={badge}
                onChange={setBadge}
                onSubmit={() => loginMutation.mutate()}
                placeholder="Scan badge or type ID…"
              />
            </FlexBox>

            <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.375rem" }}>
              <Label style={{ fontWeight: 600 }}>Password / PIN</Label>
              <Input
                type="Password"
                value={password}
                onInput={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                style={{ width: "100%" }}
              />
            </FlexBox>

            {error && (
              <MessageStrip design="Negative" style={{ borderRadius: "8px" }}>
                {error}
              </MessageStrip>
            )}

            <FlexBox style={{ gap: "0.75rem", marginTop: "0.5rem" }}>
              <Button
                design="Emphasized"
                style={{ flex: 1, borderRadius: "10px", height: "3rem" }}
                onClick={() => loginMutation.mutate()}
                disabled={loginMutation.isPending || !badge || !password}
              >
                {loginMutation.isPending ? "Signing in…" : "Login"}
              </Button>
              <Button
                design="Default"
                style={{ borderRadius: "10px", height: "3rem" }}
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                Logout Operator
              </Button>
            </FlexBox>

          </div>
        </Card>
      </div>
    </Page>
  );
}
