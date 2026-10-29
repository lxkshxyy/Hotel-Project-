import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { findAgencyFor, saveAgency } from '../lib/store'
import { isDemoMode, supabase } from '../lib/supabase'
import type { Agency, Staff } from '../lib/types'

/* Email-code sign-in (same as StayEasy) plus the agency this login belongs to. */

export interface SessionUser {
  id: string
  email: string
}

interface SessionState {
  user: SessionUser | null
  agency: Agency | null
  role: Staff['role'] | null
  loading: boolean
  sendCode: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  updateAgency: (a: Agency) => Promise<void>
}

const Ctx = createContext<SessionState | null>(null)
const DEMO_USER = 'tripdesk.demo.user'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [agency, setAgency] = useState<Agency | null>(null)
  const [role, setRole] = useState<Staff['role'] | null>(null)
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
      if (u) setUser(u)
      else setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      setUser(u ? { id: u.id, email: u.email ?? '' } : null)
      if (!u) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      setUser(u ? { id: u.id, email: u.email ?? '' } : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const load = useCallback(async (u: SessionUser) => {
    const r = await findAgencyFor(u.id, u.email)
    setAgency(r?.agency ?? null)
    setRole(r?.role ?? null)
  }, [])

  useEffect(() => {
    if (!user) {
      setAgency(null)
      setRole(null)
      return
    }
    let live = true
    setLoading(true)
    load(user).finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [user, load])

  const value = useMemo<SessionState>(
    () => ({
      user,
      agency,
      role,
      loading,
      async refresh() {
        if (user) await load(user)
      },
      async updateAgency(a) {
        await saveAgency(a)
        setAgency(a)
      },
      async sendCode(email) {
        if (isDemoMode || !supabase) return
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/app' } })
        if (error) throw new Error(error.message)
      },
      async verifyCode(email, code) {
        if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code.')
        if (isDemoMode || !supabase) {
          const e = email.trim().toLowerCase()
          const u = { id: `agent-${e}`, email: e }
          localStorage.setItem(DEMO_USER, JSON.stringify(u))
          setUser(u)
          return
        }
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
        if (error) throw new Error(error.message)
      },
      async signOut() {
        if (isDemoMode || !supabase) localStorage.removeItem(DEMO_USER)
        else await supabase.auth.signOut()
        setUser(null)
      },
    }),
    [user, agency, role, loading, load],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSession must be used inside <SessionProvider>')
  return c
}
