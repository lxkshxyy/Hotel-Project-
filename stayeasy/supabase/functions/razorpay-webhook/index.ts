// Razorpay → Settings → Webhooks: point it at this function with the events
// payment.captured, order.paid and refund.processed, and the same secret as RAZORPAY_WEBHOOK_SECRET.
// It confirms a paid booking even if the guest closed the browser before the page could.
// Deploy with --no-verify-jwt (Razorpay doesn't send a Supabase token).
import { confirmPaid } from '../_shared/confirm.ts'
import { creditTopup } from '../_shared/topup.ts'
import { admin, hmacHex, safeEqual } from '../_shared/server.ts'

Deno.serve(async (req) => {
  const raw = await req.text()
  const sig = req.headers.get('x-razorpay-signature') ?? ''
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
  if (!secret || !safeEqual(await hmacHex(secret, raw), sig)) return new Response('bad signature', { status: 401 })

  const e = JSON.parse(raw)
  const pay = e.payload?.payment?.entity
  if ((e.event === 'payment.captured' || e.event === 'order.paid') && pay?.order_id) {
    // A guest booking, or an agency wallet top-up.
    if (!(await confirmPaid(pay.order_id, pay.id))) await creditTopup(pay.order_id)
  }
  if (e.event === 'refund.processed') {
    const r = e.payload?.refund?.entity
    if (r?.id) await admin().from('bookings').update({ refund_status: 'processed' }).eq('refund_id', r.id)
  }
  return new Response('ok')
})
