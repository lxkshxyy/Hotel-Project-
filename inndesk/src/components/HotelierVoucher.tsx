import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase, Printer, X } from 'lucide-react'
import { useEffect } from 'react'
import { site } from '../config/site'
import { cancellationOptions } from '../data/options'
import { addDays, inr, parseISODate } from '../lib/format'
import type { ResvRow } from '../lib/hooks'
import { settle } from '../lib/money'
import type { Listing } from '../lib/types'

const d = (iso: string) => parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ (\d\d)$/, " '$1")
const dt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/ (\d\d),/, " '$1,")

/** Cancellation wording for the booking, from the property's policy. */
function cancelText(l: Listing | undefined, r: ResvRow) {
  const id = l?.policies.cancellation ?? 'free24'
  const time = l?.policies.checkIn || '12:00 PM'
  if (id === 'nonref') return 'Non-refundable: cancelling this booking is charged at 100% of the booking amount.'
  if (id === 'freeCheckin') return `Free cancellation (100% refund) if cancelled before check-in on ${d(r.check_in)}, ${time}. Cancellations are only allowed before check-in.`
  const hours = id === 'free24' ? 1 : id === 'free48' ? 2 : 3
  return `Free cancellation (100% refund) if cancelled before ${d(addDays(r.check_in, -hours))}, ${time}. After that, cancelling is charged at 100% of the booking amount. Cancellations are only allowed before check-in.`
}

