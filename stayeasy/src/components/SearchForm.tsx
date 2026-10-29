import { AnimatePresence, motion } from 'framer-motion'
import { Building2, ChevronDown, Clock3, MapPin, Search, TrendingUp, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cities, hotels } from '../data/hotels'
import type { SearchParams } from '../data/types'
import { parseISODate } from '../lib/format'
import { searchToQuery } from '../lib/search'
import DateRangeCalendar from './DateRangeCalendar'
import { Stepper } from './ui'

interface Props {
  initial: SearchParams
  layout?: 'row' | 'stack'
  onDone?: () => void
  /** Price filter already applied, e.g. "1500-2500". */
  initialPrice?: string
}

interface Suggestion {
  label: string
  sub: string
  value: string
  kind: 'city' | 'area' | 'hotel'
}

export const priceRanges = [
  { v: '0-1500', l: '₹0-₹1500' },
  { v: '1500-2500', l: '₹1500-₹2500' },
  { v: '2500-5000', l: '₹2500-₹5000' },
  { v: '5000-100000', l: '₹5000+' },
]

/** On phones, bring an opened popover into view. */
const reveal = (el: HTMLElement | null) => {
  if (el && window.innerWidth < 1024) setTimeout(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60)
}

const RECENT = 'stayeasy.recent.searches'
const readRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT) || '[]')
  } catch {
    return []
  }
}
const saveRecent = (city: string) => {
  if (!city) return
  try {
    localStorage.setItem(RECENT, JSON.stringify([city, ...readRecent().filter((c) => c !== city)].slice(0, 4)))
  } catch {
    /* ignore */
  }
}

const trending = ['Goa', 'New Delhi', 'Bengaluru', 'Mumbai']

function useSuggestions(query: string): Suggestion[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    const all: Suggestion[] = [
      ...cities.map((c) => ({ label: c.name, sub: 'City · India', value: c.name, kind: 'city' as const })),
      ...Array.from(new Set(hotels.map((h) => `${h.area}|${h.city}`))).map((k) => {
        const [area, city] = k.split('|')
        return { label: area, sub: `Area in ${city}`, value: area, kind: 'area' as const }
      }),
      ...hotels.map((h) => ({ label: h.name, sub: `${h.area}, ${h.city}`, value: h.name, kind: 'hotel' as const })),
    ]
    if (!q) return []
    return all.filter((s) => s.label.toLowerCase().includes(q) || s.sub.toLowerCase().includes(q)).slice(0, 8)
  }, [query])
}

type Pop = 'city' | 'dates' | 'guests' | 'price' | null

