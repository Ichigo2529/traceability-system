import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../context/AuthContext";
import { 
    Button, 
    Card, 
    CardHeader, 
    Input, 
    Label, 
    MessageStrip,
    FlexBox,
    FlexBoxDirection,
    Icon
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/shield.js";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(3, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
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
    } catch (e: any) {
      setError(e?.message ?? "Login failed");
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "var(--sapBackgroundColor)", padding: "1rem" }}>
      <Card style={{ width: "100%", maxWidth: "400px" }}>
        <CardHeader 
            titleText="Traceability Sign In" 
            subtitleText="Use your enterprise account"
            avatar={<Icon name="shield" style={{ width: "2rem", height: "2rem", color: "var(--sapBrandColor)" }} />}
        />
        <div style={{ padding: "1rem" }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            <Controller
                name="username"
                control={control}
                render={({ field, fieldState: { error } }) => (
                    <FlexBox direction={FlexBoxDirection.Column}>
                        <Label required>Username</Label>
                        <Input 
                            {...field} 
                            onInput={(e) => field.onChange(e.target.value)}
                            valueState={error ? "Negative" : "None"}
                            valueStateMessage={error && <div>{error.message}</div>}
                        />
                    </FlexBox>
                )}
            />

            <Controller
                name="password"
                control={control}
                render={({ field, fieldState: { error } }) => (
                    <FlexBox direction={FlexBoxDirection.Column}>
                        <Label required>Password</Label>
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
                {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>

            <div style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--sapContent_LabelColor)", marginTop: "0.5rem" }}>
                Use user account from backend (role-based access: ADMIN / PRODUCTION / STORE).
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
