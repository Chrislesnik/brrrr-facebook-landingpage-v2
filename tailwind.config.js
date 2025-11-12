const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: "#ff7a00",
              foreground: "#ffffff",
              500: "#ff7a00",
              600: "#e64500",
            },
          },
        },
        dark: {
          colors: {
            primary: {
              DEFAULT: "#ff7a00",
              foreground: "#ffffff",
              500: "#ff7a00",
              600: "#e64500",
            },
          },
        },
      },
    }),
  ],
};