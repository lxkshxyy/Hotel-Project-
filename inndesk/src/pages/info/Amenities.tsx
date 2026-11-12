import { useCloseGuard } from '../../components/DiscardDialog'
import { AnimatePresence } from 'framer-motion'
import { Pencil, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AmenityExtrasBox, hasExtras } from '../../components/AmenityExtras'
import { amenityGroups, checkTimes, roomAmenities, timeLabel } from '../../data/options'
import { uid } from '../../lib/format'
import type { Restaurant } from '../../lib/types'
import { btnOutline, btnSolid, Card, Dialog, Field, inputCls, PageTitle, type InfoProps } from './kit'

type Tab = 'amenities' | 'restaurant'

export default function Amenities(props: InfoProps) {
  const [tab, setTab] = useState<Tab>('amenities')
  return (
    <>
      <PageTitle title="Amenities & Restaurant" l={props.l} intro="Add all available amenities to make sure your property is shown accurately and is easy for guests to find." />
      <div role="tablist" className="mt-5 flex gap-6 border-b-2 border-ink-700">
        {(
          [
            ['amenities', 'Amenities'],
            ['restaurant', 'Restaurant'],
          ] as const
        ).map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-0.5 border-b-[3px] px-1 pb-2 text-[15.5px] transition-colors ${tab === k ? 'border-pine-800 font-medium text-pine-800' : 'border-transparent text-ink-700 hover:text-ink-900'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-5">{tab === 'amenities' ? <AmenityTab {...props} /> : <RestaurantTab {...props} />}</div>
    </>
  )
}

function YesNo({ name, on, onChange }: { name: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-6 text-[15px] text-ink-900">
      <label className="flex cursor-pointer items-center gap-2">
        <input type="radio" name={name} checked={!on} onChange={() => onChange(false)} className="h-4 w-4 accent-pine-800" /> No
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="radio" name={name} checked={on} onChange={() => onChange(true)} className="h-4 w-4 accent-pine-800" /> Yes
      </label>
    </div>
  )
}

function AmenityTab({ l, set }: InfoProps) {
  const [params, setParams] = useSearchParams()
  const forId = params.get('for') ?? 'hotel'
  const room = l.rooms.find((r) => r.id === forId)
  const [group, setGroup] = useState(amenityGroups[0].group)
  const [q, setQ] = useState('')
  const [justOn, setJustOn] = useState('')

  const toggle = (id: string, v: boolean) => {
    if (v) setJustOn(id)
    set((x) => ({ ...x, amenities: v ? [...new Set([...x.amenities, id])] : x.amenities.filter((a) => a !== id) }))
  }
  const toggleRoom = (a: string, v: boolean) => set((x) => ({ ...x, rooms: x.rooms.map((r) => (r.id === forId ? { ...r, amenities: v ? [...new Set([...r.amenities, a])] : r.amenities.filter((y) => y !== a) } : r)) }))

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return amenityGroups.filter((g) => g.group === group)
    return amenityGroups.map((g) => ({ ...g, items: g.items.filter((a) => a.label.toLowerCase().includes(t)) })).filter((g) => g.items.length)
  }, [q, group])

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[15px] whitespace-nowrap text-ink-900">
          View amenities for:
          <select
            value={forId}
            onChange={(e) =>
              setParams((p) => {
                const n = new URLSearchParams(p)
                if (e.target.value === 'hotel') n.delete('for')
                else n.set('for', e.target.value)
                return n
              })
            }
            className={`${inputCls} w-[260px]`}
          >
            <option value="hotel">Hotel (whole property)</option>
            {l.rooms.map((r, i) => (
              <option key={r.id} value={r.id}>
                {r.name || `Room type ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
        {!room && (
          <label className="relative w-full sm:w-[320px]">
            <span className="sr-only">Search amenities</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search amenities" className={`${inputCls} pr-10`} />
            <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
          </label>
        )}
      </div>

      {room ? (
        <Card className="mt-5 divide-y divide-line">
          <h2 className="px-4 py-3.5 text-[17px] font-semibold text-ink-900">
            In the room ({room.amenities.length} of {roomAmenities.length})
          </h2>
          {roomAmenities.map((a) => (
            <div key={a} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <span className="text-[15px] text-ink-900">{a}</span>
              <YesNo name={`room-${a}`} on={room.amenities.includes(a)} onChange={(v) => toggleRoom(a, v)} />
            </div>
          ))}
        </Card>
      ) : (
        <div className="mt-5 grid gap-0 overflow-hidden rounded-lg border border-line md:grid-cols-[300px_1fr]">
          <nav aria-label="Amenity categories" className={`flex gap-1 overflow-x-auto border-b border-line p-2 md:flex-col md:gap-0 md:self-stretch md:border-r md:border-b-0 md:p-0 ${q ? 'opacity-50' : ''}`}>
            {amenityGroups.map((g) => {
              const n = g.items.filter((a) => l.amenities.includes(a.id)).length
              const on = !q && g.group === group
              return (
                <button key={g.group} type="button" onClick={() => (setQ(''), setGroup(g.group))} aria-current={on} className={`shrink-0 rounded-md px-3 py-2.5 text-left text-[15px] whitespace-nowrap transition-colors md:rounded-none md:border-l-[3px] md:px-4 md:py-3 md:whitespace-normal ${on ? 'bg-pine-50 font-semibold text-pine-800 md:border-pine-800' : 'text-ink-900 hover:bg-[#F4F8FC] md:border-transparent'}`}>
                  <span className={on ? '' : 'font-medium'}>{g.group}</span> <span className="font-normal text-ink-700">({n} of {g.items.length})</span>
                </button>
              )
            })}
          </nav>
          <div className="min-w-0">
            {shown.length === 0 && <p className="px-5 py-12 text-center text-[14.5px] text-ink-700">No amenities match “{q}”.</p>}
            {shown.map((g) => (
              <div key={g.group}>
                {q && <h3 className="bg-[#F4F8FC] px-5 py-2 text-[13px] font-semibold tracking-wide text-ink-700 uppercase">{g.group}</h3>}
                {g.items.map((a) => {
                  const on = l.amenities.includes(a.id)
                  return (
                    <div key={a.id} className="border-b border-line px-4 py-4 last:border-b-0 sm:px-5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[15px] text-ink-900">{a.label}</span>
                        <YesNo name={`am-${a.id}`} on={on} onChange={(v) => toggle(a.id, v)} />
                      </div>
                      <AnimatePresence initial={false}>{on && hasExtras(a.id) && <div className="mt-3">{<AmenityExtrasBox l={l} set={set} id={a.id} label={a.label} autoOpen={justOn === a.id} />}</div>}</AnimatePresence>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const cuisines = ['North Indian', 'South Indian', 'Mughlai', 'Rajasthani', 'Gujarati', 'Bengali', 'Punjabi', 'Chinese', 'Continental', 'Italian', 'Street food', 'Jain', 'Bakery & desserts']
const meals = ['Breakfast', 'Lunch', 'Evening snacks', 'Dinner', 'All day']
const foodLabel = { veg: 'Pure veg', nonveg: 'Non-veg', both: 'Veg & non-veg' } as const

function RestaurantTab({ l, commit }: InfoProps) {
  const [edit, setEdit] = useState<Restaurant | null>(null)
  const list = l.restaurants ?? []
  const blank = (): Restaurant => ({ id: uid(6), name: '', cuisines: [], meals: ['Breakfast'], food: 'both', open: '7:00 AM', close: '11:00 PM', outsideGuests: false, alaCarte: true, buffet: false })
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14.5px] text-ink-700">Add each restaurant or café at your property. Guests see these on your property page.</p>
        <button type="button" onClick={() => setEdit(blank())} className={btnSolid}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Restaurant
        </button>
      </div>
      {list.length === 0 ? (
        <Card className="mt-5 flex flex-col items-center gap-3 px-4 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pine-50 text-pine-800">
            <UtensilsCrossed className="h-7 w-7" aria-hidden="true" />
          </span>
          <strong className="text-[17px] font-semibold text-ink-900">No restaurants added</strong>
          <p className="max-w-sm text-[14px] text-ink-700">If guests can eat at your property, add the restaurant with its cuisine and timings.</p>
        </Card>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {list.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block text-[17px] font-semibold text-ink-900">{r.name}</strong>
                  <span className="text-[13.5px] text-ink-700">
                    {foodLabel[r.food]} · {timeLabel(r.open)} – {timeLabel(r.close)}
                  </span>
                </div>
                <div className="flex shrink-0">
                  <button type="button" aria-label={`Edit ${r.name}`} onClick={() => setEdit(r)} className="flex h-9 w-9 items-center justify-center rounded-full text-pine-800 hover:bg-pine-50">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={`Delete ${r.name}`} onClick={() => commit((x) => ({ ...x, restaurants: (x.restaurants ?? []).filter((y) => y.id !== r.id) }))} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-alert-50 hover:text-alert">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[13.5px]">
                <div>
                  <dt className="text-ink-500">Cuisine</dt>
                  <dd className="text-ink-900">{r.cuisines.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Meals</dt>
                  <dd className="text-ink-900">{r.meals.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Service</dt>
                  <dd className="text-ink-900">{[r.alaCarte && 'À la carte', r.buffet && 'Buffet'].filter(Boolean).join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Open to</dt>
                  <dd className="text-ink-900">{r.outsideGuests ? 'Everyone' : 'Staying guests only'}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      )}
      <AnimatePresence>
        {edit && (
          <RestaurantDialog
            key={edit.id}
            r={edit}
            isNew={!list.some((x) => x.id === edit.id)}
            onClose={() => setEdit(null)}
            onSave={(r) => {
              commit((x) => {
                const cur = x.restaurants ?? []
                return { ...x, restaurants: cur.some((y) => y.id === r.id) ? cur.map((y) => (y.id === r.id ? r : y)) : [...cur, r] }
              })
              setEdit(null)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function Pills({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o)
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} className={`h-9 rounded-full border px-3.5 text-[13.5px] font-semibold transition-colors ${on ? 'border-pine-800 bg-pine-800 text-white' : 'border-line-strong text-ink-700 hover:border-pine-700'}`}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

function RestaurantDialog({ r: start, isNew, onClose, onSave }: { r: Restaurant; isNew: boolean; onClose: () => void; onSave: (r: Restaurant) => void }) {
  const [r, setR] = useState(start)
  const [tried, setTried] = useState(false)
  const put = (p: Partial<Restaurant>) => setR((x) => ({ ...x, ...p }))
  const errs = { name: r.name.trim().length < 2 ? 'Enter the restaurant name.' : '', cuisines: r.cuisines.length ? '' : 'Pick at least one cuisine.', meals: r.meals.length ? '' : 'Pick at least one meal.' }
  const ok = !errs.name && !errs.cuisines && !errs.meals
  const [close, discard] = useCloseGuard(JSON.stringify(r) !== JSON.stringify(start), onClose)
  return (
    <>
    {discard}
    <Dialog
      wide
      title={isNew ? 'Add Restaurant' : 'Edit Restaurant'}
      onClose={close}
      footer={
        <>
          <button type="button" onClick={close} className={btnOutline}>
            Cancel
          </button>
          <button type="button" onClick={() => (setTried(true), ok && onSave({ ...r, name: r.name.trim() }))} className={btnSolid}>
            {isNew ? 'Add restaurant' : 'Save'}
          </button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Restaurant name" required error={tried ? errs.name : undefined} htmlFor="r-name">
          <input id="r-name" value={r.name} maxLength={60} onChange={(e) => put({ name: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Food served" htmlFor="r-food">
          <select id="r-food" value={r.food} onChange={(e) => put({ food: e.target.value as Restaurant['food'] })} className={inputCls}>
            {(Object.keys(foodLabel) as Restaurant['food'][]).map((k) => (
              <option key={k} value={k}>
                {foodLabel[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Opens at" htmlFor="r-open">
          <select id="r-open" value={r.open} onChange={(e) => put({ open: e.target.value })} className={inputCls}>
            {checkTimes.map((t) => (
              <option key={t} value={t}>
                {timeLabel(t)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Closes at" htmlFor="r-close">
          <select id="r-close" value={r.close} onChange={(e) => put({ close: e.target.value })} className={inputCls}>
            {checkTimes.map((t) => (
              <option key={t} value={t}>
                {timeLabel(t)}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Cuisine" required error={tried ? errs.cuisines : undefined}>
            <Pills options={cuisines} value={r.cuisines} onChange={(v) => put({ cuisines: v })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Meals" required error={tried ? errs.meals : undefined}>
            <Pills options={meals} value={r.meals} onChange={(v) => put({ meals: v })} />
          </Field>
        </div>
        <Field label="Seating capacity" htmlFor="r-seats">
          <input id="r-seats" type="number" inputMode="numeric" min={0} value={r.seating ?? ''} onChange={(e) => put({ seating: Number(e.target.value) || undefined })} className={inputCls} />
        </Field>
        <div className="flex flex-col justify-end gap-2.5 text-[15px] text-ink-900">
          {(
            [
              ['alaCarte', 'À la carte'],
              ['buffet', 'Buffet'],
              ['outsideGuests', 'Open to outside guests'],
            ] as const
          ).map(([k, t]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={r[k]} onChange={() => put({ [k]: !r[k] })} className="h-4 w-4 accent-pine-800" /> {t}
            </label>
          ))}
        </div>
      </div>
    </Dialog>
    </>
  )
}
