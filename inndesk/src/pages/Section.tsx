import { Hourglass } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useListings } from '../lib/hooks'
import { sections } from '../lib/propertyMenu'
import Promotions from './Promotions'

/** Placeholder page for property-menu sections that aren't built yet. */
export default function Section() {
  const { id = '', slug = '' } = useParams()
  const { data } = useListings()
  const l = data?.find((x) => x.id === id)
  if (slug === 'promotions' && l) return <Promotions l={l} />
  return (
    <div className="flex min-h-[calc(100dvh-68px)] flex-col bg-white">
      <div className="mx-auto w-full max-w-[1280px] px-4 pt-7 sm:px-8">
        <h1 className="text-[30px] font-bold text-ink-900 sm:text-[34px]">{sections[slug] ?? 'Section'}</h1>
        {l && <p className="text-[15px] text-ink-500">{l.basics.name.trim() || 'Unnamed property'}</p>}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pine-50 text-pine-800 sm:h-20 sm:w-20">
          <Hourglass className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <p className="text-[24px] font-medium tracking-[0.06em] text-ink-700 uppercase sm:text-[30px]">Coming soon</p>
      </div>
    </div>
  )
}
