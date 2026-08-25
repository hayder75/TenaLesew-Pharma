/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F4F2EA',
          soft: '#FAF9F4',
          deep: '#ECE9DD'
        },
        ink: {
          DEFAULT: '#1D1D18',
          soft: '#2B2B24'
        },
        lime: {
          DEFAULT: '#D9ED4E',
          soft: '#F5FBD8',
          deep: '#C2DB35'
        },
        sun: { DEFAULT: '#F6D860', soft: '#FCF3CE' },
        sky: { DEFAULT: '#B9CDF0', soft: '#E7EEFA' },
        lav: { DEFAULT: '#CBB9F2', soft: '#F0EAFC' },
        blush: { DEFAULT: '#F3B9B9', soft: '#FBE9E9' },
        mint: { DEFAULT: '#A9DDBB', soft: '#E3F5EA' },
        line: '#EAE7DC'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      },
      borderRadius: {
        '4xl': '2rem'
      },
      boxShadow: {
        card: '0 1px 2px rgba(29,29,24,0.04)',
        pop: '0 12px 40px rgba(29,29,24,0.12)'
      }
    },
  },
  plugins: [],
}
