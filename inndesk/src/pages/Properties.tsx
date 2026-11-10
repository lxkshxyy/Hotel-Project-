import { AnimatePresence, motion } from 'framer-motion'
import { Building2, CircleAlert, MapPin, MoreVertical, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PropertyTypePicker, type Category } from '../components/PropertyTypePicker'
import { KeyTag, Notice, Spinner } from '../components/ui'
import { useSession } from '../context/Session'
import { useListings } from '../lib/hooks'
import { blankListing, stepDone, steps } from '../lib/listing'
import { deleteListing, saveListing, setListingStatus } from '../lib/store'
import type { Listing } from '../lib/types'

type Tab = 'active' | 'progress'
const tabSteps = steps.filter((s) => s.id !== 'review')
const editHref = (l: Listing) => `/app/properties/${l.id}/edit`

/** ⋮ menu on each property: Resume listing, Pause, Delete. */
function RowMenu({ l, onResume, onPause, onDelete }: { l: Listing; onResume: () => void; onPause: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
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
  const item = 'flex w-full items-center gap-3 px-5 py-3.5 text-left text-[15.5px] font-medium text-ink-900 transition-colors hover:bg-pine-50'
  const pick = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }
  return (
    <div ref={box} className="relative">
      <button type="button" aria-label={`More options for ${l.basics.name.trim() || 'this property'}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors ${open ? 'bg-pine-50 text-pine-900' : 'hover:bg-paper'}`}>
        <MoreVertical className="h-5 w-5" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.14 }} className="absolute top-full right-0 z-30 mt-2 w-[230px] overflow-hidden rounded-xl bg-white py-1.5 shadow-[0_16px_40px_-12px_rgba(18,55,42,0.3)] ring-1 ring-line">
            {l.status !== 'live' && (
              <button role="menuitem" type="button" className={item} onClick={pick(onResume)}>
                <Play className="h-4 w-4 text-pine-800" aria-hidden="true" /> Resume listing
              </button>
            )}
            {l.status !== 'draft' && (
              <Link role="menuitem" to={editHref(l)} className={`${item} no-underline`} onClick={() => setOpen(false)}>
                <Pencil className="h-4 w-4 text-pine-800" aria-hidden="true" /> Edit listing
              </Link>
            )}
            {l.status === 'live' && (
              <button role="menuitem" type="button" className={item} onClick={pick(onPause)}>
                <Pause className="h-4 w-4 text-pine-800" aria-hidden="true" /> Pause listing
              </button>
            )}
            <button role="menuitem" type="button" className={`${item} text-alert hover:bg-alert-50`} onClick={pick(onDelete)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ l, busy, onResume, onPause, onDelete }: { l: Listing; busy: boolean; onResume: () => void; onPause: () => void; onDelete: () => void }) {
  const draft = l.status === 'draft'
  const done = tabSteps.filter((s) => stepDone(l, s.id)).length
  const place = [l.location.area, l.location.city].filter(Boolean).join(', ')
  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: busy ? 0.55 : 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="group flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 transition-shadow hover:shadow-[0_10px_28px_-14px_rgba(18,55,42,0.25)] sm:flex-row sm:items-center sm:p-5">
      <div className="flex h-[84px] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-pine-50 to-brass-50 ring-1 ring-line sm:w-[124px]">
        {l.photos[0] ? <img src={l.photos[0].url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-8 w-8 text-pine-700/50" strokeWidth={1.4} aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-[17px] font-semibold text-ink-900">{l.basics.name.trim() || 'Untitled property'}</strong>
          <KeyTag status={l.status} label={draft ? 'In progress' : undefined} />
        </div>
        <span className="mt-1 flex flex-wrap items-center gap-1 text-[14px] text-ink-500">
          {l.basics.propertyType}
          {place && (
            <>
              <span aria-hidden="true">·</span>
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {place}
            </>
          )}
        </span>
        {draft && (
          <div className="mt-2.5 flex items-center gap-3">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brass-500" style={{ width: `${(done / tabSteps.length) * 100}%` }} />
            </div>
            <span className="text-[13px] font-semibold text-ink-500">
              {done} of {tabSteps.length} sections done
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {!draft && (
          <Link to={`/app/properties/${l.id}`} className="btn-ghost">
            Manage
          </Link>
        )}
        <RowMenu l={l} onResume={onResume} onPause={onPause} onDelete={onDelete} />
      </div>
    </motion.li>
  )
}

function ConfirmDelete({ l, busy, onCancel, onConfirm }: { l: Listing | null; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <AnimatePresence>
      {l && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center bg-pine-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="del-h" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
          <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-alert-50 text-alert">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 id="del-h" className="mt-4 text-[20px] font-semibold text-ink-900">
              Delete {l.basics.name.trim() ? `“${l.basics.name.trim()}”` : 'this listing'}?
            </h2>
            <p className="mt-2 text-[15px] text-ink-700">{l.status === 'draft' ? 'Everything you’ve filled in for this listing will be deleted.' : 'It will be taken off TRPOTELS straight away and deleted, with its rooms, rates and photos.'} This can’t be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn bg-alert text-white hover:bg-[#8f1e18]" onClick={onConfirm} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function Properties() {
  const { owner } = useSession()
  const { data, error, reload } = useListings()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab | null>(null)
  const [busy, setBusy] = useState(false)
  const [working, setWorking] = useState('')
  const [toDelete, setToDelete] = useState<Listing | null>(null)
  const [actionError, setActionError] = useState('')
  const picking = params.get('new') === '1'
  const setPicking = (v: boolean) => setParams(v ? { new: '1' } : {}, { replace: !v })

  if (!data) return error ? <div className="p-6"><Notice tone="error">{error}</Notice></div> : <Spinner />
  const active = data.filter((l) => l.status !== 'draft')
  const progress = data.filter((l) => l.status === 'draft')
  const shown = tab ?? (active.length ? 'active' : 'progress')
  const list = shown === 'active' ? active : progress

  const start = async (category: Category, type: string) => {
    if (!owner) return
    setBusy(true)
    setActionError('')
    try {
      const blank = blankListing(owner.id, { phone: owner.phone, email: owner.email, businessName: owner.businessName, gstin: owner.gstin })
      const l = await saveListing({ ...blank, basics: { ...blank.basics, propertyType: type, category } })
      navigate(`/app/properties/${l.id}/edit?step=basics`)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Couldn’t start the listing.')
      setPicking(false)
    } finally {
      setBusy(false)
    }
  }

  const run = async (l: Listing, fn: () => Promise<unknown>, fail: string) => {
    setWorking(l.id)
    setActionError('')
    try {
      await fn()
      reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : fail)
    } finally {
      setWorking('')
    }
  }
  const resume = (l: Listing) => (l.status === 'draft' ? navigate(`${editHref(l)}?step=basics`) : run(l, () => setListingStatus(l, 'live'), 'Couldn’t resume the listing.'))
  const pause = (l: Listing) => run(l, () => setListingStatus(l, 'paused'), 'Couldn’t pause the listing.')
  const confirmDelete = async () => {
    if (!toDelete) return
    const l = toDelete
    await run(l, () => deleteListing(l), 'Couldn’t delete the listing.')
    setToDelete(null)
  }

  const newBtn = (
    <button type="button" className="btn-brass" onClick={() => setPicking(true)}>
      <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> List New Property
    </button>
  )

  return (
    <div className="min-h-[calc(100dvh-68px)] bg-white">
      <div className="mx-auto max-w-[1180px] px-4 py-7 sm:px-8 sm:pb-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[28px] font-bold text-ink-900 sm:text-[32px]">My Properties</h1>
          {newBtn}
        </div>
        {actionError && (
          <div className="mt-4">
            <Notice tone="error">{actionError}</Notice>
          </div>
        )}

        <div role="tablist" aria-label="Properties" className="no-scrollbar mt-6 flex gap-6 overflow-x-auto overflow-y-hidden border-b border-line">
          {(
            [
              ['active', 'Active Properties', active.length],
              ['progress', 'In-Progress Properties', progress.length],
            ] as [Tab, string, number][]
          ).map(([id, label, n]) => {
            const on = shown === id
            return (
              <button key={id} type="button" role="tab" aria-selected={on} onClick={() => setTab(id)} className={`relative flex shrink-0 items-center gap-2 pt-1 pb-3.5 text-[16px] whitespace-nowrap transition-colors ${on ? 'font-semibold text-pine-900' : 'text-ink-500 hover:text-ink-900'}`}>
                {label}
                <span className={`rounded-full px-2 py-0.5 text-[12.5px] font-bold ${on ? 'bg-pine-800 text-white' : 'bg-paper text-ink-700'}`}>{n}</span>
                {on && <motion.span layoutId="tab-line" className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-pine-800" />}
              </button>
            )
          })}
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brass-500 text-white ring-4 ring-brass-50">
              <CircleAlert className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-[20px] font-bold text-ink-900">{shown === 'active' ? 'No Active Properties' : 'No In-Progress Properties'}</h2>
            <p className="max-w-md text-[15px] text-ink-700">
              {shown === 'active' ? 'Properties appear here once they are live. Finish a listing to start getting bookings.' : 'You don’t have any properties in the listing process. Create a listing and activate your new property now.'}
            </p>
            <div className="mt-3">{newBtn}</div>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {list.map((l) => (
                <Row key={l.id} l={l} busy={working === l.id} onResume={() => resume(l)} onPause={() => pause(l)} onDelete={() => setToDelete(l)} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <PropertyTypePicker open={picking} busy={busy} onClose={() => setPicking(false)} onPick={start} welcome={owner ? { name: owner.fullName, drafts: progress, onResume: (l) => navigate(`${editHref(l)}?step=basics`) } : undefined} />
      <ConfirmDelete l={toDelete} busy={!!working} onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />
    </div>
  )
}
