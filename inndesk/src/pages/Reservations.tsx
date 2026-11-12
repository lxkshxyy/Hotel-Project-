import { Download, Info, Mail, Phone, Search, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MultiFilter, PageSize, Pager, SortHead } from '../components/Filters'
import { RangeCalendar, type DateFilter } from '../components/RangeCalendar'
import { Modal, Notice, Spinner } from '../components/ui'
import { site } from '../config/site'
import { dayMonth, inr, plural, shortDate, todayISO } from '../lib/format'
import { useListings, useReservations, type Desk, type ResvRow } from '../lib/hooks'
import { settle } from '../lib/money'
import { getMarks, setMark } from '../lib/store'
import type { Listing } from '../lib/types'

const statuses: { value: Desk; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'in-house', label: 'In house' },
  { value: 'departed', label: 'Departed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no-show', label: 'No-show' },
]
const deskStyle: Record<Desk, string> = {
  upcoming: 'bg-pine-50 text-pine-900',
  'in-house': 'bg-brass-50 text-brass-700',
  departed: 'bg-[#E6EEF7] text-ink-700',
  cancelled: 'bg-alert-50 text-alert',
  'no-show': 'bg-[#EAF5FC] text-[#8a4b00]',
}
const deskText = Object.fromEntries(statuses.map((x) => [x.value, x.label])) as Record<Desk, string>

type Range = DateFilter
type Sort = { key: 'check_in' | 'check_out'; dir: 'asc' | 'desc' }

