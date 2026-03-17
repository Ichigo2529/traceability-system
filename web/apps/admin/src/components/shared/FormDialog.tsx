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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={contentClassName} style={width ? { maxWidth: width, width: "90vw" } : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className={bodyClassName ?? "flex flex-col gap-4"}>{children}</div>
          <DialogFooter className="pt-4">
            {footer ?? (
              <>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : submitText}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
