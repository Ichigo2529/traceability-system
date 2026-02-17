import * as React from "react";
import { Button as Ui5Button, ButtonDomRef } from "@ui5/webcomponents-react";

type ButtonVariant = "default" | "secondary" | "outline" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

// UI5 Button design prop expects specific strings.
// We allow any string that the underlying component accepts, but strongly type our mapping.
const variantToDesign: Record<ButtonVariant, "Emphasized" | "Transparent" | "Negative" | "Default"> = {
  default: "Emphasized",
  secondary: "Transparent",
  outline: "Transparent",
  destructive: "Negative",
};

type NativeButtonType = "button" | "submit" | "reset";

export interface ButtonProps
  extends Omit<React.ComponentProps<typeof Ui5Button>, "design" | "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean; // Dropping asChild support complexity for now unless critical
  type?: NativeButtonType;
}

// We'll keep the component simple.
const Button = React.forwardRef<ButtonDomRef, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, onClick, children, title, type, ...props }, ref) => {
    
    // Map HTML type to UI5 type
    // UI5 expects "Button", "Submit", "Reset"
    const ui5Type = type ? (type.charAt(0).toUpperCase() + type.slice(1)) as "Button" | "Submit" | "Reset" : "Submit"; // Default to Submit if not specified, or Button? HTML default is submit.

    return (
      <Ui5Button
        ref={ref}
        design={variantToDesign[variant]}
        onClick={onClick}
        tooltip={title}
        type={ui5Type}
        className={className} // Allow passing generic classNames if needed but we won't generate internal ones
        {...props}
      >
        {children}
      </Ui5Button>
    );
  }
);
Button.displayName = "Button";

export { Button };
