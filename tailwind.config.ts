import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        marine: {
          50: "#eef2f6",
          100: "#d3dde6",
          200: "#a7bbce",
          300: "#7b99b6",
          400: "#4f779e",
          500: "#2d5a86",
          600: "#17416b",
          700: "#0f2942",
          800: "#0b1f33",
          900: "#071524",
        },
        vert: {
          50: "#eefbf0",
          100: "#d3f3d9",
          200: "#a7e7b3",
          300: "#7bdb8d",
          400: "#54c96b",
          500: "#3fa34d",
          600: "#33823e",
          700: "#286530",
          800: "#1d4823",
          900: "#122b15",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};
export default config;
