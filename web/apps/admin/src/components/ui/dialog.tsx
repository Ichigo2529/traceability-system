import * as React from "react";
import { Dialog as Ui5Dialog } from "@ui5/webcomponents-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => undefined,
});

const Dialog = ({
  open,
  defaultOpen,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
  const isControlled = open !== undefined;
  const resolvedOpen = isControlled ? Boolean(open) : internalOpen;

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  return <DialogContext.Provider value={{ open: resolvedOpen, onOpenChange: handleOpenChange }}>{children}</DialogContext.Provider>;
};

const DialogTrigger = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ children, onClick, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext);

  return (
    <span
      ref={ref as React.Ref<HTMLSpanElement>}
      onClick={(event) => {
        onClick?.(event);
        onOpenChange(true);
      }}
      {...props}
    >
      {children}
    </span>
  );
});
DialogTrigger.displayName = "DialogTrigger";

const DialogPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
const DialogOverlay = () => null;

const DialogContent = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, children, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(DialogContext);

  const nodes = React.Children.toArray(children);
  let headerNode: React.ReactNode = null;
  let footerNode: React.ReactNode = null;
  const bodyNodes: React.ReactNode[] = [];

  for (const node of nodes) {
    if (React.isValidElement(node) && node.type === DialogHeader) {
      headerNode = (node.props as { children?: React.ReactNode }).children;
      continue;
    }
    if (React.isValidElement(node) && node.type === DialogFooter) {
      footerNode = (node.props as { children?: React.ReactNode }).children;
      continue;
    }
    bodyNodes.push(node);
  }

  return (
    <Ui5Dialog
      ref={ref as React.Ref<any>}
      open={open}
      onClose={() => onOpenChange(false)}
      className="admin-ui5-dialog"
      header={
        <div className="admin-ui5-dialog-header-shell">
          <div className="admin-ui5-dialog-header-content">{headerNode}</div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      }
      footer={footerNode ? <div className="admin-ui5-dialog-footer-shell">{footerNode}</div> : undefined}
      {...(props as any)}
    >
      <div className={cn("admin-ui5-dialog-body", className)}>{bodyNodes}</div>
    </Ui5Dialog>
  );
});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("admin-ui5-dialog-header", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("admin-ui5-dialog-footer", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => <div ref={ref} className={cn("admin-ui5-dialog-title", className)} {...props} />);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("admin-ui5-dialog-description", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

const DialogClose = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ children, onClick, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext);

  return (
    <span
      ref={ref as React.Ref<HTMLSpanElement>}
      onClick={(event) => {
        onClick?.(event);
        onOpenChange(false);
      }}
      {...props}
    >
      {children}
    </span>
  );
});
DialogClose.displayName = "DialogClose";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
