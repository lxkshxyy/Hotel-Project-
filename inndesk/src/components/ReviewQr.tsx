import { AnimatePresence, motion } from 'framer-motion'
import { Download, X } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { site } from '../config/site'
import type { Listing } from '../lib/types'
import { Modal } from './ui'

// Closed for the rest of this visit (until the page is reloaded).
let closedThisVisit = false

/** The property's review page on the customer site, which the QR opens. */
const reviewUrl = (l: Listing) => `${site.mainSiteUrl}/hotel/${l.slug || l.id}#reviews`

async function downloadCard(l: Listing) {
  const W = 1240
  const H = 1754 // A5-ish, prints well
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const font = (w: number, px: number) => `${w} ${px}px Roboto, Arial, sans-serif`
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#183f31'
  g.fillRect(0, 0, W, 300)
  g.fillStyle = '#c8962e'
  g.fillRect(0, 300, W, 14)
  g.textAlign = 'center'
  g.fillStyle = '#ffffff'
  g.font = font(900, 92)
  g.fillText(site.marketplace, W / 2, 170)
  g.font = font(400, 38)
  g.fillText('Rate your stay', W / 2, 240)
  g.fillStyle = '#1d2b24'
  g.font = font(700, 58)
  g.fillText(l.basics.name.trim() || 'Our property', W / 2, 430, W - 120)
  g.font = font(400, 40)
  g.fillStyle = '#4c5a53'
  g.fillText('Enjoyed your stay? Scan the code and', W / 2, 510)
  g.fillText('tell other travellers about it.', W / 2, 562)
  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, reviewUrl(l), { width: 640, margin: 1, color: { dark: '#183f31', light: '#ffffff' }, errorCorrectionLevel: 'M' })
  g.strokeStyle = '#cfe3d7'
  g.lineWidth = 6
  g.beginPath()
  g.roundRect(W / 2 - 360, 640, 720, 720, 36)
  g.stroke()
  g.drawImage(qr, W / 2 - 320, 680, 640, 640)
  g.fillStyle = '#c8962e'
  g.font = font(700, 64)
  g.fillText('★ ★ ★ ★ ★', W / 2, 1480)
  g.fillStyle = '#4c5a53'
  g.font = font(400, 34)
  g.fillText('Point your phone camera at the code', W / 2, 1560)
  g.font = font(500, 30)
  g.fillStyle = '#183f31'
  g.fillText('Thank you for staying with us!', W / 2, 1660)
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/png'))
  if (!blob) return
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: `${(l.slug || 'property')}-review-qr.png` }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/* Original illustrations for the three steps. */
const Printer = () => (
  <svg viewBox="0 0 200 170" className="h-[150px] w-full" aria-hidden="true">
    <rect x="62" y="10" width="76" height="60" fill="#fff" stroke="#c9d3cd" />
    <rect x="20" y="62" width="160" height="70" rx="8" fill="#3d4a44" />
    <rect x="20" y="62" width="160" height="16" rx="6" fill="#56645d" />
    <circle cx="160" cy="92" r="4" fill="#e0794a" />
    <circle cx="170" cy="92" r="4" fill="#7fcf9a" />
    <path d="M44 120h112l14 40H30z" fill="#fff" stroke="#c9d3cd" />
    <rect x="56" y="122" width="88" height="36" fill="#183f31" transform="skewX(-8)" />
    <rect x="96" y="128" width="22" height="22" fill="#fff" transform="skewX(-8)" />
    <path d="M100 132h4v4h-4zM108 132h4v4h-4zM100 140h12v4h-12z" fill="#183f31" transform="skewX(-8)" />
  </svg>
)
const Desk = () => (
  <svg viewBox="0 0 200 170" className="h-[150px] w-full" aria-hidden="true">
    <text x="100" y="22" textAnchor="middle" fontSize="13" fontWeight="700" fill="#8b9690" letterSpacing="1.5">
      RECEPTION
    </text>
    <rect x="10" y="118" width="180" height="46" rx="4" fill="#d6dcd8" />
    <rect x="10" y="110" width="180" height="12" fill="#b9c2bd" />
    <rect x="22" y="70" width="30" height="24" rx="2" fill="#56645d" />
    <rect x="34" y="94" width="6" height="16" fill="#56645d" />
    <path d="M110 110l8-62h36l8 62z" fill="#183f31" />
    <rect x="122" y="56" width="28" height="6" fill="#c8962e" />
    <rect x="124" y="70" width="24" height="24" fill="#fff" />
    <path d="M128 74h5v5h-5zM139 74h5v5h-5zM128 85h5v5h-5zM137 83h7v7h-7z" fill="#183f31" />
  </svg>
)
const Scan = () => (
  <svg viewBox="0 0 200 170" className="h-[150px] w-full" aria-hidden="true">
    <rect x="10" y="118" width="180" height="46" rx="4" fill="#d6dcd8" />
    <rect x="10" y="110" width="180" height="12" fill="#b9c2bd" />
    <path d="M56 110l8-62h36l8 62z" fill="#183f31" />
    <rect x="70" y="70" width="24" height="24" fill="#fff" />
    <path d="M74 74h5v5h-5zM85 74h5v5h-5zM74 85h5v5h-5zM83 83h7v7h-7z" fill="#183f31" />
    <path d="M150 150c-8-14-10-30-4-44l14-6 26 40-6 24z" fill="#e8b48f" />
    <rect x="120" y="18" width="40" height="72" rx="7" fill="#fff" stroke="#1d2b24" strokeWidth="2.5" />
    <rect x="128" y="34" width="24" height="24" fill="#183f31" />
    <rect x="132" y="38" width="16" height="16" fill="#fff" />
    <rect x="137" y="43" width="6" height="6" fill="#183f31" />
    <path d="M144 96c-6-6-4-16 4-18l10 4" fill="#e8b48f" />
  </svg>
)

