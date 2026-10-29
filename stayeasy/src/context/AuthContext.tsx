import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isDemoMode, supabase } from '../lib/supabase'

export interface AppUser {
  id: string
  email: string
  name?: string
}

interface AuthState {
  user: AppUser | null
  loading: boolean
  /** Sends a 6-digit code (and magic link) to the email address. */
  sendCode: (email: string) => Promise<void>
  /** Confirms the code; returns once the user is signed in. */
  verifyCode: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const DEMO_USER = 'stayeasy.demo.user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode || !supabase) {
      try {
        const raw = localStorage.getItem(DEMO_USER)
        if (raw) setUser(JSON.parse(raw))
      } catch {
        /* ignore */
      }
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      setUser(u ? { id: u.id, email: u.email ?? '', name: u.user_metadata?.full_name } : null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      setUser(u ? { id: u.id, email: u.email ?? '', name: u.user_metadata?.full_name } : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async sendCode(email) {
        if (isDemoMode || !supabase) return
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin + '/bookings' },
        })
        if (error) throw new Error(error.message)
      },
      async verifyCode(email, code) {
        if (isDemoMode || !supabase) {
          if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code.')
          const demo: AppUser = { id: `demo-${email.toLowerCase()}`, email }
          try {
            localStorage.setItem(DEMO_USER, JSON.stringify(demo))
          } catch {
            /* ignore */
          }
          setUser(demo)
          return
        }
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
        if (error) throw new Error(error.message)
      },
      async signOut() {
        if (isDemoMode || !supabase) {
          try {
            localStorage.removeItem(DEMO_USER)
          } catch {
            /* ignore */
          }
          setUser(null)
          return
        }
        await supabase.auth.signOut()
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
