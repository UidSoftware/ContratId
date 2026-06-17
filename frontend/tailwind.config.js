/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#063BF8',
        accent: '#FF0000',
        dark: '#3d0361',
      },
    },
  },
  plugins: [],
};
