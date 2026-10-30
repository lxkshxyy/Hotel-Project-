import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, CircleX, Eye, EyeOff, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { site } from '../config/site'
import { passwordOk, passwordRules, useSession } from '../context/Session'
import { isDemoMode } from '../lib/supabase'
import { Mark } from './ui'

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

export function PasswordField({ label, value, onChange, placeholder, autoComplete, invalid, dark = false }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete: string; invalid?: boolean; dark?: boolean }) {
  const [show, setShow] = useState(false)
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={`text-[13px] font-bold ${dark ? 'text-white/90' : 'text-ink-700'}`}>
        {label}
      </label>
      <span className="relative">
        <input id={id} type={show ? 'text' : 'password'} className="field pr-11" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={invalid} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-500 hover:text-ink-900">
          {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </span>
    </div>
  )
}

export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Password rules">
      {passwordRules.map((r) => {
        const ok = r.test(value)
        const Icon = ok ? CircleCheck : CircleX
        return (
          <li key={r.id} className={`flex items-center gap-1 text-[12px] font-semibold ${ok ? 'text-live' : value ? 'text-alert' : 'text-ink-400'}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {r.label}
            <span className="sr-only">{ok ? '(met)' : '(not met)'}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Six separate digit boxes; paste fills them all. */
export function CodeBoxes({ value, onChange, length = 6 }: { value: string; onChange: (v: string) => void; length?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  useEffect(() => {
    refs.current[0]?.focus()
  }, [])
  const set = (i: number, d: string) => {
    const chars = value.padEnd(length, ' ').split('')
    chars[i] = d || ' '
    onChange(chars.join('').replace(/\s+$/, ''))
  }
  return (
    <div className="flex gap-2" role="group" aria-label={`${length}-digit code`}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          aria-label={`Digit ${i + 1}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={value[i]?.trim() ?? ''}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1)
            set(i, d)
            if (d) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i]?.trim()) refs.current[i - 1]?.focus()
            if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus()
            if (e.key === 'ArrowRight') refs.current[i + 1]?.focus()
          }}
          onPaste={(e) => {
            const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
            if (!p) return
            e.preventDefault()
            onChange(p)
            refs.current[Math.min(p.length, length - 1)]?.focus()
          }}
          className="h-12 w-11 rounded-lg border border-line-strong bg-white text-center text-xl font-bold outline-none focus:border-pine-700 focus:shadow-[0_0_0_3px_var(--color-pine-100)] sm:w-12"
        />
      ))}
    </div>
  )
}

export function useCountdown(start: number) {
  const [left, setLeft] = useState(start)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return { left, restart: () => setLeft(start) }
}

