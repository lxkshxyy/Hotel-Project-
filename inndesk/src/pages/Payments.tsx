import { useCloseGuard } from '../components/DiscardDialog'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, ChevronDown, Download, FileText, Handshake, Landmark, Search, ShieldAlert, Wallet } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { RangeCalendar, type DateFilter } from '../components/RangeCalendar'
import { Spinner, Toggle } from '../components/ui'
import { site } from '../config/site'
import { inr, parseISODate, todayISO } from '../lib/format'
import { useListings, useReservations, type ResvRow } from '../lib/hooks'
import { payoutDate, settle } from '../lib/money'
import { answerDispute, getDisputeAnswers, listDisputes, saveListing, useData, useVerifications } from '../lib/store'
import type { Dispute, Listing } from '../lib/types'
import { btnOutline, btnSolid, Card, Dialog, Faq, Field, inputCls, PageTitle } from './info/kit'

const pages = ['payouts', 'transactions', 'past-payouts', 'settings', 'advance', 'compensation', 'invoices', 'disputes'] as const
type Page = (typeof pages)[number]

const nice = (iso: string) => parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const day = (iso: string) => parseISODate(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const pct = (n: number) => `${+(n * 100).toFixed(2)}%`
/** ₹ amount with a proper minus sign for money you owe. */
const money = (n: number) => (n < 0 ? `− ${inr(-n)}` : inr(n))
const gstReg = (l: Listing) => !!(l.legal.hasGstin || l.legal.gstin?.trim())

function csv(name: string, rows: (string | number)[][]) {
  const text = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }))
  a.download = `${name}-${todayISO()}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** One booking with its money worked out. */
type Tx = { r: ResvRow; s: ReturnType<typeof settle>; pay: string; status: 'stay' | 'awaiting' | 'released' | 'cancelled' | 'no-show' }
const statusText: Record<Tx['status'], string> = { stay: 'Stay not completed', awaiting: 'Awaiting payout', released: 'Released', cancelled: 'Cancelled', 'no-show': 'No-show' }
const statusTone: Record<Tx['status'], string> = { stay: 'bg-[#E6EEF7] text-ink-700', awaiting: 'bg-brass-50 text-brass-700', released: 'bg-[#e6f4ec] text-live', cancelled: 'bg-alert-50 text-alert', 'no-show': 'bg-alert-50 text-alert' }

function toTx(r: ResvRow, l: Listing, t: string): Tx {
  const s = settle(r, l)
  const pay = payoutDate(r.check_out)
  const status: Tx['status'] = r.desk === 'cancelled' ? 'cancelled' : r.desk === 'no-show' ? 'no-show' : r.check_out > t ? 'stay' : pay > t ? 'awaiting' : 'released'
  return { r, s, pay, status }
}

/** Payouts wait until the bank account passes the automatic ₹1 check. */
function PayoutHold({ l, base }: { l: Listing; base: string }) {
  const { data } = useVerifications(l.id)
  if (!site.autoVerify || !data) return null
  const bank = data.find((v) => v.kind === 'bank')
  if (bank?.status === 'verified') return null
  const text = !bank ? 'Your bank account hasn’t been verified yet.' : bank.status === 'review' ? 'Your bank account is in another name, so our team is checking it.' : `Your bank account failed verification: ${bank.message}`
  return (
    <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#f3c5c2] bg-alert-50 px-4 py-3 text-[14px] text-ink-900">
      <span className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 shrink-0 text-alert" aria-hidden="true" />
        <span>
          <strong className="font-semibold">Payouts on hold.</strong> {text}
        </span>
      </span>
      <Link to={`${base}/info/finance`} className="text-[14px] font-semibold text-pine-800">
        View verification
      </Link>
    </div>
  )
}

/** Payments for one property: payouts, transactions, settings, invoices and disputes. */
export default function Payments() {
  const { id = '', page = '' } = useParams()
  const { data: listings } = useListings()
  const l = listings?.find((x) => x.id === id)
  const { list, loading } = useReservations(l ? [l] : undefined)
  const t = todayISO()
  const txs = useMemo(() => (l ? list.map((r) => toTx(r, l, t)) : []), [list, l, t])

  if (!pages.includes(page as Page)) return <Navigate to={`/app/properties/${id}/payments/payouts`} replace />
  if (!listings || (l && loading)) return <Spinner />
  if (!l) return <Navigate to="/app/properties" replace />

  const base = `/app/properties/${id}`
  const props = { l, txs, base }
  return (
    <div className="min-h-[calc(100dvh-68px)] bg-white">
      <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-16 sm:px-8">
        {(page === 'payouts' || page === 'past-payouts' || page === 'settings') && <PayoutHold l={l} base={base} />}
        {page === 'payouts' ? <Upcoming {...props} /> : page === 'transactions' ? <Transactions {...props} /> : page === 'past-payouts' ? <Past {...props} /> : page === 'settings' ? <Settings {...props} /> : page === 'advance' ? <Advance {...props} /> : page === 'compensation' ? <Compensation {...props} /> : page === 'invoices' ? <Invoices {...props} /> : <Disputes {...props} />}
      </div>
    </div>
  )
}

type P = { l: Listing; txs: Tx[]; base: string }

function Status({ s }: { s: Tx['status'] }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap ${statusTone[s]}`}>{statusText[s]}</span>
}

