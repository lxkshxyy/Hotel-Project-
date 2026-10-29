import { motion, useReducedMotion } from 'framer-motion'
import { BedDouble, CalendarRange, Camera, MapPin, ShieldCheck, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/ui'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { inr } from '../lib/format'

const pct = (n: number) => `${Math.round(n * 100)}%`

/** What one room night pays the owner, using the commission set in config. */
const example = (() => {
  const room = 2000
  const commission = room * site.commissionRate
  const gst = commission * site.gstOnCommission
  return { room, commission, gst, net: room - commission - gst }
})()

const manage = [
  { Icon: CalendarRange, t: 'Rates and availability', d: 'Change a price or close a date for one night or a whole season, room type by room type.' },
  { Icon: BedDouble, t: 'Reservations', d: 'Every StayEasy booking at your property, with the guest’s name, phone, dates and what they paid.' },
  { Icon: Camera, t: 'Photos and room types', d: 'Upload from your phone. Photos are resized for you and the first one becomes your cover.' },
  { Icon: Wallet, t: 'Payouts', d: `A statement for every stay: room amount, commission, GST on commission and what reaches your bank, ${site.payoutCycle}.` },
  { Icon: ShieldCheck, t: 'Policies', d: 'Check-in times, cancellation terms, couples, local IDs, pets and your own house rules.' },
]

const faqs = [
  { q: 'Do I need a GST number to list?', a: 'No. You can list without a GSTIN and add it later. With a GSTIN, your commission invoices carry it so you can claim input credit.' },
  { q: 'Who decides the room price?', a: 'You do. Set a base price for each room type, then change single dates or date ranges in Rates and availability.' },
  { q: 'Can I stop taking bookings for a while?', a: 'Yes. Pause the whole listing, or close specific dates. Paused listings disappear from StayEasy until you switch them back on.' },
  { q: 'How soon does my hotel appear on StayEasy?', a: 'As soon as you press Publish and the checks pass: name, address and map pin, at least one priced room type, five photos and the partner terms.' },
  { q: 'What happens to my bank details?', a: 'InnDesk keeps only the account holder name, bank, IFSC and the last four digits. The full account number is collected by the payments partner when payouts are set up.' },
]

export default function Landing() {
  const { user, owner } = useSession()
  const reduce = useReducedMotion()
  const start = user ? (owner ? '/app/properties/new/edit' : '/welcome') : '/login?next=/app/properties/new/edit'

  return (
    <div className="bg-paper">
      <header className="container-page flex h-[72px] items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Page" className="hidden items-center gap-6 text-[15px] font-semibold text-ink-700 md:flex">
          <a href="#how" className="no-underline hover:text-pine-900">How it works</a>
          <a href="#fees" className="no-underline hover:text-pine-900">Fees</a>
          <a href="#faq" className="no-underline hover:text-pine-900">Questions</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to={user ? '/app' : '/login'} className="btn-ghost hidden sm:inline-flex">
            {user ? 'Open panel' : 'Sign in'}
          </Link>
          <Link to={start} className="btn-primary">
            List your property
          </Link>
        </div>
      </header>

      <section className="container-page grid items-center gap-12 pt-8 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
        <div>
          <h1 className="text-[40px] leading-[1.05] font-extrabold text-pine-950 sm:text-[56px]">Put your hotel in front of {site.marketplace} guests.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-700">
            Add your rooms, photos and prices once. When the checks pass, your listing goes live on {site.marketplace} and bookings arrive here.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={start} className="btn-brass min-h-12 px-6 text-base">
              List your property
            </Link>
            <a href="#how" className="btn-ghost min-h-12 px-6 text-base">
              See how it works
            </a>
          </div>
          <p className="mt-6 text-[15px] text-ink-500">
            Free to list. {pct(site.commissionRate)} commission only on completed stays.
          </p>
        </div>

        {/* The owner's future listing, as StayEasy guests will see it, with its key tag. */}
        <div className="relative mx-auto w-full max-w-[460px] pt-10 pr-4">
          <div className="overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-black/5">
            <div className="relative aspect-[16/10]">
              <img src="/img/hero-room.webp" alt="A guest room as it would appear in a listing" className="h-full w-full object-cover" />
              <span className="absolute bottom-3 left-3 rounded-md bg-white/95 px-2 py-0.5 text-xs font-semibold text-ink-700">1 of 12 photos</span>
            </div>
            <div className="flex flex-col gap-1.5 p-5">
              <span className="text-[13px] font-semibold text-ink-500">Partner Hotel on {site.marketplace}</span>
              <strong className="font-display text-[22px] text-ink-900">Hotel Sunrise Residency</strong>
              <span className="flex items-center gap-1 text-sm text-ink-500">
                <MapPin className="h-4 w-4" aria-hidden="true" /> Paharganj, New Delhi, 600 m from New Delhi Railway Station
              </span>
              <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
                <span className="rounded-md bg-pine-50 px-2 py-1 text-xs font-bold text-pine-800">Couple friendly</span>
                <span className="text-right">
                  <strong className="block text-2xl text-ink-900">{inr(1899)}</strong>
                  <span className="text-xs text-ink-500">per night, before GST</span>
                </span>
              </div>
            </div>
          </div>
          <motion.div
            initial={reduce ? false : { rotate: -24, y: -20, opacity: 0 }}
            animate={{ rotate: 8, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 9, delay: 0.35 }}
            style={{ transformOrigin: '50% 0%' }}
            className="absolute top-0 right-10 flex flex-col items-center"
            aria-hidden="true"
          >
            <span className="h-10 w-px bg-ink-400" />
            <span className="relative flex h-[92px] w-[64px] flex-col items-center justify-end rounded-t-[14px] rounded-b-[32px] bg-brass-500 pb-4 shadow-[0_10px_20px_rgba(143,102,20,0.35)]">
              <span className="absolute top-3 h-3.5 w-3.5 rounded-full bg-paper ring-2 ring-brass-700/40" />
              <span className="font-display text-[15px] font-extrabold text-pine-950">Live</span>
            </span>
          </motion.div>
        </div>
      </section>

      <section id="how" className="border-y border-line bg-white">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[1fr_2fr]">
          <h2 className="text-[32px] leading-tight font-bold text-pine-950">From sign-up to your first booking</h2>
          <ol className="grid gap-8 sm:grid-cols-3">
            {[
              { t: 'Add your property', d: 'Details, location pin, amenities, room types with prices, photos and policies. Most owners finish in about 20 minutes.' },
              { t: 'Pass the checks', d: 'InnDesk shows exactly what is missing, with a link to fix each item. Nothing is published until it is complete.' },
              { t: 'Go live and take bookings', d: `Press Publish. Your hotel appears on ${site.marketplace} straight away and each booking lands in Reservations.` },
            ].map((s, i) => (
              <li key={s.t} className="flex flex-col gap-2">
                <span className="font-display text-[44px] leading-none font-extrabold text-brass-500">{i + 1}</span>
                <strong className="text-lg text-ink-900">{s.t}</strong>
                <span className="text-[15px] text-ink-700">{s.d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="max-w-xl text-[32px] leading-tight font-bold text-pine-950">One panel for the front desk and the back office</h2>
        <dl className="mt-8 divide-y divide-line border-y border-line">
          {manage.map(({ Icon, t, d }) => (
            <div key={t} className="grid gap-2 py-5 sm:grid-cols-[280px_1fr] sm:gap-8">
              <dt className="flex items-center gap-3 text-lg font-bold text-ink-900">
                <Icon className="h-5 w-5 text-pine-700" aria-hidden="true" /> {t}
              </dt>
              <dd className="text-ink-700">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="fees" className="bg-pine-900 text-white">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-[32px] leading-tight font-bold">What it costs</h2>
            <p className="mt-3 max-w-md text-pine-100">
              No sign-up or monthly fee. {site.marketplace} keeps {pct(site.commissionRate)} of the room amount on completed stays, plus {pct(site.gstOnCommission)} GST on that commission. Cancelled and no-show bookings follow your cancellation policy.
            </p>
            <p className="mt-3 max-w-md text-pine-100">Payouts go to your bank {site.payoutCycle}.</p>
          </div>
          <div className="rounded-2xl bg-pine-950/60 p-6 ring-1 ring-white/10">
            <span className="text-[15px] text-pine-100">Example: one room night</span>
            <dl className="mt-4 flex flex-col gap-3 text-[15px]">
              <div className="flex justify-between gap-4">
                <dt>Room amount paid by the guest</dt>
                <dd className="font-semibold">{inr(example.room)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-pine-100">
                <dt>Commission ({pct(site.commissionRate)})</dt>
                <dd>− {inr(example.commission)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-pine-100">
                <dt>GST on commission ({pct(site.gstOnCommission)})</dt>
                <dd>− {inr(example.gst)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/15 pt-3 text-lg font-bold text-brass-200">
                <dt>Reaches your bank</dt>
                <dd>{inr(example.net)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-pine-100/70">Room GST charged to the guest is passed to you for filing. Tax deducted at source, if any, is shown on each statement.</p>
          </div>
        </div>
      </section>

      <section id="faq" className="container-page grid gap-8 py-16 lg:grid-cols-[1fr_2fr]">
        <h2 className="text-[32px] leading-tight font-bold text-pine-950">Questions owners ask</h2>
        <div className="divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-ink-900">
                {f.q}
                <span aria-hidden="true" className="text-2xl text-pine-700 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 max-w-2xl text-ink-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-brass-50 p-8 ring-1 ring-brass-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-pine-950">Ready to list?</h2>
            <p className="text-ink-700">Have your room prices, a few photos and your address handy.</p>
          </div>
          <Link to={start} className="btn-primary min-h-12 px-6 text-base">
            List your property
          </Link>
        </div>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="container-page flex flex-col gap-3 py-8 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {site.name}, {site.tagline.toLowerCase()}.
          </span>
          <span>
            {site.supportPhone}, {site.supportEmail}
          </span>
        </div>
      </footer>
    </div>
  )
}