/** Outlined box with its label sitting on the border. */
function Outlined({ label, children, focus }: { label: string; children: React.ReactNode; focus?: boolean }) {
  return (
    <div className={`relative flex h-[52px] items-center gap-2 rounded-lg border bg-white px-3.5 transition-colors focus-within:border-pine-700 focus-within:ring-1 focus-within:ring-pine-700 ${focus ? 'border-pine-700 ring-1 ring-pine-700' : 'border-ink-400'}`}>
      <span className="pointer-events-none absolute -top-2.5 left-2.5 bg-white px-1 text-[12px] leading-5 text-ink-500">{label}</span>
      {children}
    </div>
  )
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

export default function Reservations() {
  // Under a property (/app/properties/:id/reservations) only that property's bookings show.
  const { id } = useParams()
  const { data: allListings } = useListings()
  const listings = id ? allListings?.filter((l) => l.id === id) : allListings
  const scoped = id ? listings?.[0] : undefined
  const { list, offline, loading } = useReservations(listings)
  const [idText, setIdText] = useState('')
  const [range, setRange] = useState<Range>(null)
  // What the table uses: the text box and dates apply on Search, the filters straight away.
  const [applied, setApplied] = useState<{ q: string; range: Range }>({ q: '', range: null })
  const [props, setProps] = useState<string[]>([])
  const [st, setSt] = useState<string[]>([])
  const [sort, setSort] = useState<Sort>({ key: 'check_in', dir: 'asc' })
  const [size, setSize] = useState(100)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<ResvRow | null>(null)

  const propOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const l of listings ?? []) if (l.slug && l.status !== 'draft') m.set(l.slug, l.basics.name.trim() || 'Unnamed property')
    for (const r of list) if (!m.has(r.hotel_slug)) m.set(r.hotel_slug, r.hotel_name)
    return [...m].map(([value, label]) => ({ value, label, sub: (listings ?? []).find((l) => l.slug === value)?.id.toUpperCase() }))
  }, [listings, list])

  const shown = useMemo(() => {
    const n = applied.q.trim().toLowerCase()
    const r = applied.range
    return list
      .filter((x) => (!props.length || props.includes(x.hotel_slug)) && (!st.length || st.includes(x.desk)) && (!r || (r.mode === 'checkin' ? x.check_in >= r.from && x.check_in <= r.to : r.mode === 'stay' ? x.check_in <= r.to && x.check_out > r.from : x.created_at.slice(0, 10) >= r.from && x.created_at.slice(0, 10) <= r.to)) && (!n || [x.id, x.guest_name, x.guest_phone].some((v) => v.toLowerCase().includes(n))))
      .sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * a[sort.key].localeCompare(b[sort.key]))
  }, [list, applied, props, st, sort])

  if (!listings || loading) return <Spinner />
  const pages = Math.max(1, Math.ceil(shown.length / size))
  const cur = Math.min(page, pages)
  const rows = shown.slice((cur - 1) * size, cur * size)
  const search = () => {
    setApplied({ q: idText, range })
    setPage(1)
  }
  const startOver = () => {
    setIdText('')
    setRange(null)
    setApplied({ q: '', range: null })
    setProps([])
    setSt([])
    setPage(1)
  }
  const toggleSort = (key: Sort['key']) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  const exportCsv = () => {
    const head = ['Property', 'Booking ID', 'Guest name', 'Phone', 'Email', 'Check-in', 'Check-out', 'Nights', 'Rooms', 'Room', 'Guests', 'Payment', 'Amount', 'Status']
    const lines = shown.map((r) => [r.hotel_name, r.id, r.guest_name, r.guest_phone, r.guest_email, r.check_in, r.check_out, r.nights, r.rooms, r.room_name, r.guests, r.pay_mode === 'hotel' ? 'Pay at hotel' : 'Paid online', r.amount, deskText[r.desk]].map(csvCell).join(','))
    const url = URL.createObjectURL(new Blob([[head.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `reservations-${todayISO()}.csv` })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const quick = (r: ResvRow, m: Parameters<typeof setMark>[1]) => setMark(r.id, m)
  const th = 'border-r border-line px-4 py-3.5 text-left text-[14px] font-semibold text-ink-900 last:border-r-0'

  return (
    <div className="min-h-[calc(100dvh-68px)] bg-white">
      <div className="bg-[#EAF5FC]">
        <div className="mx-auto max-w-[1280px] px-4 pt-7 pb-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[30px] font-bold text-ink-900 sm:text-[34px]">Reservations</h1>
              {scoped && <p className="text-[15px] text-ink-500">{scoped.basics.name.trim() || 'Unnamed property'}</p>}
            </div>
            <button type="button" onClick={exportCsv} disabled={!shown.length} className="flex items-center gap-2 text-[15px] font-semibold text-pine-800 hover:underline disabled:opacity-50">
              <Download className="h-5 w-5" aria-hidden="true" /> Export CSV
            </button>
          </div>
          <form
            className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center"
            onSubmit={(e) => {
              e.preventDefault()
              search()
            }}
          >
            <div className="min-w-0 flex-1">
              <Outlined label="Booking ID">
                <Search className="h-4 w-4 shrink-0 text-ink-700" aria-hidden="true" />
                <input value={idText} onChange={(e) => setIdText(e.target.value)} placeholder="Booking ID, guest name or phone" aria-label="Booking ID, guest name or phone" className="min-w-0 flex-1 self-stretch bg-transparent text-[15.5px] outline-none placeholder:text-ink-500" />
              </Outlined>
            </div>
            <RangeCalendar value={range} onChange={setRange} />
            <button type="submit" className="h-12 shrink-0 rounded-full bg-pine-800 px-12 text-[16px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(26, 44, 91,0.55)] transition-colors hover:bg-pine-900">
              Search
            </button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[14px] text-ink-700">Filters:</span>
            {!scoped && <MultiFilter allLabel="All properties" unit="properties" search options={propOptions} selected={props} onChange={(v) => (setProps(v), setPage(1))} />}
            <MultiFilter allLabel="All statuses" unit="statuses" options={statuses} selected={st} onChange={(v) => (setSt(v), setPage(1))} />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-6 sm:px-8">
        {offline ? (
          <Notice tone="warn">Can’t reach {site.marketplace} right now, so this list may be out of date.</Notice>
        ) : (
          <div className="flex gap-3 rounded-xl bg-pine-50 px-4 py-3 text-[14px] text-pine-900">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-pine-800" aria-hidden="true" />
            <p>
              <strong className="font-semibold">Every {site.marketplace} booking at your properties shows here, newest within seconds.</strong>
              <br />
              Export CSV downloads the bookings currently shown. Use the filters to narrow it down first.
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-line">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse">
              <thead className="bg-[#F4F8FC]">
                <tr>
                  <th className={th}>Property</th>
                  <th className={th}>Booking ID</th>
                  <th className={th}>Guest name</th>
                  <th className={th}>
                    <SortHead label="Check-in" dir={sort.key === 'check_in' ? sort.dir : null} onClick={() => toggleSort('check_in')} />
                  </th>
                  <th className={th}>
                    <SortHead label="Check-out" dir={sort.key === 'check_out' ? sort.dir : null} onClick={() => toggleSort('check_out')} />
                  </th>
                  <th className={th}>Room &amp; occupancy</th>
                  <th className={th}>Payment model</th>
                  <th className={th}>Quick actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line align-top transition-colors hover:bg-[#F4F8FC]">
                    <td className="px-4 py-3.5 text-[14px] font-medium text-ink-900">{r.hotel_name}</td>
                    <td className="px-4 py-3.5">
                      <button type="button" onClick={() => setOpen(r)} className="text-[14px] font-semibold text-pine-800 hover:underline">
                        {r.id}
                      </button>
                      <span className={`mt-1.5 block w-fit rounded-md px-2 py-0.5 text-[12px] font-bold ${deskStyle[r.desk]}`}>{deskText[r.desk]}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[14px]">
                      <span className="block font-medium text-ink-900">{r.guest_name}</span>
                      <span className="block text-[13px] text-ink-500">{r.guest_phone}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[14px] whitespace-nowrap text-ink-900">{shortDate(r.check_in)}</td>
                    <td className="px-4 py-3.5 text-[14px] whitespace-nowrap text-ink-900">
                      {shortDate(r.check_out)}
                      <span className="block text-[13px] text-ink-500">{plural(r.nights, 'night')}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[14px] text-ink-900">
                      {r.rooms} × {r.room_name}
                      <span className="block text-[13px] text-ink-500">{plural(r.guests, 'guest')}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[14px] text-ink-900">
                      {r.pay_mode === 'hotel' ? 'Pay at hotel' : 'Paid online'}
                      <span className="block text-[13px] text-ink-500">{inr(r.amount)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setOpen(r)} className="h-8 rounded-full border border-line-strong px-3.5 text-[13px] font-semibold text-pine-800 hover:border-pine-700 hover:bg-pine-50">
                          View
                        </button>
                        {r.desk === 'upcoming' && r.check_in <= todayISO() && (
                          <button type="button" onClick={() => quick(r, 'checked-in')} className="h-8 rounded-full bg-pine-800 px-3.5 text-[13px] font-semibold text-white hover:bg-pine-900">
                            Check in
                          </button>
                        )}
                        {r.desk === 'in-house' && (
                          <button type="button" onClick={() => quick(r, 'checked-out')} className="h-8 rounded-full bg-pine-800 px-3.5 text-[13px] font-semibold text-white hover:bg-pine-900">
                            Check out
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
              <TriangleAlert className="h-12 w-12 fill-[#E6EEF7] text-[#C3CDDD]" strokeWidth={1.6} aria-hidden="true" />
              <strong className="mt-2 text-[16px] font-semibold text-ink-900">No bookings found</strong>
              <p className="text-[14px] text-ink-700">{list.length ? 'Try your search again with new dates or filters' : `When a guest books one of your live properties on ${site.marketplace}, it appears here.`}</p>
              {list.length > 0 && (
                <button type="button" onClick={startOver} className="mt-3 h-11 rounded-full border border-line-strong px-6 text-[15px] font-semibold text-pine-800 hover:border-pine-700 hover:bg-pine-50">
                  Start over
                </button>
              )}
            </div>
          )}
        </div>

        {shown.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PageSize value={size} onChange={(n) => (setSize(n), setPage(1))} />
            <Pager page={cur} pages={pages} onPage={setPage} />
          </div>
        )}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.guest_name}` : ''} wide>
        {open && <Detail r={open} l={listings?.find((x) => x.slug === open.hotel_slug)} onDone={() => setOpen(null)} />}
      </Modal>
    </div>
  )
}

function Detail({ r, l, onDone }: { r: ResvRow; l?: Listing; onDone: () => void }) {
  const s = settle(r, l)
  const mark = getMarks()[r.id]
  const act = (m: Parameters<typeof setMark>[1]) => {
    setMark(r.id, m)
    onDone()
  }
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[15px] sm:grid-cols-3">
        <div>
          <dt className="text-sm text-ink-500">Booking ID</dt>
          <dd className="font-bold">{r.id}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-500">Check-in</dt>
          <dd className="font-bold">{shortDate(r.check_in)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-500">Check-out</dt>
          <dd className="font-bold">{shortDate(r.check_out)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-500">Rooms</dt>
          <dd className="font-bold">
            {r.rooms} × {r.room_name}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-500">Guests</dt>
          <dd className="font-bold">{r.guests}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-500">Booked on</dt>
          <dd className="font-bold">{dayMonth(r.created_at.slice(0, 10))}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <a href={`tel:+91${r.guest_phone.replace(/\D/g, '').slice(-10)}`} className="btn-ghost min-h-10 text-sm">
          <Phone className="h-4 w-4" aria-hidden="true" /> {r.guest_phone}
        </a>
        <a href={`mailto:${r.guest_email}`} className="btn-ghost min-h-10 text-sm">
          <Mail className="h-4 w-4" aria-hidden="true" /> {r.guest_email}
        </a>
      </div>
      {r.special_requests && (
        <Notice>
          <strong>Guest request:</strong> {r.special_requests}
        </Notice>
      )}
      <div className="rounded-xl bg-paper p-4">
        <dl className="flex flex-col gap-1.5 text-[15px]">
          <div className="flex justify-between">
            <dt>Guest pays (incl. {inr(r.tax)} room GST)</dt>
            <dd className="font-semibold">{inr(r.amount)}</dd>
          </div>
          <div className="flex justify-between text-ink-700">
            <dt>Commission on {inr(s.roomAmount)}</dt>
            <dd>− {inr(s.commission)}</dd>
          </div>
          <div className="flex justify-between text-ink-700">
            <dt>GST on commission</dt>
            <dd>− {inr(s.gst)}</dd>
          </div>
          <div className="flex justify-between text-ink-700">
            <dt>TDS{s.tcs ? ' + GST TCS' : ''}</dt>
            <dd>− {inr(s.tds + s.tcs)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 font-bold">
            <dt>Yours</dt>
            <dd className="text-live">{inr(s.earned)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-sm text-ink-500">{s.collectedByHotel ? `Guest pays you at the hotel. The commission, its GST and TDS (${inr(-s.payout)}) come off your next payout.` : `Guest paid online. ${site.marketplace} pays you ${inr(s.payout)} after the stay.`}</p>
      </div>
      {r.status !== 'cancelled' && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          {mark && (
            <button type="button" className="btn-ghost" onClick={() => act(null)}>
              Undo {mark.replace('-', ' ')}
            </button>
          )}
          {r.desk === 'upcoming' && (
            <button type="button" className="btn-ghost" onClick={() => act('no-show')}>
              Mark no-show
            </button>
          )}
          {(r.desk === 'upcoming' || (r.desk === 'in-house' && mark !== 'checked-in')) && (
            <button type="button" className="btn-primary" onClick={() => act('checked-in')}>
              Mark checked in
            </button>
          )}
          {r.desk === 'in-house' && (
            <button type="button" className="btn-primary" onClick={() => act('checked-out')}>
              Mark checked out
            </button>
          )}
        </div>
      )}
    </div>
  )
}
