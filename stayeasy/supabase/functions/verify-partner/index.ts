// Checks a hotel owner's GSTIN, PAN and bank account with Cashfree Secure ID (Verification Suite)
// and records the outcome in partner_verifications. Called by InnDesk when the owner saves the
// Finance & Legal step, and by the "Check again" button on Property Information → Finance.
//
// Secrets: CASHFREE_VRS_CLIENT_ID, CASHFREE_VRS_CLIENT_SECRET, CASHFREE_VRS_ENV (sandbox | production),
// CASHFREE_VRS_PUBLIC_KEY (PEM, needed because Supabase functions have no fixed IP to whitelist),
// PAYOUT_ACCOUNT_KEY (32+ random characters; encrypts full bank account numbers at rest).
import { admin, caller, Fail, json, serve } from '../_shared/server.ts'

type Kind = 'gstin' | 'pan' | 'bank'
type Status = 'verified' | 'review' | 'failed'
interface Outcome {
  kind: Kind
  status: Status
  message: string
  notes: string[]
  details: Record<string, string>
}

const MAX_TRIES_A_DAY = 5
const GOOD = ['DIRECT_MATCH', 'GOOD_PARTIAL_MATCH']

/* ---------------- Cashfree ---------------- */

const cfBase = () => (Deno.env.get('CASHFREE_VRS_ENV') === 'production' ? 'https://api.cashfree.com/verification' : 'https://sandbox.cashfree.com/verification')

/** x-cf-signature: "clientId.unixSeconds" encrypted with Cashfree's public key (RSA-OAEP, SHA-1), base64. [CONFIRM] against the Cashfree 2FA guide. */
async function signature(clientId: string) {
  const pem = Deno.env.get('CASHFREE_VRS_PUBLIC_KEY')
  if (!pem) return undefined
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, '')), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash: 'SHA-1' }, false, ['encrypt'])
  const data = new TextEncoder().encode(`${clientId}.${Math.floor(Date.now() / 1000)}`)
  const sig = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data))
  return btoa(String.fromCharCode(...sig))
}

