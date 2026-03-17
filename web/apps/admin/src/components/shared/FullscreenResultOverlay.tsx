import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FullscreenResultOverlay({
  open,
  mode,
  title,
  description,
  onClose,
}: {
  open: boolean;
  mode: "PASS" | "NG";
  title: string;
  description?: string;
  onClose: () => void;
}) {
  if (!open) return null;
  const isPass = mode === "PASS";

  return (
    <div
      className="admin-result-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 5000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isPass ? "rgba(71, 153, 71, 0.95)" : "rgba(187, 0, 0, 0.95)",
        color: "white",
      }}
    >
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        {isPass ? (
          <CheckCircle2 className="w-32 h-32 text-white" />
        ) : (
          <AlertTriangle className="w-32 h-32 text-white" />
        )}
        <h1 style={{ fontSize: "5rem", color: "white", margin: 0 }}>{title}</h1>
        {description && <p style={{ fontSize: "1.5rem", color: "white", margin: 0 }}>{description}</p>}
        {!isPass && (
          <Button variant="destructive" onClick={onClose} className="mt-8 h-12 px-8 text-white border-white">
            Acknowledge
          </Button>
        )}
      </div>
    </div>
  );
}
