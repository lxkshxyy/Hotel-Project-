import { stepDone, steps } from './listing'
import type { Listing } from './types'

const tabSteps = steps.filter((s) => s.id !== 'review')

/** How complete the listing is, out of 100: sections done (70), photos (20), a full description (10). */
export function contentScore(l: Listing) {
  const sections = tabSteps.filter((s) => stepDone(l, s.id)).length
  return Math.round((sections / tabSteps.length) * 70 + Math.min(l.photos.length, 10) * 2 + ((l.basics.description ?? '').trim().length >= 100 ? 10 : 0))
}
