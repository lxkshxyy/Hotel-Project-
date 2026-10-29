import { admin } from './server.ts'

/** Credits a paid top-up to the wallet once (the ledger's unique order id stops doubles). */
export async function creditTopup(orderId: string) {
  const db = admin()
  const { data: t } = await db.from('agent_topups').select('*').eq('order_id', orderId).maybeSingle()
  if (!t) return false
  await db.from('agent_topups').update({ status: 'paid' }).eq('order_id', orderId)
  await db.from('agent_ledger').upsert({ agent_id: t.agent_id, type: 'topup', amount: t.amount, note: 'Wallet top-up (Razorpay)', payment_order_id: orderId }, { onConflict: 'payment_order_id', ignoreDuplicates: true })
  return true
}
