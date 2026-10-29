import { motion } from 'framer-motion'
import {
  Briefcase,
  Building2,
  Clock3,
  Gift,
  Headphones,
  RefreshCcw,
  Smartphone,
  Tag,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HotelArt from '../components/HotelArt'
import { HotelTile } from '../components/HotelCards'
import SearchForm from '../components/SearchForm'
import { FlagshipStores, OffersPanel, PrimeSelections } from '../components/home/HomeShowcase'
import { Reveal, amenityMeta } from '../components/ui'
import { features } from '../config/launch'
import { site } from '../config/site'
import { useAuth } from '../context/AuthContext'
import { brands, cities, minPrice } from '../data/hotels'
import { CLUB_FEE, clubTiers } from '../lib/club'
import type { Hotel } from '../data/types'
import { getHotels } from '../lib/api'
import { inr } from '../lib/format'
import { defaultSearch, searchToQuery } from '../lib/search'

const benefits = [
  { t: 'Lowest price guarantee', d: 'Find it cheaper? We match it.', Icon: Tag },
  { t: 'Pay at hotel', d: 'Reserve now, pay when you arrive.', Icon: Wallet },
  { t: 'Free cancellation', d: 'Up to 24 hours before check-in.', Icon: RefreshCcw },
  { t: '30-minute fix promise', d: 'Room issue fixed fast, or the night is free.', Icon: Clock3 },
  { t: 'Earn Club points', d: '1 point = ₹1 on your next stay.', Icon: Gift },
  { t: '24/7 support', d: 'Call, chat or WhatsApp us anytime.', Icon: Headphones },
]

const quick = [
  { label: 'Hotels near me', filter: 'near-me' },
  { label: 'Near airport', filter: 'airport' },
  { label: 'Near railway station', filter: 'railway' },
  { label: 'Couple friendly', filter: 'couple' },
  { label: 'With free breakfast', filter: 'breakfast' },
]

const roomStandard = ['wifi', 'ac', 'tv', 'hotWater', 'breakfast', 'security', 'powerBackup', 'roomService'] as const

export default function Home() {
  const [list, setList] = useState<Hotel[]>([])
  const { user } = useAuth()
  const navigate = useNavigate()
  const base = useMemo(() => defaultSearch(), [])

  useEffect(() => {
    getHotels()
      .then(setList)
      .catch(() => setList([]))
  }, [])

  const topRated = useMemo(() => [...list].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 8), [list])
  const countByCity = useMemo(() => {
    const m = new Map<string, { n: number; from: number }>()
    for (const h of list) {
      const cur = m.get(h.city)
      const p = minPrice(h)
      m.set(h.city, { n: (cur?.n ?? 0) + 1, from: Math.min(cur?.from ?? Infinity, p) })
    }
    return m
  }, [list])
  const lowest = list.length ? Math.min(...list.map(minPrice)) : 0

  const goQuick = (filter: string) => {
    if (filter === 'near-me' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          const nearest = [...list].sort(
            (a, b) => Math.hypot(a.lat - latitude, a.lng - longitude) - Math.hypot(b.lat - latitude, b.lng - longitude),
          )[0]
          navigate(`/hotels?${searchToQuery({ ...base, city: nearest?.city ?? '' })}`)
        },
        () => navigate(`/hotels?${searchToQuery(base)}`),
        { timeout: 6000 },
      )
      return
    }
    navigate(`/hotels?${searchToQuery(base, { f: filter })}`)
  }

  return (
    <>
      {/* Hero */}
      <section className="relative bg-navy-800 pb-36 text-white sm:pb-32">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-navy-700/60 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-ember-600/20 blur-3xl" />
        </div>
        <div className="container-page relative pt-12 sm:pt-16">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[13px] font-bold tracking-[0.08em] text-ember-200 uppercase"
          >
            {site.tagline}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="mt-3 max-w-3xl text-[38px] leading-[1.05] font-extrabold tracking-tight sm:text-[56px]"
          >
            Clean, comfortable rooms. Same standard in every city.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5 }}
            className="mt-4 max-w-xl text-lg text-[#D3DCEE]"
          >
            Hotels from {lowest ? inr(lowest) : '…'} a night across {countByCity.size || 8} cities. Free cancellation, pay at hotel,
            and a 30-minute service promise.
          </motion.p>
        </div>
      </section>

      <div className="container-page relative z-10 -mt-28 sm:-mt-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-white p-4 shadow-float sm:p-6"
        >
          <SearchForm initial={base} />
          <div className="no-scrollbar -mx-1 mt-4 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            <span className="shrink-0 text-sm text-ink-500">Quick search:</span>
            {quick.map((q) => (
              <button
                key={q.filter}
                type="button"
                onClick={() => goQuick(q.filter)}
                className="shrink-0 rounded-full bg-navy-50 px-3.5 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-100"
              >
                {q.label}
              </button>
            ))}
          </div>
        </motion.div>

        {!user && (
          <Reveal className="mt-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-[#F5D5C2] bg-ember-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-ember-600">
                  <Gift className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <strong className="block text-[17px]">New here? Sign up and get {inr(site.firstStayDiscount)} off your first stay</strong>
                  <span className="text-sm text-ink-700">Members also get an extra 5% off every booking and earn Club points.</span>
                </div>
              </div>
              <Link to="/login" className="btn-primary shrink-0">
                Sign up free
              </Link>
            </div>
          </Reveal>
        )}
      </div>

      {/* Offers + flagship stores */}
      <div className="container-page mt-10 flex flex-col gap-8">
        <Reveal>
          <OffersPanel />
        </Reveal>
        <Reveal>
          <FlagshipStores />
        </Reveal>
      </div>

      {/* Benefits */}
      <section className="container-page mt-14">
        <Reveal>
          <h2 className="section-title">Why book direct with {site.name}</h2>
        </Reveal>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
          {benefits.map(({ t, d, Icon }, i) => (
            <Reveal key={t} delay={i * 0.04}>
              <div className="card h-full p-4 sm:p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <strong className="mt-3 block leading-snug">{t}</strong>
                <span className="mt-1 block text-sm text-ink-500">{d}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Destinations */}
      <section className="container-page mt-14">
        <Reveal>
          <h2 className="section-title">Popular destinations</h2>
        </Reveal>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {cities.map((c, i) => {
            const info = countByCity.get(c.name)
            return (
              <Reveal key={c.name} delay={i * 0.03}>
                <Link
                  to={`/hotels?${searchToQuery({ ...base, city: c.name })}`}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-2xl no-underline"
                >
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                    {c.image ? (
                      <img
                        src={c.image}
                        alt={`${c.name} city view`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <HotelArt hue={c.hue} kind="city" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/75 via-navy-950/10 to-transparent" />
                  <div className="absolute bottom-0 p-3 text-white sm:p-4">
                    <strong className="block text-lg">{c.name}</strong>
                    <span className="text-sm text-[#E3E9F5]">
                      {info ? `${info.n} stays · from ${inr(info.from)}` : 'Coming soon'}
                    </span>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* Top rated */}
      <section className="mt-14">
        <div className="container-page flex items-end justify-between gap-4">
          <Reveal>
            <h2 className="section-title">Top-rated stays this week</h2>
          </Reveal>
          <Link to={`/hotels?${searchToQuery(base, { sort: 'rating' })}`} className="shrink-0 font-bold no-underline hover:underline">
            See all
          </Link>
        </div>
        <div className="no-scrollbar container-page mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {topRated.map((h) => (
            <div key={h.slug} className="w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-auto">
              <HotelTile hotel={h} query={searchToQuery({ ...base, city: h.city })} />
            </div>
          ))}
        </div>
      </section>

      {/* Prime selections */}
      <div className="container-page mt-14">
        <Reveal>
          <PrimeSelections />
        </Reveal>
      </div>

      {/* Brands */}
      <section className="container-page mt-14">
        <Reveal>
          <h2 className="section-title">One brand, three budgets</h2>
          <p className="mt-1 text-ink-500">Pick the stay that fits your trip. Every one meets the {site.name} standard.</p>
        </Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {brands.map((b, i) => {
            const from = list.filter((h) => h.brand === b.brand).map(minPrice)
            return (
              <Reveal key={b.name} delay={i * 0.06}>
                <div className="card flex h-full flex-col overflow-hidden">
                  <div className="group relative aspect-[16/8] overflow-hidden">
                    <HotelArt hue={b.hue} kind="room" photo={b.photo} label={`${b.name} room`} className="transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <div className="flex items-center justify-between">
                      <strong className="text-xl text-navy-800">{b.name}</strong>
                      <span className={`text-xs font-bold tracking-wider uppercase ${b.tagClass}`}>{b.tag}</span>
                    </div>
                    <p className="text-ink-700">{b.description}</p>
                    <ul className="mt-1 flex flex-col gap-1.5 text-sm">
                      {b.points.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span className="text-leaf-700" aria-hidden="true">
                            ✓
                          </span>
                          {p}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="text-sm text-ink-500">
                        From <strong className="text-lg text-ink-900">{from.length ? inr(Math.min(...from)) : '—'}</strong>/night
                      </span>
                      <Link to={`/hotels?${searchToQuery(base, { brand: b.brand })}`} className="font-bold no-underline hover:underline">
                        Explore →
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* Room standard */}
      <section className="container-page mt-14">
        <div className="grid items-center gap-8 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-10 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <h2 className="section-title">Standard in every room</h2>
            <p className="mt-2 text-ink-700">
              Every {site.name} room is checked against the same list before you arrive. If something isn’t right, we fix it within 30
              minutes — or the night is on us.
            </p>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {roomStandard.map((k, i) => {
              const { label, Icon } = amenityMeta[k]
              return (
                <Reveal key={k} delay={i * 0.03}>
                  <div className="flex flex-col items-center gap-2 rounded-2xl bg-canvas p-4 text-center text-sm font-semibold">
                    <Icon className="h-6 w-6 text-navy-800" aria-hidden="true" />
                    {label}
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* Club */}
      <section className="mt-14 bg-navy-900 py-14 text-white">
        <div className="container-page">
          <Reveal>
            <p className="text-[13px] font-bold tracking-[0.08em] text-ember-200 uppercase">{site.name} Club</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Stay more, save more</h2>
            <p className="mt-2 max-w-xl text-[#D3DCEE]">
              Free to join ({inr(CLUB_FEE)} fee, no yearly charge). Every booking moves you up a level with bigger discounts and bonus points.
            </p>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {clubTiers.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.06}>
                <div className="h-full rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                  <span className="inline-block h-2 w-10 rounded-full" style={{ background: t.color }} />
                  <strong className="mt-3 block text-xl">{t.name}</strong>
                  <span className="text-sm text-[#9FB0CF]">{t.minBookings ? `${t.minBookings} bookings · ${t.minNights} nights` : 'On sign-up'}</span>
                  <p className="mt-4 text-3xl font-extrabold">{Math.round(t.discount * 100)}% off</p>
                  <p className="mt-1 text-sm text-[#D3DCEE]">{t.bonus ? `${t.bonus} bonus points` : '1 point per ₹100'}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Link to="/club" className="btn mt-8 bg-white text-navy-800 hover:bg-navy-50">
            How the Club works
          </Link>
        </div>
      </section>

      {/* App + business */}
      <section className="container-page mt-14 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <div className="flex h-full flex-col gap-3 rounded-3xl bg-ember-50 p-6 ring-1 ring-[#F5D5C2] sm:p-8">
            <Smartphone className="h-8 w-8 text-ember-600" aria-hidden="true" />
            <h2 className="text-2xl font-extrabold text-navy-800">Get the app for app-only deals</h2>
            <p className="text-ink-700">
              Install {site.name} on your phone in one tap — no app store needed. Check in faster, track bookings and get alerts.
            </p>
            <p className="text-sm text-ink-500">
              On Android: open the browser menu → <strong>Install app</strong>. On iPhone: Share → <strong>Add to Home Screen</strong>.
            </p>
          </div>
        </Reveal>
        {features.business && (
        <Reveal delay={0.05}>
          <div className="grid h-full gap-4 sm:grid-cols-2">
            <Link to="/business" className="card flex flex-col gap-2 p-6 text-ink-900 no-underline hover:shadow-card">
              <Briefcase className="h-7 w-7 text-navy-800" aria-hidden="true" />
              <strong className="text-lg">{site.name} for Business</strong>
              <span className="text-sm text-ink-500">GST invoices, central billing and corporate rates for your team.</span>
              <span className="mt-auto font-bold text-navy-800">Talk to sales →</span>
            </Link>
            <Link to="/login?type=business&next=/biz" className="card flex flex-col gap-2 p-6 text-ink-900 no-underline hover:shadow-card">
              <Building2 className="h-7 w-7 text-navy-800" aria-hidden="true" />
              <strong className="text-lg">Already a business customer?</strong>
              <span className="text-sm text-ink-500">Sign in with your work email for company rates, team bookings and GST billing.</span>
              <span className="mt-auto font-bold text-navy-800">Business login →</span>
            </Link>
          </div>
        </Reveal>
        )}
      </section>
    </>
  )
}
