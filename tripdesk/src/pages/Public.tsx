import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BadgePercent,
  Briefcase,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  FileText,
  Heart,
  IndianRupee,
  MessageCircle,
  PartyPopper,
  Sparkles,
  Undo2,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AGENT_DISCOUNT, defaultMarkup } from '@stayeasy/lib/agentRates'
import { inr } from '@stayeasy/lib/format'
import { Logo, Notice, RateSlip } from '../components/ui'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { gstinError, panError } from '../lib/gstin'
import { registerAgency } from '../lib/store'
import { isDemoMode } from '../lib/supabase'
import type { Agency } from '../lib/types'

const pct = Math.round(AGENT_DISCOUNT * 100)

const faqs = [
  ['Who can join?', 'Registered travel agencies and individual travel agents in India. You need a PAN, and a GSTIN if your agency is GST-registered.'],
  ['How do I get paid?', 'You set a markup on top of the net rate. You collect the full selling price from your customer; TRPotels takes only the net rate from your wallet. The difference is yours.'],
  ['Can my customer see my net rate?', 'No. Quotes and vouchers show only the price you set. You can also hide the price on vouchers completely.'],
  ['What if my customer cancels?', 'Cancel from Bookings within the hotel’s free-cancellation window and the full net amount goes back to your wallet straight away.'],
  ['Can my staff use the same account?', 'Yes. Add team members by email in Settings. Each person signs in with their own email; bookings show who made them.'],
]

/* ───────────────────────── Email + code sign-in (hero card and /login) ───────────────────────── */

function EmailCode({ onDone, compact = false }: { onDone: () => void; compact?: boolean }) {
  const { sendCode, verifyCode } = useSession()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const codeRef = useRef<HTMLInputElement>(null)

  const send = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.')
    setBusy(true)
    try {
      await sendCode(email.trim())
      setStep('code')
      setTimeout(() => codeRef.current?.focus(), 30)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t send the code.')
    } finally {
      setBusy(false)
    }
  }
  const verify = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await verifyCode(email.trim(), code)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code didn’t work.')
      setBusy(false)
    }
  }
  const err = error && (
    <p role="alert" className="text-sm font-bold text-alert">
      {error}
    </p>
  )
  return step === 'email' ? (
    <form onSubmit={send} noValidate className="flex flex-col gap-4">
      <label className="label">
        Work email
        <input className="field min-h-12 text-base" type="email" autoComplete="email" autoFocus={!compact} placeholder="you@youragency.in" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
      </label>
      {err}
      <button type="submit" className="btn-gold min-h-12 text-base" disabled={busy}>
        {busy ? 'Sending code…' : 'Continue'}
        {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </button>
      <p className="text-[13px] text-muted">No password. We email you a 6-digit code. New agency? Sign in first, then register.</p>
    </form>
  ) : (
    <form onSubmit={verify} className="flex flex-col gap-4">
      <p className="text-[15px] text-ink-700">
        Code sent to <strong className="text-ink-950">{email}</strong>
      </p>
      <label className="label">
        6-digit code
        <input ref={codeRef} className="field min-h-12 text-center text-2xl font-bold tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-invalid={!!error} />
      </label>
      {isDemoMode && <Notice>Demo mode: any 6 digits work.</Notice>}
      {err}
      <button type="submit" className="btn-gold min-h-12 text-base" disabled={busy || code.length !== 6}>
        {busy ? 'Checking…' : 'Sign in'}
      </button>
      <button
        type="button"
        className="self-start text-sm font-bold text-ink-700 underline-offset-2 hover:underline"
        onClick={() => {
          setStep('email')
          setCode('')
          setError('')
        }}
      >
        Use a different email
      </button>
    </form>
  )
}

/* ───────────────────────── Landing ───────────────────────── */

const heroFeatures: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: BadgePercent, title: 'Net rates', text: `Every hotel at ${pct}% below the public price on ${site.marketplace}.` },
  { icon: IndianRupee, title: 'Your markup', text: 'Set it once, city by city, or on a single booking. What you add is yours.' },
  { icon: MessageCircle, title: 'WhatsApp quotes', text: 'Put several hotels in one quote and send it to your customer in a minute.' },
  { icon: Undo2, title: 'Instant refunds', text: 'Cancel inside the free window and the net amount is back in your wallet.' },
]

