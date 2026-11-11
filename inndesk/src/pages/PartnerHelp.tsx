import { CalendarCheck, Camera, ChevronRight, CreditCard, Flag, Globe, Handshake, Headset, Search, ShieldCheck, ThumbsDown, ThumbsUp, TrendingUp, UserCheck } from 'lucide-react'
import { useMemo, useState, type ComponentType } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { articleBySlug, articles, mostViewed, topicById, topics, type Block } from '../data/help'

const icons: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  headset: Headset,
  card: CreditCard,
  handshake: Handshake,
  calendar: CalendarCheck,
  guest: UserCheck,
  camera: Camera,
  flag: Flag,
  trend: TrendingUp,
  globe: Globe,
  shield: ShieldCheck,
}

function Crumbs({ id, items }: { id: string; items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[14px] text-ink-700">
      <Link to={`/app/properties/${id}`} className="text-ink-700 underline hover:text-pine-800">
        Home
      </Link>
      {items.map((x) => (
        <span key={x.label} className="flex items-center gap-1.5">
          <span aria-hidden="true">&gt;</span>
          {x.to ? (
            <Link to={x.to} className="text-ink-700 underline hover:text-pine-800">
              {x.label}
            </Link>
          ) : (
            <strong className="font-semibold text-ink-900">{x.label}</strong>
          )}
        </span>
      ))}
    </nav>
  )
}

function Tab({ label }: { label: string }) {
  return (
    <div className="mt-5 border-b border-line">
      <span className="relative inline-block px-5 pb-3 text-[16px] font-semibold text-pine-800">
        {label}
        <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-pine-800" />
      </span>
    </div>
  )
}

function StillLooking({ id }: { id: string }) {
  return (
    <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-pine-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-pine-800 shadow-sm ring-1 ring-pine-100">
          <Headset className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[22px] font-semibold text-pine-900">Still looking for help?</h2>
          <p className="text-[15px] text-ink-700">Our partner team can help with anything not covered here.</p>
        </div>
      </div>
      <Link to={`/app/properties/${id}/help/contact-us`} className="h-11 rounded-full border border-line-strong bg-white px-6 text-[15px] leading-[44px] font-semibold text-pine-900 no-underline hover:border-pine-700">
        Take me there
      </Link>
    </div>
  )
}

const shell = 'min-h-[calc(100dvh-68px)] bg-white'
const wrap = 'mx-auto max-w-[1240px] px-4 pt-7 pb-14 sm:px-8'

