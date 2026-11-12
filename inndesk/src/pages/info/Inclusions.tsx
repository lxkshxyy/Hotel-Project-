import { AnimatePresence, motion } from 'framer-motion'
import { CircleHelp, Gift, Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { RangeCalendar } from '../../components/RangeCalendar'
import { addDays, parseISODate, todayISO, uid } from '../../lib/format'
import type { Inclusion } from '../../lib/types'
import { btnOutline, btnSolid, Card, Dialog, Field, inputCls, PageTitle, type InfoProps } from './kit'

export const inclusionKinds = ['Welcome drink', 'Complimentary breakfast', 'Early check-in (subject to availability)', 'Late checkout (subject to availability)', 'Airport / station pickup', 'Airport / station drop', 'Evening snacks', 'Discount on food & beverages', 'Spa discount', 'Free laundry (2 pieces)', 'Room upgrade (subject to availability)', 'Sightseeing tour', 'Other']

const nice = (iso: string) => parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const expired = (i: Inclusion) => !i.active || (!!i.to && i.to < todayISO())

export default function Inclusions({ l, commit }: InfoProps) {
  const [tab, setTab] = useState<'active' | 'old'>('active')
  const [open, setOpen] = useState<string[]>(l.rooms[0] ? [l.rooms[0].id] : [])
  const [edit, setEdit] = useState<Inclusion | null>(null)
  const all = l.inclusions ?? []
  const act = all.filter((i) => !expired(i))
  const old = all.filter(expired)
  const list = tab === 'active' ? act : old
  const forRoom = (rid: string) => list.filter((i) => !i.roomIds.length || i.roomIds.includes(rid))
  const blank = (): Inclusion => ({ id: uid(8), kind: inclusionKinds[0], detail: '', roomIds: [], from: todayISO(), active: true, createdAt: new Date().toISOString() })

  return (
    <>
      <PageTitle title="Inclusions" l={l} />
      <Card className="mt-6 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div role="tablist" className="flex gap-6">
            {(
              [
                ['active', `All Customer Inclusions (${act.length})`],
                ['old', `Expired / Deactivated (${old.length})`],
              ] as const
            ).map(([k, t]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`relative pb-2 text-[13.5px] font-medium tracking-wide uppercase ${tab === k ? 'text-pine-800' : 'text-ink-900 hover:text-pine-800'}`}>
                {t}
                {tab === k && <motion.span layoutId="incl-tab" className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-pine-800" />}
              </button>
            ))}
          </div>
          <div className="flex overflow-hidden rounded-lg">
            <button type="button" onClick={() => setEdit(blank())} className={`${btnSolid} rounded-none`}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Offer an Inclusion
            </button>
            <span title="Inclusions are free extras guests get with a room, like a welcome drink or late checkout. They show on the room on your property page." className="flex w-10 items-center justify-center border-l border-white/30 bg-pine-800 text-white/80">
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {l.rooms.length === 0 && <p className="py-8 text-center text-[14.5px] text-ink-700">Add a room under Rooms &amp; Rateplans first.</p>}
          {l.rooms.map((r, i) => {
            const items = forRoom(r.id)
            const isOpen = open.includes(r.id)
            return (
              <div key={r.id} className="overflow-hidden rounded-lg border border-line-strong">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen((o) => (o.includes(r.id) ? o.filter((x) => x !== r.id) : [...o, r.id]))} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F4F8FC]">
                  <span className="flex h-8 w-8 items-center justify-center rounded bg-[#E6EEF7] text-pine-800">{isOpen ? <Minus className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}</span>
                  <strong className="flex-1 text-[14.5px] font-semibold text-ink-900">{r.name || `Room type ${i + 1}`}</strong>
                  <span className="text-[13px] text-ink-500">
                    {items.length} inclusion{items.length === 1 ? '' : 's'}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="border-t border-line">
                        {items.length === 0 ? (
                          <p className="px-4 py-4 text-[14px] text-ink-700">{tab === 'active' ? 'No inclusions on this room yet.' : 'Nothing expired or deactivated.'}</p>
                        ) : (
                          items.map((inc) => (
                            <div key={inc.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                              <Gift className="h-5 w-5 shrink-0 text-brass-600" aria-hidden="true" />
                              <div className="min-w-0 flex-1">
                                <strong className="block text-[14.5px] font-medium text-ink-900">{inc.kind}</strong>
                                <span className="text-[13px] text-ink-500">
                                  {inc.detail ? `${inc.detail} · ` : ''}
                                  {inc.to ? `${nice(inc.from)} – ${nice(inc.to)}` : `From ${nice(inc.from)}, no end date`}
                                  {inc.roomIds.length ? '' : ' · All rooms'}
                                </span>
                              </div>
                              {tab === 'active' ? (
                                <>
                                  <button type="button" onClick={() => setEdit(inc)} className="text-[13.5px] font-semibold text-pine-800 hover:underline">
                                    Modify
                                  </button>
                                  <button type="button" onClick={() => commit((x) => ({ ...x, inclusions: (x.inclusions ?? []).map((y) => (y.id === inc.id ? { ...y, active: false } : y)) }))} className="text-[13.5px] font-semibold text-ink-700 hover:underline">
                                    Deactivate
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button type="button" onClick={() => commit((x) => ({ ...x, inclusions: (x.inclusions ?? []).map((y) => (y.id === inc.id ? { ...y, active: true, to: y.to && y.to < todayISO() ? undefined : y.to } : y)) }))} className="text-[13.5px] font-semibold text-pine-800 hover:underline">
                                    Reactivate
                                  </button>
                                  <button type="button" aria-label={`Delete ${inc.kind}`} onClick={() => commit((x) => ({ ...x, inclusions: (x.inclusions ?? []).filter((y) => y.id !== inc.id) }))} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-alert-50 hover:text-alert">
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </Card>

      <AnimatePresence>
        {edit && (
          <InclusionDialog
            key={edit.id}
            inc={edit}
            rooms={l.rooms.map((r, i) => ({ id: r.id, name: r.name || `Room type ${i + 1}` }))}
            isNew={!all.some((x) => x.id === edit.id)}
            onClose={() => setEdit(null)}
            onSave={(inc) => {
              commit((x) => {
                const cur = x.inclusions ?? []
                return { ...x, inclusions: cur.some((y) => y.id === inc.id) ? cur.map((y) => (y.id === inc.id ? inc : y)) : [...cur, inc] }
              })
              setTab('active')
              setEdit(null)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function InclusionDialog({ inc: start, rooms, isNew, onClose, onSave }: { inc: Inclusion; rooms: { id: string; name: string }[]; isNew: boolean; onClose: () => void; onSave: (i: Inclusion) => void }) {
  const [inc, setInc] = useState(start)
  const put = (p: Partial<Inclusion>) => setInc((x) => ({ ...x, ...p }))
  const needDetail = inc.kind === 'Other' && inc.detail.trim().length < 3
  return (
    <Dialog
      wide
      title={isNew ? 'Offer an Inclusion' : 'Modify Inclusion'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button type="button" disabled={needDetail} onClick={() => onSave({ ...inc, detail: inc.detail.trim() })} className={btnSolid}>
            {isNew ? 'Offer inclusion' : 'Save'}
          </button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Inclusion" htmlFor="i-kind">
          <select id="i-kind" value={inc.kind} onChange={(e) => put({ kind: e.target.value })} className={inputCls}>
            {inclusionKinds.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label={inc.kind === 'Other' ? 'Describe it' : 'Details (optional)'} error={needDetail ? 'Describe the inclusion.' : undefined} hint="e.g. “One per guest per stay”" htmlFor="i-detail">
          <input id="i-detail" value={inc.detail} maxLength={80} onChange={(e) => put({ detail: e.target.value })} className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Dates">
            <RangeCalendar tabs={false} centered clearable={false} single={!inc.to} min={isNew ? todayISO() : undefined} label={inc.to ? 'From – To' : 'Starts on'} value={{ mode: 'stay', from: inc.from, to: inc.to ?? inc.from }} onChange={(v) => v && put({ from: v.from, to: inc.to ? (v.to > v.from ? v.to : addDays(v.from, 1)) : undefined })} />
          </Field>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-[14px] text-ink-900">
            <input type="checkbox" checked={!inc.to} onChange={() => put({ to: inc.to ? undefined : addDays(inc.from, 30) })} className="h-4 w-4 accent-pine-800" /> No end date
          </label>
        </div>
        <div className="sm:col-span-2">
          <Field label="Rooms">
            <div className="flex flex-wrap gap-2">
              {[{ id: '', name: 'All rooms' }, ...rooms].map((r) => {
                const on = r.id ? inc.roomIds.includes(r.id) : inc.roomIds.length === 0
                return (
                  <button key={r.id || 'all'} type="button" aria-pressed={on} onClick={() => put({ roomIds: !r.id ? [] : on ? inc.roomIds.filter((x) => x !== r.id) : [...inc.roomIds, r.id] })} className={`h-9 rounded-full border px-3.5 text-[13.5px] font-semibold transition-colors ${on ? 'border-pine-800 bg-pine-800 text-white' : 'border-line-strong text-ink-700 hover:border-pine-700'}`}>
                    {r.name}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>
      </div>
    </Dialog>
  )
}
