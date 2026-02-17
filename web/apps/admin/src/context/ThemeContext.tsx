import { createContext, useContext, useState, useEffect } from "react";
import { setTheme } from "@ui5/webcomponents-base/dist/config/Theme.js";

type Theme = "sap_horizon" | "sap_horizon_dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("ui5-theme") as Theme | null;
    return saved || "sap_horizon";
  });

  useEffect(() => {
    setTheme(theme);
    localStorage.setItem("ui5-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "sap_horizon" ? "sap_horizon_dark" : "sap_horizon"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
