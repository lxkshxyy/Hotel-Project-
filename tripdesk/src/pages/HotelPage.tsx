import { ArrowLeft, BookmarkPlus, Check, MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { brandLabel } from '@stayeasy/data/hotels'
import { agentQuote, type Markup } from '@stayeasy/lib/agentRates'
import { addDays, inr, plural, shortDate } from '@stayeasy/lib/format'
import { freeCancelHours, hotelForStay } from '@stayeasy/lib/quote'
import { Notice, Pill, RateSlip, Spinner } from '../components/ui'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { addToDraft, useDraft } from '../lib/draft'
import { useHotels } from '../lib/hooks'
import { readSearch, toQuery } from '../lib/search'
import { markupForHotel } from '../lib/store'

export function MarkupControl({ value, onChange }: { value: Markup; onChange: (m: Markup) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="label">
        Your markup
        <span className="flex">
          <input
            type="number"
            min={0}
            step={value.type === 'pct' ? 1 : 50}
            className="field w-28 rounded-r-none"
            value={value.value}
            onChange={(e) => onChange({ ...value, value: Math.max(0, Number(e.target.value)) })}
            aria-label="Markup amount"
          />
          <select className="field w-auto rounded-l-none border-l-0" value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as Markup['type'] })} aria-label="Markup type">
            <option value="pct">% of net</option>
            <option value="flat">₹ per room night</option>
          </select>
        </span>
      </label>
    </div>
  )
}

