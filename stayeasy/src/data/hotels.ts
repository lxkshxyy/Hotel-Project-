import { hotelPhotos, roomPhotos } from './hotelPhotos'
import type { AmenityKey, Brand, Hotel, Room } from './types'

/*
 * SAMPLE DATA. Names, prices, ratings and review counts below are placeholders
 * so the site works end to end. Replace them with the client's real inventory
 * (or load everything from the `hotels` table in Supabase — see supabase/seed.sql).
 */

const roomTemplates: Record<Exclude<Brand, 'Partner'>, Omit<Room, 'id' | 'price' | 'mrp' | 'hue'>[]> = {
  Lite: [
    { name: 'Smart Double', size: '130 sq ft · Double bed', features: ['AC', 'Wi-Fi', 'TV'], maxGuests: 2 },
    { name: 'Smart Twin', size: '140 sq ft · Two single beds', features: ['AC', 'Wi-Fi', 'Work desk'], maxGuests: 2 },
  ],
  StayEasy: [
    { name: 'Standard Room', size: '160 sq ft · Queen bed · City view', features: ['AC', 'Wi-Fi', 'TV'], maxGuests: 2 },
    { name: 'Deluxe Room', size: '200 sq ft · King bed', features: ['Free breakfast', 'AC', 'Mini fridge'], maxGuests: 3 },
    { name: 'Family Room', size: '280 sq ft · King + single', features: ['Free breakfast', 'Sofa', 'Kettle'], maxGuests: 4 },
  ],
  Prime: [
    { name: 'Standard Room', size: '180 sq ft · Queen bed · City view', features: ['AC', 'Wi-Fi', 'TV'], maxGuests: 2 },
    { name: 'Premium Room', size: '220 sq ft · King bed · Pool view', features: ['Free breakfast', 'AC', 'Mini fridge'], maxGuests: 3 },
    { name: 'Family Suite', size: '320 sq ft · King + single · Balcony', features: ['Free breakfast', 'Sofa bed', 'Bathtub'], maxGuests: 4 },
  ],
}

const roomStep: Record<Exclude<Brand, 'Partner'>, number[]> = {
  Lite: [0, 150],
  StayEasy: [0, 400, 1100],
  Prime: [-300, 0, 1100],
}

function rooms(slug: string, brand: Exclude<Brand, 'Partner'>, base: number, discount: number, hue: number): Room[] {
  return roomTemplates[brand].map((t, i) => {
    const price = base + roomStep[brand][i]
    const mrp = Math.round(price / (1 - discount) / 50) * 50
    return { ...t, id: `${slug}-${i + 1}`, price, mrp, hue: (hue + i * 24) % 360 }
  })
}

const standardScores = (r: number) => [
  { label: 'Cleanliness', value: Math.min(5, +(r + 0.1).toFixed(1)) },
  { label: 'Staff & service', value: r },
  { label: 'Location', value: Math.min(5, +(r + 0.2).toFixed(1)) },
  { label: 'Value for money', value: +(r - 0.2).toFixed(1) },
]

interface Seed {
  slug: string
  name: string
  brand: Exclude<Brand, 'Partner'>
  city: string
  area: string
  distance: string
  lat: number
  lng: number
  rating: number
  reviews: number
  base: number
  discount: number
  hue: number
  amenities: AmenityKey[]
  tags: string[]
  highlights: string[]
  nearby: [string, string][]
  payAtHotel?: boolean
  coupleFriendly?: boolean
}

