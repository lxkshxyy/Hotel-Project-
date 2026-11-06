import { ArrowRight, Briefcase, Check, ChevronLeft, ChevronRight, Crown, Sparkles, Wallet } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { site } from '../../config/site'
import { minPrice } from '../../data/hotels'
import type { Hotel } from '../../data/types'
import { inr } from '../../lib/format'
import { useHotels } from '../../lib/useHotels'
import { defaultSearch, searchToQuery } from '../../lib/search'
import { Reveal } from '../ui'

const base = defaultSearch()
const q = (extra: Record<string, string> = {}, city = '') => `/hotels?${searchToQuery({ ...base, city }, extra)}`
/** "from ₹1,899 a night" when matching hotels are listed, otherwise null. */
const fromPrice = (list: Hotel[] | null, filter: (h: Hotel) => boolean) => {
  const p = (list ?? []).filter(filter).map(minPrice)
  return p.length ? inr(Math.min(...p)) : null
}

type Tab = 'All Offers' | 'Hotels' | 'Long Stays' | 'Members' | 'Business'
const tabs: Tab[] = ['All Offers', 'Hotels', 'Long Stays', 'Members', 'Business']

/*
 * Offer cards. Every offer here maps to a real discount or feature on the site —
 * add new ones only when the matching coupon or price rule exists.
 */
type Offer = { tab: Exclude<Tab, 'All Offers'>; title: string; text: string; img: string; to: string }
const offerList = (list: Hotel[] | null): Offer[] => {
  const prime = fromPrice(list, (h) => h.brand === 'Prime')
  const jaipur = fromPrice(list, (h) => h.city === 'Jaipur')
  return [
    { tab: 'Hotels', title: 'For your first getaway:', text: `Use code FIRSTSTAY for flat ${inr(site.firstStayDiscount)} off your first booking.`, img: '/destinations/goa.webp', to: q({}, 'Goa') },
    { tab: 'Long Stays', title: 'Staying 5 nights or more?', text: 'Use code LONGSTAY for 10% off long stays in every city.', img: '/photos/courtyard-pool.webp', to: q() },
    { tab: 'Members', title: 'Members save more:', text: 'Sign in for an extra 5% off every booking and earn Club points.', img: '/photos/skyline-pool.webp', to: '/club' },
    { tab: 'Hotels', title: `${site.name} Prime stays:`, text: prime ? `Pools, breakfast and bigger rooms from ${prime} a night.` : 'Pools, breakfast and bigger rooms. Coming soon.', img: '/photos/grand-exterior.webp', to: q({ brand: 'Prime' }) },
    { tab: 'Business', title: 'Travelling for work?', text: 'Corporate rates 12% below public prices, GST invoices and team booking.', img: '/photos/city-exterior.webp', to: '/business' },
    { tab: 'Hotels', title: 'Heritage Jaipur:', text: jaipur ? `Stays near Hawa Mahal and the Old City from ${jaipur} a night.` : 'Stays near Hawa Mahal and the Old City. Coming soon.', img: '/destinations/jaipur.webp', to: q({}, 'Jaipur') },
    { tab: 'Hotels', title: 'Pay at hotel:', text: 'Reserve now with no prepayment on most stays. Pay by cash, card or UPI.', img: '/photos/rooftop-pool.webp', to: q() },
    { tab: 'Long Stays', title: 'Work-from-anywhere weeks:', text: 'Work desks, fast Wi-Fi and LONGSTAY savings in Bengaluru and Hyderabad.', img: '/destinations/bengaluru.webp', to: q({}, 'Bengaluru') },
  ]
}

