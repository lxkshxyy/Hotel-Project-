import { motion } from 'framer-motion'
import { BadgePercent, Check, Coins, Gift, Sparkles, UserPlus, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Reveal } from '../components/ui'
import { gstRate, site } from '../config/site'
import { useAuth } from '../context/AuthContext'
import { getPoints, listBookings } from '../lib/api'
import { CLUB_FEE, clubStatus, clubTiers, pointsFor } from '../lib/club'
import { inr, plural } from '../lib/format'

const steps = [
  { Icon: UserPlus, t: 'Join free', d: `Sign in with your email — no password, no card, ${inr(CLUB_FEE)} fee. You’re a Member straight away.` },
  { Icon: BadgePercent, t: 'Save on every room', d: 'Your Club discount is taken off the room price automatically at checkout.' },
  { Icon: Coins, t: 'Earn points', d: 'Get 1 point for every ₹100 you pay, plus bonus points each time you move up a level.' },
  { Icon: Wallet, t: 'Spend points like cash', d: '1 point = ₹1. Tick “Use Club points” at checkout to take them off your bill.' },
]

const faqs = [
  ['Is there a membership fee?', `No. Joining is free and there is no yearly charge — the fee is ${inr(CLUB_FEE)} at every level.`],
  ['How do I move up a level?', 'Levels go up by confirmed bookings and nights together. For example, Silver needs 2 bookings and 4 nights in total. Your level updates as soon as a booking is confirmed.'],
  ['What happens if I cancel?', 'A cancelled booking no longer counts towards your level, and any points it earned are taken back. Points you spent on it are returned.'],
  ['Does the Club discount work with coupons?', 'Yes. The Club discount comes off the room price first, then coupon codes like FIRSTSTAY or LONGSTAY, then any points you use.'],
  ['Do add-ons earn points?', 'Yes. Points are worked out on the full amount you pay, including taxes, meals, early check-in and Stay Protect.'],
  ['Can I use the Club for business trips?', 'Club discounts are for personal bookings. Company trips booked through TRPotels for Business get corporate rates instead.'],
]

