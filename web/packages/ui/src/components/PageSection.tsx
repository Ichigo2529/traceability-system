import { ReactNode } from "react";

export interface SectionProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  variant?: "default" | "card" | "bordered";
  spacing?: "compact" | "normal" | "relaxed";
  className?: string;
}

/**
 * Content Section component
 * Provides consistent section styling with optional title and subtitle
 */
export function Section({
  title,
  subtitle,
  children,
  variant = "default",
  spacing = "normal",
  className = "",
}: SectionProps) {
  const spacingMap = {
    compact: { padding: "1rem", gap: "0.75rem" },
    normal: { padding: "1.5rem", gap: "1rem" },
    relaxed: { padding: "2rem", gap: "1.5rem" },
  };

  const spacing_ = spacingMap[spacing];

  const variantStyles = {
    default: {
      backgroundColor: "transparent",
      border: "none",
    },
    card: {
      backgroundColor: "var(--sapList_Background, #ffffff)",
      border: "1px solid var(--sapList_BorderColor, #d9d9d9)",
      borderRadius: "0.5rem",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    },
    bordered: {
      backgroundColor: "var(--sapObjectHeader_Background)",
      borderLeft: "4px solid var(--sapBrandColor)",
    },
  };

  const baseClasses = "ui-section-entry";
  const variantClasses = variant === "card" ? "ui-section-card" : "";

  return (
    <div
      className={`${baseClasses} ${variantClasses} ${className}`}
      style={{
        ...variantStyles[variant],
        padding: spacing_.padding,
        marginBottom: "2rem",
      }}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: spacing_.gap }}>
          {title && (
            <h2
              style={{
                margin: "0 0 0.25rem 0",
                fontSize: "1.125rem",
                fontWeight: "600",
                color: "var(--sapTextColor)",
              }}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "var(--sapContent_LabelColor)",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: spacing_.gap }}>
        {children}
      </div>
    </div>
  );
}

export interface ContentGridProps {
  children: ReactNode;
  gap?: string;
}

/**
 * Content Grid component
 * Responsive grid layout for organizing items
 */
export function ContentGrid({
  children,
  gap = "2rem",
}: ContentGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
        gap,
        gridAutoRows: "max-content",
      }}
    >
      {children}
    </div>
  );
}
