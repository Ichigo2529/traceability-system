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
    <div className={cn("admin-underline-tabs", className)}>
      <div className="admin-underline-tabs-list">
        {items.map((item) => {
          const active = item.key === value;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cn(
                "admin-underline-tab",
                active ? "is-active" : undefined
              )}
              aria-current={active ? "page" : undefined}
            >
              {Icon ? <Icon className="admin-underline-tab-icon" /> : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

