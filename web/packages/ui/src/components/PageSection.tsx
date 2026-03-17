import { ReactNode } from "react";
import { cn } from "../lib/utils";

export interface SectionProps {
  title?: string | ReactNode;
  subtitle?: string | ReactNode;
  children: ReactNode;
  variant?: "default" | "card" | "bordered";
  spacing?: "compact" | "normal" | "relaxed";
  className?: string;
}

const spacingClasses = {
  compact: { wrapper: "p-4 mb-4", gap: "gap-3" },
  normal: { wrapper: "p-6 mb-8", gap: "gap-4" },
  relaxed: { wrapper: "p-8 mb-10", gap: "gap-6" },
};

const variantClasses = {
  default: "",
  card: "rounded-xl bg-card border border-border shadow-sm",
  bordered: "border-l-4 border-l-primary bg-muted/30",
};

export function Section({
  title,
  subtitle,
  children,
  variant = "default",
  spacing = "normal",
  className,
}: SectionProps) {
  const { wrapper, gap } = spacingClasses[spacing];

  return (
    <div className={cn(wrapper, variantClasses[variant], className)}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h2 className="m-0 mb-1 text-lg font-semibold text-foreground">{title}</h2>}
          {subtitle && <p className="m-0 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div className={cn("flex flex-col", gap)}>{children}</div>
    </div>
  );
}

export interface ContentGridProps {
  children: ReactNode;
  gap?: string;
  className?: string;
}

export function ContentGrid({ children, className }: ContentGridProps) {
  return (
    <div className={cn("grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 auto-rows-max", className)}>
      {children}
    </div>
  );
}
