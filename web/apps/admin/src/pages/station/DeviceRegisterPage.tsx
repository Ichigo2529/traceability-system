import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { sdk, useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Laptop, LogOut, XCircle } from "lucide-react";

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

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
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
      <div className="min-h-screen">
        <div className="premium-mesh-bg" />
        <div className="flex justify-center items-center min-h-full py-8 px-4">
          <div className="rounded-2xl p-8 max-w-[420px] w-full bg-card/80 backdrop-blur-md border border-border shadow-lg">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg, oklch(0.7 0.2 330), oklch(0.65 0.22 15))" }}
            >
              <XCircle className="text-white w-5 h-5" />
            </div>
            <Alert variant="destructive" className="rounded-[10px]">
              <AlertDescription>
                <strong>Device Disabled.</strong> This device has been disabled by the administrator. Contact factory
                IT/MES support.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="premium-mesh-bg" />
      <div className="min-h-full grid justify-center content-start gap-8 p-12">
        <Card className="w-[720px] max-w-full grid gap-6 bg-card/80 backdrop-blur-md border border-border shadow-lg rounded-2xl transition-shadow hover:shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary">
                <Laptop className="text-white w-4 h-4" />
              </div>
              <div>
                <CardTitle>Device Registration</CardTitle>
                <CardDescription>First boot activation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <p className="mb-5 text-muted-foreground text-sm leading-relaxed">
              Enter the device code and activation PIN to lock this terminal into station mode.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Controller
                name="deviceCode"
                control={control}
                render={({ field, fieldState: { error: err } }) => (
                  <div className="grid gap-1.5">
                    <Label className="font-semibold">Device Code</Label>
                    <Input
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="e.g. PI5-ASM-01"
                      className={err ? "border-destructive" : ""}
                    />
                    {err && <p className="text-sm text-destructive">{err.message}</p>}
                  </div>
                )}
              />

              <Controller
                name="activationPin"
                control={control}
                render={({ field, fieldState: { error: err } }) => (
                  <div className="grid gap-1.5">
                    <Label className="font-semibold">Activation PIN</Label>
                    <Input
                      type="password"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="••••"
                      className={err ? "border-destructive" : ""}
                    />
                    {err && <p className="text-sm text-destructive">{err.message}</p>}
                  </div>
                )}
              />

              {error && (
                <Alert variant="destructive" className="rounded-lg">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="rounded-[10px] h-12 mt-1" disabled={isSubmitting}>
                {isSubmitting ? "Activating…" : "Activate Device"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
