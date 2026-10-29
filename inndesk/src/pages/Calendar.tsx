import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Empty, Modal, Notice, PageHead, Spinner } from '../components/ui'
import { site } from '../config/site'
import { addDays, inr, parseISODate, todayISO } from '../lib/format'
import { useListings, useReservations } from '../lib/hooks'
import { saveListing } from '../lib/store'
import type { CalendarCell, Listing } from '../lib/types'

const DAYS = 14
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Edit {
  roomId: string
  from: string
  to: string
  days: number[]
  price: string
  open: string
  state: 'same' | 'open' | 'closed'
}

export default function Calendar() {
  const { data } = useListings()
  const [params, setParams] = useSearchParams()
  const usable = (data ?? []).filter((l) => l.rooms.length > 0)
  const l = usable.find((x) => x.id === params.get('property')) ?? usable[0]
  const resv = useReservations(l ? [l] : [])
  const [start, setStart] = useState(todayISO())
  const [edit, setEdit] = useState<Edit | null>(null)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const dates = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(start, i)), [start])

  /** Rooms already booked per room type per night. */
  const booked = useMemo(() => {
    const m: Record<string, Record<string, number>> = {}
    if (!l) return m
    for (const r of resv.list) {
      if (r.status !== 'confirmed') continue
      const room = l.rooms.find((x) => x.name.trim() === r.room_name.trim())
      if (!room) continue
      for (let d = r.check_in; d < r.check_out; d = addDays(d, 1)) {
        m[room.id] ??= {}
        m[room.id][d] = (m[room.id][d] ?? 0) + r.rooms
      }
    }
    return m
  }, [resv.list, l])

  if (!data) return <Spinner />
  if (!l)
    return (
      <div className="container-page pt-8">
        <PageHead title="Rates and availability" />
        <div className="panel mt-6">
          <Empty icon={<CalendarRange className="h-7 w-7" />} title="Add a property with rooms first">
            <Link to="/app/properties/new/edit" className="btn-primary">
              Add property
            </Link>
          </Empty>
        </div>
      </div>
    )

  const cell = (roomId: string, d: string): CalendarCell => l.calendar[roomId]?.[d] ?? {}

  const apply = async () => {
    if (!edit) return
    if (edit.to < edit.from) return setMsg('The end date is before the start date.')
    const price = edit.price ? Number(edit.price) : undefined
    if (price != null && price < site.minPrice) return setMsg(`Price must be at least ${inr(site.minPrice)}.`)
    const room = l.rooms.find((r) => r.id === edit.roomId)!
    const open = edit.open === '' ? undefined : Math.max(0, Math.min(room.count, Number(edit.open)))
    const cal = { ...l.calendar, [room.id]: { ...(l.calendar[room.id] ?? {}) } }
    let n = 0
    for (let d = edit.from; d <= edit.to; d = addDays(d, 1)) {
      if (!edit.days.includes(parseISODate(d).getDay())) continue
      const c = { ...(cal[room.id][d] ?? {}) }
      if (price != null) c.price = price
      if (open != null) c.open = open
      if (edit.state !== 'same') c.closed = edit.state === 'closed'
      cal[room.id][d] = c
      n++
    }
    if (!n) return setMsg('None of the dates fall on the chosen days of the week.')
    setSaving(true)
    try {
      await saveListing({ ...l, calendar: cal } as Listing)
      setEdit(null)
      setMsg('')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Couldn’t save.')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (roomId: string, d: string) => {
    const c = cell(roomId, d)
    setMsg('')
    setEdit({ roomId, from: d, to: d, days: [0, 1, 2, 3, 4, 5, 6], price: c.price ? String(c.price) : '', open: c.open != null ? String(c.open) : '', state: 'same' })
  }

  return (
    <div className="container-page flex flex-col gap-6 pt-8">
      <PageHead title="Rates and availability" intro="Change prices and rooms for busy dates, or close dates you can’t sell. Tap any night to edit it.">
        <button type="button" className="btn-primary" onClick={() => openEdit(l.rooms[0].id, start)}>
          Change a date range
        </button>
      </PageHead>

      <div className="flex flex-wrap items-end justify-between gap-3">
        {usable.length > 1 ? (
          <label className="label min-w-[240px]">
            Property
            <select className="field" value={l.id} onChange={(e) => setParams({ property: e.target.value })}>
              {usable.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.basics.name || 'Untitled property'}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <strong className="font-display text-xl">{l.basics.name}</strong>
        )}
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Earlier dates" disabled={start <= todayISO()} onClick={() => setStart(addDays(start, -7) < todayISO() ? todayISO() : addDays(start, -7))} className="btn-ghost h-11 w-11 px-0">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="min-w-[150px] text-center font-semibold">
            {parseISODate(dates[0]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to {parseISODate(dates[DAYS - 1]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
          <button type="button" aria-label="Later dates" onClick={() => setStart(addDays(start, 7))} className="btn-ghost h-11 w-11 px-0">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[190px] bg-white px-4 py-3 text-left font-semibold text-ink-500">Room type</th>
              {dates.map((d) => {
                const dt = parseISODate(d)
                const weekend = dt.getDay() === 0 || dt.getDay() === 6
                return (
                  <th key={d} className={`px-1 py-2 text-center font-semibold ${weekend ? 'bg-brass-50' : ''}`}>
                    <span className="block text-xs text-ink-500">{WEEK[dt.getDay()]}</span>
                    <span className="font-display text-base text-ink-900">{dt.getDate()}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {l.rooms.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-3 text-left">
                  <span className="block font-semibold text-ink-900">{r.name || 'Room type'}</span>
                  <span className="text-xs font-normal text-ink-500">
                    Base {inr(r.price)}, {r.count} room{r.count === 1 ? '' : 's'}
                  </span>
                </th>
                {dates.map((d) => {
                  const c = cell(r.id, d)
                  const open = c.open ?? r.count
                  const b = booked[r.id]?.[d] ?? 0
                  const left = Math.max(0, open - b)
                  const custom = c.price != null || c.open != null
                  return (
                    <td key={d} className="p-1">
                      <button
                        type="button"
                        onClick={() => openEdit(r.id, d)}
                        aria-label={`${r.name}, ${d}: ${c.closed ? 'closed' : `${inr(c.price ?? r.price)}, ${left} of ${open} rooms left`}. Edit`}
                        className={`flex h-[68px] w-full flex-col items-center justify-center rounded-lg text-center transition-colors ${
                          c.closed ? 'bg-alert-50 text-alert ring-1 ring-[#f3c5c2]' : left === 0 ? 'bg-[#f0eee6] text-ink-500' : custom ? 'bg-pine-50 ring-1 ring-pine-100 hover:ring-pine-700' : 'bg-paper hover:bg-pine-50'
                        }`}
                      >
                        {c.closed ? (
                          <span className="text-xs font-bold">Closed</span>
                        ) : (
                          <>
                            <span className={`text-[13px] font-bold ${c.price != null ? 'text-pine-900' : 'text-ink-700'}`}>{inr(c.price ?? r.price)}</span>
                            <span className="text-[11px] text-ink-500">{left === 0 ? 'Sold out' : `${left} left`}</span>
                            {b > 0 && <span className="text-[11px] font-semibold text-brass-700">{b} booked</span>}
                          </>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-4 text-[13px] text-ink-500">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-paper ring-1 ring-line" /> Base price
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-pine-50 ring-1 ring-pine-100" /> Changed for that date
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-alert-50 ring-1 ring-[#f3c5c2]" /> Closed
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-brass-50" /> Weekend
        </span>
      </div>
      <Notice>Base prices and room counts come from the listing (Rooms and prices). Date-wise prices, rooms to sell and closed dates show on {site.marketplace} as soon as you save, and {site.marketplace} stops selling rooms once they're booked.</Notice>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Change dates" wide>
        {edit && (
          <div className="flex flex-col gap-4">
            <label className="label">
              Room type
              <select className="field" value={edit.roomId} onChange={(e) => setEdit({ ...edit, roomId: e.target.value })}>
                {l.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name || 'Room type'}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">
                From
                <input type="date" className="field" min={todayISO()} value={edit.from} onChange={(e) => setEdit({ ...edit, from: e.target.value, to: e.target.value > edit.to ? e.target.value : edit.to })} />
              </label>
              <label className="label">
                To (including)
                <input type="date" className="field" min={edit.from} value={edit.to} onChange={(e) => setEdit({ ...edit, to: e.target.value })} />
              </label>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-ink-700">On these days</legend>
              <div className="flex flex-wrap gap-1.5">
                {WEEK.map((w, i) => (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={edit.days.includes(i)}
                    onClick={() => setEdit({ ...edit, days: edit.days.includes(i) ? edit.days.filter((x) => x !== i) : [...edit.days, i] })}
                    className={`min-h-10 min-w-12 rounded-lg border px-2 text-sm font-bold ${edit.days.includes(i) ? 'border-pine-800 bg-pine-800 text-white' : 'border-line-strong bg-white text-ink-700'}`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">
                Price per night (₹)
                <input type="number" className="field" min={site.minPrice} step={50} value={edit.price} placeholder={`Base ${l.rooms.find((r) => r.id === edit.roomId)!.price}`} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
              </label>
              <label className="label">
                Rooms to sell
                <input type="number" className="field" min={0} max={l.rooms.find((r) => r.id === edit.roomId)!.count} value={edit.open} placeholder={`All ${l.rooms.find((r) => r.id === edit.roomId)!.count}`} onChange={(e) => setEdit({ ...edit, open: e.target.value })} />
              </label>
            </div>
            <fieldset className="flex flex-wrap gap-2">
              <legend className="mb-1.5 text-sm font-semibold text-ink-700">Selling</legend>
              {(
                [
                  ['same', 'Leave as is'],
                  ['open', 'Open for sale'],
                  ['closed', 'Close these dates'],
                ] as const
              ).map(([k, t]) => (
                <label key={k} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3.5 font-semibold ${edit.state === k ? 'border-pine-800 bg-pine-50' : 'border-line-strong bg-white'}`}>
                  <input type="radio" name="state" checked={edit.state === k} onChange={() => setEdit({ ...edit, state: k })} className="accent-pine-800" />
                  {t}
                </label>
              ))}
            </fieldset>
            {msg && (
              <p role="alert" className="text-sm font-semibold text-alert">
                {msg}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" disabled={saving} onClick={apply}>
                {saving ? 'Saving…' : 'Save dates'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
