import { ReactNode } from "react";
import {
  DynamicPage,
  DynamicPageTitle,
  DynamicPageHeader,
  Title,
  Label,
  Icon,
  FlexBox,
  FlexBoxAlignItems,
} from "@ui5/webcomponents-react";

export interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  actions?: ReactNode;
  headerActions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}

/**
 * Standardized page layout template using UI5 DynamicPage
 * Provides consistent structure, scrolling, and Fiori design compliance
 */
export function PageLayout({
  title,
  subtitle,
  icon,
  iconColor,
  actions,
  headerActions,
  filters,
  children,
  maxWidth,
}: PageLayoutProps) {
  const defaultIconColor = iconColor ?? "var(--icon-green)";
  
  return (
    <DynamicPage
      titleArea={
        <DynamicPageTitle
          heading={
            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "1.5rem" }}>
              {icon && (
                <div style={{
                  width: "3.5rem",
                  height: "3.5rem",
                  borderRadius: "14px",
                  background: `linear-gradient(135deg, ${defaultIconColor}26 0%, ${defaultIconColor}0D 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1.5px solid ${defaultIconColor}33`,
                  boxShadow: `0 4px 12px ${defaultIconColor}15`,
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)"
                }}>
                  <Icon
                    name={icon}
                    style={{
                      width: "2.1rem",
                      height: "2.1rem",
                      color: defaultIconColor,
                    }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Title level="H3" style={{ margin: 0, fontWeight: 950, color: 'var(--sapTitleColor)', letterSpacing: '-0.025em', fontSize: '1.35rem' }}>{title}</Title>
                {subtitle && <Label style={{ opacity: 0.5, fontSize: '0.875rem', fontWeight: 600, color: 'var(--sapContent_LabelColor)' }}>{subtitle}</Label>}
              </div>
            </FlexBox>
          }
          subheading={undefined}
          actions={headerActions}
        />
      }
      headerArea={
        filters || actions ? (
          <DynamicPageHeader>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {actions && (
                <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
                  {actions}
                </div>
              )}
              {filters && (
                <div style={{ width: "100%" }}>
                  {filters}
                </div>
              )}
            </div>
          </DynamicPageHeader>
        ) : undefined
      }
      style={{ height: "100%" }}
      showFooter={false}
    >
      <div 
        style={{ 
            padding: "0", 
            boxSizing: "border-box", 
            minHeight: "100%", 
            paddingLeft: "5rem", // Align card exactly with Title text (3.5rem icon + 1.5rem gap)
            paddingTop: "1.5rem" 
        }}
      >
        <div style={{ maxWidth: maxWidth ?? "1400px", width: "100%" }}>
          {children}
        </div>
      </div>
    </DynamicPage>
  );
}
