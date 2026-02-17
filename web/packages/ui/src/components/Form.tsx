import React from 'react';
import { Label } from '@ui5/webcomponents-react';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  children,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
      </Label>
      {children}
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
          {error}
        </span>
      )}
    </div>
  );
};

export interface FormProps {
  children: React.ReactNode;
  gap?: string;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const Form: React.FC<FormProps> = ({
  children,
  gap = '1rem',
  onSubmit,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}
    >
      {children}
    </form>
  );
};

Form.displayName = 'Form';
FormField.displayName = 'FormField';
