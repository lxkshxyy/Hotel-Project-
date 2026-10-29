import type { Booking } from '../data/types'

/*
 * StayEasy Club — one place for every Club rule.
 * The Club page, checkout discount and bonus points all read from here,
 * so changing a number below changes it everywhere (also update supabase/schema.sql
 * if you change the bonus points, since the database awards them).
 */

export const CLUB_FEE = 0
/** Points earned per ₹100 paid (after discounts, incl. taxes and add-ons). */
export const POINTS_PER_100 = 1

export interface ClubTier {
  name: 'Member' | 'Silver' | 'Gold' | 'Platinum'
  /** Confirmed bookings and nights needed in total to reach this level. */
  minBookings: number
  minNights: number
  /** Extra discount on the room price at checkout. */
  discount: number
  /** One-time bonus points when you reach this level. */
  bonus: number
  color: string
  perks: string[]
}

export const clubTiers: ClubTier[] = [
  {
    name: 'Member',
    minBookings: 0,
    minNights: 0,
    discount: 0.05,
    bonus: 0,
    color: '#15803D',
    perks: ['5% off every room booking', 'Earn 1 point per ₹100', 'Use points like cash at checkout'],
  },
  {
    name: 'Silver',
    minBookings: 2,
    minNights: 4,
    discount: 0.1,
    bonus: 150,
    color: '#8A94A6',
    perks: ['10% off every room booking', '150 bonus points on reaching Silver', 'All Member benefits'],
  },
  {
    name: 'Gold',
    minBookings: 6,
    minNights: 12,
    discount: 0.15,
    bonus: 300,
    color: '#C99A2E',
    perks: ['15% off every room booking', '300 bonus points on reaching Gold', 'Free early check-in from 10 AM'],
  },
  {
    name: 'Platinum',
    minBookings: 13,
    minNights: 26,
    discount: 0.2,
    bonus: 500,
    color: '#14306B',
    perks: ['20% off every room booking', '500 bonus points on reaching Platinum', 'Free room upgrade when available', 'Priority support line'],
  },
]

export function tierFor(bookings: number, nights: number) {
  let t = clubTiers[0]
  for (const x of clubTiers) if (bookings >= x.minBookings && nights >= x.minNights) t = x
  return t
}

/** Where a member stands, from their confirmed bookings. */
export function clubStatus(list: Pick<Booking, 'status' | 'nights'>[]) {
  const live = list.filter((b) => b.status === 'confirmed')
  const bookings = live.length
  const nights = live.reduce((s, b) => s + b.nights, 0)
  const tier = tierFor(bookings, nights)
  const next = clubTiers[clubTiers.indexOf(tier) + 1] ?? null
  const needBookings = next ? Math.max(0, next.minBookings - bookings) : 0
  const needNights = next ? Math.max(0, next.minNights - nights) : 0
  const progress = next
    ? Math.min(1, Math.min((bookings - tier.minBookings) / (next.minBookings - tier.minBookings), (nights - tier.minNights) / (next.minNights - tier.minNights)))
    : 1
  return { bookings, nights, tier, next, needBookings, needNights, progress: Math.max(0, progress) }
}

/** Bonus points for every level passed between two counts. */
export function bonusBetween(before: ClubTier, after: ClubTier) {
  const a = clubTiers.indexOf(before)
  const b = clubTiers.indexOf(after)
  return clubTiers.slice(a + 1, b + 1).reduce((s, t) => s + t.bonus, 0)
}

export const pointsFor = (amount: number) => Math.floor(amount / 100) * POINTS_PER_100

export const isAtLeast = (t: ClubTier, name: ClubTier['name']) => clubTiers.indexOf(t) >= clubTiers.findIndex((x) => x.name === name)