/** Partner Help home: common problems, browse by topic, contact. */
export default function PartnerHelp() {
  const { id = '', slug } = useParams()
  const [q, setQ] = useState('')
  const hits = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (n.length < 2) return []
    const text = (b: Block) => (typeof b === 'string' ? b : 'steps' in b ? b.steps.join(' ') : 'list' in b ? b.list.join(' ') : b.tip)
    return articles.filter((a) => a.title.toLowerCase().includes(n) || a.body.some((b) => text(b).toLowerCase().includes(n))).slice(0, 8)
  }, [q])
  if (slug) return <HelpArticle id={id} slug={slug} />
  const base = `/app/properties/${id}/help`

  return (
    <div className={shell}>
      <div className={wrap}>
        <Crumbs id={id} items={[{ label: 'Partner Help' }]} />
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-[32px] font-semibold text-ink-900">Partner Help</h1>
          <div className="relative w-full sm:max-w-[420px]">
            <label className="flex h-12 items-center gap-3 rounded-full bg-[#cfdfd5] px-5 ring-pine-700 focus-within:bg-white focus-within:ring-1">
              <Search className="h-5 w-5 shrink-0 text-ink-900" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help articles" aria-label="Search help articles" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-500" />
            </label>
            {q.trim().length >= 2 && (
              <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl bg-white shadow-[0_14px_36px_-10px_rgba(18,55,42,0.3)] ring-1 ring-line">
                {hits.length ? (
                  hits.map((a) => (
                    <Link key={a.slug} to={`${base}/${a.slug}`} className="flex items-center justify-between gap-3 px-4 py-3 text-[15px] text-ink-900 no-underline hover:bg-pine-50">
                      <span>
                        {a.title}
                        <span className="block text-[12.5px] text-ink-500">{topicById(a.topic)?.title}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />
                    </Link>
                  ))
                ) : (
                  <p className="px-4 py-4 text-[14px] text-ink-500">No articles match “{q.trim()}”. Try another word, or contact us below.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <h2 className="mt-10 text-[20px] font-semibold text-ink-900">Common problems</h2>
        <Tab label="Most Viewed" />
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {mostViewed.map((s) => {
            const a = articleBySlug(s)!
            return (
              <Link key={s} to={`${base}/${s}`} className="group flex min-h-[176px] flex-col justify-between rounded-xl border border-line-strong p-4 no-underline transition-all hover:-translate-y-0.5 hover:border-pine-700 hover:shadow-[0_12px_26px_-14px_rgba(18,55,42,0.35)]">
                <strong className="text-[18.5px] leading-snug font-medium text-ink-900 group-hover:text-pine-900">{a.title}</strong>
                <span className="text-[13.5px] text-ink-500">{a.tag ?? topicById(a.topic)?.title}</span>
              </Link>
            )
          })}
        </div>

        <h2 className="mt-14 text-[20px] font-semibold text-ink-900">Find more help</h2>
        <Tab label="Browse by topic" />
        <div className="mt-7 grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => {
            const Icon = icons[t.icon] ?? Headset
            return (
              <section key={t.id} aria-labelledby={`t-${t.id}`} className="rounded-xl border border-line-strong p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine-50 text-pine-800 ring-1 ring-pine-100">
                    <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 id={`t-${t.id}`} className="text-[18px] font-medium text-ink-900">
                    {t.title}
                  </h3>
                </div>
                <ul className="mt-4 flex flex-col">
                  {t.articles.map((s) => (
                    <li key={s}>
                      <Link to={`${base}/${s}`} className="flex items-center justify-between gap-3 rounded-lg py-3 text-[15px] font-medium text-ink-900 no-underline hover:text-pine-800">
                        {articleBySlug(s)!.title}
                        <ChevronRight className="h-5 w-5 shrink-0 text-ink-900" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

        <StillLooking id={id} />
      </div>
    </div>
  )
}

function HelpArticle({ id, slug }: { id: string; slug: string }) {
  const a = articleBySlug(slug)
  const [vote, setVote] = useState<'yes' | 'no' | null>(null)
  if (!a) return <Navigate to={`/app/properties/${id}/help`} replace />
  const t = topicById(a.topic)!
  const base = `/app/properties/${id}/help`
  return (
    <div className={shell}>
      <div className={wrap}>
        <Crumbs id={id} items={[{ label: 'Partner Help', to: base }, { label: t.title }]} />
        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px]">
          <article className="max-w-[760px]">
            <h1 className="text-[30px] leading-tight font-semibold text-ink-900">{a.title}</h1>
            <div className="mt-6 flex flex-col gap-4 text-[16px] leading-relaxed text-ink-900">
              {a.body.map((b, i) =>
                typeof b === 'string' ? (
                  <p key={i}>{b}</p>
                ) : 'steps' in b ? (
                  <ol key={i} className="flex flex-col gap-2.5">
                    {b.steps.map((x, j) => (
                      <li key={j} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-800 text-[13px] font-bold text-white">{j + 1}</span>
                        <span className="pt-0.5">{x}</span>
                      </li>
                    ))}
                  </ol>
                ) : 'list' in b ? (
                  <ul key={i} className="ml-5 list-disc space-y-1.5 marker:text-pine-700">
                    {b.list.map((x, j) => (
                      <li key={j}>{x}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i} className="rounded-xl border-l-4 border-brass-500 bg-brass-50 px-4 py-3 text-[15px]">
                    <strong className="font-semibold">Tip: </strong>
                    {b.tip}
                  </p>
                ),
              )}
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
              {vote ? (
                <p role="status" className="text-[15px] font-semibold text-pine-900">
                  {vote === 'yes' ? 'Thanks for letting us know!' : 'Thanks. Our partner team can help: use “Take me there” below.'}
                </p>
              ) : (
                <>
                  <span className="text-[15px] font-semibold text-ink-900">Was this article helpful?</span>
                  <button type="button" onClick={() => setVote('yes')} className="flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-[14px] font-semibold text-pine-800 hover:border-pine-700 hover:bg-pine-50">
                    <ThumbsUp className="h-4 w-4" aria-hidden="true" /> Yes
                  </button>
                  <button type="button" onClick={() => setVote('no')} className="flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-[14px] font-semibold text-pine-800 hover:border-pine-700 hover:bg-pine-50">
                    <ThumbsDown className="h-4 w-4" aria-hidden="true" /> No
                  </button>
                </>
              )}
            </div>
          </article>
          <aside aria-labelledby="more-h" className="self-start rounded-xl border border-line-strong p-5">
            <h2 id="more-h" className="text-[16px] font-semibold text-ink-900">
              More in {t.title}
            </h2>
            <ul className="mt-2">
              {t.articles.map((s) => (
                <li key={s}>
                  <Link to={`${base}/${s}`} aria-current={s === slug ? 'page' : undefined} className={`flex items-center justify-between gap-2 py-2.5 text-[14.5px] no-underline ${s === slug ? 'font-semibold text-pine-800' : 'text-ink-900 hover:text-pine-800'}`}>
                    {articleBySlug(s)!.title}
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
        <StillLooking id={id} />
      </div>
    </div>
  )
}
