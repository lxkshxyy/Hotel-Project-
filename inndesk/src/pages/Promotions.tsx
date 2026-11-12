import { AnimatePresence, motion } from 'framer-motion'
import { BadgePercent, Bird, BookOpen, CalendarRange, ChevronDown, ChevronsUpDown, Crown, Filter, Hourglass, Info, MoreVertical, Smartphone, TicketPercent, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RangeCalendar } from '../components/RangeCalendar'
import { Spinner } from '../components/ui'
import { site } from '../config/site'
import { addDays, inr, nightsBetween, parseISODate, todayISO } from '../lib/format'
import { useReservations } from '../lib/hooks'
import {
  applies,
  audienceLabel,
  audiences,
  cheapestRoom,
  deletePromotion,
  endsOn,
  isActive,
  isExpired,
  kindInfo,
  listPromotions,
  newPromotion,
  postPromotionPrice,
  promoStats,
  roomGstRate,
  savePromotion,
  tierName,
  tierOf,
  tomorrow,
  unsoldTonight,
  type Audience,
  type PromoKind,
  type Promotion,
  type Stay,
} from '../lib/promotions'
import { useData } from '../lib/store'
import type { Listing } from '../lib/types'

const ord = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`
/** "9th Dec '25" */
const nice = (iso: string) => {
  const d = parseISODate(iso)
  return `${ord(d.getDate())} ${d.toLocaleDateString('en-IN', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`
}
/** "12th Nov" */
const niceShort = (iso: string) => {
  const d = parseISODate(iso)
  return `${ord(d.getDate())} ${d.toLocaleDateString('en-IN', { month: 'short' })}`
}
const range = (from: string, to?: string) => (to ? `${nice(from)} – ${nice(to)}` : `${nice(from)} onwards`)

const kindIcon: Record<PromoKind, typeof BadgePercent> = { basic: BadgePercent, 'last-minute': Hourglass, 'early-bird': Bird, 'long-stay': CalendarRange, audience: Crown, coupon: TicketPercent }

/** Grow your Business → Promotions & Coupons for one property. */
export default function Promotions({ l }: { l: Listing }) {
  const [tab, setTab] = useState<'create' | 'mine'>('create')
  const promos = useData(() => listPromotions(l.id), [l.id])
  const { list, loading } = useReservations([l])
  const [edit, setEdit] = useState<Promotion | null>(null)
  const [price, setPrice] = useState(false)
  const [extra, setExtra] = useState<Promotion[] | null>(null)
  const all = promos.data ?? []

  if (!promos.data || loading) return <Spinner />

  const create = (kind: PromoKind) => setEdit(newPromotion(l, kind))
  const help = `/app/properties/${l.id}/help/promotions`

  return (
    <div className="min-h-[calc(100dvh-68px)] bg-white">
      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-8">
        <h1 className="sr-only">Promotions &amp; Coupons</h1>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line-strong">
          <div role="tablist" className="flex">
            {(
              [
                ['create', 'Create New Promotion'],
                ['mine', 'My Promotions'],
              ] as const
            ).map(([k, text]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px border border-line-strong px-4 py-2.5 text-[15px] transition-colors sm:px-5 sm:text-[17px] ${tab === k ? 'border-t-[3px] border-t-pine-800 border-b-white bg-white font-semibold text-ink-900' : 'bg-[#f4f6f5] text-pine-800 hover:bg-pine-50'} ${k === 'mine' ? '-ml-px' : ''}`}>
                {text}
              </button>
            ))}
          </div>
          <Link to={help} className="mb-2 flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-[13px] font-semibold text-ink-900 no-underline hover:border-pine-700">
            <BookOpen className="h-4 w-4 text-brass-600" aria-hidden="true" /> How Promotions &amp; Coupons work
          </Link>
        </div>
        <p className="mt-2 text-[14px] text-ink-500">{tab === 'create' ? 'One-stop solution to offer the best promotions & coupons to guests' : 'All active promotions and coupons are listed below, along with their contribution to room nights and revenue.'}</p>

        {tab === 'create' ? (
          <CreateTab l={l} promos={all} unsold={unsoldTonight(l, list)} onCreate={create} onViewAll={() => setTab('mine')} onCustomise={() => setPrice(true)} />
        ) : (
          <MineTab promos={all} list={list} onEdit={setEdit} onPrice={() => setPrice(true)} onExtra={setExtra} />
        )}
      </div>

      <AnimatePresence>
        {edit && (
          <Editor
            key={edit.id}
            l={l}
            p={edit}
            others={all}
            onClose={() => setEdit(null)}
            onSaved={() => {
              setEdit(null)
              setTab('mine')
            }}
          />
        )}
        {price && <PriceDialog l={l} promos={all} onClose={() => setPrice(false)} />}
        {extra && <ExtraDialog targets={extra} onClose={() => setExtra(null)} />}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Create New Promotion                                                */
/* ------------------------------------------------------------------ */

