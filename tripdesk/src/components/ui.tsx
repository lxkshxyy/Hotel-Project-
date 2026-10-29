import { Loader2, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { inr } from '@stayeasy/lib/format'
import { site } from '../config/site'

/** TripDesk mark: a marigold ticket with a perforation. */
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#1B2240" />
      <path d="M14 22h36v8a4 4 0 0 0 0 8v8H14v-8a4 4 0 0 0 0-8z" fill="#F0A202" />
      <path d="M36 22v24" stroke="#1B2240" strokeWidth="2.5" strokeDasharray="3 3" />
    </svg>
  )
}

export function Logo({ to = '/', light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 no-underline" aria-label={`${site.name} home`}>
      <Mark />
      <span className={`text-[21px] font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink-900'}`}>{site.name}</span>
    </Link>
  )
}

export const Money = ({ v, className = '' }: { v: number; className?: string }) => <span className={`tabular-nums ${className}`}>{inr(v)}</span>

/**
 * The rate slip: what the agent pays, what they add, what the customer pays.
 * The perforation separates the agent's side from the customer's side.
 */
export function RateSlip({ net, markup, selling, size = 'md', note }: { net: number; markup: number; selling: number; size?: 'sm' | 'md' | 'lg'; note?: string }) {
  const big = size === 'lg' ? 'text-[30px]' : size === 'md' ? 'text-[22px]' : 'text-[18px]'
  return (
    <div className="relative flex overflow-hidden rounded-xl bg-white shadow-slip ring-1 ring-line" role="group" aria-label={`Net ${inr(net)}, your markup ${inr(markup)}, customer pays ${inr(selling)}`}>
      <div className="flex flex-1 flex-col justify-center gap-0.5 px-4 py-3">
        <span className="text-[12px] font-semibold text-muted">You pay</span>
        <Money v={net} className={`${big} leading-none font-extrabold text-ink-900`} />
        <span className="text-[12.5px] font-bold text-earn">+ {inr(markup)} yours</span>
      </div>
      <div aria-hidden="true" className="relative w-0 border-l-2 border-dashed border-line-strong">
        <span className="absolute -top-2 -left-[9px] h-4 w-4 rounded-full bg-paper ring-1 ring-line" />
        <span className="absolute -bottom-2 -left-[9px] h-4 w-4 rounded-full bg-paper ring-1 ring-line" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-0.5 bg-gold-50 px-4 py-3">
        <span className="text-[12px] font-semibold text-gold-700">Customer pays</span>
        <Money v={selling} className={`${big} leading-none font-extrabold text-ink-950`} />
        {note && <span className="text-[12px] text-muted">{note}</span>}
      </div>
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> {label}…
    </div>
  )
}

export function PageHead({ title, intro, children }: { title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-extrabold text-ink-950">{title}</h1>
        {intro && <p className="mt-1 max-w-2xl text-muted">{intro}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'ok'; children: ReactNode }) {
  const c = { info: 'border-ink-100 bg-ink-50 text-ink-900', warn: 'border-gold-100 bg-gold-50 text-[#6b4700]', error: 'border-[#f5c2bd] bg-alert-50 text-alert', ok: 'border-[#bfe5d3] bg-earn-50 text-earn' }[tone]
  return <div className={`rounded-lg border px-4 py-3 text-[14.5px] ${c}`}>{children}</div>
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50 text-ink-700">{icon}</span>
      <strong className="text-lg text-ink-950">{title}</strong>
      {children}
    </div>
  )
}

export function Pill({ tone, children }: { tone: 'ok' | 'muted' | 'warn' | 'bad' | 'ink'; children: ReactNode }) {
  const c = { ok: 'bg-earn-50 text-earn', muted: 'bg-[#eceff4] text-muted', warn: 'bg-gold-100 text-[#6b4700]', bad: 'bg-alert-50 text-alert', ink: 'bg-ink-50 text-ink-900' }[tone]
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12.5px] font-bold ${c}`}>{children}</span>
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
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-950/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <button type="button" aria-label="Close" onClick={onClose} className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 className="pr-10 text-xl font-extrabold text-ink-950">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export function Stat({ label, value, sub, tone = 'ink' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ink' | 'earn' | 'gold' }) {
  const c = tone === 'earn' ? 'text-earn' : tone === 'gold' ? 'text-gold-700' : 'text-ink-950'
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <span className={`text-[28px] leading-none font-extrabold tabular-nums ${c}`}>{value}</span>
      {sub && <span className="text-[13px] text-muted">{sub}</span>}
    </div>
  )
}
