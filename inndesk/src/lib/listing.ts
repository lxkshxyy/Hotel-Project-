import { site } from '../config/site'
import { amenityDetails, amenityForms } from '../data/amenityDetails'
import { allAmenities, bedCatalog, cancellationOptions, cities, multiRoomTypes, SHARED_BATH } from '../data/options'
import { houseRuleLines, ruleGaps } from '../data/policyRules'
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
    ...houseRuleLines(p.house),
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
    city: servedCity(l.location) ?? l.location.city.trim(),
    // When a nearby town is sold under a covered city (Greater Noida → New Delhi), keep the town in the area.
    area: [l.location.area.trim(), servedCity(l.location) && !cityByName(l.location.city) ? l.location.city.trim() : ''].filter(Boolean).join(', '),
    address: [l.location.address.trim(), l.location.area.trim(), `${l.location.city} ${l.location.pincode}`.trim(), l.location.state?.trim()].filter(Boolean).join(', '),
    distance: lm[0] ? `${lm[0].distance} from ${lm[0].name}` : l.location.area,
    lat: l.location.lat ?? cities.find((c) => c.name === servedCity(l.location))?.lat ?? 0,
    lng: l.location.lng ?? cities.find((c) => c.name === servedCity(l.location))?.lng ?? 0,
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
  /** Where the Fix button should take the owner, when it isn't the step itself. */
  fix?: { step: StepId; field?: string }
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
  else if (site.contactOtp && b.emailVerified !== b.email.trim().toLowerCase()) e.email = 'Verify this email ID with the OTP.'
  if (!/^[6-9]\d{9}$/.test(b.phone)) e.phone = 'Enter a 10-digit mobile number.'
  else if (site.contactOtp && b.phoneVerified !== b.phone) e.phone = 'Verify this mobile number with the OTP.'
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

/* ---------- room layout: bedrooms and living rooms must fit in the room's area ---------- */

export const SQFT_PER_SQM = 10.7639
/** Floor space each part of a unit needs, with its share of passage: a bedroom ≈ 120 sq ft (11 m²), a living room ≈ 100 sq ft (9 m²). */
export const BEDROOM_SQFT = 120
export const LIVING_SQFT = 100
export const isMultiRoom = (r: Pick<ListingRoom, 'roomType'>) => multiRoomTypes.includes(r.roomType ?? '')
/** Indoor area in square feet, whichever unit the owner typed. */
export const areaSqft = (r: Pick<ListingRoom, 'size' | 'sizeUnit' | 'sizeSqft'>) => (r.size ? (r.sizeUnit === 'sqm' ? r.size * SQFT_PER_SQM : r.size) : r.sizeSqft || 0)
/** Bedrooms and living rooms in one unit. Ordinary room types are always one bedroom with no living room. */
export const layoutOf = (r: ListingRoom) => (isMultiRoom(r) ? { bedrooms: Math.max(1, r.bedrooms ?? 1), living: Math.max(0, r.livingRooms ?? 0) } : { bedrooms: 1, living: 0 })
/** The most bedrooms (with the living rooms chosen) and living rooms (with the bedrooms chosen) the area allows. */
export function layoutLimits(r: ListingRoom) {
  const area = areaSqft(r)
  const { bedrooms, living } = layoutOf(r)
  return {
    area,
    maxBedrooms: Math.max(1, Math.min(10, Math.floor((area - living * LIVING_SQFT) / BEDROOM_SQFT))),
    maxLiving: Math.max(0, Math.min(5, Math.floor((area - bedrooms * BEDROOM_SQFT) / LIVING_SQFT))),
    needs: bedrooms * BEDROOM_SQFT + living * LIVING_SQFT,
  }
}

/** Bedrooms and living rooms with their bed lines, sized to the counts in Room Details. */
export function bedsOf(r: ListingRoom) {
  const { bedrooms: nb, living: nl } = layoutOf(r)
  const pad = (rows: BedLine[][] | undefined, n: number) => Array.from({ length: n }, (_, i) => (rows?.[i]?.length ? rows[i] : [{ type: '', count: 0 }]))
  return { bedrooms: pad(r.beds?.bedrooms, nb), living: pad(r.beds?.living, nl) }
}

const sleeps = (type: string) => bedCatalog.find((b) => b.name === type)?.sleeps ?? 0

