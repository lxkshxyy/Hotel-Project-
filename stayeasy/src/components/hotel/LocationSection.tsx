import { ChevronDown, Landmark as LandmarkIcon, MapPin, Navigation, Search, TrainFront, Utensils, Camera } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { hotels } from '../../data/hotels'
import { distanceKm, kmLabel, landmarkKinds, landmarksNear, type LandmarkKind } from '../../data/landmarks'
import type { Hotel } from '../../data/types'

const HotelMap = lazy(() => import('./HotelMap'))

const kindIcon = { key: MapPin, attraction: Camera, transport: TrainFront, restaurant: Utensils } as const

export default function LocationSection({ hotel }: { hotel: Hotel }) {
  const near = useMemo(() => landmarksNear(hotel.city, hotel.lat, hotel.lng), [hotel])
  const [open, setOpen] = useState<LandmarkKind | null>('key')
  const [checked, setChecked] = useState<string[]>(() => {
    const close = near.filter((l) => l.kind === 'key' && l.km <= 5).slice(0, 3)
    return (close.length ? close : near.filter((l) => l.kind === 'key').slice(0, 1)).map((l) => l.name)
  })
  const [showHotels, setShowHotels] = useState(false)
  const [interactive, setInteractive] = useState(false)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [focus, setFocus] = useState<{ lat: number; lng: number; name: string; km: number } | null>(null)
  const [msg, setMsg] = useState('')

  const shown = near.filter((l) => checked.includes(l.name))
  const others = showHotels ? hotels.filter((h) => h.city === hotel.city && h.slug !== hotel.slug) : []
  const toggle = (name: string) => setChecked((c) => (c.includes(name) ? c.filter((x) => x !== name) : [...c, name]))
  const directions = (lat: number, lng: number) =>
    `https://www.google.com/maps/dir/?api=1&origin=${hotel.lat},${hotel.lng}&destination=${lat},${lng}`

  const findPlace = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = q.trim()
    if (!text) return
    setMsg('')
    const local = near.find((l) => l.name.toLowerCase().includes(text.toLowerCase()))
    if (local) {
      setFocus({ lat: local.lat, lng: local.lng, name: local.name, km: local.km })
      setInteractive(true)
      return
    }
    setBusy(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(`${text}, ${hotel.city}`)}`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      const data = (await res.json()) as { lat: string; lon: string; display_name: string }[]
      if (!data.length) {
        setMsg(`Couldn’t find “${text}” in ${hotel.city}. Try a nearby landmark or area name.`)
        return
      }
      const lat = Number(data[0].lat)
      const lng = Number(data[0].lon)
      setFocus({ lat, lng, name: data[0].display_name.split(',').slice(0, 2).join(','), km: distanceKm(hotel.lat, hotel.lng, lat, lng) })
      setInteractive(true)
    } catch {
      setMsg('Place search is unavailable right now. Pick a landmark from the list instead.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="location" className="card scroll-mt-40 overflow-hidden">
      <h2 className="px-5 pt-5 text-xl font-bold text-navy-800 sm:px-6">Location</h2>
      <p className="px-5 text-sm text-ink-500 sm:px-6">
        {hotel.address} · {hotel.distance}
      </p>
      <div className="mt-4 flex flex-col border-t border-line md:flex-row">
        <div className="relative isolate h-[340px] bg-[#E3EAE3] md:h-[440px] md:flex-[2.2]">
          <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-ink-500">Loading map…</div>}>
            <HotelMap hotel={hotel} landmarks={shown} nearbyHotels={others} focus={focus} interactive={interactive} />
          </Suspense>
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-wrap gap-2">
            <form onSubmit={findPlace} className="pointer-events-auto flex min-w-0 flex-[1_1_260px] items-center gap-2 rounded-lg border border-line bg-white px-3 shadow-sm">
              <Search className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
              <label className="sr-only" htmlFor="dist-q">
                Search distance from any location
              </label>
              <input
                id="dist-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search distance from any location in ${hotel.city}`}
                className="h-10 min-w-0 flex-1 text-sm outline-none"
              />
              <button type="submit" disabled={busy} className="text-xs font-black text-navy-800 disabled:opacity-50">
                {busy ? '…' : 'GO'}
              </button>
            </form>
            <label className="pointer-events-auto flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold shadow-sm">
              <input type="checkbox" checked={showHotels} onChange={(e) => setShowHotels(e.target.checked)} className="h-4 w-4 accent-navy-800" />
              Show nearby properties
            </label>
          </div>
          {!interactive && (
            <button
              type="button"
              onClick={() => setInteractive(true)}
              className="absolute top-1/2 left-1/2 z-[500] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-lg border-2 border-navy-800 bg-white px-4 py-2 text-sm font-black text-navy-800 shadow-card"
            >
              Click to view map <MapPin className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {(focus || msg) && (
            <div className="absolute inset-x-3 bottom-3 z-[500] rounded-lg bg-white px-3 py-2 text-sm shadow-card">
              {focus ? (
                <span>
                  <strong>{focus.name}</strong> is {kmLabel(focus.km)} from {hotel.name} (straight line).{' '}
                  <a href={directions(focus.lat, focus.lng)} target="_blank" rel="noreferrer" className="font-bold">
                    Directions →
                  </a>
                </span>
              ) : (
                <span className="text-ember-700">{msg}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex max-h-[440px] flex-col overflow-y-auto border-t border-line md:flex-1 md:border-t-0 md:border-l">
          {landmarkKinds.map(({ kind, label, color }) => {
            const items = near.filter((l) => l.kind === kind)
            if (!items.length) return null
            const Icon = kind === 'key' ? LandmarkIcon : kindIcon[kind]
            const isOpen = open === kind
            return (
              <div key={kind} className="border-b border-line">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : kind)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${isOpen ? 'text-navy-800' : 'text-ink-700'}`}
                >
                  <Icon className="h-5 w-5" style={{ color }} aria-hidden="true" />
                  <span className="flex-1 text-[17px] font-bold">{label}</span>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {isOpen && (
                  <ul className="flex flex-col pb-2">
                    {items.map((l) => (
                      <li key={l.name} className="flex items-start gap-3 border-t border-[#EEF1F6] px-4 py-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Show ${l.name} on map`}
                          checked={checked.includes(l.name)}
                          onChange={() => toggle(l.name)}
                          className="mt-1 h-4 w-4 shrink-0 accent-navy-800"
                        />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <strong className="text-[15px] leading-snug">{l.name}</strong>
                          <span className="text-xs text-ink-500">{l.note}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <a
                            href={directions(l.lat, l.lng)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Directions to ${l.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF1FF] text-navy-800"
                          >
                            <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                          <span className="text-xs font-semibold text-ink-700">{kmLabel(l.km)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
          <a
            className="px-4 py-3 text-sm font-bold no-underline"
            href={`https://www.google.com/maps/dir/?api=1&destination=${hotel.lat},${hotel.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            Get directions to the hotel →
          </a>
        </div>
      </div>
    </section>
  )
}
