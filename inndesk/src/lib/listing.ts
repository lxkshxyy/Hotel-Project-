import { site } from '../config/site'
import { amenityForms } from '../data/amenityDetails'
import { allAmenities, bedCatalog, cancellationOptions, cities, SHARED_BATH } from '../data/options'
import { gstinError, ifscError, panError } from './gstin'
import { slugify, uid } from './format'
import type { BedLine, Listing, ListingRoom } from './types'

export const steps = [
  { id: 'basics', label: 'Basic Info' },
  { id: 'location', label: 'Location' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'photos', label: 'Photos And Videos' },
  { id: 'policies', label: 'Policies' },
  { id: 'legal', label: 'Finance & Legal' },
  { id: 'review', label: 'Review' },
] as const
export type StepId = (typeof steps)[number]['id']

export function blankListing(ownerId: string, owner?: { phone?: string; email?: string; businessName?: string; gstin?: string }): Listing {
  const now = new Date().toISOString()
  return {
    id: uid(10),
    ownerId,
    slug: '',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    basics: { name: '', propertyType: 'Hotel', stars: 0, description: '', highlights: [], phone: owner?.phone ?? '', email: owner?.email ?? '', channelManager: null },
    location: { city: '', area: '', address: '', pincode: '', landmarks: [] },
    amenities: [],
    rooms: [],
    photos: [],
    policies: {
      checkIn: '12:00 PM',
      checkOut: '11:00 AM',
      cancellation: 'free24',
      payAtHotel: true,
      coupleFriendly: true,
      localIds: true,
      pets: false,
      smoking: false,
      childrenFreeAge: 5,
      extraBed: 500,
      rules: [],
    },
    legal: { legalName: owner?.businessName ?? '', gstin: owner?.gstin ?? '', pan: '', payoutName: '', bankName: '', ifsc: '', accountLast4: '', agreed: false },
    calendar: {},
  }
}

/** Public address on StayEasy: name + city + a short id so two hotels never clash. */
export const makeSlug = (l: Listing) => `${slugify(l.basics.name) || 'hotel'}-${slugify(l.location.city) || 'india'}-${l.id.slice(0, 4)}`

const hueOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

/** The rules guests see on StayEasy's hotel page, built from the owner's policy choices. */
export function guestRules(l: Listing) {
  const p = l.policies
  return [
    p.localIds ? 'Guests with local IDs are allowed.' : 'Guests with local IDs are not allowed.',
    p.pets ? 'Pets are allowed.' : 'Pets are not allowed.',
    p.smoking ? 'Smoking is allowed in designated areas.' : 'Smoking is not allowed anywhere on the property.',
    `Children up to ${p.childrenFreeAge} years stay free using existing beds.`,
    ...(p.extraBed > 0 ? [`Extra bed: ₹${p.extraBed} per night.`] : ['Extra beds are not available.']),
    ...p.rules.filter(Boolean),
  ]
}

/**
 * Turns an InnDesk listing into the hotel record StayEasy shows (same shape as StayEasy's
 * src/data/types.ts → Hotel). Photos go in cover-first order.
 */
