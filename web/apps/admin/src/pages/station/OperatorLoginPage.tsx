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
    MessageStrip,
    Grid
} from "@ui5/webcomponents-react";
import layouts from "../../styles/layouts.module.css";

function getShiftByTime(date: Date) {
  const h = date.getHours();
  if (h >= 6 && h < 14) return { code: "A", window: "06:00-14:00" };
  if (h >= 14 && h < 22) return { code: "B", window: "14:00-22:00" };
  return { code: "C", window: "22:00-06:00" };
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
      // UI5 Input focus might need a slight delay or checking strict mode ref
      setTimeout(() => {
           // Accessing the custom element's focus method if exposed, or the underlying input
           // InputDomRef isn't an HTMLInputElement directly, but UI5 web components usually have focus()
           // We might need to cast to any if TS complains about specific UI5 methods not in standard types
           // but InputDomRef should have it.
           // However, for safety in this strict protocol:
           (badgeRef.current as any)?.focus(); 
      }, 100);
    },
  });

  const shift = useMemo(() => getShiftByTime(new Date()), []);

  if (heartbeatQuery.isLoading || operatorQuery.isLoading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading station info...</div>;
  }

  if (heartbeatQuery.error) {
    return (
        <MessageStrip design="Negative">
            Cannot load station. Device token missing or invalid. Please register this device first.
        </MessageStrip>
    );
  }

  const station = heartbeatQuery.data?.station?.name || "Unassigned";
  const process = heartbeatQuery.data?.process?.name || "Unassigned";
  const status = heartbeatQuery.data?.status || "active";

  if (status === "disabled") {
    return (
        <MessageStrip design="Negative">
            Device Disabled. This station is disabled by administrator.
        </MessageStrip>
    );
  }

  return (
    <Page
      backgroundDesign="Transparent"
      header={
        <Bar
          style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
          startContent={<Title level="H2" style={{ color: 'var(--sapTitleColor)' }}>Operator Login</Title>}
        />
      }
      style={{ height: "100%", position: 'relative' }}
    >
      <div className="premium-mesh-bg" />
      
      <div className={layouts.station} style={{ padding: '2rem' }}>
          <Grid defaultSpan="XL6 L6 M12 S12" vSpacing="1rem" hSpacing="1rem" style={{ width: "100%", maxWidth: "1200px" }}>
            
            <Card header={<CardHeader titleText="Current Device" />} className={layouts.stationCard} style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                borderRadius: '24px'
            }}>
                <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                        <Label>Station:</Label>
                        <span style={{ fontWeight: "bold", color: 'var(--sapTitleColor)' }}>{station}</span>
                    </FlexBox>
                    <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                        <Label>Process:</Label>
                        <span style={{ fontWeight: "bold", color: 'var(--sapTitleColor)' }}>{process}</span>
                    </FlexBox>
                    <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                        <Label>Shift:</Label>
                        <span style={{ fontWeight: "bold", color: 'var(--sapTitleColor)' }}>{shift.code} ({shift.window})</span>
                    </FlexBox>
                    <div style={{ marginTop: "0.5rem" }}>
                        <StatusBadge status={status} />
                    </div>
                </div>
            </Card>

            <Card header={<CardHeader titleText="Badge Authentication" />} style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                borderRadius: '24px'
            }}>
                <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <FlexBox direction={FlexBoxDirection.Column}>
                        <Label>Badge / Employee ID</Label>
                        <ScanInput 
                            ref={badgeRef} 
                            value={badge} 
                            onChange={setBadge} 
                            onSubmit={() => loginMutation.mutate()} 
                            placeholder="Scan badge" 
                        />
                    </FlexBox>

                    <FlexBox direction={FlexBoxDirection.Column}>
                        <Label>Password / PIN</Label>
                        <Input
                            type="Password"
                            value={password}
                            onInput={(e) => setPassword(e.target.value)}
                        />
                    </FlexBox>
                    
                    {error && <MessageStrip design="Negative">{error}</MessageStrip>}

                    <FlexBox style={{ gap: "1rem", marginTop: "1rem" }}>
                        <Button 
                            design="Emphasized" 
                            onClick={() => loginMutation.mutate()}
                            disabled={loginMutation.isPending || !badge || !password}
                        >
                            {loginMutation.isPending ? "Signing in..." : "Login Operator"}
                        </Button>
                        <Button 
                            design="Transparent"
                            onClick={() => logoutMutation.mutate()}
                            disabled={logoutMutation.isPending}
                        >
                            Logout Current Operator
                        </Button>
                    </FlexBox>

                    {operatorQuery.data && (
                       <div style={{ color: "var(--sapContent_LabelColor)", fontSize: "0.875rem" }}>
                           Current operator session already active on this device.
                       </div>
                    )}
                </div>
            </Card>
          </Grid>
      </div>
    </Page>
  );
}
