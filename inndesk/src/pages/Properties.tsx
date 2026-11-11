import { AnimatePresence, motion } from 'framer-motion'
import { Building2, MoreVertical, Pause, Pencil, Play, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApplyFilter, PageSize, Pager, SortHead } from '../components/Filters'
import { groupLabel, PropertyTypePicker, type Category } from '../components/PropertyTypePicker'
import { indianStates } from '../data/options'
import { Notice, Spinner } from '../components/ui'
import { useSession } from '../context/Session'
import { inr, todayISO } from '../lib/format'
import { useListings, useReservations, type ResvRow } from '../lib/hooks'
import { blankListing } from '../lib/listing'
import { contentScore } from '../lib/score'
import { deleteListing, saveListing, setListingStatus } from '../lib/store'
import type { Listing, ListingStatus } from '../lib/types'

const editHref = (l: Listing) => `/app/properties/${l.id}/edit`
const statusText: Record<ListingStatus, string> = { live: 'Active', paused: 'Inactive', draft: 'Draft' }
const statusColor: Record<ListingStatus, string> = { live: 'text-live', paused: 'text-ink-500', draft: 'text-brass-700' }

/** Month-to-date revenue and average daily rate from this property's bookings. */
function mtd(l: Listing, bookings: ResvRow[]) {
  const month = todayISO().slice(0, 7)
  const b = bookings.filter((r) => r.hotel_slug === l.slug && r.status !== 'cancelled' && r.check_in.slice(0, 7) === month)
  if (!b.length) return { revenue: null, adr: null }
  const roomNights = b.reduce((n, r) => n + r.nights * r.rooms, 0)
  return { revenue: b.reduce((n, r) => n + r.amount, 0), adr: roomNights ? b.reduce((n, r) => n + r.room_total, 0) / roomNights : null }
}

type SortKey = 'name' | 'revenue' | 'adr' | 'score'

