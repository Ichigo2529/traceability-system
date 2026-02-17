import React from "react";

interface SkeletonProps {
  variant?: "text" | "circle" | "rectangle";
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  width,
  height,
  className = "",
  style = {},
}) => {
  const baseStyle: React.CSSProperties = {
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    borderRadius: variant === "circle" ? "50%" : variant === "text" ? "4px" : "8px",
    width: width || (variant === "circle" ? "40px" : "100%"),
    height: height || (variant === "text" ? "1em" : "40px"),
    display: "inline-block",
    position: "relative",
    overflow: "hidden",
    ...style,
  };

  return (
    <div
      className={`ui-skeleton ${className}`}
      style={baseStyle}
      aria-hidden="true"
    />
  );
};