export default function Club() {
  const { user } = useAuth()
  const [points, setPoints] = useState<number | null>(null)
  const [status, setStatus] = useState<ReturnType<typeof clubStatus> | null>(null)
  const [price, setPrice] = useState(2499)
  const [nights, setNights] = useState(2)
  const [rooms, setRooms] = useState(1)

  useEffect(() => {
    if (!user) return
    getPoints(user.id).then(setPoints)
    listBookings(user.id)
      .then((l) => setStatus(clubStatus(l)))
      .catch(() => setStatus(clubStatus([])))
  }, [user])

  const rows = useMemo(() => {
    const base = Math.max(0, price) * Math.max(1, nights) * Math.max(1, rooms)
    const rate = gstRate(price)
    return [{ name: 'Not signed in', discount: 0, color: '#C9D2E3' }, ...clubTiers].map((t) => {
      const off = Math.round(base * t.discount)
      const taxable = base - off
      const gst = Math.round(taxable * rate)
      const pay = taxable + gst
      return { name: t.name, color: t.color, pct: t.discount, off, gst, pay, pts: 'perks' in t ? pointsFor(pay) : 0 }
    })
  }, [price, nights, rooms])

  return (
    <div>
      <section className="bg-navy-800 py-12 text-white sm:py-16">
        <div className="container-page grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-[13px] font-bold tracking-[0.08em] text-ember-200 uppercase">{site.name} Club</p>
            <h1 className="mt-2 max-w-3xl text-[34px] leading-tight font-black tracking-tight sm:text-[46px]">Stay more, save more</h1>
            <p className="mt-3 max-w-2xl text-lg text-[#D3DCEE]">
              Free to join. Save up to 20% on every room, earn 1 point for every ₹100 you spend, and use each point as ₹1 on your next stay.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[`${inr(CLUB_FEE)} joining fee`, 'No yearly charges', 'Discount applied automatically', '1 point = ₹1'].map((x) => (
                <span key={x} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold ring-1 ring-white/20">
                  <Check className="h-4 w-4 text-[#86EFAC]" aria-hidden="true" /> {x}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {user ? (
                <Link to="/hotels" className="btn-primary">
                  Book a stay
                </Link>
              ) : (
                <Link to="/login?next=/club" className="btn-primary">
                  Join free
                </Link>
              )}
              <a href="#calculator" className="btn bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20">
                See how much you save
              </a>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 text-ink-900 shadow-float sm:p-6">
            {user && status ? (
              <>
                <span className="text-xs font-bold tracking-wider text-ink-500 uppercase">Your membership</span>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <strong className="flex items-center gap-2 text-2xl font-black">
                    <span className="h-4 w-4 rounded-full" style={{ background: status.tier.color }} /> {status.tier.name}
                  </strong>
                  <span className="rounded-lg bg-leaf-50 px-2.5 py-1 text-sm font-black text-leaf-700">{Math.round(status.tier.discount * 100)}% off rooms</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    [points === null ? '…' : points.toLocaleString('en-IN'), 'Points'],
                    [status.bookings, 'Bookings'],
                    [status.nights, 'Nights'],
                  ].map(([v, l]) => (
                    <div key={l as string} className="rounded-xl bg-canvas p-2.5">
                      <strong className="block text-xl font-black text-navy-800">{v}</strong>
                      <span className="text-xs text-ink-500">{l}</span>
                    </div>
                  ))}
                </div>
                {status.next ? (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm">
                      <span>
                        Next: <strong>{status.next.name}</strong>
                      </span>
                      <span className="text-ink-500">{Math.round(status.progress * 100)}%</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-line">
                      <motion.div className="h-full rounded-full" style={{ background: status.next.color }} initial={{ width: 0 }} animate={{ width: `${status.progress * 100}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <p className="mt-2 text-sm text-ink-700">
                      {[status.needBookings ? plural(status.needBookings, 'more booking') : '', status.needNights ? plural(status.needNights, 'more night') : ''].filter(Boolean).join(' and ')} to reach{' '}
                      {status.next.name} ({Math.round(status.next.discount * 100)}% off + {status.next.bonus} bonus points).
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-navy-50 p-3 text-sm font-semibold text-navy-800">You’re at the top level. Enjoy 20% off and free upgrades when available.</p>
                )}
              </>
            ) : (
              <>
                <span className="text-xs font-bold tracking-wider text-ink-500 uppercase">Membership price</span>
                <strong className="mt-1 block text-[40px] leading-none font-black text-navy-800">
                  {inr(CLUB_FEE)} <span className="text-base font-bold text-ink-500">/ forever</span>
                </strong>
                <ul className="mt-4 flex flex-col gap-2 text-sm">
                  {['5% off every room from your first booking', 'Points on every rupee you pay', 'Bonus points and bigger discounts as you stay more', 'Member prices shown on every hotel'].map((x) => (
                    <li key={x} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf-700" aria-hidden="true" /> {x}
                    </li>
                  ))}
                </ul>
                <Link to="/login?next=/club" className="btn-primary mt-5 w-full">
                  Join free with your email
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </section>

      <div className="container-page flex flex-col gap-14 py-12">
        <section aria-labelledby="how-h">
          <h2 id="how-h" className="section-title">
            How the Club works
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ Icon, t, d }, i) => (
              <Reveal key={t} delay={i * 0.05}>
                <div className="card relative h-full p-5">
                  <span className="absolute top-4 right-4 text-4xl font-black text-navy-50">{i + 1}</span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <strong className="mt-3 block text-lg">{t}</strong>
                  <p className="mt-1 text-sm text-ink-700">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section aria-labelledby="levels-h">
          <h2 id="levels-h" className="section-title">
            Club levels and benefits
          </h2>
          <p className="mt-1 text-ink-500">Every level is free. You move up automatically as your confirmed bookings and nights add up.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {clubTiers.map((t) => {
              const mine = status?.tier.name === t.name
              return (
                <div key={t.name} className={`card flex h-full flex-col p-6 ${mine ? 'ring-2 ring-navy-800' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="inline-block h-2 w-10 rounded-full" style={{ background: t.color }} />
                      {mine && <span className="rounded-full bg-navy-800 px-2 py-0.5 text-[11px] font-black text-white uppercase">Your level</span>}
                    </div>
                    <strong className="mt-3 block text-xl">{t.name}</strong>
                    <span className="text-sm text-ink-500">{t.minBookings ? `${t.minBookings} bookings + ${t.minNights} nights in total` : 'As soon as you sign up'}</span>
                    <p className="mt-4 text-[34px] leading-none font-black text-navy-800">{Math.round(t.discount * 100)}% off</p>
                    <span className="text-xs text-ink-500">every room booking</span>
                    <ul className="mt-4 flex flex-col gap-1.5 text-sm text-ink-700">
                      {t.perks.map((p) => (
                        <li key={p} className="flex gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf-700" aria-hidden="true" /> {p}
                        </li>
                      ))}
                    </ul>
                    <span className="mt-auto pt-4 text-sm font-bold text-ink-700">Membership fee: {inr(CLUB_FEE)}</span>
                </div>
              )
            })}
          </div>

          <div className="card mt-6 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="bg-mist text-left">
                  <th className="px-4 py-3">Benefit</th>
                  {clubTiers.map((t) => (
                    <th key={t.name} className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} /> {t.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Membership fee', clubTiers.map(() => inr(CLUB_FEE))],
                  ['How to reach', clubTiers.map((t) => (t.minBookings ? `${t.minBookings} bookings · ${t.minNights} nights` : 'Sign up'))],
                  ['Discount on rooms', clubTiers.map((t) => `${Math.round(t.discount * 100)}%`)],
                  ['Points per ₹100 paid', clubTiers.map(() => '1')],
                  ['Bonus points on reaching level', clubTiers.map((t) => (t.bonus ? `${t.bonus}` : '—'))],
                  ['Free early check-in (10 AM)', clubTiers.map((t) => (['Gold', 'Platinum'].includes(t.name) ? '✓' : '—'))],
                  ['Room upgrade when available', clubTiers.map((t) => (t.name === 'Platinum' ? '✓' : '—'))],
                  ['Priority support line', clubTiers.map((t) => (t.name === 'Platinum' ? '✓' : '—'))],
                ].map(([label, vals]) => (
                  <tr key={label as string} className="border-t border-[#EEF1F6]">
                    <td className="px-4 py-3 font-semibold">{label}</td>
                    {(vals as string[]).map((v, i) => (
                      <td key={i} className={`px-4 py-3 ${v === '✓' ? 'font-black text-leaf-700' : ''}`}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="calculator" aria-labelledby="calc-h" className="scroll-mt-28">
          <h2 id="calc-h" className="section-title">
            How much would you save?
          </h2>
          <p className="mt-1 text-ink-500">Enter a stay to compare what you pay at each level. GST is worked out on the price after the Club discount.</p>
          <div className="card mt-6 p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="label">
                Room price per night (₹)
                <input className="field" type="number" min={500} step={100} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
              </label>
              <label className="label">
                Nights
                <input className="field" type="number" min={1} max={30} value={nights} onChange={(e) => setNights(Math.min(30, Number(e.target.value) || 1))} />
              </label>
              <label className="label">
                Rooms
                <input className="field" type="number" min={1} max={8} value={rooms} onChange={(e) => setRooms(Math.min(8, Number(e.target.value) || 1))} />
              </label>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[12.5px] text-ink-500">
                    <th className="py-2">Level</th>
                    <th className="py-2">Club discount</th>
                    <th className="py-2">GST ({Math.round(gstRate(price) * 100)}%)</th>
                    <th className="py-2">You pay</th>
                    <th className="py-2">Points earned</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.name} className="border-t border-[#EEF1F6]">
                      <td className="py-2.5 font-bold">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} /> {r.name}
                        </span>
                      </td>
                      <td className={`py-2.5 ${r.off ? 'font-semibold text-leaf-700' : 'text-ink-500'}`}>
                        {r.off ? `− ${inr(r.off)} (${Math.round(r.pct * 100)}%)` : '—'}
                      </td>
                      <td className="py-2.5">{inr(r.gst)}</td>
                      <td className="py-2.5 text-base font-black">{inr(r.pay)}</td>
                      <td className="py-2.5">{i === 0 ? <span className="text-ink-500">Sign in to earn</span> : `${r.pts} (worth ${inr(r.pts)})`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ink-500">Coupons such as FIRSTSTAY and LONGSTAY come off after the Club discount. Add-ons are not discounted but do earn points.</p>
          </div>
        </section>

        <section aria-labelledby="rules-h" className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 id="rules-h" className="flex items-center gap-2 text-xl font-black text-navy-800">
              <Sparkles className="h-5 w-5" aria-hidden="true" /> Points, simply
            </h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-ink-700">
              {[
                ['Earn', 'Points are added when your booking is confirmed: 1 point for every full ₹100 of the amount you pay.'],
                ['Bonus', 'Reaching Silver, Gold and Platinum adds 150, 300 and 500 bonus points once each.'],
                ['Spend', '1 point = ₹1 off your next booking. Use as many as you like, up to the full booking amount.'],
                ['Cancel', 'If you cancel, points you spent come back and points you earned on that booking are taken back.'],
              ].map(([h, d]) => (
                <li key={h} className="flex gap-3">
                  <span className="h-fit rounded-md bg-navy-50 px-2 py-0.5 text-xs font-black text-navy-800 uppercase">{h}</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-black text-navy-800">Questions</h2>
            {faqs.map(([q, a]) => (
              <details key={q} className="card group p-4">
                <summary className="cursor-pointer list-none font-bold marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {q}
                    <span className="text-xl text-navy-800 transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-2 text-sm text-ink-700">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {!user && (
          <section className="flex flex-col items-start gap-4 rounded-3xl bg-ember-50 p-6 ring-1 ring-[#F5D5C2] sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-center gap-4">
              <Gift className="h-10 w-10 shrink-0 text-ember-600" aria-hidden="true" />
              <div>
                <strong className="block text-xl text-navy-800">Join free and save 5% on your first booking</strong>
                <span className="text-sm text-ink-700">It takes 30 seconds with your email. New members can also use FIRSTSTAY for {inr(site.firstStayDiscount)} off.</span>
              </div>
            </div>
            <Link to="/login?next=/club" className="btn-primary shrink-0">
              Join free
            </Link>
          </section>
        )}
      </div>
    </div>
  )
}
