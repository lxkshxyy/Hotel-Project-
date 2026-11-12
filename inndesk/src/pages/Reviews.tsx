import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, ChevronDown, ExternalLink, MessageSquareReply, Star, TrendingUp, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { useListings } from '../lib/hooks'
import { getReplies, listReviews, setReply, useData } from '../lib/store'
import type { GuestReview } from '../lib/types'

export const ratingWord = (x: number) => (x >= 4.5 ? 'Excellent' : x >= 4 ? 'Very good' : x >= 3.5 ? 'Good' : x >= 3 ? 'Average' : 'Poor')
const nice = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const badge = (r: number) => (r >= 4 ? 'bg-[#e6f4ec] text-live' : r === 3 ? 'bg-brass-50 text-brass-700' : 'bg-alert-50 text-alert')
const periods = [
  ['all', 'Till date', 0],
  ['30', 'Last 30 days', 30],
  ['90', 'Last 3 months', 90],
  ['365', 'Last 12 months', 365],
] as const

/** A labelled dropdown in the filter row ("Rating / All"). */
function Pick({ label, value, options, onChange, active }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void; active: boolean }) {
  return (
    <label className={`relative flex h-11 min-w-[112px] flex-col justify-center rounded-lg border bg-white pr-8 pl-3 transition-colors ${active ? 'border-pine-800 ring-1 ring-pine-800' : 'border-ink-400'}`}>
      <span className="text-[11.5px] leading-none text-ink-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer appearance-none opacity-0" aria-label={label}>
        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
      <span className="mt-0.5 text-[14.5px] leading-tight font-medium text-ink-900">{options.find(([v]) => v === value)?.[1]}</span>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-ink-700" aria-hidden="true" />
    </label>
  )
}

