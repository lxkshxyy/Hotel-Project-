import { BedDouble, Mail, Phone, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Empty, Modal, Notice, PageHead, Spinner } from '../components/ui'
import { site } from '../config/site'
import { dayMonth, inr, plural, shortDate } from '../lib/format'
import { useListings, useReservations, type Desk, type ResvRow } from '../lib/hooks'
import { settle } from '../lib/money'
import { getMarks, setMark } from '../lib/store'

const tabs: { id: Desk | 'all'; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'in-house', label: 'In house' },
  { id: 'departed', label: 'Departed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'no-show', label: 'No-show' },
  { id: 'all', label: 'All' },
]

const deskStyle: Record<Desk, string> = {
  upcoming: 'bg-pine-50 text-pine-900',
  'in-house': 'bg-brass-500 text-pine-950',
  departed: 'bg-[#eceeed] text-ink-700',
  cancelled: 'bg-alert-50 text-alert',
  'no-show': 'bg-[#fff1e0] text-[#8a4b00]',
}
const deskText: Record<Desk, string> = { upcoming: 'Upcoming', 'in-house': 'In house', departed: 'Departed', cancelled: 'Cancelled', 'no-show': 'No-show' }

export default function Reservations() {
  const { data: listings } = useListings()
  const { list, offline, loading } = useReservations(listings)
  const [tab, setTab] = useState<Desk | 'all'>('upcoming')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<ResvRow | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length }
    for (const r of list) c[r.desk] = (c[r.desk] ?? 0) + 1
    return c
  }, [list])
  const n = q.trim().toLowerCase()
  const shown = list
    .filter((r) => (tab === 'all' || r.desk === tab) && (!n || [r.id, r.guest_name, r.guest_phone, r.room_name, r.hotel_name].some((v) => v.toLowerCase().includes(n))))
    .sort((a, b) => (tab === 'departed' || tab === 'cancelled' ? b.check_in.localeCompare(a.check_in) : a.check_in.localeCompare(b.check_in)))

  if (!listings || loading) return <Spinner />
  const many = new Set(list.map((r) => r.hotel_slug)).size > 1

  return (
    <div className="container-page flex flex-col gap-6 pt-8">
      <PageHead title="Reservations" intro={`Bookings made on ${site.marketplace} at your properties.`} />
      {offline && <Notice tone="warn">Can’t reach {site.marketplace} right now, so this list may be out of date.</Notice>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Reservation status" className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-line">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`min-h-10 shrink-0 rounded-lg px-3.5 text-sm font-bold ${tab === t.id ? 'bg-pine-900 text-white' : 'text-ink-700 hover:bg-paper'}`}>
              {t.label} <span className="opacity-70">{counts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-line-strong bg-white px-3 sm:w-[280px]">
          <Search className="h-4 w-4 text-ink-400" aria-hidden="true" />
          <span className="sr-only">Search reservations</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guest, phone or booking ID" className="min-w-0 flex-1 outline-none" />
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="panel">
          <Empty icon={<BedDouble className="h-7 w-7" />} title={n ? 'No reservation matches that search' : `No ${tab === 'all' ? '' : deskText[tab as Desk].toLowerCase() + ' '}reservations`}>
            {!list.length && <p className="max-w-sm text-ink-500">When a guest books one of your live properties on {site.marketplace}, it appears here within seconds.</p>}
          </Empty>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setOpen(r)} className="panel grid w-full gap-3 p-4 text-left hover:border-line-strong sm:grid-cols-[120px_1fr_auto] sm:items-center">
                <span className="flex items-baseline gap-2 sm:flex-col sm:gap-0">
                  <span className="font-display text-2xl font-bold text-pine-950">{dayMonth(r.check_in)}</span>
                  <span className="text-sm text-ink-500">{plural(r.nights, 'night')}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-lg font-bold">{r.guest_name}</span>
                  <span className="block text-sm text-ink-500">
                    {r.rooms} × {r.room_name}, {plural(r.guests, 'guest')}
                    {many ? `, ${r.hotel_name}` : ''}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${deskStyle[r.desk]}`}>{deskText[r.desk]}</span>
                  <span className="text-right">
                    <strong className="block">{inr(r.amount)}</strong>
                    <span className="text-xs text-ink-500">{r.pay_mode === 'hotel' ? 'Pay at hotel' : 'Paid online'}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.guest_name}` : ''} wide>
        {open && <Detail r={open} onDone={() => setOpen(null)} />}
      </Modal>
    </div>
  )
}

function Detail({ r, onDone }: { r: ResvRow; onDone: () => void }) {
  const s = settle(r)
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
          <div className="flex justify-between border-t border-line pt-2 font-bold">
            <dt>Yours</dt>
            <dd className="text-live">{inr(s.earned)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-sm text-ink-500">{s.collectedByHotel ? `Guest pays you at the hotel. The commission and its GST (${inr(s.commission + s.gst)}) come off your next payout.` : `Guest paid online. ${site.marketplace} pays you ${inr(s.payout)} after the stay.`}</p>
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
