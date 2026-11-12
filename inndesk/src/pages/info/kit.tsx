import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ExternalLink, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { site } from '../../config/site'
import type { Listing } from '../../lib/types'

/** Edits the listing in memory; the page's Save button stores it. */
export type Set = (fn: (l: Listing) => Listing) => void
export type Commit = (fn: (l: Listing) => Listing) => Promise<void>
export type InfoProps = { l: Listing; set: Set; commit: Commit; base: string }

export const inputCls = 'h-11 w-full rounded-lg border border-ink-400 bg-white px-3 text-[15px] text-ink-900 outline-none transition-colors focus:border-pine-700 focus:ring-1 focus:ring-pine-700 disabled:cursor-not-allowed disabled:border-line disabled:bg-[#F4F8FC] disabled:text-ink-700'
export const areaCls = 'w-full rounded-lg border border-ink-400 bg-white px-3 py-2.5 text-[15px] leading-relaxed text-ink-900 outline-none transition-colors focus:border-pine-700 focus:ring-1 focus:ring-pine-700'

/** Page title with "See it live" on the right. */
export function PageTitle({ title, count, l, intro, children }: { title: string; count?: number; l: Listing; intro?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold text-ink-900 sm:text-[32px]">
          {title}
          {count != null && <span className="font-normal"> ({count})</span>}
        </h1>
        {intro && <p className="mt-1 text-[14.5px] text-ink-700">{intro}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        {l.status === 'live' && (
          <a href={`${site.mainSiteUrl}/hotel/${l.slug || l.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[14px] font-semibold text-pine-800 no-underline hover:underline">
            See it live on {site.marketplace} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  )
}

/** Uppercase underline tabs, as on the extranet. */
export function Tabs<T extends string>({ value, onChange, tabs, id }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: string; isNew?: boolean; count?: number }[]; id: string }) {
  return (
    <div role="tablist" className="-mx-4 mt-5 flex gap-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:gap-9 sm:px-0">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={`relative flex shrink-0 items-center gap-2 pb-3 text-[14px] font-medium tracking-wide whitespace-nowrap uppercase transition-colors ${value === t.id ? 'text-pine-800' : 'text-ink-900 hover:text-pine-800'}`}>
          {t.label}
          {t.count != null && <span>({t.count})</span>}
          {t.isNew && <span className="rounded-full bg-brass-500 px-1.5 text-[11px] leading-[18px] font-bold text-pine-950 normal-case">new</span>}
          {value === t.id && <motion.span layoutId={`tab-${id}`} className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-pine-800" />}
        </button>
      ))}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-line-strong bg-white shadow-[0_2px_6px_-4px_rgba(26, 44, 91,0.25)] ${className}`}>{children}</section>
}

export function Field({ label, required, hint, error, children, htmlFor }: { label: string; required?: boolean; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1.5 block text-[14px] text-ink-900">
        {label}
        {required && <span className="ml-1 text-alert">*</span>}
      </label>
      {children}
      {error ? <span className="mt-1 block text-[12.5px] text-alert">{error}</span> : hint ? <span className="mt-1 block text-[12.5px] text-ink-500">{hint}</span> : null}
    </div>
  )
}

export function Radio({ name, checked, onChange, children, hint }: { name: string; checked: boolean; onChange: () => void; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[15px] text-ink-900">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 h-4 w-4 shrink-0 accent-pine-800" />
      <span>
        {children}
        {hint && <span className="mt-0.5 block text-[13px] text-ink-500">{hint}</span>}
      </span>
    </label>
  )
}

/** Right-column FAQ card with Hide / Show. */
export function Faq({ items }: { items: [string, ReactNode][] }) {
  const [shown, setShown] = useState(true)
  const [open, setOpen] = useState(0)
  return (
    <Card>
      <div className="flex items-center justify-between px-4 py-3.5">
        <h2 className="text-[15px] font-semibold text-ink-900">Frequently Asked Questions</h2>
        <button type="button" onClick={() => setShown((s) => !s)} aria-expanded={shown} className="text-[14px] font-semibold text-pine-800 hover:underline">
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {shown &&
        items.map(([q, a], i) => (
          <div key={q} className="border-t border-line">
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-[14.5px] text-pine-800 ${open === i ? 'bg-pine-50' : 'hover:bg-[#F4F8FC]'}`}>
              {q}
              <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-ink-700 transition-transform ${open === i ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-4 pt-1 pb-4 text-[14px] leading-relaxed text-ink-700">{a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
    </Card>
  )
}

/** Centred pop-up with a scrolling body and a fixed footer. */
export function Dialog({ title, onClose, children, footer, wide = false }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[aria-label="Choose dates"]') && onClose()
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()} className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/45 p-3 sm:p-6">
      <motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} transition={{ duration: 0.2 }} className={`flex max-h-[calc(100dvh-24px)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-48px)] ${wide ? 'max-w-[720px]' : 'max-w-[480px]'}`}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-[19px] font-semibold text-ink-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-paper">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        {footer && <div className="flex shrink-0 items-center justify-end gap-3 border-t border-line px-5 py-4">{footer}</div>}
      </motion.div>
    </motion.div>
  )
}

export const btnOutline = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-pine-800 px-4 text-[14.5px] font-semibold text-pine-800 hover:bg-pine-50 disabled:opacity-50'
export const btnSolid = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-pine-800 px-5 text-[14.5px] font-semibold text-white hover:bg-pine-900 disabled:opacity-50'
export const btnLink = 'inline-flex items-center gap-1.5 text-[13.5px] font-semibold tracking-wide text-pine-800 uppercase hover:underline'
