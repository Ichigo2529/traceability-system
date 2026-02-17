import * as React from "react";
import { CheckBox as Ui5CheckBox } from "@ui5/webcomponents-react";
import { cn } from "../../lib/utils";

type CheckedState = boolean | "indeterminate";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "checked"> {
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onCheckedChange?: (checked: CheckedState) => void;
}

const Checkbox = React.forwardRef<HTMLElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, checked, defaultChecked, children, ...props }, ref) => (
    <Ui5CheckBox
      ref={ref as React.Ref<any>}
      className={cn("admin-ui5-checkbox", className)}
      checked={checked ?? defaultChecked}
      onChange={(event) => {
        const nextChecked = Boolean(event.target.checked);
        onCheckedChange?.(nextChecked);
        onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>);
      }}
      {...(props as any)}
    >
      {children}
    </Ui5CheckBox>
  )
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
