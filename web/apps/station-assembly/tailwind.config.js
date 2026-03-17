/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "../../../packages/ui/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover, var(--card))",
          foreground: "var(--popover-foreground, var(--card-foreground))",
        },
        primary: {
          DEFAULT: "var(--primary, oklch(0.523 0.214 259.815))",
          foreground: "var(--primary-foreground, oklch(0.985 0 0))",
        },
        secondary: {
          DEFAULT: "var(--secondary, oklch(0.97 0 0))",
          foreground: "var(--secondary-foreground, oklch(0.205 0 0))",
        },
        muted: {
          DEFAULT: "var(--muted, oklch(0.97 0 0))",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent, oklch(0.97 0 0))",
          foreground: "var(--accent-foreground, oklch(0.205 0 0))",
        },
        destructive: {
          DEFAULT: "var(--destructive, oklch(0.577 0.245 27.325))",
          foreground: "var(--destructive-foreground, oklch(0.985 0 0))",
        },
        border: "var(--border)",
        input: "var(--input, var(--border))",
        ring: "var(--ring, oklch(0.523 0.214 259.815))",
      },
    },
  },
  plugins: [],
};