export function toHotel(l: Listing) {
  const slug = l.slug || makeSlug(l)
  const photoUrl = (id?: string) => l.photos.find((p) => p.id === id)?.url
  const keyed = l.amenities.map((id) => allAmenities.find((a) => a.id === id)?.key).filter((k): k is string => !!k)
  const extras = l.amenities.map((id) => allAmenities.find((a) => a.id === id)).filter((a) => a && !a.key).map((a) => a!.label)
  const lm = l.location.landmarks.filter((x) => x.name && x.distance)
  const cancel = cancellationOptions.find((c) => c.id === l.policies.cancellation) ?? cancellationOptions[1]
  return {
    slug,
    name: l.basics.name.trim(),
    brand: 'Partner' as const,
    city: cities.find((c) => c.name.toLowerCase() === l.location.city.trim().toLowerCase())?.name ?? l.location.city.trim(),
    area: l.location.area.trim(),
    address: [l.location.address.trim(), l.location.area.trim(), `${l.location.city} ${l.location.pincode}`.trim(), l.location.state?.trim()].filter(Boolean).join(', '),
    distance: lm[0] ? `${lm[0].distance} from ${lm[0].name}` : l.location.area,
    lat: l.location.lat ?? cities.find((c) => c.name === l.location.city)?.lat ?? 0,
    lng: l.location.lng ?? cities.find((c) => c.name === l.location.city)?.lng ?? 0,
    rating: 0,
    reviews: 0,
    tags: [l.basics.stars ? `${l.basics.stars}-star ${l.basics.propertyType.toLowerCase()}` : l.basics.propertyType, l.policies.coupleFriendly ? 'Couple friendly' : '', cancel.id === 'nonref' ? '' : cancel.short]
      .filter(Boolean)
      .slice(0, 3),
    highlights: l.basics.highlights.filter(Boolean).slice(0, 4),
    description: l.basics.description.trim() + (extras.length ? `\n\nAlso at the property: ${extras.join(', ')}.` : ''),
    amenities: keyed,
    rooms: l.rooms.map((r, i) => ({
      id: `${slug}-${r.id}`,
      name: r.name.trim(),
      size: `${r.sizeSqft} sq ft · ${bedSummary(r)}`,
      features: [...(r.breakfast ? ['Free breakfast'] : []), ...r.amenities].slice(0, 4),
      price: r.price,
      mrp: r.mrp && r.mrp > r.price ? r.mrp : r.price,
      maxGuests: r.maxGuests,
      hue: (hueOf(slug) + i * 24) % 360,
      photo: photoUrl(r.photoId),
      count: r.count,
      // Date-wise prices, rooms on sale and closed dates from Rates and availability.
      calendar: l.calendar[r.id] && Object.keys(l.calendar[r.id]).length ? l.calendar[r.id] : undefined,
    })),
    nearby: lm,
    scores: [] as { label: string; value: number }[],
    payAtHotel: l.policies.payAtHotel,
    freeBreakfast: l.rooms.some((r) => r.breakfast),
    coupleFriendly: l.policies.coupleFriendly,
    hue: hueOf(slug),
    photos: l.photos.map((p) => p.url),
    photoTags: l.photos.map((p) => (p.tag === 'Other' ? 'Photo' : p.tag)),
    partner: {
      propertyType: l.basics.propertyType,
      stars: l.basics.stars || undefined,
      checkIn: l.policies.checkIn,
      checkOut: l.policies.checkOut,
      cancellation: cancel.label + '.',
      cancelHours: { freeCheckin: 0, free24: 24, free48: 48, free72: 72, nonref: -1 }[cancel.id],
      rules: guestRules(l),
    },
  }
}

export interface Check {
  step: StepId
  message: string
}

const thisYear = new Date().getFullYear()

/** What's missing on the Basic Info tab, keyed by field so the form can show each message in place. */
export function basicsErrors(l: Listing): Partial<Record<'name' | 'stars' | 'yearBuilt' | 'bookingSince' | 'channel' | 'channelName' | 'email' | 'phone' | 'whatsapp' | 'landline', string>> {
  const b = l.basics
  const e: ReturnType<typeof basicsErrors> = {}
  if (b.name.trim().length < 3) e.name = 'Enter the property name as on your documents.'
  if (b.category === 'hotel' && !b.starsChosen) e.stars = 'Choose a star rating, or “Not rated”.'
  if (!b.yearBuilt) e.yearBuilt = 'Choose the year the property was built.'
  if (!b.bookingSince) e.bookingSince = 'Choose the year you started taking bookings.'
  else if (b.yearBuilt && b.bookingSince < b.yearBuilt) e.bookingSince = 'This can’t be before the year the property was built.'
  else if (b.bookingSince > thisYear) e.bookingSince = 'Choose this year or earlier.'
  if (b.channelManager == null) e.channel = 'Choose No or Yes.'
  else if (b.channelManager && !b.channelManagerName?.trim()) e.channelName = 'Choose your channel manager.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim())) e.email = 'Enter the email guests can write to.'
  else if (b.emailVerified !== b.email.trim().toLowerCase()) e.email = 'Verify this email ID with the OTP.'
  if (!/^[6-9]\d{9}$/.test(b.phone)) e.phone = 'Enter a 10-digit mobile number.'
  else if (b.phoneVerified !== b.phone) e.phone = 'Verify this mobile number with the OTP.'
  if (b.whatsappSame === false && b.whatsapp && !/^[6-9]\d{9}$/.test(b.whatsapp)) e.whatsapp = 'Enter a 10-digit WhatsApp number.'
  if (b.landline && !/^0?\d{10,11}$/.test(b.landline.replace(/[\s-]/g, ''))) e.landline = 'Enter the landline with STD code, e.g. 011 2345 6789.'
  return e
}
export const basicsProblems = (l: Listing) => Object.values(basicsErrors(l)).filter((m): m is string => !!m)

