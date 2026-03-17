import React from "react";
import { cn } from "../lib/utils";

interface SkeletonProps {
  variant?: "text" | "circle" | "rectangle";
  width?: string;
  height?: string;
  className?: string;
}

const variantClasses: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  text: "h-4 w-full rounded",
  circle: "h-10 w-10 rounded-full",
  rectangle: "h-10 w-full rounded-md",
};

export const Skeleton: React.FC<SkeletonProps> = ({ variant = "text", width, height, className }) => {
  return (
    <div
      className={cn("animate-pulse bg-muted", variantClasses[variant], className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
};
