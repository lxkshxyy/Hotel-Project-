import { AnimatePresence, motion } from 'framer-motion'
import { Download, ScanQrCode, X } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { site } from '../config/site'
import type { Listing } from '../lib/types'
import steps from '../assets/review-qr-steps.webp'

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
      <AnimatePresence>
        {open && <QrDialog title={`${site.marketplace} Review QR Code`} busy={busy} onDownload={download} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

const stepText = ['Download QR code & print it', 'Display it somewhere visible', 'Encourage guests to give a review when they check out.']

/** The 3-step pop-up: icon header, numbered stepper, illustration strip and the download button. */
function QrDialog({ title, busy, onDownload, onClose }: { title: string; busy: boolean; onDownload: () => void; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()} className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/45 p-3 backdrop-blur-[2px] sm:p-6">
      <motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ y: 18, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 18, scale: 0.97, opacity: 0 }} transition={{ duration: 0.22 }} className="flex max-h-[calc(100dvh-24px)] w-full max-w-[900px] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl sm:max-h-[calc(100dvh-48px)]">
        <div className="flex shrink-0 items-center gap-4 border-b border-line px-5 py-4 sm:px-7 sm:py-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pine-800 text-white shadow-[0_4px_10px_rgba(24,63,49,0.25)] sm:h-12 sm:w-12">
            <ScanQrCode className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="min-w-0 flex-1 font-[Roboto,sans-serif] text-[19px] font-[700] text-ink-900 sm:text-[24px]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-900 hover:bg-paper">
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pt-5 pb-6 sm:px-7 sm:pt-6">
          <ol className="grid grid-cols-3 gap-2 sm:gap-4">
            {stepText.map((t, i) => (
              <li key={t} className="relative flex flex-col items-center text-center">
                {i < 2 && <span aria-hidden="true" className="absolute top-[18px] left-[calc(50%+30px)] h-0.5 w-[calc(100%-60px)] bg-line sm:top-[22px] sm:left-[calc(50%+40px)] sm:w-[calc(100%-80px)]" />}
                <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.08 + i * 0.08 }} className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-pine-800 font-[Roboto,sans-serif] text-[16px] font-[700] sm:h-11 sm:w-11 sm:text-[19px] ${i === 0 ? 'bg-pine-800 text-white' : 'bg-white text-pine-800'}`}>
                  {i + 1}
                </motion.span>
                <p className="mt-2.5 font-[Roboto,sans-serif] text-[12.5px] leading-snug text-ink-900 sm:mt-3 sm:text-[16px]">{t}</p>
              </li>
            ))}
          </ol>
          <img src={steps} alt="Print the QR card, place it on the reception desk, and guests scan it with their phone" width={1322} height={364} className="mt-5 block h-auto w-full rounded-2xl sm:mt-6 sm:rounded-[20px]" />
          <div className="mt-5 flex justify-end sm:mt-6">
            <button type="button" onClick={onDownload} disabled={busy} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#e8b53a] px-7 font-[Roboto,sans-serif] text-[15px] font-[700] tracking-wide text-ink-900 uppercase shadow-[0_8px_18px_rgba(200,150,46,0.35)] transition hover:bg-[#dfa92b] disabled:opacity-60 sm:h-14 sm:w-auto sm:text-[17px]">
              <Download className="h-5 w-5" aria-hidden="true" /> {busy ? 'Preparing…' : 'Download QR code'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
