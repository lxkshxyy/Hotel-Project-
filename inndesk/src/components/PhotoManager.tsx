import { ArrowLeft, ArrowRight, Star, Trash2, Upload } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { site } from '../config/site'
import { photoTags, type PhotoTag } from '../data/options'
import { uid } from '../lib/format'
import { resizePhoto } from '../lib/images'
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
        const f = list[i]
        if (!/^image\/(jpeg|png)$/.test(f.type)) throw new Error(`${f.name} isn’t a JPEG or PNG photo.`)
        if (f.size > site.maxPhotoMb * 1024 * 1024) throw new Error(`${f.name} is larger than ${site.maxPhotoMb} MB.`)
        const r = await resizePhoto(f)
        added.push({ id: uid(8), url: r.url, tag: guessTag(f.name), landscape: r.width > r.height })
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
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 text-center transition-colors ${photos.length ? 'py-10' : 'min-h-[300px] py-16 sm:min-h-[460px]'} ${drag ? 'border-pine-700 bg-pine-50' : 'border-line-strong bg-[#f7f7f7] hover:border-pine-700/50'}`}
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
        <span className="text-[12px] text-ink-500">(Upload JPEG/PNG files up to {site.maxPhotoMb} MB each)</span>
        <input ref={input} type="file" accept="image/jpeg,image/png" multiple className="sr-only" aria-label="Choose photos" tabIndex={-1} onClick={(e) => e.stopPropagation()} onChange={(e) => e.target.files && add(e.target.files)} />
      </div>

      {photos.length > 0 && (
        <p className="text-sm text-ink-700">
          <strong>
            {photos.length} of {site.minPhotos}
          </strong>{' '}
          photos added{photos.length < site.minPhotos ? ` · add ${site.minPhotos - photos.length} more` : ''}
          {photos.some((p) => p.landscape ?? true) ? '' : ' · add 1 landscape photo'}. The first photo is your cover on {site.marketplace}.
        </p>
      )}
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
