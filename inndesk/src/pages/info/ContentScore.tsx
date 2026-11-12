import { motion } from 'framer-motion'
import { BedDouble, Camera, ChevronDown, FileText, Landmark, ScrollText, Sparkles, Star, Wifi } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useListings } from '../../lib/hooks'
import { stepDone } from '../../lib/listing'
import { contentScore } from '../../lib/score'
import type { Listing } from '../../lib/types'
import { Card, Faq, type InfoProps } from './kit'

type Part = { key: string; title: string; icon: ReactNode; max: number; got: number; tasks: { text: string; to: string; pts: number }[] }

/** The same 100 points as contentScore(), split by section with what's left to do. */
export function scoreParts(l: Listing, base: string): Part[] {
  const info = (p: string) => `${base}/info/${p}`
  const edit = (s: string) => `${base}/edit?step=${s}`
  const step = (id: Parameters<typeof stepDone>[1]) => (stepDone(l, id) ? 10 : 0)
  const photos = Math.min(l.photos.length, 10) * 2
  const desc = (l.basics.description ?? '').trim().length >= 100 ? 10 : 0
  return [
    {
      key: 'details',
      title: 'Property Details',
      icon: <FileText className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />,
      max: 30,
      got: step('basics') + step('location') + desc,
      tasks: [
        ...(step('basics') ? [] : [{ text: 'Complete Basic Information (name, years, verified contacts)', to: edit('basics'), pts: 10 }]),
        ...(step('location') ? [] : [{ text: 'Complete the address and map pin', to: edit('location'), pts: 10 }]),
        ...(desc ? [] : [{ text: 'Write a property description of at least 100 characters', to: info('basics'), pts: 10 }]),
      ],
    },
    { key: 'photos', title: 'Photos', icon: <Camera className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />, max: 30, got: step('photos') + photos, tasks: [...(step('photos') ? [] : [{ text: 'Finish the Photos step (tag photos to rooms and areas)', to: edit('photos'), pts: 10 }]), ...(photos < 20 ? [{ text: `Upload ${10 - Math.min(l.photos.length, 10)} more photos (2 points each)`, to: edit('photos'), pts: 20 - photos }] : [])] },
    { key: 'amenities', title: 'Amenities', icon: <Wifi className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />, max: 10, got: step('amenities'), tasks: step('amenities') ? [] : [{ text: 'Tick the amenities your star rating needs', to: info('amenities'), pts: 10 }] },
    { key: 'rooms', title: 'Rooms', icon: <BedDouble className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />, max: 10, got: step('rooms'), tasks: step('rooms') ? [] : [{ text: 'Complete every room type', to: info('rooms'), pts: 10 }] },
    { key: 'policies', title: 'Policies', icon: <ScrollText className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />, max: 10, got: step('policies'), tasks: step('policies') ? [] : [{ text: 'Answer the property rules', to: info('policies'), pts: 10 }] },
    { key: 'legal', title: 'Finance & Legal', icon: <Landmark className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />, max: 10, got: step('legal'), tasks: step('legal') ? [] : [{ text: 'Add PAN, GST and bank details', to: edit('legal'), pts: 10 }] },
  ]
}

function Ring({ value }: { value: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 128 128" className="h-[120px] w-[120px] shrink-0 sm:h-[132px] sm:w-[132px]" role="img" aria-label={`Content score ${value} out of 100`}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="12" />
      <motion.circle cx="64" cy="64" r={r} fill="none" stroke="#0047AB" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / 100) }} transition={{ duration: 0.9, ease: 'easeOut' }} transform="rotate(-90 64 64)" />
      <text x="64" y="70" textAnchor="middle" className="fill-ink-900" style={{ fontSize: 20, fontWeight: 600 }}>
        {value}/100
      </text>
    </svg>
  )
}