const seeds: Seed[] = [
  // Goa
  { slug: 'prime-palm-court-goa', name: 'StayEasy Prime Palm Court', brand: 'Prime', city: 'Goa', area: 'Calangute', distance: '450 m from Calangute Beach', lat: 15.5439, lng: 73.7553, rating: 4.5, reviews: 820, base: 2199, discount: 0.35, hue: 196, amenities: ['wifi', 'ac', 'pool', 'breakfast', 'tv', 'parking', 'lift', 'security', 'roomService', 'powerBackup'], tags: ['Pool', 'Free breakfast', 'Couple friendly'], highlights: ['450 m to the beach', 'Outdoor pool', 'Free breakfast', 'Couple friendly', 'Rated 4.5 for cleanliness'], nearby: [['Calangute Beach', '450 m'], ['Baga Beach', '2.1 km'], ['Thivim Railway Station', '19 km'], ['Goa Airport (GOI)', '41 km']] },
  { slug: 'sea-breeze-goa', name: 'StayEasy Sea Breeze', brand: 'StayEasy', city: 'Goa', area: 'Baga', distance: '1.1 km from Baga Beach', lat: 15.5553, lng: 73.7517, rating: 4.3, reviews: 610, base: 1749, discount: 0.33, hue: 98, amenities: ['wifi', 'ac', 'breakfast', 'tv', 'parking', 'security', 'hotWater'], tags: ['Free breakfast', 'Parking', 'Pay at hotel'], highlights: ['Walk to Baga nightlife', 'Free breakfast', 'Free parking'], nearby: [['Baga Beach', '1.1 km'], ['Tito’s Lane', '1.3 km'], ['Goa Airport (GOI)', '42 km']] },
  { slug: 'lite-coco-inn-goa', name: 'StayEasy Lite Coco Inn', brand: 'Lite', city: 'Goa', area: 'Calangute', distance: '700 m from market', lat: 15.5402, lng: 73.7631, rating: 4.1, reviews: 430, base: 1199, discount: 0.29, hue: 32, amenities: ['wifi', 'ac', 'tv', 'security', 'hotWater'], tags: ['Wi-Fi', 'AC', 'Pay at hotel'], highlights: ['Budget pick in Calangute', 'Near the market', 'Pay at hotel'], nearby: [['Calangute Market', '700 m'], ['Calangute Beach', '1.2 km']] },
  { slug: 'casa-verde-goa', name: 'StayEasy Casa Verde', brand: 'StayEasy', city: 'Goa', area: 'Candolim', distance: '2 km from Candolim Beach', lat: 15.5180, lng: 73.7629, rating: 4.4, reviews: 390, base: 1999, discount: 0.31, hue: 150, amenities: ['wifi', 'ac', 'pool', 'restaurant', 'tv', 'parking', 'security'], tags: ['Pool', 'Restaurant', 'Couple friendly'], highlights: ['Garden pool', 'In-house restaurant', 'Quiet lane'], nearby: [['Candolim Beach', '2 km'], ['Fort Aguada', '4.5 km']] },
  { slug: 'prime-sunset-bay-goa', name: 'StayEasy Prime Sunset Bay', brand: 'Prime', city: 'Goa', area: 'Panaji', distance: '300 m from Miramar Beach', lat: 15.4826, lng: 73.8077, rating: 4.6, reviews: 275, base: 2899, discount: 0.31, hue: 262, amenities: ['wifi', 'ac', 'pool', 'breakfast', 'restaurant', 'gym', 'lift', 'parking', 'security', 'roomService'], tags: ['Sea view', 'Pool', 'Free breakfast'], highlights: ['Sea-view rooms', 'Rooftop pool', 'Gym'], nearby: [['Miramar Beach', '300 m'], ['Panaji Market', '3 km'], ['Goa Airport (GOI)', '26 km']] },

  // New Delhi
  { slug: 'lotus-residency-delhi', name: 'StayEasy Lotus Residency', brand: 'StayEasy', city: 'New Delhi', area: 'Karol Bagh', distance: '600 m from Karol Bagh Metro', lat: 28.6519, lng: 77.1909, rating: 4.3, reviews: 1240, base: 1649, discount: 0.34, hue: 218, amenities: ['wifi', 'ac', 'breakfast', 'tv', 'lift', 'security', 'powerBackup'], tags: ['Near metro', 'Free breakfast', 'Couple friendly'], highlights: ['Walk to the metro', 'Free breakfast', 'Shopping nearby'], nearby: [['Karol Bagh Metro', '600 m'], ['New Delhi Railway Station', '4 km'], ['IGI Airport (DEL)', '14 km']] },
  { slug: 'prime-aerocity-delhi', name: 'StayEasy Prime Aerocity', brand: 'Prime', city: 'New Delhi', area: 'Aerocity', distance: '3 km from IGI Airport', lat: 28.5507, lng: 77.1201, rating: 4.5, reviews: 690, base: 3199, discount: 0.3, hue: 240, amenities: ['wifi', 'ac', 'breakfast', 'restaurant', 'gym', 'lift', 'parking', 'security', 'roomService'], tags: ['Near airport', 'Free breakfast', 'Restaurant'], highlights: ['Airport shuttle', 'Restaurant', 'Business desk'], nearby: [['IGI Airport T3', '3 km'], ['Aerocity Metro', '800 m']] },
  { slug: 'lite-paharganj-delhi', name: 'StayEasy Lite Paharganj', brand: 'Lite', city: 'New Delhi', area: 'Paharganj', distance: '400 m from New Delhi Railway Station', lat: 28.6437, lng: 77.2135, rating: 4.0, reviews: 870, base: 999, discount: 0.3, hue: 20, amenities: ['wifi', 'ac', 'tv', 'security', 'hotWater'], tags: ['Near railway station', 'Pay at hotel'], highlights: ['Next to the station', 'Budget friendly', 'Pay at hotel'], nearby: [['New Delhi Railway Station', '400 m'], ['Connaught Place', '2 km']] },

  // Mumbai
  { slug: 'lite-station-inn-mumbai', name: 'StayEasy Lite Station Inn', brand: 'Lite', city: 'Mumbai', area: 'Andheri East', distance: '900 m from Andheri Station', lat: 19.1136, lng: 72.8697, rating: 4.1, reviews: 960, base: 1299, discount: 0.32, hue: 28, amenities: ['wifi', 'ac', 'tv', 'security', 'lift'], tags: ['Near railway station', 'Near airport', 'Pay at hotel'], highlights: ['Close to the airport', 'Near Andheri station'], nearby: [['Andheri Station', '900 m'], ['Mumbai Airport (BOM)', '3 km']] },
  { slug: 'bayview-mumbai', name: 'StayEasy Bayview', brand: 'StayEasy', city: 'Mumbai', area: 'Colaba', distance: '1 km from Gateway of India', lat: 18.9151, lng: 72.8258, rating: 4.4, reviews: 540, base: 2799, discount: 0.28, hue: 205, amenities: ['wifi', 'ac', 'breakfast', 'tv', 'lift', 'security', 'roomService'], tags: ['Free breakfast', 'Sightseeing', 'Couple friendly'], highlights: ['Walk to Gateway of India', 'Free breakfast'], nearby: [['Gateway of India', '1 km'], ['CSMT Station', '3 km']] },
  { slug: 'prime-bkc-mumbai', name: 'StayEasy Prime BKC', brand: 'Prime', city: 'Mumbai', area: 'Bandra Kurla Complex', distance: '500 m from BKC offices', lat: 19.0655, lng: 72.8682, rating: 4.6, reviews: 410, base: 4299, discount: 0.27, hue: 250, amenities: ['wifi', 'ac', 'breakfast', 'restaurant', 'gym', 'pool', 'lift', 'parking', 'security', 'roomService'], tags: ['Business', 'Pool', 'Gym'], highlights: ['Business district', 'Pool and gym', 'Priority support'], nearby: [['BKC', '500 m'], ['Bandra Station', '3.5 km']] },

  // Bengaluru
  { slug: 'garden-view-bengaluru', name: 'StayEasy Garden View', brand: 'StayEasy', city: 'Bengaluru', area: 'Koramangala', distance: '800 m from Forum Mall', lat: 12.9352, lng: 77.6245, rating: 4.4, reviews: 1050, base: 1899, discount: 0.32, hue: 130, amenities: ['wifi', 'ac', 'breakfast', 'tv', 'lift', 'security', 'powerBackup'], tags: ['Free breakfast', 'Couple friendly', 'Work friendly'], highlights: ['Cafés and pubs nearby', 'Fast Wi-Fi', 'Free breakfast'], nearby: [['Forum Mall', '800 m'], ['Kempegowda Airport (BLR)', '38 km']] },
  { slug: 'lite-whitefield-bengaluru', name: 'StayEasy Lite Whitefield', brand: 'Lite', city: 'Bengaluru', area: 'Whitefield', distance: '1.2 km from ITPL', lat: 12.9698, lng: 77.7500, rating: 4.1, reviews: 520, base: 1249, discount: 0.3, hue: 45, amenities: ['wifi', 'ac', 'tv', 'security', 'powerBackup'], tags: ['Work friendly', 'Pay at hotel'], highlights: ['Near tech parks', 'Work desk in every room'], nearby: [['ITPL', '1.2 km'], ['Whitefield Metro', '1.5 km']] },
  { slug: 'prime-indiranagar-bengaluru', name: 'StayEasy Prime Indiranagar', brand: 'Prime', city: 'Bengaluru', area: 'Indiranagar', distance: '300 m from 100 Feet Road', lat: 12.9719, lng: 77.6412, rating: 4.6, reviews: 360, base: 3299, discount: 0.29, hue: 270, amenities: ['wifi', 'ac', 'breakfast', 'restaurant', 'gym', 'lift', 'parking', 'security', 'roomService'], tags: ['Free breakfast', 'Restaurant', 'Couple friendly'], highlights: ['Heart of Indiranagar', 'Rooftop restaurant'], nearby: [['100 Feet Road', '300 m'], ['Indiranagar Metro', '700 m']] },

  // Jaipur
  { slug: 'pink-city-haveli-jaipur', name: 'StayEasy Pink City Haveli', brand: 'StayEasy', city: 'Jaipur', area: 'Old City', distance: '1 km from Hawa Mahal', lat: 26.9239, lng: 75.8267, rating: 4.5, reviews: 720, base: 1799, discount: 0.33, hue: 350, amenities: ['wifi', 'ac', 'breakfast', 'restaurant', 'tv', 'security'], tags: ['Heritage', 'Free breakfast', 'Rooftop'], highlights: ['Heritage haveli', 'Rooftop with fort views', 'Free breakfast'], nearby: [['Hawa Mahal', '1 km'], ['City Palace', '1.4 km'], ['Jaipur Junction', '4 km']] },
  { slug: 'lite-sindhi-camp-jaipur', name: 'StayEasy Lite Sindhi Camp', brand: 'Lite', city: 'Jaipur', area: 'Sindhi Camp', distance: '300 m from bus stand', lat: 26.9230, lng: 75.8005, rating: 4.0, reviews: 410, base: 999, discount: 0.3, hue: 12, amenities: ['wifi', 'ac', 'tv', 'security', 'hotWater'], tags: ['Near bus stand', 'Pay at hotel'], highlights: ['Next to the bus stand', 'Budget friendly'], nearby: [['Sindhi Camp Bus Stand', '300 m'], ['Jaipur Junction', '2 km']] },

  // Hyderabad
  { slug: 'hitec-suites-hyderabad', name: 'StayEasy HITEC Suites', brand: 'StayEasy', city: 'Hyderabad', area: 'Madhapur', distance: '1 km from HITEC City', lat: 17.4483, lng: 78.3915, rating: 4.3, reviews: 640, base: 1699, discount: 0.31, hue: 180, amenities: ['wifi', 'ac', 'breakfast', 'tv', 'lift', 'security', 'powerBackup'], tags: ['Work friendly', 'Free breakfast'], highlights: ['Near IT offices', 'Free breakfast'], nearby: [['HITEC City Metro', '1 km'], ['Inorbit Mall', '1.5 km']] },
  { slug: 'prime-banjara-hyderabad', name: 'StayEasy Prime Banjara', brand: 'Prime', city: 'Hyderabad', area: 'Banjara Hills', distance: '2 km from GVK One', lat: 17.4156, lng: 78.4347, rating: 4.5, reviews: 300, base: 2999, discount: 0.3, hue: 230, amenities: ['wifi', 'ac', 'breakfast', 'restaurant', 'gym', 'pool', 'lift', 'parking', 'security'], tags: ['Pool', 'Restaurant', 'Free breakfast'], highlights: ['Pool and gym', 'Fine-dining restaurant'], nearby: [['GVK One Mall', '2 km'], ['Hussain Sagar', '5 km']] },

  // Pune
  { slug: 'koregaon-park-pune', name: 'StayEasy Koregaon Park', brand: 'StayEasy', city: 'Pune', area: 'Koregaon Park', distance: '500 m from North Main Road', lat: 18.5362, lng: 73.8939, rating: 4.4, reviews: 480, base: 1849, discount: 0.3, hue: 110, amenities: ['wifi', 'ac', 'breakfast', 'tv', 'lift', 'security'], tags: ['Couple friendly', 'Free breakfast'], highlights: ['Leafy neighbourhood', 'Cafés nearby'], nearby: [['North Main Road', '500 m'], ['Pune Junction', '3 km'], ['Pune Airport (PNQ)', '7 km']] },

  // Kolkata
  { slug: 'park-street-kolkata', name: 'StayEasy Park Street', brand: 'StayEasy', city: 'Kolkata', area: 'Park Street', distance: '400 m from Park Street Metro', lat: 22.5530, lng: 88.3520, rating: 4.3, reviews: 560, base: 1599, discount: 0.31, hue: 0, amenities: ['wifi', 'ac', 'breakfast', 'tv', 'lift', 'security', 'powerBackup'], tags: ['Near metro', 'Free breakfast'], highlights: ['Heart of Park Street', 'Walk to the metro'], nearby: [['Park Street Metro', '400 m'], ['Victoria Memorial', '2 km'], ['Howrah Station', '6 km']] },
]