export function OffersPanel() {
  const [tab, setTab] = useState<Tab>('All Offers')
  const scroller = useRef<HTMLDivElement>(null)
  const hotels = useHotels()
  const list = offerList(hotels).filter((o) => tab === 'All Offers' || o.tab === tab)
  const scroll = (d: number) => scroller.current?.scrollBy({ left: d * scroller.current.clientWidth * 0.8, behavior: 'smooth' })

  return (
    <section aria-labelledby="offers-h" className="card p-4 shadow-card sm:p-6">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <h2 id="offers-h" className="text-[30px] leading-none font-black text-ink-900 sm:text-[34px]">
          Offers
        </h2>
        <div role="tablist" aria-label="Offer type" className="no-scrollbar flex gap-5 overflow-x-auto border-b border-line">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`shrink-0 border-b-[3px] pb-1.5 text-[15px] ${tab === t ? 'border-navy-800 font-bold text-navy-800' : 'border-transparent text-ink-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/offers" className="flex items-center gap-1.5 text-[15px] font-black tracking-wide text-navy-800 uppercase no-underline">
            View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="hidden overflow-hidden rounded-full border border-line-strong sm:flex">
            <button type="button" aria-label="Previous offers" onClick={() => scroll(-1)} className="flex h-9 w-9 items-center justify-center text-navy-800 hover:bg-navy-50">
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" aria-label="More offers" onClick={() => scroll(1)} className="flex h-9 w-9 items-center justify-center border-l border-line-strong text-navy-800 hover:bg-navy-50">
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </span>
        </div>
      </div>

      <div ref={scroller} className="no-scrollbar mt-5 grid snap-x snap-mandatory auto-cols-[88%] grid-flow-col grid-rows-1 gap-4 overflow-x-auto pb-1 sm:auto-cols-[calc(50%-8px)] sm:grid-rows-2 lg:auto-cols-[calc(33.333%-11px)]">
        {list.map((o) => (
          <Link
            key={o.title}
            to={o.to}
            className="group relative flex snap-start gap-4 rounded-xl border border-line bg-white p-3 text-ink-900 no-underline shadow-[0_2px_8px_rgba(11,31,74,0.06)] transition-shadow hover:shadow-card"
          >
            <span className="h-[124px] w-[124px] shrink-0 overflow-hidden rounded-lg">
              <img src={o.img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="self-end text-[10px] font-semibold text-ink-500">T&amp;C’s APPLY</span>
              <strong className="text-[17px] leading-tight font-black uppercase">{o.title}</strong>
              <span className="my-2 h-0.5 w-8 bg-ink-900" />
              <span className="text-sm text-ink-700">{o.text}</span>
              <span className="mt-auto self-end pt-2 text-sm font-black tracking-wide text-navy-800">BOOK NOW</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

type Store = {
  name: string
  tier: string
  promise: string
  perks: string[]
  to: string
  img: string
  count: (h: Hotel) => boolean
  Icon: typeof Crown
  tone: string
}

const stores: Store[] = [
  {
    name: `${site.name} Prime`,
    tier: 'Premium',
    promise: 'Bigger rooms, richer interiors and extra care on every stay.',
    perks: ['Breakfast included', 'Pools and dining', 'Priority support'],
    to: q({ brand: 'Prime' }),
    img: '/photos/city-exterior.webp',
    count: (h) => h.brand === 'Prime',
    Icon: Crown,
    tone: 'bg-[#C89B3C] text-white',
  },
  {
    name: site.name,
    tier: 'Best value',
    promise: 'Comfortable rooms for work and holidays.',
    perks: ['Free breakfast', 'Top locations'],
    to: q({ brand: 'StayEasy' }),
    img: '/photos/heritage-palace.webp',
    count: (h) => h.brand === 'StayEasy',
    Icon: Sparkles,
    tone: 'bg-ember-600 text-white',
  },
  {
    name: `${site.name} Lite`,
    tier: 'Budget',
    promise: 'The essentials for short, smart trips.',
    perks: ['Spotless rooms', 'Near stations'],
    to: q({ brand: 'Lite' }),
    img: '/photos/modern-exterior.webp',
    count: (h) => h.brand === 'Lite',
    Icon: Wallet,
    tone: 'bg-leaf-700 text-white',
  },
  {
    name: `${site.name} for Business`,
    tier: 'Corporate',
    promise: 'Team bookings, GST invoices and corporate rates.',
    perks: ['12% below public rates', 'One company bill'],
    to: '/business',
    img: '/photos/courtyard-pool.webp',
    count: () => true,
    Icon: Briefcase,
    tone: 'bg-navy-800 text-white',
  },
]

function StoreCount({ n, light = true }: { n: number | null; light?: boolean }) {
  if (n === null) return null
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${n ? (light ? 'bg-white/90 text-navy-800' : 'bg-navy-50 text-navy-800') : 'bg-[#FFF3D6] text-[#8A5A00]'}`}>
      {n ? `${n} ${n === 1 ? 'hotel' : 'hotels'}` : 'Coming soon'}
    </span>
  )
}

