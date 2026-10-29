import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * When the Supabase keys are missing the app runs in demo mode:
 * the owner account, listings and photos are kept in this browser, and published listings go to
 * StayEasy through its local publish channel (StayEasy must be running on this computer).
 */
export const isDemoMode = !url || !anonKey

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
