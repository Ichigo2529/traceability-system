import { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="admin-page-header">
      <div className="admin-page-header-main">
        <h1 className="admin-page-header-title">{title}</h1>
        {description ? <p className="admin-page-header-description">{description}</p> : null}
      </div>
      {actions ? <div className="admin-page-header-actions">{actions}</div> : null}
    </div>
  );
}
