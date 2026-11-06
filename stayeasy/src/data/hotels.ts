import type { Brand, Hotel } from './types'

/*
 * No sample hotels: the site shows only real hotels listed through InnDesk (the `hotels` table in
 * Supabase on the live site). Any city or state without a listed hotel shows "Coming soon".
 */
export const hotels: Hotel[] = []

export const cities = [
  { name: 'New Delhi', hue: 218, image: '/destinations/new-delhi.webp' },
  { name: 'Mumbai', hue: 28, image: '/destinations/mumbai.webp' },
  { name: 'Bengaluru', hue: 130, image: '/destinations/bengaluru.webp' },
  { name: 'Goa', hue: 196, image: '/destinations/goa.webp' },
  { name: 'Jaipur', hue: 350, image: '/destinations/jaipur.webp' },
  { name: 'Hyderabad', hue: 262, image: '/destinations/hyderabad.webp' },
  { name: 'Pune', hue: 98, image: '/destinations/pune.webp' },
  { name: 'Kolkata', hue: 0, image: '/destinations/kolkata.webp' },
]

export const brands = [
  { name: 'TRPOTELS Lite', brand: 'Lite' as Brand, tag: 'Budget', photo: '/photos/modern-exterior.webp', tagClass: 'text-leaf-700', description: 'The essentials for short, smart trips.', points: ['Compact, spotless rooms', 'Free Wi-Fi and AC', 'Near stations and airports'], hue: 32 },
  { name: 'TRPOTELS', brand: 'StayEasy' as Brand, tag: 'Best value', photo: '/photos/heritage-palace.webp', tagClass: 'text-ember-600', description: 'Comfortable rooms for work and holidays.', points: ['Free breakfast', 'Top-rated locations', '30-minute fix promise'], hue: 218 },
  { name: 'TRPOTELS Prime', brand: 'Prime' as Brand, tag: 'Premium', photo: '/photos/skyline-pool.webp', tagClass: 'text-navy-800', description: 'Bigger rooms, richer interiors, extra care.', points: ['Spacious premium rooms', 'Restaurant or room dining', 'Priority support'], hue: 196 },
]


export const offers = [
  { tag: 'First stay', title: 'Flat ₹200 off your first booking', description: 'For new members on app and web.', code: 'FIRSTSTAY' },
  { tag: 'Long stay', title: '10% off on 5+ nights', description: 'Great for work trips and relocations.', code: 'LONGSTAY' },
  { tag: 'Pay now', title: 'Extra 5% off when you pay online', description: 'UPI, cards, net banking or wallets.', code: 'PAYNOW' },
]

export const minPrice = (h: Hotel) => Math.min(...h.rooms.map((r) => r.price))
export const cheapestRoom = (h: Hotel) => h.rooms.reduce((a, b) => (b.price < a.price ? b : a))
// 'StayEasy' is the internal code for the core brand tier; guests see the TRPOTELS name.
/** Short tag for hotel cards: Lite / TRPOTELS / Prime / Partner. */
export const brandShort = (b: Brand) => (b === 'StayEasy' ? 'TRPOTELS' : b)
export const brandLabel = (b: Brand) => (b === 'StayEasy' ? 'TRPOTELS' : b === 'Partner' ? 'Partner Hotel' : `TRPOTELS ${b}`)
