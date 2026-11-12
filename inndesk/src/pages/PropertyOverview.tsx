import { ArrowLeft, BedDouble, Building2, CalendarRange, Camera, Check, ExternalLink, Landmark, MapPin, Pause, Play, ScrollText, Trash2, UtensilsCrossed, Wifi, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { KeyTag, Modal, Notice, Spinner } from '../components/ui'
import { site } from '../config/site'
import { amenityGroups, cancellationOptions } from '../data/options'
import { dayMonth, inr, plural } from '../lib/format'
import { useListings, useReservations } from '../lib/hooks'
import { bedSummary, fromPrice, guestRules, tips, totalRooms } from '../lib/listing'
import type { Listing } from '../lib/types'
import { contentScore } from '../lib/score'
import { deleteListing, retrySync, setListingStatus } from '../lib/store'

/** Where each tip's fix lives in Property Information. */
const tipPage: Record<string, string> = { basics: 'basics', location: 'basics', amenities: 'amenities', rooms: 'rooms', photos: 'photos', policies: 'policies', legal: 'finance' }

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
  const base = `/app/properties/${l.id}`
  const score = contentScore(l)
  const facts = [
    ['Room types', `${l.rooms.length} (${plural(totalRooms(l), 'room')} in total)`],
    ['Price from', `${inr(fromPrice(l))} a night`],
    ['Photos', String(l.photos.length)],
    ['Check-in / out', `${l.policies.checkIn} / ${l.policies.checkOut}`],
    ['Cancellation', cancellationOptions.find((c) => c.id === l.policies.cancellation)?.short ?? 'Not set'],
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

      <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <PropertyDetails l={l} />
        <aside className="flex flex-col gap-5 lg:sticky lg:top-20">
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
            <Link to={`${base}/info/content-score`} className="mt-4 block no-underline">
              <span className="flex justify-between text-sm text-ink-700">
                Content score <strong className="text-ink-900">{score}/100</strong>
              </span>
              <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full bg-pine-800" style={{ width: `${score}%` }} />
              </span>
            </Link>
          </section>

          {t.length > 0 && (
            <section aria-labelledby="tips-h" className="panel p-5">
              <h2 id="tips-h" className="text-xl font-bold text-pine-950">
                Ways to get more bookings
              </h2>
              <ul className="mt-3 divide-y divide-line">
                {t.map((c) => (
                  <li key={c.message} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                    {c.message}
                    <Link to={`${base}/info/${tipPage[c.step] ?? 'basics'}`} className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-pine-800 hover:bg-pine-50">
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

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

/* ---------------- read-only property details (changes are made in Property Information) ---------------- */

function Block({ id, icon, title, count, children }: { id: string; icon: ReactNode; title: string; count?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`pd-${id}`} className="border-t border-line px-5 py-5 first:border-t-0">
      <h3 id={`pd-${id}`} className="flex items-center gap-2.5 text-[17px] font-semibold text-ink-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine-50 text-pine-800">{icon}</span>
        {title}
        {count && <span className="text-[13.5px] font-normal text-ink-500">{count}</span>}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Label/value pairs; empty values are left out. */
function Facts({ rows }: { rows: [string, ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
  if (!shown.length) return <p className="text-[14.5px] text-ink-500">Not added yet.</p>
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
      {shown.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[13px] text-ink-500">{k}</dt>
          <dd className="mt-0.5 text-[15px] font-medium break-words text-ink-900">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

const YesNo = ({ on, yes, no }: { on: boolean; yes: string; no: string }) => (
  <li className="flex items-center gap-2 text-[14.5px] text-ink-900">
    {on ? <Check className="h-4 w-4 shrink-0 text-live" aria-hidden="true" /> : <X className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />}
    {on ? yes : no}
  </li>
)

const mask = (v: string, keep = 4) => (v ? `${'•'.repeat(Math.max(0, v.length - keep))}${v.slice(-keep)}` : '')

function PropertyDetails({ l }: { l: Listing }) {
  const b = l.basics
  const loc = l.location
  const p = l.policies
  const lg = l.legal
  const a = loc.access ?? {}
  const groups = amenityGroups.map((g) => ({ group: g.group, items: g.items.filter((i) => l.amenities.includes(i.id)) })).filter((g) => g.items.length)
  const restaurants = l.restaurants ?? []
  const inclusions = (l.inclusions ?? []).filter((i) => i.active && (!i.to || i.to >= new Date().toISOString().slice(0, 10)))
  const roomName = (id: string) => l.rooms.find((r) => r.id === id)?.name
  const photos = l.photos.slice(0, 8)
  const cancel = cancellationOptions.find((c) => c.id === p.cancellation)?.label ?? 'Not set'

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-xl font-bold text-pine-950">Property details</h2>
        <p className="mt-0.5 text-[14px] text-ink-500">What guests see on {site.marketplace}. To change anything, go to Property Information in the menu.</p>
      </div>

      <Block id="basics" icon={<Building2 className="h-[18px] w-[18px]" aria-hidden="true" />} title="Basic information">
        <Facts
          rows={[
            ['Property name', b.name],
            ['Name shown to guests', b.displayName && b.displayName !== b.name ? b.displayName : ''],
            ['Property type', b.propertyType],
            ['Star rating', b.stars ? `${b.stars} star` : 'Not rated'],
            ['Chain / brand', b.chain],
            ['Built in', b.yearBuilt ? String(b.yearBuilt) : ''],
            ['Taking bookings since', b.bookingSince ? String(b.bookingSince) : ''],
            ['Floors', b.floors ? String(b.floors) : ''],
            ['Phone', b.phoneVerified || b.phone],
            ['Email', b.emailVerified || b.email],
            ['WhatsApp', b.whatsappSame === false ? b.whatsapp : b.phoneVerified || b.phone],
            ['Customer care', b.customerCare],
          ]}
        />
        {b.description.trim() && <p className="mt-4 text-[14.5px] leading-relaxed whitespace-pre-line text-ink-700">{b.description.trim()}</p>}
        {b.highlights.filter(Boolean).length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {b.highlights.filter(Boolean).map((h) => (
              <li key={h} className="rounded-full bg-pine-50 px-3 py-1 text-[13.5px] font-medium text-pine-800">
                {h}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block id="location" icon={<MapPin className="h-[18px] w-[18px]" aria-hidden="true" />} title="Location">
        <Facts
          rows={[
            ['Address', [loc.address, loc.area].filter(Boolean).join(', ')],
            ['City', loc.city],
            ['State', loc.state],
            ['PIN code', loc.pincode],
            ['Vehicle to the entrance', a.toEntrance === 'yes' ? (a.vehicles === 'selected' && a.types?.length ? a.types.join(', ') : 'All vehicles') : a.toEntrance === 'no' ? `No${a.dropOffMetres ? `, drop-off ${a.dropOffMetres} m away` : ''}` : ''],
          ]}
        />
        {loc.landmarks.filter((x) => x.name).length > 0 && (
          <div className="mt-4">
            <h4 className="text-[13px] text-ink-500">Nearby</h4>
            <ul className="mt-1.5 divide-y divide-line rounded-lg border border-line">
              {loc.landmarks
                .filter((x) => x.name)
                .map((x) => (
                  <li key={x.name} className="flex justify-between gap-3 px-3 py-2 text-[14.5px]">
                    <span className="text-ink-900">{x.name}</span>
                    <span className="shrink-0 text-ink-500">{x.distance}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
        {loc.directions?.trim() && (
          <div className="mt-4">
            <h4 className="text-[13px] text-ink-500">Directions for guests</h4>
            <p className="mt-1 text-[14.5px] leading-relaxed whitespace-pre-line text-ink-700">{loc.directions.trim()}</p>
          </div>
        )}
      </Block>

      <Block id="amenities" icon={<Wifi className="h-[18px] w-[18px]" aria-hidden="true" />} title="Amenities" count={`(${l.amenities.length})`}>
        {groups.length === 0 ? (
          <p className="text-[14.5px] text-ink-500">No amenities ticked yet.</p>
        ) : (
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {groups.map((g) => (
              <div key={g.group}>
                <h4 className="text-[13.5px] font-semibold text-ink-900">{g.group}</h4>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {g.items.map((i) => (
                    <li key={i.id} className="flex items-start gap-2 text-[14.5px] text-ink-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-pine-800" aria-hidden="true" />
                      {i.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Block>

      <Block id="rooms" icon={<BedDouble className="h-[18px] w-[18px]" aria-hidden="true" />} title="Rooms" count={`(${l.rooms.length} types, ${plural(totalRooms(l), 'room')})`}>
        <ul className="flex flex-col gap-3">
          {l.rooms.map((r) => {
            const photo = l.photos.find((x) => x.id === r.photoId)
            return (
              <li key={r.id} className="flex gap-3 rounded-lg border border-line p-3">
                <div className="flex h-[72px] w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-pine-50 text-pine-100">{photo ? <img src={photo.url} alt="" className="h-full w-full object-cover" /> : <BedDouble className="h-7 w-7" aria-hidden="true" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <strong className="text-[15px] font-semibold text-ink-900">
                      {r.name}
                      {r.inactive && <span className="ml-2 rounded bg-line px-1.5 py-0.5 text-[11.5px] font-medium text-ink-700">Inactive</span>}
                    </strong>
                    <span className="text-[15px] font-semibold text-ink-900">
                      {inr(r.price)} <span className="text-[12.5px] font-normal text-ink-500">/ night</span>
                    </span>
                  </div>
                  <p className="mt-1 text-[13.5px] text-ink-500">
                    {[bedSummary(r), r.size ? `${r.size} ${r.sizeUnit === 'sqm' ? 'sq m' : 'sq ft'}` : r.sizeSqft ? `${r.sizeSqft} sq ft` : '', r.view, `Up to ${plural(r.occupancy?.maxOccupancy ?? r.maxGuests, 'guest')}`, plural(r.count, 'room')].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-ink-700">{r.mealPlan ?? (r.breakfast ? 'FREE Breakfast' : 'Accommodation only')}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </Block>

      {(restaurants.length > 0 || inclusions.length > 0) && (
        <Block id="food" icon={<UtensilsCrossed className="h-[18px] w-[18px]" aria-hidden="true" />} title="Restaurants & inclusions">
          {restaurants.length > 0 && (
            <ul className="flex flex-col gap-2">
              {restaurants.map((r) => (
                <li key={r.id} className="rounded-lg border border-line px-3 py-2.5">
                  <strong className="text-[15px] font-semibold text-ink-900">{r.name}</strong>
                  <p className="mt-0.5 text-[13.5px] text-ink-500">{[r.food === 'veg' ? 'Pure veg' : r.food === 'nonveg' ? 'Non-veg' : 'Veg & non-veg', r.cuisines.join(', '), `${r.open} – ${r.close}`, r.meals.join(', ')].filter(Boolean).join(' · ')}</p>
                </li>
              ))}
            </ul>
          )}
          {inclusions.length > 0 && (
            <ul className={`flex flex-col gap-1.5 ${restaurants.length ? 'mt-4' : ''}`}>
              {inclusions.map((i) => (
                <li key={i.id} className="flex items-start gap-2 text-[14.5px] text-ink-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-pine-800" aria-hidden="true" />
                  <span>
                    {i.kind}
                    {i.detail && ` (${i.detail})`}
                    <span className="text-ink-500"> · {i.roomIds.length ? i.roomIds.map(roomName).filter(Boolean).join(', ') : 'All rooms'}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>
      )}

      <Block id="photos" icon={<Camera className="h-[18px] w-[18px]" aria-hidden="true" />} title="Photos" count={`(${l.photos.length})`}>
        {photos.length === 0 ? (
          <p className="text-[14.5px] text-ink-500">No photos yet.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((ph, i) => (
              <li key={ph.id} className="relative aspect-[4/3] overflow-hidden rounded-md bg-pine-50">
                <img src={ph.url} alt={ph.tag} className="h-full w-full object-cover" loading="lazy" />
                {i === photos.length - 1 && l.photos.length > photos.length && <span className="absolute inset-0 flex items-center justify-center bg-ink-900/55 text-[15px] font-semibold text-white">+{l.photos.length - photos.length}</span>}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block id="policies" icon={<ScrollText className="h-[18px] w-[18px]" aria-hidden="true" />} title="Policies">
        <Facts
          rows={[
            ['Check-in', p.checkIn],
            ['Check-out', p.checkOut],
            ['Cancellation', cancel],
            ['Children stay free up to', `${p.childrenFreeAge} years`],
            ['Extra bed', p.extraBed > 0 ? `${inr(p.extraBed)} a night` : 'Not available'],
          ]}
        />
        <ul className="mt-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          <YesNo on={p.payAtHotel} yes="Pay at hotel allowed" no="No pay at hotel" />
          <YesNo on={p.coupleFriendly} yes="Couple friendly" no="Not couple friendly" />
          <YesNo on={p.localIds} yes="Local IDs accepted" no="Local IDs not accepted" />
          <YesNo on={p.pets} yes="Pets allowed" no="No pets" />
          <YesNo on={p.smoking} yes="Smoking in designated areas" no="No smoking" />
        </ul>
        {guestRules(l).length > 0 && (
          <div className="mt-4">
            <h4 className="text-[13px] text-ink-500">House rules guests see</h4>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[14.5px] text-ink-700 marker:text-ink-400">
              {guestRules(l).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </Block>

      <Block id="legal" icon={<Landmark className="h-[18px] w-[18px]" aria-hidden="true" />} title="Finance & legal">
        <Facts
          rows={[
            ['Legal name', lg.legalName],
            ['GSTIN', lg.gstin || 'Not added'],
            ['PAN', mask(lg.pan)],
            ['Payout account name', lg.payoutName],
            ['Bank', lg.bankName],
            ['Account number', lg.accountLast4 ? `•••• ${lg.accountLast4}` : ''],
            ['IFSC', lg.ifsc],
            ['Ownership proof', lg.ownershipDoc ? 'Uploaded' : 'Not uploaded'],
          ]}
        />
      </Block>
    </div>
  )
}
