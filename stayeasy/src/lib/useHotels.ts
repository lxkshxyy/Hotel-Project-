import { useEffect, useState } from 'react'
import type { Hotel } from '../data/types'
import { getHotels } from './api'

/**
 * Hotels that are listed and published right now (InnDesk listings; the Supabase `hotels`
 * table on the live site). `null` while loading. Empty means every place shows "Coming soon".
 */
export function useHotels(): Hotel[] | null {
  const [list, setList] = useState<Hotel[] | null>(null)
  useEffect(() => {
    let live = true
    getHotels()
      .then((h) => live && setList(h))
      .catch(() => live && setList([]))
    return () => {
      live = false
    }
  }, [])
  return list
}

/** Star category: the owner's own rating from InnDesk, otherwise the brand's tier. 0 = not rated. */
export function hotelStars(h: Hotel): number {
  const s = h.partner?.stars
  if (s && s >= 1 && s <= 5) return Math.round(s)
  if (h.brand === 'Partner') return 0
  return h.brand === 'Prime' ? 4 : h.brand === 'Lite' ? 2 : 3
}
