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
  actions,
  headerActions,
  filters,
  children,
}: PageLayoutProps) {
  return (
    <DynamicPage
      titleArea={
        <DynamicPageTitle
          heading={
            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
              {icon && (
                <Icon
                  name={icon}
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    color: "var(--sapContent_IconColor)",
                  }}
                />
              )}
              <Title level="H3">{title}</Title>
            </FlexBox>
          }
          subheading={subtitle ? <Label>{subtitle}</Label> : undefined}
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
      <div style={{ padding: "1rem" }}>
        {children}
      </div>
    </DynamicPage>
  );
}
