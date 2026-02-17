import { forwardRef, useEffect, useRef } from "react";
import { Input, InputDomRef } from "@ui5/webcomponents-react";

export const ScanInput = forwardRef<InputDomRef, { value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder?: string }>(
  ({ value, onChange, onSubmit, placeholder }, ref) => {
    const internalRef = useRef<InputDomRef>(null);

    useEffect(() => {
        if (ref) {
           // Handle both function and object refs if necessary, though simpler to just rely on internal for autoFocus
           if (typeof ref === 'function') ref(internalRef.current);
           else if (ref) ref.current = internalRef.current;
        }
       // Auto-focus logic could go here if needed, but the prop usually suffices
       // For strict kiosk mode, we might want a focus interval
    }, [ref]);

    return (
      <Input
        ref={internalRef}
        className="admin-scan-input"
        value={value}
        onInput={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
        placeholder={placeholder ?? "Scan barcode"}
      />
    );
  }
);
ScanInput.displayName = "ScanInput";
