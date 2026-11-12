import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase, Printer, X } from 'lucide-react'
import { Fragment, useEffect } from 'react'
import emblem from '../assets/emblem.webp'
import { site } from '../config/site'
import { cancellationOptions } from '../data/options'
import { addDays, inr, parseISODate } from '../lib/format'
import type { ResvRow } from '../lib/hooks'
import { settle } from '../lib/money'
import type { Listing } from '../lib/types'

const d = (iso: string) => parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ (\d\d)$/, " '$1")
const long = (iso: string) => parseISODate(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const n2 = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const rs = (n: number) => `₹ ${n2(n)}`
const pct = (r: number) => `${+(r * 100).toFixed(2)}%`

/** Payout release date: the Tuesday of the week after check-out (see site.payoutCycle). */
function releaseDate(checkOut: string) {
  const co = parseISODate(checkOut)
  const mon = (co.getDay() + 6) % 7
  return addDays(checkOut, 7 - mon + 1)
}

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
  // The voucher sits inside a fixed, scrolling overlay, which browsers print as one clipped page.
  // Print a copy placed straight under <body> instead, so every section flows onto as many pages as it needs.
  const src = document.querySelector('.voucher-print')
  if (!src) return
  const root = document.createElement('div')
  root.id = 'voucher-print-root'
  root.appendChild(src.cloneNode(true))
  document.body.appendChild(root)
  document.body.classList.add('printing-voucher')
  const done = () => {
    root.remove()
    document.body.classList.remove('printing-voucher')
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  window.print()
  setTimeout(done, 1000)
}

export function HotelierVoucher({ r, l, status, onClose }: { r: ResvRow | null; l?: Listing; status: string; onClose: () => void }) {
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/45 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Hotelier voucher" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }} className="flex max-h-[calc(100dvh-24px)] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-48px)]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-5 py-3 print:hidden">
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
            {/* Only the voucher scrolls; the top bar stays fixed above it, so nothing can show through above the bar. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <Body r={r} l={l} status={status} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Body({ r, l, status }: { r: ResvRow; l?: Listing; status: string }) {
  const s = settle(r, l)
  const nights = Array.from({ length: r.nights }, (_, i) => addDays(r.check_in, i))
  const rooms = Math.max(1, r.rooms)
  const cells = rooms * Math.max(1, r.nights)
  const perRoomGuests = Math.max(1, Math.round(r.guests / rooms))
  const addr = l ? [l.location.address, l.location.area, l.location.city, [l.location.state, l.location.pincode].filter(Boolean).join(' ')].filter((x) => x && x.trim()).join(', ') : ''
  const label = 'text-[11.5px] font-medium tracking-wide text-ink-500 uppercase'
  const val = 'mt-0.5 block text-[15.5px] font-medium text-ink-900'
  const cancelLabel = cancellationOptions.find((c) => c.id === (l?.policies.cancellation ?? 'free24'))?.label
  const B = s.commission + s.gst
  const C = s.tds + s.tcs
  const payable = r.amount - B - C
  const c = site.company
  const cell = { room: s.roomAmount / cells, tax: r.tax / cells, com: B / cells }
  const calc: { k: string; t: string; v: number; strong?: boolean }[] = [
    { k: '1.', t: 'Room Charges', v: s.roomAmount },
    { k: '2.', t: 'Extra Adult/ Child Charges', v: 0 },
    { k: '3.', t: 'Property Taxes', v: r.tax },
    { k: '4.', t: 'Service Charges', v: 0 },
    { k: '(A)', t: 'Property Gross Charges (1+2+3+4)', v: r.amount, strong: true },
    { k: '5.', t: `${site.marketplace} Commission @ ${pct(site.commissionRate)}`, v: s.commission },
    { k: '6.', t: `GST on Commission @ ${pct(site.gstOnCommission)} (Includes IGST/CGST/SGST)`, v: s.gst },
    { k: '(B)', t: `${site.marketplace} Commission (including GST) (5+6)`, v: B, strong: true },
    { k: '7.', t: `TCS @ ${s.gstRegistered ? pct(site.tcsRate) : '0.0%'}`, v: s.tcs },
    { k: '8.', t: `TDS @ ${pct(site.tdsRate)}`, v: s.tds },
    { k: '(C)', t: 'Tax Deduction (7+8)', v: C, strong: true },
  ]
  const notes = [
    s.gstRegistered
      ? `As you are a GST-registered property, you are liable to charge and deposit GST on the property accommodation charges. ${site.marketplace} collects TCS under Section 52 of the CGST Act on the room value.`
      : `As you are an unregistered property, ${site.marketplace} is liable to charge and deposit GST on the property accommodation charges under Section 9(5) of the CGST Act and similar provisions of the respective SGST Laws.`,
    `GST on property accommodation charges${s.gstRegistered ? '' : ' by E-commerce Operator'} : ${inr(r.tax)}`,
    'TCS amount subject to reconciliation.',
    'TDS amount subject to reconciliation.',
    `As per Section 194-O of the Income-tax Act, 1961, ${site.marketplace} has deducted TDS from payments made against this booking to the property. The property is not required to deduct TDS from ${site.marketplace}'s commission.`,
    'If TDS has already been deducted from the advance deposited with the property, no further TDS is deducted at the time of booking.',
    `If the booking is cancelled or changed by the guest at a later stage, you will be notified and this voucher and the ${site.marketplace} Booking ID will be null and void.`,
    "The property has to issue an invoice to the guest for 'Property Gross Charges' in compliance with applicable tax laws.",
    'Under no circumstances should you charge guests for services listed in this voucher. Only payments for extra services are to be collected from guests.',
    'Guests must carry a valid ID proof like Aadhaar, Driving Licence, Voter ID or Passport. PAN card is not a valid ID proof.',
  ]
  const th = 'px-1 py-2 font-medium'
  const td = 'px-1 py-1.5'
  return (
    <div className="voucher-print p-5 font-sans tabular-nums sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <span className="flex items-center gap-2.5" aria-label={site.marketplace}>
            <img src={emblem} alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
            <span className="font-[Lato,sans-serif] text-[26px] leading-none font-[900] tracking-[0.1em] whitespace-nowrap text-[#14306b]">{site.marketplace}</span>
          </span>
          <h2 className="mt-3 text-[28px] font-medium text-ink-900">Hotelier Voucher</h2>
        </div>
        <div className="max-w-[380px] sm:text-right">
          <strong className="block text-[16px] text-ink-900">{r.hotel_name}</strong>
          {addr && <span className="mt-1 block text-[13px] text-ink-700">{addr}</span>}
        </div>
      </div>

      <div className="mt-6 grid gap-0 overflow-hidden rounded-lg bg-[#f6f7f6] sm:grid-cols-2">
        <div className="p-5 sm:border-r-2 sm:border-ink-700">
          <span className={label}>Primary guest details</span>
          <span className="mt-1 flex items-center gap-2 text-[18px] font-medium text-ink-900">
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
        <div className="grid grid-cols-2 content-start gap-4 p-5">
          <div>
            <span className={label}>Booking ID</span>
            <span className={`${val} break-all`}>{r.id}</span>
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
            <span className={val}>{r.pay_mode === 'now' ? 'Paid Online' : 'Pay at Hotel'}</span>
          </div>
          <div>
            <span className={label}>Booked via</span>
            <span className={val}>{site.marketplace}</span>
          </div>
          <div>
            <span className={label}>Booking type</span>
            <span className={val}>{r.amount === 0 ? 'Free Room Night' : r.pay_mode === 'now' ? 'Prepaid Online' : 'Pay at Hotel'}</span>
          </div>
        </div>
      </div>

      <h3 className="mt-7 border-t-2 border-ink-700 pt-5 text-[19px] font-medium text-ink-900">{r.rooms} Room(s)</h3>
      {Array.from({ length: r.rooms }, (_, i) => (
        <div key={i} className="mt-4 pl-2">
          <strong className="text-[16px] text-ink-900">1 x {r.room_name}</strong>
          <div className="mt-2 ml-4 border-l-2 border-line pl-4">
            <p className="text-[13.5px] text-ink-700">
              {perRoomGuests} {perRoomGuests === 1 ? 'Guest' : 'Guests'} <span className="mx-2">•</span> Room Only
            </p>
            <p className="mt-3 text-[13.5px] font-medium text-ink-900">Cancellation Policy{cancelLabel ? ` · ${cancelLabel}` : ''}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-700">• {cancelText(l, r)}</p>
          </div>
        </div>
      ))}

      <h3 className="mt-7 border-t-2 border-ink-700 pt-5 text-[19px] font-medium text-ink-900">Payment</h3>
      {r.pay_mode === 'now' ? (
        <div className="pl-2">
          <p className="mt-2 text-[14px] text-ink-700">Payable to Property</p>
          <strong className="text-[19px] text-ink-900">{rs(payable)}</strong>
          <p className="mt-1 text-[13px] text-ink-700">
            {site.marketplace} will release payment by {d(releaseDate(r.check_out))}. Payment generally takes 2–3 working days to get credited to your account after release.
          </p>
        </div>
      ) : (
        <div className="pl-2">
          <p className="mt-2 text-[14px] text-ink-700">Collect from the guest at check-in</p>
          <strong className="text-[19px] text-ink-900">{rs(r.amount)}</strong>
          <p className="mt-1 text-[13px] text-ink-700">
            Commission (including GST) and tax deductions of {rs(B + C)} are adjusted in your next payout.
          </p>
        </div>
      )}

      <h3 className="mt-7 border-t-2 border-ink-700 pt-5 text-[19px] font-medium text-ink-900">
        Room wise Payment Breakup <span className="text-[13px] font-normal">(in ₹)</span>
      </h3>
      <div className="relative mt-3 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b-2 border-ink-700 text-right align-top text-ink-900">
              <th className={`${th} text-left`}>Date</th>
              <th className={th}>Room Charges (R)</th>
              <th className={th}>Extra Adult/Child (E)</th>
              <th className={th}>Fees &amp; Charges (F)</th>
              <th className={th}>Taxes (T)</th>
              <th className={th}>Gross Charges (G=R+E+F+T)</th>
              <th className={th}>Commission (*inclusive of taxes) (C)</th>
              <th className={th}>Net Amount (G-C)</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: r.rooms }, (_, i) => (
              <Fragment key={i}>
                <tr>
                  <td colSpan={8} className="px-1 pt-3 pb-1 text-[14px] text-pine-700">
                    {r.room_name} (Room {i + 1})
                  </td>
                </tr>
                {nights.map((n, j) => (
                  <tr key={n} className={`text-right text-ink-900 ${j === nights.length - 1 ? 'border-b-2 border-ink-700' : ''}`}>
                    <td className={`${td} pl-3 text-left whitespace-nowrap`}>{long(n)}</td>
                    <td className={td}>{n2(cell.room)}</td>
                    <td className={td}>0.00</td>
                    <td className={td}>0.00</td>
                    <td className={td}>{n2(cell.tax)}</td>
                    <td className={td}>{n2(cell.room + cell.tax)}</td>
                    <td className={td}>{n2(cell.com)}</td>
                    <td className={td}>{n2(cell.room + cell.tax - cell.com)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
            <tr className="border-b-2 border-ink-700 text-right font-medium text-ink-900">
              <td className="px-1 py-3 pl-3 text-left whitespace-nowrap">GRAND TOTAL</td>
              <td className="px-1 py-3">{n2(s.roomAmount)}</td>
              <td className="px-1 py-3">0.00</td>
              <td className="px-1 py-3">0.00</td>
              <td className="px-1 py-3">{n2(r.tax)}</td>
              <td className="px-1 py-3">{n2(r.amount)}</td>
              <td className="px-1 py-3">{n2(B)}</td>
              <td className="px-1 py-3">{n2(r.amount - B)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 text-[19px] font-medium text-ink-900">Final Calculation</h3>
      <div className="mt-2 text-[13.5px] text-ink-900">
        {calc.map((x) => (
          <div key={x.k} className={`flex justify-between gap-4 border-b border-line py-2 ${x.strong ? 'font-medium' : 'pl-2 text-ink-700'}`}>
            <span>
              <span className="inline-block min-w-[30px]">{x.k}</span> {x.t}
            </span>
            <span className="shrink-0">{rs(x.v)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-b-2 border-ink-700 py-3 text-[17px] font-medium">
          <span>Payable to Property (A-B-C)</span>
          <span className="shrink-0">{rs(payable)}</span>
        </div>
        {r.pay_mode === 'hotel' && (
          <>
            <div className="flex justify-between gap-4 border-b border-line py-2 pl-2 text-ink-700">
              <span>Less: collected by property from the guest at check-in (A)</span>
              <span className="shrink-0">− {rs(r.amount)}</span>
            </div>
            <div className="flex justify-between gap-4 border-b-2 border-ink-700 py-3 font-medium">
              <span>Payable by Property (B+C) · adjusted in your next payout</span>
              <span className="shrink-0">{rs(B + C)}</span>
            </div>
          </>
        )}
      </div>

      <h4 className="mt-5 text-[15px] font-medium text-ink-900">Note :</h4>
      <ul className="mt-1 list-disc pl-6 text-[12.5px] leading-relaxed text-ink-900">
        {notes.map((n) => (
          <li key={n} className="py-0.5">
            {n}
          </li>
        ))}
      </ul>

      <h4 className="mt-5 text-[15px] font-medium text-ink-900">{site.marketplace} Details</h4>
      <ul className="mt-1 grid list-disc gap-x-8 gap-y-1 pl-6 text-[12.5px] text-ink-900 sm:grid-cols-2">
        <li>PAN No : {c.pan || '—'}</li>
        <li>CIN No : {c.cin || '—'}</li>
        <li>GSTIN : {c.gstin || '—'}</li>
        <li>Service Category : {c.serviceCategory}</li>
      </ul>

      <h4 className="mt-5 border-b-2 border-pine-800 pb-2 text-[15px] font-medium text-pine-800">{site.marketplace} Contact Info</h4>
      <div className="mt-3 flex flex-col justify-between gap-3 text-[13.5px] text-ink-900 sm:flex-row">
        <div>
          <strong className="block text-[15px]">{c.legalName}</strong>
          {c.address ? c.address.split('|').map((line) => <span key={line} className="block">{line.trim()}</span>) : <span className="block text-ink-500">Registered address —</span>}
        </div>
        <div className="sm:text-right">
          <span>
            <strong>Partner support : </strong>
            {site.supportPhone || '—'}
          </span>
          {site.supportEmail && <span className="block">{site.supportEmail}</span>}
        </div>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-700">
        As a privileged {site.marketplace} partner, you can contact us during emergencies on the partner support number above. Please use it for customer booking discrepancies, help with guest check-in at the property and other guest-related issues. We are available all 7 days of the week between 10 am and 7 pm.
      </p>
      <p className="mt-2 text-[12.5px] text-ink-700">Kindly avoid calling the above number for business development queries. For these, please contact your {site.marketplace} account manager.</p>
      <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-ink-700">
        <strong className="text-ink-900">Note:</strong> Please do not reply to this email. It is an unmonitored mailbox. To make sure you receive communication related to your bookings from {site.marketplace}
        {c.noReplyEmail ? `, please add ${c.noReplyEmail} to your contact list and address book.` : ', please add our booking email address to your contact list and address book.'}
      </p>
    </div>
  )
}
