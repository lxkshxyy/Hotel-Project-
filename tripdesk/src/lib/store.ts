import { useCallback, useEffect, useState } from 'react'
import { hotels as bundledHotels } from '@stayeasy/data/hotels'
import type { Hotel } from '@stayeasy/data/types'
import { agentQuote, markupFor } from '@stayeasy/lib/agentRates'
import { bookedNights } from '@stayeasy/lib/booked'
import { bookingId } from '@stayeasy/lib/format'
import { availability, cancelTerms } from '@stayeasy/lib/quote'
import { onLocalMachine, site } from '../config/site'
import { isDemoMode, supabase } from './supabase'
import type { Agency, AgentBooking, Customer, LedgerEntry, Quote, Staff } from './types'

/*
 * Where TripDesk keeps its data.
 * Demo mode (no Supabase keys): everything is kept in this browser, and bookings for partner
 * hotels are also sent to StayEasy's local channel so the hotel owner sees them in InnDesk.
 * Live mode: the shared Supabase database (agents, agent_members, agent_ledger, agent_customers,
 * agent_quotes, bookings with source = 'agent'). Money moves only in server functions.
 */

const EVT = 'tripdesk-data'
export const changed = () => window.dispatchEvent(new Event(EVT))
const uid = () => Math.random().toString(36).slice(2, 10)

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* storage full or blocked */
  }
}
const k = (agencyId: string, what: string) => `tripdesk.${agencyId}.${what}`

export class AgentError extends Error {}

async function invoke<T>(name: string, body: object): Promise<T> {
  const { data, error } = await supabase!.functions.invoke(name, { body: body as Record<string, unknown> })
  if (error) {
    let msg = error.message
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx) msg = ((await ctx.json()) as { error?: string }).error || msg
    } catch {
      /* keep the generic message */
    }
    throw new AgentError(msg)
  }
  return data as T
}

/* ---------------- hotels ---------------- */

// Hotel photos are paths like /hotels/…; TripDesk serves the same photo folder as StayEasy.
let hotelCache: Promise<Hotel[]> | null = null
export function getHotels(): Promise<Hotel[]> {
  hotelCache ??= (async () => {
    if (isDemoMode || !supabase) {
      // Partner hotels listed through InnDesk, when StayEasy is running on this computer.
      let partners: Hotel[] = []
      if (onLocalMachine) {
        try {
          const r = await fetch(`${site.mainSiteUrl}/__partner/listings`)
          if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) partners = ((await r.json()) as { hotel: Hotel }[]).map((x) => x.hotel).filter((h) => h?.rooms?.length)
        } catch {
          /* StayEasy not running: bundled hotels only */
        }
      }
      return [...bundledHotels, ...partners]
    }
    const [{ data, error }, ratings] = await Promise.all([supabase.from('hotels').select('data').eq('published', true), supabase.from('hotel_ratings').select('hotel_slug, avg, n')])
    if (error) throw new Error(`Couldn’t load hotels: ${error.message}`)
    // Live: ratings only from real guest reviews, as on StayEasy.
    const r = new Map((ratings.data ?? []).map((x) => [x.hotel_slug as string, x]))
    return (data ?? []).map((row) => {
      const h = row.data as Hotel
      const x = r.get(h.slug)
      return { ...h, rating: x ? Number(x.avg) : 0, reviews: x ? Number(x.n) : 0 }
    })
  })()
  return hotelCache
}
export const getHotel = async (slug: string) => (await getHotels()).find((h) => h.slug === slug) ?? null

/* ---------------- agency ---------------- */

const AGENCIES = 'tripdesk.agencies'
const MEMBERS = 'tripdesk.members' // email → agency id (staff logins)

export async function findAgencyFor(userId: string, email: string): Promise<{ agency: Agency; role: Staff['role'] } | null> {
  if (isDemoMode || !supabase) {
    const all = read<Record<string, Agency>>(AGENCIES, {})
    if (all[userId]) return { agency: all[userId], role: 'Admin' }
    const link = read<Record<string, { agencyId: string; role: Staff['role'] }>>(MEMBERS, {})[email.toLowerCase()]
    return link && all[link.agencyId] ? { agency: all[link.agencyId], role: link.role } : null
  }
  const { data } = await supabase.from('agent_members').select('role, agents(*)').eq('user_id', userId).maybeSingle()
  if (!data?.agents) {
    // First sign-in of invited staff: link the invitation to this login.
    const { data: linked } = await supabase.rpc('accept_agent_invite')
    if (!linked) return null
    return findAgencyFor(userId, email)
  }
  return { agency: fromRow(data.agents as unknown as Record<string, unknown>), role: data.role as Staff['role'] }
}

