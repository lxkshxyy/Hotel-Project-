import type { Markup } from '@stayeasy/lib/agentRates'

export type { Markup }

export interface Agency {
  id: string
  name: string
  ownerName: string
  phone: string
  email: string
  city: string
  address: string
  pan: string
  gstin: string
  /** Names of uploaded KYC documents (files go to storage on the live site). */
  docs: string[]
  /** Accounts are checked by the StayEasy team before they can book. */
  status: 'pending' | 'approved' | 'rejected'
  markup: Markup
  cityMarkup: Record<string, Markup>
  /** Show the selling price on the customer voucher. */
  showPriceOnVoucher: boolean
  /** Credit StayEasy allows beyond the wallet balance (₹). */
  creditLimit: number
  createdAt: string
}

export interface Staff {
  email: string
  name: string
  role: 'Admin' | 'Agent'
  addedAt: string
}

export interface LedgerEntry {
  id: string
  at: string
  type: 'topup' | 'booking' | 'refund' | 'adjust'
  /** Positive adds to the wallet, negative takes from it. */
  amount: number
  note: string
  bookingId?: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  city: string
  notes: string
  createdAt: string
}

export interface QuoteItem {
  hotelSlug: string
  hotelName: string
  city: string
  area: string
  photo?: string
  roomId: string
  roomName: string
  checkIn: string
  checkOut: string
  rooms: number
  adults: number
  children: number
  netTotal: number
  sellingTotal: number
  freeCancel: string
}

export interface Quote {
  id: string
  customerName: string
  customerPhone: string
  note: string
  items: QuoteItem[]
  createdAt: string
}

/** A StayEasy booking made by an agency (same fields StayEasy stores, plus the agent's money). */
export interface AgentBooking {
  id: string
  agent_id: string
  booked_by: string
  customer_id: string | null
  hotel_slug: string
  hotel_name: string
  hotel_city: string
  room_id: string
  room_name: string
  check_in: string
  check_out: string
  nights: number
  rooms: number
  guests: number
  guest_name: string
  guest_phone: string
  guest_email: string
  special_requests?: string
  pay_mode: 'agent'
  net_amount: number
  markup_amount: number
  selling_amount: number
  tax: number
  /** = net_amount: what the agency paid StayEasy. */
  amount: number
  room_total: number
  discount_total: number
  points_used: number
  status: 'confirmed' | 'cancelled'
  refund_amount?: number | null
  created_at: string
  cancelled_at?: string | null
}
