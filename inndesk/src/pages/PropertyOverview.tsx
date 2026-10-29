import { ArrowLeft, CalendarRange, ExternalLink, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { KeyTag, Modal, Notice, Spinner } from '../components/ui'
import { site } from '../config/site'
import { cancellationOptions } from '../data/options'
import { dayMonth, inr, plural } from '../lib/format'
import { useListings, useReservations } from '../lib/hooks'
import { fromPrice, quality, steps, tips, totalRooms } from '../lib/listing'
import { deleteListing, retrySync, setListingStatus } from '../lib/store'

export default function PropertyOverview() {
  const { id = '' } = useParams()
  const { data } = useListings()
  const l = data?.find((x) => x.id === id)
  const resv = useReservations(l ? [l] : [])
  const navigate = useNavigate()
  const [busy, setBusy] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!data) return <Spinner />
  if (!l)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold">Property not found</h1>
        <Link to="/app/properties" className="btn-primary mt-6">
          Back to properties
        </Link>
      </div>
    )
  if (l.status === 'draft') return <Navigate to={`/app/properties/${l.id}/edit`} replace />

  const url = `${site.mainSiteUrl}/hotel/${l.slug}`
  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label)
    try {
      await fn()
    } finally {
      setBusy('')
    }
  }
  const upcoming = resv.list.filter((r) => r.desk === 'upcoming' || r.desk === 'in-house')
  const t = tips(l)
  const facts = [
    ['Room types', `${l.rooms.length} (${plural(totalRooms(l), 'room')} in total)`],
    ['Price from', `${inr(fromPrice(l))} a night`],
    ['Photos', String(l.photos.length)],
    ['Check-in / out', `${l.policies.checkIn} / ${l.policies.checkOut}`],
    ['Cancellation', cancellationOptions.find((c) => c.id === l.policies.cancellation)!.short],
    ['Live since', l.publishedAt ? dayMonth(l.publishedAt.slice(0, 10)) : '—'],
  ]

  return (
    <div className="container-page flex flex-col gap-6 pt-6">
      <Link to="/app/properties" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-pine-800 no-underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Properties
      </Link>

      <div className="panel overflow-hidden lg:grid lg:grid-cols-[1.2fr_1fr]">
        <div className="relative aspect-[16/9] bg-pine-50 lg:aspect-auto lg:min-h-[300px]">{l.photos[0] && <img src={l.photos[0].url} alt={`${l.basics.name} cover`} className="absolute inset-0 h-full w-full object-cover" />}</div>
        <div className="flex flex-col gap-4 p-6">
          <KeyTag status={l.status} label={l.status === 'live' ? `Live on ${site.marketplace}` : 'Paused, hidden from guests'} />
          <div>
            <h1 className="text-[30px] leading-tight font-bold text-pine-950">{l.basics.name}</h1>
            <p className="text-ink-500">
              {l.basics.propertyType} in {l.location.area}, {l.location.city}
            </p>
          </div>
          {l.sync && !l.sync.ok && (
            <Notice tone="warn">
              <strong className="block">Last change didn’t reach {site.marketplace}</strong>
              {l.sync.message}
              <button type="button" onClick={() => run('sync', () => retrySync(l))} disabled={!!busy} className="mt-2 block font-bold text-pine-900 underline">
                {busy === 'sync' ? 'Retrying…' : 'Retry'}
              </button>
            </Notice>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="btn-brass">
              View on {site.marketplace} <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link to={`/app/properties/${l.id}/edit?step=basics`} className="btn-ghost">
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit listing
            </Link>
            {l.status === 'live' ? (
              <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => run('pause', () => setListingStatus(l, 'paused'))}>
                <Pause className="h-4 w-4" aria-hidden="true" /> {busy === 'pause' ? 'Pausing…' : 'Pause bookings'}
              </button>
            ) : (
              <button type="button" className="btn-primary" disabled={!!busy} onClick={() => run('resume', () => setListingStatus(l, 'live'))}>
                <Play className="h-4 w-4" aria-hidden="true" /> {busy === 'resume' ? 'Switching on…' : 'Take bookings again'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="sec-h" className="panel p-5">
          <h2 id="sec-h" className="text-xl font-bold text-pine-950">
            Listing sections
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {steps
              .filter((s) => s.id !== 'review')
              .map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-semibold">{s.label}</span>
                  <Link to={`/app/properties/${l.id}/edit?step=${s.id}`} className="rounded-lg px-2 py-1 text-sm font-bold text-pine-800 hover:bg-pine-50">
                    Edit
                  </Link>
                </li>
              ))}
          </ul>
        </section>
        <section aria-labelledby="facts-h" className="panel p-5">
          <h2 id="facts-h" className="text-xl font-bold text-pine-950">
            At a glance
          </h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-500">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <span className="text-sm text-ink-700">Listing quality {quality(l)}%</span>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brass-500" style={{ width: `${quality(l)}%` }} />
            </div>
          </div>
        </section>
      </div>

      {t.length > 0 && (
        <section aria-labelledby="tips-h" className="panel p-5">
          <h2 id="tips-h" className="text-xl font-bold text-pine-950">
            Ways to get more bookings
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {t.map((c) => (
              <li key={c.message} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                {c.message}
                <Link to={`/app/properties/${l.id}/edit?step=${c.step}`} className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-pine-800 hover:bg-pine-50">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="up-h" className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="up-h" className="text-xl font-bold text-pine-950">
            Upcoming and in-house
          </h2>
          <Link to={`/app/calendar?property=${l.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-pine-800">
            <CalendarRange className="h-4 w-4" aria-hidden="true" /> Rates and availability
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-ink-500">{resv.offline ? `Can’t reach ${site.marketplace} to load reservations.` : 'No reservations yet.'}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {upcoming.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2.5 text-[15px]">
                <span>
                  <strong>{r.guest_name}</strong>, {r.rooms} × {r.room_name}
                </span>
                <span className="text-ink-700">
                  {dayMonth(r.check_in)} to {dayMonth(r.check_out)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="border-t border-line pt-5">
        <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-alert hover:bg-alert-50">
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove this property
        </button>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Remove ${l.basics.name}?`}>
        <p className="text-ink-700">It disappears from {site.marketplace} straight away. Reservations already made stay valid and still need to be honoured.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)}>
            Keep it
          </button>
          <button
            type="button"
            className="btn bg-alert text-white hover:bg-[#8f1e18]"
            disabled={!!busy}
            onClick={() =>
              run('delete', async () => {
                await deleteListing(l)
                navigate('/app/properties', { replace: true })
              })
            }
          >
            {busy === 'delete' ? 'Removing…' : 'Remove property'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
