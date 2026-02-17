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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh", padding: "1rem" }}>
         <MessageStrip design="Negative" hideCloseButton>
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Device Disabled</div>
            This device has been disabled by administrator. Contact factory IT/MES support.
         </MessageStrip>
      </div>
    );
  }

  return (
    <Page style={{ height: "100vh" }} backgroundDesign="Transparent">
        <div className={layouts.station}>
            <Card className={layouts.stationCard}>
                <CardHeader 
                    titleText="Device Registration" 
                    subtitleText="First boot activation" 
                    avatar={<Icon name="laptop" />}
                />
                
                <div style={{ padding: "1rem" }}>
                    <div style={{ marginBottom: "1rem", color: "var(--sapContent_LabelColor)", fontSize: "0.875rem" }}>
                        Enter device code and activation PIN to lock this terminal into station mode.
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        
                        <Controller
                            name="deviceCode"
                            control={control}
                            render={({ field, fieldState: { error } }) => (
                                <FlexBox direction={FlexBoxDirection.Column}>
                                    <Label>Device Code</Label>
                                    <Input 
                                        {...field} 
                                        onInput={(e) => field.onChange(e.target.value)}
                                        valueState={error ? "Negative" : "None"}
                                        valueStateMessage={error && <div>{error.message}</div>}
                                        placeholder="PI5-ASM-01"
                                    />
                                </FlexBox>
                            )}
                        />

                        <Controller
                            name="activationPin"
                            control={control}
                            render={({ field, fieldState: { error } }) => (
                                <FlexBox direction={FlexBoxDirection.Column}>
                                    <Label>Activation PIN</Label>
                                    <Input 
                                        type="Password"
                                        {...field} 
                                        onInput={(e) => field.onChange(e.target.value)}
                                        valueState={error ? "Negative" : "None"}
                                        valueStateMessage={error && <div>{error.message}</div>}
                                    />
                                </FlexBox>
                            )}
                        />

                        {error && <MessageStrip design="Negative">{error}</MessageStrip>}

                        <Button design="Emphasized" onClick={() => handleSubmit(onSubmit)()} disabled={isSubmitting}>
                            {isSubmitting ? "Activating..." : "Activate Device"}
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
