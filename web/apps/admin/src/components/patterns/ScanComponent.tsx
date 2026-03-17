import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Barcode, CheckCircle2 } from "lucide-react";

export type ScanStatus = "IDLE" | "PROCESSING" | "VALID" | "INVALID";

interface ScanComponentProps {
  onScan: (value: string) => Promise<{ success: boolean; message?: string }>;
  label?: string;
  placeholder?: string;
  resetOnSuccess?: boolean;
  disabled?: boolean;
}

export function ScanComponent({
  onScan,
  label = "Scan Barcode",
  placeholder = "Waiting for scan...",
  resetOnSuccess = true,
  disabled = false,
}: ScanComponentProps) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<ScanStatus>("IDLE");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && status !== "PROCESSING") {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [disabled, status]);

  const handleScan = async () => {
    if (!value.trim() || status === "PROCESSING") return;
    setStatus("PROCESSING");
    setMessage(undefined);
    try {
      const result = await onScan(value);
      if (result.success) {
        setStatus("VALID");
        if (result.message) setMessage(result.message);
        if (resetOnSuccess) {
          setTimeout(() => {
            setValue("");
            setStatus("IDLE");
            setMessage(undefined);
          }, 1500);
        }
      } else {
        setStatus("INVALID");
        setMessage(result.message || "Invalid scan code");
      }
    } catch (error) {
      setStatus("INVALID");
      setMessage("System error during scan validation");
      console.error(error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleScan();
  };

  return (
    <Card className="w-full max-w-[720px] backdrop-blur-md bg-card/80 border border-border shadow-lg rounded-2xl">
      <CardHeader className="flex flex-row items-center gap-2">
        <Barcode className="h-5 w-5" />
        <h3 className="text-base font-semibold">{label}</h3>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-4">
          {status === "PROCESSING" && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
          {status !== "PROCESSING" && (
            <>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    if (status !== "IDLE") setStatus("IDLE");
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className={`flex-1 ${status === "INVALID" ? "border-destructive" : ""} ${status === "VALID" ? "border-green-500" : ""}`}
                  disabled={disabled}
                />
                <Button onClick={handleScan} disabled={disabled || !value}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Submit
                </Button>
              </div>
              {message && (
                <Alert
                  variant={status === "VALID" ? "default" : "destructive"}
                  className={status === "VALID" ? "border-green-500 bg-green-50 dark:bg-green-950/30" : ""}
                >
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
