// Cancels an agency booking inside the hotel's free window and puts the net amount back in the wallet.
import { cancelTerms } from '../_shared/core.js'
import { agencyOf } from '../_shared/agent.ts'
import { admin, caller, Fail, json, serve } from '../_shared/server.ts'

serve(async (req) => {
  const user = await caller(req)
  const { agency } = await agencyOf(user.id)
  const { booking_id } = (await req.json().catch(() => ({}))) ?? {}
  if (typeof booking_id !== 'string') throw new Fail(400, 'Bad request.')
  const db = admin()
  const { data: b } = await db.from('bookings').select('*').eq('id', booking_id).eq('agent_id', agency.id).maybeSingle()
  if (!b) throw new Fail(404, 'Booking not found.')
  const { data: h } = await db.from('hotels').select('data').eq('slug', b.hotel_slug).maybeSingle()
  const t = cancelTerms({ ...b, pay_mode: 'now', paid_at: b.created_at }, h?.data ?? null)
  if (!t.allowed) throw new Fail(400, `${t.reason} Contact your account manager.`)
  const { data: updated, error } = await db
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), refund_amount: b.net_amount, refund_status: 'processed' })
    .eq('id', b.id)
    .eq('status', 'confirmed')
    .select()
    .single()
  if (error) throw new Fail(409, 'This booking was already changed. Refresh and try again.')
  await db.from('agent_ledger').insert({ agent_id: agency.id, type: 'refund', amount: b.net_amount, note: `Cancelled ${b.id}`, booking_id: b.id })
  return json(200, { booking: updated })
})
