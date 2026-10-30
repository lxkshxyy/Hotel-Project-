import { motion } from 'framer-motion'
import { BedDouble, Check, Download, MapPin, Phone, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import HotelArt from '../components/HotelArt'
import TripsShell, { TripsEmpty, type TripTab } from '../components/TripsShell'
import { Modal, Spinner } from '../components/ui'
import { site } from '../config/site'
import { useAuth } from '../context/AuthContext'
import { hotels as bundledHotels } from '../data/hotels'
import type { Booking, Hotel } from '../data/types'
import { cancelBooking, cancelTerms, getBooking, getHotel, listBookings, updateGuestDetails } from '../lib/api'
import { pointsFor } from '../lib/club'
import { inr, plural, shortDate, todayISO } from '../lib/format'


/** Booking confirmation + details page: /bookings/:id */
export function BookingDetail() {
  const { id = '' } = useParams()
  const location = useLocation() as { state?: { booking?: Booking; justBooked?: boolean } }
  const { user, loading } = useAuth()
  const [booking, setBooking] = useState<Booking | null | undefined>(location.state?.booking)
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [pdf, setPdf] = useState<'' | 'download' | 'share'>('')
  const [pdfMsg, setPdfMsg] = useState('')
  const justBooked = location.state?.justBooked

  useEffect(() => {
    if (booking) getHotel(booking.hotel_slug).then(setHotel).catch(() => setHotel(null))
  }, [booking?.hotel_slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const makePdf = async (mode: 'download' | 'share') => {
    if (!booking || pdf) return
    setPdf(mode)
    setPdfMsg('')
    try {
      const v = await import('../lib/voucherPdf')
      if (mode === 'download') {
        await v.downloadVoucher(booking, hotel)
        setPdfMsg('Voucher PDF downloaded.')
      } else {
        const r = await v.shareVoucher(booking, hotel)
        setPdfMsg(r === 'downloaded' ? 'Sharing isn’t available in this browser, so the PDF was downloaded. You can attach it to an email or WhatsApp.' : '')
      }
    } catch {
      setPdfMsg('Could not create the PDF. Please try again.')
    } finally {
      setPdf('')
    }
  }

  useEffect(() => {
    if (!booking && user) getBooking(id).then(setBooking).catch(() => setBooking(null))
  }, [id, user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!loading && !user) return <Navigate to={`/login?next=/bookings/${id}`} replace />
  if (booking === undefined) return <Spinner label="Loading booking" />
  if (booking === null)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-extrabold text-navy-800">Booking not found</h1>
        <Link to="/bookings" className="btn-navy mt-6">
          My bookings
        </Link>
      </div>
    )

  const cancelled = booking.status === 'cancelled'

  return (
    <div className="container-page max-w-[880px] pt-8 pb-12">
      <div className="flex flex-col items-center gap-2.5 text-center">
        <motion.span
          initial={justBooked ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className={`flex h-[72px] w-[72px] items-center justify-center rounded-full ${cancelled ? 'bg-ink-400' : 'bg-leaf-700'}`}
        >
          <Check className="h-10 w-10 text-white" strokeWidth={3} aria-hidden="true" />
        </motion.span>
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[34px]">
          {cancelled ? 'This booking was cancelled' : justBooked ? 'Your stay is confirmed!' : 'Booking details'}
        </h1>
        <p className="text-ink-700">
          Booking ID <strong className="font-mono text-ink-900">{booking.id}</strong>
          {!cancelled && ` · Guest email ${booking.guest_email}`}
        </p>
        {cancelled && !!booking.refund_amount && <p className="font-semibold text-leaf-700">Refund of {inr(booking.refund_amount)} {booking.refund_status === 'processed' ? 'processed' : 'started'} to your original payment method.</p>}
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <div className="aspect-[16/9] sm:aspect-auto sm:w-[260px] sm:shrink-0">
            <HotelArt hue={200} photo={hotel?.photos?.[0]} label={booking.hotel_name} />
          </div>
          <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
            <div>
              <Link to={`/hotel/${booking.hotel_slug}`} className="text-xl font-bold text-navy-800 no-underline hover:underline">
                {booking.hotel_name}
              </Link>
              <span className="flex items-center gap-1 text-sm text-ink-500">
                <MapPin className="h-4 w-4" aria-hidden="true" /> {booking.hotel_city}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-canvas p-3.5 text-sm sm:grid-cols-4">
              <div>
                <span className="text-ink-500">Check-in</span>
                <br />
                <strong>{shortDate(booking.check_in)}</strong>
                <br />
                {site.checkInTime}
              </div>
              <div>
                <span className="text-ink-500">Check-out</span>
                <br />
                <strong>{shortDate(booking.check_out)}</strong>
                <br />
                {site.checkOutTime}
              </div>
              <div>
                <span className="text-ink-500">Guests</span>
                <br />
                <strong>{plural(booking.guests, 'guest')}</strong>
                <br />
                {plural(booking.rooms, 'room')}
              </div>
              <div>
                <span className="text-ink-500">Room</span>
                <br />
                <strong>{booking.room_name}</strong>
                <br />
                {plural(booking.nights, 'night')}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <span>
                {cancelled ? 'Amount' : booking.paid_at ? 'Paid online' : 'Pay at hotel'}: <strong className="text-lg">{inr(booking.amount)}</strong>
                <span className="ml-1 text-xs text-ink-500">incl. {inr(booking.tax)} GST</span>
              </span>
              <span className="text-sm text-ink-500">Guest: {booking.guest_name}</span>
            </div>
            {!!booking.extras?.length && (
              <p className="text-[13px] text-ink-500">Includes add-ons: {booking.extras.map((x) => `${x.label} (${inr(x.amount)})`).join(' · ')}</p>
            )}
          </div>
        </div>
      </section>

      {!cancelled && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section className="card flex flex-col gap-3 p-5">
            <strong className="text-lg text-navy-800">Before you arrive</strong>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-ink-700">
              <li>Carry a government photo ID for every adult guest.</li>
              <li>Show booking ID {booking.id} at the front desk.</li>
              <li>Any issue with your room? {site.supportPhone ? 'Call us' : 'Tell the front desk'} — we sort it within 30 minutes.</li>
            </ol>
            <div className="mt-1 flex flex-wrap gap-2">
              <button type="button" className="btn-navy min-h-10 text-sm" disabled={!!pdf} onClick={() => makePdf('download')}>
                <Download className="h-4 w-4" aria-hidden="true" /> {pdf === 'download' ? 'Preparing PDF…' : 'Download voucher (PDF)'}
              </button>
              <button type="button" className="btn-outline min-h-10 text-sm" disabled={!!pdf} onClick={() => makePdf('share')}>
                <Share2 className="h-4 w-4" aria-hidden="true" /> {pdf === 'share' ? 'Preparing…' : 'Share voucher'}
              </button>
              {site.supportPhone && (
                <a href={`tel:${site.supportPhone.replace(/\s/g, '')}`} className="btn-outline min-h-10 text-sm">
                  <Phone className="h-4 w-4" aria-hidden="true" /> Call support
                </a>
              )}
            </div>
            {pdfMsg && (
              <p role="status" className="text-[13px] font-semibold text-leaf-700">
                {pdfMsg}
              </p>
            )}
          </section>
          <section className="flex flex-col gap-2 rounded-2xl bg-navy-900 p-5 text-white">
            <span className="text-[13px] font-bold tracking-[0.06em] text-ember-200 uppercase">{site.name} Club</span>
            <strong className="text-[22px]">You earned {pointsFor(booking.amount)} Club points</strong>
            <span className="text-sm text-[#D3DCEE]">Points are worth ₹1 each on your next stay.</span>
            <Link to="/club" className="mt-auto font-bold text-ember-200 no-underline">
              How the Club works →
            </Link>
          </section>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/bookings" className="btn-navy">
          All my bookings
        </Link>
        {!cancelled && booking.check_in >= todayISO() && <ManageBooking booking={booking} hotel={hotel} onChange={setBooking} />}
      </div>
    </div>
  )
}

/** Edit guest details, or cancel with a clear refund summary. */
function ManageBooking({ booking, hotel, onChange }: { booking: Booking; hotel: Hotel | null; onChange: (b: Booking) => void }) {
  const [dlg, setDlg] = useState<'' | 'edit' | 'cancel'>('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [f, setF] = useState({ guest_name: booking.guest_name, guest_phone: booking.guest_phone.replace(/^\+91/, ''), guest_email: booking.guest_email, special_requests: booking.special_requests ?? '' })
  const t = cancelTerms(booking, hotel)
  const close = () => {
    setDlg('')
    setErr('')
  }
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (f.guest_name.trim().length < 3) return setErr('Enter the guest’s full name.')
    if (!/^[6-9]\d{9}$/.test(f.guest_phone.replace(/\D/g, ''))) return setErr('Enter a valid 10-digit mobile number.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.guest_email.trim())) return setErr('Enter a valid email address.')
    setBusy(true)
    setErr('')
    try {
      const d = { guest_name: f.guest_name.trim(), guest_phone: '+91' + f.guest_phone.replace(/\D/g, ''), guest_email: f.guest_email.trim(), special_requests: f.special_requests.trim() }
      await updateGuestDetails(booking.id, d)
      onChange({ ...booking, ...d })
      close()
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Couldn’t save. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  const cancel = async () => {
    setBusy(true)
    setErr('')
    try {
      const updated = await cancelBooking(booking.id)
      onChange(updated ?? { ...booking, status: 'cancelled', refund_amount: t.refund })
      close()
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Couldn’t cancel. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button type="button" className="btn-outline" onClick={() => setDlg('edit')}>
        Edit guest details
      </button>
      <button type="button" className="btn-outline text-ember-600" onClick={() => setDlg('cancel')}>
        Cancel booking
      </button>
      <Modal open={dlg === 'edit'} onClose={close} title="Edit guest details">
        <form onSubmit={save} noValidate className="flex flex-col gap-3">
          <label className="label">
            Guest name
            <input className="field" value={f.guest_name} onChange={(e) => setF({ ...f, guest_name: e.target.value })} autoComplete="name" />
          </label>
          <label className="label">
            Mobile number
            <input className="field" inputMode="numeric" value={f.guest_phone} onChange={(e) => setF({ ...f, guest_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} autoComplete="tel-national" />
          </label>
          <label className="label">
            Email
            <input className="field" type="email" value={f.guest_email} onChange={(e) => setF({ ...f, guest_email: e.target.value })} autoComplete="email" />
          </label>
          <label className="label">
            Requests for the hotel
            <textarea className="field" rows={4} value={f.special_requests} onChange={(e) => setF({ ...f, special_requests: e.target.value })} />
          </label>
          <p className="text-[13px] text-ink-500">To change dates or the room, cancel this booking (while it’s free) and book again.</p>
          {err && (
            <p role="alert" className="text-sm font-semibold text-ember-600">
              {err}
            </p>
          )}
          <button type="submit" className="btn-navy self-start" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </Modal>
      <Modal open={dlg === 'cancel'} onClose={close} title={t.allowed ? 'Cancel this booking?' : 'This booking can’t be cancelled online'}>
        {t.allowed ? (
          <>
            <dl className="flex flex-col gap-2 rounded-xl bg-canvas p-4 text-[15px]">
              <div className="flex justify-between gap-3">
                <dt>Booking amount</dt>
                <dd className="font-semibold">{inr(booking.amount)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t.paidOnline ? 'Paid online' : 'Paid so far'}</dt>
                <dd className="font-semibold">{t.paidOnline ? inr(booking.amount) : inr(0)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-2 font-bold">
                <dt>{t.paidOnline ? 'Refund to your original payment method' : 'Cancellation charge'}</dt>
                <dd className="text-leaf-700">{t.paidOnline ? inr(t.refund) : inr(0)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-ink-700">
              {t.paidOnline ? 'Refunds usually reach your account in 5–7 working days. ' : 'Nothing has been charged, so there is nothing to refund. '}
              {booking.points_used > 0 ? `The ${booking.points_used} Club points you used go back to your account.` : ''}
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-2 text-[15px] text-ink-700">
            <p>
              {t.reason}
              {t.hours !== null && booking.status === 'confirmed' ? ' After that, the first night is charged and no-shows are charged in full.' : ''}
            </p>
            <p>
              {site.supportPhone || site.supportEmail ? (
                <>
                  To ask about changing or cancelling, contact us
                  {site.supportPhone && (
                    <>
                      {' '}
                      on <a href={`tel:${site.supportPhone.replace(/\s/g, '')}`}>{site.supportPhone}</a>
                    </>
                  )}
                  {site.supportEmail && (
                    <>
                      {site.supportPhone ? ' or ' : ' at '}
                      <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
                    </>
                  )}{' '}
                  and we’ll check with the hotel.
                </>
              ) : (
                <>
                  To ask about changing or cancelling, see the <Link to="/help">Help centre</Link>.
                </>
              )}
            </p>
          </div>
        )}
        {err && (
          <p role="alert" className="mt-3 text-sm font-semibold text-ember-600">
            {err}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-outline" onClick={close}>
            {t.allowed ? 'Keep booking' : 'Close'}
          </button>
          {t.allowed && (
            <button type="button" className="btn-primary" disabled={busy} onClick={cancel}>
              {busy ? 'Cancelling…' : 'Yes, cancel'}
            </button>
          )}
        </div>
      </Modal>
    </>
  )
}

/** List of the signed-in user's bookings: /bookings */
export default function MyBookings() {
  const { user, loading } = useAuth()
  const [list, setList] = useState<Booking[] | null>(null)
  const [tab, setTab] = useState<TripTab>('upcoming')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user)
      listBookings(user.id)
        .then(setList)
        .catch((e) => {
          setError(e.message)
          setList([])
        })
  }, [user])

  if (!loading && !user) {
    return (
      <div className="container-page flex max-w-lg flex-col items-center gap-4 py-20 text-center">
        <BedDouble className="h-12 w-12 text-navy-800" aria-hidden="true" />
        <h1 className="text-2xl font-extrabold text-navy-800">Sign in to see your bookings</h1>
        <p className="text-ink-500">View, manage and cancel your stays in one place.</p>
        <Link to="/login?next=/bookings" className="btn-navy">
          Sign in
        </Link>
      </div>
    )
  }

  const today = todayISO()
  const inTab = (b: Booking, t: TripTab) => (t === 'cancelled' ? b.status === 'cancelled' : b.status === 'confirmed' && (t === 'upcoming' ? b.check_out >= today : b.check_out < today))
  const needle = q.trim().toLowerCase()
  const match = (b: Booking) => !needle || [b.id, b.hotel_name, b.hotel_city, b.guest_name, b.room_name].some((v) => (v ?? '').toLowerCase().includes(needle))
  const counts = { upcoming: 0, cancelled: 0, completed: 0 } as Record<TripTab, number>
  for (const b of list ?? []) for (const t of ['upcoming', 'cancelled', 'completed'] as TripTab[]) if (inTab(b, t)) counts[t]++
  const filtered = (list ?? []).filter((b) => inTab(b, tab) && match(b))
  const tone = tab === 'cancelled' ? 'border-l-[#EE9B2A]' : tab === 'completed' ? 'border-l-ink-400' : 'border-l-[#16A394]'

  return (
    <TripsShell tab={tab} onTab={setTab} counts={counts} query={q} onQuery={setQ} crumbTo="/account">
      {error && <p className="px-6 pt-4 text-sm font-semibold text-ember-600">{error}</p>}
      {!list ? (
        <Spinner label="Loading bookings" />
      ) : filtered.length === 0 ? (
        needle ? (
          <p className="p-10 text-center text-ink-500">No {tab} booking matches “{q}”. Try a booking ID, hotel or city.</p>
        ) : (
          <TripsEmpty tab={tab} planTo="/hotels" />
        )
      ) : (
        <div className="flex flex-col gap-3 p-4 sm:p-6">
          {filtered.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={`/bookings/${b.id}`} state={{ booking: b }} className={`flex items-center gap-4 rounded-xl border border-line border-l-4 ${tone} p-4 text-ink-900 no-underline hover:shadow-card`}>
                <div className={`hidden h-20 w-24 shrink-0 overflow-hidden rounded-xl sm:block ${tab === 'cancelled' ? 'grayscale' : tab === 'completed' ? 'grayscale-[40%]' : ''}`}>
                  <HotelArt hue={200 + i * 30} photo={bundledHotels.find((h) => h.slug === b.hotel_slug)?.photos?.[0]} label={b.hotel_name} />
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">{b.hotel_name}</strong>
                  <span className="block text-sm text-ink-500">
                    {shortDate(b.check_in)} – {shortDate(b.check_out)} · {b.room_name}
                  </span>
                  <span className="font-mono text-xs text-ink-500">{b.id}</span>
                </div>
                <div className="text-right">
                  <strong className="block">{inr(b.amount)}</strong>
                  <span className={`text-xs font-bold ${b.status === 'cancelled' ? 'text-[#8A5A00]' : tab === 'completed' ? 'text-ink-500' : 'text-[#0F7C70]'}`}>
                    {b.status === 'cancelled' ? 'Cancelled' : tab === 'completed' ? 'Completed' : 'Confirmed'}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </TripsShell>
  )
}