const fromRow = (r: Record<string, unknown>): Agency => ({ ...(r.data as Agency), id: r.id as string, status: r.status as Agency['status'], creditLimit: Number(r.credit_limit ?? 0) })

export async function registerAgency(a: Agency) {
  if (isDemoMode || !supabase) {
    // Demo: approved straight away so the whole flow can be tried. Live: the StayEasy team approves.
    const all = read<Record<string, Agency>>(AGENCIES, {})
    write(AGENCIES, { ...all, [a.id]: { ...a, status: 'approved', creditLimit: 0 } })
    write(k(a.id, 'ledger'), [{ id: uid(), at: new Date().toISOString(), type: 'adjust', amount: 25000, note: 'Demo opening balance' }] satisfies LedgerEntry[])
    changed()
    return
  }
  const { error } = await supabase.rpc('register_agency', { profile: a })
  if (error) throw new AgentError(error.message)
  changed()
}

export async function saveAgency(a: Agency) {
  if (isDemoMode || !supabase) {
    const all = read<Record<string, Agency>>(AGENCIES, {})
    write(AGENCIES, { ...all, [a.id]: a })
  } else {
    const { error } = await supabase.rpc('update_agency', { profile: a })
    if (error) throw new AgentError(error.message)
  }
  changed()
}

/* ---------------- staff ---------------- */

export async function listStaff(a: Agency): Promise<Staff[]> {
  if (isDemoMode || !supabase) return read<Staff[]>(k(a.id, 'staff'), [])
  const { data } = await supabase.from('agent_members').select('email, name, role, created_at').eq('agent_id', a.id).order('created_at')
  return (data ?? []).map((r) => ({ email: r.email, name: r.name, role: r.role, addedAt: r.created_at }))
}

export async function addStaff(a: Agency, s: Omit<Staff, 'addedAt'>) {
  if (isDemoMode || !supabase) {
    const list = read<Staff[]>(k(a.id, 'staff'), [])
    if (list.some((x) => x.email === s.email)) throw new AgentError('That email is already on your team.')
    write(k(a.id, 'staff'), [...list, { ...s, addedAt: new Date().toISOString() }])
    const links = read<Record<string, unknown>>(MEMBERS, {})
    write(MEMBERS, { ...links, [s.email]: { agencyId: a.id, role: s.role } })
  } else {
    const { error } = await supabase.rpc('invite_agent_member', { member_email: s.email, member_name: s.name, member_role: s.role })
    if (error) throw new AgentError(error.message)
  }
  changed()
}

export async function removeStaff(a: Agency, email: string) {
  if (isDemoMode || !supabase) {
    write(
      k(a.id, 'staff'),
      read<Staff[]>(k(a.id, 'staff'), []).filter((x) => x.email !== email),
    )
    const links = read<Record<string, unknown>>(MEMBERS, {})
    delete links[email]
    write(MEMBERS, links)
  } else {
    const { error } = await supabase.rpc('remove_agent_member', { member_email: email })
    if (error) throw new AgentError(error.message)
  }
  changed()
}

/* ---------------- wallet ---------------- */

export async function getLedger(a: Agency): Promise<LedgerEntry[]> {
  if (isDemoMode || !supabase) return read<LedgerEntry[]>(k(a.id, 'ledger'), []).sort((x, y) => y.at.localeCompare(x.at))
  const { data } = await supabase.from('agent_ledger').select('*').eq('agent_id', a.id).order('created_at', { ascending: false })
  return (data ?? []).map((r) => ({ id: String(r.id), at: r.created_at, type: r.type, amount: r.amount, note: r.note, bookingId: r.booking_id ?? undefined }))
}
export const balanceOf = (l: LedgerEntry[]) => l.reduce((s, e) => s + e.amount, 0)

/** Demo top-up (instant). Live top-ups go through Razorpay in the wallet page. */
export async function demoTopup(a: Agency, amount: number) {
  const l = read<LedgerEntry[]>(k(a.id, 'ledger'), [])
  write(k(a.id, 'ledger'), [...l, { id: uid(), at: new Date().toISOString(), type: 'topup', amount, note: 'Wallet top-up (demo)' }])
  changed()
}

export async function startTopup(amount: number) {
  return invoke<{ key_id: string; order_id: string; amount: number; currency: string }>('agent-wallet-topup', { amount })
}
export async function finishTopup(p: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  await invoke('agent-wallet-verify', p)
  changed()
}

