import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, PenLine, ShieldCheck, Sparkles, Star, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Hotel } from '../../data/types'
import { listBookings } from '../../lib/api'
import { ratingWord } from '../../lib/format'
import { addReview, listReviews, ratingSummary, reviewTopics, travellerTypes, type Review, type TravellerType } from '../../lib/reviews'
import { displayName } from '../AccountMenu'

type Sort = 'relevant' | 'latest' | 'high' | 'low'
const tabs = ['Everyone', ...travellerTypes] as const

export default function ReviewsSection({ hotel }: { hotel: Hotel }) {
  const { user } = useAuth()
  const loc = useLocation()
  const [list, setList] = useState<Review[] | null>(null)
  const [tab, setTab] = useState<(typeof tabs)[number]>('Everyone')
  const [sort, setSort] = useState<Sort>('relevant')
  const [room, setRoom] = useState('')
  const [topic, setTopic] = useState('')
  const [writing, setWriting] = useState(false)
  const [limit, setLimit] = useState(5)
  const [thanks, setThanks] = useState(false)

  useEffect(() => {
    listReviews(hotel).then(setList)
  }, [hotel])

  const all = useMemo(() => list ?? [], [list])
  const summary = ratingSummary(hotel, all)
  const last10 = all.slice(0, 10).map((r) => r.rating)
  const topicCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of all) for (const t of r.topics) m.set(t, (m.get(t) ?? 0) + 1)
    // Scale sample counts up to the hotel's rating volume so chips read like the full picture.
    const scale = Math.max(1, Math.round(hotel.reviews / Math.max(all.length, 1) / 4))
    return [...m.entries()].map(([t, n]) => [t, n * scale] as const).sort((a, b) => b[1] - a[1])
  }, [all, hotel.reviews])

  const shown = useMemo(() => {
    const f = all
      .filter((r) => tab === 'Everyone' || r.traveller === tab)
      .filter((r) => !room || r.room === room)
      .filter((r) => !topic || r.topics.includes(topic))
    const by = {
      relevant: (a: Review, b: Review) => Number(!!a.sample) - Number(!!b.sample) || b.text.length - a.text.length,
      latest: (a: Review, b: Review) => b.created_at.localeCompare(a.created_at),
      high: (a: Review, b: Review) => b.rating - a.rating,
      low: (a: Review, b: Review) => a.rating - b.rating,
    }[sort]
    return [...f].sort(by)
  }, [all, tab, room, topic, sort])

  return (
    <section id="reviews" className="card scroll-mt-40 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-navy-800">User Rating &amp; Reviews</h2>
        <span className="flex items-center gap-1.5 text-sm text-ink-700">
          <ShieldCheck className="h-4 w-4 text-navy-800" aria-hidden="true" /> Reviews from guests who signed in
        </span>
      </div>

      <div role="tablist" aria-label="Traveller type" className="no-scrollbar mt-3 flex gap-6 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-[3px] pb-2 text-[17px] ${tab === t ? 'border-navy-800 font-bold text-ink-900' : 'border-transparent text-ink-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-16 items-center justify-center rounded-xl bg-navy-800 text-2xl font-black text-white">{summary.total ? summary.avg.toFixed(1) : 'New'}</span>
            <span>
              <strong className="block text-xl text-navy-800">{summary.total ? ratingWord(summary.avg) : 'No ratings yet'}</strong>
              <span className="text-sm text-ink-500">{summary.total ? `${summary.total.toLocaleString('en-IN')} Ratings` : 'Be the first to review after your stay'}</span>
            </span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {summary.levels.map((l) => (
              <li key={l.label} className="grid grid-cols-[84px_1fr_40px] items-center gap-3 text-sm">
                <span className="underline decoration-line-strong underline-offset-2">{l.label}</span>
                <span className="h-1.5 overflow-hidden rounded bg-line">
                  <motion.span className="block h-full bg-navy-800" initial={{ width: 0 }} whileInView={{ width: `${l.pct}%` }} viewport={{ once: true }} transition={{ duration: 0.6 }} />
                </span>
                <span className="text-right text-ink-700">{l.pct}%</span>
              </li>
            ))}
          </ul>
          {hotel.scores.length > 0 && (
            <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
              {hotel.scores.map((s) => (
                <span key={s.label} className="flex justify-between rounded-lg bg-canvas px-2.5 py-1.5 text-[13px]">
                  {s.label} <strong>{s.value.toFixed(1)}</strong>
                </span>
              ))}
            </div>
          )}
          {last10.length > 0 && (
            <div className="border-t border-line pt-3">
              <strong className="text-[15px]">
                Last {last10.length} Customer Ratings <span className="font-normal text-ink-500">(Latest First)</span>
              </strong>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {last10.map((r, i) => (
                  <span key={i} className={`flex h-8 w-8 items-center justify-center rounded border text-sm font-bold ${r >= 4 ? 'border-navy-800 text-navy-800' : r === 3 ? 'border-[#D97706] text-[#B45309]' : 'border-ember-600 text-ember-600'}`}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
          <button type="button" className="btn-navy" onClick={() => setWriting(true)}>
            <PenLine className="h-4 w-4" aria-hidden="true" /> Write a review
          </button>
          {thanks && <p className="rounded-lg bg-leaf-50 px-3 py-2 text-sm font-semibold text-leaf-800">Thanks! Your review is live below.</p>}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex gap-3 rounded-xl bg-[#F6F8FD] p-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-navy-800" aria-hidden="true" />
            <div>
              <strong>What guests mention</strong>
              <ul className="mt-1 list-disc pl-5 text-sm text-ink-700">
                {hotel.highlights.slice(0, 3).map((h) => (
                  <li key={h}>{h}</li>
                ))}
                {topicCounts[0] && <li>Most praised: {topicCounts.slice(0, 2).map(([t]) => t.toLowerCase()).join(' and ')}</li>}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <strong className="mr-1">Filter by:</strong>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort reviews" className="rounded-lg border border-line-strong bg-white px-3 py-2 text-sm">
              <option value="relevant">Sort: Most relevant</option>
              <option value="latest">Sort: Latest first</option>
              <option value="high">Sort: Highest rating</option>
              <option value="low">Sort: Lowest rating</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setTopic('')
                setRoom('')
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-bold ${!topic && !room ? 'border-navy-800 bg-[#EAF1FF] text-navy-800' : 'border-line-strong bg-white'}`}
            >
              All Reviews
            </button>
            <select value={room} onChange={(e) => setRoom(e.target.value)} aria-label="Room type" className="rounded-lg border border-line-strong bg-white px-3 py-2 text-sm">
              <option value="" disabled hidden>Room Type</option>
              {hotel.rooms.map((r) => (
                <option key={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {topicCounts.map(([t, n]) => (
              <button
                key={t}
                type="button"
                aria-pressed={topic === t}
                onClick={() => setTopic(topic === t ? '' : t)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${topic === t ? 'border-navy-800 bg-[#EAF1FF] font-bold text-navy-800' : 'border-line-strong bg-white text-ink-700'}`}
              >
                {t} ({n})
              </button>
            ))}
          </div>

          {list === null && <p className="text-sm text-ink-500">Loading reviews…</p>}
          {list && shown.length === 0 && <p className="rounded-xl bg-canvas p-4 text-sm text-ink-500">No reviews match these filters yet.</p>}
          <ul className="flex flex-col divide-y divide-line">
            {shown.slice(0, limit).map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-black text-white ${r.rating >= 4 ? 'bg-navy-800' : r.rating === 3 ? 'bg-[#D97706]' : 'bg-ember-600'}`}>{r.rating}/5</span>
                  <strong>{r.title}</strong>
                  {r.sample && <span className="rounded bg-mist px-1.5 py-0.5 text-[11px] font-bold text-ink-500">Sample</span>}
                </div>
                <p className="text-[15px] text-ink-700">{r.text}</p>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-500">
                  <strong className="text-ink-900">{r.name}</strong> · {r.traveller} · {r.stay_month}
                  {r.room && ` · ${r.room}`}
                  {r.verified && (
                    <span className="flex items-center gap-1 font-semibold text-leaf-700">
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verified stay
                    </span>
                  )}
                </span>
                {r.topics.length > 0 && (
                  <span className="flex flex-wrap gap-1.5">
                    {r.topics.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {shown.length > limit && (
            <button type="button" className="btn-outline self-start" onClick={() => setLimit((l) => l + 5)}>
              Show more reviews ({shown.length - limit})
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {writing && (
          <WriteReview
            hotel={hotel}
            signedIn={!!user}
            loginLink={`/login?next=${encodeURIComponent(loc.pathname + loc.search + '#reviews')}`}
            onClose={() => setWriting(false)}
            onSaved={(r) => {
              setList((l) => [r, ...(l ?? [])])
              setWriting(false)
              setThanks(true)
              setSort('latest')
              setTab('Everyone')
            }}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

function WriteReview({ hotel, signedIn, loginLink, onClose, onSaved }: { hotel: Hotel; signedIn: boolean; loginLink: string; onClose: () => void; onSaved: (r: Review) => void }) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [hoverR, setHoverR] = useState(0)
  const [traveller, setTraveller] = useState<TravellerType>('Couple')
  const [room, setRoom] = useState(hotel.rooms[0]?.name ?? '')
  const months = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }))
  }, [])
  const [month, setMonth] = useState(months[0])
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [topics, setTopics] = useState<string[]>([])
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) listBookings(user.id).then((b) => setVerified(b.some((x) => x.hotel_slug === hotel.slug && x.status === 'confirmed'))).catch(() => {})
  }, [user, hotel.slug])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!user) return
    if (!rating) return setError('Choose a star rating.')
    if (title.trim().length < 4) return setError('Add a short title.')
    if (text.trim().length < 30) return setError('Tell other guests a bit more (at least 30 characters).')
    setBusy(true)
    try {
      const r = await addReview({
        hotel_slug: hotel.slug,
        user_id: user.id,
        name: displayName(user.email, user.name),
        rating,
        traveller,
        room,
        stay_month: month,
        title: title.trim(),
        text: text.trim(),
        topics,
        verified,
      })
      onSaved(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post your review.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Write a review"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-950/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30 }}
        animate={{ y: 0 }}
        exit={{ y: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-navy-800">Review your stay</h3>
            <p className="text-sm text-ink-500">{hotel.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-mist">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {!signedIn ? (
          <div className="mt-5 flex flex-col gap-3 rounded-xl bg-navy-50 p-4">
            <strong>Sign in to write a review</strong>
            <span className="text-sm text-ink-700">We ask guests to sign in so every review comes from a real person. Reviews from guests with a booking here get a “Verified stay” badge.</span>
            <Link to={loginLink} className="btn-navy self-start">
              Sign in with email code
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
            <div>
              <span className="text-[13px] font-semibold text-ink-700">Overall rating</span>
              <div className="mt-1 flex items-center gap-1" onMouseLeave={() => setHoverR(0)}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} type="button" aria-label={`${i} star${i > 1 ? 's' : ''}`} aria-pressed={rating === i} onMouseEnter={() => setHoverR(i)} onClick={() => setRating(i)} className="p-0.5">
                    <Star className={`h-8 w-8 ${(hoverR || rating) >= i ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-line-strong'}`} aria-hidden="true" />
                  </button>
                ))}
                <span className="ml-2 text-sm font-semibold text-ink-700">{['', 'Bad', 'Poor', 'Average', 'Very good', 'Excellent'][hoverR || rating]}</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="label">
                You travelled as
                <select className="field py-2.5" value={traveller} onChange={(e) => setTraveller(e.target.value as TravellerType)}>
                  {travellerTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="label">
                Room
                <select className="field py-2.5" value={room} onChange={(e) => setRoom(e.target.value)}>
                  {hotel.rooms.map((r) => (
                    <option key={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>
              <label className="label">
                When did you stay?
                <select className="field py-2.5" value={month} onChange={(e) => setMonth(e.target.value)}>
                  {months.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="label">
              Title
              <input className="field" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sum up your stay in a few words" />
            </label>
            <label className="label">
              Your review
              <textarea className="field resize-y" rows={4} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} placeholder="What did you like? What could be better?" />
              <span className="text-right text-xs font-normal text-ink-500">{text.trim().length} / 30 characters minimum</span>
            </label>
            <fieldset>
              <legend className="text-[13px] font-semibold text-ink-700">What stood out? (optional)</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {reviewTopics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={topics.includes(t)}
                    onClick={() => setTopics((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}
                    className={`rounded-full border px-3 py-1.5 text-sm ${topics.includes(t) ? 'border-navy-800 bg-[#EAF1FF] font-bold text-navy-800' : 'border-line-strong'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="text-xs text-ink-500">
              Posting as <strong>{displayName(user!.email, user!.name)}</strong>
              {verified ? ' · Verified stay (you have a booking here)' : ''}. Please keep it honest and respectful.
            </p>
            {error && (
              <p role="alert" className="text-sm font-semibold text-ember-600">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary min-h-12" disabled={busy}>
              {busy ? 'Posting…' : 'Post review'}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}

