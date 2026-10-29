// Called by the browser after Razorpay Checkout succeeds. Checks the payment signature with the
// secret key, confirms the amount with Razorpay, then confirms the booking.
import { confirmPaid } from '../_shared/confirm.ts'
import { admin, caller, Fail, hmacHex, json, razorpay, safeEqual, serve } from '../_shared/server.ts'

serve(async (req) => {
  const user = await caller(req)
  const p = await req.json().catch(() => ({}))
  const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = p ?? {}
  if (![booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature].every((x) => typeof x === 'string' && x)) throw new Fail(400, 'Bad request.')

  const { data: b } = await admin().from('bookings').select('*').eq('id', booking_id).eq('user_id', user.id).maybeSingle()
  if (!b || b.payment_order_id !== razorpay_order_id) throw new Fail(404, 'Booking not found.')
  if (b.status === 'confirmed') return json(200, { booking: b })

  const expected = await hmacHex(Deno.env.get('RAZORPAY_KEY_SECRET')!, `${razorpay_order_id}|${razorpay_payment_id}`)
  if (!safeEqual(expected, razorpay_signature)) throw new Fail(400, 'We couldn’t verify this payment. If money was taken, it will be refunded automatically. Please contact support.')

  const pay = await razorpay<{ status: string; amount: number; order_id: string }>(`/payments/${razorpay_payment_id}`)
  if (pay.order_id !== razorpay_order_id || pay.amount !== b.amount * 100 || !['captured', 'authorized'].includes(pay.status))
    throw new Fail(400, 'The payment didn’t match this booking. Please contact support.')

  const booking = await confirmPaid(razorpay_order_id, razorpay_payment_id)
  return json(200, { booking })
})
