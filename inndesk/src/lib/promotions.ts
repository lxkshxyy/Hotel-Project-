import { addDays, nightsBetween, parseISODate, todayISO, uid } from './format'
import type { Listing, ListingRoom, Reservation } from './types'

/**
 * Promotions & coupons a property offers on the customer site.
 * Tier 1 = promotions (only the best one applies), Tier 2 = special-audience promotions,
 * Tier 3 = coupons. Tiers stack one after another: price × (1 − t1) × (1 − t2) × (1 − t3).
 */
export type PromoKind = 'basic' | 'last-minute' | 'early-bird' | 'long-stay' | 'audience' | 'coupon'
export type Audience = 'mobile' | 'members' | 'corporate' | 'agents' | 'international' | 'india' | 'holiday'

export interface Promotion {
  id: string
  listingId: string
  kind: PromoKind
  name: string
  /** Percent off, 1–80. */
  discount: number
  /** Booking window (YYYY-MM-DD). No bookTo = no end date. */
  bookFrom: string
  bookTo?: string
  /** Stay window. No stayTo = no end date. */
  stayFrom: string
  stayTo?: string
  /** Room type ids; empty = every room. */
  roomIds: string[]
  /** last-minute: booked at most this many days before check-in (0, 1 or 2). */
  withinDays?: number
  /** early-bird: booked at least this many days before check-in. */
  advanceDays?: number
  /** long-stay: minimum nights. */
  minNights?: number
  audience?: Audience
  /** coupon: code guests type, and the most it can take off one booking. */
  code?: string
  maxOff?: number
  /** Tier 2 extra discount by day of the week (percent, on top of `discount`). */
  extraWeekend?: number
  extraWeekday?: number
  paused?: boolean
  createdAt: string
  updatedAt: string
}

export const tierOf = (k: PromoKind) => (k === 'audience' ? 2 : k === 'coupon' ? 3 : 1)
export const tierName = (k: PromoKind) => (k === 'audience' ? 'Special Audience Promotions (Tier 2)' : k === 'coupon' ? 'Coupon (Tier 3)' : 'Promotions (Tier 1)')

export const kindInfo: Record<PromoKind, { title: string; text: string }> = {
  basic: { title: 'Basic Promotion', text: 'Offer recurring discounts to improve occupancy.' },
  'last-minute': { title: 'Last Minute Promotion', text: 'Offer last-minute discounts to guests who book 0, 1, or 2 days before check-in.' },
  'early-bird': { title: 'Early Bird Promotion', text: 'Offer exclusive discounts to those who reserve their stays well in advance.' },
  'long-stay': { title: 'Long Stay Promotion', text: 'Offer guests discounted prices to promote longer stays.' },
  audience: { title: 'Special Audience Promotion', text: 'Offer exclusive discounts to a specific set of guests.' },
  coupon: { title: 'Coupon', text: 'A code guests enter at checkout for an extra discount.' },
}

export const audiences: { id: Audience; label: string }[] = [
  { id: 'mobile', label: 'Mobile app users' },
  { id: 'members', label: 'TRPOTELS Club members (logged in)' },
  { id: 'corporate', label: 'Corporate (business) accounts' },
  { id: 'agents', label: 'Travel agents (TripDesk)' },
  { id: 'international', label: 'International guests' },
  { id: 'india', label: 'Guests booking from India' },
  { id: 'holiday', label: 'Holiday package customers' },
]
export const audienceLabel = (a?: Audience) => audiences.find((x) => x.id === a)?.label ?? ''

