import { isDemoMode } from '../lib/supabase'

/*
 * What the public site shows. Each switch is an environment variable on Vercel, so the client can
 * turn parts on without a code change.
 */
const flag = (v: string | undefined, fallback: boolean) => (v === undefined || v === '' ? fallback : v === 'on' || v === 'true' || v === '1')

export const features = {
  /**
   * StayEasy for Business (/biz). Its bookings, wallet and invoices are not connected to the
   * database yet (Phase 2 backend), so it is off on the live site unless VITE_ENABLE_BUSINESS=on.
   */
  business: flag(import.meta.env.VITE_ENABLE_BUSINESS, isDemoMode),
  /**
   * "Stay Protect" travel cover at checkout. An insurance product can't be sold without a licensed
   * insurer, so it stays off on the live site until VITE_STAY_PROTECT=on (and STAY_PROTECT=on on the server).
   */
  stayProtect: flag(import.meta.env.VITE_STAY_PROTECT, isDemoMode),
  /** Sample guest reviews and sample ratings. Only ever shown in demo mode. */
  sampleReviews: isDemoMode,
}

/** A demo build that someone opened on a real web address (not this computer). */
export const isPublicDemo = isDemoMode && typeof window !== 'undefined' && !/^(localhost|127\.|192\.168\.|10\.)/.test(window.location.hostname)
