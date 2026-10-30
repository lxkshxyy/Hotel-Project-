import type { CancellationId, PhotoTag } from '../data/options'

export type ListingStatus = 'draft' | 'live' | 'paused'

export interface ListingRoom {
  id: string
  name: string
  bed: string
  sizeSqft: number
  maxGuests: number
  /** How many rooms of this type the property has. */
  count: number
  /** Price per night, before GST. */
  price: number
  /** Optional "was" price, shown struck through when higher than the price. */
  mrp?: number
  breakfast: boolean
  amenities: string[]
  photoId?: string
}

export interface ListingPhoto {
  id: string
  url: string
  tag: PhotoTag
}

export interface CalendarCell {
  price?: number
  /** Rooms open to sell that night. */
  open?: number
  closed?: boolean
}

export interface Listing {
  id: string
  ownerId: string
  slug: string
  status: ListingStatus
  createdAt: string
  updatedAt: string
  publishedAt?: string
  /** Last time the listing reached StayEasy, or the reason it didn't. */
  sync?: { ok: boolean; at: string; message?: string }
  basics: {
    name: string
    propertyType: string
    stars: number
    description: string
    highlights: string[]
    phone: string
    email: string
    /** Hotel or Homestays & Villas, chosen when the listing is started. */
    category?: 'hotel' | 'homestay'
    /** True once the owner has picked a star rating (0 = not rated). */
    starsChosen?: boolean
    yearBuilt?: number
    bookingSince?: number
    /** null/undefined = not answered yet. */
    channelManager?: boolean | null
    channelManagerName?: string
    landline?: string
    /** The guest contact email / mobile the owner confirmed with an OTP. */
    emailVerified?: string
    phoneVerified?: string
    /** WhatsApp on the same mobile number (default) or a different one. */
    whatsappSame?: boolean
    whatsapp?: string
  }
  location: {
    city: string
    area: string
    address: string
    pincode: string
    state?: string
    country?: string
    /** Owner confirmed the address matches the registration or lease document. */
    addressConfirmed?: boolean
    lat?: number
    lng?: number
    landmarks: { name: string; distance: string }[]
  }
  /** Ids of the amenities the owner ticked. */
  amenities: string[]
  rooms: ListingRoom[]
  photos: ListingPhoto[]
  policies: {
    checkIn: string
    checkOut: string
    cancellation: CancellationId
    payAtHotel: boolean
    coupleFriendly: boolean
    localIds: boolean
    pets: boolean
    smoking: boolean
    childrenFreeAge: number
    extraBed: number
    rules: string[]
  }
  legal: {
    legalName: string
    gstin: string
    pan: string
    ownershipDoc?: string
    payoutName: string
    bankName: string
    ifsc: string
    accountLast4: string
    agreed: boolean
  }
  /** Room type id → date (yyyy-mm-dd) → price / rooms open / closed. */
  calendar: Record<string, Record<string, CalendarCell>>
}

export interface Owner {
  id: string
  email: string
  fullName: string
  phone: string
  businessName: string
  role: 'Owner' | 'Manager'
  gstin: string
  notify: { email: boolean; sms: boolean; whatsapp: boolean }
}

/** A StayEasy booking at one of the owner's properties (fields as StayEasy stores them). */
export interface Reservation {
  id: string
  hotel_slug: string
  hotel_name: string
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
  pay_mode: 'now' | 'hotel'
  room_total: number
  discount_total: number
  tax: number
  amount: number
  status: 'confirmed' | 'cancelled'
  created_at: string
}
