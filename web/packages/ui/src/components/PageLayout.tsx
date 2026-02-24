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
  Button
} from "@ui5/webcomponents-react";

export interface PageLayoutProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  icon?: string;
  iconColor?: string;
  actions?: ReactNode;
  headerActions?: ReactNode;
  /** Full-width toolbar bar below title (e.g. Back, Status, primary actions). Renders in DynamicPageHeader. */
  toolbar?: ReactNode;
  /** Show pin button so user can pin/unpin the header. Default true when toolbar is provided. */
  headerContentPinnable?: boolean;
  /** Default state for header: true = pinned (header stays visible when scrolling). Default true. */
  headerPinnedByDefault?: boolean;
  filters?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  showBackButton?: boolean;
  onBackClick?: (e: any) => void;
  fullHeight?: boolean;
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
  toolbar,
  headerContentPinnable = true,
  headerPinnedByDefault = true,
  filters,
  children,
  maxWidth,
  showBackButton,
  onBackClick,
  fullHeight,
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
  
  const DynamicPageCasted = DynamicPage as any;

  return (
    <DynamicPageCasted
      backgroundDesign="Transparent"
      headerContentPinnable={headerContentPinnable}
      headerContentPinned={headerPinnedByDefault}
      titleArea={
        <DynamicPageTitle
          heading={
            <div style={{ paddingLeft: "2rem", paddingTop: "1.25rem", paddingBottom: "1.5rem" }}>
              <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "1.5rem" }}>
                {showBackButton && (
                  <Button icon="nav-back" design="Transparent" onClick={onBackClick} />
                )}
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
          actionsBar={headerActions as any}
        />
      }
      headerArea={
        filters || actions || toolbar ? (
          <DynamicPageHeader>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {toolbar && (
                <div style={{ width: "100%" }}>
                  {toolbar}
                </div>
              )}
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
            padding: fullHeight ? "0" : "2rem", 
            boxSizing: "border-box", 
            height: fullHeight ? "100%" : "auto",
            minHeight: "100%",
            display: "flex",
            flexDirection: "column"
        }}
      >
        <div style={{ maxWidth: maxWidth ?? "1800px", width: "100%", height: fullHeight ? "100%" : "auto", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
    </DynamicPageCasted>
  );
}