/** White pop-up over a dimmed page, with the InnDesk mark in the corner. */
export function Popup({ open, onClose, title, intro, children, label, mark = true }: { open: boolean; onClose: () => void; title: string; intro?: ReactNode; children: ReactNode; label?: string; mark?: boolean }) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [open])
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[100] flex items-end justify-center bg-pine-950/60 sm:items-center sm:p-4">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label ?? title}
            initial={{ y: 28, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[94dvh] w-full max-w-[440px] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-lift sm:rounded-2xl sm:p-7"
          >
            <button type="button" aria-label="Close" onClick={onClose} className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-paper hover:text-ink-900">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-3 pr-10">
              {mark && <Mark size={30} />}
              <h2 className="text-[19px] font-bold text-ink-900">{title}</h2>
            </div>
            {intro && <div className="mt-1 text-[14px] text-ink-500">{intro}</div>}
            <div className="mt-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const Err = ({ msg, dark }: { msg: string; dark?: boolean }) =>
  msg ? (
    <p role="alert" className={`text-[13px] leading-snug font-semibold ${dark ? 'text-[#ffb4ab]' : 'text-alert'}`}>
      {msg}
    </p>
  ) : null

/* ---------------- Create an account ---------------- */

export function CreateAccount({ open, onClose, onDone, presetEmail = '' }: { open: boolean; onClose: () => void; onDone: () => void; presetEmail?: string }) {
  const { signUp, verifySignUp, resendSignUp } = useSession()
  const [step, setStep] = useState<'details' | 'code'>('details')
  const [f, setF] = useState({ name: '', email: presetEmail, password: '', confirm: '' })
  const [code, setCode] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const timer = useCountdown(60)

  useEffect(() => {
    if (open) {
      setStep('details')
      setF((x) => ({ ...x, email: presetEmail || x.email, password: '', confirm: '' }))
      setCode('')
      setTried(false)
      setError('')
    }
  }, [open, presetEmail])

  const problems = {
    name: f.name.trim().length < 2 ? 'Enter your first and last name.' : '',
    email: !emailOk(f.email) ? 'Enter a valid email address.' : '',
    password: !passwordOk(f.password) ? 'Meet all three password rules.' : '',
    confirm: f.confirm !== f.password || !f.confirm ? 'The passwords don’t match.' : '',
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    setError('')
    if (Object.values(problems).some(Boolean)) return
    setBusy(true)
    try {
      await signUp(f.name, f.email, f.password)
      setStep('code')
      timer.restart()
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Couldn’t create the account.')
    } finally {
      setBusy(false)
    }
  }
  const verify = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await verifySignUp(f.email, code)
      onDone()
    } catch (x) {
      setError(x instanceof Error ? x.message : 'That code didn’t work.')
      setBusy(false)
    }
  }

  return (
    <Popup open={open} onClose={onClose} title={step === 'details' ? 'Create an account' : 'Verify your email'} intro={step === 'code' ? `List your property and start getting bookings on ${site.marketplace}.` : undefined}>
      {step === 'details' ? (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <label className="label">
            Your name
            <input className="field" autoComplete="name" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="First and last name" aria-invalid={tried && !!problems.name} />
            {tried && problems.name && <Err msg={problems.name} />}
          </label>
          <label className="label">
            Email address
            <input className="field" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@yourhotel.com" aria-invalid={tried && !!problems.email} />
            <span className="text-[12px] font-normal text-ink-500">We will send a 6-digit code to confirm this email.</span>
            {tried && problems.email && <Err msg={problems.email} />}
          </label>
          <div className="flex flex-col gap-2">
            <PasswordField label="Password" value={f.password} onChange={(v) => setF({ ...f, password: v })} placeholder="Enter at least 8 characters" autoComplete="new-password" invalid={tried && !!problems.password} />
            <PasswordRules value={f.password} />
          </div>
          <div className="flex flex-col gap-1.5">
            <PasswordField label="Confirm password" value={f.confirm} onChange={(v) => setF({ ...f, confirm: v })} placeholder="Re-enter your password" autoComplete="new-password" invalid={tried && !!problems.confirm} />
            {(tried || (f.confirm.length >= f.password.length && f.confirm)) && problems.confirm && <Err msg={problems.confirm} />}
          </div>
          <Err msg={error} />
          <button type="submit" className="btn-brass min-h-12" disabled={busy}>
            {busy ? 'Sending code…' : 'Verify email address'}
          </button>
          <p className="text-center text-[12px] text-ink-500">By continuing you agree to the {site.marketplace} partner terms and privacy policy.</p>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <p className="text-[14.5px] text-ink-700">
            To activate your account, enter the 6-digit code sent to <strong className="text-ink-900">{f.email}</strong>
          </p>
          <CodeBoxes value={code} onChange={setCode} />
          {timer.left > 0 ? (
            <span className="text-[13px] font-semibold text-ink-400">Resend code in 0:{String(timer.left).padStart(2, '0')}</span>
          ) : (
            <button
              type="button"
              className="self-start text-[13px] font-bold text-pine-800 hover:underline"
              onClick={async () => {
                setError('')
                try {
                  await resendSignUp(f.email)
                  timer.restart()
                } catch (x) {
                  setError(x instanceof Error ? x.message : 'Couldn’t resend.')
                }
              }}
            >
              Resend code
            </button>
          )}
          {isDemoMode && <span className="rounded-lg bg-pine-50 px-3 py-2 text-[13px] text-pine-900">Demo mode: any 6 digits work.</span>}
          <Err msg={error} />
          <button type="submit" className="btn-brass min-h-12" disabled={busy || !/^\d{6}$/.test(code)}>
            {busy ? 'Creating…' : 'Create an account'}
          </button>
          <button type="button" className="self-center text-[13px] font-bold text-ink-500 hover:text-ink-900" onClick={() => setStep('details')}>
            Change email
          </button>
        </form>
      )}
    </Popup>
  )
}

/* ---------------- Forgot password ---------------- */

