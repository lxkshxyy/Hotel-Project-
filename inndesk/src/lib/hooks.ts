import { useMemo } from 'react'
import { useSession } from '../context/Session'
import { getMarks, listListings, listReservations, useData, type DeskMark } from './store'
import { todayISO } from './format'
import type { Listing, Reservation } from './types'

export function useListings() {
  const { owner } = useSession()
  return useData(() => (owner ? listListings(owner.id) : Promise.resolve([] as Listing[])), [owner?.id])
}

/** Reservations at the owner's published properties, with the desk status worked out. */
export function useReservations(listings: Listing[] | undefined) {
  const slugs = useMemo(() => (listings ?? []).filter((l) => l.slug && l.status !== 'draft').map((l) => l.slug), [listings])
  const r = useData(() => listReservations(slugs), [slugs.join(',')])
  const marks = useData(async () => getMarks(), [])
  const list = useMemo(() => (r.data?.list ?? []).map((x) => ({ ...x, desk: deskStatus(x, marks.data?.[x.id]) })), [r.data, marks.data])
  return { list, offline: !!r.data?.offline, loading: r.data === undefined }
}

export type Desk = 'upcoming' | 'in-house' | 'departed' | 'cancelled' | 'no-show'
export type ResvRow = Reservation & { desk: Desk }

export function deskStatus(r: Reservation, mark?: DeskMark): Desk {
  if (r.status === 'cancelled') return 'cancelled'
  if (mark === 'no-show') return 'no-show'
  if (mark === 'checked-out') return 'departed'
  if (mark === 'checked-in') return 'in-house'
  const t = todayISO()
  if (r.check_out <= t) return 'departed'
  if (r.check_in <= t) return 'in-house'
  return 'upcoming'
}
