/** 'Partner' = an independent hotel listed by its owner through the InnDesk partner panel. */
export type Brand = 'Lite' | 'StayEasy' | 'Prime' | 'Partner'

export type AmenityKey =
  | 'wifi'
  | 'ac'
  | 'tv'
  | 'pool'
  | 'breakfast'
  | 'parking'
  | 'lift'
  | 'security'
  | 'roomService'
  | 'powerBackup'
  | 'restaurant'
  | 'hotWater'
  | 'gym'

export interface Room {
  id: string
  name: string
  size: string
  features: string[]
  /** Selling price per night, in rupees. */
  price: number
  /** Price before the instant discount, per night. */
  mrp: number
  maxGuests: number
  hue: number
  /** Optional real photo of this room type. */
  photo?: string
  /** Rooms of this type the hotel sells (partner hotels). Missing = no limit is checked. */
  count?: number
  /** Owner's date-wise changes (yyyy-mm-dd → price / rooms open / closed), from InnDesk. */
  calendar?: Record<string, { price?: number; open?: number; closed?: boolean }>
  /** Set for display when the room can't be booked for the searched dates. */
  unavailable?: string
}

export interface Hotel {
  slug: string
  name: string
  brand: Brand
  city: string
  area: string
  address: string
  distance: string
  lat: number
  lng: number
  rating: number
  reviews: number
  tags: string[]
  highlights: string[]
  description: string
  amenities: AmenityKey[]
  rooms: Room[]
  nearby: { name: string; distance: string }[]
  scores: { label: string; value: number }[]
  payAtHotel: boolean
  freeBreakfast: boolean
  coupleFriendly: boolean
  /** Hue (0–360) for the placeholder artwork until real photos are added. */
  hue: number
  /** Optional real photo URLs; the first is the cover. */
  photos?: string[]
  /** Caption for each photo, same order as photos (partner listings tag their photos). */
  photoTags?: string[]
  /** Set for partner listings: who runs the hotel and its house rules. */
  partner?: {
    propertyType: string
    stars?: number
    checkIn: string
    checkOut: string
    cancellation: string
    /** Free cancellation ends this many hours before check-in; -1 = non-refundable. */
    cancelHours?: number
    rules: string[]
  }
}

export interface SearchParams {
  city: string
  checkIn: string // yyyy-mm-dd
  checkOut: string // yyyy-mm-dd
  rooms: number
  adults: number
  children: number
}

export interface Booking {
  id: string
  user_id?: string
  hotel_slug: string
  hotel_name: string
  hotel_city: string
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
  coupon?: string | null
  points_used: number
  room_total: number
  discount_total: number
  tax: number
  amount: number
  /** Paid add-ons such as early check-in or meals (already included in amount). */
  extras?: { label: string; amount: number }[]
  /** 'pending' = waiting for online payment. */
  status: 'confirmed' | 'cancelled' | 'pending'
  created_at: string
  /** Online payment details (Razorpay), when paid online. */
  paid_at?: string | null
  payment_id?: string | null
  refund_amount?: number | null
  refund_status?: string | null
  cancelled_at?: string | null
}