function Section({ id, eyebrow, title, intro, children, className = '' }: { id?: string; eyebrow?: string; title: ReactNode; intro?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={`page scroll-mt-20 py-16 sm:py-20 ${className}`}>
      <div className="mx-auto mb-10 max-w-2xl text-center">
        {eyebrow && <span className="text-[13px] font-bold tracking-[0.14em] text-gold-700 uppercase">{eyebrow}</span>}
        <h2 id={id ? `${id}-h` : undefined} className="mt-2 text-[30px] leading-tight font-light text-ink-950 sm:text-[40px]">
          {title}
        </h2>
        {intro && <p className="mt-3 text-[17px] text-muted">{intro}</p>}
      </div>
      {children}
    </section>
  )
}

function Header() {
  const { user, agency } = useSession()
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${solid ? 'bg-ink-950/95 shadow-lg backdrop-blur' : 'bg-transparent'}`}>
      <div className="page flex h-[68px] items-center justify-between gap-4">
        <Logo light />
        <nav aria-label="Sections" className="hidden items-center gap-7 text-[15px] font-bold text-ink-100 lg:flex">
          {[
            ['#why', `Why ${site.name}?`],
            ['#advantages', 'Advantages'],
            ['#trips', 'Trips you can sell'],
            ['#faq', 'FAQs'],
          ].map(([h, t]) => (
            <a key={h} href={h} className="no-underline transition-colors hover:text-gold-500">
              {t}
            </a>
          ))}
        </nav>
        {user ? (
          <Link to={agency ? '/app' : '/register'} className="btn min-h-10 rounded-full bg-white/10 px-5 text-white ring-1 ring-white/30 hover:bg-white/20">
            {agency ? 'Open portal' : 'Finish registration'}
          </Link>
        ) : (
          <Link to="/login" className="btn min-h-10 rounded-full bg-white/10 px-5 text-white ring-1 ring-white/30 hover:bg-white/20">
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}

function FeatureRotator() {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const auto = !reduce && !paused
  useEffect(() => {
    if (!auto) return
    const t = setTimeout(() => setI((x) => (x + 1) % heroFeatures.length), 5000)
    return () => clearTimeout(t)
  }, [i, auto])
  const f = heroFeatures[i]
  return (
    <div className="mt-8 max-w-xl" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div role="tablist" aria-label="What you get" className="flex flex-wrap gap-2">
        {heroFeatures.map((x, j) => {
          const Icon = x.icon
          const on = j === i
          return (
            <button
              key={x.title}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="hero-feature"
              onClick={() => setI(j)}
              className={`relative flex min-h-10 items-center gap-2 overflow-hidden rounded-full px-4 text-sm font-bold transition-colors ${on ? 'bg-white text-ink-950' : 'bg-white/10 text-ink-100 hover:bg-white/15'}`}
            >
              <Icon className={`h-4 w-4 ${on ? 'text-gold-600' : ''}`} aria-hidden="true" />
              {x.title}
              {on && auto && <span key={i} aria-hidden="true" className="fill-bar absolute inset-x-0 bottom-0 h-[3px] bg-gold-500" />}
            </button>
          )
        })}
      </div>
      <div id="hero-feature" role="tabpanel" aria-live="polite" className="mt-4 min-h-[52px]">
        <AnimatePresence mode="wait">
          <motion.p key={f.title} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="text-[17px] text-ink-100">
            {f.text}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

function GetStarted() {
  const { user, agency } = useSession()
  const navigate = useNavigate()
  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(8,12,32,0.35)]">
      <div className="p-6 sm:p-7">
        {user ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-[24px] font-black text-ink-950">Welcome back</h2>
            <p className="text-[15px] text-muted">Signed in as {user.email}.</p>
            <Link to={agency ? '/app' : '/register'} className="btn-gold min-h-12 text-base">
              {agency ? 'Open your portal' : 'Finish registering your agency'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-[24px] font-black text-ink-950">Get started</h2>
            <p className="mt-1 mb-5 text-[15px] text-muted">Sign in or join as a {site.name} partner.</p>
            <EmailCode compact onDone={() => navigate('/app', { replace: true })} />
          </>
        )}
      </div>
      <div className="flex items-center gap-3 border-t border-gold-100 bg-gold-50 px-6 py-4 sm:px-7">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500 text-ink-950">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm text-ink-800">
          <strong className="text-ink-950">Free to join.</strong> No monthly fee. Net rates from your first booking.
        </p>
      </div>
    </div>
  )
}

const demoRooms = [
  { label: 'Deluxe room', note: 'Leisure stay', photo: '/hotels/orange-oasis/room-2.webp', price: 4900 },
  { label: 'Executive room', note: 'Business trip', photo: '/hotels/prime-oasis-blue/room-1.webp', price: 3600 },
  { label: 'Family room', note: 'Holiday for four', photo: '/hotels/red-vibe/room-3.webp', price: 6200 },
]

function MarkupDemo() {
  const [r, setR] = useState(0)
  const [m, setM] = useState(defaultMarkup.type === 'pct' ? defaultMarkup.value : 8)
  const room = demoRooms[r]
  const net = Math.round(room.price * (1 - AGENT_DISCOUNT))
  const markup = Math.round((net * m) / 100)
  const selling = net + markup
  const diff = room.price - selling
  return (
    <div className="card overflow-hidden shadow-slip">
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.img key={room.photo} src={room.photo} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="aspect-[16/8] w-full object-cover" />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent" />
        <div role="radiogroup" aria-label="Example room" className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2">
          {demoRooms.map((x, j) => (
            <button key={x.label} type="button" role="radio" aria-checked={r === j} onClick={() => setR(j)} className={`min-h-9 rounded-full px-3 text-[13px] font-bold transition-colors ${r === j ? 'bg-gold-500 text-ink-950' : 'bg-ink-950/60 text-white backdrop-blur hover:bg-ink-950/80'}`}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] text-muted">{room.note}, public price per night</span>
          <strong className="text-lg text-ink-950">{inr(room.price)}</strong>
        </div>
        <label className="flex flex-col gap-2">
          <span className="flex items-center justify-between text-sm font-bold text-ink-700">
            Your markup <span className="rounded-full bg-earn-50 px-2.5 py-0.5 text-earn">{m}%</span>
          </span>
          <input type="range" min={0} max={20} step={1} value={m} onChange={(e) => setM(Number(e.target.value))} className="h-2 w-full cursor-pointer accent-gold-500" aria-valuetext={`${m} percent`} />
        </label>
        <RateSlip net={net} markup={markup} selling={selling} size="md" />
        <p className={`text-sm font-bold ${diff >= 0 ? 'text-earn' : 'text-gold-700'}`}>
          {diff > 0 ? `Your customer still pays ${inr(diff)} less than the public price.` : diff === 0 ? 'Your customer pays the same as the public price.' : `This is ${inr(-diff)} above the public price. Customers may compare.`}
        </p>
        <span className="text-[12px] text-faint">Example only, before taxes. Real rates show after you sign in.</span>
      </div>
    </div>
  )
}

const whyFeatures: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: BadgePercent, title: 'Net rates on every hotel', text: `The same hotels, photos and rooms as ${site.marketplace}, at ${pct}% below the public price.` },
  { icon: IndianRupee, title: 'Your markup, your rules', text: 'A percentage or a fixed amount per room night, for all hotels or city by city.' },
  { icon: MessageCircle, title: 'Quotes in a minute', text: 'Several options in one quote, sent as a WhatsApp message or a PDF with your agency name.' },
  { icon: Wallet, title: 'One wallet for everything', text: 'Top up once, book instantly, and get refunds back in seconds, not days.' },
]

type AdvKey = 'quote' | 'voucher' | 'wallet' | 'earn'
const advantages: { key: AdvKey; icon: LucideIcon; title: string; text: string }[] = [
  { key: 'quote', icon: MessageCircle, title: 'Quotes your customer can read', text: 'Compare hotels side by side, then share on WhatsApp. Customers never see your net rate.' },
  { key: 'voucher', icon: FileText, title: 'Vouchers with your agency name', text: 'Every voucher carries your agency’s name and phone. Hide the price if you like.' },
  { key: 'wallet', icon: Wallet, title: 'Wallet with instant refunds', text: 'One balance for all bookings. Cancel inside the free window and the money comes straight back.' },
  { key: 'earn', icon: ChartColumn, title: 'Earnings you can show your accountant', text: 'Net, markup and selling price for every booking, month by month.' },
]

function Screen({ k }: { k: AdvKey }) {
  if (k === 'quote')
    return (
      <div className="flex h-full flex-col gap-2 p-3">
        <span className="text-[11px] font-bold text-ink-950">New quote · Goa, 3 options</span>
        {[
          ['/hotels/orange-oasis/room-1.webp', 'Option 1 · Deluxe', 9520, 700],
          ['/hotels/red-vibe/room-2.webp', 'Option 2 · Premium', 11840, 880],
          ['/hotels/csfc/room-1.webp', 'Option 3 · Suite', 14260, 1060],
        ].map(([img, t, p, e]) => (
          <div key={t as string} className="flex items-center gap-2 rounded-md bg-white p-1.5 ring-1 ring-line">
            <img src={img as string} alt="" className="h-8 w-11 rounded object-cover" />
            <span className="flex-1 text-[10px] font-bold text-ink-900">{t}</span>
            <span className="text-right text-[10px] leading-tight">
              <b className="block">{inr(p as number)}</b>
              <span className="text-earn">+{inr(e as number)}</span>
            </span>
          </div>
        ))}
        <span className="mt-auto flex items-center justify-center gap-1 rounded-md bg-gold-500 py-1.5 text-[10px] font-bold text-ink-950">
          <MessageCircle className="h-3 w-3" aria-hidden="true" /> Send on WhatsApp
        </span>
      </div>
    )
  if (k === 'voucher')
    return (
      <div className="flex h-full flex-col p-3">
        <div className="flex flex-1 flex-col gap-1.5 rounded-md bg-white p-3 ring-1 ring-line">
          <div className="flex items-center justify-between border-b border-dashed border-line-strong pb-1.5">
            <b className="text-[11px] text-ink-950">Your Agency Name</b>
            <span className="rounded bg-earn-50 px-1.5 text-[9px] font-bold text-earn">CONFIRMED</span>
          </div>
          <span className="text-[10px] text-muted">Hotel voucher · Booking SE-24817</span>
          <b className="text-[12px] text-ink-950">Deluxe Room × 2</b>
          <span className="text-[10px] text-ink-700">12 Dec to 14 Dec · 4 adults</span>
          <span className="text-[10px] text-ink-700">Lead guest: Mr A. Mehta</span>
          <span className="mt-auto text-[9px] text-faint">Questions? Call your agent: +91 98xxx xxxxx</span>
        </div>
      </div>
    )
  if (k === 'wallet')
    return (
      <div className="flex h-full flex-col gap-2 p-3">
        <div className="rounded-md bg-ink-900 p-2.5 text-white">
          <span className="text-[10px] text-ink-100">Wallet balance</span>
          <b className="block text-[18px]">₹48,260</b>
        </div>
        {[
          ['Refund · SE-24790 cancelled', '+₹6,350', 'text-earn'],
          ['Booking · SE-24817', '−₹8,820', 'text-ink-900'],
          ['Top-up · UPI', '+₹25,000', 'text-earn'],
        ].map(([t, v, c]) => (
          <div key={t} className="flex items-center justify-between rounded-md bg-white px-2 py-1.5 text-[10px] ring-1 ring-line">
            <span className="text-ink-700">{t}</span>
            <b className={c}>{v}</b>
          </div>
        ))}
      </div>
    )
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <span className="text-[11px] font-bold text-ink-950">Your earnings by month</span>
      <div className="flex flex-1 items-end gap-2 rounded-md bg-white p-2 ring-1 ring-line">
        {[38, 52, 46, 64, 72, 88].map((h, j) => (
          <motion.span key={j} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: j * 0.06, duration: 0.4 }} className={`flex-1 rounded-t ${j === 5 ? 'bg-gold-500' : 'bg-ink-700/70'}`} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>Bookings, net, markup</span>
        <b className="text-earn">Download CSV</b>
      </div>
    </div>
  )
}

function Devices({ k }: { k: AdvKey }) {
  const reduce = useReducedMotion()
  return (
    <div className="relative mx-auto w-full max-w-[540px] pb-10" aria-hidden="true">
      <div className="rounded-t-2xl border-[10px] border-b-0 border-ink-950 bg-ink-950 shadow-2xl">
        <div className="flex items-center gap-1.5 bg-ink-900 px-3 py-1.5">
          {['#f87171', '#fbbf24', '#34d399'].map((c) => (
            <span key={c} className="h-2 w-2 rounded-full" style={{ background: c }} />
          ))}
          <span className="ml-2 flex-1 rounded bg-ink-800 px-2 py-0.5 text-[9px] text-ink-100">{site.name.toLowerCase()}.app/portal</span>
        </div>
        <div className="grid aspect-[16/10] grid-cols-[22%_1fr] bg-paper">
          <div className="flex flex-col gap-1.5 bg-ink-900 p-2">
            {['Dashboard', 'Hotels', 'Quotes', 'Bookings', 'Wallet', 'Earnings'].map((t) => (
              <span key={t} className={`rounded px-1.5 py-1 text-[9px] font-bold ${(k === 'quote' && t === 'Quotes') || (k === 'voucher' && t === 'Bookings') || (k === 'wallet' && t === 'Wallet') || (k === 'earn' && t === 'Earnings') ? 'bg-gold-500 text-ink-950' : 'text-ink-100'}`}>
                {t}
              </span>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={k} initial={reduce ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
              <Screen k={k} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="mx-auto h-3 w-[112%] -translate-x-[5.4%] rounded-b-xl bg-gradient-to-b from-[#c9cfdc] to-[#a9b0c0]" />
      {/* Phone with the WhatsApp quote */}
      <div className="absolute right-[-6px] bottom-0 w-[34%] min-w-[140px] rounded-[22px] border-[6px] border-ink-950 bg-[#efe7dc] shadow-2xl sm:right-[-24px]">
        <div className="flex items-center gap-1.5 rounded-t-[16px] bg-[#0b6b5a] px-2 py-1.5 text-[9px] font-bold text-white">
          <span className="h-4 w-4 rounded-full bg-white/30" /> Arjun Mehta
        </div>
        <div className="flex flex-col gap-1.5 p-2">
          <span className="self-end rounded-lg rounded-tr-none bg-[#d9fdd3] p-1.5 text-[8.5px] leading-snug text-ink-950 shadow-sm">
            Hello Arjun, 3 options for Goa, 12–14 Dec:
            <br />1. Deluxe · ₹9,520
            <br />2. Premium · ₹11,840
            <br />3. Suite · ₹14,260
          </span>
          <span className="self-start rounded-lg rounded-tl-none bg-white p-1.5 text-[8.5px] text-ink-950 shadow-sm">Option 2 please 👍</span>
          <span className="self-end rounded-lg rounded-tr-none bg-[#d9fdd3] p-1.5 text-[8.5px] text-ink-950 shadow-sm">Booked! Voucher attached ✅</span>
        </div>
      </div>
    </div>
  )
}

function Advantages() {
  const reduce = useReducedMotion()
  const [k, setK] = useState<AdvKey>('quote')
  const [hold, setHold] = useState(false)
  useEffect(() => {
    if (reduce || hold) return
    const t = setTimeout(() => {
      const i = advantages.findIndex((a) => a.key === k)
      setK(advantages[(i + 1) % advantages.length].key)
    }, 6000)
    return () => clearTimeout(t)
  }, [k, hold, reduce])
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
      <ul className="flex flex-col gap-3" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
        {advantages.map((a) => {
          const Icon = a.icon
          const on = a.key === k
          return (
            <li key={a.key}>
              <button type="button" aria-pressed={on} onClick={() => setK(a.key)} onFocus={() => setHold(true)} onBlur={() => setHold(false)} className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all sm:p-5 ${on ? 'border-gold-500 bg-white shadow-slip' : 'border-transparent bg-white/60 hover:bg-white'}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${on ? 'bg-gold-500 text-ink-950' : 'bg-ink-50 text-ink-800'}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <strong className="block text-[17px] text-ink-950">{a.title}</strong>
                  <span className="mt-0.5 block text-[15px] text-muted">{a.text}</span>
                </span>
              </button>
            </li>
          )
        })}
        <li className="flex flex-wrap gap-2 pt-2">
          {[
            [UsersRound, 'Your customers in one list'],
            [UserPlus, 'Logins for your staff'],
            [CircleCheck, 'Instant confirmation'],
          ].map(([I, t]) => {
            const Icon = I as LucideIcon
            return (
              <span key={t as string} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-bold text-ink-800 ring-1 ring-line">
                <Icon className="h-3.5 w-3.5 text-gold-700" aria-hidden="true" /> {t as string}
              </span>
            )
          })}
        </li>
      </ul>
      <Devices k={k} />
    </div>
  )
}

const stories = [
  { photo: '/hotels/orange-oasis/exterior-1.webp', tag: 'Family holiday', title: 'Three options, one WhatsApp message', text: 'Quote three hotels for a family of four. They pick on WhatsApp, you book from your wallet and send the voucher before the call ends.' },
  { photo: '/hotels/prime-oasis-blue/lobby-1.webp', tag: 'Company travel', title: 'Repeat bookings in seconds', text: 'Save the company and its travellers as customers. Next month’s trip is a few taps, with the markup you agreed already applied.' },
  { photo: '/hotels/csfc/banquet-1.webp', tag: 'Wedding guests', title: 'Many rooms, one booking', text: 'Book several rooms for the same dates in one go and share a single voucher with the family.' },
  { photo: '/hotels/red-vibe/room-1.webp', tag: 'Plans changed', title: 'Cancel and get your money back', text: 'Your customer’s dates moved? Cancel inside the free window and the net amount is back in your wallet straight away.' },
]

function Stories() {
  const ref = useRef<HTMLDivElement>(null)
  const go = (d: number) => {
    const el = ref.current
    if (!el) return
    const card = el.querySelector('article')
    el.scrollBy({ left: d * ((card?.clientWidth ?? 320) + 20), behavior: 'smooth' })
  }
  return (
    <div className="relative">
      <div ref={ref} className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {stories.map((s) => (
          <article key={s.title} className="group relative w-[82%] shrink-0 snap-start overflow-hidden rounded-2xl bg-ink-950 sm:w-[46%] lg:w-[31.5%]">
            <img src={s.photo} alt="" className="aspect-[4/5] w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 text-white">
              <span className="self-start rounded-full bg-gold-500 px-2.5 py-0.5 text-[12px] font-bold text-ink-950">{s.tag}</span>
              <h3 className="text-[20px] leading-snug font-black">{s.title}</h3>
              <p className="text-[14px] text-ink-100">{s.text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="text-[13px] text-muted">Example scenarios showing how the portal works.</span>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous" onClick={() => go(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-900 ring-1 ring-line hover:ring-ink-700">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next" onClick={() => go(1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-900 text-white hover:bg-ink-800">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

const trips: { photo: string; icon: LucideIcon; title: string; text: string; big?: boolean }[] = [
  { photo: '/hotels/orange-oasis/room-4.webp', icon: Users, title: 'Family holidays', text: 'Rooms that fit the whole family, from budget to premium.', big: true },
  { photo: '/hotels/red-vibe/room-2.webp', icon: Heart, title: 'Couples and honeymoons', text: 'Premium rooms for special trips.' },
  { photo: '/hotels/prime-oasis-blue/room-1.webp', icon: Briefcase, title: 'Business travel', text: 'Saved travellers, quick repeat bookings.' },
  { photo: '/hotels/csfc/banquet-2.webp', icon: PartyPopper, title: 'Weddings and events', text: 'Hotels with banquet halls.' },
  { photo: '/hotels/orange-oasis/dining-1.webp', icon: UsersRound, title: 'Group tours', text: 'Several rooms in one booking.' },
]

function Trips() {
  return (
    <div className="grid auto-rows-[220px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {trips.map((t) => {
        const Icon = t.icon
        return (
          <div key={t.title} className={`group relative overflow-hidden rounded-2xl ${t.big ? 'sm:col-span-2 lg:row-span-2' : ''}`}>
            <img src={t.photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-5 text-white">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <Icon className="h-5 w-5 text-gold-500" aria-hidden="true" />
              </span>
              <span>
                <strong className={`block font-black ${t.big ? 'text-[24px]' : 'text-[18px]'}`}>{t.title}</strong>
                <span className="text-[14px] text-ink-100">{t.text}</span>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Landing() {
  const { user, agency } = useSession()
  const reduce = useReducedMotion()
  const start = user ? (agency ? '/app' : '/register') : '/login?next=/register'
  const rise = (d = 0) => (reduce ? {} : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5, delay: d } })
  return (
    <div className="bg-paper">
      <Header />

      {/* Hero */}
      <section className="hero-band relative overflow-hidden pt-[68px] text-white">
        <div className="page relative z-10 grid items-center gap-10 pt-10 pb-28 sm:pb-36 lg:grid-cols-[1.15fr_1fr] lg:pt-16 lg:pb-44">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-bold text-gold-100 ring-1 ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500" /> {site.marketplace} partner programme for travel agents
            </span>
            <h1 className="mt-5 text-[40px] leading-[1.08] sm:text-[58px]">
              <span className="block font-light">The smarter way to</span>
              <span className="block font-black">
                grow your <span className="text-gold-500">travel business</span>
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[17px] text-ink-100 sm:text-lg">Book hotels at net rates, add your own markup and send quotes on WhatsApp. What you add, you keep.</p>
            <FeatureRotator />
          </div>
          <div className="flex justify-center lg:justify-end">
            <GetStarted />
          </div>
        </div>
        <svg viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true" className="absolute bottom-[-1px] left-0 h-[70px] w-full sm:h-[120px]">
          <path d="M0 0 Q720 160 1440 0 V140 H0 Z" fill="var(--color-paper)" />
        </svg>
      </section>

      {/* Partner banner overlapping the curve */}
      <div className="page relative z-10 -mt-14 sm:-mt-20">
        <motion.div {...rise()} className="flex flex-col items-start gap-5 overflow-hidden rounded-2xl bg-gradient-to-r from-gold-500 via-[#f6b93b] to-gold-100 p-6 shadow-slip sm:flex-row sm:items-center sm:p-7">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink-950 text-gold-500">
            <IndianRupee className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <strong className="block text-[22px] font-black text-ink-950 sm:text-[26px]">Earn on every booking you make</strong>
            <span className="text-[15px] text-ink-900">
              Net rates {pct}% below the public price, plus the markup you choose. No targets, no monthly fee.
            </span>
          </div>
          <Link to={start} className="btn-ink min-h-12 rounded-full px-6 text-base">
            {user && agency ? 'Open portal' : 'Join free'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </motion.div>
      </div>

      {/* Why */}
      <Section id="why" eyebrow={`Why ${site.name}?`} title={<>Your margin, <b className="font-black">built into every rate</b></>} intro="Move the slider to see how a booking pays you.">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
          <motion.div {...rise()}>
            <MarkupDemo />
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2">
            {whyFeatures.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div key={f.title} {...rise(i * 0.06)} className="card flex flex-col gap-3 p-5 transition-shadow hover:shadow-slip">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-ink-800 to-ink-950 text-gold-500">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <strong className="text-[17px] text-ink-950">{f.title}</strong>
                  <span className="text-[15px] text-muted">{f.text}</span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* Advantages */}
      <div className="overflow-x-clip bg-gradient-to-b from-ink-50 to-paper">
        <Section id="advantages" eyebrow="Built for agents" title={<>{site.name} <b className="font-black">advantages</b></>} intro="Everything you need to sell a stay, from the first quote to the voucher.">
          <Advantages />
        </Section>
      </div>

      {/* How agents use it */}
      <Section eyebrow="How agents use it" title={<>One portal, <b className="font-black">every kind of trip</b></>}>
        <Stories />
      </Section>

      {/* CTA band */}
      <div className="page">
        <motion.div {...rise()} className="hero-band relative overflow-hidden rounded-3xl px-6 py-12 text-center text-white sm:px-12">
          <h2 className="mx-auto max-w-3xl text-[28px] leading-tight sm:text-[38px]">
            <span className="font-light">Start a profitable travel business today </span>
            <b className="font-black">with {site.name}</b>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-100">Register in a few minutes. The {site.marketplace} team checks your documents, usually within one working day.</p>
          <Link to={start} className="btn-gold mt-7 min-h-12 rounded-full px-8 text-base">
            {user && agency ? 'Open portal' : 'Sign up now'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </motion.div>
      </div>

      {/* Trips */}
      <Section id="trips" eyebrow="Trips you can sell" title={<>Everything <b className="font-black">your customer needs</b></>} intro="Hotels for holidays, work trips and celebrations, all at agent rates.">
        <Trips />
      </Section>

      {/* Steps */}
      <section className="border-y border-line bg-white">
        <div className="page grid gap-10 py-16 lg:grid-cols-[1fr_2fr]">
          <h2 className="text-[30px] leading-tight font-light text-ink-950">
            From sign-up to <b className="font-black">your first booking</b>
          </h2>
          <ol className="grid gap-8 sm:grid-cols-3">
            {[
              ['Register', 'Agency name, contact, PAN and GSTIN, and one ID or registration document.'],
              ['Get approved', 'The TRPotels team checks your documents, usually within one working day. You can send quotes meanwhile.'],
              ['Add money and book', 'Top up your wallet, search, book for your customer and share the voucher.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex flex-col gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-500 text-lg font-black text-ink-950">{i + 1}</span>
                <strong className="text-lg text-ink-950">{t}</strong>
                <span className="text-[15px] text-ink-700">{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20">
        <div className="page grid gap-8 py-16 lg:grid-cols-[1fr_2fr]">
          <h2 className="text-[30px] leading-tight font-light text-ink-950">
            Questions <b className="font-black">agents ask</b>
          </h2>
          <div className="divide-y divide-line border-y border-line">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-ink-950">
                  {q}
                  <span aria-hidden="true" className="text-2xl text-gold-600 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 max-w-2xl text-ink-700">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="page pb-16">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-white p-7 ring-1 ring-line sm:flex-row sm:items-center">
          <div>
            <strong className="block text-[22px] font-black text-ink-950">Ready to book your first stay?</strong>
            <span className="text-muted">Free to join. No monthly fee.</span>
          </div>
          <Link to={start} className="btn-gold min-h-12 rounded-full px-7 text-base">
            {user && agency ? 'Open portal' : 'Register your agency'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="bg-ink-950 text-ink-100">
        <div className="page flex flex-col gap-3 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-3">
            <Logo light /> <span className="hidden sm:inline">{site.tagline}.</span>
          </span>
          <span>{[site.supportPhone, site.supportEmail].filter(Boolean).join(', ')}</span>
        </div>
      </footer>
    </div>
  )
}

function Shell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_520px]">
      <div className="hero-band relative hidden overflow-hidden lg:block">
        <img src="/hotels/prime-oasis-blue/lobby-1.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-luminosity" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo light />
          <div className="max-w-md">
            <p className="text-[36px] leading-tight">
              <span className="block font-light">Net rates, your markup,</span>
              <b className="font-black">one wallet.</b>
            </p>
            <div className="mt-6">
              <RateSlip net={2214} markup={180} selling={2394} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <h1 className="mt-8 text-[28px] font-black text-ink-950 lg:mt-0">{title}</h1>
        <p className="mt-1 text-muted">{intro}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

export function Login() {
  const [params] = useSearchParams()
  const next = params.get('next')
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app'
  const { user, agency, loading } = useSession()
  const navigate = useNavigate()
  if (!loading && user) return <Navigate to={agency ? safeNext : '/register'} replace />
  return (
    <Shell title={`Sign in to ${site.name}`} intro="Agency owners and staff sign in with their own email.">
      <EmailCode onDone={() => navigate(safeNext, { replace: true })} />
    </Shell>
  )
}

const cities = ['New Delhi', 'Mumbai', 'Bengaluru', 'Goa', 'Jaipur', 'Hyderabad', 'Pune', 'Kolkata', 'Chennai', 'Ahmedabad', 'Lucknow', 'Chandigarh', 'Other']

export function Register() {
  const { user, agency, loading, refresh } = useSession()
  const navigate = useNavigate()
  const [f, setF] = useState({ name: '', ownerName: '', phone: '', city: 'New Delhi', address: '', pan: '', gstin: '', agree: false })
  const [docs, setDocs] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && agency) navigate('/app', { replace: true })
  }, [loading, agency, navigate])
  if (!loading && !user) return <Navigate to="/login?next=/register" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (f.name.trim().length < 2) return setError('Enter your agency name.')
    if (f.ownerName.trim().length < 2) return setError('Enter the owner’s full name.')
    if (!/^[6-9]\d{9}$/.test(f.phone)) return setError('Enter a 10-digit mobile number.')
    if (f.address.trim().length < 8) return setError('Enter the office address.')
    if (panError(f.pan)) return setError(`PAN: ${panError(f.pan)}`)
    if (f.gstin && gstinError(f.gstin)) return setError(`GSTIN: ${gstinError(f.gstin)}`)
    if (!docs.length) return setError('Attach one document: PAN card, GST certificate, shop licence or IATA/TAAI certificate.')
    if (!f.agree) return setError('Accept the agent terms to continue.')
    setBusy(true)
    try {
      const a: Agency = {
        id: user!.id,
        name: f.name.trim(),
        ownerName: f.ownerName.trim(),
        phone: f.phone,
        email: user!.email,
        city: f.city,
        address: f.address.trim(),
        pan: f.pan.trim().toUpperCase(),
        gstin: f.gstin.trim().toUpperCase(),
        docs,
        status: 'pending',
        markup: defaultMarkup,
        cityMarkup: {},
        showPriceOnVoucher: true,
        creditLimit: 0,
        createdAt: new Date().toISOString(),
      }
      await registerAgency(a)
      await refresh()
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t register. Please try again.')
      setBusy(false)
    }
  }
  return (
    <Shell title="Register your agency" intro={`Signed in as ${user?.email ?? ''}. The TRPotels team checks these details before your first booking.`}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <label className="label">
          Agency name
          <input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Shubh Yatra Tours & Travels" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">
            Owner’s full name
            <input className="field" autoComplete="name" value={f.ownerName} onChange={(e) => setF({ ...f, ownerName: e.target.value })} />
          </label>
          <label className="label">
            Mobile number
            <span className="flex overflow-hidden rounded-lg border border-line-strong bg-white focus-within:border-ink-700">
              <span className="flex items-center bg-paper px-3 text-sm font-bold">+91</span>
              <input className="min-h-[44px] min-w-0 flex-1 px-3 outline-none" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
            </span>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <label className="label">
            City
            <select className="field" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="label">
            Office address
            <input className="field" autoComplete="street-address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">
            PAN
            <input className="field uppercase" maxLength={10} value={f.pan} onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" />
          </label>
          <label className="label">
            GSTIN (if registered)
            <input className="field uppercase" maxLength={15} value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} />
          </label>
        </div>
        <label className="label">
          Document for verification
          <input type="file" accept=".pdf,image/*" multiple className="field py-2" onChange={(e) => setDocs(Array.from(e.target.files ?? []).map((x) => x.name))} />
          <span className="text-[13px] font-normal text-muted">
            PAN card, GST certificate, shop and establishment licence, or IATA/TAAI certificate.{isDemoMode ? ' In demo mode only the file name is kept.' : ''}
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-strong bg-white p-4">
          <input type="checkbox" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} className="mt-1 h-5 w-5 accent-ink-900" />
          <span className="text-[15px]">I run this agency or am authorised to register it, and I accept the agent terms. [Agent terms document to be added by the client.]</span>
        </label>
        {isDemoMode && <Notice>Demo mode: your agency is approved straight away with a ₹25,000 test balance.</Notice>}
        {error && (
          <p role="alert" className="text-sm font-semibold text-alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-gold min-h-12" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit for approval'}
        </button>
      </form>
    </Shell>
  )
}
