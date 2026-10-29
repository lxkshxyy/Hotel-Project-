import { features } from '../config/launch'
import type { Hotel } from '../data/types'
import { isDemoMode, supabase } from './supabase'

/*
 * Guest reviews. With Supabase connected they live in the `reviews` table (see supabase/schema.sql);
 * in demo mode they are kept in this browser.
 * Each hotel also shows a few SAMPLE reviews (marked "Sample") so the section isn't empty in demos —
 * switch them off with SHOW_SAMPLE_REVIEWS before launch.
 */
export const SHOW_SAMPLE_REVIEWS = features.sampleReviews

export const travellerTypes = ['Couple', 'Solo', 'Business', 'Family', 'Group'] as const
export type TravellerType = (typeof travellerTypes)[number]

export const reviewTopics = ['Friendly staff', 'Cleanliness', 'Good location', 'Value for money', 'Food', 'Comfortable rooms', 'Fast Wi-Fi', 'Quiet'] as const

export interface Review {
  id: string
  hotel_slug: string
  user_id?: string | null
  name: string
  rating: number
  traveller: TravellerType
  room?: string | null
  stay_month: string
  title: string
  text: string
  topics: string[]
  verified: boolean
  sample?: boolean
  created_at: string
}

export type NewReview = Omit<Review, 'id' | 'created_at' | 'sample'>

const KEY = 'stayeasy.demo.reviews'

function readLocal(): Review[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as Review[]
  } catch {
    return []
  }
}

/* ---------- sample reviews (clearly marked) ---------- */

const samples: { r: number; t: TravellerType; title: string; text: string; topics: string[] }[] = [
  { r: 5, t: 'Couple', title: 'Spotless room and very helpful staff', text: 'The room was spotless and the bed was comfortable. Front desk helped us with an early check-in at no extra cost.', topics: ['Cleanliness', 'Friendly staff', 'Comfortable rooms'] },
  { r: 4, t: 'Business', title: 'Good for a work trip', text: 'Quiet room with a proper desk and Wi-Fi that held up on video calls. Breakfast could have more variety.', topics: ['Fast Wi-Fi', 'Quiet', 'Food'] },
  { r: 5, t: 'Family', title: 'Great location for sightseeing', text: 'Easy to get around from here and the kids loved the breakfast. Staff arranged a cab for us every morning.', topics: ['Good location', 'Food', 'Friendly staff'] },
  { r: 4, t: 'Solo', title: 'Value for money', text: 'Clean and simple, everything worked. Hot water, AC and TV all fine. Would stay again at this price.', topics: ['Value for money', 'Cleanliness'] },
  { r: 3, t: 'Group', title: 'Decent stay, a bit noisy', text: 'Rooms were fine but the corridor was noisy late at night. Staff responded quickly when we asked for extra towels.', topics: ['Friendly staff'] },
  { r: 5, t: 'Couple', title: 'Felt safe and welcome', text: 'Couple friendly as promised, no hassle at check-in with our IDs. Room was cleaned daily.', topics: ['Friendly staff', 'Cleanliness'] },
  { r: 4, t: 'Business', title: 'Smooth check-in', text: 'Checked in within five minutes. GST invoice was emailed the same day. Good restaurants nearby.', topics: ['Good location', 'Friendly staff'] },
  { r: 2, t: 'Solo', title: 'AC needed servicing', text: 'The AC was weak on the first night. They moved me to another room the next day, which was much better.', topics: [] },
]
const sampleNames = ['Aarav K.', 'Priya S.', 'Rohit M.', 'Sneha T.', 'Vikas R.', 'Meera P.', 'Imran A.', 'Kavya N.']

function sampleReviews(h: Hotel): Review[] {
  if (!SHOW_SAMPLE_REVIEWS) return []
  let seed = 0
  for (const ch of h.slug) seed = (seed * 31 + ch.charCodeAt(0)) % 9973
  const now = new Date()
  return samples.map((_, i) => {
    const k = (seed + i * 3) % samples.length
    const pick = samples[k]
    const d = new Date(now.getFullYear(), now.getMonth() - ((seed + i) % 6), 1 + ((seed + i * 5) % 27))
    return {
      id: `sample-${h.slug}-${i}`,
      hotel_slug: h.slug,
      name: sampleNames[(seed + i) % sampleNames.length],
      rating: pick.r,
      traveller: pick.t,
      room: h.rooms[(seed + i) % h.rooms.length]?.name,
      stay_month: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      title: pick.title,
      text: pick.text,
      topics: pick.topics,
      verified: true,
      sample: true,
      created_at: d.toISOString(),
    }
  })
}

/* ---------- read / write ---------- */

export async function listReviews(h: Hotel): Promise<Review[]> {
  let own: Review[] = []
  if (isDemoMode || !supabase) {
    own = readLocal().filter((r) => r.hotel_slug === h.slug)
  } else {
    const { data, error } = await supabase.from('reviews').select('*').eq('hotel_slug', h.slug).order('created_at', { ascending: false })
    if (!error && data) own = data as Review[]
  }
  return [...own, ...sampleReviews(h)].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function addReview(r: NewReview): Promise<Review> {
  const row: Review = { ...r, id: crypto.randomUUID(), created_at: new Date().toISOString() }
  if (isDemoMode || !supabase) {
    try {
      localStorage.setItem(KEY, JSON.stringify([row, ...readLocal()]))
    } catch {
      throw new Error('Could not save your review in this browser.')
    }
    return row
  }
  const { data, error } = await supabase.from('reviews').insert(row).select().single()
  if (error) throw new Error(error.message)
  return data as Review
}

/* ---------- summary numbers ---------- */

/** Share of ratings per level, from the hotel's overall score plus the reviews written here. */
export function ratingSummary(h: Hotel, own: Review[]) {
  const real = own.filter((r) => !r.sample)
  const total = h.reviews + real.length
  const avg = total ? (h.rating * h.reviews + real.reduce((s, r) => s + r.rating, 0)) / total : h.rating
  const r = h.rating
  const base = [
    Math.max(1, (5 - r) * 4), // 1 star
    Math.max(1, (5 - r) * 6), // 2
    Math.max(3, (5 - r) * 14), // 3
    0, // 4 (rest)
    Math.max(10, (r - 3.4) * 55), // 5
  ]
  base[3] = Math.max(5, 100 - base[0] - base[1] - base[2] - base[4])
  const counts = base.map((p) => (p / 100) * h.reviews)
  real.forEach((x) => (counts[x.rating - 1] += 1))
  const sum = counts.reduce((a, b) => a + b, 0) || 1
  const pct = counts.map((c) => Math.round((c / sum) * 100))
  return {
    avg: Math.round(avg * 10) / 10,
    total,
    levels: [
      { label: 'Excellent', pct: pct[4] },
      { label: 'Very Good', pct: pct[3] },
      { label: 'Average', pct: pct[2] },
      { label: 'Poor', pct: pct[1] },
      { label: 'Bad', pct: pct[0] },
    ],
  }
}
