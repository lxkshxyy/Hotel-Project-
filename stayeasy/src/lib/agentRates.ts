/*
 * Travel-agent (TripDesk) rates. Agents buy at a NET rate below the public price and sell to their
 * customer at net + their own markup, keeping the markup as earnings (the myPartner model).
 * Used by the TripDesk website and by the agent booking function on the server.
 */
import { gstRate } from '../config/site'
import type { Hotel } from '../data/types'
import { nightlyPrices } from './quote'

/** [CONFIRM WITH CLIENT] Agent net rate = public room price minus this share. */
export const AGENT_DISCOUNT = 0.1

export interface Markup {
  /** 'pct' = percent of the net total, 'flat' = rupees per room per night. */
  type: 'pct' | 'flat'
  value: number
}

export const defaultMarkup: Markup = { type: 'pct', value: 8 }

/** Agent's markup for a hotel: a city rule wins over the default. */
export function markupFor(city: string, def: Markup, byCity: Record<string, Markup> = {}): Markup {
  return byCity[city] ?? def
}

export const netNight = (publicPrice: number) => Math.round(publicPrice * (1 - AGENT_DISCOUNT))

export interface AgentQuoteInput {
  hotel: Hotel
  roomId: string
  checkIn: string
  checkOut: string
  rooms: number
  adults: number
  children: number
  markup: Markup
}

export function agentQuote(q: AgentQuoteInput) {
  const room = q.hotel.rooms.find((r) => r.id === q.roomId)
  if (!room) throw new Error('That room type is no longer available.')
  const errors: string[] = []
  const rooms = Math.max(1, Math.min(8, Math.floor(q.rooms)))
  const guests = Math.max(1, q.adults + q.children)
  if (q.checkOut <= q.checkIn) errors.push('Check-out must be after check-in.')
  if (guests > room.maxGuests * rooms) errors.push(`${room.name} fits ${room.maxGuests} guests per room. Add a room.`)
  const publicNightly = nightlyPrices(room, q.checkIn, q.checkOut)
  const nightly = publicNightly.map(netNight)
  const nights = nightly.length
  const netRoom = nightly.reduce((s, p) => s + p, 0) * rooms
  // GST follows each night's tariff slab (5% up to ₹7,500, 18% above).
  const netTax = Math.round(nightly.reduce((s, p) => s + p * rooms * gstRate(p), 0))
  const netTotal = netRoom + netTax
  const markupAmount = Math.max(0, Math.round(q.markup.type === 'pct' ? (netTotal * q.markup.value) / 100 : q.markup.value * rooms * nights))
  const publicTotal = publicNightly.reduce((s, p) => s + p * rooms * (1 + gstRate(p)), 0)
  return {
    room,
    rooms,
    nights,
    guests,
    nightly,
    netRoom,
    netTax,
    netTotal,
    markupAmount,
    sellingTotal: netTotal + markupAmount,
    /** What a guest would pay on the public site (before any member or coupon discounts). */
    publicTotal: Math.round(publicTotal),
    errors,
  }
}

export type AgentQuote = ReturnType<typeof agentQuote>
