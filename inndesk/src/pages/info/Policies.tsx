import { useCloseGuard } from '../../components/DiscardDialog'
import { AnimatePresence } from 'framer-motion'
import { Check, CircleAlert, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { RangeCalendar } from '../../components/RangeCalendar'
import { Toggle } from '../../components/ui'
import { cancellationOptions, checkTimes, timeLabel, type CancellationId } from '../../data/options'
import { policyGroups, type HouseAnswers } from '../../data/policyRules'
import { addDays, parseISODate, todayISO, uid } from '../../lib/format'
import type { Listing } from '../../lib/types'
import { CancelTimeline, RuleGroup } from '../Wizard'
import { ratePlansOf } from './Rooms'
import { btnOutline, btnSolid, Card, Dialog, Faq, Field, inputCls, PageTitle, Tabs, type InfoProps } from './kit'

type Tab = 'cancel' | 'rules' | 'notices' | 'child' | 'post'
const nice = (iso: string) => parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Policies(props: InfoProps) {
  const [tab, setTab] = useState<Tab>('cancel')
  return (
    <>
      <PageTitle title="Rules and Policies" l={props.l} />
      <Tabs
        id="policies"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'cancel', label: 'Cancellation Policies' },
          { id: 'rules', label: 'Property Rules' },
          { id: 'notices', label: 'Notices' },
          { id: 'child', label: 'Child Age Policy' },
          { id: 'post', label: 'Post Booking Policies' },
        ]}
      />
      <div className="mt-6">{tab === 'cancel' ? <Cancellation {...props} /> : tab === 'rules' ? <Rules {...props} /> : tab === 'notices' ? <Notices {...props} /> : tab === 'child' ? <ChildAge {...props} /> : <PostBooking {...props} />}</div>
    </>
  )
}

const upP = (set: InfoProps['set'], x: Partial<Listing['policies']>) => set((y) => ({ ...y, policies: { ...y.policies, ...x } }))

