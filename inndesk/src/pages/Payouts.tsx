import { Download, Landmark, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Empty, Notice, PageHead, Spinner } from '../components/ui'
import { site } from '../config/site'
import { dayMonth, inr, todayISO } from '../lib/format'
import { useListings, useReservations } from '../lib/hooks'
import { settle } from '../lib/money'

const pct = (n: number) => `${Math.round(n * 100)}%`

function csv(rows: (string | number)[][]) {
  const text = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }))
  a.download = `inndesk-payouts-${todayISO()}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export default function Payouts() {
  const { data: listings } = useListings()
  const { list, loading, offline } = useReservations(listings)
  if (!listings || loading) return <Spinner />

  const completed = list.filter((r) => r.desk === 'departed').map((r) => ({ r, s: settle(r) }))
  const upcoming = list.filter((r) => r.desk === 'upcoming' || r.desk === 'in-house').map((r) => ({ r, s: settle(r) }))
  const due = completed.reduce((t, x) => t + x.s.payout, 0)
  const earned = completed.reduce((t, x) => t + x.s.earned, 0)
  const commission = completed.reduce((t, x) => t + x.s.commission + x.s.gst, 0)
  const expected = upcoming.reduce((t, x) => t + x.s.earned, 0)
  const bank = listings.find((l) => l.legal.accountLast4 && l.legal.ifsc)?.legal

  return (
    <div className="container-page flex flex-col gap-6 pt-8">
      <PageHead title="Payouts" intro={`${site.marketplace} keeps ${pct(site.commissionRate)} commission plus ${pct(site.gstOnCommission)} GST on it for each completed stay. Payouts go ${site.payoutCycle}.`}>
        {completed.length > 0 && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              csv([
                ['Booking ID', 'Property', 'Guest', 'Check-in', 'Check-out', 'Paid', 'Guest paid', 'Room GST', 'Commission', 'GST on commission', 'Payout'],
                ...completed.map(({ r, s }) => [r.id, r.hotel_name, r.guest_name, r.check_in, r.check_out, s.collectedByHotel ? 'At hotel' : 'Online', r.amount, r.tax, s.commission, s.gst, s.payout]),
              ])
            }
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Download statement
          </button>
        )}
      </PageHead>
      {offline && <Notice tone="warn">Can’t reach {site.marketplace} right now, so these figures may be out of date.</Notice>}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section aria-labelledby="due-h" className="rounded-2xl bg-pine-900 p-6 text-white">
          <h2 id="due-h" className="text-lg font-semibold text-pine-100">
            Next payout
          </h2>
          <p className={`mt-1 font-display text-[44px] leading-none font-extrabold ${due < 0 ? 'text-[#ffb4ab]' : 'text-brass-200'}`}>{inr(Math.abs(due))}</p>
          <p className="mt-2 text-pine-100">{due < 0 ? 'You owe this in commission on pay-at-hotel stays. It is taken from your next online payout, or invoiced if there isn’t one.' : 'For stays that have checked out and haven’t been paid yet.'}</p>
          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/15 pt-4">
            <div>
              <dt className="text-sm text-pine-100/80">Earned</dt>
              <dd className="text-lg font-bold">{inr(earned)}</dd>
            </div>
            <div>
              <dt className="text-sm text-pine-100/80">Commission + GST</dt>
              <dd className="text-lg font-bold">{inr(commission)}</dd>
            </div>
            <div>
              <dt className="text-sm text-pine-100/80">Expected from upcoming</dt>
              <dd className="text-lg font-bold">{inr(expected)}</dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="bank-h" className="panel flex flex-col gap-3 p-6">
          <h2 id="bank-h" className="flex items-center gap-2 text-lg font-bold text-pine-950">
            <Landmark className="h-5 w-5 text-pine-700" aria-hidden="true" /> Payout account
          </h2>
          {bank ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-500">Name</dt>
              <dd className="font-semibold">{bank.payoutName || bank.legalName}</dd>
              <dt className="text-ink-500">Bank</dt>
              <dd className="font-semibold">{bank.bankName || '—'}</dd>
              <dt className="text-ink-500">Account</dt>
              <dd className="font-semibold">ending {bank.accountLast4}</dd>
              <dt className="text-ink-500">IFSC</dt>
              <dd className="font-semibold">{bank.ifsc}</dd>
            </dl>
          ) : (
            <p className="text-ink-700">No bank account yet. Add it under Business and payout in your property.</p>
          )}
          {listings[0] && (
            <Link to={`/app/properties/${listings[0].id}/edit?step=legal`} className="mt-auto text-sm font-semibold text-pine-800">
              {bank ? 'Change bank details' : 'Add bank details'}
            </Link>
          )}
        </section>
      </div>

      <section aria-labelledby="st-h" className="flex flex-col gap-3">
        <h2 id="st-h" className="text-xl font-bold text-pine-950">
          Completed stays
        </h2>
        {completed.length === 0 ? (
          <div className="panel">
            <Empty icon={<Wallet className="h-7 w-7" />} title="No completed stays yet">
              <p className="max-w-sm text-ink-500">Each stay shows here after the guest checks out, with the commission worked out.</p>
            </Empty>
          </div>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line text-sm text-ink-500">
                  <th className="px-4 py-3 font-semibold">Stay</th>
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Paid</th>
                  <th className="px-4 py-3 text-right font-semibold">Guest paid</th>
                  <th className="px-4 py-3 text-right font-semibold">Commission + GST</th>
                  <th className="px-4 py-3 text-right font-semibold">Payout</th>
                </tr>
              </thead>
              <tbody>
                {completed.map(({ r, s }) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      {dayMonth(r.check_in)} to {dayMonth(r.check_out)}
                      <span className="block text-xs text-ink-500">{r.id}</span>
                    </td>
                    <td className="px-4 py-3">{r.guest_name}</td>
                    <td className="px-4 py-3">{s.collectedByHotel ? 'At hotel' : 'Online'}</td>
                    <td className="px-4 py-3 text-right">{inr(r.amount)}</td>
                    <td className="px-4 py-3 text-right">− {inr(s.commission + s.gst)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${s.payout < 0 ? 'text-alert' : 'text-live'}`}>
                      {s.payout < 0 ? '− ' : ''}
                      {inr(Math.abs(s.payout))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[13px] text-ink-500">Tax deducted or collected at source (TDS/TCS) will be shown on each statement once payouts are connected to the payments partner. [Rates to be confirmed by the client’s accountant.]</p>
      </section>
    </div>
  )
}
