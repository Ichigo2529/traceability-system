import * as React from "react";
import { TextArea as Ui5TextArea } from "@ui5/webcomponents-react";
import { cn } from "../../lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const createSyntheticChangeEvent = (
  name: string | undefined,
  value: string,
  nativeEvent: unknown
): React.ChangeEvent<HTMLTextAreaElement> =>
  ({
    target: { name, value },
    currentTarget: { name, value },
    nativeEvent,
  } as React.ChangeEvent<HTMLTextAreaElement>);

const createSyntheticBlurEvent = (
  name: string | undefined,
  value: string,
  nativeEvent: unknown
): React.FocusEvent<HTMLTextAreaElement> =>
  ({
    target: { name, value },
    currentTarget: { name, value },
    nativeEvent,
  } as React.FocusEvent<HTMLTextAreaElement>);

const Textarea = React.forwardRef<HTMLElement, TextareaProps>(({ className, onChange, onBlur, name, rows, ...props }, ref) => {
  return (
    <Ui5TextArea
      ref={ref as React.Ref<any>}
      className={cn("admin-ui5-textarea", className)}
      name={name}
      rows={rows}
      onInput={(event) => {
        const nextValue = String(event.target.value ?? "");
        onChange?.(createSyntheticChangeEvent(name, nextValue, event));
      }}
      onChange={(event) => {
        const nextValue = String(event.target.value ?? "");
        onBlur?.(createSyntheticBlurEvent(name, nextValue, event));
      }}
      {...(props as any)}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
