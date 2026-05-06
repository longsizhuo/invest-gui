/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // 语义 token —— 通过 CSS variable，统一在 src/index.css :root 维护
      colors: {
        surface: {
          base: "var(--surface-base)",
          raised: "var(--surface-raised)",
          overlay: "var(--surface-overlay)",
          inverse: "var(--surface-inverse)",
        },
        border: {
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          inverse: "var(--text-inverse)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          foreground: "var(--accent-foreground)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        ui: ["var(--font-ui)"],
        mono: ["var(--font-mono)"],
      },
      letterSpacing: {
        "display-tight": "-0.02em",
        "display-tighter": "-0.04em",
      },
    },
  },
  plugins: [],
};
