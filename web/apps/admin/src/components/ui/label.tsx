import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants> & { required?: boolean; showColon?: boolean }
>(({ className, required, showColon, children, ...props }, ref) => {
  const isStringWithAsterisk = typeof children === "string" && children.endsWith(" *");
  const labelContent = isStringWithAsterisk ? (
    <>
      {children.slice(0, -2)}
      <span className="text-destructive" aria-hidden>
        *
      </span>
    </>
  ) : (
    children
  );
  return (
    <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props}>
      {labelContent}
      {showColon && ":"}
      {required && !isStringWithAsterisk && (
        <span className="text-destructive ml-0.5" aria-hidden>
          *
        </span>
      )}
    </LabelPrimitive.Root>
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
