import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Download, FileDown, Info } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pop } from '../components/Filters'
import { Notice, Spinner } from '../components/ui'
import { addDays, inr, parseISODate, toISODate, todayISO } from '../lib/format'
import { useListings, useReservations, type ResvRow } from '../lib/hooks'

/* ---------------- data ---------------- */

type RangeId = '365' | 'booked30' | '14' | '7'
type Compare = 'prev' | 'none'
const ranges: { id: RangeId; label: string }[] = [
  { id: '365', label: 'Last 365 days' },
  { id: 'booked30', label: 'Booked in last 30 days' },
  { id: '14', label: 'Last 14 days' },
  { id: '7', label: 'Last 7 days' },
]
const compares: { id: Compare; label: string }[] = [
  { id: 'prev', label: 'Previous year' },
  { id: 'none', label: 'Hide comparison data' },
]

const shiftYear = (iso: string, n: number) => {
  const d = parseISODate(iso)
  d.setFullYear(d.getFullYear() + n)
  return toISODate(d)
}
const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`
const monthEnd = (iso: string) => {
  const d = parseISODate(monthStart(iso))
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}
const nextMonth = (iso: string) => addDays(monthEnd(iso), 1)
const monthLabel = (iso: string, long = false) => parseISODate(iso).toLocaleDateString('en-IN', long ? { month: 'long', year: 'numeric' } : { month: 'short' })
const dayLabel = (iso: string) => parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

type Bucket = { label: string; long: string; from: string; to: string }
type Window = { buckets: Bucket[]; pick: (b: ResvRow) => boolean; from: string; to: string }

/** Time buckets (months or days) and which bookings count, for a range, `back` years ago. */
function windowFor(range: RangeId, all: ResvRow[], back = 0): Window {
  const today = shiftYear(todayISO(), -back)
  if (range === '7' || range === '14') {
    const n = Number(range)
    const from = addDays(today, -(n - 1))
    const buckets = Array.from({ length: n }, (_, i) => {
      const d = addDays(from, i)
      return { label: dayLabel(d), long: dayLabel(d), from: d, to: d }
    })
    return { buckets, from, to: today, pick: () => true }
  }
  if (range === 'booked30') {
    const from = addDays(today, -29)
    const booked = (b: ResvRow) => b.created_at.slice(0, 10) >= from && b.created_at.slice(0, 10) <= today
    const own = all.filter(booked)
    // Months covering those stays (at least the current month), counted on stay dates.
    let first = monthStart(own.reduce((m, b) => (b.check_in < m ? b.check_in : m), today))
    const last = own.reduce((m, b) => (addDays(b.check_out, -1) > m ? addDays(b.check_out, -1) : m), today)
    const buckets: Bucket[] = []
    while (first <= last && buckets.length < 24) {
      buckets.push({ label: monthLabel(first), long: monthLabel(first, true), from: first, to: monthEnd(first) })
      first = nextMonth(first)
    }
    return { buckets, from: buckets[0].from, to: buckets[buckets.length - 1].to, pick: booked }
  }
  const from = addDays(today, -364)
  const buckets: Bucket[] = []
  for (let m = monthStart(from); m <= today; m = nextMonth(m)) buckets.push({ label: monthLabel(m), long: monthLabel(m, true), from: m < from ? from : m, to: monthEnd(m) > today ? today : monthEnd(m) })
  return { buckets, from, to: today, pick: () => true }
}

/** Room nights and revenue (excluding tax) for stay dates in [from, to]. */
function stayTotals(bs: ResvRow[], from: string, to: string) {
  let nights = 0
  let revenue = 0
  for (const b of bs) {
    if (b.check_in > to || b.check_out <= from) continue
    const s = b.check_in > from ? b.check_in : from
    const e = addDays(b.check_out, -1) < to ? addDays(b.check_out, -1) : to
    const n = Math.round((parseISODate(e).getTime() - parseISODate(s).getTime()) / 86400000) + 1
    if (n <= 0) continue
    const rn = n * b.rooms
    nights += rn
    revenue += ((b.amount - b.tax) / Math.max(1, b.nights * b.rooms)) * rn
  }
  return { nights, revenue, adr: nights ? revenue / nights : null }
}

function series(all: ResvRow[], w: Window) {
  const bs = all.filter((b) => b.status !== 'cancelled' && w.pick(b))
  return { per: w.buckets.map((k) => stayTotals(bs, k.from, k.to)), total: stayTotals(bs, w.from, w.to), bookings: bs.filter((b) => b.check_in <= w.to && b.check_out > w.from) }
}

/* ---------------- chart ---------------- */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(800)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}
const niceMax = (v: number) => {
  if (v <= 0) return 4
  const p = 10 ** Math.floor(Math.log10(v))
  return [1, 1.2, 2, 4, 6, 8, 10].map((x) => x * p).find((x) => x >= v) ?? 10 * p
}
const short = (n: number) => (n >= 1e7 ? `${+(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : n % 1 ? n.toFixed(1) : String(n))

/** Bars for this property, a dotted line for the comparison, like the reference charts. */
function Chart({ cats, bars, line, yTitle, fmt }: { cats: string[]; bars: number[]; line?: (number | null)[]; yTitle?: string; fmt: (n: number) => string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const h = 230
  const left = yTitle ? 64 : 48
  const plotW = Math.max(100, width - left - 12)
  const top = 10
  const plotH = h - top - 34
  const max = niceMax(Math.max(...bars, ...(line ?? []).map((x) => x ?? 0)))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const step = plotW / cats.length
  const x = (i: number) => left + step * i + step / 2
  const y = (v: number) => top + plotH - (v / max) * plotH
  const bw = Math.min(28, step * 0.5)
  const every = Math.ceil(cats.length / Math.max(1, Math.floor(plotW / 54)))
  const [tip, setTip] = useState<number | null>(null)
  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={h} role="img" aria-label={yTitle ?? 'chart'} onMouseLeave={() => setTip(null)}>
        {yTitle && (
          <text x={12} y={top + plotH / 2} transform={`rotate(-90 12 ${top + plotH / 2})`} textAnchor="middle" className="fill-ink-500 text-[11px]">
            {yTitle}
          </text>
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} stroke="#e6ebe8" />
            <text x={left - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-700 text-[11.5px]">
              {short(t)}
            </text>
          </g>
        ))}
        <line x1={left} x2={left} y1={top} y2={top + plotH} stroke="#dfe5e0" />
        {bars.map((v, i) => (
          <g key={i} onMouseEnter={() => setTip(i)}>
            <rect x={left + step * i} y={top} width={step} height={plotH} fill={tip === i ? 'rgba(36,97,75,0.05)' : 'transparent'} />
            {v > 0 && <rect x={x(i) - bw / 2} y={y(v)} width={bw} height={top + plotH - y(v)} rx={3} fill="#c8962e" />}
          </g>
        ))}
        {line && (
          <>
            {/* A gap in the line where the previous year had no stays (e.g. no rate to compare). */}
            <path d={line.map((v, i) => (v == null ? '' : `${i && line[i - 1] != null ? 'L' : 'M'}${x(i)},${y(v)}`)).join(' ')} fill="none" stroke="#24614b" strokeWidth={1.6} />
            {line.map((v, i) => (v == null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill="white" stroke="#24614b" strokeWidth={1.6} className="pointer-events-none" />))}
          </>
        )}
        {cats.map((c, i) =>
          i % every === 0 ? (
            <text key={i} x={x(i)} y={h - 12} textAnchor="middle" className="fill-ink-900 text-[12.5px]">
              {c}
            </text>
          ) : null,
        )}
      </svg>
      {tip != null && (
        <div className="pointer-events-none absolute top-1 z-10 rounded-lg bg-ink-900 px-3 py-2 text-[12.5px] whitespace-nowrap text-white shadow-lg" style={{ left: Math.min(Math.max(x(tip) - 70, 0), width - 160) }}>
          <strong className="block">{cats[tip]}</strong>
          This property: {fmt(bars[tip])}
          {line && <span className="block text-white/75">Previous year: {line[tip] == null ? '–' : fmt(line[tip]!)}</span>}
        </div>
      )}
    </div>
  )
}

