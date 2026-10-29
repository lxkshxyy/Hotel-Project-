import { hotels as localHotels } from '../data/hotels'
import type { Booking, Hotel } from '../data/types'
import { bonusBetween, clubStatus, isAtLeast, pointsFor } from './club'
import { bookedNights } from './booked'
import { bookingId } from './format'
import { fetchPartnerHotels, reportPartnerBooking } from './partner'
import { availability, cancelTerms, quote, type MealChoice } from './quote'
import { isDemoMode, supabase } from './supabase'

/* ---------- small localStorage helpers (demo mode) ---------- */

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked — ignore */
  }
}

const DEMO_BOOKINGS = 'stayeasy.demo.bookings'
const DEMO_POINTS = 'stayeasy.demo.points'

/* ---------- hotels ---------- */

let hotelCache: Promise<Hotel[]> | null = null

export function getHotels(): Promise<Hotel[]> {
  if (hotelCache) return hotelCache
  hotelCache = (async () => {
    // Local mode: bundled StayEasy hotels plus live partner hotels from the InnDesk channel.
    if (isDemoMode || !supabase) return [...localHotels, ...(await fetchPartnerHotels())]
    const [{ data, error }, ratings] = await Promise.all([
      supabase.from('hotels').select('data').eq('published', true),
      supabase.from('hotel_ratings').select('hotel_slug, avg, n'),
    ])
    if (error) throw new Error(`Couldn’t load hotels: ${error.message}`)
    // Live site: ratings come only from real guest reviews, never from sample numbers.
    const r = new Map((ratings.data ?? []).map((x) => [x.hotel_slug as string, x]))
    return (data ?? []).map((row) => {
      const h = row.data as Hotel
      const x = r.get(h.slug)
      return { ...h, rating: x ? Number(x.avg) : 0, reviews: x ? Number(x.n) : 0, scores: x ? h.scores : [] }
    })
  })()
  return hotelCache
}

export async function getHotel(slug: string) {
  const all = await getHotels()
  return all.find((h) => h.slug === slug) ?? null
}

const isPartnerSlug = (slug: string) => !localHotels.some((h) => h.slug === slug)

/* ---------- bookings ---------- */

/** What the guest chose at checkout. Prices are worked out from this, never sent by the browser. */
export interface BookingRequest {
  hotel_slug: string
  room_id: string
  check_in: string
  check_out: string
  rooms: number
  adults: number
  children: number
  coupon?: string | null
  use_points: boolean
  early?: string
  late?: string
  meal?: MealChoice
  protect?: boolean
  pay_mode: 'hotel' | 'now'
  guest_name: string
  guest_phone: string
  guest_email: string
  special_requests?: string
  /** The total the guest saw. If the server's total differs, the booking is stopped so they can review. */
  expected_total: number
}

export interface PaymentOrder {
  key_id: string
  order_id: string
  amount: number
  currency: string
}

/** Server error that the guest can act on (sold out, price changed…). */
export class BookingError extends Error {}

async function invoke<T>(name: string, body: object): Promise<T> {
  const { data, error } = await supabase!.functions.invoke(name, { body: body as Record<string, unknown> })
  if (error) {
    // The function's own message is in the response body.
    let msg = error.message
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx) msg = ((await ctx.json()) as { error?: string }).error || msg
    } catch {
      /* keep the generic message */
    }
    throw new BookingError(msg)
  }
  return data as T
}

