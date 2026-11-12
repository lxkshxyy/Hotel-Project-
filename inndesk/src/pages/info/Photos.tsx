import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ImagePlus, Images, Maximize2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { photoCategories } from '../../components/PhotoManager'
import type { ListingPhoto } from '../../lib/types'
import { btnOutline, btnSolid, Card, Dialog, PageTitle, type InfoProps } from './kit'

export default function Photos({ l, commit, base }: InfoProps) {
  const [view, setView] = useState<{ title: string; list: ListingPhoto[]; i: number } | null>(null)
  const [picking, setPicking] = useState(false)
  const cover = l.photos[0]
  const cats = photoCategories(l)
  const inCat = (key: string) => l.photos.filter((p) => p.labels?.includes(key))
  const rooms = cats.filter((c) => c.group === 'Rooms').map((c) => ({ c, list: inCat(c.key) }))
  const tagged = cats.filter((c) => c.group !== 'Rooms').map((c) => ({ c, list: inCat(c.key) })).filter((x) => x.list.length)
  const untagged = l.photos.filter((p) => !p.labels?.length)
  const upload = `${base}/edit?step=photos`

  const Thumb = ({ label, list }: { label: string; list: ListingPhoto[] }) => (
    <button type="button" onClick={() => list.length && setView({ title: label, list, i: 0 })} disabled={!list.length} className="group w-[116px] shrink-0 text-left disabled:cursor-default">
      <span className="relative block h-[76px] w-[116px] overflow-hidden rounded-md bg-[#E6EEF7]">
        {list[0] ? <img src={list[0].url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : <ImagePlus className="absolute inset-0 m-auto h-6 w-6 text-ink-400" aria-hidden="true" />}
        <span className="absolute top-1 right-1 flex items-center gap-1 rounded bg-ink-900/60 px-1.5 text-[11.5px] font-semibold text-white">
          {list.length} <Images className="h-3 w-3" aria-hidden="true" />
        </span>
      </span>
      <span className="mt-1.5 block text-[13.5px] leading-snug text-ink-900">{label}</span>
    </button>
  )

  return (
    <>
      <PageTitle title="Photos & Videos" count={l.photos.length} l={l}>
        <Link to={upload} className="text-[14.5px] font-semibold text-pine-800 no-underline hover:underline">
          Reorder
        </Link>
        <button type="button" disabled={!l.photos.length} onClick={() => setView({ title: 'All photos', list: l.photos, i: 0 })} className={`${btnOutline} h-9`}>
          View All
        </button>
        <Link to={upload} className={`${btnSolid} h-9 no-underline`}>
          Upload More
        </Link>
      </PageTitle>

      {!cover ? (
        <Card className="mt-6 flex flex-col items-center gap-3 px-4 py-16 text-center">
          <ImagePlus className="h-9 w-9 text-pine-700" aria-hidden="true" />
          <strong className="text-[17px] font-semibold text-ink-900">No photos yet</strong>
          <Link to={upload} className={`${btnSolid} no-underline`}>
            Upload photos
          </Link>
        </Card>
      ) : (
        <div className="relative mt-5">
          <button type="button" onClick={() => setView({ title: 'All photos', list: l.photos, i: 0 })} className="group relative block h-[220px] w-full overflow-hidden rounded-lg sm:h-[320px]">
            <img src={cover.url} alt="Property cover photo" className="h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-b from-ink-900/55 via-transparent to-transparent" />
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[15px] font-semibold text-white opacity-90 group-hover:opacity-100">
              <Maximize2 className="h-6 w-6" aria-hidden="true" /> Click to View
            </span>
          </button>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 py-2.5 text-[14px] text-white">
            <span>Property cover photo{cover.labels?.length ? ` (${cats.filter((c) => cover.labels!.includes(c.key)).map((c) => c.label).join(', ')})` : ''}</span>
            <button type="button" onClick={() => setPicking(true)} className="pointer-events-auto underline underline-offset-2">
              Change
            </button>
          </div>

          <Card className="relative mx-0 -mt-6 p-4 sm:mx-6 sm:-mt-10 sm:p-6">
            <h2 className="text-[17px] font-medium text-ink-900">Photos &amp; Videos assigned to the rooms</h2>
            <p className="text-[13px] text-ink-500">Photos help customers see what the room looks like</p>
            <div className="mt-3 flex flex-wrap gap-4">
              {rooms.length ? rooms.map(({ c, list }) => <Thumb key={c.key} label={c.label} list={list} />) : <p className="text-[14px] text-ink-700">No rooms yet.</p>}
            </div>
            <h2 className="mt-7 text-[17px] font-medium text-ink-900">Photos &amp; Videos tagged</h2>
            <div className="mt-3 flex flex-wrap gap-4">
              {tagged.map(({ c, list }) => (
                <Thumb key={c.key} label={c.label} list={list} />
              ))}
              {untagged.length > 0 && <Thumb label="Not tagged yet" list={untagged} />}
              {!tagged.length && !untagged.length && <p className="text-[14px] text-ink-700">No tagged photos yet.</p>}
            </div>
          </Card>
        </div>
      )}

      <AnimatePresence>
        {view && <Viewer key="viewer" {...view} onClose={() => setView(null)} />}
        {picking && (
          <Dialog title="Choose the cover photo" onClose={() => setPicking(false)} wide>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {l.photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    commit((x) => ({ ...x, photos: [p, ...x.photos.filter((y) => y.id !== p.id)] }))
                    setPicking(false)
                  }}
                  className={`relative overflow-hidden rounded-md ring-offset-2 hover:ring-2 hover:ring-pine-700 ${i === 0 ? 'ring-2 ring-brass-500' : ''}`}
                >
                  <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
                  {i === 0 && <span className="absolute top-1 left-1 rounded bg-brass-500 px-1.5 text-[11px] font-bold text-pine-950">Cover</span>}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-ink-500">The cover is the first photo guests see. A wide photo of the building or your best room works well.</p>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  )
}

function Viewer({ title, list, i: start, onClose }: { title: string; list: ListingPhoto[]; i: number; onClose: () => void }) {
  const [i, setI] = useState(start)
  const go = (d: number) => setI((x) => (x + d + list.length) % list.length)
  useEffect(() => {
    const k = (e: KeyboardEvent) => (e.key === 'Escape' ? onClose() : e.key === 'ArrowRight' ? go(1) : e.key === 'ArrowLeft' ? go(-1) : null)
    document.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', k)
      document.body.style.overflow = prev
    }
  }) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col bg-ink-900/95 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[15px]">
          {title} · {i + 1} / {list.length}
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10">
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12">
        <img src={list[i].url} alt="" className="max-h-full max-w-full rounded object-contain" />
        {list.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {list.map((p, j) => (
          <button key={p.id} type="button" onClick={() => setI(j)} aria-label={`Photo ${j + 1}`} className={`h-14 w-20 shrink-0 overflow-hidden rounded ${j === i ? 'ring-2 ring-brass-500' : 'opacity-60 hover:opacity-100'}`}>
            <img src={p.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </motion.div>
  )
}
