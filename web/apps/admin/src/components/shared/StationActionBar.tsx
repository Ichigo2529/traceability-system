import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StationActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>;
}

export function StationActionButton({ className, children, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button className={cn("min-h-12", className)} {...props}>
      {children}
    </Button>
  );
}
