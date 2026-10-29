import { BedDouble, Download, MessageCircle, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { dayMonth, inr, plural, shortDate, todayISO } from '@stayeasy/lib/format'
import { cancelTerms } from '@stayeasy/lib/quote'
import { Empty, Modal, Notice, PageHead, Pill, RateSlip, Spinner } from '../components/ui'
import { useSession } from '../context/Session'
import { useBookings, useHotels } from '../lib/hooks'
import { voucherPdf, whatsappLink } from '../lib/pdf'
import { cancelBooking } from '../lib/store'
import type { AgentBooking } from '../lib/types'

type Tab = 'upcoming' | 'past' | 'cancelled'

const tabOf = (b: AgentBooking): Tab => (b.status === 'cancelled' ? 'cancelled' : b.check_out < todayISO() ? 'past' : 'upcoming')

export default function Bookings() {
  const { data, error } = useBookings()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [q, setQ] = useState('')
  const openId = params.get('open')
  const open = data?.find((b) => b.id === openId) ?? null
  useEffect(() => {
    if (open) setTab(tabOf(open))
  }, [open?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const n = q.trim().toLowerCase()
  const counts = useMemo(() => {
    const c = { upcoming: 0, past: 0, cancelled: 0 }
    for (const b of data ?? []) c[tabOf(b)]++
    return c
  }, [data])
  if (!data) return error ? <div className="page pt-8"><Notice tone="error">{error}</Notice></div> : <Spinner />
  const shown = data.filter((b) => tabOf(b) === tab && (!n || [b.id, b.guest_name, b.guest_phone, b.hotel_name, b.hotel_city].some((v) => v.toLowerCase().includes(n))))

  return (
    <div className="page flex flex-col gap-6 pt-7">
      <PageHead title="Bookings" intro="Every stay your agency has booked, with vouchers to share." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Booking status" className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-line">
          {(['upcoming', 'past', 'cancelled'] as Tab[]).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-10 rounded-md px-4 text-sm font-bold capitalize ${tab === t ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-paper'}`}>
              {t} <span className="opacity-70">{counts[t]}</span>
            </button>
          ))}
        </div>
        <label className="flex h-11 w-full items-center gap-2 rounded-lg border border-line-strong bg-white px-3 sm:w-[300px]">
          <Search className="h-4 w-4 text-faint" aria-hidden="true" />
          <span className="sr-only">Search bookings</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guest, phone, hotel or booking ID" className="min-w-0 flex-1 outline-none" />
        </label>
      </div>
      {shown.length === 0 ? (
        <div className="card">
          <Empty icon={<BedDouble className="h-7 w-7" />} title={n ? 'No booking matches that search' : `No ${tab} bookings`}>
            {!data.length && (
              <Link to="/app/hotels" className="btn-gold">
                Book a hotel
              </Link>
            )}
          </Empty>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-line text-sm text-muted">
                <th className="px-4 py-3 font-semibold">Booking</th>
                <th className="px-4 py-3 font-semibold">Guest</th>
                <th className="px-4 py-3 font-semibold">Hotel</th>
                <th className="px-4 py-3 font-semibold">Stay</th>
                <th className="px-4 py-3 text-right font-semibold">Customer pays</th>
                <th className="px-4 py-3 text-right font-semibold">You earn</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-paper" onClick={() => setParams({ open: b.id })}>
                  <td className="px-4 py-3">
                    <button type="button" className="font-bold text-ink-900 hover:underline" onClick={() => setParams({ open: b.id })}>
                      {b.id}
                    </button>
                  </td>
                  <td className="px-4 py-3">{b.guest_name}</td>
                  <td className="px-4 py-3">{b.hotel_name}</td>
                  <td className="px-4 py-3">
                    {dayMonth(b.check_in)} to {dayMonth(b.check_out)}
                  </td>
                  <td className="px-4 py-3 text-right">{inr(b.selling_amount)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${b.status === 'cancelled' ? 'text-faint line-through' : 'text-earn'}`}>{inr(b.markup_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!open} onClose={() => setParams({})} title={open ? `${open.guest_name}, ${open.id}` : ''} wide>
        {open && <Detail b={open} justBooked={params.get('new') === '1'} />}
      </Modal>
    </div>
  )
}

function Detail({ b, justBooked }: { b: AgentBooking; justBooked: boolean }) {
  const { agency } = useSession()
  const { data: hotels } = useHotels()
  const hotel = hotels?.find((h) => h.slug === b.hotel_slug) ?? null
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)
  if (!agency) return null
  const t = cancelTerms({ ...b, pay_mode: 'now', paid_at: b.created_at }, hotel)
  const msg = `Hello ${b.guest_name}, your stay is booked.\n${b.hotel_name}, ${b.hotel_city}\n${b.rooms} × ${b.room_name}\n${shortDate(b.check_in)} to ${shortDate(b.check_out)}\nBooking ID: ${b.id}\nPlease carry a photo ID for every adult. ${agency.name}, +91 ${agency.phone}`
  return (
    <div className="flex flex-col gap-5">
      {justBooked && <Notice tone="ok">Booked. {inr(b.net_amount)} was taken from your wallet. Share the voucher with your customer.</Notice>}
      <div className="flex flex-wrap gap-2">
        <Pill tone={b.status === 'cancelled' ? 'bad' : 'ok'}>{b.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}</Pill>
        <Pill tone="muted">Booked by {b.booked_by}</Pill>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[15px] sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">Hotel</dt>
          <dd className="font-bold">{b.hotel_name}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Room</dt>
          <dd className="font-bold">
            {b.rooms} × {b.room_name}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Guests</dt>
          <dd className="font-bold">{b.guests}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Check-in</dt>
          <dd className="font-bold">{shortDate(b.check_in)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Check-out</dt>
          <dd className="font-bold">{shortDate(b.check_out)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Phone</dt>
          <dd className="font-bold">{b.guest_phone}</dd>
        </div>
      </dl>
      <RateSlip net={b.net_amount} markup={b.markup_amount} selling={b.selling_amount} size="sm" />
      {b.status === 'cancelled' && <Notice>{b.refund_amount ? `${inr(b.refund_amount)} went back to your wallet.` : 'Cancelled.'}</Notice>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-ink"
          disabled={!!busy}
          onClick={async () => {
            setBusy('pdf')
            try {
              await voucherPdf(agency, b, hotel ? { address: hotel.address, photos: hotel.photos, checkIn: hotel.partner?.checkIn, checkOut: hotel.partner?.checkOut } : null)
            } finally {
              setBusy('')
            }
          }}
        >
          <Download className="h-4 w-4" aria-hidden="true" /> {busy === 'pdf' ? 'Preparing…' : 'Voucher PDF'}
        </button>
        {b.status === 'confirmed' && (
          <a className="btn-line" href={whatsappLink(b.guest_phone, msg)} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> Send on WhatsApp
          </a>
        )}
        {b.status === 'confirmed' && b.check_in >= todayISO() && (
          <button type="button" className="btn-line text-alert" onClick={() => setConfirm(true)}>
            Cancel booking
          </button>
        )}
      </div>
      {confirm && (
        <div className="rounded-xl border border-line-strong p-4">
          <strong className="block">{t.allowed ? `Cancel and get ${inr(b.net_amount)} back in your wallet?` : 'This booking can’t be cancelled online'}</strong>
          <p className="mt-1 text-sm text-ink-700">{t.allowed ? `Free cancellation is open until ${t.hours} hours before check-in. Your markup of ${inr(b.markup_amount)} is not earned on a cancelled booking.` : `${t.reason} Contact your account manager.`}</p>
          {err && (
            <p role="alert" className="mt-2 text-sm font-semibold text-alert">
              {err}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-line" onClick={() => setConfirm(false)}>
              Keep booking
            </button>
            {t.allowed && (
              <button
                type="button"
                className="btn bg-alert text-white hover:bg-[#8f1b12]"
                disabled={busy === 'cancel'}
                onClick={async () => {
                  setBusy('cancel')
                  setErr('')
                  try {
                    await cancelBooking(agency, b)
                    setConfirm(false)
                  } catch (x) {
                    setErr(x instanceof Error ? x.message : 'Couldn’t cancel.')
                  } finally {
                    setBusy('')
                  }
                }}
              >
                {busy === 'cancel' ? 'Cancelling…' : 'Yes, cancel'}
              </button>
            )}
          </div>
        </div>
      )}
      {b.special_requests && <p className="text-sm text-muted">Requests: {b.special_requests}</p>}
      <p className="text-xs text-faint">
        Booked {new Date(b.created_at).toLocaleString('en-IN')}. {plural(b.nights, 'night')}.
      </p>
    </div>
  )
}