export function FlagshipStores() {
  const hotels = useHotels()
  const count = (s: Store) => (hotels === null ? null : hotels.filter(s.count).length)
  const [prime, ...rest] = stores
  const PrimeIcon = prime.Icon

  return (
    <section aria-labelledby="stores-h" className="rounded-2xl bg-gradient-to-br from-[#EAF1FF] via-white to-[#FBF6EC] p-5 ring-1 ring-line sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="text-xs font-black tracking-[0.12em] text-ink-500 uppercase">Our brands</span>
          <h2 id="stores-h" className="mt-1 text-[26px] leading-tight font-black text-ink-900 sm:text-[30px]">
            Flagship Hotel Stores on {site.name}
          </h2>
        </div>
        <p className="text-sm text-ink-500">Four ways to stay, one {site.name} standard.</p>
      </div>

      <div className="no-scrollbar -mx-1 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-[1.35fr_1fr] lg:overflow-visible">
        {/* Prime: the large card */}
        <Link
          to={prime.to}
          className="group relative flex min-h-[340px] w-[82%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-2xl text-white no-underline shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(11,31,74,0.25)] sm:w-[60%] lg:w-auto"
        >
          <img src={prime.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/45 to-transparent" />
          <span className="absolute top-4 left-4 flex items-center gap-2">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-white/80 ${prime.tone}`}>
              <PrimeIcon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wider uppercase backdrop-blur">{prime.tier}</span>
          </span>
          <span className="absolute top-4 right-4">
            <StoreCount n={count(prime)} />
          </span>
          <span className="relative flex flex-col gap-2 p-5 sm:p-6">
            <strong className="text-[28px] leading-tight font-black">{prime.name}</strong>
            <span className="max-w-md text-[15px] text-[#E3E9F5]">{prime.promise}</span>
            <span className="mt-1 flex flex-wrap gap-2">
              {prime.perks.map((p) => (
                <span key={p} className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[13px] font-semibold backdrop-blur">
                  <Check className="h-3.5 w-3.5 text-[#F2C46D]" strokeWidth={3} aria-hidden="true" />
                  {p}
                </span>
              ))}
            </span>
            <span className="mt-2 flex items-center gap-1.5 text-sm font-black tracking-wide uppercase">
              Visit store <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </span>
        </Link>

        {/* The other three stores */}
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          {rest.map((s) => {
            const Icon = s.Icon
            return (
              <Link
                key={s.name}
                to={s.to}
                className="group flex w-[82%] shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-ink-900 no-underline ring-1 ring-line transition-all duration-300 hover:-translate-y-1 hover:shadow-card sm:w-[60%] lg:w-auto lg:flex-1"
              >
                <span className="relative w-[38%] shrink-0 overflow-hidden">
                  <img src={s.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1 p-3.5">
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${s.tone}`}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="text-[11px] font-bold tracking-wider text-ink-500 uppercase">{s.tier}</span>
                    </span>
                    {s.to !== '/business' && <StoreCount n={count(s)} light={false} />}
                  </span>
                  <strong className="text-[17px] leading-tight font-black">{s.name}</strong>
                  <span className="text-[13px] leading-snug text-ink-700">{s.promise}</span>
                  <span className="mt-auto flex items-center gap-1 pt-1 text-[13px] font-black text-navy-800">
                    Visit store <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const selections = [
  { title: 'Prime stays in India', text: 'Explore Prime hotels by city, view and top picks', img: '/photos/grand-exterior.webp', to: q({ brand: 'Prime' }) },
  { title: 'Prime by the sea', text: 'Pools and beach walks in Goa', img: '/photos/skyline-pool.webp', to: `/hotels?${searchToQuery({ ...base, city: 'Goa' }, { brand: 'Prime' })}` },
  { title: 'Prime near airports', text: 'Shuttles, early check-in and late check-out', img: '/photos/rooftop-pool.webp', to: q({ brand: 'Prime', f: 'airport' }) },
]

export function PrimeSelections() {
  return (
    <section aria-labelledby="prime-h" className="flex flex-col gap-6 rounded-2xl bg-[#FBF6EC] p-6 ring-1 ring-[#EFE2C6] sm:p-8 lg:flex-row lg:items-center">
      <div className="lg:w-[300px] lg:shrink-0">
        <span className="text-xs font-black tracking-[0.12em] text-ink-700 uppercase">Introducing</span>
        <h2 id="prime-h" className="mt-1 text-[34px] leading-tight font-black text-[#C89B3C]">
          {site.name} Prime Selections
        </h2>
        <p className="mt-2 text-sm text-ink-700">Hand-picked Prime hotels with bigger rooms, breakfast and priority support.</p>
      </div>
      <div className="no-scrollbar -mx-1 flex flex-1 gap-4 overflow-x-auto px-1 pb-1">
        {selections.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.05} className="w-[240px] shrink-0 lg:w-auto lg:flex-1">
            <Link to={s.to} className="group flex h-full flex-col overflow-hidden rounded-xl bg-white text-ink-900 no-underline shadow-[0_4px_14px_rgba(11,31,74,0.10)]">
              <span className="h-[150px] overflow-hidden">
                <img src={s.img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </span>
              <span className="flex flex-col gap-0.5 p-3">
                <strong className="text-[19px] leading-tight font-black">{s.title}</strong>
                <span className="text-[13px] text-ink-700">{s.text}</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
