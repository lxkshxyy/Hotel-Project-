import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Listing } from '../lib/types'
import { TypeIcon } from './typeIcons'

/** Home-type is stored as 'homestay' so listings saved before the three groups still read correctly. */
export type Category = 'hotel' | 'homestay' | 'unique'
type Type = { name: string; text: string; icon: string }
type Group = { id: Category; word: string; title: string; text: string; icon: string; common: Type[]; others: Type[] }

/** Property groups and types, following the reference's three-group chooser. */
export const groups: Group[] = [
  {
    id: 'homestay',
    word: 'home',
    title: 'Home-type property',
    text: 'Standalone units rented as a whole, such as individual apartments/flats, single bungalows, villas, and guest houses. They offer a residential experience for travelers seeking privacy and self-sufficient stays.',
    icon: 'home',
    common: [
      { name: 'Apartment/Flat', text: 'Self-contained accommodation unit within a building of similar units.', icon: 'apartment' },
      { name: 'Entire House', text: 'Independently hosted, freestanding house with a private entrance.', icon: 'home' },
      { name: 'Villa', text: 'Freestanding luxury vacation house with local decor and atmosphere.', icon: 'villa' },
      { name: 'Bungalow', text: 'Basic freestanding accommodation unit in a tropical environment.', icon: 'bungalow' },
      { name: 'Homestay', text: 'Rented room within house shared with host, with shared facilities.', icon: 'homestay' },
      { name: 'Farm stay', text: 'Room or unit within a working farm or ranch with shared facilities.', icon: 'farm' },
    ],
    others: [
      { name: 'Bed & Breakfast', text: 'Small lodging that offers overnight stays and breakfast.', icon: 'bed' },
      { name: 'Cabin', text: 'Freestanding rustic box frame or A-frame vacation house in nature.', icon: 'cabin' },
      { name: 'Chalet', text: 'Freestanding vacation house in an alpine environment.', icon: 'chalet' },
      { name: 'Country House', text: 'Private home or estate in a rural environment and rustic atmosphere.', icon: 'country' },
      { name: 'Guest House', text: 'A small, separate house that shares land with a larger residence.', icon: 'guestHouse' },
      { name: 'Haveli', text: 'Traditional South Asian freestanding house or townhouse.', icon: 'haveli' },
      { name: 'Holiday Home', text: 'Independent house or bungalow rented out for short holidays.', icon: 'holidayHome' },
      { name: 'Townhouse', text: 'Multi-floor home that shares side walls with the houses next to it.', icon: 'townhouse' },
      { name: 'Cottage', text: 'Cosy standalone house, usually in a holiday destination.', icon: 'cottage' },
      { name: 'Farmhouse', text: 'Large house in the countryside with open outdoor space.', icon: 'farmhouse' },
      { name: 'Beach Hut', text: 'Small cabin or hut right next to the beach.', icon: 'beachHut' },
    ],
  },
  {
    id: 'hotel',
    word: 'hotel',
    title: 'Hotel-type property',
    text: 'Multiple rented units within one location, such as hotels, motels, serviced apartments, or resorts. They offer shared facilities, standard traveler amenities and services, and a front desk staff.',
    icon: 'city',
    common: [
      { name: 'Hotel', text: 'Multi-unit accommodation building with shared facilities and services.', icon: 'hotel' },
      { name: 'Guest House', text: 'A small, separate house that shares land with a larger residence.', icon: 'guestHouse' },
      { name: 'Serviced Apartment', text: 'Apartment unit with cleaning and front desk services.', icon: 'serviced' },
      { name: 'Resort', text: 'Vacation hotel that integrates local environment or geography.', icon: 'resort' },
      { name: 'Hostel', text: 'Budget dormitory bedroom lodging with shared bathrooms.', icon: 'hostel' },
    ],
    others: [
      { name: 'Bed & Breakfast', text: 'Small lodging that offers overnight stays and breakfast.', icon: 'bed' },
      { name: 'Capsule Hotel', text: 'Budget accommodation with capsule spaces for sleeping.', icon: 'capsule' },
      { name: 'Cruise', text: 'Room or suite within a boat that moves location during your stay.', icon: 'cruise' },
      { name: 'Inn', text: 'Small hotel with local décor and atmosphere.', icon: 'inn' },
      { name: 'Lodge', text: 'Private vacation home with natural environment location.', icon: 'lodge' },
      { name: 'Love Hotel', text: 'Adults-only hotel with hourly or nightly room rentals.', icon: 'love' },
      { name: 'Motel', text: 'Roadside hotel with parking close to the rooms.', icon: 'motel' },
      { name: 'Resort Villa', text: 'Private villa within a resort, with the resort’s facilities and services.', icon: 'resortVilla' },
      { name: 'Ryokan', text: 'Traditional Japanese inn with dining services.', icon: 'ryokan' },
      { name: 'Heritage Palace', text: 'Palace or haveli converted into a hotel with grand rooms.', icon: 'palace' },
    ],
  },
  {
    id: 'unique',
    word: 'unique',
    title: 'Unique-type property',
    text: 'Special accommodations such as holiday/caravan parks, houseboats, farm stays, or castles. They appeal to travelers seeking distinctive accommodation experiences that often include related activities.',
    icon: 'circus',
    common: [
      { name: 'Capsule Hotel', text: 'Budget accommodation with capsule spaces for sleeping.', icon: 'capsule' },
      { name: 'Castle', text: 'Historical stone building with fortification design.', icon: 'castle' },
      { name: 'Cave House', text: 'Room within, or entire space enclosed underground.', icon: 'cave' },
      { name: 'Cruise', text: 'Room or suite within a boat that moves location during your stay.', icon: 'cruise' },
      { name: 'Dome House', text: 'Freestanding vacation house with a spherical roof or shape.', icon: 'dome' },
      { name: 'Farm stay', text: 'Room or unit within a working farm or ranch with shared facilities.', icon: 'farm' },
      { name: 'Haveli', text: 'Traditional South Asian freestanding house or townhouse.', icon: 'haveli' },
      { name: 'Holiday Park/Caravan Park', text: 'Cabin, tent site, or caravan site with shared facilities and basic services.', icon: 'holidayPark' },
      { name: 'Houseboat', text: 'Accommodation on a stationary, floating vehicle.', icon: 'houseboat' },
      { name: 'Igloo', text: 'Freestanding vacation house made of snow or ice blocks.', icon: 'igloo' },
      { name: 'Machiya', text: 'Traditional Japanese wooden townhouse.', icon: 'machiya' },
      { name: 'Ryokan', text: 'Traditional Japanese inn with dining services.', icon: 'ryokan' },
      { name: 'Tent', text: 'Freestanding fabric housing unit in a natural environment.', icon: 'tent' },
      { name: 'Tipi', text: 'Conical tent on a framework of poles made of natural materials.', icon: 'tipi' },
      { name: 'Treehouse', text: 'Accommodation unit within or supported by trees.', icon: 'treehouse' },
      { name: 'Yurt', text: 'Round tent with a wooden frame, covered with felt or canvas.', icon: 'yurt' },
      { name: 'Luxury Camp', text: 'Large, furnished tents with proper beds, bathrooms and service.', icon: 'glamping' },
      { name: 'RV (Recreational Vehicle)', text: 'Caravan or campervan with basic living facilities.', icon: 'rv' },
      { name: 'Dharamshala', text: 'Simple, low-cost rooms, mainly for pilgrims.', icon: 'dharamshala' },
      { name: 'Ashram', text: 'Spiritual retreat with simple rooms for meditation, yoga or study.', icon: 'ashram' },
    ],
    others: [],
  },
]

