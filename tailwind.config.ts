import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          DEFAULT: "rgb(250 250 249)",
          elevated: "rgb(255 255 255)",
        },
        ink: {
          DEFAULT: "rgb(28 25 23)",
          muted: "rgb(87 83 78)",
        },
        accent: {
          DEFAULT: "rgb(13 148 136)",
          hover: "rgb(15 118 110)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
