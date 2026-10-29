import { motion } from 'framer-motion'
import { BriefcaseBusiness, CalendarCheck2, Search, TicketX } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BackToTop from './BackToTop'

export type TripTab = 'upcoming' | 'cancelled' | 'completed'

/* Each tab tints the page band, so you always know which list you're in. */
const bands: Record<TripTab, string> = {
  upcoming: 'bg-[linear-gradient(100deg,#5FE0CD_0%,#6FCFD6_55%,#78BFD9_100%)]',
  cancelled: 'bg-[linear-gradient(100deg,#F4CB4C_0%,#F2B33A_55%,#EE9B2A_100%)]',
  completed: 'bg-[linear-gradient(100deg,#B9BFC8_0%,#C9CED6_55%,#D6DAE0_100%)]',
}

const tabs: { id: TripTab; label: string; Icon: typeof BriefcaseBusiness }[] = [
  { id: 'upcoming', label: 'Upcoming', Icon: BriefcaseBusiness },
  { id: 'cancelled', label: 'Cancelled', Icon: TicketX },
  { id: 'completed', label: 'Completed', Icon: CalendarCheck2 },
]

const empty: Record<TripTab, { t: string; d: string }> = {
  upcoming: { t: 'Looks empty, you’ve no upcoming bookings.', d: 'When you book a trip, you will see your itinerary here.' },
  cancelled: { t: 'Looks empty, you’ve no cancelled bookings.', d: 'Great! Looks like you’ve no cancelled bookings.' },
  completed: { t: 'Looks empty, you’ve no completed bookings.', d: 'Looks like you don’t have any completed trips.' },
}

export function TripsEmpty({ tab, planTo }: { tab: TripTab; planTo: string }) {
  const Icon = tabs.find((t) => t.id === tab)!.Icon
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-12 text-center sm:flex-row sm:px-16 sm:text-left">
      <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
        <span className="absolute top-2 left-4 h-2 w-2 rounded-full border-2 border-ink-400" />
        <span className="absolute right-3 bottom-6 h-2.5 w-2.5 rounded-full border-2 border-ink-400" />
        <span className="absolute top-8 right-1 h-1.5 w-1.5 rounded-full bg-ink-700" />
        <Icon className="h-20 w-20 text-ink-400" strokeWidth={1.3} aria-hidden="true" />
      </div>
      <div>
        <strong className="block text-2xl font-black text-ink-700">{empty[tab].t}</strong>
        <span className="mt-1 block text-sm text-ink-700">{empty[tab].d}</span>
        <Link to={planTo} className="btn mt-5 rounded-full bg-gradient-to-r from-[#FF5A5F] to-ember-600 px-14 font-black text-white uppercase shadow-[0_8px_18px_rgba(194,65,12,0.3)]">
          Plan a trip
        </Link>
      </div>
    </div>
  )
}

export default function TripsShell({
  tab,
  onTab,
  counts,
  query,
  onQuery,
  crumbTo,
  children,
}: {
  tab: TripTab
  onTab: (t: TripTab) => void
  counts: Record<TripTab, number>
  query: string
  onQuery: (q: string) => void
  crumbTo: string
  children: ReactNode
}) {
  return (
    <div className="relative pb-16">
      <motion.div key={tab} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className={`absolute inset-x-0 top-0 h-[260px] ${bands[tab]}`} aria-hidden="true" />
      <div className="container-page relative max-w-[1200px] pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="text-lg font-bold text-ink-900/80">
            <Link to={crumbTo} className="text-ink-900/80 no-underline hover:underline">
              My Account
            </Link>{' '}
            <span aria-hidden="true">›</span> My Trips
          </nav>
          <form role="search" onSubmit={(e) => e.preventDefault()} className="flex overflow-hidden rounded-md bg-white shadow-sm">
            <label className="sr-only" htmlFor="trip-q">
              Search for a booking
            </label>
            <input id="trip-q" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search for a booking" className="h-12 w-[200px] px-3 text-[15px] outline-none sm:w-[240px]" />
            <button type="submit" aria-label="Search" className="flex w-12 items-center justify-center bg-[#FF5A5F] text-white">
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-card">
          <div role="tablist" aria-label="Trip status" className="no-scrollbar flex justify-between gap-1 overflow-x-auto border-b border-line px-3 sm:justify-start sm:gap-6 sm:px-8">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => onTab(id)}
                className={`flex shrink-0 items-center gap-1.5 border-b-4 px-1 pt-5 pb-3.5 text-[13px] font-black tracking-wide uppercase sm:gap-2 sm:px-2 sm:pt-6 sm:pb-4 sm:text-lg ${tab === id ? 'border-accent text-ink-900' : 'border-transparent text-ink-400 hover:text-ink-700'}`}
              >
                <Icon className={`hidden h-6 w-6 sm:block ${tab === id ? (id === 'upcoming' ? 'text-[#16A394]' : id === 'cancelled' ? 'text-ink-900' : 'text-navy-800') : ''}`} aria-hidden="true" />
                {label}
                {counts[id] > 0 && <span className="rounded-full bg-mist px-1.5 py-0.5 text-[11px] text-ink-700 sm:px-2 sm:text-xs">{counts[id]}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 rounded-xl bg-white shadow-card">{children}</div>
      </div>
      <BackToTop />
    </div>
  )
}
