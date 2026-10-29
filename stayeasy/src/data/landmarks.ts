/*
 * Places shown on each hotel's map. Coordinates are approximate (good to a few hundred metres);
 * distances on the site are worked out from them as straight-line distances.
 * Add or correct places here; every hotel in the same city picks them up automatically.
 */

export type LandmarkKind = 'key' | 'attraction' | 'transport' | 'restaurant'

export interface Landmark {
  name: string
  note: string
  kind: LandmarkKind
  lat: number
  lng: number
}

export const landmarkKinds: { kind: LandmarkKind; label: string; color: string }[] = [
  { kind: 'key', label: 'Key landmarks', color: '#14306B' },
  { kind: 'attraction', label: 'Attractions', color: '#C2410C' },
  { kind: 'transport', label: 'Transport', color: '#15803D' },
  { kind: 'restaurant', label: 'Restaurants', color: '#B45309' },
]

export const landmarksByCity: Record<string, Landmark[]> = {
  Goa: [
    { name: 'Calangute Beach', note: 'Beach shacks and water sports', kind: 'key', lat: 15.544, lng: 73.7528 },
    { name: 'Baga Beach', note: 'Nightlife and cafés', kind: 'key', lat: 15.5559, lng: 73.7516 },
    { name: 'Candolim Beach', note: 'Quieter stretch of sand', kind: 'key', lat: 15.518, lng: 73.762 },
    { name: 'Miramar Beach', note: 'City beach in Panaji', kind: 'key', lat: 15.4827, lng: 73.8072 },
    { name: 'Fort Aguada', note: '17th-century Portuguese fort', kind: 'attraction', lat: 15.4925, lng: 73.7735 },
    { name: 'Fontainhas Latin Quarter', note: 'Colourful old Panaji', kind: 'attraction', lat: 15.497, lng: 73.831 },
    { name: 'Basilica of Bom Jesus', note: 'UNESCO World Heritage site', kind: 'attraction', lat: 15.5009, lng: 73.9116 },
    { name: 'Anjuna Flea Market', note: 'Wednesday market', kind: 'attraction', lat: 15.58, lng: 73.741 },
    { name: 'Dona Paula Viewpoint', note: 'Sea views at sunset', kind: 'attraction', lat: 15.456, lng: 73.804 },
    { name: 'Goa International Airport (Dabolim)', note: 'GOI', kind: 'transport', lat: 15.3808, lng: 73.8314 },
    { name: 'Manohar International Airport (Mopa)', note: 'GOX', kind: 'transport', lat: 15.73, lng: 73.865 },
    { name: 'Thivim Railway Station', note: 'Konkan Railway', kind: 'transport', lat: 15.6186, lng: 73.8711 },
    { name: 'Kadamba Bus Stand, Panaji', note: 'Interstate buses', kind: 'transport', lat: 15.497, lng: 73.833 },
    { name: 'Tito’s Lane, Baga', note: 'Clubs and bars', kind: 'restaurant', lat: 15.5555, lng: 73.7535 },
    { name: 'Souza Lobo, Calangute', note: 'Beachfront Goan seafood', kind: 'restaurant', lat: 15.5434, lng: 73.753 },
    { name: 'Britto’s, Baga', note: 'Seafood by the beach', kind: 'restaurant', lat: 15.557, lng: 73.7515 },
    { name: 'Ritz Classic, Panaji', note: 'Fish thali', kind: 'restaurant', lat: 15.496, lng: 73.828 },
  ],
  'New Delhi': [
    { name: 'Connaught Place', note: 'Shopping and dining hub', kind: 'key', lat: 28.6315, lng: 77.2167 },
    { name: 'India Gate', note: 'War memorial and lawns', kind: 'key', lat: 28.6129, lng: 77.2295 },
    { name: 'Karol Bagh Market', note: 'Street shopping', kind: 'key', lat: 28.6519, lng: 77.1907 },
    { name: 'Aerocity Hospitality District', note: 'Offices, hotels and dining', kind: 'key', lat: 28.552, lng: 77.1217 },
    { name: 'Red Fort', note: 'UNESCO World Heritage site', kind: 'attraction', lat: 28.6562, lng: 77.241 },
    { name: 'Humayun’s Tomb', note: 'Mughal garden tomb', kind: 'attraction', lat: 28.5933, lng: 77.2507 },
    { name: 'Qutub Minar', note: 'UNESCO World Heritage site', kind: 'attraction', lat: 28.5245, lng: 77.1855 },
    { name: 'Akshardham Temple', note: 'Temple complex', kind: 'attraction', lat: 28.6127, lng: 77.2773 },
    { name: 'Paharganj Main Bazaar', note: 'Budget market street', kind: 'attraction', lat: 28.644, lng: 77.212 },
    { name: 'IGI Airport Terminal 3', note: 'DEL', kind: 'transport', lat: 28.5562, lng: 77.0999 },
    { name: 'New Delhi Railway Station', note: 'NDLS', kind: 'transport', lat: 28.643, lng: 77.2194 },
    { name: 'Rajiv Chowk Metro', note: 'Blue and Yellow lines', kind: 'transport', lat: 28.6328, lng: 77.2197 },
    { name: 'Aerocity Metro', note: 'Airport Express line', kind: 'transport', lat: 28.5487, lng: 77.121 },
    { name: 'Karol Bagh Metro', note: 'Blue line', kind: 'transport', lat: 28.644, lng: 77.1886 },
    { name: 'Karim’s, Jama Masjid', note: 'Mughlai since 1913', kind: 'restaurant', lat: 28.6497, lng: 77.2335 },
    { name: 'Roshan di Kulfi, Karol Bagh', note: 'Street food classic', kind: 'restaurant', lat: 28.6517, lng: 77.1917 },
    { name: 'Worldmark Aerocity', note: 'Restaurants and cafés', kind: 'restaurant', lat: 28.5515, lng: 77.1225 },
  ],
  Mumbai: [
    { name: 'Gateway of India', note: 'Harbour-front monument', kind: 'key', lat: 18.922, lng: 72.8347 },
    { name: 'Marine Drive', note: 'Seafront promenade', kind: 'key', lat: 18.944, lng: 72.823 },
    { name: 'Bandra Kurla Complex', note: 'Business district', kind: 'key', lat: 19.065, lng: 72.868 },
    { name: 'Juhu Beach', note: 'Street food by the sea', kind: 'key', lat: 19.0988, lng: 72.8267 },
    { name: 'CSMVS Museum', note: 'Art and history museum', kind: 'attraction', lat: 18.9269, lng: 72.8326 },
    { name: 'Bandra–Worli Sea Link', note: 'Cable-stayed bridge', kind: 'attraction', lat: 19.038, lng: 72.815 },
    { name: 'Siddhivinayak Temple', note: 'Ganesh temple', kind: 'attraction', lat: 19.0169, lng: 72.8302 },
    { name: 'Chhatrapati Shivaji Maharaj Terminus', note: 'CSMT · UNESCO site', kind: 'transport', lat: 18.9398, lng: 72.8355 },
    { name: 'Mumbai Airport Terminal 2', note: 'BOM', kind: 'transport', lat: 19.099, lng: 72.874 },
    { name: 'Andheri Station', note: 'Western line and Metro', kind: 'transport', lat: 19.1197, lng: 72.8464 },
    { name: 'Bandra Station', note: 'Western line', kind: 'transport', lat: 19.0544, lng: 72.8406 },
    { name: 'Leopold Café, Colaba', note: 'Iconic café', kind: 'restaurant', lat: 18.9227, lng: 72.8317 },
    { name: 'Café Mondegar, Colaba', note: 'Retro café', kind: 'restaurant', lat: 18.9244, lng: 72.8316 },
    { name: 'Jio World Drive, BKC', note: 'Dining and cinema', kind: 'restaurant', lat: 19.065, lng: 72.865 },
  ],
  Bengaluru: [
    { name: 'MG Road', note: 'Shopping and pubs', kind: 'key', lat: 12.9757, lng: 77.605 },
    { name: 'Nexus Mall Koramangala', note: 'Formerly Forum Mall', kind: 'key', lat: 12.9346, lng: 77.6113 },
    { name: 'ITPL, Whitefield', note: 'Tech park', kind: 'key', lat: 12.9858, lng: 77.7362 },
    { name: '100 Feet Road, Indiranagar', note: 'Cafés and bars', kind: 'key', lat: 12.9719, lng: 77.6412 },
    { name: 'Cubbon Park', note: 'City park', kind: 'attraction', lat: 12.9763, lng: 77.5929 },
    { name: 'Lalbagh Botanical Garden', note: 'Glass house and gardens', kind: 'attraction', lat: 12.9507, lng: 77.5848 },
    { name: 'Bangalore Palace', note: 'Tudor-style palace', kind: 'attraction', lat: 12.9987, lng: 77.592 },
    { name: 'Kempegowda International Airport', note: 'BLR', kind: 'transport', lat: 13.1986, lng: 77.7066 },
    { name: 'KSR Bengaluru City Station', note: 'SBC', kind: 'transport', lat: 12.978, lng: 77.5695 },
    { name: 'Indiranagar Metro', note: 'Purple line', kind: 'transport', lat: 12.9784, lng: 77.6385 },
    { name: 'Whitefield (Kadugodi) Metro', note: 'Purple line', kind: 'transport', lat: 12.9958, lng: 77.758 },
    { name: 'Toit, Indiranagar', note: 'Brewpub', kind: 'restaurant', lat: 12.9791, lng: 77.6408 },
    { name: 'Vidyarthi Bhavan', note: 'Masala dosa since 1943', kind: 'restaurant', lat: 12.945, lng: 77.5717 },
    { name: 'Phoenix Marketcity, Whitefield', note: 'Food court and dining', kind: 'restaurant', lat: 12.9975, lng: 77.6963 },
  ],
  Jaipur: [
    { name: 'Hawa Mahal', note: 'Palace of Winds', kind: 'key', lat: 26.9239, lng: 75.8267 },
    { name: 'City Palace', note: 'Royal residence and museum', kind: 'key', lat: 26.9258, lng: 75.8237 },
    { name: 'Johari Bazaar', note: 'Jewellery and textiles', kind: 'key', lat: 26.9196, lng: 75.827 },
    { name: 'Amber Fort', note: 'Hill fort', kind: 'attraction', lat: 26.9855, lng: 75.8513 },
    { name: 'Jantar Mantar', note: 'UNESCO observatory', kind: 'attraction', lat: 26.9247, lng: 75.8246 },
    { name: 'Nahargarh Fort', note: 'Sunset views', kind: 'attraction', lat: 26.9373, lng: 75.8155 },
    { name: 'Albert Hall Museum', note: 'Museum in Ram Niwas Garden', kind: 'attraction', lat: 26.9116, lng: 75.8195 },
    { name: 'Jaipur Junction', note: 'JP', kind: 'transport', lat: 26.9196, lng: 75.7878 },
    { name: 'Sindhi Camp Bus Stand', note: 'Interstate buses', kind: 'transport', lat: 26.9227, lng: 75.8008 },
    { name: 'Jaipur International Airport', note: 'JAI', kind: 'transport', lat: 26.8242, lng: 75.8122 },
    { name: 'LMB, Johari Bazaar', note: 'Rajasthani sweets and thali', kind: 'restaurant', lat: 26.921, lng: 75.8268 },
  ],
  Hyderabad: [
    { name: 'HITEC City', note: 'IT district', kind: 'key', lat: 17.4474, lng: 78.3762 },
    { name: 'Inorbit Mall', note: 'Shopping and dining', kind: 'key', lat: 17.4344, lng: 78.3867 },
    { name: 'Hussain Sagar', note: 'Lake and Buddha statue', kind: 'key', lat: 17.4239, lng: 78.4738 },
    { name: 'Charminar', note: 'Old City landmark', kind: 'key', lat: 17.3616, lng: 78.4747 },
    { name: 'Golconda Fort', note: 'Hilltop fort', kind: 'attraction', lat: 17.3833, lng: 78.4011 },
    { name: 'Durgam Cheruvu Cable Bridge', note: 'Lit up at night', kind: 'attraction', lat: 17.429, lng: 78.39 },
    { name: 'GVK One Mall', note: 'Banjara Hills', kind: 'attraction', lat: 17.419, lng: 78.4487 },
    { name: 'Rajiv Gandhi International Airport', note: 'HYD', kind: 'transport', lat: 17.2403, lng: 78.4294 },
    { name: 'Secunderabad Junction', note: 'SC', kind: 'transport', lat: 17.4337, lng: 78.5016 },
    { name: 'HITEC City Metro', note: 'Blue line', kind: 'transport', lat: 17.4495, lng: 78.3811 },
    { name: 'Paradise, Secunderabad', note: 'Hyderabadi biryani', kind: 'restaurant', lat: 17.4436, lng: 78.487 },
    { name: 'Café Bahar', note: 'Biryani and Irani chai', kind: 'restaurant', lat: 17.401, lng: 78.481 },
  ],
  Pune: [
    { name: 'North Main Road, Koregaon Park', note: 'Cafés and nightlife', kind: 'key', lat: 18.5385, lng: 73.894 },
    { name: 'Osho Ashram', note: 'Meditation resort', kind: 'key', lat: 18.5362, lng: 73.888 },
    { name: 'Phoenix Marketcity, Viman Nagar', note: 'Shopping mall', kind: 'key', lat: 18.5622, lng: 73.9167 },
    { name: 'Aga Khan Palace', note: 'Gandhi memorial', kind: 'attraction', lat: 18.5524, lng: 73.9015 },
    { name: 'Shaniwar Wada', note: 'Peshwa fort', kind: 'attraction', lat: 18.5195, lng: 73.8553 },
    { name: 'Dagdusheth Ganpati Temple', note: 'Famous Ganesh temple', kind: 'attraction', lat: 18.5164, lng: 73.8561 },
    { name: 'Pune Junction', note: 'PUNE', kind: 'transport', lat: 18.5289, lng: 73.8742 },
    { name: 'Pune Airport', note: 'PNQ', kind: 'transport', lat: 18.5821, lng: 73.9197 },
    { name: 'Vaishali, FC Road', note: 'South Indian classic', kind: 'restaurant', lat: 18.5208, lng: 73.8411 },
  ],
  Kolkata: [
    { name: 'Park Street', note: 'Restaurants and nightlife', kind: 'key', lat: 22.553, lng: 88.352 },
    { name: 'Victoria Memorial', note: 'Museum and gardens', kind: 'key', lat: 22.5448, lng: 88.3426 },
    { name: 'New Market', note: 'Historic market', kind: 'key', lat: 22.56, lng: 88.351 },
    { name: 'Howrah Bridge', note: 'Cantilever bridge', kind: 'attraction', lat: 22.5851, lng: 88.3468 },
    { name: 'Indian Museum', note: 'India’s oldest museum', kind: 'attraction', lat: 22.5579, lng: 88.3511 },
    { name: 'Eden Gardens', note: 'Cricket stadium', kind: 'attraction', lat: 22.5646, lng: 88.3433 },
    { name: 'Howrah Station', note: 'HWH', kind: 'transport', lat: 22.5839, lng: 88.3426 },
    { name: 'Park Street Metro', note: 'Blue line', kind: 'transport', lat: 22.5547, lng: 88.3497 },
    { name: 'Netaji Subhas Chandra Bose Airport', note: 'CCU', kind: 'transport', lat: 22.6547, lng: 88.4467 },
    { name: 'Peter Cat', note: 'Chelo kebab', kind: 'restaurant', lat: 22.5525, lng: 88.3525 },
    { name: 'Flurys', note: 'Tearoom since 1927', kind: 'restaurant', lat: 22.5531, lng: 88.3515 },
    { name: 'Arsalan, Park Circus', note: 'Kolkata biryani', kind: 'restaurant', lat: 22.539, lng: 88.365 },
  ],
}

/** Straight-line distance in km. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = (d: number) => (d * Math.PI) / 180
  const dLat = r(bLat - aLat)
  const dLng = r(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export const kmLabel = (km: number) => (km < 0.1 ? 'Under 100 m' : km < 1 ? `${Math.round((km * 1000) / 50) * 50} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`)

/** Landmarks near a point, nearest first. Airports and stations are kept even when far. */
export function landmarksNear(city: string, lat: number, lng: number) {
  return (landmarksByCity[city] ?? [])
    .map((l) => ({ ...l, km: distanceKm(lat, lng, l.lat, l.lng) }))
    .filter((l) => l.km <= (l.kind === 'transport' ? 60 : 25))
    .sort((a, b) => a.km - b.km)
}