export default function SearchForm({ initial, layout = 'row', onDone, initialPrice = '' }: Props) {
  const navigate = useNavigate()
  const [s, setS] = useState<SearchParams>(initial)
  const [group, setGroup] = useState(initial.rooms > 4)
  const [price, setPrice] = useState(initialPrice)
  const [pop, setPop] = useState<Pop>(null)
  const [editing, setEditing] = useState<'in' | 'out'>('in')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const [recent, setRecent] = useState<string[]>(readRecent)
  const id = useId()
  const wrap = useRef<HTMLFormElement>(null)
  const queryRef = useRef<HTMLInputElement>(null)
  const suggestions = useSuggestions(query)

  useEffect(() => {
    if (!pop) return
    const close = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setPop(null)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPop(null)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [pop])

  useEffect(() => {
    if (pop === 'city') setTimeout(() => queryRef.current?.focus(), 30)
  }, [pop])

  const pickCity = (v: string) => {
    setS((p) => ({ ...p, city: v }))
    setQuery('')
    setActive(-1)
    setEditing('in')
    setPop('dates')
  }

  const setMode = (g: boolean) => {
    setGroup(g)
    setS((p) => {
      const rooms = g ? Math.max(5, p.rooms) : Math.min(4, p.rooms)
      return { ...p, rooms, adults: Math.max(rooms, Math.min(p.adults, rooms * 3)) }
    })
  }

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    setPop(null)
    saveRecent(s.city)
    setRecent(readRecent())
    navigate(`/hotels?${searchToQuery(s, price ? { price } : {})}`)
    onDone?.()
  }

  const day = (iso: string) => parseISODate(iso)
  const bigDate = (iso: string) => (
    <>
      <span className="text-[30px] leading-none font-black">{day(iso).getDate()}</span>{' '}
      <span className="text-lg font-bold">
        {day(iso).toLocaleDateString('en-GB', { month: 'short' })}’{String(day(iso).getFullYear()).slice(2)}
      </span>
    </>
  )
  const weekday = (iso: string) => day(iso).toLocaleDateString('en-IN', { weekday: 'long' })
  const cityInfo = cities.find((c) => c.name === s.city)
  const hotelInfo = hotels.find((h) => h.name === s.city || h.area === s.city)
  const priceLabel = priceRanges.find((p) => p.v === price)?.l
  const stack = layout === 'stack'

  const cell = (on: boolean, extra = '') =>
    `relative flex min-h-[96px] w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors ${on ? 'bg-[#EAF1FF]' : 'hover:bg-[#F6F8FD]'} ${extra}`
  const cap = 'flex items-center gap-1 text-[13px] font-bold text-ink-700'

  return (
    <form ref={wrap} onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <div role="radiogroup" aria-label="Booking size" className="flex items-center gap-4">
          {[
            { g: false, l: 'Upto 4 Rooms' },
            { g: true, l: 'Group Deals' },
          ].map((o) => (
            <label key={o.l} className="flex cursor-pointer items-center gap-1.5 font-bold">
              <input type="radio" name={`${id}-mode`} checked={group === o.g} onChange={() => setMode(o.g)} className="h-4 w-4 accent-navy-800" />
              {o.l}
              {o.g && <span className="rounded bg-ember-600 px-1.5 py-px text-[10px] font-black text-white uppercase">new</span>}
            </label>
          ))}
        </div>
        <span className="hidden text-ink-500 md:inline">
          {group ? '5 or more rooms are group bookings, confirmed by the hotel with group rates.' : 'Book stays across India · free cancellation · pay at hotel'}
        </span>
      </div>

      <div className={`relative grid rounded-2xl border border-line-strong ${stack ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1.15fr_1.15fr]'}`}>
        {/* Where */}
        <div className={`relative col-span-2 border-b border-line-strong ${stack ? '' : 'lg:col-span-1 lg:border-r lg:border-b-0'}`}>
          <button type="button" aria-haspopup="dialog" aria-expanded={pop === 'city'} onClick={() => setPop(pop === 'city' ? null : 'city')} className={cell(pop === 'city', 'rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none')}>
            <span className={cap}>City, Property Name Or Location</span>
            <span className={`truncate text-[26px] leading-tight font-black ${s.city ? 'text-ink-900' : 'text-ink-400'}`}>{s.city || 'Where to?'}</span>
            <span className="text-[13px] text-ink-500">{cityInfo ? 'India' : hotelInfo ? `${hotelInfo.area}, ${hotelInfo.city}` : s.city ? 'Search' : 'All cities'}</span>
          </button>
          <AnimatePresence>
            {pop === 'city' && (
              <motion.div
                role="dialog"
                ref={reveal}
                aria-label="Choose a location"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-3 left-2 z-40 w-[min(430px,calc(100vw-48px))] overflow-hidden rounded-xl border border-line bg-white shadow-float"
              >
                <div className="flex items-center gap-2 border-b border-line px-3">
                  <Search className="h-5 w-5 text-ink-400" aria-hidden="true" />
                  <input
                    ref={queryRef}
                    role="combobox"
                    aria-expanded={suggestions.length > 0}
                    aria-controls={`${id}-list`}
                    aria-autocomplete="list"
                    autoComplete="off"
                    placeholder="Where do you want to stay?"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setActive(-1)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setActive((a) => Math.min(a + 1, suggestions.length - 1))
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setActive((a) => Math.max(a - 1, -1))
                      } else if (e.key === 'Enter') {
                        e.preventDefault()
                        if (active >= 0) pickCity(suggestions[active].value)
                        else if (query.trim()) pickCity(query.trim())
                      }
                    }}
                    className="h-12 flex-1 text-base outline-none placeholder:text-ink-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      setS((p) => ({ ...p, city: '' }))
                      queryRef.current?.focus()
                    }}
                    className="px-1 text-xs font-black tracking-wide text-ink-400 hover:text-navy-800"
                  >
                    CLEAR
                  </button>
                </div>
                <ul id={`${id}-list`} role="listbox" className="max-h-80 overflow-auto py-1.5">
                  {query.trim() ? (
                    <>
                      <li role="option" aria-selected={active === -1} onMouseDown={(e) => (e.preventDefault(), pickCity(query.trim()))} className="cursor-pointer px-4 py-2 text-sm text-ink-700 hover:bg-mist">
                        Search: <strong>“{query.trim()}”</strong>
                      </li>
                      {suggestions.map((sg, i) => (
                        <li
                          key={sg.label + sg.sub}
                          role="option"
                          aria-selected={i === active}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            pickCity(sg.value)
                          }}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${i === active ? 'bg-navy-50' : 'hover:bg-mist'}`}
                        >
                          {sg.kind === 'hotel' ? <Building2 className="h-4 w-4 text-ink-400" aria-hidden="true" /> : <MapPin className="h-4 w-4 text-ink-400" aria-hidden="true" />}
                          <span>
                            <span className="block font-bold">{sg.label}</span>
                            <span className="block text-xs text-ink-500">{sg.sub}</span>
                          </span>
                        </li>
                      ))}
                    </>
                  ) : (
                    <>
                      {recent.length > 0 && (
                        <>
                          <li className="px-4 pt-1.5 pb-1 text-[11px] font-black tracking-wider text-ink-400 uppercase">Recent searches</li>
                          {recent.map((c) => (
                            <li key={`r-${c}`} role="option" aria-selected={false} onMouseDown={(e) => (e.preventDefault(), pickCity(c))} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-mist">
                              <Clock3 className="h-4 w-4 text-ink-400" aria-hidden="true" />
                              <span className="font-semibold">{c}</span>
                            </li>
                          ))}
                        </>
                      )}
                      <li className="px-4 pt-1.5 pb-1 text-[11px] font-black tracking-wider text-ink-400 uppercase">Suggestions</li>
                      {cities.map((c) => (
                        <li key={c.name} role="option" aria-selected={false} onMouseDown={(e) => (e.preventDefault(), pickCity(c.name))} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-mist">
                          <TrendingUp className="h-4 w-4 text-leaf-700" aria-hidden="true" />
                          <span className="font-semibold">{c.name}</span>
                        </li>
                      ))}
                    </>
                  )}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dates */}
        {(['in', 'out'] as const).map((k) => {
          const iso = k === 'in' ? s.checkIn : s.checkOut
          return (
            <div key={k} className={`border-line-strong ${k === 'in' ? 'border-r' : ''} border-b ${stack ? '' : 'lg:border-r lg:border-b-0'}`}>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={pop === 'dates' && editing === k}
                onClick={() => {
                  setEditing(k)
                  setPop('dates')
                }}
                className={cell(pop === 'dates' && editing === k)}
              >
                <span className={cap}>
                  {k === 'in' ? 'Check-In' : 'Check-Out'} <ChevronDown className="h-4 w-4 text-navy-800" aria-hidden="true" />
                </span>
                <span className="text-ink-900">{bigDate(iso)}</span>
                <span className="text-[13px] text-ink-500">{weekday(iso)}</span>
              </button>
            </div>
          )
        })}
        <AnimatePresence>
          {pop === 'dates' && (
            <motion.div
              role="dialog"
              ref={reveal}
                aria-label="Choose dates"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className={`absolute top-[calc(100%+8px)] left-0 z-40 w-full max-w-[780px] rounded-xl border border-line bg-white shadow-float ${stack ? '' : 'lg:left-[18%]'}`}
            >
              <DateRangeCalendar
                checkIn={s.checkIn}
                checkOut={s.checkOut}
                editing={editing}
                onEditing={setEditing}
                onChange={(checkIn, checkOut) => setS((p) => ({ ...p, checkIn, checkOut }))}
                onDone={() => setPop('guests')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rooms & guests */}
        <div className={`relative border-r border-line-strong ${stack ? '' : 'lg:border-r'}`}>
          <button type="button" aria-haspopup="dialog" aria-expanded={pop === 'guests'} onClick={() => setPop(pop === 'guests' ? null : 'guests')} className={cell(pop === 'guests', 'rounded-bl-2xl lg:rounded-none')}>
            <span className={cap}>
              Rooms &amp; Guests <ChevronDown className="h-4 w-4 text-navy-800" aria-hidden="true" />
            </span>
            <span className="whitespace-nowrap text-ink-900">
              <span className="text-[24px] leading-none font-black sm:text-[30px]">{s.rooms}</span> <span className="text-base font-bold sm:text-lg">{s.rooms === 1 ? 'Room' : 'Rooms'}</span>{' '}
              <span className="text-[24px] leading-none font-black sm:text-[30px]">{s.adults}</span> <span className="text-base font-bold sm:text-lg">Adults</span>
            </span>
            <span className="text-[13px] text-ink-500">{s.children ? `${s.children} children` : 'No children'}</span>
          </button>
          <AnimatePresence>
            {pop === 'guests' && (
              <motion.div
                role="dialog"
                ref={reveal}
                aria-label="Rooms and guests"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-[calc(100%+8px)] left-0 z-40 w-[min(320px,calc(100vw-48px))] rounded-xl border border-line bg-white p-4 shadow-float"
              >
                <Stepper
                  label="Rooms"
                  hint={group ? 'Group booking: 5 to 8 rooms' : 'Up to 4 rooms'}
                  value={s.rooms}
                  min={group ? 5 : 1}
                  max={group ? 8 : 4}
                  onChange={(n) => setS({ ...s, rooms: n, adults: Math.max(s.adults, n) })}
                />
                <Stepper label="Adults" hint="13 years and above" value={s.adults} min={s.rooms} max={s.rooms * 3} onChange={(n) => setS({ ...s, adults: n })} />
                <Stepper label="Children" hint="0–12 years" value={s.children} min={0} max={s.rooms * 2} onChange={(n) => setS({ ...s, children: n })} />
                <button type="button" className="btn-navy mt-2 w-full" onClick={() => setPop('price')}>
                  Apply
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Price per night */}
        <div className="relative">
          <button type="button" aria-haspopup="listbox" aria-expanded={pop === 'price'} onClick={() => setPop(pop === 'price' ? null : 'price')} className={cell(pop === 'price', 'rounded-br-2xl lg:rounded-r-2xl')}>
            <span className={cap}>Price Per Night</span>
            <span className={`block w-full truncate text-lg font-bold ${priceLabel ? 'text-ink-900' : 'text-ink-400'}`}>{priceLabel ?? '₹0-₹1500, ₹1500-₹2500,…'}</span>
          </button>
          {priceLabel && (
            <button type="button" onClick={() => setPrice('')} className="absolute bottom-2.5 left-4 flex items-center gap-1 text-[13px] text-ink-500 hover:text-ember-600">
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Any price
            </button>
          )}
          <AnimatePresence>
            {pop === 'price' && (
              <motion.ul
                role="listbox"
                ref={reveal}
                aria-label="Price per night"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-[calc(100%+8px)] right-0 z-40 w-[min(240px,calc(100vw-48px))] overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-float"
              >
                {[{ v: '', l: 'Any price' }, ...priceRanges].map((p) => (
                  <li
                    key={p.v}
                    role="option"
                    aria-selected={price === p.v}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setPrice(p.v)
                      setPop(null)
                    }}
                    className={`cursor-pointer px-4 py-2.5 text-[15px] ${price === p.v ? 'bg-[#EAF1FF] font-bold text-navy-800' : 'hover:bg-mist'}`}
                  >
                    {p.l}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-[13px]">
        <span className="font-bold text-ink-700">Trending Searches:</span>
        {trending.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setS((p) => ({ ...p, city: t }))
              setPop(null)
            }}
            className="rounded-md bg-mist px-3 py-1.5 text-ink-700 hover:bg-navy-100 hover:text-navy-800"
          >
            {t}, India
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button type="submit" className="btn-primary h-[52px] min-w-[220px] rounded-full text-xl font-black tracking-wide uppercase shadow-[0_8px_20px_rgba(194,65,12,0.35)]">
          <Search className="h-5 w-5" aria-hidden="true" /> Search
        </button>
      </div>
    </form>
  )
}