function Cancellation({ l, set, commit }: InfoProps) {
  const p = l.policies
  const [picking, setPicking] = useState(false)
  const [menu, setMenu] = useState(false)
  const cur = cancellationOptions.find((c) => c.id === p.cancellation) ?? cancellationOptions[1]
  const plans = l.rooms.flatMap(ratePlansOf)
  const lines: string[] = cur.id === 'nonref' ? ['Non-refundable: from booking'] : cur.id === 'freeCheckin' ? ['till check-in'] : [`till ${cur.id.replace('free', '')} hours before check-in`]
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="rounded-lg border border-brass-200 bg-brass-50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <strong className="text-[16px] font-semibold text-ink-900">Allow a grace period to convert more non-refundable bookings</strong>
            <Toggle checked={!!p.grace} onChange={(v) => commit((y) => ({ ...y, policies: { ...y.policies, grace: v } }))} label={p.grace ? 'Enabled' : 'Disabled'} />
          </div>
          <ul className="mt-1.5 list-disc pl-5 text-[13.5px] leading-relaxed text-ink-700">
            <li>Give guests the confidence to choose non-refundable rates by offering a free-cancellation grace window.</li>
            <li>
              Guests can cancel within <strong>24 hours</strong> of booking for a full refund if check-in is at least <strong>7 days</strong> away.
            </li>
            <li>After 24 hours, your standard non-refundable policy applies.</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[24px] font-medium text-ink-900">Cancellation Policies</h2>
            <p className="text-[13.5px] text-ink-700">Below is the active cancellation policy, with the rate plans it applies to.</p>
          </div>
          <button type="button" onClick={() => setPicking(true)} className={btnSolid}>
            Change Policy
          </button>
        </div>

        <Card className="grid overflow-hidden md:grid-cols-[200px_1fr]">
          <strong className="border-b border-line px-4 py-3.5 text-[15px] font-semibold text-ink-900 md:border-r md:border-b-0">{cur.label}</strong>
          <div>
            <div className="relative border-b border-line px-4 py-3.5">
              {lines.map((t) => (
                <span key={t} className="flex items-center gap-2 text-[14.5px] text-ink-900">
                  <Check className="h-4 w-4 text-ink-500" aria-hidden="true" />
                  <strong className="font-semibold">{cur.id === 'nonref' ? 'Non-refundable' : 'Free Cancellation'}:</strong> {t.replace('Non-refundable: ', '')}
                </span>
              ))}
              {cur.id !== 'nonref' && cur.id !== 'freeCheckin' && (
                <span className="flex items-center gap-2 text-[14.5px] text-ink-900">
                  <Check className="h-4 w-4 text-ink-500" aria-hidden="true" />
                  <strong className="font-semibold">Non-refundable:</strong> {cur.id.replace('free', '')} hours before check-in
                </span>
              )}
              <div className="-ml-7">
                <CancelTimeline id={cur.id} />
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1">
                <button type="button" onClick={() => setPicking(true)} className="text-[14px] font-semibold text-pine-800 hover:underline">
                  Edit
                </button>
                <div className="relative">
                  <button type="button" aria-label="More" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-paper">
                    <MoreVertical className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {menu && (
                    <div className="absolute top-full right-0 z-10 mt-1 w-[220px] rounded-lg border border-line bg-white p-3 text-[13px] text-ink-700 shadow-xl">
                      Every property needs one active cancellation policy, so it can be changed but not deleted.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="border-b border-line px-4 py-3.5 text-[13.5px]">
              <strong className="block text-[12.5px] font-semibold tracking-wide text-ink-900 uppercase">Rate plans</strong>
              <span className="text-ink-700">
                {plans.length}/{plans.length} rate plans are linked to this policy
              </span>
            </div>
            <div className="px-4 py-3.5 text-[13.5px]">
              <strong className="block text-[12.5px] font-semibold tracking-wide text-ink-900 uppercase">Blackout dates</strong>
              <span className="text-ink-700">No blackout dates set for this policy.</span>
            </div>
          </div>
        </Card>
      </div>
      <aside className="flex flex-col gap-5">
        <Card className="flex items-start gap-3 p-4 text-[14px] text-ink-700">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-ink-900" aria-hidden="true" />
          The policy shows on every room and on the guest’s booking voucher. Changing it doesn’t affect bookings already made.
        </Card>
        <Faq
          items={[
            ['How does the cancellation policy work?', <p key="a">Guests can cancel for free until the time in your policy. After that, the booking amount is non-refundable. One policy applies to all your rate plans.</p>],
            ['What is the grace period?', <p key="b">With the grace period on, guests who book a non-refundable rate at least 7 days before check-in can still cancel for free within 24 hours of booking.</p>],
            ['Does changing the policy affect existing bookings?', <p key="c">No. Existing bookings keep the policy they were booked with.</p>],
          ]}
        />
      </aside>
      <AnimatePresence>
        {picking && (
          <PolicyDialog
            key="pick"
            cur={cur.id}
            onClose={() => setPicking(false)}
            onSave={(id) => {
              upP(set, { cancellation: id })
              setPicking(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PolicyDialog({ cur, onClose, onSave }: { cur: CancellationId; onClose: () => void; onSave: (id: CancellationId) => void }) {
  const [v, setV] = useState(cur)
  const [close, discard] = useCloseGuard(v !== cur, onClose)
  return (
    <>
    {discard}
    <Dialog
      wide
      title="Cancellation policy"
      onClose={close}
      footer={
        <>
          <button type="button" onClick={close} className={btnOutline}>
            Cancel
          </button>
          <button type="button" onClick={() => onSave(v)} className={btnSolid}>
            Use this policy
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {cancellationOptions.map((c) => (
          <label key={c.id} className={`cursor-pointer rounded-lg border p-3 ${v === c.id ? 'border-pine-800 bg-pine-50' : 'border-line hover:border-pine-700'}`}>
            <span className="flex items-center gap-3 text-[15px] text-ink-900">
              <input type="radio" name="cancel" checked={v === c.id} onChange={() => setV(c.id)} className="h-4 w-4 accent-pine-800" />
              {c.label}
            </span>
            {v === c.id && <CancelTimeline id={c.id} />}
          </label>
        ))}
      </div>
    </Dialog>
    </>
  )
}

function Rules({ l, set }: InfoProps) {
  const h = l.policies.house ?? {}
  const [open, setOpen] = useState<string[]>([policyGroups[0].id])
  const put = (id: string, v: string | string[]) =>
    set((y) => {
      const house: HouseAnswers = { ...(y.policies.house ?? {}), [id]: v }
      for (const g of policyGroups) for (const r of g.rules) if (r.follow && !(typeof house[r.id] === 'string' && r.follow.when.includes(house[r.id] as string))) delete house[r.follow.rule.id]
      const x: Partial<Listing['policies']> = { house }
      if (house.couples) x.coupleFriendly = house.couples === 'yes' && house.coupleTag !== 'no'
      if (house.localIds) x.localIds = house.localIds === 'yes'
      if (house.petsAllowed) x.pets = house.petsAllowed === 'yes'
      if (house.smoking) x.smoking = house.smoking === 'yes'
      return { ...y, policies: { ...y.policies, ...x } }
    })
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card className="p-4 sm:p-5">
          <h2 className="text-[18px] font-semibold text-ink-900">Check-in &amp; Check-out Time</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Check-in Time" htmlFor="p-in">
              <select id="p-in" value={l.policies.checkIn} onChange={(e) => upP(set, { checkIn: e.target.value })} className={inputCls}>
                {checkTimes.map((t) => (
                  <option key={t} value={t}>
                    {timeLabel(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Check-out Time" htmlFor="p-out">
              <select id="p-out" value={l.policies.checkOut} onChange={(e) => upP(set, { checkOut: e.target.value })} className={inputCls}>
                {checkTimes.map((t) => (
                  <option key={t} value={t}>
                    {timeLabel(t)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
        <Card className="px-4 sm:px-5">
          {policyGroups.map((g) => (
            <RuleGroup key={g.id} g={g} h={h} put={put} open={open.includes(g.id)} onToggle={() => setOpen((o) => (o.includes(g.id) ? o.filter((x) => x !== g.id) : [...o, g.id]))} />
          ))}
        </Card>
      </div>
      <Faq
        items={[
          ['Why answer every rule?', <p key="a">Guests check rules like ID, couples and pets before booking. Clear answers reduce cancellations and disputes at check-in.</p>],
          ['Where do guests see these?', <p key="b">Under “House rules” on your property page and on the booking voucher.</p>],
        ]}
      />
    </div>
  )
}

function Notices({ l, commit }: InfoProps) {
  const list = l.policies.notices ?? []
  const [text, setText] = useState('')
  const [range, setRange] = useState<{ from: string; to?: string }>({ from: todayISO(), to: addDays(todayISO(), 14) })
  const ok = text.trim().length >= 10
  const add = () => {
    if (!ok) return
    commit((y) => ({ ...y, policies: { ...y.policies, notices: [...(y.policies.notices ?? []), { id: uid(6), text: text.trim(), ...range }] } }))
    setText('')
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card className="p-4 sm:p-5">
          <h2 className="text-[18px] font-semibold text-ink-900">Add a notice</h2>
          <p className="text-[13.5px] text-ink-700">Tell guests about anything that may affect their stay, like renovation work or a closed facility.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
            <Field label="Notice" hint={`${text.trim().length} / 200 · at least 10 characters`} htmlFor="n-text">
              <input id="n-text" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="e.g. The swimming pool is closed for repairs." className={inputCls} />
            </Field>
            <Field label="Show between">
              <RangeCalendar tabs={false} centered clearable={false} min={todayISO()} label="From – To" value={{ mode: 'stay', from: range.from, to: range.to ?? range.from }} onChange={(v) => v && setRange({ from: v.from, to: v.to })} />
            </Field>
          </div>
          <button type="button" disabled={!ok} onClick={add} className={`${btnSolid} mt-4`}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add notice
          </button>
        </Card>
        <Card>
          <h2 className="border-b border-line px-4 py-3.5 text-[16px] font-semibold text-ink-900">Notices ({list.length})</h2>
          {list.length === 0 && <p className="px-4 py-8 text-center text-[14px] text-ink-700">No notices. Guests see nothing extra.</p>}
          {list.map((n) => (
            <div key={n.id} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] text-ink-900">{n.text}</p>
                <span className={`text-[12.5px] ${n.to && n.to < todayISO() ? 'text-ink-400' : 'text-ink-500'}`}>
                  {nice(n.from)}
                  {n.to ? ` – ${nice(n.to)}` : ' onwards'}
                  {n.to && n.to < todayISO() ? ' · Ended' : ''}
                </span>
              </div>
              <button type="button" aria-label="Delete notice" onClick={() => commit((y) => ({ ...y, policies: { ...y.policies, notices: (y.policies.notices ?? []).filter((x) => x.id !== n.id) } }))} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-alert-50 hover:text-alert">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </Card>
      </div>
      <Faq items={[['Where do notices appear?', <p key="a">On your property page before the guest books, only between the dates you choose.</p>]]} />
    </div>
  )
}

function ChildAge({ l, set }: InfoProps) {
  const p = l.policies
  const infant = p.infantAge ?? 2
  const child = p.childMaxAge ?? 12
  const ages = Array.from({ length: 18 }, (_, i) => i)
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-4 sm:p-5">
        <h2 className="text-[18px] font-semibold text-ink-900">Child Age Policy</h2>
        <p className="text-[13.5px] text-ink-700">Set the age bands used for pricing children.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <Field label="Infants: up to age" hint="Stay free, no extra bed" htmlFor="c-inf">
            <select id="c-inf" value={infant} onChange={(e) => upP(set, { infantAge: Number(e.target.value), childMaxAge: Math.max(child, Number(e.target.value) + 1) })} className={inputCls}>
              {ages.slice(0, 6).map((a) => (
                <option key={a} value={a}>
                  {a} {a === 1 ? 'year' : 'years'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Children: up to age" hint="Child charge applies" htmlFor="c-child">
            <select id="c-child" value={child} onChange={(e) => upP(set, { childMaxAge: Number(e.target.value) })} className={inputCls}>
              {ages.filter((a) => a > infant).map((a) => (
                <option key={a} value={a}>
                  {a} years
                </option>
              ))}
            </select>
          </Field>
          <Field label="Free stay: up to age" hint="Sharing beds with parents" htmlFor="c-free">
            <select id="c-free" value={p.childrenFreeAge} onChange={(e) => upP(set, { childrenFreeAge: Number(e.target.value) })} className={inputCls}>
              {ages.slice(0, child + 1).map((a) => (
                <option key={a} value={a}>
                  {a === 0 ? 'No free stay' : `${a} years`}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-lg border border-line text-center text-[13px]">
          <div className="bg-pine-50 px-2 py-3">
            <strong className="block text-[14px] font-semibold text-ink-900">Infant</strong>0 – {infant} yrs
          </div>
          <div className="border-x border-line bg-brass-50 px-2 py-3">
            <strong className="block text-[14px] font-semibold text-ink-900">Child</strong>
            {infant + 1} – {child} yrs
          </div>
          <div className="px-2 py-3">
            <strong className="block text-[14px] font-semibold text-ink-900">Adult</strong>
            {child + 1}+ yrs
          </div>
        </div>
      </Card>
      <Faq items={[['Where is the child charge set?', <p key="a">On each room, under Rooms &amp; Rateplans → Edit Room → Meal Plan, Rates &amp; Inventory.</p>]]} />
    </div>
  )
}

function PostBooking({ l, set }: InfoProps) {
  const p = l.policies
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="flex flex-col gap-5 p-4 sm:p-5">
        <h2 className="text-[18px] font-semibold text-ink-900">Post Booking Policies</h2>
        <Toggle checked={p.payAtHotel} onChange={(v) => upP(set, { payAtHotel: v })} label="Allow Pay at Hotel" hint="Guests can book now and pay at check-in." />
        <Toggle checked={!!p.allowDateChange} onChange={(v) => upP(set, { allowDateChange: v })} label="Allow free date changes" hint="Guests can move their dates once, subject to availability and the new price." />
        <Toggle checked={!!p.allowNameChange} onChange={(v) => upP(set, { allowNameChange: v })} label="Allow guest name changes" hint="Guests can change the name on the booking before check-in." />
      </Card>
      <Faq items={[['Do these apply to existing bookings?', <p key="a">Changes apply to new bookings. Existing bookings keep the rules they were made with.</p>]]} />
    </div>
  )
}
