import { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export type UnderlineTabItem<T extends string> = {
  key: T;
  label: string;
  icon?: LucideIcon;
};

export function UnderlineTabs<T extends string>({
  value,
  items,
  onChange,
  className,
}: {
  value: T;
  items: ReadonlyArray<UnderlineTabItem<T>>;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-border", className)}>
      <div className="flex gap-0 overflow-x-auto">
        {items.map((item) => {
          const active = item.key === value;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
                "border-b-2 -mb-px whitespace-nowrap focus-visible:outline-none",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
              aria-current={active ? "page" : undefined}
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
