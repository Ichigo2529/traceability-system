import * as React from "react";
import { Option as Ui5Option, Select as Ui5Select } from "@ui5/webcomponents-react";
import { cn } from "../../lib/utils";

type SelectChangeHandler = (value: string) => void;

type SelectItemDescriptor = {
  key: string;
  value: string;
  className?: string;
  children?: React.ReactNode;
};

type SelectComposition = {
  triggerClassName?: string;
  placeholder?: string;
  options: SelectItemDescriptor[];
};

const toArray = (children: React.ReactNode): React.ReactNode[] => React.Children.toArray(children);

type OptionElementProps = { value?: string; className?: string; children?: React.ReactNode };

const pushOptionFromNode = (node: React.ReactNode, options: SelectItemDescriptor[]) => {
  if (!React.isValidElement(node)) return;
  const el = node as React.ReactElement<OptionElementProps>;
  const props = el.props;

  if (el.type === SelectItem) {
    const value = String(props.value ?? "");
    options.push({
      key: el.key?.toString() ?? value,
      value,
      className: props.className,
      children: props.children,
    });
    return;
  }

  if (el.type === React.Fragment) {
    toArray(props.children).forEach((child) => pushOptionFromNode(child, options));
    return;
  }

  toArray(props.children).forEach((child) => pushOptionFromNode(child, options));
};

type TriggerValueProps = { placeholder?: string; className?: string; children?: React.ReactNode };

const extractSelectComposition = (children: React.ReactNode): SelectComposition => {
  let triggerClassName: string | undefined;
  let placeholder: string | undefined;
  const options: SelectItemDescriptor[] = [];

  toArray(children).forEach((node) => {
    if (!React.isValidElement(node)) return;
    const el = node as React.ReactElement<TriggerValueProps>;
    const props = el.props;

    if (el.type === SelectTrigger) {
      triggerClassName = props.className;
      toArray(props.children).forEach((triggerChild) => {
        if (!React.isValidElement(triggerChild)) return;
        const tc = triggerChild as React.ReactElement<TriggerValueProps>;
        if (tc.type === SelectValue) {
          placeholder = tc.props.placeholder;
        }
      });
      return;
    }

    if (el.type === SelectContent) {
      toArray(props.children).forEach((contentChild) => pushOptionFromNode(contentChild, options));
      return;
    }
  });

  return { triggerClassName, placeholder, options };
};

export interface SelectProps extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "defaultValue" | "onChange"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: SelectChangeHandler;
  children?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

const Select = React.forwardRef<HTMLElement, SelectProps>(
  ({ value, defaultValue, onValueChange, children, className, disabled, required, name, ...props }, ref) => {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
    const selectedValue = isControlled ? (value ?? "") : internalValue;
    const { triggerClassName, placeholder, options } = extractSelectComposition(children);

    return (
      <Ui5Select
        ref={ref as React.Ref<any>}
        className={cn("admin-ui5-select", triggerClassName, className)}
        value={selectedValue}
        disabled={disabled}
        required={required}
        name={name}
        onChange={(event) => {
          const nextValue = String(event.target.value ?? "");
          if (!isControlled) setInternalValue(nextValue);
          onValueChange?.(nextValue);
        }}
        {...(props as any)}
      >
        {placeholder ? <Ui5Option value="">{placeholder}</Ui5Option> : null}
        {options.map((option) => (
          <Ui5Option key={option.key} value={option.value} className={cn("admin-ui5-select-option", option.className)}>
            {option.children}
          </Ui5Option>
        ))}
      </Ui5Select>
    );
  }
);
Select.displayName = "Select";

const SelectTrigger = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>((props, _ref) => {
  return <>{props.children}</>;
});
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>((props, _ref) => {
  return <>{props.children}</>;
});
SelectContent.displayName = "SelectContent";

export interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

const SelectValue = ({ children }: SelectValueProps) => {
  return <>{children}</>;
};
SelectValue.displayName = "SelectValue";

export interface SelectItemProps extends React.HTMLAttributes<HTMLElement> {
  value: string;
  children?: React.ReactNode;
}

const SelectItem = React.forwardRef<HTMLElement, SelectItemProps>((props, _ref) => {
  return <>{props.children}</>;
});
SelectItem.displayName = "SelectItem";

const SelectGroup = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
SelectGroup.displayName = "SelectGroup";

const SelectLabel = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
SelectLabel.displayName = "SelectLabel";

const SelectSeparator = () => null;
SelectSeparator.displayName = "SelectSeparator";

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator };
