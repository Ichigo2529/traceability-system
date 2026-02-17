import React from 'react';
import { Title, Text } from '@ui5/webcomponents-react';

export interface StatCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
}) => {
  return (
    <div
      style={{
        padding: '1.5rem',
        border: '1px solid var(--sapContent_BorderColor)',
        borderRadius: '0.25rem',
        backgroundColor: 'var(--sapList_Background)',
        boxShadow: 'var(--sapContent_Shadow0)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--sapList_TableGroupHeaderBackground)',
          borderRadius: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon width={24} height={24} style={{ color: 'var(--sapBrandColor)' }} />
        </div>
        {trend && trendValue && (
          <div style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '0.25rem',
            backgroundColor: trend === 'up' ? 'var(--sapSuccessBackground)' : trend === 'down' ? 'var(--sapErrorBackground)' : 'var(--sapNeutralBackground)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: trend === 'up' ? 'var(--sapSuccessTextColor)' : trend === 'down' ? 'var(--sapErrorTextColor)' : 'var(--sapNeutralTextColor)',
          }}>
            {trendValue}
          </div>
        )}
      </div>
      <Text style={{ color: 'var(--sapContent_LabelColor)', fontSize: '0.875rem', margin: 0, marginBottom: '0.25rem' }}>
        {label}
      </Text>
      <Title level="H4" style={{ margin: 0, color: 'var(--sapContent_TextColor)' }}>
        {value}
      </Title>
    </div>
  );
};

StatCard.displayName = 'StatCard';
