import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Mail, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { features } from '../config/launch'
import { site } from '../config/site'
import { useAccount } from '../context/AccountContext'
import { useAuth } from '../context/AuthContext'
import { isDemoMode } from '../lib/supabase'

/*
 * The one sign-in screen: a pop-up with a photo panel, like the big travel sites.
 * - Every "Sign in" button opens it (openLogin()).
 * - The /login address shows it too (used by checkout and other "sign in to continue" links).
 * - It also opens by itself for NEW visitors: not signed in, and nobody has signed in on this
 *   browser before. Closed once, it stays closed for that visit.
 */

const SEEN = 'stayeasy.welcome.seen' // sessionStorage: closed during this visit
const KNOWN = 'stayeasy.signed-in-before' // localStorage: someone has signed in on this browser
const EVT = 'stayeasy-open-login'

/** Opens the sign-in pop-up from anywhere. */
export const openLogin = (tab: 'personal' | 'business' = 'personal') => window.dispatchEvent(new CustomEvent(EVT, { detail: tab }))

const panels = {
  personal: {
    img: '/backgrounds/personal.webp',
    kicker: 'New here?',
    title: `₹${site.firstStayDiscount} off your first stay`,
    text: 'Sign up free. Members save 5% on every booking and earn Club points.',
    note: 'Use code FIRSTSTAY at checkout.',
  },
  business: {
    img: '/backgrounds/business.webp',
    kicker: `${site.name} for Business`,
    title: 'One account for your team’s travel',
    text: 'Corporate rates, a nightly spending limit and GST invoices on every stay.',
    note: 'Sign in with your work email.',
  },
}

/**
 * `page` = shown on the /login address: opens straight away, and closing it goes back to where
 * the visitor was heading (or home).
 */