/* ---------------- customers ---------------- */

export async function listCustomers(a: Agency): Promise<Customer[]> {
  if (isDemoMode || !supabase) return read<Customer[]>(k(a.id, 'customers'), []).sort((x, y) => x.name.localeCompare(y.name))
  const { data } = await supabase.from('agent_customers').select('*').eq('agent_id', a.id).order('name')
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email ?? '', city: r.city ?? '', notes: r.notes ?? '', createdAt: r.created_at }))
}

export async function saveCustomer(a: Agency, c: Omit<Customer, 'id' | 'createdAt'> & { id?: string }): Promise<Customer> {
  if (isDemoMode || !supabase) {
    const list = read<Customer[]>(k(a.id, 'customers'), [])
    const existing = list.find((x) => x.id === c.id || (x.phone && x.phone === c.phone))
    const row: Customer = { ...c, id: existing?.id ?? uid(), createdAt: existing?.createdAt ?? new Date().toISOString() }
    write(k(a.id, 'customers'), existing ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row])
    changed()
    return row
  }
  const { data, error } = await supabase
    .from('agent_customers')
    .upsert({ id: c.id, agent_id: a.id, name: c.name, phone: c.phone, email: c.email || null, city: c.city || null, notes: c.notes || null }, { onConflict: 'agent_id,phone' })
    .select()
    .single()
  if (error) throw new AgentError(error.message)
  changed()
  return { id: data.id, name: data.name, phone: data.phone, email: data.email ?? '', city: data.city ?? '', notes: data.notes ?? '', createdAt: data.created_at }
}

/* ---------------- quotes ---------------- */

export async function listQuotes(a: Agency): Promise<Quote[]> {
  if (isDemoMode || !supabase) return read<Quote[]>(k(a.id, 'quotes'), []).sort((x, y) => y.createdAt.localeCompare(x.createdAt))
  const { data } = await supabase.from('agent_quotes').select('*').eq('agent_id', a.id).order('created_at', { ascending: false })
  return (data ?? []).map((r) => ({ ...(r.data as Quote), id: r.id, createdAt: r.created_at }))
}

export async function saveQuote(a: Agency, q: Quote) {
  if (isDemoMode || !supabase) {
    const list = read<Quote[]>(k(a.id, 'quotes'), [])
    write(k(a.id, 'quotes'), list.some((x) => x.id === q.id) ? list.map((x) => (x.id === q.id ? q : x)) : [q, ...list])
  } else {
    const { error } = await supabase.from('agent_quotes').upsert({ id: q.id, agent_id: a.id, data: q })
    if (error) throw new AgentError(error.message)
  }
  changed()
}

export async function deleteQuote(a: Agency, id: string) {
  if (isDemoMode || !supabase)
    write(
      k(a.id, 'quotes'),
      read<Quote[]>(k(a.id, 'quotes'), []).filter((x) => x.id !== id),
    )
  else await supabase.from('agent_quotes').delete().eq('id', id)
  changed()
}

/* ---------------- bookings ---------------- */

export interface AgentBookingRequest {
  hotel_slug: string
  room_id: string
  check_in: string
  check_out: string
  rooms: number
  adults: number
  children: number
  guest_name: string
  guest_phone: string
  guest_email: string
  special_requests?: string
  customer_id: string | null
  /** Markup for this booking (agents can change it per booking). */
  markup: { type: 'pct' | 'flat'; value: number }
  /** The net amount the agent saw. The server stops the booking if it has changed. */
  expected_net: number
}

export async function listBookings(a: Agency): Promise<AgentBooking[]> {
  if (isDemoMode || !supabase) return read<AgentBooking[]>(k(a.id, 'bookings'), []).sort((x, y) => y.created_at.localeCompare(x.created_at))
  const { data } = await supabase.from('bookings').select('*').eq('agent_id', a.id).order('created_at', { ascending: false })
  return (data ?? []) as AgentBooking[]
}

