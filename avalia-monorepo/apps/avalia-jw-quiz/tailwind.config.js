/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          blue: 'var(--accent-primary)',
          dark: 'var(--bg-main)',
          card: 'var(--bg-card)',
          hover: 'var(--bg-hover)',
          text: 'var(--text-main)',
          accent: 'var(--accent-primary)',
        },
        'accent-primary': 'var(--accent-primary)',
      }
    },
  },
  plugins: [],
}

