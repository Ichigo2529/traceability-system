import type { ReactNode } from "react";
import { Dialog, Button, Bar } from "@ui5/webcomponents-react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  destructive,
  children,
  confirmDisabled,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  children?: ReactNode;
  confirmDisabled?: boolean;
}) {
  return (
    <Dialog
      open={open}
      {...({ onAfterClose: (e: any) => {
        e.stopPropagation();
        onCancel();
      }} as any)}
      headerText={title}
      state={destructive ? "Negative" : "None"}
      footer={
        <Bar
          design="Footer"
          endContent={
            <>
              <Button design="Transparent" onClick={onCancel}>
                {cancelText}
              </Button>
              <Button
                design={destructive ? "Negative" : "Emphasized"}
                onClick={onConfirm}
                disabled={confirmDisabled}
              >
                {confirmText}
              </Button>
            </>
          }
        />
      }
    >
      <div style={{ padding: "1rem" }}>
        <p style={{ margin: 0, color: "var(--sapTextColor)" }}>{description}</p>
        {children}
      </div>
    </Dialog>
  );
}