function BankCard({ l, base }: { l: Listing; base: string }) {
  const g = l.legal
  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink-900">
        <Landmark className="h-5 w-5 text-pine-800" aria-hidden="true" /> Payout account
      </h2>
      {g.accountLast4 ? (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
          <dt className="text-ink-500">Bank</dt>
          <dd className="text-ink-900">{g.bankName || '—'}</dd>
          <dt className="text-ink-500">Account</dt>
          <dd className="text-ink-900">•••• {g.accountLast4}</dd>
          <dt className="text-ink-500">IFSC</dt>
          <dd className="text-ink-900">{g.ifsc || '—'}</dd>
        </dl>
      ) : (
        <p className="mt-2 text-[14px] text-alert">No bank account added. Payouts can’t be sent until you add one.</p>
      )}
      <Link to={`${base}/payments/settings`} className="mt-3 inline-block text-[14px] font-semibold text-pine-800">
        Payout and tax settings
      </Link>
    </Card>
  )
}

/* ---------------- Payouts (upcoming) ---------------- */

function Upcoming({ l, txs, base }: P) {
  const t = todayISO()
  const due = txs.filter((x) => (x.status === 'awaiting' || x.status === 'stay') && x.pay >= t)
  const dates = [...new Set(due.map((x) => x.pay))].sort()
  const next = dates[0]
  const inNext = due.filter((x) => x.pay === next)
  const pending = inNext.filter((x) => x.status === 'stay').length
  const total = inNext.reduce((n, x) => n + x.s.payout, 0)
  const later = due.filter((x) => x.pay !== next)
  const byDate = [...later.reduce((m, x) => m.set(x.pay, [...(m.get(x.pay) ?? []), x]), new Map<string, Tx[]>())].sort((a, b) => a[0].localeCompare(b[0])).slice(0, 6)
  return (
    <>
      <PageTitle title="Payouts" l={l} intro={`Money for completed stays is paid ${site.payoutCycle}.`} />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="relative overflow-hidden rounded-xl bg-pine-900 p-5 text-white sm:p-6">
            <span aria-hidden="true" className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-pine-800" />
            <div className="relative">
              <span className="flex items-center gap-2 text-[14px] text-pine-100">
                <CalendarClock className="h-4 w-4" aria-hidden="true" /> Next payout {next ? `· ${day(next)}` : ''}
                {pending > 0 && <span className="rounded bg-white/15 px-1.5 text-[11.5px] font-semibold">Expected</span>}
              </span>
              <p className={`mt-1 text-[40px] leading-tight font-semibold ${total < 0 ? 'text-[#ffb4ab]' : 'text-brass-200'}`}>{next ? inr(Math.abs(total)) : inr(0)}</p>
              <p className="text-[14px] text-pine-100">{!next ? 'Nothing waiting. Stays are paid out after check-out.' : total < 0 ? 'You owe this on pay-at-hotel stays. It is taken from your next online payout.' : `For ${inNext.length} stay${inNext.length === 1 ? '' : 's'}${pending ? `, ${pending} not checked out yet` : ''}. Money usually reaches your bank 2–3 working days after release.`}</p>
              {next && (
                <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-white/15 pt-4 text-[13px]">
                  <div>
                    <dt className="text-pine-100/80">Booking amount</dt>
                    <dd className="text-[16px] font-semibold">{inr(inNext.reduce((n, x) => n + x.r.amount, 0))}</dd>
                  </div>
                  <div>
                    <dt className="text-pine-100/80">Commission + GST</dt>
                    <dd className="text-[16px] font-semibold">− {inr(inNext.reduce((n, x) => n + x.s.commission + x.s.gst, 0))}</dd>
                  </div>
                  <div>
                    <dt className="text-pine-100/80">TDS / TCS</dt>
                    <dd className="text-[16px] font-semibold">− {inr(inNext.reduce((n, x) => n + x.s.tds + x.s.tcs, 0))}</dd>
                  </div>
                </dl>
              )}
            </div>
          </section>

          {next && (
            <Card>
              <h2 className="border-b border-line px-4 py-3.5 text-[16px] font-semibold text-ink-900">Stays in this payout</h2>
              <TxTable rows={inNext} compact />
            </Card>
          )}

          <Card>
            <h2 className="border-b border-line px-4 py-3.5 text-[16px] font-semibold text-ink-900">Later payouts (expected)</h2>
            {byDate.length === 0 ? (
              <p className="px-4 py-6 text-[14px] text-ink-700">No upcoming stays yet.</p>
            ) : (
              byDate.map(([d, rows]) => (
                <div key={d} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 text-[14px] last:border-b-0">
                  <span>
                    <strong className="block font-medium text-ink-900">{day(d)}</strong>
                    <span className="text-[12.5px] text-ink-500">
                      {rows.length} stay{rows.length === 1 ? '' : 's'}
                      {rows.some((x) => x.r.check_out > t) ? ' · after check-out' : ''}
                    </span>
                  </span>
                  <strong className="font-medium text-ink-900">{money(rows.reduce((n, x) => n + x.s.payout, 0))}</strong>
                </div>
              ))
            )}
          </Card>
        </div>
        <aside className="flex flex-col gap-5">
          <BankCard l={l} base={base} />
          <Faq
            items={[
              ['When do I get paid?', <p key="a">Every Tuesday, for stays that checked out in the week before (Monday to Sunday).</p>],
              ['Why is a payout negative?', <p key="b">On pay-at-hotel stays you collect the money yourself, so the commission and tax are taken from your online payouts instead.</p>],
              ['What is deducted?', <p key="c">{`${pct(site.commissionRate)} commission on the room amount, ${pct(site.gstOnCommission)} GST on that commission, ${pct(site.tdsRate)} TDS (Income-tax section 194-O), and ${pct(site.tcsRate)} GST TCS if your property is GST-registered.`}</p>],
            ]}
          />
        </aside>
      </div>
    </>
  )
}

