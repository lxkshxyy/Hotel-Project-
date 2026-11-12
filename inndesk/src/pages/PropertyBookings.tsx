import { AnimatePresence, motion } from 'framer-motion'
import { CalendarX, ChevronDown, ChevronRight, FileSpreadsheet, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { HotelierVoucher } from '../components/HotelierVoucher'
import { RangeCalendar, type DateFilter } from '../components/RangeCalendar'
import { Notice, Spinner } from '../components/ui'
import { addDays, inr, parseISODate, todayISO } from '../lib/format'
import { useListings, useReservations, type ResvRow } from '../lib/hooks'
import { settle } from '../lib/money'

type DateField = 'checkin' | 'checkout' | 'booked' | 'staying' | 'stay'
type Status = 'active' | 'cancelled' | 'modified' | 'denied'
type Pay = 'pending' | 'processed' | null
type Range = { kind: 'past30' | 'next90' | 'custom'; from: string; to: string }

const dm = (iso: string) => parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const longDay = (iso: string) => parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }).toUpperCase()
const mask = (p: string) => {
  const d = p.replace(/\D/g, '')
  return d.length >= 6 ? `${d.slice(0, 4)}****${d.slice(-4)}` : p
}
const dayKey = (r: ResvRow, f: DateField) => (f === 'checkout' ? r.check_out : f === 'booked' ? r.created_at.slice(0, 10) : r.check_in)
const unit: Record<DateField, [string, string]> = { checkin: ['Check-in', 'Check-ins'], staying: ['Check-in', 'Check-ins'], stay: ['Check-in', 'Check-ins'], checkout: ['Check-out', 'Check-outs'], booked: ['Booking', 'Bookings'] }
const hourOf = (t?: string) => {
  const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t ?? '')
  if (!m) return 12
  return (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)
}

function Radio({ name, label, on, onPick }: { name: string; label: string; on: boolean; onPick: () => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 py-1.5 text-[14.5px] text-ink-900">
      <input type="radio" name={name} checked={on} onChange={() => {}} onClick={onPick} className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-pine-800" />
      {label}
    </label>
  )
}

/** Monday of the week a date falls in. */
const weekStart = (iso: string) => addDays(iso, -((parseISODate(iso).getDay() + 6) % 7))

