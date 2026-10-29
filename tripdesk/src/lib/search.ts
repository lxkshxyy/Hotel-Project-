import { addDays, todayISO } from '@stayeasy/lib/format'

export interface Search {
  city: string
  checkIn: string
  checkOut: string
  rooms: number
  adults: number
  children: number
}

export function readSearch(p: URLSearchParams): Search {
  const today = todayISO()
  const checkIn = p.get('in') && p.get('in')! >= today ? p.get('in')! : addDays(today, 7)
  const out = p.get('out')
  const checkOut = out && out > checkIn ? out : addDays(checkIn, 1)
  const n = (k: string, d: number, min: number, max: number) => Math.min(max, Math.max(min, Number(p.get(k)) || d))
  return { city: p.get('city') ?? '', checkIn, checkOut, rooms: n('rooms', 1, 1, 8), adults: n('adults', 2, 1, 30), children: Math.min(10, Math.max(0, Number(p.get('children')) || 0)) }
}

export const toQuery = (s: Search, extra: Record<string, string> = {}) =>
  new URLSearchParams({ city: s.city, in: s.checkIn, out: s.checkOut, rooms: String(s.rooms), adults: String(s.adults), children: String(s.children), ...extra }).toString()
