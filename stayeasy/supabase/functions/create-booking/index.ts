// Creates a booking with server-side prices.
// Pay at hotel → saved as confirmed. Pay now → saved as pending and a Razorpay order is created;
// verify-payment (or the webhook) confirms it after payment.
import { availability, bookedNights, bookingId, clubStatus, isAtLeast, quote } from '../_shared/core.js'
import { admin, bookingEmail, caller, Fail, json, razorpay, razorpayEnabled, razorpayKeyId, sendEmail, serve } from '../_shared/server.ts'

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const PENDING_HOLD_MIN = 30

serve(async (req) => {
  const user = await caller(req)
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object') throw new Fail(400, 'Bad request.')

  const payNow = b.pay_mode === 'now'
  const guest_name = str(b.guest_name, 120)
  const guest_phone = str(b.guest_phone, 20)
  const guest_email = str(b.guest_email, 200)
  if (guest_name.length < 3) throw new Fail(400, 'Enter the guest’s name.')
  if (!/^\+91[6-9]\d{9}$/.test(guest_phone)) throw new Fail(400, 'Enter a valid 10-digit mobile number.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest_email)) throw new Fail(400, 'Enter a valid email address.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.check_in) || !/^\d{4}-\d{2}-\d{2}$/.test(b.check_out)) throw new Fail(400, 'Choose your dates again.')

  const db = admin()
  const { data: hrow } = await db.from('hotels').select('data').eq('slug', str(b.hotel_slug, 120)).eq('published', true).maybeSingle()
  if (!hrow) throw new Fail(404, 'This hotel is no longer available.')
  const hotel = hrow.data

  if (!payNow && hotel.payAtHotel === false) throw new Fail(400, 'This hotel needs payment online.')
  if (b.protect && Deno.env.get('STAY_PROTECT') !== 'on') throw new Fail(400, 'Stay Protect isn’t available. Please book without it.')
  if (payNow && !razorpayEnabled()) throw new Fail(503, 'Online payment isn’t available right now. Please choose Pay at hotel.')

  // Club level and points, from the database (not from the browser).
  const [{ data: mine }, { data: prof }] = await Promise.all([
    db.from('bookings').select('status, nights').eq('user_id', user.id).eq('status', 'confirmed'),
    db.from('profiles').select('points').eq('id', user.id).maybeSingle(),
  ])
  const club = clubStatus(mine ?? [])
  const q = quote({
    hotel,
    roomId: str(b.room_id, 160),
    checkIn: b.check_in,
    checkOut: b.check_out,
    rooms: Number(b.rooms) || 1,
    adults: Number(b.adults) || 1,
    children: Number(b.children) || 0,
    coupon: str(b.coupon, 30) || null,
    pointsToUse: b.use_points ? (prof?.points ?? 0) : 0,
    memberRate: club.tier.discount,
    freeEarly10: isAtLeast(club.tier, 'Gold'),
    early: str(b.early, 20),
    late: str(b.late, 20),
    meal: b.meal === 'breakfast' || b.meal === 'allMeals' ? b.meal : '',
    protect: !!b.protect,
    payNow,
  })
  if (q.errors.length) throw new Fail(400, q.errors[0])

  // Rooms already taken: confirmed bookings, plus unpaid ones still inside the payment window.
  const since = new Date(Date.now() - PENDING_HOLD_MIN * 60_000).toISOString()
  const { data: taken } = await db
    .from('bookings')
    .select('status, check_in, check_out, rooms, created_at')
    .eq('hotel_slug', hotel.slug)
    .eq('room_name', q.room.name)
    .lt('check_in', b.check_out)
    .gt('check_out', b.check_in)
    .or(`status.eq.confirmed,and(status.eq.pending,created_at.gt."${since}")`)
  const av = availability(q.room, b.check_in, b.check_out, q.rooms, bookedNights(taken ?? []))
  if (!av.ok) throw new Fail(409, av.message)

  if (Number(b.expected_total) !== q.grand) throw new Fail(409, `The price for these dates is now ₹${q.grand.toLocaleString('en-IN')}. Please review and book again.`)

  const row = {
    id: bookingId(),
    user_id: user.id,
    source: 'web',
    hotel_slug: hotel.slug,
    hotel_name: hotel.name,
    hotel_city: `${hotel.area}, ${hotel.city}`,
    room_id: q.room.id,
    room_name: q.room.name,
    check_in: b.check_in,
    check_out: b.check_out,
    nights: q.nights,
    rooms: q.rooms,
    guests: q.guests,
    guest_name,
    guest_phone,
    guest_email,
    special_requests: str(b.special_requests, 2000) || null,
    pay_mode: payNow ? 'now' : 'hotel',
    coupon: q.coupon,
    points_used: q.points,
    room_total: q.roomTotal,
    discount_total: q.discountTotal,
    tax: q.tax,
    amount: q.grand,
    extras: q.extras,
    status: payNow ? 'pending' : 'confirmed',
  }
  const { data: saved, error } = await db.from('bookings').insert(row).select().single()
  if (error) throw new Fail(400, error.message.includes('Club points') ? error.message : 'Couldn’t save the booking. Please try again.')

  if (!payNow) {
    const m = bookingEmail(saved, 'confirmed')
    await sendEmail(guest_email, m.subject, m.html)
    return json(200, { booking: saved })
  }

  const order = await razorpay<{ id: string; amount: number; currency: string }>('/orders', {
    amount: q.grand * 100,
    currency: 'INR',
    receipt: saved.id,
    notes: { booking_id: saved.id, hotel: hotel.slug },
  })
  await db.from('bookings').update({ payment_order_id: order.id }).eq('id', saved.id)
  return json(200, { booking: { ...saved, payment_order_id: order.id }, payment: { key_id: razorpayKeyId(), order_id: order.id, amount: order.amount, currency: order.currency } })
})
