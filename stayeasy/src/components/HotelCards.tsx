import { motion } from 'framer-motion'
import { Check, Heart, MapPin, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { brandShort, cheapestRoom } from '../data/hotels'
import type { Hotel, SearchParams } from '../data/types'
import { gstRate } from '../config/site'
import { pointsFor } from '../lib/club'
import { inr, ratingsText } from '../lib/format'
import { nightInfo, stayDates } from '../lib/quote'
import { searchToQuery } from '../lib/search'
import { hotelStars } from '../lib/useHotels'
import HotelArt from './HotelArt'
import { BrandPill, RatingBadge } from './ui'

const offPct = (price: number, mrp: number) => Math.round(((mrp - price) / mrp) * 100)

function useWishlist(slug: string) {
  const key = 'stayeasy.wishlist'
  const read = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]')
    } catch {
      return []
    }
  }
  const [saved, setSaved] = useState(() => read().includes(slug))
  const toggle = () => {
    const list = read()
    const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    setSaved(next.includes(slug))
  }
  return [saved, toggle] as const
}

export function WishButton({ slug, name }: { slug: string; name: string }) {
  const [saved, toggle] = useWishlist(slug)
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle()
      }}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm"
    >
      <Heart className={`h-5 w-5 ${saved ? 'fill-ember-600 text-ember-600' : 'text-ink-900'}`} aria-hidden="true" />
    </motion.button>
  )
}

/** Compact card for grids and carousels. */
export function HotelTile({ hotel, query = '' }: { hotel: Hotel; query?: string }) {
  const room = cheapestRoom(hotel)
  return (
    <motion.article whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="card group flex h-full flex-col overflow-hidden">
      <Link to={`/hotel/${hotel.slug}${query ? `?${query}` : ''}`} className="flex h-full flex-col text-ink-900 no-underline">
        <div className="relative aspect-[4/3]">
          <HotelArt hue={hotel.hue} photo={hotel.photos?.[0]} label={`${hotel.name} exterior`} />
          <span className="absolute top-3 left-3">
            <BrandPill tone="white">{brandShort(hotel.brand)}</BrandPill>
          </span>
          <span className="absolute top-2 right-2">
            <WishButton slug={hotel.slug} name={hotel.name} />
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[17px] leading-snug font-bold group-hover:text-navy-800">{hotel.name}</h3>
            <RatingBadge rating={hotel.rating} />
          </div>
          <span className="flex items-center gap-1 text-sm text-ink-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {hotel.area}, {hotel.city}
          </span>
          <StarLine hotel={hotel} />
          <div className="mt-auto flex items-baseline gap-2 pt-3">
            <strong className="text-xl">{inr(room.price)}</strong>
            {room.mrp > room.price && (
              <>
                <span className="text-sm text-ink-500 line-through">{inr(room.mrp)}</span>
                <span className="text-[13px] font-bold text-leaf-700">{offPct(room.price, room.mrp)}% off</span>
              </>
            )}
          </div>
          <span className="text-xs text-ink-500">per night · {ratingsText(hotel.reviews)}</span>
        </div>
      </Link>
    </motion.article>
  )
}

/** Star category in gold, e.g. ★★★ 3-Star Hotel. Nothing for unrated listings. */
export function StarLine({ hotel, short = false }: { hotel: Hotel; short?: boolean }) {
  const n = hotelStars(hotel)
  if (!n) return null
  return (
    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-700" aria-label={`${n}-Star Hotel`}>
      <span className="tracking-[1px] text-[#E0A526]" aria-hidden="true">
        {'★'.repeat(n)}
      </span>
      {!short && <span aria-hidden="true">{n}-Star Hotel</span>}
    </span>
  )
}

/** Rooms still open for the whole stay, from the hotel's own room counts (null = not limited). */
function roomsLeft(hotel: Hotel, checkIn: string, checkOut: string): number | null {
  let total = 0
  for (const r of hotel.rooms) {
    const open = Math.min(...stayDates(checkIn, checkOut).map((d) => nightInfo(r, d).open))
    if (!Number.isFinite(open)) return null
    total += Math.max(0, open)
  }
  return total
}