/**
 * Fewest amenities a property must tick for its star rating: 2 per star (1★ 2, 2★ 4, 3★ 6, 4★ 8, 5★ 10).
 * Not-rated hotels and homestays can skip the step.
 */
export const minAmenities = (l: Listing) => (l.basics.category === 'homestay' || !l.basics.stars ? 0 : l.basics.stars * 2)

/* ---------------- rooms ---------------- */

export const roomSections = [
  { id: 1, title: 'Room Details', intro: 'Add the name and key features of this room type' },
  { id: 2, title: 'Sleeping Arrangement & Occupancy', intro: 'Select bed types and how many guests this room can host' },
  { id: 3, title: 'Bathroom Details', intro: 'Add details of bathroom(s) for this room type' },
  { id: 4, title: 'Meal Plan, Rates & Inventory Details', intro: 'Set up the meal plan, pricing, and inventory to make this room ready to sell.' },
  { id: 5, title: 'Amenity Details', intro: 'Select the amenities to help guests know what to expect during their stay' },
] as const

/** Bedrooms and living rooms with their bed lines, sized to the counts in Room Details. */
export function bedsOf(r: ListingRoom) {
  const nb = Math.max(1, r.bedrooms ?? 1)
  const nl = Math.max(0, r.livingRooms ?? 0)
  const pad = (rows: BedLine[][] | undefined, n: number) => Array.from({ length: n }, (_, i) => (rows?.[i]?.length ? rows[i] : [{ type: '', count: 0 }]))
  return { bedrooms: pad(r.beds?.bedrooms, nb), living: pad(r.beds?.living, nl) }
}

const sleeps = (type: string) => bedCatalog.find((b) => b.name === type)?.sleeps ?? 0

/** Occupancy worked out from the beds, the way the reference pre-fills it. The owner can change every number. */
export function autoOccupancy(r: ListingRoom): NonNullable<ListingRoom['occupancy']> {
  const b = bedsOf(r)
  const all = [...b.bedrooms, ...b.living].flat()
  const cap = all.reduce((n, x) => n + sleeps(x.type) * (x.count || 0), 0)
  const rooms = [...b.bedrooms, ...b.living].filter((lines) => lines.some((x) => x.type && x.count)).length
  const extra = r.extraBed ? r.extraBedMax ?? 0 : 0
  const baseChildren = Math.max(rooms, cap ? 1 : 0)
  const maxChildren = Math.max(baseChildren, Math.ceil(cap / 2) + extra)
  const maxAdults = cap + extra
  return { baseAdults: cap, maxAdults, baseChildren, maxChildren, maxOccupancy: Math.min(maxAdults + maxChildren, maxAdults + baseChildren) }
}

/** "1 King Bed + 2 Single Bed" across the whole unit. */
export function bedSummary(r: ListingRoom) {
  const b = bedsOf(r)
  const t: Record<string, number> = {}
  for (const x of [...b.bedrooms, ...b.living].flat()) if (x.type && x.count) t[x.type] = (t[x.type] ?? 0) + x.count
  return Object.entries(t).map(([k, v]) => `${v} ${k}${v > 1 ? 's' : ''}`).join(' + ') || r.bed
}

/** Rooms a bathroom can be attached to: each bedroom, each living room, or shared outside the room. */
export function attachOptions(r: ListingRoom) {
  const b = bedsOf(r)
  return [...b.bedrooms.map((_, i) => `Bedroom ${i + 1}`), ...b.living.map((_, i) => `Living Room ${i + 1}`), SHARED_BATH]
}

