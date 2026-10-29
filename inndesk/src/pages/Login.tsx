import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo, Notice } from '../components/ui'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { gstinError } from '../lib/gstin'
import { isDemoMode } from '../lib/supabase'
import type { Owner } from '../lib/types'

function Shell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_480px]">
      <div className="relative hidden overflow-hidden bg-pine-900 lg:block">
        <img src="/img/lobby.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo light />
          <p className="max-w-md font-display text-[34px] leading-tight font-bold">Your rooms, prices and reservations, in one place.</p>
        </div>
      </div>
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <h1 className="mt-8 text-[30px] font-bold text-pine-950 lg:mt-0">{title}</h1>
        <p className="mt-1 text-ink-500">{intro}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

export default function Login() {
  const [params] = useSearchParams()
  const next = params.get('next')
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app'
  const { user, owner, loading, sendCode, verifyCode } = useSession()
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const codeRef = useRef<HTMLInputElement>(null)

  if (!loading && user) return <Navigate to={owner ? safeNext : `/welcome?next=${encodeURIComponent(safeNext)}`} replace />

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
      navigate(`/welcome?next=${encodeURIComponent(safeNext)}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code didn’t work.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell title={step === 'email' ? `Sign in to ${site.name}` : 'Check your email'} intro={step === 'email' ? 'Use the email you want guests’ bookings and payout statements sent to.' : `We sent a 6-digit code to ${email}.`}>
      {step === 'email' ? (
        <form onSubmit={send} noValidate className="flex flex-col gap-4">
          <label className="label">
            Email address
            <input className="field" type="email" autoComplete="email" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary min-h-12" disabled={busy}>
            {busy ? 'Sending code…' : 'Send code'}
          </button>
          <p className="text-sm text-ink-500">New to {site.name}? Signing in creates your account.</p>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <label className="label">
            6-digit code
            <input
              ref={codeRef}
              className="field text-center font-display text-2xl tracking-[0.5em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              aria-invalid={!!error}
            />
          </label>
          {isDemoMode && <Notice>Local demo mode: any 6 digits work.</Notice>}
          {error && (
            <p role="alert" className="text-sm font-semibold text-alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary min-h-12" disabled={busy || code.length !== 6}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <button type="button" className="self-start text-sm font-bold text-pine-800" onClick={() => setStep('email')}>
            Use a different email
          </button>
        </form>
      )}
      <p className="mt-8 text-sm text-ink-500">
        <Link to="/" className="font-semibold text-pine-800">
          Back to {site.name} home
        </Link>
      </p>
    </Shell>
  )
}

/** First sign-in: who runs the property. */
export function Welcome() {
  const { user, owner, loading, saveOwner } = useSession()
  const [params] = useSearchParams()
  const next = params.get('next')
  const navigate = useNavigate()
  const [f, setF] = useState({ fullName: '', phone: '', businessName: '', role: 'Owner' as Owner['role'], gstin: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && owner) navigate(next && next.startsWith('/app') ? next : '/app', { replace: true })
  }, [loading, owner, next, navigate])

  if (!loading && !user) return <Navigate to="/login" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (f.fullName.trim().length < 2) return setError('Enter your full name.')
    if (!/^[6-9]\d{9}$/.test(f.phone)) return setError('Enter a 10-digit Indian mobile number.')
    if (f.businessName.trim().length < 2) return setError('Enter the business or property owner name.')
    if (f.gstin && gstinError(f.gstin)) return setError(`GSTIN: ${gstinError(f.gstin)}`)
    setBusy(true)
    try {
      await saveOwner({ id: user!.id, email: user!.email, fullName: f.fullName.trim(), phone: f.phone, businessName: f.businessName.trim(), role: f.role, gstin: f.gstin.trim().toUpperCase(), notify: { email: true, sms: false, whatsapp: true } })
      navigate(next && next.startsWith('/app') ? next : '/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save your details.')
      setBusy(false)
    }
  }

  return (
    <Shell title="Tell us who runs the property" intro={`Signed in as ${user?.email ?? ''}. You can change these later in Settings.`}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <label className="label">
          Your full name
          <input className="field" autoComplete="name" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
        </label>
        <label className="label">
          Mobile number
          <span className="flex overflow-hidden rounded-[10px] border border-line-strong bg-white focus-within:border-pine-700">
            <span className="flex items-center bg-paper px-3 text-sm font-bold text-ink-700">+91</span>
            <input className="min-h-[46px] min-w-0 flex-1 px-3 text-[15px] outline-none" inputMode="numeric" autoComplete="tel-national" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
          </span>
        </label>
        <label className="label">
          Business or owner name (for invoices)
          <input className="field" value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} placeholder="e.g. Sunrise Hospitality LLP" />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold text-ink-700">Your role</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['Owner', 'Manager'] as const).map((r) => (
              <label key={r} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3.5 font-semibold ${f.role === r ? 'border-pine-800 bg-pine-50' : 'border-line-strong bg-white'}`}>
                <input type="radio" name="role" checked={f.role === r} onChange={() => setF({ ...f, role: r })} className="accent-pine-800" />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="label">
          GSTIN (optional)
          <input className="field uppercase" maxLength={15} value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} />
        </label>
        {error && (
          <p role="alert" className="text-sm font-semibold text-alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary min-h-12" disabled={busy}>
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </Shell>
  )
}
