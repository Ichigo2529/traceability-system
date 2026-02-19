import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { sdk, useAuth } from "../../context/AuthContext";
import { 
    Page, 
    Card, 
    CardHeader, 
    Input, 
    Label, 
    Button, 
    MessageStrip, 
    FlexBox, 
    FlexBoxDirection, 
    Icon 
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/laptop.js";
import "@ui5/webcomponents-icons/dist/log.js";
import layouts from "../../styles/layouts.module.css";

const schema = z.object({
  deviceCode: z.string().min(3, "Device code is required"),
  activationPin: z.string().min(4, "Activation PIN is required"),
});

type FormValues = z.infer<typeof schema>;

function getFingerprint() {
  return `${navigator.userAgent}-${window.screen.width}x${window.screen.height}`;
}

export function DeviceRegisterPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { deviceCode: "", activationPin: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setLocked(false);
    try {
      await sdk.device.activate({
        device_code: values.deviceCode,
        activation_pin: values.activationPin,
        hostname: window.location.hostname,
        fingerprint: getFingerprint(),
      });
      navigate("/station/login", { replace: true });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "DEVICE_DISABLED") {
        setLocked(true);
        return;
      }
      setError(e.message || "Activation failed");
    }
  };

  if (locked) {
    return (
      <Page style={{ height: "100vh" }} backgroundDesign="Transparent">
        <div className="premium-mesh-bg" />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", padding: "2rem" }}>
          <div style={{
            background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)",
            border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)",
            borderRadius: "20px", padding: "2rem", maxWidth: "420px", width: "100%"
          }}>
            <div style={{
              width: "3rem", height: "3rem", borderRadius: "12px",
              background: "linear-gradient(135deg,#f093fb,#f5576c)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "1rem"
            }}>
              <Icon name="decline" style={{ color: "white", width: "1.25rem", height: "1.25rem" }} />
            </div>
            <MessageStrip design="Negative" hideCloseButton style={{ borderRadius: "10px" }}>
              <strong>Device Disabled.</strong> This device has been disabled by the administrator.
              Contact factory IT/MES support.
            </MessageStrip>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page style={{ height: "100vh" }} backgroundDesign="Transparent">
        <div className="premium-mesh-bg" />
        <div className={layouts.station}>
            <Card className={layouts.stationCard}>
                <CardHeader
                    titleText="Device Registration"
                    subtitleText="First boot activation"
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
                
                <div style={{ padding: "1rem 1.25rem 1.5rem 1.25rem" }}>
                    <div style={{ marginBottom: "1.25rem", color: "var(--sapContent_LabelColor)", fontSize: "0.875rem", lineHeight: "1.5" }}>
                        Enter the device code and activation PIN to lock this terminal into station mode.
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                        <Controller
                            name="deviceCode"
                            control={control}
                            render={({ field, fieldState: { error } }) => (
                                <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.375rem" }}>
                                    <Label style={{ fontWeight: 600 }}>Device Code</Label>
                                    <Input
                                        {...field}
                                        onInput={(e) => field.onChange(e.target.value)}
                                        valueState={error ? "Negative" : "None"}
                                        valueStateMessage={error && <div>{error.message}</div>}
                                        placeholder="e.g. PI5-ASM-01"
                                        style={{ width: "100%" }}
                                    />
                                </FlexBox>
                            )}
                        />

                        <Controller
                            name="activationPin"
                            control={control}
                            render={({ field, fieldState: { error } }) => (
                                <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.375rem" }}>
                                    <Label style={{ fontWeight: 600 }}>Activation PIN</Label>
                                    <Input
                                        type="Password"
                                        {...field}
                                        onInput={(e) => field.onChange(e.target.value)}
                                        valueState={error ? "Negative" : "None"}
                                        valueStateMessage={error && <div>{error.message}</div>}
                                        placeholder="••••"
                                        style={{ width: "100%" }}
                                    />
                                </FlexBox>
                            )}
                        />

                        {error && (
                          <MessageStrip design="Negative" style={{ borderRadius: "8px" }}>{error}</MessageStrip>
                        )}

                        <Button
                          design="Emphasized"
                          style={{ borderRadius: "10px", height: "3rem", marginTop: "0.25rem" }}
                          onClick={() => handleSubmit(onSubmit)()}
                          disabled={isSubmitting}
                        >
                            {isSubmitting ? "Activating…" : "Activate Device"}
                        </Button>
                    </form>
                </div>
            </Card>

            <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
                <Button design="Transparent" icon="log" onClick={() => {
                    logout();
                    navigate("/login", { replace: true });
                }}>
                    Sign Out
                </Button>
            </div>
        </div>
    </Page>
  );
}
