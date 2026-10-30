import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, CircleAlert, CircleCheck, ExternalLink, Info, Lightbulb, Lock, MapPin, Plus, Search, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { CodeBoxes, Popup, useCountdown } from '../components/Auth'
import { AmenityExtrasBox, hasExtras } from '../components/AmenityExtras'
import MapPicker, { placeAt, searchPlaces, type Place } from '../components/MapPicker'
import PhotoManager from '../components/PhotoManager'
import { PropertyTypePicker } from '../components/PropertyTypePicker'
import { Chip, KeyTag, Notice, Spinner, Toggle } from '../components/ui'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { amenityGroups, bedTypes, cancellationOptions, checkTimes, roomAmenities } from '../data/options'
import { inr, uid } from '../lib/format'
import { demoIds, gstinError, gstinState, ifscError, panError } from '../lib/gstin'
import { basicsErrors, blockers, locationErrors, fromPrice, guestRules, quality, stepDone, steps, tips, toHotel, type StepId } from '../lib/listing'
import { checkContactCode, CONTACT_CODE_LENGTH, getListing, publishListing, PublishError, retrySync, saveListing, sendContactCode } from '../lib/store'
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

  if (id === 'new') return <Navigate to="/app/properties?new=1" replace />

  const isLive = !!l && l.status !== 'draft'
  // A tab opens once every tab before it is complete. Live listings can jump anywhere.
  const unlocked = (i: number) => isLive || (!!l && steps.slice(0, i).every((s) => stepDone(l, s.id)))

  const go = (s: StepId) => {
    if (l && saveState === 'dirty' && l.status === 'draft') save(l)
    setShowErrors(false)
    setParams({ step: s }, { replace: false })
    top.current?.scrollIntoView({ block: 'start' })
    window.scrollTo({ top: 0 })
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
    rooms: <Rooms l={l} set={set} goPhotos={() => go('photos')} />,
    photos: <Photos l={l} set={set} />,
    policies: <Policies l={l} set={set} />,
    legal: <Legal l={l} set={set} />,
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
        <div className="mx-auto flex max-w-[920px] flex-col gap-5">
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
        <div className="mx-auto flex max-w-[920px] items-center justify-between gap-3 px-3 py-3 sm:px-0">
          {index === 0 ? (
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
            {index < steps.length - 1 && (
              <button type="button" className="btn-brass min-h-11 px-6" onClick={next}>
                {step === 'basics' ? 'Continue' : 'Save And Continue'}
              </button>
            )}
          </div>
        </div>
      </div>

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
