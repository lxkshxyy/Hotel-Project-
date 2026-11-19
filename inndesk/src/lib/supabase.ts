import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * When the Supabase keys are missing the app runs in demo mode:
 * the owner account, listings and photos are kept in this browser, and published listings go to
 * StayEasy through its local publish channel (StayEasy must be running on this computer).
 */
export const isDemoMode = !url || !anonKey

/**
 * InnDesk signs in only with a password or a 6-digit code typed into the page. A link from an auth
 * email (reset password, confirm signup, magic link) must never sign anyone in, so the tokens such a
 * link puts in the address are ignored and wiped. `authLinkUsed` tells the page to explain this.
 */
function readAuthLink(): 'recovery' | 'other' | null {
  if (typeof window === 'undefined') return null
  const { hash, search, pathname } = window.location
  const h = new URLSearchParams(hash.replace(/^#/, ''))
  const q = new URLSearchParams(search)
  const hit = h.has('access_token') || h.has('refresh_token') || h.has('error_code') || q.has('token_hash') || (q.has('code') && q.get('code')!.length > 20)
  if (!hit) return null
  window.history.replaceState(null, '', pathname)
  return h.get('type') === 'recovery' || q.get('type') === 'recovery' ? 'recovery' : 'other'
}
export const authLinkUsed = readAuthLink()

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
