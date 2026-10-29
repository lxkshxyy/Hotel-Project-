import { AnimatePresence, motion } from 'framer-motion'
import { Heart, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { site } from '../../config/site'
import type { Hotel } from '../../data/types'
import { inr } from '../../lib/format'

/*
 * House rules shown on the hotel page and at checkout.
 * Built from the hotel's own flags so each property shows what applies to it.
 * Partner hotels (listed through InnDesk) add their own times, cancellation and rules on top.
 */
export function hotelRules(h: Hotel) {
  const couple = h.coupleFriendly ? 'Unmarried couples allowed. Local IDs are allowed.' : 'Unmarried couples are not allowed at this property.'
  // Partner hotels set their own times, cancellation terms and house rules in InnDesk.
  const p = h.partner
  return {
    couple,
    must: [
      ...(p ? [`Check-in from ${p.checkIn}, check-out by ${p.checkOut}.`, p.cancellation, ...p.rules] : []),
      'Primary guest should be at least 18 years of age.',
      'Passport, Aadhaar, Driving Licence and Voter ID are accepted as ID proof. PAN card is not accepted.',
      `Bookings of more than 5 rooms are treated as group bookings and are subject to hotel approval and group rates.`,
      'Groups with only male guests are allowed at this property.',
      ...(p ? [] : ['Pets are not allowed.']),
    ],
    guest: [
      couple,
      'Every adult guest must show a government photo ID at check-in.',
      'Visitors are not allowed in guest rooms after 10 PM.',
      'Children up to 5 years stay free when using existing bedding.',
    ],
    hourly: ['Day-use (hourly) stays are not offered at this property.', `Early check-in and late check-out are on request and may be charged.`],
    fees: [
      h.freeBreakfast ? 'Breakfast is included with rooms marked “Free breakfast”.' : `Optional: buffet breakfast at about ${inr(site.addons.breakfast)} per guest per night.`,
      'Extra-person charges may apply depending on the room and the number of guests.',
      h.payAtHotel ? 'Pay at hotel by cash, card or UPI.' : 'Online payment only; cash is not accepted.',
      'A refundable security deposit may be collected at check-in for incidental charges.',
      'Special requests depend on availability at check-in and may be charged.',
    ],
  }
}

type Sheet = 'must' | 'guest' | 'hourly' | 'all' | null

export default function PropertyRules({ hotel }: { hotel: Hotel }) {
  const r = hotelRules(hotel)
  const [sheet, setSheet] = useState<Sheet>(null)

  useEffect(() => {
    if (!sheet) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(null)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [sheet])

  const groups: { k: Exclude<Sheet, 'all' | null>; label: string; items: string[] }[] = [
    { k: 'must', label: 'Must Read Rules', items: r.must },
    { k: 'guest', label: 'Guest Profile', items: r.guest },
    { k: 'hourly', label: 'Guest Profile (Hourly)', items: r.hourly },
  ]

  return (
    <section id="rules" className="card scroll-mt-40 p-5 sm:p-6">
      <h2 className="text-xl font-bold text-navy-800">Property Rules</h2>
      <p className="mt-0.5 font-bold text-ink-700">
        Check-in: {site.checkInTime} <span className="ml-4">Check-out: {site.checkOutTime}</span>
      </p>
      <div className="mt-4 grid gap-6 border-t border-line pt-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="relative rounded-xl border border-line px-3 pt-4 pb-2.5">
            <span className="absolute -top-2.5 left-3 flex items-center gap-1 rounded-full bg-leaf-50 px-2 py-0.5 text-xs font-bold text-ink-900">
              <Heart className="h-3 w-3 fill-ember-600 text-ember-600" aria-hidden="true" /> Couple/Bachelor Rules
            </span>
            <span className="text-sm text-ink-700">{r.couple}</span>
          </div>
          <ul className="flex list-[circle] flex-col gap-1.5 pl-5 text-sm text-ink-700">
            {r.must.slice(0, 4).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <ul className="flex list-[circle] flex-col gap-1.5 pl-5 text-sm text-ink-700">
          {r.fees.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {groups.map((g) => (
          <button key={g.k} type="button" onClick={() => setSheet(g.k)} className="rounded-lg border border-line-strong px-3.5 py-2 text-sm font-semibold hover:bg-mist">
            {g.label}
          </button>
        ))}
        <button type="button" onClick={() => setSheet('all')} className="px-2 text-sm font-bold text-navy-800">
          Read All Property Rules
        </button>
      </div>

      <AnimatePresence>
        {sheet && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Property rules"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-950/60 sm:items-center sm:p-4"
            onClick={() => setSheet(null)}
          >
            <motion.div
              initial={{ y: 30 }}
              animate={{ y: 0 }}
              exit={{ y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:p-6"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-black text-navy-800">{sheet === 'all' ? 'All property rules' : groups.find((g) => g.k === sheet)?.label}</h3>
                <button type="button" aria-label="Close" onClick={() => setSheet(null)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-mist">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {(sheet === 'all' ? [...groups, { k: 'fees', label: 'Fees and payments', items: r.fees }] : groups.filter((g) => g.k === sheet)).map((g) => (
                <div key={g.k} className="mt-4">
                  {sheet === 'all' && <h4 className="mb-1.5 font-bold">{g.label}</h4>}
                  <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-700">
                    {g.items.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="mt-4 text-xs text-ink-500">Free cancellation till {site.freeCancelHours} hours before check-in. After that, the first night is charged.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