/** ⋮ menu on each property: Resume listing, Pause, Delete. */
function RowMenu({ l, onResume, onPause, onDelete }: { l: Listing; onResume: () => void; onPause: () => void; onDelete: () => void }) {
  // The menu floats on the page (fixed), so the table's sideways scroll can't clip it.
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const open = !!pos
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(open) : v
    const r = box.current?.getBoundingClientRect()
    setPos(next && r ? { top: r.bottom + 6, right: window.innerWidth - r.right } : null)
  }
  const box = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => !box.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node) && setPos(null)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPos(null)
    const away = () => setPos(null)
    document.addEventListener('mousedown', out)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', away, true)
    window.addEventListener('resize', away)
    return () => {
      document.removeEventListener('mousedown', out)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', away, true)
      window.removeEventListener('resize', away)
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
          <motion.div ref={menuRef} role="menu" style={pos ?? undefined} initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.14 }} className="fixed z-50 w-[230px] text-left overflow-hidden rounded-xl bg-white py-1.5 shadow-[0_16px_40px_-12px_rgba(18,55,42,0.3)] ring-1 ring-line">
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
  const { list: bookings } = useReservations(data)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [working, setWorking] = useState('')
  const [toDelete, setToDelete] = useState<Listing | null>(null)
  const [actionError, setActionError] = useState('')
  const [tab, setTab] = useState<ListingStatus | null>(null)
  const [propF, setPropF] = useState<string[]>([])
  const [typeF, setTypeF] = useState<string[]>([])
  const [cityF, setCityF] = useState<string[]>([])
  const [stateF, setStateF] = useState<string[]>([])
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' })
  const [size, setSize] = useState(100)
  const [page, setPage] = useState(1)
  const picking = params.get('new') === '1'
  const setPicking = (v: boolean) => setParams(v ? { new: '1' } : {}, { replace: !v })

  const rows = useMemo(() => (data ?? []).map((l) => ({ l, ...mtd(l, bookings), score: contentScore(l), city: l.location.city.trim(), state: (l.location.state ?? '').trim(), area: l.location.area.trim() })), [data, bookings])
  const counts = useMemo(() => ({ live: rows.filter((r) => r.l.status === 'live').length, draft: rows.filter((r) => r.l.status === 'draft').length, paused: rows.filter((r) => r.l.status === 'paused').length }), [rows])
  const shownTab: ListingStatus = tab ?? (counts.live ? 'live' : counts.draft ? 'draft' : counts.paused ? 'paused' : 'live')
  const inTab = useMemo(() => rows.filter((r) => r.l.status === shownTab), [rows, shownTab])
  const place = (r: (typeof rows)[number]) => [r.city, r.state].filter(Boolean).join(', ')
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const opts = useMemo(
    () => ({
      prop: inTab.map((r) => ({ value: r.l.id, label: r.l.basics.name.trim() || `${r.l.basics.propertyType} (unnamed)`, sub: place(r) || 'No address yet' })),
      type: uniq(inTab.map((r) => r.l.basics.propertyType)).map((t) => ({ value: t, label: t, sub: groupLabel(inTab.find((r) => r.l.basics.propertyType === t)?.l.basics.category) || undefined })),
      city: uniq(inTab.map((r) => r.city)).map((c) => ({ value: c, label: c, sub: inTab.find((r) => r.city === c)?.state || undefined })),
      state: indianStates.map((x) => {
        const n = inTab.filter((r) => r.state.toLowerCase() === x.name.toLowerCase()).length
        return { value: x.name, label: x.name, sub: `${x.ut ? 'Union territory · ' : ''}${n ? `${n} ${n === 1 ? 'property' : 'properties'}` : 'No properties'}` }
      }),
    }),
    [inTab], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const shown = useMemo(() => {
    const has = (f: string[], v: string) => !f.length || f.some((x) => x.toLowerCase() === v.toLowerCase())
    const val = (r: (typeof rows)[number]) => (sort.key === 'name' ? (r.l.basics.name.trim() || '~').toLowerCase() : sort.key === 'revenue' ? (r.revenue ?? -1) : sort.key === 'adr' ? (r.adr ?? -1) : r.score)
    return inTab
      .filter((r) => (!propF.length || propF.includes(r.l.id)) && has(typeF, r.l.basics.propertyType) && has(cityF, r.city) && has(stateF, r.state))
      .sort((a, b) => {
        const x = val(a)
        const y = val(b)
        return (sort.dir === 'asc' ? 1 : -1) * (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number))
      })
  }, [inTab, propF, typeF, cityF, stateF, sort])

  if (!data) return error ? <div className="p-6"><Notice tone="error">{error}</Notice></div> : <Spinner />
  const drafts = data.filter((l) => l.status === 'draft')
  const pages = Math.max(1, Math.ceil(shown.length / size))
  const cur = Math.min(page, pages)
  const pageRows = shown.slice((cur - 1) * size, cur * size)
  const filtered = !!(propF.length || typeF.length || cityF.length || stateF.length)
  const clearAll = () => (setPropF([]), setTypeF([]), setCityF([]), setStateF([]), setPage(1))

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
  const toggleSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  const dir = (key: SortKey) => (sort.key === key ? sort.dir : null)
  const reset = (fn: (v: string[]) => void) => (v: string[]) => (fn(v), setPage(1))
  const na = <span className="text-ink-400">N/A</span>

  return (
    <div className="min-h-[calc(100dvh-68px)] bg-white">
      <div className="mx-auto max-w-[1280px] px-4 py-7 sm:px-8 sm:pb-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[30px] font-bold text-ink-900 sm:text-[34px]">My Properties</h1>
          <button type="button" onClick={() => setPicking(true)} className="btn-brass">
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> List New Property
          </button>
        </div>
        {actionError && (
          <div className="mt-4">
            <Notice tone="error">{actionError}</Notice>
          </div>
        )}

        <div role="tablist" aria-label="Properties" className="no-scrollbar mt-6 flex gap-7 overflow-x-auto overflow-y-hidden border-b-2 border-line">
          {(
            [
              ['live', 'Active Properties', counts.live],
              ['draft', 'In-Progress Properties', counts.draft],
              ['paused', 'Inactive Properties', counts.paused],
            ] as [ListingStatus, string, number][]
          ).map(([id, label, n]) => (
            <button key={id} type="button" role="tab" aria-selected={shownTab === id} onClick={() => (setTab(id), clearAll())} className={`relative shrink-0 pt-1 pb-3 text-[16px] whitespace-nowrap transition-colors ${shownTab === id ? 'font-semibold text-pine-800' : 'text-ink-700 hover:text-ink-900'}`}>
              {label} ({n})
              {shownTab === id && <motion.span layoutId="prop-tab" className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-pine-800" />}
            </button>
          ))}
        </div>

        {/* Filters only on Active Properties. */}
        {shownTab === 'live' && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-[15px] font-semibold text-ink-900">Filter and Search by:</span>
            <ApplyFilter label="Property" placeholder="Search property" options={opts.prop} selected={propF} onChange={reset(setPropF)} />
            <ApplyFilter label="Stay type" placeholder="Search stay type" options={opts.type} selected={typeF} onChange={reset(setTypeF)} />
            <ApplyFilter label="City" placeholder="Search city" options={opts.city} selected={cityF} onChange={reset(setCityF)} />
            <ApplyFilter label="State" placeholder="Search state or union territory" options={opts.state} selected={stateF} onChange={reset(setStateF)} />
            {filtered && (
              <button type="button" onClick={clearAll} className="text-[14.5px] font-semibold text-pine-800 hover:underline">
                Clear all
              </button>
            )}
          </div>
        )}

        <div className="relative mt-5 overflow-hidden rounded-xl border border-line">
          <div className="relative overflow-x-auto">
            <table className="w-full border-collapse md:min-w-[860px]">
              <thead className="bg-[#f3f6f4] text-[13.5px]">
                <tr>
                  <th className="px-4 py-3.5 text-left">
                    <SortHead label="Name" dir={dir('name')} onClick={() => toggleSort('name')} />
                  </th>
                  <th className="hidden px-4 py-3.5 text-right md:table-cell">
                    <SortHead label="Revenue (MTD)" dir={dir('revenue')} onClick={() => toggleSort('revenue')} />
                  </th>
                  <th className="hidden px-4 py-3.5 text-right md:table-cell">
                    <SortHead label="Avg daily rate (MTD)" dir={dir('adr')} onClick={() => toggleSort('adr')} />
                  </th>
                  <th className="px-4 py-3.5 text-right">
                    <SortHead label="Content score" dir={dir('score')} onClick={() => toggleSort('score')} className="whitespace-nowrap" />
                  </th>
                  <th className="w-14 px-2 py-3.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {pageRows.map(({ l, revenue, adr, score, city, state }) => {
                    const href = l.status === 'draft' ? `${editHref(l)}?step=basics` : `/app/properties/${l.id}`
                    return (
                      <motion.tr key={l.id} layout initial={{ opacity: 0 }} animate={{ opacity: working === l.id ? 0.5 : 1 }} exit={{ opacity: 0 }} className="border-t border-line transition-colors hover:bg-[#f8faf9]">
                        <td className="px-4 py-3">
                          <Link to={href} className="group flex items-center gap-3.5 no-underline">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-pine-50 to-brass-50 ring-1 ring-line">
                              {l.photos[0] ? <img src={l.photos[0].url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-pine-700/50" strokeWidth={1.5} aria-hidden="true" />}
                            </span>
                            <span className="min-w-0">
                              <span className={`block truncate text-[15.5px] group-hover:underline ${l.basics.name.trim() ? 'text-ink-900' : 'text-ink-500'}`}>{l.basics.name.trim() || `${l.basics.propertyType} (unnamed)`}</span>
                              <span className="block text-[12.5px] text-ink-500">
                                <span className={`font-medium ${statusColor[l.status]}`}>{statusText[l.status]}</span>
                                <span className="ml-1.5">{l.id.toUpperCase()}</span>
                                {city && ` · ${[city, state].filter(Boolean).join(', ')}`}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="hidden px-4 py-3 text-right text-[14.5px] text-ink-900 md:table-cell">{revenue == null ? na : inr(revenue)}</td>
                        <td className="hidden px-4 py-3 text-right text-[14.5px] text-ink-900 md:table-cell">{adr == null ? na : inr(adr)}</td>
                        <td className="px-4 py-3 text-right text-[14.5px] text-ink-900">{score}/100</td>
                        <td className="px-2 py-3 text-right">
                          <RowMenu l={l} onResume={() => resume(l)} onPause={() => pause(l)} onDelete={() => setToDelete(l)} />
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          {pageRows.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
              <TriangleAlert className="h-12 w-12 fill-[#e9eeeb] text-[#c5cfc9]" strokeWidth={1.6} aria-hidden="true" />
              <strong className="mt-2 text-[16px] font-semibold text-ink-900">{filtered ? 'No properties found' : shownTab === 'live' ? 'No Active Properties' : shownTab === 'draft' ? 'No In-Progress Properties' : 'No Inactive Properties'}</strong>
              <p className="max-w-md text-[14px] text-ink-700">{filtered ? 'Try another search or change the filters.' : shownTab === 'live' ? 'Properties appear here once they are live. Finish a listing to start getting bookings.' : shownTab === 'draft' ? 'You don’t have any properties in the listing process.' : 'Paused properties appear here.'}</p>
              <button type="button" onClick={filtered ? clearAll : () => setPicking(true)} className="mt-3 h-11 rounded-full border border-line-strong px-6 text-[15px] font-semibold text-pine-800 hover:border-pine-700 hover:bg-pine-50">
                {filtered ? 'Start over' : 'List a property'}
              </button>
            </div>
          )}
        </div>

        {shown.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <PageSize value={size} onChange={(n) => (setSize(n), setPage(1))} />
            <Pager page={cur} pages={pages} onPage={setPage} />
          </div>
        )}
      </div>

      <PropertyTypePicker open={picking} busy={busy} onClose={() => setPicking(false)} onPick={start} welcome={owner ? { name: owner.fullName, drafts, onResume: (l) => navigate(`${editHref(l)}?step=basics`) } : undefined} />
      <ConfirmDelete l={toDelete} busy={!!working} onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />
    </div>
  )
}
