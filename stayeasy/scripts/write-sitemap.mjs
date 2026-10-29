// Writes dist/sitemap.xml and dist/robots.txt after a build, using SITE_URL (or VERCEL_PROJECT_PRODUCTION_URL).
// Hotel pages come from src/data/hotels.ts; partner hotels added later are found by search engines through links.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const site = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')).replace(/\/$/, '')
if (!existsSync('dist')) process.exit(0)
const src = readFileSync('supabase/seed.sql', 'utf8')
const slugs = [...src.matchAll(/^\s+\('([a-z0-9-]+)',/gm)].map((m) => m[1])
const pages = ['/', '/hotels', '/offers', '/club', '/about', '/help', '/terms', '/privacy', '/cancellation-policy', '/guest-policy', ...slugs.map((s) => `/hotel/${s}`)]
if (site) {
  writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${site}${p}</loc></url>`).join('\n')}\n</urlset>\n`)
}
writeFileSync('dist/robots.txt', `User-agent: *\nDisallow: /checkout\nDisallow: /bookings\nDisallow: /account\nDisallow: /biz\n${site ? `Sitemap: ${site}/sitemap.xml\n` : ''}`)
console.log(`robots.txt${site ? ` and sitemap.xml (${pages.length} pages)` : ''} written`)