export default function ContentScore({ l, base }: InfoProps) {
  const parts = scoreParts(l, base)
  const score = contentScore(l)
  const all = useListings().data ?? []
  const others = all.filter((x) => x.id !== l.id)
  const avg = others.length ? Math.round(others.reduce((n, x) => n + contentScore(x), 0) / others.length) : null
  const [open, setOpen] = useState<string[]>(parts.filter((p) => p.tasks.length).map((p) => p.key).slice(0, 1))
  const pending = parts.reduce((n, p) => n + p.tasks.length, 0)

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#AFDBF5] via-[#EAF5FC] to-[#AFDBF5] px-5 py-6 sm:px-7">
          <svg aria-hidden="true" viewBox="0 0 600 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-40">
            <path d="M0 140 C 150 90, 300 190, 600 110 L600 200 L0 200 Z" fill="#ffffff" />
            <path d="M0 170 C 200 120, 380 200, 600 150 L600 200 L0 200 Z" fill="#EAF5FC" />
          </svg>
          <div className="relative flex flex-col items-center gap-5 sm:flex-row">
            <Ring value={score} />
            <div className="text-center sm:text-left">
              <h1 className="text-[20px] font-semibold text-ink-900 sm:text-[22px]">{score === 100 ? 'Congratulations! You have the best content score!' : `Your content score is ${score}/100`}</h1>
              <p className="mt-1 text-[14.5px] text-ink-700">{score === 100 ? 'Keep photos and details up to date to stay on top.' : `Finish ${pending} pending task${pending === 1 ? '' : 's'} below to reach 100.`}</p>
              <Link to={`${base}/help/content-tips`} className="mt-3 inline-flex h-9 items-center rounded-md bg-white px-4 text-[14px] font-semibold text-pine-800 no-underline shadow-sm hover:bg-pine-50">
                Learn More
              </Link>
            </div>
          </div>
        </section>

        <Card className="p-4 sm:p-5">
          <h2 className="text-[16px] font-medium text-ink-900">Here is the section-wise breakup of your overall content score.</h2>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {parts.map((p) => (
              <div key={p.key} className="border-line px-2 py-3 text-[13.5px] text-ink-700 sm:border-r sm:last:border-r-0">
                <span className="text-pine-800">{p.icon}</span>
                <span className="mt-1.5 block font-medium text-ink-900">{p.title} Score</span>
                {p.got}/{p.max}
              </div>
            ))}
          </div>
        </Card>

        {parts.map((p) => {
          const isOpen = open.includes(p.key)
          const done = !p.tasks.length
          return (
            <Card key={p.key} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-pine-800">{p.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-[18px] font-medium text-ink-900">{p.title}</h3>
                    <span className={`flex items-center gap-3 rounded-full border px-3 py-1 text-[12.5px] ${done ? 'border-live/40 bg-[#eef8f1]' : 'border-brass-200 bg-brass-50'}`}>
                      <span className="text-ink-900">
                        Current score is {p.got}/{p.max}
                      </span>
                      <span className={done ? 'text-live' : 'text-brass-700'}>{done ? 'No Pending Tasks' : `${p.tasks.length} Pending Task${p.tasks.length === 1 ? '' : 's'}`}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-[13.5px] text-ink-700">{done ? `You have achieved the maximum possible score of ${p.max} for ${p.title}.` : `You can gain ${p.max - p.got} more points here.`}</p>
                </div>
                <button type="button" onClick={() => setOpen((o) => (o.includes(p.key) ? o.filter((x) => x !== p.key) : [...o, p.key]))} aria-expanded={isOpen} className="flex shrink-0 items-center gap-1 text-[14px] font-semibold text-pine-800">
                  {isOpen ? 'Hide' : 'Show'} <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E6EEF7]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(p.got / p.max) * 100}%` }} transition={{ duration: 0.7 }} className={`h-full rounded-full ${done ? 'bg-live' : 'bg-brass-500'}`} />
              </div>
              {isOpen && (
                <ul className="mt-3 flex flex-col gap-2">
                  {done ? (
                    <li className="text-[14px] text-ink-700">Nothing to do here.</li>
                  ) : (
                    p.tasks.map((t) => (
                      <li key={t.text} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[#F4F8FC] px-3 py-2.5 text-[14px] text-ink-900">
                        <span>
                          {t.text} <span className="text-[12.5px] text-live">+{t.pts}</span>
                        </span>
                        <Link to={t.to} className="text-[13.5px] font-semibold text-pine-800">
                          Fix now
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </Card>
          )
        })}
      </div>

      <aside className="flex flex-col gap-5">
        <section className="overflow-hidden rounded-lg border border-line-strong">
          <h2 className="relative overflow-hidden bg-pine-800 px-4 py-4 text-[22px] font-semibold text-white">
            <span aria-hidden="true" className="absolute -top-6 -right-6 h-24 w-28 rounded-full bg-pine-700" />
            <Star className="absolute top-3 right-4 h-9 w-9 fill-brass-200 text-brass-200" aria-hidden="true" />
            <span className="relative">Insights</span>
          </h2>
          <p className="m-4 border-l-2 border-brass-500 pl-3 text-[14px] leading-relaxed text-ink-700">
            {avg != null ? `The average content score across your other properties is ${avg}. ` : ''}
            {score === 100 ? 'This property has a perfect score.' : 'Complete the pending tasks to improve your score.'}
          </p>
        </section>
        <Faq
          items={[
            [
              'How can I increase my content score?',
              <ul key="a" className="list-disc pl-5">
                <li>Complete all the pending tasks above.</li>
                <li>Upload at least 10 clear photos of the property and rooms.</li>
                <li>Tick the amenities your star rating needs.</li>
                <li>Write a description of at least 100 characters.</li>
                <li>Answer all the property rules.</li>
              </ul>,
            ],
            ['There is no change to my content score. Why?', <p key="b">The score updates as soon as a change is saved. If a step still shows pending, open it and check for fields marked in red.</p>],
            [
              'How does my content score affect my listing?',
              <p key="c">
                <Sparkles className="mr-1 inline h-4 w-4 text-brass-600" aria-hidden="true" />
                Complete listings get more trust from guests and usually more bookings.
              </p>,
            ],
          ]}
        />
      </aside>
    </div>
  )
}
