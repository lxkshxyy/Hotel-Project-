import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet'
import type { Hotel } from '../../data/types'
import { landmarkKinds, type Landmark } from '../../data/landmarks'
import { inr } from '../../lib/format'

export interface MapPoint extends Landmark {
  km: number
}

interface Props {
  hotel: Hotel
  landmarks: MapPoint[]
  nearbyHotels: Hotel[]
  focus: { lat: number; lng: number; name: string } | null
  interactive: boolean
}

const pin = (bg: string, size = 30, label = '') =>
  L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    html: `<div style="width:${size}px;height:${size}px;background:${bg};border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 10px rgba(11,31,74,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font:900 ${size / 2.4}px Lato,sans-serif">${label}</span></div>`,
  })

const priceTag = (text: string) =>
  L.divIcon({
    className: '',
    iconSize: [70, 26],
    iconAnchor: [35, 26],
    html: `<div style="background:#fff;color:#14306B;border:1px solid #C9D2E3;border-radius:999px;padding:3px 9px;font:900 12px Lato,sans-serif;white-space:nowrap;box-shadow:0 3px 8px rgba(11,31,74,.2);text-align:center">${text}</div>`,
  })

function Fit({ hotel, points, focus }: { hotel: Hotel; points: { lat: number; lng: number }[]; focus: Props['focus'] }) {
  const map = useMap()
  const first = useRef(true)
  // Re-fit only when the pins really change (the points array is rebuilt on every render).
  const key = JSON.stringify([hotel.lat, hotel.lng, focus?.lat, focus?.lng, ...points.map((p) => [p.lat, p.lng])])
  useEffect(() => {
    const all: [number, number][] = [[hotel.lat, hotel.lng], ...points.map((p) => [p.lat, p.lng] as [number, number])]
    if (focus) all.push([focus.lat, focus.lng])
    // No animation for the first fit: leaving the page mid-animation made Leaflet throw
    // "Cannot read properties of undefined (reading '_leaflet_pos')".
    const animate = !first.current
    first.current = false
    if (all.length === 1) map.setView(all[0], 15, { animate })
    else map.fitBounds(L.latLngBounds(all), { padding: [40, 40], maxZoom: 15, animate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
  return null
}

function Interaction({ on }: { on: boolean }) {
  const map = useMap()
  useEffect(() => {
    const h = [map.dragging, map.scrollWheelZoom, map.doubleClickZoom, map.touchZoom, map.boxZoom, map.keyboard]
    h.forEach((x) => (on ? x.enable() : x.disable()))
  }, [map, on])
  return null
}

/** OpenStreetMap map of the hotel with chosen landmarks and nearby StayEasy hotels. */
export default function HotelMap({ hotel, landmarks, nearbyHotels, focus, interactive }: Props) {
  const color = useMemo(() => Object.fromEntries(landmarkKinds.map((k) => [k.kind, k.color])), [])
  return (
    <MapContainer center={[hotel.lat, hotel.lng]} zoom={15} zoomControl={false} className="h-full w-full" attributionControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />
      <Interaction on={interactive} />
      <Fit hotel={hotel} points={[...landmarks, ...nearbyHotels]} focus={focus} />
      <Marker position={[hotel.lat, hotel.lng]} icon={pin('#C2410C', 38, 'S')} zIndexOffset={1000}>
        <Popup>
          <strong>{hotel.name}</strong>
          <br />
          {hotel.area}, {hotel.city}
        </Popup>
      </Marker>
      {landmarks.map((l) => (
        <Marker key={l.name} position={[l.lat, l.lng]} icon={pin(color[l.kind], 26)}>
          <Popup>
            <strong>{l.name}</strong>
            <br />
            {l.note} · {l.km < 1 ? `${Math.round(l.km * 1000)} m` : `${l.km.toFixed(1)} km`} away
          </Popup>
        </Marker>
      ))}
      {nearbyHotels.map((h) => (
        <Marker key={h.slug} position={[h.lat, h.lng]} icon={priceTag(inr(Math.min(...h.rooms.map((r) => r.price))))}>
          <Popup>
            <a href={`/hotel/${h.slug}`}>
              <strong>{h.name}</strong>
            </a>
            <br />
            {h.area} · {h.rating} ★
          </Popup>
        </Marker>
      ))}
      {focus && (
        <>
          <Marker position={[focus.lat, focus.lng]} icon={pin('#0B1F4A', 30, '•')}>
            <Popup>{focus.name}</Popup>
          </Marker>
          <Polyline positions={[[hotel.lat, hotel.lng], [focus.lat, focus.lng]]} pathOptions={{ color: '#14306B', weight: 3, dashArray: '6 8' }} />
        </>
      )}
    </MapContainer>
  )
}