export default function HotelPage() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const s = readSearch(params)
  const { agency } = useSession()
  const { data: all } = useHotels()
  const draft = useDraft()
  const raw = all?.find((h) => h.slug === slug)
  const hotel = useMemo(() => (raw ? hotelForStay(raw, s.checkIn, s.checkOut) : null), [raw, s.checkIn, s.checkOut])
  const [markup, setMarkup] = useState<Markup | null>(null)
  const [photo, setPhoto] = useState(0)

  if (!all) return <Spinner label="Loading hotel" />
  if (!hotel || !raw || !agency)
    return (
      <div className="page py-20 text-center">
        <h1 className="text-2xl font-extrabold">Hotel not found</h1>
        <Link to="/app/hotels" className="btn-ink mt-6">
          Back to hotels
        </Link>
      </div>
    )
  const m = markup ?? markupForHotel(agency, hotel)
  const hours = freeCancelHours(hotel)
  const photos = hotel.photos ?? []
  const guests = s.adults + s.children

  return (
    <div className="page flex flex-col gap-6 pt-6">
      <Link to={`/app/hotels?${toQuery(s)}`} className="inline-flex items-center gap-1 self-start text-sm font-bold text-ink-700 no-underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to results
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-2">
          <div className="aspect-[16/9] overflow-hidden rounded-xl bg-ink-50">{photos[photo] && <img src={photos[photo]} alt={`${hotel.name}, photo ${photo + 1}`} className="h-full w-full object-cover" />}</div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.slice(0, 10).map((p, i) => (
                <button key={p + i} type="button" aria-label={`Photo ${i + 1}`} aria-pressed={i === photo} onClick={() => setPhoto(i)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg ${i === photo ? 'ring-3 ring-gold-500' : 'ring-1 ring-line'}`}>
                  <img src={p} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Pill tone="ink">{brandLabel(hotel.brand)}</Pill>
            {hotel.rating > 0 && <Pill tone="ok">{hotel.rating.toFixed(1)} guest rating</Pill>}
            {hotel.coupleFriendly && <Pill tone="muted">Couple friendly</Pill>}
          </div>
          <h1 className="text-[30px] leading-tight font-extrabold text-ink-950">{hotel.name}</h1>
          <span className="flex items-start gap-1 text-muted">
            <MapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /> {hotel.address}
          </span>
          <p className="text-ink-700">{hotel.description}</p>
          <ul className="flex flex-col gap-1 text-[15px]">
            {hotel.highlights.map((x) => (
              <li key={x} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-earn" aria-hidden="true" /> {x}
              </li>
            ))}
          </ul>
          <dl className="mt-2 grid grid-cols-2 gap-3 rounded-xl bg-white p-4 text-sm ring-1 ring-line">
            <div>
              <dt className="text-muted">Stay</dt>
              <dd className="font-bold">
                {shortDate(s.checkIn)} to {shortDate(s.checkOut)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Guests</dt>
              <dd className="font-bold">
                {plural(s.rooms, 'room')}, {plural(guests, 'guest')}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Check-in / out</dt>
              <dd className="font-bold">
                {hotel.partner?.checkIn ?? '12:00 PM'} / {hotel.partner?.checkOut ?? '11:00 AM'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Cancellation</dt>
              <dd className={`font-bold ${hours === null ? 'text-alert' : 'text-earn'}`}>{hours === null ? 'Non-refundable' : `Free till ${shortDate(addDays(s.checkIn, -Math.max(1, Math.ceil(hours / 24))))}`}</dd>
            </div>
          </dl>
        </div>
      </div>

      <section aria-labelledby="rooms-h" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="rooms-h" className="text-xl font-extrabold text-ink-950">
            Rooms for your customer
          </h2>
          <MarkupControl value={m} onChange={setMarkup} />
        </div>
        {agency.status !== 'approved' && <Notice tone="warn">You can add rooms to a quote now. Booking opens once your agency is approved.</Notice>}
        <ul className="flex flex-col gap-3">
          {hotel.rooms.map((r) => {
            const fits = r.maxGuests * s.rooms >= guests
            const q = agentQuote({ hotel: raw, roomId: r.id, checkIn: s.checkIn, checkOut: s.checkOut, rooms: s.rooms, adults: s.adults, children: s.children, markup: m })
            const inDraft = draft.some((d) => d.hotelSlug === hotel.slug && d.roomId === r.id && d.checkIn === s.checkIn)
            const blocked = r.unavailable || (!fits ? `Fits ${r.maxGuests} per room. Add rooms for ${plural(guests, 'guest')}.` : '')
            return (
              <li key={r.id} className="card grid gap-4 p-4 md:grid-cols-[140px_1fr_300px_auto] md:items-center">
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-ink-50">{r.photo && <img src={r.photo} alt={r.name} loading="lazy" className="h-full w-full object-cover" />}</div>
                <div className="flex flex-col gap-1">
                  <strong className="text-[17px] text-ink-950">{r.name}</strong>
                  <span className="text-sm text-muted">
                    {r.size}, up to {r.maxGuests} guests
                  </span>
                  <span className="text-sm text-ink-700">{r.features.join(', ')}</span>
                  {blocked && <span className="text-sm font-bold text-alert">{blocked}</span>}
                </div>
                <RateSlip net={q.netTotal} markup={q.markupAmount} selling={q.sellingTotal} size="sm" note={`${plural(q.nights, 'night')}, incl. GST`} />
                <div className="flex flex-col gap-2">
                  <Link
                    to={`/app/book?${toQuery(s, { hotel: hotel.slug, room: r.id, mt: m.type, mv: String(m.value) })}`}
                    className={`btn-gold ${blocked || agency.status !== 'approved' ? 'pointer-events-none opacity-50' : ''}`}
                    aria-disabled={!!blocked || agency.status !== 'approved'}
                  >
                    Book
                  </Link>
                  <button
                    type="button"
                    className="btn-line"
                    disabled={!!blocked}
                    onClick={() =>
                      addToDraft({
                        hotelSlug: hotel.slug,
                        hotelName: hotel.name,
                        city: hotel.city,
                        area: hotel.area,
                        photo: r.photo ?? photos[0],
                        roomId: r.id,
                        roomName: r.name,
                        checkIn: s.checkIn,
                        checkOut: s.checkOut,
                        rooms: s.rooms,
                        adults: s.adults,
                        children: s.children,
                        netTotal: q.netTotal,
                        sellingTotal: q.sellingTotal,
                        freeCancel: hours === null ? 'Non-refundable' : `Free cancellation until ${hours} hours before check-in`,
                      })
                    }
                  >
                    <BookmarkPlus className="h-4 w-4" aria-hidden="true" /> {inDraft ? 'In quote' : 'Add to quote'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        {draft.length > 0 && (
          <div className="sticky bottom-20 z-30 flex items-center justify-between gap-3 rounded-xl bg-ink-900 px-4 py-3 text-white shadow-slip lg:bottom-4">
            <span className="text-[15px]">
              {plural(draft.length, 'option')} in your quote, from {inr(Math.min(...draft.map((d) => d.sellingTotal)))}
            </span>
            <Link to="/app/quotes" className="btn-gold min-h-10">
              Review quote
            </Link>
          </div>
        )}
        <p className="text-[13px] text-muted">
          Net rate = {site.marketplace} public price less the agent discount, plus GST at the hotel’s slab. Your markup is added on top.
        </p>
      </section>
    </div>
  )
}
