import { ArrowLeft, Wallet } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { agentQuote, type Markup } from '@stayeasy/lib/agentRates'
import { inr, plural, shortDate } from '@stayeasy/lib/format'
import { cancelTerms, freeCancelHours } from '@stayeasy/lib/quote'
import { Notice, RateSlip, Spinner } from '../components/ui'
import { useSession } from '../context/Session'
import { useCustomers, useHotels, useWallet } from '../lib/hooks'
import { readSearch, toQuery } from '../lib/search'
import { createBooking, markupForHotel, saveCustomer } from '../lib/store'
import { MarkupControl } from './HotelPage'

export default function Book() {
  const [params] = useSearchParams()
  const s = readSearch(params)
  const navigate = useNavigate()
  const { agency, user } = useSession()
  const { data: hotels } = useHotels()
  const { data: customers } = useCustomers()
  const wallet = useWallet()
  const hotel = hotels?.find((h) => h.slug === params.get('hotel'))
  const room = hotel?.rooms.find((r) => r.id === params.get('room'))
  const [markup, setMarkup] = useState<Markup | null>(params.get('mt') ? { type: params.get('mt') as Markup['type'], value: Number(params.get('mv')) || 0 } : null)
  const [customerId, setCustomerId] = useState(params.get('customer') ?? '')
  const pre = customers?.find((c) => c.id === customerId)
  const [f, setF] = useState({ title: 'Mr', name: '', phone: '', email: '', requests: '', save: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const m = markup ?? (agency && hotel ? markupForHotel(agency, hotel) : { type: 'pct' as const, value: 0 })
  const q = useMemo(
    () => (hotel && room ? agentQuote({ hotel, roomId: room.id, checkIn: s.checkIn, checkOut: s.checkOut, rooms: s.rooms, adults: s.adults, children: s.children, markup: m }) : null),
    [hotel, room, s.checkIn, s.checkOut, s.rooms, s.adults, s.children, m],
  )
  if (!hotels || !customers) return <Spinner />
  if (!hotel || !room || !q || !agency || !user)
    return (
      <div className="page py-20 text-center">
        <h1 className="text-2xl font-extrabold">This booking link has expired</h1>
        <Link to="/app/hotels" className="btn-ink mt-6">
          Search hotels
        </Link>
      </div>
    )

  const pick = (id: string) => {
    setCustomerId(id)
    const c = customers.find((x) => x.id === id)
    if (c) setF({ ...f, name: c.name.replace(/^(Mr|Ms|Mrs|Dr)\s+/, ''), phone: c.phone, email: c.email })
  }
  const short = q.netTotal - wallet.available
  const hours = freeCancelHours(hotel)
  const freeNow = hours !== null && cancelTerms({ status: 'confirmed', check_in: s.checkIn, pay_mode: 'hotel', amount: 0 }, hotel).free

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (f.name.trim().length < 2) return setError('Enter the lead guest’s name.')
    if (!/^[6-9]\d{9}$/.test(f.phone)) return setError('Enter the guest’s 10-digit mobile number.')
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setError('Check the guest’s email address.')
    if (q.errors.length) return setError(q.errors[0])
    setBusy(true)
    try {
      let cid = customerId || null
      if (!cid && f.save) cid = (await saveCustomer(agency, { name: `${f.title} ${f.name.trim()}`, phone: f.phone, email: f.email.trim(), city: '', notes: '' })).id
      const b = await createBooking(agency, user.email, {
        hotel_slug: hotel.slug,
        room_id: room.id,
        check_in: s.checkIn,
        check_out: s.checkOut,
        rooms: s.rooms,
        adults: s.adults,
        children: s.children,
        guest_name: `${f.title} ${f.name.trim()}`,
        guest_phone: '+91' + f.phone,
        // Hotels need an email; the agency's is used when the guest has none.
        guest_email: f.email.trim() || agency.email,
        special_requests: f.requests.trim(),
        customer_id: cid,
        markup: m,
        expected_net: q.netTotal,
      })
      navigate(`/app/bookings?open=${b.id}&new=1`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t book. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="page flex flex-col gap-6 pt-6">
      <Link to={`/app/hotel/${hotel.slug}?${toQuery(s)}`} className="inline-flex items-center gap-1 self-start text-sm font-bold text-ink-700 no-underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to {hotel.name}
      </Link>
      <h1 className="text-[28px] font-extrabold text-ink-950">Book for your customer</h1>
      <form onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-5">
          <section className="card flex flex-col gap-4 p-5">
            <h2 className="text-lg font-extrabold">Lead guest</h2>
            {customers.length > 0 && (
              <label className="label">
                Saved customer
                <select className="field" value={customerId} onChange={(e) => pick(e.target.value)}>
                  <option value="">New customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}, {c.phone}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
              <label className="label">
                Title
                <select className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}>
                  {['Mr', 'Ms', 'Mrs', 'Dr'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="label">
                Full name (as on ID)
                <input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="label">
                Mobile number
                <span className="flex overflow-hidden rounded-lg border border-line-strong bg-white focus-within:border-ink-700">
                  <span className="flex items-center bg-paper px-3 text-sm font-bold">+91</span>
                  <input className="min-h-[44px] min-w-0 flex-1 px-3 outline-none" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                </span>
              </label>
              <label className="label">
                Email (optional)
                <input className="field" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              </label>
            </div>
            <label className="label">
              Requests for the hotel
              <textarea className="field" rows={3} value={f.requests} onChange={(e) => setF({ ...f, requests: e.target.value })} placeholder="Early check-in, twin beds, ground floor…" />
            </label>
            {!pre && (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={f.save} onChange={(e) => setF({ ...f, save: e.target.checked })} className="h-4 w-4 accent-ink-900" /> Save to my customers
              </label>
            )}
          </section>
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-lg font-extrabold">Your markup on this booking</h2>
            <MarkupControl value={m} onChange={setMarkup} />
            <p className="text-sm text-muted">This changes only this booking. Your usual markup is in Settings.</p>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <div className="card flex flex-col gap-2 p-5">
            <strong className="text-lg text-ink-950">{hotel.name}</strong>
            <span className="text-sm text-muted">
              {hotel.area}, {hotel.city}
            </span>
            <span className="text-[15px]">
              {s.rooms} × {room.name}
            </span>
            <span className="text-[15px]">
              {shortDate(s.checkIn)} to {shortDate(s.checkOut)}, {plural(q.nights, 'night')}, {plural(q.guests, 'guest')}
            </span>
            <span className={`text-sm font-semibold ${!freeNow ? 'text-alert' : 'text-earn'}`}>{hours === null ? 'Non-refundable' : !freeNow ? 'Non-refundable for these dates (free cancellation has closed)' : `Free cancellation until ${hours} hours before check-in`}</span>
          </div>
          <RateSlip net={q.netTotal} markup={q.markupAmount} selling={q.sellingTotal} size="md" note={`incl. ${inr(q.netTax)} GST`} />
          <div className="card flex items-center justify-between gap-3 p-4 text-[15px]">
            <span className="flex items-center gap-2 font-semibold">
              <Wallet className="h-4 w-4" aria-hidden="true" /> Wallet
            </span>
            <span className="font-bold">{inr(wallet.balance)}</span>
          </div>
          {short > 0 && (
            <Notice tone="warn">
              You need {inr(short)} more in your wallet. <Link to="/app/wallet">Add money</Link>
            </Notice>
          )}
          {q.errors.length > 0 && <Notice tone="error">{q.errors[0]}</Notice>}
          {error && (
            <p role="alert" className="rounded-lg bg-alert-50 px-3 py-2 text-sm font-semibold text-alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-gold min-h-12 text-base" disabled={busy || short > 0 || agency.status !== 'approved'}>
            {busy ? 'Booking…' : `Book and pay ${inr(q.netTotal)} from wallet`}
          </button>
          <p className="text-[13px] text-muted">Collect {inr(q.sellingTotal)} from your customer. The voucher shows your agency’s name.</p>
        </aside>
      </form>
    </div>
  )
}
