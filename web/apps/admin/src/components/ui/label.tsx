import * as React from "react";
import { Label as Ui5Label } from "@ui5/webcomponents-react";
import { cn } from "../../lib/utils";

const Label = React.forwardRef<
  HTMLElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean; showColon?: boolean }
>(({ className, htmlFor, required, showColon, children, ...props }, ref) => (
  <Ui5Label
    ref={ref as React.Ref<any>}
    className={cn("admin-ui5-label", className)}
    for={htmlFor}
    required={required}
    showColon={showColon}
    {...(props as any)}
  >
    {children}
  </Ui5Label>
));
Label.displayName = "Label";

export { Label };
