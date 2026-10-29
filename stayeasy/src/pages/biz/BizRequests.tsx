import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ClipboardList, Heart, Inbox, LockKeyhole, Plus, Search, X, XCircle } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BackToTop from '../../components/BackToTop'
import DatePopoverField from '../../components/DatePopoverField'
import HotelArt from '../../components/HotelArt'
import { VerifyOrgModal } from '../../components/biz/VerifyOrg'
import { useAccount } from '../../context/AccountContext'
import { useAuth } from '../../context/AuthContext'
import { bizCheapest, tripPurposes, type TravelRequest } from '../../data/business'
import { cities, hotels } from '../../data/hotels'
import { getShortlist, listRequests, requestId, saveRequest, toggleShortlist } from '../../lib/bizApi'
import { addDays, inr, nightsBetween, plural, shortDate, todayISO } from '../../lib/format'
import { useProfile } from '../../lib/profile'
import { bizQuery } from './shared'

type Tab = 'shortlist' | 'raised' | 'approve'
type StatusFilter = 'all' | TravelRequest['status']

const statusStyle: Record<TravelRequest['status'], string> = {
  pending: 'bg-[#FFF3D6] text-[#8A5A00]',
  approved: 'bg-[#E3FAF6] text-[#0F7C70]',
  rejected: 'bg-[#FDECEC] text-[#B42318]',
  booked: 'bg-navy-50 text-navy-800',
}

function Empty({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F2F5FA] text-ink-400">{icon}</span>
      <strong className="mt-2 text-lg text-ink-900">{title}</strong>
      <span className="max-w-md text-sm text-ink-500">{text}</span>
      {children}
    </div>
  )
}

function Toolbar({ status, onStatus, sort, onSort, q, onQ }: { status: StatusFilter; onStatus: (s: StatusFilter) => void; sort: string; onSort: (s: string) => void; q: string; onQ: (s: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="req-status">
        Status
      </label>
      <select id="req-status" value={status} onChange={(e) => onStatus(e.target.value as StatusFilter)} className="h-10 rounded-lg border border-line-strong bg-white px-3 text-sm font-bold uppercase">
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="booked">Booked</option>
      </select>
      <label className="sr-only" htmlFor="req-sort">
        Sort by
      </label>
      <select id="req-sort" value={sort} onChange={(e) => onSort(e.target.value)} className="h-10 rounded-lg border border-line-strong bg-white px-3 text-sm">
        <option value="new">Sort by: Newest</option>
        <option value="trip">Sort by: Trip date</option>
        <option value="budget">Sort by: Budget</option>
      </select>
      <label className="flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-white px-3">
        <Search className="h-4 w-4 text-ink-400" aria-hidden="true" />
        <span className="sr-only">Search traveller name</span>
        <input value={q} onChange={(e) => onQ(e.target.value)} placeholder="Search Traveller Name" className="w-[170px] text-sm outline-none" />
      </label>
    </div>
  )
}

function applyFilters(list: TravelRequest[], status: StatusFilter, sort: string, q: string) {
  const n = q.trim().toLowerCase()
  return list
    .filter((r) => (status === 'all' || r.status === status) && (!n || r.traveller.toLowerCase().includes(n) || r.raisedBy.toLowerCase().includes(n)))
    .sort((a, b) => (sort === 'trip' ? a.checkIn.localeCompare(b.checkIn) : sort === 'budget' ? b.budget - a.budget : b.createdAt.localeCompare(a.createdAt)))
}

function RequestCard({ r, children }: { r: TravelRequest; children?: ReactNode }) {
  const nights = nightsBetween(r.checkIn, r.checkOut)
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <strong className="text-[17px]">
            {r.city} · {r.traveller}
          </strong>
          <div className="text-sm text-ink-500">
            {shortDate(r.checkIn)} – {shortDate(r.checkOut)} · {plural(nights, 'night')} · {plural(r.rooms, 'room')}
          </div>
        </div>
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs text-ink-500">{r.id}</span>
          <span className={`rounded-full px-2.5 py-[3px] text-xs font-bold capitalize ${statusStyle[r.status]}`}>{r.status}</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-canvas p-3 text-sm sm:grid-cols-4">
        <div>
          <span className="text-ink-500">Purpose</span>
          <br />
          <strong>{r.purpose}</strong>
        </div>
        <div>
          <span className="text-ink-500">Budget / night</span>
          <br />
          <strong>{inr(r.budget)}</strong>
        </div>
        <div>
          <span className="text-ink-500">Raised by</span>
          <br />
          <strong>{r.raisedBy}</strong>
        </div>
        <div>
          <span className="text-ink-500">{r.decidedBy ? 'Decided by' : 'Raised on'}</span>
          <br />
          <strong>{r.decidedBy ?? shortDate(r.createdAt.slice(0, 10))}</strong>
        </div>
      </div>
      {r.notes && <p className="text-sm text-ink-700">“{r.notes}”</p>}
      {r.comment && (
        <p className="rounded-lg bg-mist px-3 py-2 text-sm">
          <strong>Approver’s note:</strong> {r.comment}
        </p>
      )}
      {children}
    </article>
  )
}

