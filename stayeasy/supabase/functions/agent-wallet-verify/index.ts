// Confirms a wallet top-up after Razorpay Checkout: checks the signature and the amount, then credits the wallet.
import { agencyOf } from '../_shared/agent.ts'
import { creditTopup } from '../_shared/topup.ts'
import { admin, caller, Fail, hmacHex, json, razorpay, safeEqual, serve } from '../_shared/server.ts'

serve(async (req) => {
  const user = await caller(req)
  const { agency } = await agencyOf(user.id)
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = (await req.json().catch(() => ({}))) ?? {}
  if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every((x) => typeof x === 'string' && x)) throw new Fail(400, 'Bad request.')
  const { data: t } = await admin().from('agent_topups').select('*').eq('order_id', razorpay_order_id).eq('agent_id', agency.id).maybeSingle()
  if (!t) throw new Fail(404, 'Top-up not found.')
  const expected = await hmacHex(Deno.env.get('RAZORPAY_KEY_SECRET')!, `${razorpay_order_id}|${razorpay_payment_id}`)
  if (!safeEqual(expected, razorpay_signature)) throw new Fail(400, 'We couldn’t verify this payment. Please contact support.')
  const pay = await razorpay<{ status: string; amount: number; order_id: string }>(`/payments/${razorpay_payment_id}`)
  if (pay.order_id !== razorpay_order_id || pay.amount !== t.amount * 100 || !['captured', 'authorized'].includes(pay.status)) throw new Fail(400, 'The payment didn’t match this top-up. Please contact support.')
  await creditTopup(razorpay_order_id)
  return json(200, { ok: true })
})
