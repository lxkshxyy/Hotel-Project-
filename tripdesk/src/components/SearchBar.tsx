import { Search as SearchIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, todayISO } from '@stayeasy/lib/format'
import { toQuery, type Search } from '../lib/search'

export default function SearchBar({ initial, cities, compact = false }: { initial: Search; cities: string[]; compact?: boolean }) {
  const [s, setS] = useState(initial)
  const navigate = useNavigate()
  const go = (e: FormEvent) => {
    e.preventDefault()
    navigate(`/app/hotels?${toQuery(s)}`)
  }
  const num = (k: 'rooms' | 'adults' | 'children', min: number, max: number) => (
    <select aria-label={k} className="field" value={s[k]} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })}>
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  )
  return (
    <form onSubmit={go} className={`grid gap-3 ${compact ? 'md:grid-cols-[1.4fr_1fr_1fr_.6fr_.6fr_.6fr_auto]' : 'sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_.6fr_.6fr_.6fr_auto]'} items-end`}>
      <label className="label">
        City
        <select className="field" value={s.city} onChange={(e) => setS({ ...s, city: e.target.value })}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="label">
        Check-in
        <input type="date" className="field" min={todayISO()} value={s.checkIn} onChange={(e) => setS({ ...s, checkIn: e.target.value, checkOut: e.target.value >= s.checkOut ? addDays(e.target.value, 1) : s.checkOut })} />
      </label>
      <label className="label">
        Check-out
        <input type="date" className="field" min={addDays(s.checkIn, 1)} value={s.checkOut} onChange={(e) => setS({ ...s, checkOut: e.target.value })} />
      </label>
      <label className="label">
        Rooms
        {num('rooms', 1, 8)}
      </label>
      <label className="label">
        Adults
        {num('adults', 1, 20)}
      </label>
      <label className="label">
        Children
        {num('children', 0, 8)}
      </label>
      <button type="submit" className="btn-gold min-h-[44px]">
        <SearchIcon className="h-4 w-4" aria-hidden="true" /> Search
      </button>
    </form>
  )
}
