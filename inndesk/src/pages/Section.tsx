import { useParams } from 'react-router-dom'
import { useListings } from '../lib/hooks'
import { sections } from '../lib/propertyMenu'

/** Placeholder page for property-menu sections that aren't built yet. */
export default function Section() {
  const { id = '', slug = '' } = useParams()
  const { data } = useListings()
  const l = data?.find((x) => x.id === id)
  return (
    <div className="min-h-[calc(100dvh-68px)] bg-white">
      <div className="mx-auto max-w-[1280px] px-4 pt-7 sm:px-8">
        <h1 className="text-[30px] font-bold text-ink-900 sm:text-[34px]">{sections[slug] ?? 'Section'}</h1>
        {l && <p className="text-[15px] text-ink-500">{l.basics.name.trim() || 'Unnamed property'}</p>}
      </div>
    </div>
  )
}
