import { gstRate } from '../config/site'
import { hotels } from './hotels'
import type { Hotel, Room } from './types'

/*
 * StayEasy for Business — corporate panel settings and SAMPLE company data.
 * "Northwind Logistics", its GSTIN, staff and limits are placeholders so the panel
 * works end to end. Replace them with real company accounts before launch.
 */

export type Role = 'admin' | 'employee'

export interface Employee {
  id: string
  name: string
  email: string
  team: string
  /** Admins can verify the company, change policy, add people and approve travel requests. */
  role?: Role
}

export interface Company {
  id: string
  name: string
  legalName: string
  gstin: string
  billingAddress: string
  /** Nightly room limit in metro cities, in rupees (per room, before GST). */
  limitMetro: number
  /** Nightly room limit in all other cities. */
  limitOther: number
  creditLimit: number
  /** Credit already used before the bookings made in this app. */
  creditUsedOpening: number
  walletBalance: number
  /** Hotels with a rate negotiated only for this company, and the extra discount on the corporate rate. */
  negotiated: Record<string, number>
  costCentres: string[]
  employees: Employee[]
  /** True once a GSTIN, Udyam ID or NGO Darpan ID has been checked. */
  verified: boolean
  verifiedVia?: { type: 'GSTIN' | 'UDYAM' | 'NGO'; value: string; note: string; at: string }
  /** Bookings allowed before the company is verified. */
  unverifiedBookingLimit: number
  /** Travel requests raised by employees need an admin's OK before booking. */
  requestApproval: boolean
}

export const demoCompany: Company = {
  id: 'northwind',
  name: 'Northwind Logistics',
  legalName: 'Northwind Logistics Pvt Ltd',
  gstin: '',
  verified: false,
  unverifiedBookingLimit: 2,
  requestApproval: true,
  billingAddress: '[Company address], New Delhi 110037',
  limitMetro: 4000,
  limitOther: 3000,
  creditLimit: 500000,
  creditUsedOpening: 146000,
  walletBalance: 48000,
  negotiated: {
    'prime-aerocity-delhi': 0.1,
    'prime-bkc-mumbai': 0.08,
    'lite-paharganj-delhi': 0.1,
    'hitec-suites-hyderabad': 0.06,
  },
  costCentres: ['OPS-DEL · Operations', 'SAL-MUM · Sales', 'FIN-DEL · Finance', 'TEC-BLR · Technology'],
  employees: [
    { id: 'riya', name: 'Riya Sharma', email: 'riya.sharma@northwind.example', team: 'Operations', role: 'admin' },
    { id: 'karan', name: 'Karan Verma', email: 'karan.verma@northwind.example', team: 'Operations' },
    { id: 'neha', name: 'Neha Gupta', email: 'neha.gupta@northwind.example', team: 'Sales' },
    { id: 'vikram', name: 'Vikram Rao', email: 'vikram.rao@northwind.example', team: 'Sales' },
    { id: 'anita', name: 'Anita Rao', email: 'anita.rao@northwind.example', team: 'Finance' },
    { id: 'arjun', name: 'Arjun Mehta', email: 'arjun.mehta@northwind.example', team: 'Technology' },
    { id: 'sana', name: 'Sana Khan', email: 'sana.khan@northwind.example', team: 'Technology' },
  ],
}

/** Corporate pricing rules (shown on every hotel for all companies). */
export const bizRules = {
  /** Corporate discount on the public price, for every company. */
  corporateOff: 0.12,
  /** Extra discount from `teamFrom` rooms in one booking. */
  teamOff: 0.05,
  teamFrom: 5,
  /** From this many rooms the hotel sends a group quote instead. */
  quoteFrom: 10,
  maxRooms: 20,
  freeCancelText: 'Free cancellation till 6 pm a day before check-in.',
}

export const metroCities = ['New Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Kolkata', 'Pune']
export const isMetro = (city: string) => metroCities.includes(city)
export const cityLimit = (c: Company, city: string) => (isMetro(city) ? c.limitMetro : c.limitOther)

export type Slab = 'base' | 'team' | 'quote'
export const slabFor = (rooms: number): Slab => (rooms >= bizRules.quoteFrom ? 'quote' : rooms >= bizRules.teamFrom ? 'team' : 'base')

const round = (n: number) => Math.round(n)

/** All the rate plans for one room type, per room per night. */
export function ratePlans(c: Company, hotel: Hotel, room: Room) {
  const pub = room.price
  const corporate = round(pub * (1 - bizRules.corporateOff))
  const negOff = c.negotiated[hotel.slug] ?? 0
  const company = negOff ? round(corporate * (1 - negOff)) : corporate
  const team = round(company * (1 - bizRules.teamOff))
  return { pub, corporate, company, team, negotiated: negOff > 0 }
}

