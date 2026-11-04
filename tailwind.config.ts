import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#d4af37",
          light: "#f3e5ab",
          dark: "#aa8c2c",
        },
        crimson: {
          DEFAULT: "#e11d48",
          dark: "#9f1239",
        },
        cyber: {
          DEFAULT: "#00d2ff",
          dark: "#050811",
          card: "#0d1322",
        },
      },
    },
  },
  plugins: [],
};
export default config;

