// Books a hotel for a travel agency: server-side net rate, room counts, then the net amount is
// taken from the agency wallet in one locked step (agent_debit).
import { agentQuote, availability, bookedNights, bookingId } from '../_shared/core.js'
import { agencyOf } from '../_shared/agent.ts'
import { admin, caller, Fail, json, serve } from '../_shared/server.ts'

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

serve(async (req) => {
  const user = await caller(req)
  const { agency } = await agencyOf(user.id)
  if (agency.status !== 'approved') throw new Fail(403, 'Your agency is waiting for approval. You can make quotes, but not bookings yet.')
  const b = await req.json().catch(() => null)
  if (!b) throw new Fail(400, 'Bad request.')

  const guest_name = str(b.guest_name, 120)
  const guest_phone = str(b.guest_phone, 20)
  const guest_email = str(b.guest_email, 200)
  if (guest_name.length < 3) throw new Fail(400, 'Enter the lead guest’s name.')
  if (!/^\+91[6-9]\d{9}$/.test(guest_phone)) throw new Fail(400, 'Enter the guest’s 10-digit mobile number.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest_email)) throw new Fail(400, 'Enter a valid email address.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.check_in) || !/^\d{4}-\d{2}-\d{2}$/.test(b.check_out)) throw new Fail(400, 'Choose the dates again.')
  const mt = b.markup?.type === 'flat' ? 'flat' : 'pct'
  const mv = Number(b.markup?.value)
  if (!(mv >= 0) || (mt === 'pct' && mv > 100) || (mt === 'flat' && mv > 20000)) throw new Fail(400, 'Check your markup.')

  const db = admin()
  const { data: hrow } = await db.from('hotels').select('data').eq('slug', str(b.hotel_slug, 120)).eq('published', true).maybeSingle()
  if (!hrow) throw new Fail(404, 'This hotel is no longer available.')
  const hotel = hrow.data
  const q = agentQuote({ hotel, roomId: str(b.room_id, 160), checkIn: b.check_in, checkOut: b.check_out, rooms: Number(b.rooms) || 1, adults: Number(b.adults) || 1, children: Number(b.children) || 0, markup: { type: mt, value: mv } })
  if (q.errors.length) throw new Fail(400, q.errors[0])
  if (b.check_in < new Date().toISOString().slice(0, 10)) throw new Fail(400, 'Check-in date has passed.')

  const since = new Date(Date.now() - 30 * 60_000).toISOString()
  const { data: taken } = await db
    .from('bookings')
    .select('status, check_in, check_out, rooms')
    .eq('hotel_slug', hotel.slug)
    .eq('room_name', q.room.name)
    .lt('check_in', b.check_out)
    .gt('check_out', b.check_in)
    .or(`status.eq.confirmed,and(status.eq.pending,created_at.gt."${since}")`)
  const av = availability(q.room, b.check_in, b.check_out, q.rooms, bookedNights(taken ?? []))
  if (!av.ok) throw new Fail(409, av.message)
  if (Number(b.expected_net) !== q.netTotal) throw new Fail(409, `The net rate changed to ₹${q.netTotal.toLocaleString('en-IN')}. Please review and book again.`)

  let customer_id: string | null = null
  if (typeof b.customer_id === 'string') {
    const { data: c } = await db.from('agent_customers').select('id').eq('id', b.customer_id).eq('agent_id', agency.id).maybeSingle()
    customer_id = c?.id ?? null
  }

  const id = bookingId().replace('SE-', 'TD-')
  const row = {
    id,
    user_id: user.id,
    source: 'agent',
    agent_id: agency.id,
    booked_by: user.email,
    customer_id,
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
    pay_mode: 'agent',
    points_used: 0,
    room_total: q.netRoom,
    discount_total: 0,
    tax: q.netTax,
    amount: q.netTotal,
    net_amount: q.netTotal,
    markup_amount: q.markupAmount,
    selling_amount: q.sellingTotal,
    status: 'confirmed',
  }
  const { data: saved, error } = await db.from('bookings').insert(row).select().single()
  if (error) throw new Fail(400, 'Couldn’t save the booking. Please try again.')
  const { error: debit } = await db.rpc('agent_debit', { p_agent: agency.id, p_amount: q.netTotal, p_booking: id, p_note: `${hotel.name}, ${id}` })
  if (debit) {
    await db.from('bookings').delete().eq('id', id)
    throw new Fail(402, debit.message)
  }
  return json(200, { booking: saved })
})
