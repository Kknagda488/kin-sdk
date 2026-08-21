/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  prefix: 'kintw', // Prefix to avoid clashing with host styles
  corePlugins: {
    preflight: false, // Disable preflight to avoid resetting host styles
  },
  theme: {
    extend: {
      colors: {
        kin: {
          50: '#f4f6f8',
          100: '#e4e8ed',
          500: '#6c7d93',
          600: '#4a5b73',
          900: '#1a222e',
          accent: '#3b82f6',
        }
      }
    },
  },
  plugins: [],
}
