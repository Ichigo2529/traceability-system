import React from "react";
import { cn } from "../lib/utils";

export interface PageStackProps {
  children: React.ReactNode;
  /** Tailwind gap class, e.g. "gap-4", "gap-6" (default: "gap-6") */
  gap?: string;
  className?: string;
}

export const PageStack: React.FC<PageStackProps> = ({ children, gap = "gap-6", className }) => {
  return <div className={cn("flex flex-col", gap, className)}>{children}</div>;
};

PageStack.displayName = "PageStack";