async function cashfree<T>(path: string, body: unknown): Promise<T> {
  const id = Deno.env.get('CASHFREE_VRS_CLIENT_ID')
  const secret = Deno.env.get('CASHFREE_VRS_CLIENT_SECRET')
  if (!id || !secret) throw new Fail(503, 'Automatic verification isn’t switched on yet. Our team will check your details.')
  const sig = await signature(id)
  const r = await fetch(`${cfBase()}${path}`, {
    method: 'POST',
    headers: { 'x-client-id': id, 'x-client-secret': secret, 'x-api-version': '2022-10-26', 'Content-Type': 'application/json', ...(sig ? { 'x-cf-signature': sig } : {}) },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    console.error('Cashfree', path, r.status, data)
    // 4xx with a message is about the input (bad format, unknown IFSC…); anything else is on their side.
    if (r.status >= 400 && r.status < 500 && (data as { message?: string }).message) throw new Fail(422, (data as { message: string }).message)
    throw new Fail(502, 'The verification service didn’t respond. Please try again in a few minutes.')
  }
  return data as T
}

async function nameScore(a: string, b: string) {
  if (!a.trim() || !b.trim()) return { score: 0, reason: 'NO_MATCH' }
  const r = await cashfree<{ score?: number; reason?: string }>('/name-match', { verification_id: `nm-${crypto.randomUUID().slice(0, 30)}`, name_1: a, name_2: b })
  return { score: Number(r.score ?? 0), reason: r.reason ?? '' }
}

/* ---------------- checks ---------------- */

interface Legal {
  legalName?: string
  pan?: string
  gstin?: string
  hasGstin?: boolean | null
  ifsc?: string
  payoutName?: string
  accountLast4?: string
}
interface Location {
  state?: string
  pincode?: string
}

async function checkGstin(g: Legal, loc: Location): Promise<Outcome> {
  const gstin = (g.gstin ?? '').trim().toUpperCase()
  if (!gstin) throw new Fail(400, 'Add your GSTIN first.')
  const r = await cashfree<{
    valid?: boolean
    message?: string
    legal_name_of_business?: string
    trade_name_of_business?: string
    gst_in_status?: string
    taxpayer_type?: string
    date_of_registration?: string
    principal_place_address?: string
    principal_place_split_address?: { state?: string; pincode?: string }
    additional_address_array?: { split_address?: { state?: string; pincode?: string } }[]
  }>('/gstin', { GSTIN: gstin, business_name: g.legalName ?? '' })
  const details: Record<string, string> = {
    'Legal name on GST': r.legal_name_of_business ?? '',
    'Trade name': r.trade_name_of_business ?? '',
    'GST status': r.gst_in_status ?? '',
    'Taxpayer type': r.taxpayer_type ?? '',
    'Registered on': r.date_of_registration ?? '',
    'Principal address': r.principal_place_address ?? '',
  }
  if (!r.valid) return { kind: 'gstin', status: 'failed', message: 'This GSTIN isn’t registered with the GST department.', notes: [], details }
  if ((r.gst_in_status ?? '').toLowerCase() !== 'active') return { kind: 'gstin', status: 'failed', message: `This GSTIN is ${r.gst_in_status || 'not active'} on the GST portal.`, notes: [], details }

  const notes: string[] = []
  let review = false
  // Characters 3–12 of a GSTIN are the PAN it was issued to.
  if (g.pan && gstin.slice(2, 12) !== g.pan.trim().toUpperCase()) {
    review = true
    notes.push('The GSTIN was issued to a different PAN than the one you entered.')
  }
  const nm = await nameScore(g.legalName ?? '', r.legal_name_of_business ?? '')
  details['Name match'] = `${Math.round(nm.score * 100)}%`
  if (nm.score < 0.8) {
    review = true
    notes.push(`The legal name on GST is “${r.legal_name_of_business}”, which doesn’t match “${g.legalName}”.`)
  }
  // A hotel charges GST in the state where it stands, so it needs a GSTIN for that state.
  const places = [r.principal_place_split_address, ...(r.additional_address_array ?? []).map((a) => a.split_address)].filter(Boolean) as { state?: string; pincode?: string }[]
  const norm = (s?: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
  if (loc.state && places.length && !places.some((p) => norm(p.state) === norm(loc.state))) {
    review = true
    notes.push(`This GSTIN is registered in ${places[0].state}, but the property is in ${loc.state}. A hotel needs a GSTIN for the state it is in.`)
  }
  if (loc.pincode && places.length && !places.some((p) => String(p.pincode ?? '') === loc.pincode)) notes.push('The property’s PIN code isn’t one of the addresses on this GST registration. Add it as an additional place of business if it’s missing.')
  return { kind: 'gstin', status: review ? 'review' : 'verified', message: review ? 'GSTIN is active, but some details need a look.' : 'GSTIN is active and matches your details.', notes, details }
}

async function checkPan(g: Legal): Promise<Outcome> {
  const pan = (g.pan ?? '').trim().toUpperCase()
  if (!pan) throw new Fail(400, 'Add your PAN first.')
  const r = await cashfree<{ valid?: boolean; registered_name?: string; type?: string; pan_status?: string; pan_status_desc?: string; name_match_result?: string; name_match_score?: string | number }>('/pan', { pan, name: g.legalName ?? '' })
  const details: Record<string, string> = { 'Name on PAN records': r.registered_name ?? '', 'PAN type': r.type ?? '', 'PAN status': r.pan_status_desc ?? r.pan_status ?? '', 'Name match': r.name_match_score != null ? `${Math.round(Number(r.name_match_score))}%` : '' }
  if (!r.valid || r.pan_status !== 'VALID') return { kind: 'pan', status: 'failed', message: r.pan_status ? `This PAN is ${r.pan_status.toLowerCase()} in Income Tax records.` : 'This PAN wasn’t found in Income Tax records.', notes: [], details }
  if (!GOOD.includes(r.name_match_result ?? '')) return { kind: 'pan', status: 'review', message: 'PAN is valid, but the name doesn’t match.', notes: [`Income Tax records show “${r.registered_name}”, not “${g.legalName}”.`], details }
  return { kind: 'pan', status: 'verified', message: 'PAN is valid and the name matches.', notes: [], details }
}

async function checkBank(g: Legal, account: string): Promise<{ outcome: Outcome; ok: boolean; nameAtBank: string; bankName: string }> {
  const acct = account.replace(/\D/g, '')
  if (acct.length < 9 || acct.length > 18) throw new Fail(400, 'Enter the full bank account number (9 to 18 digits).')
  if (g.accountLast4 && acct.slice(-4) !== g.accountLast4) throw new Fail(400, 'This account number doesn’t match the one saved on the listing.')
  const holder = (g.payoutName || g.legalName || '').trim()
  const r = await cashfree<{ account_status?: string; account_status_code?: string; name_at_bank?: string; bank_name?: string; branch?: string; name_match_result?: string; name_match_score?: string; utr?: string }>('/bank-account/sync', { bank_account: acct, ifsc: (g.ifsc ?? '').toUpperCase(), name: holder })
  const details: Record<string, string> = { 'Name at bank': r.name_at_bank ?? '', Bank: r.bank_name ?? '', Branch: r.branch ?? '', 'Name match': r.name_match_score ? `${Math.round(Number(r.name_match_score))}%` : '', 'Account ending': acct.slice(-4) }
  const why: Record<string, string> = {
    INVALID_ACCOUNT_FAIL: 'This account number doesn’t exist at that bank.',
    ACCOUNT_BLOCKED: 'This account is blocked or frozen. Use another account.',
    INVALID_IFSC_FAIL: 'The IFSC code is wrong.',
    NRE_ACCOUNT_FAIL: 'NRE accounts can’t receive payouts. Use a resident savings or current account.',
  }
  if (r.account_status !== 'VALID') return { outcome: { kind: 'bank', status: 'failed', message: why[r.account_status_code ?? ''] ?? 'The bank couldn’t confirm this account.', notes: [], details }, ok: false, nameAtBank: '', bankName: '' }
  const good = GOOD.includes(r.name_match_result ?? '')
  return {
    outcome: { kind: 'bank', status: good ? 'verified' : 'review', message: good ? 'Bank account confirmed in your name.' : 'The account exists, but it’s in another name.', notes: good ? [] : [`The bank has this account under “${r.name_at_bank}”, not “${holder}”. Payouts stay on hold until our team checks it.`], details },
    ok: true,
    nameAtBank: r.name_at_bank ?? '',
    bankName: r.bank_name ?? '',
  }
}

/* ---------------- storing ---------------- */

/** AES-GCM with a key from PAYOUT_ACCOUNT_KEY; returns base64(iv + ciphertext). */
async function seal(text: string) {
  const secret = Deno.env.get('PAYOUT_ACCOUNT_KEY')
  if (!secret || secret.length < 32) throw new Fail(503, 'Bank verification isn’t switched on yet. Our team will check your account.')
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)))
  return btoa(String.fromCharCode(...iv, ...ct))
}