export const groupLabel = (c?: Category) => groups.find((g) => g.id === c)?.title.replace(' property', '') ?? ''

/** The group a type belongs to (first match), for listings saved without one. */
export const categoryOf = (type: string): Category | undefined => groups.find((g) => [...g.common, ...g.others].some((t) => t.name === type))?.id

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 60) return m <= 1 ? 'just now' : `${m} minutes ago`
  const h = Math.round(m / 60)
  if (h < 24) return h === 1 ? '1 hour ago' : `${h} hours ago`
  const d = Math.round(h / 24)
  if (d < 30) return d === 1 ? '1 day ago' : `${d} days ago`
  const mo = Math.round(d / 30)
  return mo === 1 ? '1 month ago' : `${mo} months ago`
}

/* Lifted "3D" card: rises with a soft shadow on hover, pops when picked and stays raised. */
const rest = '0 0 0 rgba(18,55,42,0)'
const lift = '0 14px 28px -12px rgba(18,55,42,0.28), 0 3px 8px -2px rgba(18,55,42,0.10)'

function LiftCard({ on, onClick, className = '', children, role = 'radio' }: { on: boolean; onClick: () => void; className?: string; children: ReactNode; role?: string }) {
  return (
    <motion.button
      type="button"
      role={role}
      aria-checked={on}
      onClick={onClick}
      initial={false}
      animate={{ y: on ? -4 : 0, scale: on ? [1, 1.035, 1] : 1, boxShadow: on ? lift : rest }}
      whileHover={{ y: -5, boxShadow: lift }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24, scale: { duration: 0.32 } }}
      style={{ transformPerspective: 800 }}
      className={`rounded-xl border bg-white text-left outline-offset-2 transition-colors ${on ? 'border-pine-700 ring-1 ring-pine-700' : 'border-line-strong hover:border-ink-400'} ${className}`}
    >
      {children}
    </motion.button>
  )
}

