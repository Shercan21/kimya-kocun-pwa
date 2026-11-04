import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// KIMYA_KOCUM, KIMYA_KOCUN (5173) ile karışmasın diye 5174'te açılır.
export default defineConfig({
  // GitHub Pages için: BASE_PATH=/kimya-kocum/ npm run build
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), { name:'offline-shell', closeBundle() {
    const files=readdirSync('dist/assets').filter(f=>/\.(js|css)$/.test(f))
    const path='dist/sw.js'
    const sw=readFileSync(path,'utf8').replace('  BASE,',files.map(f=>'  BASE + '+JSON.stringify('assets/'+f)+',').join('\n')+'\n  BASE,')
    writeFileSync(path,sw)
  }}],
  server: { port: 5183, strictPort: true },
  preview: { port: 4174, strictPort: true },
})
