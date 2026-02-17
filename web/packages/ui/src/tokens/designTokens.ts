/**
 * Design System - Spacing Scale
 * Canonical spacing values for consistent UX/UI
 * Based on 8px grid system (SAP Fiori Design System)
 */

export const spacing = {
  xs: "0.25rem", // 4px
  sm: "0.5rem", // 8px
  md: "1rem", // 16px
  lg: "1.5rem", // 24px
  xl: "2rem", // 32px
  xxl: "3rem", // 48px
} as const;

export const fontSizes = {
  xs: "0.75rem", // 12px
  sm: "0.875rem", // 14px
  base: "1rem", // 16px
  lg: "1.125rem", // 18px
  xl: "1.5rem", // 24px
  displayL: "2rem", // 32px
} as const;

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const colors = {
  // Text colors
  textPrimary: "var(--sapTextColor)",
  textSecondary: "var(--sapContent_LabelColor)",
  textInverted: "var(--sapShell_TextColor)",

  // Background colors
  bgPage: "var(--sapPage_Background)",
  bgCard: "var(--sapCard_Background)",
  bgHeader: "var(--sapObjectHeader_Background)",
  bgHover: "var(--sapHover_Background)",

  // Border colors
  borderDefault: "var(--sapContent_BorderColor)",

  // Semantic colors
  success: "var(--sapSuccessColor)",
  warning: "var(--sapWarningColor)",
  error: "var(--sapErrorColor)",
  info: "var(--sapInformationColor)",

  // Brand colors
  brand: "var(--sapBrandColor)",
} as const;

export const breakpoints = {
  mobile: "480px",
  tablet: "768px",
  desktop: "1200px",
  wide: "1920px",
} as const;

/**
 * Common padding/margin combinations
 */
export const layoutPadding = {
  section: spacing.xl, // 32px
  sectionContent: spacing.lg, // 24px
  cardContent: spacing.lg, // 24px
  inputGroup: spacing.md, // 16px
  formGroup: spacing.lg, // 24px
} as const;

/**
 * Layout maximum widths
 */
export const layoutMaxWidth = {
  narrow: "960px", // Single column pages (mobile-optimized)
  medium: "1200px", // Two column layouts (tablet-friendly)
  wide: "1400px", // Full-width content with breathing room
  full: "100%", // No constraint
} as const;

/**
 * Component sizing constants
 */
export const componentSizes = {
  buttonHeight: "2.75rem", // 44px
  inputHeight: "2.75rem", // 44px
  iconSize: "1rem", // 16px for inline, 24px for standalone
  avatarSmall: "2rem", // 32px
  avatarMedium: "3rem", // 48px
  avatarLarge: "4rem", // 64px
} as const;
