import { site } from '../config/site'
import { allAmenities, cancellationOptions, cities } from '../data/options'
import { gstinError, ifscError, panError } from './gstin'
import { slugify, uid } from './format'
import type { Listing } from './types'

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
    amenities: ['wifi', 'ac', 'hotWater'],
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
  const cancel = cancellationOptions.find((c) => c.id === l.policies.cancellation)!
  return {
    slug,
    name: l.basics.name.trim(),
    brand: 'Partner' as const,
    city: l.location.city,
    area: l.location.area.trim(),
    address: [l.location.address.trim(), l.location.area.trim(), `${l.location.city} ${l.location.pincode}`.trim()].filter(Boolean).join(', '),
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
      size: `${r.sizeSqft} sq ft · ${r.bed}`,
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
      cancelHours: { free24: 24, free48: 48, free7d: 168, nonref: -1 }[cancel.id],
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

/** Things that must be fixed before the listing can go live. */
export function blockers(l: Listing): Check[] {
  const out: Check[] = []
  const loc = l.location
  out.push(...basicsProblems(l).map((message) => ({ step: 'basics' as const, message })))
  if (!cities.some((c) => c.name === loc.city)) out.push({ step: 'location', message: 'Choose the city.' })
  if (loc.area.trim().length < 2) out.push({ step: 'location', message: 'Add the area or locality.' })
  if (loc.address.trim().length < 8) out.push({ step: 'location', message: 'Add the street address.' })
  if (!/^\d{6}$/.test(loc.pincode)) out.push({ step: 'location', message: 'Add the 6-digit PIN code.' })
  if (loc.lat == null || loc.lng == null) out.push({ step: 'location', message: 'Drop the pin on your entrance so guests can find you.' })
  if (l.rooms.length === 0) out.push({ step: 'rooms', message: 'Add at least one room type.' })
  l.rooms.forEach((r, i) => {
    const n = r.name.trim() || `Room type ${i + 1}`
    if (!r.name.trim()) out.push({ step: 'rooms', message: `Room type ${i + 1} needs a name.` })
    if (!(r.price >= site.minPrice)) out.push({ step: 'rooms', message: `${n}: set a price of at least ₹${site.minPrice} a night.` })
    if (!(r.count >= 1)) out.push({ step: 'rooms', message: `${n}: how many of these rooms do you have?` })
    if (!(r.maxGuests >= 1)) out.push({ step: 'rooms', message: `${n}: set how many guests fit.` })
  })
  if (l.photos.length < site.minPhotos) out.push({ step: 'photos', message: `Upload at least ${site.minPhotos} photos (now ${l.photos.length}).` })
  if (l.photos.length && !l.photos.some((p) => p.tag === 'Room')) out.push({ step: 'photos', message: 'Add at least one photo of a room.' })
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
  if (l.location.landmarks.filter((x) => x.name).length < 2) out.push({ step: 'location', message: 'Add two nearby landmarks with distances.' })
  if (l.amenities.length < 8) out.push({ step: 'amenities', message: 'Tick every amenity you offer. Guests filter by them.' })
  if (l.photos.length < 10) out.push({ step: 'photos', message: 'Hotels with 10 or more photos get more bookings.' })
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
