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
  Button,
} from "@ui5/webcomponents-react";

export interface PageLayoutProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  icon?: string;
  /** Semantic color key: maps to Horizon theme variables (e.g. blue, green, red). */
  iconColor?: string;
  actions?: ReactNode;
  headerActions?: ReactNode;
  /** Full-width toolbar below title (e.g. Back, Status). Renders in DynamicPageHeader. */
  toolbar?: ReactNode;
  /** Show pin button for header. Default true when toolbar is provided. */
  headerContentPinnable?: boolean;
  /** Header pinned by default when scrolling. Default true. */
  headerPinnedByDefault?: boolean;
  filters?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  showBackButton?: boolean;
  onBackClick?: (e: unknown) => void;
  fullHeight?: boolean;
}

/** Map iconColor to Horizon theme CSS variables only (no hardcoded HEX). */
function getIconAccentVar(color?: string): string {
  const key = (color ?? "blue").toLowerCase();
  const map: Record<string, string> = {
    blue: "var(--sapBrandColor)",
    green: "var(--sapPositiveColor)",
    red: "var(--sapNegativeColor)",
    orange: "var(--sapCriticalColor)",
    indigo: "var(--sapHighlightColor)",
    cyan: "var(--sapInformativeColor)",
    teal: "var(--sapNeutralColor)",
  };
  return map[key] ?? "var(--sapBrandColor)";
}

/**
 * Admin page layout: UI5 DynamicPage standard structure.
 * Structure: DynamicPage → DynamicPageTitle (heading + actionsBar) → DynamicPageHeader (optional) → Content.
 * Uses only Horizon theme CSS variables (see docs/UI/02_LAYOUT_SYSTEM_v4.md).
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
  const iconAccent = getIconAccentVar(iconColor);

  return (
    <DynamicPage
      {...({
        backgroundDesign: "Transparent",
        headerContentPinnable,
        headerContentPinned: headerPinnedByDefault,
      } as Record<string, unknown>)}
      titleArea={
        <DynamicPageTitle
          heading={
            <div
              className="dynamic-page-title-heading"
              style={{
                paddingLeft: "var(--spacing-xl, 1rem)",
                paddingTop: "var(--spacing-lg, 1.25rem)",
                paddingBottom: "var(--spacing-lg, 1.5rem)",
                minWidth: 0,
                flex: "1 1 auto",
              }}
            >
              <FlexBox
                alignItems={FlexBoxAlignItems.Center}
                style={{ gap: "var(--spacing-lg, 1.5rem)" }}
              >
                {showBackButton && (
                  <Button
                    icon="nav-back"
                    design="Transparent"
                    onClick={onBackClick}
                  />
                )}
                {icon && (
                  <div
                    className="page-header-icon-container"
                    style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "var(--sapElement_BorderCornerRadius, 0.5rem)",
                      background: "var(--sapTile_Background)",
                      border: "1px solid var(--sapGroup_TitleBorderColor)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      name={icon}
                      style={{
                        width: "1.5rem",
                        height: "1.5rem",
                        color: iconAccent,
                      }}
                    />
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    minWidth: 0,
                  }}
                >
                  <Title
                    level="H3"
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      color: "var(--sapTitleColor)",
                      fontSize: "var(--sapFontHeader3Size, 1.25rem)",
                    }}
                  >
                    {title}
                  </Title>
                  {subtitle && (
                    <Label
                      style={{
                        fontSize: "var(--sapFontSize, 0.8125rem)",
                        color: "var(--sapContent_LabelColor)",
                      }}
                    >
                      {subtitle}
                    </Label>
                  )}
                </div>
              </FlexBox>
            </div>
          }
          snappedHeading={
            <div
              className="dynamic-page-title-heading"
              style={{
                paddingLeft: "var(--spacing-xl, 1rem)",
                paddingTop: "var(--spacing-lg, 1.25rem)",
                paddingBottom: "var(--spacing-lg, 1.5rem)",
                minWidth: 0,
                flex: "1 1 auto",
              }}
            >
              <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "var(--spacing-lg, 1.5rem)" }}>
                {showBackButton && (
                  <Button
                    icon="nav-back"
                    design="Transparent"
                    onClick={onBackClick}
                  />
                )}
                {icon && (
                  <div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "var(--sapElement_BorderCornerRadius, 0.5rem)",
                      background: "var(--sapTile_Background)",
                      border: "1px solid var(--sapGroup_TitleBorderColor)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={icon} style={{ width: "1.25rem", height: "1.25rem", color: iconAccent }} />
                  </div>
                )}
                {typeof title === "string" ? (
                  <Title
                    level="H5"
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      color: "var(--sapTitleColor)",
                      fontSize: "var(--sapFontHeader5Size, 1rem)",
                    }}
                  >
                    {title}
                  </Title>
                ) : (
                  <span style={{ fontWeight: 700, color: "var(--sapTitleColor)", fontSize: "var(--sapFontHeader5Size, 1rem)" }}>
                    {title}
                  </span>
                )}
              </FlexBox>
            </div>
          }
          actionsBar={
            headerActions ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  marginLeft: "auto",
                  paddingRight: "var(--spacing-xl, 1rem)",
                  minHeight: "3rem",
                  gap: "0.5rem",
                }}
              >
                {headerActions}
              </div>
            ) : undefined
          }
        />
      }
      headerArea={
        filters || actions || toolbar ? (
          <DynamicPageHeader>
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "var(--spacing-md, 1rem)",
                padding: "0 var(--spacing-xl, 1rem) var(--spacing-lg, 1rem)",
                boxSizing: "border-box",
              }}
            >
              {toolbar && <div style={{ width: "100%" }}>{toolbar}</div>}
              {actions && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    width: "100%",
                  }}
                >
                  {actions}
                </div>
              )}
              {filters && <div style={{ width: "100%" }}>{filters}</div>}
            </div>
          </DynamicPageHeader>
        ) : undefined
      }
      style={{ height: "100%" }}
      showFooter={false}
    >
      <div
        style={{
          padding: fullHeight ? 0 : "var(--spacing-xl, 2rem)",
          boxSizing: "border-box",
          height: fullHeight ? "100%" : "auto",
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            maxWidth: maxWidth ?? "1800px",
            width: "100%",
            height: fullHeight ? "100%" : "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>
      </div>
    </DynamicPage>
  );
}
