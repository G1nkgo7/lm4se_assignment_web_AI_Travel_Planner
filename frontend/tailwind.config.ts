import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2563eb",
          dark: "#1d4ed8",
          light: "#60a5fa"
        }
      }
    }
  },
  plugins: []
};

export default config;
