import { motion } from 'framer-motion'
import { ArrowLeft, Check, LockKeyhole, Upload, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import HotelArt from '../../components/HotelArt'
import { Spinner } from '../../components/ui'
import { useAccount } from '../../context/AccountContext'
import { useAuth } from '../../context/AuthContext'
import { VerifyOrgModal } from '../../components/biz/VerifyOrg'
import { bizBookingId, bizRules, payMethods, priceBizBooking, tripPurposes, type BizBooking, type PayMethod } from '../../data/business'
import type { Hotel } from '../../data/types'
import { getHotel } from '../../lib/api'
import { bookingsLeftUnverified, creditUsed, listBizBookings, listRequests, saveBizBooking, saveRequest, walletLeft } from '../../lib/bizApi'
import { useProfile } from '../../lib/profile'
import { dayMonth, inr, nightsBetween, plural, shortDate } from '../../lib/format'
import { bizQuery, LimitChip, readBizSearch } from './shared'

export default function BizCheckout() {
  const [params] = useSearchParams()
  const s = readBizSearch(params)
  const slug = params.get('hotel') || ''
  const { company } = useAccount()
  const { user } = useAuth()
  const { name: profileName } = useProfile()
  const c = company!
  const [hotel, setHotel] = useState<Hotel | null | undefined>(undefined)
  const nights = nightsBetween(s.checkIn, s.checkOut)

  const qty = useMemo(() => {
    const q: Record<string, number> = {}
    for (const part of (params.get('q') || '').split(',')) {
      const [id, n] = part.split(':')
      if (id && Number(n) > 0) q[id] = Math.min(Number(n), bizRules.maxRooms)
    }
    return q
  }, [params])

  useEffect(() => {
    getHotel(slug).then(setHotel)
  }, [slug])

  const me = user ? profileName : 'You'
  const staff = useMemo(() => {
    const names = c.employees.map((e) => e.name)
    return names.includes(me) ? names : [me, ...names]
  }, [c, me])
  // A traveller picked in "Booking for" who isn't on the staff list joins as a guest.
  const [guests, setGuests] = useState<string[]>(() => (s.traveller && !staff.includes(s.traveller) ? [s.traveller] : []))
  const people = [...staff, ...guests]

  const price = useMemo(() => (hotel ? priceBizBooking(c, hotel, qty, nights) : null), [c, hotel, qty, nights])
  const rooms = useMemo(() => (price ? price.lines.flatMap((l) => Array.from({ length: l.qty }, (_, k) => ({ room: l.room, rate: l.rate, label: `${l.room.name} ${k + 1}` }))) : []), [price])

  const [who, setWho] = useState<string[]>([])
  useEffect(() => {
    if (!rooms.length) return
    setWho((prev) => {
      if (prev.length === rooms.length) return prev
      const first = s.traveller || (s.bookingFor === 'A colleague' || s.bookingFor === 'Guest of the company' ? '' : me)
      const order = [first, ...staff.filter((n) => n !== me && n !== first)].filter(Boolean)
      return rooms.map((_, i) => order[i] ?? '')
    })
  }, [rooms, staff, me, s.bookingFor, s.traveller])

  const [purpose, setPurpose] = useState(tripPurposes[0])
  const [costCentre, setCostCentre] = useState(c.costCentres[0])
  const [po, setPo] = useState('')
  const [pay, setPay] = useState<PayMethod>(c.verified ? 'credit' : 'card')
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [error, setError] = useState('')
  const [csvNote, setCsvNote] = useState('')
  const [done, setDone] = useState<BizBooking | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const trips = useMemo(() => listBizBookings(c), [c, done]) // eslint-disable-line react-hooks/exhaustive-deps
  const creditLeft = c.creditLimit - creditUsed(c, trips)
  const wallet = walletLeft(c, trips)
  const left = bookingsLeftUnverified(c, trips)
  const blocked = left === 0 && !done

  if (hotel === undefined) return <Spinner label="Loading booking" />
  if (!hotel || !price || price.count === 0)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-extrabold text-navy-800">Nothing to book yet</h1>
        <p className="mt-2 text-ink-500">Pick a hotel and the rooms you need first.</p>
        <Link to="/biz/hotels" className="btn-navy mt-6">
          Find business hotels
        </Link>
      </div>
    )

  const h = hotel
  const overRows = rooms.filter((r) => r.rate > price.limit).length
  const locked = (m: PayMethod) => !c.verified && m !== 'card'
  const canPay = (m: PayMethod) => !locked(m) && (m === 'credit' ? creditLeft >= price.total : m === 'wallet' ? wallet >= price.total : true)
  const payNote = (m: PayMethod) =>
    locked(m) ? 'Verify organisation to unlock' : !canPay(m) ? 'Not enough balance' : m === 'credit' ? `${inr(creditLeft)} left of ${inr(c.creditLimit)}` : m === 'wallet' ? `Balance ${inr(wallet)}` : 'Claim it back later'

  const addGuest = (e: React.FormEvent) => {
    e.preventDefault()
    const n = guestName.trim()
    if (!n) return
    if (!people.includes(n)) setGuests((g) => [...g, n])
    const empty = who.findIndex((w) => !w)
    if (empty >= 0) setWho((w) => w.map((x, i) => (i === empty ? n : x)))
    setGuestName('')
  }

  const onCsv = async (f: File | undefined) => {
    if (!f) return
    const text = await f.text()
    const names = text
      .split(/\r?\n/)
      .map((l) => l.split(',')[0]?.replace(/^"|"$/g, '').trim())
      .filter((n): n is string => !!n && !/^(name|traveller|traveler)$/i.test(n))
    if (!names.length) {
      setCsvNote('No names found. Put one traveller name per line.')
      return
    }
    const extra = names.filter((n) => !people.includes(n))
    setGuests((g) => [...g, ...extra.filter((n) => !g.includes(n))])
    setWho(rooms.map((_, i) => names[i] ?? who[i] ?? ''))
    setCsvNote(`${plural(Math.min(names.length, rooms.length), 'traveller')} added from ${f.name}${names.length > rooms.length ? ` (${names.length - rooms.length} extra names ignored)` : ''}.`)
    if (fileRef.current) fileRef.current.value = ''
  }

  const confirm = () => {
    setError('')
    if (blocked) {
      setVerifyOpen(true)
      return setError(`${c.name} has used its ${c.unverifiedBookingLimit} bookings allowed before verification. Verify the organisation to keep booking.`)
    }
    if (who.some((w) => !w)) return setError('Choose a traveller for every room.')
    const dup = who.find((w, i) => who.indexOf(w) !== i)
    if (dup) return setError(`${dup} is in two rooms. Choose a different traveller.`)
    if (!canPay(pay)) return setError('Not enough balance for this payment method. Choose another.')
    const b: BizBooking = {
      id: bizBookingId(),
      companyId: c.id,
      bookedBy: me,
      hotelSlug: h.slug,
      hotelName: h.name,
      hotelCity: h.city,
      checkIn: s.checkIn,
      checkOut: s.checkOut,
      nights,
      lines: rooms.map((r, i) => ({ roomId: r.room.id, roomName: r.room.name, traveller: who[i], rate: r.rate, overLimit: r.rate > price.limit })),
      purpose,
      costCentre,
      po: po.trim(),
      pay,
      subtotal: price.subtotal,
      teamDiscount: price.teamDiscount,
      gst: price.gst,
      total: price.total,
      publicTotal: price.publicTotal,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    }
    saveBizBooking(b)
    // Booked from an approved travel request: mark the request as booked.
    try {
      const rid = sessionStorage.getItem('stayeasy.biz.request')
      const r = rid ? listRequests(c).find((x) => x.id === rid && x.status === 'approved') : null
      if (r && r.city === h.city) saveRequest({ ...r, status: 'booked' })
      sessionStorage.removeItem('stayeasy.biz.request')
    } catch {
      /* ignore */
    }
    setDone(b)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const step = (n: number, label: string, on: boolean, ok: boolean) => (
    <span className={`flex items-center gap-2 text-sm font-bold ${on ? 'text-navy-800' : 'text-ink-500'}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${ok ? 'bg-leaf-700 text-white' : on ? 'bg-navy-800 text-white' : 'bg-mist'}`}>
        {ok ? <Check className="h-4 w-4" aria-hidden="true" /> : n}
      </span>
      {label}
    </span>
  )

  return (
    <div className="container-page pt-5 pb-16">
      <Link to={`/biz/hotel/${h.slug}?${bizQuery(s)}`} className="inline-flex items-center gap-1 text-sm font-bold no-underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to rooms
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        {step(1, 'Rooms', false, true)}
        <span className="h-px w-8 bg-line-strong" />
        {step(2, 'Travellers and billing', !done, !!done)}
        <span className="h-px w-8 bg-line-strong" />
        {step(3, 'Confirmation', !!done, false)}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <main className="flex min-w-0 flex-col gap-6">
          {done ? (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-col items-start gap-3 p-6 sm:p-8">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf-700"
              >
                <Check className="h-9 w-9 text-white" strokeWidth={3} aria-hidden="true" />
              </motion.span>
              <span className="rounded-full bg-leaf-50 px-2.5 py-[3px] text-xs font-bold text-leaf-700">Confirmed</span>
              <h1 className="text-[26px] font-extrabold text-navy-800">
                {plural(done.lines.length, 'room')} confirmed at {h.name}
              </h1>
              <p className="text-ink-700">
                Each traveller gets their own booking email, and the invoice goes to {c.name}{c.gstin ? ` (GSTIN ${c.gstin})` : ' (no GSTIN yet, so GST input credit can’t be claimed on this booking)'}. Booking ID{' '}
                <strong className="font-mono">{done.id}</strong>.
              </p>
              <ul className="w-full divide-y divide-[#EEF1F6] rounded-xl border border-line text-sm">
                {done.lines.map((l, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                    <span>
                      <strong>{l.traveller}</strong> · {l.roomName}
                    </span>
                    <span className="text-ink-500">
                      {shortDate(done.checkIn)} – {shortDate(done.checkOut)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link to="/biz/trips" className="btn-navy">
                  View company trips
                </Link>
                <Link to="/biz" className="btn-outline">
                  Back to business home
                </Link>
                <button type="button" className="btn-outline" onClick={() => window.print()}>
                  Print confirmation
                </button>
              </div>
            </motion.section>
          ) : (
            <>
              <section aria-labelledby="who-h" className="card flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 id="who-h" className="text-[22px] font-extrabold text-navy-800">
                      Who is staying in each room?
                    </h1>
                    <p className="text-sm text-ink-500">Add a name for each room so the hotel can check everyone in.</p>
                  </div>
                  <label className="btn-outline cursor-pointer">
                    <Upload className="h-4 w-4" aria-hidden="true" /> Upload a list (CSV)
                    <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" className="sr-only" onChange={(e) => onCsv(e.target.files?.[0])} />
                  </label>
                </div>
                {csvNote && <p className="rounded-lg bg-navy-50 px-3 py-2 text-[13px] text-navy-800">{csvNote}</p>}
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[600px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-mist text-left text-[12.5px] text-ink-500">
                        <th className="px-3 py-2.5">Room</th>
                        <th className="px-3 py-2.5">Traveller</th>
                        <th className="px-3 py-2.5">Rate / night</th>
                        <th className="px-3 py-2.5">Limit check</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((r, i) => (
                        <tr key={r.label} className="border-t border-[#EEF1F6]">
                          <td className="px-3 py-2.5 font-semibold">{r.label}</td>
                          <td className="px-3 py-2">
                            <label className="sr-only" htmlFor={`who-${i}`}>
                              Traveller for {r.label}
                            </label>
                            <select
                              id={`who-${i}`}
                              value={who[i] ?? ''}
                              onChange={(e) => setWho((w) => w.map((x, j) => (j === i ? e.target.value : x)))}
                              className="w-full min-w-[180px] rounded-lg border border-line-strong bg-white px-2.5 py-2"
                            >
                              <option value="" disabled hidden>Choose a traveller…</option>
                              <optgroup label={c.name}>
                                {staff.map((p) => (
                                  <option key={p}>{p}</option>
                                ))}
                              </optgroup>
                              {guests.length > 0 && (
                                <optgroup label="Guests">
                                  {guests.map((p) => (
                                    <option key={p}>{p}</option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </td>
                          <td className="px-3 py-2.5">{inr(r.rate)}</td>
                          <td className="px-3 py-2.5">
                            <LimitChip over={r.rate > price.limit} amount={r.rate > price.limit ? inr(r.rate - price.limit) : undefined} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <form onSubmit={addGuest} className="flex flex-wrap items-end gap-2">
                  <label className="label flex-1">
                    Guest who isn’t an employee
                    <input className="field py-2.5" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Full name as on ID" />
                  </label>
                  <button type="submit" className="btn-outline">
                    <UserPlus className="h-4 w-4" aria-hidden="true" /> Add guest
                  </button>
                </form>
              </section>

              <section aria-labelledby="trip-h" className="card flex flex-col gap-4 p-5 sm:p-6">
                <h2 id="trip-h" className="text-xl font-extrabold text-navy-800">
                  Trip details
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="label">
                    Purpose of trip
                    <select className="field" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                      {tripPurposes.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                  <label className="label">
                    Cost centre
                    <select className="field" value={costCentre} onChange={(e) => setCostCentre(e.target.value)}>
                      {c.costCentres.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                  <label className="label">
                    Project or PO number (optional)
                    <input className="field" value={po} onChange={(e) => setPo(e.target.value)} placeholder="e.g. AUD-2026-114" />
                  </label>
                </div>
              </section>

              <section aria-labelledby="pay-h" className="card flex flex-col gap-4 p-5 sm:p-6">
                <h2 id="pay-h" className="text-xl font-extrabold text-navy-800">
                  Billing
                </h2>
                <div role="radiogroup" aria-label="Payment method" className="grid gap-3 sm:grid-cols-3">
                  {payMethods.map((p) => {
                    const on = pay === p.id
                    const ok = canPay(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={!ok}
                        onClick={() => setPay(p.id)}
                        className={`flex min-h-11 flex-col items-start gap-0.5 rounded-xl p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'border-2 border-navy-800 bg-navy-50 p-[11px]' : 'border border-line-strong bg-white'}`}
                      >
                        <strong>{p.title}</strong>
                        <span className={`flex items-center gap-1 text-[13px] ${locked(p.id) ? 'font-semibold text-ember-600' : 'text-ink-500'}`}>
                          {locked(p.id) && <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />}
                          {payNote(p.id)}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="label">
                    Invoice to
                    <input className="field bg-mist" value={c.legalName} readOnly />
                  </label>
                  <label className="label">
                    Company GSTIN
                    <input className={`field bg-mist ${c.gstin ? 'font-mono' : 'text-ember-600'}`} value={c.gstin || 'Not added'} readOnly />
                  </label>
                </div>
                {!c.verified && (
                  <p className="flex flex-wrap items-center gap-2 rounded-xl bg-[#FFF4EC] p-3 text-[13.5px] text-[#7C2D12]">
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                    Company credit, wallet and GST input credit unlock once {c.name} is verified.
                    <button type="button" className="font-bold text-ember-600 underline" onClick={() => setVerifyOpen(true)}>
                      Verify now
                    </button>
                  </p>
                )}
              </section>
            </>
          )}
        </main>

        <aside aria-label="Price summary" className="card flex flex-col gap-4 p-5 lg:sticky lg:top-24">
          <div className="flex gap-3">
            <div className="h-[72px] w-[96px] shrink-0 overflow-hidden rounded-xl">
              <HotelArt hue={h.hue} photo={h.photos?.[0]} label={h.name} />
            </div>
            <div className="flex flex-col">
              <strong className="leading-snug">{h.name}</strong>
              <span className="text-[13px] text-ink-500">
                {dayMonth(s.checkIn)} – {dayMonth(s.checkOut)} · {plural(nights, 'night')}
              </span>
              <span className="text-[13px] text-ink-500">{price.lines.map((l) => `${l.qty} ${l.room.name}`).join(' · ')}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-line pt-3 text-sm">
            <div className="flex justify-between gap-3">
              <span>
                {price.lines.some((l) => l.company < l.room.price) ? 'Company rate' : 'Rate'} · {plural(price.count, 'room')} × {plural(nights, 'night')}
              </span>
              <span>{inr(price.subtotal)}</span>
            </div>
            {price.teamDiscount > 0 && (
              <div className="flex justify-between gap-3 text-leaf-700">
                <span>
                  Team slab · {bizRules.teamFrom}–{bizRules.quoteFrom - 1} rooms, {bizRules.teamOff * 100}%
                </span>
                <span>−{inr(price.teamDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span>GST</span>
              <span>{inr(price.gst)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-2 text-lg font-extrabold">
              <span>Total</span>
              <span>{inr(price.total)}</span>
            </div>
            <span className="text-[13px] font-semibold text-leaf-700">Saved {inr(price.saved)} against public prices</span>
          </div>
          <div className={`rounded-xl border p-3 text-[13.5px] ${overRows > 0 ? 'border-[#F5CBAE] bg-[#FFF4EC] text-[#7C2D12]' : 'border-[#BFE3C9] bg-leaf-50 text-leaf-800'}`}>
            {overRows > 0
              ? `${plural(overRows, 'room')} above the ${inr(price.limit)} company limit. You can still book; they are marked in reports.`
              : `All ${plural(price.count, 'room')} within the company limit. Confirms straight away.`}
          </div>
          {left !== null && !done && (
            <div className={`rounded-xl border p-3 text-[13.5px] ${left === 0 ? 'border-[#F5B4B4] bg-[#FDECEC] text-[#8A1C1C]' : 'border-[#F5CBAE] bg-[#FFF4EC] text-[#7C2D12]'}`}>
              {left === 0 ? (
                <>
                  <strong className="block">Booking limit reached</strong>
                  Unverified organisations can make {c.unverifiedBookingLimit} bookings. Verify {c.name} to keep booking.
                </>
              ) : (
                <>
                  <strong className="block">
                    {left} of {c.unverifiedBookingLimit} bookings left
                  </strong>
                  before {c.name} must verify its GSTIN, Udyam or NGO ID.
                </>
              )}
              <button type="button" className="mt-1 block font-bold text-ember-600 underline" onClick={() => setVerifyOpen(true)}>
                Verify organisation
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm font-semibold text-ember-600">
              {error}
            </p>
          )}
          {!done && (
            <button type="button" className={`btn-primary min-h-12 ${blocked ? 'opacity-60' : ''}`} onClick={confirm}>
              {blocked ? 'Verify to book' : 'Confirm booking'}
            </button>
          )}
          <span className="text-xs text-ink-500">
            {pay === 'card' ? 'You pay by card at the hotel and claim it back.' : `Nothing is charged now. The amount goes on ${c.name}’s ${pay === 'wallet' ? 'wallet statement' : 'monthly statement'}.`} {bizRules.freeCancelText}
          </span>
        </aside>
      </div>
      <VerifyOrgModal open={verifyOpen} onClose={() => setVerifyOpen(false)} reason={blocked ? `${c.name} has used the ${c.unverifiedBookingLimit} bookings allowed before verification. Verify your organisation to keep booking, and to unlock company credit and the wallet.` : undefined} />
    </div>
  )
}
