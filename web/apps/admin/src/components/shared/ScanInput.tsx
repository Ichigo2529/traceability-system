import { forwardRef } from "react";
import { Input } from "../ui/input";

export const ScanInput = forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder?: string }>(
  ({ value, onChange, onSubmit, placeholder }, ref) => {
    return (
      <Input
        ref={ref}
        aria-label="Scan input"
        className="h-16 text-3xl font-semibold"
        value={value}
        autoFocus
        placeholder={placeholder ?? "Scan barcode"}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
      />
    );
  }
);
ScanInput.displayName = "ScanInput";
