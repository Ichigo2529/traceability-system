import React from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => {
  return (
    <div className="flex flex-col gap-4 mb-8">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight m-0 mb-1.5">{title}</h1>
        {description && <p className="text-sm text-muted-foreground m-0">{description}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
};

PageHeader.displayName = "PageHeader";
