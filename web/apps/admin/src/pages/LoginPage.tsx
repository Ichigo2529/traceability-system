import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../context/AuthContext";
import { 
    Button, 
    Card, 
    Input, 
    Label, 
    MessageStrip,
    FlexBox,
    FlexBoxDirection,
    Title
} from "@ui5/webcomponents-react";
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
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh", 
      width: "100vw",
      padding: "1rem",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Premium Mesh Background Overlay */}
      <div className="premium-mesh-bg" />

      <Card style={{ 
        width: "100%", 
        maxWidth: "400px",
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)', // Safari support
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        borderRadius: '28px',
        padding: '1rem',
        animation: 'fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        <div style={{ textAlign: 'center', padding: '1.5rem 1rem 1rem 1rem' }}>
            <img 
                src="/logo.png" 
                alt="MMI Logo" 
                style={{ 
                    height: '80px', 
                    width: 'auto',
                    marginBottom: '1rem',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                }} 
            />
            <Title level="H2" style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--sapContent_TitleColor)' }}>Traceability System</Title>
            <Label style={{ fontSize: '0.875rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secure Sign In</Label>
        </div>

        <div style={{ padding: "0 1rem 1.5rem 1rem" }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            <Controller
                name="username"
                control={control}
                render={({ field, fieldState: { error } }) => (
                    <FlexBox direction={FlexBoxDirection.Column} style={{ gap: '0.4rem', width: '100%' }}>
                        <Label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Username</Label>
                        <Input 
                            {...field} 
                            style={{ 
                                borderRadius: '10px', 
                                height: '3.25rem',
                                width: '100%',
                                fontSize: '1rem'
                            } as any}
                            placeholder="Enter your username"
                            onInput={(e) => field.onChange((e.target as any).value)}
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
                    <FlexBox direction={FlexBoxDirection.Column} style={{ gap: '0.4rem', width: '100%' }}>
                        <Label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Password</Label>
                        <Input 
                            type="Password"
                            style={{ 
                                borderRadius: '10px', 
                                height: '3.25rem',
                                width: '100%',
                                fontSize: '1rem'
                            } as any}
                            placeholder="••••••••"
                            {...field} 
                            onInput={(e) => field.onChange((e.target as any).value)}
                            valueState={error ? "Negative" : "None"}
                            valueStateMessage={error && <div>{error.message}</div>}
                        />
                    </FlexBox>
                )}
            />

            {error && <MessageStrip design="Negative" style={{ borderRadius: '8px', width: '100%' }}>{error}</MessageStrip>}

            <Button 
                design="Emphasized" 
                style={{ 
                    height: '3.25rem', 
                    width: '100%',
                    borderRadius: '10px', 
                    fontWeight: 600,
                    fontSize: '1rem',
                    boxShadow: '0 8px 20px rgba(0, 94, 184, 0.25)',
                    transition: 'all 0.25s ease',
                    marginTop: '0.5rem'
                }} 
                onClick={() => handleSubmit(onSubmit)()} 
                disabled={isSubmitting}
            >
                {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
        
        <div style={{ 
            borderTop: '1px solid var(--glass-border)', 
            padding: '1.5rem 0 0.5rem 0', 
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--sapContent_LabelColor)',
            opacity: 0.8
        }}>
            <div>MMI Precision Assembly (Thailand) Co., Ltd.</div>
            <div style={{ marginTop: '0.25rem' }}>Copyright © 2026</div>
        </div>
      </Card>
    </div>
  );
}