function CreateTab({ l, promos, unsold, onCreate, onViewAll, onCustomise }: { l: Listing; promos: Promotion[]; unsold: number; onCreate: (k: PromoKind) => void; onViewAll: () => void; onCustomise: () => void }) {
  const activeAudiences = new Set(promos.filter((p) => p.kind === 'audience' && isActive(p)).map((p) => p.audience))
  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_330px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section className="rounded-lg border border-line-strong p-4 shadow-[0_2px_6px_-4px_rgba(18,55,42,0.25)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-3 text-[22px] font-semibold text-ink-900 sm:text-[24px]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pine-50 text-pine-800">
                <BadgePercent className="h-5 w-5" aria-hidden="true" />
              </span>
              Promotions <span className="text-[16px] font-normal text-ink-700">(Tier 1)</span>
            </h2>
            <button type="button" onClick={onViewAll} className="text-[14px] font-semibold text-pine-800 hover:underline">
              View All Promotions
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(['basic', 'last-minute', 'early-bird', 'long-stay'] as const).map((k) => {
              const Icon = kindIcon[k]
              return (
                <div key={k} className="flex flex-col rounded-md border border-line-strong">
                  <div className="flex-1 px-4 pt-4 pb-3">
                    <h3 className="flex items-center gap-3 text-[17.5px] font-semibold text-ink-900">
                      <Icon className="h-6 w-6 text-pine-800" strokeWidth={1.6} aria-hidden="true" /> {kindInfo[k].title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-snug text-ink-700">{kindInfo[k].text}</p>
                  </div>
                  <div className="flex min-h-[46px] items-center justify-between gap-3 border-t border-line-strong px-4 py-2">
                    {k === 'last-minute' && unsold > 0 ? (
                      <span className="flex items-start gap-2 text-[12px] leading-tight text-ink-700">
                        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-ink-500" aria-hidden="true" />
                        {unsold} room{unsold === 1 ? ' is' : 's are'} unsold for today, offer a last minute promotion now!
                      </span>
                    ) : (
                      <span />
                    )}
                    <button type="button" onClick={() => onCreate(k)} className="h-8 shrink-0 rounded border border-pine-800 px-3 text-[14px] font-semibold text-pine-800 hover:bg-pine-50">
                      Create
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <TierCard
          icon={<Crown className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />}
          title="Special Audience Promotions"
          tier={2}
          badge={`${activeAudiences.size} OF ${audiences.length} ACTIVE`}
          text={`Offer exclusive discounts to specific sets of guests, including mobile app users, corporate (business) accounts, ${site.marketplace} Club members, travel agents, international guests, holiday customers & more.`}
          onCreate={() => onCreate('audience')}
        />
        <TierCard icon={<TicketPercent className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />} title="Coupon" tier={3} text={`Create a coupon code to give an extra discount to guests who book on ${site.marketplace}.`} onCreate={() => onCreate('coupon')} />
      </div>

      <aside className="flex flex-col gap-5">
        <PriceCard l={l} promos={promos} onCustomise={onCustomise} />
        <Faq />
      </aside>
    </div>
  )
}

function TierCard({ icon, title, tier, badge, text, onCreate }: { icon: ReactNode; title: string; tier: number; badge?: string; text: string; onCreate: () => void }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line-strong p-4 shadow-[0_2px_6px_-4px_rgba(18,55,42,0.25)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[21px] font-semibold text-ink-900 sm:text-[24px]">
          <span className="text-pine-800">{icon}</span>
          {title} <span className="text-[16px] font-normal text-ink-700">(Tier {tier})</span>
          {badge && <span className="rounded bg-[#e6f4ec] px-1.5 py-0.5 text-[12px] font-semibold tracking-wide text-live">{badge}</span>}
        </h2>
        <p className="mt-2 text-[14px] leading-snug text-ink-700">{text}</p>
      </div>
      <button type="button" onClick={onCreate} className="h-10 shrink-0 rounded border border-pine-800 px-4 text-[16px] font-semibold text-pine-800 hover:bg-pine-50">
        Create Now
      </button>
    </section>
  )
}

/** Today → tomorrow, cheapest room, 2 adults: what a guest pays after every active promotion. */
function PriceCard({ l, promos, onCustomise }: { l: Listing; promos: Promotion[]; onCustomise: () => void }) {
  const room = cheapestRoom(l)
  const t = todayISO()
  const r = room ? postPromotionPrice(room.price, promos, { bookedOn: t, checkIn: t, checkOut: tomorrow(), roomId: room.id }) : null
  const gst = r ? roomGstRate(r.final) : 0.05
  return (
    <section className="overflow-hidden rounded-lg border border-line-strong">
      <h2 className="relative overflow-hidden bg-pine-800 px-4 py-3.5 text-[22px] font-semibold text-white">
        <span aria-hidden="true" className="absolute inset-y-0 right-0 w-[42%] skew-x-[-24deg] translate-x-6 bg-pine-700" />
        <span className="relative">Post Promotion Price</span>
      </h2>
      <div className="p-4">
        <p className="text-[14px] leading-relaxed text-ink-700">The post-promotion price is the final selling rate after applying the promotions (Tier 1), special audience promotions (Tier 2), and coupons (Tier 3). Please check the example below:</p>
        {!room || !r ? (
          <p className="mt-3 rounded-md bg-[#f4f6f5] p-3 text-[13.5px] text-ink-700">Add a room with a price under Property Information → Rooms &amp; Rateplans to see the price.</p>
        ) : (
          <>
            <div className="mt-3 rounded-md bg-[#f4f6f5] p-3 text-[12.5px] text-ink-700">
              <strong className="block text-[13px] font-semibold text-ink-900">Check-in Settings</strong>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2.5">
                <div>
                  <span className="block uppercase">Check in date</span>
                  {niceShort(t)} (Today)
                </div>
                <div>
                  <span className="block uppercase">Check out date</span>
                  {niceShort(tomorrow())} (Tomorrow)
                </div>
                <div className="min-w-0">
                  <span className="block uppercase">Rateplan (cheapest)</span>
                  <span className="block truncate" title={room.name}>
                    {room.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block uppercase">Adults</span>
                    {Math.min(2, room.maxGuests || 2)}
                  </div>
                  <div>
                    <span className="block uppercase">Children</span>0
                  </div>
                </div>
              </div>
            </div>
            <Breakup r={r} />
            <p className="mt-3 flex items-start gap-2 rounded-md border border-pine-100 bg-pine-50 px-2.5 py-2 text-[12.5px] text-ink-700">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine-800" aria-hidden="true" />
              Additional GST of {inr(Math.round(r.final * gst))} ({(gst * 100).toFixed(2)}%) will be charged separately.
            </p>
          </>
        )}
        <button type="button" onClick={onCustomise} className="mt-3 text-[14px] font-semibold text-pine-800 underline underline-offset-2 hover:text-pine-900">
          Customise &amp; Check Post Promotion Price
        </button>
      </div>
    </section>
  )
}

function Breakup({ r }: { r: ReturnType<typeof postPromotionPrice> }) {
  const letters = ['B', 'C', 'D']
  const formula = ['A', ...r.lines.map((_, i) => letters[i])].join(' − ')
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-line text-[14px]">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-ink-900">
          <span className="mr-3 text-ink-700">(A)</span>Your selling rate
        </span>
        <span className="border-b border-dashed border-pine-700 font-medium text-ink-900">{inr(r.rate)}</span>
      </div>
      {r.lines.map((x, i) => (
        <div key={x.label + i} className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-ink-700">
          <span className="min-w-0">
            <span className="mr-3">({letters[i]})</span>
            {x.label} <span className="text-ink-500">({x.pct}%)</span>
          </span>
          <span className="shrink-0">− {inr(x.off)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 border-t border-line bg-[#f4f6f5] px-4 py-3 font-semibold text-ink-900">
        <span>
          Final Selling Rate <span className="font-normal">({formula})</span>
        </span>
        <span>{inr(r.final)}</span>
      </div>
    </div>
  )
}

const faqs: [string, ReactNode][] = [
  [
    'What are Promotions, Special Audience Promotions and Coupons?',
    <>
      <p>
        <strong>Promotions (Tier 1):</strong> ready-made discounts to win more bookings: Basic, Last Minute, Early Bird and Long Stay. Only the best Tier 1 promotion applies to a booking.
      </p>
      <p className="mt-2">
        <strong>Special Audience Promotions (Tier 2):</strong> extra discounts for one group of guests, such as mobile app users or corporate accounts. They apply after Tier 1.
      </p>
      <p className="mt-2">
        <strong>Coupons (Tier 3):</strong> a code the guest enters at checkout. It applies last, up to the maximum discount you set.
      </p>
    </>,
  ],
  ['How is the final price worked out?', <p key="a">Each tier is taken off the price left after the one before it. For example ₹2,000 with 10% (Tier 1), then 5% (Tier 2), then a 5% coupon: ₹2,000 → ₹1,800 → ₹1,710 → ₹1,625. GST is added on the final price.</p>],
  ['Can I stop a promotion?', <p key="b">Yes. In My Promotions, open the ⋮ menu and choose Pause. Bookings already made keep their price.</p>],
  ['Do promotions change my commission?', <p key="c">Commission is charged on the amount the guest pays after discounts, so you don’t pay commission on the discount.</p>],
]

function Faq() {
  const [shown, setShown] = useState(true)
  const [open, setOpen] = useState(0)
  return (
    <section className="rounded-lg border border-line-strong">
      <div className="flex items-center justify-between px-4 py-3.5">
        <h2 className="text-[15px] font-semibold text-ink-900">Frequently Asked Questions</h2>
        <button type="button" onClick={() => setShown((s) => !s)} aria-expanded={shown} className="text-[14px] font-semibold text-pine-800 hover:underline">
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {shown && (
        <div>
          {faqs.map(([q, a], i) => (
            <div key={q} className="border-t border-line">
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-[14.5px] ${open === i ? 'bg-pine-50 text-pine-800' : 'text-pine-800 hover:bg-[#f8faf9]'}`}>
                {q}
                <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-ink-700 transition-transform ${open === i ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-4 pt-1 pb-4 text-[14px] leading-relaxed text-ink-700">{a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* My Promotions                                                       */
/* ------------------------------------------------------------------ */

type SortKey = 'type' | 'expiring' | 'nights' | 'revenue'

function MineTab({ promos, list, onEdit, onPrice, onExtra }: { promos: Promotion[]; list: ReturnType<typeof useReservations>['list']; onEdit: (p: Promotion) => void; onPrice: () => void; onExtra: (p: Promotion[]) => void }) {
  const [sub, setSub] = useState<'active' | 'expired'>('active')
  const [tiers, setTiers] = useState<number[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 } | null>(null)
  const active = promos.filter((p) => !isExpired(p))
  const expired = promos.filter((p) => isExpired(p))
  const tier2 = active.filter((p) => p.kind === 'audience')
  const stats = useMemo(() => new Map(promos.map((p) => [p.id, promoStats(p, list)])), [promos, list])

  const rows = useMemo(() => {
    const base = (sub === 'active' ? active : expired).filter((p) => !tiers.length || tiers.includes(tierOf(p.kind)))
    const val = (p: Promotion) => (sort?.k === 'type' ? tierOf(p.kind) : sort?.k === 'expiring' ? endsOn(p) ?? '9999' : sort?.k === 'nights' ? stats.get(p.id)!.roomNights : stats.get(p.id)!.revenue)
    return sort ? [...base].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir) : [...base].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [promos, sub, tiers, sort, stats]) // eslint-disable-line react-hooks/exhaustive-deps

  const totals = rows.reduce((n, p) => ({ nights: n.nights + stats.get(p.id)!.roomNights, revenue: n.revenue + stats.get(p.id)!.revenue }), { nights: 0, revenue: 0 })
  const head = (k: SortKey, text: ReactNode, cls = '') => (
    <th className={`px-3 py-3 align-top font-semibold ${cls}`}>
      <button type="button" onClick={() => setSort(sort?.k === k ? { k, dir: sort.dir === 1 ? -1 : 1 } : { k, dir: 1 })} className="inline-flex items-start gap-1 text-left hover:text-pine-800">
        {text}
        <ChevronsUpDown className={`mt-0.5 h-4 w-4 shrink-0 ${sort?.k === k ? 'text-pine-800' : 'text-ink-400'}`} aria-hidden="true" />
      </button>
    </th>
  )

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line">
        <div role="tablist" className="flex gap-6">
          {(
            [
              ['active', 'Active', active.length],
              ['expired', 'Expired', expired.length],
            ] as const
          ).map(([k, text, n]) => (
            <button key={k} type="button" role="tab" aria-selected={sub === k} onClick={() => setSub(k)} className={`relative flex items-center gap-1.5 px-1 pb-2 text-[14.5px] font-semibold uppercase ${sub === k ? 'text-pine-800' : 'text-ink-700 hover:text-ink-900'}`}>
              {text}
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pine-800 px-1.5 text-[11.5px] text-white">{n}</span>
              {sub === k && <motion.span layoutId="promo-sub" className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-pine-800" />}
            </button>
          ))}
        </div>
        <button type="button" onClick={onPrice} className="mb-2 h-9 rounded border border-pine-800 px-3 text-[14px] font-semibold text-pine-800 hover:bg-pine-50">
          Check Post Promotion Price
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          {tier2.length > 0 && (
            <>
              <button type="button" onClick={() => onExtra(tier2)} className="text-left text-[14.5px] font-semibold text-pine-800 hover:underline">
                Set Additional discount for Weekend/Weekday on Tier 2 promotions
              </button>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-700">
                <Info className="h-3.5 w-3.5 text-pine-800" aria-hidden="true" /> Boost occupancy on days of the week with low demand
              </p>
            </>
          )}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="relative">
            <button type="button" onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen} className="flex items-center gap-1.5 text-[14.5px] font-semibold text-pine-800 hover:underline">
              <Filter className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /> Filter{tiers.length ? ` (${tiers.length})` : ''}
            </button>
            {filterOpen && (
              <div className="absolute top-full right-0 z-20 mt-2 w-[260px] rounded-lg border border-line bg-white p-3 shadow-xl">
                {[1, 2, 3].map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[14px] text-ink-900">
                    <input type="checkbox" checked={tiers.includes(t)} onChange={() => setTiers((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} className="h-4 w-4 accent-pine-800" />
                    {t === 1 ? 'Promotions (Tier 1)' : t === 2 ? 'Special Audience (Tier 2)' : 'Coupons (Tier 3)'}
                  </label>
                ))}
                <div className="mt-2 flex justify-end gap-2 border-t border-line pt-2">
                  <button type="button" onClick={() => setTiers([])} className="text-[13.5px] font-semibold text-ink-700 hover:underline">
                    Clear
                  </button>
                  <button type="button" onClick={() => setFilterOpen(false)} className="h-8 rounded bg-pine-800 px-3 text-[13.5px] font-semibold text-white">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-[14px] text-ink-700">
            <span title="Room nights booked with these promotions">
              Room Nights <strong className="ml-1 text-[16px] font-medium text-ink-900">{totals.nights}</strong>
            </span>
            <span className="h-6 w-px bg-line" />
            <span title="Booking amount from these promotions">
              Revenue <strong className="ml-1 text-[16px] font-medium text-ink-900">{inr(totals.revenue)}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-4 overflow-x-auto rounded-md border border-line-strong">
        <table className="w-full min-w-[960px] border-collapse text-[14px]">
          <thead className="bg-[#f4f6f5] text-left text-ink-900">
            <tr>
              <th className="px-3 py-3 align-top font-semibold">Promotion Name</th>
              {head('type', 'Promotion Type')}
              <th className="px-3 py-3 align-top font-semibold">Booking Date</th>
              <th className="px-3 py-3 align-top font-semibold">Stay Date</th>
              <th className="px-3 py-3 text-right align-top font-semibold">Discount</th>
              {head('expiring', 'Expiring')}
              {head('nights', 'Room Nights')}
              {head('revenue', 'Revenue')}
              <th className="px-3 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <Row key={p.id} p={p} s={stats.get(p.id)!} expired={sub === 'expired'} onEdit={() => onEdit(p)} onExtra={() => onExtra([p])} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-[14.5px] text-ink-700">
                  {sub === 'active' ? 'No active promotions yet. Create one from the Create New Promotion tab.' : 'No expired promotions.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({ p, s, expired, onEdit, onExtra }: { p: Promotion; s: { roomNights: number; revenue: number }; expired: boolean; onEdit: () => void; onExtra: () => void }) {
  const Icon = p.kind === 'audience' && p.audience === 'mobile' ? Smartphone : kindIcon[p.kind]
  const end = endsOn(p)
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const off = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMenu(false)
    document.addEventListener('mousedown', off)
    return () => document.removeEventListener('mousedown', off)
  }, [menu])
  const extra = p.kind === 'audience' && (p.extraWeekend || p.extraWeekday)
  return (
    <>
      <tr className="border-t border-line align-top text-ink-900">
        <td className="px-3 pt-4 pb-3">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md border border-pine-700 text-pine-800">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <button type="button" onClick={onEdit} className="text-left text-pine-800 underline underline-offset-2 hover:text-pine-900">
                {p.name}
              </button>
              {p.kind === 'coupon' && p.code && <span className="mt-1 block w-fit rounded border border-dashed border-brass-600 px-1.5 text-[12px] font-semibold tracking-wider text-brass-700">{p.code}</span>}
              {p.paused && <span className="mt-1 block w-fit rounded bg-[#eceeed] px-1.5 text-[11.5px] font-semibold text-ink-700 uppercase">Paused</span>}
            </div>
          </div>
        </td>
        <td className="px-3 pt-4 pb-3 text-ink-700">{tierName(p.kind)}</td>
        <td className="px-3 pt-4 pb-3">{range(p.bookFrom, p.bookTo)}</td>
        <td className="px-3 pt-4 pb-3">{range(p.stayFrom, p.stayTo)}</td>
        <td className="min-w-[120px] px-3 pt-4 pb-3 text-right">
          {p.discount}%
          <span className="block text-[11.5px] text-ink-500">{p.kind === 'audience' ? audienceLabel(p.audience) : p.kind === 'coupon' && p.maxOff ? `up to ${inr(p.maxOff)}` : p.kind === 'last-minute' ? `0–${p.withinDays} days before` : p.kind === 'early-bird' ? `${p.advanceDays}+ days ahead` : p.kind === 'long-stay' ? `${p.minNights}+ nights` : 'All guests'}</span>
          {extra ? <span className="block text-[11.5px] text-live">+{p.extraWeekend ?? 0}% weekend · +{p.extraWeekday ?? 0}% weekday</span> : null}
        </td>
        <td className="px-3 pt-4 pb-3">{end ? <span className={expired ? 'text-ink-500' : ''}>{nice(end)}</span> : <span className="rounded bg-brass-50 px-1.5 py-0.5 text-[12px] font-semibold whitespace-nowrap text-brass-700">NO END DATE</span>}</td>
        <td className="px-3 pt-4 pb-3 text-center">{s.roomNights}</td>
        <td className="px-3 pt-4 pb-3">{inr(s.revenue)}</td>
        <td className="px-3 pt-3.5 pb-3">
          <div ref={ref} className="relative flex items-center justify-end gap-1">
            <button type="button" onClick={onEdit} className="h-8 rounded border border-pine-800 px-3 text-[14px] font-semibold text-pine-800 hover:bg-pine-50">
              Modify
            </button>
            <button type="button" onClick={() => setMenu((m) => !m)} aria-label={`More actions for ${p.name}`} aria-expanded={menu} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-700 hover:bg-paper">
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </button>
            {menu && (
              <div className="absolute top-full right-0 z-20 mt-1 w-[150px] overflow-hidden rounded-lg border border-line bg-white py-1 text-[14px] shadow-xl">
                {!expired && (
                  <button type="button" onClick={() => (savePromotion({ ...p, paused: !p.paused }), setMenu(false))} className="block w-full px-3 py-2 text-left hover:bg-pine-50">
                    {p.paused ? 'Resume' : 'Pause'}
                  </button>
                )}
                <button type="button" onClick={() => (deletePromotion(p.id), setMenu(false))} className="block w-full px-3 py-2 text-left text-alert hover:bg-alert-50">
                  Delete
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
      <tr className="text-[13px]">
        <td colSpan={9} className="px-3 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {p.kind === 'audience' && !expired ? (
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-pine-50 px-3 py-2 text-ink-900">
                <CalendarRange className="h-4 w-4 text-pine-800" aria-hidden="true" />
                Boost occupancy on days of the week with low demand
                <button type="button" onClick={onExtra} className="font-semibold text-pine-800 hover:underline">
                  Set Additional Discount for Weekend/Weekday Stays
                </button>
              </span>
            ) : (
              <span />
            )}
            <span className="text-ink-500">Last Modified: {nice(p.updatedAt.slice(0, 10))}</span>
          </div>
        </td>
      </tr>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Dialogs                                                             */
/* ------------------------------------------------------------------ */

function Dialog({ title, onClose, children, footer, wide = false }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[aria-label="Choose dates"]') && onClose()
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()} className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/45 p-3 sm:p-6">
      <motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} transition={{ duration: 0.2 }} className={`flex max-h-[calc(100dvh-24px)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-48px)] ${wide ? 'max-w-[720px]' : 'max-w-[520px]'}`}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-[19px] font-semibold text-ink-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-paper">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        {footer && <div className="flex shrink-0 items-center justify-end gap-3 border-t border-line px-5 py-4">{footer}</div>}
      </motion.div>
    </motion.div>
  )
}

const inputCls = 'h-11 w-full rounded-lg border border-ink-400 bg-white px-3 text-[15px] text-ink-900 outline-none focus:border-pine-700 focus:ring-1 focus:ring-pine-700'
function FieldRow({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-[14px] font-semibold text-ink-900">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12.5px] text-alert">{error}</span> : hint ? <span className="mt-1 block text-[12.5px] text-ink-500">{hint}</span> : null}
    </div>
  )
}

/** A start date plus an optional end date (or "No end date"). */
function Window({ label, from, to, onChange, min }: { label: string; from: string; to?: string; onChange: (from: string, to?: string) => void; min: string }) {
  const noEnd = !to
  return (
    <FieldRow label={label}>
      <RangeCalendar
        tabs={false}
        centered
        clearable={false}
        single={noEnd}
        min={min}
        label={noEnd ? 'Starts on' : 'From – To'}
        value={{ mode: 'stay', from, to: to ?? from }}
        onChange={(v) => v && onChange(v.from, noEnd ? undefined : v.to > v.from ? v.to : addDays(v.from, 1))}
      />
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-[14px] text-ink-900">
        <input type="checkbox" checked={noEnd} onChange={() => onChange(from, noEnd ? addDays(from, 30) : undefined)} className="h-4 w-4 accent-pine-800" />
        No end date
      </label>
    </FieldRow>
  )
}

function Editor({ l, p: start, others, onClose, onSaved }: { l: Listing; p: Promotion; others: Promotion[]; onClose: () => void; onSaved: () => void }) {
  const [p, setP] = useState(start)
  const [tried, setTried] = useState(false)
  const set = (patch: Partial<Promotion>) => setP((x) => ({ ...x, ...patch }))
  const t = todayISO()
  const isNew = !others.some((x) => x.id === p.id)
  const room = cheapestRoom(l)
  const Icon = kindIcon[p.kind]

  const errors: Record<string, string> = {}
  if (!p.name.trim()) errors.name = 'Give the promotion a name.'
  if (!(p.discount >= 1 && p.discount <= 80)) errors.discount = 'Enter a discount between 1% and 80%.'
  if (p.kind === 'early-bird' && !((p.advanceDays ?? 0) >= 3)) errors.advanceDays = 'At least 3 days.'
  if (p.kind === 'long-stay' && !((p.minNights ?? 0) >= 2 && (p.minNights ?? 0) <= 30)) errors.minNights = 'Between 2 and 30 nights.'
  if (p.kind === 'coupon') {
    if (!/^[A-Z0-9]{4,15}$/.test(p.code ?? '')) errors.code = 'Use 4–15 letters or numbers, no spaces.'
    else if (others.some((x) => x.id !== p.id && x.kind === 'coupon' && x.code === p.code && !isExpired(x))) errors.code = 'You already have an active coupon with this code.'
    if (!((p.maxOff ?? 0) >= 50)) errors.maxOff = 'At least ₹50.'
  }
  if (p.kind === 'audience' && others.some((x) => x.id !== p.id && x.kind === 'audience' && x.audience === p.audience && isActive(x))) errors.audience = 'This audience already has an active promotion. Modify that one instead.'
  if (p.stayTo && p.bookTo && p.stayTo < p.bookFrom) errors.stay = 'Stay dates end before booking starts.'
  const ok = Object.keys(errors).length === 0

  const save = async () => {
    setTried(true)
    if (!ok) return
    await savePromotion({ ...p, name: p.name.trim() })
    onSaved()
  }
  const preview = room ? postPromotionPrice(room.price, [{ ...p, paused: false }], { bookedOn: p.bookFrom > t ? p.bookFrom : t, checkIn: p.kind === 'early-bird' ? addDays(p.stayFrom > t ? p.stayFrom : t, p.advanceDays ?? 0) : p.stayFrom > t ? p.stayFrom : t, checkOut: addDays(p.stayFrom > t ? p.stayFrom : t, Math.max(1, p.minNights ?? 1)), roomId: room.id, audience: p.audience, coupon: true }) : null
  const err = (k: string) => (tried ? errors[k] : undefined)

  return (
    <Dialog
      wide
      title={`${isNew ? 'Create' : 'Modify'} ${kindInfo[p.kind].title}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-11 rounded-lg border border-line-strong px-5 text-[14.5px] font-semibold text-pine-800 hover:border-pine-700">
            Cancel
          </button>
          <button type="button" onClick={save} className="h-11 rounded-lg bg-pine-800 px-6 text-[14.5px] font-semibold text-white hover:bg-pine-900">
            {isNew ? 'Create promotion' : 'Save changes'}
          </button>
        </>
      }
    >
      <p className="flex items-start gap-3 rounded-lg bg-pine-50 p-3 text-[14px] text-ink-700">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-pine-800" aria-hidden="true" />
        <span>
          {kindInfo[p.kind].text} <span className="text-ink-500">· {tierName(p.kind)}</span>
        </span>
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {p.kind === 'audience' && (
          <div className="sm:col-span-2">
            <FieldRow label="Audience" error={err('audience') ?? errors.audience}>
              <select value={p.audience} onChange={(e) => set({ audience: e.target.value as Audience, name: p.name === audienceLabel(p.audience) ? audienceLabel(e.target.value as Audience) : p.name })} className={inputCls}>
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </FieldRow>
          </div>
        )}
        <FieldRow label="Promotion name" hint="Only you see this name." error={err('name')}>
          <input value={p.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} className={inputCls} />
        </FieldRow>
        <FieldRow label="Discount" error={err('discount')}>
          <div className="relative">
            <input type="number" inputMode="numeric" min={1} max={80} value={p.discount || ''} onChange={(e) => set({ discount: Number(e.target.value) })} className={`${inputCls} pr-9`} />
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-500">%</span>
          </div>
        </FieldRow>
        {p.kind === 'last-minute' && (
          <FieldRow label="Booked how close to check-in?">
            <select value={p.withinDays} onChange={(e) => set({ withinDays: Number(e.target.value) })} className={inputCls}>
              <option value={0}>Same day (0 days)</option>
              <option value={1}>Up to 1 day before</option>
              <option value={2}>Up to 2 days before</option>
            </select>
          </FieldRow>
        )}
        {p.kind === 'early-bird' && (
          <FieldRow label="Booked at least" error={err('advanceDays')}>
            <div className="relative">
              <input type="number" inputMode="numeric" min={3} value={p.advanceDays || ''} onChange={(e) => set({ advanceDays: Number(e.target.value) })} className={`${inputCls} pr-28`} />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[14px] text-ink-500">days in advance</span>
            </div>
          </FieldRow>
        )}
        {p.kind === 'long-stay' && (
          <FieldRow label="Minimum stay" error={err('minNights')}>
            <div className="relative">
              <input type="number" inputMode="numeric" min={2} max={30} value={p.minNights || ''} onChange={(e) => set({ minNights: Number(e.target.value) })} className={`${inputCls} pr-16`} />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[14px] text-ink-500">nights</span>
            </div>
          </FieldRow>
        )}
        {p.kind === 'coupon' && (
          <>
            <FieldRow label="Coupon code" hint="Guests type this at checkout." error={err('code')}>
              <input value={p.code ?? ''} maxLength={15} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} className={`${inputCls} font-semibold tracking-wider uppercase`} />
            </FieldRow>
            <FieldRow label="Maximum discount per booking" error={err('maxOff')}>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-500">₹</span>
                <input type="number" inputMode="numeric" min={50} value={p.maxOff || ''} onChange={(e) => set({ maxOff: Number(e.target.value) })} className={`${inputCls} pl-7`} />
              </div>
            </FieldRow>
          </>
        )}
        <Window label="Booking dates" from={p.bookFrom} to={p.bookTo} min={isNew ? t : p.bookFrom < t ? p.bookFrom : t} onChange={(from, to) => set({ bookFrom: from, bookTo: to })} />
        <Window label="Stay dates" from={p.stayFrom} to={p.stayTo} min={isNew ? t : p.stayFrom < t ? p.stayFrom : t} onChange={(from, to) => set({ stayFrom: from, stayTo: to })} />
        {tried && errors.stay && <span className="text-[12.5px] text-alert sm:col-span-2">{errors.stay}</span>}
        <div className="sm:col-span-2">
          <FieldRow label="Rooms">
            <div className="flex flex-wrap gap-2">
              <RoomChip on={p.roomIds.length === 0} onClick={() => set({ roomIds: [] })}>
                All rooms
              </RoomChip>
              {l.rooms.map((r) => (
                <RoomChip key={r.id} on={p.roomIds.includes(r.id)} onClick={() => set({ roomIds: p.roomIds.includes(r.id) ? p.roomIds.filter((x) => x !== r.id) : [...p.roomIds, r.id] })}>
                  {r.name}
                </RoomChip>
              ))}
            </div>
          </FieldRow>
        </div>
      </div>
      {preview && room && preview.lines.length > 0 && (
        <p className="mt-5 rounded-lg border border-brass-200 bg-brass-50 px-4 py-3 text-[14px] text-ink-900">
          On {room.name}, guests will see <strong className="font-semibold">{inr(preview.final)}</strong> <span className="text-ink-500 line-through">{inr(room.price)}</span> a night, before GST.
        </p>
      )}
    </Dialog>
  )
}

function RoomChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`h-9 rounded-full border px-3.5 text-[13.5px] font-semibold transition-colors ${on ? 'border-pine-800 bg-pine-800 text-white' : 'border-line-strong bg-white text-ink-700 hover:border-pine-700'}`}>
      {children}
    </button>
  )
}

/** Weekend (Fri–Sun check-ins) and weekday extra % on Tier 2 promotions. */
function ExtraDialog({ targets, onClose }: { targets: Promotion[]; onClose: () => void }) {
  const [we, setWe] = useState(targets.length === 1 ? targets[0].extraWeekend ?? 0 : 0)
  const [wd, setWd] = useState(targets.length === 1 ? targets[0].extraWeekday ?? 0 : 0)
  const bad = (n: number) => !(n >= 0 && n <= 30)
  const save = async () => {
    if (bad(we) || bad(wd)) return
    for (const p of targets) await savePromotion({ ...p, extraWeekend: we, extraWeekday: wd })
    onClose()
  }
  return (
    <Dialog
      title="Additional discount for Weekend/Weekday stays"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-11 rounded-lg border border-line-strong px-5 text-[14.5px] font-semibold text-pine-800">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={bad(we) || bad(wd)} className="h-11 rounded-lg bg-pine-800 px-6 text-[14.5px] font-semibold text-white hover:bg-pine-900 disabled:opacity-50">
            Save
          </button>
        </>
      }
    >
      <p className="text-[14px] text-ink-700">
        Added on top of {targets.length === 1 ? <strong className="font-semibold text-ink-900">{targets[0].name}</strong> : `all ${targets.length} active Tier 2 promotions`}. Weekend means check-ins on Friday, Saturday or Sunday.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-4">
        {(
          [
            ['Weekend extra', we, setWe],
            ['Weekday extra', wd, setWd],
          ] as const
        ).map(([lbl, v, setV]) => (
          <FieldRow key={lbl} label={lbl} error={bad(v) ? '0% to 30%' : undefined}>
            <div className="relative">
              <input type="number" inputMode="numeric" min={0} max={30} value={v} onChange={(e) => setV(Number(e.target.value))} className={`${inputCls} pr-9`} />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-500">%</span>
            </div>
          </FieldRow>
        ))}
      </div>
    </Dialog>
  )
}

/** Pick room, dates, audience and coupon to see the final price. */
function PriceDialog({ l, promos, onClose }: { l: Listing; promos: Promotion[]; onClose: () => void }) {
  const t = todayISO()
  const rooms = l.rooms.filter((r) => r.price > 0)
  const [roomId, setRoomId] = useState(cheapestRoom(l)?.id ?? '')
  const [dates, setDates] = useState({ from: t, to: tomorrow() })
  const [aud, setAud] = useState<Audience | ''>('')
  const coupons = promos.filter((p) => p.kind === 'coupon' && isActive(p))
  const [coupon, setCoupon] = useState(false)
  const room = rooms.find((r) => r.id === roomId)
  const stay: Stay = { bookedOn: t, checkIn: dates.from, checkOut: dates.to, roomId, audience: aud || undefined, coupon }
  const r = room ? postPromotionPrice(room.price, promos, stay) : null
  const nights = nightsBetween(dates.from, dates.to)
  const gst = r ? roomGstRate(r.final) : 0.05
  const missed = promos.filter((p) => isActive(p) && !applies(p, stay) && !(p.kind === 'audience' && !aud) && !(p.kind === 'coupon' && !coupon))
  return (
    <Dialog title="Check Post Promotion Price" onClose={onClose} wide>
      {!rooms.length ? (
        <p className="text-[14.5px] text-ink-700">Add a room with a price under Property Information → Rooms &amp; Rateplans first.</p>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldRow label="Room">
              <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputCls}>
                {rooms.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} · {inr(x.price)}
                  </option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Check-in – Check-out">
              <RangeCalendar tabs={false} centered clearable={false} min={t} label={`${nights} night${nights === 1 ? '' : 's'}`} value={{ mode: 'stay', from: dates.from, to: dates.to }} onChange={(v) => v && setDates({ from: v.from, to: v.to > v.from ? v.to : addDays(v.from, 1) })} />
            </FieldRow>
            <FieldRow label="Guest type (Tier 2)">
              <select value={aud} onChange={(e) => setAud(e.target.value as Audience | '')} className={inputCls}>
                <option value="">Regular guest</option>
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Coupon (Tier 3)" hint={coupons.length ? undefined : 'No active coupons.'}>
              <label className={`flex h-11 items-center gap-2.5 text-[14.5px] ${coupons.length ? 'cursor-pointer text-ink-900' : 'text-ink-400'}`}>
                <input type="checkbox" disabled={!coupons.length} checked={coupon} onChange={() => setCoupon((c) => !c)} className="h-4 w-4 accent-pine-800" />
                Guest applies the best coupon
              </label>
            </FieldRow>
          </div>
          {r && (
            <>
              <Breakup r={r} />
              <p className="mt-3 text-[13.5px] text-ink-700">
                Per night, before GST. For {nights} night{nights === 1 ? '' : 's'}: <strong className="font-semibold text-ink-900">{inr(r.final * nights)}</strong> + GST {inr(Math.round(r.final * nights * gst))} ({gst * 100}%).
              </p>
              {missed.length > 0 && (
                <p className="mt-3 flex items-start gap-2 rounded-md bg-[#f4f6f5] px-3 py-2 text-[12.5px] text-ink-700">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Not applied to these dates: {missed.map((p) => p.name).join(', ')}.
                </p>
              )}
            </>
          )}
        </>
      )}
    </Dialog>
  )
}
