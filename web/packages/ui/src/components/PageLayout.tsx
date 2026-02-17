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
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
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
  // Map color names or variants to premium gradients
  const getIconStyles = (color?: string) => {
    const theme = color?.toLowerCase() || "green";
    
    const gradients: Record<string, { bg: string, shadow: string }> = {
      indigo: { bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", shadow: "rgba(118, 75, 162, 0.3)" },
      blue: { bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", shadow: "rgba(0, 242, 254, 0.3)" },
      cyan: { bg: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", shadow: "rgba(0, 242, 254, 0.45)" },
      green: { bg: "linear-gradient(135deg, #2af598 0%, #009efd 100%)", shadow: "rgba(0, 158, 253, 0.3)" },
      red: { bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", shadow: "rgba(245, 87, 108, 0.3)" },
      orange: { bg: "linear-gradient(135deg, #fce38a 0%, #f38181 100%)", shadow: "rgba(243, 129, 129, 0.3)" },
      teal: { bg: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)", shadow: "rgba(51, 8, 103, 0.3)" },
    };

    // Check if it's a theme name or a full gradient/hex
    if (gradients[theme]) return gradients[theme];
    
    // If it's a CSS variable or HEX, try to use it reasonably
    const fallback = color || "var(--icon-green, #107e3e)";
    return {
      bg: fallback.includes("gradient") ? fallback : `linear-gradient(135deg, ${fallback}, ${fallback})`,
      shadow: "rgba(0,0,0,0.15)"
    };
  };

  const iconStyles = getIconStyles(iconColor);
  
  return (
    <DynamicPage
      titleArea={
        <DynamicPageTitle
          heading={
            <div style={{ paddingLeft: "2rem", paddingTop: "1.25rem", paddingBottom: "1rem" }}>
              <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "1.5rem" }}>
                {icon && (
                  <div className="page-header-icon-container" style={{
                    width: "3.125rem",
                    height: "3.125rem",
                    borderRadius: "14px",
                    background: iconStyles.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1.5px solid rgba(255,255,255,0.25)`,
                    boxShadow: `0 8px 16px ${iconStyles.shadow}`,
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {/* High-intensity inner glow */}
                    <div style={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-50%',
                      width: '200%',
                      height: '200%',
                      background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 60%)',
                      pointerEvents: 'none'
                    }} />
                    <Icon
                      name={icon}
                      style={{
                        width: "1.5rem",
                        height: "1.5rem",
                        color: "white",
                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                      }}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Title level="H3" style={{ margin: 0, fontWeight: 950, color: 'var(--sapTitleColor)', letterSpacing: '-0.025em', fontSize: '1.25rem' }}>{title}</Title>
                  {subtitle && <Label style={{ opacity: 0.5, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sapContent_LabelColor)' }}>{subtitle}</Label>}
                </div>
              </FlexBox>
            </div>
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
            paddingLeft: "2rem", // Exact match with header offset for absolute vertical alignment
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
