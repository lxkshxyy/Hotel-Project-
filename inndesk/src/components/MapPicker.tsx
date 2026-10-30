import L from 'leaflet'
import { LocateFixed } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { site } from '../config/site'

/*
 * Live map for the Location step, plus the address search behind it.
 * Map tiles and address search are free OpenStreetMap-based services set in config/site.ts
 * (site.map). For heavy traffic, swap them for a paid provider such as Google Maps or Ola Maps there.
 */

const pin = L.divIcon({
  className: '',
  html: '<svg width="34" height="46" viewBox="0 0 34 46" aria-hidden="true"><path d="M17 45C17 45 33 27 33 16.5A16 16 0 0 0 1 16.5C1 27 17 45 17 45z" fill="#C8962E" stroke="#12372A" stroke-width="2"/><circle cx="17" cy="16" r="5.5" fill="#12372A"/></svg>',
  iconSize: [34, 46],
  iconAnchor: [17, 45],
})

export interface Place {
  label: string
  lat: number
  lng: number
  house: string
  locality: string
  pincode: string
  city: string
  state: string
  country: string
}

type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: Record<string, string | undefined>
}

function toPlace(f: PhotonFeature): Place {
  const p = f.properties
  const [lng, lat] = f.geometry.coordinates
  const house = [p.housenumber, p.name && p.name !== p.street ? p.name : ''].filter(Boolean).join(', ')
  const locality = [p.street, p.locality, p.district !== p.city ? p.district : ''].filter(Boolean).join(', ')
  const city = p.city || p.county || p.district || ''
  return {
    label: [house, locality, city, p.state, p.postcode].filter(Boolean).join(', '),
    lat,
    lng,
    house,
    locality,
    pincode: (p.postcode ?? '').replace(/\D/g, '').slice(0, 6),
    city,
    state: p.state ?? '',
    country: p.country ?? 'India',
  }
}

/** Address suggestions as the owner types (India only, biased to the current map view). */
export async function searchPlaces(q: string, near?: { lat: number; lng: number }, signal?: AbortSignal): Promise<Place[]> {
  const bias = near ? `&lat=${near.lat}&lon=${near.lng}` : ''
  const r = await fetch(`${site.map.geocoder}/api/?q=${encodeURIComponent(q)}&limit=8&lang=en${bias}`, { signal })
  if (!r.ok) throw new Error('search failed')
  const data = (await r.json()) as { features: PhotonFeature[] }
  return data.features.filter((f) => (f.properties.countrycode ?? '').toUpperCase() === 'IN').slice(0, 5).map(toPlace)
}

/** The address at a point (used by “Use my current location”). */
export async function placeAt(lat: number, lng: number): Promise<Place | null> {
  const r = await fetch(`${site.map.geocoder}/reverse?lat=${lat}&lon=${lng}&lang=en`)
  if (!r.ok) return null
  const data = (await r.json()) as { features: PhotonFeature[] }
  return data.features[0] ? { ...toPlace(data.features[0]), lat, lng } : null
}

function Follow({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.6 })
  }, [lat, lng, zoom, map])
  return null
}

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function MapPicker({ lat, lng, onPin, onLocate, locating }: { lat?: number; lng?: number; onPin: (lat: number, lng: number) => void; onLocate: () => void; locating: boolean }) {
  const has = lat != null && lng != null
  const view = has ? { lat: lat!, lng: lng!, zoom: 17 } : { ...site.map.start, zoom: 5 }
  const events = useMemo(
    () => ({
      dragend: (e: L.LeafletEvent) => {
        const p = (e.target as L.Marker).getLatLng()
        onPin(p.lat, p.lng)
      },
    }),
    [onPin],
  )
  return (
    <div className="relative h-[360px] overflow-hidden rounded-lg border border-line-strong sm:h-[460px] lg:h-[560px]">
      <MapContainer center={[view.lat, view.lng]} zoom={view.zoom} zoomControl={false} className="h-full w-full">
        <TileLayer attribution={site.map.attribution} url={site.map.tiles} />
        <ZoomControl position="bottomright" />
        <Follow {...view} />
        <ClickToPlace onPick={onPin} />
        {has && <Marker position={[lat!, lng!]} icon={pin} draggable eventHandlers={events} />}
      </MapContainer>
      <button type="button" onClick={onLocate} disabled={locating} aria-label="Use my current location" title="Use my current location" className="absolute right-[10px] bottom-[86px] z-[500] flex h-[34px] w-[34px] items-center justify-center rounded border-2 border-black/20 bg-white text-ink-900 hover:bg-paper disabled:opacity-60">
        <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} aria-hidden="true" />
      </button>
      {!has && <span className="pointer-events-none absolute inset-x-0 top-3 z-[500] mx-auto w-fit rounded-full bg-white/95 px-3 py-1 text-[13px] font-semibold text-ink-700 shadow">Search your address or tap the map</span>}
    </div>
  )
}
