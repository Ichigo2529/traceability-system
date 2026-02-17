import React from 'react';

export interface PageStackProps {
  children: React.ReactNode;
  gap?: string;
}

export const PageStack: React.FC<PageStackProps> = ({
  children,
  gap = '1.5rem',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}
    >
      {children}
    </div>
  );
};

PageStack.displayName = 'PageStack';
