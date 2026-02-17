import { useEffect, useRef } from "react";

/**
 * Hook for managing focus on page navigation
 * Helps screen reader users by announcing page changes
 */
export function usePageFocus(pageTitle: string) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Announce page change to screen readers
    const main = document.querySelector("main") || document.querySelector("[role='main']");
    if (main) {
      main.focus();
      // Reset focus to ensure announcement
      setTimeout(() => {
        main.blur();
        main.focus();
      }, 100);
    }
  }, [pageTitle]);

  return containerRef;
}

/**
 * Hook for keyboard navigation shortcuts
 */
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for search (if not in input)
      if ((e.ctrlKey || e.metaKey) && e.key === "k" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Custom shortcuts
      Object.entries(shortcuts).forEach(([key, handler]) => {
        if (e.key === key && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handler();
        }
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
