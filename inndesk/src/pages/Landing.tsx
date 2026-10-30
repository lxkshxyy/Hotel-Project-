import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BedDouble, CalendarRange, Camera, ShieldCheck, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CreateAccount, ForgotPassword, SignInCard } from '../components/Auth'
import { Mark } from '../components/ui'
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

const rotating = ['Hotel, Homestay', 'Villa, Resort', 'Hostel, Guest house', 'Cottage, Apartment', "Lodge, Bed & B'fast"]

/** Only the property type changes: the old words slide up and out, the new ones slide in from below. */
function RotatingType() {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => setI((x) => (x + 1) % rotating.length), 2800)
    return () => clearInterval(t)
  }, [reduce])
  return (
    <span className="relative inline-flex h-[1.2em] overflow-hidden align-bottom" aria-live="off">
      <span className="sr-only">{rotating.join(', ')}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={rotating[i]}
          aria-hidden="true"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="block font-semibold whitespace-nowrap text-brass-200"
        >
          {rotating[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

const stats = [
  { big: '₹0', text: `To list your property. ${site.marketplace} earns only when a guest completes a stay.` },
  { big: '2 channels', text: `Your listing shows on the ${site.marketplace} website and to travel agents on TripDesk.` },
  { big: 'Weekly', text: `Payouts to your bank, ${site.payoutCycle}.` },
]

export default function Landing() {
  const { user, owner } = useSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const next = params.get('next')
  const after = next && next.startsWith('/app') ? next : '/app'
  const [create, setCreate] = useState<{ open: boolean; email: string }>({ open: pathname === '/signup', email: '' })
  const [forgot, setForgot] = useState<{ open: boolean; email: string }>({ open: false, email: '' })
  const listNew = () => (user ? navigate('/app/properties?new=1') : setCreate({ open: true, email: '' }))

  return (
    <div className="bg-paper">
      <section className="relative isolate overflow-hidden text-white">
        <img src="/img/hero-exterior.webp" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(11,36,27,0.94)_0%,rgba(11,36,27,0.82)_45%,rgba(11,36,27,0.55)_100%)]" />
        <header className="container-page flex h-[76px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 no-underline" aria-label={`${site.name} home`}>
            <Mark />
            <span className="leading-tight">
              <span className="block text-[22px] font-black text-white">{site.name}</span>
              <span className="block text-[12px] text-white/70">by {site.marketplace}</span>
            </span>
          </Link>
          <nav aria-label="Page" className="flex items-center gap-2 sm:gap-5">
            <a href="#features" className="hidden text-[15px] font-bold text-white/90 no-underline hover:text-white sm:inline">
              Features
            </a>
            {user && owner && (
              <Link to="/app" className="hidden min-h-10 items-center rounded-lg px-3 text-[15px] font-bold text-white ring-1 ring-white/30 hover:bg-white/10 sm:inline-flex">
                Open panel
              </Link>
            )}
            <button type="button" onClick={listNew} className="btn-brass min-h-10 px-3 text-[14px] sm:px-4 sm:text-[15px]">
              List new property for free
            </button>
          </nav>
        </header>

        <div className="container-page grid items-center gap-10 pt-8 pb-36 lg:grid-cols-[1.1fr_1fr] lg:pt-14 lg:pb-44">
          <div>
            <h1 className="text-[30px] leading-[1.25] font-black sm:text-[40px] xl:text-[44px]">
              <span className="flex flex-wrap items-end gap-x-3 lg:flex-nowrap">
                <span>List your</span>
                <RotatingType />
              </span>
              <span className="block">for free &amp; grow your business</span>
            </h1>
            <p className="mt-6 text-[22px] font-light text-white/95 sm:text-[28px]">Partner with {site.marketplace}</p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Where your listing appears`}>
              {[site.marketplace, `${site.marketplace} for Business`, 'TripDesk for agents'].map((b) => (
                <li key={b} className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-bold text-white ring-1 ring-white/20">
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[15px] text-white/80">Free to list. Your property goes live once the checks pass.</p>
          </div>
          <div className="flex justify-center lg:justify-end">
            {user && owner ? (
              <div className="w-full max-w-[440px] rounded-2xl bg-white/12 p-8 text-center ring-1 ring-white/25 backdrop-blur-xl">
                <h2 className="text-[22px] font-black">Welcome back, {owner.fullName.split(' ')[0]}</h2>
                <p className="mt-1 text-white/80">Signed in as {user.email}</p>
                <Link to="/app" className="btn-brass mt-6 min-h-12 w-full text-base">
                  Go to my properties
                </Link>
              </div>
            ) : (
              <SignInCard onSignedIn={() => navigate(after, { replace: true })} onCreate={(email) => setCreate({ open: true, email })} onForgot={(email) => setForgot({ open: true, email })} />
            )}
          </div>
        </div>
      </section>

      <div className="container-page relative z-10 -mt-24 grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.big} className="rounded-xl bg-white p-6 shadow-panel ring-1 ring-line">
            <strong className="block text-[26px] font-bold text-brass-700">{s.big}</strong>
            <p className="mt-2 text-[15px] text-ink-700">{s.text}</p>
          </div>
        ))}
      </div>

      <CreateAccount open={create.open} presetEmail={create.email} onClose={() => setCreate({ open: false, email: '' })} onDone={() => navigate(after, { replace: true })} />
      <ForgotPassword open={forgot.open} presetEmail={forgot.email} onClose={() => setForgot({ open: false, email: '' })} onDone={() => navigate(after, { replace: true })} />

      <div className="h-16" />
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

      <section id="features" className="container-page scroll-mt-6 py-16">
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
          <button type="button" onClick={listNew} className="btn-primary min-h-12 px-6 text-base">
            List your property
          </button>
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
