import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { displayName } from './names'
import { isDemoMode, supabase } from './supabase'

/*
 * Traveller profile, preferences and co-travellers.
 * Live site: saved in the `profiles` table (full_name, phone, data) so it follows the guest to any
 * device; this browser keeps a copy for speed. Demo mode: this browser only.
 * Only the last 4 digits of an ID are stored.
 */

export interface CoTraveller {
  id: string
  first: string
  last: string
  gender: string
  ageGroup: 'Adult' | 'Child'
  relation: string
  email: string
  phone: string
}

export interface Profile {
  first: string
  last: string
  gender: string
  dob: string
  nationality: string
  marital: string
  city: string
  bookerType: string
  phone: string
  phoneVerified: boolean
  idType: string
  idLast4: string
  photo: string
  prefs: {
    bed: string
    floor: string
    smoking: string
    meal: string
    requests: string[]
    channels: string[]
  }
  coTravellers: CoTraveller[]
}

export const blankProfile: Profile = {
  first: '',
  last: '',
  gender: '',
  dob: '',
  nationality: 'Indian',
  marital: '',
  city: '',
  bookerType: '',
  phone: '',
  phoneVerified: false,
  idType: '',
  idLast4: '',
  photo: '',
  prefs: { bed: 'No preference', floor: 'No preference', smoking: 'Non-smoking', meal: 'No preference', requests: [], channels: ['Email'] },
  coTravellers: [],
}

const key = (id: string) => `stayeasy.profile.${id}`
const EVT = 'stayeasy-profile'

export function readProfile(id: string): Profile {
  try {
    const p = JSON.parse(localStorage.getItem(key(id)) || '{}')
    return { ...blankProfile, ...p, prefs: { ...blankProfile.prefs, ...(p.prefs ?? {}) } }
  } catch {
    return blankProfile
  }
}

/** The signed-in user's profile, kept in sync across the app. */
export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile>(() => (user ? readProfile(user.id) : blankProfile))
  useEffect(() => {
    if (!user) return
    setProfile(readProfile(user.id))
    if (!isDemoMode && supabase) {
      supabase
        .from('profiles')
        .select('data')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.data && Object.keys(data.data).length) {
            try {
              localStorage.setItem(key(user.id), JSON.stringify(data.data))
            } catch {
              /* ignore */
            }
            setProfile(readProfile(user.id))
          }
        })
    }
    const on = () => setProfile(readProfile(user.id))
    window.addEventListener(EVT, on)
    return () => window.removeEventListener(EVT, on)
  }, [user])
  const save = useCallback(
    (p: Profile) => {
      if (!user) return
      try {
        localStorage.setItem(key(user.id), JSON.stringify(p))
      } catch {
        /* ignore */
      }
      setProfile(p)
      window.dispatchEvent(new Event(EVT))
      if (!isDemoMode && supabase) {
        const full = `${p.first} ${p.last}`.trim()
        supabase
          .from('profiles')
          .update({ data: p, full_name: full || null, phone: p.phone || null })
          .eq('id', user.id)
          .then(({ error }) => error && console.warn('Profile not saved to account:', error.message))
      }
    },
    [user],
  )
  const name = user ? `${profile.first} ${profile.last}`.trim() || displayName(user.email, user.name) : ''
  return { profile, save, name }
}
