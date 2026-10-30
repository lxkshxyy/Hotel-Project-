import { useCallback, useEffect, useState } from 'react'
import { onLocalMachine, site } from '../config/site'
import { dataUrlToBlob } from './images'
import { blockers, makeSlug, toHotel } from './listing'
import { isDemoMode, supabase } from './supabase'
import type { Listing, Owner, Reservation } from './types'

/*
 * Where InnDesk keeps its data.
 * Local demo mode: listings (with photos) in this browser's IndexedDB, the owner profile in
 * localStorage, and published listings pushed to StayEasy's local publish channel.
 * Live mode (Supabase keys set): partner_listings + hotels tables and the hotel-photos bucket,
 * shared with StayEasy. See StayEasy's supabase/schema.sql → "Partner panel".
 */

const EVT = 'inndesk-data'
const changed = () => window.dispatchEvent(new Event(EVT))
const CHANNEL = `${site.mainSiteUrl}/__partner`
/** The local publish channel only exists when both sites run on this computer (no database). */
const localChannel = onLocalMachine

/* ---------------- IndexedDB (local mode) ---------------- */

function db(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const req = indexedDB.open('inndesk', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('listings', { keyPath: 'id' })
    req.onsuccess = () => ok(req.result)
    req.onerror = () => fail(req.error)
  })
}
async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db()
  return new Promise((ok, fail) => {
    const r = fn(d.transaction('listings', mode).objectStore('listings'))
    r.onsuccess = () => ok(r.result as T)
    r.onerror = () => fail(r.error)
  })
}

/* ---------------- owner ---------------- */

const ownerKey = (id: string) => `inndesk.owner.${id}`

export async function getOwner(id: string, email: string): Promise<Owner | null> {
  if (isDemoMode || !supabase) {
    try {
      const raw = localStorage.getItem(ownerKey(id))
      return raw ? (JSON.parse(raw) as Owner) : null
    } catch {
      return null
    }
  }
  const { data } = await supabase.from('partner_owners').select('*').eq('id', id).maybeSingle()
  if (!data) return null
  return { id, email, fullName: data.full_name, phone: data.phone, businessName: data.business_name, gstin: data.gstin ?? '', role: data.data?.role ?? 'Owner', notify: data.data?.notify ?? { email: true, sms: false, whatsapp: true } }
}

export async function saveOwner(o: Owner) {
  if (isDemoMode || !supabase) {
    localStorage.setItem(ownerKey(o.id), JSON.stringify(o))
  } else {
    const { error } = await supabase
      .from('partner_owners')
      .upsert({ id: o.id, full_name: o.fullName, phone: o.phone, business_name: o.businessName, gstin: o.gstin || null, data: { role: o.role, notify: o.notify } })
    if (error) throw new Error(error.message)
  }
  changed()
}

/* ---------------- listings ---------------- */

