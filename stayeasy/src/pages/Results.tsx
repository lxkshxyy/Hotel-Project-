import { AnimatePresence, motion } from 'framer-motion'
import { SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { HotelRow } from '../components/HotelCards'
import SearchForm from '../components/SearchForm'
import { Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { minPrice } from '../data/hotels'
import type { AmenityKey, Brand, Hotel } from '../data/types'
import { getHotels } from '../lib/api'
import { bookableForStay } from '../lib/quote'
import { dayMonth, inr, nightsBetween } from '../lib/format'
import { guestsLabel, readSearch, searchToQuery } from '../lib/search'

interface Filters {
  min: number
  max: number
  payAtHotel: boolean
  breakfast: boolean
  couple: boolean
  airport: boolean
  railway: boolean
  brands: Brand[]
  areas: string[]
  rating: number
  amenities: AmenityKey[]
}

const emptyFilters = (max: number): Filters => ({
  min: 0,
  max,
  payAtHotel: false,
  breakfast: false,
  couple: false,
  airport: false,
  railway: false,
  brands: [],
  areas: [],
  rating: 0,
  amenities: [],
})

const sorts = [
  { v: 'recommended', l: 'Recommended' },
  { v: 'price-asc', l: 'Price: low to high' },
  { v: 'price-desc', l: 'Price: high to low' },
  { v: 'rating', l: 'Guest rating' },
]

const amenityFilters: { k: AmenityKey; l: string }[] = [
  { k: 'pool', l: 'Swimming pool' },
  { k: 'parking', l: 'Parking' },
  { k: 'restaurant', l: 'Restaurant' },
  { k: 'lift', l: 'Lift' },
  { k: 'gym', l: 'Gym' },
]

function matchesPlace(h: Hotel, q: string) {
  if (!q) return true
  const s = q.toLowerCase()
  return [h.city, h.area, h.name].some((v) => v.toLowerCase().includes(s)) || (s === 'delhi' && h.city === 'New Delhi')
}

const hasTag = (h: Hotel, word: string) =>
  h.tags.some((t) => t.toLowerCase().includes(word)) || h.nearby.some((n) => n.name.toLowerCase().includes(word) && parseFloat(n.distance) <= 5)

function Check({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-3 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-[18px] w-[18px] accent-navy-800" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-[13px] text-ink-400">{count}</span>}
    </label>
  )
}

export default function Results() {
  const [params, setParams] = useSearchParams()
  const search = readSearch(params)
  const query = searchToQuery(search)
  const nights = nightsBetween(search.checkIn, search.checkOut)
  const { user } = useAuth()

  const [all, setAll] = useState<Hotel[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [sheet, setSheet] = useState(false)
  const sort = params.get('sort') || 'recommended'

  useEffect(() => {
    getHotels()
      .then(setAll)
      .catch(() => setAll([]))
  }, [])

  const inPlace = useMemo(() => bookableForStay((all ?? []).filter((h) => matchesPlace(h, search.city)), search.checkIn, search.checkOut), [all, search.city, search.checkIn, search.checkOut])
  const priceCap = useMemo(() => Math.max(1000, ...inPlace.map(minPrice)), [inPlace])

  const [f, setF] = useState<Filters>(() => emptyFilters(100000))

  // Seed filters from quick links (?f=airport, ?brand=Prime)
  useEffect(() => {
    const quick = params.get('f')
    const brand = params.get('brand') as Brand | null
    const [pMin, pMax] = (params.get('price') || '').split('-').map(Number)
    setF({
      ...emptyFilters(100000),
      ...(Number.isFinite(pMin) && Number.isFinite(pMax) && pMax > pMin ? { min: pMin, max: pMax } : {}),
      airport: quick === 'airport',
      railway: quick === 'railway',
      couple: quick === 'couple',
      breakfast: quick === 'breakfast',
      brands: brand ? [brand] : [],
    })
  }, [params.get('f'), params.get('brand'), params.get('price'), search.city]) // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const list = inPlace.filter((h) => {
      const p = minPrice(h)
      if (p < f.min || p > f.max) return false
      if (f.payAtHotel && !h.payAtHotel) return false
      if (f.breakfast && !h.freeBreakfast) return false
      if (f.couple && !h.coupleFriendly) return false
      if (f.airport && !hasTag(h, 'airport')) return false
      if (f.railway && !(hasTag(h, 'railway') || hasTag(h, 'station'))) return false
      if (f.brands.length && !f.brands.includes(h.brand)) return false
      if (f.areas.length && !f.areas.includes(h.area)) return false
      if (f.rating && h.rating < f.rating) return false
      if (f.amenities.some((a) => !h.amenities.includes(a))) return false
      return true
    })
    const sorted = [...list]
    if (sort === 'price-asc') sorted.sort((a, b) => minPrice(a) - minPrice(b))
    else if (sort === 'price-desc') sorted.sort((a, b) => minPrice(b) - minPrice(a))
    else if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating)
    else sorted.sort((a, b) => b.rating * Math.log(b.reviews) - a.rating * Math.log(a.reviews))
    return sorted
  }, [inPlace, f, sort])

  const areas = useMemo(() => Array.from(new Set(inPlace.map((h) => h.area))).sort(), [inPlace])
  const count = (pred: (h: Hotel) => boolean) => inPlace.filter(pred).length
  const toggle = <K extends 'brands' | 'areas' | 'amenities'>(key: K, v: Filters[K][number]) =>
    setF((cur) => {
      const arr = cur[key] as string[]
      return { ...cur, [key]: arr.includes(v as string) ? arr.filter((x) => x !== v) : [...arr, v] }
    })

  const chips: { label: string; clear: () => void }[] = [
    ...(f.payAtHotel ? [{ label: 'Pay at hotel', clear: () => setF({ ...f, payAtHotel: false }) }] : []),
    ...(f.breakfast ? [{ label: 'Free breakfast', clear: () => setF({ ...f, breakfast: false }) }] : []),
    ...(f.couple ? [{ label: 'Couple friendly', clear: () => setF({ ...f, couple: false }) }] : []),
    ...(f.airport ? [{ label: 'Near airport', clear: () => setF({ ...f, airport: false }) }] : []),
    ...(f.railway ? [{ label: 'Near railway station', clear: () => setF({ ...f, railway: false }) }] : []),
    ...(f.rating ? [{ label: `Rating ${f.rating}+`, clear: () => setF({ ...f, rating: 0 }) }] : []),
    ...f.brands.map((b) => ({ label: b === 'StayEasy' ? 'StayEasy' : `StayEasy ${b}`, clear: () => toggle('brands', b) })),
    ...f.areas.map((a) => ({ label: a, clear: () => toggle('areas', a) })),
    ...f.amenities.map((a) => ({ label: amenityFilters.find((x) => x.k === a)?.l ?? a, clear: () => toggle('amenities', a) })),
    ...(f.max < priceCap || f.min > 0
      ? [{ label: `${inr(f.min)} – ${f.max >= priceCap ? inr(priceCap) + '+' : inr(f.max)}`, clear: () => setF({ ...f, min: 0, max: 100000 }) }]
      : []),
  ]

  const title = search.city ? `Hotels in ${search.city}` : 'All StayEasy hotels'

  const filterPanel = (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <strong className="flex items-center gap-2 text-[17px]">
          <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden="true" /> Filters
        </strong>
        <button type="button" className="p-1.5 text-[13px] font-bold text-ember-600" onClick={() => setF(emptyFilters(100000))}>
          Clear all
        </button>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-bold">Price per night</legend>
        <input
          type="range"
          min={0}
          max={priceCap}
          step={100}
          value={Math.min(f.max, priceCap)}
          onChange={(e) => setF({ ...f, max: Number(e.target.value) >= priceCap ? 100000 : Number(e.target.value) })}
          className="w-full accent-navy-800"
          aria-label="Maximum price per night"
        />
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-xs text-ink-500">
            Min
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={f.min || ''}
              placeholder="₹0"
              onChange={(e) => setF({ ...f, min: Number(e.target.value) || 0 })}
              className="field py-2 text-sm"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-ink-500">
            Max
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={f.max >= 100000 ? '' : f.max}
              placeholder={`${inr(priceCap)}+`}
              onChange={(e) => setF({ ...f, max: Number(e.target.value) || 100000 })}
              className="field py-2 text-sm"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1 border-t border-line pt-5">
        <legend className="float-left mb-2 font-bold">Quick filters</legend>
        <Check label="Pay at hotel" checked={f.payAtHotel} onChange={() => setF({ ...f, payAtHotel: !f.payAtHotel })} count={count((h) => h.payAtHotel)} />
        <Check label="Free breakfast" checked={f.breakfast} onChange={() => setF({ ...f, breakfast: !f.breakfast })} count={count((h) => h.freeBreakfast)} />
        <Check label="Couple friendly" checked={f.couple} onChange={() => setF({ ...f, couple: !f.couple })} count={count((h) => h.coupleFriendly)} />
        <Check label="Near airport" checked={f.airport} onChange={() => setF({ ...f, airport: !f.airport })} count={count((h) => hasTag(h, 'airport'))} />
        <Check
          label="Near railway station"
          checked={f.railway}
          onChange={() => setF({ ...f, railway: !f.railway })}
          count={count((h) => hasTag(h, 'railway') || hasTag(h, 'station'))}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-1 border-t border-line pt-5">
        <legend className="float-left mb-2 font-bold">Brand</legend>
        {(['Lite', 'StayEasy', 'Prime'] as Brand[]).map((b) => (
          <Check
            key={b}
            label={b === 'StayEasy' ? 'StayEasy' : `StayEasy ${b}`}
            checked={f.brands.includes(b)}
            onChange={() => toggle('brands', b)}
            count={count((h) => h.brand === b)}
          />
        ))}
      </fieldset>

      {areas.length > 1 && (
        <fieldset className="flex flex-col gap-1 border-t border-line pt-5">
          <legend className="float-left mb-2 font-bold">Locality</legend>
          {areas.map((a) => (
            <Check key={a} label={a} checked={f.areas.includes(a)} onChange={() => toggle('areas', a)} count={count((h) => h.area === a)} />
          ))}
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-1 border-t border-line pt-5">
        <legend className="float-left mb-2 font-bold">Guest rating</legend>
        {[4.5, 4, 3.5].map((r) => (
          <label key={r} className="flex min-h-9 cursor-pointer items-center gap-3 text-sm">
            <input type="radio" name="rating" checked={f.rating === r} onChange={() => setF({ ...f, rating: r })} className="h-[18px] w-[18px] accent-navy-800" />
            <span className="flex-1">{r} &amp; above</span>
            <span className="text-[13px] text-ink-400">{count((h) => h.rating >= r)}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-1 border-t border-line pt-5">
        <legend className="float-left mb-2 font-bold">Amenities</legend>
        {amenityFilters.map((a) => (
          <Check
            key={a.k}
            label={a.l}
            checked={f.amenities.includes(a.k)}
            onChange={() => toggle('amenities', a.k)}
            count={count((h) => h.amenities.includes(a.k))}
          />
        ))}
      </fieldset>
    </div>
  )

  return (
    <div className="container-page pt-5 pb-12">
      {/* Search summary */}
      <div className="card flex flex-wrap items-center gap-x-3 gap-y-1 p-2 pl-4">
        <strong>{search.city || 'Anywhere'}</strong>
        <span className="text-ink-400" aria-hidden="true">
          ·
        </span>
        <span>
          {dayMonth(search.checkIn)} – {dayMonth(search.checkOut)}
        </span>
        <span className="text-ink-400" aria-hidden="true">
          ·
        </span>
        <span>{guestsLabel(search)}</span>
        <button type="button" className="btn ml-auto min-h-10 bg-ember-600 px-4 text-sm text-white hover:bg-ember-700" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
          {editing ? 'Close' : 'Modify'}
        </button>
      </div>
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="card mt-3 p-4">
              <SearchForm key={query} initial={search} initialPrice={params.get('price') || ''} onDone={() => setEditing(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav aria-label="Breadcrumb" className="mt-5 text-[13px] text-ink-500">
        <Link to="/" className="no-underline hover:underline">
          Home
        </Link>{' '}
        › {title}
      </nav>
      <div className="mt-2 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[30px]">{title}</h1>
          <p className="text-ink-500">
            {all ? `${results.length} stay${results.length === 1 ? '' : 's'} found` : 'Searching…'} · prices are per room per night
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-outline min-h-10 px-3.5 text-sm lg:hidden" onClick={() => setSheet(true)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters{chips.length ? ` (${chips.length})` : ''}
          </button>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-500">
            <span className="hidden sm:inline">Sort by</span>
            <select
              value={sort}
              onChange={(e) => {
                const next = new URLSearchParams(params)
                next.set('sort', e.target.value)
                setParams(next, { replace: true })
              }}
              className="min-h-10 rounded-xl border border-line-strong bg-white px-3 text-sm font-semibold text-ink-900"
            >
              {sorts.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.l}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex items-start gap-6">
        <aside aria-label="Filters" className="card sticky top-24 hidden max-h-[calc(100dvh-7rem)] w-[280px] shrink-0 overflow-y-auto p-5 lg:block">
          {filterPanel}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4" aria-live="polite">
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <button key={c.label} type="button" onClick={c.clear} className="chip hover:bg-[#D3DCEE]" aria-label={`Remove filter ${c.label}`}>
                  {c.label} <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
          {!user && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#BFE3C9] bg-leaf-50 px-4 py-3 text-sm">
              <span>
                <strong className="text-leaf-700">Members save an extra 5%</strong> on every hotel below — sign in to unlock member prices.
              </span>
              <Link to={`/login?next=${encodeURIComponent('/hotels?' + params.toString())}`} className="font-bold text-leaf-700 no-underline">
                Sign in →
              </Link>
            </div>
          )}

          {!all ? (
            <Spinner label="Finding stays" />
          ) : results.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 p-10 text-center">
              <strong className="text-lg">No stays match these filters</strong>
              <p className="text-ink-500">Try removing a filter or searching another city.</p>
              <button type="button" className="btn-navy" onClick={() => setF(emptyFilters(100000))}>
                Clear filters
              </button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {results.map((h) => (
                <HotelRow key={h.slug} hotel={h} query={query} nights={nights} />
              ))}
            </AnimatePresence>
          )}
        </section>
      </div>

      {/* Mobile filter sheet */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-navy-950/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheet(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white lg:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong" />
              <div className="overflow-y-auto px-5 pt-3 pb-4">{filterPanel}</div>
              <div className="border-t border-line p-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
                <button type="button" className="btn-navy w-full" onClick={() => setSheet(false)}>
                  Show {results.length} stay{results.length === 1 ? '' : 's'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
