import React from 'react';
import { Card as UI5Card, Title } from '@ui5/webcomponents-react';

export interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  children,
  actions,
}) => {
  return (
    <UI5Card style={{ width: '100%' }}>
      {(title || description || actions) && (
        <div style={{ padding: '1rem 1rem 0.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              {title && (
                <Title level="H5" style={{ margin: '0 0 0.25rem 0' }}>
                  {title}
                </Title>
              )}
              {description && (
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                  {description}
                </p>
              )}
            </div>
            {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
          </div>
        </div>
      )}
      <div style={{ padding: '1rem' }}>
        {children}
      </div>
    </UI5Card>
  );
};

Card.displayName = 'Card';
