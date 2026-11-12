import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { useSession } from '../context/Session'
import { getListing, saveListing } from '../lib/store'
import type { Listing } from '../lib/types'
import { btnOutline, btnSolid } from './info/kit'

const pages = {
  basics: lazy(() => import('./info/Basics')),
  rooms: lazy(() => import('./info/Rooms')),
  amenities: lazy(() => import('./info/Amenities')),
  inclusions: lazy(() => import('./info/Inclusions')),
  photos: lazy(() => import('./info/Photos')),
  policies: lazy(() => import('./info/Policies')),
  'content-score': lazy(() => import('./info/ContentScore')),
  finance: lazy(() => import('./info/Finance')),
  settings: lazy(() => import('./info/Settings')),
}
export type InfoPage = keyof typeof pages

/** Property Information pages: the listing is edited here and stored with Save. */
export default function PropertyInfo() {
  const { id = '', page = '' } = useParams()
  const { owner } = useSession()
  const [l, setL] = useState<Listing | null | undefined>(undefined)
  const saved = useRef<Listing | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(0)

  useEffect(() => {
    if (!owner) return
    let live = true
    getListing(owner.id, id).then((x) => {
      if (!live) return
      saved.current = x
      setL(x)
      setDirty(false)
    })
    return () => {
      live = false
    }
  }, [owner, id])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(0), 2600)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const store = useCallback(async (x: Listing) => {
    setBusy(true)
    setError('')
    try {
      const out = await saveListing(x)
      saved.current = out
      setL(out)
      setDirty(false)
      setToast((n) => n + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save. Try again.')
    } finally {
      setBusy(false)
    }
  }, [])

  const set = useCallback((fn: (l: Listing) => Listing) => {
    setL((x) => (x ? fn(x) : x))
    setDirty(true)
  }, [])
  /** For one-click changes (ticks, dialogs): apply and save straight away. */
  const cur = useRef(l)
  cur.current = l
  const commit = useCallback(
    async (fn: (l: Listing) => Listing) => {
      if (!cur.current) return
      const next = fn(cur.current)
      cur.current = next
      setL(next)
      await store(next)
    },
    [store],
  )

  if (!(page in pages)) return <Navigate to={`/app/properties/${id}`} replace />
  if (l === undefined) return <Spinner />
  if (!l) return <Navigate to="/app/properties" replace />

  const Page = pages[page as InfoPage]
  const base = `/app/properties/${id}`

  return (
    <div className="min-h-[calc(100dvh-68px)] bg-white">
      <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-28 sm:px-8">
        <Suspense fallback={<Spinner />}>
          <Page l={l} set={set} commit={commit} base={base} />
        </Suspense>
      </div>

      <AnimatePresence>
        {(dirty || error) && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ duration: 0.2 }} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 shadow-[0_-6px_18px_-12px_rgba(26, 44, 91,0.35)] backdrop-blur max-md:bottom-[64px] md:left-[96px]">
            <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
              <span className={`min-w-0 text-[13.5px] ${error ? 'text-alert' : 'text-ink-700'}`}>{error || 'You have unsaved changes.'}</span>
              <div className="flex shrink-0 gap-3">
                <button
                  type="button"
                  className={btnOutline}
                  disabled={busy}
                  onClick={() => {
                    setL(saved.current)
                    setDirty(false)
                    setError('')
                  }}
                >
                  Cancel
                </button>
                <button type="button" className={btnSolid} disabled={busy} onClick={() => l && store(l)}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast > 0 && (
          <motion.div key={toast} role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="fixed bottom-24 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-lg bg-pine-900 px-4 py-2.5 text-[14px] font-medium text-white shadow-xl">
            <CircleCheck className="h-4 w-4 text-brass-200" aria-hidden="true" /> Changes saved
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
