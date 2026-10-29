import { useEffect, useRef, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import { useAccount } from '../../context/AccountContext'
import { useAuth } from '../../context/AuthContext'
import { bizRules, bookingForOptions, type BookingFor } from '../../data/business'
import { addDays, todayISO } from '../../lib/format'

/** Only signed-in users with the Business account switched on can open the corporate panel. */
export function RequireBusiness({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { company, isBusiness, switchTo } = useAccount()
  const loc = useLocation()
  // A linked user opening a business link lands in their business account.
  // Only on first open: when they switch to Personal from inside the panel, we must not switch them back.
  const checked = useRef(false)
  useEffect(() => {
    if (loading || checked.current) return
    checked.current = true
    if (user && company && !isBusiness) switchTo('business')
  }, [loading, user, company, isBusiness, switchTo])
  if (loading) return <Spinner />
  if (!user || !company) return <Navigate to={`/login?type=business&next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  if (!isBusiness) return <Spinner />
  return <>{children}</>
}

export interface BizSearch {
  city: string
  checkIn: string
  checkOut: string
  rooms: number
  bookingFor: BookingFor
  cat: string
  /** Name of the primary traveller picked in "Booking for". */
  traveller?: string
  adults?: number
  children?: number
  /** Solo woman traveller / women travellers: highlight women-friendly stays. */
  women?: boolean
}

export function readBizSearch(q: URLSearchParams): BizSearch {
  const checkIn = q.get('in') || addDays(todayISO(), 7)
  let checkOut = q.get('out') || addDays(checkIn, 2)
  if (checkOut <= checkIn) checkOut = addDays(checkIn, 1)
  const r = Number(q.get('rooms'))
  const f = q.get('for') as BookingFor | null
  return {
    city: q.get('city') || '',
    checkIn,
    checkOut,
    rooms: Number.isFinite(r) && r >= 1 ? Math.min(r, bizRules.maxRooms) : 1,
    bookingFor: f && bookingForOptions.includes(f) ? f : 'Myself',
    cat: q.get('cat') || '',
    traveller: q.get('who') || undefined,
    adults: Number(q.get('adults')) || undefined,
    children: Number(q.get('children')) || undefined,
    women: q.get('women') === '1',
  }
}

export function bizQuery(s: BizSearch, extra: Record<string, string> = {}) {
  const q = new URLSearchParams()
  if (s.city) q.set('city', s.city)
  q.set('in', s.checkIn)
  q.set('out', s.checkOut)
  q.set('rooms', String(s.rooms))
  q.set('for', s.bookingFor)
  if (s.cat) q.set('cat', s.cat)
  if (s.traveller) q.set('who', s.traveller)
  if (s.adults) q.set('adults', String(s.adults))
  if (s.children) q.set('children', String(s.children))
  if (s.women) q.set('women', '1')
  for (const [k, v] of Object.entries(extra)) q.set(k, v)
  return q.toString()
}

export function LimitChip({ over, amount }: { over: boolean; amount?: string }) {
  return over ? (
    <span className="rounded-full bg-[#FFF4EC] px-2.5 py-[3px] text-xs font-bold text-[#9A3412]">Above limit{amount ? ` by ${amount}` : ''}</span>
  ) : (
    <span className="rounded-full bg-leaf-50 px-2.5 py-[3px] text-xs font-bold text-leaf-700">Within limit</span>
  )
}

export function Pill({ children, tone = 'grey' }: { children: ReactNode; tone?: 'grey' | 'navy' | 'solid' | 'warn' }) {
  const cls = {
    grey: 'bg-mist text-ink-700',
    navy: 'bg-navy-50 text-navy-800',
    solid: 'bg-navy-800 text-white',
    warn: 'bg-[#FFF4EC] text-[#9A3412]',
  }[tone]
  return <span className={`rounded-full px-2.5 py-[3px] text-xs font-bold ${cls}`}>{children}</span>
}

export function StatCard({ label, value, note, children }: { label: string; value: ReactNode; note?: ReactNode; children?: ReactNode }) {
  return (
    <div className="card flex flex-col gap-1.5 p-[18px]">
      <span className="text-[13px] font-bold tracking-wide text-ink-500 uppercase">{label}</span>
      <strong className="text-[22px] leading-tight">{value}</strong>
      {note && <span className="text-sm text-ink-700">{note}</span>}
      {children}
    </div>
  )
}

export const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const blob = new Blob(['﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
