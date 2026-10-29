import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AGENT_DISCOUNT, defaultMarkup } from '@stayeasy/lib/agentRates'
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
  ['How do I get paid?', 'You set a markup on top of the net rate. You collect the full selling price from your customer; StayEasy takes only the net rate from your wallet. The difference is yours.'],
  ['Can my customer see my net rate?', 'No. Quotes and vouchers show only the price you set. You can also hide the price on vouchers completely.'],
  ['What if my customer cancels?', 'Cancel from Bookings within the hotel’s free-cancellation window and the full net amount goes back to your wallet straight away.'],
  ['Can my staff use the same account?', 'Yes. Add team members by email in Settings. Each person signs in with their own email; bookings show who made them.'],
]

export function Landing() {
  const { user, agency } = useSession()
  const reduce = useReducedMotion()
  const start = user ? (agency ? '/app' : '/register') : '/login?next=/register'
  return (
    <div className="bg-paper">
      <header className="page flex h-[72px] items-center justify-between gap-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to={user ? '/app' : '/login'} className="btn-line hidden sm:inline-flex">
            {user ? 'Open portal' : 'Sign in'}
          </Link>
          <Link to={start} className="btn-ink">
            Register your agency
          </Link>
        </div>
      </header>

      <section className="page grid items-center gap-12 pt-6 pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-14">
        <div>
          <h1 className="text-[42px] leading-[1.04] font-extrabold text-ink-950 sm:text-[60px]">Hotel rates for agents, with your margin built in.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-700">
            Book {site.marketplace} hotels at net rates, add your own markup, and send your customer a quote on WhatsApp in a minute. What you add, you keep.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={start} className="btn-gold min-h-12 px-6 text-base">
              Register your agency
            </Link>
            <a href="#how" className="btn-line min-h-12 px-6 text-base">
              How it works
            </a>
          </div>
          <p className="mt-5 text-[15px] text-muted">Free to join. No monthly fee.</p>
        </div>
        <div className="relative mx-auto w-full max-w-[440px]">
          <motion.div initial={reduce ? false : { y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="card overflow-hidden shadow-slip">
            <img src="/hotels/orange-oasis/room-2.webp" alt="A deluxe room at a StayEasy hotel" className="aspect-[16/9] w-full object-cover" />
            <div className="flex flex-col gap-4 p-5">
              <div>
                <strong className="block text-lg text-ink-950">Deluxe Room, 2 nights, Goa</strong>
                <span className="text-sm text-muted">Your customer: Mr Arjun Mehta and family</span>
              </div>
              <RateSlip net={4410} markup={350} selling={4760} size="lg" />
              <span className="text-[13px] text-muted">Example only. Real rates show after you sign in.</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="how" className="border-y border-line bg-white">
        <div className="page grid gap-10 py-16 lg:grid-cols-[1fr_2fr]">
          <h2 className="text-[30px] leading-tight font-extrabold text-ink-950">From sign-up to your first booking</h2>
          <ol className="grid gap-8 sm:grid-cols-3">
            {[
              ['Register', 'Agency name, contact, PAN and GSTIN, and one ID or registration document.'],
              ['Get approved', 'The StayEasy team checks your documents, usually within one working day. You can send quotes meanwhile.'],
              ['Add money and book', 'Top up your wallet, search, book for your customer and share the voucher.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex flex-col gap-2">
                <span className="text-[40px] leading-none font-extrabold text-gold-500">{i + 1}</span>
                <strong className="text-lg text-ink-950">{t}</strong>
                <span className="text-[15px] text-ink-700">{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page grid gap-10 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-[30px] leading-tight font-extrabold text-ink-950">How the money works</h2>
          <p className="mt-3 max-w-lg text-ink-700">
            Your net rate is {pct}% below the public room price on {site.marketplace}. You choose a markup, as a percentage or a fixed amount per room night, for all hotels or city by city. You can change it on any single booking too.
          </p>
          <p className="mt-3 max-w-lg text-ink-700">Your customer pays you the selling price. {site.marketplace} takes only the net rate from your wallet.</p>
        </div>
        <dl className="card divide-y divide-line">
          {[
            ['Net rates on every StayEasy and partner hotel', 'Same hotels, photos and room counts as the public site.'],
            ['Quotes your customer can read', 'Several hotels in one quote, with your agency name, as a PDF or WhatsApp message.'],
            ['A wallet, not card payments', 'One balance for all bookings. Refunds come back to it instantly.'],
            ['Your customers in one list', 'Every booking is saved against the customer, so repeat bookings take seconds.'],
            ['Earnings you can show your accountant', 'A statement of every booking: net, markup and selling price.'],
          ].map(([t, d]) => (
            <div key={t} className="p-5">
              <dt className="font-bold text-ink-950">{t}</dt>
              <dd className="text-[15px] text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-line bg-white">
        <div className="page grid gap-8 py-16 lg:grid-cols-[1fr_2fr]">
          <h2 className="text-[30px] leading-tight font-extrabold text-ink-950">Questions agents ask</h2>
          <div className="divide-y divide-line border-y border-line">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-ink-950">
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

      <footer className="bg-ink-900 text-ink-100">
        <div className="page flex flex-col gap-3 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            {site.name}, {site.tagline.toLowerCase()}.
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
      <div className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <img src="/hotels/prime-oasis-blue/lobby-1.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo light />
          <div className="max-w-md">
            <p className="text-[32px] leading-tight font-extrabold">Net rates, your markup, one wallet.</p>
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
        <h1 className="mt-8 text-[28px] font-extrabold text-ink-950 lg:mt-0">{title}</h1>
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
  const { user, agency, loading, sendCode, verifyCode } = useSession()
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const codeRef = useRef<HTMLInputElement>(null)

  if (!loading && user) return <Navigate to={agency ? safeNext : '/register'} replace />

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
      navigate(safeNext, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code didn’t work.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Shell title={step === 'email' ? `Sign in to ${site.name}` : 'Check your email'} intro={step === 'email' ? 'Agency owners and staff sign in with their own email. No password.' : `We sent a 6-digit code to ${email}.`}>
      {step === 'email' ? (
        <form onSubmit={send} noValidate className="flex flex-col gap-4">
          <label className="label">
            Work email
            <input className="field" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-ink min-h-12" disabled={busy}>
            {busy ? 'Sending code…' : 'Send code'}
          </button>
          <p className="text-sm text-muted">New agency? Sign in with your email first, then register.</p>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <label className="label">
            6-digit code
            <input ref={codeRef} className="field text-center text-2xl font-bold tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-invalid={!!error} />
          </label>
          {isDemoMode && <Notice>Demo mode: any 6 digits work.</Notice>}
          {error && (
            <p role="alert" className="text-sm font-semibold text-alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-ink min-h-12" disabled={busy || code.length !== 6}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <button type="button" className="self-start text-sm font-bold text-ink-700" onClick={() => setStep('email')}>
            Use a different email
          </button>
        </form>
      )}
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
    <Shell title="Register your agency" intro={`Signed in as ${user?.email ?? ''}. The StayEasy team checks these details before your first booking.`}>
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