export default function BizRequests() {
  const { company, isAdmin, me } = useAccount()
  const { user } = useAuth()
  const { name } = useProfile()
  const c = company!
  const [params, setParams] = useSearchParams()
  const tab = (['shortlist', 'raised', 'approve'].includes(params.get('tab') ?? '') ? params.get('tab') : 'raised') as Tab
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  const [tick, setTick] = useState(0)
  const all = useMemo(() => listRequests(c), [c, tick]) // eslint-disable-line react-hooks/exhaustive-deps
  const email = user!.email.toLowerCase()
  const mine = all.filter((r) => r.raisedByEmail.toLowerCase() === email)
  const others = all.filter((r) => r.raisedByEmail.toLowerCase() !== email)
  const pendingForMe = isAdmin ? others.filter((r) => r.status === 'pending').length : 0
  const [shortlist, setShortlist] = useState(() => getShortlist(c, email))

  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState('new')
  const [q, setQ] = useState('')
  const [form, setForm] = useState(false)
  const [lock, setLock] = useState(false)
  const [decide, setDecide] = useState<{ r: TravelRequest; to: 'approved' | 'rejected' } | null>(null)
  const [comment, setComment] = useState('')

  const myName = name || me?.name || 'Me'
  const blank = { traveller: myName, city: cities[0].name, checkIn: addDays(todayISO(), 7), checkOut: addDays(todayISO(), 9), rooms: 1, purpose: tripPurposes[0], budget: c.limitMetro, notes: '' }
  const [draft, setDraft] = useState(blank)
  const [err, setErr] = useState('')

  const raise = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.traveller.trim()) return setErr('Enter the traveller’s name.')
    if (draft.checkIn < todayISO()) return setErr('Check-in can’t be in the past.')
    if (draft.checkOut <= draft.checkIn) return setErr('Check-out must be after check-in.')
    if (draft.budget < 500) return setErr('Budget per night looks too low.')
    // Admins (or companies that don't need approval) are approved straight away.
    const auto = isAdmin || !c.requestApproval
    saveRequest({
      ...draft,
      traveller: draft.traveller.trim(),
      id: requestId(),
      companyId: c.id,
      raisedBy: myName,
      raisedByEmail: email,
      status: auto ? 'approved' : 'pending',
      decidedBy: auto ? (isAdmin ? 'Auto-approved (admin)' : 'Auto-approved (policy)') : undefined,
      decidedAt: auto ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
    })
    setForm(false)
    setDraft(blank)
    setErr('')
    setTick((t) => t + 1)
  }

  const confirmDecision = () => {
    if (!decide) return
    if (decide.to === 'rejected' && !comment.trim()) return
    saveRequest({ ...decide.r, status: decide.to, decidedBy: myName, decidedAt: new Date().toISOString(), comment: comment.trim() || undefined })
    setDecide(null)
    setComment('')
    setTick((t) => t + 1)
  }

  const bookLink = (r: TravelRequest) =>
    `/biz/hotels?${bizQuery({ city: r.city, checkIn: r.checkIn, checkOut: r.checkOut, rooms: r.rooms, bookingFor: r.traveller === myName ? 'Myself' : 'A colleague', cat: '', traveller: r.traveller })}`

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'shortlist', label: 'All Shortlist', count: shortlist.length },
    { id: 'raised', label: 'Travel Requests', count: mine.length },
    { id: 'approve', label: 'For You To Approve', count: pendingForMe },
  ]

  const field = 'h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-[15px] outline-none focus:border-navy-800'

  return (
    <div className="relative pb-16">
      <div className="absolute inset-x-0 top-0 h-[200px] bg-[linear-gradient(180deg,#FCE7DE_0%,rgba(252,231,222,0)_100%)]" aria-hidden="true" />
      <div className="container-page relative max-w-[1200px] pt-6">
        <nav aria-label="Breadcrumb" className="text-sm font-bold text-ink-700">
          <Link to="/biz/profile" className="text-ink-700 no-underline hover:underline">
            My Account
          </Link>{' '}
          › Travel Requests
        </nav>
        <div role="tablist" aria-label="Requests" className="no-scrollbar mt-4 flex gap-2 overflow-x-auto rounded-xl bg-white px-3 shadow-card sm:gap-8 sm:px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 border-b-[3px] px-1 py-4 text-[13px] font-black sm:px-2 sm:text-[15px] tracking-wide uppercase ${tab === t.id ? 'border-accent text-accent' : 'border-transparent text-ink-700 hover:text-ink-900'}`}
            >
              {t.label}
              {!!t.count && <span className={`rounded-full px-2 py-0.5 text-xs ${tab === t.id ? 'bg-accent text-white' : 'bg-mist text-ink-700'}`}>{t.count}</span>}
            </button>
          ))}
        </div>

        {tab === 'shortlist' && (
          <section className="mt-4 rounded-xl bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
              <h1 className="text-xl font-black">Your shortlisted hotels</h1>
              <span className="text-sm text-ink-500">Tap the heart on any hotel to add it here and compare later.</span>
            </div>
            {shortlist.length === 0 ? (
              <Empty icon={<Heart className="h-9 w-9" />} title="No shortlisted hotels yet" text="Shortlist hotels while you search, then share the list with your team or book in one tap.">
                <Link to="/biz/hotels" className="btn mt-3 rounded-full bg-gradient-to-r from-[#FF5A5F] to-ember-600 px-10 font-black text-white uppercase">
                  Explore hotels
                </Link>
              </Empty>
            ) : (
              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {shortlist.map(({ slug }) => {
                  const h = hotels.find((x) => x.slug === slug)
                  if (!h) return null
                  const { rate } = bizCheapest(c, h, 1)
                  return (
                    <article key={slug} className="overflow-hidden rounded-xl border border-line">
                      <div className="relative aspect-[16/10]">
                        <HotelArt hue={h.hue} photo={h.photos?.[0]} label={h.name} />
                        <button
                          type="button"
                          aria-label={`Remove ${h.name} from shortlist`}
                          onClick={() => setShortlist(toggleShortlist(c, email, slug))}
                          className="absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow"
                        >
                          <Heart className="h-5 w-5 fill-[#FF5A5F] text-[#FF5A5F]" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1 p-4">
                        <Link to={`/biz/hotel/${slug}`} className="font-bold text-ink-900 no-underline hover:text-navy-800">
                          {h.name}
                        </Link>
                        <span className="text-sm text-ink-500">
                          {h.area}, {h.city} · {h.rating.toFixed(1)}★
                        </span>
                        <span className="mt-1 text-sm">
                          Company rate <strong className="text-base">{inr(rate)}</strong> / night
                        </span>
                        <Link to={`/biz/hotel/${slug}`} className="btn-navy mt-2 min-h-10 text-sm">
                          View & book
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'raised' && (
          <section className="mt-4 rounded-xl bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h1 className="text-xl font-black">Raised by you</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Toolbar status={status} onStatus={setStatus} sort={sort} onSort={setSort} q={q} onQ={setQ} />
                <button type="button" onClick={() => setForm(true)} className="btn min-h-10 rounded-lg bg-ember-600 px-4 text-sm font-black text-white uppercase">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Raise request
                </button>
              </div>
            </div>
            <p className="px-5 pt-3 text-[13px] text-ink-500">
              {c.requestApproval ? (isAdmin ? 'You are an admin, so your own requests are approved straight away.' : 'Requests go to your company admin for approval before you book.') : 'Your company does not need approval — requests are approved automatically.'}
            </p>
            {(() => {
              const shown = applyFilters(mine, status, sort, q)
              return shown.length === 0 ? (
                <Empty icon={<ClipboardList className="h-9 w-9" />} title={mine.length ? 'No request matches these filters' : 'You haven’t raised any travel requests'} text="Raise a request with your city, dates and budget. Once approved, book it in one tap with the details filled in." />
              ) : (
                <div className="flex flex-col gap-3 p-5">
                  {shown.map((r) => (
                    <RequestCard key={r.id} r={r}>
                      {r.status === 'approved' && (
                        <div className="flex justify-end">
                          <Link
                            to={bookLink(r)}
                            onClick={() => {
                              try {
                                sessionStorage.setItem('stayeasy.biz.request', r.id)
                              } catch {
                                /* ignore */
                              }
                            }}
                            className="btn-primary min-h-10 text-sm"
                          >
                            Book now
                          </Link>
                        </div>
                      )}
                    </RequestCard>
                  ))}
                </div>
              )
            })()}
          </section>
        )}

        {tab === 'approve' && (
          <section className="mt-4 rounded-xl bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h1 className="text-xl font-black">For you to approve</h1>
              {isAdmin && c.verified && <Toolbar status={status} onStatus={setStatus} sort={sort} onSort={setSort} q={q} onQ={setQ} />}
            </div>
            {!isAdmin ? (
              <Empty icon={<Inbox className="h-9 w-9" />} title="No requests waiting for you" text="Only company admins approve travel requests. Requests you raise appear under Travel Requests." />
            ) : !c.verified ? (
              <Empty icon={<LockKeyhole className="h-9 w-9 text-ember-600" />} title="Verify your organisation to approve requests" text={`${c.name} is not verified yet. Approvals, company credit and the wallet unlock once you add the company GSTIN, Udyam or NGO ID.`}>
                <button type="button" onClick={() => setLock(true)} className="btn mt-3 rounded-full bg-gradient-to-r from-[#FF5A5F] to-ember-600 px-10 font-black text-white uppercase">
                  Verify now
                </button>
              </Empty>
            ) : (
              (() => {
                const shown = applyFilters(others, status, sort, q)
                return shown.length === 0 ? (
                  <Empty icon={<Inbox className="h-9 w-9" />} title={others.length ? 'No request matches these filters' : 'Nothing to approve'} text="When colleagues raise travel requests, they’ll appear here for you to approve or reject." />
                ) : (
                  <div className="flex flex-col gap-3 p-5">
                    {shown.map((r) => (
                      <RequestCard key={r.id} r={r}>
                        {r.status === 'pending' && (
                          <div className="flex flex-wrap justify-end gap-2">
                            <button type="button" className="btn-outline min-h-10 text-sm text-[#B42318]" onClick={() => setDecide({ r, to: 'rejected' })}>
                              <XCircle className="h-4 w-4" aria-hidden="true" /> Reject
                            </button>
                            <button type="button" className="btn min-h-10 bg-leaf-700 text-sm text-white" onClick={() => setDecide({ r, to: 'approved' })}>
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Approve
                            </button>
                          </div>
                        )}
                      </RequestCard>
                    ))}
                  </div>
                )
              })()
            )}
          </section>
        )}
      </div>

      {/* Raise request */}
      <AnimatePresence>
        {form && (
          <motion.div role="dialog" aria-modal="true" aria-labelledby="raise-h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setForm(false)} className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-950/55 sm:items-center sm:p-4">
            <motion.form
              onSubmit={raise}
              noValidate
              initial={{ y: 30 }}
              animate={{ y: 0 }}
              exit={{ y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex max-h-[92dvh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl"
            >
              <button type="button" aria-label="Close" onClick={() => setForm(false)} className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-mist">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              <h2 id="raise-h" className="text-xl font-black">
                Raise a travel request
              </h2>
              <label className="flex flex-col gap-1 text-sm font-bold">
                Traveller
                <input className={field} value={draft.traveller} onChange={(e) => setDraft({ ...draft, traveller: e.target.value })} list="req-people" />
                <datalist id="req-people">
                  {c.employees.map((e) => (
                    <option key={e.id} value={e.name} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold">
                City
                <select className={field} value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })}>
                  {cities.map((x) => (
                    <option key={x.name}>{x.name}</option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-1 text-sm font-bold">
                Dates
                <DatePopoverField single align="left" className="rounded-lg border border-line-strong font-normal" checkIn={draft.checkIn} checkOut={draft.checkOut} onChange={(checkIn, checkOut) => setDraft({ ...draft, checkIn, checkOut })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 text-sm font-bold">
                  Rooms
                  <input type="number" min={1} max={20} className={field} value={draft.rooms} onChange={(e) => setDraft({ ...draft, rooms: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
                </label>
                <label className="col-span-2 flex flex-col gap-1 text-sm font-bold">
                  Budget per night (₹)
                  <input type="number" min={500} step={100} className={field} value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: Number(e.target.value) || 0 })} />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm font-bold">
                Purpose
                <select className={field} value={draft.purpose} onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}>
                  {tripPurposes.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold">
                Notes for the approver (optional)
                <textarea className={`${field} h-20 py-2`} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Preferred area, meeting times…" />
              </label>
              {err && (
                <p role="alert" className="text-sm font-semibold text-ember-600">
                  {err}
                </p>
              )}
              <button type="submit" className="btn-primary min-h-12 text-base font-black uppercase">
                Submit request
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approve / reject */}
      <AnimatePresence>
        {decide && (
          <motion.div role="dialog" aria-modal="true" aria-labelledby="decide-h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDecide(null)} className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/55 p-4">
            <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-white p-6">
              <h2 id="decide-h" className="text-xl font-black">
                {decide.to === 'approved' ? 'Approve' : 'Reject'} {decide.r.id}?
              </h2>
              <p className="text-sm text-ink-700">
                {decide.r.traveller} · {decide.r.city} · {shortDate(decide.r.checkIn)} – {shortDate(decide.r.checkOut)} · budget {inr(decide.r.budget)}/night
              </p>
              <label className="flex flex-col gap-1 text-sm font-bold">
                Comment {decide.to === 'rejected' ? '(required)' : '(optional)'}
                <textarea className={`${field} h-20 py-2`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={decide.to === 'rejected' ? 'Tell them why, e.g. please travel next week' : 'e.g. Stay within ₹4,000'} />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-outline min-h-10 text-sm" onClick={() => setDecide(null)}>
                  Cancel
                </button>
                <button type="button" disabled={decide.to === 'rejected' && !comment.trim()} onClick={confirmDecision} className={`btn min-h-10 text-sm text-white disabled:opacity-50 ${decide.to === 'approved' ? 'bg-leaf-700' : 'bg-[#B42318]'}`}>
                  {decide.to === 'approved' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <VerifyOrgModal open={lock} onClose={() => setLock(false)} reason="You need to verify your organisation to approve travel requests and manage your team’s travel." />
      <BackToTop />
    </div>
  )
}
