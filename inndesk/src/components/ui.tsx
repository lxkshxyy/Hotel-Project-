import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { site } from '../config/site'
import type { ListingStatus } from '../lib/types'

/** InnDesk mark: a brass room-key tag on pine. */
export function Mark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#12372A" />
      <path d="M22 14h20a6 6 0 0 1 6 6v18L32 52 16 38V20a6 6 0 0 1 6-6z" fill="#C8962E" />
      <circle cx="32" cy="24" r="4.5" fill="#12372A" />
    </svg>
  )
}

export function Logo({ to = '/', light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 no-underline" aria-label={`${site.name} home`}>
      <Mark />
      <span className={`font-display text-[22px] font-extrabold tracking-tight ${light ? 'text-white' : 'text-pine-900'}`}>{site.name}</span>
    </Link>
  )
}

const tagStyle: Record<ListingStatus, string> = {
  live: 'bg-brass-500 text-pine-950',
  paused: 'bg-[#e6e9e6] text-ink-700',
  draft: 'border border-dashed border-ink-400 bg-white text-ink-700',
}
const tagText: Record<ListingStatus, string> = { live: 'Live', paused: 'Paused', draft: 'Draft' }

/** Listing status as a room-key tag: the hole on the left, the status on the tag. */
export function KeyTag({ status, label }: { status: ListingStatus; label?: string }) {
  return (
    <span className={`relative inline-flex h-7 w-fit shrink-0 items-center rounded-[7px_14px_14px_7px] pr-3 pl-6 text-[13px] font-bold ${tagStyle[status]}`}>
      <span aria-hidden="true" className="absolute left-2 h-2 w-2 rounded-full bg-paper ring-1 ring-black/10" />
      {label ?? tagText[status]}
    </span>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-ink-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> {label}…
    </div>
  )
}

export function PageHead({ title, intro, children }: { title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-bold text-pine-950 sm:text-[32px]">{title}</h1>
        {intro && <p className="mt-1 max-w-2xl text-ink-500">{intro}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line bg-white p-4 hover:border-line-strong">
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-ink-500">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-brass-500 ${checked ? 'bg-pine-800' : 'bg-line-strong'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </label>
  )
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-left text-[15px] font-semibold transition-colors ${on ? 'border-pine-800 bg-pine-50 text-pine-900' : 'border-line-strong bg-white text-ink-700 hover:border-pine-700'}`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? 'border-pine-800 bg-pine-800 text-white' : 'border-line-strong'}`}>
        {on && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
      </span>
      {children}
    </button>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pine-50 text-pine-700">{icon}</span>
      <strong className="font-display text-xl text-pine-950">{title}</strong>
      {children}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
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
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[100] flex items-end justify-center bg-pine-950/50 sm:items-center sm:p-4">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 24 }}
            animate={{ y: 0 }}
            exit={{ y: 24 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}
          >
            <button type="button" aria-label="Close" onClick={onClose} className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <h2 className="pr-10 text-xl font-bold text-pine-950">{title}</h2>
            <div className="mt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'ok'; children: ReactNode }) {
  const c = {
    info: 'border-pine-100 bg-pine-50 text-pine-900',
    warn: 'border-brass-200 bg-brass-50 text-[#5c4210]',
    error: 'border-[#f3c5c2] bg-alert-50 text-alert',
    ok: 'border-pine-100 bg-pine-50 text-live',
  }[tone]
  return <div className={`rounded-xl border px-4 py-3 text-[14.5px] ${c}`}>{children}</div>
}