/** What's missing in one section of a room type, keyed by field. */
export function roomErrors(r: ListingRoom, section: number): Record<string, string> {
  const e: Record<string, string> = {}
  if (section === 1) {
    if (!r.roomType) e.roomType = 'Choose the room type.'
    if (!r.view) e.view = 'Choose the room view.'
    if (!r.sizeUnit) e.size = 'Choose square feet or square meter, then enter the size.'
    else if (!r.size || r.size < (r.sizeUnit === 'sqm' ? 5 : 50)) e.size = `Enter the indoor area in ${r.sizeUnit === 'sqm' ? 'square meters' : 'square feet'}.`
    if (r.name.trim().length < 3) e.name = 'Enter the room name guests will see.'
    if (!(r.count >= 1)) e.count = 'Enter how many rooms of this type you have.'
    if (!((r.bedrooms ?? 1) >= 1)) e.bedrooms = 'At least 1 bedroom.'
  }
  if (section === 2) {
    const b = bedsOf(r)
    b.bedrooms.forEach((lines, i) => {
      if (!lines.some((x) => x.type && x.count > 0)) e[`bedroom${i}`] = 'Choose a bed type and the number of beds.'
      else if (lines.some((x) => (x.type && !x.count) || (!x.type && x.count))) e[`bedroom${i}`] = 'Each bed type needs a number of beds.'
    })
    b.living.forEach((lines, i) => {
      if (lines.some((x) => (x.type && !x.count) || (!x.type && x.count))) e[`living${i}`] = 'Each bed type needs a number of beds.'
    })
    if (r.extraBed == null) e.extraBed = 'Choose No or Yes.'
    else if (r.extraBed && !(r.extraBedMax && r.extraBedMax >= 1)) e.extraBed = 'Enter how many extra beds fit.'
    const o = r.occupancy
    if (!o || o.baseAdults < 1) e.baseAdults = 'At least 1 adult.'
    else {
      if (o.maxAdults < o.baseAdults) e.maxAdults = 'Can’t be less than base adults.'
      if (o.maxChildren < o.baseChildren) e.maxChildren = 'Can’t be less than base children.'
      if (o.maxOccupancy < Math.max(1, o.maxAdults)) e.maxOccupancy = 'Can’t be less than maximum adults.'
      else if (o.maxOccupancy > o.maxAdults + o.maxChildren) e.maxOccupancy = 'Can’t be more than maximum adults and children together.'
    }
  }
  if (section === 3) {
    const rooms = attachOptions(r)
    const baths = r.baths ?? []
    if (!baths.length) e.baths = 'Add at least one bathroom.'
    else if (baths.some((x) => !x.type)) e.baths = 'Choose the type of each bathroom.'
    else if (baths.some((x) => !rooms.includes(x.attached))) e.baths = 'Choose the room each bathroom is attached to.'
  }
  if (section === 4) {
    const o = r.occupancy
    if (!r.mealPlan) e.mealPlan = 'Select a meal plan.'
    if (!(r.price >= site.minPrice)) e.price = `Enter a base rate of at least ₹${site.minPrice} a night.`
    if (o && o.maxAdults > o.baseAdults && r.extraAdultCharge == null) e.extraAdultCharge = 'Enter the charge for each extra adult (0 if free).'
    if (o && o.maxChildren > o.baseChildren && r.childCharge == null) e.childCharge = 'Enter the charge for each paid child (0 if free).'
    if (!r.saleFrom) e.saleFrom = 'Choose the start date.'
    if (!r.saleTo) e.saleTo = 'Choose the end date.'
    else if (r.saleFrom && r.saleTo < r.saleFrom) e.saleTo = 'The end date must be on or after the start date.'
  }
  return e
}
export const roomSectionDone = (r: ListingRoom, section: number) => !Object.keys(roomErrors(r, section)).length
export const roomDone = (r: ListingRoom) => roomSections.every((s) => roomSectionDone(r, s.id))

/** What's missing on the Location tab, keyed by field. */
export function locationErrors(l: Listing): Partial<Record<'address' | 'area' | 'pincode' | 'state' | 'city' | 'pin' | 'confirm', string>> {
  const loc = l.location
  const e: ReturnType<typeof locationErrors> = {}
  if (loc.address.trim().length < 2) e.address = 'Enter the house, building or apartment number.'
  if (loc.area.trim().length < 2) e.area = 'Enter the locality, area, street or sector.'
  if (!/^[1-9]\d{5}$/.test(loc.pincode)) e.pincode = 'Enter the 6-digit pincode.'
  if (!loc.state?.trim()) e.state = 'Enter the state.'
  if (!loc.city.trim()) e.city = 'Enter the city.'
  if (loc.lat == null || loc.lng == null) e.pin = 'Place the pin on your entrance on the map.'
  if (!loc.addressConfirmed) e.confirm = 'Confirm the address matches your registration or lease document.'
  return e
}

