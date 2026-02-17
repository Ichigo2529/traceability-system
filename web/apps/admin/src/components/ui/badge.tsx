import type * as React from "react";
import { Tag } from "@ui5/webcomponents-react";
import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "muted";

const variantToDesign: Record<BadgeVariant, "Information" | "Neutral" | "Positive" | "Critical" | "Negative"> = {
  default: "Information",
  secondary: "Neutral",
  outline: "Neutral",
  success: "Positive",
  warning: "Critical",
  danger: "Negative",
  muted: "Neutral",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <Tag className={cn("admin-ui5-badge", `is-${variant}`, className)} design={variantToDesign[variant]} {...(props as any)}>
      {children}
    </Tag>
  );
}