export async function createBooking(a: Agency, bookedBy: string, req: AgentBookingRequest): Promise<AgentBooking> {
  if (!(isDemoMode || !supabase)) {
    const r = await invoke<{ booking: AgentBooking }>('agent-create-booking', req)
    changed()
    return r.booking
  }
  // Demo: same checks the server makes.
  if (a.status !== 'approved') throw new AgentError('Your agency is waiting for approval. You can make quotes, but not bookings yet.')
  const hotel = await getHotel(req.hotel_slug)
  if (!hotel) throw new AgentError('This hotel is no longer available.')
  const q = agentQuote({ hotel, roomId: req.room_id, checkIn: req.check_in, checkOut: req.check_out, rooms: req.rooms, adults: req.adults, children: req.children, markup: req.markup })
  if (q.errors.length) throw new AgentError(q.errors[0])
  const all = read<AgentBooking[]>(k(a.id, 'bookings'), [])
  const av = availability(q.room, req.check_in, req.check_out, q.rooms, bookedNights(all.filter((b) => b.hotel_slug === hotel.slug && b.room_name === q.room.name)))
  if (!av.ok) throw new AgentError(av.message)
  if (q.netTotal !== req.expected_net) throw new AgentError(`The net rate changed to ₹${q.netTotal.toLocaleString('en-IN')}. Please review and book again.`)
  const ledger = read<LedgerEntry[]>(k(a.id, 'ledger'), [])
  const balance = balanceOf(ledger)
  if (balance + a.creditLimit < q.netTotal) throw new AgentError(`Not enough in your wallet. You need ₹${(q.netTotal - balance).toLocaleString('en-IN')} more.`)
  const b: AgentBooking = {
    id: bookingId().replace('SE-', 'TD-'),
    agent_id: a.id,
    booked_by: bookedBy,
    customer_id: req.customer_id,
    hotel_slug: hotel.slug,
    hotel_name: hotel.name,
    hotel_city: `${hotel.area}, ${hotel.city}`,
    room_id: q.room.id,
    room_name: q.room.name,
    check_in: req.check_in,
    check_out: req.check_out,
    nights: q.nights,
    rooms: q.rooms,
    guests: q.guests,
    guest_name: req.guest_name,
    guest_phone: req.guest_phone,
    guest_email: req.guest_email,
    special_requests: req.special_requests,
    pay_mode: 'agent',
    net_amount: q.netTotal,
    markup_amount: q.markupAmount,
    selling_amount: q.sellingTotal,
    tax: q.netTax,
    amount: q.netTotal,
    room_total: q.netRoom,
    discount_total: 0,
    points_used: 0,
    status: 'confirmed',
    created_at: new Date().toISOString(),
  }
  write(k(a.id, 'bookings'), [b, ...all])
  write(k(a.id, 'ledger'), [...ledger, { id: uid(), at: b.created_at, type: 'booking', amount: -q.netTotal, note: `${hotel.name}, ${b.id}`, bookingId: b.id }])
  reportToHotel(b)
  changed()
  return b
}

export async function cancelBooking(a: Agency, b: AgentBooking): Promise<AgentBooking> {
  if (!(isDemoMode || !supabase)) {
    const r = await invoke<{ booking: AgentBooking }>('agent-cancel-booking', { booking_id: b.id })
    changed()
    return r.booking
  }
  const t = cancelTerms({ ...b, pay_mode: 'now', paid_at: b.created_at }, await getHotel(b.hotel_slug))
  if (!t.allowed) throw new AgentError(`${t.reason} Contact your account manager.`)
  const updated: AgentBooking = { ...b, status: 'cancelled', cancelled_at: new Date().toISOString(), refund_amount: b.net_amount }
  write(
    k(a.id, 'bookings'),
    read<AgentBooking[]>(k(a.id, 'bookings'), []).map((x) => (x.id === b.id ? updated : x)),
  )
  const ledger = read<LedgerEntry[]>(k(a.id, 'ledger'), [])
  write(k(a.id, 'ledger'), [...ledger, { id: uid(), at: updated.cancelled_at!, type: 'refund', amount: b.net_amount, note: `Cancelled ${b.id}`, bookingId: b.id }])
  reportToHotel(updated)
  changed()
  return updated
}

/** Demo mode: let a partner hotel's owner see the booking in InnDesk (via StayEasy on this computer). */
function reportToHotel(b: AgentBooking) {
  if (!onLocalMachine) return
  fetch(`${site.mainSiteUrl}/__partner/bookings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...b, guest_name: `${b.guest_name} (via agent)` }) }).catch(() => {})
}

/* ---------------- rates helper ---------------- */

export const markupForHotel = (a: Agency, h: Hotel) => markupFor(h.city, a.markup, a.cityMarkup)

/* ---------------- hook ---------------- */

export function useData<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])
  useEffect(() => {
    let live = true
    load()
      .then((d) => live && (setData(d), setError('')))
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Couldn’t load.'))
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
