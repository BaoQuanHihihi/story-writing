import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Use base: './' for portable static hosting; set to '/your-repo/' for GitHub Project Pages.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
