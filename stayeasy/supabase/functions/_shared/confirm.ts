import { admin, bookingEmail, sendEmail } from './server.ts'

/** Marks a pending booking as paid and confirmed. Safe to call twice (browser and webhook). */
export async function confirmPaid(orderId: string, paymentId: string) {
  const db = admin()
  const { data: b } = await db.from('bookings').select('*').eq('payment_order_id', orderId).maybeSingle()
  if (!b) return null
  if (b.status === 'confirmed') return b
  const { data: updated } = await db
    .from('bookings')
    .update({ status: 'confirmed', payment_id: paymentId, paid_at: new Date().toISOString() })
    .eq('id', b.id)
    .eq('status', 'pending')
    .select()
    .maybeSingle()
  const done = updated ?? (await db.from('bookings').select('*').eq('id', b.id).single()).data
  if (updated) {
    const m = bookingEmail(updated, 'confirmed')
    await sendEmail(updated.guest_email, m.subject, m.html)
  }
  return done
}
