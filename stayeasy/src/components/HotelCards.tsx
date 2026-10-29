import { motion } from 'framer-motion'
import { Check, Heart, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cheapestRoom } from '../data/hotels'
import type { Hotel } from '../data/types'
import { gstRate } from '../config/site'
import { inr, ratingsText } from '../lib/format'
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
            <BrandPill tone="white">{hotel.brand}</BrandPill>
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

/** Wide row used on the search results page. */
export function HotelRow({ hotel, query, nights }: { hotel: Hotel; query: string; nights: number }) {
  const room = cheapestRoom(hotel)
  const tax = Math.round(room.price * gstRate(room.price))
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="card flex flex-col overflow-hidden sm:flex-row"
    >
      <Link to={`/hotel/${hotel.slug}?${query}`} className="relative block aspect-[16/10] sm:aspect-auto sm:w-[280px] sm:shrink-0" tabIndex={-1} aria-hidden="true">
        <HotelArt hue={hotel.hue} photo={hotel.photos?.[0]} />
        <span className="absolute top-3 left-3">
          <BrandPill tone="white">{hotel.brand}</BrandPill>
        </span>
      </Link>
      <div className="relative flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <span className="absolute top-3 right-3 sm:hidden">
          <WishButton slug={hotel.slug} name={hotel.name} />
        </span>
        <div className="flex items-start justify-between gap-3 pr-12 sm:pr-0">
          <div>
            <h2 className="text-[19px] font-bold">
              <Link to={`/hotel/${hotel.slug}?${query}`} className="text-ink-900 no-underline hover:text-navy-800">
                {hotel.name}
              </Link>
            </h2>
            <span className="text-sm text-ink-500">
              {hotel.area}, {hotel.city} · {hotel.distance}
            </span>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <RatingBadge rating={hotel.rating} />
            <div className="mt-1 text-xs text-ink-500">{ratingsText(hotel.reviews)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:hidden">
          <RatingBadge rating={hotel.rating} />
          <span className="text-xs text-ink-500">{ratingsText(hotel.reviews)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hotel.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-1 text-[13px] font-semibold text-leaf-700">
          <Check className="h-4 w-4" aria-hidden="true" /> Free cancellation till 24 hrs before check-in
        </span>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-[#EEF1F6] pt-3">
          <div>
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl">{inr(room.price)}</strong>
              {room.mrp > room.price && (
                <>
                  <span className="text-sm text-ink-500 line-through">{inr(room.mrp)}</span>
                  <span className="text-[13px] font-bold text-leaf-700">{offPct(room.price, room.mrp)}% off</span>
                </>
              )}
            </div>
            <span className="text-xs text-ink-500">
              + {inr(tax)} taxes · per night{nights > 1 ? ` · ${inr(room.price * nights)} for ${nights} nights` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              <WishButton slug={hotel.slug} name={hotel.name} />
            </span>
            <Link to={`/hotel/${hotel.slug}?${query}`} className="btn-primary">
              View rooms
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
