// Cancels the caller's booking if it is inside the hotel's free-cancellation window.
// Online payments are refunded in full through Razorpay; Club points are adjusted.
import { cancelTerms, pointsFor } from '../_shared/core.js'
import { admin, bookingEmail, caller, Fail, json, razorpay, sendEmail, serve } from '../_shared/server.ts'

serve(async (req) => {
  const user = await caller(req)
  const { booking_id } = (await req.json().catch(() => ({}))) ?? {}
  if (typeof booking_id !== 'string') throw new Fail(400, 'Bad request.')
  const db = admin()
  const { data: b } = await db.from('bookings').select('*').eq('id', booking_id).eq('user_id', user.id).maybeSingle()
  if (!b) throw new Fail(404, 'Booking not found.')
  const { data: h } = await db.from('hotels').select('data').eq('slug', b.hotel_slug).maybeSingle()
  const t = cancelTerms(b, h?.data ?? null)
  if (!t.allowed) throw new Fail(400, `${t.reason} Please contact support.`)

  let refund: { id: string } | null = null
  if (t.refund > 0 && b.payment_id) {
    refund = await razorpay<{ id: string }>(`/payments/${b.payment_id}/refund`, { amount: t.refund * 100, speed: 'normal', notes: { booking_id: b.id } })
  }
  const { data: updated, error } = await db
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      refund_amount: t.refund || null,
      refund_id: refund?.id ?? null,
      refund_status: refund ? 'pending' : null,
    })
    .eq('id', b.id)
    .eq('status', 'confirmed')
    .select()
    .single()
  if (error) throw new Fail(409, 'This booking was already changed. Refresh and try again.')

  // Points spent come back; points earned on this booking are taken back.
  const { data: prof } = await db.from('profiles').select('points').eq('id', user.id).maybeSingle()
  if (prof) await db.from('profiles').update({ points: Math.max(0, prof.points + b.points_used - pointsFor(b.amount)) }).eq('id', user.id)

  const m = bookingEmail(updated, 'cancelled')
  await sendEmail(updated.guest_email, m.subject, m.html)
  return json(200, { booking: updated })
})
