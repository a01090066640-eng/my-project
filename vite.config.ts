import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://a01090066640-eng.github.io/my-project/ (a GitHub Pages
  // project site, not a user/org root site), so asset URLs need this prefix —
  // without it the built index.html references /assets/... at the domain root,
  // which 404s under the subpath and leaves the page blank (index.html loads,
  // the JS bundle that mounts React never does).
  base: '/my-project/',
  plugins: [react(), tailwindcss()],
})
