import React from 'react';
import { Title, Text } from '@ui5/webcomponents-react';

/**
 * @deprecated Use DynamicPageTitle and DynamicPageHeader from @ui5/webcomponents-react instead.
 * For new pages, use DynamicPage with DynamicPageTitle/DynamicPageHeader pattern.
 * This component will be removed in the next major version.
 */
export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '2rem',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Title level="H2" style={{ margin: 0, marginBottom: '0.4rem' }}>
          {title}
        </Title>
        {description && (
          <Text style={{ color: '#667085', fontSize: '0.875rem', margin: 0 }}>
            {description}
          </Text>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
};

PageHeader.displayName = 'PageHeader';
