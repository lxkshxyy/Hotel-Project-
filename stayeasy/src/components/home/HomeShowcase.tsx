import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { site } from '../../config/site'
import { hotels, minPrice } from '../../data/hotels'
import { inr } from '../../lib/format'
import { defaultSearch, searchToQuery } from '../../lib/search'
import { Reveal } from '../ui'

const base = defaultSearch()
const q = (extra: Record<string, string> = {}, city = '') => `/hotels?${searchToQuery({ ...base, city }, extra)}`
const from = (filter: (h: (typeof hotels)[number]) => boolean) => inr(Math.min(...hotels.filter(filter).map(minPrice)))

type Tab = 'All Offers' | 'Hotels' | 'Long Stays' | 'Members' | 'Business'
const tabs: Tab[] = ['All Offers', 'Hotels', 'Long Stays', 'Members', 'Business']

/*
 * Offer cards. Every offer here maps to a real discount or feature on the site —
 * add new ones only when the matching coupon or price rule exists.
 */
const offers: { tab: Exclude<Tab, 'All Offers'>; title: string; text: string; img: string; to: string }[] = [
  { tab: 'Hotels', title: 'For your first getaway:', text: `Use code FIRSTSTAY for flat ${inr(site.firstStayDiscount)} off your first booking.`, img: '/destinations/goa.jpg', to: q({}, 'Goa') },
  { tab: 'Long Stays', title: 'Staying 5 nights or more?', text: 'Use code LONGSTAY for 10% off long stays in every city.', img: '/hotels/csfc/room-4.webp', to: q() },
  { tab: 'Members', title: 'Members save more:', text: 'Sign in for an extra 5% off every booking and earn Club points.', img: '/hotels/orange-oasis/room-1.webp', to: '/club' },
  { tab: 'Hotels', title: 'StayEasy Prime stays:', text: `Pools, breakfast and bigger rooms from ${from((h) => h.brand === 'Prime')} a night.`, img: '/hotels/prime-oasis-blue/exterior-1.webp', to: q({ brand: 'Prime' }) },
  { tab: 'Business', title: 'Travelling for work?', text: 'Corporate rates 12% below public prices, GST invoices and team booking.', img: '/hotels/red-vibe/banquet-1.webp', to: '/business' },
  { tab: 'Hotels', title: 'Heritage Jaipur:', text: `Stays near Hawa Mahal and the Old City from ${from((h) => h.city === 'Jaipur')} a night.`, img: '/destinations/jaipur.jpg', to: q({}, 'Jaipur') },
  { tab: 'Hotels', title: 'Pay at hotel:', text: 'Reserve now with no prepayment on most stays. Pay by cash, card or UPI.', img: '/hotels/red-vibe/lobby-1.webp', to: q() },
  { tab: 'Long Stays', title: 'Work-from-anywhere weeks:', text: 'Work desks, fast Wi-Fi and LONGSTAY savings in Bengaluru and Hyderabad.', img: '/destinations/bengaluru.jpg', to: q({}, 'Bengaluru') },
]

export function OffersPanel() {
  const [tab, setTab] = useState<Tab>('All Offers')
  const scroller = useRef<HTMLDivElement>(null)
  const list = offers.filter((o) => tab === 'All Offers' || o.tab === tab)
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

const stores = [
  { name: 'StayEasy Prime', mark: 'P', to: q({ brand: 'Prime' }), img: '/hotels/prime-oasis-blue/exterior-2.webp', ring: 'bg-navy-800 text-white' },
  { name: 'StayEasy', mark: 'S', to: q({ brand: 'StayEasy' }), img: '/hotels/orange-oasis/exterior-1.webp', ring: 'bg-ember-600 text-white' },
  { name: 'StayEasy Lite', mark: 'L', to: q({ brand: 'Lite' }), img: '/hotels/csfc/exterior-1.webp', ring: 'bg-leaf-700 text-white' },
  { name: 'StayEasy for Business', mark: 'B', to: '/business', img: '/hotels/red-vibe/exterior-1.webp', ring: 'bg-ink-900 text-white' },
]

export function FlagshipStores() {
  return (
    <section aria-labelledby="stores-h" className="flex flex-col gap-5 rounded-2xl bg-gradient-to-r from-[#EAF1FF] to-white p-5 ring-1 ring-line sm:p-7 lg:flex-row lg:items-center">
      <h2 id="stores-h" className="text-[26px] leading-tight font-black text-ink-900 lg:w-[220px] lg:shrink-0">
        Flagship Hotel Stores on {site.name}
      </h2>
      <div className="no-scrollbar -mx-1 flex flex-1 gap-3 overflow-x-auto px-1 pb-1">
        {stores.map((s) => (
          <Link key={s.name} to={s.to} className="group relative h-[130px] w-[200px] shrink-0 overflow-hidden rounded-xl no-underline lg:w-auto lg:flex-1">
            <img src={s.img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <span className={`absolute top-2.5 left-2.5 flex h-10 w-10 items-center justify-center rounded-full text-lg font-black ring-2 ring-white ${s.ring}`}>{s.mark}</span>
            <strong className="absolute bottom-2.5 left-3 text-[15px] text-white">{s.name}</strong>
          </Link>
        ))}
      </div>
    </section>
  )
}

const selections = [
  { title: 'Prime stays in India', text: 'Explore Prime hotels by city, view and top picks', img: '/hotels/prime-oasis-blue/lobby-1.webp', to: q({ brand: 'Prime' }) },
  { title: 'Prime by the sea', text: 'Pools and beach walks in Goa', img: '/hotels/prime-oasis-blue/exterior-1.webp', to: `/hotels?${searchToQuery({ ...base, city: 'Goa' }, { brand: 'Prime' })}` },
  { title: 'Prime near airports', text: 'Shuttles, early check-in and late check-out', img: '/hotels/prime-oasis-blue/room-3.webp', to: q({ brand: 'Prime', f: 'airport' }) },
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
