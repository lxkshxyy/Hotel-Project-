import { AnimatePresence } from 'framer-motion'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mealPlans } from '../../data/options'
import { inr, uid } from '../../lib/format'
import type { ListingRoom, RatePlan } from '../../lib/types'
import { btnLink, btnOutline, btnSolid, Card, Dialog, Field, inputCls, PageTitle, type InfoProps } from './kit'

/** Short industry codes for meal plans. */
const planCode = (m?: string) => (!m || m === mealPlans[0] ? 'EP' : m === mealPlans[1] ? 'CP' : m === mealPlans[2] ? 'MAP' : m === mealPlans[3] ? 'AP' : 'AI')
const planName = (m?: string) => `${planCode(m)} – ${m === mealPlans[0] || !m ? 'Room only' : m}`

/** The base plan (from the room's own meal plan and price) plus any extra rate plans. */
export function ratePlansOf(r: ListingRoom): (RatePlan & { base?: boolean })[] {
  return [{ id: `${r.id}-base`, name: planName(r.mealPlan), mealPlan: r.mealPlan ?? mealPlans[0], price: r.price, active: !r.inactive, base: true }, ...(r.ratePlans ?? [])]
}

export default function Rooms({ l, commit, base }: InfoProps) {
  const navigate = useNavigate()
  const [adding, setAdding] = useState<ListingRoom | null>(null)
  const [viewing, setViewing] = useState<ListingRoom | null>(null)
  const edit = (r: ListingRoom) => navigate(`${base}/edit?step=rooms&room=${r.id}&sec=1`)
  const create = () => {
    const r: ListingRoom = { id: uid(6), name: '', bed: '', sizeSqft: 0, maxGuests: 0, count: 1, price: 0, breakfast: false, amenities: [], bedrooms: 1, livingRooms: 0, extraBed: null }
    void commit((x) => ({ ...x, rooms: [...x.rooms, r] })).then(() => edit(r))
  }
  const room = (id: string) => l.rooms.find((r) => r.id === id)

  return (
    <>
      <PageTitle title="Rooms & Rateplans" l={l} />
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <h2 className="text-[18px] font-semibold text-ink-900">Existing Rooms ({l.rooms.length})</h2>
          <button type="button" onClick={create} className={btnSolid}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Create New Room
          </button>
        </div>
        <div className="hidden grid-cols-[1fr_1.6fr_0.9fr_1fr] border-y border-line-strong bg-[#e9ecea] text-[14px] font-semibold text-ink-900 md:grid">
          <span className="px-4 py-3">Room Name</span>
          <span className="border-l border-line-strong px-4 py-3">Description</span>
          <span className="border-l border-line-strong px-4 py-3">Actions</span>
          <span className="border-l border-line-strong px-4 py-3">Rateplans</span>
        </div>
        {l.rooms.length === 0 && <p className="px-6 py-12 text-center text-[14.5px] text-ink-700">No rooms yet. Create your first room type.</p>}
        {l.rooms.map((r, i) => {
          const plans = ratePlansOf(r)
          return (
            <div key={r.id} className={`grid gap-3 border-b border-line px-4 py-4 text-[14.5px] text-ink-900 last:border-b-0 md:grid-cols-[1fr_1.6fr_0.9fr_1fr] md:gap-0 md:p-0 ${i % 2 ? '' : 'md:bg-[#f7f8f7]'}`}>
              <div className="md:px-4 md:py-4">
                <strong className="font-semibold md:font-normal">{r.name.trim() || `Room type ${i + 1}`}</strong>
                <span className="block text-[13px] text-ink-500">
                  {r.count} room{r.count === 1 ? '' : 's'}
                  {r.roomType ? ` · ${r.roomType}` : ''}
                </span>
              </div>
              <p className="text-ink-700 md:border-l md:border-line md:px-4 md:py-4">{r.description?.trim() || <span className="text-ink-400">No description yet</span>}</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 md:flex-col md:items-start md:border-l md:border-line md:px-4 md:py-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={!r.inactive} onChange={() => commit((x) => ({ ...x, rooms: x.rooms.map((y) => (y.id === r.id ? { ...y, inactive: !y.inactive } : y)) }))} className="h-4 w-4 accent-pine-800" />
                  Active
                </label>
                <button type="button" onClick={() => edit(r)} className={btnLink}>
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edit Room
                </button>
                <Link to={`${base}/info/amenities?for=${r.id}`} className={`${btnLink} no-underline`}>
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edit Amenities
                </Link>
                <button type="button" onClick={() => setAdding(r)} className={btnLink}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add Rateplan
                </button>
              </div>
              <div className="md:border-l md:border-line md:px-4 md:py-4">
                <ol className="list-decimal pl-5 text-[14px]">
                  {plans.slice(0, 3).map((p) => (
                    <li key={p.id} className={p.active ? '' : 'text-ink-400 line-through'}>
                      {p.name}
                    </li>
                  ))}
                </ol>
                {plans.length > 3 && <span className="text-[13.5px] text-ink-500">+ {plans.length - 3} more</span>}
                <button type="button" onClick={() => setViewing(r)} className={`${btnLink} mt-2 rounded-md bg-pine-50 px-3 py-1.5`}>
                  Click to view rateplans
                </button>
              </div>
            </div>
          )
        })}
      </Card>

      <AnimatePresence>
        {adding && <PlanDialog key="add" room={adding} onClose={() => setAdding(null)} onSave={(p) => (commit((x) => ({ ...x, rooms: x.rooms.map((y) => (y.id === adding.id ? { ...y, ratePlans: [...(y.ratePlans ?? []), p] } : y)) })), setAdding(null))} />}
        {viewing && room(viewing.id) && (
          <ViewPlans
            key="view"
            room={room(viewing.id)!}
            onClose={() => setViewing(null)}
            onEditBase={() => navigate(`${base}/edit?step=rooms&room=${viewing.id}&sec=4`)}
            onToggle={(pid) => commit((x) => ({ ...x, rooms: x.rooms.map((y) => (y.id === viewing.id ? { ...y, ratePlans: y.ratePlans?.map((p) => (p.id === pid ? { ...p, active: !p.active } : p)) } : y)) }))}
            onDelete={(pid) => commit((x) => ({ ...x, rooms: x.rooms.map((y) => (y.id === viewing.id ? { ...y, ratePlans: y.ratePlans?.filter((p) => p.id !== pid) } : y)) }))}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function PlanDialog({ room, onClose, onSave }: { room: ListingRoom; onClose: () => void; onSave: (p: RatePlan) => void }) {
  const used = new Set(ratePlansOf(room).map((p) => p.mealPlan))
  const [meal, setMeal] = useState(mealPlans.find((m) => !used.has(m)) ?? mealPlans[1])
  const [price, setPrice] = useState(room.price ? Math.round(room.price * 1.15) : 0)
  const [name, setName] = useState('')
  const ok = price >= 100
  return (
    <Dialog
      title={`Add Rateplan · ${room.name || 'Room'}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button type="button" disabled={!ok} onClick={() => onSave({ id: uid(6), name: name.trim() || planName(meal), mealPlan: meal, price, active: true })} className={btnSolid}>
            Add rateplan
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Meal plan" htmlFor="rp-meal">
          <select id="rp-meal" value={meal} onChange={(e) => setMeal(e.target.value)} className={inputCls}>
            {mealPlans.map((m) => (
              <option key={m} value={m}>
                {planCode(m)} – {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rateplan name" hint="Leave empty to use the meal plan name." htmlFor="rp-name">
          <input id="rp-name" value={name} maxLength={50} placeholder={planName(meal)} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Price per night (before GST)" error={ok ? undefined : 'Enter at least ₹100.'} hint={room.price ? `Base plan: ${inr(room.price)}` : undefined} htmlFor="rp-price">
          <div className="relative">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-500">₹</span>
            <input id="rp-price" type="number" inputMode="numeric" min={100} value={price || ''} onChange={(e) => setPrice(Number(e.target.value))} className={`${inputCls} pl-7`} />
          </div>
        </Field>
      </div>
    </Dialog>
  )
}

function ViewPlans({ room, onClose, onEditBase, onToggle, onDelete }: { room: ListingRoom; onClose: () => void; onEditBase: () => void; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <Dialog title={`Rateplans · ${room.name || 'Room'}`} onClose={onClose} wide>
      <div className="overflow-hidden rounded-lg border border-line">
        {ratePlansOf(room).map((p, i) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
            <span className="w-6 text-[14px] text-ink-500">{i + 1}.</span>
            <div className="min-w-0 flex-1">
              <strong className="block text-[15px] font-medium text-ink-900">{p.name}</strong>
              <span className="text-[13px] text-ink-500">
                {inr(p.price)} a night · {p.mealPlan}
                {p.base ? ' · Base plan' : ''}
              </span>
            </div>
            {p.base ? (
              <button type="button" onClick={onEditBase} className={btnLink}>
                <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
              </button>
            ) : (
              <>
                <label className="flex cursor-pointer items-center gap-2 text-[14px]">
                  <input type="checkbox" checked={p.active} onChange={() => onToggle(p.id)} className="h-4 w-4 accent-pine-800" /> Active
                </label>
                <button type="button" aria-label={`Delete ${p.name}`} onClick={() => onDelete(p.id)} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-alert-50 hover:text-alert">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-ink-500">The base plan comes from the room’s meal plan and price. Turning the room off (Active) hides every plan.</p>
    </Dialog>
  )
}
