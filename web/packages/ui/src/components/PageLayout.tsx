import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { getPageLayoutIcon } from "./page-layout-icons";

export interface PageLayoutProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  /** Icon: string (icon name for Lucide lookup) or ReactNode (custom element) */
  icon?: ReactNode | string;
  iconColor?: string;
  actions?: ReactNode;
  headerActions?: ReactNode;
  toolbar?: ReactNode;
  headerContentPinnable?: boolean;
  headerPinnedByDefault?: boolean;
  filters?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  showBackButton?: boolean;
  onBackClick?: (e: unknown) => void;
  fullHeight?: boolean;
}

export function PageLayout({
  title,
  subtitle,
  icon,
  actions,
  headerActions,
  toolbar,
  filters,
  children,
  maxWidth = "1800px",
  showBackButton,
  onBackClick,
  fullHeight,
}: PageLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center gap-6 min-w-0 flex-1">
          {showBackButton && (
            <button
              type="button"
              onClick={onBackClick as () => void}
              className="shrink-0 rounded-md p-2 hover:bg-accent"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {icon && (
            <div className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
              {typeof icon === "string"
                ? (() => {
                    const Icon = getPageLayoutIcon(icon);
                    return <Icon className="w-6 h-6 text-primary" />;
                  })()
                : icon}
            </div>
          )}
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground m-0 truncate">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground m-0">{subtitle}</p>}
          </div>
          {headerActions && <div className="flex items-center gap-2 ml-auto shrink-0">{headerActions}</div>}
        </div>
      </div>
      {(filters || actions || toolbar) && (
        <div className="flex flex-col gap-4 px-6 pb-4 border-b border-border">
          {toolbar && <div className="w-full">{toolbar}</div>}
          {actions && <div className="flex justify-end w-full">{actions}</div>}
          {filters && <div className="w-full">{filters}</div>}
        </div>
      )}
      <div
        className={`flex flex-col flex-1 min-h-0 ${fullHeight ? "p-0" : "p-6"}`}
        style={{ height: fullHeight ? "100%" : "auto" }}
      >
        <div
          className="flex flex-col w-full"
          style={{
            maxWidth,
            height: fullHeight ? "100%" : "auto",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
