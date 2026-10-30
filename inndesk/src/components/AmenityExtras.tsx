import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, CircleAlert, Clock, ImagePlus, Minus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { amenityDetails, amenityForms, formIntro, poolDepths, weekDays, type AmenityForm, type DetailField, type FormField } from '../data/amenityDetails'
import { uid } from '../lib/format'
import { resizeImage } from '../lib/images'
import type { AmenityEntry, EntryValue, Listing } from '../lib/types'

type Set = (fn: (l: Listing) => Listing) => void

/* ---------------- searchable multi-select ---------------- */

export function MultiSelect({ label, options, value, onChange, selectAll = false }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; selectAll?: boolean }) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const openList = () => {
    const r = box.current?.getBoundingClientRect()
    // Leaves room for the sticky Back / Continue bar at the bottom of the screen.
    if (r) setUp(window.innerHeight - r.bottom < 330 && r.top > 330)
    setQ('')
    setOpen((x) => !x)
  }
  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', out)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', out)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const shown = options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()))
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])
  return (
    <div ref={box} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={openList} className={`field flex items-center justify-between gap-2 text-left ${open ? 'border-pine-700 shadow-[0_0_0_3px_var(--color-pine-100)]' : ''}`}>
        <span className={`truncate ${value.length ? 'text-ink-900' : 'text-ink-400'}`}>{value.length ? value.join(', ') : 'Select'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-700 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className={`absolute inset-x-0 z-50 overflow-hidden rounded-lg bg-white shadow-lift ring-1 ring-line ${up ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {options.length > 3 && (
            <label className="m-2 flex items-center gap-2 rounded-md border border-line-strong px-2.5 focus-within:border-pine-700">
              <Search className="h-4 w-4 text-ink-400" aria-hidden="true" />
              <span className="sr-only">Search</span>
              <input autoFocus className="min-h-10 min-w-0 flex-1 text-[14px] outline-none" placeholder="Search for <keyword>" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          )}
          {selectAll && (
            <button type="button" onClick={() => onChange(value.length === options.length ? [] : [...options])} className="flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left text-[14.5px] text-ink-900 hover:bg-pine-50">
              <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${value.length ? 'border-pine-800 bg-pine-800 text-white' : 'border-ink-400'}`} aria-hidden="true">
                {value.length === options.length ? <Check className="h-3 w-3" strokeWidth={3} /> : value.length ? <Minus className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
              {value.length === 0 ? 'Select All' : value.length === options.length ? 'All selected' : `${value.length} selected`}
            </button>
          )}
          <ul role="listbox" aria-multiselectable="true" className="max-h-56 overflow-y-auto py-1">
            {shown.map((o) => {
              const on = value.includes(o)
              return (
                <li key={o} role="option" aria-selected={on}>
                  <button type="button" onClick={() => toggle(o)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[14.5px] font-semibold text-ink-900 hover:bg-pine-50">
                    <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${on ? 'border-pine-800 bg-pine-800 text-white' : 'border-ink-400'}`}>{on && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}</span>
                    {o}
                  </button>
                </li>
              )
            })}
            {shown.length === 0 && <li className="px-3 py-2 text-[14px] text-ink-500">No match.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ---------------- the grey box under a ticked tile ---------------- */

export const hasForm = (id: string) => !!amenityForms[id]

export function hasExtras(id: string) {
  return !!amenityDetails[id] || !!amenityForms[id]
}

export function AmenityExtrasBox({ l, set, id, label, autoOpen = false }: { l: Listing; set: Set; id: string; label: string; autoOpen?: boolean }) {
  const fields = amenityDetails[id]
  const form = amenityForms[id]
  const entries = l.amenityEntries?.[id] ?? []
  const [settled, setSettled] = useState(false)
  // Ticking an amenity with its own form opens the form straight away (like answering Yes).
  const [editing, setEditing] = useState<AmenityEntry | 'new' | null>(() => (autoOpen && form && !entries.length ? 'new' : null))
  const setDetail = (f: DetailField, v: string | string[]) => set((x) => ({ ...x, amenityDetails: { ...x.amenityDetails, [id]: { ...x.amenityDetails?.[id], [f.id]: v } } }))

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      onAnimationStart={() => setSettled(false)}
      onAnimationComplete={() => setSettled(true)}
      // Clip only while opening/closing, so dropdown lists can hang over the tiles below.
      className={`col-span-full ${settled ? 'overflow-visible' : 'overflow-hidden'}`}
    >
      <div className="flex flex-col gap-3 rounded-xl bg-[#eef0ee] p-3 sm:p-4">
        <span className="text-[13px] font-semibold text-ink-700">{label} details</span>
        {fields && (
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((f) => {
              const v = l.amenityDetails?.[id]?.[f.id]
              return f.type === 'multi' ? (
                <MultiSelect key={f.id} label={`${label}: ${f.label}`} options={f.options} value={Array.isArray(v) ? v : []} onChange={(nv) => setDetail(f, nv)} />
              ) : (
                <select key={f.id} aria-label={`${label}: ${f.label}`} className="field" value={typeof v === 'string' ? v : ''} onChange={(e) => setDetail(f, e.target.value)}>
                  <option value="" disabled hidden>
                    {f.label}
                  </option>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              )
            })}
          </div>
        )}
        {form && (
          <>
            {entries.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg bg-white p-3 ring-1 ring-line">
                {e.photoIds[0] ? <img src={l.photos.find((p) => p.id === e.photoIds[0])?.url} alt="" className="h-12 w-16 shrink-0 rounded object-cover" /> : <span className="h-12 w-16 shrink-0 rounded bg-paper" />}
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[15px] text-ink-900">{String(e.values.name || form.title)}</strong>
                  <span className="block truncate text-[13px] text-ink-500">{summary(form, e)}</span>
                </span>
                <button type="button" aria-label={`Edit ${String(e.values.name || form.title)}`} onClick={() => setEditing(e)} className="flex h-9 w-9 items-center justify-center rounded-lg text-pine-800 hover:bg-pine-50">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${String(e.values.name || form.title)}`}
                  onClick={() =>
                    set((x) => ({
                      ...x,
                      photos: x.photos.filter((p) => !e.photoIds.includes(p.id)),
                      amenityEntries: { ...x.amenityEntries, [id]: (x.amenityEntries?.[id] ?? []).filter((y) => y.id !== e.id) },
                    }))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-alert-50 hover:text-alert"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setEditing('new')} className="flex min-h-10 items-center gap-1.5 self-start rounded-lg border border-pine-700 bg-white px-3 text-[14px] font-bold text-pine-800 hover:bg-pine-50">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add {entries.length ? 'another ' : ''}
              {form.title}
            </button>
          </>
        )}
      </div>
      <AmenityFormModal form={form} entry={editing} l={l} onClose={() => setEditing(null)} onSave={(entry, photos) => {
        set((x) => {
          const keep = x.photos.filter((p) => !photos.removed.includes(p.id))
          const list = x.amenityEntries?.[id] ?? []
          return {
            ...x,
            photos: [...keep, ...photos.added],
            amenityEntries: { ...x.amenityEntries, [id]: list.some((y) => y.id === entry.id) ? list.map((y) => (y.id === entry.id ? entry : y)) : [...list, entry] },
          }
        })
        setEditing(null)
      }} />
    </motion.div>
  )
}

function summary(form: AmenityForm, e: AmenityEntry) {
  const bits: string[] = []
  for (const f of form.fields) {
    const v = e.values[f.id]
    if (f.id === 'name' || v == null || v === '') continue
    if (typeof v === 'string') bits.push(v)
    else if (Array.isArray(v) && v.length) bits.push(v.slice(0, 2).join(', '))
    else if (typeof v === 'number' && v > 0) bits.push(`${v} seats`)
  }
  return [...bits.slice(0, 3), `${e.photoIds.length} photo${e.photoIds.length === 1 ? '' : 's'}`].join(' · ')
}

/* ---------------- "+ Add …" pop-up ---------------- */

type Draft = { values: Record<string, EntryValue>; photos: { id: string; url: string }[] }

function required(f: FormField, v: EntryValue | undefined): string {
  if (f.optional) return ''
  if (f.type === 'text') return typeof v === 'string' && v.trim().length >= 2 ? '' : `Enter the ${f.label.toLowerCase()}.`
  if (f.type === 'radio') return v ? '' : 'Choose one.'
  if (f.type === 'check') return Array.isArray(v) && v.length ? '' : 'Choose at least one.'
  if (f.type === 'yesno') return typeof v === 'boolean' ? '' : 'Choose No or Yes.'
  return ''
}

function AmenityFormModal({ form, entry, l, onClose, onSave }: { form?: AmenityForm; entry: AmenityEntry | 'new' | null; l: Listing; onClose: () => void; onSave: (e: AmenityEntry, photos: { added: Listing['photos']; removed: string[] }) => void }) {
  const open = !!form && !!entry
  const [d, setD] = useState<Draft>({ values: {}, photos: [] })
  const [tried, setTried] = useState(false)
  const [photoErr, setPhotoErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const start = useRef('')
  const dirty = () => JSON.stringify(d) !== start.current
  const tryClose = () => (dirty() ? setConfirmLeave(true) : onClose())
  const close = useRef(tryClose)
  close.current = tryClose

  useEffect(() => {
    if (!open || !form) return
    setTried(false)
    setPhotoErr('')
    setConfirmLeave(false)
    const init: Draft = entry === 'new' ? { values: { name: form.title }, photos: [] } : entry ? { values: { ...entry.values }, photos: entry.photoIds.map((pid) => ({ id: pid, url: l.photos.find((p) => p.id === pid)?.url ?? '' })).filter((p) => p.url) } : { values: {}, photos: [] }
    setD(init)
    start.current = JSON.stringify(init)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const val = (k: string) => d.values[k]
  const put = (k: string, v: EntryValue) => setD((x) => ({ ...x, values: { ...x.values, [k]: v } }))
  const toggle = (k: string, o: string) => {
    const cur = Array.isArray(val(k)) ? (val(k) as string[]) : []
    put(k, cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o])
  }
  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form) return e
    for (const f of form.fields) {
      if (f.type === 'group') {
        for (const p of f.parts) {
          const m = required({ ...p, type: p.type === 'chips' ? 'check' : p.type } as FormField, d.values[p.id])
          if (m) e[p.id] = m
        }
      } else {
        const m = required(f, d.values[f.id])
        if (m) e[f.id] = m
      }
    }
    if (!d.photos.length) e.photos = 'Add at least 1 photo.'
    return e
  }, [form, d])

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setPhotoErr('')
    setBusy(true)
    try {
      const urls: { id: string; url: string }[] = []
      for (const f of Array.from(files).slice(0, 10)) urls.push({ id: uid(8), url: await resizeImage(f) })
      setD((x) => ({ ...x, photos: [...x.photos, ...urls] }))
    } catch (err) {
      setPhotoErr(err instanceof Error ? err.message : 'Couldn’t add that photo.')
    } finally {
      setBusy(false)
    }
  }

  const save = () => {
    setTried(true)
    if (!form || !entry || Object.keys(errors).length) return
    const before = entry === 'new' ? [] : entry.photoIds
    const now = d.photos.map((p) => p.id)
    const added = d.photos.filter((p) => !before.includes(p.id)).map((p) => ({ id: p.id, url: p.url, tag: form.photoTag }))
    const removed = before.filter((x) => !now.includes(x))
    onSave({ id: entry === 'new' ? uid(8) : entry.id, values: d.values, photoIds: now }, { added, removed })
  }

  const err = (k: string) =>
    tried && errors[k] ? (
      <span role="alert" className="text-[13px] font-semibold text-alert">
        {errors[k]}
      </span>
    ) : null
  const choice = (k: string, o: string, kind: 'radio' | 'check', name: string) => {
    const v = val(k)
    const on = kind === 'radio' ? v === o : Array.isArray(v) && v.includes(o)
    return (
      <label key={o} className="flex cursor-pointer items-center gap-2.5 text-[15px] text-ink-900">
        <input type={kind === 'radio' ? 'radio' : 'checkbox'} name={name} checked={on} onChange={() => (kind === 'radio' ? put(k, o) : toggle(k, o))} className="h-[18px] w-[18px] accent-pine-800" />
        {o}
      </label>
    )
  }
  const chips = (k: string, options: string[]) => (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = Array.isArray(val(k)) && (val(k) as string[]).includes(o)
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => toggle(k, o)} className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] transition-colors ${on ? 'border-pine-800 bg-pine-50 font-semibold text-pine-900' : 'border-line-strong text-ink-700 hover:border-pine-700'}`}>
            <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${on ? 'border-pine-800 bg-pine-800 text-white' : 'border-ink-400'}`}>{on && <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />}</span>
            {o}
          </button>
        )
      })}
    </div>
  )

  const control = (f: FormField) => {
    switch (f.type) {
      case 'text':
        return <input className="field" value={typeof val(f.id) === 'string' ? (val(f.id) as string) : ''} onChange={(e) => put(f.id, e.target.value)} aria-label={f.label} aria-invalid={tried && !!errors[f.id]} />
      case 'radio':
        return <div className={`grid gap-x-6 gap-y-3 ${f.options.some((o) => o.length > 12) ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>{f.options.map((o) => choice(f.id, o, 'radio', `f-${f.id}`))}</div>
      case 'check':
        return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{f.options.map((o) => choice(f.id, o, 'check', `f-${f.id}`))}</div>
      case 'chips':
        return chips(f.id, f.options)
      case 'yesno':
        return (
          <div className="flex gap-8">
            {[
              [false, 'No'],
              [true, 'Yes'],
            ].map(([v, t]) => (
              <label key={t as string} className="flex cursor-pointer items-center gap-2.5 text-[15px] text-ink-900">
                <input type="radio" name={`f-${f.id}`} checked={val(f.id) === v} onChange={() => put(f.id, v as boolean)} className="h-[18px] w-[18px] accent-pine-800" />
                {t as string}
              </label>
            ))}
          </div>
        )
      case 'stepper': {
        const n = typeof val(f.id) === 'number' ? (val(f.id) as number) : 0
        return (
          <span className="flex w-fit items-center overflow-hidden rounded-lg border border-line-strong">
            <button type="button" aria-label="Fewer" disabled={n <= 0} onClick={() => put(f.id, Math.max(0, n - 1))} className="flex h-10 w-10 items-center justify-center text-ink-700 hover:bg-paper disabled:text-ink-400">
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <input aria-label={f.label} inputMode="numeric" className="h-10 w-14 border-x border-line-strong text-center outline-none" value={n} onChange={(e) => put(f.id, Math.min(999, Number(e.target.value.replace(/\D/g, '')) || 0))} />
            <button type="button" aria-label="More" onClick={() => put(f.id, Math.min(999, n + 1))} className="flex h-10 w-10 items-center justify-center text-ink-700 hover:bg-paper">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </span>
        )
      }
      case 'timing': {
        const t = (val(f.id) as { open: string; close: string; off: string[] } | undefined) ?? { open: '', close: '', off: [] }
        return (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              {(['open', 'close'] as const).map((k) => (
                <label key={k} className="flex flex-col gap-1 text-[13px] font-semibold text-ink-700">
                  {k === 'open' ? 'Opening time' : 'Closing time'}
                  <span className="relative">
                    <Clock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
                    <input type="time" className="field pl-9" value={t[k]} onChange={(e) => put(f.id, { ...t, [k]: e.target.value })} />
                  </span>
                </label>
              ))}
            </div>
            <span className="text-[13px] font-semibold text-ink-700">Non-operational day</span>
            <div className="flex flex-wrap gap-1.5">
              {weekDays.map((day) => {
                const on = t.off.includes(day)
                return (
                  <button key={day} type="button" aria-pressed={on} onClick={() => put(f.id, { ...t, off: on ? t.off.filter((x) => x !== day) : [...t.off, day] })} className={`min-h-9 rounded-md px-3 text-[14px] font-bold ${on ? 'bg-pine-800 text-white' : 'text-pine-800 hover:bg-pine-50'}`}>
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        )
      }
      case 'depth': {
        const dv = (val(f.id) as { depth: string; shallow: boolean } | undefined) ?? { depth: '', shallow: false }
        return (
          <div className="flex flex-col gap-2">
            <select aria-label="Depth" className="field max-w-[240px]" value={dv.depth} onChange={(e) => put(f.id, { ...dv, depth: e.target.value })}>
              <option value="" disabled hidden>
                Select Depth
              </option>
              {poolDepths.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2.5 text-[15px] text-ink-900">
              <input type="checkbox" checked={dv.shallow} onChange={(e) => put(f.id, { ...dv, shallow: e.target.checked })} className="h-[18px] w-[18px] accent-pine-800" />
              This pool has a shallow end
            </label>
          </div>
        )
      }
      case 'group':
        return (
          <div className="flex flex-col gap-4">
            {f.parts.map((p) => (
              <div key={p.id} className="flex flex-col gap-2.5">
                <span className="text-[15px] font-bold text-ink-900">
                  {p.label} {(p.hint || p.optional) && <span className="text-[13px] font-normal text-ink-500">({p.hint ?? 'Optional'})</span>}
                </span>
                {p.type === 'chips' ? chips(p.id, p.options) : <div className="grid grid-cols-2 gap-x-6 gap-y-3">{p.options.map((o) => choice(p.id, o, 'check', `f-${p.id}`))}</div>}
                {err(p.id)}
              </div>
            ))}
          </div>
        )
    }
  }

  return (
    <AnimatePresence>
      {open && form && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={tryClose} className="fixed inset-0 z-[100] flex items-end justify-center bg-pine-950/60 sm:items-center sm:p-4">
          <motion.div role="dialog" aria-modal="true" aria-labelledby="af-h" initial={{ y: 24 }} animate={{ y: 0 }} exit={{ y: 24 }} onClick={(e) => e.stopPropagation()} className="relative flex max-h-[94dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
            <div className="relative border-b border-line px-5 pt-5 pb-3 sm:px-6">
              <button type="button" aria-label="Close" onClick={tryClose} className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-paper">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              <h2 id="af-h" className="pr-10 text-[26px] font-black text-ink-900">
                {form.title}
              </h2>
              <p className="text-[14px] text-ink-700">{formIntro(form.title.replace(/\/\s*/g, ' / '))}</p>
            </div>
            <div className="flex-1 divide-y divide-line overflow-y-auto px-5 sm:px-6">
              {form.fields.map((f) => (
                <div key={f.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,240px)_1fr] sm:gap-6">
                  <span className="text-[15px] font-bold text-ink-900">
                    {f.label} {f.optional && <span className="text-[13px] font-normal text-ink-500">(Optional)</span>}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {control(f)}
                    {f.type !== 'group' && err(f.id)}
                  </div>
                </div>
              ))}
              <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,240px)_1fr] sm:gap-6">
                <span>
                  <strong className="block text-[15px] text-ink-900">{form.photoLabel}</strong>
                  <span className="text-[13px] text-ink-500">Mandatory 1 photo required</span>
                </span>
                <div className="flex flex-col gap-2">
                  {d.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {d.photos.map((p) => (
                        <span key={p.id} className="relative">
                          <img src={p.url} alt="" className="h-16 w-24 rounded-md object-cover" />
                          <button type="button" aria-label="Remove photo" onClick={() => setD((x) => ({ ...x, photos: x.photos.filter((y) => y.id !== p.id) }))} className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink-700 shadow ring-1 ring-line hover:text-alert">
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <label className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-4 text-center ${tried && errors.photos ? 'border-alert' : 'border-ink-400'} hover:bg-paper`}>
                    <ImagePlus className="h-5 w-5 text-pine-800" aria-hidden="true" />
                    <span className="text-[14px] font-bold text-pine-800">{busy ? 'Adding…' : 'Add photos'}</span>
                    <span className="text-[12px] text-ink-500">JPG or PNG, at least 800 px wide</span>
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => {
                      addPhotos(e.target.files)
                      e.target.value = ''
                    }} />
                  </label>
                  {photoErr && (
                    <span role="alert" className="text-[13px] font-semibold text-alert">
                      {photoErr}
                    </span>
                  )}
                  {err('photos')}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 sm:px-6">
              <button type="button" onClick={tryClose} className="min-h-11 px-2 text-[15px] font-bold text-pine-800 hover:underline">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={busy} className="btn-brass min-h-11 px-6">
                Save &amp; Close
              </button>
            </div>
            {confirmLeave && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-pine-950/40 p-4" onClick={(e) => e.stopPropagation()}>
                <div role="alertdialog" aria-modal="true" aria-labelledby="leave-h" className="relative w-full max-w-[360px] rounded-xl bg-white p-5 shadow-lift">
                  <button type="button" aria-label="Keep editing" onClick={() => setConfirmLeave(false)} className="absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-paper">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <div className="flex gap-3 pr-6">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass-500 text-white">
                      <CircleAlert className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <strong id="leave-h" className="block text-[16px] text-ink-900">
                        You have unsaved changes
                      </strong>
                      <span className="text-[13px] text-ink-500">Leaving now will discard your unsaved changes</span>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" autoFocus onClick={() => setConfirmLeave(false)} className="btn-ghost min-h-10">
                      Cancel
                    </button>
                    <button type="button" onClick={onClose} className="btn-brass min-h-10">
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
