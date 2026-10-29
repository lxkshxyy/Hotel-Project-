const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** 2199 → "₹2,199" */
export const inr = (n: number) => `₹${inrFmt.format(Math.round(n))}`

/** Parse "yyyy-mm-dd" as a local date (no timezone shift). */
export function parseISODate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(iso: string, days: number) {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const ms = parseISODate(checkOut).getTime() - parseISODate(checkIn).getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}

/** "Fri, 24 Oct" */
export const shortDate = (iso: string) =>
  parseISODate(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

/** "24 Oct" */
export const dayMonth = (iso: string) => parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export const todayISO = () => toISODate(new Date())

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export const uid = (n = 8) => {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789'
  const b = crypto.getRandomValues(new Uint8Array(n))
  return Array.from(b, (x) => a[x % a.length]).join('')
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
