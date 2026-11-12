import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ChevronRight, ExternalLink, Search, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { site } from '../config/site'
import { contentScore } from '../lib/score'
import { listReviews, useData } from '../lib/store'
import type { Listing } from '../lib/types'

/**
 * Header bar inside a property: property switcher (search all your properties), rating and
 * content score. Shown on every page of a property.
 */
export function PropertyBar({ l, all }: { l: Listing; all: Listing[] }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  useEffect(() => setOpen(false), [pathname, search])
  useEffect(() => {
    if (!open) return
    setQ('')
    const out = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', out)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', out)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const name = (x: Listing) => x.basics.name.trim() || `${x.basics.propertyType} (unnamed)`
  const n = q.trim().toLowerCase()
  const shown = all.filter((x) => x.status !== 'draft' && (!n || name(x).toLowerCase().includes(n) || x.location.city.toLowerCase().includes(n)))
  const sub = [l.basics.stars ? `${l.basics.stars}-star ${l.basics.propertyType.toLowerCase()}` : l.basics.propertyType, [l.location.area, l.location.city].filter(Boolean).join(', ')].filter(Boolean).join(' | ')
  // Same page for the other property (e.g. Bookings → Bookings).
  const go = (x: Listing) => navigate(pathname.replace(`/app/properties/${l.id}`, `/app/properties/${x.id}`) + search)
  const score = contentScore(l)
  const reviews = useData(() => listReviews(l.slug).catch(() => []), [l.slug]).data ?? []
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0
  const base = `/app/properties/${l.id}`

  return (
    <div className="flex min-w-0 items-center gap-5">
      <div ref={box} className="relative min-w-0">
        <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors ${open ? 'bg-pine-50' : 'hover:bg-paper'}`}>
          <span className="min-w-0">
            <strong className="block max-w-[180px] truncate text-[15.5px] font-bold text-ink-900 sm:max-w-[300px]">{name(l)}</strong>
            <span className="block max-w-[180px] truncate text-[13px] text-ink-500 sm:max-w-[300px]">{sub}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-ink-700 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div role="dialog" aria-label="Switch property" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }} className="fixed inset-x-3 top-[70px] z-50 rounded-xl bg-white shadow-[0_16px_40px_-12px_rgba(26, 44, 91,0.35)] ring-1 ring-line sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:mt-2 sm:w-[400px]">
              <div className="p-3">
                <label className="flex h-11 items-center gap-2 rounded-lg border border-ink-400 px-3 focus-within:border-pine-700 focus-within:ring-1 focus-within:ring-pine-700">
                  <Search className="h-4 w-4 text-ink-500" aria-hidden="true" />
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by property name or city" aria-label="Search by property name or city" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-500" />
                </label>
              </div>
              <ul className="max-h-[300px] overflow-y-auto border-t border-line [scrollbar-width:thin]">
                {shown.map((x) => {
                  const cur = x.id === l.id
                  return (
                    <li key={x.id} className="flex items-center gap-2 border-b border-line px-4 py-3 last:border-b-0 hover:bg-pine-50">
                      <button type="button" onClick={() => (cur ? setOpen(false) : go(x))} className="min-w-0 flex-1 text-left">
                        <span className={`block truncate text-[15.5px] font-semibold ${cur ? 'text-pine-800' : 'text-ink-900'}`}>{name(x)}</span>
                        <span className="block text-[13px] text-ink-500">{[x.location.city, x.location.state || 'India'].filter(Boolean).join(', ')}</span>
                      </button>
                      {cur && <Check className="h-5 w-5 shrink-0 text-pine-800" aria-label="Current property" />}
                      {x.status === 'live' && x.slug && (
                        <a href={`${site.mainSiteUrl}/hotel/${x.slug}`} target="_blank" rel="noreferrer" aria-label={`Open ${name(x)} on ${site.marketplace}`} title={`Open on ${site.marketplace}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-pine-800 hover:bg-white">
                          <ExternalLink className="h-[18px] w-[18px]" aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  )
                })}
                {shown.length === 0 && <li className="px-4 py-4 text-[14px] text-ink-500">No property matches “{q}”.</li>}
              </ul>
              <Link to="/app/properties" className="block border-t border-line py-3.5 text-center text-[15px] font-semibold text-pine-800 no-underline hover:bg-pine-50">
                Add Or View All Listings
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span aria-hidden="true" className="hidden h-10 w-px bg-line lg:block" />
      <Link to={`${base}/reviews`} className="group hidden flex-col no-underline lg:flex">
        <span className="flex items-center gap-1 text-[12.5px] text-ink-500 group-hover:text-pine-800">
          <Star className="h-3.5 w-3.5 fill-pine-700 text-pine-700" aria-hidden="true" /> Ratings <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        {reviews.length ? (
          <span className="text-[17px] font-bold text-ink-900">
            {avg.toFixed(1)}
            <span className="text-[13px] font-medium text-ink-500">/5 · {reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
          </span>
        ) : (
          <span className="text-[17px] font-bold text-ink-900">
            New <span className="text-[13px] font-medium text-ink-500">· no ratings yet</span>
          </span>
        )}
      </Link>
      <Link to={`${base}/info/content-score`} className="group hidden flex-col no-underline lg:flex">
        <span className="flex items-center gap-1 text-[12.5px] text-ink-500 group-hover:text-pine-800">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="#AFDBF5" strokeWidth="3" />
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="#0047AB" strokeWidth="3" strokeDasharray={`${(score / 100) * 40.8} 41`} transform="rotate(-90 8 8)" />
          </svg>
          Content Score <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="text-[19px] font-bold text-ink-900">
          {score}
          <span className="text-[13px] font-medium text-ink-500">/100</span>
        </span>
      </Link>
    </div>
  )
}
