import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Closes a popover on an outside click or Escape. */
export function usePopover() {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', out)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', out)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  return { open, setOpen, box }
}

/** Pill button + floating card with a little pointer, as in the reference filters. */
export function Pop({ label, active, children, align = 'left', width = 260 }: { label: ReactNode; active?: boolean; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; width?: number }) {
  const { open, setOpen, box } = usePopover()
  return (
    <div ref={box} className="relative">
      <button type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] whitespace-nowrap transition-colors ${open || active ? 'border-pine-700 bg-pine-50 text-pine-900' : 'border-line-strong bg-white text-ink-900 hover:border-pine-700'}`}>
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }} style={{ width }} className={`absolute top-full z-40 mt-3 max-w-[calc(100vw-32px)] rounded-xl bg-white p-2 shadow-[0_12px_32px_-10px_rgba(18,55,42,0.28)] ring-1 ring-line ${align === 'right' ? 'right-0' : 'left-0'}`}>
            <span aria-hidden="true" className={`absolute -top-[6px] h-3 w-3 rotate-45 border-t border-l border-line bg-white ${align === 'right' ? 'right-8' : 'left-8'}`} />
            <div className="relative">{children(() => setOpen(false))}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export type Option = { value: string; label: string; sub?: string }

/**
 * Multi-select filter. `selected` empty = everything (shown as the "all" label).
 * style 'tick' = blue-tick list (Reservations), 'box' = checkboxes (Listings).
 */
export function MultiFilter({ allLabel, options, selected, onChange, style = 'tick', search = false, align, unit }: { allLabel: string; options: Option[]; selected: string[]; onChange: (v: string[]) => void; style?: 'tick' | 'box'; search?: boolean; align?: 'left' | 'right'; unit: string }) {
  const [q, setQ] = useState('')
  const all = selected.length === 0 || selected.length === options.length
  const label = all ? allLabel : selected.length === 1 ? (options.find((o) => o.value === selected[0])?.label ?? allLabel) : `${selected.length} ${unit}`
  const n = q.trim().toLowerCase()
  const shown = options.filter((o) => !n || o.label.toLowerCase().includes(n) || o.sub?.toLowerCase().includes(n))
  // With "all" chosen, the items look unticked in the box/search styles, so picking one means "only this".
  const allLooksTicked = style === 'tick' && !search
  const toggle = (v: string) => {
    if (all && !allLooksTicked) return onChange(options.length === 1 ? [] : [v])
    const base = all ? options.map((o) => o.value) : selected
    const next = base.includes(v) ? base.filter((x) => x !== v) : [...base, v]
    onChange(next.length === options.length ? [] : next)
  }
  const mark = (on: boolean) =>
    style === 'tick' ? (
      <Check className={`h-4 w-4 shrink-0 text-pine-800 ${on ? '' : 'invisible'}`} strokeWidth={2.5} aria-hidden="true" />
    ) : (
      <span aria-hidden="true" className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] ${on ? 'border-pine-800 bg-pine-800 text-white' : 'border-ink-400 bg-white'}`}>
        {on && <Check className="h-3 w-3" strokeWidth={3.5} />}
      </span>
    )
  const row = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] transition-colors hover:bg-pine-50'
  return (
    <Pop label={label} active={!all} align={align} width={search ? 280 : 230}>
      {() => (
        <div className="flex flex-col">
          {search && (
            <label className="mx-1 mt-1 mb-2 flex h-11 items-center gap-2 rounded-full bg-[#cfdfd5] px-4 ring-pine-700 focus-within:bg-white focus-within:ring-1">
              <Search className="h-4 w-4 text-ink-900" aria-hidden="true" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" aria-label={`Search ${unit}`} />
            </label>
          )}
          <div className="max-h-[300px] overflow-y-auto">
            {(search || style === 'box') && !n && (
              <button type="button" role="menuitemcheckbox" aria-checked={all} onClick={() => onChange([])} className={`${row} ${style === 'tick' && all ? 'font-semibold text-pine-800' : 'text-ink-900'}`}>
                {mark(all)} {style === 'tick' ? 'Select all' : allLabel}
              </button>
            )}
            {shown.map((o) => {
              const on = all ? allLooksTicked : selected.includes(o.value)
              return (
                <button key={o.value} type="button" role="menuitemcheckbox" aria-checked={on} onClick={() => toggle(o.value)} className={`${row} ${style === 'tick' && on ? 'font-semibold text-pine-800' : 'text-ink-900'}`}>
                  {mark(on)}
                  <span className="min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.sub && <span className="block text-[13px] font-normal text-ink-500">{o.sub}</span>}
                  </span>
                </button>
              )
            })}
            {shown.length === 0 && <p className="px-3 py-3 text-[14px] text-ink-500">Nothing matches “{q}”.</p>}
          </div>
        </div>
      )}
    </Pop>
  )
}

/** "Show 10 / 100 / 1000" page-size picker with radio buttons. */
export function PageSize({ value, onChange, sizes = [10, 100, 1000] }: { value: number; onChange: (n: number) => void; sizes?: number[] }) {
  const { open, setOpen, box } = usePopover()
  return (
    <div ref={box} className="relative flex items-center gap-2 text-[14px] text-ink-700">
      Show
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[14px] ${open ? 'border-pine-700 bg-pine-50 text-pine-900' : 'border-line-strong bg-white text-ink-900'}`}>
        {value}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="listbox" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }} className="absolute top-full left-8 z-40 mt-3 w-[140px] rounded-xl bg-white p-2 shadow-[0_12px_32px_-10px_rgba(18,55,42,0.28)] ring-1 ring-line">
            <span aria-hidden="true" className="absolute -top-[6px] left-6 h-3 w-3 rotate-45 border-t border-l border-line bg-white" />
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                role="option"
                aria-selected={s === value}
                onClick={() => {
                  onChange(s)
                  setOpen(false)
                }}
                className="relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] text-ink-900 hover:bg-pine-50"
              >
                <span aria-hidden="true" className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${s === value ? 'border-pine-800' : 'border-ink-400'}`}>
                  {s === value && <span className="h-2.5 w-2.5 rounded-full bg-pine-800" />}
                </span>
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Sortable column header with the up/down arrows. */
export function SortHead({ label, dir, onClick, className = '' }: { label: string; dir: 'asc' | 'desc' | null; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 font-semibold text-ink-900 ${className}`} aria-label={`Sort by ${label}`}>
      {label}
      <svg viewBox="0 0 10 14" className="h-3.5 w-2.5" aria-hidden="true">
        <path d="M5 1 9 5.5H1z" fill={dir === 'asc' ? 'currentColor' : '#8b9690'} />
        <path d="M5 13 1 8.5h8z" fill={dir === 'desc' ? 'currentColor' : '#8b9690'} />
      </svg>
    </button>
  )
}

/** Page numbers with previous/next arrows. */
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1)
  const arrow = 'flex h-8 w-8 items-center justify-center rounded-lg text-ink-700 hover:bg-paper disabled:text-ink-400 disabled:hover:bg-transparent'
  return (
    <nav aria-label="Pages" className="flex items-center gap-1">
      <button type="button" className={arrow} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
        ‹
      </button>
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-ink-400">…</span>}
          <button type="button" aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)} className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[14px] font-semibold ${n === page ? 'border-2 border-pine-800 text-pine-900' : 'text-ink-700 hover:bg-paper'}`}>
            {n}
          </button>
        </span>
      ))}
      <button type="button" className={arrow} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
        ›
      </button>
    </nav>
  )
}
