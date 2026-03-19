import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export type CrumbItem = { label: string; to?: string };

/**
 * URL-driven hierarchy for Models admin (replaces implicit “list item press” navigation).
 */
export function ModelsBreadcrumb({ items }: { items: CrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <Fragment key={`${item.label}-${i}`}>
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />}
          {item.to ? (
            <Link
              to={item.to}
              className="hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate max-w-[12rem] sm:max-w-none">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
