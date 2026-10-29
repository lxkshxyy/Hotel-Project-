import { motion } from 'framer-motion'
import { Briefcase, Building2, Mail } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { features } from '../config/launch'
import { site } from '../config/site'
import { useAccount } from '../context/AccountContext'
import { useAuth } from '../context/AuthContext'
import { isDemoMode } from '../lib/supabase'

export default function Login() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'personal' | 'business'>(features.business && params.get('type') === 'business' ? 'business' : 'personal')
  const biz = tab === 'business'
  const next = params.get('next') || (biz ? '/biz' : '/')
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const navigate = useNavigate()
  const { user, sendCode, verifyCode } = useAuth()
  const { linkCompany, createCompany, hasCompanyFor, switchTo } = useAccount()

  const [step, setStep] = useState<'email' | 'code' | 'company'>('email')
  const [coName, setCoName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)

  // Already signed in and not adding a business account: go straight on.
  // Signed in and asking for Business: set up the company if there isn't one yet.
  useEffect(() => {
    if (!user) return
    if (params.get('type') !== 'business' || !features.business) navigate(safeNext.startsWith('/biz') && !features.business ? '/' : safeNext, { replace: true })
    else if (hasCompanyFor(user.email)) {
      switchTo('business')
      navigate(safeNext.startsWith('/biz') ? safeNext : '/biz', { replace: true })
    }
    else {
      setEmail(user.email)
      setStep('company')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const bizNext = safeNext.startsWith('/biz') ? safeNext : '/biz'
  const createCo = (e: React.FormEvent) => {
    e.preventDefault()
    if (coName.trim().length < 2) return setError('Enter your company’s name.')
    createCompany(email.trim(), coName.trim())
    navigate('/biz', { replace: true })
  }

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    setBusy(true)
    try {
      await sendCode(email.trim())
      setStep('code')
      setCooldown(45)
      setTimeout(() => codeRef.current?.focus(), 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.')
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await verifyCode(email.trim(), code.trim())
      if (biz) {
        if (hasCompanyFor(email.trim())) {
          switchTo('business')
          navigate(bizNext, { replace: true })
        } else setStep('company')
      } else {
        navigate(safeNext.startsWith('/biz') ? '/' : safeNext, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code didn’t work.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-page flex flex-wrap items-start justify-center gap-8 py-10 sm:py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-md p-6 shadow-card sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50 text-navy-800">
          {biz ? <Briefcase className="h-6 w-6" aria-hidden="true" /> : <Mail className="h-6 w-6" aria-hidden="true" />}
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-navy-800">{step === 'email' ? `Sign in to ${site.name}` : step === 'code' ? 'Check your email' : 'Set up your business account'}</h1>
        <p className="mt-1 text-ink-500">
          {step === 'email' ? (features.business ? 'One login for your own trips and your company’s trips.' : 'We’ll email you a 6-digit code. No password needed.') : step === 'code' ? `We sent a 6-digit code to ${email}.` : `${email} isn’t linked to a company yet.`}
        </p>

        {step === 'email' && features.business && (
          <div role="tablist" aria-label="Account type" className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-[#EEF1F6] p-1">
            {(['personal', 'business'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => {
                  setTab(t)
                  setError('')
                }}
                className={`rounded-[9px] p-2.5 text-[15px] ${tab === t ? 'bg-white font-bold text-navy-800 shadow-[0_1px_2px_rgba(20,48,107,0.15)]' : 'font-semibold text-ink-500'}`}
              >
                {t === 'personal' ? 'Personal' : 'Business'}
              </button>
            ))}
          </div>
        )}
        {step === 'email' && biz && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#C9D7F0] bg-[#EEF3FC] px-3.5 py-3 text-sm">
            <Briefcase className="mt-0.5 h-5 w-5 shrink-0 text-navy-800" aria-hidden="true" />
            <span>Use the work email your company invited. You’ll see your company’s corporate rates, spending limit and GST billing.</span>
          </div>
        )}

        {step === 'company' ? (
          <div className="mt-6 flex flex-col gap-4">
            <form onSubmit={createCo} className="flex flex-col gap-3" noValidate>
              <label className="label">
                Company name
                <input className="field" value={coName} onChange={(e) => setCoName(e.target.value)} placeholder="e.g. Sharma Traders" autoFocus aria-invalid={!!error} />
              </label>
              {error && (
                <p role="alert" className="text-sm font-semibold text-ember-600">
                  {error}
                </p>
              )}
              <button type="submit" className="btn-primary min-h-12">
                <Building2 className="h-4 w-4" aria-hidden="true" /> Create company account
              </button>
              <p className="rounded-lg bg-[#FFF4EC] px-3 py-2 text-[13px] text-[#7C2D12]">
                New companies start <strong>unverified</strong>: you can make 2 bookings, then verify with your GSTIN, Udyam or NGO ID to unlock unlimited bookings, company credit, the wallet and GST input credit.
              </p>
            </form>
            <div className="flex items-center gap-3 text-xs font-bold text-ink-400">
              <span className="h-px flex-1 bg-line" /> OR <span className="h-px flex-1 bg-line" />
            </div>
            <button
              type="button"
              className="btn-outline min-h-12"
              onClick={() => {
                linkCompany(email.trim())
                navigate(bizNext, { replace: true })
              }}
            >
              Explore with the sample company (Northwind Logistics)
            </button>
          </div>
        ) : step === 'email' ? (
          <form onSubmit={send} className="mt-6 flex flex-col gap-4" noValidate>
            <label className="label">
              {biz ? 'Work email' : 'Email address'}
              <input
                className="field"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm font-semibold text-ember-600">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary min-h-12" disabled={busy}>
              {busy ? 'Sending…' : 'Send login code'}
            </button>
            {biz ? (
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-ink-500">Company not on {site.name} yet?</span>
                <Link to="/business" className="font-bold no-underline">
                  Register your company →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-ink-500">Members save an extra 5% and earn Club points on every stay.</p>
            )}
          </form>
        ) : (
          <form onSubmit={verify} className="mt-6 flex flex-col gap-4">
            <label className="label">
              6-digit code
              <input
                ref={codeRef}
                className="field text-center font-mono text-2xl tracking-[0.5em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                aria-invalid={!!error}
              />
            </label>
            {isDemoMode && <p className="rounded-lg bg-navy-50 px-3 py-2 text-[13px] text-navy-800">Demo mode: any 6 digits will work.</p>}
            {error && (
              <p role="alert" className="text-sm font-semibold text-ember-600">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary min-h-12" disabled={busy || code.length !== 6}>
              {busy ? 'Checking…' : 'Verify & continue'}
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" className="font-bold text-navy-800" onClick={() => setStep('email')}>
                Change email
              </button>
              <button type="button" className="font-bold text-navy-800 disabled:text-ink-400" disabled={cooldown > 0 || busy} onClick={() => send()}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}
        <p className="mt-6 text-xs text-ink-500">
          By continuing you agree to our{' '}
          <Link to="/terms" className="font-semibold">
            terms and privacy policy
          </Link>
          .
        </p>
        <p className="mt-3 border-t border-[#EEF1F6] pt-3 text-xs text-ink-500">
          Same email-code login for both. If your work email belongs to a company account, {site.name} adds the Business switch to your profile menu.
        </p>
      </motion.div>
      {biz && step === 'email' && (
        <section aria-labelledby="diff-h" className="flex w-full max-w-xl flex-col gap-4">
          <h2 id="diff-h" className="text-xl font-extrabold text-navy-800">
            What changes when you switch to Business
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {bizChanges.map((c) => (
              <div key={c.t} className="card flex flex-col gap-1 p-4">
                <strong>{c.t}</strong>
                <span className="text-[13.5px] text-ink-500">{c.d}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

const bizChanges = [
  { t: 'Corporate rates', d: 'Every hotel shows your company price, with the public price struck through.' },
  { t: 'Business catalog', d: 'Categories for work trips: business districts, airport stays, long stays, team offsites.' },
  { t: 'Bulk rooms', d: 'Book several rooms at once for a team, with lower slab prices from 5 rooms.' },
  { t: 'Spending limit', d: 'Rooms above your company’s nightly limit are flagged before you book.' },
  { t: 'Company billing', d: 'Pay by company credit or wallet. Invoices carry the company GSTIN.' },
  { t: 'Business menu', d: 'Trips, Reports and Company replace My bookings and Club points.' },
]
