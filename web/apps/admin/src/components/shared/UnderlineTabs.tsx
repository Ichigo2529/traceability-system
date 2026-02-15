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
    <div className={cn("border-b border-slate-200", className)}>
      <div className="flex flex-wrap items-center gap-1">
        {items.map((item) => {
          const active = item.key === value;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
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

