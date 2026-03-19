import { Trash2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DeleteIconButtonProps = Omit<ButtonProps, "variant" | "size" | "children"> & {
  iconClassName?: string;
};

/** Trash icon delete action — always destructive red styling */
export function DeleteIconButton({
  className,
  title = "Delete",
  "aria-label": ariaLabel,
  iconClassName,
  ...props
}: DeleteIconButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "text-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40 [&_svg]:text-destructive",
        className
      )}
      title={title}
      aria-label={ariaLabel ?? title}
      {...props}
    >
      <Trash2 className={cn("h-4 w-4 shrink-0", iconClassName)} aria-hidden />
    </Button>
  );
}
