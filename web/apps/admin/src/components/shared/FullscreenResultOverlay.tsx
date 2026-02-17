import { Button, Icon, Title, Text } from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/accept.js";
import "@ui5/webcomponents-icons/dist/alert.js";

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
    <div className={`admin-result-overlay ${isPass ? "is-pass" : "is-ng"}`} style={{
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
        color: "white"
    }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <Icon 
            name={isPass ? "accept" : "alert"} 
            style={{ width: "8rem", height: "8rem", color: "white" }} 
        />
        <Title level="H1" style={{ fontSize: "5rem", color: "white" }}>{title}</Title>
        {description && <Text style={{ fontSize: "1.5rem", color: "white" }}>{description}</Text>}
        {!isPass && (
          <Button 
            design="Negative" 
            onClick={onClose}
            style={{ marginTop: "2rem", height: "3rem", padding: "0 2rem" }}
          >
            Acknowledge
          </Button>
        )}
      </div>
    </div>
  );
}
