/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bank-bg': '#F4F6F8',
        'bank-navy': '#003366',
        'bank-blue': '#003366',
        'bank-accent': '#0A4D8C',
        'bank-hover': '#002244',
        'bank-border': '#D1D5DB',
        finacle: {
          navy: '#003366',      // Classic Deep Finacle Navy
          header: '#0A4D8C',    // Finacle Menu Bar Accent
          bg: '#F4F6F8',        // Clean Crisp Core Banking Page BG
          border: '#D1D5DB',    // Solid Border
          tableHeader: '#1E3A8A', // Data Grid Table Header
          accent: '#0284C7',    // Action Blue
          hover: '#0369A1',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'Segoe UI', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