/** Small reminder card above the Bookings filters, plus the 3-step QR pop-up. */
export function ReviewQrCard({ l }: { l: Listing }) {
  const [hidden, setHidden] = useState(closedThisVisit)
  const [pulse, setPulse] = useState(0)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  // Every 2 minutes the card pops again to catch the eye (until closed).
  useEffect(() => {
    if (hidden) return
    const t = window.setInterval(() => setPulse((n) => n + 1), 120000)
    return () => window.clearInterval(t)
  }, [hidden])
  const close = () => {
    closedThisVisit = true
    setHidden(true)
  }
  const download = async () => {
    setBusy(true)
    try {
      await downloadCard(l)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <AnimatePresence>
        {!hidden && (
          <motion.div key={pulse} initial={{ opacity: 0, y: -10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: [0.96, 1.03, 1] }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.45 }} className="relative mb-4 rounded-xl border border-pine-100 bg-pine-50 p-4 pr-9">
            <button type="button" onClick={close} aria-label="Close" className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-ink-700 hover:bg-white">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <strong className="block text-[14.5px] font-semibold text-ink-900">QR code for Ratings &amp; Reviews</strong>
            <p className="mt-1 text-[13.5px] text-ink-700">Turn happy stays into 5-star ratings &amp; reviews!</p>
            <button type="button" onClick={() => setOpen(true)} className="mt-3 h-8 rounded-md bg-brass-500 px-3 text-[12.5px] font-bold tracking-wide text-pine-950 uppercase hover:bg-brass-600">
              Download QR code
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <Modal open={open} onClose={() => setOpen(false)} title={`${site.marketplace} Review QR Code`} wide>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            ['Download QR code & print it', <Printer key="p" />],
            ['Display it somewhere visible', <Desk key="d" />],
            ['Encourage guests to give a review when they check out.', <Scan key="s" />],
          ].map(([text, art], i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-pine-800 text-[14px] font-bold text-pine-800">{i + 1}</span>
              <p className="mt-2 min-h-[44px] text-[14.5px] text-ink-900">{text}</p>
              <div className="mt-3 w-full">{art}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={download} disabled={busy} className="flex h-11 items-center gap-2 rounded-lg bg-brass-500 px-6 text-[14.5px] font-bold tracking-wide text-pine-950 uppercase hover:bg-brass-600 disabled:opacity-60">
            <Download className="h-4 w-4" aria-hidden="true" /> {busy ? 'Preparing…' : 'Download QR code'}
          </button>
        </div>
      </Modal>
    </>
  )
}
