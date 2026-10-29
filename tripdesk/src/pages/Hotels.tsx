import { Hotel as HotelIcon, MapPin, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { brandLabel } from '@stayeasy/data/hotels'
import type { Hotel } from '@stayeasy/data/types'
import { agentQuote } from '@stayeasy/lib/agentRates'
import { inr, nightsBetween, plural } from '@stayeasy/lib/format'
import { bookableForStay, freeCancelHours } from '@stayeasy/lib/quote'
import SearchBar from '../components/SearchBar'
import { Empty, Notice, Pill, RateSlip, Spinner } from '../components/ui'
import { useSession } from '../context/Session'
import { useHotels } from '../lib/hooks'
import { readSearch, toQuery } from '../lib/search'
import { markupForHotel } from '../lib/store'

type Sort = 'net' | 'earning' | 'rating'

export default function Hotels() {
  const [params, setParams] = useSearchParams()
  const s = readSearch(params)
  const { agency } = useSession()
  const { data: all, error } = useHotels()
  const [showFilters, setShowFilters] = useState(false)
  const sort = (params.get('sort') as Sort) || 'net'
  const [f, setF] = useState({ max: 0, brand: '', couple: false, breakfast: false, freeCancel: false })
  const cities = useMemo(() => [...new Set((all ?? []).map((h) => h.city))].sort(), [all])
  const nights = nightsBetween(s.checkIn, s.checkOut)

  const rows = useMemo(() => {
    if (!all || !agency) return []
    const list = bookableForStay(
      all.filter((h) => !s.city || h.city === s.city),
      s.checkIn,
      s.checkOut,
    )
    return list
      .map((h) => {
        const quotes = h.rooms
          .filter((r) => r.maxGuests * s.rooms >= s.adults + s.children)
          .map((r) => agentQuote({ hotel: h, roomId: r.id, checkIn: s.checkIn, checkOut: s.checkOut, rooms: s.rooms, adults: s.adults, children: s.children, markup: markupForHotel(agency, h) }))
        const best = quotes.sort((a, b) => a.netTotal - b.netTotal)[0]
        return best ? { h, q: best } : null
      })
      .filter((x): x is { h: Hotel; q: ReturnType<typeof agentQuote> } => !!x)
      .filter(({ h, q }) => (!f.max || q.sellingTotal <= f.max) && (!f.brand || h.brand === f.brand) && (!f.couple || h.coupleFriendly) && (!f.breakfast || h.freeBreakfast) && (!f.freeCancel || freeCancelHours(h) !== null))
      .sort((a, b) => (sort === 'earning' ? b.q.markupAmount - a.q.markupAmount : sort === 'rating' ? b.h.rating - a.h.rating : a.q.netTotal - b.q.netTotal))
  }, [all, agency, s.city, s.checkIn, s.checkOut, s.rooms, s.adults, s.children, f, sort])

  const brands = [...new Set((all ?? []).map((h) => h.brand))]
  return (
    <div className="page flex flex-col gap-6 pt-7">
      <section aria-label="Search" className="card p-5">
        <SearchBar key={params.toString()} initial={s} cities={cities} compact />
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-extrabold text-ink-950">
          {all ? `${plural(rows.length, 'hotel')}${s.city ? ` in ${s.city}` : ''}` : 'Searching'}
          <span className="ml-2 text-base font-semibold text-muted">
            {plural(nights, 'night')}, {plural(s.rooms, 'room')}, {plural(s.adults + s.children, 'guest')}
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-line min-h-10 text-sm" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters
          </button>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
            Sort
            <select
              className="field min-h-10 w-auto py-1.5"
              value={sort}
              onChange={(e) => {
                params.set('sort', e.target.value)
                setParams(params, { replace: true })
              }}
            >
              <option value="net">Lowest net rate</option>
              <option value="earning">Highest earning</option>
              <option value="rating">Guest rating</option>
            </select>
          </label>
        </div>
      </div>
      {showFilters && (
        <div className="card flex flex-wrap items-end gap-4 p-4">
          <label className="label">
            Customer pays at most (₹)
            <input type="number" className="field w-40" min={0} step={500} value={f.max || ''} onChange={(e) => setF({ ...f, max: Number(e.target.value) })} />
          </label>
          <label className="label">
            Brand
            <select className="field w-48" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })}>
              <option value="">All</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {brandLabel(b)}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ['couple', 'Couple friendly'],
              ['breakfast', 'Free breakfast'],
              ['freeCancel', 'Free cancellation'],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-white px-3 text-sm font-semibold">
              <input type="checkbox" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} className="h-4 w-4 accent-ink-900" />
              {l}
            </label>
          ))}
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {!all ? (
        <Spinner label="Loading hotels" />
      ) : rows.length === 0 ? (
        <div className="card">
          <Empty icon={<HotelIcon className="h-7 w-7" />} title="No hotels for this search">
            <p className="max-w-sm text-muted">Try other dates, fewer guests per room, or all cities.</p>
          </Empty>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map(({ h, q }) => {
            const link = `/app/hotel/${h.slug}?${toQuery(s)}`
            return (
              <li key={h.slug} className="card grid overflow-hidden md:grid-cols-[260px_1fr_320px]">
                <Link to={link} tabIndex={-1} aria-hidden="true" className="block aspect-[16/10] bg-ink-50 md:aspect-auto">
                  {h.photos?.[0] ? <img src={h.photos[0]} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-muted">No photo</span>}
                </Link>
                <div className="flex flex-col gap-2 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="ink">{brandLabel(h.brand)}</Pill>
                    {h.rating > 0 && (
                      <Pill tone="ok">
                        {h.rating.toFixed(1)} from {h.reviews.toLocaleString('en-IN')} ratings
                      </Pill>
                    )}
                  </div>
                  <Link to={link} className="text-xl font-extrabold text-ink-950 no-underline hover:underline">
                    {h.name}
                  </Link>
                  <span className="flex items-center gap-1 text-sm text-muted">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /> {h.area}, {h.city}. {h.distance}
                  </span>
                  <span className="text-sm text-ink-700">
                    From {q.room.name}
                    {h.freeBreakfast ? ', breakfast available' : ''}
                    {h.coupleFriendly ? ', couple friendly' : ''}
                  </span>
                  <span className={`text-sm font-semibold ${freeCancelHours(h) === null ? 'text-alert' : 'text-earn'}`}>{freeCancelHours(h) === null ? 'Non-refundable' : `Free cancellation until ${freeCancelHours(h)} hours before check-in`}</span>
                </div>
                <div className="flex flex-col justify-center gap-3 border-t border-line bg-paper/60 p-5 md:border-t-0 md:border-l">
                  <RateSlip net={q.netTotal} markup={q.markupAmount} selling={q.sellingTotal} size="sm" note={`Public price ${inr(q.publicTotal)}`} />
                  <Link to={link} className="btn-ink">
                    See rooms
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