/** Bookings for one property: list or hourly view, daily or weekly grouping, sliding filters, vouchers. */
export default function PropertyBookings() {
  const { id = '' } = useParams()
  const { data } = useListings()
  const l = data?.find((x) => x.id === id)
  const { list, offline, loading } = useReservations(l ? [l] : [])
  const t = todayISO()
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [view, setView] = useState<'list' | 'hourly'>('list')
  const [group, setGroup] = useState<'daily' | 'weekly'>('daily')
  const [range, setRange] = useState<Range>({ kind: 'next90', from: t, to: addDays(t, 90) })
  const [cal, setCal] = useState<DateFilter>(null)
  const [field, setField] = useState<DateField>('checkin')
  const [status, setStatus] = useState<Status>('active')
  const [pay, setPay] = useState<Pay>(null)
  const [voucher, setVoucher] = useState<ResvRow | null>(null)
  const [openPay, setOpenPay] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    if (!filtersOpen) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setFiltersOpen(false)
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [filtersOpen])

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase()
    return list
      .filter((r) => {
        const k = dayKey(r, field)
        if (field === 'staying') {
          if (!(r.check_in <= t && r.check_out > t)) return false
        } else if (field === 'stay') {
          if (!(r.check_in <= range.to && r.check_out > range.from)) return false
        } else if (k < range.from || k > range.to) return false
        if (status === 'active' && (r.status === 'cancelled' || r.desk === 'no-show')) return false
        if (status === 'cancelled' && r.status !== 'cancelled') return false
        if (status === 'modified') return false // modifications aren't tracked yet
        if (status === 'denied' && r.desk !== 'no-show') return false
        if (pay === 'pending' && !(r.pay_mode === 'hotel' && r.desk !== 'departed')) return false
        if (pay === 'processed' && !(r.pay_mode === 'now' || r.desk === 'departed')) return false
        return !n || [r.id, r.guest_name, r.guest_phone].some((v) => v.toLowerCase().includes(n))
      })
      .sort((a, b) => dayKey(a, field).localeCompare(dayKey(b, field)) || a.id.localeCompare(b.id))
  }, [list, q, field, range, status, pay, t])

  // Each group is one day (Daily) or one Monday–Sunday week (Weekly): [first day, last day, bookings].
  const groups = useMemo(() => {
    const m = new Map<string, ResvRow[]>()
    for (const r of shown) {
      const d = field === 'staying' ? t : dayKey(r, field)
      const k = group === 'weekly' ? weekStart(d) : d
      m.set(k, [...(m.get(k) ?? []), r])
    }
    return [...m].map(([k, rows]) => [k, group === 'weekly' ? addDays(k, 6) : k, rows] as const)
  }, [shown, field, t, group])

  if (!data || loading) return <Spinner />
  if (!l) return <div className="p-8">Property not found.</div>

  const upcomingCount = list.filter((r) => r.status !== 'cancelled' && r.check_in >= t && r.check_in <= addDays(t, 90)).length
  const setQuick = (kind: 'past30' | 'next90') => {
    setCal(null)
    if (field === 'stay') setField('checkin')
    setRange(kind === 'past30' ? { kind, from: addDays(t, -30), to: t } : { kind, from: t, to: addDays(t, 90) })
  }
  const applyCal = (v: DateFilter) => {
    setCal(v)
    if (!v) return setQuick('next90')
    setRange({ kind: 'custom', from: v.from, to: v.to })
    setField(v.mode === 'checkin' ? 'checkin' : v.mode === 'booking' ? 'booked' : 'stay')
  }
  const statusText = (r: ResvRow) => (r.status === 'cancelled' ? 'Cancelled' : r.desk === 'no-show' ? 'Check-in denied' : r.desk === 'in-house' ? 'Checked in' : r.desk === 'departed' ? 'Checked out' : 'Confirmed')
  const csv = (rows: ResvRow[], name: string) => {
    const head = ['Booking ID', 'Guest name', 'Phone', 'Email', 'Check-in', 'Check-out', 'Nights', 'Rooms', 'Room', 'Guests', 'Payment', 'Amount', 'Net amount', 'Status']
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const body = rows.map((r) => [r.id, r.guest_name, r.guest_phone, r.guest_email, r.check_in, r.check_out, r.nights, r.rooms, r.room_name, r.guests, r.pay_mode === 'hotel' ? 'Pay at hotel' : 'Paid online', r.amount, settle(r, l).earned, statusText(r)].map(cell).join(','))
    const url = URL.createObjectURL(new Blob([[head.map(cell).join(','), ...body].join('\n')], { type: 'text/csv' }))
    Object.assign(document.createElement('a'), { href: url, download: `${name}-${t}.csv` }).click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const active = (field !== 'checkin' && field !== 'stay' ? 1 : 0) + (status !== 'active' ? 1 : 0) + (pay ? 1 : 0) + (group !== 'daily' ? 1 : 0) + (view !== 'list' ? 1 : 0)
  const clearAll = () => {
    if (field !== 'stay') setField('checkin')
    setStatus('active')
    setPay(null)
    setGroup('daily')
    setView('list')
  }
  const promoTo = `/app/properties/${l.id}/section/promotions`

  // Gaps of a week or more with no future check-ins between groups → promotion nudge.
  const gapAfter = (i: number) => {
    if (field !== 'checkin' || status !== 'active') return null
    const cur = groups[i][1]
    const next = groups[i + 1]?.[0] ?? (range.to > t ? addDays(range.to, 1) : null)
    if (!next) return null
    const from = addDays(cur < t ? t : cur, 1)
    const to = addDays(next, -1)
    if (to < t || (parseISODate(to).getTime() - parseISODate(from).getTime()) / 86400000 < 6) return null
    return (
      <div key={`gap-${cur}`} className="flex flex-col gap-3 rounded-xl border-l-4 border-brass-500 bg-brass-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brass-700 ring-1 ring-brass-200">
            <CalendarX className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <strong className="block text-[15.5px] font-semibold text-ink-900">
              {dm(from)} - {dm(to)} | No Bookings
            </strong>
            <span className="text-[13.5px] text-ink-700">We recommend offering your best rates to raise the chance of bookings.</span>
          </div>
        </div>
        <Link to={promoTo} className="flex h-10 shrink-0 items-center gap-1 rounded-lg border border-pine-800 bg-white px-4 text-[14.5px] font-semibold text-pine-800 no-underline hover:bg-pine-50">
          Offer Promotion Now <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    )
  }

  const card = (r: ResvRow) => {
    const s = settle(r, l)
    const st = statusText(r)
    return (
      <div key={r.id} className="rounded-xl border border-line bg-white transition-shadow hover:shadow-[0_10px_24px_-16px_rgba(18,55,42,0.35)]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pt-4 pb-3 md:grid-cols-[1.4fr_1.3fr_1.4fr_1.2fr_1.1fr_0.9fr] md:items-center">
          <div className="col-span-2 flex items-start gap-3 md:col-span-1">
            <div className="min-w-0">
              <button type="button" onClick={() => setVoucher(r)} className="block max-w-full truncate text-left text-[15px] font-bold text-pine-800 uppercase hover:underline">
                {r.guest_name}
              </button>
              <span className="text-[13.5px] font-medium text-ink-700">{r.guests > 1 ? `+ ${r.guests - 1} Guest${r.guests > 2 ? 's' : ''}` : '1 Guest'}</span>
            </div>
          </div>
          <div className="text-[13.5px] text-ink-900">
            <span className="block">
              <span className="font-semibold">Check-In:</span> {dm(r.check_in)}
            </span>
            <span className="block">
              <span className="font-semibold">Check-Out:</span> {dm(r.check_out)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[13.5px] text-ink-900">
            <span>
              {r.rooms} {r.room_name}
            </span>
            <span className={`rounded-md px-2 py-0.5 text-[12px] font-bold ${r.pay_mode === 'now' ? 'bg-pine-50 text-pine-900' : 'bg-[#eceeed] text-ink-700'}`}>{r.pay_mode === 'now' ? 'Prepaid' : 'Pay@hotel'}</span>
          </div>
          <div className="text-[13.5px] text-ink-900">
            <span className="text-ink-500 md:hidden">Booking ID </span>
            {r.id}
          </div>
          <div className="text-[13.5px] text-ink-900">
            <span className="text-ink-500 md:hidden">Contact </span>
            {mask(r.guest_phone)}
          </div>
          <div className="text-right text-[15px] font-bold text-ink-900">{inr(s.earned)}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setOpenPay(openPay === r.id ? null : r.id)} aria-expanded={openPay === r.id} className="flex items-center gap-1 text-[14px] font-semibold text-pine-800 hover:underline">
              Payment Details <ChevronDown className={`h-4 w-4 transition-transform ${openPay === r.id ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {st !== 'Confirmed' && <span className={`rounded-md px-2 py-0.5 text-[12px] font-bold ${r.status === 'cancelled' || r.desk === 'no-show' ? 'bg-alert-50 text-alert' : 'bg-pine-50 text-pine-900'}`}>{st}</span>}
          </div>
          <button type="button" onClick={() => setVoucher(r)} className="h-8 rounded-md border border-pine-800 px-4 text-[14px] font-semibold text-pine-800 hover:bg-pine-50">
            View
          </button>
        </div>
        <AnimatePresence initial={false}>
          {openPay === r.id && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-line bg-[#f8faf9] px-4 py-3 text-[13.5px] sm:grid-cols-5">
                <div>
                  <dt className="text-ink-500">Room charges</dt>
                  <dd className="font-semibold text-ink-900">{inr(s.roomAmount)}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Taxes</dt>
                  <dd className="font-semibold text-ink-900">{inr(r.tax)}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Commission incl. GST</dt>
                  <dd className="font-semibold text-ink-900">− {inr(s.commission + s.gst)}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">TDS / TCS</dt>
                  <dd className="font-semibold text-ink-900">− {inr(s.tds + s.tcs)}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">{r.pay_mode === 'now' ? 'Payable to you' : 'Collect at check-in'}</dt>
                  <dd className="font-semibold text-pine-900">{inr(r.pay_mode === 'now' ? s.earned : r.amount)}</dd>
                </div>
              </dl>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const filters = (
    <div className="flex flex-col gap-5 [&>div]:border-t [&>div]:border-line [&>div]:pt-4">
      <div>
      <fieldset>
        <legend className="mb-1 text-[15px] font-semibold text-ink-900">Date Filters</legend>
        {(
          [
            ['checkin', 'Check-in'],
            ['checkout', 'Check-out'],
            ['booked', 'Booking Dates'],
            ['staying', 'Staying Today'],
          ] as [DateField, string][]
        ).map(([k, lbl]) => (
          <Radio key={k} name="df" label={lbl} on={field === k} onPick={() => setField(k)} />
        ))}
      </fieldset>
      </div>
      <div>
      <fieldset>
        <legend className="mb-1 text-[15px] font-semibold text-ink-900">Booking Status</legend>
        {(
          [
            ['active', 'Active'],
            ['cancelled', 'Cancelled'],
            ['modified', 'Modified'],
            ['denied', 'Check-in-denied'],
          ] as [Status, string][]
        ).map(([k, lbl]) => (
          <Radio key={k} name="bs" label={lbl} on={status === k} onPick={() => setStatus(k)} />
        ))}
      </fieldset>
      </div>
      <div>
      <fieldset>
        <legend className="mb-1 text-[15px] font-semibold text-ink-900">Payment Status</legend>
        {(
          [
            ['pending', 'Pending'],
            ['processed', 'Processed'],
          ] as [Exclude<Pay, null>, string][]
        ).map(([k, lbl]) => (
          <Radio key={k} name="ps" label={lbl} on={pay === k} onPick={() => setPay(pay === k ? null : k)} />
        ))}
      </fieldset>
      </div>
    </div>
  )

  const headRow = (
    <div className="hidden grid-cols-[1.4fr_1.3fr_1.4fr_1.2fr_1.1fr_0.9fr] gap-x-4 rounded-lg border-l-4 border-pine-800 bg-[#eef4f0] px-4 py-3 text-[14px] font-semibold text-ink-900 md:grid">
      <span>Guest Name</span>
      <span>Stay Duration</span>
      <span>Room &amp; Payment</span>
      <span>Booking ID</span>
      <span>Guest Contact</span>
      <span className="text-right">Net Amount</span>
    </div>
  )

  return (
    <div className="min-h-[calc(100dvh-68px)] bg-white">
      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[30px] font-bold text-ink-900">Bookings</h1>
          <div className="flex items-center gap-2">
            <form
              className="flex h-11 w-full items-center gap-2 rounded-lg border border-line-strong pr-1.5 pl-3 focus-within:border-pine-700 focus-within:ring-1 focus-within:ring-pine-700 sm:w-[400px]"
              onSubmit={(e) => {
                e.preventDefault()
                setQ(text)
              }}
            >
              <Search className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />
              <input value={text} onChange={(e) => (setText(e.target.value), !e.target.value && setQ(''))} placeholder="Search by booking ID or guest name" aria-label="Search by booking ID or guest name" className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-ink-500" />
              <button type="submit" className="h-8 rounded-md bg-[#e4e9e6] px-3 text-[13.5px] font-semibold text-ink-900 hover:bg-pine-100">
                Search
              </button>
            </form>
          </div>
        </div>

        {offline && (
          <div className="mt-4">
            <Notice tone="warn">Can’t reach the booking data right now, so this list may be out of date.</Notice>
          </div>
        )}

        <section className="mt-5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button type="button" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" aria-expanded={filtersOpen} className="flex h-11 items-center gap-2 rounded-lg border border-pine-800 bg-white px-4 text-[14.5px] font-semibold text-pine-800 hover:bg-pine-50">
                      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters
                      {active > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pine-800 px-1 text-[12px] font-bold text-white">{active}</span>}
                    </button>
                    <button type="button" onClick={() => setQuick('past30')} className={`h-11 rounded-lg border px-5 text-[14.5px] font-semibold transition-colors ${range.kind === 'past30' ? 'border-pine-800 bg-pine-800 text-white' : 'border-line-strong bg-white text-pine-800 hover:border-pine-700'}`}>
                      Past 30 Days
                    </button>
                    <button type="button" onClick={() => setQuick('next90')} className={`h-11 rounded-lg border px-5 text-[14.5px] font-semibold transition-colors ${range.kind === 'next90' ? 'border-pine-800 bg-pine-800 text-white' : 'border-line-strong bg-white text-pine-800 hover:border-pine-700'}`}>
                      Upcoming 90 Days ({upcomingCount})
                    </button>
                    <RangeCalendar button value={range.kind === 'custom' ? cal : null} onChange={applyCal} />
                  </div>
                  <button type="button" onClick={() => csv(shown, 'bookings')} disabled={!shown.length} className="flex items-center gap-1.5 text-[14.5px] font-semibold text-pine-800 hover:underline disabled:opacity-50">
                    <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Download Excel
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {view === 'list' && headRow}
                  {groups.map(([day, end, rows], i) => (
                    <div key={day} className="flex flex-col gap-3">
                      {view === 'list' ? (
                        <>
                          <div className="flex items-center gap-3 rounded-lg bg-[#eef4f0] px-4 py-2.5 text-[14px] font-semibold text-ink-900">
                            {day === end ? dm(day) : `${dm(day)} – ${dm(end)}`}
                            <span className="h-4 w-px bg-ink-400" />
                            {rows.length} {unit[field][rows.length === 1 ? 0 : 1]}
                          </div>
                          {rows.map((r) => card(r))}
                        </>
                      ) : (
                        <Hourly title={day === end ? longDay(day) : `${longDay(day)} – ${longDay(end)}`} count={rows.length} label={unit[field][rows.length === 1 ? 0 : 1]} start={field === 'checkout' ? hourOf(l.policies.checkOut) : hourOf(l.policies.checkIn)} />
                      )}
                      {gapAfter(i)}
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-line px-4 py-14 text-center">
                      <CalendarX className="h-10 w-10 text-ink-400" strokeWidth={1.5} aria-hidden="true" />
                      <strong className="text-[16px] font-semibold text-ink-900">No bookings found</strong>
                      <p className="max-w-md text-[14px] text-ink-700">{status === 'modified' ? 'Modified bookings will show here once guests can change their bookings.' : 'Try other dates or filters.'}</p>
                      {field === 'checkin' && status === 'active' && range.to > t && (
                        <Link to={promoTo} className="mt-2 flex h-10 items-center gap-1 rounded-lg border border-pine-800 px-4 text-[14.5px] font-semibold text-pine-800 no-underline hover:bg-pine-50">
                          Offer Promotion Now <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
        </section>
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && setFiltersOpen(false)} className="fixed inset-0 z-[80] bg-ink-900/40">
            <motion.aside role="dialog" aria-modal="true" aria-label="Filters" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.26, ease: 'easeOut' }} className="flex h-full w-[340px] max-w-[88vw] flex-col bg-white shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
                <h2 className="text-[20px] font-semibold text-ink-900">Filters</h2>
                <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-900 hover:bg-paper">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                <Seg label="Group bookings" value={group} onChange={setGroup} options={[['daily', 'Daily'], ['weekly', 'Weekly']]} />
                <div className="mt-4">
                  <Seg label="View" value={view} onChange={setView} options={[['list', 'List view'], ['hourly', 'Hourly view']]} />
                </div>
                <div className="mt-5">{filters}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3 border-t border-line px-5 py-4">
                <button type="button" onClick={clearAll} className="h-11 rounded-lg border border-line-strong px-4 text-[14.5px] font-semibold text-pine-800 hover:border-pine-700">
                  Clear all
                </button>
                <button type="button" onClick={() => setFiltersOpen(false)} className="h-11 flex-1 rounded-lg bg-pine-800 px-4 text-[14.5px] font-semibold text-white hover:bg-pine-900">
                  Show {shown.length} booking{shown.length === 1 ? '' : 's'}
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <HotelierVoucher r={voucher} l={l} status={voucher ? statusText(voucher) : ''} onClose={() => setVoucher(null)} />
    </div>
  )
}

/** Two-option switch used at the top of the filter panel. */
function Seg<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-500">{label}</span>
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-pine-800 text-[13.5px] font-bold">
        {options.map(([k, text]) => (
          <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={value === k} className={`h-10 transition-colors ${value === k ? 'bg-pine-800 text-white' : 'bg-white text-ink-700 hover:bg-pine-50'}`}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

/** One day (or week) on a 24-hour line, with the arrivals band from the property's check-in time. */
function Hourly({ title, count, label, start }: { title: string; count: number; label: string; start: number }) {
  const ticks = [0, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
  const pos = (h: number) => (h <= 9 ? (h / 9) * 16 : 16 + ((h - 9) / 15) * 84)
  const lbl = (h: number) => (h === 0 || h === 24 ? '12 AM' : h === 12 ? '12 PM' : String(h > 12 ? h - 12 : h))
  return (
    <div className="rounded-xl border border-line px-4 pt-3 pb-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3 text-[14px] font-bold text-pine-800">
          {title} <span className="h-4 w-px bg-ink-400" /> <span className="font-semibold">{count} {label}</span>
        </span>
        <span className="flex items-center gap-2 text-[13px] text-ink-700">
          <span className="h-3.5 w-3.5 rounded-full bg-brass-200" /> Regular bookings
        </span>
      </div>
      <div className="relative mt-6 h-12">
        {ticks.map((h) => (
          <span key={h} className={`absolute top-0 text-[12px] whitespace-nowrap text-ink-500 ${h === 0 ? '' : h === 24 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${pos(h)}%` }}>
            {lbl(h)}
          </span>
        ))}
        <div className="absolute inset-x-0 top-[26px] h-5 rounded-full bg-[#f4f6f5]" />
        <div className="absolute top-[26px] flex h-5 items-center justify-center rounded-full bg-gradient-to-r from-brass-200 via-brass-200 to-brass-200/30 text-[12px] font-semibold text-ink-900" style={{ left: `${pos(start)}%`, right: 0 }}>
          {count} {label}
        </div>
      </div>
    </div>
  )
}
