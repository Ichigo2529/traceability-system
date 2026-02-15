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
    <div className={`fixed inset-0 z-[60] flex items-center justify-center ${isPass ? "bg-green-700/95" : "bg-red-700/95"}`}>
      <div className="rounded-xl bg-white/95 p-10 text-center shadow-lg">
        <div className="mb-3 flex justify-center">
          {isPass ? <CheckCircle2 className="h-16 w-16 text-green-700" /> : <AlertTriangle className="h-16 w-16 text-red-700" />}
        </div>
        <h2 className="text-4xl font-bold">{title}</h2>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
        {!isPass ? (
          <Button className="mt-6" variant="secondary" onClick={onClose}>
            Acknowledge
          </Button>
        ) : null}
      </div>
    </div>
  );
}
