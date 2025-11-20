/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Essa linha mágica habilita o botão de tema funcionar
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}