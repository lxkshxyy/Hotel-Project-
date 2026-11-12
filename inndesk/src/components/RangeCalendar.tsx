import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { parseISODate, toISODate, todayISO } from '../lib/format'

export type DateMode = 'checkin' | 'stay' | 'booking'
export type DateFilter = { mode: DateMode; from: string; to: string } | null

const modes: { id: DateMode; label: string }[] = [
  { id: 'checkin', label: 'Check-in dates' },
  { id: 'stay', label: 'Stay dates' },
  { id: 'booking', label: 'Booking dates' },
]
export const modeLabel = (m: DateMode) => modes.find((x) => x.id === m)!.label
const week = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const monthName = (y: number, m: number) => new Date(y, m, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
const fmt = (iso: string) => parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const iso = (y: number, m: number, d: number) => toISODate(new Date(y, m, d))

function Month({ y, m, start, end, hover, onPick, onHover, min }: { y: number; m: number; start: string; end: string; hover: string; onPick: (d: string) => void; onHover: (d: string) => void; min?: string }) {
  const first = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const t = todayISO()
  const last = end || (start && hover > start ? hover : '')
  return (
    <div className="min-w-0 flex-1">
      <div className="grid grid-cols-7 bg-[#eef4f0] py-2.5 text-center text-[14px] font-semibold text-ink-900">
        {week.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-1.5">
        {Array.from({ length: first }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = iso(y, m, i + 1)
          const isStart = d === start
          const isEnd = d === last && !!last
          const inside = !!start && !!last && d > start && d < last
          const edge = isStart || isEnd
          const off = !!min && d < min
          return (
            <span key={d} className={`flex h-11 items-center justify-center ${inside ? 'bg-pine-50' : ''} ${isStart && last && last !== start ? 'rounded-l-lg bg-gradient-to-r from-transparent from-50% to-pine-50 to-50%' : ''} ${isEnd && start !== last ? 'bg-gradient-to-r from-pine-50 from-50% to-transparent to-50%' : ''}`}>
              <button
                type="button"
                onClick={() => onPick(d)}
                disabled={off}
                onMouseEnter={() => onHover(d)}
                aria-pressed={edge}
                aria-label={fmt(d)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-lg text-[15px] transition-colors ${edge ? 'bg-pine-800 font-semibold text-white' : inside ? 'text-pine-900' : off ? 'cursor-not-allowed text-ink-400 line-through decoration-ink-400/40' : 'text-ink-900 hover:bg-pine-50'}`}
              >
                {i + 1}
                {d === t && <span aria-hidden="true" className={`absolute bottom-1.5 h-0.5 w-3.5 rounded-full ${edge ? 'bg-white' : 'bg-pine-800'}`} />}
              </button>
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** Date field + two-month range calendar with Check-in / Stay / Booking date tabs. */
export function RangeCalendar({
  value,
  onChange,
  button = false,
  tabs = true,
  single = false,
  label,
  placeholder = 'Select check-in / stay / booking date',
  centered = false,
  clearable = true,
  min,
}: {
  value: DateFilter
  onChange: (v: DateFilter) => void
  button?: boolean
  /** Show the Check-in / Stay / Booking date tabs. */
  tabs?: boolean
  /** Pick one date instead of a range. */
  single?: boolean
  /** Floating label on the field (defaults to the date mode). */
  label?: string
  placeholder?: string
  /** Open in the middle of the screen, above other pop-ups (for use inside a modal). */
  centered?: boolean
  clearable?: boolean
  /** Earliest date that can be picked. */
  min?: string
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<DateMode>('checkin')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [hover, setHover] = useState('')
  const [view, setView] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [two, setTwo] = useState(true)

  useEffect(() => {
    if (!open) return
    setMode(value?.mode ?? 'checkin')
    setStart(value?.from ?? '')
    setEnd(value?.to ?? '')
    const d = value ? parseISODate(value.from) : new Date()
    setView({ y: d.getFullYear(), m: d.getMonth() })
    const fit = () => setTwo(window.innerWidth >= 700)
    fit()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('resize', fit)
    document.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('resize', fit)
      document.removeEventListener('keydown', esc)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (d: string) => {
    if (min && d < min) return
    if (single) {
      setStart(d)
      setEnd(d)
      return
    }
    if (!start || end) {
      setStart(d)
      setEnd('')
    } else if (d < start) setStart(d)
    else setEnd(d)
  }
  const move = (n: number) => setView((v) => ({ y: v.y + Math.floor((v.m + n) / 12), m: (((v.m + n) % 12) + 12) % 12 }))
  const next = { y: view.y + (view.m === 11 ? 1 : 0), m: (view.m + 1) % 12 }
  const today = () => {
    const d = new Date()
    setView({ y: d.getFullYear(), m: d.getMonth() })
    setStart(todayISO())
    setEnd('')
  }
  const apply = () => {
    if (!start) return
    onChange({ mode, from: start, to: end || start })
    setOpen(false)
  }

  return (
    <div className={`relative ${button ? '' : 'min-w-0 flex-1'}`}>
      {button ? (
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className={`flex h-11 items-center gap-2 rounded-lg border px-4 text-[14.5px] font-semibold transition-colors ${value || open ? 'border-pine-800 bg-pine-800 text-white' : 'border-line-strong bg-white text-pine-800 hover:border-pine-700'}`}>
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {value ? (value.from === value.to ? fmt(value.from) : `${fmt(value.from)} – ${fmt(value.to)}`) : 'Select Date Range'}
        </button>
      ) : (
      <div className={`relative flex h-[52px] items-center gap-2 rounded-lg border bg-white px-3.5 transition-colors ${open ? 'border-pine-700 ring-1 ring-pine-700' : 'border-ink-400'}`}>
        {(value || label) && <span className="pointer-events-none absolute -top-2.5 left-2.5 bg-white px-1 text-[12px] leading-5 text-ink-500">{label ?? (value ? modeLabel(value.mode) : '')}</span>}
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 self-stretch text-left text-[15.5px]">
          <CalendarDays className="h-4 w-4 shrink-0 text-ink-700" aria-hidden="true" />
          <span className={`truncate ${value ? 'text-ink-900' : 'text-ink-500'}`}>{value ? (value.from === value.to ? fmt(value.from) : `${fmt(value.from)} - ${fmt(value.to)}`) : placeholder}</span>
        </button>
        {value && clearable ? (
          <button type="button" aria-label="Clear dates" onClick={() => onChange(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-paper">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />
        )}
      </div>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`fixed inset-0 bg-ink-900/35 ${centered ? 'z-[120]' : 'z-[70]'}`} onMouseDown={() => setOpen(false)} />
            <div className={centered ? 'pointer-events-none fixed inset-0 z-[121] flex items-center justify-center p-3' : 'contents'}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Choose dates"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className={
                centered
                  ? 'pointer-events-auto max-h-[calc(100dvh-24px)] w-[min(700px,100%)] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6'
                  : `fixed inset-x-3 top-20 z-[71] max-h-[calc(100dvh-100px)] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 ${button ? 'sm:left-0' : 'sm:right-0'} sm:w-[min(700px,calc(100vw-48px))] sm:p-6`
              }
              onMouseLeave={() => setHover('')}
            >
              {tabs && (
              <div role="tablist" className="grid grid-cols-3 border-b border-line">
                {modes.map((x) => (
                  <button key={x.id} type="button" role="tab" aria-selected={mode === x.id} onClick={() => setMode(x.id)} className={`relative pb-3 text-[14.5px] font-semibold transition-colors ${mode === x.id ? 'text-pine-800' : 'text-ink-500 hover:text-ink-900'}`}>
                    {x.label}
                    {mode === x.id && <motion.span layoutId="cal-tab" className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-pine-800" />}
                  </button>
                ))}
              </div>
              )}

              <div className={`flex items-start gap-8 ${tabs ? 'mt-5' : ''}`}>
                {[view, ...(two ? [next] : [])].map((v, i, arr) => (
                  <div key={`${v.y}-${v.m}`} className="min-w-0 flex-1">
                    <div className="mb-3 flex h-9 items-center justify-between">
                      {i === 0 ? (
                        <button type="button" onClick={() => move(-1)} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-full text-pine-800 hover:bg-pine-50">
                          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                        </button>
                      ) : (
                        <span className="w-9" />
                      )}
                      <strong className="text-[19px] font-semibold text-ink-900">{monthName(v.y, v.m)}</strong>
                      {i === arr.length - 1 ? (
                        <button type="button" onClick={() => move(1)} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-full text-pine-800 hover:bg-pine-50">
                          <ChevronRight className="h-6 w-6" aria-hidden="true" />
                        </button>
                      ) : (
                        <span className="w-9" />
                      )}
                    </div>
                    <Month y={v.y} m={v.m} start={start} end={end} hover={single ? '' : hover} onPick={pick} onHover={setHover} min={min} />
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button type="button" onClick={today} className="h-10 rounded-full border border-line-strong px-5 text-[14px] font-semibold text-pine-800 hover:border-pine-700 hover:bg-pine-50">
                  Today
                </button>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-full border border-line-strong px-5 text-[14px] font-semibold text-pine-800 hover:border-pine-700 hover:bg-pine-50">
                    Cancel
                  </button>
                  <button type="button" disabled={!start} onClick={apply} className="h-10 rounded-full bg-pine-800 px-6 text-[14px] font-semibold text-white hover:bg-pine-900 disabled:opacity-50">
                    Apply
                  </button>
                </div>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
