import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Coffee, FileText, Heart, MapPin, Presentation, Clock, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DatePopoverField from '../../components/DatePopoverField'
import HotelArt from '../../components/HotelArt'
import { amenityMeta, RatingBadge, Spinner } from '../../components/ui'
import { useAccount } from '../../context/AccountContext'
import { bizCategories, bizRules, cityLimit, inCategory, priceBizBooking, ratePlans, roomsFree, slabFor, womenFriendly } from '../../data/business'
import { useAuth } from '../../context/AuthContext'
import { getShortlist, toggleShortlist } from '../../lib/bizApi'
import { brandLabel } from '../../data/hotels'
import type { Hotel } from '../../data/types'
import { getHotel } from '../../lib/api'
import { dayMonth, inr, nightsBetween, plural } from '../../lib/format'
import { bizQuery, LimitChip, Pill, readBizSearch } from './shared'

const photoLabel = (src: string) => {
  const k = src.split('/').pop()!.split('-')[0]
  return { exterior: 'Exterior', room: 'Room', bath: 'Bathroom', dining: 'Dining', banquet: 'Meeting / banquet hall', lobby: 'Lobby' }[k] ?? 'Photo'
}

/** Fill the requested number of rooms, cheapest type first. */
function initialQty(h: Hotel, rooms: number) {
  const q: Record<string, number> = {}
  let left = rooms
  h.rooms.forEach((r, i) => {
    const n = Math.min(left, roomsFree(h, i))
    q[r.id] = n
    left -= n
  })
  return q
}

