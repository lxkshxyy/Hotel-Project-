/*
 * Local "publish channel" between the hotel-owner panel (InnDesk) and this site.
 *
 * Runs only inside the Vite dev / preview server on your computer. It keeps partner listings and
 * the bookings made for them in ./.partner-data/*.json so both websites see the same data:
 *   InnDesk  → PUT  /__partner/listings/:slug   (publish, update, pause)
 *   StayEasy → GET  /__partner/listings         (show live partner hotels)
 *   StayEasy → POST /__partner/bookings         (a guest booked a partner hotel)
 *   InnDesk  → GET  /__partner/bookings?slugs=  (owner's reservations)
 *
 * On the live website (Vercel) this file does nothing: both sites use the shared Supabase
 * database instead (see supabase/schema.sql → "Partner panel").
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import type { Connect, Plugin } from 'vite'

interface ListingRow {
  slug: string
  ownerId: string
  published: boolean
  hotel: { slug: string; name: string; city: string } & Record<string, unknown>
  updatedAt: string
}
interface BookingRow {
  id: string
  hotel_slug: string
  status: string
  [k: string]: unknown
}

const DIR = join(process.cwd(), '.partner-data')
const LISTINGS = join(DIR, 'listings.json')
const BOOKINGS = join(DIR, 'bookings.json')
const MAX_BODY = 30 * 1024 * 1024 // photos travel inside the listing in local mode

function read<T>(file: string): T[] {
  try {
    return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T[]) : []
  } catch {
    return []
  }
}
function write(file: string, rows: unknown[]) {
  mkdirSync(DIR, { recursive: true })
  writeFileSync(file, JSON.stringify(rows))
}

/** Only pages served from this computer or the local network may call the channel. */
function allowOrigin(origin: string | undefined) {
  if (!origin) return null
  try {
    const h = new URL(origin).hostname
    return h === 'localhost' || h === '127.0.0.1' || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h) ? origin : null
  } catch {
    return null
  }
}

function body(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('Too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new Error('Bad JSON'))
      }
    })
    req.on('error', reject)
  })
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

const handler: Connect.NextHandleFunction = async (req, res, next) => {
  const url = new URL(req.url ?? '/', 'http://local')
  if (!url.pathname.startsWith('/__partner/')) return next()
  const origin = allowOrigin(req.headers.origin)
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  } else if (req.headers.origin) return send(res, 403, { error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    return res.end()
  }

  try {
    const parts = url.pathname.split('/').filter(Boolean) // ['__partner', 'listings', slug?]
    const [, kind, id] = parts

    if (kind === 'health') return send(res, 200, { ok: true })

    if (kind === 'listings') {
      const rows = read<ListingRow>(LISTINGS)
      if (req.method === 'GET') {
        const owner = url.searchParams.get('owner')
        return send(res, 200, owner ? rows.filter((r) => r.ownerId === owner) : rows.filter((r) => r.published))
      }
      if (!id || !/^[a-z0-9-]{3,80}$/.test(id)) return send(res, 400, { error: 'Bad listing id' })
      const existing = rows.find((r) => r.slug === id)
      if (req.method === 'PUT') {
        const b = (await body(req)) as Partial<ListingRow>
        if (!b.ownerId || !b.hotel || b.hotel.slug !== id) return send(res, 400, { error: 'ownerId and hotel are required' })
        if (existing && existing.ownerId !== b.ownerId) return send(res, 403, { error: 'This listing belongs to another owner' })
        const row: ListingRow = { slug: id, ownerId: b.ownerId, published: !!b.published, hotel: b.hotel, updatedAt: new Date().toISOString() }
        write(LISTINGS, existing ? rows.map((r) => (r.slug === id ? row : r)) : [...rows, row])
        return send(res, 200, row)
      }
      if (req.method === 'DELETE') {
        if (existing && existing.ownerId !== url.searchParams.get('owner')) return send(res, 403, { error: 'Not your listing' })
        write(LISTINGS, rows.filter((r) => r.slug !== id))
        return send(res, 200, { ok: true })
      }
    }

    if (kind === 'bookings') {
      const rows = read<BookingRow>(BOOKINGS)
      if (req.method === 'GET') {
        const slugs = (url.searchParams.get('slugs') ?? '').split(',').filter(Boolean)
        return send(res, 200, rows.filter((r) => slugs.includes(r.hotel_slug)))
      }
      if (req.method === 'POST') {
        const b = (await body(req)) as BookingRow
        if (!b.id || !b.hotel_slug) return send(res, 400, { error: 'id and hotel_slug are required' })
        // Only bookings for partner hotels are kept here.
        if (!read<ListingRow>(LISTINGS).some((l) => l.slug === b.hotel_slug)) return send(res, 200, { ignored: true })
        const exists = rows.some((r) => r.id === b.id)
        write(BOOKINGS, exists ? rows.map((r) => (r.id === b.id ? { ...r, ...b } : r)) : [b, ...rows])
        return send(res, 200, { ok: true })
      }
    }
    return send(res, 404, { error: 'Not found' })
  } catch (e) {
    return send(res, 500, { error: e instanceof Error ? e.message : 'Error' })
  }
}

export function partnerBridge(): Plugin {
  return {
    name: 'stayeasy-partner-bridge',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}
