import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#fafafa",
        surface: "#ffffff",
        "surface-subtle": "#f5f5f5",
        border: "#e5e5e5",
        "text-primary": "#0a0a0a",
        "text-secondary": "#737373",
        "text-muted": "#737373",
        primary: "#171717",
        "primary-hover": "#0a0a0a",
        accent: "#2b1a1e",
        destructive: "#dc2626",
      },
      fontFamily: {
        serif: ["var(--font-newsreader)", "Georgia", "serif"],
        sans: ["var(--font-geist-sans)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};

export default config;
