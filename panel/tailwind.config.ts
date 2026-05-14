import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "var(--bg-base)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          input: "var(--bg-input)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          light: "var(--gold-light)",
          dim: "var(--gold-dim)",
          border: "var(--gold-border)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
          gold: "var(--border-gold)",
        },
        success: {
          DEFAULT: "var(--success)",
          dim: "var(--success-dim)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          dim: "var(--warning-dim)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          dim: "var(--danger-dim)",
        },
        info: {
          DEFAULT: "var(--info)",
          dim: "var(--info-dim)",
        },
      },
      fontFamily: {
        ui: ["Inter", "system-ui", "sans-serif"],
        data: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: "11px",
        sm: "13px",
        base: "15px",
        lg: "18px",
        xl: "22px",
        "2xl": "28px",
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.4)",
        md: "0 4px 16px rgba(0,0,0,0.5)",
        gold: "0 0 20px rgba(201,151,58,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
