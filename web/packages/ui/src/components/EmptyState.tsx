import React from "react";
import { FileText } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  style = {},
}) => {
  const IconNode = icon ?? <FileText className="w-10 h-10 text-muted-foreground/50" />;
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 w-full text-center" style={style}>
      <div className="w-20 h-20 rounded-full bg-muted border border-border flex items-center justify-center mb-6">
        {IconNode}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>}
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
