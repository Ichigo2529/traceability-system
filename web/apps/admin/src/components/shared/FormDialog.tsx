import { ReactNode } from "react";
import { Dialog, Button } from "@ui5/webcomponents-react";

export function FormDialog({
  open,
  title,
  description,
  submitText = "Save",
  submitting,
  contentClassName,
  bodyClassName,
  footer,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  submitText?: string;
  submitting?: boolean;
  contentClassName?: string;
  bodyClassName?: string;
  footer?: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      headerText={title}
      {...({ onAfterClose: (e: any) => {
        e.stopPropagation();
        onClose();
      }} as any)}
      className={contentClassName}
      state={description ? "Information" : "None"}
      footer={
          <div style={{ width: '100%', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
            {footer ? footer : (
                <>
                    <Button design="Transparent" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button design="Emphasized" onClick={onSubmit} disabled={submitting}>
                        {submitting ? "Saving..." : submitText}
                    </Button>
                </>
            )}
          </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem 0" }} className={bodyClassName}>
        {description && (
            <div style={{ color: "var(--sapContent_LabelColor)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                {description}
            </div>
        )}
        {children}
      </div>
    </Dialog>
  );
}
