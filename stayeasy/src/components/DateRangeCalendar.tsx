import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { holidays } from '../data/holidays'
import { addDays, parseISODate, toISODate, todayISO } from '../lib/format'

const WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MAX_NIGHTS = 30

const monthStart = (iso: string) => {
  const d = parseISODate(iso)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
const short = (iso: string) => parseISODate(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ (\d\d)$/, ' $1')
const dm = (iso: string) => parseISODate(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

function useWide() {
  const [wide, setWide] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 720px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 720px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

interface Props {
  checkIn: string
  checkOut: string
  /** Which end the next click sets. */
  editing: 'in' | 'out'
  onEditing: (e: 'in' | 'out') => void
  onChange: (checkIn: string, checkOut: string) => void
  /** Called once both dates are picked. */
  onDone?: () => void
  /** Show one month even on wide screens (for narrow popups). */
  single?: boolean
}

/** Two-month range calendar with weekends and Indian festivals marked, in the style of big travel sites. */
export default function DateRangeCalendar({ checkIn, checkOut, editing, onEditing, onChange, onDone, single = false }: Props) {
  const today = todayISO()
  const wide = useWide() && !single
  const [view, setView] = useState(() => monthStart(checkIn))
  const [hover, setHover] = useState<string | null>(null)
  const months = wide ? [view, addMonths(view, 1)] : [view]
  const canPrev = view > monthStart(today)

  const pick = (iso: string) => {
    if (editing === 'in' || iso <= checkIn) {
      const out = checkOut > iso && nightsOk(iso, checkOut) ? checkOut : addDays(iso, 1)
      onChange(iso, out)
      onEditing('out')
      return
    }
    onChange(checkIn, nightsOk(checkIn, iso) ? iso : addDays(checkIn, MAX_NIGHTS))
    onEditing('in')
    onDone?.()
  }

  const visibleHolidays = useMemo(() => {
    const from = toISODate(months[0])
    const to = toISODate(addMonths(months[months.length - 1], 1))
    return Object.entries(holidays).filter(([d]) => d >= from && d < to && d >= today)
  }, [months, today])

  const rangeEnd = editing === 'out' && hover && hover > checkIn ? hover : checkOut

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-sm font-bold whitespace-nowrap sm:gap-3 sm:text-[15px]">
        <button
          type="button"
          onClick={() => onEditing('in')}
          className={`flex items-center gap-2 border-b-2 pb-1 ${editing === 'in' ? 'border-navy-800 text-navy-800' : 'border-transparent text-ink-700'}`}
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" /> {short(checkIn)}
        </button>
        <span className="text-ink-400">–</span>
        <button
          type="button"
          onClick={() => onEditing('out')}
          className={`flex items-center gap-2 border-b-2 pb-1 ${editing === 'out' ? 'border-navy-800 text-navy-800' : 'border-transparent text-ink-700'}`}
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" /> {short(checkOut)}
        </button>
        <span className="ml-auto hidden text-xs font-semibold text-ink-500 sm:inline">{editing === 'in' ? 'Select check-in' : 'Select check-out'}</span>
      </div>

      <div className="relative flex gap-6">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canPrev}
          onClick={() => setView(addMonths(view, -1))}
          className="absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-full text-navy-800 hover:bg-navy-50 disabled:opacity-25"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setView(addMonths(view, 1))}
          className="absolute top-0 right-0 flex h-8 w-8 items-center justify-center rounded-full text-navy-800 hover:bg-navy-50"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        {months.map((m) => {
          const first = m.getDay()
          const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()
          const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => toISODate(new Date(m.getFullYear(), m.getMonth(), i + 1)))]
          return (
            <div key={m.toISOString()} className="flex-1">
              <h3 className="mb-2 text-center text-lg font-bold">
                {m.toLocaleDateString('en-IN', { month: 'long' })} <span className="font-normal text-ink-500">{m.getFullYear()}</span>
              </h3>
              <div role="grid" className="grid grid-cols-7 gap-y-1 text-center">
                {WEEK.map((w) => (
                  <span key={w} className="pb-1 text-xs font-bold text-ink-500">
                    {w}
                  </span>
                ))}
                {cells.map((iso, i) => {
                  if (!iso) return <span key={`e${i}`} />
                  const d = parseISODate(iso)
                  const past = iso < today
                  const wk = d.getDay() === 0 || d.getDay() === 6
                  const hol = holidays[iso]
                  const isIn = iso === checkIn
                  const isOut = iso === rangeEnd
                  const between = iso > checkIn && iso < rangeEnd
                  const special = (wk || hol) && !past
                  return (
                    <button
                      key={iso}
                      type="button"
                      role="gridcell"
                      disabled={past}
                      aria-pressed={isIn || isOut}
                      aria-label={`${d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}${hol ? `, ${hol}` : ''}`}
                      onClick={() => pick(iso)}
                      onMouseEnter={() => setHover(iso)}
                      onMouseLeave={() => setHover(null)}
                      className={`relative flex h-12 flex-col items-center justify-center text-[15px] transition-colors ${
                        past
                          ? 'cursor-not-allowed text-ink-400/60'
                          : isIn || isOut
                            ? 'rounded-lg bg-navy-800 font-bold text-white'
                            : between
                              ? 'bg-navy-100 font-semibold text-navy-800'
                              : special
                                ? 'bg-[#FFF3E2] font-semibold hover:bg-[#FFE7C7]'
                                : 'rounded-lg font-semibold hover:bg-navy-50'
                      }`}
                    >
                      {hol && !past && (
                        <span className={`absolute top-0.5 max-w-full truncate px-0.5 text-[8.5px] leading-none ${isIn || isOut ? 'text-white/85' : 'text-[#B45309]'}`}>{hol}</span>
                      )}
                      {d.getDate()}
                      {special && <span className={`absolute bottom-1.5 h-0.5 w-3 rounded ${isIn || isOut ? 'bg-white' : 'bg-[#D97706]'}`} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {visibleHolidays.length > 0 && (
        <ul className="grid gap-x-6 gap-y-1 border-t border-line pt-3 text-xs text-ink-700 sm:grid-cols-2">
          {visibleHolidays.map(([d, n]) => (
            <li key={d} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97706]" />
              <strong className="font-bold">{dm(d)}</strong> {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function nightsOk(a: string, b: string) {
  return (parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000 <= MAX_NIGHTS
}
