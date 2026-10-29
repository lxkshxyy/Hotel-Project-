import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, CircleAlert, ExternalLink, Lightbulb, MapPin, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import MapPicker from '../components/MapPicker'
import PhotoManager from '../components/PhotoManager'
import { Chip, KeyTag, Notice, Spinner, Toggle } from '../components/ui'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { amenityGroups, bedTypes, cancellationOptions, checkTimes, cities, propertyTypes, roomAmenities } from '../data/options'
import { inr, uid } from '../lib/format'
import { demoIds, gstinError, gstinState, ifscError, panError } from '../lib/gstin'
import { blankListing, blockers, fromPrice, guestRules, quality, stepDone, steps, tips, toHotel, type StepId } from '../lib/listing'
import { getListing, publishListing, PublishError, retrySync, saveListing } from '../lib/store'
import { isDemoMode } from '../lib/supabase'
import type { Listing, ListingRoom } from '../lib/types'

type Set = (fn: (l: Listing) => Listing) => void

function Section({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-[26px] font-bold text-pine-950">{title}</h2>
        {intro && <p className="mt-1 max-w-2xl text-ink-500">{intro}</p>}
      </div>
      {children}
    </section>
  )
}

const err = (show: boolean, msg: string) =>
  show ? (
    <span role="alert" className="text-[13px] font-semibold text-alert">
      {msg}
    </span>
  ) : null

/* ---------------- steps ---------------- */

