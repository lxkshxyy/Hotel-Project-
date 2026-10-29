import { Landmark, Plus } from 'lucide-react'
import { useState } from 'react'
import { inr } from '@stayeasy/lib/format'
import { Notice, PageHead, Spinner, Stat } from '../components/ui'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { useWallet } from '../lib/hooks'
import { openRazorpay } from '../lib/razorpay'
import { demoTopup, finishTopup, startTopup } from '../lib/store'
import { isDemoMode } from '../lib/supabase'

const typeLabel = { topup: 'Top-up', booking: 'Booking', refund: 'Refund', adjust: 'Adjustment' }

export default function Wallet() {
  const { agency } = useSession()
  const w = useWallet()
  const [amount, setAmount] = useState(5000)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  if (!agency || !w.data) return <Spinner />
  const online = isDemoMode || !!site.razorpayKeyId

  const topup = async () => {
    setMsg(null)
    if (amount < site.minTopup) return setMsg({ tone: 'error', text: `The smallest top-up is ${inr(site.minTopup)}.` })
    setBusy(true)
    try {
      if (isDemoMode) {
        await demoTopup(agency, amount)
      } else {
        const order = await startTopup(amount)
        const paid = await openRazorpay(order, { name: agency.ownerName, email: agency.email, phone: agency.phone, description: `${site.name} wallet top-up` })
        if (!paid) return setMsg({ tone: 'error', text: 'Payment not completed. Your wallet hasn’t changed.' })
        await finishTopup(paid)
      }
      setMsg({ tone: 'ok', text: `${inr(amount)} added to your wallet.` })
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'Top-up failed.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page flex flex-col gap-6 pt-7">
      <PageHead title="Wallet" intro="Bookings are paid from here at the net rate. Refunds for cancelled bookings come back here straight away." />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="card grid gap-6 p-6 sm:grid-cols-2">
          <Stat label="Balance" value={inr(w.balance)} />
          <Stat label="Available to book" value={inr(w.available)} sub={agency.creditLimit ? `Includes ${inr(agency.creditLimit)} credit` : 'No credit limit set'} tone="gold" />
        </section>
        <section className="card flex flex-col gap-3 p-6">
          <h2 className="text-lg font-extrabold">Add money</h2>
          {online ? (
            <>
              <div className="flex flex-wrap gap-2">
                {[5000, 10000, 25000, 50000].map((v) => (
                  <button key={v} type="button" aria-pressed={amount === v} onClick={() => setAmount(v)} className={`min-h-10 rounded-lg border px-3 text-sm font-bold ${amount === v ? 'border-ink-900 bg-ink-900 text-white' : 'border-line-strong bg-white'}`}>
                    {inr(v)}
                  </button>
                ))}
              </div>
              <label className="label">
                Amount (₹)
                <input type="number" className="field" min={site.minTopup} step={500} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </label>
              <button type="button" className="btn-gold" disabled={busy} onClick={topup}>
                <Plus className="h-4 w-4" aria-hidden="true" /> {busy ? 'Opening payment…' : `Add ${inr(amount)}`}
              </button>
              <span className="text-[13px] text-muted">{isDemoMode ? 'Demo mode: money is added instantly, no payment.' : 'UPI, cards and net banking, secured by Razorpay.'}</span>
            </>
          ) : (
            <p className="flex gap-2 text-[15px] text-ink-700">
              <Landmark className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> Transfer to {site.bankTransfer} with your agency name as the reference. Your account manager adds it to the wallet the same day.
            </p>
          )}
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        </section>
      </div>
      <section aria-labelledby="led-h" className="flex flex-col gap-3">
        <h2 id="led-h" className="text-xl font-extrabold text-ink-950">
          Statement
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-line text-sm text-muted">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Details</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {w.data.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">{new Date(e.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3">{typeLabel[e.type]}</td>
                  <td className="px-4 py-3">{e.note}</td>
                  <td className={`px-4 py-3 text-right font-bold ${e.amount < 0 ? 'text-ink-900' : 'text-earn'}`}>
                    {e.amount < 0 ? '− ' : '+ '}
                    {inr(Math.abs(e.amount))}
                  </td>
                </tr>
              ))}
              {w.data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