/** Ratings & Reviews for one property: score summary, filters, and replies. */
export default function Reviews() {
  const { id = '' } = useParams()
  const { data: listings } = useListings()
  const l = listings?.find((x) => x.id === id)
  const reviews = useData(() => (l ? listReviews(l.slug) : Promise.resolve([] as GuestReview[])), [l?.slug])
  const replies = useData(async () => getReplies(), [])
  const [open, setOpen] = useState(true)
  const [f, setF] = useState({ period: 'all', rating: 'all', guest: 'all', room: 'all', reply: 'all' })
  const [topic, setTopic] = useState('')
  const [shown, setShown] = useState(10)

  const all = reviews.data ?? []
  const avg = all.length ? all.reduce((n, r) => n + r.rating, 0) / all.length : 0
  const topics = useMemo(() => {
    const m = new Map<string, number>()
    all.forEach((r) => r.topics.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)))
    return [...m].sort((a, b) => b[1] - a[1])
  }, [all])
  const rooms = [...new Set(all.map((r) => r.room).filter((x): x is string => !!x))]
  const list = all.filter((r) => {
    const days = periods.find((p) => p[0] === f.period)![2]
    if (days && Date.now() - new Date(r.created_at).getTime() > days * 864e5) return false
    if (f.rating !== 'all' && r.rating !== Number(f.rating)) return false
    if (f.guest !== 'all' && r.traveller !== f.guest) return false
    if (f.room !== 'all' && r.room !== f.room) return false
    const replied = !!replies.data?.[r.id]
    if (f.reply === 'replied' && !replied) return false
    if (f.reply === 'unreplied' && replied) return false
    if (topic && !r.topics.includes(topic)) return false
    return true
  })
  const anyFilter = Object.entries(f).some(([, v]) => v !== 'all') || !!topic
  const put = (k: keyof typeof f) => (v: string) => (setF((x) => ({ ...x, [k]: v })), setShown(10))

  if (!listings || reviews.data === undefined) return <Spinner />
  if (!l) return null

  return (
    <div className="min-h-[calc(100dvh-68px)] bg-white">
      <div className="mx-auto max-w-[1080px] px-4 py-6 sm:px-8">
        <h1 className="text-[28px] font-bold text-ink-900 sm:text-[32px]">Guest reviews</h1>
        <p className="mt-1 text-[14.5px] text-ink-700">
          Read and reply to what your guests are saying about their stays. Learn more about{' '}
          <Link to={`/app/properties/${l.id}/help/guest-reviews`} className="inline-flex items-center gap-1 font-semibold text-pine-800">
            how review scores work <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </p>
        {reviews.error && <p className="mt-4 rounded-lg bg-alert-50 px-4 py-3 text-[14px] text-alert">Couldn’t load reviews. Check your connection and try again.</p>}

        <section className="mt-5 rounded-lg border border-line-strong p-4 sm:p-5">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start justify-between gap-3 text-left">
            <span>
              <span className="block text-[14px] font-semibold text-ink-900">{l.basics.displayName || l.basics.name}</span>
              {all.length ? (
                <>
                  <span className="mt-0.5 block text-[26px] font-semibold text-pine-800">
                    {avg.toFixed(1)}
                    <span className="text-[16px] font-normal text-ink-500">/5</span> {ratingWord(avg)}
                  </span>
                  <span className="text-[13px] text-ink-500">
                    Based on {all.length} review{all.length === 1 ? '' : 's'}
                  </span>
                </>
              ) : (
                <span className="mt-1 block text-[18px] font-semibold text-ink-900">No reviews yet</span>
              )}
            </span>
            {all.length > 0 && <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-ink-900 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />}
          </button>
          <AnimatePresence initial={false}>
            {open && all.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-4 grid gap-6 border-t border-line pt-4 md:grid-cols-2">
                  <div className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine-50 text-pine-800">
                      <Star className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="text-[14.5px] font-semibold text-ink-900">Ratings</strong>
                      <p className="text-[13.5px] text-ink-700">How many guests gave each star rating</p>
                      <div className="mt-2 flex flex-col gap-2">
                        {[5, 4, 3, 2, 1].map((s) => {
                          const n = all.filter((r) => r.rating === s).length
                          return (
                            <button key={s} type="button" onClick={() => put('rating')(f.rating === String(s) ? 'all' : String(s))} className="grid grid-cols-[34px_1fr_28px] items-center gap-2 text-left text-[13.5px] text-ink-900 hover:text-pine-800">
                              <span>{s} ★</span>
                              <span className="h-1.5 overflow-hidden rounded-full bg-[#e6ebe8]">
                                <motion.span initial={{ width: 0 }} animate={{ width: `${(n / all.length) * 100}%` }} className="block h-full rounded-full bg-pine-700" />
                              </span>
                              <span className="text-right text-ink-700">{n}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine-50 text-pine-800">
                      <TrendingUp className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="text-[14.5px] font-semibold text-ink-900">What guests mention</strong>
                      <p className="text-[13.5px] text-ink-700">Topics guests picked in their reviews</p>
                      <div className="mt-2 flex flex-col gap-2">
                        {topics.length === 0 && <span className="text-[13.5px] text-ink-500">No topics picked yet.</span>}
                        {topics.slice(0, 6).map(([t, n]) => (
                          <div key={t} className="grid grid-cols-[1fr_28px] items-center gap-2 text-[13.5px] text-ink-900">
                            <span>
                              {t}
                              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#e6ebe8]">
                                <motion.span initial={{ width: 0 }} animate={{ width: `${(n / all.length) * 100}%` }} className="block h-full rounded-full bg-brass-500" />
                              </span>
                            </span>
                            <span className="text-right text-ink-700">{n}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {all.length > 0 && (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <span className="text-[14.5px] font-medium text-ink-900">Filters:</span>
              <Pick label="Posted on" value={f.period} onChange={put('period')} active={f.period !== 'all'} options={periods.map(([v, t]) => [v, t])} />
              <Pick label="Rating" value={f.rating} onChange={put('rating')} active={f.rating !== 'all'} options={[['all', 'All'], ...[5, 4, 3, 2, 1].map((n): [string, string] => [String(n), `${n} star`])]} />
              <Pick label="Type of reply" value={f.reply} onChange={put('reply')} active={f.reply !== 'all'} options={[['all', 'All'], ['unreplied', 'Unreplied'], ['replied', 'Replied']]} />
              <Pick label="Guest type" value={f.guest} onChange={put('guest')} active={f.guest !== 'all'} options={[['all', 'All'], ...(['Couple', 'Solo', 'Business', 'Family', 'Group'] as const).map((g): [string, string] => [g, g])]} />
              {rooms.length > 0 && <Pick label="Room name" value={f.room} onChange={put('room')} active={f.room !== 'all'} options={[['all', 'All'], ...rooms.map((r): [string, string] => [r, r])]} />}
              {anyFilter && (
                <button type="button" onClick={() => (setF({ period: 'all', rating: 'all', guest: 'all', room: 'all', reply: 'all' }), setTopic(''))} className="px-2 text-[14.5px] font-semibold text-pine-800 hover:underline">
                  Clear All
                </button>
              )}
            </div>
            {topics.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-medium text-ink-900">Filter by keywords:</span>
                {topics.map(([t]) => (
                  <button key={t} type="button" aria-pressed={topic === t} onClick={() => (setTopic(topic === t ? '' : t), setShown(10))} className={`flex h-8 items-center gap-1 rounded-full border px-3 text-[13.5px] transition-colors ${topic === t ? 'border-pine-800 bg-pine-800 text-white' : 'border-line-strong text-ink-900 hover:border-pine-700'}`}>
                    {t}
                    {topic === t && <X className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-4">
          {all.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line-strong px-4 py-12 text-center">
              <Star className="mx-auto h-8 w-8 text-brass-500" aria-hidden="true" />
              <p className="mt-2 text-[15px] font-medium text-ink-900">Reviews from guests will show here.</p>
              <p className="mt-1 text-[13.5px] text-ink-700">Guests can review your property on {l.slug ? 'its page on the site' : 'the site'} after they stay.</p>
            </div>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-[14.5px] text-ink-700">No reviews match these filters.</p>
          ) : (
            list.slice(0, shown).map((r) => <ReviewRow key={r.id} r={r} reply={replies.data?.[r.id]} />)
          )}
          {list.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + 10)} className="mx-auto mt-4 block h-10 rounded-lg border border-pine-800 px-5 text-[14.5px] font-semibold text-pine-800 hover:bg-pine-50">
              Show more reviews ({list.length - shown})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewRow({ r, reply }: { r: GuestReview; reply?: { text: string; at: string } }) {
  const [more, setMore] = useState(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(reply?.text ?? '')
  const long = r.text.length > 180
  const ok = text.trim().length >= 20
  return (
    <article className="border-b border-line py-5">
      <div className="flex flex-wrap items-center gap-2">
        {r.title && <strong className="text-[16.5px] font-semibold text-ink-900">{r.title}</strong>}
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-[15px] text-ink-900">
        Rated <span className={`rounded px-2 py-0.5 text-[14px] font-semibold ${badge(r.rating)}`}>{r.rating}</span> by <strong className="font-semibold">{r.name}</strong>
        {r.verified && (
          <span className="flex items-center gap-1 text-[12.5px] font-medium text-live">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verified stay
          </span>
        )}
      </p>
      <p className="mt-1 text-[13.5px] text-ink-700">{[r.traveller, r.room, `Stayed: ${r.stay_month}`, `Posted on: ${nice(r.created_at)}`].filter(Boolean).join(' • ')}</p>
      <p className={`mt-3 max-w-[820px] text-[15px] leading-relaxed text-ink-900 ${long && !more ? 'line-clamp-2' : ''}`}>{r.text}</p>
      {long && (
        <button type="button" onClick={() => setMore((m) => !m)} className="text-[14.5px] font-semibold text-pine-800 hover:underline">
          {more ? 'Show less' : '…Read More'}
        </button>
      )}
      {r.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {r.topics.map((t) => (
            <span key={t} className="rounded-full bg-[#f1f4f2] px-2.5 py-0.5 text-[12.5px] text-ink-700">
              {t}
            </span>
          ))}
        </div>
      )}

      {reply && !editing ? (
        <div className="mt-3 max-w-[820px] rounded-lg border-l-4 border-pine-700 bg-pine-50 px-4 py-3">
          <span className="text-[12.5px] font-semibold text-pine-800">Your reply · {nice(reply.at)}</span>
          <p className="mt-1 text-[14.5px] whitespace-pre-line text-ink-900">{reply.text}</p>
          <div className="mt-2 flex gap-4 text-[13.5px] font-semibold">
            <button type="button" onClick={() => (setText(reply.text), setEditing(true))} className="text-pine-800 hover:underline">
              Edit
            </button>
            <button type="button" onClick={() => setReply(r.id, null)} className="text-alert hover:underline">
              Delete
            </button>
          </div>
        </div>
      ) : editing ? (
        <div className="mt-3 max-w-[820px]">
          <label htmlFor={`reply-${r.id}`} className="sr-only">
            Reply to {r.name}
          </label>
          <textarea id={`reply-${r.id}`} rows={4} maxLength={1000} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={`Thank ${r.name.split(' ')[0]} and respond to what they said…`} className="w-full rounded-lg border border-ink-400 px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-pine-700 focus:ring-1 focus:ring-pine-700" />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <span className={`text-[12.5px] ${text.trim().length && !ok ? 'text-alert' : 'text-ink-500'}`}>{text.trim().length} / 1000 · at least 20 characters</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-lg border border-line-strong px-4 text-[14.5px] font-semibold text-pine-800">
                Cancel
              </button>
              <button
                type="button"
                disabled={!ok}
                onClick={() => {
                  setReply(r.id, { text: text.trim(), at: new Date().toISOString() })
                  setEditing(false)
                }}
                className="h-10 rounded-lg bg-pine-800 px-5 text-[14.5px] font-semibold text-white hover:bg-pine-900 disabled:opacity-50"
              >
                Post reply
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-brass-500 px-4 text-[14.5px] font-semibold text-pine-950 hover:bg-brass-600">
          <MessageSquareReply className="h-4 w-4" aria-hidden="true" /> Reply to Guest
        </button>
      )}
    </article>
  )
}
