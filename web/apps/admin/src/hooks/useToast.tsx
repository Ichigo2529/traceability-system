import { useState, useCallback } from "react";
import { Toast } from "@ui5/webcomponents-react";

/**
 * Declarative toast hook for consistent CRUD success/error feedback.
 *
 * Usage:
 *   const { ToastComponent, showToast } = useToast();
 *
 *   // In onSuccess:
 *   showToast("User created successfully");
 *
 *   // In JSX (place once at bottom):
 *   <ToastComponent />
 */
export function useToast() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const ToastComponent = useCallback(
    () => (
      <Toast open={open} onClose={handleClose}>
        {message}
      </Toast>
    ),
    [open, message, handleClose]
  );

  return { showToast, ToastComponent } as const;
}