export function ForgotPassword({ open, onClose, onDone, presetEmail = '' }: { open: boolean; onClose: () => void; onDone: () => void; presetEmail?: string }) {
  const { sendReset, resetPassword } = useSession()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState(presetEmail)
  const [code, setCode] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (open) {
      setStep('email')
      setEmail(presetEmail)
      setCode('')
      setPw('')
      setError('')
    }
  }, [open, presetEmail])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!emailOk(email)) return setError('Enter a valid email address.')
    setBusy(true)
    try {
      await sendReset(email)
      setStep('code')
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Couldn’t send the code.')
    } finally {
      setBusy(false)
    }
  }
  const save = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await resetPassword(email, code, pw)
      onDone()
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Couldn’t change the password.')
      setBusy(false)
    }
  }
  return (
    <Popup open={open} onClose={onClose} title="Reset your password">
      {step === 'email' ? (
        <form onSubmit={send} noValidate className="flex flex-col gap-4">
          <label className="label">
            Email address
            <input className="field" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <Err msg={error} />
          <button type="submit" className="btn-brass min-h-12" disabled={busy}>
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={save} className="flex flex-col gap-4">
          <p className="text-[14.5px] text-ink-700">
            Enter the 6-digit code sent to <strong className="text-ink-900">{email}</strong> and choose a new password.
          </p>
          <CodeBoxes value={code} onChange={setCode} />
          {isDemoMode && <span className="rounded-lg bg-pine-50 px-3 py-2 text-[13px] text-pine-900">Demo mode: any 6 digits work.</span>}
          <div className="flex flex-col gap-2">
            <PasswordField label="New password" value={pw} onChange={setPw} autoComplete="new-password" placeholder="Enter at least 8 characters" />
            <PasswordRules value={pw} />
          </div>
          <Err msg={error} />
          <button type="submit" className="btn-brass min-h-12" disabled={busy || !/^\d{6}$/.test(code) || !passwordOk(pw)}>
            {busy ? 'Saving…' : 'Save and sign in'}
          </button>
        </form>
      )}
    </Popup>
  )
}

/* ---------------- Change password (profile menu) ---------------- */

export function ChangePassword({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changePassword } = useSession()
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (open) {
      setF({ current: '', next: '', confirm: '' })
      setError('')
      setDone(false)
    }
  }, [open])
  const save = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!f.current) return setError('Enter your current password.')
    if (f.next !== f.confirm) return setError('The new passwords don’t match.')
    setBusy(true)
    try {
      await changePassword(f.current, f.next)
      setDone(true)
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Couldn’t change the password.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Popup open={open} onClose={onClose} title="Change password">
      {done ? (
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2 font-semibold text-live">
            <CircleCheck className="h-5 w-5" aria-hidden="true" /> Your password has been changed.
          </p>
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={save} noValidate className="flex flex-col gap-4">
          <PasswordField label="Current password" value={f.current} onChange={(v) => setF({ ...f, current: v })} autoComplete="current-password" />
          <div className="flex flex-col gap-2">
            <PasswordField label="New password" value={f.next} onChange={(v) => setF({ ...f, next: v })} autoComplete="new-password" placeholder="Enter at least 8 characters" />
            <PasswordRules value={f.next} />
          </div>
          <PasswordField label="Confirm new password" value={f.confirm} onChange={(v) => setF({ ...f, confirm: v })} autoComplete="new-password" />
          <Err msg={error} />
          <button type="submit" className="btn-brass min-h-12" disabled={busy || !passwordOk(f.next)}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </form>
      )}
    </Popup>
  )
}

/* ---------------- Sign-in card (landing page) ---------------- */

export function SignInCard({ onSignedIn, onCreate, onForgot }: { onSignedIn: () => void; onCreate: (email: string) => void; onForgot: (email: string) => void }) {
  const { signIn } = useSession()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!emailOk(email)) return setError('Enter a valid email address.')
    if (!pw) return setError('Enter your password.')
    setBusy(true)
    try {
      await signIn(email, pw)
      onSignedIn()
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Couldn’t sign in.')
      setBusy(false)
    }
  }
  return (
    <div className="w-full max-w-[440px] rounded-2xl bg-white/12 p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)] ring-1 ring-white/25 backdrop-blur-xl sm:p-8">
      <h2 className="text-center text-[22px] font-black sm:text-[24px]">Sign in to manage your property</h2>
      <p className="mt-1 text-center text-[15px] text-white/80">Welcome back! Please enter your details.</p>
      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-[13px] font-bold text-white/90">
          Email address
          <input className="field text-ink-900" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourhotel.com" aria-invalid={!!error} />
        </label>
        <div className="flex flex-col gap-1.5">
          <PasswordField dark label="Password" value={pw} onChange={setPw} autoComplete="current-password" placeholder="Your password" invalid={!!error} />
          <button type="button" onClick={() => onForgot(email)} className="self-end text-[13px] font-bold text-white hover:underline">
            Forgot your password?
          </button>
        </div>
        <Err msg={error} dark />
        <button type="submit" className="btn-brass min-h-12 text-base" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-center text-[15px] text-white/85">
          New to {site.name}?{' '}
          <button type="button" onClick={() => onCreate(email)} className="font-black text-white hover:underline">
            Create an account
          </button>
        </p>
      </form>
    </div>
  )
}
