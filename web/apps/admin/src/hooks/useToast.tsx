import { useRef, useCallback } from "react";
import { Toast, ToastDomRef } from "@ui5/webcomponents-react";

/**
 * Imperative toast hook for consistent CRUD success/error feedback.
 *
 * Usage:
 *   const { toastRef, ToastComponent, showToast } = useToast();
 *
 *   // In onSuccess:
 *   showToast("User created successfully");
 *
 *   // In JSX (place once at bottom):
 *   <ToastComponent />
 */
export function useToast() {
  const toastRef = useRef<ToastDomRef>(null);
  const messageRef = useRef("");

  const showToast = useCallback((message: string) => {
    messageRef.current = message;
    // Force re-render of toast text won't work with ref alone,
    // so we set textContent directly
    if (toastRef.current) {
      (toastRef.current as any).textContent = message;
      (toastRef.current as any).show();
    }
  }, []);

  const ToastComponent = useCallback(
    () => <Toast ref={toastRef}>{messageRef.current || "Done"}</Toast>,
    []
  );

  return { toastRef, showToast, ToastComponent } as const;
}