const policiesNote =
  'A short description of the property goes here: its style, nearby sights and who it suits. Replace with the hotel’s own copy.'

export const hotels: Hotel[] = seeds.map((s) => ({
  slug: s.slug,
  name: s.name,
  brand: s.brand,
  city: s.city,
  area: s.area,
  address: `[Street address], ${s.area}, ${s.city}`,
  distance: s.distance,
  lat: s.lat,
  lng: s.lng,
  rating: s.rating,
  reviews: s.reviews,
  tags: s.tags,
  highlights: s.highlights,
  description: policiesNote,
  amenities: s.amenities,
  rooms: rooms(s.slug, s.brand, s.base, s.discount, s.hue).map((r, j) => ({ ...r, photo: roomPhotos[s.slug]?.[j] })),
  nearby: s.nearby.map(([name, distance]) => ({ name, distance })),
  scores: standardScores(s.rating),
  payAtHotel: s.payAtHotel ?? true,
  freeBreakfast: s.amenities.includes('breakfast'),
  coupleFriendly: s.coupleFriendly ?? !s.tags.includes('Business'),
  hue: s.hue,
  photos: hotelPhotos[s.slug],
}))

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
  { name: 'StayEasy Lite', brand: 'Lite' as Brand, tag: 'Budget', photo: '/hotels/csfc/room-2.webp', tagClass: 'text-leaf-700', description: 'The essentials for short, smart trips.', points: ['Compact, spotless rooms', 'Free Wi-Fi and AC', 'Near stations and airports'], hue: 32 },
  { name: 'StayEasy', brand: 'StayEasy' as Brand, tag: 'Best value', photo: '/hotels/orange-oasis/room-2.webp', tagClass: 'text-ember-600', description: 'Comfortable rooms for work and holidays.', points: ['Free breakfast', 'Top-rated locations', '30-minute fix promise'], hue: 218 },
  { name: 'StayEasy Prime', brand: 'Prime' as Brand, tag: 'Premium', photo: '/hotels/prime-oasis-blue/room-1.webp', tagClass: 'text-navy-800', description: 'Bigger rooms, richer interiors, extra care.', points: ['Spacious premium rooms', 'Restaurant or room dining', 'Priority support'], hue: 196 },
]


export const offers = [
  { tag: 'First stay', title: 'Flat ₹200 off your first booking', description: 'For new members on app and web.', code: 'FIRSTSTAY' },
  { tag: 'Long stay', title: '10% off on 5+ nights', description: 'Great for work trips and relocations.', code: 'LONGSTAY' },
  { tag: 'Pay now', title: 'Extra 5% off when you pay online', description: 'UPI, cards, net banking or wallets.', code: 'PAYNOW' },
]

export const minPrice = (h: Hotel) => Math.min(...h.rooms.map((r) => r.price))
export const cheapestRoom = (h: Hotel) => h.rooms.reduce((a, b) => (b.price < a.price ? b : a))
export const brandLabel = (b: Brand) => (b === 'StayEasy' ? 'StayEasy' : b === 'Partner' ? 'Partner Hotel' : `StayEasy ${b}`)
