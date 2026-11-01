import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic CSS Variables for Centralized Theme & Easy Dark Mode
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },

        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },

        // Brand Primary (Navy Blue linked directly to CSS Variables)
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        // Brand Accent (Gold linked directly to CSS Variables)
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        // Surface & Neutral Background Tones
        surface: {
          DEFAULT: "#FFFFFF",
          white: "#FFFFFF",
          light: "#FAFAFA",
          cream: "#FFF4E3",
          warm: "#FFF7ED",
          border: "#E5E7EB",
          50: "#FAFAFA",
          100: "#FFF7ED",
          200: "#FFF4E3",
          300: "#E5E7EB",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-vazirmatn)",
          "var(--font-vazir)",
          "Vazirmatn",
          "Tahoma",
          "-apple-system",
          "sans-serif",
        ],
        vazir: [
          "var(--font-vazirmatn)",
          "var(--font-vazir)",
          "Vazirmatn",
          "Tahoma",
          "sans-serif",
        ],
        vazirmatn: [
          "var(--font-vazirmatn)",
          "var(--font-vazir)",
          "Vazirmatn",
          "Tahoma",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