function Legend({ name, compare }: { name: string; compare: boolean }) {
  return (
    <div className="flex justify-center gap-5 text-[12.5px] text-ink-700">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-3.5 rounded-sm bg-brass-500" /> {name}
      </span>
      {compare && (
        <span className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" x2="18" y1="4" y2="4" stroke="#24614b" strokeWidth="1.6" />
            <circle cx="9" cy="4" r="3" fill="white" stroke="#24614b" strokeWidth="1.6" />
          </svg>
          Previous year
        </span>
      )}
    </div>
  )
}

const pct = (a: number | null, b: number | null) => (a == null || b == null || b === 0 ? null : ((a - b) / b) * 100)

function ChartCard({ title, cats, longs, bars, line, unit, fmt, note }: { title: string; cats: string[]; longs: string[]; bars: number[]; line?: (number | null)[]; unit?: string; fmt: (n: number) => string; note?: string }) {
  const [table, setTable] = useState(false)
  return (
    <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-[20px] font-semibold text-ink-900">
        {title}
        {note && (
          <span title={note} className="text-ink-400">
            <Info className="h-4 w-4" aria-label={note} />
          </span>
        )}
      </h2>
      <div className="mt-4">
        <Chart cats={cats} bars={bars} line={line} yTitle={unit ? `in ${unit}` : undefined} fmt={fmt} />
      </div>
      <div className="mt-2">
        <Legend name={title} compare={!!line} />
      </div>
      <div className="mt-3 flex justify-center print:hidden">
        <button type="button" onClick={() => setTable((t) => !t)} className="flex items-center gap-1 text-[14px] font-semibold text-pine-800 hover:underline">
          {table ? 'Hide table' : 'Show table'} {table ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {table && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[520px] border-collapse text-[14px]">
            <thead className="bg-[#eef4f0] text-left">
              <tr>
                <th className="border-r border-line px-4 py-2.5 font-semibold">{cats.length > 16 || longs[0] === cats[0] ? 'Day' : 'Month'}</th>
                <th className="border-r border-line px-4 py-2.5 font-semibold">
                  {title}
                  {unit ? ` (in ${unit})` : ''}
                </th>
                {line && <th className="border-r border-line px-4 py-2.5 font-semibold">Previous year{unit ? ` (in ${unit})` : ''}</th>}
                {line && <th className="px-4 py-2.5 font-semibold">% Difference</th>}
              </tr>
            </thead>
            <tbody>
              {longs.map((m, i) => {
                const d = line ? pct(bars[i], line[i]) : null
                return (
                  <tr key={m} className="border-t border-line even:bg-[#f7faf8]">
                    <td className="border-r border-line px-4 py-2">{m}</td>
                    <td className="border-r border-line px-4 py-2">{fmt(bars[i])}</td>
                    {line && <td className="border-r border-line px-4 py-2">{line[i] == null ? '0' : fmt(line[i]!)}</td>}
                    {line && <td className={`px-4 py-2 ${d == null ? '' : d >= 0 ? 'text-live' : 'text-alert'}`}>{d == null ? '-' : `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Change({ cur, prev, show }: { cur: number | null; prev: number | null; show: boolean }) {
  if (!show) return null
  if (!prev) return <span className="mt-1 block text-[14px] text-ink-500">{cur ? 'No data for previous year' : 'N/A'}</span>
  const d = pct(cur ?? 0, prev)!
  const up = d >= 0
  return (
    <span className={`mt-1 flex items-center gap-1 text-[14px] ${up ? 'text-live' : 'text-alert'}`}>
      {up ? <ArrowUp className="h-4 w-4" aria-hidden="true" /> : <ArrowDown className="h-4 w-4" aria-hidden="true" />}
      {up ? '+' : ''}
      {d.toFixed(0)}% vs previous year
    </span>
  )
}

/* ---------------- traveller insights ---------------- */

type Dim = { title: string; cats: string[]; of: (b: ResvRow) => string }
const leadDays = (b: ResvRow) => Math.max(0, Math.round((parseISODate(b.check_in).getTime() - parseISODate(b.created_at.slice(0, 10)).getTime()) / 86400000))
const dims: Dim[] = [
  { title: 'Lead time', cats: ['Same day', '1–3 days', '4–7 days', '8–14 days', '15–30 days', '31+ days'], of: (b) => { const d = leadDays(b); return d === 0 ? 'Same day' : d <= 3 ? '1–3 days' : d <= 7 ? '4–7 days' : d <= 14 ? '8–14 days' : d <= 30 ? '15–30 days' : '31+ days' } },
  { title: 'Length of stay', cats: ['1 night', '2 nights', '3 nights', '4–6 nights', '7+ nights'], of: (b) => (b.nights === 1 ? '1 night' : b.nights === 2 ? '2 nights' : b.nights === 3 ? '3 nights' : b.nights <= 6 ? '4–6 nights' : '7+ nights') },
  { title: 'Traveller type', cats: ['Solo', 'Two guests', 'Family or group'], of: (b) => { const g = b.guests / Math.max(1, b.rooms); return g <= 1 ? 'Solo' : g <= 2 ? 'Two guests' : 'Family or group' } },
]
function shares(d: Dim, bs: ResvRow[]) {
  const total = bs.reduce((n, b) => n + b.nights * b.rooms, 0)
  return d.cats.map((c) => (total ? (bs.filter((b) => d.of(b) === c).reduce((n, b) => n + b.nights * b.rooms, 0) / total) * 100 : 0))
}
const top = (cats: string[], s: number[]) => (s.some((x) => x > 0) ? cats[s.indexOf(Math.max(...s))] : null)

/* ---------------- page ---------------- */

export default function Analytics() {
  const { id = '' } = useParams()
  const { data } = useListings()
  const l = data?.find((x) => x.id === id)
  const { list, offline, loading } = useReservations(l ? [l] : [])
  const [tab, setTab] = useState<'perf' | 'insights'>('perf')
  const [range, setRange] = useState<RangeId>('365')
  const [cmp, setCmp] = useState<Compare>('prev')

  const calc = useMemo(() => {
    const w = windowFor(range, list)
    const pw = windowFor(range, list, 1)
    return { w, cur: series(list, w), prev: series(list, pw) }
  }, [list, range])

  if (!data || loading) return <Spinner />
  if (!l)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold">Property not found</h1>
        <Link to="/app/properties" className="btn-primary mt-6">
          Back to properties
        </Link>
      </div>
    )

  const show = cmp === 'prev'
  const { w, cur, prev } = calc
  const cats = w.buckets.map((b) => b.label)
  const longs = w.buckets.map((b) => b.long)
  const name = l.basics.name.trim() || 'this property'
  const rangeLabel = ranges.find((r) => r.id === range)!.label

  const downloadCsv = () => {
    const rows = [['Period', 'Net room nights', 'Net revenue (INR)', 'Average daily rate (INR)', 'Previous year room nights', 'Previous year revenue (INR)', 'Previous year ADR (INR)']]
    w.buckets.forEach((b, i) => rows.push([b.long, String(cur.per[i].nights), cur.per[i].revenue.toFixed(0), cur.per[i].adr?.toFixed(0) ?? '', String(prev.per[i]?.nights ?? 0), (prev.per[i]?.revenue ?? 0).toFixed(0), prev.per[i]?.adr?.toFixed(0) ?? '']))
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' }))
    Object.assign(document.createElement('a'), { href: url, download: `analytics-${l.slug || l.id}-${todayISO()}.csv` }).click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const kpis = [
    { label: 'Net room nights', value: String(cur.total.nights), c: cur.total.nights, p: prev.total.nights },
    { label: 'Net revenue', value: inr(cur.total.revenue), c: cur.total.revenue, p: prev.total.revenue },
    { label: 'Average daily rate', value: cur.total.adr == null ? 'N/A' : inr(cur.total.adr), c: cur.total.adr, p: prev.total.adr },
  ]

  return (
    <div className="min-h-[calc(100dvh-68px)] bg-white">
      <div className="border-b border-line">
        <div className="mx-auto max-w-[1280px] px-4 pt-7 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[30px] font-bold text-ink-900 sm:text-[34px]">Analytics</h1>
              <p className="text-[15px] text-ink-500">{name}</p>
            </div>
            <div className="flex flex-wrap gap-5 pt-2 print:hidden">
              {tab === 'perf' && (
                <button type="button" onClick={downloadCsv} className="flex items-center gap-1.5 text-[15px] font-semibold text-pine-800 hover:underline">
                  <FileDown className="h-4 w-4" aria-hidden="true" /> Download as CSV
                </button>
              )}
              <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 text-[15px] font-semibold text-pine-800 hover:underline">
                <Download className="h-4 w-4" aria-hidden="true" /> Download as PDF
              </button>
            </div>
          </div>
          <div role="tablist" className="mt-6 flex gap-2 print:hidden">
            {(
              [
                ['perf', 'Property performance'],
                ['insights', 'Traveller insights'],
              ] as const
            ).map(([k, t]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`relative px-4 pb-3 text-[16px] font-semibold transition-colors ${tab === k ? 'text-pine-800' : 'text-ink-700 hover:text-ink-900'}`}>
                {t}
                {tab === k && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-pine-800" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 print:hidden">
          <span className="flex items-center gap-2 text-[15px] text-ink-700">
            Show data for:
            <Pop label={rangeLabel} active>
              {(close) => (
                <div className="flex flex-col">
                  {ranges.map((r) => (
                    <button key={r.id} type="button" onClick={() => (setRange(r.id), close())} className={`rounded-lg px-4 py-3 text-left text-[15px] hover:bg-pine-50 ${range === r.id ? 'font-semibold text-pine-800' : 'text-ink-900'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </Pop>
          </span>
          <span className="flex items-center gap-2 text-[15px] text-ink-700">
            Compare with:
            <Pop label={compares.find((c) => c.id === cmp)!.label} active>
              {(close) => (
                <div className="flex flex-col">
                  {compares.map((c) => (
                    <button key={c.id} type="button" onClick={() => (setCmp(c.id), close())} className={`rounded-lg px-4 py-3 text-left text-[15px] hover:bg-pine-50 ${cmp === c.id ? 'font-semibold text-pine-800' : 'text-ink-900'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </Pop>
          </span>
          {tab === 'perf' && (
            <span className="flex items-center gap-2 text-[15px] text-ink-700">
              Currency:
              <span className="flex h-10 items-center rounded-full border border-pine-700 bg-pine-50 px-4 text-[14px] text-pine-900">INR</span>
            </span>
          )}
        </div>

        {offline ? (
          <Notice tone="warn">Can’t reach the booking data right now, so these numbers may be out of date.</Notice>
        ) : (
          <div className="flex gap-3 rounded-xl bg-pine-50 px-4 py-3 text-[14px] text-pine-900">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-pine-800" aria-hidden="true" />
            <p>
              <strong className="font-semibold">
                You’re viewing analytics for {name}, based on {range === 'booked30' ? 'bookings made in the last 30 days, counted on their stay dates' : 'stay dates'}.
              </strong>
              <br />
              Cancelled bookings are left out. Revenue is what guests paid, before tax.
            </p>
          </div>
        )}

        {tab === 'perf' ? (
          <>
            <div className="grid rounded-xl border border-line bg-white sm:grid-cols-3">
              {kpis.map((k, i) => (
                <div key={k.label} className={`p-5 sm:p-6 ${i ? 'border-t border-line sm:border-t-0 sm:border-l' : ''}`}>
                  <span className="text-[14.5px] text-ink-700">{k.label}</span>
                  <strong className="mt-1 block text-[22px] font-semibold text-ink-900">{k.value}</strong>
                  <Change cur={k.c} prev={k.p} show={show} />
                </div>
              ))}
            </div>
            <ChartCard title="Net room nights" cats={cats} longs={longs} bars={cur.per.map((x) => x.nights)} line={show ? prev.per.map((x) => x.nights) : undefined} fmt={(n) => String(Math.round(n))} />
            <ChartCard title="Net revenue" note="What guests paid for their stay, before tax, on the nights they stayed." cats={cats} longs={longs} bars={cur.per.map((x) => Math.round(x.revenue))} line={show ? prev.per.map((x) => Math.round(x.revenue)) : undefined} unit="INR" fmt={(n) => inr(n)} />
            <ChartCard title="Average daily rate" note="Net revenue divided by room nights." cats={cats} longs={longs} bars={cur.per.map((x) => Math.round(x.adr ?? 0))} line={show ? prev.per.map((x) => (x.adr == null ? null : Math.round(x.adr))) : undefined} unit="INR" fmt={(n) => inr(n)} />
          </>
        ) : (
          <>
            <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
              <h2 className="text-[16px] font-semibold text-ink-900">Top performers by room nights</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {dims.map((d, i) => {
                  const t = top(d.cats, shares(d, cur.bookings))
                  const p = top(d.cats, shares(d, prev.bookings))
                  return (
                    <div key={d.title} className={i ? 'border-t border-line pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5' : ''}>
                      <span className="text-[14.5px] text-ink-700">{d.title}</span>
                      <strong className="mt-1 block text-[18px] font-semibold text-ink-900">{t ?? '-'}</strong>
                      {show && <span className="mt-1 block text-[14px] text-ink-500">{p ? `Previous year: ${p}` : 'No data for previous year'}</span>}
                    </div>
                  )
                })}
              </div>
            </section>
            {dims.map((d) => (
              <InsightCard key={d.title} d={d} cur={shares(d, cur.bookings)} prev={show ? shares(d, prev.bookings) : undefined} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function InsightCard({ d, cur, prev }: { d: Dim; cur: number[]; prev?: number[] }) {
  const empty = !cur.some((x) => x > 0) && !(prev ?? []).some((x) => x > 0)
  return (
    <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-[20px] font-semibold text-ink-900">{d.title}</h2>
      <div className="relative mt-4">
        <Chart cats={d.cats} bars={cur.map((x) => Math.round(x))} line={prev?.map((x) => Math.round(x))} yTitle="Share of room nights" fmt={(n) => `${Math.round(n)}%`} />
        {empty && <span className="absolute inset-0 flex items-center justify-center text-[14px] text-ink-500">No bookings in this period yet</span>}
      </div>
      <div className="mt-2">
        <Legend name={d.title} compare={!!prev} />
      </div>
    </section>
  )
}
