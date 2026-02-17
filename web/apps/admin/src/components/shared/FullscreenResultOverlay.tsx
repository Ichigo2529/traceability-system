import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";

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
    <div className={`admin-result-overlay ${isPass ? "is-pass" : "is-ng"}`}>
      <div className="admin-result-overlay-panel">
        <div className="admin-result-overlay-icon-shell">
          {isPass ? (
            <CheckCircle2 className="admin-result-overlay-icon is-pass" />
          ) : (
            <AlertTriangle className="admin-result-overlay-icon is-ng" />
          )}
        </div>
        <h2 className="admin-result-overlay-title">{title}</h2>
        {description ? <p className="admin-result-overlay-description">{description}</p> : null}
        {!isPass ? (
          <Button className="admin-result-overlay-action" variant="secondary" onClick={onClose}>
            Acknowledge
          </Button>
        ) : null}
      </div>
    </div>
  );
}