function printVoucher() {
  document.body.classList.add('printing-voucher')
  const done = () => {
    document.body.classList.remove('printing-voucher')
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  window.print()
  setTimeout(done, 1000)
}

export function HotelierVoucher({ r, l, status, pending, onAcknowledge, onClose }: { r: ResvRow | null; l?: Listing; status: string; pending: boolean; onAcknowledge: () => void; onClose: () => void }) {
  useEffect(() => {
    if (!r) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [r, onClose])

  return (
    <AnimatePresence>
      {r && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-ink-900/45 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Hotelier voucher" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }} className="w-full max-w-[860px] rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-2xl border-b border-line bg-white px-5 py-3 print:hidden">
              <strong className="text-[16px] font-semibold text-ink-900">Voucher · {r.id}</strong>
              <div className="flex items-center gap-2">
                <button type="button" onClick={printVoucher} className="flex h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-[14px] font-semibold text-pine-800 hover:border-pine-700 hover:bg-pine-50">
                  <Printer className="h-4 w-4" aria-hidden="true" /> Print / Save as PDF
                </button>
                <button type="button" onClick={onClose} aria-label="Close voucher" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-paper">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <Body r={r} l={l} status={status} pending={pending} onAcknowledge={onAcknowledge} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Body({ r, l, status, pending, onAcknowledge }: { r: ResvRow; l?: Listing; status: string; pending: boolean; onAcknowledge: () => void }) {
  const s = settle(r)
  const perNight = (n: number) => n / Math.max(1, r.nights)
  const nights = Array.from({ length: r.nights }, (_, i) => addDays(r.check_in, i))
  const perRoomGuests = Math.max(1, Math.round(r.guests / Math.max(1, r.rooms)))
  const addr = l ? [l.location.address, l.location.area, l.location.city, [l.location.state, l.location.pincode].filter(Boolean).join(' ')].filter((x) => x && x.trim()).join(', ') : ''
  const label = 'text-[11.5px] font-semibold tracking-wide text-ink-500 uppercase'
  const val = 'mt-0.5 block text-[15.5px] font-bold text-ink-900'
  const cancelLabel = cancellationOptions.find((c) => c.id === (l?.policies.cancellation ?? 'free24'))?.label
  return (
    <div className="voucher-print p-5 font-[Georgia,serif] sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <span className="font-[Roboto,sans-serif] text-[26px] font-black tracking-wide text-pine-900">{site.marketplace}</span>
          <h2 className="mt-2 text-[28px] font-bold text-ink-900">Hotelier Voucher</h2>
        </div>
        <div className="max-w-[380px] text-right">
          <strong className="block text-[16px] text-ink-900">{r.hotel_name}</strong>
          {addr && <span className="mt-1 block text-[13px] text-ink-700">{addr}</span>}
        </div>
      </div>

      <div className="mt-6 grid gap-0 overflow-hidden rounded-lg bg-[#f6f7f6] sm:grid-cols-2">
        <div className="p-5 sm:border-r-2 sm:border-white">
          <span className={label}>Primary guest details</span>
          <span className="mt-1 flex items-center gap-2 text-[18px] font-bold text-ink-900">
            <Briefcase className="h-4 w-4 text-pine-700" aria-hidden="true" /> {r.guest_name}
          </span>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">
            <div>
              <span className={label}>Check-in</span>
              <span className={val}>{d(r.check_in)}</span>
              <span className="text-[12.5px] text-ink-700">{l?.policies.checkIn || '12:00 PM'}</span>
            </div>
            <div>
              <span className={label}>Check-out</span>
              <span className={val}>
                {d(r.check_out)} ({r.nights} {r.nights === 1 ? 'Night' : 'Nights'})
              </span>
              <span className="text-[12.5px] text-ink-700">{l?.policies.checkOut || '11:00 AM'}</span>
            </div>
          </div>
          <span className={`${label} mt-4 block`}>Total no. of guest(s)</span>
          <span className={val}>
            {r.guests} {r.guests === 1 ? 'Guest' : 'Guests'}
          </span>
          {r.special_requests && (
            <>
              <span className={`${label} mt-4 block`}>Special requests</span>
              <span className="text-[14px] text-ink-900">{r.special_requests}</span>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 p-5">
          <div>
            <span className={label}>Booking ID</span>
            <span className={val}>{r.id}</span>
          </div>
          <div>
            <span className={label}>Booked on</span>
            <span className={val}>{dt(r.created_at)}</span>
          </div>
          <div>
            <span className={label}>Booking status</span>
            <span className={val}>{status}</span>
          </div>
          <div>
            <span className={label}>Payment status</span>
            <span className={val}>{r.pay_mode === 'now' ? 'Paid online' : 'Pay at hotel'}</span>
          </div>
          <div>
            <span className={label}>Booked via</span>
            <span className={val}>{site.marketplace}</span>
          </div>
          <div>
            <span className={label}>Booking type</span>
            <span className={val}>{r.amount === 0 ? 'Free Room Night' : 'Standard rate'}</span>
          </div>
          {pending && (
            <button type="button" onClick={onAcknowledge} className="col-span-2 mt-1 h-11 rounded-lg bg-pine-800 font-[Roboto,sans-serif] text-[14.5px] font-bold tracking-wide text-white uppercase hover:bg-pine-900 print:hidden">
              Acknowledge booking
            </button>
          )}
        </div>
      </div>

      <h3 className="mt-7 border-t border-line pt-5 text-[19px] font-bold text-ink-900">
        {r.rooms} Room{r.rooms === 1 ? '' : 's'}
      </h3>
      {Array.from({ length: r.rooms }, (_, i) => (
        <div key={i} className="mt-4 pl-1">
          <strong className="text-[16px] text-ink-900">1 x {r.room_name}</strong>
          <p className="mt-1 ml-4 text-[13.5px] text-ink-700">
            {perRoomGuests} {perRoomGuests === 1 ? 'Guest' : 'Guests'} • Room only
          </p>
          <p className="mt-2 ml-4 text-[13.5px] font-bold text-ink-900">Cancellation Policy{cancelLabel ? ` · ${cancelLabel}` : ''}</p>
          <p className="mt-1 ml-4 text-[13px] leading-relaxed text-ink-700">• {cancelText(l, r)}</p>
        </div>
      ))}

      <h3 className="mt-7 border-t border-line pt-5 text-[19px] font-bold text-ink-900">Payment</h3>
      {r.pay_mode === 'now' ? (
        <>
          <p className="mt-2 text-[14px] text-ink-700">Payable to property</p>
          <strong className="text-[19px] text-ink-900">{inr(s.earned)}</strong>
          <p className="mt-1 text-[13px] text-ink-700">
            {site.marketplace} releases payouts {site.payoutCycle}. It usually takes 2–3 working days to reach your bank account.
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-[14px] text-ink-700">Collect from the guest at check-in</p>
          <strong className="text-[19px] text-ink-900">{inr(r.amount)}</strong>
          <p className="mt-1 text-[13px] text-ink-700">
            Our commission of {inr(s.commission + s.gst)} (including GST) is adjusted in your next payout.
          </p>
        </>
      )}

      <h3 className="mt-7 border-t border-line pt-5 text-[17px] font-bold text-ink-900">Room wise Payment Breakup (in ₹)</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse font-[Roboto,sans-serif] text-[13px]">
          <thead>
            <tr className="border-b border-line text-right align-bottom text-ink-900">
              <th className="py-2 text-left font-semibold">Date</th>
              <th className="py-2 font-semibold">Room charges (R)</th>
              <th className="py-2 font-semibold">Extra adult/child (E)</th>
              <th className="py-2 font-semibold">Fees &amp; charges (F)</th>
              <th className="py-2 font-semibold">Taxes (T)</th>
              <th className="py-2 font-semibold">Gross charges (G=R+E+F+T)</th>
              <th className="py-2 font-semibold">Commission incl. GST (C)</th>
              <th className="py-2 font-semibold">Net amount (G−C)</th>
            </tr>
          </thead>
          <tbody>
            {nights.map((n) => {
              const room = perNight(s.roomAmount)
              const tax = perNight(r.tax)
              const com = perNight(s.commission + s.gst)
              return (
                <tr key={n} className="border-b border-line text-right text-ink-900">
                  <td className="py-2 text-left">{d(n)}</td>
                  <td className="py-2">{room.toFixed(2)}</td>
                  <td className="py-2">0.00</td>
                  <td className="py-2">0.00</td>
                  <td className="py-2">{tax.toFixed(2)}</td>
                  <td className="py-2">{(room + tax).toFixed(2)}</td>
                  <td className="py-2">{com.toFixed(2)}</td>
                  <td className="py-2 font-semibold">{(room + tax - com).toFixed(2)}</td>
                </tr>
              )
            })}
            <tr className="text-right font-bold text-ink-900">
              <td className="py-2.5 text-left">Total</td>
              <td className="py-2.5">{s.roomAmount.toFixed(2)}</td>
              <td className="py-2.5">0.00</td>
              <td className="py-2.5">0.00</td>
              <td className="py-2.5">{r.tax.toFixed(2)}</td>
              <td className="py-2.5">{r.amount.toFixed(2)}</td>
              <td className="py-2.5">{(s.commission + s.gst).toFixed(2)}</td>
              <td className="py-2.5">{s.earned.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-6 font-[Roboto,sans-serif] text-[12px] text-ink-500">This voucher is for the property’s records. Guest contact details are for this stay only.</p>
    </div>
  )
}
