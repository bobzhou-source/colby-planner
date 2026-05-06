/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bio: '#0891b2',
        chem: '#7c3aed',
        math: '#db2777',
        cs: '#059669',
        psych: '#ea580c',
      },
    },
  },
  plugins: [],
}