/** Three short perks for the list: what matters most when choosing. */
function perksFor(hotel: Hotel): string[] {
  const p: string[] = []
  if (hotel.payAtHotel) p.push('Pay @ hotel')
  if (hotel.freeBreakfast) p.push('Free breakfast')
  if (hotel.coupleFriendly) p.push('Couple friendly')
  if (hotel.amenities.includes('pool')) p.push('Pool')
  if (hotel.amenities.includes('wifi')) p.push('Free Wi-Fi')
  if (hotel.amenities.includes('ac')) p.push('AC rooms')
  return p.slice(0, 3)
}

/** The cheapest room that fits everyone, for Quick book. */
function quickRoom(hotel: Hotel, s: SearchParams) {
  const guests = s.adults + s.children
  const fits = hotel.rooms.filter((r) => r.maxGuests * s.rooms >= guests)
  return (fits.length ? fits : hotel.rooms).reduce((a, b) => (b.price < a.price ? b : a))
}

/** One hotel in the results list (the list itself is a single box with dividers). */
export function HotelRow({ hotel, query, nights, search, popular = false }: { hotel: Hotel; query: string; nights: number; search: SearchParams; popular?: boolean }) {
  const room = cheapestRoom(hotel)
  const tax = Math.round(room.price * gstRate(room.price))
  const left = roomsLeft(hotel, search.checkIn, search.checkOut)
  const filling = left !== null && left > 0 && left <= 3
  const points = pointsFor(room.price * Math.max(1, nights))
  const quick = quickRoom(hotel, search)
  const href = `/hotel/${hotel.slug}?${query}`
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4 p-3 sm:flex-row sm:p-4"
    >
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden rounded-xl sm:aspect-[4/3] sm:w-[250px]">
        <Link to={href} className="absolute inset-0 block" tabIndex={-1} aria-hidden="true">
          <HotelArt hue={hotel.hue} photo={hotel.photos?.[0]} />
        </Link>
        {(filling || popular) && (
          <span className={`pointer-events-none absolute top-2.5 left-2.5 rounded-md px-2 py-1 text-[11px] font-black tracking-wide text-white uppercase ${filling ? 'bg-ember-600' : 'bg-navy-800'}`}>
            {filling ? 'Filling fast' : 'Popular'}
          </span>
        )}
        <span className="absolute top-1.5 right-1.5">
          <WishButton slug={hotel.slug} name={hotel.name} />
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[18px] leading-snug font-bold">
              <Link to={href} className="text-ink-900 no-underline hover:text-navy-800">
                {hotel.name}
              </Link>
            </h2>
            <span className="flex items-center gap-1 text-[13px] text-ink-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {hotel.area}, {hotel.city}
              </span>
            </span>
          </div>
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            <RatingBadge rating={hotel.rating} />
            <span className="text-[11px] text-ink-500">{ratingsText(hotel.reviews)}</span>
          </span>
        </div>
        <StarLine hotel={hotel} />
        <ul className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-700">
          {perksFor(hotel).map((p) => (
            <li key={p} className="flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-leaf-700" strokeWidth={3} aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
        {filling && <span className="text-[13px] font-bold text-ember-600">Only {left} {left === 1 ? 'room' : 'rooms'} left. Hurry!</span>}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
          <div>
            <div className="flex items-baseline gap-2">
              <strong className="text-[22px]">{inr(room.price)}</strong>
              {room.mrp > room.price && (
                <>
                  <span className="text-sm text-ink-500 line-through">{inr(room.mrp)}</span>
                  <span className="text-[13px] font-bold text-leaf-700">{offPct(room.price, room.mrp)}% off</span>
                </>
              )}
            </div>
            <span className="block text-xs text-ink-500">
              + {inr(tax)} taxes · per night{nights > 1 ? ` · ${inr(room.price * nights)} for ${nights} nights` : ''}
            </span>
            {points > 0 && <span className="block text-xs font-semibold text-[#8A5A00]">Earn {points} Club points</span>}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/checkout?${searchToQuery(search, { hotel: hotel.slug, room: quick.id })}`}
              className="flex h-11 items-center gap-1.5 rounded-xl border-2 border-navy-800 px-3.5 text-sm font-bold text-navy-800 no-underline hover:bg-navy-50"
              aria-label={`Quick book ${hotel.name}: ${quick.name}`}
              title={`Book ${quick.name} straight away`}
            >
              <Zap className="h-4 w-4 fill-current" aria-hidden="true" /> Quick book
            </Link>
            <Link to={href} className="btn-primary">
              Select rooms
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
