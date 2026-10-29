/*
 * One price calculation for the whole booking: room nights (with date-wise prices from the hotel
 * owner's calendar), Club discount, coupon, pay-now discount, points, GST and paid add-ons.
 *
 * The checkout page shows this quote and the server (supabase/functions/create-booking) runs the
 * SAME code before saving a booking, so the price can't be changed in the browser.
 * Keep this file free of browser-only APIs: it is bundled for the server by `npm run sync:functions`.
 */
import { gstRate, site } from '../config/site'
import type { Hotel, Room } from '../data/types'
import { addDays, nightsBetween, todayISO } from './format'

export type MealChoice = '' | 'breakfast' | 'allMeals'

export interface QuoteInput {
  hotel: Hotel
  roomId: string
  checkIn: string
  checkOut: string
  rooms: number
  adults: number
  children: number
  coupon?: string | null
  /** Points the guest wants to spend (capped at what they have and at the amount due). */
  pointsToUse?: number
  /** Club discount for the signed-in member, 0 when signed out. */
  memberRate?: number
  /** Gold and above get early check-in from 10 AM free. */
  freeEarly10?: boolean
  early?: string
  late?: string
  meal?: MealChoice
  protect?: boolean
  payNow?: boolean
}

/** Price and rooms on sale for one night, after the owner's date changes. */
export function nightInfo(room: Room, date: string) {
  const c = room.calendar?.[date]
  return { price: c?.price ?? room.price, open: c?.closed ? 0 : (c?.open ?? room.count ?? Infinity), closed: !!c?.closed }
}

export const stayDates = (checkIn: string, checkOut: string) => {
  const n = nightsBetween(checkIn, checkOut)
  return Array.from({ length: n }, (_, i) => addDays(checkIn, i))
}

/** Nightly prices for a stay, e.g. [1899, 1899, 2499] for a weekend. */
export const nightlyPrices = (room: Room, checkIn: string, checkOut: string) => stayDates(checkIn, checkOut).map((d) => nightInfo(room, d).price)

/** Average price per night for the stay (what search results and room cards show). */
export function stayRate(room: Room, checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut || !room.calendar) return room.price
  const p = nightlyPrices(room, checkIn, checkOut)
  return Math.round(p.reduce((s, x) => s + x, 0) / p.length)
}

/**
 * Can this many rooms be sold for these dates?
 * `booked` = rooms already taken per night (confirmed and unpaid-but-recent bookings).
 * Hotels without room counts (StayEasy's own sample hotels) are never sold out here.
 */
export function availability(room: Room, checkIn: string, checkOut: string, rooms: number, booked: Record<string, number> = {}) {
  for (const d of stayDates(checkIn, checkOut)) {
    const n = nightInfo(room, d)
    if (n.closed) return { ok: false, date: d, left: 0, message: `${room.name} isn’t available on ${d}.` }
    const left = n.open - (booked[d] ?? 0)
    if (left < rooms) return { ok: false, date: d, left: Math.max(0, left), message: left > 0 ? `Only ${left} ${room.name} left on ${d}.` : `${room.name} is sold out on ${d}.` }
  }
  return { ok: true as const, date: '', left: Infinity, message: '' }
}

/** Hours before check-in that free cancellation ends; null = non-refundable. */
export function freeCancelHours(hotel: Hotel): number | null {
  const h = hotel.partner?.cancelHours
  if (h === undefined) return site.freeCancelHours
  return h < 0 ? null : h
}

export interface CouponResult {
  ok: boolean
  message: string
}

export function checkCoupon(code: string, nights: number): CouponResult {
  const c = code.trim().toUpperCase()
  if (!c) return { ok: false, message: 'Enter a coupon code.' }
  if (c === 'FIRSTSTAY') return { ok: true, message: `FIRSTSTAY applied — ₹${site.firstStayDiscount} off.` }
  if (c === 'LONGSTAY') {
    return nights >= 5 ? { ok: true, message: 'LONGSTAY applied — 10% off for 5+ nights.' } : { ok: false, message: 'LONGSTAY needs a stay of 5 nights or more.' }
  }
  if (c === 'PAYNOW') return { ok: false, message: 'No code needed — choose "Pay now" below to get 5% off.' }
  return { ok: false, message: 'This coupon code is not valid.' }
}

export interface Extra {
  label: string
  amount: number
}