serve(async (req) => {
  const user = await caller(req)
  const body = (await req.json().catch(() => ({}))) ?? {}
  const listingId = String(body.listing_id ?? '')
  const kinds: Kind[] = (Array.isArray(body.kinds) ? body.kinds : []).filter((k: string): k is Kind => k === 'gstin' || k === 'pan' || k === 'bank')
  if (!listingId || !kinds.length) throw new Fail(400, 'Nothing to check.')
  if (kinds.includes('bank') && !body.bank_account) throw new Fail(400, 'Enter the full bank account number to check it.')

  const db = admin()
  const { data: listing } = await db.from('partner_listings').select('id, owner_id, data').eq('id', listingId).maybeSingle()
  if (!listing || listing.owner_id !== user.id) throw new Fail(404, 'Property not found.')
  const g = (listing.data?.legal ?? {}) as Legal
  const loc = (listing.data?.location ?? {}) as Location

  // Each check costs money, so cap tries per listing per check per day.
  const today = new Date().toISOString().slice(0, 10)
  const { data: past } = await db.from('partner_verifications').select('kind, tries, tries_on').eq('listing_id', listingId)
  const tries = (k: Kind) => {
    const p = past?.find((x) => x.kind === k)
    return p && p.tries_on === today ? p.tries : 0
  }
  const over = kinds.find((k) => tries(k) >= MAX_TRIES_A_DAY)
  if (over) throw new Fail(429, `You’ve checked your ${over === 'bank' ? 'bank account' : over.toUpperCase()} ${MAX_TRIES_A_DAY} times today. Try again tomorrow or contact the partner team.`)

  const out: Outcome[] = []
  for (const k of kinds) {
    let o: Outcome
    try {
      if (k === 'gstin') {
        if (g.hasGstin === false) continue
        o = await checkGstin(g, loc)
      } else if (k === 'pan') o = await checkPan(g)
      else {
        const b = await checkBank(g, String(body.bank_account))
        o = b.outcome
        if (b.ok) {
          await db.from('partner_payout_accounts').upsert({ listing_id: listingId, owner_id: user.id, account_cipher: await seal(String(body.bank_account).replace(/\D/g, '')), account_last4: String(body.bank_account).replace(/\D/g, '').slice(-4), ifsc: (g.ifsc ?? '').toUpperCase(), name_at_bank: b.nameAtBank, bank_name: b.bankName, status: o.status, checked_at: new Date().toISOString() })
        }
      }
    } catch (e) {
      // Input problems (422) are recorded as a failed check; outages are passed back without using a try.
      if (e instanceof Fail && e.status === 422) o = { kind: k, status: 'failed', message: e.message, notes: [], details: {} }
      else throw e
    }
    await db.from('partner_verifications').upsert({ listing_id: listingId, kind: k, status: o.status, message: o.message, notes: o.notes, details: o.details, checked_at: new Date().toISOString(), tries: tries(k) + 1, tries_on: today })
    out.push(o)
  }
  return json(200, { results: out })
})
