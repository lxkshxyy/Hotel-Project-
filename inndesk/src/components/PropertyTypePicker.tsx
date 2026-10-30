import { AnimatePresence, motion } from 'framer-motion'
import {
  Building2,
  Car,
  Caravan,
  Castle,
  Check,
  Coffee,
  DoorOpen,
  Flower2,
  Hotel,
  House,
  HousePlus,
  Landmark,
  Mountain,
  Sailboat,
  Sparkles,
  Tent,
  TentTree,
  Tractor,
  TreePalm,
  Trees,
  Warehouse,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export type Category = 'hotel' | 'homestay'

/**
 * Property types offered when an owner lists. To show a real photo on a card, add
 * `photo: '/img/types/<name>.webp'` (put the file in public/img/types); otherwise the icon shows.
 */
export const categories: { id: Category; title: string; text: string; types: { name: string; text: string; Icon: LucideIcon; photo?: string }[] }[] = [
  {
    id: 'hotel',
    title: 'Hotel',
    text: 'Properties with a front desk and shared facilities such as dining, meeting rooms and more.',
    types: [
      { name: 'Resort', text: 'A self-contained property with large grounds and leisure facilities like a pool, spa and restaurants.', Icon: TreePalm },
      { name: 'Lodge', text: 'Simple, comfortable rooms, often in hills, forests or other natural settings.', Icon: Mountain },
      { name: 'Hotel', text: 'Rooms with services such as housekeeping, room service and a restaurant.', Icon: Hotel },
      { name: 'Guest House', text: 'A small, often family-run property with personal service and a homely feel.', Icon: DoorOpen },
      { name: 'Palace', text: 'A heritage palace or haveli converted into a hotel with grand rooms.', Icon: Castle },
      { name: 'Houseboat', text: 'Rooms on a floating boat with bedrooms, a sitting area and often a deck.', Icon: Sailboat },
      { name: 'Motel', text: 'A budget stay on a highway with parking close to the rooms.', Icon: Car },
    ],
  },
  {
    id: 'homestay',
    title: 'Homestays & Villas',
    text: 'Independent homes and bungalows that guests rent entirely or room by room.',
    types: [
      { name: 'Villa', text: 'A spacious independent property rented as a whole, ideal for families and groups.', Icon: House },
      { name: 'Homestay', text: 'A private home where guests rent a room or the whole house; the host may live there.', Icon: HousePlus },
      { name: 'Cottage', text: 'A cosy standalone house, usually in a holiday destination.', Icon: Trees },
      { name: 'Apartment', text: 'A private flat (1BHK, 2BHK and so on) with a kitchen or living area.', Icon: Building2 },
      { name: 'Apart-Hotel', text: 'Apartment-style units with hotel services like housekeeping and a front desk.', Icon: Warehouse },
      { name: 'Hostel', text: 'Dormitory beds or private rooms with shared kitchens and lounges.', Icon: Tent },
      { name: 'Bed and Breakfast', text: 'Rooms in a private home with breakfast, usually run by the hosts.', Icon: Coffee },
      { name: 'Farmhouse', text: 'A large property in the countryside with open outdoor space.', Icon: Tractor },
      { name: 'Camp', text: 'Tents or temporary stays in the mountains, desert or by a beach.', Icon: TentTree },
      { name: 'Beach Hut', text: 'A small cabin or hut close to the beach.', Icon: Waves },
      { name: 'Treehouse', text: 'A stay built among or on trees, usually of natural materials.', Icon: Trees },
      { name: 'Dharamshala', text: 'Simple, low-cost rooms, mainly for pilgrims.', Icon: Landmark },
      { name: 'Ashram', text: 'A spiritual retreat with simple rooms for meditation, yoga or study.', Icon: Flower2 },
      { name: 'Holiday Home', text: 'An independent house or bungalow rented for short holidays.', Icon: House },
      { name: 'RV (Recreational Vehicle)', text: 'A caravan or campervan with basic living facilities.', Icon: Caravan },
      { name: 'Luxury Camp', text: 'Large, well-furnished tents with premium beds, bathrooms and service.', Icon: Sparkles },
    ],
  },
]

export const categoryOf = (type: string): Category | undefined => categories.find((c) => c.types.some((t) => t.name === type))?.id

function Radio({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${on ? 'bg-pine-800 text-white' : 'border border-line-strong bg-white'}`}>
      {on && <Check className="h-4 w-4" strokeWidth={3} />}
    </span>
  )
}

/** Full-screen chooser: Hotel or Homestays & Villas, then the exact type. */
export function PropertyTypePicker({ open, onClose, onPick, initial, busy, confirmLabel = 'List property' }: { open: boolean; onClose: () => void; onPick: (category: Category, type: string) => void; initial?: string; busy?: boolean; confirmLabel?: string }) {
  const [cat, setCat] = useState<Category>('hotel')
  const [type, setType] = useState('')
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    const c = initial ? categoryOf(initial) : undefined
    setCat(c ?? 'hotel')
    setType(c ? initial! : '')
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [open, initial])
  const c = categories.find((x) => x.id === cat)!

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col bg-paper" role="dialog" aria-modal="true" aria-labelledby="pick-h">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1240px] bg-white px-4 py-8 sm:px-8 lg:min-h-full">
              <h1 id="pick-h" className="text-[26px] font-black text-ink-900 sm:text-[30px]">
                Which property type would you like to list?
              </h1>
              <p className="mt-1 text-[14px] text-ink-500">Please select your property type from the options below.</p>

              <div role="radiogroup" aria-label="Category" className="mt-6 grid gap-4 md:grid-cols-2">
                {categories.map((x) => {
                  const on = x.id === cat
                  return (
                    <button
                      key={x.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        setCat(x.id)
                        if (x.id !== cat) setType('')
                      }}
                      className={`relative flex items-start justify-between gap-4 rounded-lg border p-5 text-left transition-colors ${on ? 'border-pine-700 bg-pine-50 shadow-panel' : 'border-line-strong bg-white hover:border-pine-700'}`}
                    >
                      <span>
                        <strong className="block text-[19px] font-bold text-ink-900">{x.title}</strong>
                        <span className="mt-2 block text-[15px] text-ink-700">{x.text}</span>
                      </span>
                      <Radio on={on} />
                      {on && <span aria-hidden="true" className="absolute -bottom-[9px] left-8 h-4 w-4 rotate-45 border-r border-b border-pine-700 bg-pine-50" />}
                    </button>
                  )
                })}
              </div>

              <h2 className="mt-8 text-[22px] font-bold text-ink-900">Type of {c.title}</h2>
              <motion.div key={cat} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} role="radiogroup" aria-label={`Type of ${c.title}`} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {c.types.map((t) => {
                  const on = t.name === type
                  return (
                    <button key={t.name} type="button" role="radio" aria-checked={on} onClick={() => setType(t.name)} className={`flex flex-col gap-3 rounded-lg border p-3 text-left transition-colors ${on ? 'border-pine-700 bg-pine-50 shadow-panel' : 'border-line-strong bg-white hover:border-pine-700'}`}>
                      <span className="flex items-center justify-between gap-2">
                        <strong className="text-[16px] font-bold text-ink-900">{t.name}</strong>
                        <Radio on={on} />
                      </span>
                      {t.photo ? (
                        <img src={t.photo} alt="" className="aspect-[16/6] w-full rounded object-cover" loading="lazy" />
                      ) : (
                        <span className="flex aspect-[16/6] w-full items-center justify-center rounded bg-gradient-to-br from-pine-50 via-white to-brass-50 ring-1 ring-line">
                          <t.Icon className={`h-9 w-9 ${on ? 'text-pine-800' : 'text-pine-700/70'}`} strokeWidth={1.5} aria-hidden="true" />
                        </span>
                      )}
                      <span className="text-[13px] leading-snug text-ink-700">{t.text}</span>
                    </button>
                  )
                })}
              </motion.div>
            </div>
          </div>
          <div className="border-t border-line bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
              <button type="button" onClick={onClose} className="min-h-11 px-2 text-[16px] font-bold text-pine-800 hover:underline">
                Cancel
              </button>
              <button type="button" className="btn-brass min-h-11 px-6" disabled={!type || busy} onClick={() => onPick(cat, type)}>
                {busy ? 'Starting…' : confirmLabel}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
