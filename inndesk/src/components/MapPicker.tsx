import L from 'leaflet'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

/** A brass key-tag pin, so the map matches InnDesk without Leaflet's image files. */
const pin = L.divIcon({
  className: '',
  html: '<svg width="34" height="46" viewBox="0 0 34 46" aria-hidden="true"><path d="M17 45C17 45 33 27 33 16.5A16 16 0 0 0 1 16.5C1 27 17 45 17 45z" fill="#C8962E" stroke="#12372A" stroke-width="2"/><circle cx="17" cy="16" r="5.5" fill="#12372A"/></svg>',
  iconSize: [34, 46],
  iconAnchor: [17, 45],
})

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], zoom)
  }, [lat, lng, zoom, map])
  return null
}

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function MapPicker({
  lat,
  lng,
  fallback,
  query,
  onChange,
}: {
  lat?: number
  lng?: number
  fallback: { lat: number; lng: number }
  /** Address text used by “Find on map”. */
  query: string
  onChange: (lat: number, lng: number) => void
}) {
  const has = lat != null && lng != null
  const [view, setView] = useState({ lat: has ? lat! : fallback.lat, lng: has ? lng! : fallback.lng, zoom: has ? 17 : 12 })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  // Follow city changes until the owner has placed the pin.
  useEffect(() => {
    if (!has) setView({ lat: fallback.lat, lng: fallback.lng, zoom: 12 })
  }, [fallback.lat, fallback.lng, has])

  const find = async () => {
    if (query.trim().length < 6) return setMsg('Fill in the address and area first.')
    setBusy(true)
    setMsg('')
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`, { headers: { 'Accept-Language': 'en' } })
      const rows = (await r.json()) as { lat: string; lon: string }[]
      if (!rows.length) {
        setMsg('Couldn’t find that address. Zoom in and tap your entrance instead.')
        return
      }
      const la = Number(rows[0].lat)
      const lo = Number(rows[0].lon)
      setView({ lat: la, lng: lo, zoom: 17 })
      onChange(la, lo)
      setMsg('Pin placed near the address. Drag it onto your entrance if it’s off.')
    } catch {
      setMsg('Map search isn’t reachable right now. Tap your entrance on the map instead.')
    } finally {
      setBusy(false)
    }
  }

  const events = useMemo(() => ({ dragend: (e: L.LeafletEvent) => {
    const p = (e.target as L.Marker).getLatLng()
    onChange(p.lat, p.lng)
  } }), [onChange])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-ink-500">Tap the map where your entrance is, or drag the pin.</span>
        <button type="button" onClick={find} disabled={busy} className="btn-ghost min-h-10 text-sm">
          <Search className="h-4 w-4" aria-hidden="true" /> {busy ? 'Searching…' : 'Find my address'}
        </button>
      </div>
      <div className="h-[320px] overflow-hidden rounded-xl border border-line-strong">
        <MapContainer center={[view.lat, view.lng]} zoom={view.zoom} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Recenter {...view} />
          <ClickToPlace onPick={(a, b) => onChange(a, b)} />
          {has && <Marker position={[lat!, lng!]} icon={pin} draggable eventHandlers={events} />}
        </MapContainer>
      </div>
      <span role="status" className="text-[13px] text-ink-500">
        {msg || (has ? `Pin set at ${lat!.toFixed(5)}, ${lng!.toFixed(5)}.` : 'No pin yet.')}
      </span>
    </div>
  )
}
