import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Baby, Ban, BedDouble, BedSingle, CalendarDays, Check, ChevronDown, CircleAlert, CircleCheck, Clock3, ExternalLink, IdCard, Info, Lightbulb, Lock, MapPin, PawPrint, Plus, Search, Star, Trash2, Upload, Users, UtensilsCrossed, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { CodeBoxes, Popup, useCountdown } from '../components/Auth'
import { AmenityExtrasBox, hasExtras, MultiSelect } from '../components/AmenityExtras'
import { answered, policyGroups, type HouseAnswers, type PolicyGroup, type PolicyRule } from '../data/policyRules'
import { BathPicker, BedPicker } from '../components/BedPicker'
import SearchSelect from '../components/SearchSelect'
import MapPicker, { placeAt, searchPlaces, type Place } from '../components/MapPicker'
import PhotoManager from '../components/PhotoManager'
import { PropertyTypePicker } from '../components/PropertyTypePicker'
import { Chip, KeyTag, Notice, Spinner } from '../components/ui'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { amenityGroups, banks, cities, bathCatalog, cancellationOptions, checkTimes, mealPlans, SHARED_BATH, timeLabel, roomAmenities, roomTypes, roomViews } from '../data/options'
import { inr, uid } from '../lib/format'
import { demoIds, gstinError, gstinState, ifscError, panError } from '../lib/gstin'
import { attachOptions, autoOccupancy, basicsErrors, legalErrors, legalSectionDone, legalSections, bedsOf, bedSummary, blockers, locationErrors, minAmenities, roomDone, roomErrors, roomSectionDone, roomSections, fromPrice, guestRules, quality, stepDone, steps, tips, toHotel, type StepId } from '../lib/listing'
import { checkContactCode, CONTACT_CODE_LENGTH, getListing, publishListing, PublishError, retrySync, saveListing, sendContactCode } from '../lib/store'
import { isDemoMode } from '../lib/supabase'
import type { BedLine, Listing, ListingRoom } from '../lib/types'

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


/* ---------------- steps ---------------- */

const years = Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => new Date().getFullYear() - i)
const channelManagers = ['STAAH', 'eZee Centrix', 'AxisRooms', 'SiteMinder', 'RateGain', 'Djubo', 'Other']

