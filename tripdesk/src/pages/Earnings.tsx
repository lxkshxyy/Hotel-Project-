import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { inr, todayISO } from '@stayeasy/lib/format'
import { PageHead, Spinner, Stat } from '../components/ui'
import { useBookings } from '../lib/hooks'

export default function Earnings() {
  const { data } = useBookings()
  const months = useMemo(() => [...new Set((data ?? []).map((b) => b.created_at.slice(0, 7)))].sort().reverse(), [data])
  const [month, setMonth] = useState(todayISO().slice(0, 7))
  if (!data) return <Spinner />
  const rows = data.filter((b) => b.created_at.slice(0, 7) === month)
  const ok = rows.filter((b) => b.status === 'confirmed')
  const sum = (k: 'net_amount' | 'markup_amount' | 'selling_amount') => ok.reduce((s, b) => s + b[k], 0)
  const csv = () => {
    const head = ['Booking ID', 'Booked on', 'Guest', 'Hotel', 'Check-in', 'Check-out', 'Status', 'Net paid', 'Markup', 'Customer price']
    const lines = rows.map((b) => [b.id, b.created_at.slice(0, 10), b.guest_name, b.hotel_name, b.check_in, b.check_out, b.status, b.net_amount, b.status === 'confirmed' ? b.markup_amount : 0, b.selling_amount])
    const text = [head, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }))
    a.download = `tripdesk-earnings-${month}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const label = (m: string) => new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  return (
    <div className="page flex flex-col gap-6 pt-7">
      <PageHead title="Earnings" intro="Your markup on every confirmed booking. Cancelled bookings earn nothing.">
        <label className="label flex-row items-center gap-2">
          Month
          <select className="field w-auto" value={month} onChange={(e) => setMonth(e.target.value)}>
            {[...new Set([todayISO().slice(0, 7), ...months])].map((m) => (
              <option key={m} value={m}>
                {label(m)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-line" onClick={csv} disabled={!rows.length}>
          <Download className="h-4 w-4" aria-hidden="true" /> Statement (CSV)
        </button>
      </PageHead>
      <section className="card grid gap-6 p-6 sm:grid-cols-4">
        <Stat label="Confirmed bookings" value={ok.length} />
        <Stat label="Customers paid you" value={inr(sum('selling_amount'))} />
        <Stat label="You paid StayEasy" value={inr(sum('net_amount'))} />
        <Stat label="Your earnings" value={inr(sum('markup_amount'))} tone="earn" />
      </section>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead>
            <tr className="border-b border-line text-sm text-muted">
              <th className="px-4 py-3 font-semibold">Booking</th>
              <th className="px-4 py-3 font-semibold">Guest</th>
              <th className="px-4 py-3 font-semibold">Hotel</th>
              <th className="px-4 py-3 text-right font-semibold">Net</th>
              <th className="px-4 py-3 text-right font-semibold">Customer price</th>
              <th className="px-4 py-3 text-right font-semibold">Earned</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-bold">{b.id}</td>
                <td className="px-4 py-3">{b.guest_name}</td>
                <td className="px-4 py-3">{b.hotel_name}</td>
                <td className="px-4 py-3 text-right">{inr(b.net_amount)}</td>
                <td className="px-4 py-3 text-right">{inr(b.selling_amount)}</td>
                <td className={`px-4 py-3 text-right font-bold ${b.status === 'cancelled' ? 'text-faint line-through' : 'text-earn'}`}>{inr(b.markup_amount)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No bookings in {label(month)}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
