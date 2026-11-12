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
      <p className="flex flex-1 items-center justify-center pb-24 text-[12px] font-medium tracking-[0.12em] text-ink-400 uppercase">Coming soon</p>
    </div>
  )
}
