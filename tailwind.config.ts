import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Brand orange
        "orange-50": "#FFF6EE",
        "orange-100": "#FFE9D5",
        "orange-400": "#DA6C34",
        "orange-500": "#C84B31",
        "orange-600": "#A83D27",
        "orange-700": "#8E3320",
        // Warm accent
        "warm-400": "#DA6C34",
        "warm-500": "#C45A28",
        // Casa colors
        prisma: "#38BDF8",
        macondo: "#A78BFA",
        marmoris: "#F59E0B",
        // Legacy alias (components may still reference teal-*)
        "teal-50": "#FFF6EE",
        "teal-100": "#FFE9D5",
        "teal-400": "#DA6C34",
        "teal-500": "#C84B31",
        "teal-600": "#A83D27",
        "teal-700": "#8E3320",
      },
      fontFamily: {
        fraunces: ["var(--font-fraunces)", "serif"],
        dm: ["var(--font-dm)", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      zIndex: {
        sidebar: "40",
        dropdown: "50",
        overlay: "60",
        drawer: "70",
        modal: "100",
        command: "200",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        glow: "0 0 20px rgba(200,75,49,.15), 0 0 60px rgba(200,75,49,.05)",
        "glow-sm": "0 0 12px rgba(200,75,49,.12)",
        float: "var(--shadow-float)",
      },
    },
  },
  plugins: [],
};
export default config;