/** Price per room per night for a booking of `rooms` rooms. */
export function bizRate(c: Company, hotel: Hotel, room: Room, rooms: number) {
  const p = ratePlans(c, hotel, room)
  return slabFor(rooms) === 'team' ? p.team : p.company
}

/** Simulated free rooms per room type on the chosen dates (until live inventory is connected). */
export function roomsFree(hotel: Hotel, roomIndex: number) {
  let h = 0
  for (const ch of hotel.slug) h = (h * 31 + ch.charCodeAt(0)) % 997
  const base = hotel.brand === 'Prime' ? 6 : hotel.brand === 'StayEasy' ? 5 : 4
  return Math.max(1, base + ((h + roomIndex * 7) % 6) - roomIndex * 2)
}
export const hotelRoomsFree = (hotel: Hotel) => hotel.rooms.reduce((s, _r, i) => s + roomsFree(hotel, i), 0)

/** Cheapest room type, priced for a business booking. */
export function bizCheapest(c: Company, hotel: Hotel, rooms: number) {
  const room = hotel.rooms.reduce((a, b) => (b.price < a.price ? b : a))
  const plans = ratePlans(c, hotel, room)
  const rate = bizRate(c, hotel, room, rooms)
  return { room, plans, rate }
}

export interface BizCategory {
  id: string
  title: string
  description: string
  photo: string
  slugs: string[]
}

/* The business catalog replaces leisure categories like beaches and couple stays. */
export const bizCategories: BizCategory[] = [
  {
    id: 'district',
    title: 'Business district hotels',
    description: 'Walk to offices in Aerocity, BKC, HITEC City, Whitefield and Indiranagar.',
    photo: '/hotels/prime-oasis-blue/exterior-3.webp',
    slugs: ['prime-aerocity-delhi', 'prime-bkc-mumbai', 'hitec-suites-hyderabad', 'lite-whitefield-bengaluru', 'prime-indiranagar-bengaluru', 'garden-view-bengaluru'],
  },
  {
    id: 'airport',
    title: 'Airport hotels',
    description: 'Close to the airport, early check-in and late checkout on request.',
    photo: '/hotels/prime-oasis-blue/lobby-3.webp',
    slugs: ['prime-aerocity-delhi', 'lite-station-inn-mumbai'],
  },
  {
    id: 'long',
    title: 'Long stays · 7+ nights',
    description: 'Weekly rates, laundry and a work desk for project work.',
    photo: '/hotels/csfc/room-4.webp',
    slugs: ['lite-whitefield-bengaluru', 'hitec-suites-hyderabad', 'garden-view-bengaluru', 'lotus-residency-delhi', 'koregaon-park-pune', 'park-street-kolkata'],
  },
  {
    id: 'team',
    title: 'Team and group stays',
    description: 'Hotels with 5 or more free rooms on your dates and team slab pricing.',
    photo: '/hotels/red-vibe/lobby-1.webp',
    slugs: [],
  },
  {
    id: 'meetings',
    title: 'Meetings and offsites',
    description: 'Rooms plus a meeting or banquet hall, projector and working lunch.',
    photo: '/hotels/red-vibe/banquet-1.webp',
    slugs: ['prime-aerocity-delhi', 'prime-bkc-mumbai', 'prime-banjara-hyderabad', 'hitec-suites-hyderabad', 'prime-sunset-bay-goa', 'prime-palm-court-goa'],
  },
  {
    id: 'sites',
    title: 'Near plants and sites',
    description: 'Simple stays near stations, industrial areas and project sites.',
    photo: '/hotels/csfc/exterior-1.webp',
    slugs: ['lite-paharganj-delhi', 'lite-station-inn-mumbai', 'lite-sindhi-camp-jaipur', 'koregaon-park-pune', 'lite-whitefield-bengaluru'],
  },
]

export function inCategory(cat: string, hotel: Hotel) {
  if (cat === 'team') return hotelRoomsFree(hotel) >= bizRules.teamFrom
  return bizCategories.find((c) => c.id === cat)?.slugs.includes(hotel.slug) ?? false
}
export const categoryHotels = (cat: string) => hotels.filter((h) => inCategory(cat, h))

/** Work amenities shown and filtered on the business results page. */
export const workAmenities: { id: string; label: string; test: (h: Hotel) => boolean }[] = [
  { id: 'desk', label: 'Work desk in room', test: (h) => h.rooms.some((r) => r.features.includes('Work desk')) || h.tags.includes('Work friendly') || h.brand === 'Prime' },
  { id: 'wifi', label: 'Free Wi-Fi', test: (h) => h.amenities.includes('wifi') },
  { id: 'meeting', label: 'Meeting or banquet hall', test: (h) => inCategory('meetings', h) },
  { id: 'breakfast', label: 'Breakfast included', test: (h) => h.amenities.includes('breakfast') },
  { id: 'gym', label: 'Gym', test: (h) => h.amenities.includes('gym') },
  { id: 'airport', label: 'Near airport', test: (h) => h.tags.includes('Near airport') || inCategory('airport', h) },
]

