/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: { DEFAULT: "#1a472a", dark: "#0d2614" },
        gold: "#c9a84c",
        card: { bg: "#f5f0e8", border: "#d4c5a0" },
      },
    },
  },
  plugins: [],
};