export async function createBooking(req: BookingRequest, userId: string): Promise<{ booking: Booking; payment?: PaymentOrder }> {
  if (isDemoMode || !supabase) {
    const hotel = await getHotel(req.hotel_slug)
    if (!hotel) throw new BookingError('This hotel is no longer available.')
    const all = readLocal<Booking[]>(DEMO_BOOKINGS, [])
    const mine = all.filter((x) => x.user_id === userId)
    const status = clubStatus(mine)
    const q = quote({
      hotel,
      roomId: req.room_id,
      checkIn: req.check_in,
      checkOut: req.check_out,
      rooms: req.rooms,
      adults: req.adults,
      children: req.children,
      coupon: req.coupon,
      pointsToUse: req.use_points ? readLocal<number>(DEMO_POINTS, 0) : 0,
      memberRate: status.tier.discount,
      freeEarly10: isAtLeast(status.tier, 'Gold'),
      early: req.early,
      late: req.late,
      meal: req.meal,
      protect: req.protect,
      payNow: false,
    })
    if (q.errors.length) throw new BookingError(q.errors[0])
    const booked = bookedNights(all.filter((b) => b.hotel_slug === hotel.slug && b.room_name === q.room.name))
    const av = availability(q.room, req.check_in, req.check_out, q.rooms, booked)
    if (!av.ok) throw new BookingError(av.message)
    if (q.grand !== req.expected_total) throw new BookingError(`The price changed to ₹${q.grand}. Please review and book again.`)
    const row: Booking = {
      id: bookingId(),
      user_id: userId,
      hotel_slug: hotel.slug,
      hotel_name: hotel.name,
      hotel_city: `${hotel.area}, ${hotel.city}`,
      room_name: q.room.name,
      check_in: req.check_in,
      check_out: req.check_out,
      nights: q.nights,
      rooms: q.rooms,
      guests: q.guests,
      guest_name: req.guest_name,
      guest_phone: req.guest_phone,
      guest_email: req.guest_email,
      special_requests: req.special_requests,
      pay_mode: 'hotel',
      coupon: q.coupon,
      points_used: q.points,
      room_total: q.roomTotal,
      discount_total: q.discountTotal,
      tax: q.tax,
      amount: q.grand,
      extras: q.extras,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    }
    writeLocal(DEMO_BOOKINGS, [row, ...all])
    const after = clubStatus([row, ...mine]).tier
    const pts = readLocal<number>(DEMO_POINTS, 0)
    writeLocal(DEMO_POINTS, pts - row.points_used + pointsFor(row.amount) + bonusBetween(status.tier, after))
    if (isPartnerSlug(row.hotel_slug)) reportPartnerBooking(row)
    return { booking: row }
  }
  return invoke('create-booking', req)
}

/** After Razorpay Checkout succeeds: the server checks the signature and confirms the booking. */
export async function confirmPayment(p: { booking_id: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<Booking> {
  const r = await invoke<{ booking: Booking }>('verify-payment', p)
  return r.booking
}

export { bookedNights }

export async function listBookings(userId: string): Promise<Booking[]> {
  if (isDemoMode || !supabase) {
    return readLocal<Booking[]>(DEMO_BOOKINGS, []).filter((b) => b.user_id === userId)
  }
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Booking[]
}

export async function getBooking(id: string): Promise<Booking | null> {
  if (isDemoMode || !supabase) {
    return readLocal<Booking[]>(DEMO_BOOKINGS, []).find((b) => b.id === id) ?? null
  }
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Booking) ?? null
}

export { cancelTerms } from './quote'

export async function cancelBooking(id: string): Promise<Booking | void> {
  if (isDemoMode || !supabase) {
    const all = readLocal<Booking[]>(DEMO_BOOKINGS, [])
    const b = all.find((x) => x.id === id)
    if (b) {
      const t = cancelTerms(b, await getHotel(b.hotel_slug))
      if (!t.allowed) throw new BookingError(t.reason)
    }
    writeLocal(
      DEMO_BOOKINGS,
      all.map((x) => (x.id === id ? { ...x, status: 'cancelled', cancelled_at: new Date().toISOString() } : x)),
    )
    // Same as the database: refund points spent, take back points earned.
    if (b && b.status === 'confirmed') writeLocal(DEMO_POINTS, Math.max(0, readLocal<number>(DEMO_POINTS, 0) + b.points_used - pointsFor(b.amount)))
    if (b && isPartnerSlug(b.hotel_slug)) reportPartnerBooking({ ...b, status: 'cancelled' })
    return
  }
  const r = await invoke<{ booking: Booking }>('cancel-booking', { booking_id: id })
  return r.booking
}

/** Guest can correct the name, phone, email and requests until check-in. */
export async function updateGuestDetails(id: string, d: { guest_name: string; guest_phone: string; guest_email: string; special_requests: string }) {
  if (isDemoMode || !supabase) {
    const all = readLocal<Booking[]>(DEMO_BOOKINGS, [])
    writeLocal(
      DEMO_BOOKINGS,
      all.map((x) => (x.id === id ? { ...x, ...d } : x)),
    )
    return
  }
  const { error } = await supabase.rpc('update_booking_guest', { booking_id: id, ...d })
  if (error) throw new BookingError(error.message)
}

/* ---------- Club points ---------- */

export async function getPoints(userId: string): Promise<number> {
  if (isDemoMode || !supabase) return readLocal<number>(DEMO_POINTS, 0)
  const { data, error } = await supabase.from('profiles').select('points').eq('id', userId).maybeSingle()
  if (error) return 0
  return (data?.points as number) ?? 0
}