export const bookingForOptions = ['My team', 'Myself', 'A colleague', 'Guest of the company'] as const
export type BookingFor = (typeof bookingForOptions)[number]

export const payMethods = [
  { id: 'credit', title: 'Company credit', note: 'Billed on the monthly statement' },
  { id: 'wallet', title: 'Company wallet', note: 'Paid from the prepaid wallet' },
  { id: 'card', title: 'My own card', note: 'Claim it back later' },
] as const
export type PayMethod = (typeof payMethods)[number]['id']

export const tripPurposes = ['Client visit', 'Training', 'Internal meeting', 'Project work', 'Team offsite']

export interface BizRoomLine {
  roomId: string
  roomName: string
  traveller: string
  rate: number
  overLimit: boolean
}

export interface BizBooking {
  id: string
  /** Sample trips shown to the demo company; they don't count towards limits or milestones. */
  sample?: boolean
  companyId: string
  bookedBy: string
  hotelSlug: string
  hotelName: string
  hotelCity: string
  checkIn: string
  checkOut: string
  nights: number
  lines: BizRoomLine[]
  purpose: string
  costCentre: string
  po: string
  pay: PayMethod
  subtotal: number
  teamDiscount: number
  gst: number
  total: number
  publicTotal: number
  status: 'confirmed' | 'cancelled'
  createdAt: string
}

/** Price a business booking from the chosen room counts. */
export function priceBizBooking(c: Company, hotel: Hotel, qty: Record<string, number>, nights: number) {
  const count = Object.values(qty).reduce((s, n) => s + n, 0)
  const slab = slabFor(count)
  const limit = cityLimit(c, hotel.city)
  let subtotal = 0
  let teamDiscount = 0
  let gst = 0
  let publicTotal = 0
  let overRooms = 0
  const lines = hotel.rooms
    .filter((r) => (qty[r.id] ?? 0) > 0)
    .map((r) => {
      const n = qty[r.id]
      const p = ratePlans(c, hotel, r)
      const rate = slab === 'team' ? p.team : p.company
      subtotal += p.company * n * nights
      teamDiscount += (p.company - rate) * n * nights
      gst += Math.round(rate * gstRate(rate)) * n * nights
      publicTotal += p.pub * n * nights
      if (rate > limit) overRooms += n
      return { room: r, qty: n, rate, company: p.company, amount: p.company * n * nights }
    })
  const net = subtotal - teamDiscount
  return { count, slab, limit, lines, subtotal, teamDiscount, gst, total: net + gst, publicTotal, saved: publicTotal - net, overRooms }
}

export function bizBookingId() {
  const chars = '23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  let s = ''
  for (const b of bytes) s += chars[b % chars.length]
  return `SEB-${s}`
}

/** A brand-new company created by a business user. Starts unverified with no negotiated rates. */
export function newCompany(name: string, owner: Employee): Company {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'company'
  return {
    id: `${id}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    legalName: name.trim(),
    gstin: '',
    billingAddress: '',
    limitMetro: 4000,
    limitOther: 3000,
    creditLimit: 200000,
    creditUsedOpening: 0,
    walletBalance: 0,
    negotiated: {},
    costCentres: ['GEN · General'],
    employees: [{ ...owner, role: 'admin' }],
    verified: false,
    unverifiedBookingLimit: 2,
    requestApproval: true,
  }
}

/*
 * Company wallet milestones — wallet credit added once each, as the company's booked room-nights add up.
 * PLACEHOLDER amounts: confirm with the client before launch.
 */
export const walletMilestones = [
  { nights: 1, credit: 100, label: 'First booking' },
  { nights: 5, credit: 150, label: '5 room-nights' },
  { nights: 10, credit: 250, label: '10 room-nights' },
  { nights: 25, credit: 500, label: '25 room-nights' },
  { nights: 50, credit: 1000, label: '50 room-nights' },
]

export interface TravelRequest {
  id: string
  companyId: string
  raisedBy: string
  raisedByEmail: string
  traveller: string
  city: string
  checkIn: string
  checkOut: string
  rooms: number
  purpose: string
  budget: number
  notes: string
  status: 'pending' | 'approved' | 'rejected' | 'booked'
  decidedBy?: string
  comment?: string
  createdAt: string
  decidedAt?: string
  sample?: boolean
}

/** Stays we highlight for solo women travellers: 24/7 security and highly rated. */
export const womenFriendly = (h: Hotel) => h.amenities.includes('security') && h.rating >= 4.3
