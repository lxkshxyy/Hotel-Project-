import type { CancellationId, PhotoTag } from '../data/options'

export type ListingStatus = 'draft' | 'live' | 'paused'

export interface BedLine {
  type: string
  count: number
}

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
  /** Room Details section. */
  roomType?: string
  view?: string
  sizeUnit?: 'sqft' | 'sqm'
  size?: number
  description?: string
  bedrooms?: number
  livingRooms?: number
  /** Sleeping Arrangement: beds in each bedroom and each living room. */
  beds?: { bedrooms: BedLine[][]; living: BedLine[][] }
  extraBed?: boolean | null
  extraBedMax?: number
  occupancy?: { baseAdults: number; maxAdults: number; baseChildren: number; maxChildren: number; maxOccupancy: number }
  /** Bathroom Details section: each bathroom's type and the room it is attached to. */
  baths?: { type: string; attached: string }[]
  /** Kept in step with baths for older code: how many, and whether any is shared. */
  bathrooms?: number
  bathroomType?: 'Private' | 'Shared'
  /** Meal Plan, Rates & Inventory section. price above is the base rate for base adults. */
  mealPlan?: string
  extraAdultCharge?: number
  childCharge?: number
  /** Dates this room type is on sale (YYYY-MM-DD). */
  saleFrom?: string
  saleTo?: string
  /** Unticked "Active" on Rooms & Rateplans: hidden from guests. */
  inactive?: boolean
  /** Extra rate plans besides the base one (meal plan + price above). */
  ratePlans?: RatePlan[]
}

export interface RatePlan {
  id: string
  name: string
  mealPlan: string
  /** Price per night before GST, for the base adults. */
  price: number
  active: boolean
}

export interface Restaurant {
  id: string
  name: string
  cuisines: string[]
  meals: string[]
  food: 'veg' | 'nonveg' | 'both'
  open: string
  close: string
  seating?: number
  /** Open to outside guests, not only people staying. */
  outsideGuests: boolean
  alaCarte: boolean
  buffet: boolean
}

export interface Inclusion {
  id: string
  kind: string
  detail: string
  /** Room type ids; empty = every room. */
  roomIds: string[]
  from: string
  to?: string
  active: boolean
  createdAt: string
}

export type EntryValue = string | string[] | number | boolean | { open: string; close: string; off: string[] } | { depth: string; shallow: boolean }
export interface AmenityEntry {
  id: string
  values: Record<string, EntryValue>
  /** Ids of photos in listing.photos. */
  photoIds: string[]
}

export interface ListingPhoto {
  id: string
  url: string
  tag: PhotoTag
  /** Wider than tall. Missing on photos added before this was recorded. */
  landscape?: boolean
  /** What the photo shows: room:<roomId>, area:Bedroom, prop:Exterior, am:<amenityId>… */
  labels?: string[]
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
    /** Hotel-type, home-type ('homestay') or unique-type, chosen when the listing is started. */
    category?: 'hotel' | 'homestay' | 'unique'
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
    /** Name shown to guests, if different from the registered name. */
    displayName?: string
    chain?: string
    floors?: number
    restaurantsCount?: number
    /** Comma-separated lists from Property Contact Details. */
    phoneList?: string
    websiteList?: string
    emailList?: string
    /** Customer care number shown to guests (Consumer Protection (E-commerce) Rules, 2020). */
    customerCare?: string
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
    /** How to Reach: can a vehicle reach the entrance, and which ones. */
    access?: { toEntrance?: 'yes' | 'no'; dropOffMetres?: number; vehicles?: 'all' | 'selected'; types?: string[] }
    /** Step-by-step directions and landmarks for guests (100–1200 characters). */
    directions?: string
  }
  /** Ids of the amenities the owner ticked. */
  amenities: string[]
  /** Answers to the dropdowns under a ticked amenity: amenity id → question id → choice(s). */
  amenityDetails?: Record<string, Record<string, string | string[]>>
  /** Entries added with "+ Add …" (parking, pool, kitchen…): amenity id → entries. */
  amenityEntries?: Record<string, AmenityEntry[]>
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
    /** Property Rules answers by rule id (see data/policyRules.ts). */
    house?: Record<string, string | string[]>
    /** 24-hour free-cancellation grace window on non-refundable bookings made 7+ days before check-in. */
    grace?: boolean
    /** Short notices shown to guests before they book (e.g. "Pool closed for repairs till 30 Nov"). */
    notices?: { id: string; text: string; from: string; to?: string }[]
    /** Children up to this age count as infants (free, no bed). */
    infantAge?: number
    /** Guests above this age are charged as adults. */
    childMaxAge?: number
    /** Free changes allowed after booking: dates / guest name. */
    allowDateChange?: boolean
    allowNameChange?: boolean
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
    /** Consent to the ₹1 bank account verification. */
    bankConsent?: boolean
    msme?: boolean | null
    udyam?: string
    hasGstin?: boolean | null
    agreed: boolean
  }
  restaurants?: Restaurant[]
  inclusions?: Inclusion[]
  /** Channel manager connection from Settings. */
  channel?: { token: string; status: 'active' | 'inactive'; createdBy: string; createdAt: string }
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
  /** The promotion or coupon the guest booked with, if any. */
  promo_id?: string
  tax: number
  amount: number
  status: 'confirmed' | 'cancelled'
  created_at: string
}

/** A guest review from the customer site's `reviews` table (rating 1–5). */
export interface GuestReview {
  id: string
  hotel_slug: string
  name: string
  rating: number
  traveller: 'Couple' | 'Solo' | 'Business' | 'Family' | 'Group'
  room?: string | null
  stay_month: string
  title: string
  text: string
  topics: string[]
  verified: boolean
  created_at: string
}
