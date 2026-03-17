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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="flex min-h-screen w-screen items-center justify-center overflow-hidden p-4 relative">
      <ThreeBackground />

      <Card className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-2xl shadow-2xl backdrop-blur-md bg-white/90 border border-white/60">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="flex justify-center">
            <img src="/logo.png" alt="MMI Logo" className="h-16 w-auto drop-shadow-sm" />
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight text-foreground">Traceability System</CardTitle>
          <CardDescription className="text-sm uppercase tracking-wider text-muted-foreground">
            Secure Sign In
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-4">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Controller
              name="username"
              control={control}
              render={({ field, fieldState: { error: err } }) => (
                <div className="grid gap-2">
                  <Label htmlFor="login-username" className="text-foreground">
                    Username
                  </Label>
                  <Input
                    id="login-username"
                    {...field}
                    className="h-10 bg-background border-input"
                    placeholder="Enter your username"
                    autoComplete="username"
                    aria-invalid={!!err}
                  />
                  {err && (
                    <p className="text-sm text-destructive" role="alert">
                      {err.message}
                    </p>
                  )}
                </div>
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field, fieldState: { error: err } }) => (
                <div className="grid gap-2">
                  <Label htmlFor="login-password" className="text-foreground">
                    Password
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    className="h-10 bg-background border-input"
                    placeholder="••••••••"
                    {...field}
                    autoComplete="current-password"
                    aria-invalid={!!err}
                  />
                  {err && (
                    <p className="text-sm text-destructive" role="alert">
                      {err.message}
                    </p>
                  )}
                </div>
              )}
            />

            {error && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="h-10 w-full font-medium mt-1 shadow-md hover:shadow-lg transition-shadow"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-0.5 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          <div>MMI Precision Assembly (Thailand) Co., Ltd.</div>
          <div>Copyright &copy; 2026</div>
        </CardFooter>
      </Card>
    </div>
  );
}