export default function BizHotel() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const s = readBizSearch(params)
  const { company } = useAccount()
  const { user } = useAuth()
  const c = company!
  const email = user?.email ?? ''
  const [saved, setSaved] = useState(() => getShortlist(c, email).some((x) => x.slug === slug))
  const navigate = useNavigate()
  const [hotel, setHotel] = useState<Hotel | null | undefined>(undefined)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [viewer, setViewer] = useState<number | null>(null)
  const [quoteSent, setQuoteSent] = useState(false)

  useEffect(() => {
    getHotel(slug).then((h) => {
      setHotel(h)
      if (h) setQty(initialQty(h, s.rooms))
    })
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const nights = nightsBetween(s.checkIn, s.checkOut)
  const price = useMemo(() => (hotel ? priceBizBooking(c, hotel, qty, nights) : null), [c, hotel, qty, nights])

  useEffect(() => {
    if (viewer === null || !hotel?.photos) return
    const n = hotel.photos.length
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewer(null)
      if (e.key === 'ArrowRight') setViewer((v) => ((v ?? 0) + 1) % n)
      if (e.key === 'ArrowLeft') setViewer((v) => ((v ?? 0) - 1 + n) % n)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [viewer, hotel])

  if (hotel === undefined) return <Spinner label="Loading hotel" />
  if (!hotel || !price)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-extrabold text-navy-800">Hotel not found</h1>
        <Link to="/biz/hotels" className="btn-navy mt-6">
          Back to business hotels
        </Link>
      </div>
    )

  const h = hotel
  const limit = cityLimit(c, h.city)
  const cheapest = h.rooms[0]
  const plans = ratePlans(c, h, cheapest)
  const slab = price.count > 0 ? price.slab : slabFor(s.rooms)
  const photos = h.photos ?? []
  const short = c.name.split(' ')[0]
  const setN = (id: string, i: number, d: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(roomsFree(h, i), (q[id] ?? 0) + d)) }))
  const qParam = Object.entries(qty)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${id}:${n}`)
    .join(',')
  const goCheckout = () =>
    navigate(`/biz/checkout?${bizQuery({ ...s, city: h.city, rooms: price.count }, { hotel: h.slug, q: qParam, for: price.count > 1 && s.bookingFor === 'Myself' ? 'My team' : s.bookingFor })}`)

  const tierCls = (on: boolean) => `rounded-lg px-1 py-1.5 ${on ? 'bg-white text-navy-800 shadow-[0_1px_2px_rgba(20,48,107,0.15)]' : 'text-ink-500'}`

  return (
    <div className="container-page pt-5 pb-28 lg:pb-16">
      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-500">
        <Link to="/biz" className="no-underline">
          Business home
        </Link>{' '}
        ›{' '}
        <Link to={`/biz/hotels?${bizQuery({ ...s, city: h.city })}`} className="no-underline">
          Hotels in {h.city}
        </Link>{' '}
        › {h.name}
      </nav>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Pill tone="navy">{brandLabel(h.brand)}</Pill>
            {plans.negotiated && <Pill tone="solid">{short} rate</Pill>}
            <Pill>GST invoice</Pill>
            {bizCategories
              .filter((x) => x.id !== 'team' && inCategory(x.id, h))
              .slice(0, 2)
              .map((x) => (
                <Pill key={x.id}>{x.title.replace(' hotels', '')}</Pill>
              ))}
            {womenFriendly(h) && <span className="rounded-full bg-[#FDECF4] px-2.5 py-[3px] text-xs font-bold text-[#A3125E]">Women-friendly</span>}
          </div>
          <h1 className="text-[28px] leading-tight font-extrabold text-navy-800 sm:text-[32px]">{h.name}</h1>
          <span className="flex items-center gap-1 text-ink-500">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {h.area}, {h.city} · {h.distance}
          </span>
        </div>
        <div className="flex items-start gap-3 text-right">
          <button
            type="button"
            aria-pressed={saved}
            onClick={() => setSaved(toggleShortlist(c, email, h.slug).some((x) => x.slug === h.slug))}
            className={`flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold ${saved ? 'border-[#FF5A5F] bg-[#FFF1F1] text-[#D92D3A]' : 'border-line-strong bg-white text-ink-700'}`}
          >
            <Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} aria-hidden="true" /> {saved ? 'Shortlisted' : 'Shortlist'}
          </button>
          <div>
            <RatingBadge rating={h.rating} size="lg" />
            <div className="mt-1 text-xs text-ink-500">{h.reviews.toLocaleString('en-IN')} ratings</div>
          </div>
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="mt-5 grid h-[260px] grid-cols-2 gap-2 overflow-hidden rounded-2xl sm:h-[360px] sm:grid-cols-4 sm:grid-rows-2">
          {photos.slice(0, 5).map((p, i) => (
            <button
              key={p + i}
              type="button"
              onClick={() => setViewer(i)}
              aria-label={`Open photo: ${photoLabel(p)}`}
              className={`group relative overflow-hidden ${i === 0 ? 'col-span-2 row-span-2' : i > 2 ? 'hidden sm:block' : ''}`}
            >
              <img src={p} alt={`${h.name} – ${photoLabel(p)}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-ink-700">{photoLabel(p)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5 h-[260px] overflow-hidden rounded-2xl">
          <HotelArt hue={h.hue} />
        </div>
      )}

      <div className="card mt-4 flex flex-wrap items-end gap-3 p-3">
        <DatePopoverField
          align="left"
          className="min-w-[280px] flex-1 rounded-xl border border-line-strong sm:max-w-[420px]"
          checkIn={s.checkIn}
          checkOut={s.checkOut}
          onChange={(checkIn, checkOut) => setParams(bizQuery({ ...s, checkIn, checkOut }), { replace: true })}
        />
        <span className="pb-3 text-sm font-semibold text-ink-700">
          {plural(nights, 'night')} · company limit here {inr(limit)} / night
        </span>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="rates-h" className="card flex flex-col gap-4 p-5 sm:p-6">
            <div>
              <h2 id="rates-h" className="text-xl font-extrabold text-navy-800">
                How your price is worked out
              </h2>
              <p className="text-sm text-ink-500">{cheapest.name}, per night. Each line is a separate rate plan on the same room.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="flex flex-col gap-0.5 rounded-xl border border-line p-3">
                <span className="text-xs font-bold text-ink-500">PUBLIC RATE</span>
                <strong className="text-lg text-ink-500 line-through">{inr(plans.pub)}</strong>
                <span className="text-xs text-ink-500">Customer site</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl border border-line p-3">
                <span className="text-xs font-bold text-ink-500">CORPORATE</span>
                <strong className="text-lg">{inr(plans.corporate)}</strong>
                <span className="text-xs text-ink-500">{bizRules.corporateOff * 100}% off · all companies</span>
              </div>
              <div className={`flex flex-col gap-0.5 rounded-xl p-3 ${plans.negotiated ? 'border-2 border-navy-800 bg-navy-50 p-[11px]' : 'border border-dashed border-line-strong'}`}>
                <span className="text-xs font-bold text-navy-800">{short.toUpperCase()} RATE</span>
                <strong className="text-lg">{plans.negotiated ? inr(plans.company) : '—'}</strong>
                <span className="text-xs text-ink-500">{plans.negotiated ? 'Negotiated for your company' : 'No company deal here yet'}</span>
              </div>
              <div className={`flex flex-col gap-0.5 rounded-xl p-3 ${slab === 'team' ? 'border-2 border-leaf-700 bg-leaf-50 p-[11px]' : 'border border-dashed border-[#BFE3C9]'}`}>
                <span className="text-xs font-bold text-leaf-700">
                  TEAM SLAB {bizRules.teamFrom}–{bizRules.quoteFrom - 1} ROOMS
                </span>
                <strong className="text-lg">{inr(plans.team)}</strong>
                <span className="text-xs text-ink-500">{slab === 'team' ? `Applied to your ${price.count} rooms` : `Extra ${bizRules.teamOff * 100}% from ${bizRules.teamFrom} rooms`}</span>
              </div>
            </div>
          </section>

          <section aria-labelledby="rooms-h" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id="rooms-h" className="text-xl font-extrabold text-navy-800">
                Choose rooms {price.count > 1 || s.rooms > 1 ? 'for your team' : ''}
              </h2>
              <span className="text-sm text-ink-500">Pick a number of each type. You add the travellers at the next step.</span>
            </div>
            {h.rooms.map((r, i) => {
              const rp = ratePlans(c, h, r)
              const now = slab === 'team' ? rp.team : rp.company
              const free = roomsFree(h, i)
              const n = qty[r.id] ?? 0
              return (
                <article key={r.id} className={`card flex flex-col overflow-hidden sm:flex-row ${n > 0 ? 'ring-2 ring-navy-800' : ''}`}>
                  <div className="relative aspect-[16/10] sm:aspect-auto sm:w-[220px] sm:shrink-0">
                    <HotelArt hue={r.hue} kind="room" photo={r.photo} label={r.name} />
                    <span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-0.5 text-xs text-ink-700">{r.size}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-bold">{r.name}</h3>
                      <LimitChip over={now > limit} amount={now > limit ? inr(now - limit) : undefined} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.features.map((f) => (
                        <span key={f} className="tag">
                          {f}
                        </span>
                      ))}
                      <span className="tag">Up to {r.maxGuests} guests</span>
                    </div>
                    <span className={`text-[13px] font-semibold ${free < 3 ? 'text-ember-600' : 'text-ink-500'}`}>{free} rooms free on your dates</span>
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-[#EEF1F6] pt-2.5">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <strong className="text-[22px]">{inr(now)}</strong>
                          <span className="text-sm text-ink-500 line-through">{inr(rp.pub)}</span>
                        </div>
                        <span className="text-xs text-ink-500">per room per night + GST</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button type="button" aria-label={`One fewer ${r.name}`} disabled={n <= 0} onClick={() => setN(r.id, i, -1)} className="h-11 w-11 rounded-full border border-line-strong text-lg font-bold text-navy-800 disabled:opacity-40">
                          −
                        </button>
                        <strong className="min-w-[64px] text-center" aria-live="polite">
                          {plural(n, 'room')}
                        </strong>
                        <button type="button" aria-label={`One more ${r.name}`} disabled={n >= free} onClick={() => setN(r.id, i, 1)} className="h-11 w-11 rounded-full border border-line-strong text-lg font-bold text-navy-800 disabled:opacity-40">
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>

          <section aria-labelledby="biz-h" className="flex flex-col gap-3">
            <h2 id="biz-h" className="text-xl font-extrabold text-navy-800">
              For business guests
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                inCategory('meetings', h)
                  ? { Icon: Presentation, t: 'Meeting or banquet hall', d: 'Projector and whiteboard, book with rooms' }
                  : { Icon: Coffee, t: h.freeBreakfast ? 'Breakfast included' : 'Work desk and Wi-Fi', d: 'Start the day ready for work' },
                { Icon: Clock, t: 'Early check-in from 10 am', d: 'On request, free for corporate bookings' },
                { Icon: FileText, t: 'One GST invoice', d: `All rooms on one bill to ${c.name}` },
              ].map(({ Icon, t, d }) => (
                <div key={t} className="card flex flex-col gap-1 p-4">
                  <Icon className="h-5 w-5 text-navy-800" aria-hidden="true" />
                  <strong>{t}</strong>
                  <span className="text-[13px] text-ink-500">{d}</span>
                </div>
              ))}
            </div>
            <div className="card flex flex-wrap gap-x-6 gap-y-3 p-5">
              {h.amenities.map((a) => {
                const { label, Icon } = amenityMeta[a]
                return (
                  <span key={a} className="flex items-center gap-2 text-sm text-ink-700">
                    <Icon className="h-[18px] w-[18px] text-navy-800" aria-hidden="true" /> {label}
                  </span>
                )
              })}
            </div>
          </section>
        </div>

        <aside aria-label="Booking summary" className="card flex flex-col gap-4 p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold text-navy-800">{price.count > 1 ? 'Your team booking' : 'Your booking'}</h2>
          <span className="text-sm text-ink-500">
            {dayMonth(s.checkIn)} – {dayMonth(s.checkOut)} · {plural(nights, 'night')}
          </span>
          <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-[#EEF1F6] p-1 text-center text-xs font-bold">
            <span className={tierCls(slab === 'base')}>1–{bizRules.teamFrom - 1} rooms</span>
            <span className={tierCls(slab === 'team')}>
              {bizRules.teamFrom}–{bizRules.quoteFrom - 1} rooms
            </span>
            <span className={tierCls(slab === 'quote')}>{bizRules.quoteFrom}+ rooms</span>
          </div>
          <span className="text-[13px] text-ink-700">
            {price.count === 0
              ? 'Add at least one room.'
              : slab === 'base'
                ? `Add ${bizRules.teamFrom - price.count} more room(s) to unlock the extra ${bizRules.teamOff * 100}% team slab.`
                : slab === 'team'
                  ? `Team slab on: extra ${bizRules.teamOff * 100}% off every room.`
                  : `${bizRules.quoteFrom} or more rooms: the hotel sends a group price.`}
          </span>
          {price.count > 0 && (
            <div className="flex flex-col gap-2 text-sm">
              {price.lines.map((l) => (
                <div key={l.room.id} className="flex justify-between gap-3">
                  <span>
                    {l.qty} × {l.room.name} × {plural(nights, 'night')}
                  </span>
                  <span>{inr(l.amount)}</span>
                </div>
              ))}
              {price.teamDiscount > 0 && (
                <div className="flex justify-between gap-3 text-leaf-700">
                  <span>Team slab discount</span>
                  <span>−{inr(price.teamDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span>GST</span>
                <span>{inr(price.gst)}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-extrabold">
                <span>Total · {plural(price.count, 'room')}</span>
                <span>{inr(price.total)}</span>
              </div>
              <span className="text-[13px] font-semibold text-leaf-700">You save {inr(price.saved)} against public prices</span>
            </div>
          )}
          {price.count > 0 && slab !== 'quote' && (
            <div className={`rounded-xl border p-3 text-[13.5px] ${price.overRooms > 0 ? 'border-[#F5CBAE] bg-[#FFF4EC] text-[#7C2D12]' : 'border-[#BFE3C9] bg-leaf-50 text-leaf-800'}`}>
              {price.overRooms > 0 ? (
                <>
                  <strong>Above company limit.</strong> {plural(price.overRooms, 'room')} cost more than {inr(limit)} a night. You can still book; they are marked in reports.
                </>
              ) : (
                <>
                  <strong>All rooms within the company limit.</strong> Confirms straight away.
                </>
              )}
            </div>
          )}
          {slab === 'quote' ? (
            quoteSent ? (
              <div className="rounded-xl border border-[#BFE3C9] bg-leaf-50 p-3 text-[13.5px] text-leaf-800">
                <strong>Group quote requested.</strong> The hotel replies to {c.name} by email with a group price for {plural(price.count, 'room')}.
              </div>
            ) : (
              <button type="button" className="btn-primary min-h-12" onClick={() => setQuoteSent(true)}>
                Request group quote
              </button>
            )
          ) : (
            <button type="button" className="btn-primary min-h-12" disabled={price.count === 0} onClick={goCheckout}>
              {price.count > 1 ? 'Continue: assign travellers' : 'Continue: traveller details'}
            </button>
          )}
          <span className="text-xs text-ink-500">
            Billed to {c.name} on monthly credit. {bizRules.freeCancelText}
          </span>
        </aside>
      </div>

      {/* Mobile sticky bar */}
      {price.count > 0 && slab !== 'quote' && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-line bg-white px-4 pt-3 lg:hidden" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
          <div className="flex flex-col">
            <strong className="text-lg">{inr(price.total)}</strong>
            <span className="text-xs text-ink-500">
              {plural(price.count, 'room')} · {plural(nights, 'night')} · incl. GST
            </span>
          </div>
          <button type="button" className="btn-primary" onClick={goCheckout}>
            Continue
          </button>
        </div>
      )}

      <AnimatePresence>
        {viewer !== null && photos.length > 0 && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/90 p-4"
            onClick={() => setViewer(null)}
          >
            <button type="button" aria-label="Close" className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy-800" onClick={() => setViewer(null)}>
              <X aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Previous photo"
              className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy-800"
              onClick={(e) => {
                e.stopPropagation()
                setViewer((v) => ((v ?? 0) - 1 + photos.length) % photos.length)
              }}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <figure className="flex max-h-full max-w-4xl flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <img src={photos[viewer]} alt={`${h.name} – ${photoLabel(photos[viewer])}`} className="max-h-[78vh] rounded-xl object-contain" />
              <figcaption className="text-sm text-white">
                {photoLabel(photos[viewer])} · {viewer + 1} of {photos.length}
              </figcaption>
            </figure>
            <button
              type="button"
              aria-label="Next photo"
              className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy-800"
              onClick={(e) => {
                e.stopPropagation()
                setViewer((v) => ((v ?? 0) + 1) % photos.length)
              }}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
