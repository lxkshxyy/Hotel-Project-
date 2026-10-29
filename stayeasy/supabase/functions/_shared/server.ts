// Helpers shared by the StayEasy Supabase functions (Deno).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('SITE_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** A mistake the guest can fix (sold out, price changed…). Sent back as { error } with this status. */
export class Fail extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/** Service-role client: bypasses row security, so every function checks ownership itself. */
export function admin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
}

/** The signed-in user who called the function, from their access token. */
export async function caller(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) throw new Fail(401, 'Please sign in again.')
  const { data, error } = await admin().auth.getUser(token)
  if (error || !data.user) throw new Fail(401, 'Please sign in again.')
  return data.user
}

/** Runs a handler with CORS, JSON errors and no stack traces leaking to the browser. */
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
    try {
      return await handler(req)
    } catch (e) {
      if (e instanceof Fail) return json(e.status, { error: e.message })
      console.error(e)
      return json(500, { error: 'Something went wrong on our side. Please try again in a minute.' })
    }
  })
}

/* ---------------- Razorpay ---------------- */

const rzpAuth = () => {
  const id = Deno.env.get('RAZORPAY_KEY_ID')
  const secret = Deno.env.get('RAZORPAY_KEY_SECRET')
  if (!id || !secret) throw new Fail(503, 'Online payment isn’t available right now. Please choose Pay at hotel.')
  return { id, secret, header: 'Basic ' + btoa(`${id}:${secret}`) }
}

export const razorpayEnabled = () => !!Deno.env.get('RAZORPAY_KEY_ID') && !!Deno.env.get('RAZORPAY_KEY_SECRET')

export async function razorpay<T>(path: string, body?: unknown): Promise<T> {
  const a = rzpAuth()
  const r = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: a.header, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    console.error('Razorpay', path, r.status, data)
    throw new Fail(502, (data as { error?: { description?: string } }).error?.description ?? 'The payment provider didn’t respond. Please try again.')
  }
  return data as T
}

export const razorpayKeyId = () => rzpAuth().id

export async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time compare, so a wrong signature can't be guessed byte by byte. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/* ---------------- email (optional) ---------------- */

/** Sends a booking email through Resend when RESEND_API_KEY and EMAIL_FROM are set. Never throws. */
export async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM')
  if (!key || !from) return false
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    })
    if (!r.ok) console.error('Email not sent', r.status, await r.text())
    return r.ok
  } catch (e) {
    console.error('Email not sent', e)
    return false
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

export function bookingEmail(b: Record<string, unknown>, kind: 'confirmed' | 'cancelled') {
  const site = Deno.env.get('SITE_URL') ?? ''
  const rows = [
    ['Booking ID', String(b.id)],
    ['Hotel', `${b.hotel_name}, ${b.hotel_city}`],
    ['Room', `${b.rooms} × ${b.room_name}`],
    ['Check-in', String(b.check_in)],
    ['Check-out', String(b.check_out)],
    ['Guest', String(b.guest_name)],
    [kind === 'cancelled' ? 'Refund' : b.pay_mode === 'now' ? 'Paid online' : 'Pay at hotel', inr(Number(kind === 'cancelled' ? (b.refund_amount ?? 0) : b.amount))],
  ]
  const title = kind === 'confirmed' ? 'Your stay is confirmed' : 'Your booking is cancelled'
  return {
    subject: `${title} · ${b.hotel_name} · ${b.id}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1b2333">
<h2 style="color:#14306B">${title}</h2>
<table style="width:100%;border-collapse:collapse;font-size:15px">${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#5b6475">${esc(k)}</td><td style="padding:6px 0;font-weight:bold">${esc(v)}</td></tr>`).join('')}</table>
${site ? `<p><a href="${site}/bookings/${esc(String(b.id))}" style="color:#14306B">View or manage your booking</a></p>` : ''}
<p style="color:#5b6475;font-size:13px">Carry a government photo ID for every adult guest.</p></div>`,
  }
}
