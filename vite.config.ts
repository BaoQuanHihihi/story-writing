import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * GitHub Actions sets GITHUB_REPOSITORY=owner/repo. Use that so asset URLs match
 * Project Pages (https://owner.github.io/repo/). User/org pages repo (owner.github.io)
 * must keep base "/" so the site root resolves correctly.
 */
function resolveBase(): string {
  const full = process.env.GITHUB_REPOSITORY
  if (!full) return '/'
  const [owner, repo] = full.split('/')
  if (!owner || !repo) return '/'
  if (repo === `${owner}.github.io`) return '/'
  return `/${repo}/`
}

// https://vite.dev/config/
export default defineConfig({
  base: resolveBase(),
  plugins: [react(), tailwindcss()],
})
