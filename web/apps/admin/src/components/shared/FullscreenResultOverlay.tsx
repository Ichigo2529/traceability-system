import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

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
  const isPass = mode === "PASS";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showClose={false}
        className={cn(
          "fixed inset-0 z-[5000] flex h-screen w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center gap-0 rounded-none border-0 p-6 shadow-none",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100",
          isPass ? "bg-green-600/95" : "bg-red-700/95"
        )}
      >
        <div
          className="flex max-w-5xl flex-col items-center gap-4 text-center text-white"
          aria-live={open ? "assertive" : undefined}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {description ? <DialogDescription className="sr-only">{description}</DialogDescription> : null}

          {isPass ? (
            <CheckCircle2 className="h-32 w-32 text-white" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-32 w-32 text-white" aria-hidden="true" />
          )}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
              {isPass ? "Operation Passed" : "Operator Attention Required"}
            </p>
            <h1 className="text-6xl font-black leading-none text-white md:text-8xl">{title}</h1>
          </div>
          {description && <p className="max-w-3xl text-xl text-white/90 md:text-2xl">{description}</p>}
          {!isPass && (
            <Button
              variant="outline"
              onClick={onClose}
              className="mt-8 min-h-12 border-white/60 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white"
            >
              Acknowledge
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
