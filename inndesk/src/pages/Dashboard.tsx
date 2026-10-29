import { BedDouble, Building2, CalendarRange, ExternalLink, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Empty, KeyTag, Notice, Spinner } from '../components/ui'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { dayMonth, inr, plural, shortDate, todayISO } from '../lib/format'
import { useListings, useReservations, type ResvRow } from '../lib/hooks'
import { blockers, fromPrice, quality } from '../lib/listing'
import { settle } from '../lib/money'

function DeskColumn({ title, rows, empty }: { title: string; rows: ResvRow[]; empty: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="font-semibold text-pine-100">{title}</span>
        <span className="font-display text-3xl font-bold text-white">{rows.length}</span>
      </div>
      <ul className="flex flex-col gap-1 text-sm text-pine-100/90">
        {rows.slice(0, 3).map((r) => (
          <li key={r.id} className="truncate">
            {r.guest_name}, {r.room_name}
          </li>
        ))}
        {rows.length === 0 && <li className="text-pine-100/60">{empty}</li>}
        {rows.length > 3 && <li className="text-pine-100/60">and {rows.length - 3} more</li>}
      </ul>
    </div>
  )
}

export default function Dashboard() {
  const { owner } = useSession()
  const { data: listings, error } = useListings()
  const resv = useReservations(listings)
  if (!listings) return error ? <div className="container-page py-10"><Notice tone="error">{error}</Notice></div> : <Spinner />

  const t = todayISO()
  const live = resv.list.filter((r) => r.status === 'confirmed')
  const arrivals = live.filter((r) => r.check_in === t && r.desk !== 'no-show')
  const inHouse = resv.list.filter((r) => r.desk === 'in-house')
  const departures = live.filter((r) => r.check_out === t)
  const month = t.slice(0, 7)
  const thisMonth = live.filter((r) => r.check_in.slice(0, 7) === month)
  const nights = thisMonth.reduce((s, r) => s + r.nights * r.rooms, 0)
  const earned = thisMonth.reduce((s, r) => s + settle(r).earned, 0)
  const next = live.filter((r) => r.check_in > t).slice(0, 6)
  const first = owner?.fullName.split(' ')[0] ?? ''

  return (
    <div className="container-page flex flex-col gap-8 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-ink-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1 className="text-[32px] leading-tight font-bold text-pine-950">Hello, {first}</h1>
        </div>
        {listings.length > 0 && (
          <Link to="/app/properties/new/edit" className="btn-ghost">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add another property
          </Link>
        )}
      </div>

      {listings.length === 0 ? (
        <div className="panel overflow-hidden lg:grid lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-4 p-8">
            <h2 className="text-[28px] leading-tight font-bold text-pine-950">Add your first property</h2>
            <p className="text-ink-700">It takes about 20 minutes. Keep these ready:</p>
            <ul className="flex flex-col gap-2 text-[15px] text-ink-700">
              <li>Your address and PIN code</li>
              <li>Each room type with its price per night</li>
              <li>At least {site.minPhotos} clear photos, including a room</li>
              <li>Check-in time and cancellation terms</li>
            </ul>
            <Link to="/app/properties/new/edit" className="btn-brass mt-2 min-h-12 self-start px-6 text-base">
              Start listing
            </Link>
            <span className="text-sm text-ink-500">Your progress saves as you go. Come back any time.</span>
          </div>
          <img src="/img/hero-exterior.webp" alt="" className="hidden h-full w-full object-cover lg:block" />
        </div>
      ) : (
        <>
          {resv.offline && listings.some((l) => l.status !== 'draft') && (
            <Notice tone="warn">
              Can’t reach {site.marketplace} right now, so reservations may be out of date. Start the {site.marketplace} website at {site.mainSiteUrl}.
            </Notice>
          )}
          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <section aria-labelledby="desk-h" className="rounded-2xl bg-pine-900 p-6 text-white">
              <div className="flex items-center justify-between gap-3">
                <h2 id="desk-h" className="text-xl font-bold">
                  Today at the desk
                </h2>
                <Link to="/app/reservations" className="text-sm font-semibold text-brass-200 no-underline hover:text-white">
                  All reservations
                </Link>
              </div>
              <div className="mt-5 grid gap-6 sm:grid-cols-3">
                <DeskColumn title="Arriving" rows={arrivals} empty="No arrivals today" />
                <DeskColumn title="Staying" rows={inHouse} empty="Nobody in house" />
                <DeskColumn title="Leaving" rows={departures} empty="No departures today" />
              </div>
            </section>
            <section aria-labelledby="month-h" className="panel flex flex-col gap-4 p-6">
              <h2 id="month-h" className="text-xl font-bold text-pine-950">
                {new Date().toLocaleDateString('en-IN', { month: 'long' })} so far
              </h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-ink-500">Bookings</dt>
                  <dd className="font-display text-3xl font-bold">{thisMonth.length}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-500">Room nights</dt>
                  <dd className="font-display text-3xl font-bold">{nights}</dd>
                </div>
                <div className="col-span-2 border-t border-line pt-3">
                  <dt className="text-sm text-ink-500">Yours after commission</dt>
                  <dd className="font-display text-3xl font-bold text-live">{inr(earned)}</dd>
                </div>
              </dl>
              <Link to="/app/payouts" className="text-sm font-semibold text-pine-800">
                See payout statement
              </Link>
            </section>
          </div>

          <section aria-labelledby="props-h" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="props-h" className="text-xl font-bold text-pine-950">
                Your properties
              </h2>
              <Link to="/app/properties" className="text-sm font-semibold text-pine-800">
                Manage
              </Link>
            </div>
            <ul className="panel divide-y divide-line">
              {listings.map((l) => {
                const todo = blockers(l).length
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-4 p-4">
                    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-pine-50">
                      {l.photos[0] ? <img src={l.photos[0].url} alt="" className="h-full w-full object-cover" /> : <Building2 className="m-auto mt-4 h-7 w-7 text-pine-700" aria-hidden="true" />}
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <Link to={`/app/properties/${l.id}`} className="font-display text-lg font-bold text-ink-900 no-underline hover:text-pine-800">
                        {l.basics.name.trim() || 'Untitled property'}
                      </Link>
                      <span className="block text-sm text-ink-500">
                        {[l.location.area, l.location.city].filter(Boolean).join(', ') || 'Location not set'}
                        {fromPrice(l) ? `, from ${inr(fromPrice(l))}` : ''}
                      </span>
                    </div>
                    <KeyTag status={l.status} />
                    <span className="w-full text-sm text-ink-700 sm:w-auto">
                      {l.status === 'draft' ? (todo ? `${plural(todo, 'item')} left before publishing` : 'Ready to publish') : `Quality ${quality(l)}%`}
                    </span>
                    <Link to={l.status === 'draft' ? `/app/properties/${l.id}/edit?step=${todo ? blockers(l)[0].step : 'review'}` : `/app/properties/${l.id}`} className="btn-ghost min-h-10 text-sm">
                      {l.status === 'draft' ? 'Continue' : 'Open'}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          <section aria-labelledby="next-h" className="flex flex-col gap-3">
            <h2 id="next-h" className="text-xl font-bold text-pine-950">
              Coming up
            </h2>
            {next.length === 0 ? (
              <div className="panel">
                <Empty icon={<BedDouble className="h-7 w-7" />} title="No upcoming reservations">
                  <p className="max-w-sm text-ink-500">Bookings made on {site.marketplace} appear here and under Reservations.</p>
                  <Link to="/app/calendar" className="btn-ghost">
                    <CalendarRange className="h-4 w-4" aria-hidden="true" /> Check rates and availability
                  </Link>
                </Empty>
              </div>
            ) : (
              <div className="panel overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-line text-sm text-ink-500">
                      <th className="px-4 py-3 font-semibold">Guest</th>
                      <th className="px-4 py-3 font-semibold">Stay</th>
                      <th className="px-4 py-3 font-semibold">Room</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {next.map((r) => (
                      <tr key={r.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-semibold">{r.guest_name}</td>
                        <td className="px-4 py-3">
                          {shortDate(r.check_in)} to {dayMonth(r.check_out)}
                        </td>
                        <td className="px-4 py-3">
                          {r.rooms} × {r.room_name}
                        </td>
                        <td className="px-4 py-3 text-right">{inr(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {listings.some((l) => l.status === 'live') && (
            <a href={site.mainSiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-pine-800">
              Open {site.marketplace} <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </>
      )}
    </div>
  )
}
