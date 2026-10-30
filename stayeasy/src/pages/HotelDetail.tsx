import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Images, MapPin, Share2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import HotelArt from '../components/HotelArt'
import DatePopoverField from '../components/DatePopoverField'
import { HotelTile, WishButton } from '../components/HotelCards'
import LocationSection from '../components/hotel/LocationSection'
import PropertyRules from '../components/hotel/PropertyRules'
import ReviewsSection from '../components/hotel/ReviewsSection'
import { BrandPill, RatingBadge, Reveal, Spinner, Stepper, amenityMeta } from '../components/ui'
import { site } from '../config/site'
import { brandLabel, cheapestRoom, hotels as allHotels } from '../data/hotels'
import type { Hotel, Room } from '../data/types'
import { getHotel } from '../lib/api'
import { ratingSummary } from '../lib/reviews'
import { addDays, inr, nightsBetween, plural, ratingWord, shortDate, ratingsText } from '../lib/format'
import { freeCancelHours, hotelForStay, quote } from '../lib/quote'
import { guestsLabel, readSearch, searchToQuery } from '../lib/search'

/** Gallery caption from a photo's file name, e.g. /hotels/x/room-2.webp -> "Room". */
const photoLabels: Record<string, string> = {
  exterior: 'Exterior',
  room: 'Room',
  bath: 'Bathroom',
  dining: 'Dining',
  banquet: 'Banquet hall',
  lobby: 'Lobby',
}
function photoLabel(url?: string) {
  const kind = url?.split('/').pop()?.split('-')[0]
  return kind ? photoLabels[kind] : undefined
}

