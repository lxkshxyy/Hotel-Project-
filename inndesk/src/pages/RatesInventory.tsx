import { AnimatePresence, motion } from 'framer-motion'
import { BedDouble, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Info, Link2, List, Lock, LockOpen, Minus, Plus, User } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useLeaveGuard } from '../components/DiscardDialog'
import { RangeCalendar } from '../components/RangeCalendar'
import { Spinner } from '../components/ui'
import { site } from '../config/site'
import { checkTimes, mealPlans } from '../data/options'
import { addDays, inr, parseISODate, todayISO } from '../lib/format'
import { useListings, useReservations } from '../lib/hooks'
import { saveListing } from '../lib/store'
import type { CalendarCell, HourlySetup, Listing, ListingRoom } from '../lib/types'
import { btnOutline, btnSolid, Dialog, Field, inputCls } from './info/kit'
import { ratePlansOf } from './info/Rooms'

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const span = (from: string, to: string) => {
  const out: string[] = []
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d)
  return out
}
const nice = (iso: string, year = false) => parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) })

type Calendar = Listing['calendar']
const cellOf = (cal: Calendar, roomId: string, d: string): CalendarCell => cal[roomId]?.[d] ?? {}
/** Price of a rate plan on a date: the date's own price, else the plan's usual price. */
const planPrice = (cal: Calendar, r: ListingRoom, planId: string, d: string) => {
  const c = cellOf(cal, r.id, d)
  const plan = ratePlansOf(r).find((p) => p.id === planId)
  if (!plan) return r.price
  return plan.base ? (c.price ?? r.price) : (c.plans?.[planId] ?? plan.price)
}
const setCell = (cal: Calendar, roomId: string, d: string, patch: (c: CalendarCell) => CalendarCell): Calendar => ({ ...cal, [roomId]: { ...(cal[roomId] ?? {}), [d]: patch({ ...(cal[roomId]?.[d] ?? {}) }) } })

/** Confirmed rooms booked per room type per night. */
function useBooked(l: Listing) {
  const resv = useReservations([l])
  return useMemo(() => {
    const m: Record<string, Record<string, number>> = {}
    for (const r of resv.list) {
      if (r.status !== 'confirmed') continue
      const room = l.rooms.find((x) => x.name.trim() === r.room_name.trim())
      if (!room) continue
      for (let d = r.check_in; d < r.check_out; d = addDays(d, 1)) {
        m[room.id] ??= {}
        m[room.id][d] = (m[room.id][d] ?? 0) + r.rooms
      }
    }
    return m
  }, [resv.list, l])
}

function useToast() {
  const [t, setT] = useState('')
  useEffect(() => {
    if (!t) return
    const id = setTimeout(() => setT(''), 2600)
    return () => clearTimeout(id)
  }, [t])
  const node = (
    <AnimatePresence>
      {t && (
        <motion.div role="status" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className="fixed bottom-24 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-ink-900 px-5 py-2.5 text-[14px] font-medium text-white shadow-lg lg:bottom-8">
          {t}
        </motion.div>
      )}
    </AnimatePresence>
  )
  return [setT, node] as const
}

/* ================================== page ================================== */

