import React from "react";
import { Title, Label, Button, Icon, FlexBox, FlexBoxDirection, FlexBoxAlignItems, FlexBoxJustifyContent } from "@ui5/webcomponents-react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "document",
  title,
  description,
  actionText,
  onAction,
  style = {},
}) => {
  return (
    <FlexBox
      direction={FlexBoxDirection.Column}
      alignItems={FlexBoxAlignItems.Center}
      justifyContent={FlexBoxJustifyContent.Center}
      style={{ padding: "4rem 2rem", width: "100%", textAlign: "center", ...style }}
    >
      <div style={{
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        background: "var(--sapField_ReadOnly_Background)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "1.5rem",
        border: "1px solid var(--sapList_BorderColor)"
      }}>
        <Icon name={icon} style={{ width: "2.5rem", height: "2.5rem", color: "var(--sapContent_LabelColor)", opacity: 0.5 }} />
      </div>
      
      <Title level="H3" style={{ marginBottom: "0.5rem" }}>{title}</Title>
      
      {description && (
        <Label style={{ marginBottom: "1.5rem", maxWidth: "400px", whiteSpace: "normal" }}>
          {description}
        </Label>
      )}
      
      {actionText && onAction && (
        <Button design="Emphasized" icon="add" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </FlexBox>
  );
};