export default function HotelDetail() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const search = readSearch(params)
  const nights = nightsBetween(search.checkIn, search.checkOut)
  const guests = search.adults + search.children

  const [rawHotel, setHotel] = useState<Hotel | null | undefined>(undefined)
  const hotel = useMemo(() => (rawHotel ? hotelForStay(rawHotel, search.checkIn, search.checkOut) : rawHotel), [rawHotel, search.checkIn, search.checkOut])
  const [roomId, setRoomId] = useState<string>('')
  const [shared, setShared] = useState(false)
  const [viewer, setViewer] = useState<{ room: Room; index: number } | null>(null)

  useEffect(() => {
    getHotel(slug).then((h) => {
      setHotel(h)
      if (h) setRoomId(params.get('room') || cheapestRoom(h).id)
    })
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hotel) document.title = `${hotel.name}, ${hotel.city} – ${site.name}`
    return () => {
      document.title = `${site.name} – Hotel Booking`
    }
  }, [hotel])

  const room = useMemo(() => hotel?.rooms.find((r) => r.id === roomId) ?? (hotel ? cheapestRoom(hotel) : null), [hotel, roomId])

  if (hotel === undefined) return <Spinner label="Loading hotel" />
  if (hotel === null || !room)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-extrabold text-navy-800">Hotel not found</h1>
        <Link to="/hotels" className="btn-navy mt-6">
          Browse hotels
        </Link>
      </div>
    )

  const price = quote({ hotel: rawHotel!, roomId: room.id, checkIn: search.checkIn, checkOut: search.checkOut, rooms: search.rooms, adults: search.adults, children: search.children })
  const tooMany = guests > room.maxGuests * search.rooms
  const cancelHrs = freeCancelHours(hotel)
  const blocked = tooMany || !!room.unavailable
  const update = (patch: Partial<typeof search>) => {
    const next = { ...search, ...patch }
    if (next.checkOut <= next.checkIn) next.checkOut = addDays(next.checkIn, 1)
    setParams(new URLSearchParams(searchToQuery(next)), { replace: true })
  }
  const goBook = () => {
    if (tooMany) return
    navigate(`/checkout?${searchToQuery(search, { hotel: hotel.slug, room: room.id })}`)
  }
  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: hotel.name, url })
      else {
        await navigator.clipboard.writeText(url)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {
      /* cancelled */
    }
  }

  const controls = (align: 'left' | 'right') => (
    <div className="rounded-xl border border-line-strong">
      <DatePopoverField align={align} checkIn={search.checkIn} checkOut={search.checkOut} onChange={(checkIn, checkOut) => update({ checkIn, checkOut })} />
      <div className="border-t border-line-strong px-3 pt-1 pb-1">
        <Stepper label="Rooms" value={search.rooms} min={1} max={8} onChange={(n) => update({ rooms: n, adults: Math.max(search.adults, n) })} />
        <Stepper label="Guests" value={search.adults} min={search.rooms} max={search.rooms * 4} onChange={(n) => update({ adults: n })} />
      </div>
    </div>
  )

  const similar = [
    ...allHotels.filter((x) => x.city === hotel.city && x.slug !== hotel.slug),
    ...allHotels.filter((x) => x.city !== hotel.city && x.brand === hotel.brand),
  ].slice(0, 4)
  const score = ratingSummary(hotel, [])
  const sections = [
    ['overview', 'Overview'],
    ['rooms', 'Rooms'],
    ['location', 'Location'],
    ['rules', 'Property Rules'],
    ['reviews', 'User Reviews'],
    ['similar', 'Similar Properties'],
  ] as const

  const resultsLink = `/hotels?${searchToQuery({ ...search, city: hotel.city })}`

  return (
    <div className="pb-24 md:pb-0">
      <div className="container-page pt-5">
        <nav aria-label="Breadcrumb" className="text-[13px] text-ink-500">
          <Link to="/" className="no-underline hover:underline">
            Home
          </Link>{' '}
          ›{' '}
          <Link to={resultsLink} className="no-underline hover:underline">
            Hotels in {hotel.city}
          </Link>{' '}
          › {hotel.name}
        </nav>

        <div className="mt-3 mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <BrandPill>{brandLabel(hotel.brand)}</BrandPill>
            <h1 className="mt-2 text-[28px] leading-tight font-extrabold tracking-tight text-navy-800 sm:text-[34px]">{hotel.name}</h1>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-500">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {hotel.address} · {hotel.distance} ·{' '}
                <a href="#location" className="font-bold no-underline">
                  View on map
                </a>
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <strong className="block">{ratingWord(hotel.rating)}</strong>
              <span className="text-[13px] text-ink-500">{ratingsText(hotel.reviews)}</span>
            </div>
            <RatingBadge rating={hotel.rating} size="lg" />
            <button
              type="button"
              onClick={share}
              aria-label="Share this hotel"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-line-strong bg-white text-ink-900"
            >
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </button>
            <WishButton slug={hotel.slug} name={hotel.name} />
          </div>
        </div>
        {shared && (
          <p role="status" className="-mt-3 mb-3 text-sm font-semibold text-leaf-700">
            Link copied
          </p>
        )}
      </div>

      {/* Gallery */}
      <div className="no-scrollbar container-page flex snap-x snap-mandatory gap-2.5 overflow-x-auto md:grid md:h-[420px] md:grid-cols-4 md:grid-rows-2 md:overflow-visible">
        {(
          [
            ['facade', 'Pool and façade', 'md:col-span-2 md:row-span-2'],
            ['room', 'Premium room', ''],
            ['bath', 'Bathroom', ''],
            ['dining', 'Breakfast area', ''],
            ['city', 'Neighbourhood', ''],
          ] as const
        ).map(([kind, fallbackLabel, cls], i) => {
          const label = hotel.photoTags?.[i] ?? photoLabel(hotel.photos?.[i]) ?? fallbackLabel
          return (
          <motion.div
            key={kind}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`relative aspect-[4/3] w-[85%] shrink-0 snap-start overflow-hidden rounded-2xl md:aspect-auto md:w-auto ${cls}`}
          >
            <HotelArt hue={(hotel.hue + i * 18) % 360} kind={kind} label={`${hotel.name}: ${label}`} photo={hotel.photos?.[i]} />
            <span className="absolute bottom-2 left-2 rounded-md bg-white/85 px-2 py-0.5 text-xs font-semibold text-ink-700">{label}</span>
          </motion.div>
          )
        })}
      </div>

      <nav aria-label="Hotel sections" className="sticky top-16 z-30 mt-6 border-y border-line bg-white/95 backdrop-blur md:top-[108px]">
        <div className="no-scrollbar container-page flex gap-1 overflow-x-auto">
          {sections.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="shrink-0 border-b-[3px] border-transparent px-3 py-3 text-sm font-bold tracking-wide text-ink-700 uppercase no-underline hover:border-navy-800 hover:text-navy-800 sm:px-5"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <AnimatePresence>
        {viewer && (
          <RoomViewer
            hotel={hotel}
            room={viewer.room}
            index={viewer.index}
            onIndex={(index) => setViewer({ ...viewer, index })}
            onClose={() => setViewer(null)}
            onSelect={() => {
              setRoomId(viewer.room.id)
              setViewer(null)
            }}
          />
        )}
      </AnimatePresence>

      <div className="container-page mt-7 flex flex-col gap-7 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <Reveal>
            <section id="overview" className="card scroll-mt-40 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-navy-800">Why guests love it</h2>
                <a href="#reviews" className="flex items-center gap-2 no-underline">
                  <span className="rounded-lg bg-navy-800 px-2 py-1 text-sm font-black text-white">{score.total ? score.avg.toFixed(1) : 'New'}</span>
                  <span className="text-sm">
                    <strong className="text-navy-800">{score.total ? ratingWord(score.avg) : 'New listing'}</strong> · {ratingsText(score.total)}
                  </span>
                </a>
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {hotel.highlights.map((h) => (
                  <span key={h} className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2 text-sm font-semibold">
                    <Check className="h-4 w-4 text-leaf-700" strokeWidth={3} aria-hidden="true" />
                    {h}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-ink-700">{hotel.description}</p>
            </section>
          </Reveal>

          <Reveal>
            <section className="card p-5 sm:p-6">
              <h2 className="text-xl font-bold text-navy-800">Amenities</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {hotel.amenities.map((a) => {
                  const { label, Icon } = amenityMeta[a]
                  return (
                    <span key={a} className="flex items-center gap-2.5 text-sm">
                      <Icon className="h-5 w-5 text-navy-800" aria-hidden="true" />
                      {label}
                    </span>
                  )
                })}
              </div>
            </section>
          </Reveal>

          <section className="card p-4 md:hidden" aria-label="Your trip">
            {controls('left')}
            {room.unavailable && (
            <p role="alert" className="rounded-lg bg-ember-50 px-3 py-2 text-sm font-semibold text-ember-700">
              {room.unavailable} Try other dates or another room.
            </p>
          )}
          {tooMany && (
              <p role="alert" className="mt-3 rounded-lg bg-ember-50 px-3 py-2 text-sm font-semibold text-ember-700">
                {room.name} fits {room.maxGuests} guests per room. Add a room or pick a bigger room.
              </p>
            )}
          </section>

          <section id="rooms" className="card scroll-mt-40 p-5 sm:p-6">
            <h2 className="text-xl font-bold text-navy-800">Choose your room</h2>
            <p className="mt-0.5 mb-4 text-sm text-ink-500">
              Prices per room per night · {plural(nights, 'night')}, {guestsLabel(search)}
            </p>
            <div className="flex flex-col gap-3.5" role="radiogroup" aria-label="Room type">
              {hotel.rooms.map((r) => {
                const on = r.id === room.id
                return (
                  <motion.div
                    key={r.id}
                    layout
                    className={`flex flex-col gap-4 rounded-2xl border-2 p-4 transition-colors sm:flex-row ${on ? 'border-navy-800 bg-[#F6F8FD]' : 'border-line bg-white'}`}
                  >
                    {r.photo ? (
                      <button
                        type="button"
                        onClick={() => setViewer({ room: r, index: 0 })}
                        aria-label={`View photos of the ${r.name}`}
                        className="group relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-xl sm:h-[110px] sm:w-[150px] sm:shrink-0"
                      >
                        <img
                          src={r.photo}
                          alt={`${hotel.name}: ${r.name}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-navy-950/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                          <Images size={12} aria-hidden="true" /> View photos
                        </span>
                      </button>
                    ) : (
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl sm:h-[110px] sm:w-[150px] sm:shrink-0">
                        <HotelArt hue={r.hue} kind="room" label={r.name} />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-1.5">
                      <strong className="text-[17px]">{r.name}</strong>
                      <span className="text-[13px] text-ink-500">
                        {r.size} · up to {r.maxGuests} guests
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {r.features.map((f) => (
                          <span key={f} className="tag">
                            {f}
                          </span>
                        ))}
                      </div>
                      <span className="text-[13px] font-semibold text-leaf-700">{freeCancelHours(hotel) === null ? 'Non-refundable' : '✓ Free cancellation'}{hotel.payAtHotel ? ' · ✓ Pay at hotel' : ''}</span>
                      {r.unavailable && <span className="text-[13px] font-bold text-ember-700">{r.unavailable}</span>}
                    </div>
                    <div className="flex items-end justify-between gap-1 sm:w-[170px] sm:flex-col sm:items-end sm:text-right">
                      <div>
                        {r.mrp > r.price && <span className="block text-[13px] text-ink-500 line-through">{inr(r.mrp)}</span>}
                        <strong className="block text-[22px]">{inr(r.price)}</strong>
                        <span className="text-xs text-ink-500">per night</span>
                      </div>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setRoomId(r.id)}
                        disabled={!!r.unavailable}
                        className={`btn min-h-11 border-2 border-navy-800 px-4 text-sm ${on ? 'bg-navy-800 text-white' : 'bg-white text-navy-800 hover:bg-navy-50'}`}
                      >
                        {r.unavailable ? 'Not available' : on ? 'Selected ✓' : 'Select room'}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </section>

          <LocationSection hotel={hotel} />
          <PropertyRules hotel={hotel} />
          <ReviewsSection hotel={hotel} />
        </div>

        {/* Booking box */}
        <aside aria-label="Your booking" className="card hidden flex-col gap-4 p-5 shadow-card md:flex lg:sticky lg:top-24 lg:w-[360px] lg:shrink-0">
          <div>
            <div className="flex items-baseline gap-2">
              <strong className="text-[28px]">{inr(room.price)}</strong>
              {room.mrp > room.price && (
                <>
                  <span className="text-sm text-ink-500 line-through">{inr(room.mrp)}</span>
                  <span className="text-[13px] font-bold text-leaf-700">{Math.round((1 - room.price / room.mrp) * 100)}% off</span>
                </>
              )}
            </div>
            <span className="text-[13px] text-ink-500">per night · {room.name}</span>
          </div>

          {controls('right')}

          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt>
                Room price ({plural(nights, 'night')} × {plural(search.rooms, 'room')})
              </dt>
              <dd>{inr(price.mrpTotal)}</dd>
            </div>
            {price.instant > 0 && (
              <div className="flex justify-between text-leaf-700">
                <dt>Instant discount</dt>
                <dd>– {inr(price.instant)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Taxes ({price.taxRate !== null ? `${Math.round(price.taxRate * 100)}% ` : ''}GST)</dt>
              <dd>{inr(price.tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2.5 text-[17px] font-extrabold">
              <dt>Total</dt>
              <dd>{inr(price.total)}</dd>
            </div>
          </dl>

          {tooMany && (
            <p role="alert" className="rounded-lg bg-ember-50 px-3 py-2 text-sm font-semibold text-ember-700">
              {room.name} fits {room.maxGuests} guests per room. Add a room or pick a bigger room.
            </p>
          )}
          <div className="rounded-xl bg-leaf-50 px-3 py-2.5 text-[13px] text-leaf-800">
            <strong>FIRSTSTAY</strong> can be applied at checkout · members get an extra 5% off
          </div>
          <button type="button" className="btn-primary min-h-[52px] text-[17px]" onClick={goBook} disabled={blocked}>
            Continue to book
          </button>
          <span className="text-center text-[13px] text-ink-500">
            {hotel.payAtHotel ? 'No payment needed now · Pay at hotel available' : 'Secure online payment'}
          </span>
          <span className="text-center text-[13px] font-semibold text-leaf-700">
            {cancelHrs === null ? 'Non-refundable rate' : `Free cancellation till ${shortDate(cancelHrs === 0 ? search.checkIn : addDays(search.checkIn, -Math.max(1, Math.ceil(cancelHrs / 24))))}, ${site.checkInTime}`}
          </span>
        </aside>
      </div>

      {similar.length > 0 && (
        <section id="similar" className="container-page mt-10 scroll-mt-40">
          <h2 className="section-title">Similar properties</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((h) => (
              <HotelTile key={h.slug} hotel={h} query={searchToQuery({ ...search, city: h.city })} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile sticky bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-white px-4 pt-3 md:hidden"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex-1">
          <div className="flex items-baseline gap-1.5">
            <strong className="text-xl">{inr(price.total)}</strong>
            <span className="text-xs text-ink-500">incl. taxes</span>
          </div>
          <span className="text-xs text-ink-500">
            {room.name} · {plural(nights, 'night')}
          </span>
        </div>
        <button type="button" className="btn-primary" onClick={goBook} disabled={blocked}>
          Book now
        </button>
      </div>
    </div>
  )
}

/** Full-screen photo viewer for one room type: the room, then the hotel's bathroom. */
function RoomViewer({
  hotel,
  room,
  index,
  onIndex,
  onClose,
  onSelect,
}: {
  hotel: Hotel
  room: Room
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  onSelect: () => void
}) {
  const slides = [
    { src: room.photo, caption: room.name },
    { src: hotel.photos?.[2], caption: 'Bathroom' },
  ].filter((s): s is { src: string; caption: string } => Boolean(s.src))
  const i = Math.min(index, slides.length - 1)
  const go = (d: number) => onIndex((i + d + slides.length) % slides.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  })

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${room.name} photos`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/85 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="relative aspect-[3/2] bg-ink-900">
          <img src={slides[i].src} alt={`${hotel.name}: ${slides[i].caption}`} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-navy-900 shadow hover:bg-white"
          >
            <X size={20} />
          </button>
          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous photo"
                className="absolute top-1/2 left-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy-900 shadow hover:bg-white"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next photo"
                className="absolute top-1/2 right-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy-900 shadow hover:bg-white"
              >
                <ChevronRight size={22} />
              </button>
              <span className="absolute bottom-3 left-3 rounded-md bg-navy-950/70 px-2 py-0.5 text-xs font-semibold text-white">
                {slides[i].caption} · {i + 1}/{slides.length}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <strong className="text-lg text-navy-800">{room.name}</strong>
            <p className="text-sm text-ink-500">
              {room.size} · up to {room.maxGuests} guests · {room.features.join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <strong className="block text-xl">{inr(room.price)}</strong>
              <span className="text-xs text-ink-500">per night</span>
            </div>
            <button type="button" onClick={onSelect} className="btn min-h-11 bg-navy-800 px-5 text-sm text-white hover:bg-navy-900">
              Select this room
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
