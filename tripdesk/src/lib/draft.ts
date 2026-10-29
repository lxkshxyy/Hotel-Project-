import { useEffect, useState } from 'react'
import type { QuoteItem } from './types'

/* The quote being put together, kept in this browser until it is saved. */
const KEY = 'tripdesk.quote.draft'
const EVT = 'tripdesk-draft'

export function readDraft(): QuoteItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
export function writeDraft(items: QuoteItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVT))
}
export const addToDraft = (i: QuoteItem) => writeDraft([...readDraft().filter((x) => !(x.hotelSlug === i.hotelSlug && x.roomId === i.roomId && x.checkIn === i.checkIn)), i])

export function useDraft() {
  const [items, setItems] = useState(readDraft)
  useEffect(() => {
    const on = () => setItems(readDraft())
    window.addEventListener(EVT, on)
    return () => window.removeEventListener(EVT, on)
  }, [])
  return items
}
