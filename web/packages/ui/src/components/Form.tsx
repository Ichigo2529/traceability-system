import React from "react";

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ label, required = false, error, children }) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold leading-none">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

export interface FormProps {
  children: React.ReactNode;
  gap?: string;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const Form: React.FC<FormProps> = ({ children, gap = "1rem", onSubmit }) => {
  return (
    <form onSubmit={onSubmit} className="flex flex-col" style={{ gap }}>
      {children}
    </form>
  );
};

Form.displayName = "Form";
FormField.displayName = "FormField";
