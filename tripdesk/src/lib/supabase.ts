import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * When the Supabase keys are missing the app runs in demo mode:
 * the agency, wallet, quotes and bookings are kept in this browser.
 */
export const isDemoMode = !url || !anonKey

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
