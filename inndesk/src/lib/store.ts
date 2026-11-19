import { useCallback, useEffect, useState } from 'react'
import { onLocalMachine, site } from '../config/site'
import { dataUrlToBlob } from './images'
import { gstinState as gstState } from './gstin'
import { blockers, checkSig, legalSections, makeSlug, toHotel, verifyGaps } from './listing'
import { isDemoMode, supabase } from './supabase'
import type { Dispute, GuestReview, Listing, Owner, Reservation, Verification, VerifyKind } from './types'

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
        return { ok: false, at, message: msg || `TRPOTELS answered ${r.status}.` }
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
  // Bank account, PAN, GSTIN and the ownership document must have passed their automatic checks.
  const checks = await listVerifications(input.id)
  const gaps = legalSections.flatMap((s) => verifyGaps(input, checks, s.id))
  if (gaps.length) throw new PublishError(`Finance & Legal: ${gaps[0].message}`)
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
    // Review demo file: sample bookings set up by the demo itself.
    if (import.meta.env.VITE_SINGLE) return { list: (globalThis as { __demoBookings?: Reservation[] }).__demoBookings ?? [], offline: false }
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

/* ---------------- guest reviews ---------------- */

/** Reviews guests posted on the customer site for one property, newest first. */
export async function listReviews(slug: string): Promise<GuestReview[]> {
  if (!slug) return []
  if (isDemoMode || !supabase) {
    if (import.meta.env.VITE_SINGLE) return ((globalThis as { __demoReviews?: GuestReview[] }).__demoReviews ?? []).filter((r) => r.hotel_slug === slug)
    return []
  }
  const { data, error } = await supabase.from('reviews').select('*').eq('hotel_slug', slug).order('created_at', { ascending: false })
  if (error) throw new Error('Couldn’t load reviews.')
  return (data ?? []) as GuestReview[]
}

/** Owner replies to reviews. [LIVE] move to a `review_replies` table so guests see them on the property page. */
const REPLIES = 'inndesk.review.replies'
export type ReviewReply = { text: string; at: string }
export const getReplies = (): Record<string, ReviewReply> => {
  try {
    return JSON.parse(localStorage.getItem(REPLIES) || '{}')
  } catch {
    return {}
  }
}
export const setReply = (id: string, reply: ReviewReply | null) => {
  const all = getReplies()
  if (reply) all[id] = reply
  else delete all[id]
  try {
    localStorage.setItem(REPLIES, JSON.stringify(all))
  } catch {
    /* storage unavailable */
  }
  changed()
}

/* ---------------- chargeback disputes ---------------- */

/** Chargebacks on a property's prepaid bookings. [LIVE] needs a `disputes` table fed by the payment gateway. */
export function listDisputes(slug: string): Dispute[] {
  if (!slug) return []
  const all = import.meta.env.VITE_SINGLE ? ((globalThis as { __demoDisputes?: Dispute[] }).__demoDisputes ?? []) : []
  const answers = getDisputeAnswers()
  return all.filter((d) => d.hotel_slug === slug).map((d) => (answers[d.id] && d.status === 'open' ? { ...d, status: 'responded' as const } : d))
}
const ANSWERS = 'inndesk.dispute.answers'
export type DisputeAnswer = { text: string; evidence: string[]; at: string }
export const getDisputeAnswers = (): Record<string, DisputeAnswer> => {
  try {
    return JSON.parse(localStorage.getItem(ANSWERS) || '{}')
  } catch {
    return {}
  }
}
export const answerDispute = (id: string, a: DisputeAnswer) => {
  const all = getDisputeAnswers()
  all[id] = a
  try {
    localStorage.setItem(ANSWERS, JSON.stringify(all))
  } catch {
    /* storage unavailable */
  }
  changed()
}

/* ---------------- GSTIN / PAN / bank verification ---------------- */

const VERIFY_EVT = 'inndesk-verify'
const verifyKey = (id: string) => `inndesk.verify.${id}`

/** Latest check results for a listing. Live: partner_verifications (written only by the server). */
export async function listVerifications(listingId: string): Promise<Verification[]> {
  if (!site.autoVerify && !site.docVerify) return []
  if (isDemoMode || !supabase) {
    try {
      return JSON.parse(localStorage.getItem(verifyKey(listingId)) ?? '[]') as Verification[]
    } catch {
      return []
    }
  }
  const { data, error } = await supabase.from('partner_verifications').select('kind, status, message, notes, details, checked_at').eq('listing_id', listingId)
  if (error) throw new Error('Couldn’t load verification results.')
  return (data ?? []) as Verification[]
}

/** Words that show up in the names of real property documents (demo mode only looks at the file name). */
const DEMO_DOC_WORDS = /bill|electric|bses|bescom|tata ?power|deed|registry|agreement|lease|rent|tax|mutation|allot|property|ownership|noc/i