function Dot({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${on ? 'border-pine-800' : 'border-ink-400'}`}>
      {on && <span className="h-2.5 w-2.5 rounded-full bg-pine-800" />}
    </span>
  )
}

type Step = 'welcome' | 'group' | 'type'

/**
 * Full-screen listing start: Welcome back (finish a draft or create manually) → property group →
 * exact type. Without `welcome` it opens straight on the group step (used for "Change type").
 */
export function PropertyTypePicker({
  open,
  onClose,
  onPick,
  initial,
  initialCategory,
  busy,
  confirmLabel = 'Next',
  welcome,
}: {
  open: boolean
  onClose: () => void
  onPick: (category: Category, type: string) => void
  initial?: string
  initialCategory?: Category
  busy?: boolean
  confirmLabel?: string
  welcome?: { name: string; drafts: Listing[]; onResume: (l: Listing) => void }
}) {
  const [step, setStep] = useState<Step>('group')
  const [choice, setChoice] = useState('new')
  const [cat, setCat] = useState<Category | null>(null)
  const [type, setType] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!open) return
    const c = initialCategory ?? (initial ? categoryOf(initial) : undefined)
    setStep(welcome ? 'welcome' : 'group')
    setChoice('new')
    setCat(c ?? null)
    setType(c && initial ? initial : '')
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [step])

  const g = groups.find((x) => x.id === cat)
  const first = welcome?.name.trim().split(/\s+/)[0] ?? ''

  const back = () => (step === 'type' ? setStep('group') : step === 'group' && welcome ? setStep('welcome') : onClose())
  const next = () => {
    if (step === 'welcome') {
      const d = welcome?.drafts.find((x) => x.id === choice)
      if (d) welcome!.onResume(d)
      else setStep('group')
    } else if (step === 'group') {
      if (cat) setStep('type')
    } else if (cat && type) onPick(cat, type)
  }
  const canNext = step === 'welcome' ? true : step === 'group' ? !!cat : !!type && !busy
  const nextLabel = step === 'type' ? (busy ? 'Starting…' : confirmLabel) : 'Next'
  const backLabel = step === 'welcome' || (step === 'group' && !welcome) ? (welcome ? 'Exit' : 'Cancel') : 'Back'

  const typeGrid = (list: Type[]) => (
    <div role="radiogroup" className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
      {list.map((t) => {
        const on = t.name === type
        return (
          <LiftCard key={t.name} on={on} onClick={() => setType(t.name)} className="flex min-h-[132px] flex-col p-3.5 sm:min-h-[146px] sm:p-4">
            <TypeIcon name={t.icon} className={`h-8 w-8 ${on ? 'text-pine-800' : 'text-ink-900'}`} />
            <strong className={`mt-3 text-[14.5px] font-semibold sm:text-[15.5px] ${on ? 'text-pine-800' : 'text-ink-900'}`}>{t.name}</strong>
            <span className="mt-1 text-[12.5px] leading-snug text-ink-500 sm:text-[13.5px]">{t.text}</span>
          </LiftCard>
        )
      })}
    </div>
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col bg-white" role="dialog" aria-modal="true" aria-labelledby="pick-h">
          <div className="h-px shrink-0 bg-line" />
          <div ref={scroller} className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="mx-auto max-w-[860px] px-4 pt-9 pb-12 sm:px-6">
                {step === 'welcome' && welcome && (
                  <>
                    <h1 id="pick-h" className="text-[27px] font-semibold text-ink-900 sm:text-[30px]">
                      Welcome back{first ? `, ${first}` : ''}
                    </h1>
                    {welcome.drafts.length > 0 && (
                      <>
                        <h2 className="mt-8 text-[19px] font-semibold text-ink-900">Complete your listing</h2>
                        <div role="radiogroup" aria-label="Complete your listing" className="mt-4 flex flex-col gap-3">
                          {welcome.drafts.map((d) => (
                            <LiftCard key={d.id} on={choice === d.id} onClick={() => setChoice(d.id)} className="flex items-start gap-4 p-5">
                              <Dot on={choice === d.id} />
                              <span className="min-w-0">
                                <strong className={`block truncate text-[18px] font-medium ${choice === d.id ? 'text-pine-800' : 'text-ink-900'}`}>{d.basics.name.trim() || `${d.basics.propertyType} Type listing`}</strong>
                                <span className="mt-1 block text-[14px] text-ink-500">Created: {ago(d.createdAt)}</span>
                              </span>
                            </LiftCard>
                          ))}
                        </div>
                      </>
                    )}
                    <h2 className="mt-9 text-[19px] font-semibold text-ink-900">Start a new listing</h2>
                    <div role="radiogroup" aria-label="Start a new listing" className="mt-4">
                      <LiftCard on={choice === 'new'} onClick={() => setChoice('new')} className="flex w-full items-center gap-4 p-5 sm:p-6">
                        <span className="flex min-w-0 flex-1 flex-col gap-3">
                          <span className="flex items-center gap-3">
                            <Dot on={choice === 'new'} />
                            <strong className={`text-[19px] font-medium ${choice === 'new' ? 'text-pine-800' : 'text-ink-900'}`}>Create listing manually</strong>
                          </span>
                          <span className="pl-8 text-[15px] text-ink-700">Build your listing from scratch with our easy-to-follow, step-by-step guide.</span>
                        </span>
                        <TypeIcon name="cottage" className="hidden h-16 w-16 shrink-0 text-ink-900 sm:block" strokeWidth={1.1} />
                      </LiftCard>
                    </div>
                  </>
                )}

                {step === 'group' && (
                  <>
                    <h1 id="pick-h" className="text-[27px] font-semibold text-ink-900 sm:text-[30px]">
                      What type of property are you listing?
                    </h1>
                    <div role="radiogroup" aria-label="Property group" className="mt-6 flex flex-col gap-4">
                      {groups.map((x) => {
                        const on = x.id === cat
                        return (
                          <LiftCard
                            key={x.id}
                            on={on}
                            onClick={() => {
                              if (x.id !== cat) setType('')
                              setCat(x.id)
                            }}
                            className="flex flex-col gap-3 p-4 sm:p-5"
                          >
                            <TypeIcon name={x.icon} className={`h-8 w-8 ${on ? 'text-pine-800' : 'text-ink-900'}`} strokeWidth={on ? 1.8 : 1.35} />
                            <span>
                              <strong className={`block text-[16px] font-semibold ${on ? 'text-pine-800' : 'text-ink-900'}`}>{x.title}</strong>
                              <span className="mt-2 block text-[14px] leading-relaxed text-ink-500">{x.text}</span>
                            </span>
                          </LiftCard>
                        )
                      })}
                    </div>
                  </>
                )}

                {step === 'type' && g && (
                  <>
                    <h1 id="pick-h" className="text-[27px] font-semibold text-ink-900 sm:text-[30px]">
                      Which {g.word}-type property best fits your place?
                    </h1>
                    {g.others.length > 0 ? (
                      <>
                        <h2 className="mt-6 text-[13px] font-semibold text-ink-500">Most common {g.word}-type property</h2>
                        {typeGrid(g.common)}
                        <h2 className="mt-9 text-[13px] font-semibold text-ink-500">Others {g.word}-type property</h2>
                        {typeGrid(g.others)}
                      </>
                    ) : (
                      <div className="mt-3">{typeGrid(g.common)}</div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="relative border-t border-line bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="mx-auto flex max-w-[860px] items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
              <button type="button" onClick={back} className="flex h-12 min-w-[120px] items-center justify-center rounded-full border border-line-strong bg-white px-8 text-[16px] font-semibold text-pine-800 transition-colors hover:border-pine-700 hover:bg-pine-50 sm:min-w-[140px]">
                {backLabel}
              </button>
              <button type="button" onClick={next} disabled={!canNext} className="flex h-12 min-w-[120px] items-center justify-center rounded-full bg-pine-800 px-8 text-[16px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(18,55,42,0.55)] transition-colors hover:bg-pine-900 disabled:cursor-not-allowed disabled:bg-ink-400/50 disabled:shadow-none sm:min-w-[140px]">
                {nextLabel}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