/* ---------- beds must fit on the floor ---------- */

/** Beds may cover at most about a third of the indoor area; the rest is walking space, furniture and the bathroom. */
export const BED_FLOOR_SHARE = 0.35
export const MAX_BEDS_PER_BEDROOM = 4
export const MAX_BEDS_PER_LIVING = 2
/** A roll-away extra bed is about the size of a single bed. */
export const EXTRA_BED_FLOOR = 18
export const bedFloor = (type: string) => bedCatalog.find((b) => b.name === type)?.floor ?? 18
/** Floor the beds may use in this unit, and how much the chosen beds (and extra beds) use. */
export function bedSpace(r: ListingRoom) {
  const b = bedsOf(r)
  const beds = [...b.bedrooms, ...b.living].flat().reduce((n, x) => n + (x.type ? bedFloor(x.type) * (x.count || 0) : 0), 0)
  const extra = r.extraBed ? (r.extraBedMax ?? 0) * EXTRA_BED_FLOOR : 0
  return { allowance: Math.floor(areaSqft(r) * BED_FLOOR_SHARE), beds, extra, used: beds + extra }
}
/** Guests the beds sleep, and how many more extra beds add. */
export function bedCapacity(r: ListingRoom) {
  const b = bedsOf(r)
  const cap = [...b.bedrooms, ...b.living].flat().reduce((n, x) => n + sleeps(x.type) * (x.count || 0), 0)
  return { cap, extra: r.extraBed ? r.extraBedMax ?? 0 : 0 }
}
/** Highest each occupancy number may go with these beds (children can share beds with adults). */
export function occupancyLimits(r: ListingRoom) {
  const { cap, extra } = bedCapacity(r)
  const b = bedsOf(r)
  const rooms = [...b.bedrooms, ...b.living].filter((lines) => lines.some((x) => x.type && x.count)).length
  // One child can share a bed with adults in each room that has beds, or one per two bed places, whichever is more.
  return { baseAdults: cap, maxAdults: cap + extra, baseChildren: cap + extra, maxChildren: cap + extra, maxOccupancy: cap + extra + Math.max(rooms, Math.ceil(cap / 2)) }
}

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
    else if (areaSqft(r) > 10000) e.size = `${r.size} ${r.sizeUnit === 'sqm' ? 'sq m' : 'sq ft'} is bigger than a large house. Check the size of one room/unit.`
    if (r.name.trim().length < 3) e.name = 'Enter the room name guests will see.'
    if (!(r.count >= 1)) e.count = 'Enter how many rooms of this type you have.'
    if (isMultiRoom(r)) {
      const { bedrooms, living } = layoutOf(r)
      const lim = layoutLimits(r)
      if (!((r.bedrooms ?? 1) >= 1)) e.bedrooms = 'At least 1 bedroom.'
      else if (!e.size && lim.needs > lim.area) {
        const shown = r.sizeUnit === 'sqm' ? `${r.size} sq m (about ${Math.round(lim.area)} sq ft)` : `${r.size} sq ft`
        e.bedrooms = `${bedrooms} bedroom${bedrooms === 1 ? '' : 's'}${living ? ` and ${living} living room${living === 1 ? '' : 's'}` : ''} need at least ${lim.needs} sq ft, but this unit is ${shown}. Lower the numbers or correct the size.`
      }
    }
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
    const per = (lines: BedLine[]) => lines.reduce((n, x) => n + (x.type ? x.count || 0 : 0), 0)
    b.bedrooms.forEach((lines, i) => {
      if (!e[`bedroom${i}`] && per(lines) > MAX_BEDS_PER_BEDROOM) e[`bedroom${i}`] = `One bedroom can have at most ${MAX_BEDS_PER_BEDROOM} beds.`
    })
    b.living.forEach((lines, i) => {
      if (!e[`living${i}`] && per(lines) > MAX_BEDS_PER_LIVING) e[`living${i}`] = `A living room can have at most ${MAX_BEDS_PER_LIVING} beds.`
    })
    const sp = bedSpace(r)
    if (sp.allowance && sp.used > sp.allowance) e.beds = `These beds${sp.extra ? ' and extra beds' : ''} cover about ${sp.used} sq ft of floor, but a ${Math.round(areaSqft(r))} sq ft room has space for about ${sp.allowance} sq ft of beds (about a third of the floor; the rest is walking space, furniture and the bathroom). Use fewer or smaller beds.`
    if (r.extraBed == null) e.extraBed = 'Choose No or Yes.'
    else if (r.extraBed && !(r.extraBedMax && r.extraBedMax >= 1)) e.extraBed = 'Enter how many extra beds fit.'
    const o = r.occupancy
    const lim = occupancyLimits(r)
    const { cap, extra } = bedCapacity(r)
    const sleepsText = `The beds sleep ${cap}${extra ? ` (${cap + extra} with extra beds)` : ''}`
    if (!o || o.baseAdults < 1) e.baseAdults = 'At least 1 adult.'
    else if (o.baseAdults > lim.baseAdults) e.baseAdults = `${sleepsText}, so base adults can’t be more than ${lim.baseAdults}.`
    else if (o.maxAdults > lim.maxAdults) e.maxAdults = `${sleepsText}, so maximum adults can’t be more than ${lim.maxAdults}.`
    else if (o.maxChildren > lim.maxChildren) e.maxChildren = `${sleepsText}, so maximum children can’t be more than ${lim.maxChildren}.`
    else if (o.baseChildren > lim.baseChildren) e.baseChildren = `Base children can’t be more than ${lim.baseChildren}.`
    else if (o.maxOccupancy > lim.maxOccupancy) e.maxOccupancy = `${sleepsText}, so the room can hold at most ${lim.maxOccupancy} guests (children sharing beds included).`
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

