import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getOwner, saveOwner as persistOwner } from '../lib/store'
import { isDemoMode, supabase } from '../lib/supabase'
import type { Owner } from '../lib/types'

/*
 * Owner accounts: email + password. New accounts confirm their email with a 6-digit code;
 * a forgotten password is reset with a code too. In local demo mode accounts live in this
 * browser (passwords stored as SHA-256 hashes) and any 6 digits work as a code.
 *
 * Live mode needs, in Supabase → Authentication: Email provider on with "Confirm email",
 * and the "Confirm signup" and "Reset password" email templates showing {{ .Token }}.
 */

export interface SessionUser {
  id: string
  email: string
  name: string
}

interface SessionState {
  user: SessionUser | null
  owner: Owner | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  /** Creates the account and emails a code. */
  signUp: (name: string, email: string, password: string) => Promise<void>
  verifySignUp: (email: string, code: string) => Promise<void>
  resendSignUp: (email: string) => Promise<void>
  /** Emails a code for a new password. */
  sendReset: (email: string) => Promise<void>
  resetPassword: (email: string, code: string, password: string) => Promise<void>
  changePassword: (current: string, next: string) => Promise<void>
  signOut: () => Promise<void>
  saveOwner: (o: Owner) => Promise<void>
}

const Ctx = createContext<SessionState | null>(null)
const DEMO_USER = 'inndesk.demo.user'
const DEMO_ACCOUNTS = 'inndesk.demo.accounts'
const PENDING = 'inndesk.pending-signup'

type DemoAccount = { name: string; hash: string }
const norm = (e: string) => e.trim().toLowerCase()
const demoId = (email: string) => `owner-${norm(email)}`

async function sha(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function accounts(): Record<string, DemoAccount> {
  try {
    return JSON.parse(localStorage.getItem(DEMO_ACCOUNTS) || '{}')
  } catch {
    return {}
  }
}
const saveAccounts = (a: Record<string, DemoAccount>) => localStorage.setItem(DEMO_ACCOUNTS, JSON.stringify(a))
const pending = (): { name: string; email: string; hash: string } | null => {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING) || 'null')
  } catch {
    return null
  }
}

/** Password rules shown live in the create-account form. */
export const passwordRules = [
  { id: 'len', label: '8 characters min.', test: (p: string) => p.length >= 8 },
  { id: 'alnum', label: 'Letters and numbers', test: (p: string) => /[a-z]/i.test(p) && /\d/.test(p) },
  { id: 'special', label: 'One special character', test: (p: string) => /[^a-z0-9]/i.test(p) },
]
export const passwordOk = (p: string) => passwordRules.every((r) => r.test(p))

