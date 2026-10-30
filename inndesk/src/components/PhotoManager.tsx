import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CircleAlert, ImagePlus, Maximize2, Star, Trash2, Upload, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { site } from '../config/site'
import { allAmenities, type PhotoTag } from '../data/options'
import { uid } from '../lib/format'
import { resizePhoto } from '../lib/images'
import type { Listing, ListingPhoto } from '../lib/types'

type Set = (fn: (l: Listing) => Listing) => void

/*
 * Photos And Videos step, in three views like the big extranets:
 *  1. Upload  – bulk drag & drop, with the Instructions panel.
 *  2. Tag     – for each part of the property (built from the details already entered: room types,
 *               bedrooms, amenities…), pick which uploaded photos show it.
 *  3. Review  – cover photo, photos per room type and per tag, with a full-screen viewer.
 */

/** Guess the photo type from the file name, so most photos arrive already sorted. */
const guessTag = (name: string): PhotoTag => {
  const n = name.toLowerCase()
  if (/bath|toilet|wash/.test(n)) return 'Bathroom'
  if (/lobby|reception/.test(n)) return 'Lobby'
  if (/exterior|front|outside|building|facade/.test(n)) return 'Exterior'
  if (/dining|restaurant|food|breakfast/.test(n)) return 'Dining'
  if (/room|bed|suite/.test(n)) return 'Room'
  return 'Other'
}

export interface PhotoCategory {
  key: string
  label: string
  group: 'Rooms' | 'Inside the rooms' | 'Property' | 'Amenities'
  hint?: string
}

const propertyAreas: [string, string, string][] = [
  ['Exterior', 'Building / exterior', 'The front of the property, as guests see it on arrival'],
  ['Entrance', 'Entrance', 'Gate, porch or main door'],
  ['Lobby', 'Reception / lobby', 'Front desk and waiting area'],
  ['Dining', 'Restaurant / dining area', 'Where guests eat'],
  ['Common', 'Common areas', 'Lounge, corridors, terrace and other shared spaces'],
  ['View', 'View / surroundings', 'The view and what is around the property'],
]

