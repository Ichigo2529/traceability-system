import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Cpu } from "lucide-react";
import { sdk } from "../../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

const schema = z.object({
  deviceCode: z.string().min(3, "Device code is required"),
  activationPin: z.string().min(4, "Activation PIN is required"),
});

type FormValues = z.infer<typeof schema>;

function getFingerprint() {
  return `${navigator.userAgent}-${window.screen.width}x${window.screen.height}`;
}

export function DeviceRegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const form = useForm<FormValues>({
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
      <div className="flex min-h-[80vh] items-center justify-center">
        <Card className="w-full max-w-xl border-red-300">
          <CardHeader>
            <CardTitle className="text-red-700">Device Disabled</CardTitle>
            <CardDescription>This device has been disabled by administrator. Contact factory IT/MES support.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cpu className="h-6 w-6" />
          </div>
          <CardTitle>Device Registration</CardTitle>
          <CardDescription>First boot activation. Enter device code and activation PIN to lock this terminal into station mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="deviceCode">Device Code</Label>
              <Input id="deviceCode" {...form.register("deviceCode")} placeholder="PI5-ASM-01" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activationPin">Activation PIN</Label>
              <Input id="activationPin" type="password" {...form.register("activationPin")} />
            </div>
            {error ? <p className="md:col-span-2 text-sm text-red-700">{error}</p> : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Activating..." : "Activate Device"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
