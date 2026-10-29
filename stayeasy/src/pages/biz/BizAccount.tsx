import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import HotelArt from '../../components/HotelArt'
import { useAccount } from '../../context/AccountContext'
import { isMetro, payMethods, type BizBooking } from '../../data/business'
import { hotels } from '../../data/hotels'
import { cancelBizBooking, isSample, listBizBookings, roomNights } from '../../lib/bizApi'
import TripsShell, { TripsEmpty, type TripTab } from '../../components/TripsShell'
import { addDays, dayMonth, inr, plural, shortDate, todayISO } from '../../lib/format'
import { downloadCsv, Pill, StatCard } from './shared'

const photoOf = (slug: string) => hotels.find((h) => h.slug === slug)
const payLabel = (id: string) => payMethods.find((p) => p.id === id)?.title ?? id

function PageHead({ title, intro, children }: { title: string; intro: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy-800">{title}</h1>
        <p className="text-ink-500">{intro}</p>
      </div>
      {children}
    </div>
  )
}

/* ---------------- Trips ---------------- */

export function BizTrips() {
  const { company } = useAccount()
  const c = company!
  const [tick, setTick] = useState(0)
  const list = useMemo(() => listBizBookings(c), [c, tick]) // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState<TripTab>('upcoming')
  const [q, setQ] = useState('')
  const today = todayISO()
  const inTab = (b: BizBooking, t: TripTab) => (t === 'cancelled' ? b.status === 'cancelled' : b.status === 'confirmed' && (t === 'upcoming' ? b.checkOut >= today : b.checkOut < today))
  const needle = q.trim().toLowerCase()
  const match = (b: BizBooking) =>
    !needle || [b.id, b.hotelName, b.hotelCity, b.bookedBy, ...b.lines.map((l) => l.traveller)].some((v) => v.toLowerCase().includes(needle))
  const counts = { upcoming: 0, cancelled: 0, completed: 0 } as Record<TripTab, number>
  for (const b of list) for (const t of ['upcoming', 'cancelled', 'completed'] as TripTab[]) if (inTab(b, t)) counts[t]++
  const shown = list.filter((b) => inTab(b, tab) && match(b))
  const canCancel = (b: BizBooking) => b.status === 'confirmed' && addDays(today, 1) <= b.checkIn
  const tone = tab === 'cancelled' ? 'border-l-[#EE9B2A]' : tab === 'completed' ? 'border-l-ink-400' : 'border-l-[#16A394]'

  return (
    <TripsShell tab={tab} onTab={setTab} counts={counts} query={q} onQuery={setQ} crumbTo="/biz/profile">
      {shown.length === 0 ? (
        needle ? (
          <p className="p-10 text-center text-ink-500">No {tab} booking matches “{q}”. Try a booking ID, hotel, city or traveller name.</p>
        ) : (
          <TripsEmpty tab={tab} planTo="/biz" />
        )
      ) : (
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          {shown.map((b) => {
            const h = photoOf(b.hotelSlug)
            const over = b.lines.filter((l) => l.overLimit).length
            return (
              <article key={b.id} id={b.id} className={`flex scroll-mt-28 flex-col overflow-hidden rounded-xl border border-line border-l-4 ${tone} md:flex-row`}>
                <div className={`aspect-[16/9] md:aspect-auto md:w-[220px] md:shrink-0 ${tab === 'completed' ? 'grayscale-[40%]' : tab === 'cancelled' ? 'grayscale' : ''}`}>
                  <HotelArt hue={h?.hue ?? 210} photo={h?.photos?.[0]} label={b.hotelName} />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link to={`/biz/hotel/${b.hotelSlug}`} className="text-lg font-bold text-ink-900 no-underline hover:text-navy-800">
                        {b.hotelName}
                      </Link>
                      <div className="text-sm text-ink-500">
                        {b.hotelCity} · {shortDate(b.checkIn)} – {shortDate(b.checkOut)} · {plural(b.nights, 'night')}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {b.status === 'cancelled' ? (
                        <span className="rounded-full bg-[#FFF3D6] px-2.5 py-[3px] text-xs font-bold text-[#8A5A00]">Cancelled</span>
                      ) : tab === 'completed' ? (
                        <span className="rounded-full bg-mist px-2.5 py-[3px] text-xs font-bold text-ink-700">Completed</span>
                      ) : (
                        <span className="rounded-full bg-[#E3FAF6] px-2.5 py-[3px] text-xs font-bold text-[#0F7C70]">Confirmed</span>
                      )}
                      {over > 0 && <Pill tone="warn">{plural(over, 'room')} above limit</Pill>}
                      {isSample(b) && <Pill>Sample</Pill>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {b.lines.map((l, i) => (
                      <span key={i} className="tag">
                        {l.traveller} · {l.roomName}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-canvas p-3 text-sm sm:grid-cols-4">
                    <div>
                      <span className="text-ink-500">Booking ID</span>
                      <br />
                      <strong className="font-mono">{b.id}</strong>
                    </div>
                    <div>
                      <span className="text-ink-500">Cost centre</span>
                      <br />
                      <strong>{b.costCentre.split(' · ')[0]}</strong>
                    </div>
                    <div>
                      <span className="text-ink-500">Paid by</span>
                      <br />
                      <strong>{payLabel(b.pay)}</strong>
                    </div>
                    <div>
                      <span className="text-ink-500">Total incl. GST</span>
                      <br />
                      <strong>{inr(b.total)}</strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-500">
                    <span>
                      {b.purpose} · booked by {b.bookedBy}
                      {b.po && ` · PO ${b.po}`}
                    </span>
                    <span className="flex flex-wrap gap-3">
                      {tab === 'completed' && (
                        <Link to={`/biz/hotel/${b.hotelSlug}`} className="font-bold text-navy-800 no-underline">
                          Book again
                        </Link>
                      )}
                      {canCancel(b) && (
                        <button
                          type="button"
                          className="font-bold text-ember-600"
                          onClick={() => {
                            if (window.confirm(`Cancel ${b.id} at ${b.hotelName}? This is free until 6 pm the day before check-in.`)) {
                              cancelBizBooking(b.id)
                              setTick((t) => t + 1)
                            }
                          }}
                        >
                          Cancel trip
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </TripsShell>
  )
}

/* ---------------- Reports ---------------- */

export function BizReports() {
  const { company } = useAccount()
  const c = company!
  const list = useMemo(() => listBizBookings(c), [c])
  const live = list.filter((b) => b.status === 'confirmed')
  const spend = live.reduce((s, b) => s + b.total, 0)
  const nights = live.reduce((s, b) => s + roomNights(b), 0)
  const saved = live.reduce((s, b) => s + (b.publicTotal - (b.subtotal - b.teamDiscount)), 0)
  const overLines = live.flatMap((b) => b.lines.filter((l) => l.overLimit).map((l) => ({ b, l })))
  const avgRate = nights ? Math.round(live.reduce((s, b) => s + (b.subtotal - b.teamDiscount), 0) / nights) : 0

  const group = (key: (b: BizBooking) => string) => {
    const m = new Map<string, { spend: number; nights: number; trips: number }>()
    for (const b of live) {
      const k = key(b)
      const v = m.get(k) ?? { spend: 0, nights: 0, trips: 0 }
      v.spend += b.total
      v.nights += roomNights(b)
      v.trips += 1
      m.set(k, v)
    }
    return [...m.entries()].sort((a, b) => b[1].spend - a[1].spend)
  }
  const byCentre = group((b) => b.costCentre)
  const byCity = group((b) => b.hotelCity)
  const travellers = (() => {
    const m = new Map<string, { nights: number; spend: number }>()
    for (const b of live)
      for (const l of b.lines) {
        const v = m.get(l.traveller) ?? { nights: 0, spend: 0 }
        v.nights += b.nights
        v.spend += l.rate * b.nights
        m.set(l.traveller, v)
      }
    return [...m.entries()].sort((a, b) => b[1].spend - a[1].spend)
  })()
  const max = Math.max(1, ...byCentre.map(([, v]) => v.spend))

  const exportCsv = () =>
    downloadCsv(`${c.id}-trips-${todayISO()}.csv`, [
      ['Booking ID', 'Hotel', 'City', 'Check-in', 'Check-out', 'Room', 'Traveller', 'Rate per night', 'Above limit', 'Purpose', 'Cost centre', 'PO', 'Paid by', 'Booking total incl. GST', 'Status'],
      ...list.flatMap((b) =>
        b.lines.map((l) => [b.id, b.hotelName, b.hotelCity, b.checkIn, b.checkOut, l.roomName, l.traveller, l.rate, l.overLimit ? 'Yes' : 'No', b.purpose, b.costCentre, b.po, payLabel(b.pay), b.total, b.status]),
      ),
    ])

  return (
    <div className="container-page flex flex-col gap-6 pt-8 pb-16">
      <PageHead title="Travel reports" intro="Spending across all company trips. Cancelled trips are left out.">
        <button type="button" className="btn-outline" onClick={exportCsv}>
          <Download className="h-4 w-4" aria-hidden="true" /> Download CSV
        </button>
      </PageHead>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total spend" value={inr(spend)} note={`${plural(live.length, 'trip')} incl. GST`} />
        <StatCard label="Room-nights" value={nights.toLocaleString('en-IN')} note={`Average ${inr(avgRate)} per night before GST`} />
        <StatCard label="Saved vs public" value={<span className="text-leaf-700">{inr(saved)}</span>} note="Corporate, company and team rates" />
        <StatCard label="Above limit" value={plural(overLines.length, 'room')} note={`Limit ${inr(c.limitMetro)} metros · ${inr(c.limitOther)} others`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-lg font-extrabold text-navy-800">Spend by cost centre</h2>
          {byCentre.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-2 text-sm">
                <strong>{k}</strong>
                <span>
                  {inr(v.spend)} · {plural(v.nights, 'night')}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-mist">
                <div className="h-full rounded-full bg-navy-800" style={{ width: `${(v.spend / max) * 100}%` }} />
              </div>
            </div>
          ))}
          {byCentre.length === 0 && <p className="text-ink-500">No trips yet.</p>}
        </section>
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="text-lg font-extrabold text-navy-800">Spend by city</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12.5px] text-ink-500">
                <th className="py-1.5">City</th>
                <th className="py-1.5">Trips</th>
                <th className="py-1.5">Nights</th>
                <th className="py-1.5 text-right">Spend</th>
              </tr>
            </thead>
            <tbody>
              {byCity.map(([k, v]) => (
                <tr key={k} className="border-t border-[#EEF1F6]">
                  <td className="py-2 font-semibold">
                    {k} {isMetro(k) && <span className="text-xs font-normal text-ink-500">· metro</span>}
                  </td>
                  <td className="py-2">{v.trips}</td>
                  <td className="py-2">{v.nights}</td>
                  <td className="py-2 text-right">{inr(v.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="text-lg font-extrabold text-navy-800">Travellers</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12.5px] text-ink-500">
                <th className="py-1.5">Traveller</th>
                <th className="py-1.5">Nights</th>
                <th className="py-1.5 text-right">Room spend (before GST)</th>
              </tr>
            </thead>
            <tbody>
              {travellers.map(([k, v]) => (
                <tr key={k} className="border-t border-[#EEF1F6]">
                  <td className="py-2 font-semibold">{k}</td>
                  <td className="py-2">{v.nights}</td>
                  <td className="py-2 text-right">{inr(v.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="text-lg font-extrabold text-navy-800">Rooms above the company limit</h2>
          {overLines.length === 0 ? (
            <p className="rounded-xl bg-leaf-50 p-3 text-sm text-leaf-800">Every booked room is within the company limit.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[#EEF1F6] text-sm">
              {overLines.map(({ b, l }, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    <strong>{l.traveller}</strong> · {l.roomName}, {b.hotelName}
                  </span>
                  <span className="font-semibold text-[#9A3412]">
                    {inr(l.rate)} / night · {dayMonth(b.checkIn)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
