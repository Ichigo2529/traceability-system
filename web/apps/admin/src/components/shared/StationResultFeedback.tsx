import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type StationResultFeedbackState = {
  mode: "PASS" | "NG";
  title: string;
  description?: string;
};

export function StationResultFeedback({
  result,
  className,
}: {
  result: StationResultFeedbackState | null;
  className?: string;
}) {
  if (!result) return null;

  const isPass = result.mode === "PASS";

  return (
    <Alert
      variant={isPass ? "success" : "destructive"}
      aria-live={isPass ? "polite" : "assertive"}
      className={cn("min-h-12", className)}
    >
      {isPass ? <CheckCircle2 aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
      <AlertTitle>{result.title}</AlertTitle>
      {result.description ? <AlertDescription>{result.description}</AlertDescription> : null}
    </Alert>
  );
}