export function quote(q: QuoteInput) {
  const errors: string[] = []
  const room = q.hotel.rooms.find((r) => r.id === q.roomId)
  if (!room) throw new Error('That room type is no longer available.')
  const rooms = Math.max(1, Math.min(8, Math.floor(q.rooms)))
  const guests = Math.max(1, q.adults + q.children)
  if (q.checkOut <= q.checkIn) errors.push('Check-out must be after check-in.')
  if (q.checkIn < todayISO()) errors.push('Check-in date has passed.')
  if (guests > room.maxGuests * rooms) errors.push(`${room.name} fits ${room.maxGuests} guests per room. Add a room or pick a bigger room type.`)
  const nightly = nightlyPrices(room, q.checkIn, q.checkOut)
  const nights = nightly.length

  // Room nights
  const roomTotal = nightly.reduce((s, p) => s + p, 0) * rooms
  const mrpTotal = nightly.reduce((s, p) => s + Math.max(p, room.mrp), 0) * rooms
  const instant = mrpTotal - roomTotal

  let amount = roomTotal
  const member = Math.round(amount * (q.memberRate ?? 0))
  amount -= member

  let couponOff = 0
  const code = q.coupon?.trim().toUpperCase() || null
  if (code) {
    const c = checkCoupon(code, nights)
    if (!c.ok) errors.push(c.message)
    else if (code === 'FIRSTSTAY') couponOff = Math.min(site.firstStayDiscount, amount)
    else if (code === 'LONGSTAY') couponOff = Math.round(amount * 0.1)
  }
  amount -= couponOff

  const payNowOff = q.payNow ? Math.round(amount * site.payNowDiscount) : 0
  amount -= payNowOff

  const points = Math.max(0, Math.min(Math.floor(q.pointsToUse ?? 0), amount))
  amount -= points

  // GST: each night's slab follows that night's tariff (5% up to ₹7,500, 18% above).
  // Discounts are shared across nights in proportion to their price.
  const share = roomTotal > 0 ? amount / roomTotal : 0
  const tax = Math.round(nightly.reduce((s, p) => s + p * rooms * share * gstRate(p), 0))
  const taxRate = nightly.every((p) => gstRate(p) === gstRate(nightly[0])) ? gstRate(nightly[0]) : null
  const total = amount + tax

  // Add-ons (prices include taxes)
  const first = nightly[0] ?? room.price
  const last = nightly[nightly.length - 1] ?? room.price
  const earlyOpt = site.earlyCheckIn.find((o) => o.time === q.early)
  const lateOpt = site.lateCheckOut.find((o) => o.time === q.late)
  const earlyFee = (o: { time: string; share: number }) => (q.freeEarly10 && o.time === '10:00 AM' ? 0 : Math.round(o.share * first * rooms))
  const lateFee = (o: { share: number }) => Math.round(o.share * last * rooms)
  const extras: Extra[] = []
  if (earlyOpt) extras.push({ label: `Early check-in from ${earlyOpt.time}${earlyFee(earlyOpt) === 0 ? ' (free for Club Gold)' : ''}`, amount: earlyFee(earlyOpt) })
  if (lateOpt) extras.push({ label: `Late check-out until ${lateOpt.time}`, amount: lateFee(lateOpt) })
  if (q.meal) extras.push({ label: q.meal === 'breakfast' ? 'Breakfast for all guests' : 'Breakfast + lunch or dinner', amount: site.addons[q.meal] * guests * nights })
  if (q.protect) extras.push({ label: 'Stay Protect', amount: site.stayProtect.price * guests * nights })
  const extrasTotal = extras.reduce((s, x) => s + x.amount, 0)

  return {
    room,
    rooms,
    nights,
    guests,
    nightly,
    units: nights * rooms,
    mrpTotal,
    roomTotal,
    instant,
    member,
    coupon: couponOff > 0 ? code : null,
    couponOff,
    payNowOff,
    points,
    taxRate,
    tax,
    total,
    extras,
    extrasTotal,
    grand: total + extrasTotal,
    earlyFee,
    lateFee,
    saved: instant + member + couponOff + payNowOff + points,
    discountTotal: member + couponOff + payNowOff + points,
    errors,
  }
}

export type Quote = ReturnType<typeof quote>

/**
 * The hotel as it should look for these dates: each room shows its average nightly price for the
 * stay, and rooms the owner closed (or has none open) are marked unavailable.
 */
export function hotelForStay(h: Hotel, checkIn: string, checkOut: string): Hotel {
  if (!h.rooms.some((r) => r.calendar || r.count !== undefined)) return h
  return {
    ...h,
    rooms: h.rooms.map((r) => {
      const a = availability(r, checkIn, checkOut, 1)
      return { ...r, price: stayRate(r, checkIn, checkOut), unavailable: a.ok ? undefined : a.message }
    }),
  }
}

/** Hide sold-out rooms from search; drop the hotel when nothing is left. */
export function bookableForStay(list: Hotel[], checkIn: string, checkOut: string) {
  return list
    .map((h) => hotelForStay(h, checkIn, checkOut))
    .map((h) => ({ ...h, rooms: h.rooms.filter((r) => !r.unavailable) }))
    .filter((h) => h.rooms.length > 0)
}

/** What happens if the guest cancels now (same rule in the browser and on the server). */
export function cancelTerms(
  b: { status: string; check_in: string; pay_mode: string; paid_at?: string | null; amount: number },
  hotel: Hotel | null,
  now = Date.now(),
) {
  const hours = hotel ? freeCancelHours(hotel) : site.freeCancelHours
  // Check-in time is noon India time on the arrival day.
  const checkIn = new Date(b.check_in + 'T12:00:00+05:30').getTime()
  const hoursLeft = (checkIn - now) / 3_600_000
  const free = hours !== null && hoursLeft >= hours
  const paidOnline = b.pay_mode === 'now' && !!b.paid_at
  return {
    allowed: b.status === 'confirmed' && free,
    free,
    hours,
    paidOnline,
    refund: paidOnline && free ? b.amount : 0,
    reason: b.status !== 'confirmed' ? 'This booking is already cancelled.' : hours === null ? 'This rate is non-refundable.' : free ? '' : `Free cancellation ended ${hours} hours before check-in.`,
  }
}
