import type { SearchParams } from '../data/types'
import { addDays, todayISO } from './format'

export function defaultSearch(): SearchParams {
  const checkIn = addDays(todayISO(), 1)
  return { city: '', checkIn, checkOut: addDays(checkIn, 1), rooms: 1, adults: 2, children: 0 }
}

/** Read search params from a URL query, falling back to sensible defaults. */
export function readSearch(q: URLSearchParams): SearchParams {
  const d = defaultSearch()
  const checkIn = q.get('in') || d.checkIn
  let checkOut = q.get('out') || addDays(checkIn, 1)
  if (checkOut <= checkIn) checkOut = addDays(checkIn, 1)
  const int = (k: string, fallback: number, min: number, max: number) => {
    const n = Number(q.get(k))
    return Number.isFinite(n) && n >= min ? Math.min(n, max) : fallback
  }
  return {
    city: q.get('city') || '',
    checkIn,
    checkOut,
    rooms: int('rooms', d.rooms, 1, 8),
    adults: int('adults', d.adults, 1, 24),
    children: int('children', 0, 0, 12),
  }
}

export function searchToQuery(s: SearchParams, extra: Record<string, string> = {}) {
  const q = new URLSearchParams()
  if (s.city) q.set('city', s.city)
  q.set('in', s.checkIn)
  q.set('out', s.checkOut)
  q.set('rooms', String(s.rooms))
  q.set('adults', String(s.adults))
  if (s.children) q.set('children', String(s.children))
  for (const [k, v] of Object.entries(extra)) q.set(k, v)
  return q.toString()
}

export const guestsLabel = (s: Pick<SearchParams, 'rooms' | 'adults' | 'children'>) => {
  const g = s.adults + s.children
  return `${s.rooms} room${s.rooms > 1 ? 's' : ''}, ${g} guest${g > 1 ? 's' : ''}`
}
