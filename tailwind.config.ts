import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pink: "#E23A82",
        blue: "#4FB4E8",
        ink: "#241A2E",
        paper: "#FFFDFB",
        "paper-sunk": "#FBF3F6",
        "pink-tint": "#FCE4EF",
        "blue-tint": "#E3F4FC",
        success: "#1E8F6F",
        error: "#C6395B",
        border: "#EBDCE3",
      },
      fontFamily: {
        display: ["var(--font-fredoka)", "system-ui", "sans-serif"],
        body: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-buddy":
          "linear-gradient(135deg, #E23A82 0%, #C24FA8 45%, #4FB4E8 100%)",
        "gradient-buddy-soft":
          "linear-gradient(135deg, #FCE4EF 0%, #F6E7F2 45%, #E3F4FC 100%)",
      },
      borderRadius: {
        sm: "8px",
        md: "16px",
        lg: "24px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(36,26,46,0.06)",
        md: "0 8px 20px rgba(36,26,46,0.08)",
        lg: "0 20px 40px rgba(36,26,46,0.12)",
        glow: "0 0 0 4px rgba(226,58,130,0.12)",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
      },
      maxWidth: {
        content: "1200px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