function TxTable({ rows, compact = false }: { rows: Tx[]; compact?: boolean }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-[13.5px]">
        <thead className="bg-[#F4F8FC] text-left text-ink-900">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Booking ID</th>
            <th className="px-3 py-2.5 font-semibold">Guest</th>
            <th className="px-3 py-2.5 font-semibold">Check-out</th>
            <th className="px-3 py-2.5 font-semibold">Paid</th>
            <th className="px-3 py-2.5 text-right font-semibold">Booking amount</th>
            <th className="px-3 py-2.5 text-right font-semibold">Commission + GST</th>
            <th className="px-3 py-2.5 text-right font-semibold">TDS / TCS</th>
            <th className="px-3 py-2.5 text-right font-semibold">Net payout</th>
            {!compact && <th className="px-3 py-2.5 font-semibold">Payout date</th>}
            {!compact && <th className="px-4 py-2.5 font-semibold">Status</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => {
            const off = x.status === 'cancelled' || x.status === 'no-show'
            return (
              <tr key={x.r.id} className="border-t border-line text-ink-900">
                <td className="px-4 py-2.5 font-medium">{x.r.id}</td>
                <td className="px-3 py-2.5">{x.r.guest_name}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{nice(x.r.check_out)}</td>
                <td className="px-3 py-2.5">{x.s.collectedByHotel ? 'At hotel' : 'Online'}</td>
                <td className="px-3 py-2.5 text-right">{off ? '—' : inr(x.r.amount)}</td>
                <td className="px-3 py-2.5 text-right">{off ? '—' : `− ${inr(x.s.commission + x.s.gst)}`}</td>
                <td className="px-3 py-2.5 text-right">{off ? '—' : `− ${inr(x.s.tds + x.s.tcs)}`}</td>
                <td className={`px-3 py-2.5 text-right font-semibold ${x.s.payout < 0 && !off ? 'text-alert' : ''}`}>{off ? '—' : money(x.s.payout)}</td>
                {!compact && <td className="px-3 py-2.5 whitespace-nowrap">{off ? '—' : nice(x.pay)}</td>}
                {!compact && (
                  <td className="px-4 py-2.5">
                    <Status s={x.status} />
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ---------------- Transactions ---------------- */

function Transactions({ l, txs }: P) {
  const [range, setRange] = useState<DateFilter>(null)
  const [q, setQ] = useState('')
  const [paid, setPaid] = useState('all')
  const [status, setStatus] = useState('all')
  const [shown, setShown] = useState(25)
  const rows = txs
    .filter((x) => {
      if (q.trim() && !`${x.r.id} ${x.r.guest_name}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      if (paid === 'online' && x.s.collectedByHotel) return false
      if (paid === 'hotel' && !x.s.collectedByHotel) return false
      if (status !== 'all' && x.status !== status) return false
      if (range) {
        const d = range.mode === 'booking' ? x.r.created_at.slice(0, 10) : range.mode === 'checkin' ? x.r.check_in : x.r.check_out
        if (d < range.from || d > range.to) return false
      }
      return true
    })
    .sort((a, b) => b.r.check_out.localeCompare(a.r.check_out))
  const live = rows.filter((x) => x.status !== 'cancelled' && x.status !== 'no-show')
  return (
    <>
      <PageTitle title="Transactions" l={l} intro="Every booking with what you earn from it.">
        <button
          type="button"
          disabled={!rows.length}
          onClick={() => csv('transactions', [['Booking ID', 'Guest', 'Check-in', 'Check-out', 'Paid', 'Booking amount', 'Room GST', 'Commission', 'GST on commission', 'TDS', 'TCS', 'Net payout', 'Payout date', 'Status'], ...rows.map((x) => [x.r.id, x.r.guest_name, x.r.check_in, x.r.check_out, x.s.collectedByHotel ? 'At hotel' : 'Online', x.r.amount, x.r.tax, x.s.commission, x.s.gst, x.s.tds, x.s.tcs, x.s.payout, x.pay, statusText[x.status]])])}
          className={`${btnOutline} h-9`}
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Download CSV
        </button>
      </PageTitle>
      <div className="mt-5 grid gap-3 md:grid-cols-[1.2fr_1fr_180px_200px]">
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Booking ID or guest name" className={`${inputCls} h-[52px] pl-9`} />
        </label>
        <RangeCalendar value={range} onChange={setRange} />
        <select aria-label="Paid" value={paid} onChange={(e) => setPaid(e.target.value)} className={`${inputCls} h-[52px]`}>
          <option value="all">Online &amp; at hotel</option>
          <option value="online">Paid online</option>
          <option value="hotel">Pay at hotel</option>
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} h-[52px]`}>
          <option value="all">All statuses</option>
          {(Object.keys(statusText) as Tx['status'][]).map((k) => (
            <option key={k} value={k}>
              {statusText[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ['Bookings', String(live.length)],
            ['Booking amount', inr(live.reduce((n, x) => n + x.r.amount, 0))],
            ['Commission + GST + tax', `− ${inr(live.reduce((n, x) => n + x.s.commission + x.s.gst + x.s.tds + x.s.tcs, 0))}`],
            ['Net payout', money(live.reduce((n, x) => n + x.s.payout, 0))],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-[#F4F8FC] px-4 py-3">
            <span className="block text-[12.5px] text-ink-500">{k}</span>
            <strong className="text-[18px] font-semibold text-ink-900">{v}</strong>
          </div>
        ))}
      </div>
      <Card className="mt-4 overflow-hidden">{rows.length ? <TxTable rows={rows.slice(0, shown)} /> : <p className="px-4 py-12 text-center text-[14.5px] text-ink-700">No transactions match these filters.</p>}</Card>
      {rows.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + 25)} className={`${btnOutline} mx-auto mt-4 flex`}>
          Show more ({rows.length - shown})
        </button>
      )}
    </>
  )
}

/* ---------------- Past payouts ---------------- */

function Past({ l, txs }: P) {
  const done = txs.filter((x) => x.status === 'released')
  const groups = [...done.reduce((m, x) => m.set(x.pay, [...(m.get(x.pay) ?? []), x]), new Map<string, Tx[]>())].sort((a, b) => b[0].localeCompare(a[0]))
  const [open, setOpen] = useState<string>('')
  const [shown, setShown] = useState(12)
  return (
    <>
      <PageTitle title="Past payouts" l={l} intro="Payouts whose release date has passed, newest first." />
      <Card className="mt-6 overflow-hidden">
        <div className="hidden grid-cols-[1.2fr_1fr_1.4fr_1fr_1fr_40px] bg-[#F4F8FC] px-4 py-2.5 text-[13.5px] font-semibold text-ink-900 md:grid">
          <span>Payout date</span>
          <span>Stays</span>
          <span>Check-outs covered</span>
          <span className="text-right">Amount</span>
          <span className="pl-4">Bank reference</span>
          <span />
        </div>
        {groups.length === 0 && <p className="px-4 py-12 text-center text-[14.5px] text-ink-700">No past payouts yet.</p>}
        {groups.slice(0, shown).map(([d, rows]) => {
          const isOpen = open === d
          const outs = rows.map((x) => x.r.check_out).sort()
          const amt = rows.reduce((n, x) => n + x.s.payout, 0)
          return (
            <div key={d} className="border-t border-line">
              <button type="button" onClick={() => setOpen(isOpen ? '' : d)} aria-expanded={isOpen} className="grid w-full grid-cols-2 gap-2 px-4 py-3 text-left text-[14px] text-ink-900 hover:bg-[#F4F8FC] md:grid-cols-[1.2fr_1fr_1.4fr_1fr_1fr_40px] md:items-center">
                <span className="font-medium">
                  {day(d)}
                  <span className="ml-2 inline-block rounded bg-[#e6f4ec] px-1.5 text-[11.5px] font-semibold text-live">Released</span>
                </span>
                <span className="text-right md:text-left">{rows.length}</span>
                <span className="text-ink-700">
                  {nice(outs[0])} – {nice(outs[outs.length - 1])}
                </span>
                <strong className={`text-right font-semibold ${amt < 0 ? 'text-alert' : ''}`}>{money(amt)}</strong>
                <span className="text-ink-500 md:pl-4">—</span>
                <ChevronDown className={`h-4 w-4 justify-self-end text-ink-700 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-line bg-[#F4F8FC]">
                      <TxTable rows={rows} compact />
                      <div className="flex justify-end px-4 py-2.5">
                        <button type="button" onClick={() => csv(`payout-${d}`, [['Booking ID', 'Guest', 'Check-out', 'Booking amount', 'Commission', 'GST on commission', 'TDS', 'TCS', 'Net payout'], ...rows.map((x) => [x.r.id, x.r.guest_name, x.r.check_out, x.r.amount, x.s.commission, x.s.gst, x.s.tds, x.s.tcs, x.s.payout])])} className="flex items-center gap-1.5 text-[13.5px] font-semibold text-pine-800">
                          <Download className="h-4 w-4" aria-hidden="true" /> Download this payout
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </Card>
      {groups.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + 12)} className={`${btnOutline} mx-auto mt-4 flex`}>
          Show older payouts ({groups.length - shown})
        </button>
      )}
      <p className="mt-3 text-[12.5px] text-ink-500">“Released” means the payout date has passed. The bank reference (UTR) shows here once finance records the transfer.</p>
    </>
  )
}

/* ---------------- Payout and tax settings ---------------- */

function Settings({ l, base }: P) {
  const g = l.legal
  const [emails, setEmails] = useState(l.legal.payoutEmails ?? true)
  const Row = ({ k, v }: { k: string; v: ReactNode }) => (
    <div className="grid grid-cols-[150px_1fr] gap-3 border-b border-line py-3 text-[14.5px] last:border-b-0 sm:grid-cols-[220px_1fr]">
      <dt className="text-ink-700">{k}</dt>
      <dd className="font-medium text-ink-900">{v}</dd>
    </div>
  )
  return (
    <>
      <PageTitle title="Payout and tax settings" l={l} />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[18px] font-semibold text-ink-900">
                <Landmark className="h-5 w-5 text-pine-800" aria-hidden="true" /> Bank account
              </h2>
              <Link to={`${base}/edit?step=legal&lsec=2`} className="text-[14px] font-semibold text-pine-800">
                Change
              </Link>
            </div>
            <dl className="mt-2">
              <Row k="Account holder" v={g.payoutName || '—'} />
              <Row k="Bank" v={g.bankName || '—'} />
              <Row k="Account number" v={g.accountLast4 ? `•••• •••• ${g.accountLast4}` : '—'} />
              <Row k="IFSC" v={g.ifsc || '—'} />
              <Row k="Payout schedule" v={`Weekly, ${site.payoutCycle}`} />
            </dl>
          </Card>
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-ink-900">Tax</h2>
              <Link to={`${base}/edit?step=legal&lsec=1`} className="text-[14px] font-semibold text-pine-800">
                Change
              </Link>
            </div>
            <dl className="mt-2">
              <Row k="PAN" v={g.pan ? `${g.pan.slice(0, 2)}******${g.pan.slice(-2)}` : '—'} />
              <Row k="GSTIN" v={g.hasGstin === false ? 'Not registered for GST' : g.gstin || '—'} />
              <Row k="TDS (section 194-O)" v={`${pct(site.tdsRate)} of the booking amount`} />
              <Row k="GST TCS (section 52)" v={gstReg(l) ? `${pct(site.tcsRate)} of the room amount` : 'Not deducted (not GST-registered)'} />
            </dl>
          </Card>
          <Card className="p-4 sm:p-5">
            <Toggle
              checked={emails}
              onChange={(v) => {
                setEmails(v)
                void saveListing({ ...l, legal: { ...l.legal, payoutEmails: v } })
              }}
              label="Email me a statement after each payout"
              hint={`Sent to ${l.basics.email}`}
            />
          </Card>
        </div>
        <Faq
          items={[
            ['Can I change the payout day?', <p key="a">Not yet. All partners are paid weekly on Tuesdays.</p>],
            ['Where do I get TDS certificates?', <p key="b">Form 16A for TDS deducted under section 194-O is issued every quarter after the TDS return is filed.</p>],
          ]}
        />
      </div>
    </>
  )
}

/* ---------------- Advance transactions ---------------- */

function Advance({ l, txs }: P) {
  const held = txs.filter((x) => x.status === 'stay' && !x.s.collectedByHotel)
  const total = held.reduce((n, x) => n + x.s.earned, 0)
  return (
    <>
      <PageTitle title="Advance transactions" l={l} intro={`Money guests have paid online for stays that haven’t finished yet. ${site.marketplace} holds it and pays you after check-out.`} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-pine-900 px-4 py-4 text-white">
          <span className="flex items-center gap-2 text-[13px] text-pine-100">
            <Wallet className="h-4 w-4" aria-hidden="true" /> Held for you
          </span>
          <strong className="text-[26px] font-semibold text-brass-200">{inr(total)}</strong>
        </div>
        <div className="rounded-lg bg-[#F4F8FC] px-4 py-4">
          <span className="block text-[13px] text-ink-500">Prepaid bookings</span>
          <strong className="text-[26px] font-semibold text-ink-900">{held.length}</strong>
        </div>
        <div className="rounded-lg bg-[#F4F8FC] px-4 py-4">
          <span className="block text-[13px] text-ink-500">Guests paid in total</span>
          <strong className="text-[26px] font-semibold text-ink-900">{inr(held.reduce((n, x) => n + x.r.amount, 0))}</strong>
        </div>
      </div>
      <Card className="mt-5 overflow-hidden">
        {held.length === 0 ? (
          <p className="px-4 py-12 text-center text-[14.5px] text-ink-700">No prepaid stays coming up.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[13.5px]">
              <thead className="bg-[#F4F8FC] text-left text-ink-900">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Booking ID</th>
                  <th className="px-3 py-2.5 font-semibold">Guest</th>
                  <th className="px-3 py-2.5 font-semibold">Stay</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Guest paid</th>
                  <th className="px-3 py-2.5 text-right font-semibold">You’ll receive</th>
                  <th className="px-4 py-2.5 font-semibold">Expected payout</th>
                </tr>
              </thead>
              <tbody>
                {held
                  .sort((a, b) => a.r.check_in.localeCompare(b.r.check_in))
                  .map((x) => (
                    <tr key={x.r.id} className="border-t border-line text-ink-900">
                      <td className="px-4 py-2.5 font-medium">{x.r.id}</td>
                      <td className="px-3 py-2.5">{x.r.guest_name}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {nice(x.r.check_in)} – {nice(x.r.check_out)}
                      </td>
                      <td className="px-3 py-2.5 text-right">{inr(x.r.amount)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{inr(x.s.earned)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{day(x.pay)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-[12.5px] text-ink-500">If a guest cancels within the free-cancellation window, the money is refunded to them and removed from here.</p>
    </>
  )
}

/* ---------------- Contracted compensation ---------------- */

function Compensation({ l, base }: P) {
  const reg = gstReg(l)
  const terms: [string, string, string][] = [
    ['Commission', pct(site.commissionRate), 'Of the room amount (before room GST), on every completed stay.'],
    ['GST on commission', pct(site.gstOnCommission), 'Charged on the commission. Claim it as input credit if you are GST-registered.'],
    ['TDS', pct(site.tdsRate), 'Income-tax section 194-O, on the booking amount.'],
    ['GST TCS', reg ? pct(site.tcsRate) : 'Not applicable', reg ? 'CGST section 52, on the room amount.' : 'Only deducted from GST-registered properties.'],
    ['Payout cycle', 'Weekly', site.payoutCycle.charAt(0).toUpperCase() + site.payoutCycle.slice(1) + '.'],
    ['No-show / cancellation', 'As per your policy', 'Commission is charged only on money you keep.'],
  ]
  return (
    <>
      <PageTitle title="Contracted compensation" l={l} intro="The terms you agreed with when you listed your property." />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="overflow-hidden">
            <h2 className="flex items-center gap-2 border-b border-line px-4 py-3.5 text-[16px] font-semibold text-ink-900">
              <Handshake className="h-5 w-5 text-pine-800" aria-hidden="true" /> Your contract
            </h2>
            {terms.map(([k, v, d]) => (
              <div key={k} className="grid gap-1 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[200px_160px_1fr] sm:gap-4">
                <span className="text-[14px] text-ink-700">{k}</span>
                <strong className="text-[15px] font-semibold text-ink-900">{v}</strong>
                <span className="text-[13.5px] text-ink-500">{d}</span>
              </div>
            ))}
          </Card>
          <Card className="p-4 sm:p-5">
            <h2 className="text-[16px] font-semibold text-ink-900">Compensation entries</h2>
            <p className="mt-1 text-[14px] text-ink-700">Amounts owed between you and {site.marketplace} outside normal bookings, such as relocating a guest when the property was overbooked. None so far.</p>
          </Card>
        </div>
        <Card className="p-4 text-[14px] leading-relaxed text-ink-700">
          <strong className="block text-[15px] font-semibold text-ink-900">Partner Agreement</strong>
          {l.legal.agreed ? 'You accepted the Partner Agreement when you listed.' : 'You haven’t accepted the Partner Agreement yet.'}
          <Link to={`${base}/help/partner-agreement`} className="mt-2 block font-semibold text-pine-800">
            Read the agreement
          </Link>
        </Card>
      </div>
    </>
  )
}

/* ---------------- Commission invoices ---------------- */

function Invoices({ l, txs }: P) {
  const done = txs.filter((x) => x.status === 'released' || x.status === 'awaiting')
  const months = [...done.reduce((m, x) => m.set(x.r.check_out.slice(0, 7), [...(m.get(x.r.check_out.slice(0, 7)) ?? []), x]), new Map<string, Tx[]>())].sort((a, b) => b[0].localeCompare(a[0]))
  const [view, setView] = useState<[string, Tx[]] | null>(null)
  const label = (ym: string) => parseISODate(`${ym}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  return (
    <>
      <PageTitle title="Commission invoices" l={l} intro="Monthly statements of the commission and GST charged on stays that checked out in each month." />
      <Card className="mt-6 overflow-hidden">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[14px]">
            <thead className="bg-[#F4F8FC] text-left text-ink-900">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Month</th>
                <th className="px-3 py-2.5 font-semibold">Stays</th>
                <th className="px-3 py-2.5 text-right font-semibold">Commission</th>
                <th className="px-3 py-2.5 text-right font-semibold">GST (18%)</th>
                <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                <th className="px-4 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {months.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-ink-700">
                    No completed stays yet.
                  </td>
                </tr>
              )}
              {months.map(([ym, rows]) => {
                const c = rows.reduce((n, x) => n + x.s.commission, 0)
                const g = rows.reduce((n, x) => n + x.s.gst, 0)
                return (
                  <tr key={ym} className="border-t border-line text-ink-900">
                    <td className="px-4 py-3 font-medium">{label(ym)}</td>
                    <td className="px-3 py-3">{rows.length}</td>
                    <td className="px-3 py-3 text-right">{inr(c)}</td>
                    <td className="px-3 py-3 text-right">{inr(g)}</td>
                    <td className="px-3 py-3 text-right font-semibold">{inr(c + g)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button type="button" onClick={() => setView([ym, rows])} className="mr-4 text-[13.5px] font-semibold text-pine-800 hover:underline">
                        View
                      </button>
                      <button type="button" onClick={() => csv(`commission-${ym}`, [['Booking ID', 'Guest', 'Check-out', 'Room amount', 'Commission', 'GST on commission', 'Total'], ...rows.map((x) => [x.r.id, x.r.guest_name, x.r.check_out, x.s.roomAmount, x.s.commission, x.s.gst, x.s.commission + x.s.gst])])} className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-pine-800 hover:underline">
                        <Download className="h-4 w-4" aria-hidden="true" /> CSV
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-[12.5px] text-ink-500">These are statements. The GST tax invoice for each month is issued by {site.marketplace} finance and emailed to {l.basics.email}.</p>
      <AnimatePresence>
        {view && (
          <Dialog title={`Commission statement · ${label(view[0])}`} onClose={() => setView(null)} wide>
            <div className="flex items-start gap-3 rounded-lg bg-[#F4F8FC] p-3 text-[13.5px] text-ink-700">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-pine-800" aria-hidden="true" />
              <span>
                Billed to <strong className="text-ink-900">{l.legal.legalName || l.basics.name}</strong>
                {l.legal.gstin ? ` · GSTIN ${l.legal.gstin}` : ''}
              </span>
            </div>
            <table className="mt-3 w-full text-[13.5px]">
              <tbody>
                {view[1].map((x) => (
                  <tr key={x.r.id} className="border-b border-line">
                    <td className="py-2">{x.r.id}</td>
                    <td className="py-2 text-ink-700">{nice(x.r.check_out)}</td>
                    <td className="py-2 text-right">{inr(x.s.commission + x.s.gst)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2.5" colSpan={2}>
                    Total (commission + GST)
                  </td>
                  <td className="py-2.5 text-right">{inr(view[1].reduce((n, x) => n + x.s.commission + x.s.gst, 0))}</td>
                </tr>
              </tbody>
            </table>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  )
}

/* ---------------- Chargeback disputes ---------------- */

const evidenceOptions = ['Guest’s ID proof collected at check-in', 'Signed registration card', 'Check-in and check-out record', 'Bill / folio shared with the guest', 'Messages with the guest']
const dTone: Record<Dispute['status'], string> = { open: 'bg-alert-50 text-alert', responded: 'bg-brass-50 text-brass-700', won: 'bg-[#e6f4ec] text-live', lost: 'bg-[#E6EEF7] text-ink-700' }
const dText: Record<Dispute['status'], string> = { open: 'Action needed', responded: 'Response sent', won: 'Won', lost: 'Lost' }

function Disputes({ l }: P) {
  const list = useData(async () => listDisputes(l.slug), [l.slug]).data ?? []
  const answers = useData(async () => getDisputeAnswers(), []).data ?? {}
  const [answering, setAnswering] = useState<Dispute | null>(null)
  const open = list.filter((d) => d.status === 'open')
  return (
    <>
      <PageTitle title="Chargeback disputes" l={l} intro="When a guest asks their bank to reverse a card payment, you can send proof that the stay happened." />
      {open.length > 0 && (
        <p className="mt-5 flex items-start gap-2.5 rounded-lg border border-alert/30 bg-alert-50 px-4 py-3 text-[14px] text-alert">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {open.length} dispute{open.length === 1 ? ' needs' : 's need'} a response. If you don’t respond by the date shown, the amount is taken from your next payout.
        </p>
      )}
      <Card className="mt-5 overflow-hidden">
        {list.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-pine-700" aria-hidden="true" />
            <p className="mt-2 text-[15px] font-medium text-ink-900">No chargebacks</p>
            <p className="mt-1 text-[13.5px] text-ink-700">You’ll see disputes here if a guest challenges a card payment.</p>
          </div>
        ) : (
          list.map((d) => (
            <div key={d.id} className="flex flex-wrap items-start gap-4 border-b border-line px-4 py-4 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-[15px] font-semibold text-ink-900">{d.booking_id}</strong>
                  <span className={`rounded px-2 py-0.5 text-[12px] font-semibold ${dTone[d.status]}`}>{dText[d.status]}</span>
                </div>
                <p className="mt-1 text-[14px] text-ink-900">
                  {d.guest_name} · {inr(d.amount)} · {d.reason}
                </p>
                <p className="text-[12.5px] text-ink-500">
                  Raised {nice(d.raised_at)}
                  {d.status === 'open' ? ` · Respond by ${nice(d.respond_by)}` : ''}
                </p>
                {answers[d.id] && <p className="mt-2 rounded-md bg-[#F4F8FC] px-3 py-2 text-[13px] text-ink-700">Your response: {answers[d.id].text}</p>}
              </div>
              {d.status === 'open' && (
                <button type="button" onClick={() => setAnswering(d)} className={btnSolid}>
                  Respond
                </button>
              )}
            </div>
          ))
        )}
      </Card>
      <AnimatePresence>{answering && <Respond key={answering.id} d={answering} onClose={() => setAnswering(null)} />}</AnimatePresence>
    </>
  )
}

function Respond({ d, onClose }: { d: Dispute; onClose: () => void }) {
  const [text, setText] = useState('')
  const [ev, setEv] = useState<string[]>([])
  const ok = text.trim().length >= 30 && ev.length > 0
  const [close, discard] = useCloseGuard(!!text.trim() || ev.length > 0, onClose)
  return (
    <>
    {discard}
    <Dialog
      wide
      title={`Respond to dispute · ${d.booking_id}`}
      onClose={close}
      footer={
        <>
          <button type="button" onClick={close} className={btnOutline}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!ok}
            onClick={() => {
              answerDispute(d.id, { text: text.trim(), evidence: ev, at: new Date().toISOString() })
              onClose()
            }}
            className={btnSolid}
          >
            Send response
          </button>
        </>
      }
    >
      <p className="text-[14px] text-ink-700">
        {d.guest_name} disputed {inr(d.amount)}: “{d.reason}”.
      </p>
      <div className="mt-4">
        <Field label="What happened?" hint={`${text.trim().length} characters · at least 30`} htmlFor="dp-text">
          <textarea id="dp-text" rows={4} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. The guest checked in on 3 Nov at 2 PM and checked out on 5 Nov. They used room service on both days." className="w-full rounded-lg border border-ink-400 px-3 py-2.5 text-[15px] outline-none focus:border-pine-700 focus:ring-1 focus:ring-pine-700" />
        </Field>
      </div>
      <fieldset className="mt-4">
        <legend className="mb-2 text-[14px] text-ink-900">Proof you can share (pick at least one)</legend>
        <div className="flex flex-col gap-2">
          {evidenceOptions.map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-2.5 text-[14.5px] text-ink-900">
              <input type="checkbox" checked={ev.includes(o)} onChange={() => setEv((x) => (x.includes(o) ? x.filter((y) => y !== o) : [...x, o]))} className="h-4 w-4 accent-pine-800" />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-4 text-[12.5px] text-ink-500">Our team will ask you for copies of the documents you tick.</p>
    </Dialog>
    </>
  )
}
