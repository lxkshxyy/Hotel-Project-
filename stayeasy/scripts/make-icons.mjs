// Generates the PNG app icons from public/favicon.svg. Run: node scripts/make-icons.mjs
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url))
// Square-cornered version for maskable icons (the OS applies its own mask).
const maskable = Buffer.from(
  svg.toString().replace('rx="16"', 'rx="0"').replace('<path', '<g transform="translate(9.6 9.6) scale(0.7)"><path').replace('</svg>', '</g></svg>').replace('<circle', '<circle'),
)

const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname
await sharp(svg, { density: 512 }).resize(192, 192).png().toFile(out('pwa-192.png'))
await sharp(svg, { density: 512 }).resize(512, 512).png().toFile(out('pwa-512.png'))
await sharp(svg, { density: 512 }).resize(180, 180).flatten({ background: '#14306B' }).png().toFile(out('apple-touch-icon.png'))
await sharp(maskable, { density: 512 }).resize(512, 512).png().toFile(out('pwa-maskable-512.png'))
console.log('icons written')
