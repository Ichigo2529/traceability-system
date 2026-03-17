import { useCallback } from "react";
import { toast as sonnerToast } from "sonner";

/**
 * Declarative toast hook for consistent CRUD success/error feedback.
 * Uses sonner under the hood (Toaster is rendered in App.tsx).
 *
 * Usage:
 *   const { ToastComponent, showToast } = useToast();
 *
 *   // In onSuccess:
 *   showToast("User created successfully");
 *
 *   // In JSX (place once at bottom; no-op, Toaster is global):
 *   <ToastComponent />
 */
export function useToast() {
  const showToast = useCallback((msg: string) => {
    sonnerToast.success(msg);
  }, []);

  const ToastComponent = useCallback(() => null, []);

  return { showToast, ToastComponent } as const;
}
