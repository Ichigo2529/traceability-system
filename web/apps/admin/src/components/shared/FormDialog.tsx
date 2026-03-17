import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function FormDialog({
  open,
  title,
  description,
  submitText = "Save",
  submitting,
  contentClassName,
  bodyClassName,
  width,
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
  width?: string;
  footer?: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={contentClassName} style={width ? { maxWidth: width, width: "90vw" } : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {open && (
          <div className={bodyClassName} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {children}
          </div>
        )}
        <DialogFooter className="pt-4">
          {footer ?? (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={onSubmit} disabled={submitting}>
                {submitting ? "Saving..." : submitText}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
