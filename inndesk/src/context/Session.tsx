import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getOwner, saveOwner as persistOwner } from '../lib/store'
import { isDemoMode, supabase } from '../lib/supabase'
import type { Owner } from '../lib/types'

/*
 * Sign-in with a 6-digit email code (same method as StayEasy), plus the owner's InnDesk profile.
 * In local demo mode any 6 digits work and nothing leaves this browser.
 */

export interface SessionUser {
  id: string
  email: string
}

interface SessionState {
  user: SessionUser | null
  owner: Owner | null
  loading: boolean
  sendCode: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  saveOwner: (o: Owner) => Promise<void>
}

const Ctx = createContext<SessionState | null>(null)
const DEMO_USER = 'inndesk.demo.user'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [owner, setOwner] = useState<Owner | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode || !supabase) {
      // Stay in "loading" until the owner profile has loaded too, so pages don't
      // briefly treat a returning owner as new.
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

  // Load the owner profile whenever the signed-in user changes.
  useEffect(() => {
    // No user: the sign-in check above decides when loading ends.
    if (!user) {
      setOwner(null)
      return
    }
    let live = true
    setLoading(true)
    getOwner(user.id, user.email)
      .then((o) => live && setOwner(o))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [user])

  const saveOwner = useCallback(async (o: Owner) => {
    await persistOwner(o)
    setOwner(o)
  }, [])

  const value = useMemo<SessionState>(
    () => ({
      user,
      owner,
      loading,
      saveOwner,
      async sendCode(email) {
        if (isDemoMode || !supabase) return
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/app' } })
        if (error) throw new Error(error.message)
      },
      async verifyCode(email, code) {
        if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code.')
        if (isDemoMode || !supabase) {
          const u = { id: `owner-${email.trim().toLowerCase()}`, email: email.trim().toLowerCase() }
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
