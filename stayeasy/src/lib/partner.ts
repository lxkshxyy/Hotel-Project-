import type { Booking, Hotel } from '../data/types'

/*
 * Partner hotels listed by their owners through the InnDesk panel.
 * On your computer they come from the local publish channel (see partner-bridge.ts).
 * On the live site they are rows in the Supabase `hotels` table, so this returns nothing there.
 */

const CHANNEL = '/__partner'

export async function fetchPartnerHotels(): Promise<Hotel[]> {
  try {
    const r = await fetch(`${CHANNEL}/listings`, { headers: { accept: 'application/json' } })
    // On a static host this path returns the HTML app shell, not JSON.
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return []
    const rows = (await r.json()) as { published: boolean; hotel: Hotel }[]
    return rows.filter((x) => x.published && x.hotel?.slug && x.hotel.rooms?.length).map((x) => x.hotel)
  } catch {
    return []
  }
}

/** Tell the hotel's InnDesk panel about a booking or cancellation (local mode only). */
export function reportPartnerBooking(b: Booking) {
  fetch(`${CHANNEL}/bookings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).catch(() => {
    /* panel channel offline: the booking itself is already saved */
  })
}
