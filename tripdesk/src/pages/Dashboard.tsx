import { BedDouble, BookOpenText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dayMonth, inr, plural, todayISO } from '@stayeasy/lib/format'
import SearchBar from '../components/SearchBar'
import { Empty, Stat } from '../components/ui'
import { useSession } from '../context/Session'
import { useBookings, useHotels, useQuotes, useWallet } from '../lib/hooks'
import { readSearch } from '../lib/search'

export default function Dashboard() {
  const { agency } = useSession()
  const { data: hotels } = useHotels()
  const { data: bookings } = useBookings()
  const { data: quotes } = useQuotes()
  const wallet = useWallet()
  const t = todayISO()
  const month = t.slice(0, 7)
  const live = (bookings ?? []).filter((b) => b.status === 'confirmed')
  const thisMonth = live.filter((b) => b.created_at.slice(0, 7) === month)
  const earned = thisMonth.reduce((s, b) => s + b.markup_amount, 0)
  const upcoming = live.filter((b) => b.check_out >= t).sort((a, b) => a.check_in.localeCompare(b.check_in))
  const cities = [...new Set((hotels ?? []).map((h) => h.city))].sort()

  return (
    <div className="page flex flex-col gap-8 pt-7">
      <div>
        <span className="text-muted">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <h1 className="text-[30px] leading-tight font-extrabold text-ink-950">{agency?.name}</h1>
      </div>

      <section aria-label="Search hotels" className="card p-5">
        <SearchBar initial={{ ...readSearch(new URLSearchParams()), city: agency?.city && cities.includes(agency.city) ? agency.city : '' }} cities={cities} />
      </section>

      <section aria-label="This month" className="card grid gap-6 p-6 sm:grid-cols-4">
        <Stat label="Wallet balance" value={wallet.data ? inr(wallet.balance) : '…'} sub={agency?.creditLimit ? `+ ${inr(agency.creditLimit)} credit` : <Link to="/app/wallet">Add money</Link>} />
        <Stat label="Bookings this month" value={thisMonth.length} sub={`${plural(thisMonth.reduce((s, b) => s + b.nights * b.rooms, 0), 'room night')}`} />
        <Stat label="Earned this month" value={inr(earned)} tone="earn" sub="Your markup on confirmed stays" />
        <Stat label="Open quotes" value={(quotes ?? []).length} sub={<Link to="/app/quotes">See quotes</Link>} />
      </section>

      <section aria-labelledby="up-h" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="up-h" className="text-xl font-extrabold text-ink-950">
            Coming up
          </h2>
          <Link to="/app/bookings" className="text-sm font-bold text-ink-700">
            All bookings
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="card">
            <Empty icon={<BedDouble className="h-7 w-7" />} title="No upcoming stays">
              <p className="max-w-sm text-muted">Search a city above, pick a room and book it for your customer, or save it to a quote first.</p>
              <Link to="/app/quotes" className="btn-line">
                <BookOpenText className="h-4 w-4" aria-hidden="true" /> Start a quote
              </Link>
            </Empty>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line text-sm text-muted">
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Hotel</th>
                  <th className="px-4 py-3 font-semibold">Stay</th>
                  <th className="px-4 py-3 text-right font-semibold">Your earning</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.slice(0, 6).map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-semibold">
                      <Link to={`/app/bookings?open=${b.id}`} className="text-ink-950 no-underline hover:underline">
                        {b.guest_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{b.hotel_name}</td>
                    <td className="px-4 py-3">
                      {dayMonth(b.check_in)} to {dayMonth(b.check_out)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-earn">{inr(b.markup_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
