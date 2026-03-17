import { forwardRef } from "react";
import { Input } from "@/components/ui/input";

export const ScanInput = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder?: string }
>(({ value, onChange, onSubmit, placeholder }, ref) => {
  return (
    <Input
      ref={ref}
      className="w-full"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit();
      }}
      placeholder={placeholder ?? "Scan barcode"}
    />
  );
});
ScanInput.displayName = "ScanInput";
