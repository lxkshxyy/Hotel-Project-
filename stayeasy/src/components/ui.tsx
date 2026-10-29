import { motion } from 'framer-motion'
import {
  AirVent,
  BellRing,
  Car,
  Coffee,
  Dumbbell,
  Droplets,
  Shield,
  Tv,
  UtensilsCrossed,
  Waves,
  Wifi,
  Zap,
  ArrowUpDown,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import type { AmenityKey } from '../data/types'
import { ratingWord } from '../lib/format'

export const amenityMeta: Record<AmenityKey, { label: string; Icon: LucideIcon }> = {
  wifi: { label: 'Free Wi-Fi', Icon: Wifi },
  ac: { label: 'Air conditioning', Icon: AirVent },
  tv: { label: 'TV', Icon: Tv },
  pool: { label: 'Swimming pool', Icon: Waves },
  breakfast: { label: 'Breakfast', Icon: Coffee },
  parking: { label: 'Parking', Icon: Car },
  lift: { label: 'Lift', Icon: ArrowUpDown },
  security: { label: '24/7 security', Icon: Shield },
  roomService: { label: 'Room service', Icon: BellRing },
  powerBackup: { label: 'Power backup', Icon: Zap },
  restaurant: { label: 'Restaurant', Icon: UtensilsCrossed },
  hotWater: { label: 'Hot water', Icon: Droplets },
  gym: { label: 'Gym', Icon: Dumbbell },
}

export function RatingBadge({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-leaf-700 font-bold text-white ${
        size === 'lg' ? 'rounded-xl px-3 py-2 text-xl' : 'px-2 py-0.5 text-sm'
      }`}
      aria-label={rating > 0 ? `Rated ${rating} out of 5, ${ratingWord(rating)}` : 'New listing, no ratings yet'}
    >
      {rating > 0 ? rating.toFixed(1) : 'New'}
      {size === 'sm' && rating > 0 && <span aria-hidden="true">★</span>}
    </span>
  )
}

export function BrandPill({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'white' }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold text-navy-800 ${
        tone === 'white' ? 'bg-white shadow-sm' : 'bg-navy-100'
      }`}
    >
      {children}
    </span>
  )
}

/** Fades and lifts content in as it scrolls into view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="font-semibold">{label}</div>
        {hint && <div className="text-xs text-ink-500">{hint}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-lg font-bold text-navy-800 disabled:opacity-40"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <span className="w-5 text-center font-bold" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-lg font-bold text-navy-800 disabled:opacity-40"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-500" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-navy-100 border-t-navy-800" />
      {label}…
    </div>
  )
}

/** Simple accessible dialog: Escape and the backdrop close it. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-950/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full text-xl hover:bg-canvas">
          ×
        </button>
        <h2 className="pr-10 text-xl font-extrabold text-navy-800">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
