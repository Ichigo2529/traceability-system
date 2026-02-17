import * as React from "react";
import { Card as Ui5Card, CardDomRef, Title, Text } from "@ui5/webcomponents-react";
import { cn } from "../../lib/utils";

// Helper to strip non-standard props that might be passed by Consumers expecting HTML divs
const Card = React.forwardRef<CardDomRef, React.ComponentProps<typeof Ui5Card>>(({ className, children, ...props }, ref) => (
  <Ui5Card ref={ref} className={cn("admin-ui5-card", className)} {...props}>
    {children}
  </Ui5Card>
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
   <div ref={ref} style={{ padding: "1rem 1rem 0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }} className={className} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, children, ...props }, ref) => (
  // level="H5" looks like a card title
  <Title ref={ref as any} level="H5" style={{ fontSize: "1rem" }} className={className} {...(props as any)}>
    {children}
  </Title>
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, children, ...props }, ref) => (
    <Text ref={ref as any} style={{ color: "var(--sapContent_LabelColor)" }} className={className} {...(props as any)}>
      {children}
    </Text>
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} style={{ padding: "0 1rem 1rem" }} className={className} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} style={{ padding: "0 1rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }} className={className} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
