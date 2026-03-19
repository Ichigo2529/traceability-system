import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const ScanInput = forwardRef<
  HTMLInputElement,
  {
    id?: string;
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    name?: string;
    className?: string;
    ariaLabel?: string;
    disabled?: boolean;
    autoComplete?: string;
  }
>(({ id, value, onChange, onSubmit, placeholder, name, className, ariaLabel, disabled, autoComplete = "off" }, ref) => {
  return (
    <Input
      ref={ref}
      id={id}
      name={name}
      autoComplete={autoComplete}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="done"
      disabled={disabled}
      aria-label={ariaLabel ?? placeholder ?? "Scan barcode"}
      className={cn("w-full min-h-12 text-base touch-manipulation", className)}
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