/** Other names people type for the cities StayEasy covers. */
const cityAliases: Record<string, string> = {
  delhi: 'New Delhi', newdelhi: 'New Delhi', ncr: 'New Delhi', delhincr: 'New Delhi',
  bangalore: 'Bengaluru', bengaluru: 'Bengaluru', bombay: 'Mumbai', calcutta: 'Kolkata',
  panaji: 'Goa', panjim: 'Goa', northgoa: 'Goa', southgoa: 'Goa', margao: 'Goa',
  secunderabad: 'Hyderabad', poona: 'Pune',
}
const SERVED_RADIUS_KM = 60
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180
  const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(x))
}

/**
 * The StayEasy city a listing is sold under, or null when StayEasy doesn't cover it yet.
 * Matches the typed city (any spelling or old name, e.g. "delhi", "Calcutta", "Kolkata District"),
 * or else the map pin: anything within 60 km of a covered city is listed under that city
 * (so Dadri, Greater Noida, Noida and Gurugram come under New Delhi).
 */
/** A covered city from its name or another spelling ("delhi", "Calcutta", "Kolkata District"). */
export function cityByName(name: string): string | null {
  const key = name.toLowerCase().replace(/district|city|municipal corporation/g, '').replace(/[^a-z]/g, '')
  return cities.find((c) => c.name.toLowerCase().replace(/[^a-z]/g, '') === key)?.name ?? cityAliases[key] ?? null
}

export function servedCity(loc: Listing['location']): string | null {
  const byName = cityByName(loc.city)
  if (byName) return byName
  if (loc.lat != null && loc.lng != null) {
    const near = cities.map((c) => ({ c, d: km(c, { lat: loc.lat!, lng: loc.lng! }) })).sort((a, b) => a.d - b.d)[0]
    if (near && near.d <= SERVED_RADIUS_KM) return near.c.name
  }
  return null
}

/** Finance & Legal is filled in three parts, one after another. */
export const legalSections = [
  { id: 1, title: 'Bank Account Information', intro: 'Please provide your bank details to receive payouts without delay' },
  { id: 2, title: 'Tax, MSME and Registration Information', intro: 'These tax details will be used for invoicing and statutory compliance' },
  { id: 3, title: 'Property Documents', intro: 'Provide necessary documents for verification and onboarding completion' },
]
export const udyamError = (v: string) => (/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(v.trim().toUpperCase()) ? '' : 'A Udyam number looks like UDYAM-DL-01-0001234.')