/** Demo mode: plausible results without calling anyone (account numbers ending 0000 fail). */
function demoCheck(l: Listing, k: VerifyKind, account = ''): Verification {
  const v = demoResult(l, k, account)
  return { ...v, details: { ...v.details, _sig: checkSig(l, k) } }
}
function demoResult(l: Listing, k: VerifyKind, account = ''): Verification {
  const g = l.legal
  const at = new Date().toISOString()
  const name = (g.payoutName || g.legalName).toUpperCase()
  if (k === 'ownership') {
    if (!DEMO_DOC_WORDS.test(g.ownershipDoc ?? ''))
      return { kind: k, status: 'failed', message: 'This doesn’t look like a property document.', notes: ['Upload an electricity bill, property tax receipt, sale deed or rent agreement for this property.', 'Demo mode only looks at the file name. The live check reads the document itself.'], details: { 'File': g.ownershipDoc ?? '' }, checked_at: at }
    return { kind: k, status: 'verified', message: 'Property document accepted.', notes: ['Demo mode only looks at the file name. The live check reads the document itself.'], details: { 'File': g.ownershipDoc ?? '', 'Document type': 'Property document' }, checked_at: at }
  }
  if (k === 'pan') return { kind: k, status: 'verified', message: 'PAN is valid and the name matches.', notes: [], details: { 'Name on PAN records': g.legalName.toUpperCase(), 'PAN status': 'Existing and Valid', 'Name match': '100%' }, checked_at: at }
  if (k === 'bank') {
    if (account.endsWith('0000')) return { kind: k, status: 'failed', message: 'This account number doesn’t exist at that bank.', notes: [], details: { 'Account ending': account.slice(-4) }, checked_at: at }
    return { kind: k, status: 'verified', message: 'Bank account confirmed in your name.', notes: [], details: { 'Name at bank': name, Bank: g.bankName.toUpperCase(), 'Name match': '100%', 'Account ending': account.slice(-4) }, checked_at: at }
  }
  const stateOk = !l.location.state || l.location.state === gstState(g.gstin)
  return {
    kind: k,
    status: stateOk ? 'verified' : 'review',
    message: stateOk ? 'GSTIN is active and matches your details.' : 'GSTIN is active, but some details need a look.',
    notes: stateOk ? [] : [`This GSTIN is registered in ${gstState(g.gstin)}, but the property is in ${l.location.state}. A hotel needs a GSTIN for the state it is in.`],
    details: { 'Legal name on GST': g.legalName.toUpperCase(), 'GST status': 'Active', 'Name match': '100%' },
    checked_at: at,
  }
}

/** File types accepted for the ownership / lease proof, recognised from the file's first bytes (not its name). */
async function docKind(file: File): Promise<'application/pdf' | 'image/jpeg' | 'image/png' | null> {
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  return null
}
const imageSize = (file: File) =>
  new Promise<{ w: number; h: number }>((ok) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      ok({ w: img.naturalWidth, h: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      ok({ w: 0, h: 0 })
      URL.revokeObjectURL(url)
    }
    img.src = url
  })

/**
 * Checks the file, then keeps the ownership / lease proof in the private partner-docs bucket (live mode).
 * Returns the fields to save on the listing. The document itself is checked by verifyPartner(['ownership']).
 */
export async function uploadOwnershipDoc(l: Listing, file: File): Promise<{ ownershipDoc: string; ownershipDocPath?: string }> {
  const type = await docKind(file)
  if (!type) throw new Error(/\.(heic|heif)$/i.test(file.name) ? 'HEIC photos can’t be read here. Take a screenshot of it or save it as JPG, then upload that.' : 'Upload a PDF, JPG or PNG file.')
  if (file.size > site.maxDocMb * 1024 * 1024) throw new Error(`The file is larger than ${site.maxDocMb} MB. Upload a smaller copy.`)
  if (type !== 'application/pdf' && file.size > 5 * 1024 * 1024) throw new Error('Photos can be up to 5 MB. Upload a smaller photo or a PDF scan.')
  if (file.size < 15 * 1024) throw new Error('This file is too small to be a readable document. Upload a clear scan or photo of the whole page.')
  if (type !== 'application/pdf') {
    const { w, h } = await imageSize(file)
    if (Math.min(w, h) < 500) throw new Error('This image is too small to read. Upload a clear photo or scan of the whole page (at least 500 pixels on each side).')
  }
  if (isDemoMode || !supabase) return { ownershipDoc: file.name }
  const ext = type === 'application/pdf' ? 'pdf' : type === 'image/png' ? 'png' : 'jpg'
  const path = `${l.ownerId}/${l.id}/ownership-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('partner-docs').upload(path, file, { contentType: type, upsert: false })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return { ownershipDoc: file.name, ownershipDocPath: path }
}

/**
 * Checks the GSTIN, PAN, bank account and/or ownership document on a saved listing. The full account number is sent to
 * the server once for the ₹1 penny drop and stored there encrypted, never in the listing.
 */
export async function verifyPartner(l: Listing, kinds: VerifyKind[], bankAccount?: string, documentPath?: string): Promise<Verification[]> {
  let results: Verification[]
  if (isDemoMode || !supabase) {
    await new Promise((r) => setTimeout(r, 700))
    results = kinds.filter((k) => k !== 'gstin' || l.legal.gstin).map((k) => demoCheck(l, k, bankAccount))
    const kept = (await listVerifications(l.id)).filter((v) => !kinds.includes(v.kind))
    localStorage.setItem(verifyKey(l.id), JSON.stringify([...kept, ...results]))
  } else {
    const { data, error } = await supabase.functions.invoke('verify-partner', { body: { listing_id: l.id, kinds, bank_account: bankAccount, document_path: documentPath ?? l.legal.ownershipDocPath } })
    if (error) {
      const msg = await (error as { context?: Response }).context?.json?.().then((b: { error?: string }) => b.error).catch(() => '')
      throw new Error(msg || 'Couldn’t run the checks. Please try again in a few minutes.')
    }
    results = ((data as { results?: Verification[] } | null)?.results ?? []).map((v) => ({ ...v, checked_at: v.checked_at ?? new Date().toISOString() }))
  }
  window.dispatchEvent(new Event(VERIFY_EVT))
  return results
}

/** Verification results for a listing, refreshed after every check. */
export function useVerifications(listingId: string) {
  const r = useData(() => listVerifications(listingId), [listingId])
  const { reload } = r
  useEffect(() => {
    window.addEventListener(VERIFY_EVT, reload)
    return () => window.removeEventListener(VERIFY_EVT, reload)
  }, [reload])
  return r
}
