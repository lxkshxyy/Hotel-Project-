import { site } from '../config/site'
import type { PaymentOrder } from './api'
import { isDemoMode } from './supabase'

/*
 * Online payment with Razorpay Checkout.
 * Switched on by setting VITE_RAZORPAY_KEY_ID (the public key id, rzp_live_… or rzp_test_…) on the
 * live site. The secret key never comes to the browser: it lives in Supabase function secrets.
 */
export const razorpayKeyId = (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined) || ''
export const onlinePayments = !isDemoMode && !!razorpayKeyId

interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayCtor = new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void }

let loader: Promise<RazorpayCtor> | null = null
function loadRazorpay(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor }
  if (w.Razorpay) return Promise.resolve(w.Razorpay)
  loader ??= new Promise((ok, fail) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => (w.Razorpay ? ok(w.Razorpay) : fail(new Error('Payment window failed to load.')))
    s.onerror = () => {
      loader = null
      fail(new Error('Couldn’t reach the payment provider. Check your connection and try again.'))
    }
    document.head.appendChild(s)
  })
  return loader
}

/** Opens the Razorpay window. Resolves with the payment proof, or null if the guest closed it. */
export async function openRazorpay(order: PaymentOrder, guest: { name: string; email: string; phone: string; description: string }): Promise<RazorpayResponse | null> {
  const Razorpay = await loadRazorpay()
  return new Promise((resolve) => {
    let done = false
    const rzp = new Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: site.name,
      description: guest.description,
      prefill: { name: guest.name, email: guest.email, contact: guest.phone },
      theme: { color: '#14306B' },
      handler: (r: RazorpayResponse) => {
        done = true
        resolve(r)
      },
      modal: {
        ondismiss: () => {
          if (!done) resolve(null)
        },
      },
    })
    rzp.on('payment.failed', () => {
      /* Razorpay shows the failure and lets the guest retry inside the window. */
    })
    rzp.open()
  })
}
