import { AnimatePresence, motion } from 'framer-motion'
import { Building2, ChevronDown, Clock3, MapPin, Search, TrendingUp, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from '../../context/AccountContext'
import { useAuth } from '../../context/AuthContext'
import { bizRules, type BookingFor } from '../../data/business'
import { cities, hotels } from '../../data/hotels'
import { getLastSearch, saveLastSearch } from '../../lib/bizApi'
import { addDays, dayMonth, parseISODate, todayISO } from '../../lib/format'
import { useProfile } from '../../lib/profile'
import { bizQuery } from '../../pages/biz/shared'
import DateRangeCalendar from '../DateRangeCalendar'
import { Stepper } from '../ui'

type Pop = 'city' | 'dates' | 'guests' | 'for' | null

/** Business hotel search in the big-travel-site style, with "Booking For". */
export default function BizSearchForm({ cat = '' }: { cat?: string }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { company, isAdmin, updateCompany } = useAccount()
  const { name: myName } = useProfile()
  const last = getLastSearch()
  const start = addDays(todayISO(), 1)
  const [city, setCity] = useState(last?.city ?? 'New Delhi')
  const [checkIn, setCheckIn] = useState(last && last.checkIn >= todayISO() ? last.checkIn : start)
  const [checkOut, setCheckOut] = useState(last && last.checkIn >= todayISO() ? last.checkOut : addDays(start, 1))
  const [rooms, setRooms] = useState(1)
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [women, setWomen] = useState(false)
  const [who, setWho] = useState<{ name: string; email: string; kind: BookingFor }>({ name: myName, email: user?.email ?? '', kind: 'Myself' })
  const [pop, setPop] = useState<Pop>(null)
  const [editing, setEditing] = useState<'in' | 'out'>('in')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [newP, setNewP] = useState({ name: '', email: '' })
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!pop) return
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setPop(null)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPop(null)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [pop])

  useEffect(() => setQ(''), [pop])

  useEffect(() => {
    if (who.kind === 'Myself') setWho((w) => ({ ...w, name: myName }))
  }, [myName]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!company || !user) return null
  const colleagues = company.employees.filter((e) => e.email.toLowerCase() !== user.email.toLowerCase())
  const match = (s: string) => s.toLowerCase().includes(q.trim().toLowerCase())
  const places = [
    ...cities.map((c) => ({ label: c.name, sub: 'City · India', value: c.name, hotel: false })),
    ...hotels.map((h) => ({ label: h.name, sub: `${h.area}, ${h.city}`, value: h.city, hotel: true })),
  ].filter((p) => !q.trim() || match(p.label) || match(p.sub))

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    setPop(null)
    saveLastSearch({ city, checkIn, checkOut, rooms, adults, bookingFor: who.name })
    const bookingFor: BookingFor = rooms > 1 ? 'My team' : who.kind
    navigate(`/biz/hotels?${bizQuery({ city, checkIn, checkOut, rooms, bookingFor, cat, traveller: who.kind === 'Myself' ? undefined : who.name, adults, children, women })}`)
  }

  const d = (iso: string) => parseISODate(iso)
  const cell = (on: boolean, extra = '') => `relative flex min-h-[92px] w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors ${on ? 'bg-[#FFF1EC]' : 'hover:bg-[#FFF8F5]'} ${extra}`
  const cap = 'flex items-center gap-1 text-[13px] font-bold text-ink-700'
  const pick = (name: string, email: string, kind: BookingFor) => {
    setWho({ name, email, kind })
    setPop(null)
  }
  const popCls = 'absolute top-[calc(100%+8px)] z-40 rounded-xl border border-line bg-white shadow-float'

  return (
    <form ref={ref} onSubmit={submit} className="relative">
      <div className="relative grid grid-cols-2 rounded-2xl border border-line-strong bg-white lg:grid-cols-[1.6fr_1fr_1fr_1.1fr_1.2fr]">
        {/* City */}
        <div className="relative col-span-2 border-b border-line-strong lg:col-span-1 lg:border-r lg:border-b-0">
          <button type="button" aria-expanded={pop === 'city'} onClick={() => setPop(pop === 'city' ? null : 'city')} className={cell(pop === 'city', 'rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none')}>
            <span className={cap}>City, Property Name Or Location</span>
            <span className="truncate text-[28px] leading-tight font-black">{city}</span>
            <span className="text-[13px] text-ink-500">India</span>
          </button>
          <AnimatePresence>
            {pop === 'city' && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-3 left-2 z-40 w-[min(420px,calc(100vw-48px))] overflow-hidden rounded-xl border border-line bg-white shadow-float">
                <div className="flex items-center gap-2 border-b border-line px-3">
                  <Search className="h-5 w-5 text-ink-400" aria-hidden="true" />
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Where do you want to stay?" aria-label="City, area or hotel" className="h-12 flex-1 outline-none" />
                </div>
                <ul className="max-h-80 overflow-auto py-1.5">
                  {!q.trim() && <li className="px-4 pt-1.5 pb-1 text-[11px] font-black tracking-wider text-ink-400 uppercase">Suggestions</li>}
                  {places.slice(0, 10).map((p) => (
                    <li key={p.label}>
                      <button
                        type="button"
                        onClick={() => {
                          setCity(p.value)
                          setQ('')
                          setEditing('in')
                          setPop('dates')
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-mist"
                      >
                        {p.hotel ? <Building2 className="h-4 w-4 text-ink-400" aria-hidden="true" /> : q ? <MapPin className="h-4 w-4 text-ink-400" aria-hidden="true" /> : <TrendingUp className="h-4 w-4 text-leaf-700" aria-hidden="true" />}
                        <span>
                          <span className="block font-bold">{p.label}</span>
                          <span className="block text-xs text-ink-500">{p.sub}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Dates */}
        {(['in', 'out'] as const).map((k) => {
          const iso = k === 'in' ? checkIn : checkOut
          return (
            <div key={k} className={`border-b border-line-strong lg:border-b-0 ${k === 'in' ? 'border-r' : 'lg:border-r'}`}>
              <button
                type="button"
                aria-expanded={pop === 'dates' && editing === k}
                onClick={() => {
                  setEditing(k)
                  setPop('dates')
                }}
                className={cell(pop === 'dates' && editing === k)}
              >
                <span className={cap}>
                  {k === 'in' ? 'Check-In' : 'Check-Out'} <ChevronDown className="h-4 w-4 text-ember-600" aria-hidden="true" />
                </span>
                <span>
                  <span className="text-[28px] leading-none font-black">{d(iso).getDate()}</span>{' '}
                  <span className="text-lg font-bold">
                    {d(iso).toLocaleDateString('en-GB', { month: 'short' })}’{String(d(iso).getFullYear()).slice(2)}
                  </span>
                </span>
                <span className="text-[13px] text-ink-500">{d(iso).toLocaleDateString('en-IN', { weekday: 'long' })}</span>
              </button>
            </div>
          )
        })}
        <AnimatePresence>
          {pop === 'dates' && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`${popCls} left-0 w-full max-w-[780px] lg:left-[20%]`}>
              <DateRangeCalendar
                checkIn={checkIn}
                checkOut={checkOut}
                editing={editing}
                onEditing={setEditing}
                onChange={(a, b) => {
                  setCheckIn(a)
                  setCheckOut(b)
                }}
                onDone={() => setPop('guests')}
              />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Rooms & guests */}
        <div className="relative border-r border-line-strong">
          <button type="button" aria-expanded={pop === 'guests'} onClick={() => setPop(pop === 'guests' ? null : 'guests')} className={cell(pop === 'guests', 'rounded-bl-2xl lg:rounded-none')}>
            <span className={cap}>
              Rooms &amp; Guests <ChevronDown className="h-4 w-4 text-ember-600" aria-hidden="true" />
            </span>
            <span className="whitespace-nowrap">
              <span className="text-[26px] leading-none font-black">{rooms}</span> <span className="font-bold">{rooms === 1 ? 'Room' : 'Rooms'}</span>{' '}
              <span className="text-[26px] leading-none font-black">{adults}</span> <span className="font-bold">{adults === 1 ? 'Adult' : 'Adults'}</span>
            </span>
            <span className="text-[13px] text-ink-500">{children ? `${children} children` : women ? 'Women-friendly stays' : 'No children'}</span>
          </button>
          <AnimatePresence>
            {pop === 'guests' && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`${popCls} left-0 w-[min(380px,calc(100vw-48px))] p-4`}>
                <Stepper label="Room" value={rooms} min={1} max={bizRules.maxRooms} onChange={(n) => (setRooms(n), setAdults((a) => Math.max(a, n)))} />
                <Stepper label="Adults" value={adults} min={rooms} max={rooms * 3} onChange={setAdults} />
                <Stepper label="Children" hint="0 - 17 Years Old" value={children} min={0} max={rooms * 2} onChange={setChildren} />
                <p className="mt-1 text-xs text-ink-500">Please give the right number of children and their ages for the best options and prices.</p>
                <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-line-strong p-3">
                  <input type="checkbox" checked={women} onChange={(e) => setWomen(e.target.checked)} className="mt-1 h-[18px] w-[18px] accent-ember-600" />
                  <span>
                    <strong className="block text-sm">Solo woman traveller or booking for women travellers?</strong>
                    <span className="text-xs text-ink-500">We’ll highlight women-friendly stays: 24/7 security and highly rated by guests.</span>
                  </span>
                </label>
                <div className="mt-3 flex justify-end">
                  <button type="button" className="btn-primary rounded-full px-7 font-black uppercase" onClick={() => setPop('for')}>
                    Apply
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Booking for */}
        <div className="relative">
          <button type="button" aria-expanded={pop === 'for'} onClick={() => setPop(pop === 'for' ? null : 'for')} className={cell(pop === 'for', 'rounded-br-2xl lg:rounded-r-2xl')}>
            <span className={cap}>
              Booking For <ChevronDown className="h-4 w-4 text-ember-600" aria-hidden="true" />
            </span>
            <span className="block w-full truncate text-xl font-black">{rooms > 1 ? 'My team' : who.name || 'Myself'}</span>
            <span className="block w-full truncate text-[13px] text-ink-500">{rooms > 1 ? `${rooms} rooms · assign at checkout` : who.email || (who.kind === 'Guest of the company' ? 'Guest of the company' : '')}</span>
          </button>
          <AnimatePresence>
            {pop === 'for' && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`${popCls} right-0 w-[min(340px,calc(100vw-48px))] overflow-hidden`}>
                <div className="flex items-center gap-2 border-b border-line p-2">
                  <Search className="ml-1 h-4 w-4 text-ink-400" aria-hidden="true" />
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Enter Primary Traveller’s Email ID" aria-label="Search colleagues" className="h-9 flex-1 text-sm outline-none" />
                  {isAdmin && (
                    <button type="button" aria-label="Add a colleague" onClick={() => setAdding((a) => !a)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong text-navy-800">
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p className="bg-[#E3EEFC] px-3 py-2 text-xs text-ink-700">
                  Enter <strong>Primary Traveller Email ID</strong> for whom you are making the booking.
                </p>
                {adding && (
                  <div className="flex flex-col gap-2 border-b border-line p-3">
                    <input className="field py-2 text-sm" placeholder="Full name" value={newP.name} onChange={(e) => setNewP({ ...newP, name: e.target.value })} />
                    <input className="field py-2 text-sm" placeholder="Work email" value={newP.email} onChange={(e) => setNewP({ ...newP, email: e.target.value })} />
                    <button
                      type="button"
                      className="btn-navy min-h-9 text-sm"
                      onClick={() => {
                        if (newP.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newP.email)) return
                        const emp = { id: newP.email.toLowerCase(), name: newP.name.trim(), email: newP.email.trim().toLowerCase(), team: 'General', role: 'employee' as const }
                        updateCompany((c) => ({ ...c, employees: [...c.employees, emp] }))
                        pick(emp.name, emp.email, 'A colleague')
                        setAdding(false)
                        setNewP({ name: '', email: '' })
                      }}
                    >
                      Add colleague to {company.name}
                    </button>
                  </div>
                )}
                <ul className="max-h-72 overflow-auto py-1">
                  {match(myName) || match(user.email) ? (
                    <li>
                      <button type="button" onClick={() => pick(myName, user.email, 'Myself')} className="flex w-full items-start gap-2 border-l-[3px] border-ember-600 px-3 py-2 text-left hover:bg-mist">
                        <span>
                          <strong className="text-sm">{myName}</strong> <span className="rounded bg-[#FFE6DC] px-1.5 py-0.5 text-[10px] font-black text-ember-600">MYSELF</span>
                          <span className="block text-xs text-ink-500">{user.email}</span>
                        </span>
                      </button>
                    </li>
                  ) : null}
                  <li>
                    <button type="button" onClick={() => pick('Guest', '', 'Guest of the company')} className="flex w-full flex-col items-start border-l-[3px] border-ember-600 px-3 py-2 text-left hover:bg-mist">
                      <strong className="text-sm">Others</strong>
                      <span className="text-xs text-ink-500">Interviewee, client etc.</span>
                    </button>
                  </li>
                  <li className="mt-1 flex items-center gap-1.5 border-t border-line px-3 pt-2 pb-1 text-[11px] font-black tracking-wider text-ink-400 uppercase">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Your colleagues
                  </li>
                  {colleagues
                    .filter((c) => !q.trim() || match(c.name) || match(c.email))
                    .map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => pick(c.name, c.email, 'A colleague')} className="flex w-full flex-col items-start border-l-[3px] border-line-strong px-3 py-2 text-left hover:bg-mist">
                          <strong className="text-sm">{c.name}</strong>
                          <span className="text-xs text-ink-500">{c.email}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pb-8">
        <span className="flex items-center gap-2 rounded-xl border border-[#F5CBAE] bg-[#FFF4EC] py-1.5 pr-3 pl-1.5 text-[13px]">
          <span className="rounded-md bg-leaf-700 px-1.5 py-0.5 text-[10px] font-black text-white">NEW</span>
          Book {bizRules.teamFrom}+ rooms in one go and get <strong>team slab pricing</strong> automatically
        </span>
        {last && (
          <button
            type="button"
            onClick={() => {
              setCity(last.city)
              if (last.checkIn >= todayISO()) {
                setCheckIn(last.checkIn)
                setCheckOut(last.checkOut)
              }
              setRooms(last.rooms)
              setAdults(last.adults)
            }}
            className="flex items-center gap-2 text-left text-xs"
          >
            <span className="text-ink-500">Last Search:</span>
            <span className="rounded-lg bg-mist px-2.5 py-1.5">
              <strong className="block text-[13px]">{last.city}, India</strong>
              {dayMonth(last.checkIn)} – {dayMonth(last.checkOut)}
              <span className="block text-ember-600">{last.bookingFor}</span>
            </span>
          </button>
        )}
      </div>
      <button type="submit" className="btn-primary absolute -bottom-6 left-1/2 h-[52px] min-w-[230px] -translate-x-1/2 rounded-full text-2xl font-black tracking-wide uppercase shadow-[0_8px_20px_rgba(194,65,12,0.35)]">
        Search
      </button>
    </form>
  )
}