function Basics({ l, set }: { l: Listing; set: Set }) {
  const b = l.basics
  const up = (p: Partial<Listing['basics']>) => set((x) => ({ ...x, basics: { ...x.basics, ...p } }))
  const len = b.description.trim().length
  return (
    <Section title="Property details" intro="What guests see first on your listing.">
      <label className="label">
        Property name
        <input className="field" value={b.name} onChange={(e) => up({ name: e.target.value })} placeholder="e.g. Hotel Sunrise Residency" maxLength={70} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          Type of property
          <select className="field" value={b.propertyType} onChange={(e) => up({ propertyType: e.target.value })}>
            {propertyTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-ink-700">Star rating</legend>
          <div className="flex flex-wrap gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={b.stars === n}
                onClick={() => up({ stars: n })}
                className={`min-h-[46px] rounded-[10px] border px-3 text-sm font-bold ${b.stars === n ? 'border-pine-800 bg-pine-800 text-white' : 'border-line-strong bg-white text-ink-700 hover:border-pine-700'}`}
              >
                {n === 0 ? 'Not rated' : `${n}★`}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <label className="label">
        Description
        <textarea className="field min-h-[140px] leading-relaxed" value={b.description} onChange={(e) => up({ description: e.target.value })} maxLength={1500} placeholder="Describe the building, the rooms, what’s nearby and who the property suits." />
        <span className={`text-[13px] font-normal ${len < 80 ? 'text-ink-500' : 'text-live'}`}>{len < 80 ? `${80 - len} more characters needed` : `${len} characters`}</span>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold text-ink-700">Highlights (up to 4, shown as short points)</legend>
        {[0, 1, 2, 3].map((i) => (
          <input
            key={i}
            className="field"
            aria-label={`Highlight ${i + 1}`}
            maxLength={60}
            value={b.highlights[i] ?? ''}
            placeholder={['5 minutes’ walk to the metro', 'Rooftop breakfast area', '24-hour front desk', 'Free parking for guests'][i]}
            onChange={(e) => {
              const h = [...b.highlights]
              h[i] = e.target.value
              up({ highlights: h })
            }}
          />
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          Front-desk mobile
          <span className="flex overflow-hidden rounded-[10px] border border-line-strong bg-white focus-within:border-pine-700">
            <span className="flex items-center bg-paper px-3 text-sm font-bold">+91</span>
            <input className="min-h-[46px] min-w-0 flex-1 px-3 outline-none" inputMode="numeric" value={b.phone} onChange={(e) => up({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
          </span>
          {err(b.phone.length > 0 && !/^[6-9]\d{9}$/.test(b.phone), 'Enter a 10-digit mobile number.')}
        </label>
        <label className="label">
          Reservations email
          <input className="field" type="email" value={b.email} onChange={(e) => up({ email: e.target.value })} />
        </label>
      </div>
    </Section>
  )
}

function Location({ l, set }: { l: Listing; set: Set }) {
  const loc = l.location
  const up = (p: Partial<Listing['location']>) => set((x) => ({ ...x, location: { ...x.location, ...p } }))
  const city = cities.find((c) => c.name === loc.city) ?? cities[0]
  const onPin = useCallback((lat: number, lng: number) => set((x) => ({ ...x, location: { ...x.location, lat, lng } })), [set])
  return (
    <Section title="Location" intro="Guests search by city and area. The pin decides where you appear on the map.">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          City
          <select className="field" value={loc.city} onChange={(e) => up({ city: e.target.value, lat: undefined, lng: undefined })}>
            <option value="">Choose a city</option>
            {cities.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
          <span className="text-[13px] font-normal text-ink-500">{site.marketplace} is open in these cities for now.</span>
        </label>
        <label className="label">
          Area or locality
          <input className="field" value={loc.area} onChange={(e) => up({ area: e.target.value })} placeholder="e.g. Paharganj" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <label className="label">
          Street address
          <input className="field" value={loc.address} onChange={(e) => up({ address: e.target.value })} placeholder="Building number, street" autoComplete="street-address" />
        </label>
        <label className="label">
          PIN code
          <input className="field" inputMode="numeric" value={loc.pincode} onChange={(e) => up({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} autoComplete="postal-code" />
        </label>
      </div>
      {loc.city ? (
        <MapPicker lat={loc.lat} lng={loc.lng} fallback={city} query={[loc.address, loc.area, loc.city, loc.pincode].filter(Boolean).join(', ')} onChange={onPin} />
      ) : (
        <Notice>Choose the city to place your pin on the map.</Notice>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold text-ink-700">Nearby landmarks (the first one shows on your card)</legend>
        {loc.landmarks.map((m, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_44px] gap-2">
            <input className="field" aria-label={`Landmark ${i + 1}`} value={m.name} placeholder="New Delhi Railway Station" onChange={(e) => up({ landmarks: loc.landmarks.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <input className="field" aria-label={`Distance to landmark ${i + 1}`} value={m.distance} placeholder="600 m" onChange={(e) => up({ landmarks: loc.landmarks.map((x, j) => (j === i ? { ...x, distance: e.target.value } : x)) })} />
            <button type="button" aria-label={`Remove landmark ${i + 1}`} onClick={() => up({ landmarks: loc.landmarks.filter((_, j) => j !== i) })} className="flex h-[46px] items-center justify-center rounded-[10px] text-ink-500 hover:bg-alert-50 hover:text-alert">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {loc.landmarks.length < 5 && (
          <button type="button" className="btn-ghost self-start" onClick={() => up({ landmarks: [...loc.landmarks, { name: '', distance: '' }] })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add landmark
          </button>
        )}
      </fieldset>
    </Section>
  )
}

function Amenities({ l, set }: { l: Listing; set: Set }) {
  const toggle = (id: string) => set((x) => ({ ...x, amenities: x.amenities.includes(id) ? x.amenities.filter((a) => a !== id) : [...x.amenities, id] }))
  return (
    <Section title="Amenities" intro={`Tick everything guests can use. Guests filter by these on ${site.marketplace}.`}>
      {amenityGroups.map((g) => (
        <fieldset key={g.group}>
          <legend className="mb-2 font-display text-lg font-bold text-ink-900">{g.group}</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((a) => (
              <Chip key={a.id} on={l.amenities.includes(a.id)} onClick={() => toggle(a.id)}>
                {a.label}
              </Chip>
            ))}
          </div>
        </fieldset>
      ))}
    </Section>
  )
}

const newRoom = (): ListingRoom => ({ id: uid(6), name: '', bed: 'Double bed', sizeSqft: 150, maxGuests: 2, count: 1, price: 0, breakfast: false, amenities: ['AC', 'TV', 'Wi-Fi'] })

function Rooms({ l, set, goPhotos }: { l: Listing; set: Set; goPhotos: () => void }) {
  const up = (id: string, p: Partial<ListingRoom>) => set((x) => ({ ...x, rooms: x.rooms.map((r) => (r.id === id ? { ...r, ...p } : r)) }))
  const roomPhotos = l.photos.filter((p) => p.tag === 'Room')
  useEffect(() => {
    if (l.rooms.length === 0) set((x) => ({ ...x, rooms: [newRoom()] }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const net = (p: number) => p - p * site.commissionRate - p * site.commissionRate * site.gstOnCommission
  return (
    <Section title="Rooms and prices" intro="Add each kind of room you sell. Prices are per night, before GST. You can change single dates later in Rates and availability.">
      {l.rooms.map((r, i) => (
        <fieldset key={r.id} className="panel flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <legend className="font-display text-lg font-bold">{r.name.trim() || `Room type ${i + 1}`}</legend>
            {l.rooms.length > 1 && (
              <button type="button" onClick={() => set((x) => ({ ...x, rooms: x.rooms.filter((y) => y.id !== r.id) }))} className="flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-ink-500 hover:bg-alert-50 hover:text-alert">
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              Room name
              <input className="field" value={r.name} onChange={(e) => up(r.id, { name: e.target.value })} placeholder="e.g. Deluxe Double Room" maxLength={50} />
            </label>
            <label className="label">
              Bed
              <select className="field" value={r.bed} onChange={(e) => up(r.id, { bed: e.target.value })}>
                {bedTypes.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 items-end gap-3">
            <label className="label">
              Size (sq ft)
              <input className="field" type="number" min={60} value={r.sizeSqft || ''} onChange={(e) => up(r.id, { sizeSqft: Number(e.target.value) })} />
            </label>
            <label className="label">
              Max guests
              <input className="field" type="number" min={1} max={10} value={r.maxGuests || ''} onChange={(e) => up(r.id, { maxGuests: Number(e.target.value) })} />
            </label>
            <label className="label">
              Rooms of this type
              <input className="field" type="number" min={1} max={500} value={r.count || ''} onChange={(e) => up(r.id, { count: Number(e.target.value) })} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="label">
              Price per night (₹, before GST)
              <input className="field text-lg font-bold" type="number" min={site.minPrice} step={50} value={r.price || ''} onChange={(e) => up(r.id, { price: Number(e.target.value) })} />
              {r.price >= site.minPrice ? (
                <span className="text-[13px] font-normal text-ink-500">You receive about {inr(net(r.price))} a night after commission and its GST.</span>
              ) : (
                err(r.price > 0, `The lowest price ${site.marketplace} accepts is ${inr(site.minPrice)}.`)
              )}
            </label>
            <label className="label">
              Price before discount (optional)
              <input className="field" type="number" min={0} step={50} value={r.mrp || ''} onChange={(e) => up(r.id, { mrp: Number(e.target.value) || undefined })} />
              <span className="text-[13px] font-normal text-ink-500">Shown crossed out when higher than your price. Use your real rack rate.</span>
            </label>
          </div>
          <Toggle checked={r.breakfast} onChange={(v) => up(r.id, { breakfast: v })} label="Breakfast included" hint="Shows “Free breakfast” on this room." />
          <div>
            <span className="mb-2 block text-sm font-semibold text-ink-700">In the room</span>
            <div className="flex flex-wrap gap-2">
              {roomAmenities.map((a) => (
                <Chip key={a} on={r.amenities.includes(a)} onClick={() => up(r.id, { amenities: r.amenities.includes(a) ? r.amenities.filter((x) => x !== a) : [...r.amenities, a] })}>
                  {a}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold text-ink-700">Photo for this room type</span>
            {roomPhotos.length ? (
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Photo for ${r.name || `room type ${i + 1}`}`}>
                {roomPhotos.map((p) => (
                  <button key={p.id} type="button" role="radio" aria-checked={r.photoId === p.id} aria-label="Room photo" onClick={() => up(r.id, { photoId: p.id })} className={`h-16 w-24 overflow-hidden rounded-lg ring-offset-2 ${r.photoId === p.id ? 'ring-3 ring-brass-500' : 'ring-1 ring-line'}`}>
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">
                Upload room photos in the{' '}
                <button type="button" className="font-bold text-pine-800 underline" onClick={goPhotos}>
                  Photos
                </button>{' '}
                step, then pick one here.
              </p>
            )}
          </div>
        </fieldset>
      ))}
      <button type="button" className="btn-ghost self-start" onClick={() => set((x) => ({ ...x, rooms: [...x.rooms, newRoom()] }))}>
        <Plus className="h-4 w-4" aria-hidden="true" /> Add another room type
      </button>
    </Section>
  )
}

function Photos({ l, set }: { l: Listing; set: Set }) {
  const onChange = useCallback((photos: Listing['photos']) => set((x) => ({ ...x, photos, rooms: x.rooms.map((r) => (photos.some((p) => p.id === r.photoId) ? r : { ...r, photoId: undefined })) })), [set])
  return (
    <Section title="Photos" intro="Bright, straight photos of the building, the reception and every room type. Put your best photo first.">
      <PhotoManager photos={l.photos} onChange={onChange} />
    </Section>
  )
}

function Policies({ l, set }: { l: Listing; set: Set }) {
  const p = l.policies
  const up = (x: Partial<Listing['policies']>) => set((y) => ({ ...y, policies: { ...y.policies, ...x } }))
  return (
    <Section title="Policies" intro="These appear under Property Rules on your hotel page and in every booking confirmation.">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          Check-in from
          <select className="field" value={p.checkIn} onChange={(e) => up({ checkIn: e.target.value })}>
            {checkTimes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="label">
          Check-out by
          <select className="field" value={p.checkOut} onChange={(e) => up({ checkOut: e.target.value })}>
            {checkTimes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold text-ink-700">Cancellation</legend>
        {cancellationOptions.map((c) => (
          <label key={c.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 ${p.cancellation === c.id ? 'border-pine-800 bg-pine-50' : 'border-line-strong bg-white'}`}>
            <input type="radio" name="cancel" checked={p.cancellation === c.id} onChange={() => up({ cancellation: c.id })} className="h-4 w-4 accent-pine-800" />
            <span className="font-semibold">{c.label}</span>
          </label>
        ))}
        <span className="text-[13px] text-ink-500">Free cancellation brings noticeably more bookings on {site.marketplace}.</span>
      </fieldset>
      <div className="grid gap-3 lg:grid-cols-2">
        <Toggle checked={p.payAtHotel} onChange={(v) => up({ payAtHotel: v })} label="Guests can pay at the hotel" hint="Cash, card or UPI at check-in." />
        <Toggle checked={p.coupleFriendly} onChange={(v) => up({ coupleFriendly: v })} label="Unmarried couples welcome" hint="Shows the “Couple friendly” tag." />
        <Toggle checked={p.localIds} onChange={(v) => up({ localIds: v })} label="Local IDs accepted" hint="Guests from the same city can stay." />
        <Toggle checked={p.pets} onChange={(v) => up({ pets: v })} label="Pets allowed" />
        <Toggle checked={p.smoking} onChange={(v) => up({ smoking: v })} label="Smoking allowed in designated areas" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          Children stay free up to age
          <input className="field" type="number" min={0} max={17} value={p.childrenFreeAge} onChange={(e) => up({ childrenFreeAge: Math.max(0, Math.min(17, Number(e.target.value))) })} />
        </label>
        <label className="label">
          Extra bed per night (₹, 0 if not offered)
          <input className="field" type="number" min={0} step={50} value={p.extraBed} onChange={(e) => up({ extraBed: Math.max(0, Number(e.target.value)) })} />
        </label>
      </div>
      <label className="label">
        Your own house rules (one per line)
        <textarea className="field min-h-[110px]" value={p.rules.join('\n')} onChange={(e) => up({ rules: e.target.value.split('\n').slice(0, 8) })} placeholder={'Visitors are not allowed in rooms after 10 PM.\nOutside food is allowed.'} />
      </label>
      <div className="rounded-xl bg-white p-4 ring-1 ring-line">
        <span className="text-sm font-semibold text-ink-700">Guests will read</span>
        <ul className="mt-2 list-disc pl-5 text-[15px] text-ink-700">
          {guestRules(l).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

function Legal({ l, set }: { l: Listing; set: Set }) {
  const g = l.legal
  const up = (x: Partial<Listing['legal']>) => set((y) => ({ ...y, legal: { ...y.legal, ...x } }))
  const [acct, setAcct] = useState('')
  const gErr = g.gstin ? gstinError(g.gstin) : ''
  return (
    <Section title="Business and payout" intro="Used on commission invoices and for payouts. Only the details below are kept.">
      <label className="label">
        Registered business or owner name
        <input className="field" value={g.legalName} onChange={(e) => up({ legalName: e.target.value })} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          GSTIN (optional)
          <input className="field uppercase" maxLength={15} value={g.gstin} onChange={(e) => up({ gstin: e.target.value.toUpperCase() })} aria-invalid={!!gErr && g.gstin.length === 15} />
          {g.gstin.length === 15 && (gErr ? err(true, gErr) : <span className="text-[13px] font-semibold text-live">Valid format, registered in {gstinState(g.gstin)}.</span>)}
          {isDemoMode && !g.gstin && (
            <span className="text-[13px] font-normal text-ink-500">
              Demo test GSTIN:{' '}
              <button type="button" className="font-bold text-pine-800 underline" onClick={() => up({ gstin: demoIds.gstin, pan: g.pan || demoIds.pan })}>
                {demoIds.gstin}
              </button>
            </span>
          )}
        </label>
        <label className="label">
          PAN (optional)
          <input className="field uppercase" maxLength={10} value={g.pan} onChange={(e) => up({ pan: e.target.value.toUpperCase() })} />
          {err(g.pan.length === 10 && !!panError(g.pan), panError(g.pan))}
        </label>
      </div>
      <label className="label">
        Proof of ownership or lease (optional now, needed before first payout)
        <input type="file" accept=".pdf,image/*" className="field py-2.5" onChange={(e) => up({ ownershipDoc: e.target.files?.[0]?.name })} />
        {g.ownershipDoc && <span className="text-[13px] font-semibold text-live">Attached: {g.ownershipDoc}</span>}
        <span className="text-[13px] font-normal text-ink-500">Electricity bill, property tax receipt or rent agreement.{isDemoMode ? ' In demo mode only the file name is kept.' : ''}</span>
      </label>

      <h3 className="mt-2 font-display text-lg font-bold">Payout bank account</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          Account holder name
          <input className="field" value={g.payoutName} onChange={(e) => up({ payoutName: e.target.value })} />
        </label>
        <label className="label">
          Bank name
          <input className="field" value={g.bankName} onChange={(e) => up({ bankName: e.target.value })} />
        </label>
        <label className="label">
          IFSC
          <input className="field uppercase" maxLength={11} value={g.ifsc} onChange={(e) => up({ ifsc: e.target.value.toUpperCase() })} />
          {err(g.ifsc.length === 11 && !!ifscError(g.ifsc), ifscError(g.ifsc))}
        </label>
        <label className="label">
          Account number
          <input
            className="field"
            inputMode="numeric"
            autoComplete="off"
            value={acct}
            placeholder={g.accountLast4 ? `Saved, ending ${g.accountLast4}` : ''}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 18)
              setAcct(v)
              if (v.length >= 9) up({ accountLast4: v.slice(-4) })
            }}
          />
          <span className="text-[13px] font-normal text-ink-500">Only the last 4 digits are stored here. The payments partner confirms the full number when payouts start.</span>
        </label>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line-strong bg-white p-4">
        <input type="checkbox" checked={g.agreed} onChange={(e) => up({ agreed: e.target.checked })} className="mt-1 h-5 w-5 accent-pine-800" />
        <span>
          <span className="block font-semibold">I own this property or am authorised to list it, and I accept the partner terms.</span>
          <span className="text-sm text-ink-500">
            Commission {Math.round(site.commissionRate * 100)}% of the room amount on completed stays, plus GST. Payouts {site.payoutCycle}. [Partner terms document to be added by the client.]
          </span>
        </span>
      </label>
    </Section>
  )
}

function ListingPreview({ l }: { l: Listing }) {
  const h = toHotel(l)
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-panel ring-1 ring-line">
      <div className="aspect-[16/9] bg-pine-50">{h.photos[0] ? <img src={h.photos[0]} alt="Cover" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-sm text-ink-500">Cover photo</span>}</div>
      <div className="flex flex-col gap-1 p-4">
        <span className="text-[13px] font-semibold text-ink-500">Partner Hotel, new on {site.marketplace}</span>
        <strong className="font-display text-xl">{h.name || 'Your property name'}</strong>
        <span className="flex items-center gap-1 text-sm text-ink-500">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /> {[h.area, h.city].filter(Boolean).join(', ') || 'Area, city'}
          {h.nearby[0] ? `, ${h.distance}` : ''}
        </span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {h.tags.map((t) => (
            <span key={t} className="rounded-md bg-pine-50 px-2 py-0.5 text-xs font-bold text-pine-800">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-2 border-t border-line pt-2 text-right">
          <strong className="text-xl">{fromPrice(l) ? inr(fromPrice(l)) : '₹—'}</strong>
          <span className="block text-xs text-ink-500">per night, before GST</span>
        </div>
      </div>
    </div>
  )
}

function Review({ l, go, onPublish, busy, result, onRetry }: { l: Listing; go: (s: StepId) => void; onPublish: () => void; busy: boolean; result: string; onRetry: () => void }) {
  const b = blockers(l)
  const t = tips(l)
  const live = l.status !== 'draft'
  const url = `${site.mainSiteUrl}/hotel/${l.slug}`
  return (
    <Section title={live ? 'Your listing' : 'Review and publish'} intro={live ? `Changes you save are sent to ${site.marketplace} straight away.` : `Fix the items below, then publish. Your hotel appears on ${site.marketplace} as soon as the checks pass.`}>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          {live && l.sync && !l.sync.ok && (
            <Notice tone="warn">
              <strong className="block">Not on {site.marketplace} yet</strong>
              {l.sync.message}
              <button type="button" onClick={onRetry} className="mt-2 block font-bold text-pine-900 underline">
                Retry
              </button>
            </Notice>
          )}
          {live && l.sync?.ok && (
            <Notice tone="ok">
              <strong className="block">{l.status === 'live' ? `Live on ${site.marketplace}` : 'Paused, hidden from guests'}</strong>
              <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-pine-900">
                Open your hotel page <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Notice>
          )}
          {result && <Notice tone="error">{result}</Notice>}
          <div className="panel p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold">
              {b.length ? <CircleAlert className="h-5 w-5 text-alert" aria-hidden="true" /> : <Check className="h-5 w-5 text-live" aria-hidden="true" />}
              {b.length ? `${b.length} to fix before publishing` : 'Ready to publish'}
            </h3>
            {b.length > 0 && (
              <ul className="mt-3 divide-y divide-line">
                {b.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                    <span>{c.message}</span>
                    <button type="button" onClick={() => go(c.step)} className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-pine-800 hover:bg-pine-50">
                      Fix
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {t.length > 0 && (
            <div className="panel p-5">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                <Lightbulb className="h-5 w-5 text-brass-600" aria-hidden="true" /> To get more bookings
              </h3>
              <ul className="mt-3 divide-y divide-line">
                {t.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                    <span>{c.message}</span>
                    <button type="button" onClick={() => go(c.step)} className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-pine-800 hover:bg-pine-50">
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <span className="text-sm font-semibold text-ink-500">How guests will see it</span>
          <ListingPreview l={l} />
          <span className="text-sm text-ink-700">Listing quality {quality(l)}%</span>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-brass-500" style={{ width: `${quality(l)}%` }} />
          </div>
          {!live && (
            <button type="button" className="btn-brass mt-2 min-h-12 text-base" disabled={busy || b.length > 0} onClick={onPublish}>
              {busy ? 'Publishing…' : `Publish to ${site.marketplace}`}
            </button>
          )}
        </aside>
      </div>
    </Section>
  )
}

/* ---------------- wizard shell ---------------- */

export default function Wizard() {
  const { id = 'new' } = useParams()
  const [params, setParams] = useSearchParams()
  const { owner } = useSession()
  const navigate = useNavigate()
  const [l, setL] = useState<Listing | null | undefined>(undefined)
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved')
  const [saveError, setSaveError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState('')
  const [justPublished, setJustPublished] = useState<Listing | null>(null)
  const top = useRef<HTMLDivElement>(null)
  const step = (steps.some((s) => s.id === params.get('step')) ? params.get('step') : 'basics') as StepId
  const index = steps.findIndex((s) => s.id === step)

  // Open an existing listing, or create a fresh draft for /new.
  // The ref keeps React's development double-run from creating two drafts.
  const creating = useRef<Promise<Listing> | null>(null)
  useEffect(() => {
    if (!owner) return
    let live = true
    if (id === 'new') {
      creating.current ??= saveListing(blankListing(owner.id, { phone: owner.phone, email: owner.email, businessName: owner.businessName, gstin: owner.gstin }))
      creating.current.then((d) => live && navigate(`/app/properties/${d.id}/edit?step=basics`, { replace: true }))
    } else {
      creating.current = null
      getListing(owner.id, id).then((x) => live && setL(x))
    }
    return () => {
      live = false
    }
  }, [id, owner, navigate])

  const set: Set = useCallback((fn) => {
    setL((x) => (x ? fn(x) : x))
    setSaveState('dirty')
  }, [])

  const save = useCallback(async (x: Listing) => {
    setSaveState('saving')
    try {
      const saved = await saveListing(x)
      setL((cur) => (cur ? { ...cur, photos: saved.photos, sync: saved.sync, updatedAt: saved.updatedAt } : cur))
      setSaveState('saved')
      setSaveError('')
      return saved
    } catch (e) {
      setSaveState('error')
      setSaveError(e instanceof Error ? e.message : 'Couldn’t save.')
      return null
    }
  }, [])

  // Drafts save themselves a moment after each change. Live listings save on the button.
  const latest = useRef(l)
  latest.current = l
  useEffect(() => {
    if (!l || saveState !== 'dirty' || l.status !== 'draft') return
    const t = setTimeout(() => latest.current && save(latest.current), 900)
    return () => clearTimeout(t)
  }, [l, saveState, save])

  const go = (s: StepId) => {
    if (l && saveState === 'dirty' && l.status === 'draft') save(l)
    setParams({ step: s }, { replace: false })
    top.current?.scrollIntoView({ block: 'start' })
    window.scrollTo({ top: 0 })
  }

  const publish = async () => {
    if (!l) return
    setPublishing(true)
    setResult('')
    try {
      const p = await publishListing(l)
      setL(p)
      setSaveState('saved')
      setJustPublished(p)
    } catch (e) {
      setResult(e instanceof PublishError || e instanceof Error ? e.message : 'Couldn’t publish.')
    } finally {
      setPublishing(false)
    }
  }

  if (l === undefined || id === 'new') return <Spinner label={id === 'new' ? 'Starting your property' : 'Opening property'} />
  if (l === null)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold">Property not found</h1>
        <Link to="/app/properties" className="btn-primary mt-6">
          Back to properties
        </Link>
      </div>
    )

  const isLive = l.status !== 'draft'
  const stepBody = {
    basics: <Basics l={l} set={set} />,
    location: <Location l={l} set={set} />,
    amenities: <Amenities l={l} set={set} />,
    rooms: <Rooms l={l} set={set} goPhotos={() => go('photos')} />,
    photos: <Photos l={l} set={set} />,
    policies: <Policies l={l} set={set} />,
    legal: <Legal l={l} set={set} />,
    review: <Review l={l} go={go} onPublish={publish} busy={publishing} result={result} onRetry={async () => setL(await retrySync(l))} />,
  }[step]

  return (
    <div ref={top} className="flex min-h-dvh flex-col">
      <div className="sticky top-16 z-30 border-b border-line bg-white/95 backdrop-blur lg:top-0">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <Link to={isLive ? `/app/properties/${l.id}` : '/app/properties'} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-paper">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <strong className="block truncate font-display text-lg">{l.basics.name.trim() || 'New property'}</strong>
            <span className="text-[13px] text-ink-500" role="status">
              {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? `Not saved: ${saveError}` : saveState === 'dirty' ? (isLive ? 'Unsaved changes' : 'Saving soon…') : isLive ? 'All changes saved' : 'Draft saved'}
            </span>
          </div>
          <KeyTag status={l.status} />
          {isLive && (
            <button type="button" className="btn-primary hidden sm:inline-flex" disabled={saveState !== 'dirty'} onClick={() => save(l)}>
              Save changes
            </button>
          )}
        </div>
        <div className="h-1 bg-line">
          <div className="h-full bg-brass-500 transition-all" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[260px_1fr]">
        <nav aria-label="Steps" className="border-b border-line bg-white px-4 py-3 lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
          <label className="lg:hidden">
            <span className="sr-only">Step</span>
            <select className="field" value={step} onChange={(e) => go(e.target.value as StepId)}>
              {steps.map((s, i) => (
                <option key={s.id} value={s.id}>
                  Step {i + 1} of {steps.length}: {s.label}
                  {stepDone(l, s.id) && s.id !== 'review' ? ' (done)' : ''}
                </option>
              ))}
            </select>
          </label>
          <ol className="hidden flex-col gap-1 lg:flex">
            {steps.map((s, i) => {
              const done = stepDone(l, s.id)
              const on = s.id === step
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-current={on ? 'step' : undefined}
                    onClick={() => go(s.id)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-[15px] font-semibold ${on ? 'bg-pine-50 text-pine-900' : 'text-ink-700 hover:bg-paper'}`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${done && s.id !== 'review' ? 'bg-pine-800 text-white' : on ? 'bg-brass-500 text-pine-950' : 'bg-paper text-ink-500 ring-1 ring-line-strong'}`}>
                      {done && s.id !== 'review' ? <Check className="h-4 w-4" strokeWidth={3} aria-label="Done" /> : i + 1}
                    </span>
                    {s.label}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="min-w-0 px-4 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[920px]">{stepBody}</div>
        </div>
      </div>

      <div className="sticky bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8 lg:pl-[284px]">
          <button type="button" className="btn-ghost" disabled={index === 0} onClick={() => go(steps[index - 1].id)}>
            Back
          </button>
          <div className="flex gap-2">
            {isLive && (
              <button type="button" className="btn-primary sm:hidden" disabled={saveState !== 'dirty'} onClick={() => save(l)}>
                Save
              </button>
            )}
            {index < steps.length - 1 && (
              <button type="button" className={isLive ? 'btn-ghost' : 'btn-primary'} onClick={() => go(steps[index + 1].id)}>
                {isLive ? 'Next' : 'Save and continue'}
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {justPublished && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-pine-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="pub-h">
            <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md rounded-2xl bg-white p-7 text-center">
              <motion.div initial={{ rotate: -30, y: -14 }} animate={{ rotate: 6, y: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 8 }} style={{ transformOrigin: '50% 0%' }} className="mx-auto flex w-fit flex-col items-center" aria-hidden="true">
                <span className="h-6 w-px bg-ink-400" />
                <span className="relative flex h-[84px] w-[58px] items-end justify-center rounded-t-[12px] rounded-b-[29px] bg-brass-500 pb-3.5">
                  <span className="absolute top-2.5 h-3 w-3 rounded-full bg-white ring-2 ring-brass-700/40" />
                  <span className="font-display text-sm font-extrabold text-pine-950">Live</span>
                </span>
              </motion.div>
              <h2 id="pub-h" className="mt-5 text-2xl font-bold text-pine-950">
                {justPublished.sync?.ok ? `${justPublished.basics.name} is live on ${site.marketplace}` : 'Published, waiting to reach StayEasy'}
              </h2>
              <p className="mt-2 text-ink-700">
                {justPublished.sync?.ok ? 'Guests can find and book it now. Set your prices for busy dates next.' : justPublished.sync?.message}
              </p>
              <div className="mt-6 flex flex-col gap-2">
                {justPublished.sync?.ok ? (
                  <a href={`${site.mainSiteUrl}/hotel/${justPublished.slug}`} target="_blank" rel="noreferrer" className="btn-brass min-h-12">
                    Open your hotel page <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : (
                  <button type="button" className="btn-brass min-h-12" onClick={async () => setJustPublished(await retrySync(justPublished))}>
                    Retry
                  </button>
                )}
                <Link to="/app/calendar" className="btn-ghost min-h-12">
                  Set rates and availability
                </Link>
                <Link to={`/app/properties/${justPublished.id}`} className="btn-ghost min-h-12">
                  Go to property overview
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
