module.exports = {
  plugins: {
    "tailwindcss/nesting": {}, // 1. Nesting plugin runs first to unpack nested rules
    tailwindcss: {}, // 2. Tailwind runs second to process utility classes
    autoprefixer: {}, // 3. Autoprefixer runs last to add vendor prefixes
  },
};
