// Starts a wallet top-up: creates a Razorpay order the agency pays in the browser.
import { agencyOf } from '../_shared/agent.ts'
import { admin, caller, Fail, json, razorpay, razorpayKeyId, serve } from '../_shared/server.ts'

serve(async (req) => {
  const user = await caller(req)
  const { agency } = await agencyOf(user.id)
  const { amount } = (await req.json().catch(() => ({}))) ?? {}
  const n = Math.round(Number(amount))
  if (!(n >= 1000 && n <= 500000)) throw new Fail(400, 'Top up between ₹1,000 and ₹5,00,000.')
  const order = await razorpay<{ id: string; amount: number; currency: string }>('/orders', { amount: n * 100, currency: 'INR', receipt: `topup-${agency.id.slice(0, 8)}-${Date.now()}`, notes: { agent_id: agency.id, kind: 'wallet_topup' } })
  await admin().from('agent_topups').insert({ order_id: order.id, agent_id: agency.id, amount: n })
  return json(200, { key_id: razorpayKeyId(), order_id: order.id, amount: order.amount, currency: order.currency })
})
