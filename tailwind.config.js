/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        game: {
          dark: "#0b0e14",
          card: "#121722",
          panel: "#182030",
          border: "#232e42",
          accent: "#6366f1",
          accentHover: "#4f46e5",
          cyan: "#06b6d4",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
        },
      },
      backgroundImage: {
        'checkerboard': "linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)",
      },
      backgroundSize: {
        'checkerboard': "16px 16px",
      },
      backgroundPosition: {
        'checkerboard': "0 0, 0 8px, 8px -8px, -8px 0px",
      }
    },
  },
  plugins: [],
};