export async function listListings(ownerId: string): Promise<Listing[]> {
  if (isDemoMode || !supabase) {
    const all = await idb<Listing[]>('readonly', (s) => s.getAll())
    return all.filter((l) => l.ownerId === ownerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  const { data, error } = await supabase.from('partner_listings').select('data').eq('owner_id', ownerId).order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => r.data as Listing)
}

export async function getListing(ownerId: string, id: string) {
  return (await listListings(ownerId)).find((l) => l.id === id) ?? null
}

/** Live mode: move photos that are still data URLs into the hotel-photos bucket. */
async function uploadPhotos(l: Listing): Promise<Listing> {
  if (isDemoMode || !supabase) return l
  const photos = await Promise.all(
    l.photos.map(async (p) => {
      if (!p.url.startsWith('data:')) return p
      const path = `${l.ownerId}/${l.id}/${p.id}.jpg`
      const { error } = await supabase!.storage.from('hotel-photos').upload(path, dataUrlToBlob(p.url), { upsert: true, contentType: 'image/jpeg' })
      if (error) throw new Error(`Photo upload failed: ${error.message}`)
      return { ...p, url: supabase!.storage.from('hotel-photos').getPublicUrl(path).data.publicUrl }
    }),
  )
  return { ...l, photos }
}

async function write(l: Listing) {
  if (isDemoMode || !supabase) {
    await idb('readwrite', (s) => s.put(l))
    return
  }
  const { error } = await supabase.from('partner_listings').upsert({ id: l.id, owner_id: l.ownerId, slug: l.slug || `draft-${l.id}`, status: l.status, data: l, updated_at: l.updatedAt })
  if (error) throw new Error(error.message)
}

/** Sends the public copy of the listing to StayEasy. Returns the sync result instead of throwing. */
async function pushToStayEasy(l: Listing): Promise<Listing['sync']> {
  const at = new Date().toISOString()
  const hotel = toHotel(l)
  const published = l.status === 'live'
  try {
    if (isDemoMode || !supabase) {
      if (!localChannel)
        return {
          ok: false,
          at,
          message: `Demo mode: this listing is saved in this browser only. To show it on ${site.marketplace}, connect the shared database (Supabase keys).`,
        }
      const r = await fetch(`${CHANNEL}/listings/${l.slug}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ownerId: l.ownerId, published, hotel }),
      })
      if (!r.ok) {
        const msg = ((await r.json().catch(() => ({}))) as { error?: string }).error
        return { ok: false, at, message: msg || `StayEasy answered ${r.status}.` }
      }
      return { ok: true, at }
    }
    const { error } = await supabase.from('hotels').upsert({ slug: l.slug, city: hotel.city, name: hotel.name, published, data: hotel, owner_id: l.ownerId, source: 'partner', updated_at: at })
    return error ? { ok: false, at, message: error.message } : { ok: true, at }
  } catch {
    return { ok: false, at, message: `Couldn’t reach ${site.marketplace} at ${site.mainSiteUrl}. Start the ${site.marketplace} website, then press Retry.` }
  }
}

/** Saves a listing. Changes to a live or paused listing are sent to StayEasy straight away. */
export async function saveListing(input: Listing): Promise<Listing> {
  let l = await uploadPhotos({ ...input, updatedAt: new Date().toISOString() })
  if (l.status !== 'draft') l = { ...l, sync: await pushToStayEasy(l) }
  await write(l)
  changed()
  return l
}

export class PublishError extends Error {}

/** Runs the publish checks, then makes the listing live on StayEasy. */
export async function publishListing(input: Listing): Promise<Listing> {
  const problems = blockers(input)
  if (problems.length) throw new PublishError(`${problems.length} thing${problems.length > 1 ? 's' : ''} to fix before publishing.`)
  const now = new Date().toISOString()
  let l: Listing = { ...input, slug: input.slug || makeSlug(input), status: 'live', publishedAt: input.publishedAt ?? now, updatedAt: now }
  l = await uploadPhotos(l)
  l = { ...l, sync: await pushToStayEasy(l) }
  await write(l)
  changed()
  return l
}

export async function setListingStatus(input: Listing, status: 'live' | 'paused') {
  return saveListing({ ...input, status })
}

export async function retrySync(input: Listing) {
  const l = { ...input, sync: await pushToStayEasy(input) }
  await write(l)
  changed()
  return l
}

/** Drafts are deleted outright; a published listing is taken off StayEasy first. */
export async function deleteListing(l: Listing) {
  if (l.slug && l.status !== 'draft') {
    if (isDemoMode || !supabase) {
      if (localChannel) await fetch(`${CHANNEL}/listings/${l.slug}?owner=${encodeURIComponent(l.ownerId)}`, { method: 'DELETE' }).catch(() => null)
    } else await supabase.from('hotels').update({ published: false }).eq('slug', l.slug)
  }
  if (isDemoMode || !supabase) await idb('readwrite', (s) => s.delete(l.id))
  else await supabase.from('partner_listings').delete().eq('id', l.id)
  changed()
}

/* ---------------- guest contact verification ---------------- */

export const CONTACT_CODE_LENGTH = 4
const NOT_READY = 'Mobile and email verification isn’t switched on yet. It needs an SMS and email service connected to the live server.'

/**
 * Sends a one-time code to the guest contact email or mobile on a listing.
 * Demo mode: nothing is sent and any 4 digits work. Live mode calls the `contact-otp` edge
 * function, which needs an SMS service (for mobiles) and an email service.
 */
export async function sendContactCode(channel: 'email' | 'phone', to: string) {
  if (isDemoMode || !supabase) return
  const { error } = await supabase.functions.invoke('contact-otp', { body: { action: 'send', channel, to } })
  if (error) throw new Error(NOT_READY)
}

export async function checkContactCode(channel: 'email' | 'phone', to: string, code: string) {
  if (!new RegExp(`^\\d{${CONTACT_CODE_LENGTH}}$`).test(code)) throw new Error(`Enter the ${CONTACT_CODE_LENGTH}-digit OTP.`)
  if (isDemoMode || !supabase) return
  const { data, error } = await supabase.functions.invoke('contact-otp', { body: { action: 'check', channel, to, code } })
  if (error) throw new Error(NOT_READY)
  if (!(data as { ok?: boolean } | null)?.ok) throw new Error('That OTP is wrong or has expired. Ask for a new one.')
}

/* ---------------- reservations ---------------- */

export async function listReservations(slugs: string[]): Promise<{ list: Reservation[]; offline: boolean }> {
  if (!slugs.length) return { list: [], offline: false }
  if (isDemoMode || !supabase) {
    // Hosted demo without a database: bookings from StayEasy can't reach this browser.
    if (!localChannel) return { list: [], offline: false }
    try {
      const r = await fetch(`${CHANNEL}/bookings?slugs=${slugs.map(encodeURIComponent).join(',')}`)
      if (!r.ok) return { list: [], offline: true }
      return { list: ((await r.json()) as Reservation[]).sort((a, b) => a.check_in.localeCompare(b.check_in)), offline: false }
    } catch {
      return { list: [], offline: true }
    }
  }
  const { data, error } = await supabase.from('bookings').select('*').in('hotel_slug', slugs).order('check_in')
  if (error) return { list: [], offline: true }
  return { list: (data ?? []) as Reservation[], offline: false }
}

/** Front-desk marks (checked in / no-show) kept on this device. */
const MARKS = 'inndesk.reservation.marks'
export type DeskMark = 'checked-in' | 'checked-out' | 'no-show'
export const getMarks = (): Record<string, DeskMark> => {
  try {
    return JSON.parse(localStorage.getItem(MARKS) || '{}')
  } catch {
    return {}
  }
}
export const setMark = (id: string, m: DeskMark | null) => {
  const all = getMarks()
  if (m) all[id] = m
  else delete all[id]
  localStorage.setItem(MARKS, JSON.stringify(all))
  changed()
}

export async function channelOnline() {
  if (!isDemoMode && supabase) return true
  if (!localChannel) return false
  try {
    const r = await fetch(`${CHANNEL}/health`)
    return r.ok
  } catch {
    return false
  }
}

/* ---------------- hooks ---------------- */

/** Re-runs `load` whenever InnDesk data changes anywhere in the app. */
export function useData<T>(load: () => Promise<T>, deps: unknown[]): { data: T | undefined; error: string; reload: () => void } {
  const [data, setData] = useState<T>()
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])
  useEffect(() => {
    let live = true
    load()
      .then((d) => live && (setData(d), setError('')))
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Couldn’t load your data.'))
    return () => {
      live = false
    }
  }, [tick, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    window.addEventListener(EVT, reload)
    return () => window.removeEventListener(EVT, reload)
  }, [reload])
  return { data, error, reload }
}