/** What's missing in one part of Finance & Legal, keyed by field. */
export function legalErrors(l: Listing, section: number): Record<string, string> {
  const g = l.legal
  const e: Record<string, string> = {}
  if (section === 1) {
    if (!g.accountLast4) e.acct = 'Enter your bank account number twice.'
    if (!g.ifsc) e.ifsc = 'Enter the IFSC code.'
    else if (ifscError(g.ifsc)) e.ifsc = ifscError(g.ifsc)
    if (!g.bankName) e.bankName = 'Select your bank.'
    if (!g.bankConsent) e.consent = 'Tick the consent for bank account verification.'
  }
  if (section === 2) {
    if (!g.legalName.trim()) e.legalName = 'Enter the registered business or owner name.'
    if (!g.pan) e.pan = 'Enter the PAN.'
    else if (panError(g.pan)) e.pan = panError(g.pan)
    const hasGstin = g.hasGstin ?? (g.gstin ? true : null)
    if (hasGstin == null) e.hasGstin = 'Choose No or Yes.'
    else if (hasGstin && gstinError(g.gstin)) e.gstin = gstinError(g.gstin)
    if (g.msme == null) e.msme = 'Choose No or Yes.'
    else if (g.msme && udyamError(g.udyam ?? '')) e.udyam = udyamError(g.udyam ?? '')
  }
  if (section === 3) {
    if (!g.agreed) e.agreed = 'Confirm you own or are authorised to list this property, and accept the partner terms.'
  }
  return e
}
export const legalSectionDone = (l: Listing, section: number) => !Object.keys(legalErrors(l, section)).length

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

/** The dropdowns of a ticked amenity that are still empty, as plain words ("type", "mode", "an option"). */
export function amenityMissing(l: Listing, id: string) {
  return (amenityDetails[id] ?? []).filter((f) => {
    const v = l.amenityDetails?.[id]?.[f.id]
    return Array.isArray(v) ? v.length === 0 : !v
  })
}
/** Ticked amenities whose details aren't filled in. Each must be completed or unticked. */
export function amenityGaps(l: Listing) {
  return l.amenities
    .map((id) => {
      const label = allAmenities.find((a) => a.id === id)?.label ?? id
      // Amenities with their own form (parking, pool…) need at least one entry added.
      if (amenityForms[id] && !(l.amenityEntries?.[id] ?? []).length) return { id, label, message: `${amenityForms[id].title}: press “Add ${amenityForms[id].title}” and fill in the details, or untick it.` }
      const missing = amenityMissing(l, id)
      if (!missing.length) return null
      const words = missing.filter((f) => /^Select\s+\S/i.test(f.label)).map((f) => f.label.replace(/^Select\s+/i, '').toLowerCase())
      const what = words.length === missing.length ? `the ${words.join(' and ')}` : missing.length > 1 ? 'all the options' : 'an option'
      return { id, label, message: `${label}: choose ${what} under it, or untick it.` }
    })
    .filter((g): g is { id: string; label: string; message: string } => !!g)
}

/** Things that must be fixed before the listing can go live. */
export function blockers(l: Listing): Check[] {
  const out: Check[] = []
  out.push(...basicsProblems(l).map((message) => ({ step: 'basics' as const, message })))
  out.push(...Object.values(locationErrors(l)).filter((m): m is string => !!m).map((message) => ({ step: 'location' as const, message })))
  const need = minAmenities(l)
  if (l.amenities.length < need) out.push({ step: 'amenities', message: `A ${l.basics.stars}-star property needs at least ${need} amenities ticked (${l.amenities.length} ticked so far).` })
  for (const g of amenityGaps(l)) out.push({ step: 'amenities', message: g.message })
  for (const g of ruleGaps(l.policies.house)) out.push({ step: 'policies', message: `Property Rules → ${g.group.title}: answer ${g.missing.length} more question${g.missing.length === 1 ? '' : 's'}.` })
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
  legalSections.forEach((sec) => {
    Object.values(legalErrors(l, sec.id)).forEach((message) => out.push({ step: 'legal', message: `${sec.title}: ${message}` }))
  })
  return out
}

/** Optional improvements that help a listing sell. */
export function tips(l: Listing): Check[] {
  const out: Check[] = []
  if (l.amenities.length < 8) out.push({ step: 'amenities', message: 'Tick every amenity you offer. Guests filter by them.' })
  if (l.rooms.some((r) => !r.photoId)) out.push({ step: 'rooms', message: 'Give each room type its own photo.' })
  if (!l.legal.gstin) out.push({ step: 'legal', message: 'Add your GSTIN so commission invoices carry it.' })
  if (!l.legal.ownershipDoc) out.push({ step: 'legal', message: 'Upload proof of ownership or lease before your first payout.' })
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