export default function WelcomeLogin({ page = false }: { page?: boolean }) {
  const { user, loading, sendCode, verifyCode } = useAuth()
  const { hasCompanyFor, switchTo, createCompany } = useAccount()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const params = new URLSearchParams(search)
  const rawNext = params.get('next') || ''
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/login') ? rawNext : '/'
  const [open, setOpen] = useState(page)
  const [tab, setTab] = useState<'personal' | 'business'>(features.business && params.get('type') === 'business' ? 'business' : 'personal')
  const [step, setStep] = useState<'email' | 'code' | 'company'>('email')
  const [coName, setCoName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const quiet = pathname.startsWith('/login') || pathname.startsWith('/checkout') || pathname.startsWith('/biz') || pathname.startsWith('/bookings/')

  // Remember that this browser has a signed-in customer, so the pop-up never opens for them again.
  useEffect(() => {
    if (!user) return
    try {
      localStorage.setItem(KNOWN, '1')
    } catch {
      /* ignore */
    }
  }, [user])

  // Opened by a Sign in button (the /login page has its own copy, so it ignores these).
  useEffect(() => {
    if (page || pathname.startsWith('/login')) return
    const on = (e: Event) => {
      const t = (e as CustomEvent<'personal' | 'business'>).detail
      setTab(t === 'business' && features.business ? 'business' : 'personal')
      setStep('email')
      setError('')
      setOpen(true)
    }
    window.addEventListener(EVT, on)
    return () => window.removeEventListener(EVT, on)
  }, [page, pathname])

  // On /login while already signed in: carry on, or finish setting up the business account.
  useEffect(() => {
    if (!page || loading || !user || step !== 'email') return
    if (tab !== 'business') navigate(next.startsWith('/biz') && !features.business ? '/' : next, { replace: true })
    else if (hasCompanyFor(user.email)) {
      switchTo('business')
      navigate(next.startsWith('/biz') ? next : '/biz', { replace: true })
    } else {
      setEmail(user.email)
      setStep('company')
    }
  }, [page, loading, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // New visitor: open a moment after the page has loaded.
  useEffect(() => {
    if (page || loading || user || quiet) return
    let skip = false
    try {
      skip = !!localStorage.getItem(KNOWN) || !!sessionStorage.getItem(SEEN)
    } catch {
      skip = true
    }
    if (skip) return
    const t = setTimeout(() => setOpen(true), 2500)
    return () => clearTimeout(t)
  }, [page, loading, user, quiet])

  useEffect(() => {
    if (open) setTimeout(() => emailRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const close = () => {
    if (page) {
      navigate(user ? next : next.startsWith('/bookings') || next.startsWith('/checkout') || next.startsWith('/account') || next.startsWith('/biz') ? '/' : next, { replace: true })
      return
    }
    setOpen(false)
    setError('')
    try {
      sessionStorage.setItem(SEEN, '1')
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Signed in somewhere else (e.g. the /login page): no pop-up needed.
  useEffect(() => {
    if (!page && user && open && step === 'email') setOpen(false)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!page && user && !open) return null

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.')
    setBusy(true)
    try {
      await sendCode(email.trim())
      setStep('code')
      setCooldown(45)
      setTimeout(() => codeRef.current?.focus(), 50)
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
      await verifyCode(email.trim(), code.trim())
      setCode('')
      if (tab === 'business' && !hasCompanyFor(email.trim())) {
        setStep('company') // first business sign-in: ask for the company name
        return
      }
      if (tab === 'business') switchTo('business')
      finish(tab === 'business' ? (next.startsWith('/biz') ? next : '/biz') : page ? next : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code didn’t work.')
    } finally {
      setBusy(false)
    }
  }

  /** Signed in: close and go on (null = stay on this page). */
  function finish(to: string | null) {
    setStep('email')
    setOpen(page)
    try {
      sessionStorage.setItem(SEEN, '1')
    } catch {
      /* ignore */
    }
    if (to) navigate(to, { replace: page })
    else setOpen(false)
  }

  const saveCompany = (e: FormEvent) => {
    e.preventDefault()
    if (coName.trim().length < 2) return setError('Enter your company’s name.')
    createCompany(email.trim(), coName.trim())
    finish('/biz')
  }

  const p = panels[tab]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-navy-950/60 sm:items-center sm:p-4"
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-h"
            initial={reduce ? false : { y: 24, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative grid w-full max-w-[900px] overflow-hidden rounded-t-3xl bg-white shadow-float sm:grid-cols-[400px_1fr] sm:rounded-3xl"
          >
            {/* Photo panel */}
            <div className="relative hidden min-h-[520px] overflow-hidden sm:block">
              <AnimatePresence initial={false}>
                <motion.img
                  key={p.img}
                  src={p.img}
                  alt=""
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/30 to-navy-950/10" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-7 text-white">
                <span className="self-start rounded-full bg-ember-600 px-3 py-1 text-[12px] font-bold">{p.kicker}</span>
                <strong className="text-[30px] leading-[1.08] font-black tracking-tight">{p.title}</strong>
                <span className="text-[15px] text-[#E2E8F4]">{p.text}</span>
                <span className="text-[12.5px] text-[#B9C4DA]">{p.note}</span>
              </div>
            </div>

            {/* Phones: a short photo banner instead of the side panel. */}
            <div className="relative h-36 overflow-hidden sm:hidden">
              <img src={p.img.replace('.webp', '-sm.webp')} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 to-navy-950/10" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <strong className="block text-[20px] leading-tight font-black">{p.title}</strong>
                <span className="text-[12.5px] text-[#D3DCEE]">{p.note}</span>
              </div>
            </div>

            {/* Sign-in panel */}
            <div className="flex flex-col p-6 sm:p-9 sm:pt-14">
              <button type="button" aria-label="Close" onClick={close} className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-900 shadow-card hover:bg-canvas">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>

              {features.business && (
                <div role="tablist" aria-label="Account type" className="grid grid-cols-2 gap-1 rounded-full bg-white p-1 ring-1 ring-line-strong shadow-[0_2px_10px_rgba(20,48,107,0.08)]">
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
                      className={`rounded-full px-3 py-2.5 text-[13px] font-black tracking-wide uppercase transition-colors ${
                        tab === t ? (t === 'personal' ? 'bg-gradient-to-r from-[#2F6FED] to-navy-800 text-white' : 'bg-gradient-to-r from-ember-600 to-[#B4410F] text-white') : 'text-ink-700 hover:text-navy-800'
                      }`}
                    >
                      {t === 'personal' ? 'Personal account' : 'Business account'}
                    </button>
                  ))}
                </div>
              )}

              <h2 id="welcome-h" className="mt-6 text-[24px] font-extrabold text-navy-800">
                {step === 'company' ? 'Set up your business account' : step === 'email' ? (tab === 'business' ? 'Sign in to your business account' : `Sign in or create your ${site.name} account`) : 'Check your email'}
              </h2>
              <p className="mt-1 text-[15px] text-ink-500">{step === 'company' ? `${email.trim()} isn’t linked to a company yet. Add your company to get corporate rates.` : step === 'email' ? 'We’ll email you a 6-digit code. No password needed.' : `We sent a 6-digit code to ${email.trim()}.`}</p>

              {step === 'company' ? (
                <form onSubmit={saveCompany} noValidate className="mt-6 flex flex-col gap-4">
                  <label className="label">
                    Company name
                    <input className="field" autoFocus value={coName} onChange={(e) => setCoName(e.target.value)} placeholder="e.g. Acme Logistics Pvt Ltd" />
                  </label>
                  {error && (
                    <p role="alert" className="text-sm font-semibold text-ember-600">
                      {error}
                    </p>
                  )}
                  <button type="submit" className="btn-primary min-h-12 text-[16px] font-black tracking-wide uppercase">
                    Create business account
                  </button>
                </form>
              ) : step === 'email' ? (
                <form onSubmit={send} noValidate className="mt-6 flex flex-col gap-4">
                  <label className="label">
                    {tab === 'business' ? 'Work email' : 'Email address'}
                    <span className="flex items-center gap-2 rounded-xl border border-line-strong bg-white px-3 focus-within:border-navy-800 focus-within:ring-3 focus-within:ring-navy-100">
                      <Mail className="h-5 w-5 shrink-0 text-ink-400" aria-hidden="true" />
                      <input
                        ref={emailRef}
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={tab === 'business' ? 'you@company.com' : 'you@example.com'}
                        aria-invalid={!!error}
                        className="min-h-12 min-w-0 flex-1 text-[16px] outline-none"
                      />
                    </span>
                  </label>
                  {error && (
                    <p role="alert" className="text-sm font-semibold text-ember-600">
                      {error}
                    </p>
                  )}
                  <button type="submit" className="btn-primary min-h-12 text-[16px] font-black tracking-wide uppercase" disabled={busy || !email.trim()}>
                    {busy ? 'Sending code…' : 'Continue'}
                  </button>
                </form>
              ) : (
                <form onSubmit={verify} className="mt-6 flex flex-col gap-4">
                  <label className="label">
                    6-digit code
                    <input
                      ref={codeRef}
                      className="field text-center text-2xl font-black tracking-[0.5em]"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      aria-invalid={!!error}
                    />
                  </label>
                  {isDemoMode && <p className="rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-800">Demo mode: any 6 digits work.</p>}
                  {error && (
                    <p role="alert" className="text-sm font-semibold text-ember-600">
                      {error}
                    </p>
                  )}
                  <button type="submit" className="btn-primary min-h-12 text-[16px] font-black tracking-wide uppercase" disabled={busy || code.length !== 6}>
                    {busy ? 'Checking…' : 'Sign in'}
                  </button>
                  <div className="flex flex-wrap justify-between gap-2 text-sm font-bold">
                    <button type="button" className="text-navy-800" onClick={() => setStep('email')}>
                      Use a different email
                    </button>
                    <button type="button" className="text-navy-800 disabled:text-ink-400" disabled={cooldown > 0 || busy} onClick={() => send()}>
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </form>
              )}

              <p className="mt-auto pt-8 text-[12.5px] text-ink-500">
                By proceeding, you agree to {site.name}’s{' '}
                <Link to="/privacy" onClick={close}>
                  Privacy Policy
                </Link>
                ,{' '}
                <Link to="/terms" onClick={close}>
                  User Agreement
                </Link>{' '}
                and{' '}
                <Link to="/cancellation-policy" onClick={close}>
                  Cancellation Policy
                </Link>
                .
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
