import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, BadgePercent, BellRing, Check, ChevronDown, Heart, Lock, ShieldCheck, Sun, Sunset } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import HotelArt from '../components/HotelArt'
import { Logo } from '../components/Layout'
import { hotelRules } from '../components/hotel/PropertyRules'
import { BrandPill, RatingBadge, Spinner } from '../components/ui'
import { features } from '../config/launch'
import { site } from '../config/site'
import { useAuth } from '../context/AuthContext'
import { brandLabel } from '../data/hotels'
import type { Hotel } from '../data/types'
import { BookingError, confirmPayment, createBooking, getHotel, getPoints, listBookings } from '../lib/api'
import { clubStatus, clubTiers, isAtLeast, type ClubTier } from '../lib/club'
import { addDays, inr, nightsBetween, parseISODate, plural, shortDate } from '../lib/format'
import { onlinePayments, openRazorpay } from '../lib/payments'
import { cancelTerms, checkCoupon, freeCancelHours, quote } from '../lib/quote'
import { readSearch, searchToQuery } from '../lib/search'

interface Form {
  title: string
  first: string
  last: string
  phone: string
  email: string
  arrival: string
  requests: string
  requestChips: string[]
  gst: boolean
  gstCompany: string
  gstin: string
  gstAddress: string
  gstState: string
  saveGst: boolean
}

const FORM_KEY = 'stayeasy.checkout.form'
const GST_KEY = 'stayeasy.billing.profile'
const blank: Form = {
  title: 'Mr',
  first: '',
  last: '',
  phone: '',
  email: '',
  arrival: '12:00 PM – 2:00 PM',
  requests: '',
  requestChips: [],
  gst: false,
  gstCompany: '',
  gstin: '',
  gstAddress: '',
  gstState: 'Delhi',
  saveGst: false,
}

const states = ['Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal']
const requestOptions = ['Early check-in', 'Late check-out', 'Ground floor room', 'High floor room', 'Twin beds', 'Extra pillows', 'Quiet room', 'Airport pickup']

function loadForm(): Form {
  try {
    const saved = JSON.parse(localStorage.getItem(GST_KEY) || '{}')
    return { ...blank, ...saved, ...JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}') }
  } catch {
    return blank
  }
}

function Steps() {
  return (
    <ol aria-label="Booking steps" className="hidden items-center gap-2 text-sm font-bold sm:flex">
      <li className="flex items-center gap-2 text-leaf-700">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-leaf-700 text-white">
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        </span>
        Room
      </li>
      <li aria-hidden="true" className="h-0.5 w-7 bg-leaf-700" />
      <li aria-current="step" className="flex items-center gap-2 text-navy-800">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-800 text-[13px] text-white">2</span>
        Review &amp; book
      </li>
      <li aria-hidden="true" className="h-0.5 w-7 bg-line-strong" />
      <li className="flex items-center gap-2 text-ink-500">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-line-strong text-[13px]">3</span>
        Confirmed
      </li>
    </ol>
  )
}

const longDate = (iso: string) => {
  const d = parseISODate(iso)
  return (
    <>
      {d.toLocaleDateString('en-IN', { weekday: 'short' })} <strong className="text-2xl font-black">{d.getDate()} {d.toLocaleDateString('en-GB', { month: 'short' })}</strong> {d.getFullYear()}
    </>
  )
}

const coupons = [
  { code: 'FIRSTSTAY', d: `Flat ${inr(site.firstStayDiscount)} off your first booking`, off: () => site.firstStayDiscount },
  { code: 'LONGSTAY', d: '10% off on stays of 5 nights or more', off: (amount: number) => Math.round(amount * 0.1) },
]

