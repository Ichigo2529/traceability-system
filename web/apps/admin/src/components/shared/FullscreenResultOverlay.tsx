import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      className={cn(
        "fixed inset-0 z-[5000] flex items-center justify-center",
        isPass ? "bg-green-600/95" : "bg-red-700/95"
      )}
    >
      <div className="flex flex-col items-center gap-4 text-center text-white">
        {isPass ? (
          <CheckCircle2 className="w-32 h-32 text-white" />
        ) : (
          <AlertTriangle className="w-32 h-32 text-white" />
        )}
        <h1 className="text-8xl font-black text-white m-0 leading-none">{title}</h1>
        {description && <p className="text-2xl text-white/90 m-0">{description}</p>}
        {!isPass && (
          <Button
            variant="outline"
            onClick={onClose}
            className="mt-8 h-12 px-8 text-white border-white/60 bg-transparent hover:bg-white/10"
          >
            Acknowledge
          </Button>
        )}
      </div>
    </div>
  );
}
