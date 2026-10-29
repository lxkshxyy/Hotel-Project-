import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { site } from '../config/site'
import { photoTags, type PhotoTag } from '../data/options'
import { uid } from '../lib/format'
import { resizeImage } from '../lib/images'
import type { ListingPhoto } from '../lib/types'

/** Guess the photo type from the file name, so most photos arrive already tagged. */
const guessTag = (name: string): PhotoTag => {
  const n = name.toLowerCase()
  if (/bath|toilet|wash/.test(n)) return 'Bathroom'
  if (/lobby|reception/.test(n)) return 'Lobby'
  if (/exterior|front|outside|building|facade/.test(n)) return 'Exterior'
  if (/dining|restaurant|food|breakfast/.test(n)) return 'Dining'
  if (/room|bed|suite/.test(n)) return 'Room'
  return 'Other'
}

export default function PhotoManager({ photos, onChange }: { photos: ListingPhoto[]; onChange: (p: ListingPhoto[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [drag, setDrag] = useState(false)

  const add = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 30)
    if (!list.length) return
    const errs: string[] = []
    const added: ListingPhoto[] = []
    for (let i = 0; i < list.length; i++) {
      setBusy(`Preparing photo ${i + 1} of ${list.length}…`)
      try {
        added.push({ id: uid(8), url: await resizeImage(list[i]), tag: guessTag(list[i].name) })
      } catch (e) {
        errs.push(e instanceof Error ? e.message : `Couldn’t add ${list[i].name}.`)
      }
    }
    setBusy('')
    setErrors(errs)
    if (added.length) onChange([...photos, ...added])
    if (input.current) input.current.value = ''
  }

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= photos.length) return
    const next = [...photos]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <div
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
        className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${drag ? 'border-pine-700 bg-pine-50' : 'border-line-strong bg-white'}`}
      >
        <ImagePlus className="h-9 w-9 text-pine-700" aria-hidden="true" />
        <strong className="text-lg">Drop photos here</strong>
        <span className="text-sm text-ink-500">JPG or PNG, at least 800 px wide. They’re resized for you.</span>
        <button type="button" className="btn-primary mt-2" onClick={() => input.current?.click()} disabled={!!busy}>
          {busy || 'Choose photos'}
        </button>
        <input ref={input} type="file" accept="image/*" multiple className="sr-only" aria-label="Choose photos" onChange={(e) => e.target.files && add(e.target.files)} />
      </div>

      <p className="text-sm text-ink-700">
        {photos.length} photo{photos.length === 1 ? '' : 's'} added. You need at least {site.minPhotos}, including one of a room. The first photo is your cover on {site.marketplace}.
      </p>
      {errors.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 rounded-xl bg-alert-50 p-3 text-sm text-alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id} className={`overflow-hidden rounded-xl bg-white ring-1 ${i === 0 ? 'ring-2 ring-brass-500' : 'ring-line'}`}>
              <div className="relative aspect-[4/3]">
                <img src={p.url} alt={`${p.tag} photo ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-brass-500 px-2 py-0.5 text-xs font-bold text-pine-950">
                    <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Cover
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 p-2">
                <label className="sr-only" htmlFor={`tag-${p.id}`}>
                  Photo type
                </label>
                <select id={`tag-${p.id}`} value={p.tag} onChange={(e) => onChange(photos.map((x) => (x.id === p.id ? { ...x, tag: e.target.value as PhotoTag } : x)))} className="h-10 rounded-lg border border-line-strong bg-white px-2 text-sm">
                  {photoTags.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-1">
                  <span className="flex gap-1">
                    <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-paper disabled:opacity-30">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="Move later" disabled={i === photos.length - 1} onClick={() => move(i, 1)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-paper disabled:opacity-30">
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </span>
                  {i > 0 && (
                    <button type="button" onClick={() => onChange([p, ...photos.filter((x) => x.id !== p.id)])} className="rounded-lg px-2 py-1.5 text-xs font-bold text-pine-800 hover:bg-pine-50">
                      Make cover
                    </button>
                  )}
                  <button type="button" aria-label={`Delete photo ${i + 1}`} onClick={() => onChange(photos.filter((x) => x.id !== p.id))} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-alert-50 hover:text-alert">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
