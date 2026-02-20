import { ReactNode } from "react";
import { Dialog, Button, Bar } from "@ui5/webcomponents-react";

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
      resizable
      draggable
      onClose={onClose}
      className={contentClassName}
      state={description ? "Information" : "None"}
      footer={
        <Bar
          design="Footer"
          slot="footer"
          endContent={
            footer ? (
              footer
            ) : (
              <>
                <Button design="Transparent" onClick={onClose}>
                  Cancel
                </Button>
                <Button design="Emphasized" onClick={onSubmit} disabled={submitting}>
                  {submitting ? "Saving..." : submitText}
                </Button>
              </>
            )
          }
        />
      }
    >
      {open && (
        <div 
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "1rem",
            transition: "transform 0.3s ease-out"
          }} 
          className={bodyClassName}
        >
          {description && (
              <div style={{ color: "var(--sapContent_LabelColor)", fontSize: "0.875rem", marginBottom: "0.5rem", padding: "0 1rem" }}>
                  {description}
              </div>
          )}
          {children}
        </div>
      )}
    </Dialog>
  );
}