export default function RatesInventory() {
  const { id = '' } = useParams()
  const { pathname } = useLocation()
  const { data } = useListings()
  const l = data?.find((x) => x.id === id)
  const hourly = pathname.endsWith('/hourly')
  const base = `/app/properties/${id}/rates`
  if (!data) return <Spinner />
  if (!l) return <p className="p-10 text-center text-ink-700">Property not found.</p>

  return (
    <div className="min-h-[calc(100dvh-68px)] bg-white">
      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-[24px] font-semibold text-ink-900">Manage Inventory, Rates &amp; Restrictions</h1>
          <span className="text-[13px] text-ink-500">Rates in: INR</span>
        </div>
        <div role="tablist" className="mt-5 flex gap-1 border-b border-line">
          {(
            [
              [base, 'All rooms', !hourly],
              [`${base}/hourly`, 'Hourly stays', hourly],
            ] as const
          ).map(([to, text, on]) => (
            <Link key={to} to={to} role="tab" aria-selected={on} className={`relative flex items-center gap-2 px-3 pb-2.5 text-[14.5px] font-semibold tracking-wide uppercase no-underline ${on ? 'text-pine-800' : 'text-ink-700 hover:text-pine-800'}`}>
              {text}
              {to.endsWith('hourly') && <span className="rounded-full bg-live px-2 py-0.5 text-[10.5px] font-bold tracking-normal text-white normal-case">New</span>}
              {on && <motion.span layoutId="ri-tab" className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-pine-800" />}
            </Link>
          ))}
        </div>
        {l.rooms.length === 0 ? (
          <p className="py-16 text-center text-[15px] text-ink-700">
            Add a room type first in{' '}
            <Link to={`/app/properties/${l.id}/info/rooms`} className="font-semibold text-pine-800">
              Rooms &amp; Rateplans
            </Link>
            .
          </p>
        ) : hourly ? (
          <Hourly key={l.id} l={l} />
        ) : (
          <AllRooms key={l.id} l={l} />
        )}
      </div>
    </div>
  )
}

/* ================================ all rooms ================================ */

function AllRooms({ l }: { l: Listing }) {
  const [view, setView] = useState<'grid' | 'calendar'>('grid')
  const [from, setFrom] = useState(todayISO())
  const [to, setTo] = useState(addDays(todayISO(), 13))
  const [roomIds, setRoomIds] = useState<string[]>(l.rooms.map((r) => r.id))
  const [activeOnly, setActiveOnly] = useState(false)
  const [bulk, setBulk] = useState(false)
  const [toast, toastNode] = useToast()
  const rooms = l.rooms.filter((r) => roomIds.includes(r.id))
  const len = span(from, to).length
  const shift = (n: number) => {
    const f = addDays(from, n * len)
    const start = f < todayISO() ? todayISO() : f
    setFrom(start)
    setTo(addDays(start, len - 1))
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        {view === 'grid' && (
          <>
            <button type="button" onClick={() => (setFrom(todayISO()), setTo(addDays(todayISO(), len - 1)))} className="h-11 rounded-full border border-line-strong px-5 text-[14.5px] font-semibold text-pine-800 hover:bg-pine-50">
              Today
            </button>
            <div className="w-[260px]">
              <RangeCalendar
                tabs={false}
                clearable={false}
                min={todayISO()}
                label="Stay dates"
                value={{ mode: 'stay', from, to }}
                onChange={(v) => {
                  if (!v) return
                  setFrom(v.from)
                  const max = addDays(v.from, 30)
                  setTo(v.to > max ? max : v.to > v.from ? v.to : addDays(v.from, 6))
                }}
              />
            </div>
          </>
        )}
        <RoomPicker l={l} value={roomIds} onChange={setRoomIds} single={view === 'calendar'} />
        {view === 'grid' && (
          <label className="flex cursor-pointer items-center gap-2 text-[14.5px] text-ink-900">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="h-[18px] w-[18px] accent-pine-800" /> Show only active rate plans
          </label>
        )}
        <div className="ml-auto flex items-center gap-2">
          {view === 'grid' && (
            <>
              <button type="button" onClick={() => setBulk(true)} className={btnOutline}>
                Bulk update
              </button>
              <div className="flex overflow-hidden rounded-lg border border-line-strong">
                <button type="button" aria-label="Earlier dates" disabled={from <= todayISO()} onClick={() => shift(-1)} className="flex h-10 w-10 items-center justify-center text-pine-800 hover:bg-pine-50 disabled:text-ink-400 disabled:hover:bg-transparent">
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button type="button" aria-label="Later dates" onClick={() => shift(1)} className="flex h-10 w-10 items-center justify-center border-l border-line-strong text-pine-800 hover:bg-pine-50">
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </>
          )}
          <div role="group" aria-label="View" className="flex rounded-lg bg-paper p-1">
            {(
              [
                ['grid', 'List view', <List key="l" className="h-5 w-5" aria-hidden="true" />],
                ['calendar', 'Calendar view', <CalendarDays key="c" className="h-5 w-5" aria-hidden="true" />],
              ] as const
            ).map(([k, label, icon]) => (
              <button key={k} type="button" aria-label={label} title={label} aria-pressed={view === k} onClick={() => (setView(k), k === 'calendar' && setRoomIds((x) => [x[0] ?? l.rooms[0].id]))} className={`flex h-9 w-10 items-center justify-center rounded-md ${view === k ? 'bg-white text-pine-800 shadow-sm' : 'text-ink-500 hover:text-pine-800'}`}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'grid' ? <RateGrid l={l} rooms={rooms} dates={span(from, to)} activeOnly={activeOnly} toast={toast} /> : <RateCalendar l={l} room={rooms[0] ?? l.rooms[0]} toast={toast} />}

      {bulk && (
        <BulkDialog
          l={l}
          onClose={() => setBulk(false)}
          onSaved={(n) => {
            setBulk(false)
            toast(`Saved ${n} date${n === 1 ? '' : 's'}`)
          }}
        />
      )}
      {toastNode}
    </div>
  )
}

function RoomPicker({ l, value, onChange, single }: { l: Listing; value: string[]; onChange: (v: string[]) => void; single: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', off)
    return () => document.removeEventListener('mousedown', off)
  }, [open])
  const label = single ? (l.rooms.find((r) => r.id === value[0])?.name ?? 'Room') : value.length === l.rooms.length ? `All rooms (${l.rooms.length})` : value.length === 1 ? l.rooms.find((r) => r.id === value[0])?.name : `${value.length} rooms`
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="relative flex h-11 min-w-[220px] items-center justify-between gap-3 rounded-lg border border-ink-400 bg-white px-3 text-left text-[15px] text-ink-900">
        <span className="absolute -top-2 left-2.5 bg-white px-1 text-[11.5px] text-ink-500">Rooms</span>
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-700 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute top-12 left-0 z-30 w-[260px] rounded-lg border border-line bg-white py-1.5 shadow-xl">
          {!single && (
            <label className="flex cursor-pointer items-center gap-2.5 border-b border-line px-3 py-2 text-[14.5px] font-semibold text-ink-900 hover:bg-paper">
              <input type="checkbox" checked={value.length === l.rooms.length} onChange={(e) => onChange(e.target.checked ? l.rooms.map((r) => r.id) : [l.rooms[0].id])} className="h-4 w-4 accent-pine-800" /> All rooms
            </label>
          )}
          {l.rooms.map((r) => (
            <label key={r.id} className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[14.5px] text-ink-900 hover:bg-paper">
              <input
                type={single ? 'radio' : 'checkbox'}
                name="ri-room"
                checked={value.includes(r.id)}
                onChange={() => {
                  if (single) return onChange([r.id]), setOpen(false)
                  const next = value.includes(r.id) ? value.filter((x) => x !== r.id) : [...value, r.id]
                  if (next.length) onChange(l.rooms.map((x) => x.id).filter((x) => next.includes(x)))
                }}
                className="h-4 w-4 accent-pine-800"
              />
              {r.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- list view: clean date header + every room's inventory and rate plans ---------- */

function RateGrid({ l, rooms, dates, activeOnly, toast }: { l: Listing; rooms: ListingRoom[]; dates: string[]; activeOnly: boolean; toast: (t: string) => void }) {
  const booked = useBooked(l)
  const [draft, setDraft] = useState<Calendar>(l.calendar)
  const [open, setOpen] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const saved = useRef(l.calendar)
  useEffect(() => {
    // A save elsewhere (bulk update) replaces the draft when nothing is pending here.
    if (JSON.stringify(draft) === JSON.stringify(saved.current)) setDraft(l.calendar)
    saved.current = l.calendar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l.calendar])
  const dirty = JSON.stringify(draft) !== JSON.stringify(l.calendar)
  const leave = useLeaveGuard(dirty, () => setDraft(l.calendar))
  const changes = useMemo(() => {
    let n = 0
    for (const r of l.rooms) for (const d of new Set([...Object.keys(draft[r.id] ?? {}), ...Object.keys(l.calendar[r.id] ?? {})])) if (JSON.stringify(draft[r.id]?.[d] ?? {}) !== JSON.stringify(l.calendar[r.id]?.[d] ?? {})) n++
    return n
  }, [draft, l])
  const bad = rooms.some((r) => dates.some((d) => ratePlansOf(r).some((p) => planPrice(draft, r, p.id, d) < site.minPrice)))
  const today = todayISO()
  const allOpen = rooms.every((r) => open.includes(r.id))
  const save = async () => {
    setSaving(true)
    try {
      await saveListing({ ...l, calendar: draft })
      toast('Rates and inventory saved')
    } finally {
      setSaving(false)
    }
  }
  const first = 'clamp(160px, 26vw, 280px)'
  const cols = `${first} repeat(${dates.length}, minmax(92px,1fr))`

  return (
    <>
      {leave}
      <div className="mt-5 overflow-x-auto rounded-xl border border-line">
        <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: `calc(${first} + ${dates.length * 92}px)` }}>
          {/* date header */}
          <div className="sticky left-0 z-20 flex items-center gap-2.5 border-b border-line bg-paper px-4 text-[14.5px] text-ink-700">
            <BedDouble className="h-5 w-5" aria-hidden="true" /> Rooms &amp; Rates
          </div>
          {dates.map((d) => {
            const dt = parseISODate(d)
            const t = d === today
            const we = dt.getDay() === 0 || dt.getDay() === 6
            return (
              <div key={d} className={`flex flex-col items-center justify-center border-b border-l border-line py-2.5 ${t ? 'bg-pine-800 text-white' : we ? 'bg-[#e9f1fa]' : 'bg-paper'}`}>
                <span className={`text-[12.5px] font-semibold uppercase ${t ? 'text-white' : 'text-pine-800'}`}>{t ? 'Today' : WEEK[dt.getDay()]}</span>
                <span className={`text-[22px] leading-tight ${t ? 'text-white' : 'text-ink-900'}`}>{dt.getDate()}</span>
                <span className={`text-[11px] uppercase ${t ? 'text-white/85' : 'text-ink-500'}`}>{MONTH[dt.getMonth()]}</span>
              </div>
            )
          })}

          <div className="sticky left-0 z-10 col-span-1 border-b border-line bg-white px-4 py-3">
            <button type="button" onClick={() => setOpen(allOpen ? [] : rooms.map((r) => r.id))} className="flex items-center gap-2 text-[12.5px] font-semibold tracking-wide whitespace-nowrap text-pine-800 uppercase hover:underline">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-sm bg-pine-800 text-white">{allOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span>
              {allOpen ? 'Collapse all rooms & rateplans' : 'Expand all rooms & rateplans'}
            </button>
          </div>
          <div className="border-b border-line" style={{ gridColumn: `span ${dates.length}` }} />

          {rooms.map((r) => {
            const isOpen = open.includes(r.id)
            const plans = ratePlansOf(r).filter((p) => !activeOnly || p.active)
            const toggle = () => setOpen((o) => (o.includes(r.id) ? o.filter((x) => x !== r.id) : [...o, r.id]))
            const sell = (d: string) => cellOf(draft, r.id, d).open ?? r.count
            const sold = (d: string) => booked[r.id]?.[d] ?? 0
            const rowLabel = (text: ReactNode, extra?: string) => <div className={`sticky left-0 z-10 flex min-w-0 items-center border-b border-line bg-white px-4 py-2 pl-4 text-[14px] text-ink-700 sm:pl-12 ${extra ?? ''}`}>{text}</div>
            return (
              <div key={r.id} className="contents">
                {/* room summary row (MMT-style inventory boxes) */}
                <div className="sticky left-0 z-10 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
                  <button type="button" aria-expanded={isOpen} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${r.name}`} onClick={toggle} className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-paper text-pine-800 hover:bg-pine-50">
                    {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </button>
                  <span className="min-w-0">
                    <strong className="block truncate text-[15px] font-semibold text-ink-900">{r.name}</strong>
                    <span className="text-[12.5px] text-ink-500">
                      {r.count} rooms{r.inactive ? ' · Inactive' : ''}
                    </span>
                  </span>
                </div>
                {dates.map((d) => {
                  const c = cellOf(draft, r.id, d)
                  const left = Math.max(0, sell(d) - sold(d))
                  return (
                    <div key={d} className="flex items-center justify-center border-b border-l border-line px-1.5 py-2.5">
                      <button type="button" onClick={toggle} aria-label={`${r.name}, ${nice(d)}: ${c.closed ? 'closed' : `${left} left, ${sold(d)} sold`}`} className={`flex h-[60px] w-full max-w-[96px] flex-col items-center justify-center rounded-lg border ${c.closed ? 'closed-hatch border-line-strong text-ink-500' : 'border-line-strong bg-white hover:border-pine-700'}`}>
                        {c.closed ? (
                          <span className="text-[12.5px] font-semibold">Closed</span>
                        ) : (
                          <>
                            <span className={`text-[20px] leading-none font-semibold ${left === 0 ? 'text-alert' : 'text-live'}`}>{left}</span>
                            <span className="mt-1 text-[11.5px] text-ink-500">{sold(d)} sold</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}

                {/* details (Agoda-style rows) */}
                {isOpen && (
                  <>
                    {rowLabel('Rooms to sell')}
                    {dates.map((d) => (
                      <div key={d} className="min-w-0 border-b border-l border-line p-1.5">
                        <input
                          type="number"
                          min={0}
                          max={r.count}
                          aria-label={`${r.name} rooms to sell on ${nice(d)}`}
                          value={sell(d)}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(r.count, Math.round(Number(e.target.value) || 0)))
                            setDraft((cal) => setCell(cal, r.id, d, (c) => ({ ...c, open: v })))
                          }}
                          className="h-9 w-full min-w-0 rounded-md border border-line-strong text-center text-[14px] text-ink-900 outline-none focus:border-pine-700 focus:ring-1 focus:ring-pine-700"
                        />
                      </div>
                    ))}
                    {rowLabel('Net rooms booked')}
                    {dates.map((d) => (
                      <div key={d} className="flex items-center justify-center border-b border-l border-line text-[14px] text-ink-900">
                        {sold(d)}
                      </div>
                    ))}
                    {rowLabel('Remaining availability')}
                    {dates.map((d) => (
                      <div key={d} className="flex items-center justify-center border-b border-l border-line text-[14px] text-ink-900">
                        {Math.max(0, sell(d) - sold(d))}
                      </div>
                    ))}
                    {rowLabel('Selling')}
                    {dates.map((d) => {
                      const closed = !!cellOf(draft, r.id, d).closed
                      return (
                        <div key={d} className="min-w-0 border-b border-l border-line p-1.5">
                          <button type="button" aria-pressed={!closed} onClick={() => setDraft((cal) => setCell(cal, r.id, d, (c) => ({ ...c, closed: !closed })))} className={`h-9 w-full rounded-md text-[12.5px] font-semibold ${closed ? 'bg-alert-50 text-alert' : 'bg-[#e8f6ee] text-live'}`}>
                            {closed ? 'Closed' : 'Open'}
                          </button>
                        </div>
                      )
                    })}
                    {plans.map((p) => (
                      <div key={p.id} className="contents">
                        {rowLabel(
                          <span className="flex w-full items-center justify-between gap-2">
                            <span className={`truncate ${p.active ? '' : 'text-ink-400'}`} title={p.name}>
                              {p.name}
                            </span>
                            <span className="flex shrink-0 items-center text-[12px] text-ink-500">
                              <User className="h-3.5 w-3.5" aria-hidden="true" />×{r.occupancy?.baseAdults ?? r.maxGuests}
                            </span>
                          </span>,
                          'bg-[#fbfdff]',
                        )}
                        {dates.map((d) => {
                          const v = planPrice(draft, r, p.id, d)
                          return (
                            <div key={d} className="min-w-0 border-b border-l border-line p-1.5">
                              <input
                                type="number"
                                min={site.minPrice}
                                step={50}
                                aria-label={`${r.name}, ${p.name}, price on ${nice(d)}`}
                                value={v || ''}
                                onChange={(e) => {
                                  const n = Math.round(Number(e.target.value) || 0)
                                  setDraft((cal) => setCell(cal, r.id, d, (c) => (p.base ? { ...c, price: n } : { ...c, plans: { ...(c.plans ?? {}), [p.id]: n } })))
                                }}
                                className={`h-9 w-full min-w-0 rounded-md border text-center text-[13.5px] text-ink-900 outline-none focus:ring-1 ${v < site.minPrice ? 'border-alert bg-alert-50 focus:ring-alert' : 'border-line-strong focus:border-pine-700 focus:ring-pine-700'}`}
                              />
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <p className="mt-3 text-[13px] text-ink-500">
        Prices are per night before GST. {site.marketplace} stops selling a room type once its rooms to sell are booked. Prices below {inr(site.minPrice)} can’t be saved.
      </p>

      <AnimatePresence>
        {dirty && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-white shadow-[0_-6px_20px_rgba(26,44,91,0.08)] lg:bottom-0 lg:left-[96px]">
            <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
              <span className="text-[14.5px] text-ink-900">
                {changes} date{changes === 1 ? '' : 's'} changed{bad && <span className="ml-2 text-alert">· Fix prices below {inr(site.minPrice)}</span>}
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDraft(l.calendar)} className={btnOutline}>
                  Discard
                </button>
                <button type="button" disabled={bad || saving} onClick={save} className={btnSolid}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ---------- calendar view: months with a side panel to edit the dates picked ---------- */

function RateCalendar({ l, room, toast }: { l: Listing; room: ListingRoom; toast: (t: string) => void }) {
  const booked = useBooked(l)
  const plans = ratePlansOf(room)
  const [planId, setPlanId] = useState('')
  const [sel, setSel] = useState<{ a: string; b: string } | null>(null)
  const drag = useRef<string | null>(null)
  const today = todayISO()
  const t = parseISODate(today)
  const months = [0, 1, 2].map((i) => new Date(t.getFullYear(), t.getMonth() + i, 1))
  const range = sel ? (sel.a <= sel.b ? [sel.a, sel.b] : [sel.b, sel.a]) : null
  const inSel = (d: string) => !!range && d >= range[0] && d <= range[1]
  const plan = plans.find((p) => p.id === planId) ?? plans[0]
  useEffect(() => {
    const up = () => (drag.current = null)
    document.addEventListener('mouseup', up)
    return () => document.removeEventListener('mouseup', up)
  }, [])
  useEffect(() => setPlanId(''), [room.id])

  return (
    <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-3">
          <label className="relative">
            <span className="absolute -top-2 left-2.5 bg-white px-1 text-[11.5px] text-ink-500">Rate plan shown</span>
            <select value={plan.id} onChange={(e) => setPlanId(e.target.value)} className="h-11 rounded-full border border-pine-700 bg-white pr-9 pl-4 text-[14.5px] text-pine-800">
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {months.map((m) => {
          const y = m.getFullYear()
          const mo = m.getMonth()
          const days = new Date(y, mo + 1, 0).getDate()
          const lead = m.getDay()
          return (
            <section key={`${y}-${mo}`} aria-label={m.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} className="mb-8">
              <h2 className="text-[24px] font-semibold text-ink-900">{m.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
              <div className="mt-2 grid grid-cols-7 gap-px">
                {WEEK.map((w, i) => (
                  <span key={w} className={`rounded px-2 py-1 text-[12.5px] ${i === 0 ? 'bg-[#e9f1fa] font-semibold text-ink-900' : 'text-ink-500'}`}>
                    {w}
                  </span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-px rounded-lg bg-[#e9f1fa] p-px select-none">
                {Array.from({ length: lead }, (_, i) => (
                  <span key={`e${i}`} />
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const d = `${y}-${String(mo + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
                  const past = d < today
                  const c = cellOf(l.calendar, room.id, d)
                  const left = Math.max(0, (c.open ?? room.count) - (booked[room.id]?.[d] ?? 0))
                  const on = inSel(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={past}
                      aria-pressed={on}
                      aria-label={`${nice(d, true)}: ${c.closed ? 'closed' : `${inr(planPrice(l.calendar, room, plan.id, d))}, ${left} left`}`}
                      onMouseDown={(e) => {
                        if (e.shiftKey && sel) return setSel({ a: sel.a, b: d })
                        drag.current = d
                        setSel({ a: d, b: d })
                      }}
                      onMouseEnter={() => drag.current && setSel({ a: drag.current, b: d })}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSel(e.shiftKey && sel ? { a: sel.a, b: d } : { a: d, b: d }))}
                      className={`relative flex h-[84px] flex-col justify-between p-2 text-left transition-colors ${past ? 'cursor-default bg-transparent text-ink-400' : on ? 'bg-pine-50 ring-2 ring-pine-800 ring-inset' : c.closed ? 'closed-hatch hover:ring-1 hover:ring-pine-700 hover:ring-inset' : 'bg-white hover:ring-1 hover:ring-pine-700 hover:ring-inset'}`}
                    >
                      <span className={`text-[15px] font-semibold ${d === today ? 'text-pine-800 underline' : past ? '' : 'text-ink-900'}`}>{i + 1}</span>
                      {!past && (
                        <span className="self-end text-right leading-tight">
                          {c.closed ? (
                            <span className="text-[12.5px] text-ink-700">Closed</span>
                          ) : (
                            <>
                              <span className="block text-[13px] font-semibold text-ink-900">{inr(planPrice(l.calendar, room, plan.id, d))}</span>
                              <span className={`text-[11.5px] ${left === 0 ? 'text-alert' : 'text-ink-500'}`}>{left === 0 ? 'Sold out' : `${left} left`}</span>
                            </>
                          )}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <aside className="rounded-xl border border-line bg-white lg:sticky lg:top-20">
        <EditPanel
          key={`${room.id}-${range?.join('_') ?? ''}`}
          l={l}
          room={room}
          range={range}
          onClear={() => setSel(null)}
          onSaved={(n) => {
            setSel(null)
            toast(`Saved ${n} date${n === 1 ? '' : 's'}`)
          }}
        />
      </aside>
    </div>
  )
}

/* ---------- shared edit form (calendar side panel + bulk update) ---------- */

type Edit = { days: number[]; open: string; prices: Record<string, string>; state: 'same' | 'open' | 'closed' }

async function applyEdit(l: Listing, room: ListingRoom, from: string, to: string, e: Edit) {
  let cal = l.calendar
  let n = 0
  for (const d of span(from, to)) {
    if (!e.days.includes(parseISODate(d).getDay())) continue
    cal = setCell(cal, room.id, d, (c) => {
      const next = { ...c }
      if (e.open !== '') next.open = Math.max(0, Math.min(room.count, Number(e.open)))
      for (const p of ratePlansOf(room)) {
        const v = e.prices[p.id]
        if (!v) continue
        if (p.base) next.price = Number(v)
        else next.plans = { ...(next.plans ?? {}), [p.id]: Number(v) }
      }
      if (e.state !== 'same') next.closed = e.state === 'closed'
      return next
    })
    n++
  }
  if (n) await saveListing({ ...l, calendar: cal })
  return n
}

function EditFields({ room, e, set, showDays = true }: { room: ListingRoom; e: Edit; set: (p: Partial<Edit>) => void; showDays?: boolean }) {
  const [daysOpen, setDaysOpen] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      {showDays && (
        <div>
          <button type="button" aria-expanded={daysOpen} onClick={() => setDaysOpen((o) => !o)} className="flex items-center gap-1.5 text-[14px] font-semibold text-pine-800">
            <ChevronDown className={`h-4 w-4 transition-transform ${daysOpen ? 'rotate-180' : ''}`} aria-hidden="true" /> Specify day of the week
          </button>
          {daysOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {WEEK.map((w, i) => (
                <button key={w} type="button" aria-pressed={e.days.includes(i)} onClick={() => set({ days: e.days.includes(i) ? e.days.filter((x) => x !== i) : [...e.days, i] })} className={`h-9 min-w-11 rounded-lg border px-2 text-[13px] font-semibold ${e.days.includes(i) ? 'border-pine-800 bg-pine-800 text-white' : 'border-line-strong text-ink-700'}`}>
                  {w}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <Field label={`Rooms to sell (of ${room.count})`} htmlFor="ri-open">
        <input id="ri-open" type="number" min={0} max={room.count} value={e.open} placeholder="Leave as is" onChange={(x) => set({ open: x.target.value })} className={inputCls} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-[14px] text-ink-900">Price per night (₹, before GST)</legend>
        <div className="flex flex-col gap-2">
          {ratePlansOf(room).map((p) => (
            <label key={p.id} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-700" title={p.name}>
                {p.name}
              </span>
              <input type="number" min={site.minPrice} step={50} value={e.prices[p.id] ?? ''} placeholder={`Now ${p.price}`} onChange={(x) => set({ prices: { ...e.prices, [p.id]: x.target.value } })} className={`${inputCls} !w-[130px]`} />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-[14px] text-ink-900">Selling</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['same', 'Leave as is'],
              ['open', 'Open'],
              ['closed', 'Close'],
            ] as const
          ).map(([k, t]) => (
            <label key={k} className={`flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[14px] ${e.state === k ? 'border-pine-800 bg-pine-50 text-pine-800' : 'border-line-strong text-ink-900'}`}>
              <input type="radio" name="ri-state" checked={e.state === k} onChange={() => set({ state: k })} className="accent-pine-800" />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

const blankEdit = (): Edit => ({ days: [0, 1, 2, 3, 4, 5, 6], open: '', prices: {}, state: 'same' })
const editError = (e: Edit) => (Object.values(e.prices).some((v) => v && Number(v) < site.minPrice) ? `Prices must be at least ${inr(site.minPrice)}.` : !e.days.length ? 'Pick at least one day of the week.' : e.open === '' && e.state === 'same' && !Object.values(e.prices).some(Boolean) ? 'Change at least one thing.' : '')

function EditPanel({ l, room, range, onClear, onSaved }: { l: Listing; room: ListingRoom; range: string[] | null; onClear: () => void; onSaved: (n: number) => void }) {
  const [e, setE] = useState(blankEdit)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const count = range ? span(range[0], range[1]).length : 0
  return (
    <div>
      <div className="border-b border-line p-4">
        <strong className="text-[14px] font-semibold text-ink-900">
          {count} date{count === 1 ? '' : 's'} selected
        </strong>
        <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-ink-400 px-3 text-[15px] text-ink-700">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {range ? (range[0] === range[1] ? nice(range[0], true) : `${nice(range[0])} – ${nice(range[1], true)}`) : 'Select date'}
        </div>
      </div>
      {!range ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="grid grid-cols-5 gap-1" aria-hidden="true">
            {Array.from({ length: 15 }, (_, i) => (
              <span key={i} className={`h-5 w-5 rounded ${i === 6 ? 'bg-pine-800' : i === 7 || i === 8 ? 'bg-pine-100' : 'bg-[#e9edf3]'}`} />
            ))}
          </span>
          <strong className="mt-5 text-[18px] font-semibold text-ink-900">Select a date to edit rates and availability</strong>
          <p className="mt-1 text-[13.5px] text-ink-500">Click a date in the calendar or drag to select a range.</p>
        </div>
      ) : (
        <div className="p-4">
          <p className="mb-4 text-[13.5px] text-ink-500">
            {room.name} · leave a box empty to keep what’s there.
          </p>
          <EditFields room={room} e={e} set={(p) => (setE((x) => ({ ...x, ...p })), setMsg(''))} showDays={count > 1} />
          {msg && (
            <p role="alert" className="mt-3 text-[13.5px] font-medium text-alert">
              {msg}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClear} className={btnOutline}>
              Clear
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const err = editError(e)
                if (err) return setMsg(err)
                setBusy(true)
                try {
                  const n = await applyEdit(l, room, range[0], range[1], e)
                  if (!n) return setMsg('None of these dates fall on the chosen days.')
                  onSaved(n)
                } finally {
                  setBusy(false)
                }
              }}
              className={btnSolid}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function BulkDialog({ l, onClose, onSaved }: { l: Listing; onClose: () => void; onSaved: (n: number) => void }) {
  const [roomId, setRoomId] = useState(l.rooms[0].id)
  const [from, setFrom] = useState(todayISO())
  const [to, setTo] = useState(addDays(todayISO(), 6))
  const [e, setE] = useState(blankEdit)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const room = l.rooms.find((r) => r.id === roomId)!
  return (
    <Dialog
      title="Bulk update"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const err = editError(e)
              if (err) return setMsg(err)
              setBusy(true)
              try {
                const n = await applyEdit(l, room, from, to, e)
                if (!n) return setMsg('None of these dates fall on the chosen days.')
                onSaved(n)
              } finally {
                setBusy(false)
              }
            }}
            className={btnSolid}
          >
            {busy ? 'Saving…' : 'Update'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Room type" htmlFor="ri-room">
          <select id="ri-room" value={roomId} onChange={(x) => (setRoomId(x.target.value), setE((y) => ({ ...y, prices: {} })))} className={inputCls}>
            {l.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dates">
          <RangeCalendar tabs={false} centered clearable={false} min={todayISO()} label="From – To" value={{ mode: 'stay', from, to }} onChange={(v) => v && (setFrom(v.from), setTo(v.to >= v.from ? v.to : v.from))} />
        </Field>
        <EditFields room={room} e={e} set={(p) => (setE((x) => ({ ...x, ...p })), setMsg(''))} />
        {msg && (
          <p role="alert" className="text-[13.5px] font-medium text-alert">
            {msg}
          </p>
        )}
      </div>
    </Dialog>
  )
}

/* ================================ hourly stays ================================ */

const toMin = (t: string) => {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  return ((Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m[2])
}
const windowOf = (h: HourlySetup) => {
  const a = toMin(h.firstCheckIn)
  let b = toMin(h.lastCheckOut)
  if (b <= a) b += 1440
  return { a, b, hours: (b - a) / 60 }
}
const hourLabel = (min: number, first: boolean) => {
  const h = Math.floor(min / 60) % 24
  const ampm = h < 12 ? 'AM' : 'PM'
  return { n: String(h % 12 || 12), ampm: first || h % 12 === 0 ? ampm : '' }
}
const clock = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
/** ₹ amount with up to 2 decimals, as hourly prices are a share of the day price. */
const rupee = (n: number) => `₹ ${Math.round(n * 100) / 100}`
const hkLabel = (m: number) => (m % 60 ? `${m / 60} Hours` : m === 60 ? '1 Hour' : `${m / 60} Hours`)

const defaultHourly = (l: Listing): HourlySetup => ({ roomId: l.rooms[0].id, rooms: 1, firstCheckIn: '9:00 AM', lastCheckOut: '12:00 AM', housekeeping: 60, slots: [{ hours: 3, pct: 70 }, { hours: 6, pct: 75 }, { hours: 9, pct: 85 }] })

/** Full-day room-only (EP) price for a date: the EP rate plan if there is one, else the base plan. */
function epPrice(l: Listing, r: ListingRoom, d: string) {
  const plans = ratePlansOf(r)
  const ep = plans.find((p) => p.mealPlan === mealPlans[0]) ?? plans[0]
  return planPrice(l.calendar, r, ep.id, d)
}

function Tip({ text }: { text: string }) {
  return (
    <span title={text} className="ml-1 inline-flex align-middle text-ink-400">
      <Info className="h-3.5 w-3.5" aria-label={text} />
    </span>
  )
}

function Hourly({ l }: { l: Listing }) {
  const [settings, setSettings] = useState(false)
  const [bulk, setBulk] = useState(false)
  const [linkage, setLinkage] = useState(false)
  const [extra, setExtra] = useState(false)
  const [toast, toastNode] = useToast()
  const today = todayISO()
  const [start, setStart] = useState(today)
  const [open, setOpen] = useState<string[]>([today])
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const h = l.hourly
  const save = async (next: HourlySetup, msg = 'Done. Changes saved') => {
    await saveListing({ ...l, hourly: next })
    toast(msg)
  }

  if (!h)
    return (
      <div className="mt-8 flex flex-col items-center rounded-xl border border-line px-6 py-14 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pine-50 text-pine-800">
          <CalendarDays className="h-8 w-8" aria-hidden="true" />
        </span>
        <strong className="mt-4 text-[20px] font-semibold text-ink-900">Sell rooms by the hour</strong>
        <p className="mt-1 max-w-[520px] text-[14.5px] text-ink-700">Set aside rooms for 3, 6 and 9-hour stays, priced as a share of the full-day room-only rate. Good for transit travellers and day use.</p>
        <button type="button" onClick={() => setSettings(true)} className={`${btnSolid} mt-5`}>
          Set up hourly stays
        </button>
        {settings && <HourlySettings l={l} h={defaultHourly(l)} onClose={() => setSettings(false)} onSave={(x) => save(x, 'Hourly stays switched on').then(() => setSettings(false))} />}
        {toastNode}
      </div>
    )

  const room = l.rooms.find((r) => r.id === h.roomId) ?? l.rooms[0]
  const w = windowOf(h)
  const dates = span(start, addDays(start, 6))
  const avail = (d: string) => h.open?.[d] ?? h.rooms
  const cols = `150px 140px 120px 120px repeat(${h.slots.length}, 120px) 120px 180px`

  const header = (chips: boolean) => (
    <div className="grid items-center border-y border-line bg-[#f6f8fb] py-3 text-center text-[14px] whitespace-nowrap text-ink-700" style={{ gridTemplateColumns: cols }}>
      <span />
      <span>
        Available Rooms
        <Tip text="Rooms open for hourly stays that day. Change the number to open or close rooms." />
      </span>
      <span className="border-l border-line">
        Sold Rooms
        <Tip text="Rooms with at least one hourly booking that day." />
      </span>
      <span>
        Sold Slots
        <Tip text="Hourly bookings made for that day." />
      </span>
      {h.slots.map((s, i) =>
        chips ? (
          <span key={s.hours} className={`flex flex-col items-center gap-1 ${i === 0 ? 'border-l border-line' : ''}`}>
            {s.hours} hours
            <span className="inline-flex items-center gap-0.5 rounded border border-line-strong bg-white px-1.5 text-[11px] text-ink-700">
              <Link2 className="h-3 w-3" aria-hidden="true" />
              {s.pct}%
            </span>
          </span>
        ) : (
          <span key={s.hours} className={i === 0 ? 'border-l border-line' : ''}>
            {s.hours} hours ({s.pct}%)
          </span>
        ),
      )}
      {chips ? (
        <span />
      ) : (
        <button type="button" onClick={() => setLinkage(true)} className="text-[14px] font-semibold text-pine-800 hover:underline">
          Edit Linkage
        </button>
      )}
      <span className="border-l border-line">
        Full Day Price (EP)
        <Tip text="Room-only price for the full day, from Manage Rates & Inventory. Hourly prices are a share of it." />
      </span>
    </div>
  )

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-ink-700">
          <span>
            Room:<strong className="font-semibold text-ink-900">{room.name} (Hourly)</strong>
          </span>
          <span className="flex items-center gap-3">
            <span>
              First Check-in:<strong className="font-semibold text-ink-900">{h.firstCheckIn}</strong>
            </span>
            <span className="relative hidden w-[220px] border-t border-line-strong sm:block">
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[12.5px] whitespace-nowrap text-ink-500">{w.hours} hours</span>
            </span>
            <span>
              Last Check-out:<strong className="font-semibold text-ink-900">{h.lastCheckOut}</strong>
            </span>
          </span>
          <span>
            Housekeeping duration:<strong className="font-semibold text-ink-900">{hkLabel(h.housekeeping)}</strong>
          </span>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setSettings(true)} className={`${btnOutline} h-11 px-5`}>
            Settings
          </button>
          <button type="button" onClick={() => setBulk(true)} className={`${btnOutline} h-11 px-5`}>
            Bulk Update
          </button>
        </div>
      </div>

      <button type="button" onClick={() => setStart(addDays(start, -7))} className="mt-5 text-[15px] font-semibold text-pine-800 hover:underline">
        Previous 7 Days
      </button>

      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[1100px]">
          {header(false)}
          {dates.map((d, i) => {
            const isOpen = open.includes(d)
            const past = d < today
            const full = epPrice(l, room, d)
            return (
              <div key={d}>
                <div className="grid items-center border-b border-line py-3 text-center text-[14.5px] text-ink-900" style={{ gridTemplateColumns: cols }}>
                  <span className="flex items-center gap-4 pl-6 text-left">
                    <button type="button" aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} room timeline for ${nice(d)}`} onClick={() => setOpen((o) => (o.includes(d) ? o.filter((x) => x !== d) : [...o, d]))} className="text-pine-800">
                      {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </button>
                    <span className="relative font-semibold">
                      {d === today && <span className="absolute -top-5 left-0 rounded bg-pine-50 px-1.5 text-[10.5px] font-semibold text-pine-800">TODAY</span>}
                      {nice(d)}
                    </span>
                  </span>
                  <span className="flex justify-center">
                    <AvailInput key={`${d}-${avail(d)}`} value={avail(d)} max={h.rooms} disabled={past} label={`Available rooms on ${nice(d)}`} onCommit={(v) => save({ ...h, open: { ...(h.open ?? {}), [d]: v } })} />
                  </span>
                  <span className="border-l border-line">0</span>
                  <span>0</span>
                  {h.slots.map((s, k) => (
                    <span key={s.hours} className={k === 0 ? 'border-l border-line' : ''}>
                      {rupee((full * s.pct) / 100)}
                    </span>
                  ))}
                  <span />
                  <span className="border-l border-line">{rupee(full)}</span>
                </div>
                {isOpen && (
                  <div className="border-b border-line pt-5 pb-8">
                    <div className="text-center">
                      <button type="button" onClick={() => setExtra(true)} className="text-[14px] font-semibold text-pine-800 hover:underline">
                        View Extra Guest Charges
                      </button>
                    </div>
                    <Timeline h={h} d={d} now={now} today={today} onToggle={(n) => save({ ...h, blocked: { ...(h.blocked ?? {}), [d]: (h.blocked?.[d] ?? []).includes(n) ? (h.blocked?.[d] ?? []).filter((x) => x !== n) : [...(h.blocked?.[d] ?? []), n] } }, 'Room updated')} />
                  </div>
                )}
                {isOpen && i < dates.length - 1 && header(true)}
              </div>
            )
          })}
        </div>
      </div>

      <button type="button" onClick={() => setStart(addDays(start, 7))} className="mt-6 text-[15px] font-semibold text-pine-800 hover:underline">
        Next 7 Days
      </button>
      <p className="mt-4 text-[13px] text-ink-500">Prices are before GST. Sold rooms and slots fill in once {site.marketplace} takes hourly bookings.</p>

      {settings && <HourlySettings l={l} h={h} onClose={() => setSettings(false)} onSave={(x) => save(x, 'Settings saved').then(() => setSettings(false))} />}
      {linkage && <LinkageDialog h={h} onClose={() => setLinkage(false)} onSave={(slots) => save({ ...h, slots }, 'Linkage saved').then(() => setLinkage(false))} />}
      {bulk && <HourlyBulk h={h} onClose={() => setBulk(false)} onSave={(open) => save({ ...h, open: { ...(h.open ?? {}), ...open } }, `Updated ${Object.keys(open).length} days`).then(() => setBulk(false))} />}
      {extra && <ExtraCharges h={h} room={room} onClose={() => setExtra(false)} />}
      {toastNode}
    </div>
  )
}

function AvailInput({ value, max, disabled, label, onCommit }: { value: number; max: number; disabled: boolean; label: string; onCommit: (v: number) => void }) {
  const [v, setV] = useState(String(value))
  const commit = () => {
    const n = Math.max(0, Math.min(max, Math.round(Number(v) || 0)))
    setV(String(n))
    if (n !== value) onCommit(n)
  }
  return (
    <input
      type="number"
      min={0}
      max={max}
      disabled={disabled}
      aria-label={label}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="h-10 w-[80px] rounded-md border border-line-strong text-center text-[15px] font-semibold text-live outline-none focus:border-pine-700 focus:ring-1 focus:ring-pine-700 disabled:bg-paper disabled:text-ink-400"
    />
  )
}

function Timeline({ h, d, now, today, onToggle }: { h: HourlySetup; d: string; now: Date; today: string; onToggle: (room: number) => void }) {
  const w = windowOf(h)
  const cols = Math.round(w.hours)
  const nowMin = now.getHours() * 60 + now.getMinutes() + (now.getHours() * 60 + now.getMinutes() < w.a ? 1440 : 0)
  const showNow = d === today && nowMin >= w.a && nowMin <= w.b
  const pastDay = d < today
  const blocked = h.blocked?.[d] ?? []
  return (
    <div className="mt-5 flex flex-wrap items-start justify-center gap-8">
      <div className="relative w-[770px] max-w-full">
        {showNow && (
          <div className="pointer-events-none absolute top-0 bottom-0 z-10" style={{ left: `calc(120px + (100% - 120px) * ${(nowMin - w.a) / (w.b - w.a)})` }}>
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[12.5px] whitespace-nowrap text-alert">{clock(now)}</span>
            <span className="absolute top-0 bottom-0 w-px bg-alert" />
          </div>
        )}
        <div className="overflow-hidden rounded-lg border-2 border-line">
          <div className="grid border-b border-line" style={{ gridTemplateColumns: `120px repeat(${cols}, 1fr)` }}>
            <span />
            {Array.from({ length: cols }, (_, i) => {
              const lb = hourLabel(w.a + i * 60, i === 0)
              const end = i === cols - 1 ? hourLabel(w.b, false) : null
              return (
                <span key={i} className="relative h-8 border-l border-line text-[12.5px] text-ink-700">
                  <span className="absolute top-1.5 left-1">
                    {lb.n}
                    {lb.ampm && <span className="ml-0.5 text-[10px] text-ink-500">{lb.ampm}</span>}
                  </span>
                  {end && <span className="absolute top-1.5 right-1">{end.n}</span>}
                </span>
              )
            })}
          </div>
          {Array.from({ length: h.rooms }, (_, k) => {
            const n = k + 1
            const off = blocked.includes(n)
            return (
              <div key={n} className="grid" style={{ gridTemplateColumns: `120px repeat(${cols}, 1fr)` }}>
                <span className={`flex h-9 items-center justify-between px-3 text-[14px] ${off ? 'text-ink-500' : 'text-live'}`}>
                  Room {n}
                  <button type="button" disabled={pastDay} onClick={() => onToggle(n)} aria-label={off ? `Make room ${n} sellable` : `Mark room ${n} non-sellable`} title={off ? 'Make sellable' : 'Mark non-sellable'} className="text-ink-500 hover:text-pine-800 disabled:opacity-40">
                    {off ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                  </button>
                </span>
                {Array.from({ length: cols }, (_, i) => {
                  const end = w.a + (i + 1) * 60
                  const gone = pastDay || (d === today && end <= nowMin)
                  return <span key={i} className={`h-9 border-l border-line ${off ? 'bg-[#dfe3ea]' : gone ? 'bg-[#eef0f3]' : 'bg-white'} ${k ? 'border-t' : ''}`} />
                })}
              </div>
            )
          })}
        </div>
      </div>
      <span className="mt-8 flex items-center gap-2 text-[14px] text-ink-700">
        <span className="h-4 w-4 rounded-sm bg-[#dfe3ea]" /> Non-sellable
      </span>
    </div>
  )
}

function HourlySettings({ l, h, onClose, onSave }: { l: Listing; h: HourlySetup; onClose: () => void; onSave: (h: HourlySetup) => void }) {
  const [x, setX] = useState(h)
  const room = l.rooms.find((r) => r.id === x.roomId) ?? l.rooms[0]
  const w = windowOf(x)
  const longest = Math.max(...x.slots.map((s) => s.hours))
  const err = w.hours < longest + x.housekeeping / 60 ? `The window must fit the ${longest}-hour slot plus housekeeping.` : ''
  return (
    <Dialog
      title="Hourly stay settings"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button type="button" disabled={!!err} onClick={() => onSave(x)} className={btnSolid}>
            Save
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Room type" htmlFor="hs-room">
          <select id="hs-room" value={x.roomId} onChange={(e) => setX({ ...x, roomId: e.target.value, rooms: Math.min(x.rooms, l.rooms.find((r) => r.id === e.target.value)?.count ?? 1) })} className={inputCls}>
            {l.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Rooms for hourly stays (of ${room.count})`} htmlFor="hs-rooms">
          <input id="hs-rooms" type="number" min={1} max={room.count} value={x.rooms} onChange={(e) => setX({ ...x, rooms: Math.max(1, Math.min(room.count, Math.round(Number(e.target.value) || 1))) })} className={inputCls} />
        </Field>
        <Field label="First check-in" htmlFor="hs-in">
          <select id="hs-in" value={x.firstCheckIn} onChange={(e) => setX({ ...x, firstCheckIn: e.target.value })} className={inputCls}>
            {checkTimes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Last check-out" htmlFor="hs-out">
          <select id="hs-out" value={x.lastCheckOut} onChange={(e) => setX({ ...x, lastCheckOut: e.target.value })} className={inputCls}>
            {checkTimes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Housekeeping duration" htmlFor="hs-hk">
          <select id="hs-hk" value={x.housekeeping} onChange={(e) => setX({ ...x, housekeeping: Number(e.target.value) })} className={inputCls}>
            {[30, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m === 30 ? '30 minutes' : hkLabel(m)}
              </option>
            ))}
          </select>
        </Field>
        <p className="self-end pb-2 text-[14px] text-ink-700">
          Window: <strong className="font-semibold text-ink-900">{w.hours} hours</strong>
        </p>
      </div>
      {err && (
        <p role="alert" className="mt-3 text-[13.5px] font-medium text-alert">
          {err}
        </p>
      )}
    </Dialog>
  )
}

function LinkageDialog({ h, onClose, onSave }: { h: HourlySetup; onClose: () => void; onSave: (s: HourlySetup['slots']) => void }) {
  const [slots, setSlots] = useState(h.slots.map((s) => ({ ...s, v: String(s.pct) })))
  const bad = slots.some((s) => !(Number(s.v) >= 10 && Number(s.v) <= 100))
  return (
    <Dialog
      title="Edit linkage"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button type="button" disabled={bad} onClick={() => onSave(slots.map((s) => ({ hours: s.hours, pct: Math.round(Number(s.v)) })))} className={btnSolid}>
            Save
          </button>
        </>
      }
    >
      <p className="text-[14px] text-ink-700">Each slot is priced as a share of the full-day room-only (EP) price for that date.</p>
      <div className="mt-4 flex flex-col gap-3">
        {slots.map((s, i) => (
          <label key={s.hours} className="flex items-center gap-3">
            <span className="w-24 text-[14.5px] text-ink-900">{s.hours} hours</span>
            <span className="relative w-[140px]">
              <input type="number" min={10} max={100} value={s.v} onChange={(e) => setSlots(slots.map((y, k) => (k === i ? { ...y, v: e.target.value } : y)))} className={`${inputCls} pr-8`} />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-500">%</span>
            </span>
          </label>
        ))}
      </div>
      {bad && <p className="mt-3 text-[13.5px] text-alert">Use a share between 10% and 100%.</p>}
    </Dialog>
  )
}

function HourlyBulk({ h, onClose, onSave }: { h: HourlySetup; onClose: () => void; onSave: (open: Record<string, number>) => void }) {
  const [from, setFrom] = useState(todayISO())
  const [to, setTo] = useState(addDays(todayISO(), 6))
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6])
  const [n, setN] = useState(String(h.rooms))
  const picked = span(from, to).filter((d) => days.includes(parseISODate(d).getDay()))
  return (
    <Dialog
      title="Bulk update"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button type="button" disabled={!picked.length} onClick={() => onSave(Object.fromEntries(picked.map((d) => [d, Math.max(0, Math.min(h.rooms, Math.round(Number(n) || 0)))])))} className={btnSolid}>
            Update {picked.length} day{picked.length === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Dates">
          <RangeCalendar tabs={false} centered clearable={false} min={todayISO()} label="From – To" value={{ mode: 'stay', from, to }} onChange={(v) => v && (setFrom(v.from), setTo(v.to >= v.from ? v.to : v.from))} />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {WEEK.map((w, i) => (
            <button key={w} type="button" aria-pressed={days.includes(i)} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])} className={`h-9 min-w-11 rounded-lg border px-2 text-[13px] font-semibold ${days.includes(i) ? 'border-pine-800 bg-pine-800 text-white' : 'border-line-strong text-ink-700'}`}>
              {w}
            </button>
          ))}
        </div>
        <Field label={`Available rooms (of ${h.rooms})`} htmlFor="hb-n">
          <input id="hb-n" type="number" min={0} max={h.rooms} value={n} onChange={(e) => setN(e.target.value)} className={inputCls} />
        </Field>
      </div>
    </Dialog>
  )
}

function ExtraCharges({ h, room, onClose }: { h: HourlySetup; room: ListingRoom; onClose: () => void }) {
  const adult = room.extraAdultCharge ?? 0
  const child = room.childCharge ?? 0
  return (
    <Dialog title="Extra guest charges" onClose={onClose}>
      <p className="text-[14px] text-ink-700">
        From {room.name}: extra adult {inr(adult)}, child {inr(child)} a night. Hourly slots charge the same share as the room.
      </p>
      <table className="mt-4 w-full text-[14.5px]">
        <thead>
          <tr className="border-b border-line text-left text-ink-500">
            <th className="py-2 font-normal">Slot</th>
            <th className="py-2 font-normal">Extra adult</th>
            <th className="py-2 font-normal">Child</th>
          </tr>
        </thead>
        <tbody>
          {h.slots.map((s) => (
            <tr key={s.hours} className="border-b border-line">
              <td className="py-2">
                {s.hours} hours ({s.pct}%)
              </td>
              <td className="py-2">{rupee((adult * s.pct) / 100)}</td>
              <td className="py-2">{rupee((child * s.pct) / 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!adult && !child && (
        <p className="mt-3 flex items-center gap-1.5 text-[13.5px] text-ink-500">
          <Check className="h-4 w-4" aria-hidden="true" /> No extra guest charges set on this room.
        </p>
      )}
    </Dialog>
  )
}