export default function Checkout() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const search = readSearch(params)
  const nights = nightsBetween(search.checkIn, search.checkOut)
  const guests = search.adults + search.children

  const [hotel, setHotel] = useState<Hotel | null | undefined>(undefined)
  const [form, setForm] = useState<Form>(loadForm)
  const [touched, setTouched] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<string | null>(null)
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [points, setPoints] = useState(0)
  const [tier, setTier] = useState<ClubTier>(clubTiers[0])
  const [usePoints, setUsePoints] = useState(false)
  const [early, setEarly] = useState('')
  const [late, setLate] = useState('')
  const [meal, setMeal] = useState<'' | 'breakfast' | 'allMeals'>('')
  const [protect, setProtect] = useState<'' | 'yes' | 'no'>('')
  const [showRequests, setShowRequests] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showBreakup, setShowBreakup] = useState(false)
  const [agree, setAgree] = useState(true)
  const [payMode, setPayMode] = useState<'hotel' | 'now'>('hotel')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getHotel(params.get('hotel') || '').then(setHotel)
  }, [params])

  useEffect(() => {
    if (user) {
      getPoints(user.id).then(setPoints)
      listBookings(user.id)
        .then((list) => setTier(clubStatus(list).tier))
        .catch(() => {})
      setForm((f) => ({ ...f, email: f.email || user.email }))
    }
  }, [user])

  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_KEY, JSON.stringify(form))
    } catch {
      /* ignore */
    }
  }, [form])

  const room = hotel?.rooms.find((r) => r.id === params.get('room')) ?? hotel?.rooms[0]
  // Pay at hotel is the default; partner hotels that don't take cash at check-in need online payment.
  const canPayAtHotel = hotel?.payAtHotel !== false
  const mode: 'hotel' | 'now' = !canPayAtHotel && onlinePayments ? 'now' : onlinePayments ? payMode : 'hotel'

  const price = useMemo(
    () =>
      hotel && room
        ? quote({
            hotel,
            roomId: room.id,
            checkIn: search.checkIn,
            checkOut: search.checkOut,
            rooms: search.rooms,
            adults: search.adults,
            children: search.children,
            coupon,
            pointsToUse: usePoints ? points : 0,
            memberRate: user ? tier.discount : 0,
            freeEarly10: !!user && isAtLeast(tier, 'Gold'),
            early,
            late,
            meal,
            protect: protect === 'yes',
            payNow: mode === 'now',
          })
        : null,
    [hotel, room, search.checkIn, search.checkOut, search.rooms, search.adults, search.children, coupon, usePoints, points, user, tier, early, late, meal, protect, mode],
  )

  if (hotel === undefined) return <Spinner label="Loading your booking" />
  if (!hotel || !room || !price)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-extrabold text-navy-800">This booking link has expired</h1>
        <Link to="/hotels" className="btn-navy mt-6">
          Search hotels
        </Link>
      </div>
    )

  const rules = hotelRules(hotel)
  const breakfastIncluded = room.features.some((f) => /breakfast/i.test(f))
  const earlyOpt = site.earlyCheckIn.find((o) => o.time === early)
  const earlyFee = price.earlyFee
  const lateOpt = site.lateCheckOut.find((o) => o.time === late)
  const { extras, extrasTotal, grand } = price
  const cancelHours = freeCancelHours(hotel)
  const cancelBy = cancelHours === 0 ? search.checkIn : addDays(search.checkIn, -Math.max(1, Math.ceil((cancelHours ?? 24) / 24)))
  // Same rule as the cancel button in My bookings: is the free window still open for these dates?
  const freeNow = cancelTerms({ status: 'confirmed', check_in: search.checkIn, pay_mode: 'hotel', amount: 0 }, hotel).free
  const cantBook = !canPayAtHotel && !onlinePayments

  const name = `${form.first.trim()} ${form.last.trim()}`.trim()
  const errors = {
    first: form.first.trim().length < 1 ? 'Enter the first name.' : '',
    last: form.last.trim().length < 1 ? 'Enter the last name.' : '',
    phone: /^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '')) ? '' : 'Enter a valid 10-digit mobile number.',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Enter a valid email address.',
    gstin: form.gst && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(form.gstin.trim()) ? 'Enter a valid 15-character GSTIN.' : '',
    gstCompany: form.gst && form.gstCompany.trim().length < 2 ? 'Enter the registered company name.' : '',
  }
  const valid = !Object.values(errors).some(Boolean)
  const loginLink = `/login?next=${encodeURIComponent(location.pathname + location.search)}`

  const tryCoupon = (code: string) => {
    const r = checkCoupon(code, nights)
    setCouponMsg({ ok: r.ok, text: r.message })
    if (r.ok) setCoupon(code.trim().toUpperCase())
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    setError('')
    if (!valid) {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    if (!agree) {
      setError('Please accept the terms and booking policies to continue.')
      return
    }
    if (!user) {
      navigate(loginLink)
      return
    }
    setSubmitting(true)
    try {
      if (form.gst && form.saveGst) {
        try {
          localStorage.setItem(GST_KEY, JSON.stringify({ gstCompany: form.gstCompany, gstin: form.gstin, gstAddress: form.gstAddress, gstState: form.gstState }))
        } catch {
          /* ignore */
        }
      }
      const requests = [
        form.requestChips.length ? `Requests: ${form.requestChips.join(', ')}` : '',
        isAtLeast(tier, 'Platinum') ? 'Club Platinum: free room upgrade if available' : '',
        form.requests.trim(),
        ...extras.map((x) => `Add-on: ${x.label} (${inr(x.amount)})`),
        form.gst ? `GST invoice: ${form.gstCompany.trim()} (${form.gstin.trim().toUpperCase()}), ${form.gstAddress.trim()}, ${form.gstState}` : '',
        `Arrival: ${form.arrival}`,
      ]
        .filter(Boolean)
        .join('\n')
      const res = await createBooking(
        {
          hotel_slug: hotel.slug,
          room_id: room.id,
          check_in: search.checkIn,
          check_out: search.checkOut,
          rooms: search.rooms,
          adults: search.adults,
          children: search.children,
          coupon,
          use_points: usePoints && price.points > 0,
          early,
          late,
          meal,
          protect: protect === 'yes',
          pay_mode: mode,
          guest_name: `${form.title} ${name}`,
          guest_phone: '+91' + form.phone.replace(/\D/g, ''),
          guest_email: form.email.trim(),
          special_requests: requests,
          expected_total: grand,
        },
        user.id,
      )
      let b = res.booking
      if (res.payment) {
        // Online payment: open Razorpay, then let the server confirm the payment.
        const paid = await openRazorpay(res.payment, { name: `${form.title} ${name}`, email: form.email.trim(), phone: form.phone.replace(/\D/g, ''), description: `${hotel.name}, ${plural(nights, 'night')}` })
        if (!paid) {
          setError('Payment was not completed, so the booking was not made. You can try again or choose Pay at hotel.')
          return
        }
        b = await confirmPayment({ booking_id: b.id, ...paid })
      }
      sessionStorage.removeItem(FORM_KEY)
      navigate(`/bookings/${b.id}`, { state: { booking: b, justBooked: true }, replace: true })
    } catch (err) {
      setError(err instanceof BookingError || err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const field = (key: keyof typeof errors) => ({
    'aria-invalid': touched && !!errors[key],
    'aria-describedby': touched && errors[key] ? `${key}-err` : undefined,
  })
  const errText = (key: keyof typeof errors) =>
    touched && errors[key] ? (
      <span id={`${key}-err`} className="text-xs font-semibold text-ember-600">
        {errors[key]}
      </span>
    ) : null
  const capLabel = 'flex flex-col gap-1.5 text-xs font-bold tracking-wide text-ink-700 uppercase'

  return (
    <div className="pb-28 lg:pb-12">
      <header className="border-b border-line bg-white">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo />
          <Steps />
          <span className="flex items-center gap-1.5 text-[13px] text-ink-500">
            <Lock className="h-4 w-4 text-leaf-700" aria-hidden="true" /> Secure checkout
          </span>
        </div>
      </header>

      <form onSubmit={submit} noValidate className="container-page pt-6">
        <Link to={`/hotel/${hotel.slug}?${searchToQuery(search, { room: room.id })}`} className="inline-flex items-center gap-1 text-sm font-bold no-underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to hotel
        </Link>
        <h1 className="mt-2 mb-5 text-[28px] font-black tracking-tight text-ink-900 sm:text-[30px]">Review your Booking</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {!authLoading && !user && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy-50 px-4 py-3.5">
                <span className="text-sm">
                  <strong>Sign in to book</strong> — earn Club points and get 5% member savings on this stay.
                </span>
                <Link to={loginLink} className="btn-navy min-h-10 text-sm">
                  Sign in with email code
                </Link>
              </div>
            )}

            {user && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-navy-800 px-4 py-3 text-sm text-white">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white" style={{ background: tier.color }} />
                  <strong>{site.name} Club {tier.name}</strong> · {Math.round(tier.discount * 100)}% off your room is applied
                  <span>{isAtLeast(tier, 'Gold') ? ' · free early check-in from 10 AM' : ''}</span>
                </span>
                <Link to="/club" className="font-bold text-white underline">
                  Club benefits
                </Link>
              </div>
            )}

            {/* Hotel + stay */}
            <section className="card overflow-hidden">
              <div className="flex gap-4 p-5 sm:p-6">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <h2 className="text-[24px] leading-tight font-black">{hotel.name}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <RatingBadge rating={hotel.rating} />
                    <BrandPill>{brandLabel(hotel.brand)}</BrandPill>
                    {hotel.coupleFriendly && <span className="rounded border border-line-strong px-2 py-0.5 text-xs font-semibold text-ink-700">Couple Friendly</span>}
                  </div>
                  <span className="text-sm text-ink-500">{hotel.address}</span>
                </div>
                <div className="hidden h-[90px] w-[90px] shrink-0 overflow-hidden rounded-lg sm:block">
                  <HotelArt hue={hotel.hue} photo={hotel.photos?.[0]} label={hotel.name} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-dashed border-line-strong bg-canvas px-5 py-4 sm:px-6">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-xs font-bold text-ink-500 uppercase">Check in</span>
                    <div className="text-sm">{longDate(search.checkIn)}</div>
                    <span className="text-sm text-ink-700">{site.checkInTime}</span>
                  </div>
                  <span className="rounded-full border border-line-strong bg-white px-2.5 py-0.5 text-xs font-bold text-ink-700 uppercase">{plural(nights, 'night')}</span>
                  <div>
                    <span className="text-xs font-bold text-ink-500 uppercase">Check out</span>
                    <div className="text-sm">{longDate(search.checkOut)}</div>
                    <span className="text-sm text-ink-700">{site.checkOutTime}</span>
                  </div>
                </div>
                <span className="text-[15px]">
                  <strong>{nights}</strong> {nights === 1 ? 'Night' : 'Nights'} | <strong>{search.adults}</strong> Adults{search.children ? ` | ${search.children} Children` : ''} | <strong>{search.rooms}</strong>{' '}
                  {search.rooms === 1 ? 'Room' : 'Rooms'}
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <div className="relative grid rounded-xl border border-line-strong sm:grid-cols-2">
                  <span className="absolute -top-3 left-3 flex items-center gap-1 rounded-full border border-[#F5C779] bg-[#FFF7E6] px-2.5 py-0.5 text-xs font-bold text-[#B45309]">
                    <Sun className="h-3.5 w-3.5" aria-hidden="true" /> Arriving early? Add early check-in
                  </span>
                  <label className="flex items-center justify-between gap-3 border-b border-line-strong p-4 pt-5 sm:border-r sm:border-b-0">
                    <span>
                      <strong className="block">Add Early Check-in</strong>
                      <span className="text-sm text-ink-700">{earlyOpt ? `From ${earlyOpt.time} · ${inr(extras.find((x) => x.label.startsWith('Early'))!.amount)}` : `Starting ${site.earlyCheckIn[0].time}`}</span>
                    </span>
                    <select value={early} onChange={(e) => setEarly(e.target.value === 'none' ? '' : e.target.value)} aria-label="Early check-in time" className="rounded-lg border border-line-strong bg-white px-2 py-2 text-sm font-bold text-navy-800">
                      <option value="" disabled hidden>Select time +</option>
                      {early && <option value="none">No early check-in</option>}
                      {site.earlyCheckIn.map((o) => (
                        <option key={o.time} value={o.time}>
                          {o.time} · {earlyFee(o) === 0 ? 'Free (Club)' : inr(earlyFee(o))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3 p-4 sm:pt-5">
                    <span>
                      <strong className="flex items-center gap-1">
                        <Sunset className="h-4 w-4 text-[#B45309]" aria-hidden="true" /> Add Late Check-out
                      </strong>
                      <span className="text-sm text-ink-700">{lateOpt ? `Until ${lateOpt.time} · ${inr(extras.find((x) => x.label.startsWith('Late'))!.amount)}` : `Until ${site.lateCheckOut[site.lateCheckOut.length - 1].time}`}</span>
                    </span>
                    <select value={late} onChange={(e) => setLate(e.target.value === 'none' ? '' : e.target.value)} aria-label="Late check-out time" className="rounded-lg border border-line-strong bg-white px-2 py-2 text-sm font-bold text-navy-800">
                      <option value="" disabled hidden>Select time +</option>
                      {late && <option value="none">No late check-out</option>}
                      {site.lateCheckOut.map((o) => (
                        <option key={o.time} value={o.time}>
                          {o.time} · {inr(Math.round(o.share * room.price * search.rooms))}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="mt-2 text-xs text-ink-500">Early check-in and late check-out are confirmed by the hotel. If they can’t be given, the fee is removed from your bill.</p>

                <div className="mt-5 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-black">{room.name}</h3>
                    <span className="text-sm text-ink-500">
                      {plural(search.adults, 'Adult')}
                      {search.children ? `, ${plural(search.children, 'Child', 'Children')}` : ''} · {room.size}
                    </span>
                  </div>
                  <a href={`/hotel/${hotel.slug}?${searchToQuery(search, { room: room.id })}#rooms`} className="text-sm font-black no-underline">
                    Change room
                  </a>
                </div>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-700">
                  <li>{freeNow ? 'Room with free cancellation' : 'Non-refundable for these dates'}</li>
                  <li>{breakfastIncluded ? 'Breakfast included' : 'No meals included'}</li>
                  {room.features
                    .filter((f) => !/breakfast/i.test(f))
                    .map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  {hotel.payAtHotel && <li>Pay at hotel by cash, card or UPI</li>}
                </ul>
                {freeNow ? (
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-leaf-700">
                    <Check className="h-4 w-4" aria-hidden="true" /> {cancelHours === 0 ? 'Free Cancellation till check-in' : `Free Cancellation till ${cancelHours} hrs before check in`}
                  </p>
                ) : (
                  <p className="mt-3 text-sm font-bold text-[#9A6B12]">
                    {cancelHours === null
                      ? 'Non-refundable rate: this booking can’t be cancelled for a refund.'
                      : cancelHours === 0
                        ? 'Check-in time has already passed, so this booking can’t be cancelled online.'
                        : `Check-in is less than ${cancelHours} hours away, so the free-cancellation window has already closed. This booking can’t be cancelled online.`}
                  </p>
                )}
                {freeNow && (
                <div className="mt-3 max-w-md">
                  <div className="flex h-7 overflow-hidden rounded-full text-[11px] font-bold">
                    <span className="flex flex-1 items-center justify-center bg-[#1F8A7A] text-white">100% Refund</span>
                    <span className="flex flex-1 items-center justify-center bg-[#FFF1D6] text-[#9A6B12]">Non Refundable</span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 text-[11px] text-ink-700">
                    <span className="font-bold">NOW</span>
                    <span className="text-center font-bold">
                      {shortDate(cancelBy)}
                      <br />
                      {site.checkInTime}
                    </span>
                    <span className="text-right font-bold">
                      {shortDate(search.checkIn)}
                      <br />
                      <span className="font-normal text-ink-500">Check-in</span>
                    </span>
                  </div>
                </div>
                )}
              </div>
            </section>

            {/* Add-ons */}
            <section className="card p-5 sm:p-6">
              <h2 className="text-xl font-black">Addons</h2>
              <p className="text-sm text-ink-500">Get additional benefits by paying a little extra</p>
              <div className="mt-4 flex flex-col gap-3" role="radiogroup" aria-label="Meal add-on">
                {breakfastIncluded && (
                  <p className="rounded-xl bg-leaf-50 px-4 py-3 text-sm font-semibold text-leaf-800">Breakfast is already included with this room.</p>
                )}
                {(['breakfast', 'allMeals'] as const)
                  .filter((k) => !(breakfastIncluded && k === 'breakfast'))
                  .map((k) => {
                    const amount = site.addons[k] * guests * nights
                    const on = meal === k
                    return (
                      <label key={k} className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 pt-6 ${on ? 'border-navy-800 bg-[#F6F8FD]' : 'border-line-strong'}`}>
                        {features.sampleReviews && hotel.rating > 0 && (
                          <span className="absolute -top-px left-3 rounded-b-md bg-leaf-50 px-2 py-0.5 text-[11px] font-bold text-leaf-800">
                            Guests rate the food {Math.min(4.8, hotel.rating + 0.1).toFixed(1)}/5
                          </span>
                        )}
                        <input
                          type="radio"
                          name="meal"
                          checked={on}
                          onClick={() => on && setMeal('')}
                          onChange={() => setMeal(k)}
                          className="mt-1 h-5 w-5 accent-navy-800"
                        />
                        <span className="flex-1">
                          <strong className="block">{k === 'breakfast' ? 'Breakfast' : 'Breakfast + Lunch/Dinner'}</strong>
                          <span className="text-sm text-ink-500">(Price at hotel is {inr(Math.round(amount * site.addons.atHotelMarkup))} for all guests)</span>
                        </span>
                        <span className="text-right">
                          <strong className="block">{inr(amount)}</strong>
                          <span className="text-xs text-ink-500">all guests</span>
                        </span>
                      </label>
                    )
                  })}
              </div>
            </section>

            {/* Important information */}
            <section className="card p-5 sm:p-6">
              <h2 className="text-xl font-black">Important information</h2>
              <div className="mt-4 rounded-xl border border-line p-4">
                <div className="relative rounded-xl border border-line px-3 pt-4 pb-2.5">
                  <span className="absolute -top-2.5 left-3 flex items-center gap-1 rounded-full bg-leaf-50 px-2 py-0.5 text-xs font-bold">
                    <Heart className="h-3 w-3 fill-ember-600 text-ember-600" aria-hidden="true" /> Couple/Bachelor Rules
                  </span>
                  <span className="text-sm text-ink-700">{rules.couple}</span>
                </div>
                <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-700">
                  {(showInfo ? [...rules.must, ...rules.fees] : rules.must.slice(0, 4)).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <button type="button" onClick={() => setShowInfo((v) => !v)} className="mt-2 text-sm font-black text-navy-800">
                  {showInfo ? 'View less' : 'View More'}
                </button>
              </div>
            </section>

            {/* Guest details */}
            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 text-xl font-black">Guest Details</h2>
              <div className="grid gap-4 sm:grid-cols-[90px_1fr_1fr]">
                <label className={capLabel}>
                  Title
                  <select className="field py-3 normal-case" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}>
                    {['Mr', 'Ms', 'Mrs', 'Dr'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className={capLabel}>
                  Full name
                  <input className="field normal-case" autoComplete="given-name" placeholder="First Name" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} {...field('first')} />
                  {errText('first')}
                </label>
                <label className={`${capLabel} sm:pt-[21px]`}>
                  <span className="sr-only">Last name</span>
                  <input className="field normal-case" autoComplete="family-name" placeholder="Last Name" value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} {...field('last')} />
                  {errText('last')}
                </label>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className={capLabel}>
                  <span>
                    Email address <span className="font-normal text-ink-500 normal-case">(Booking voucher will be sent to this email ID)</span>
                  </span>
                  <input className="field normal-case" type="email" autoComplete="email" placeholder="Email ID" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} {...field('email')} />
                  {errText('email')}
                </label>
                <label className={capLabel}>
                  Mobile number
                  <span className="flex overflow-hidden rounded-xl border border-line-strong focus-within:border-navy-800">
                    <span className="bg-mist px-3 py-3 text-[15px] font-normal text-ink-900">+91</span>
                    <input
                      className="min-w-0 flex-1 px-3 py-3 text-[15px] font-normal normal-case outline-none"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={11}
                      placeholder="Contact Number"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d ]/g, '') })}
                      {...field('phone')}
                    />
                  </span>
                  {errText('phone')}
                </label>
                <label className={capLabel}>
                  Estimated arrival
                  <select className="field normal-case" value={form.arrival} onChange={(e) => setForm({ ...form, arrival: e.target.value })}>
                    {['Before 12:00 PM (early check-in request)', '12:00 PM – 2:00 PM', '2:00 PM – 6:00 PM', '6:00 PM – 10:00 PM', 'After 10:00 PM'].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="mt-4 flex min-h-9 cursor-pointer items-center gap-2.5 text-[15px]">
                <input type="checkbox" checked={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.checked })} className="h-[18px] w-[18px] accent-navy-800" />
                Enter GST Details <span className="text-sm text-ink-500">(Optional)</span>
              </label>
              <AnimatePresence>
                {form.gst && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="grid gap-4 pt-3 sm:grid-cols-2">
                      <label className="label">
                        Registered company name
                        <input className="field" value={form.gstCompany} onChange={(e) => setForm({ ...form, gstCompany: e.target.value })} {...field('gstCompany')} />
                        {errText('gstCompany')}
                      </label>
                      <label className="label">
                        GSTIN
                        <input className="field uppercase" maxLength={15} value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} {...field('gstin')} />
                        {errText('gstin')}
                      </label>
                      <label className="label">
                        Company address
                        <input className="field" value={form.gstAddress} onChange={(e) => setForm({ ...form, gstAddress: e.target.value })} />
                      </label>
                      <label className="label">
                        Select the State
                        <select className="field" value={form.gstState} onChange={(e) => setForm({ ...form, gstState: e.target.value })}>
                          {states.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm">
                      <input type="checkbox" checked={form.saveGst} onChange={(e) => setForm({ ...form, saveGst: e.target.checked })} className="h-[18px] w-[18px] accent-navy-800" />
                      Confirm and save billing details to your profile
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Special requests */}
            <section className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-black">
                    <BellRing className="h-5 w-5 text-[#B45309]" aria-hidden="true" /> Special Requests
                  </h2>
                  <p className="text-sm text-ink-500">Add any special requests for your stay. They’re sent to the hotel after booking, and the hotel will do its best to arrange them.</p>
                </div>
                <button type="button" onClick={() => setShowRequests((v) => !v)} className="text-sm font-black tracking-wide text-navy-800 uppercase">
                  {showRequests ? 'Hide' : 'Make a request'}
                </button>
              </div>
              <AnimatePresence>
                {showRequests && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="flex flex-wrap gap-2 pt-4">
                      {requestOptions.map((r) => {
                        const on = form.requestChips.includes(r)
                        return (
                          <button
                            key={r}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setForm({ ...form, requestChips: on ? form.requestChips.filter((x) => x !== r) : [...form.requestChips, r] })}
                            className={`rounded-full border px-3 py-1.5 text-sm ${on ? 'border-navy-800 bg-[#EAF1FF] font-bold text-navy-800' : 'border-line-strong'}`}
                          >
                            {on ? '✓ ' : ''}
                            {r}
                          </button>
                        )
                      })}
                    </div>
                    <label className="label mt-3">
                      Anything else?
                      <textarea className="field resize-y" rows={2} placeholder="Extra pillow, celebrating a birthday…" value={form.requests} onChange={(e) => setForm({ ...form, requests: e.target.value })} />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Stay protect: only offered once the client has an insurance partner (VITE_STAY_PROTECT=on). */}
            {features.stayProtect && (
            <section className="card p-5 sm:p-6">
              <div className="flex items-center gap-3 rounded-xl bg-[#E9FBF4] px-4 py-3 text-sm text-ink-700">
                <ShieldCheck className="h-6 w-6 shrink-0 text-leaf-700" aria-hidden="true" /> Travel worry-free! Protect your stay against sudden changes.
              </div>
              <h2 className="mt-4 text-xl font-black">Stay Protect</h2>
              <p className="text-sm font-bold text-leaf-700">Enjoy a worry-free stay</p>
              <ul className="mt-3 flex flex-col gap-2 rounded-xl bg-[#F1F5FF] p-4 text-sm">
                {site.stayProtect.benefits.map(([b, v]) => (
                  <li key={b} className="flex justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-leaf-700" aria-hidden="true" /> {b}
                    </span>
                    <span className="text-ink-700">{v}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                <strong className="text-xl">{inr(site.stayProtect.price)}</strong> <span className="text-sm text-ink-500">per person per night</span>
                <br />
                <span className="text-xs text-ink-500">18% GST included | Non-refundable | Provided by {site.stayProtect.insurer}</span>
              </p>
              <div role="radiogroup" aria-label="Stay Protect" className="mt-3 overflow-hidden rounded-xl border border-line-strong">
                {(
                  [
                    ['yes', 'Yes,', 'protect my stay.'],
                    ['no', 'No,', 'I will book without Stay Protect.'],
                  ] as const
                ).map(([v, b, t], i) => (
                  <label key={v} className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 ${i ? 'border-t border-line-strong' : ''} ${protect === v ? 'bg-[#F6F8FD]' : ''}`}>
                    <input type="radio" name="protect" checked={protect === v} onChange={() => setProtect(v)} className="h-5 w-5 accent-navy-800" />
                    <span className="text-[17px]">
                      <strong>{b}</strong> {t}
                    </span>
                  </label>
                ))}
              </div>
            </section>
            )}

            {/* Payment */}
            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 text-xl font-black">How would you like to pay?</h2>
              <div role="radiogroup" aria-label="Payment option" className="flex flex-col gap-3">
                {(
                  [
                    {
                      id: 'hotel' as const,
                      title: 'Pay at hotel',
                      badge: 'No prepayment',
                      text: 'Reserve with no payment now. Pay by cash, card or UPI at check-in.',
                      disabled: !canPayAtHotel,
                      note: canPayAtHotel ? '' : 'This hotel needs payment online.',
                    },
                    {
                      id: 'now' as const,
                      title: 'Pay now',
                      badge: onlinePayments ? `Extra ${Math.round(site.payNowDiscount * 100)}% off` : 'Coming soon',
                      text: 'UPI, cards, net banking or wallets, secured by Razorpay.',
                      disabled: !onlinePayments,
                      note: '',
                    },
                  ]
                ).map((o) => {
                  const on = mode === o.id && !o.disabled
                  return (
                    <label key={o.id} className={`flex items-start gap-3.5 rounded-2xl border-2 p-4 ${on ? 'border-navy-800 bg-[#F6F8FD]' : 'border-line'} ${o.disabled ? 'opacity-70' : 'cursor-pointer'}`}>
                      <input type="radio" name="paymode" className="sr-only" checked={on} disabled={o.disabled} onChange={() => setPayMode(o.id)} />
                      <span aria-hidden="true" className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-navy-800' : 'border-line-strong'}`}>
                        {on && <span className="h-2.5 w-2.5 rounded-full bg-navy-800" />}
                      </span>
                      <span className="flex flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong>{o.title}</strong>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${o.disabled ? 'bg-mist text-ink-500' : 'bg-navy-100 text-navy-800'}`}>{o.badge}</span>
                        </span>
                        <span className="text-sm text-ink-700">{o.note || o.text}</span>
                      </span>
                    </label>
                  )
                })}
                {cantBook && <p className="rounded-lg bg-ember-50 px-3 py-2 text-sm font-semibold text-ember-700">This hotel only takes online payment, which isn’t available yet. Please choose another hotel or call us.</p>}
              </div>
            </section>

            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] accent-navy-800" />
              <span>
                By proceeding, I agree to {site.name}’s{' '}
                <Link to="/terms" target="_blank">
                  User Agreement
                </Link>
                ,{' '}
                <Link to="/privacy" target="_blank">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link to="/cancellation-policy" target="_blank">
                  Cancellation &amp; Property Booking Policies
                </Link>
                .
              </span>
            </label>
            {error && (
              <p role="alert" className="rounded-lg bg-ember-50 px-3 py-2 text-sm font-semibold text-ember-700">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary hidden min-h-[56px] max-w-[340px] text-lg font-black tracking-wide uppercase lg:inline-flex" disabled={submitting || cantBook}>
              {submitting ? (mode === 'now' ? 'Opening payment…' : 'Booking…') : user ? (mode === 'now' ? `Pay ${inr(grand)} & book` : 'Book now · Pay at hotel') : 'Sign in & book'}
            </button>
          </div>

          {/* Right column */}
          <aside aria-label="Booking summary" className="flex flex-col gap-4 lg:sticky lg:top-6 lg:w-[340px] lg:shrink-0">
            <div className="card flex flex-col gap-3 p-5 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black">Price Summary</h2>
                <button type="button" aria-expanded={showBreakup} onClick={() => setShowBreakup((v) => !v)} className="flex items-center gap-1 text-sm font-bold text-navy-800">
                  View Price Breakup <ChevronDown className={`h-4 w-4 transition-transform ${showBreakup ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              </div>
              <AnimatePresence>
                {showBreakup && (
                  <motion.dl initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col gap-2 overflow-hidden border-t border-line pt-3 text-sm">
                    <div className="flex justify-between">
                      <dt>
                        Room price ({plural(search.rooms, 'room')} × {plural(nights, 'night')})
                      </dt>
                      <dd>{inr(price.mrpTotal)}</dd>
                    </div>
                    {price.instant > 0 && (
                      <div className="flex justify-between text-leaf-700">
                        <dt>Instant discount</dt>
                        <dd>– {inr(price.instant)}</dd>
                      </div>
                    )}
                    {price.member > 0 && (
                      <div className="flex justify-between text-leaf-700">
                        <dt>
                        Club {tier.name} saving ({Math.round(tier.discount * 100)}%)
                      </dt>
                        <dd>– {inr(price.member)}</dd>
                      </div>
                    )}
                    {price.couponOff > 0 && (
                      <div className="flex justify-between text-leaf-700">
                        <dt>Coupon {coupon}</dt>
                        <dd>– {inr(price.couponOff)}</dd>
                      </div>
                    )}
                    {price.payNowOff > 0 && (
                      <div className="flex justify-between text-leaf-700">
                        <dt>Pay-now discount</dt>
                        <dd>– {inr(price.payNowOff)}</dd>
                      </div>
                    )}
                    {price.points > 0 && (
                      <div className="flex justify-between text-leaf-700">
                        <dt>Club points</dt>
                        <dd>– {inr(price.points)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt>Taxes ({price.taxRate !== null ? `${Math.round(price.taxRate * 100)}% ` : ''}GST)</dt>
                      <dd>{inr(price.tax)}</dd>
                    </div>
                    {extras.map((x) => (
                      <div key={x.label} className="flex justify-between">
                        <dt>{x.label}</dt>
                        <dd>{inr(x.amount)}</dd>
                      </div>
                    ))}
                  </motion.dl>
                )}
              </AnimatePresence>
              <div className="flex justify-between border-t border-line pt-3 text-[15px]">
                <span>Price + Taxes{extras.length ? ' & Add-ons' : ' & Fees'}</span>
                <span>
                  {inr(price.total - price.tax)} + {inr(price.tax + extrasTotal)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-black">
                <span>Total Amount to be paid</span>
                <span>{inr(grand)}</span>
              </div>
              <p className="text-[13px] font-bold text-leaf-700">You save {inr(price.saved)} on this booking</p>
            </div>

            <div className="card flex flex-col gap-3 p-5">
              <h2 className="text-lg font-black">Coupon Codes</h2>
              <div className="flex overflow-hidden rounded-lg border border-line-strong bg-mist">
                <input
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-bold uppercase outline-none placeholder:font-semibold placeholder:normal-case"
                  placeholder="Have a Coupon Code?"
                  value={coupon ?? couponInput}
                  disabled={!!coupon}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      tryCoupon(couponInput)
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (coupon) {
                      setCoupon(null)
                      setCouponMsg(null)
                      setCouponInput('')
                    } else tryCoupon(couponInput)
                  }}
                  className="px-3 text-sm font-black text-navy-800 disabled:text-ink-400"
                  disabled={!coupon && !couponInput.trim()}
                >
                  {coupon ? 'REMOVE' : 'APPLY'}
                </button>
              </div>
              {couponMsg && (
                <p role="status" className={`text-sm font-semibold ${couponMsg.ok ? 'text-leaf-700' : 'text-ember-600'}`}>
                  {couponMsg.ok ? '✓ ' : ''}
                  {couponMsg.text}
                </p>
              )}
              {coupons.map((c) => {
                const applied = coupon === c.code
                return (
                  <div key={c.code} className={`flex items-start gap-3 rounded-xl border p-3.5 ${applied ? 'border-leaf-700 bg-leaf-50' : 'border-line-strong'}`}>
                    <BadgePercent className="mt-0.5 h-5 w-5 shrink-0 text-ember-600" aria-hidden="true" />
                    <div className="flex-1">
                      <strong className="font-black tracking-wide">{c.code}</strong>
                      <p className="text-[13px] text-ink-700">{c.d}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <strong className="text-sm">{c.code === 'LONGSTAY' && nights < 5 ? '5+ nights' : `${inr(c.off(price.roomTotal))} off`}</strong>
                      <button type="button" disabled={!!coupon} onClick={() => tryCoupon(c.code)} className="text-sm font-black text-navy-800 disabled:text-ink-400">
                        {applied ? 'Applied' : 'Apply'}
                      </button>
                    </div>
                  </div>
                )
              })}
              <p className="rounded-lg bg-[#FFF3E2] px-3 py-2 text-xs font-semibold text-[#9A6B12]">Pay online with an extra 5% off once online payment goes live.</p>
              {user ? (
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-leaf-50 px-4 py-3">
                  <span className="text-sm">
                    <strong className="text-leaf-800">Use {points} Club points</strong>
                    <br />
                    <span className="text-ink-700">1 point = ₹1</span>
                  </span>
                  <input type="checkbox" disabled={points <= 0} checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="h-[22px] w-[22px] accent-leaf-700" />
                </label>
              ) : null}
            </div>

            {!user && (
              <div className="card flex flex-col gap-2 p-5 text-sm">
                <h2 className="text-lg font-black">
                  Why <Link to={loginLink}>Sign up</Link> or <Link to={loginLink}>Login</Link>
                </h2>
                {['Get access to member-only prices (extra 5% off)', 'Book faster with saved guest and GST details', 'Manage, cancel and review your bookings'].map((t) => (
                  <span key={t} className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0 text-leaf-700" aria-hidden="true" /> {t}
                  </span>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* Mobile submit bar */}
        <div
          className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-white px-4 pt-3 lg:hidden"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex-1">
            <strong className="block text-xl">{inr(grand)}</strong>
            <span className="text-xs text-ink-500">pay at hotel · incl. taxes</span>
          </div>
          <button type="submit" className="btn-primary" disabled={submitting || cantBook}>
            {submitting ? 'Booking…' : user ? (mode === 'now' ? 'Pay & book' : 'Book now') : 'Sign in & book'}
          </button>
        </div>
      </form>
    </div>
  )
}