/* ---------- storage ---------- */
// [LIVE] move to the database (and read them on the customer site) so prices change for guests.
const KEY = 'inndesk.promotions'
function readAll(): Promotion[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
function writeAll(all: Promotion[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* storage unavailable: lasts until reload */
  }
  window.dispatchEvent(new Event('inndesk-data')) // same event store.ts uses, so useData reloads
}
export async function listPromotions(listingId: string) {
  return readAll().filter((p) => p.listingId === listingId)
}
export async function savePromotion(p: Promotion) {
  const all = readAll()
  const now = new Date().toISOString()
  const next = { ...p, updatedAt: now }
  const i = all.findIndex((x) => x.id === p.id)
  if (i >= 0) all[i] = next
  else all.push(next)
  writeAll(all)
  return next
}
export async function deletePromotion(id: string) {
  writeAll(readAll().filter((p) => p.id !== id))
}

export function newPromotion(l: Listing, kind: PromoKind): Promotion {
  const t = todayISO()
  const now = new Date().toISOString()
  const base: Promotion = { id: `promo_${uid(10)}`, listingId: l.id, kind, name: kindInfo[kind].title, discount: 10, bookFrom: t, stayFrom: t, roomIds: [], createdAt: now, updatedAt: now }
  if (kind === 'last-minute') return { ...base, discount: 15, withinDays: 1 }
  if (kind === 'early-bird') return { ...base, discount: 12, advanceDays: 30 }
  if (kind === 'long-stay') return { ...base, discount: 15, minNights: 4 }
  if (kind === 'audience') return { ...base, name: audienceLabel('mobile'), audience: 'mobile' }
  if (kind === 'coupon') return { ...base, name: 'Coupon', code: `STAY${uid(4).toUpperCase()}`, maxOff: 1000 }
  return base
}

/* ---------- rules ---------- */
export const isExpired = (p: Promotion, t = todayISO()) => (!!p.bookTo && p.bookTo < t) || (!!p.stayTo && p.stayTo < t)
export const isActive = (p: Promotion, t = todayISO()) => !p.paused && !isExpired(p, t)
/** The date the promotion stops: the earlier of its booking and stay end dates. */
export const endsOn = (p: Promotion) => [p.bookTo, p.stayTo].filter(Boolean).sort()[0] as string | undefined

export type Stay = { bookedOn: string; checkIn: string; checkOut: string; roomId: string; audience?: Audience; coupon?: boolean }

const weekend = (iso: string) => [0, 5, 6].includes(parseISODate(iso).getDay())

/** Does this promotion apply to the stay? */
export function applies(p: Promotion, s: Stay) {
  if (!isActive(p, s.bookedOn)) return false
  if (s.bookedOn < p.bookFrom || (p.bookTo && s.bookedOn > p.bookTo)) return false
  if (s.checkIn < p.stayFrom || (p.stayTo && s.checkIn > p.stayTo)) return false
  if (p.roomIds.length && !p.roomIds.includes(s.roomId)) return false
  const lead = nightsBetween(s.bookedOn, s.checkIn)
  if (p.kind === 'last-minute' && lead > (p.withinDays ?? 0)) return false
  if (p.kind === 'early-bird' && lead < (p.advanceDays ?? 0)) return false
  if (p.kind === 'long-stay' && nightsBetween(s.checkIn, s.checkOut) < (p.minNights ?? 1)) return false
  if (p.kind === 'audience' && p.audience !== s.audience) return false
  if (p.kind === 'coupon' && !s.coupon) return false
  return true
}

/** Percent a Tier 2 promotion takes off for a check-in date, including the weekend/weekday extra. */
const audiencePct = (p: Promotion, checkIn: string) => Math.min(90, p.discount + ((weekend(checkIn) ? p.extraWeekend : p.extraWeekday) ?? 0))

export type PriceLine = { label: string; promo?: Promotion; pct: number; off: number }

/** Final selling price for one night of a room after all three tiers. */
export function postPromotionPrice(rate: number, promos: Promotion[], s: Stay) {
  const lines: PriceLine[] = []
  let price = rate
  const best = (tier: number, pct: (p: Promotion) => number) =>
    promos
      .filter((p) => tierOf(p.kind) === tier && applies(p, s))
      .map((p) => ({ p, pct: pct(p) }))
      .sort((a, b) => b.pct - a.pct)[0]
  const t1 = best(1, (p) => p.discount)
  if (t1) {
    const off = Math.round(price * (t1.pct / 100))
    lines.push({ label: t1.p.name, promo: t1.p, pct: t1.pct, off })
    price -= off
  }
  const t2 = best(2, (p) => audiencePct(p, s.checkIn))
  if (t2) {
    const off = Math.round(price * (t2.pct / 100))
    lines.push({ label: t2.p.name, promo: t2.p, pct: t2.pct, off })
    price -= off
  }
  const t3 = best(3, (p) => p.discount)
  if (t3) {
    const off = Math.min(Math.round(price * (t3.pct / 100)), t3.p.maxOff || Infinity)
    lines.push({ label: `Coupon ${t3.p.code ?? ''}`.trim(), promo: t3.p, pct: t3.pct, off })
    price -= off
  }
  return { rate, lines, final: Math.max(0, price) }
}

/** GST on the room tariff: 5% up to ₹7,500 a night, 18% above. [CONFIRM with CA] */
export const roomGstRate = (perNight: number) => (perNight > 7500 ? 0.18 : 0.05)

export const cheapestRoom = (l: Listing): ListingRoom | undefined => [...l.rooms].filter((r) => r.price > 0).sort((a, b) => a.price - b.price)[0]

/** Room nights and revenue (booking amount) from bookings that used this promotion. */
export function promoStats(p: Promotion, list: Reservation[]) {
  const used = list.filter((r) => r.promo_id === p.id && r.status !== 'cancelled')
  return { roomNights: used.reduce((n, r) => n + r.nights * r.rooms, 0), revenue: used.reduce((n, r) => n + r.amount, 0) }
}

/** Rooms still unsold tonight, from the room counts and tonight's bookings. */
export function unsoldTonight(l: Listing, list: Reservation[], t = todayISO()) {
  const total = l.rooms.reduce((n, r) => n + (r.count || 0), 0)
  const sold = list.filter((r) => r.status !== 'cancelled' && r.check_in <= t && r.check_out > t).reduce((n, r) => n + r.rooms, 0)
  return Math.max(0, total - sold)
}

export const tomorrow = () => addDays(todayISO(), 1)
