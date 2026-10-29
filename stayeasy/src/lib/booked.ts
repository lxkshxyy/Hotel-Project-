import type { Booking } from '../data/types'

/** Rooms already taken per night, from a list of bookings for one room type. */
export function bookedNights(list: Pick<Booking, 'status' | 'check_in' | 'check_out' | 'rooms'>[]) {
  const m: Record<string, number> = {}
  for (const b of list) {
    if (b.status === 'cancelled') continue
    for (let d = b.check_in; d < b.check_out; ) {
      m[d] = (m[d] ?? 0) + b.rooms
      const x = new Date(d + 'T00:00:00')
      x.setDate(x.getDate() + 1)
      d = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    }
  }
  return m
}
