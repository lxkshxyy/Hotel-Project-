import { demoCompany, priceBizBooking, walletMilestones, type BizBooking, type Company, type TravelRequest } from '../data/business'
import { hotels } from '../data/hotels'
import { addDays, nightsBetween, todayISO } from './format'

/*
 * Business bookings. Kept in this browser for now (demo), like personal bookings in demo mode.
 * When the company tables are added to Supabase, swap these functions for database calls —
 * the pages only use the functions below.
 */

const KEY = 'stayeasy.demo.bizbookings'

function readAll(): BizBooking[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as BizBooking[]) : []
  } catch {
    return []
  }
}
function writeAll(list: BizBooking[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

/** Sample trips for the demo company only (upcoming, past and cancelled), so every tab has something to show. */
function sampleTrips(c: Company): BizBooking[] {
  const make = (id: string, slug: string, inDays: number, nights: number, qty: Record<number, number>, travellers: string[], purpose: string, cc: string, status: 'confirmed' | 'cancelled' = 'confirmed'): BizBooking => {
    const h = hotels.find((x) => x.slug === slug)!
    const q: Record<string, number> = {}
    Object.entries(qty).forEach(([i, n]) => (q[h.rooms[Number(i)].id] = n))
    const checkIn = addDays(todayISO(), inDays)
    const p = priceBizBooking(c, h, q, nights)
    let t = 0
    const lines = p.lines.flatMap((l) =>
      Array.from({ length: l.qty }, () => ({ roomId: l.room.id, roomName: l.room.name, traveller: travellers[t++] ?? 'Guest', rate: l.rate, overLimit: l.rate > p.limit })),
    )
    return {
      id,
      sample: true,
      companyId: c.id,
      bookedBy: 'Riya Sharma',
      hotelSlug: h.slug,
      hotelName: h.name,
      hotelCity: h.city,
      checkIn,
      checkOut: addDays(checkIn, nights),
      nights,
      lines,
      purpose,
      costCentre: cc,
      po: '',
      pay: 'credit',
      subtotal: p.subtotal,
      teamDiscount: p.teamDiscount,
      gst: p.gst,
      total: p.total,
      publicTotal: p.publicTotal,
      status,
      createdAt: new Date(Date.now() + Math.min(0, inDays) * 86_400_000).toISOString(),
    }
  }
  return [
    make('SEB-48213', 'prime-aerocity-delhi', 9, 2, { 0: 4, 1: 2 }, ['Riya Sharma', 'Karan Verma', 'Neha Gupta', 'Vikram Rao', 'Anita Rao', 'Arjun Mehta'], 'Client visit', c.costCentres[0]),
    make('SEB-52690', 'lite-whitefield-bengaluru', 23, 2, { 0: 1 }, ['Riya Sharma'], 'Project work', c.costCentres[3]),
    make('SEB-31877', 'hitec-suites-hyderabad', -18, 3, { 0: 2 }, ['Neha Gupta', 'Vikram Rao'], 'Training', c.costCentres[1]),
    make('SEB-29044', 'prime-bkc-mumbai', 12, 1, { 1: 1 }, ['Anita Rao'], 'Client visit', c.costCentres[2], 'cancelled'),
  ]
}

const SAMPLE_IDS = ['SEB-48213', 'SEB-52690', 'SEB-31877', 'SEB-29044']
export const isSample = (b: BizBooking) => !!b.sample || SAMPLE_IDS.includes(b.id)

export function listBizBookings(c: Company): BizBooking[] {
  let all = readAll()
  if (c.id === demoCompany.id) {
    const have = new Set(all.filter((b) => b.companyId === c.id).map((b) => b.id))
    const missing = sampleTrips(c).filter((b) => !have.has(b.id))
    if (missing.length) {
      all = [...all, ...missing]
      writeAll(all)
    }
  }
  return all.filter((b) => b.companyId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getBizBooking(c: Company, id: string) {
  return listBizBookings(c).find((b) => b.id === id) ?? null
}

export function saveBizBooking(b: BizBooking) {
  writeAll([b, ...readAll()])
}

export function cancelBizBooking(id: string) {
  writeAll(readAll().map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)))
}

/** Credit used = opening balance + confirmed bookings on company credit. */
export function creditUsed(c: Company, list: BizBooking[]) {
  return c.creditUsedOpening + list.filter((b) => b.status === 'confirmed' && b.pay === 'credit').reduce((s, b) => s + b.total, 0)
}
export function walletLeft(c: Company, list: BizBooking[]) {
  return walletStatement(c, list).balance
}

export const roomNights = (b: BizBooking) => b.lines.length * nightsBetween(b.checkIn, b.checkOut)

/** Bookings made by the company itself (not samples) — used for limits and milestones. */
export const realBookings = (list: BizBooking[]) => list.filter((b) => !isSample(b))

/** Bookings left before the company must verify (null = unlimited because verified). */
export function bookingsLeftUnverified(c: Company, list: BizBooking[]) {
  if (c.verified) return null
  return Math.max(0, c.unverifiedBookingLimit - realBookings(list).filter((b) => b.status === 'confirmed').length)
}

/* ---------- wallet ---------- */

export interface WalletLine {
  date: string
  label: string
  amount: number
}

/** Wallet statement: opening balance, milestone credits earned from room-nights, and wallet payments. */
export function walletStatement(c: Company, list: BizBooking[]) {
  const live = realBookings(list).filter((b) => b.status === 'confirmed')
  const nights = live.reduce((s, b) => s + roomNights(b), 0)
  const lines: WalletLine[] = []
  if (c.walletBalance) lines.push({ date: '', label: 'Opening balance', amount: c.walletBalance })
  const sorted = [...live].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  let run = 0
  const reached = new Set<number>()
  for (const b of sorted) {
    run += roomNights(b)
    for (const m of walletMilestones) if (run >= m.nights && !reached.has(m.nights)) {
      reached.add(m.nights)
      lines.push({ date: b.createdAt, label: `Milestone reward · ${m.label}`, amount: m.credit })
    }
    if (b.pay === 'wallet') lines.push({ date: b.createdAt, label: `Booking ${b.id} · ${b.hotelName}`, amount: -b.total })
  }
  const balance = lines.reduce((s, l) => s + l.amount, 0)
  const next = walletMilestones.find((m) => m.nights > nights) ?? null
  return { lines: lines.reverse(), balance, nights, next, earned: walletMilestones.filter((m) => reached.has(m.nights)) }
}

/* ---------- travel requests ---------- */

const REQ = 'stayeasy.demo.travelrequests'
const readReq = (): TravelRequest[] => {
  try {
    return JSON.parse(localStorage.getItem(REQ) || '[]') as TravelRequest[]
  } catch {
    return []
  }
}
const writeReq = (l: TravelRequest[]) => {
  try {
    localStorage.setItem(REQ, JSON.stringify(l))
  } catch {
    /* ignore */
  }
}

function sampleRequests(c: Company): TravelRequest[] {
  const at = (d: number) => addDays(todayISO(), d)
  return [
    { id: 'TR-1042', companyId: c.id, raisedBy: 'Karan Verma', raisedByEmail: 'karan.verma@northwind.example', traveller: 'Karan Verma', city: 'Mumbai', checkIn: at(6), checkOut: at(8), rooms: 1, purpose: 'Client visit', budget: 4000, notes: 'Near BKC, meeting at 10 am on day one.', status: 'pending', createdAt: new Date().toISOString(), sample: true },
    { id: 'TR-1039', companyId: c.id, raisedBy: 'Sana Khan', raisedByEmail: 'sana.khan@northwind.example', traveller: 'Sana Khan', city: 'Bengaluru', checkIn: at(14), checkOut: at(17), rooms: 1, purpose: 'Project work', budget: 3000, notes: 'Whitefield office for the release.', status: 'pending', createdAt: new Date(Date.now() - 86_400_000).toISOString(), sample: true },
  ]
}

export function listRequests(c: Company): TravelRequest[] {
  let all = readReq()
  if (c.id === demoCompany.id && !all.some((r) => r.companyId === c.id)) {
    all = [...sampleRequests(c), ...all]
    writeReq(all)
  }
  return all.filter((r) => r.companyId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function saveRequest(r: TravelRequest) {
  const all = readReq()
  writeReq(all.some((x) => x.id === r.id) ? all.map((x) => (x.id === r.id ? r : x)) : [r, ...all])
}

export const requestId = () => `TR-${Math.floor(1000 + Math.random() * 9000)}`

/* ---------- shortlist ---------- */

const SL = 'stayeasy.demo.shortlist'
type Shortlist = Record<string, { slug: string; at: string }[]>
const readSl = (): Shortlist => {
  try {
    return JSON.parse(localStorage.getItem(SL) || '{}') as Shortlist
  } catch {
    return {}
  }
}
const slKey = (c: Company, email: string) => `${c.id}|${email.toLowerCase()}`
export const getShortlist = (c: Company, email: string) => readSl()[slKey(c, email)] ?? []
export function toggleShortlist(c: Company, email: string, slug: string) {
  const all = readSl()
  const k = slKey(c, email)
  const cur = all[k] ?? []
  all[k] = cur.some((x) => x.slug === slug) ? cur.filter((x) => x.slug !== slug) : [{ slug, at: new Date().toISOString() }, ...cur]
  try {
    localStorage.setItem(SL, JSON.stringify(all))
  } catch {
    /* ignore */
  }
  return all[k]
}

/* ---------- last search ---------- */

const LAST = 'stayeasy.biz.lastsearch'
export interface LastSearch {
  city: string
  checkIn: string
  checkOut: string
  rooms: number
  adults: number
  bookingFor: string
}
export const getLastSearch = (): LastSearch | null => {
  try {
    return JSON.parse(localStorage.getItem(LAST) || 'null')
  } catch {
    return null
  }
}
export const saveLastSearch = (s: LastSearch) => {
  try {
    localStorage.setItem(LAST, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}