/** One line of the Basic Info card: the question on the left, the answer on the right. */
function Row({ title, help, error, children, id }: { title: string; help?: string; error?: string; children: ReactNode; id?: string }) {
  return (
    <div className="grid gap-3 border-t border-line px-4 py-5 first:border-t-0 sm:grid-cols-[1fr_minmax(0,480px)] sm:gap-8 sm:px-5">
      <div>
        <label htmlFor={id} className="block text-[16px] font-bold text-ink-900">
          {title}
        </label>
        {help && <p className="mt-0.5 text-[14px] text-ink-500">{help}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        {children}
        {error && (
          <span role="alert" className="text-[13px] font-semibold text-alert">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}

function Card({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-panel ring-1 ring-line">
      <div className="border-b border-line px-4 py-4 sm:px-5">
        <h3 className="text-[22px] font-bold text-ink-900">{title}</h3>
        {intro && <p className="text-[14px] text-ink-500">{intro}</p>}
      </div>
      {children}
    </section>
  )
}

/** "Verify your email ID / mobile number" pop-up: sends an OTP, then checks it. */
function VerifyOtp({ target, onClose, onVerified }: { target: { channel: 'email' | 'phone'; to: string } | null; onClose: () => void; onVerified: () => void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const timer = useCountdown(30)
  const send = useCallback(async (t: { channel: 'email' | 'phone'; to: string }) => {
    setError('')
    try {
      await sendContactCode(t.channel, t.to)
      timer.restart()
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Couldn’t send the OTP.')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!target) return
    setCode('')
    send(target)
  }, [target, send])
  const ok = new RegExp(`^\\d{${CONTACT_CODE_LENGTH}}$`).test(code)
  const shown = target ? (target.channel === 'phone' ? `+91 ${target.to}` : target.to) : ''
  return (
    <Popup open={!!target} onClose={onClose} mark={false} title={target?.channel === 'phone' ? 'Verify your mobile number' : 'Verify your email ID'} intro={`Enter the OTP sent to ${shown}`}>
      <form
        onSubmit={async (ev) => {
          ev.preventDefault()
          if (!target || !ok) return
          setBusy(true)
          setError('')
          try {
            await checkContactCode(target.channel, target.to, code)
            onVerified()
          } catch (x) {
            setError(x instanceof Error ? x.message : 'That OTP didn’t work.')
          } finally {
            setBusy(false)
          }
        }}
        className="flex flex-col gap-4"
      >
        {target && <CodeBoxes key={target.channel + target.to} value={code} onChange={setCode} length={CONTACT_CODE_LENGTH} />}
        {timer.left > 0 ? (
          <span className="text-[13px] font-semibold text-pine-700/60">Resend OTP in 0:{String(timer.left).padStart(2, '0')} seconds</span>
        ) : (
          <button type="button" className="self-start text-[13px] font-bold text-pine-800 hover:underline" onClick={() => target && send(target)}>
            Resend OTP
          </button>
        )}
        {isDemoMode && <span className="rounded-lg bg-pine-50 px-3 py-2 text-[13px] text-pine-900">Demo mode: nothing is sent, any {CONTACT_CODE_LENGTH} digits work.</span>}
        {error && (
          <p role="alert" className="text-[13px] font-semibold text-alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-brass min-h-12" disabled={busy || !ok}>
          {busy ? 'Checking…' : 'Verify'}
        </button>
      </form>
    </Popup>
  )
}

function VerifiedBadge() {
  return (
    <span className="flex items-center gap-1 text-[13px] font-bold text-live">
      <CircleCheck className="h-4 w-4 fill-live text-white" aria-hidden="true" /> Verified
    </span>
  )
}

function Basics({ l, set, show, onChangeType }: { l: Listing; set: Set; show: boolean; onChangeType: () => void }) {
  const b = l.basics
  const up = (p: Partial<Listing['basics']>) => set((x) => ({ ...x, basics: { ...x.basics, ...p } }))
  const e = show ? basicsErrors(l) : {}
  const [target, setTarget] = useState<{ channel: 'email' | 'phone'; to: string } | null>(null)
  const email = b.email.trim().toLowerCase()
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const emailVerified = emailOk && b.emailVerified === email
  const phoneOk = /^[6-9]\d{9}$/.test(b.phone)
  const phoneVerified = phoneOk && b.phoneVerified === b.phone
  const sameWa = b.whatsappSame !== false
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[32px] font-black text-ink-900">Basic Info</h2>
        <span className="flex items-center gap-2 text-[14px] text-ink-700">
          Property type: <strong className="text-ink-900">{b.propertyType}</strong>
          {b.category && <span className="text-ink-500">({b.category === 'hotel' ? 'Hotel' : 'Homestays & Villas'})</span>}
          <button type="button" onClick={onChangeType} className="font-bold text-pine-800 hover:underline">
            Change
          </button>
        </span>
      </div>

      <Card title="Property Details" intro="Update your property details here">
        <Row id="b-name" title="Name of the property" help="Enter the name as on the property documents" error={e.name}>
          <input id="b-name" className="field" value={b.name} onChange={(x) => up({ name: x.target.value })} placeholder="Enter the full name" maxLength={70} aria-invalid={!!e.name} />
        </Row>
        {b.category !== 'homestay' && (
          <Row id="b-stars" title="Hotel star rating" error={e.stars}>
            <select id="b-stars" className="field" value={b.starsChosen ? String(b.stars) : ''} onChange={(x) => up({ stars: Number(x.target.value), starsChosen: x.target.value !== '' })} aria-invalid={!!e.stars}>
              <option value="" disabled hidden>Select rating</option>
              <option value="0">Not rated</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} star
                </option>
              ))}
            </select>
          </Row>
        )}
        <Row id="b-built" title="When was the property built?" error={e.yearBuilt}>
          <select id="b-built" className="field" value={b.yearBuilt ?? ''} onChange={(x) => up({ yearBuilt: Number(x.target.value) || undefined })} aria-invalid={!!e.yearBuilt}>
            <option value="" disabled hidden>Select a year</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </Row>
        <Row id="b-since" title="Accepting bookings since?" help="Since when guests have been able to book this property" error={e.bookingSince}>
          <select id="b-since" className="field" value={b.bookingSince ?? ''} onChange={(x) => up({ bookingSince: Number(x.target.value) || undefined })} aria-invalid={!!e.bookingSince}>
            <option value="" disabled hidden>Select a year</option>
            {years.filter((y) => !b.yearBuilt || y >= b.yearBuilt).map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </Row>
        <Row title="Do you work with a channel manager?" help="A channel manager updates your rooms and rates across travel websites in one go" error={e.channel ?? e.channelName}>
          <div role="radiogroup" aria-label="Channel manager" className="flex min-h-[46px] items-center gap-8">
            {[
              [false, 'No'],
              [true, 'Yes'],
            ].map(([v, t]) => (
              <label key={t as string} className="flex cursor-pointer items-center gap-2.5 text-[16px] text-ink-900">
                <input type="radio" name="cm" checked={b.channelManager === v} onChange={() => up({ channelManager: v as boolean, channelManagerName: v ? b.channelManagerName : '' })} className="h-5 w-5 accent-pine-800" />
                {t as string}
              </label>
            ))}
          </div>
          {b.channelManager && (
            <select className="field" aria-label="Which channel manager" value={b.channelManagerName ?? ''} onChange={(x) => up({ channelManagerName: x.target.value })} aria-invalid={!!e.channelName}>
              <option value="" disabled hidden>Select your channel manager</option>
              {channelManagers.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
        </Row>

        <div className="border-t border-line bg-[#f1f3f1] px-4 pt-6 pb-4 sm:px-5">
          <h3 className="text-[20px] font-bold text-ink-900">Contact details to be shared with guests</h3>
          <p className="text-[14px] text-ink-500">Guests see these details after they book</p>
        </div>
        <Row id="b-email" title="Email ID" error={e.email}>
          <span className="relative">
            <input id="b-email" className={`field pr-28 ${emailVerified ? 'bg-pine-50/60' : ''}`} type="email" value={b.email} onChange={(x) => up({ email: x.target.value })} placeholder="Enter email ID" aria-invalid={!!e.email} />
            <span className="absolute top-1/2 right-2 -translate-y-1/2">
              {emailVerified ? (
                <VerifiedBadge />
              ) : (
                <button type="button" onClick={() => setTarget({ channel: 'email', to: email })} disabled={!emailOk} className="rounded-md px-2 py-1 text-[14px] font-bold text-pine-800 hover:bg-pine-50 disabled:text-ink-400">
                  Verify
                </button>
              )}
            </span>
          </span>
        </Row>
        <Row id="b-phone" title="Mobile number" error={e.phone ?? e.whatsapp}>
          <span className={`flex overflow-hidden rounded-[10px] border focus-within:border-pine-700 ${phoneVerified ? 'border-line bg-[#eef0ee]' : e.phone ? 'border-alert bg-white' : 'border-line-strong bg-white'}`}>
            <span className={`flex items-center px-3 text-sm font-bold ${phoneVerified ? 'text-ink-400' : 'bg-paper text-ink-700'}`}>+91</span>
            <input
              id="b-phone"
              className="min-h-[46px] min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none disabled:text-ink-700"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10-digit mobile number"
              disabled={phoneVerified}
              value={b.phone}
              onChange={(x) => up({ phone: x.target.value.replace(/\D/g, '').slice(0, 10) })}
            />
            <span className="flex items-center pr-3">
              {phoneVerified ? (
                <VerifiedBadge />
              ) : (
                <button type="button" onClick={() => setTarget({ channel: 'phone', to: b.phone })} disabled={!phoneOk} className="rounded-md px-2 py-1 text-[14px] font-bold text-pine-800 hover:bg-pine-50 disabled:text-ink-400">
                  Verify
                </button>
              )}
            </span>
          </span>
          {phoneVerified && (
            <button type="button" onClick={() => up({ phoneVerified: undefined })} className="self-end text-[14px] font-bold text-pine-800 hover:underline">
              Change
            </button>
          )}
          <label className="mt-1 flex cursor-pointer items-center gap-2.5 text-[14px] text-ink-900">
            <input type="checkbox" checked={sameWa} onChange={(x) => up({ whatsappSame: x.target.checked })} className="h-4 w-4 accent-pine-800" />
            Use the same mobile number for WhatsApp.
          </label>
          {!sameWa && (
            <span className="flex overflow-hidden rounded-[10px] border border-line-strong bg-white focus-within:border-pine-700">
              <span className="flex items-center bg-paper px-3 text-sm font-bold text-ink-700">+91</span>
              <input aria-label="WhatsApp number" className="min-h-[46px] min-w-0 flex-1 px-3 text-[15px] outline-none" inputMode="numeric" placeholder="WhatsApp number" value={b.whatsapp ?? ''} onChange={(x) => up({ whatsapp: x.target.value.replace(/\D/g, '').slice(0, 10) })} />
            </span>
          )}
        </Row>
        <Row id="b-land" title="Landline number (Optional)" error={e.landline}>
          <input id="b-land" className="field" inputMode="tel" placeholder="Eg: 0124 4637 3533" value={b.landline ?? ''} onChange={(x) => up({ landline: x.target.value.replace(/[^\d\s-]/g, '').slice(0, 14) })} />
        </Row>
      </Card>

      <VerifyOtp
        target={target}
        onClose={() => setTarget(null)}
        onVerified={() => {
          if (target?.channel === 'email') up({ emailVerified: target.to })
          if (target?.channel === 'phone') up({ phoneVerified: target.to })
          setTarget(null)
        }}
      />
    </section>
  )
}

function Location({ l, set, show }: { l: Listing; set: Set; show: boolean }) {
  const loc = l.location
  const up = (p: Partial<Listing['location']>) => set((x) => ({ ...x, location: { ...x.location, ...p } }))
  const e = show ? locationErrors(l) : {}
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [note, setNote] = useState('')
  const [manual, setManual] = useState(false)
  // The text put in the box after picking a place; it shouldn't trigger a new search.
  const picked = useRef('')
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const out = (ev: MouseEvent) => !box.current?.contains(ev.target as Node) && setOpen(false)
    document.addEventListener('mousedown', out)
    return () => document.removeEventListener('mousedown', out)
  }, [])
  const showFields = manual || !!(loc.address || loc.area || loc.pincode || loc.city)

  // Suggestions a moment after the owner stops typing.
  useEffect(() => {
    const text = q.trim()
    if (text.length < 3 || q === picked.current) {
      setResults([])
      return
    }
    const ctl = new AbortController()
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const near = loc.lat != null && loc.lng != null ? { lat: loc.lat, lng: loc.lng } : undefined
        setResults(await searchPlaces(text, near, ctl.signal))
        setOpen(true)
        setNote('')
      } catch {
        if (!ctl.signal.aborted) setNote('Address search isn’t reachable right now. Enter the address below and tap your entrance on the map.')
      } finally {
        if (!ctl.signal.aborted) setSearching(false)
      }
    }, 350)
    return () => {
      clearTimeout(t)
      ctl.abort()
    }
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const fill = (p: Place) =>
    up({ address: p.house || loc.address, area: p.locality, pincode: p.pincode, city: p.city, state: p.state, country: p.country || 'India', lat: p.lat, lng: p.lng })

  const pick = (p: Place) => {
    picked.current = p.label
    setResults([])
    setQ(p.label)
    setOpen(false)
    fill(p)
    setNote('Check the details below and drag the pin onto your entrance if needed.')
  }

  const current = () => {
    if (!('geolocation' in navigator)) return setNote('This browser can’t share your location. Search your address instead.')
    setLocating(true)
    setNote('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        up({ lat, lng })
        try {
          const p = await placeAt(lat, lng)
          if (p) {
            picked.current = p.label
            setOpen(false)
            setQ(p.label)
            fill(p)
          } else setManual(true)
          setNote('Pin placed at your current location. Check the address below.')
        } catch {
          setManual(true)
          setNote('Pin placed at your current location. Enter the address below.')
        } finally {
          setLocating(false)
        }
      },
      (err) => {
        setLocating(false)
        setNote(err.code === err.PERMISSION_DENIED ? 'Location permission was blocked. Allow it in the browser, or search your address.' : 'Couldn’t get your location. Search your address instead.')
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  const onPin = useCallback((lat: number, lng: number) => set((x) => ({ ...x, location: { ...x.location, lat, lng } })), [set])
  const text = (id: string, label: string, key: 'address' | 'area' | 'pincode' | 'state' | 'city', placeholder = 'Please add details', extra?: object) => (
    <label className="flex flex-col gap-1.5 text-[15px] text-ink-900">
      {label}
      <input id={id} className="field" value={(loc[key] as string | undefined) ?? ''} placeholder={placeholder} onChange={(x) => up({ [key]: key === 'pincode' ? x.target.value.replace(/\D/g, '').slice(0, 6) : x.target.value })} aria-invalid={!!e[key]} {...extra} />
      {e[key] && (
        <span role="alert" className="text-[13px] font-semibold text-alert">
          {e[key]}
        </span>
      )}
    </label>
  )

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-[30px] font-black text-ink-900 sm:text-[32px]">Property Location Details</h2>
        <p className="text-[14px] text-ink-500">Please fill in the location details of your property.</p>
      </div>
      <div className="grid items-start gap-6 rounded-xl bg-white p-4 shadow-panel ring-1 ring-line sm:p-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <p className="flex gap-2 rounded-md border border-pine-100 bg-pine-50 px-3 py-2 text-[13px] text-ink-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-pine-800" aria-hidden="true" />
            Please enter the same address as on your address proof document (to be uploaded in a later step), to avoid rejections due to mismatch.
          </p>
          <div ref={box} className="relative">
            <span className={`flex items-center gap-2 rounded-lg border bg-white px-3 focus-within:border-pine-700 focus-within:shadow-[0_0_0_3px_var(--color-pine-100)] ${open && results.length ? 'rounded-b-none' : ''} border-line-strong`}>
              <Search className="h-5 w-5 shrink-0 text-ink-500" aria-hidden="true" />
              <input
                role="combobox"
                aria-expanded={open && results.length > 0}
                aria-controls="place-list"
                aria-label="Search your property address"
                className="min-h-[46px] min-w-0 flex-1 text-[15px] outline-none"
                placeholder="Search here"
                value={q}
                onChange={(x) => setQ(x.target.value)}
                onFocus={() => results.length && setOpen(true)}
                onKeyDown={(x) => {
                  if (x.key === 'Enter' && results[0]) {
                    x.preventDefault()
                    pick(results[0])
                  }
                  if (x.key === 'Escape') setOpen(false)
                }}
              />
              {searching && <span className="text-[12px] text-ink-400">Searching…</span>}
              {q && (
                <button type="button" aria-label="Clear search" onClick={() => (setQ(''), setResults([]))} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-paper">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </span>
            {open && results.length > 0 && (
              <ul id="place-list" role="listbox" className="absolute inset-x-0 top-full z-[600] max-h-72 overflow-y-auto rounded-b-lg border border-t-0 border-line-strong bg-white shadow-lift">
                {results.map((r) => (
                  <li key={`${r.lat},${r.lng},${r.label}`} role="option" aria-selected="false">
                    <button type="button" onClick={() => pick(r)} className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-[14px] hover:bg-pine-50">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" aria-hidden="true" />
                      <span>{r.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="-mt-1 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={current} disabled={locating} className="text-[15px] font-bold text-pine-800 hover:underline disabled:opacity-60">
              {locating ? 'Finding your location…' : 'Or Use My Current Location'}
            </button>
            {!showFields && (
              <button type="button" onClick={() => setManual(true)} className="text-[13px] font-semibold text-ink-500 hover:text-ink-900 hover:underline">
                Can’t find it? Enter manually
              </button>
            )}
          </div>
          {note && (
            <p role="status" className="text-[13px] text-ink-700">
              {note}
            </p>
          )}

          {showFields && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              {text('l-house', 'House/Building/Apartment No.', 'address', 'Please add details', { autoComplete: 'address-line1' })}
              {text('l-area', 'Locality/Area/Street/Sector', 'area', 'Please add details', { autoComplete: 'address-line2' })}
              <div className="grid gap-4 sm:grid-cols-2">
                {text('l-pin', 'Pincode', 'pincode', '6-digit pincode', { inputMode: 'numeric', autoComplete: 'postal-code' })}
                <label className="flex flex-col gap-1.5 text-[15px] text-ink-900">
                  Country
                  <input className="field bg-paper text-ink-700" value="India" readOnly />
                </label>
              </div>
              {text('l-state', 'State', 'state', 'Please add details', { autoComplete: 'address-level1' })}
              {text('l-city', 'City', 'city', 'Please add details', { autoComplete: 'address-level2' })}
              {loc.city.trim() && !cities.some((c) => c.name.toLowerCase() === loc.city.trim().toLowerCase()) && (
                <p role="status" className="-mt-2 flex items-start gap-2 rounded-lg border border-brass-200 bg-brass-50 px-3 py-2.5 text-[13.5px] text-ink-700">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-brass-700" aria-hidden="true" />
                  <span>
                    {site.marketplace} isn’t open in <strong>{loc.city.trim()}</strong> yet. It currently covers {cities.map((c) => c.name).join(', ')}. If your property is in one of these cities, correct the city. Otherwise you can finish the listing, and ask the {site.marketplace} team to add {loc.city.trim()} so it can go live.
                  </span>
                </p>
              )}
              {e.pin && (
                <span role="alert" className="text-[13px] font-semibold text-alert">
                  {e.pin}
                </span>
              )}
              <label className="flex cursor-pointer items-start gap-3 text-[14px] text-ink-900">
                <input type="checkbox" checked={!!loc.addressConfirmed} onChange={(x) => up({ addressConfirmed: x.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-pine-800" aria-invalid={!!e.confirm} />
                <span>I agree to the {site.marketplace} partner terms and confirm the address provided here is as per the registration or lease document.</span>
              </label>
              {e.confirm && (
                <span role="alert" className="-mt-2 text-[13px] font-semibold text-alert">
                  {e.confirm}
                </span>
              )}
            </motion.div>
          )}
        </div>
        <div className="lg:sticky lg:top-[200px]">
          <MapPicker lat={loc.lat} lng={loc.lng} onPin={onPin} onLocate={current} locating={locating} />
          <span className="mt-2 block text-[13px] text-ink-500">{loc.lat != null ? 'Drag the pin onto your entrance, or tap the map to move it.' : 'Tap the map to place your pin.'}</span>
        </div>
      </div>
    </section>
  )
}

/** How many tiles fit in a row at the current width (matches the grid below). */
function useColumns() {
  const get = () => (typeof window === 'undefined' ? 3 : window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1)
  const [n, setN] = useState(get)
  useEffect(() => {
    const on = () => setN(get())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return n
}

/** How many amenities the star rating asks for, with progress. Not-rated properties may skip. */
function RatingRule({ l }: { l: Listing }) {
  const need = minAmenities(l)
  const have = l.amenities.length
  if (!need)
    return (
      <div className="flex items-start gap-3 rounded-xl border border-pine-100 bg-pine-50 px-4 py-3 text-[14.5px] text-pine-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <span>
          <strong>{l.basics.category === 'homestay' ? 'Homestays and villas' : 'Not star-rated properties'} can skip this step.</strong> Tick what you have if you like, or press <strong>Skip</strong> below.
        </span>
      </div>
    )
  const done = have >= need
  return (
    <div className={`flex flex-col gap-2 rounded-xl border px-4 py-3 ${done ? 'border-pine-100 bg-pine-50' : 'border-brass-200 bg-brass-50'}`}>
      <span className="flex flex-wrap items-baseline justify-between gap-2 text-[14.5px] text-ink-900">
        <span>
          <strong>
            {l.basics.stars}-star {l.basics.propertyType.toLowerCase()}:
          </strong>{' '}
          tick at least {need} amenities.
        </span>
        <strong className={done ? 'text-live' : 'text-brass-700'} role="status">
          {Math.min(have, need)} of {need}
          {done ? ' done' : ''}
        </strong>
      </span>
      <span className="h-1.5 overflow-hidden rounded-full bg-white">
        <span className={`block h-full rounded-full transition-all ${done ? 'bg-live' : 'bg-brass-500'}`} style={{ width: `${Math.min(100, (have / need) * 100)}%` }} />
      </span>
    </div>
  )
}

function Amenities({ l, set }: { l: Listing; set: Set }) {
  const cols = useColumns()
  const [justTicked, setJustTicked] = useState('')
  const toggle = (id: string) => {
    const on = l.amenities.includes(id)
    if (!on) setJustTicked(id)
    set((x) => ({ ...x, amenities: on ? x.amenities.filter((a) => a !== id) : [...x.amenities, id] }))
  }
  return (
    <Section title="Amenities" intro={`Tick everything guests can use. Guests filter by these on ${site.marketplace}.`}>
      <RatingRule l={l} />
      {amenityGroups.map((g) => {
        const ticked = g.items.filter((a) => l.amenities.includes(a.id)).length
        // Tiles stay in their rows; the details of ticked tiles open under the row they sit in.
        const rows = Array.from({ length: Math.ceil(g.items.length / cols) }, (_, i) => g.items.slice(i * cols, i * cols + cols))
        return (
          <fieldset key={g.group} className="flex flex-col gap-2">
            <legend className="mb-2.5 flex items-baseline gap-2 text-[20px] font-bold text-ink-900">
              {g.group}
              {ticked > 0 && <span className="text-[13px] font-semibold text-live">{ticked} selected</span>}
            </legend>
            {rows.map((row, ri) => (
              <div key={ri} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {row.map((a) => (
                  <Chip key={a.id} on={l.amenities.includes(a.id)} onClick={() => toggle(a.id)}>
                    {a.label}
                  </Chip>
                ))}
                <AnimatePresence initial={false}>
                  {row
                    .filter((a) => l.amenities.includes(a.id) && hasExtras(a.id))
                    .map((a) => (
                      <AmenityExtrasBox key={`x-${a.id}`} l={l} set={set} id={a.id} label={a.label} autoOpen={justTicked === a.id} />
                    ))}
                </AnimatePresence>
              </div>
            ))}
          </fieldset>
        )
      })}
    </Section>
  )
}

const newRoom = (): ListingRoom => ({ id: uid(6), name: '', bed: '', sizeSqft: 0, maxGuests: 0, count: 1, price: 0, breakfast: false, amenities: [], bedrooms: 1, livingRooms: 0, extraBed: null })
const SQFT_PER_SQM = 10.7639

/** The numbered line on the left of Create Room. */
function StepDot({ n, state }: { n: number; state: 'done' | 'active' | 'locked' }) {
  return (
    <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${state === 'active' ? 'bg-brass-500 text-white ring-4 ring-brass-200' : state === 'done' ? 'bg-pine-800 text-white' : 'bg-white text-ink-500 ring-2 ring-line-strong'}`}>
      {state === 'done' ? <Check className="h-4 w-4" strokeWidth={3} aria-label="Done" /> : n}
    </span>
  )
}

/** Today (or n days from today) as YYYY-MM-DD in local time. */
function todayIso(n = 0) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** "30 Oct, 2026" */
function showDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}, ${y}`
}

/** Date box that shows "30 Oct, 2026", with a clear button and the browser's calendar behind it. */
function DateField({ label, value, min, onChange, error }: { label: string; value: string; min?: string; onChange: (v: string) => void; error?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const pick = () => {
    try {
      input.current?.showPicker()
    } catch {
      input.current?.focus()
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[13px] font-bold text-ink-900">{label}</span>
      <div className={`relative flex min-h-11 items-center rounded-[10px] border bg-white pr-2 pl-3 ${error ? 'border-alert' : 'border-line-strong'}`}>
        <button type="button" onClick={pick} className={`min-w-0 flex-1 truncate py-2 text-left text-[15px] ${value ? 'text-ink-900' : 'text-ink-400'}`}>
          {value ? showDate(value) : 'Select date'}
        </button>
        {value && (
          <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onChange('')} className="flex h-8 w-7 items-center justify-center text-ink-700 hover:text-alert">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button type="button" aria-label={`Open calendar for ${label.toLowerCase()}`} onClick={pick} className="flex h-8 w-7 items-center justify-center text-ink-700 hover:text-pine-800">
          <CalendarDays className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <input ref={input} type="date" tabIndex={-1} aria-label={label} min={min} value={value} onChange={(x) => onChange(x.target.value)} className="pointer-events-none absolute bottom-0 left-3 h-px w-px opacity-0" />
      </div>
      {error && (
        <span role="alert" className="text-[13px] font-semibold text-alert">
          {error}
        </span>
      )}
    </div>
  )
}

function RoomEditor({ l, set, room, sec, openSec, tried, goPhotos }: { l: Listing; set: Set; room: ListingRoom; sec: number; openSec: (n: number) => void; tried: boolean; goPhotos: () => void }) {
  const up = (p: Partial<ListingRoom>) => set((x) => ({ ...x, rooms: x.rooms.map((r) => (r.id === room.id ? { ...r, ...p } : r)) }))
  const r = room
  const e = tried ? roomErrors(r, sec) : {}
  const unlocked = (n: number) => roomSections.slice(0, n - 1).every((s) => roomSectionDone(r, s.id))
  const roomPhotos = l.photos.filter((p) => p.tag === 'Room')
  const net = (p: number) => p - p * site.commissionRate - p * site.commissionRate * site.gstOnCommission
  const b = bedsOf(r)
  /** Saves new beds and refreshes the occupancy worked out from them. */
  const setBeds = (beds: { bedrooms: BedLine[][]; living: BedLine[][] }, extra?: Partial<ListingRoom>) => {
    const next = { ...r, ...extra, beds }
    const occupancy = autoOccupancy(next)
    up({ ...extra, beds, occupancy, maxGuests: occupancy.maxOccupancy, bed: bedSummary(next) })
  }
  const setRooms = (bedrooms: number, livingRooms: number) => {
    const next = { ...r, bedrooms, livingRooms }
    const nb = bedsOf(next)
    up({ bedrooms, livingRooms, beds: nb })
  }
  const occ = r.occupancy ?? autoOccupancy(r)
  const setOcc = (k: keyof typeof occ, v: number) => {
    const o = { ...occ, [k]: v }
    up({ occupancy: o, maxGuests: o.maxOccupancy })
  }
  const rooms = attachOptions(r)
  const baths = r.baths ?? []
  const setBaths = (next: { type: string; attached: string }[]) => up({ baths: next, bathrooms: next.length, bathroomType: next.some((x) => x.attached === SHARED_BATH) ? 'Shared' : 'Private' })
  // First visit to a section: start with one bathroom on Bedroom 1, and a one-year sale window from today.
  useEffect(() => {
    if (sec === 3 && !r.baths?.length) setBaths([{ type: '', attached: 'Bedroom 1' }])
    if (sec === 4 && r.saleFrom === undefined) up({ saleFrom: todayIso(), saleTo: todayIso(365) })
  }, [sec, r.id])
  const money = (id: string, value: number | undefined, onChange: (v: number | undefined) => void, placeholder: string, invalid: boolean) => (
    <span className={`flex items-stretch overflow-hidden rounded-[10px] border bg-white focus-within:border-pine-700 focus-within:shadow-[0_0_0_3px_var(--color-pine-100)] ${invalid ? 'border-alert' : 'border-line-strong'}`}>
      <span className="flex items-center border-r border-line-strong px-3 text-[15px] text-ink-700" aria-hidden="true">
        ₹
      </span>
      <input id={id} className="min-h-11 w-full px-3 text-[15px] outline-none" inputMode="numeric" placeholder={placeholder} aria-invalid={invalid} value={value ?? ''} onChange={(x) => { const d = x.target.value.replace(/\D/g, '').slice(0, 7); onChange(d === '' ? undefined : Number(d)) }} />
    </span>
  )
  const bedArea = (kind: 'bedrooms' | 'living', idx: number) => {
    const lines = b[kind][idx]
    const name = kind === 'bedrooms' ? `Bedroom ${idx + 1}` : `Living Room ${idx + 1}`
    const err = e[`${kind === 'bedrooms' ? 'bedroom' : 'living'}${idx}`]
    const put = (li: number, p: Partial<BedLine>) => setBeds({ ...b, [kind]: b[kind].map((ls, i) => (i === idx ? ls.map((x, j) => (j === li ? { ...x, ...p, count: p.type && !x.count ? 1 : (p.count ?? x.count) } : x)) : ls)) })
    const canDelete = kind === 'living' || b.bedrooms.length > 1
    return (
      <div key={`${kind}${idx}`} className="grid gap-3 border-t border-line px-4 py-5 sm:grid-cols-[1fr_minmax(0,460px)] sm:gap-6 sm:px-5">
        <div>
          <strong className="block text-[16px] text-ink-900">
            {name}
            {kind === 'living' && <span className="font-normal text-ink-500"> (Optional)</span>}
          </strong>
          <span className="block text-[14px] text-ink-500">Select the types of beds available in this room</span>
          {canDelete && (
            <button
              type="button"
              className="mt-1 text-[14px] font-bold text-pine-800 hover:underline"
              onClick={() => {
                const beds = { ...b, [kind]: b[kind].filter((_, i) => i !== idx) }
                setBeds(beds, kind === 'bedrooms' ? { bedrooms: beds.bedrooms.length } : { livingRooms: beds.living.length })
              }}
            >
              Delete {kind === 'bedrooms' ? 'Bedroom' : 'Living Room'}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {lines.map((x, li) => (
            <div key={li} className="grid grid-cols-[1fr_auto_auto] items-end gap-2 sm:gap-3">
              <label className="flex min-w-0 flex-col gap-1 text-[13px] font-semibold text-ink-700">
                Bed Type {li + 1}
                <BedPicker label={`${name}, bed type ${li + 1}`} value={x.type} onChange={(v) => put(li, { type: v })} />
              </label>
              <span className="flex h-[52px] items-center">
                {lines.length > 1 ? (
                  <button type="button" aria-label={`Remove bed type ${li + 1}`} onClick={() => setBeds({ ...b, [kind]: b[kind].map((ls, i) => (i === idx ? ls.filter((_, j) => j !== li) : ls)) })} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 hover:bg-alert-50 hover:text-alert">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                ) : (
                  <X className="h-5 w-5 text-ink-700" aria-hidden="true" />
                )}
              </span>
              <span className="flex flex-col gap-1 text-[13px] font-semibold text-ink-700">
                Number of beds
                <span className={!x.type ? 'pointer-events-none opacity-50' : ''}>{stepper(x.count, (v) => put(li, { count: v }), `${name} beds`, 10)}</span>
              </span>
            </div>
          ))}
          <button type="button" disabled={!lines.every((x) => x.type)} onClick={() => setBeds({ ...b, [kind]: b[kind].map((ls, i) => (i === idx ? [...ls, { type: '', count: 0 }] : ls)) })} className="self-start text-[14px] font-bold text-pine-800 hover:underline disabled:text-ink-400 disabled:no-underline">
            Add Another Bed Type
          </button>
          {err && (
            <span role="alert" className="text-[13px] font-semibold text-alert">
              {err}
            </span>
          )}
        </div>
      </div>
    )
  }
  const setSize = (unit: 'sqft' | 'sqm' | undefined, size: number | undefined) => up({ sizeUnit: unit, size, sizeSqft: size ? Math.round(unit === 'sqm' ? size * SQFT_PER_SQM : size) : 0 })
  const stepper = (value: number, onChange: (v: number) => void, label: string, max = 20) => (
    <span className="flex w-fit items-center overflow-hidden rounded-lg border border-line-strong bg-white">
      <button type="button" aria-label={`Fewer ${label}`} disabled={value <= 0} onClick={() => onChange(Math.max(0, value - 1))} className="flex h-11 w-11 items-center justify-center hover:bg-paper disabled:text-ink-400">
        −
      </button>
      <input aria-label={label} inputMode="numeric" className="h-11 w-14 border-x border-line-strong text-center outline-none" value={value} onChange={(x) => onChange(Math.min(max, Number(x.target.value.replace(/\D/g, '')) || 0))} />
      <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="flex h-11 w-11 items-center justify-center hover:bg-paper disabled:text-ink-400">
        +
      </button>
    </span>
  )

  const body: Record<number, ReactNode> = {
    1: (
      <>
        <Row id="r-type" title="Room type" help="Choose the type that best describes this room" error={e.roomType}>
          <select id="r-type" className="field" value={r.roomType ?? ''} onChange={(x) => up({ roomType: x.target.value })} aria-invalid={!!e.roomType}>
            <option value="" disabled hidden>
              Select room type
            </option>
            {roomTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Row>
        <Row id="r-view" title="Room view" help="Describe what the guest will see from this room, like pool, garden, or city views" error={e.view}>
          <select id="r-view" className="field" value={r.view ?? ''} onChange={(x) => up({ view: x.target.value })} aria-invalid={!!e.view}>
            <option value="" disabled hidden>
              Select room view
            </option>
            {roomViews.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Row>
        <Row id="r-size" title="Room Size (Area)" help="Specify the indoor area only, excluding shared & outdoor spaces" error={e.size}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {(
              [
                ['sqft', 'Square Feet'],
                ['sqm', 'Square Meter'],
              ] as const
            ).map(([u, t]) => (
              <label key={u} className="flex cursor-pointer items-center gap-2 text-[15px] text-ink-900">
                <input type="radio" name={`unit-${r.id}`} checked={r.sizeUnit === u} onChange={() => setSize(u, r.size)} className="h-[18px] w-[18px] accent-pine-800" />
                <span>
                  {t}
                  {u === 'sqft' && <span className="ml-1.5 rounded bg-paper px-1.5 py-0.5 text-[11px] text-ink-500">Recommended</span>}
                </span>
              </label>
            ))}
            <input id="r-size" className="field max-w-[180px] disabled:bg-paper" inputMode="numeric" placeholder="Enter size (Area)" disabled={!r.sizeUnit} value={r.size || ''} onChange={(x) => setSize(r.sizeUnit, Number(x.target.value.replace(/\D/g, '')) || undefined)} aria-invalid={!!e.size} />
          </div>
        </Row>
        <Row id="r-name" title={`Room Name (as displayed on ${site.marketplace} & partner websites)`} help="Add a room name that looks attractive to travellers" error={e.name}>
          <input id="r-name" className="field" maxLength={60} placeholder="Example: Luxury room with private pool" value={r.name} onChange={(x) => up({ name: x.target.value })} aria-invalid={!!e.name} />
        </Row>
        <Row title="Number of bedroom(s)" help="Bedrooms in one room/unit of this type" error={e.bedrooms}>
          {stepper(r.bedrooms ?? 1, (v) => setRooms(Math.max(1, v), r.livingRooms ?? 0), 'bedrooms', 10)}
        </Row>
        <Row title="Number of living room(s)" help="Living rooms in one room/unit of this type, if any">
          {stepper(r.livingRooms ?? 0, (v) => setRooms(r.bedrooms ?? 1, v), 'living rooms', 5)}
        </Row>
        <Row id="r-count" title="Number of rooms (of this type)" help="Total rooms/units available in this property" error={e.count}>
          <input id="r-count" className="field max-w-[320px]" inputMode="numeric" value={r.count || ''} onChange={(x) => up({ count: Math.min(999, Number(x.target.value.replace(/\D/g, '')) || 0) })} aria-invalid={!!e.count} />
        </Row>
        <Row id="r-desc" title="Description of the room (Optional)" help="Describe the room by highlighting its features, sleeping arrangement, amenities, and view">
          <textarea id="r-desc" className="field min-h-[110px]" maxLength={800} placeholder="Write the description" value={r.description ?? ''} onChange={(x) => up({ description: x.target.value })} />
        </Row>
      </>
    ),
    2: (
      <>
        <h4 className="px-4 pt-5 text-[18px] font-black text-ink-900 sm:px-5">Select the bed type for all the bedrooms below</h4>
        <div className="mt-3">
          {b.bedrooms.map((_, i) => bedArea('bedrooms', i))}
          {b.living.map((_, i) => bedArea('living', i))}
        </div>
        <Row title="Can this room/unit accommodate extra bed(s)?" error={e.extraBed}>
          <div className="flex gap-8">
            {[
              [false, 'No'],
              [true, 'Yes'],
            ].map(([v, t]) => (
              <label key={t as string} className="flex cursor-pointer items-center gap-2 text-[15px] text-ink-900">
                <input type="radio" name={`extra-${r.id}`} checked={r.extraBed === v} onChange={() => setBeds(b, { extraBed: v as boolean, extraBedMax: v ? Math.max(1, r.extraBedMax ?? 1) : 0 })} className="h-[18px] w-[18px] accent-pine-800" />
                {t as string}
              </label>
            ))}
          </div>
        </Row>
        {r.extraBed && (
          <Row title="What is the maximum number of extra bed(s) that can be accommodated in this room/unit?">
            {stepper(r.extraBedMax ?? 1, (v) => setBeds(b, { extraBedMax: Math.max(1, v) }), 'extra beds', 5)}
          </Row>
        )}
        <div className="border-t-8 border-[#f1f3f1] px-4 pt-5 sm:px-5">
          <h4 className="text-[18px] font-black text-ink-900">Occupancy</h4>
          <p className="text-[14px] text-ink-500">Occupancy details have been pre-filled based on the selected bed arrangement above</p>
        </div>
        {(
          [
            ['baseAdults', 'Base adults', 'Ideal number of adults supported by the standard sleeping arrangement'],
            ['maxAdults', 'Maximum adults', 'Maximum number of adults that can be accommodated in this room'],
            ['baseChildren', 'Base children', 'Maximum number of children allowed to stay for free within the free child age limit'],
            ['maxChildren', 'Maximum children', 'Maximum number of children that can be accommodated in this room'],
            ['maxOccupancy', 'Maximum occupancy', 'Maximum number of guests that can be accommodated in this room'],
          ] as const
        ).map(([k, t, h]) => (
          <Row key={k} title={t} help={h} error={e[k]}>
            {stepper(occ[k], (v) => setOcc(k, v), t.toLowerCase(), 30)}
          </Row>
        ))}
      </>
    ),
    3: (
      <>
        <h4 className="px-4 pt-5 text-[18px] font-black text-ink-900 sm:px-5">Bathroom options in this room</h4>
        <div className="grid gap-3 px-4 pt-3 pb-5 sm:grid-cols-[1fr_minmax(0,520px)] sm:gap-6 sm:px-5">
          <div>
            <strong className="block text-[16px] text-ink-900">Bathroom</strong>
            <span className="block text-[14px] text-ink-500">Specify the types of bathroom(s) available in this room</span>
          </div>
          <div className="flex flex-col gap-2">
            {baths.map((x, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,170px)_auto] items-end gap-2 sm:gap-3">
                <label className="flex min-w-0 flex-col gap-1 text-[13px] font-semibold text-ink-700">
                  Bathroom Type {i + 1}
                  <BathPicker label={`Bathroom type ${i + 1}`} value={x.type} onChange={(v) => setBaths(baths.map((y, j) => (j === i ? { ...y, type: v } : y)))} />
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-[13px] font-semibold text-ink-700">
                  Attached to which room?
                  <select className="field min-h-[52px]" value={rooms.includes(x.attached) ? x.attached : ''} onChange={(ev) => setBaths(baths.map((y, j) => (j === i ? { ...y, attached: ev.target.value } : y)))} aria-label={`Bathroom ${i + 1} attached to`}>
                    <option value="" disabled hidden>
                      Select room
                    </option>
                    {rooms.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
                <span className="flex h-[52px] w-9 items-center justify-center">
                  {baths.length > 1 && (
                    <button type="button" aria-label={`Remove bathroom ${i + 1}`} onClick={() => setBaths(baths.filter((_, j) => j !== i))} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 hover:bg-alert-50 hover:text-alert">
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>
            ))}
            <button type="button" disabled={!baths.every((x) => x.type) || baths.length >= 10} onClick={() => setBaths([...baths, { type: '', attached: rooms.find((o) => o !== SHARED_BATH && !baths.some((y) => y.attached === o)) ?? rooms[0] }])} className="self-start text-[14px] font-bold text-pine-800 hover:underline disabled:text-ink-400 disabled:no-underline">
              Add Another Bathroom
            </button>
            {e.baths && (
              <span role="alert" className="text-[13px] font-semibold text-alert">
                {e.baths}
              </span>
            )}
          </div>
        </div>
      </>
    ),
    4: (
      <>
        <h4 className="px-4 pt-5 text-[18px] font-black text-ink-900 sm:px-5">Meal Options</h4>
        <Row id="r-meal" title="Select a meal plan" help="Select the meals included with this room type (e.g., breakfast only, breakfast & dinner, or all meals)" error={e.mealPlan}>
          <SearchSelect id="r-meal" value={r.mealPlan ?? ''} options={mealPlans} onChange={(v) => up({ mealPlan: v, breakfast: v !== mealPlans[0] })} searchPlaceholder="Search for meal plans" invalid={!!e.mealPlan} />
        </Row>
        <h4 className="mt-1 border-t-8 border-[#f1f3f1] px-4 pt-5 text-[18px] font-black text-ink-900 sm:px-5">Room Prices</h4>
        <Row id="r-price" title={`Base Rate for ${occ.baseAdults} adult${occ.baseAdults === 1 ? '' : 's'}`} help={`Enter the standard room rate for ${occ.baseAdults} adult${occ.baseAdults === 1 ? '' : 's'}`} error={e.price}>
          {money('r-price', r.price || undefined, (v) => up({ price: v ?? 0 }), 'Enter base rate', !!e.price)}
          {r.price >= site.minPrice && <span className="text-[13px] text-ink-500">You receive about {inr(net(r.price))} a night after commission and its GST.</span>}
        </Row>
        {occ.maxAdults > occ.baseAdults && (
          <Row id="r-extra" title="Extra Adult Charge" help="Additional charge for each adult guest aged 18 years or older" error={e.extraAdultCharge}>
            {money('r-extra', r.extraAdultCharge, (v) => up({ extraAdultCharge: v }), 'Enter extra adult charge', !!e.extraAdultCharge)}
          </Row>
        )}
        {occ.maxChildren > occ.baseChildren && (
          <Row id="r-child" title="Paid Child Charge" help={`Charge per child aged ${Math.min(17, l.policies.childrenFreeAge + 1)} to 17 years`} error={e.childCharge}>
            {money('r-child', r.childCharge, (v) => up({ childCharge: v }), 'Enter charge for child', !!e.childCharge)}
          </Row>
        )}
        <h4 className="mt-1 border-t-8 border-[#f1f3f1] px-4 pt-5 text-[18px] font-black text-ink-900 sm:px-5">Inventory Calendar</h4>
        <div className="grid gap-3 px-4 py-5 sm:grid-cols-[1fr_minmax(0,480px)] sm:gap-8 sm:px-5">
          <div>
            <strong className="block text-[16px] text-ink-900">Select a date range</strong>
            <span className="block text-[14px] text-ink-500">
              All {r.count || 0} room{r.count === 1 ? '' : 's'} of this type go on sale for these dates
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DateField label="Start Date" value={r.saleFrom ?? ''} min={todayIso()} onChange={(v) => up({ saleFrom: v })} error={e.saleFrom} />
            <DateField label="End Date" value={r.saleTo ?? ''} min={r.saleFrom || todayIso()} onChange={(v) => up({ saleTo: v })} error={e.saleTo} />
          </div>
        </div>
      </>
    ),
    5: (
      <>
        <Row title="In the room" help="Tick what guests get in this room">
          <div className="flex flex-wrap gap-2">
            {roomAmenities.map((a) => (
              <Chip key={a} on={r.amenities.includes(a)} onClick={() => up({ amenities: r.amenities.includes(a) ? r.amenities.filter((x) => x !== a) : [...r.amenities, a] })}>
                {a}
              </Chip>
            ))}
          </div>
        </Row>
        <Row title="Photo for this room type (Optional)">
          {roomPhotos.length ? (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Room photo">
              {roomPhotos.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={r.photoId === p.id} aria-label="Room photo" onClick={() => up({ photoId: p.id })} className={`h-16 w-24 overflow-hidden rounded-lg ring-offset-2 ${r.photoId === p.id ? 'ring-3 ring-brass-500' : 'ring-1 ring-line'}`}>
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-500">
              Upload room photos in the{' '}
              <button type="button" className="font-bold text-pine-800 underline" onClick={goPhotos}>
                Photos And Videos
              </button>{' '}
              step, then pick one here.
            </p>
          )}
        </Row>
      </>
    ),
  }

  const facts = (n: number): [string, string][] =>
    n === 1
      ? [
          [`Room Name (as displayed on ${site.marketplace} & partner websites)`, r.name],
          ['Room type', r.roomType ?? '-'],
          ['Room view', r.view ?? '-'],
          ['Number of bedroom(s)', String(r.bedrooms ?? 1)],
          ['Number of living room(s)', String(r.livingRooms ?? 0)],
          ['Number of rooms (of this type)', String(r.count)],
          ['Room Size', r.size ? `${r.size} ${r.sizeUnit === 'sqm' ? 'sq m' : 'sq ft'}` : '-'],
          ['Description of the room', r.description?.trim() || '-'],
        ]
      : n === 2
        ? [
            ...b.bedrooms.map((ls, i) => [`Bedroom ${i + 1}`, ls.filter((x) => x.type).map((x) => `${x.count} × ${x.type}`).join(', ')] as [string, string]),
            ...b.living.map((ls, i) => [`Living Room ${i + 1}`, ls.filter((x) => x.type).map((x) => `${x.count} × ${x.type}`).join(', ') || '-'] as [string, string]),
            ['Extra beds', r.extraBed ? `Up to ${r.extraBedMax}` : 'No'],
            ['Adults (base / max)', `${occ.baseAdults} / ${occ.maxAdults}`],
            ['Children (base / max)', `${occ.baseChildren} / ${occ.maxChildren}`],
            ['Maximum occupancy', String(occ.maxOccupancy)],
          ]
        : n === 3
          ? baths.map((x, i) => [`Bathroom ${i + 1}`, `${x.type} (${bathCatalog.find((c) => c.name === x.type)?.size ?? ''}) · ${x.attached}`] as [string, string])
          : n === 4
            ? [
                ['Meal plan', r.mealPlan ?? '-'],
                [`Base rate for ${occ.baseAdults} adult${occ.baseAdults === 1 ? '' : 's'}`, inr(r.price)],
                ...(occ.maxAdults > occ.baseAdults ? [['Extra adult charge', inr(r.extraAdultCharge ?? 0)] as [string, string]] : []),
                ...(occ.maxChildren > occ.baseChildren ? [['Paid child charge', inr(r.childCharge ?? 0)] as [string, string]] : []),
                ['On sale', r.saleFrom && r.saleTo ? `${showDate(r.saleFrom)} – ${showDate(r.saleTo)}` : '-'],
                ['Rooms on sale', `${r.count} room${r.count === 1 ? '' : 's'}`],
              ]
            : [['In the room', r.amenities.join(', ') || '-']]

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[32px] font-black text-ink-900">{r.name.trim() ? r.name : 'Create Room'}</h2>
      <ol className="relative flex flex-col gap-4">
        {roomSections.map((s, i) => {
          const open = s.id === sec
          const can = unlocked(s.id)
          const done = can && roomSectionDone(r, s.id) && !open
          const state = open ? 'active' : done ? 'done' : 'locked'
          const nextOpen = i < roomSections.length - 1 && unlocked(s.id + 1)
          return (
            <li key={s.id} className="relative flex gap-3 sm:gap-5">
              {/* The line runs from this dot's centre to the next dot's centre, so it touches both. */}
              {i < roomSections.length - 1 && <span aria-hidden="true" className={`absolute top-8 bottom-[-48px] left-4 w-[3px] -translate-x-1/2 ${done && nextOpen ? 'bg-pine-800' : open ? 'bg-brass-500' : 'bg-line-strong'}`} />}
              <div className="pt-4">
                <StepDot n={s.id} state={state} />
              </div>
              <div className={`min-w-0 flex-1 overflow-visible rounded-xl bg-white ring-1 ${open ? 'shadow-panel ring-line' : 'ring-line'} ${!can ? 'opacity-70' : ''}`}>
                <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                  <span className="min-w-0">
                    <strong className="block text-[22px] leading-tight font-black text-ink-900">{s.title}</strong>
                    {!done && <span className="block text-[14px] text-ink-700">{s.intro}</span>}
                  </span>
                  {!can ? (
                    <Lock className="h-4 w-4 shrink-0 text-ink-400" aria-label="Locked" />
                  ) : done ? (
                    <button type="button" onClick={() => openSec(s.id)} className="shrink-0 rounded-md px-2 py-1 text-[14px] font-bold text-pine-800 hover:bg-pine-50">
                      Edit
                    </button>
                  ) : null}
                </div>
                {done && (
                  <dl className="grid gap-x-6 gap-y-4 border-t border-line px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
                    {facts(s.id).map(([k, v], fi) => (
                      <div key={k} className={fi === 0 && s.id === 1 ? 'sm:col-span-2 lg:col-span-4' : k.startsWith('Description') || k === 'In the room' ? 'sm:col-span-2 lg:col-span-4' : /^Bathroom \d|^On sale/.test(k) ? 'sm:col-span-2' : ''}>
                        <dt className="text-[13px] text-ink-500">{k}</dt>
                        <dd className="text-[15px] font-bold break-words text-ink-900">{v || '-'}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {open && <div className={`border-t border-line ${s.id >= 3 ? '[&>h4+div]:border-t-0' : ''}`}>{body[s.id]}</div>}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Rooms({ l, set, roomId, openRoom }: { l: Listing; set: Set; roomId: string | null; openRoom: (id: string, sec: number) => void }) {
  if (roomId) return null
  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-[30px] font-black text-ink-900 sm:text-[32px]">Rooms</h2>
        <p className="text-[14px] text-ink-500">Add each kind of room you sell. Each room type is filled in step by step.</p>
      </div>
      {l.rooms.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-14 text-center ring-1 ring-line">
          <BedDouble className="h-8 w-8 text-pine-700" aria-hidden="true" />
          <strong className="text-[18px] text-ink-900">No rooms yet</strong>
          <p className="max-w-sm text-[14px] text-ink-500">Create your first room type: details, beds and guests, bathroom, price and amenities.</p>
          <button type="button" className="btn-brass" onClick={() => { const r = newRoom(); set((x) => ({ ...x, rooms: [...x.rooms, r] })); openRoom(r.id, 1) }}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Create Room
          </button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {l.rooms.map((r, i) => {
              const done = roomDone(r)
              const firstOpen = roomSections.find((s) => !roomSectionDone(r, s.id))?.id ?? 1
              return (
                <li key={r.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 ring-1 ring-line sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <strong className="block text-[17px] text-ink-900">{r.name.trim() || `Room type ${i + 1}`}</strong>
                    <span className="block text-[14px] text-ink-500">{[r.roomType, r.count ? `${r.count} room${r.count === 1 ? '' : 's'}` : '', r.price ? `${inr(r.price)} a night` : ''].filter(Boolean).join(' · ') || 'Not filled in yet'}</span>
                    <span className={`mt-1 block text-[13px] font-semibold ${done ? 'text-live' : 'text-brass-700'}`}>{done ? 'Complete' : `${roomSections.filter((s) => roomSectionDone(r, s.id)).length} of ${roomSections.length} sections done`}</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={done ? 'btn-ghost' : 'btn-brass'} onClick={() => openRoom(r.id, done ? 1 : firstOpen)}>
                      {done ? 'Edit' : 'Continue'}
                    </button>
                    <button type="button" aria-label={`Remove ${r.name || `room type ${i + 1}`}`} onClick={() => set((x) => ({ ...x, rooms: x.rooms.filter((y) => y.id !== r.id) }))} className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 hover:bg-alert-50 hover:text-alert">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <button type="button" className="btn-ghost self-start" onClick={() => { const r = newRoom(); set((x) => ({ ...x, rooms: [...x.rooms, r] })); openRoom(r.id, 1) }}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Create another room
          </button>
        </>
      )}
    </section>
  )
}

function Photos({ l, set }: { l: Listing; set: Set }) {
  return <PhotoManager l={l} set={set} />
}

/** White card with a title bar, as on the extranet policy page. */
function PolicyCard({ title, optional, intro, children }: { title: string; optional?: boolean; intro?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg bg-white ring-1 ring-line">
      <div className="border-b border-line px-4 py-3.5 sm:px-5">
        <h3 className="text-[19px] font-medium text-ink-900">
          {title}
          {optional && <span className="text-[14px] font-normal text-ink-700">(optional)</span>}
        </h3>
        {intro && <p className="mt-0.5 text-[13px] text-ink-500">{intro}</p>}
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  )
}

/** Rounded radio "pills" (No / Yes / Subject to availability …). */
function Pills({ name, value, options, onChange }: { name: string; value: string | undefined; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <span className="flex shrink-0 flex-wrap gap-2" role="radiogroup">
      {options.map(([v, t]) => (
        <label key={v} className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-[14px] transition-colors ${value === v ? 'border-pine-700 bg-pine-50 font-medium text-pine-900' : 'border-line-strong bg-white text-ink-900 hover:border-pine-700/50'}`}>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="h-4 w-4 accent-pine-800" />
          {t}
        </label>
      ))}
    </span>
  )
}

/** A question with No / Yes on the right. */
function YesNo({ q, hint, value, onChange, name }: { q: string; hint?: string; value: boolean; onChange: (v: boolean) => void; name: string }) {
  return (
    <div className="flex flex-col gap-2 border-t border-line py-3.5 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span>
        <span className="block text-[15px] text-ink-900">{q}</span>
        {hint && <span className="block text-[13px] text-ink-500">{hint}</span>}
      </span>
      <Pills name={name} value={value ? 'yes' : 'no'} options={[['no', 'No'], ['yes', 'Yes']]} onChange={(v) => onChange(v === 'yes')} />
    </div>
  )
}

/** The refund timeline shown under the chosen cancellation policy. */
function CancelTimeline({ id }: { id: string }) {
  const hours = { freeCheckin: 0, free24: 24, free48: 48, free72: 72 }[id]
  const refund = id === 'nonref' ? 0 : hours === 0 ? 100 : 68
  return (
    <div className="mt-1 mb-2 ml-7 max-w-[460px] rounded-md bg-paper px-3 pt-3 pb-2.5">
      <div className="flex text-center text-[12.5px] text-ink-700">
        {refund > 0 && <span style={{ width: `${refund}%` }}>100% Refund</span>}
        {refund < 100 && <span className="flex-1">Non-refundable</span>}
      </div>
      <div className="relative mt-1 flex h-[6px]">
        {refund > 0 && <span className="h-full rounded-l-sm bg-brass-500" style={{ width: `${refund}%` }} />}
        {refund < 100 && <span className="h-full flex-1 rounded-r-sm bg-line-strong" />}
        <span className="absolute -top-1 left-0 h-[14px] w-px bg-ink-500" />
        {refund > 0 && refund < 100 && <span className="absolute -top-1 h-[14px] w-px bg-ink-500" style={{ left: `${refund}%` }} />}
        <span className="absolute -top-1 right-0 h-[14px] w-px bg-ink-500" />
      </div>
      <div className="relative mt-1.5 flex justify-between text-[12.5px]">
        <strong className="font-medium text-ink-900">Booking Date</strong>
        {refund > 0 && refund < 100 && (
          <span className="absolute w-28 -translate-x-1/2 text-center leading-tight text-ink-700" style={{ left: `${refund}%` }}>
            {hours} hours before check-in
          </span>
        )}
        <strong className="font-medium text-ink-900">Check-in</strong>
      </div>
      {refund > 0 && refund < 100 && <div className="h-4" />}
    </div>
  )
}

const groupIcon = { guest: Users, id: IdCard, restrict: Ban, pet: PawPrint, clock: Clock3, infant: Baby, bed: BedSingle, beds: BedDouble, meal: UtensilsCrossed }
const ynOpts: [string, string][] = [
  ['no', 'No'],
  ['yes', 'Yes'],
]
const ynsOpts: [string, string][] = [...ynOpts, ['subject', 'Subject to availability']]

/** One property rule: Yes/No pills, a multi-select, a choice or a price box, plus its follow-up. */
function RuleRow({ rule, h, put, nested }: { rule: PolicyRule; h: HouseAnswers; put: (id: string, v: string | string[]) => void; nested?: boolean }) {
  const v = h[rule.id]
  const control =
    rule.kind === 'multi' ? (
      <div className="w-full max-w-[420px]">
        <MultiSelect label={rule.q} options={rule.options ?? []} value={Array.isArray(v) ? v : []} onChange={(x) => put(rule.id, x)} selectAll />
      </div>
    ) : rule.kind === 'price' ? (
      <span className="flex w-full max-w-[245px] items-stretch overflow-hidden rounded-[10px] border border-line-strong bg-white focus-within:border-pine-700">
        <span className="flex items-center border-r border-line-strong px-3 text-ink-700" aria-hidden="true">
          ₹
        </span>
        <input aria-label={`${rule.q} price per person`} className="min-h-11 w-full px-3 text-[15px] outline-none" inputMode="numeric" placeholder="Enter" value={typeof v === 'string' ? v : ''} onChange={(e) => put(rule.id, e.target.value.replace(/\D/g, '').slice(0, 5))} />
      </span>
    ) : (
      <Pills name={rule.id} value={typeof v === 'string' ? v : undefined} options={rule.kind === 'yns' ? ynsOpts : rule.kind === 'choice' ? (rule.options ?? []).map((o) => [o, o] as [string, string]) : ynOpts} onChange={(x) => put(rule.id, x)} />
    )
  const showFollow = rule.follow && typeof v === 'string' && rule.follow.when.includes(v)
  return (
    <div className={nested ? 'rounded-md bg-paper px-4 py-3' : 'py-3'}>
      {rule.kind === 'multi' ? (
        <label className="flex flex-col gap-1.5 text-[15px] text-ink-900">
          {rule.q}
          {control}
        </label>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <span className="text-[15px] text-ink-900">{rule.q}</span>
          {control}
        </div>
      )}
      {showFollow && (
        <div className="mt-3">
          <RuleRow rule={rule.follow!.rule} h={h} put={put} nested />
        </div>
      )}
    </div>
  )
}

/** A collapsible group of property rules with its "x/y RULES ADDED" badge. */
function RuleGroup({ g, h, put, open, onToggle }: { g: PolicyGroup; h: HouseAnswers; put: (id: string, v: string | string[]) => void; open: boolean; onToggle: () => void }) {
  const Icon = groupIcon[g.icon]
  const done = g.rules.filter((r) => answered(h[r.id])).length
  const all = done === g.rules.length
  return (
    <div className="border-t border-line first:border-t-0">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 py-4 text-left">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine-50 text-pine-800">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <strong className="text-[16px] font-medium text-ink-900">{g.title}</strong>
          <span className={`rounded px-1.5 py-0.5 text-[11.5px] font-medium tracking-wide ${all ? 'bg-pine-50 text-live' : 'bg-alert-50 text-alert'}`}>
            {done}/{g.rules.length} RULES ADDED
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-ink-900 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="pb-3">
          {g.intro && <p className="mb-1 text-[14px] text-ink-700">{g.intro}</p>}
          {g.rules.map((r) => (
            <RuleRow key={r.id} rule={r} h={h} put={put} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Right-hand "Step Detail" panel with a short explainer and FAQs. */
function StepDetail({ text, faqs }: { text: string; faqs: [string, string][] }) {
  const [show, setShow] = useState(true)
  const [open, setOpen] = useState(0)
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
      <div className="overflow-hidden rounded-lg bg-white ring-1 ring-line">
        <div className="relative overflow-hidden bg-pine-800 px-4 py-4">
          <span aria-hidden="true" className="absolute -top-8 -right-4 h-24 w-40 rounded-full bg-white/10" />
          <Star className="absolute top-3 right-4 h-10 w-10 fill-brass-500/70 text-brass-500/70" aria-hidden="true" />
          <h3 className="relative text-[19px] font-medium text-white">Step Detail</h3>
        </div>
        <p className="px-4 py-4 text-[14px] leading-relaxed text-ink-700">{text}</p>
      </div>
      <div className="overflow-hidden rounded-lg bg-white ring-1 ring-line">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <h3 className="text-[15px] font-medium text-ink-900">Frequently Asked Questions</h3>
          <button type="button" className="text-[14px] font-medium text-pine-800 hover:underline" onClick={() => setShow((x) => !x)} aria-expanded={show}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        {show &&
          faqs.map(([q, a], i) => (
            <div key={q} className="border-t border-line">
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-[14px] text-pine-800 ${open === i ? 'bg-pine-50' : 'hover:bg-paper'}`}>
                {q}
                <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {open === i && <p className="px-4 pt-1 pb-4 text-[14px] leading-relaxed text-ink-700">{a}</p>}
            </div>
          ))}
      </div>
    </aside>
  )
}

function Policies({ l, set }: { l: Listing; set: Set }) {
  const p = l.policies
  const up = (x: Partial<Listing['policies']>) => set((y) => ({ ...y, policies: { ...y.policies, ...x } }))
  const n = l.rooms.length
  const h = p.house ?? {}
  const [openGroups, setOpenGroups] = useState<string[]>([policyGroups[0].id])
  /** Saves one rule answer, clears follow-ups that no longer apply, and keeps the older on/off fields in step. */
  const put = (id: string, v: string | string[]) =>
    set((y) => {
      const house: HouseAnswers = { ...(y.policies.house ?? {}), [id]: v }
      for (const g of policyGroups)
        for (const r of g.rules) if (r.follow && !(typeof house[r.id] === 'string' && r.follow.when.includes(house[r.id] as string))) delete house[r.follow.rule.id]
      const x: Partial<Listing['policies']> = { house }
      if (house.couples) x.coupleFriendly = house.couples === 'yes' && house.coupleTag !== 'no'
      if (house.localIds) x.localIds = house.localIds === 'yes'
      if (house.petsAllowed) x.pets = house.petsAllowed === 'yes'
      if (house.smoking) x.smoking = house.smoking === 'yes'
      return { ...y, policies: { ...y.policies, ...x } }
    })
  return (
    <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-[30px] font-medium text-ink-900">Policies</h2>
          <p className="text-[14px] text-ink-500">Mention all the policies applicable at your property.</p>
        </div>

        <PolicyCard title="Check-in & Check-out Time" intro="Specify the check-in & check-out time at your property">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              Check-in Time
              <select className="field" value={p.checkIn} onChange={(e) => up({ checkIn: e.target.value })}>
                {checkTimes.map((t) => (
                  <option key={t} value={t}>
                    {timeLabel(t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              Check-out Time
              <select className="field" value={p.checkOut} onChange={(e) => up({ checkOut: e.target.value })}>
                {checkTimes.map((t) => (
                  <option key={t} value={t}>
                    {timeLabel(t)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </PolicyCard>

        <PolicyCard title="Cancellation Policy" intro="Offering a flexible cancellation policy helps travellers book in advance.">
          <div className="flex flex-col gap-1" role="radiogroup" aria-label="Cancellation policy">
            {cancellationOptions.map((c) => (
              <div key={c.id}>
                <label className="flex min-h-9 cursor-pointer items-center gap-3 text-[15px] text-ink-900">
                  <input type="radio" name="cancel" checked={p.cancellation === c.id} onChange={() => up({ cancellation: c.id })} className="h-[18px] w-[18px] accent-pine-800" />
                  {c.label}
                  {c.id === 'freeCheckin' && <span className="rounded bg-pine-50 px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-live">RECOMMENDED</span>}
                </label>
                {p.cancellation === c.id && <CancelTimeline id={c.id} />}
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-md border border-pine-100 bg-pine-50 px-3 py-2 text-[13px] text-ink-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-pine-800" aria-hidden="true" />
            Selected policy applies to {n ? `the ${n} room type${n === 1 ? '' : 's'} you created` : 'all your room types'}. You can change it after completing the listing.
          </p>
        </PolicyCard>

        <PolicyCard title="Property Rules" optional intro="Add property rules based on the requirements of your property listing">
          {policyGroups.map((g) => (
            <RuleGroup key={g.id} g={g} h={h} put={put} open={openGroups.includes(g.id)} onToggle={() => setOpenGroups((o) => (o.includes(g.id) ? o.filter((x) => x !== g.id) : [...o, g.id]))} />
          ))}
          <label className="label mt-2 border-t border-line pt-4">
            Other rules (one per line)
            <textarea className="field min-h-[100px]" value={p.rules.join('\n')} onChange={(e) => up({ rules: e.target.value.split('\n').slice(0, 8) })} placeholder={'Visitors are not allowed in rooms after 10 PM.\nOutside food is allowed.'} />
          </label>
        </PolicyCard>

        <PolicyCard title="Children & Extra Beds" intro="Who stays free and what an extra bed costs">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              Children stay free up to age
              <select className="field" value={p.childrenFreeAge} onChange={(e) => up({ childrenFreeAge: Number(e.target.value) })}>
                {Array.from({ length: 18 }, (_, a) => (
                  <option key={a} value={a}>
                    {a === 0 ? 'No free stay for children' : `${a} year${a === 1 ? '' : 's'}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              Extra bed charge per night
              <span className="flex items-stretch overflow-hidden rounded-[10px] border border-line-strong bg-white focus-within:border-pine-700">
                <span className="flex items-center border-r border-line-strong px-3 text-ink-700" aria-hidden="true">
                  ₹
                </span>
                <input className="min-h-11 w-full px-3 text-[15px] outline-none" inputMode="numeric" placeholder="0 if not offered" value={p.extraBed || ''} onChange={(e) => up({ extraBed: Number(e.target.value.replace(/\D/g, '').slice(0, 6)) || 0 })} />
              </span>
            </label>
          </div>
        </PolicyCard>

        <PolicyCard title="Payment at Property" intro="How guests can pay when they arrive">
          <YesNo name="payhotel" q="Can guests pay at the property?" hint="Cash, card or UPI at check-in." value={p.payAtHotel} onChange={(v) => up({ payAtHotel: v })} />
        </PolicyCard>

        <PolicyCard title="What guests will read" intro="Shown under Property Rules on your hotel page and in every booking confirmation">
          <ul className="list-disc pl-5 text-[14px] leading-relaxed text-ink-700">
            {guestRules(l).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </PolicyCard>
      </div>
      <StepDetail
        text="Add details on check-in/check-out timings, cancellation policies, rules & restrictions applicable to your property. It will set the right expectations for the guests looking forward to booking your property."
        faqs={[
          ['Apart from the policies mentioned, can I add a customised policy for my property?', 'Yes. Write it under Other rules in Property Rules, one rule per line. Guests see it on your hotel page and in their booking confirmation. For anything else, contact the StayEasy partner team.'],
          ['What should I do if I face any dispute, or if a guest violates my property rules?', 'Note the booking ID and contact the StayEasy partner team. Clear property rules help, because guests see them before they book and in their confirmation.'],
        ]}
      />
    </section>
  )
}

function Legal({ l, set, sec, openSec, tried }: { l: Listing; set: Set; sec: number; openSec: (n: number) => void; tried: boolean }) {
  const g = l.legal
  const up = (x: Partial<Listing['legal']>) => set((y) => ({ ...y, legal: { ...y.legal, ...x } }))
  const [acct, setAcct] = useState('')
  const [acct2, setAcct2] = useState('')
  const e = tried ? legalErrors(l, sec) : {}
  const unlocked = (n: number) => legalSections.slice(0, n - 1).every((s) => legalSectionDone(l, s.id))
  const hasGstin = g.hasGstin ?? (g.gstin ? true : null)
  const mismatch = acct2.length > 0 && acct !== acct2
  const setAccount = (a: string, b: string) => {
    setAcct(a)
    setAcct2(b)
    up({ accountLast4: a.length >= 9 && a === b ? a.slice(-4) : a || b ? '' : g.accountLast4 })
  }
  const setIfsc = (v: string) => {
    const ifsc = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)
    const bank = banks.find(([code]) => code === ifsc.slice(0, 4))?.[1]
    up({ ifsc, ...(bank && !ifscError(ifsc) && !g.bankName ? { bankName: bank } : {}) })
  }
  const row = (title: string, help: string | undefined, error: string | undefined, child: ReactNode, id?: string) => (
    <div className="grid gap-2 py-3 sm:grid-cols-[1fr_minmax(0,480px)] sm:gap-8">
      <div>
        <label htmlFor={id} className="block text-[15px] font-medium text-ink-900">
          {title}
        </label>
        {help && <p className="text-[13px] text-ink-500">{help}</p>}
      </div>
      <div className="flex flex-col gap-1">
        {child}
        {error && (
          <span role="alert" className="text-[13px] font-medium text-alert">
            {error}
          </span>
        )}
      </div>
    </div>
  )
  const body: Record<number, ReactNode> = {
    1: (
      <div className="px-4 pb-4 sm:px-5">
        <div className="border-b border-line pb-2">
          {row(
            'Bank Account Number',
            undefined,
            e.acct && !acct ? e.acct : undefined,
            <input id="b-acct" className="field" inputMode="numeric" autoComplete="off" placeholder={g.accountLast4 ? `Saved, ending ${g.accountLast4}` : '1234567890123456'} value={acct} onChange={(x) => setAccount(x.target.value.replace(/\D/g, '').slice(0, 18), acct2)} aria-invalid={!!e.acct && !acct} />,
            'b-acct',
          )}
          {row(
            'Re-Enter Bank Account Number',
            undefined,
            mismatch ? 'The account numbers don’t match.' : acct && acct.length < 9 ? 'An account number has 9 to 18 digits.' : undefined,
            <input id="b-acct2" className="field" inputMode="numeric" autoComplete="off" placeholder={g.accountLast4 ? `Saved, ending ${g.accountLast4}` : '1234567890123456'} value={acct2} onPaste={(x) => x.preventDefault()} onChange={(x) => setAccount(acct, x.target.value.replace(/\D/g, '').slice(0, 18))} aria-invalid={mismatch} />,
            'b-acct2',
          )}
          <p className="pb-1 text-[12.5px] text-ink-500">Only the last 4 digits are stored in InnDesk. The full number is checked by our payments partner when payouts start.</p>
        </div>
        <div className="border-b border-line">{row('Bank IFSC Code', 'You can find this on your cheque book or bank statement', e.ifsc ?? (g.ifsc.length === 11 && ifscError(g.ifsc) ? ifscError(g.ifsc) : undefined), <input id="b-ifsc" className="field uppercase" maxLength={11} placeholder="HDFC0001234" value={g.ifsc} onChange={(x) => setIfsc(x.target.value)} aria-invalid={!!e.ifsc} />, 'b-ifsc')}</div>
        {row('Bank Name', undefined, e.bankName, <SearchSelect id="b-bank" value={g.bankName} options={banks.map(([, n]) => n)} onChange={(v) => up({ bankName: v })} placeholder="Select your bank from the list" searchPlaceholder="Search banks" invalid={!!e.bankName} />, 'b-bank')}
        <label className="mt-1 flex cursor-pointer items-start gap-2.5 text-[14px] font-medium text-ink-900">
          <input type="checkbox" checked={!!g.bankConsent} onChange={(x) => up({ bankConsent: x.target.checked })} className="mt-0.5 h-[18px] w-[18px] accent-pine-800" />I consent to third-party bank account verification, ₹1 will be deposited in given bank account.
        </label>
        {e.consent && (
          <span role="alert" className="mt-1 block text-[13px] font-medium text-alert">
            {e.consent}
          </span>
        )}
      </div>
    ),
    2: (
      <div className="px-4 pb-4 sm:px-5">
        <div className="border-b border-line">{row('Registered business or owner name', 'As written on the PAN card', e.legalName, <input id="t-name" className="field" value={g.legalName} onChange={(x) => up({ legalName: x.target.value })} aria-invalid={!!e.legalName} />, 't-name')}</div>
        <div className="border-b border-line">{row('PAN', 'Permanent Account Number of the business or owner', e.pan ?? (g.pan.length === 10 && panError(g.pan) ? panError(g.pan) : undefined), <input id="t-pan" className="field uppercase" maxLength={10} placeholder="ABCDE1234F" value={g.pan} onChange={(x) => up({ pan: x.target.value.toUpperCase() })} aria-invalid={!!e.pan} />, 't-pan')}</div>
        <div className="border-b border-line">
          {row('Do you have a GSTIN?', 'Used on the commission invoices we send you', e.hasGstin, <Pills name="hasgst" value={hasGstin == null ? undefined : hasGstin ? 'yes' : 'no'} options={ynOpts} onChange={(v) => up({ hasGstin: v === 'yes', ...(v === 'no' ? { gstin: '' } : {}) })} />)}
          {hasGstin &&
            row(
              'GSTIN',
              undefined,
              e.gstin ?? (g.gstin.length === 15 && gstinError(g.gstin) ? gstinError(g.gstin) : undefined),
              <>
                <input id="t-gst" className="field uppercase" maxLength={15} placeholder="07ABCDE1234F1Z5" value={g.gstin} onChange={(x) => up({ gstin: x.target.value.toUpperCase() })} aria-invalid={!!e.gstin} />
                {g.gstin.length === 15 && !gstinError(g.gstin) && <span className="text-[13px] font-medium text-live">Valid format, registered in {gstinState(g.gstin)}.</span>}
                {isDemoMode && !g.gstin && (
                  <span className="text-[13px] text-ink-500">
                    Demo test GSTIN:{' '}
                    <button type="button" className="font-medium text-pine-800 underline" onClick={() => up({ gstin: demoIds.gstin, pan: g.pan || demoIds.pan })}>
                      {demoIds.gstin}
                    </button>
                  </span>
                )}
              </>,
              't-gst',
            )}
        </div>
        {row('Is your business registered as an MSME (Udyam)?', 'Micro, small and medium enterprises registered on the Udyam portal', e.msme, <Pills name="msme" value={g.msme == null ? undefined : g.msme ? 'yes' : 'no'} options={ynOpts} onChange={(v) => up({ msme: v === 'yes', ...(v === 'no' ? { udyam: '' } : {}) })} />)}
        {g.msme && row('Udyam Registration Number', undefined, e.udyam, <input id="t-udyam" className="field uppercase" maxLength={19} placeholder="UDYAM-DL-01-0001234" value={g.udyam ?? ''} onChange={(x) => up({ udyam: x.target.value.toUpperCase() })} aria-invalid={!!e.udyam} />, 't-udyam')}
      </div>
    ),
    3: (
      <div className="px-4 pb-4 sm:px-5">
        <div className="border-b border-line pb-3">
          {row(
            'Proof of ownership or lease',
            'Electricity bill, property tax receipt, sale deed or rent agreement. Optional now, needed before your first payout.',
            undefined,
            <>
              <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-line-strong bg-paper px-3 text-[15px] font-medium text-pine-800 hover:border-pine-700">
                <Upload className="h-4 w-4" aria-hidden="true" />
                {g.ownershipDoc ? 'Replace document' : 'Upload document'}
                <input type="file" accept=".pdf,image/jpeg,image/png" className="sr-only" onChange={(x) => x.target.files?.[0] && up({ ownershipDoc: x.target.files[0].name })} />
              </label>
              {g.ownershipDoc && <span className="text-[13px] font-medium text-live">Attached: {g.ownershipDoc}</span>}
              <span className="text-[12.5px] text-ink-500">PDF, JPG or PNG.{isDemoMode ? ' In demo mode only the file name is kept.' : ''}</span>
            </>,
          )}
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5">
          <input type="checkbox" checked={g.agreed} onChange={(x) => up({ agreed: x.target.checked })} className="mt-0.5 h-[18px] w-[18px] accent-pine-800" />
          <span>
            <span className="block text-[14px] font-medium text-ink-900">I own this property or am authorised to list it, and I accept the partner terms.</span>
            <span className="text-[13px] text-ink-500">
              Commission {Math.round(site.commissionRate * 100)}% of the room amount on completed stays, plus GST. Payouts {site.payoutCycle}. [Partner terms document to be added by the client.]
            </span>
          </span>
        </label>
        {e.agreed && (
          <span role="alert" className="mt-1 block text-[13px] font-medium text-alert">
            {e.agreed}
          </span>
        )}
      </div>
    ),
  }
  const facts = (n: number): [string, string][] =>
    n === 1
      ? [
          ['Bank account number', g.accountLast4 ? `•••• ${g.accountLast4}` : '-'],
          ['Bank IFSC Code', g.ifsc || '-'],
          ['Bank Name', g.bankName || '-'],
        ]
      : n === 2
        ? [
            ['Registered name', g.legalName || '-'],
            ['PAN', g.pan || '-'],
            ['GSTIN', hasGstin ? g.gstin : 'No GSTIN'],
            ['MSME (Udyam)', g.msme ? (g.udyam ?? '-') : 'Not registered'],
          ]
        : [
            ['Proof of ownership or lease', g.ownershipDoc || 'Not uploaded yet'],
            ['Partner terms', g.agreed ? 'Accepted' : '-'],
          ]
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[30px] font-medium text-ink-900">Finance &amp; Legal</h2>
      <ol className="relative flex flex-col gap-4">
        {legalSections.map((s, i) => {
          const open = s.id === sec
          const can = unlocked(s.id)
          const done = can && legalSectionDone(l, s.id) && !open
          const state = open ? 'active' : done ? 'done' : 'locked'
          const nextOpen = i < legalSections.length - 1 && unlocked(s.id + 1)
          return (
            <li key={s.id} className="relative flex gap-3 sm:gap-5">
              {i < legalSections.length - 1 && <span aria-hidden="true" className={`absolute top-8 bottom-[-48px] left-4 w-[3px] -translate-x-1/2 ${done && nextOpen ? 'bg-pine-800' : open ? 'bg-brass-500' : 'bg-line-strong'}`} />}
              <div className="pt-4">
                <StepDot n={s.id} state={state} />
              </div>
              <div className={`min-w-0 flex-1 rounded-xl bg-white ring-1 ring-line ${open ? 'shadow-panel' : ''} ${!can ? 'opacity-70' : ''}`}>
                <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                  <span className="min-w-0">
                    <strong className="block text-[22px] leading-tight font-medium text-ink-900">{s.title}</strong>
                    {!done && <span className="block text-[14px] text-ink-700">{s.intro}</span>}
                  </span>
                  {!can ? (
                    <Lock className="h-4 w-4 shrink-0 text-ink-400" aria-label="Locked" />
                  ) : done ? (
                    <button type="button" onClick={() => openSec(s.id)} className="shrink-0 rounded-md px-2 py-1 text-[14px] font-medium text-pine-800 hover:bg-pine-50">
                      Edit
                    </button>
                  ) : null}
                </div>
                {done && (
                  <dl className="grid gap-x-6 gap-y-4 border-t border-line px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
                    {facts(s.id).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[13px] text-ink-500">{k}</dt>
                        <dd className="text-[15px] font-medium break-words text-ink-900">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {open && <div className="border-t border-line pt-2">{body[s.id]}</div>}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
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

function Review({ l, go, onPublish, busy, result, onRetry }: { l: Listing; go: (s: StepId, field?: string) => void; onPublish: () => void; busy: boolean; result: string; onRetry: () => void }) {
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
                    <button type="button" onClick={() => go(c.fix?.step ?? c.step, c.fix?.field)} className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-pine-800 hover:bg-pine-50">
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
  const [l, setL] = useState<Listing | null | undefined>(undefined)
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved')
  const [saveError, setSaveError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState('')
  const [justPublished, setJustPublished] = useState<Listing | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [changingType, setChangingType] = useState(false)
  const top = useRef<HTMLDivElement>(null)
  const step = (steps.some((s) => s.id === params.get('step')) ? params.get('step') : 'basics') as StepId
  // Create Room: which room type is open and which of its five sections.
  const roomId = step === 'rooms' ? params.get('room') : null
  const sec = Math.min(5, Math.max(1, Number(params.get('sec')) || 1))
  const [roomTried, setRoomTried] = useState(false)
  // Finance & Legal: which of its three parts is open.
  const [legalTried, setLegalTried] = useState(false)
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast((x) => (x && x.n > 1 ? { ...x, n: x.n - 1 } : null)), 1000)
    return () => clearTimeout(t)
  }, [toast])
  const index = steps.findIndex((s) => s.id === step)

  useEffect(() => {
    if (!owner || id === 'new') return
    let live = true
    getListing(owner.id, id).then((x) => live && setL(x))
    return () => {
      live = false
    }
  }, [id, owner])

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

  // A Fix button can point at one field: scroll to it, focus it, then drop the hint from the address.
  const focusField = params.get('focus')
  useEffect(() => {
    if (!focusField || !l) return
    const t = setTimeout(() => {
      const el = document.getElementById(focusField)
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        el.focus({ preventScroll: true })
      }
      setParams((p) => {
        const n = new URLSearchParams(p)
        n.delete('focus')
        return n
      }, { replace: true })
    }, 350)
    return () => clearTimeout(t)
  }, [focusField, l, setParams])

  // Opening Finance & Legal pins the part to show (the first unfinished one), so it doesn't jump while typing.
  const legalPinned = !!params.get('lsec')
  useEffect(() => {
    if (step !== 'legal' || legalPinned || !l) return
    setParams({ step: 'legal', lsec: String(legalSections.find((x) => !legalSectionDone(l, x.id))?.id ?? 1) }, { replace: true })
  }, [step, legalPinned, l, setParams])

  if (id === 'new') return <Navigate to="/app/properties?new=1" replace />

  const isLive = !!l && l.status !== 'draft'
  // A tab opens once every tab before it is complete. Live listings can jump anywhere.
  const unlocked = (i: number) => isLive || (!!l && steps.slice(0, i).every((s) => stepDone(l, s.id)))

  const go = (s: StepId, field?: string) => {
    if (l && saveState === 'dirty' && l.status === 'draft') save(l)
    setShowErrors(false)
    setParams({ step: s, ...(field ? { focus: field } : {}) }, { replace: false })
    top.current?.scrollIntoView({ block: 'start' })
    window.scrollTo({ top: 0 })
  }

  const openRoom = (id: string, n: number) => {
    setRoomTried(false)
    setShowErrors(false)
    setParams({ step: 'rooms', room: id, sec: String(n) })
    window.scrollTo({ top: 0 })
  }
  const closeRoom = () => {
    // A room left completely empty is dropped when the owner cancels.
    if (l && roomId) {
      const r = l.rooms.find((x) => x.id === roomId)
      if (r && !r.name.trim() && !r.roomType && !r.view && !r.size) set((x) => ({ ...x, rooms: x.rooms.filter((y) => y.id !== roomId) }))
    }
    setRoomTried(false)
    setParams({ step: 'rooms' })
    window.scrollTo({ top: 0 })
  }
  const roomNext = () => {
    const r = l?.rooms.find((x) => x.id === roomId)
    if (!r) return closeRoom()
    if (!roomSectionDone(r, sec)) {
      setRoomTried(true)
      return
    }
    if (l && saveState === 'dirty' && l.status === 'draft') save(l)
    const title = roomSections[sec - 1].title
    setToast({ text: `${title.charAt(0)}${title.slice(1).toLowerCase()} ${sec === 5 ? '— room saved' : 'have been saved'}`, n: 3 })
    if (sec < 5) openRoom(r.id, sec + 1)
    else closeRoom()
  }

  const lsec = l ? Math.min(3, Math.max(1, Number(params.get('lsec')) || (legalSections.find((x) => !legalSectionDone(l, x.id))?.id ?? 1))) : 1
  const openLegal = (n: number) => {
    setLegalTried(false)
    setShowErrors(false)
    setParams({ step: 'legal', lsec: String(n) })
    window.scrollTo({ top: 0 })
  }
  const legalNext = () => {
    if (!l) return
    if (!legalSectionDone(l, lsec)) {
      setLegalTried(true)
      return
    }
    if (saveState === 'dirty' && l.status === 'draft') save(l)
    const title = legalSections[lsec - 1].title
    setToast({ text: `${title} has been saved`, n: 3 })
    if (lsec < 3) openLegal(lsec + 1)
    else next()
  }

  const next = () => {
    if (!l) return
    if (!isLive && !stepDone(l, step)) {
      setShowErrors(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    go(steps[index + 1].id)
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

  if (l === undefined) return <Spinner label="Opening property" />
  if (l === null)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold">Property not found</h1>
        <Link to="/app/properties" className="btn-primary mt-6">
          Back to my properties
        </Link>
      </div>
    )
  if (!unlocked(index)) return <Navigate to={`/app/properties/${l.id}/edit?step=basics`} replace />

  const stepBody = {
    basics: <Basics l={l} set={set} show={showErrors} onChangeType={() => setChangingType(true)} />,
    location: <Location l={l} set={set} show={showErrors} />,
    amenities: <Amenities l={l} set={set} />,
    rooms: roomId && l.rooms.some((r) => r.id === roomId) ? (
      <RoomEditor l={l} set={set} room={l.rooms.find((r) => r.id === roomId)!} sec={sec} openSec={(n) => openRoom(roomId, n)} tried={roomTried} goPhotos={() => go('photos')} />
    ) : (
      <Rooms l={l} set={set} roomId={null} openRoom={openRoom} />
    ),
    photos: <Photos l={l} set={set} />,
    policies: <Policies l={l} set={set} />,
    legal: <Legal l={l} set={set} sec={lsec} openSec={openLegal} tried={legalTried} />,
    review: <Review l={l} go={go} onPublish={publish} busy={publishing} result={result} onRetry={async () => setL(await retrySync(l))} />,
  }[step]

  return (
    <div ref={top} className="flex min-h-[calc(100dvh-68px)] flex-col">
      <div className="sticky top-[68px] z-30 border-b border-line bg-white">
        <div className="flex items-center gap-3 px-3 pt-2 sm:px-6">
          <Link to={isLive ? `/app/properties/${l.id}` : '/app/properties'} aria-label="Back to my properties" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-paper">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-[16px]">{l.basics.name.trim() || `New ${l.basics.propertyType.toLowerCase()}`}</strong>
            <span className="text-[12px] text-ink-500" role="status">
              {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? `Not saved: ${saveError}` : saveState === 'dirty' ? (isLive ? 'Unsaved changes' : 'Saving soon…') : isLive ? 'All changes saved' : 'Draft saved'}
            </span>
          </div>
          <KeyTag status={l.status} label={isLive ? undefined : 'In progress'} />
          {isLive && (
            <button type="button" className="btn-primary hidden min-h-10 sm:inline-flex" disabled={saveState !== 'dirty'} onClick={() => save(l)}>
              Save changes
            </button>
          )}
        </div>
        <nav aria-label="Listing steps" className="no-scrollbar mt-1 overflow-x-auto px-3 sm:px-6">
          <ol className="flex min-w-max">
            {steps.map((s, i) => {
              const on = s.id === step
              const open = unlocked(i)
              const done = open && stepDone(l, s.id) && s.id !== 'review'
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!open}
                    aria-current={on ? 'step' : undefined}
                    onClick={() => go(s.id)}
                    title={open ? undefined : 'Complete the earlier steps first'}
                    className={`flex h-12 items-center gap-2 border-b-[3px] px-3 text-[14px] font-semibold whitespace-nowrap transition-colors ${on ? 'border-pine-800 text-ink-900' : 'border-transparent text-ink-700 hover:text-ink-900'} disabled:cursor-not-allowed disabled:text-ink-400`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${done ? 'bg-pine-800 text-white' : on ? 'bg-white text-pine-900 ring-2 ring-pine-800' : 'bg-paper text-ink-500 ring-1 ring-line-strong'}`}>
                      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-label="Done" /> : !open ? <Lock className="h-3 w-3" aria-label="Locked" /> : i + 1}
                    </span>
                    {s.label}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>
      </div>

      <div className="flex-1 px-3 py-8 sm:px-6">
        <div className={`mx-auto flex flex-col gap-5 ${step === 'photos' || step === 'policies' ? 'max-w-[1220px]' : 'max-w-[920px]'}`}>
          {showErrors && !isLive && !stepDone(l, step) && (
            <Notice tone="error">
              <strong className="block">Complete this section to continue:</strong>
              <ul className="mt-1 list-disc pl-5">
                {blockers(l)
                  .filter((c) => c.step === step)
                  .map((c) => (
                    <li key={c.message}>{c.message}</li>
                  ))}
              </ul>
            </Notice>
          )}
          {stepBody}
        </div>
      </div>

      <div className="sticky bottom-0 z-30 border-t border-line bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className={`mx-auto flex items-center justify-between gap-3 px-3 py-3 sm:px-0 ${step === 'photos' || step === 'policies' ? 'max-w-[1220px]' : 'max-w-[920px]'}`}>
          {roomId ? (
            <button type="button" className="min-h-11 px-2 text-[16px] font-bold text-pine-800 hover:underline" onClick={closeRoom}>
              Cancel
            </button>
          ) : index === 0 ? (
            <Link to="/app/properties" className="min-h-11 px-2 py-2.5 text-[16px] font-bold text-pine-800 hover:underline">
              Back
            </Link>
          ) : (
            <button type="button" className="min-h-11 px-2 text-[16px] font-bold text-pine-800 hover:underline" onClick={() => go(steps[index - 1].id)}>
              Back
            </button>
          )}
          <div className="flex gap-2">
            {isLive && (
              <button type="button" className="btn-primary sm:hidden" disabled={saveState !== 'dirty'} onClick={() => save(l)}>
                Save
              </button>
            )}
            {step === 'amenities' && !isLive && minAmenities(l) === 0 && (
              <button type="button" className="btn-ghost min-h-11 px-5" onClick={() => go(steps[index + 1].id)} disabled={!stepDone(l, 'amenities')} title={stepDone(l, 'amenities') ? undefined : 'Finish or untick the amenities that need details first'}>
                Skip
              </button>
            )}
            {roomId ? (
              <button type="button" className="btn-brass min-h-11 px-6" onClick={roomNext}>
                {sec < 5 ? 'Next' : 'Save Room'}
              </button>
            ) : (
              index < steps.length - 1 && (
                <button type="button" className="btn-brass min-h-11 px-6" onClick={step === 'legal' && !isLive ? legalNext : next}>
                  {step === 'basics' ? 'Continue' : step === 'legal' ? 'Save & Continue' : 'Save And Continue'}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="fixed inset-x-3 bottom-20 z-[90] mx-auto flex max-w-[600px] items-center gap-3 rounded-lg bg-pine-800 px-4 py-3.5 text-white shadow-lift">
            <CircleCheck className="h-6 w-6 shrink-0" aria-hidden="true" />
            <strong className="flex-1 text-[15px]">{toast.text}</strong>
            <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] ring-2 ring-white/50">
              {toast.n}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <PropertyTypePicker
        open={changingType}
        initial={l.basics.propertyType}
        confirmLabel="Save type"
        onClose={() => setChangingType(false)}
        onPick={(category, type) => {
          set((x) => ({ ...x, basics: { ...x.basics, category, propertyType: type, ...(category === 'homestay' ? { stars: 0, starsChosen: false } : {}) } }))
          setChangingType(false)
        }}
      />

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
