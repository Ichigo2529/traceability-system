import React from "react";

export interface StatCardProps {
  icon: React.ComponentType<{ width?: number; height?: number; className?: string }>;
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, trend, trendValue }) => {
  return (
    <div className="p-6 border border-border rounded-md bg-card shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-muted rounded-md flex items-center justify-center">
          <Icon width={24} height={24} className="text-primary" />
        </div>
        {trend && trendValue && (
          <div
            className={`px-3 py-1 rounded-md text-xs font-semibold ${
              trend === "up"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : trend === "down"
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground m-0 mb-1">{label}</p>
      <p className="text-xl font-semibold m-0 text-foreground">{value}</p>
    </div>
  );
};

StatCard.displayName = "StatCard";
