import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../context/AuthContext";
import { ThreeBackground } from "../components/ThreeBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(3, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await login(values.username, values.password);
      const nextUserRaw = localStorage.getItem("user_info");
      const nextUser = nextUserRaw ? (JSON.parse(nextUserRaw) as { roles?: string[] }) : null;
      const roleSet = new Set((nextUser?.roles ?? []).map((role) => String(role).toUpperCase()));
      const isAdmin = roleSet.has("ADMIN");
      const isStore = roleSet.has("STORE");
      navigate(isAdmin ? "/admin" : isStore ? "/station/material/store" : "/station/material/request");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen w-screen p-4 relative overflow-hidden">
      <ThreeBackground />

      <Card
        className="w-full max-w-[400px] border-border/50 backdrop-blur-xl rounded-3xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{
          background: "rgba(10, 15, 30, 0.55)",
          border: "1px solid rgba(79, 172, 254, 0.15)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(79, 172, 254, 0.06)",
          color: "#e8eaf6",
        }}
      >
        <CardContent className="pt-6 pb-2">
          <div className="text-center px-4 pt-6">
            <img
              src="/logo.png"
              alt="MMI Logo"
              className="h-20 w-auto mb-4 drop-shadow-[0_4px_16px_rgba(79,172,254,0.3)]"
            />
            <h2 className="text-xl font-bold tracking-tight text-white m-0">Traceability System</h2>
            <Label className="text-sm text-white/70 uppercase tracking-wider">Secure Sign In</Label>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 px-4 pb-6 pt-4">
            <Controller
              name="username"
              control={control}
              render={({ field, fieldState: { error: err } }) => (
                <div className="grid gap-2 w-full">
                  <Label className="font-semibold text-sm text-white/85">Username</Label>
                  <Input
                    {...field}
                    className="rounded-[10px] h-[3.25rem] w-full text-base bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Enter your username"
                    onChange={(e) => field.onChange(e.target.value)}
                    autoComplete="username"
                  />
                  {err && <p className="text-sm text-destructive">{err.message}</p>}
                </div>
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field, fieldState: { error: err } }) => (
                <div className="grid gap-2 w-full">
                  <Label className="font-semibold text-sm text-white/85">Password</Label>
                  <Input
                    type="password"
                    className="rounded-[10px] h-[3.25rem] w-full text-base bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="••••••••"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
                    autoComplete="current-password"
                  />
                  {err && <p className="text-sm text-destructive">{err.message}</p>}
                </div>
              )}
            />

            {error && (
              <Alert variant="destructive" className="rounded-lg w-full">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="h-[3.25rem] w-full rounded-[10px] font-semibold text-base mt-2 shadow-lg hover:opacity-90 transition-opacity"
              style={{ boxShadow: "0 8px 25px rgba(79, 172, 254, 0.3)" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-1 pt-6 pb-2 text-center text-xs text-white/50 border-t border-white/10">
          <div>MMI Precision Assembly (Thailand) Co., Ltd.</div>
          <div>Copyright &copy; 2026</div>
        </CardFooter>
      </Card>
    </div>
  );
}