const friendly = (m: string) =>
  /invalid login credentials/i.test(m)
    ? 'We couldn’t find an account with that email and password. Check both (the password is case-sensitive).'
    : /email not confirmed/i.test(m)
      ? 'Confirm your email first. Use “Create an account” again to get a new code.'
      : /token has expired|invalid/i.test(m)
        ? 'That code is wrong or has expired. Check the latest email or ask for a new code.'
        : m

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [owner, setOwner] = useState<Owner | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode || !supabase) {
      let u: SessionUser | null = null
      try {
        const raw = localStorage.getItem(DEMO_USER)
        if (raw) u = JSON.parse(raw)
      } catch {
        /* ignore */
      }
      if (u) setUser({ ...u, name: u.name ?? accounts()[u.email]?.name ?? '' })
      else setLoading(false)
      return
    }
    const toUser = (u: { id: string; email?: string; user_metadata?: { full_name?: string } } | undefined) => (u ? { id: u.id, email: u.email ?? '', name: u.user_metadata?.full_name ?? '' } : null)
    supabase.auth.getSession().then(({ data }) => {
      const u = toUser(data.session?.user)
      setUser(u)
      if (!u) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser((cur) => (cur?.id === session?.user?.id ? cur : toUser(session?.user))))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Load the owner profile; the first sign-in creates it from the name given at sign-up.
  useEffect(() => {
    if (!user) {
      setOwner(null)
      return
    }
    let live = true
    setLoading(true)
    ;(async () => {
      let o = await getOwner(user.id, user.email)
      if (!o) {
        o = { id: user.id, email: user.email, fullName: user.name || user.email.split('@')[0], phone: '', businessName: '', role: 'Owner', gstin: '', notify: { email: true, sms: false, whatsapp: true } }
        await persistOwner(o)
      }
      return o
    })()
      .then((o) => live && setOwner(o))
      .catch(() => live && setOwner(null))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [user])

  const saveOwner = useCallback(async (o: Owner) => {
    await persistOwner(o)
    setOwner(o)
  }, [])

  const enterDemo = (email: string, name: string) => {
    const u = { id: demoId(email), email: norm(email), name }
    localStorage.setItem(DEMO_USER, JSON.stringify(u))
    setUser(u)
  }

  const value = useMemo<SessionState>(
    () => ({
      user,
      owner,
      loading,
      saveOwner,
      async signIn(email, password) {
        if (isDemoMode || !supabase) {
          const a = accounts()[norm(email)]
          if (!a || a.hash !== (await sha(password))) throw new Error(friendly('Invalid login credentials'))
          enterDemo(email, a.name)
          return
        }
        const { error } = await supabase.auth.signInWithPassword({ email: norm(email), password })
        if (error) throw new Error(friendly(error.message))
      },
      async signUp(name, email, password) {
        if (!passwordOk(password)) throw new Error('Choose a password that meets all three rules.')
        if (isDemoMode || !supabase) {
          if (accounts()[norm(email)]) throw new Error('An account with this email already exists. Sign in, or use “Forgot your password?”.')
          sessionStorage.setItem(PENDING, JSON.stringify({ name: name.trim(), email: norm(email), hash: await sha(password) }))
          return
        }
        const { data, error } = await supabase.auth.signUp({ email: norm(email), password, options: { data: { full_name: name.trim() } } })
        if (error) throw new Error(friendly(error.message))
        // Supabase returns a user with no identities when the email is already registered.
        if (data.user && data.user.identities?.length === 0) throw new Error('An account with this email already exists. Sign in, or use “Forgot your password?”.')
      },
      async verifySignUp(email, code) {
        if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code.')
        if (isDemoMode || !supabase) {
          const p = pending()
          if (!p || p.email !== norm(email)) throw new Error('Start again with “Create an account”.')
          saveAccounts({ ...accounts(), [p.email]: { name: p.name, hash: p.hash } })
          sessionStorage.removeItem(PENDING)
          enterDemo(p.email, p.name)
          return
        }
        const { error } = await supabase.auth.verifyOtp({ email: norm(email), token: code, type: 'signup' })
        if (error) throw new Error(friendly(error.message))
      },
      async resendSignUp(email) {
        if (isDemoMode || !supabase) return
        const { error } = await supabase.auth.resend({ type: 'signup', email: norm(email) })
        if (error) throw new Error(friendly(error.message))
      },
      async sendReset(email) {
        if (isDemoMode || !supabase) {
          if (!accounts()[norm(email)]) throw new Error('No account uses this email. Create an account instead.')
          return
        }
        const { error } = await supabase.auth.resetPasswordForEmail(norm(email))
        if (error) throw new Error(friendly(error.message))
      },
      async resetPassword(email, code, password) {
        if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code.')
        if (!passwordOk(password)) throw new Error('Choose a password that meets all three rules.')
        if (isDemoMode || !supabase) {
          const all = accounts()
          const a = all[norm(email)]
          if (!a) throw new Error('No account uses this email.')
          saveAccounts({ ...all, [norm(email)]: { ...a, hash: await sha(password) } })
          enterDemo(email, a.name)
          return
        }
        const v = await supabase.auth.verifyOtp({ email: norm(email), token: code, type: 'recovery' })
        if (v.error) throw new Error(friendly(v.error.message))
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw new Error(friendly(error.message))
      },
      async changePassword(current, next) {
        if (!user) throw new Error('Sign in again.')
        if (!passwordOk(next)) throw new Error('Choose a password that meets all three rules.')
        if (current === next) throw new Error('The new password must be different.')
        if (isDemoMode || !supabase) {
          const all = accounts()
          const a = all[user.email]
          if (!a || a.hash !== (await sha(current))) throw new Error('Your current password is wrong.')
          saveAccounts({ ...all, [user.email]: { ...a, hash: await sha(next) } })
          return
        }
        const check = await supabase.auth.signInWithPassword({ email: user.email, password: current })
        if (check.error) throw new Error('Your current password is wrong.')
        const { error } = await supabase.auth.updateUser({ password: next })
        if (error) throw new Error(friendly(error.message))
      },
      async signOut() {
        if (isDemoMode || !supabase) localStorage.removeItem(DEMO_USER)
        else await supabase.auth.signOut()
        setUser(null)
      },
    }),
    [user, owner, loading, saveOwner],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSession must be used inside <SessionProvider>')
  return c
}
