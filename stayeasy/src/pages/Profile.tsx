import { BadgeCheck, Camera, Crown, LogOut, Mail, MonitorSmartphone, Phone, Plus, Settings2, Trash2, User, Users } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAccount } from '../context/AccountContext'
import { useAuth } from '../context/AuthContext'
import { cities } from '../data/hotels'
import { getPoints } from '../lib/api'
import { initials } from '../lib/names'
import { validateOrgId } from '../lib/orgVerify'
import { useProfile, type CoTraveller, type Profile as P } from '../lib/profile'
import { isDemoMode, supabase } from '../lib/supabase'

type Section = 'profile' | 'preferences' | 'co-travellers' | 'devices'

const field = 'h-12 w-full rounded-lg border border-line-strong bg-white px-3 text-[15px] outline-none focus:border-accent'
const BILLING = 'stayeasy.billing.profile'

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold tracking-wide text-ink-500 uppercase">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-500">{hint}</span>}
    </label>
  )
}

function Card({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-xl font-black">{title}</h2>
      {intro && <p className="mt-0.5 text-sm text-ink-500">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** Resize a picked photo to a small square JPEG so it fits in browser storage. */
async function toAvatar(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = fail
      i.src = url
    })
    const size = 256
    const cv = document.createElement('canvas')
    cv.width = cv.height = size
    const s = Math.min(img.width, img.height)
    cv.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
    return cv.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function deviceLabel() {
  const ua = navigator.userAgent
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS'
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  return `${br} on ${os}`
}

export default function Profile() {
  const { user, loading, signOut } = useAuth()
  const { isBusiness, company, me } = useAccount()
  const { profile, save, name } = useProfile()
  const navigate = useNavigate()
  const loc = useLocation()
  const [params, setParams] = useSearchParams()
  const sec = (['profile', 'preferences', 'co-travellers', 'devices'].includes(params.get('s') ?? '') ? params.get('s') : 'profile') as Section
  const go = (s: Section) => setParams(s === 'profile' ? {} : { s }, { replace: true })

  const [draft, setDraftRaw] = useState<P>(profile)
  const dirty = useRef(false)
  const setDraft: typeof setDraftRaw = (v) => {
    dirty.current = true
    setDraftRaw(v)
  }
  // Follow the saved profile; once you start typing, only sync fields saved elsewhere (photo, co-travellers, phone check).
  useEffect(() => setDraftRaw((d) => (dirty.current ? { ...d, photo: profile.photo, coTravellers: profile.coTravellers, phoneVerified: profile.phoneVerified } : profile)), [profile])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [points, setPoints] = useState<number | null>(null)
  useEffect(() => {
    if (user && !isBusiness) getPoints(user.id).then(setPoints)
  }, [user, isBusiness])

  // Phone verification (demo code until SMS is connected)
  const [otp, setOtp] = useState<{ sent: boolean; code: string; err: string }>({ sent: false, code: '', err: '' })

  // GST details for personal invoices (freelancers / sole proprietors)
  const [billing, setBilling] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`${BILLING}.${user?.id}`) || '{"gstin":"","name":""}') as { gstin: string; name: string }
    } catch {
      return { gstin: '', name: '' }
    }
  })

  // Co-traveller form
  const blankCo: CoTraveller = { id: '', first: '', last: '', gender: '', ageGroup: 'Adult', relation: '', email: '', phone: '' }
  const [co, setCo] = useState<CoTraveller | null>(null)

  const [devMsg, setDevMsg] = useState('')

  if (!loading && !user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />
  if (!user) return null

  const flash = (m: string) => {
    setMsg(m)
    setErr('')
    setTimeout(() => setMsg(''), 2500)
  }

  const saveProfile = (e?: FormEvent) => {
    e?.preventDefault()
    if (!draft.first.trim()) return setErr('Enter your first name as on your ID.')
    if (draft.phone && !/^[6-9]\d{9}$/.test(draft.phone)) return setErr('Enter a 10-digit Indian mobile number.')
    if (draft.idLast4 && !/^[0-9A-Z]{4}$/i.test(draft.idLast4)) return setErr('Enter only the last 4 characters of your ID.')
    if (billing.gstin) {
      const r = validateOrgId('GSTIN', billing.gstin)
      if (!r.ok) return setErr(`GST details: ${r.error}`)
    }
    try {
      localStorage.setItem(`${BILLING}.${user.id}`, JSON.stringify(billing))
    } catch {
      /* ignore */
    }
    dirty.current = false
    save({ ...draft, first: draft.first.trim(), last: draft.last.trim() })
    flash('Profile saved.')
  }

  const banner = cities.find((c) => c.name === draft.city)?.image ?? '/destinations/new-delhi.webp'
  const set = <K extends keyof P>(k: K, v: P[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const setPref = <K extends keyof P['prefs']>(k: K, v: P['prefs'][K]) => setDraft((d) => ({ ...d, prefs: { ...d.prefs, [k]: v } }))
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const side: { id: Section | 'logout'; label: string; Icon: typeof User }[] = [
    { id: 'profile', label: 'My Profile', Icon: User },
    { id: 'preferences', label: 'Preferences', Icon: Settings2 },
    { id: 'co-travellers', label: 'Co-Travellers', Icon: Users },
    { id: 'devices', label: 'Logged In Devices', Icon: MonitorSmartphone },
    { id: 'logout', label: 'Logout', Icon: LogOut },
  ]

  const saveBar = (
    <div className="sticky bottom-0 z-10 -mx-1 mt-2 flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white/95 px-4 py-3 shadow-[0_-4px_14px_rgba(15,23,42,0.08)] backdrop-blur">
      {err && (
        <p role="alert" className="mr-auto text-sm font-semibold text-ember-600">
          {err}
        </p>
      )}
      {msg && (
        <p role="status" className="mr-auto text-sm font-semibold text-leaf-700">
          {msg}
        </p>
      )}
      <button type="submit" className="btn min-h-12 rounded-full bg-gradient-to-r from-accent-400 to-accent px-14 text-base font-black text-white uppercase shadow-card">
        Save
      </button>
    </div>
  )

  return (
    <div className="container-page max-w-[1200px] pt-6 pb-16">
      <div className="grid items-start gap-5 lg:grid-cols-[250px_1fr]">
        <nav aria-label="Account" className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-white p-2 shadow-card lg:sticky lg:top-24 lg:flex-col lg:overflow-visible">
          {side.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={sec === id ? 'page' : undefined}
              onClick={async () => {
                if (id === 'logout') {
                  await signOut()
                  navigate('/')
                } else go(id)
              }}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-3.5 text-left text-[15px] font-bold ${sec === id ? 'bg-accent-50 text-accent' : 'text-ink-700 hover:bg-mist'}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>

        <form onSubmit={saveProfile} noValidate className="flex min-w-0 flex-col gap-5">
          {/* Banner */}
          <section className="relative overflow-hidden rounded-xl shadow-card">
            <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className={`absolute inset-0 ${isBusiness ? 'bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(255,240,232,0.9)_45%,rgba(255,240,232,0.25)_100%)]' : 'bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(234,242,255,0.9)_45%,rgba(234,242,255,0.25)_100%)]'}`} />
            <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
              <label className="group relative flex h-[110px] w-[110px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#EEF1F6] ring-4 ring-white">
                {draft.photo ? (
                  <img src={draft.photo} alt="Your profile photo" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center text-accent">
                    <Camera className="h-7 w-7" aria-hidden="true" />
                    <span className="mt-1 text-xs font-black uppercase">Add Photo</span>
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100">{draft.photo ? 'Change' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label="Upload profile photo"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    if (f.size > 8_000_000) return setErr('Choose a photo under 8 MB.')
                    try {
                      const photo = await toAvatar(f)
                      save({ ...profile, photo })
                      flash('Photo updated.')
                    } catch {
                      setErr('Could not read that image. Try a JPG or PNG.')
                    }
                  }}
                />
              </label>
              <div className="min-w-0">
                <strong className="block truncate text-[26px] leading-tight font-black">{name || 'Add your name'}</strong>
                <span className="mt-2 flex flex-col gap-1 text-[15px] text-ink-700">
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4" aria-hidden="true" /> {profile.phone ? `+91 ${profile.phone}` : 'Add mobile number'}
                    {profile.phoneVerified && <BadgeCheck className="h-4 w-4 text-leaf-700" aria-label="Verified" />}
                  </span>
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" aria-hidden="true" /> {user.email} <BadgeCheck className="h-4 w-4 text-leaf-700" aria-label="Verified" />
                  </span>
                </span>
                {isBusiness && company && (
                  <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-ember-600 shadow-sm">
                    {company.name} · {me?.role === 'admin' ? 'Admin' : 'Employee'}
                  </span>
                )}
              </div>
              {!isBusiness && (
                <Link to="/club" className="flex items-center gap-3 rounded-xl bg-navy-900 px-4 py-3 text-white no-underline sm:ml-auto">
                  <Crown className="h-6 w-6 text-ember-200" aria-hidden="true" />
                  <span>
                    <strong className="block">{points ?? '…'} Club points</strong>
                    <span className="text-xs text-[#D3DCEE]">Worth ₹{points ?? '…'} on your next stay</span>
                  </span>
                </Link>
              )}
            </div>
          </section>

          {sec === 'profile' && (
            <>
              <Card title="General Information" intro="Use your name exactly as on your government ID — hotels check it at the front desk.">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Row label="First & middle name">
                    <input className={field} value={draft.first} onChange={(e) => set('first', e.target.value)} autoComplete="given-name" />
                  </Row>
                  <Row label="Last name">
                    <input className={field} value={draft.last} onChange={(e) => set('last', e.target.value)} autoComplete="family-name" />
                  </Row>
                  <Row label="Gender">
                    <select className={field} value={draft.gender} onChange={(e) => set('gender', e.target.value)}>
                      <option value="" disabled hidden>Select</option>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Other</option>
                      <option>Prefer not to say</option>
                    </select>
                  </Row>
                  <Row label="Date of birth">
                    <input type="date" className={field} value={draft.dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('dob', e.target.value)} />
                  </Row>
                  <Row label="Nationality">
                    <select className={field} value={draft.nationality} onChange={(e) => set('nationality', e.target.value)}>
                      <option>Indian</option>
                      <option>Other</option>
                    </select>
                  </Row>
                  <Row label="Marital status">
                    <select className={field} value={draft.marital} onChange={(e) => set('marital', e.target.value)}>
                      <option value="" disabled hidden>Select</option>
                      <option>Single</option>
                      <option>Married</option>
                      <option>Prefer not to say</option>
                    </select>
                  </Row>
                  <Row label="City of residence">
                    <input className={field} value={draft.city} onChange={(e) => set('city', e.target.value)} list="profile-cities" autoComplete="address-level2" />
                    <datalist id="profile-cities">
                      {cities.map((c) => (
                        <option key={c.name} value={c.name} />
                      ))}
                    </datalist>
                  </Row>
                  {isBusiness && (
                    <Row label="Booker type">
                      <select className={field} value={draft.bookerType} onChange={(e) => set('bookerType', e.target.value)}>
                        <option value="" disabled hidden>Select</option>
                        <option>Self booker</option>
                        <option>Books for my team</option>
                        <option>Travel desk / assistant</option>
                      </select>
                    </Row>
                  )}
                </div>
              </Card>

              <Card title="Contact Details">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Row label="Mobile number" hint={draft.phoneVerified && draft.phone === profile.phone ? 'Verified' : undefined}>
                    <div className="flex overflow-hidden rounded-lg border border-line-strong focus-within:border-accent">
                      <span className="flex items-center bg-mist px-3 text-sm font-bold">+91</span>
                      <input
                        inputMode="numeric"
                        className="h-12 min-w-0 flex-1 px-3 text-[15px] outline-none"
                        value={draft.phone}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                          setDraft((d) => ({ ...d, phone: v, phoneVerified: v === profile.phone && profile.phoneVerified }))
                          setOtp({ sent: false, code: '', err: '' })
                        }}
                        autoComplete="tel-national"
                      />
                      {draft.phone.length === 10 && !(draft.phoneVerified && draft.phone === profile.phone) && (
                        <button type="button" onClick={() => setOtp({ sent: true, code: '', err: '' })} className="px-4 text-sm font-black text-accent uppercase">
                          Verify
                        </button>
                      )}
                      {draft.phoneVerified && draft.phone === profile.phone && <BadgeCheck className="mr-3 h-5 w-5 self-center text-leaf-700" aria-label="Verified" />}
                    </div>
                    {otp.sent && (
                      <span className="mt-2 flex flex-col gap-2 rounded-lg bg-mist p-3">
                        <span className="text-[13px] text-ink-700">Enter the 6-digit code sent to +91 {draft.phone}. (Demo: SMS isn’t connected yet, so any 6 digits work.)</span>
                        <span className="flex gap-2">
                          <input inputMode="numeric" aria-label="Verification code" className="h-10 w-32 rounded-lg border border-line-strong px-3 font-mono tracking-[0.3em]" value={otp.code} onChange={(e) => setOtp({ ...otp, code: e.target.value.replace(/\D/g, '').slice(0, 6), err: '' })} />
                          <button
                            type="button"
                            className="btn-navy min-h-10 text-sm"
                            onClick={() => {
                              if (otp.code.length !== 6) return setOtp({ ...otp, err: 'Enter all 6 digits.' })
                              const next = { ...profile, ...draft, phoneVerified: true }
                              save(next)
                              setOtp({ sent: false, code: '', err: '' })
                              flash('Mobile number verified.')
                            }}
                          >
                            Confirm
                          </button>
                        </span>
                        {otp.err && <span className="text-[13px] font-semibold text-ember-600">{otp.err}</span>}
                      </span>
                    )}
                  </Row>
                  <Row label="Email ID">
                    <div className="flex h-12 items-center justify-between rounded-lg border border-line-strong bg-mist px-3 text-[15px]">
                      <span className="truncate">{user.email}</span>
                      <BadgeCheck className="h-5 w-5 shrink-0 text-leaf-700" aria-label="Verified" />
                    </div>
                  </Row>
                </div>
              </Card>

              <Card title="Documents Details" intro="We only keep the last 4 characters, enough for the hotel to match your ID at check-in.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Row label="ID type">
                    <select className={field} value={draft.idType} onChange={(e) => set('idType', e.target.value)}>
                      <option value="" disabled hidden>Select</option>
                      <option>Passport</option>
                      <option>Aadhaar</option>
                      <option>Driving licence</option>
                      <option>Voter ID</option>
                    </select>
                  </Row>
                  <Row label="Last 4 characters">
                    <input className={`${field} font-mono tracking-[0.3em] uppercase`} maxLength={4} value={draft.idLast4} onChange={(e) => set('idLast4', e.target.value.toUpperCase())} placeholder="XXXX" />
                  </Row>
                </div>
              </Card>

              {!isBusiness && (
                <Card title="GST details for invoices" intro="Optional. Add your GSTIN if you’re a freelancer or proprietor and want GST invoices for your stays.">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Row label="GSTIN">
                      <input className={`${field} font-mono uppercase`} maxLength={15} value={billing.gstin} onChange={(e) => setBilling({ ...billing, gstin: e.target.value.toUpperCase() })} placeholder="15-character GSTIN" />
                    </Row>
                    <Row label="Business name">
                      <input className={field} value={billing.name} onChange={(e) => setBilling({ ...billing, name: e.target.value })} />
                    </Row>
                  </div>
                </Card>
              )}
              {saveBar}
            </>
          )}

          {sec === 'preferences' && (
            <>
              <Card title="Stay preferences" intro="We pass these to the hotel with every booking. They’re requests, not guarantees.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Row label="Bed type">
                    <select className={field} value={draft.prefs.bed} onChange={(e) => setPref('bed', e.target.value)}>
                      <option>No preference</option>
                      <option>Double bed</option>
                      <option>Twin beds</option>
                    </select>
                  </Row>
                  <Row label="Floor">
                    <select className={field} value={draft.prefs.floor} onChange={(e) => setPref('floor', e.target.value)}>
                      <option>No preference</option>
                      <option>Higher floor</option>
                      <option>Lower floor</option>
                      <option>Near the lift</option>
                    </select>
                  </Row>
                  <Row label="Smoking">
                    <select className={field} value={draft.prefs.smoking} onChange={(e) => setPref('smoking', e.target.value)}>
                      <option>Non-smoking</option>
                      <option>Smoking</option>
                    </select>
                  </Row>
                  <Row label="Meal">
                    <select className={field} value={draft.prefs.meal} onChange={(e) => setPref('meal', e.target.value)}>
                      <option>No preference</option>
                      <option>Vegetarian</option>
                      <option>Jain</option>
                      <option>Vegan</option>
                    </select>
                  </Row>
                </div>
                <span className="mt-5 block text-[13px] font-bold tracking-wide text-ink-500 uppercase">Special requests</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['Early check-in', 'Late check-out', 'Quiet room', 'Extra pillows', 'Airport pickup', 'Accessible room'].map((r) => {
                    const on = draft.prefs.requests.includes(r)
                    return (
                      <button key={r} type="button" aria-pressed={on} onClick={() => setPref('requests', toggle(draft.prefs.requests, r))} className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${on ? 'border-accent bg-accent-50 text-accent' : 'border-line-strong bg-white text-ink-700'}`}>
                        {r}
                      </button>
                    )
                  })}
                </div>
              </Card>
              <Card title="Notifications" intro="How should we send booking updates?">
                <div className="flex flex-wrap gap-2">
                  {['Email', 'SMS', 'WhatsApp'].map((ch) => {
                    const on = draft.prefs.channels.includes(ch)
                    return (
                      <label key={ch} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 ${on ? 'border-accent bg-accent-50' : 'border-line-strong'}`}>
                        <input type="checkbox" checked={on} onChange={() => setPref('channels', toggle(draft.prefs.channels, ch))} className="h-4 w-4 accent-accent" />
                        <span className="text-sm font-bold">{ch}</span>
                      </label>
                    )
                  })}
                </div>
              </Card>
              {saveBar}
            </>
          )}

          {sec === 'co-travellers' && (
            <Card title="Co-Travellers" intro="Save people you often travel with, so you can add them to a booking in one tap.">
              {profile.coTravellers.length === 0 && !co && <p className="rounded-xl bg-canvas p-4 text-sm text-ink-500">No co-travellers saved yet.</p>}
              <ul className="flex flex-col gap-2">
                {profile.coTravellers.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-sm font-extrabold text-accent">{initials(`${t.first} ${t.last}`)}</span>
                      <span>
                        <strong className="block">
                          {t.first} {t.last}
                        </strong>
                        <span className="text-sm text-ink-500">{[t.relation, t.ageGroup, t.gender].filter(Boolean).join(' · ')}</span>
                      </span>
                    </span>
                    <span className="flex gap-2">
                      <button type="button" className="btn-outline min-h-9 text-sm" onClick={() => setCo(t)}>
                        Edit
                      </button>
                      <button type="button" aria-label={`Remove ${t.first}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-[#FDECEC] hover:text-[#B42318]" onClick={() => save({ ...profile, coTravellers: profile.coTravellers.filter((x) => x.id !== t.id) })}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              {co ? (
                <div className="mt-4 grid gap-4 rounded-xl bg-canvas p-4 sm:grid-cols-2">
                  <Row label="First name">
                    <input className={field} value={co.first} onChange={(e) => setCo({ ...co, first: e.target.value })} />
                  </Row>
                  <Row label="Last name">
                    <input className={field} value={co.last} onChange={(e) => setCo({ ...co, last: e.target.value })} />
                  </Row>
                  <Row label="Relation">
                    <select className={field} value={co.relation} onChange={(e) => setCo({ ...co, relation: e.target.value })}>
                      <option value="" disabled hidden>Select</option>
                      {(isBusiness ? ['Colleague', 'Client', 'Interviewee', 'Other'] : ['Spouse', 'Child', 'Parent', 'Sibling', 'Friend', 'Other']).map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </Row>
                  <Row label="Age group">
                    <select className={field} value={co.ageGroup} onChange={(e) => setCo({ ...co, ageGroup: e.target.value as CoTraveller['ageGroup'] })}>
                      <option>Adult</option>
                      <option>Child</option>
                    </select>
                  </Row>
                  <Row label="Email (optional)">
                    <input type="email" className={field} value={co.email} onChange={(e) => setCo({ ...co, email: e.target.value })} />
                  </Row>
                  <Row label="Mobile (optional)">
                    <input inputMode="numeric" className={field} value={co.phone} onChange={(e) => setCo({ ...co, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                  </Row>
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="button"
                      className="btn-navy"
                      onClick={() => {
                        if (!co.first.trim()) return setErr('Enter the co-traveller’s first name.')
                        const item = { ...co, id: co.id || crypto.randomUUID(), first: co.first.trim(), last: co.last.trim() }
                        const exists = profile.coTravellers.some((x) => x.id === item.id)
                        save({ ...profile, coTravellers: exists ? profile.coTravellers.map((x) => (x.id === item.id ? item : x)) : [...profile.coTravellers, item] })
                        setCo(null)
                        flash('Co-traveller saved.')
                      }}
                    >
                      Save co-traveller
                    </button>
                    <button type="button" className="btn-outline" onClick={() => setCo(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn-outline mt-4" onClick={() => setCo(blankCo)}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add co-traveller
                </button>
              )}
              {(msg || err) && <p className={`mt-3 text-sm font-semibold ${err ? 'text-ember-600' : 'text-leaf-700'}`}>{err || msg}</p>}
            </Card>
          )}

          {sec === 'devices' && (
            <Card title="Logged In Devices" intro="Devices where your account is signed in.">
              <ul className="flex flex-col gap-2">
                <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent bg-accent-50 px-4 py-3">
                  <span className="flex items-center gap-3">
                    <MonitorSmartphone className="h-6 w-6 text-accent" aria-hidden="true" />
                    <span>
                      <strong className="block">{deviceLabel()}</strong>
                      <span className="text-sm text-ink-500">This device · active now</span>
                    </span>
                  </span>
                  <span className="rounded-full bg-[#E3FAF6] px-2.5 py-1 text-xs font-bold text-[#0F7C70]">Current</span>
                </li>
              </ul>
              <p className="mt-3 text-sm text-ink-500">Signed in somewhere you don’t recognise? Sign out everywhere else. You’ll stay signed in here.</p>
              <button
                type="button"
                className="btn-outline mt-3 text-ember-600"
                onClick={async () => {
                  if (isDemoMode || !supabase) return setDevMsg('Demo mode: there are no other sessions. Once the live database is connected, this signs out every other device.')
                  const { error } = await supabase.auth.signOut({ scope: 'others' })
                  setDevMsg(error ? `Could not sign out other devices: ${error.message}` : 'Signed out of all other devices.')
                }}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Log out of all other devices
              </button>
              {devMsg && (
                <p role="status" className="mt-3 text-sm font-semibold text-navy-800">
                  {devMsg}
                </p>
              )}
            </Card>
          )}
        </form>
      </div>
    </div>
  )
}