/** Things that must be fixed before the listing can go live. */
export function blockers(l: Listing): Check[] {
  const out: Check[] = []
  const loc = l.location
  out.push(...basicsProblems(l).map((message) => ({ step: 'basics' as const, message })))
  out.push(...Object.values(locationErrors(l)).filter((m): m is string => !!m).map((message) => ({ step: 'location' as const, message })))
  if (loc.city.trim() && !cities.some((c) => c.name.toLowerCase() === loc.city.trim().toLowerCase())) out.push({ step: 'review', message: `${site.marketplace} isn’t open in ${loc.city.trim()} yet, so the listing can’t go live there. Ask the ${site.marketplace} team to add the city.` })
  const need = minAmenities(l)
  if (l.amenities.length < need) out.push({ step: 'amenities', message: `A ${l.basics.stars}-star property needs at least ${need} amenities ticked (${l.amenities.length} ticked so far).` })
  for (const id of l.amenities) if (amenityForms[id] && !(l.amenityEntries?.[id] ?? []).length) out.push({ step: 'amenities', message: `${amenityForms[id].title}: press “Add ${amenityForms[id].title}” and fill in the details, or untick it.` })
  if (l.rooms.length === 0) out.push({ step: 'rooms', message: 'Add at least one room type.' })
  l.rooms.forEach((r, i) => {
    const n = r.name.trim() || `Room type ${i + 1}`
    roomSections.forEach((sec) => {
      if (Object.keys(roomErrors(r, sec.id)).length) out.push({ step: 'rooms', message: `${n}: finish “${sec.title}”.` })
    })
  })
  if (l.photos.length < site.minPhotos) out.push({ step: 'photos', message: `Upload at least ${site.minPhotos} photos (now ${l.photos.length}).` })
  if (l.photos.length && !l.photos.some((p) => p.tag === 'Room')) out.push({ step: 'photos', message: 'Add at least one photo of a room.' })
  if (l.photos.length && !l.photos.some((p) => p.landscape ?? true)) out.push({ step: 'photos', message: 'Add at least one photo in landscape mode (wider than it is tall).' })
  if (!l.legal.legalName.trim()) out.push({ step: 'legal', message: 'Add the registered business or owner name.' })
  if (l.legal.gstin && gstinError(l.legal.gstin)) out.push({ step: 'legal', message: `GSTIN: ${gstinError(l.legal.gstin)}` })
  if (l.legal.pan && panError(l.legal.pan)) out.push({ step: 'legal', message: `PAN: ${panError(l.legal.pan)}` })
  if (l.legal.ifsc && ifscError(l.legal.ifsc)) out.push({ step: 'legal', message: `IFSC: ${ifscError(l.legal.ifsc)}` })
  if (!l.legal.agreed) out.push({ step: 'legal', message: 'Accept the partner terms.' })
  return out
}

/** Optional improvements that help a listing sell. */
export function tips(l: Listing): Check[] {
  const out: Check[] = []
  if (l.amenities.length < 8) out.push({ step: 'amenities', message: 'Tick every amenity you offer. Guests filter by them.' })
  if (l.rooms.some((r) => !r.photoId)) out.push({ step: 'rooms', message: 'Give each room type its own photo.' })
  if (!l.legal.gstin) out.push({ step: 'legal', message: 'Add your GSTIN so commission invoices carry it.' })
  if (!l.legal.accountLast4 || !l.legal.ifsc) out.push({ step: 'legal', message: 'Add payout bank details before your first payout.' })
  return out
}

/** 0–100: share of required items done, with tips counting a little. */
export function quality(l: Listing) {
  const b = blockers(l).length
  const t = tips(l).length
  return Math.max(0, Math.min(100, Math.round(100 - b * 7 - t * 3)))
}

export const stepDone = (l: Listing, s: StepId) => (s === 'review' ? l.status !== 'draft' : !blockers(l).some((c) => c.step === s))

export const totalRooms = (l: Listing) => l.rooms.reduce((s, r) => s + (r.count || 0), 0)
export const fromPrice = (l: Listing) => (l.rooms.length ? Math.min(...l.rooms.map((r) => r.price || Infinity)) : 0)
