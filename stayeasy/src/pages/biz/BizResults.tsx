import { AnimatePresence, motion } from 'framer-motion'
import { Heart, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DatePopoverField from '../../components/DatePopoverField'
import HotelArt from '../../components/HotelArt'
import { RatingBadge } from '../../components/ui'
import { gstRate } from '../../config/site'
import { useAccount } from '../../context/AccountContext'
import { bizCategories, bizCheapest, bizRules, cityLimit, hotelRoomsFree, inCategory, slabFor, womenFriendly, workAmenities } from '../../data/business'
import { useAuth } from '../../context/AuthContext'
import { getShortlist, toggleShortlist } from '../../lib/bizApi'
import { brandLabel, cities, hotels } from '../../data/hotels'
import type { Brand } from '../../data/types'
import { dayMonth, inr, nightsBetween, plural } from '../../lib/format'
import { bizQuery, LimitChip, Pill, readBizSearch } from './shared'

type Sort = 'recommended' | 'price' | 'rooms' | 'rating'

export default function BizResults() {
  const { company } = useAccount()
  const { user } = useAuth()
  const c = company!
  const email = user?.email ?? ''
  const [saved, setSaved] = useState(() => getShortlist(c, email).map((x) => x.slug))
  const [params, setParams] = useSearchParams()
  const s = readBizSearch(params)
  const nights = nightsBetween(s.checkIn, s.checkOut)
  const slab = slabFor(s.rooms)

  const [onlyLimit, setOnlyLimit] = useState(false)
  const [negotiatedOnly, setNegotiatedOnly] = useState(false)
  const [enoughRooms, setEnoughRooms] = useState(s.rooms > 1)
  const [amen, setAmen] = useState<string[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [sort, setSort] = useState<Sort>('recommended')
  const [showFilters, setShowFilters] = useState(false)
  const [women, setWomen] = useState(!!s.women)

  const update = (patch: Partial<typeof s>) => setParams(bizQuery({ ...s, ...patch }), { replace: true })

  const list = useMemo(() => {
    const rows = hotels
      .filter((h) => !s.city || h.city === s.city)
      .filter((h) => !s.cat || inCategory(s.cat, h))
      .map((h) => {
        const { room, plans, rate } = bizCheapest(c, h, s.rooms)
        const limit = cityLimit(c, h.city)
        const free = hotelRoomsFree(h)
        const net = rate * s.rooms * nights
        const gst = Math.round(rate * gstRate(rate)) * s.rooms * nights
        return { h, room, plans, rate, limit, free, net, gst, over: rate > limit }
      })
      .filter((r) => !onlyLimit || !r.over)
      .filter((r) => !negotiatedOnly || r.plans.negotiated)
      .filter((r) => !enoughRooms || r.free >= s.rooms)
      .filter((r) => amen.every((a) => workAmenities.find((w) => w.id === a)!.test(r.h)))
      .filter((r) => brands.length === 0 || brands.includes(r.h.brand))
      .filter((r) => !women || womenFriendly(r.h))
    const score = (r: (typeof rows)[number]) => (r.plans.negotiated ? 2 : 0) + (r.over ? -2 : 0) + r.h.rating + (r.free >= s.rooms ? 1 : -1)
    return rows.sort((a, b) =>
      sort === 'price' ? a.rate - b.rate : sort === 'rooms' ? b.free - a.free : sort === 'rating' ? b.h.rating - a.h.rating : score(b) - score(a),
    )
  }, [c, s.city, s.cat, s.rooms, nights, onlyLimit, negotiatedOnly, enoughRooms, amen, brands, sort, women])

  const cat = bizCategories.find((x) => x.id === s.cat)
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const clearAll = () => {
    setOnlyLimit(false)
    setNegotiatedOnly(false)
    setEnoughRooms(false)
    setAmen([])
    setBrands([])
    setWomen(false)
    update({ cat: '' })
  }
  const hotelLink = (slug: string, city: string) => `/biz/hotel/${slug}?${bizQuery({ ...s, city })}`

  const filters = (
    <aside aria-label="Filters" className="card flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <strong className="flex items-center gap-2 text-[17px]">
          <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden="true" /> Filters
        </strong>
        <button type="button" onClick={clearAll} className="p-1.5 text-[13px] font-bold text-ember-600">
          Clear all
        </button>
      </div>
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 font-bold">Business needs</legend>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" checked={negotiatedOnly} onChange={() => setNegotiatedOnly(!negotiatedOnly)} className="h-[18px] w-[18px] accent-navy-800" />
          {c.name.split(' ')[0]} negotiated rate
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" checked={onlyLimit} onChange={() => setOnlyLimit(!onlyLimit)} className="h-[18px] w-[18px] accent-navy-800" />
          Within company limit
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" checked={enoughRooms} onChange={() => setEnoughRooms(!enoughRooms)} className="h-[18px] w-[18px] accent-navy-800" />
          {s.rooms > 1 ? `${s.rooms}+ rooms free (your booking)` : 'Rooms free on your dates'}
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" checked={women} onChange={() => setWomen(!women)} className="h-[18px] w-[18px] accent-navy-800" />
          Women-friendly stays
        </label>
      </fieldset>
      <fieldset className="flex flex-col gap-2.5 border-t border-line pt-4">
        <legend className="float-left mb-2.5 font-bold">Category</legend>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="radio" name="cat" checked={!s.cat} onChange={() => update({ cat: '' })} className="h-[18px] w-[18px] accent-navy-800" />
          All work stays
        </label>
        {bizCategories.map((x) => (
          <label key={x.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="radio" name="cat" checked={s.cat === x.id} onChange={() => update({ cat: x.id })} className="h-[18px] w-[18px] accent-navy-800" />
            {x.title}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2.5 border-t border-line pt-4">
        <legend className="float-left mb-2.5 font-bold">Work amenities</legend>
        {workAmenities.map((w) => (
          <label key={w.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={amen.includes(w.id)} onChange={() => setAmen(toggle(amen, w.id))} className="h-[18px] w-[18px] accent-navy-800" />
            {w.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2.5 border-t border-line pt-4">
        <legend className="float-left mb-2.5 font-bold">Brand</legend>
        {(['Lite', 'StayEasy', 'Prime'] as Brand[]).map((b) => (
          <label key={b} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={brands.includes(b)} onChange={() => setBrands(toggle(brands, b))} className="h-[18px] w-[18px] accent-navy-800" />
            {brandLabel(b)}
          </label>
        ))}
      </fieldset>
    </aside>
  )

  return (
    <div className="container-page pt-5 pb-16">
      <div className="card mb-5 flex flex-wrap items-end gap-3 p-3">
        <label className="label min-w-[150px] flex-[1.4_1_150px]">
          City
          <select className="field py-2.5" value={s.city} onChange={(e) => update({ city: e.target.value })}>
            <option value="">All cities</option>
            {cities.map((x) => (
              <option key={x.name}>{x.name}</option>
            ))}
          </select>
        </label>
        <DatePopoverField
          align="left"
          className="min-w-[260px] flex-[2_1_280px] rounded-xl border border-line-strong"
          checkIn={s.checkIn}
          checkOut={s.checkOut}
          onChange={(checkIn, checkOut) => update({ checkIn, checkOut })}
        />
        <div className="label min-w-[170px] flex-[1_1_170px]">
          Rooms
          <div className="flex items-center gap-2 rounded-xl border border-line-strong px-2 py-1.5">
            <button type="button" aria-label="One room fewer" disabled={s.rooms <= 1} onClick={() => update({ rooms: s.rooms - 1 })} className="h-8 w-8 rounded-lg text-lg font-bold text-navy-800 disabled:opacity-40">
              −
            </button>
            <strong className="flex-1 text-center text-[15px] text-ink-900">{plural(s.rooms, 'room')}</strong>
            <button
              type="button"
              aria-label="One room more"
              disabled={s.rooms >= bizRules.maxRooms}
              onClick={() => update({ rooms: s.rooms + 1, bookingFor: s.bookingFor === 'Myself' ? 'My team' : s.bookingFor })}
              className="h-8 w-8 rounded-lg text-lg font-bold text-navy-800 disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-500">
        <Link to="/biz" className="no-underline">
          Business home
        </Link>
        {cat && ` › ${cat.title}`}
        {s.city && ` › ${s.city}`}
      </nav>
      <div className="mt-2 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold text-navy-800 sm:text-[30px]">
            {cat ? cat.title : 'Hotels'} {s.city ? `in ${s.city}` : 'across India'} {s.rooms > 1 ? 'for your team' : 'for your trip'}
          </h1>
          <p className="text-ink-500">
            {plural(list.length, 'stay')} · {dayMonth(s.checkIn)} – {dayMonth(s.checkOut)} · {plural(nights, 'night')} · corporate prices per room per night · GST extra
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            aria-pressed={onlyLimit}
            onClick={() => setOnlyLimit(!onlyLimit)}
            className="flex min-h-11 items-center gap-2.5 rounded-[10px] border border-line-strong bg-white px-3.5 text-sm font-bold text-navy-800"
          >
            <span className={`relative inline-block h-5 w-9 rounded-full transition-colors ${onlyLimit ? 'bg-leaf-700' : 'bg-line-strong'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${onlyLimit ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
            Within limit only
          </button>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-500">
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-[10px] border border-line-strong bg-white px-3 py-2.5 text-sm font-semibold text-ink-900">
              <option value="recommended">Recommended for business</option>
              <option value="price">{s.rooms > 1 ? 'Team price' : 'Price'}: low to high</option>
              <option value="rooms">Most rooms free</option>
              <option value="rating">Guest rating</option>
            </select>
          </label>
          <button type="button" className="btn-outline lg:hidden" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters
          </button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[270px_1fr]">
        <div className={`${showFilters ? 'block' : 'hidden'} lg:sticky lg:top-24 lg:block`}>{filters}</div>
        <div className="flex min-w-0 flex-col gap-4">
          {slab !== 'base' && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-strong bg-navy-50 px-4 py-3">
              <span className="text-sm">
                {slab === 'team' ? (
                  <>
                    <strong className="text-navy-800">Team slab applied: {s.rooms} rooms get an extra {bizRules.teamOff * 100}% off</strong> the corporate rate at every hotel below.
                  </>
                ) : (
                  <>
                    <strong className="text-navy-800">{s.rooms} rooms is a group booking.</strong> Prices below are the corporate rate; the hotel sends a group quote.
                  </>
                )}
              </span>
              <span className="text-[13px] text-ink-700">
                Company limit: {inr(c.limitMetro)} metros · {inr(c.limitOther)} others
              </span>
            </div>
          )}
          {women && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#F6C7DD] bg-[#FDF2F8] px-4 py-3 text-sm text-[#7A0F47]">
              <span>
                <strong>Women-friendly stays only:</strong> 24×7 security and rated 4.3+ by guests.
              </span>
              <button type="button" className="font-bold underline" onClick={() => setWomen(false)}>
                Show all
              </button>
            </div>
          )}
          {list.length === 0 && (
            <div className="card flex flex-col items-center gap-3 p-10 text-center">
              <strong className="text-lg">No hotels match these filters</strong>
              <button type="button" className="btn-outline" onClick={clearAll}>
                Clear filters
              </button>
            </div>
          )}
          <AnimatePresence initial={false}>
            {list.map((r) => (
              <motion.article
                key={r.h.slug}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="card flex flex-col overflow-hidden sm:flex-row"
              >
                <div className="relative sm:w-[260px] sm:shrink-0">
                <Link to={hotelLink(r.h.slug, r.h.city)} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10] h-full sm:aspect-auto sm:min-h-[230px]">
                  <HotelArt hue={r.h.hue} photo={r.h.photos?.[0]} />
                  <span className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
                    <Pill tone="navy">{brandLabel(r.h.brand)}</Pill>
                    {r.plans.negotiated && <Pill tone="solid">{c.name.split(' ')[0]} rate</Pill>}
                  </span>
                  {r.h.photos && <span className="absolute bottom-2.5 left-3 rounded-md bg-white/90 px-2 py-0.5 text-xs text-ink-700">{plural(r.h.photos.length, 'photo')}</span>}
                </Link>
                <button
                  type="button"
                  aria-pressed={saved.includes(r.h.slug)}
                  aria-label={saved.includes(r.h.slug) ? `Remove ${r.h.name} from shortlist` : `Shortlist ${r.h.name}`}
                  onClick={() => setSaved(toggleShortlist(c, email, r.h.slug).map((x) => x.slug))}
                  className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow"
                >
                  <Heart className={`h-5 w-5 ${saved.includes(r.h.slug) ? 'fill-[#FF5A5F] text-[#FF5A5F]' : 'text-ink-700'}`} aria-hidden="true" />
                </button>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4 sm:px-5 sm:py-[18px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[19px] font-bold">
                        <Link to={hotelLink(r.h.slug, r.h.city)} className="text-ink-900 no-underline hover:text-navy-800">
                          {r.h.name}
                        </Link>
                      </h2>
                      <span className="text-sm text-ink-500">
                        {r.h.area}, {r.h.city} · {r.h.distance}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <RatingBadge rating={r.h.rating} />
                      <div className="mt-1 text-xs text-ink-500">{r.h.reviews.toLocaleString('en-IN')} ratings</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.h.tags.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <LimitChip over={r.over} amount={r.over ? inr(r.rate - r.limit) : undefined} />
                    <Pill tone="navy">GST invoice</Pill>
                    {womenFriendly(r.h) && <span className="rounded-full bg-[#FDECF4] px-2.5 py-[3px] text-xs font-bold text-[#A3125E]">Women-friendly</span>}
                    {r.free >= s.rooms ? <Pill>{r.free} rooms free on your dates</Pill> : <Pill tone="warn">Only {r.free} of {s.rooms} rooms free</Pill>}
                  </div>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-[#EEF1F6] pt-2.5">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-xs font-bold text-navy-800">{slab === 'team' ? 'TEAM PRICE' : r.plans.negotiated ? 'COMPANY PRICE' : 'CORPORATE PRICE'}</span>
                        <strong className="text-2xl">{inr(r.rate)}</strong>
                        <span className="text-sm text-ink-500 line-through">{inr(r.plans.pub)}</span>
                      </div>
                      <span className="text-[12.5px] text-ink-500">
                        {r.room.name} · {r.plans.negotiated ? 'company' : 'corporate'} {inr(r.plans.company)}
                        {slab === 'team' && ` − ${bizRules.teamOff * 100}% team slab`} · per room per night
                      </span>
                      <span className="text-[13px] font-bold">
                        {s.rooms} {s.rooms === 1 ? 'room' : 'rooms'} × {plural(nights, 'night')} = {inr(r.net)} + {inr(r.gst)} GST ({Math.round(gstRate(r.rate) * 100)}%)
                      </span>
                    </div>
                    <Link to={hotelLink(r.h.slug, r.h.city)} className="btn-primary">
                      Select rooms
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
