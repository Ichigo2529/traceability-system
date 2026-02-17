import * as React from "react";
import { Input as Ui5Input } from "@ui5/webcomponents-react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const htmlToUi5InputType: Record<string, string> = {
  text: "Text",
  password: "Password",
  email: "Email",
  number: "Number",
  tel: "Tel",
  url: "URL",
  search: "Search",
};

const nativeOnlyTypes = new Set(["date", "datetime-local", "time", "month", "week"]);

const createSyntheticChangeEvent = (
  name: string | undefined,
  value: string,
  nativeEvent: unknown
): React.ChangeEvent<HTMLInputElement> =>
  ({
    target: { name, value },
    currentTarget: { name, value },
    nativeEvent,
  } as React.ChangeEvent<HTMLInputElement>);

const createSyntheticBlurEvent = (
  name: string | undefined,
  value: string,
  nativeEvent: unknown
): React.FocusEvent<HTMLInputElement> =>
  ({
    target: { name, value },
    currentTarget: { name, value },
    nativeEvent,
  } as React.FocusEvent<HTMLInputElement>);

const Input = React.forwardRef<HTMLElement, InputProps>(({ className, type = "text", onChange, onBlur, name, ...props }, ref) => {
  if (nativeOnlyTypes.has(type)) {
    return (
      <input
        type={type}
        className={cn("admin-ui5-native-input", className)}
        ref={ref as React.Ref<HTMLInputElement>}
        name={name}
        onChange={onChange}
        onBlur={onBlur}
        {...props}
      />
    );
  }

  const ui5Type = htmlToUi5InputType[type] ?? "Text";

  return (
    <Ui5Input
      ref={ref as React.Ref<any>}
      className={cn("admin-ui5-input", className)}
      type={ui5Type as any}
      name={name}
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
Input.displayName = "Input";

export { Input };