/** Everything a photo can be tagged with, built from what the owner already entered. */
export function photoCategories(l: Listing): PhotoCategory[] {
  const rooms: PhotoCategory[] = l.rooms.map((r, i) => ({
    key: `room:${r.id}`,
    label: r.name.trim() || `Room type ${i + 1}`,
    group: 'Rooms',
    hint: [r.roomType, r.bedrooms ? `${r.bedrooms} bedroom${r.bedrooms === 1 ? '' : 's'}` : '', r.livingRooms ? `${r.livingRooms} living room${r.livingRooms === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · '),
  }))
  const inside: PhotoCategory[] = [
    { key: 'area:Bedroom', label: 'Bedroom', group: 'Inside the rooms', hint: 'Beds and sleeping area' },
    ...(l.rooms.some((r) => (r.livingRooms ?? 0) > 0) ? [{ key: 'area:Living', label: 'Living room', group: 'Inside the rooms' as const, hint: 'Sitting area inside the room/unit' }] : []),
    { key: 'area:Bathroom', label: 'Bathroom', group: 'Inside the rooms', hint: 'Toilet, sink, shower or bathtub' },
  ]
  const property: PhotoCategory[] = propertyAreas.map(([k, label, hint]) => ({ key: `prop:${k}`, label, group: 'Property', hint }))
  const amen: PhotoCategory[] = allAmenities.filter((a) => l.amenities.includes(a.id)).map((a) => ({ key: `am:${a.id}`, label: a.label, group: 'Amenities' }))
  return [...rooms, ...inside, ...property, ...amen]
}

/** The broad photo type StayEasy uses for its gallery tabs, worked out from the tags. */
function tagFrom(labels: string[], fallback: PhotoTag): PhotoTag {
  if (!labels.length) return fallback
  if (labels.some((k) => k.startsWith('room:') || k === 'area:Bedroom' || k === 'area:Living')) return 'Room'
  if (labels.includes('area:Bathroom')) return 'Bathroom'
  if (labels.includes('prop:Lobby')) return 'Lobby'
  if (labels.includes('prop:Dining')) return 'Dining'
  if (labels.some((k) => ['prop:Exterior', 'prop:Entrance', 'prop:View'].includes(k))) return 'Exterior'
  return 'Other'
}

const isLandscape = (p: ListingPhoto) => p.landscape ?? true

function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    document.addEventListener('keydown', esc)
    const o = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = o
    }
  }, [open])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-pine-950/55 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div role="dialog" aria-modal="true" className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-lift sm:rounded-2xl ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.2 }}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Grid of all uploads with tick boxes. single = pick exactly one (used for the cover). */
function PhotoPicker({ open, title, intro, photos, initial, single, onClose, onDone }: { open: boolean; title: string; intro: string; photos: ListingPhoto[]; initial: string[]; single?: boolean; onClose: () => void; onDone: (ids: string[]) => void }) {
  const [sel, setSel] = useState<string[]>(initial)
  useEffect(() => {
    if (open) setSel(initial)
    // Reset only when the picker opens.
  }, [open])
  const toggle = (id: string) => setSel((s) => (single ? [id] : s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h3 className="text-[20px] font-black text-ink-900">{title}</h3>
          <p className="text-[14px] text-ink-500">{intro}</p>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-paper">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="overflow-y-auto p-4 sm:p-5">
        {photos.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p, i) => {
              const on = sel.includes(p.id)
              return (
                <li key={p.id}>
                  <button type="button" role={single ? 'radio' : 'checkbox'} aria-checked={on} aria-label={`Photo ${i + 1}`} onClick={() => toggle(p.id)} className={`relative block aspect-[4/3] w-full overflow-hidden rounded-lg ring-offset-2 ${on ? 'ring-3 ring-pine-700' : 'ring-1 ring-line hover:ring-pine-700/40'}`}>
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    <span className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md border-2 text-[13px] font-black ${on ? 'border-pine-700 bg-pine-700 text-white' : 'border-white bg-black/25 text-transparent'}`} aria-hidden="true">
                      ✓
                    </span>
                    {!isLandscape(p) && <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white">Portrait</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="py-8 text-center text-[14px] text-ink-500">No photos to choose from. Upload a landscape photo first.</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <span className="text-[14px] text-ink-700">{single ? '' : `${sel.length} selected`}</span>
        <span className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-brass" disabled={single && !sel.length} onClick={() => onDone(sel)}>
            Done
          </button>
        </span>
      </div>
    </Modal>
  )
}

/** Full-screen viewer: browse, make cover, delete. */
function Viewer({ photos, index, names, onClose, onIndex, onCover, onDelete }: { photos: ListingPhoto[]; index: number | null; names: (p: ListingPhoto) => string; onClose: () => void; onIndex: (i: number) => void; onCover: (id: string) => void; onDelete: (id: string) => void }) {
  const p = index == null ? undefined : photos[index]
  useEffect(() => {
    if (index == null) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
      if (e.key === 'ArrowRight' && index < photos.length - 1) onIndex(index + 1)
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [index, photos.length, onClose, onIndex])
  if (!p || index == null) return null
  return (
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-[90] flex flex-col bg-black/92 text-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0 text-[14px]">
          <strong>
            {index + 1} / {photos.length}
          </strong>
          <span className="ml-2 text-white/75">{index === 0 ? 'Cover photo · ' : ''}{names(p) || 'Not tagged yet'}</span>
        </span>
        <button type="button" aria-label="Close viewer" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10">
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12">
        <img src={p.url} alt={names(p) || `Photo ${index + 1}`} className="max-h-full max-w-full object-contain" />
        <button type="button" aria-label="Previous photo" disabled={index === 0} onClick={() => onIndex(index - 1)} className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-25">
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Next photo" disabled={index === photos.length - 1} onClick={() => onIndex(index + 1)} className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-25">
          <ChevronRight className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-4">
        {index > 0 &&
          (isLandscape(p) ? (
            <button type="button" onClick={() => onCover(p.id)} className="flex min-h-11 items-center gap-2 rounded-lg bg-white/10 px-4 font-bold hover:bg-white/20">
              <Star className="h-4 w-4" aria-hidden="true" /> Make cover photo
            </button>
          ) : (
            <span className="text-[13px] text-white/70">Portrait photos can’t be the cover photo.</span>
          ))}
        <button type="button" onClick={() => onDelete(p.id)} className="flex min-h-11 items-center gap-2 rounded-lg bg-white/10 px-4 font-bold hover:bg-alert">
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete photo
        </button>
      </div>
    </div>
  )
}

export default function PhotoManager({ l, set }: { l: Listing; set: Set }) {
  const photos = l.photos
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [drag, setDrag] = useState(false)
  const [view, setView] = useState<'upload' | 'tag' | 'review'>(photos.length ? 'review' : 'upload')
  const [picking, setPicking] = useState<PhotoCategory | 'cover' | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const cats = photoCategories(l)
  const nameOf = (k: string) => cats.find((c) => c.key === k)?.label
  const names = (p: ListingPhoto) => (p.labels ?? []).map(nameOf).filter(Boolean).join(', ')
  const inCat = (k: string) => photos.filter((p) => p.labels?.includes(k))
  const noLandscape = photos.length > 0 && !photos.some(isLandscape)

  /** Saves photos, keeps each room type's photo valid, and keeps the cover landscape when possible. */
  const save = (next: ListingPhoto[]) =>
    set((x) => {
      let list = next.map((p) => ({ ...p, tag: tagFrom(p.labels ?? [], p.tag) }))
      if (list.length && !isLandscape(list[0])) {
        const first = list.find(isLandscape)
        if (first) list = [first, ...list.filter((p) => p.id !== first.id)]
      }
      const rooms = x.rooms.map((r) => {
        const mine = list.filter((p) => p.labels?.includes(`room:${r.id}`))
        const keep = r.photoId && list.some((p) => p.id === r.photoId)
        return { ...r, photoId: keep ? r.photoId : mine[0]?.id }
      })
      return { ...x, photos: list, rooms }
    })

  const add = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 50)
    if (!list.length) return
    const errs: string[] = []
    const added: ListingPhoto[] = []
    for (let i = 0; i < list.length; i++) {
      setBusy(`Preparing photo ${i + 1} of ${list.length}…`)
      try {
        const f = list[i]
        if (!/^image\/(jpeg|png)$/.test(f.type)) throw new Error(`${f.name} isn’t a JPEG or PNG photo.`)
        if (f.size > site.maxPhotoMb * 1024 * 1024) throw new Error(`${f.name} is larger than ${site.maxPhotoMb} MB.`)
        const r = await resizePhoto(f)
        added.push({ id: uid(8), url: r.url, tag: guessTag(f.name), landscape: r.width > r.height, labels: [] })
      } catch (e) {
        errs.push(e instanceof Error ? e.message : `Couldn’t add ${list[i].name}.`)
      }
    }
    setBusy('')
    setErrors(errs)
    if (input.current) input.current.value = ''
    if (added.length) {
      save([...photos, ...added])
      setView('tag')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const setCat = (key: string, ids: string[]) => save(photos.map((p) => ({ ...p, labels: ids.includes(p.id) ? [...new Set([...(p.labels ?? []), key])] : (p.labels ?? []).filter((k) => k !== key) })))
  const remove = (id: string) => {
    save(photos.filter((p) => p.id !== id))
    setViewing((v) => (v == null ? v : photos.length <= 1 ? null : Math.min(v, photos.length - 2)))
  }
  const makeCover = (id: string) => {
    const p = photos.find((x) => x.id === id)
    if (p) save([p, ...photos.filter((x) => x.id !== id)])
    setViewing(0)
  }

  const landscapeAlert = noLandscape && (
    <p role="alert" className="flex items-start gap-2 rounded-lg border border-alert/30 bg-alert-50 px-3 py-2.5 text-[14px] font-semibold text-alert">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      Upload at least one landscape photo (wider than it is tall). It is needed for the property cover photo.
    </p>
  )
  const errorList = errors.length > 0 && (
    <ul role="alert" className="flex flex-col gap-1 rounded-lg bg-alert-50 p-3 text-sm text-alert">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  )

  const picker = (
    <PhotoPicker
      open={picking != null}
      title={picking === 'cover' ? 'Choose the property cover photo' : picking ? `Select photos of ${picking.label}` : ''}
      intro={picking === 'cover' ? 'Only landscape photos can be the cover. It is the first photo guests see.' : 'Tick every photo that shows this. A photo can have more than one tag.'}
      photos={picking === 'cover' ? photos.filter(isLandscape) : photos}
      initial={picking === 'cover' ? (photos[0] ? [photos[0].id] : []) : picking ? inCat(picking.key).map((p) => p.id) : []}
      single={picking === 'cover'}
      onClose={() => setPicking(null)}
      onDone={(ids) => {
        if (picking === 'cover') makeCover(ids[0])
        else if (picking) setCat(picking.key, ids)
        setViewing(null)
        setPicking(null)
      }}
    />
  )

  if (view === 'upload')
    return (
      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4 rounded-xl bg-white p-4 ring-1 ring-line sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[26px] font-bold text-ink-900">Upload Photos &amp; Videos</h2>
            {photos.length > 0 && (
              <button type="button" className="text-[14px] font-bold text-pine-800 hover:underline" onClick={() => setView('review')}>
                Back to my photos ({photos.length})
              </button>
            )}
          </div>
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload photos"
            onClick={() => !busy && input.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && (e.preventDefault(), input.current?.click())}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              add(e.dataTransfer.files)
            }}
            className={`flex min-h-[300px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors sm:min-h-[460px] ${drag ? 'border-pine-700 bg-pine-50' : 'border-line-strong bg-[#f7f7f7] hover:border-pine-700/50'}`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-line">
              <Upload className="h-[18px] w-[18px] text-ink-900" aria-hidden="true" />
            </span>
            <strong className="text-[16px] text-ink-900">{busy || 'Drag & Drop the photos and videos'}</strong>
            {!busy && (
              <span className="text-[15px] text-ink-700">
                or <span className="font-semibold text-pine-800 underline">click here</span> to upload
              </span>
            )}
            <span className="text-[12px] text-ink-500">(Upload JPEG/PNG files up to {site.maxPhotoMb} MB each · select many at once)</span>
            <input ref={input} type="file" accept="image/jpeg,image/png" multiple className="sr-only" aria-label="Choose photos" tabIndex={-1} onClick={(e) => e.stopPropagation()} onChange={(e) => e.target.files && add(e.target.files)} />
          </div>
          {errorList}
          {landscapeAlert}
        </div>
        <PhotoInstructions />
      </section>
    )

  if (view === 'tag') {
    const groups = (['Rooms', 'Inside the rooms', 'Property', 'Amenities'] as const).map((g) => [g, cats.filter((c) => c.group === g)] as const).filter(([, c]) => c.length)
    const untagged = photos.filter((p) => !p.labels?.length).length
    return (
      <section className="flex flex-col gap-4">
        {picker}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[30px] font-black text-ink-900">Tag your photos</h2>
            <p className="text-[14px] text-ink-500">
              {photos.length} photo{photos.length === 1 ? '' : 's'} uploaded{untagged ? ` · ${untagged} not tagged yet` : ' · all tagged'}. For each item below, select the photos that show it. The list comes from the details you entered.
            </p>
          </div>
          <button type="button" className="btn-brass" onClick={() => setView('review')}>
            Review photos
          </button>
        </div>
        {errorList}
        {landscapeAlert}
        {groups.map(([g, list]) => (
          <div key={g} className="overflow-hidden rounded-xl bg-white ring-1 ring-line">
            <h3 className="border-b border-line px-4 py-3 text-[18px] font-black text-ink-900 sm:px-5">{g === 'Rooms' ? 'Room types' : g}</h3>
            <ul>
              {list.map((c) => {
                const mine = inCat(c.key)
                return (
                  <li key={c.key} className="flex flex-col gap-3 border-t border-line px-4 py-4 first:border-t-0 sm:flex-row sm:items-center sm:px-5">
                    <div className="min-w-0 sm:w-[260px] sm:shrink-0">
                      <strong className="block text-[16px] text-ink-900">{c.label}</strong>
                      {c.hint && <span className="block text-[13px] text-ink-500">{c.hint}</span>}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                      {mine.slice(0, 6).map((p) => (
                        <img key={p.id} src={p.url} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover ring-1 ring-line" />
                      ))}
                      {mine.length > 6 && <span className="text-[13px] font-bold text-ink-700">+{mine.length - 6}</span>}
                      {!mine.length && <span className="text-[13px] text-ink-400">No photos selected</span>}
                    </div>
                    <button type="button" className={mine.length ? 'btn-ghost shrink-0' : 'btn-primary shrink-0'} onClick={() => setPicking(c)}>
                      {mine.length ? `Edit (${mine.length})` : 'Select photos'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        <button type="button" className="btn-brass self-end" onClick={() => setView('review')}>
          Review photos
        </button>
      </section>
    )
  }

  // Review
  const cover = photos[0]
  const roomCats = cats.filter((c) => c.group === 'Rooms')
  const otherCats = cats.filter((c) => c.group !== 'Rooms' && inCat(c.key).length)
  const untagged = photos.filter((p) => !p.labels?.length)
  const tile = (key: string, label: string, list: ListingPhoto[], onClick: () => void) => (
    <li key={key} className="w-[132px]">
      <button type="button" onClick={onClick} className="group block w-full text-left" aria-label={`${label}, ${list.length} photo${list.length === 1 ? '' : 's'}`}>
        <span className="relative block h-[92px] overflow-hidden rounded-md bg-paper ring-1 ring-line group-hover:ring-pine-700/50">
          {list[0] ? <img src={list[0].url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="absolute inset-0 m-auto h-6 w-6 text-ink-400" aria-hidden="true" />}
          <span className="absolute top-1.5 right-1.5 rounded bg-black/55 px-1.5 text-[12px] font-bold text-white">{list.length}</span>
        </span>
        <span className="mt-1.5 block text-[14px] leading-snug text-ink-700">{label}</span>
      </button>
    </li>
  )
  return (
    <section className="flex flex-col gap-4">
      {picker}
      <Viewer photos={photos} index={viewing} names={names} onClose={() => setViewing(null)} onIndex={setViewing} onCover={makeCover} onDelete={remove} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[30px] font-black text-ink-900">
          Photos &amp; Videos <span className="font-normal">({photos.length})</span>
        </h2>
        <span className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => setView('tag')}>
            Edit tags
          </button>
          <button type="button" className="btn-brass" onClick={() => setView('upload')}>
            Upload More
          </button>
        </span>
      </div>
      {cover && (
        <div className="relative h-[220px] overflow-hidden rounded-xl bg-pine-950 sm:h-[320px]">
          <img src={cover.url} alt="Property cover photo" className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-gradient-to-b from-black/65 to-black/0 px-4 py-2.5 text-white">
            <span className="min-w-0 truncate text-[14px]">Property cover photo{names(cover) ? ` (${names(cover)})` : ''}</span>
            <button type="button" className="shrink-0 text-[14px] font-bold underline" onClick={() => setPicking('cover')}>
              Change
            </button>
          </div>
          <button type="button" onClick={() => setViewing(0)} className="absolute inset-0 top-12 m-auto flex h-fit w-fit flex-col items-center gap-1 rounded-lg bg-black/40 px-4 py-2 font-bold text-white hover:bg-black/55">
            <Maximize2 className="h-6 w-6" aria-hidden="true" />
            Click To View
          </button>
        </div>
      )}
      <div className={`relative flex flex-col gap-6 rounded-xl bg-white p-4 ring-1 ring-line sm:p-6 ${cover ? 'mx-2 -mt-12 sm:mx-8' : ''}`}>
        {errorList}
        {landscapeAlert}
        {photos.length < site.minPhotos && (
          <p className="flex items-start gap-2 rounded-lg border border-brass-200 bg-brass-50 px-3 py-2.5 text-[14px] text-ink-700">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-brass-700" aria-hidden="true" />
            {photos.length} of {site.minPhotos} photos added. Upload {site.minPhotos - photos.length} more to continue.
          </p>
        )}
        {roomCats.length > 0 && (
          <div>
            <h3 className="text-[17px] font-bold text-ink-900">Photos &amp; Videos assigned to the rooms</h3>
            <p className="text-[13px] text-ink-500">Photos help guests see what each room looks like</p>
            <ul className="mt-3 flex flex-wrap gap-4">{roomCats.map((c) => tile(c.key, c.label, inCat(c.key), () => setPicking(c)))}</ul>
          </div>
        )}
        <div>
          <h3 className="text-[17px] font-bold text-ink-900">Photos &amp; Videos tagged</h3>
          {otherCats.length || untagged.length ? (
            <ul className="mt-3 flex flex-wrap gap-4">
              {otherCats.map((c) => tile(c.key, c.label, inCat(c.key), () => setPicking(c)))}
              {untagged.length > 0 && tile('untagged', 'Not tagged yet', untagged, () => setView('tag'))}
            </ul>
          ) : (
            <p className="mt-1 text-[14px] text-ink-500">No tags yet.</p>
          )}
        </div>
        <div>
          <h3 className="text-[17px] font-bold text-ink-900">All photos</h3>
          <p className="text-[13px] text-ink-500">Open a photo to view it, make it the cover or delete it</p>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
            {photos.map((p, i) => (
              <li key={p.id}>
                <button type="button" onClick={() => setViewing(i)} aria-label={`View photo ${i + 1}`} className="relative block aspect-[4/3] w-full overflow-hidden rounded-md ring-1 ring-line hover:ring-pine-700/50">
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute top-1 left-1 rounded bg-brass-500 px-1 text-[10px] font-bold text-pine-950">Cover</span>}
                  {!isLandscape(p) && <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1 text-[10px] text-white">Portrait</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* Small drawings for the instruction list. */
const tipArt: Record<string, ReactNode> = {
  size: (
    <g>
      <path d="M3 3v6M3 3h6M41 35v-6M41 35h-6" stroke="#3d4a44" strokeWidth={1.5} fill="none" />
      <rect x={8} y={8} width={28} height={22} rx={2} fill="#eef4f0" />
      <circle cx={27} cy={15} r={3} fill="#e9b949" />
      <path d="M8 30l10-12 7 8 4-4 7 8z" fill="#2f7a55" />
    </g>
  ),
  light: (
    <g>
      <circle cx={10} cy={9} r={5} fill="#e9b949" />
      <path d="M12 20l12-9 12 9" fill="#c0503c" />
      <rect x={14} y={19} width={20} height={15} rx={1} fill="#fbe9d0" />
      <rect x={21} y={25} width={6} height={9} fill="#e8c9a0" />
      <circle cx={7} cy={27} r={4} fill="#7fae6b" />
    </g>
  ),
  rooms: (
    <g>
      <rect x={4} y={5} width={36} height={28} rx={1.5} fill="#f6edd8" stroke="#e1d2ad" />
      <path d="M22 5v28M4 19h36" stroke="#e1d2ad" />
      <rect x={11} y={23} width={14} height={6} rx={2} fill="#3d5a99" />
      <path d="M30 31v-9l3-4 3 4v9" fill="#7fae6b" />
    </g>
  ),
  ten: (
    <g>
      <rect x={10} y={4} width={26} height={22} rx={2} fill="#dbe4f5" />
      <rect x={6} y={9} width={28} height={24} rx={2} fill="#ffffff" stroke="#b9c6e4" />
      <circle cx={26} cy={16} r={2.6} fill="#e9b949" />
      <path d="M6 33l11-12 8 8 4-3 5 7z" fill="#3d5a7a" />
    </g>
  ),
  landscape: (
    <g>
      <rect x={14} y={14} width={26} height={11} rx={1.5} fill="#ececec" stroke="#cfcfcf" />
      <rect x={18} y={8} width={6} height={4} fill="#d9534f" />
      <circle cx={7} cy={22} r={3} fill="#3b3b6d" />
      <path d="M5 26h4l1 9H4z" fill="#5a4fcf" />
      <path d="M9 23l5-2" stroke="#3b3b6d" strokeWidth={1.4} />
    </g>
  ),
  watermark: (
    <g>
      <rect x={5} y={5} width={30} height={26} rx={3} fill="#d9dcf7" />
      <circle cx={20} cy={14} r={4.5} fill="#8a82e0" />
      <path d="M9 31c2-7 6-10 11-10s9 3 11 10z" fill="#8a82e0" />
      <circle cx={35} cy={31} r={6} fill="#e5484d" />
      <path d="M32.5 28.5l5 5M37.5 28.5l-5 5" stroke="#fff" strokeWidth={1.6} />
    </g>
  ),
}

/** The "Instructions" panel beside the photo uploader. */
export function PhotoInstructions() {
  const tips: [string, string][] = [
    ['size', `The size should not exceed ${site.maxPhotoMb} MB.`],
    ['light', 'Always take the picture in bright natural light.'],
    ['rooms', 'Capture images of well-organised rooms from various angles.'],
    ['ten', `Upload minimum ${site.minPhotos} photos (including 1 photo in landscape mode).`],
    ['landscape', 'Shoot photos & videos in landscape mode to make them look professional.'],
    ['watermark', 'Avoid watermarking your photos & videos.'],
  ]
  return (
    <aside className="overflow-hidden rounded-xl bg-white ring-1 ring-line lg:sticky lg:top-4">
      <div className="relative overflow-hidden bg-pine-800 px-4 py-3.5">
        <span aria-hidden="true" className="absolute -top-10 -right-6 h-24 w-36 rounded-full bg-white/10" />
        <span aria-hidden="true" className="absolute -top-4 right-10 h-16 w-16 rounded-full bg-brass-500/25" />
        <h3 className="relative text-[18px] font-bold text-white">Instructions</h3>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <p className="rounded-lg bg-pine-50 px-3 py-3 text-[14px] leading-relaxed text-ink-700">
          Adding high-quality photos to your listing can make a big difference. Properties with good images are likely to get more clicks from guests interested in booking. Here’s how you can improve your photos & videos:
        </p>
        <ul className="mt-2 flex flex-col">
          {tips.map(([k, t]) => (
            <li key={k} className="flex items-center gap-3 px-1 py-2.5">
              <svg viewBox="0 0 44 38" className="h-10 w-11 shrink-0" aria-hidden="true">
                {tipArt[k]}
              </svg>
              <span className="text-[14px] leading-snug text-ink-700">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
