import React from "react";

export interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, description, children, actions }) => {
  return (
    <div className="w-full rounded-xl border bg-card text-card-foreground shadow">
      {(title || description || actions) && (
        <div className="px-6 py-4 border-b border-border">
          <div className="flex justify-between items-start gap-4">
            <div>
              {title && <h3 className="font-semibold leading-none tracking-tight m-0 mb-1">{title}</h3>}
              {description && <p className="text-sm text-muted-foreground m-0">{description}</p>}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

Card.displayName = "Card";
